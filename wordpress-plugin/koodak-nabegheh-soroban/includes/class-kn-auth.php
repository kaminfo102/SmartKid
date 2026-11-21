<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_Auth {

	/**
	 * Return signing key derived from WordPress auth salt (never hardcoded).
	 */
	private static function get_signing_secret() {
		$secret = wp_salt( 'auth' );
		if ( empty( $secret ) ) {
			$secret = hash( 'sha256', ABSPATH . get_site_url() );
		}
		return $secret;
	}

	/**
	 * Issue a signed Bearer token and persist its SHA-256 hash in wp_kn_tokens.
	 */
	public static function issue_token( $user_id, $device_label = '' ) {
		global $wpdb;

		$settings = get_option( 'kn_soroban_settings', array() );
		$ttl_days = isset( $settings['token_ttl_days'] ) ? max( 1, min( 90, absint( $settings['token_ttl_days'] ) ) ) : 30;
		$exp      = time() + ( $ttl_days * DAY_IN_SECONDS );
		$jti      = wp_generate_password( 24, false, false );

		$payload = array(
			'uid' => absint( $user_id ),
			'exp' => $exp,
			'jti' => $jti,
		);

		$encoded_payload = self::base64url_encode( wp_json_encode( $payload ) );
		$signature       = hash_hmac( 'sha256', $encoded_payload, self::get_signing_secret() );
		$token           = $encoded_payload . '.' . $signature;

		$wpdb->insert(
			KN_DB::table_tokens(),
			array(
				'user_id'      => absint( $user_id ),
				'token_hash'   => hash( 'sha256', $token ),
				'device_label' => sanitize_text_field( substr( $device_label, 0, 100 ) ),
				'expires_at'   => gmdate( 'Y-m-d H:i:s', $exp ),
				'revoked'      => 0,
			),
			array( '%d', '%s', '%s', '%s', '%d' )
		);

		return array(
			'token'     => $token,
			'expiresAt' => $exp * 1000,
		);
	}

	/**
	 * Extract Bearer token from standard or Apache/CGI headers.
	 */
	public static function extract_bearer_token( WP_REST_Request $request ) {
		$header = $request->get_header( 'authorization' );
		if ( empty( $header ) && ! empty( $_SERVER['HTTP_AUTHORIZATION'] ) ) {
			$header = sanitize_text_field( wp_unslash( $_SERVER['HTTP_AUTHORIZATION'] ) );
		}
		if ( empty( $header ) && ! empty( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
			$header = sanitize_text_field( wp_unslash( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) );
		}
		if ( empty( $header ) && function_exists( 'getallheaders' ) ) {
			$headers = getallheaders();
			foreach ( $headers as $k => $v ) {
				if ( strtolower( $k ) === 'authorization' ) {
					$header = sanitize_text_field( $v );
					break;
				}
			}
		}

		if ( empty( $header ) || stripos( $header, 'Bearer ' ) !== 0 ) {
			return null;
		}

		return trim( substr( $header, 7 ) );
	}

	/**
	 * Verify Bearer token signature, expiration, and non-revoked status in DB.
	 * Returns WP_User or null.
	 */
	public static function authenticate_request( WP_REST_Request $request ) {
		global $wpdb;

		$token = self::extract_bearer_token( $request );
		if ( empty( $token ) ) {
			return null;
		}

		$parts = explode( '.', $token );
		if ( count( $parts ) !== 2 ) {
			return null;
		}

		list( $encoded_payload, $provided_sig ) = $parts;
		$expected_sig = hash_hmac( 'sha256', $encoded_payload, self::get_signing_secret() );

		if ( ! hash_equals( $expected_sig, $provided_sig ) ) {
			return null;
		}

		$payload = json_decode( self::base64url_decode( $encoded_payload ), true );
		if ( ! is_array( $payload ) || empty( $payload['uid'] ) || empty( $payload['exp'] ) ) {
			return null;
		}

		if ( time() > intval( $payload['exp'] ) ) {
			return null;
		}

		$token_hash = hash( 'sha256', $token );
		$t_tokens   = KN_DB::table_tokens();
		$record     = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id, user_id, revoked, expires_at FROM {$t_tokens} WHERE token_hash = %s LIMIT 1",
				$token_hash
			),
			ARRAY_A
		);

		if ( ! $record || (int) $record['revoked'] === 1 ) {
			return null;
		}

		if ( strtotime( $record['expires_at'] . ' UTC' ) < time() ) {
			return null;
		}

		$user = get_user_by( 'id', absint( $record['user_id'] ) );
		if ( ! $user ) {
			return null;
		}

		return $user;
	}

	/**
	 * Revoke the active Bearer token (logout).
	 */
	public static function revoke_request_token( WP_REST_Request $request ) {
		global $wpdb;
		$token = self::extract_bearer_token( $request );
		if ( empty( $token ) ) {
			return false;
		}
		$wpdb->update(
			KN_DB::table_tokens(),
			array( 'revoked' => 1 ),
			array( 'token_hash' => hash( 'sha256', $token ) ),
			array( '%d' ),
			array( '%s' )
		);
		return true;
	}

	/**
	 * Register a new WordPress parent/student user and create their initial child profile.
	 */
	public static function register_user( $params ) {
		$settings = get_option( 'kn_soroban_settings', array() );
		if ( empty( $settings['allow_registration'] ) ) {
			return new WP_Error( 'registration_disabled', 'ثبت‌نام کاربران جدید توسط مدیر غیرفعال شده است.', array( 'status' => 403 ) );
		}

		$email        = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';
		$username_raw = isset( $params['username'] ) ? sanitize_user( $params['username'], true ) : '';
		$password     = isset( $params['password'] ) ? (string) $params['password'] : '';
		$display_name = isset( $params['displayName'] ) ? sanitize_text_field( $params['displayName'] ) : '';
		$child_name   = isset( $params['childName'] ) ? sanitize_text_field( $params['childName'] ) : 'آرتین';
		$child_age    = isset( $params['childAge'] ) ? max( 4, min( 12, absint( $params['childAge'] ) ) ) : 6;
		$child_avatar = isset( $params['childAvatar'] ) ? sanitize_key( $params['childAvatar'] ) : 'owl';

		if ( empty( $email ) || ! is_email( $email ) ) {
			return new WP_Error( 'invalid_email', 'لطفاً یک ایمیل معتبر وارد کنید.', array( 'status' => 400 ) );
		}

		if ( strlen( $password ) < 6 ) {
			return new WP_Error( 'weak_password', 'رمز عبور باید حداقل ۶ کاراکتر باشد.', array( 'status' => 400 ) );
		}

		if ( email_exists( $email ) ) {
			return new WP_Error( 'email_exists', 'این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید.', array( 'status' => 409 ) );
		}

		$username = ! empty( $username_raw ) ? $username_raw : sanitize_user( current( explode( '@', $email ) ), true );
		if ( empty( $username ) || username_exists( $username ) ) {
			$username = $username . '_' . wp_rand( 100, 9999 );
		}

		$user_id = wp_create_user( $username, $password, $email );
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'create_failed', $user_id->get_error_message(), array( 'status' => 400 ) );
		}

		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => ! empty( $display_name ) ? $display_name : $child_name,
				'role'         => get_role( 'kn_student' ) ? 'kn_student' : 'subscriber',
			)
		);

		// Create initial child profile
		KN_DB::upsert_profile(
			$user_id,
			array(
				'id'     => 'child_' . time() . '_' . wp_rand( 100, 999 ),
				'name'   => ! empty( $child_name ) ? $child_name : 'قهرمان کوچک',
				'avatar' => $child_avatar,
				'age'    => $child_age,
			)
		);

		$user = get_user_by( 'id', $user_id );
		return $user;
	}

	/**
	 * Issue a single-use, short-lived (5 min) SSO handoff token so an authenticated
	 * headless app user lands on WooCommerce checkout already logged in.
	 */
	public static function issue_checkout_handoff( $user_id, $term_db_id = 0 ) {
		$user_id    = absint( $user_id );
		$term_db_id = absint( $term_db_id );
		if ( $user_id <= 0 ) {
			return '';
		}

		try {
			$raw_token = bin2hex( random_bytes( 32 ) );
		} catch ( Exception $e ) {
			$raw_token = wp_generate_password( 48, false, false );
		}

		$token_hash = hash( 'sha256', $raw_token );
		$payload    = array(
			'user_id' => $user_id,
			'term_id' => $term_db_id,
			'issued'  => time(),
		);

		set_transient( 'kn_sso_' . $token_hash, $payload, 5 * MINUTE_IN_SECONDS );

		return $raw_token;
	}

	/**
	 * Validate and immediately consume a single-use checkout SSO handoff token.
	 */
	public static function consume_checkout_handoff( $raw_token ) {
		$clean_token = preg_replace( '/[^a-zA-Z0-9]/', '', (string) $raw_token );
		if ( strlen( $clean_token ) < 24 ) {
			return null;
		}

		$transient_key = 'kn_sso_' . hash( 'sha256', $clean_token );
		$payload       = get_transient( $transient_key );
		delete_transient( $transient_key );

		if ( ! is_array( $payload ) || empty( $payload['user_id'] ) ) {
			return null;
		}

		return array(
			'user_id' => absint( $payload['user_id'] ),
			'term_id' => isset( $payload['term_id'] ) ? absint( $payload['term_id'] ) : 0,
		);
	}

	/**
	 * Format public user info for frontend.
	 */
	public static function format_user( WP_User $user ) {
		return array(
			'id'          => (int) $user->ID,
			'username'    => $user->user_login,
			'email'       => $user->user_email,
			'displayName' => $user->display_name,
			'roles'       => array_values( $user->roles ),
			'isAdmin'     => user_can( $user, 'manage_options' ),
		);
	}

	private static function base64url_encode( $data ) {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}

	private static function base64url_decode( $data ) {
		$remainder = strlen( $data ) % 4;
		if ( $remainder ) {
			$data .= str_repeat( '=', 4 - $remainder );
		}
		return base64_decode( strtr( $data, '-_', '+/' ) );
	}
}
