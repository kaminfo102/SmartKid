<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_Auth {

	const SESSION_COOKIE_NAME = 'kn_session';

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
	 * Detect HTTPS cleanly behind reverse proxies / Cloudflare / cPanel.
	 */
	private static function is_https_request() {
		if ( is_ssl() ) {
			return true;
		}
		if ( ! empty( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && stripos( (string) $_SERVER['HTTP_X_FORWARDED_PROTO'], 'https' ) !== false ) {
			return true;
		}
		if ( ! empty( $_SERVER['HTTP_FRONT_END_HTTPS'] ) && strtolower( (string) $_SERVER['HTTP_FRONT_END_HTTPS'] ) === 'on' ) {
			return true;
		}
		return false;
	}

	/**
	 * Set an HttpOnly session cookie so page refreshes keep the user signed in without localStorage tokens.
	 */
	public static function set_session_cookie( $token, $expires_timestamp ) {
		if ( headers_sent() ) {
			return;
		}
		$max_age  = max( 60, (int) $expires_timestamp - time() );
		$expires  = gmdate( 'D, d M Y H:i:s T', (int) $expires_timestamp );
		$encoded  = rawurlencode( (string) $token );
		$is_https = self::is_https_request();

		$cookie = self::SESSION_COOKIE_NAME . '=' . $encoded
			. '; Expires=' . $expires
			. '; Max-Age=' . $max_age
			. '; Path=/'
			. '; HttpOnly';

		if ( $is_https ) {
			$cookie .= '; Secure; SameSite=None; Partitioned';
		} else {
			$cookie .= '; SameSite=Lax';
		}

		header( 'Set-Cookie: ' . $cookie, false );
	}

	/**
	 * Clear the HttpOnly session cookie on logout or invalid session.
	 */
	public static function clear_session_cookie() {
		if ( headers_sent() ) {
			return;
		}
		$is_https = self::is_https_request();
		$cookie   = self::SESSION_COOKIE_NAME . '='
			. '; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
			. '; Max-Age=0'
			. '; Path=/'
			. '; HttpOnly';

		if ( $is_https ) {
			$cookie .= '; Secure; SameSite=None; Partitioned';
		} else {
			$cookie .= '; SameSite=Lax';
		}

		header( 'Set-Cookie: ' . $cookie, false );
	}

	/**
	 * Issue a signed 3-segment HMAC-SHA256 token and persist its SHA-256 hash in wp_kn_tokens.
	 */
	public static function issue_token( $user_id, $device_label = '' ) {
		global $wpdb;

		$settings = get_option( 'kn_soroban_settings', array() );
		$ttl_days = isset( $settings['token_ttl_days'] ) ? max( 1, min( 90, absint( $settings['token_ttl_days'] ) ) ) : 30;
		$exp      = time() + ( $ttl_days * DAY_IN_SECONDS );
		$jti      = wp_generate_password( 24, false, false );

		$header = array(
			'alg' => 'HS256',
			'typ' => 'JWT',
		);

		$payload = array(
			'uid' => absint( $user_id ),
			'exp' => $exp,
			'jti' => $jti,
		);

		$encoded_header  = self::base64url_encode( wp_json_encode( $header ) );
		$encoded_payload = self::base64url_encode( wp_json_encode( $payload ) );
		$signing_input   = $encoded_header . '.' . $encoded_payload;
		$signature       = self::base64url_encode( hash_hmac( 'sha256', $signing_input, self::get_signing_secret(), true ) );
		$token           = $signing_input . '.' . $signature;

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
	 * Extract token from X-KN-Auth, Authorization: Bearer, or HttpOnly kn_session cookie.
	 */
	public static function extract_token_with_source( WP_REST_Request $request ) {
		// 1) Custom X-KN-Auth header (avoids third-party WP JWT plugin collisions & Apache auth stripping)
		$kn_header = $request->get_header( 'x-kn-auth' );
		if ( empty( $kn_header ) && ! empty( $_SERVER['HTTP_X_KN_AUTH'] ) ) {
			$kn_header = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_KN_AUTH'] ) );
		}
		if ( ! empty( $kn_header ) ) {
			$raw = trim( (string) $kn_header );
			if ( stripos( $raw, 'Bearer ' ) === 0 ) {
				$raw = trim( substr( $raw, 7 ) );
			}
			if ( ! empty( $raw ) ) {
				return array(
					'token'  => $raw,
					'source' => 'header',
				);
			}
		}

		// 2) Standard Authorization: Bearer header
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

		if ( ! empty( $header ) && stripos( $header, 'Bearer ' ) === 0 ) {
			$raw = trim( substr( $header, 7 ) );
			if ( ! empty( $raw ) ) {
				return array(
					'token'  => $raw,
					'source' => 'header',
				);
			}
		}

		// 3) HttpOnly session cookie fallback (survives page refreshes securely)
		if ( ! empty( $_COOKIE[ self::SESSION_COOKIE_NAME ] ) ) {
			$cookie_val = sanitize_text_field( wp_unslash( $_COOKIE[ self::SESSION_COOKIE_NAME ] ) );
			if ( ! empty( $cookie_val ) ) {
				return array(
					'token'  => trim( $cookie_val ),
					'source' => 'cookie',
				);
			}
		}

		return array(
			'token'  => null,
			'source' => null,
		);
	}

	/**
	 * Extract Bearer token string (compatibility helper).
	 */
	public static function extract_bearer_token( WP_REST_Request $request ) {
		$found = self::extract_token_with_source( $request );
		return $found['token'];
	}

	/**
	 * Verify token signature (supports 3-segment HS256 JWT and legacy 2-segment format),
	 * expiration, CSRF custom header on cookie mutations, and non-revoked status in DB.
	 * Returns WP_User or null.
	 */
	public static function authenticate_request( WP_REST_Request $request ) {
		global $wpdb;

		$found  = self::extract_token_with_source( $request );
		$token  = $found['token'];
		$source = $found['source'];
		if ( empty( $token ) ) {
			return null;
		}

		// Require custom X-KN-App header when state-changing calls authenticate via HttpOnly cookie (CSRF protection)
		if ( $source === 'cookie' && in_array( strtoupper( $request->get_method() ), array( 'POST', 'PUT', 'PATCH', 'DELETE' ), true ) ) {
			$app_header = $request->get_header( 'x-kn-app' );
			if ( empty( $app_header ) && ! empty( $_SERVER['HTTP_X_KN_APP'] ) ) {
				$app_header = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_KN_APP'] ) );
			}
			if ( empty( $app_header ) ) {
				return null;
			}
		}

		$parts           = explode( '.', $token );
		$encoded_payload = '';

		if ( count( $parts ) === 3 ) {
			list( $encoded_header, $encoded_payload, $provided_sig ) = $parts;
			$signing_input = $encoded_header . '.' . $encoded_payload;
			$expected_sig  = self::base64url_encode( hash_hmac( 'sha256', $signing_input, self::get_signing_secret(), true ) );
			if ( ! hash_equals( $expected_sig, $provided_sig ) ) {
				return null;
			}
		} elseif ( count( $parts ) === 2 ) {
			list( $encoded_payload, $provided_sig ) = $parts;
			$expected_sig = hash_hmac( 'sha256', $encoded_payload, self::get_signing_secret() );
			if ( ! hash_equals( $expected_sig, $provided_sig ) ) {
				return null;
			}
		} else {
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

		$request->set_param( '_kn_auth_source', $source );
		return $user;
	}

	/**
	 * Revoke the active token(s) and clear HttpOnly session cookie (logout).
	 */
	public static function revoke_request_token( WP_REST_Request $request ) {
		global $wpdb;
		$found = self::extract_token_with_source( $request );
		if ( ! empty( $found['token'] ) ) {
			$wpdb->update(
				KN_DB::table_tokens(),
				array( 'revoked' => 1 ),
				array( 'token_hash' => hash( 'sha256', $found['token'] ) ),
				array( '%d' ),
				array( '%s' )
			);
		}
		if ( ! empty( $_COOKIE[ self::SESSION_COOKIE_NAME ] ) ) {
			$cookie_tok = trim( sanitize_text_field( wp_unslash( $_COOKIE[ self::SESSION_COOKIE_NAME ] ) ) );
			if ( ! empty( $cookie_tok ) ) {
				$wpdb->update(
					KN_DB::table_tokens(),
					array( 'revoked' => 1 ),
					array( 'token_hash' => hash( 'sha256', $cookie_tok ) ),
					array( '%d' ),
					array( '%s' )
				);
			}
		}
		self::clear_session_cookie();
		return true;
	}

	/**
	 * Convert Persian/Arabic/Fullwidth numerals to ASCII Latin digits and strip invisible bidi marks.
	 */
	public static function to_latin_digits( $raw ) {
		$cleaned = preg_replace( '/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u', '', (string) $raw );
		$fa      = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' );
		$ar      = array( '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩' );
		$fw      = array( '０', '１', '２', '３', '４', '５', '６', '７', '８', '９' );
		$en      = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
		$str     = str_replace( $fa, $en, $cleaned );
		$str     = str_replace( $ar, $en, $str );
		return str_replace( $fw, $en, $str );
	}

	/**
	 * Convert Persian/Arabic numerals to ASCII and keep digits only (for postcodes, etc.).
	 */
	public static function normalize_digits( $raw ) {
		return preg_replace( '/[^0-9]/', '', self::to_latin_digits( $raw ) );
	}

	/**
	 * Convert Persian/Arabic numerals to ASCII and strip whitespace/dashes for mobile normalization.
	 */
	public static function normalize_mobile( $raw ) {
		$digits = self::normalize_digits( $raw );
		// Normalize 009809... / 00989... / 9809... / 989... / 9... prefix for Iranian numbers to 09...
		if ( strlen( $digits ) === 15 && strpos( $digits, '009809' ) === 0 ) {
			$digits = substr( $digits, 4 );
		} elseif ( strlen( $digits ) === 14 && strpos( $digits, '00989' ) === 0 ) {
			$digits = '0' . substr( $digits, 4 );
		} elseif ( strlen( $digits ) === 13 && strpos( $digits, '9809' ) === 0 ) {
			$digits = substr( $digits, 2 );
		} elseif ( strlen( $digits ) === 12 && strpos( $digits, '989' ) === 0 ) {
			$digits = '0' . substr( $digits, 2 );
		} elseif ( strlen( $digits ) === 10 && strpos( $digits, '9' ) === 0 ) {
			$digits = '0' . $digits;
		}
		return $digits;
	}

	/**
	 * Strictly validate Iranian mobile format (11 digits starting with 09).
	 */
	public static function is_valid_iran_mobile( $mobile ) {
		return preg_match( '/^09[0-9]{9}$/', (string) $mobile ) === 1;
	}

	/**
	 * Resolve user by email, username, or normalized mobile number for login.
	 */
	public static function find_login_username( $identifier ) {
		$raw = trim( self::to_latin_digits( (string) $identifier ) );
		if ( empty( $raw ) ) {
			return '';
		}
		if ( is_email( $raw ) ) {
			$u = get_user_by( 'email', $raw );
			return $u ? $u->user_login : $raw;
		}
		$u = get_user_by( 'login', $raw );
		if ( $u ) {
			return $u->user_login;
		}
		$mobile = self::normalize_mobile( $raw );
		if ( strlen( $mobile ) >= 10 ) {
			$by_login = get_user_by( 'login', $mobile );
			if ( $by_login ) {
				return $by_login->user_login;
			}
			$matched = get_users(
				array(
					'meta_query' => array(
						'relation' => 'OR',
						array(
							'key'   => 'kn_mobile',
							'value' => $mobile,
						),
						array(
							'key'   => 'billing_phone',
							'value' => $mobile,
						),
					),
					'number'     => 1,
				)
			);
			if ( ! empty( $matched ) && $matched[0] instanceof WP_User ) {
				return $matched[0]->user_login;
			}
		}
		return $raw;
	}

	/**
	 * Persist billing & shipping address fields identically on WordPress/WooCommerce user meta.
	 */
	private static function sync_user_commerce_meta( $user_id, $fields ) {
		$first_name = sanitize_text_field( $fields['first_name'] ?? '' );
		$last_name  = sanitize_text_field( $fields['last_name'] ?? '' );
		$mobile     = self::normalize_mobile( $fields['mobile'] ?? '' );
		$email      = sanitize_email( $fields['email'] ?? '' );
		$state      = sanitize_text_field( $fields['state'] ?? '' );
		$city       = sanitize_text_field( $fields['city'] ?? '' );
		$address_1  = sanitize_text_field( $fields['address_1'] ?? '' );
		$postcode   = self::normalize_digits( $fields['postcode'] ?? '' );

		update_user_meta( $user_id, 'first_name', $first_name );
		update_user_meta( $user_id, 'last_name', $last_name );
		update_user_meta( $user_id, 'kn_mobile', $mobile );

		foreach ( array( 'billing', 'shipping' ) as $prefix ) {
			update_user_meta( $user_id, $prefix . '_first_name', $first_name );
			update_user_meta( $user_id, $prefix . '_last_name', $last_name );
			update_user_meta( $user_id, $prefix . '_phone', $mobile );
			update_user_meta( $user_id, $prefix . '_country', 'IR' );
			update_user_meta( $user_id, $prefix . '_state', $state );
			update_user_meta( $user_id, $prefix . '_city', $city );
			update_user_meta( $user_id, $prefix . '_address_1', $address_1 );
			update_user_meta( $user_id, $prefix . '_postcode', $postcode );
		}
		if ( ! empty( $email ) ) {
			update_user_meta( $user_id, 'billing_email', $email );
		}
	}

	/**
	 * Register a new WordPress parent/student user and create their initial child profile.
	 */
	public static function register_user( $params ) {
		$settings = get_option( 'kn_soroban_settings', array() );
		if ( empty( $settings['allow_registration'] ) && ! is_admin() ) {
			return new WP_Error( 'registration_disabled', 'ثبت‌نام کاربران جدید در حال حاضر غیرفعال شده است.', array( 'status' => 403 ) );
		}

		$mobile       = self::normalize_mobile( $params['mobile'] ?? '' );
		$email_in     = isset( $params['email'] ) ? sanitize_email( self::to_latin_digits( $params['email'] ) ) : '';
		$username_raw = isset( $params['username'] ) ? sanitize_user( self::to_latin_digits( $params['username'] ), true ) : '';
		$password     = isset( $params['password'] ) ? self::to_latin_digits( (string) $params['password'] ) : '';
		$first_name   = isset( $params['firstName'] ) ? sanitize_text_field( $params['firstName'] ) : '';
		$last_name    = isset( $params['lastName'] ) ? sanitize_text_field( $params['lastName'] ) : '';
		$display_name = isset( $params['displayName'] ) ? sanitize_text_field( $params['displayName'] ) : '';
		$state        = isset( $params['state'] ) ? sanitize_text_field( $params['state'] ) : '';
		$city         = isset( $params['city'] ) ? sanitize_text_field( $params['city'] ) : '';
		$address_1    = isset( $params['address1'] ) ? sanitize_text_field( $params['address1'] ) : '';
		$postcode     = self::normalize_digits( $params['postcode'] ?? '' );
		$child_name   = isset( $params['childName'] ) ? sanitize_text_field( $params['childName'] ) : 'کیا';
		$child_age    = isset( $params['childAge'] ) ? max( 4, min( 15, absint( $params['childAge'] ) ) ) : 6;
		$child_avatar = isset( $params['childAvatar'] ) ? sanitize_key( $params['childAvatar'] ) : 'owl';

		if ( ! self::is_valid_iran_mobile( $mobile ) ) {
			return new WP_Error( 'invalid_mobile', 'شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع 09 وارد کنید (مثلاً 09123456789).', array( 'status' => 400 ) );
		}

		if ( strlen( $password ) < 6 ) {
			return new WP_Error( 'weak_password', 'رمز عبور باید حداقل ۶ کاراکتر باشد.', array( 'status' => 400 ) );
		}

		// Prevent duplicate registration on the same mobile number
		$existing_mobile = get_users(
			array(
				'meta_query' => array(
					'relation' => 'OR',
					array(
						'key'   => 'kn_mobile',
						'value' => $mobile,
					),
					array(
						'key'   => 'billing_phone',
						'value' => $mobile,
					),
				),
				'number'     => 1,
			)
		);
		if ( ! empty( $existing_mobile ) ) {
			return new WP_Error( 'mobile_exists', 'این شماره موبایل قبلاً ثبت شده است. لطفاً وارد حساب خود شوید.', array( 'status' => 409 ) );
		}

		if ( ! empty( $username_raw ) ) {
			if ( strlen( $username_raw ) < 3 ) {
				return new WP_Error( 'invalid_username', 'نام کاربری باید حداقل ۳ کاراکتر انگلیسی باشد.', array( 'status' => 400 ) );
			}
			if ( username_exists( $username_raw ) ) {
				return new WP_Error( 'username_exists', 'این نام کاربری قبلاً انتخاب شده است. لطفاً نام کاربری دیگری وارد کنید.', array( 'status' => 409 ) );
			}
			$username = $username_raw;
		} else {
			if ( username_exists( $mobile ) ) {
				return new WP_Error( 'mobile_exists', 'این شماره موبایل قبلاً ثبت شده است. لطفاً وارد حساب خود شوید.', array( 'status' => 409 ) );
			}
			$username = $mobile;
		}

		if ( ! empty( $email_in ) ) {
			if ( ! is_email( $email_in ) ) {
				return new WP_Error( 'invalid_email', 'ایمیل وارد شده معتبر نیست.', array( 'status' => 400 ) );
			}
			if ( email_exists( $email_in ) ) {
				return new WP_Error( 'email_exists', 'این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید.', array( 'status' => 409 ) );
			}
			$email = $email_in;
		} else {
			$local_part = strtolower( preg_replace( '/[^a-zA-Z0-9._-]/', '', $username ) );
			if ( empty( $local_part ) ) {
				$local_part = $mobile;
			}
			$email = sanitize_email( $local_part . '@chootkeh.ir' );
			if ( email_exists( $email ) ) {
				$email = sanitize_email( $local_part . '_' . wp_rand( 10, 99 ) . '@chootkeh.ir' );
			}
		}

		if ( empty( $first_name ) && ! empty( $display_name ) ) {
			$parts      = preg_split( '/\s+/u', trim( $display_name ), 2 );
			$first_name = $parts[0] ?? $display_name;
			$last_name  = $last_name ?: ( $parts[1] ?? '' );
		}
		if ( empty( $display_name ) ) {
			$display_name = trim( $first_name . ' ' . $last_name );
		}

		$user_id = wp_create_user( $username, $password, $email );
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'create_failed', $user_id->get_error_message(), array( 'status' => 400 ) );
		}

		$final_display = ! empty( $display_name ) ? $display_name : ( ! empty( $child_name ) ? $child_name : $mobile );
		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => $final_display,
				'first_name'   => $first_name ?: $final_display,
				'last_name'    => $last_name,
				'role'         => get_role( 'kn_student' ) ? 'kn_student' : 'subscriber',
			)
		);

		self::sync_user_commerce_meta(
			$user_id,
			array(
				'first_name' => $first_name ?: $final_display,
				'last_name'  => $last_name,
				'mobile'     => $mobile,
				'email'      => $email,
				'state'      => $state,
				'city'       => $city,
				'address_1'  => $address_1,
				'postcode'   => $postcode,
			)
		);

		if ( empty( $email_in ) ) {
			update_user_meta( $user_id, 'kn_auto_email', '1' );
		}

		// Create initial child profile
		KN_DB::upsert_profile(
			$user_id,
			array(
				'id'     => 'child_' . time() . '_' . wp_rand( 100, 999 ),
				'name'   => ! empty( $child_name ) ? $child_name : 'کیا',
				'avatar' => $child_avatar,
				'age'    => $child_age,
			)
		);

		clean_user_cache( $user_id );
		$user = get_user_by( 'id', $user_id );
		return $user;
	}

	/**
	 * Effortless login or quick registration using a verified mobile number (no address/billing fields required yet).
	 */
	public static function login_or_register_by_otp( $raw_mobile, $child_name = '' ) {
		$mobile = self::normalize_mobile( $raw_mobile );
		if ( ! self::is_valid_iran_mobile( $mobile ) ) {
			return new WP_Error( 'invalid_mobile', 'شماره موبایل معتبر نیست.', array( 'status' => 400 ) );
		}

		// Find existing user by user_login, kn_mobile, or billing_phone
		$existing_user = get_user_by( 'login', $mobile );
		if ( ! $existing_user ) {
			$matched = get_users(
				array(
					'meta_query' => array(
						'relation' => 'OR',
						array(
							'key'   => 'kn_mobile',
							'value' => $mobile,
						),
						array(
							'key'   => 'billing_phone',
							'value' => $mobile,
						),
					),
					'number'     => 1,
				)
			);
			if ( ! empty( $matched ) && $matched[0] instanceof WP_User ) {
				$existing_user = $matched[0];
			}
		}

		if ( $existing_user instanceof WP_User ) {
			$existing_mobile = get_user_meta( $existing_user->ID, 'kn_mobile', true );
			if ( empty( $existing_mobile ) ) {
				update_user_meta( $existing_user->ID, 'kn_mobile', $mobile );
				update_user_meta( $existing_user->ID, 'billing_phone', $mobile );
			}
			$profiles = KN_DB::get_user_profiles( $existing_user->ID );
			if ( empty( $profiles ) ) {
				KN_DB::upsert_profile(
					$existing_user->ID,
					array(
						'id'     => 'child_' . time(),
						'name'   => 'کیا',
						'avatar' => 'owl',
						'age'    => 6,
					)
				);
			}
			return array(
				'user'      => $existing_user,
				'isNewUser' => false,
			);
		}

		$settings = get_option( 'kn_soroban_settings', array() );
		if ( empty( $settings['allow_registration'] ) && ! is_admin() ) {
			return new WP_Error( 'registration_disabled', 'ثبت‌نام کاربران جدید در حال حاضر غیرفعال شده است.', array( 'status' => 403 ) );
		}

		$username = $mobile;
		$email    = sanitize_email( $mobile . '@chootkeh.ir' );
		if ( email_exists( $email ) ) {
			$email = sanitize_email( $mobile . '_' . wp_rand( 100, 999 ) . '@chootkeh.ir' );
		}

		$random_pass = wp_generate_password( 24, true, true );
		$user_id     = wp_create_user( $username, $random_pass, $email );
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'create_failed', $user_id->get_error_message(), array( 'status' => 400 ) );
		}

		$clean_child = sanitize_text_field( (string) $child_name );
		if ( empty( $clean_child ) ) {
			$clean_child = 'کیا';
		}

		$friendly_display = 'کاربر ' . substr( $mobile, -4 );
		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => $friendly_display,
				'first_name'   => '',
				'last_name'    => '',
				'role'         => get_role( 'kn_student' ) ? 'kn_student' : 'subscriber',
			)
		);

		// Intentionally leave first_name, last_name, state, city, address_1, postcode empty until purchase completion
		self::sync_user_commerce_meta(
			$user_id,
			array(
				'first_name' => '',
				'last_name'  => '',
				'mobile'     => $mobile,
				'email'      => $email,
				'state'      => '',
				'city'       => '',
				'address_1'  => '',
				'postcode'   => '',
			)
		);
		update_user_meta( $user_id, 'kn_auto_email', '1' );
		update_user_meta( $user_id, 'kn_otp_registered', '1' );

		KN_DB::upsert_profile(
			$user_id,
			array(
				'id'     => 'child_' . time() . '_' . wp_rand( 100, 999 ),
				'name'   => $clean_child,
				'avatar' => 'owl',
				'age'    => 6,
			)
		);

		clean_user_cache( $user_id );
		$new_user = get_user_by( 'id', $user_id );
		return array(
			'user'      => $new_user,
			'isNewUser' => true,
		);
	}

	/**
	 * Determine which required customer fields are missing before allowing an order or purchase.
	 *
	 * @return string[]
	 */
	public static function get_missing_purchase_fields( WP_User $user ) {
		$uid        = (int) $user->ID;
		$first_name = trim( (string) ( get_user_meta( $uid, 'first_name', true ) ?: get_user_meta( $uid, 'billing_first_name', true ) ?: $user->first_name ) );
		$last_name  = trim( (string) ( get_user_meta( $uid, 'last_name', true ) ?: get_user_meta( $uid, 'billing_last_name', true ) ?: $user->last_name ) );
		$mobile     = self::normalize_mobile( get_user_meta( $uid, 'kn_mobile', true ) ?: get_user_meta( $uid, 'billing_phone', true ) );
		$state      = trim( (string) ( get_user_meta( $uid, 'billing_state', true ) ?: get_user_meta( $uid, 'shipping_state', true ) ) );
		$city       = trim( (string) ( get_user_meta( $uid, 'billing_city', true ) ?: get_user_meta( $uid, 'shipping_city', true ) ) );
		$address1   = trim( (string) ( get_user_meta( $uid, 'billing_address_1', true ) ?: get_user_meta( $uid, 'shipping_address_1', true ) ) );
		$postcode   = self::normalize_digits( get_user_meta( $uid, 'billing_postcode', true ) ?: get_user_meta( $uid, 'shipping_postcode', true ) );

		$missing = array();
		if ( '' === $first_name ) {
			$missing[] = 'firstName';
		}
		if ( '' === $last_name ) {
			$missing[] = 'lastName';
		}
		if ( ! self::is_valid_iran_mobile( $mobile ) ) {
			$missing[] = 'mobile';
		}
		if ( '' === $state ) {
			$missing[] = 'state';
		}
		if ( '' === $city ) {
			$missing[] = 'city';
		}
		if ( '' === $address1 ) {
			$missing[] = 'address1';
		}
		if ( strlen( $postcode ) !== 10 ) {
			$missing[] = 'postcode';
		}

		return $missing;
	}

	/**
	 * Return whether user has completed all mandatory registration & address fields required for ordering/purchasing.
	 */
	public static function is_profile_complete_for_purchase( WP_User $user ) {
		return empty( self::get_missing_purchase_fields( $user ) );
	}

	/**
	 * Update authenticated user's registration, password, and billing/shipping fields.
	 */
	public static function update_account_profile( WP_User $user, $params ) {
		$user_id      = (int) $user->ID;
		$first_name   = isset( $params['firstName'] ) ? trim( sanitize_text_field( $params['firstName'] ) ) : trim( (string) $user->first_name );
		$last_name    = isset( $params['lastName'] ) ? trim( sanitize_text_field( $params['lastName'] ) ) : trim( (string) $user->last_name );
		$display_name = isset( $params['displayName'] ) ? trim( sanitize_text_field( $params['displayName'] ) ) : $user->display_name;
		$mobile_in    = isset( $params['mobile'] ) ? self::normalize_mobile( $params['mobile'] ) : get_user_meta( $user_id, 'kn_mobile', true );
		$email_in     = isset( $params['email'] ) ? trim( self::to_latin_digits( (string) $params['email'] ) ) : $user->user_email;
		$state        = isset( $params['state'] ) ? trim( sanitize_text_field( $params['state'] ) ) : trim( (string) get_user_meta( $user_id, 'billing_state', true ) );
		$city         = isset( $params['city'] ) ? trim( sanitize_text_field( $params['city'] ) ) : trim( (string) get_user_meta( $user_id, 'billing_city', true ) );
		$address_1    = isset( $params['address1'] ) ? trim( sanitize_text_field( $params['address1'] ) ) : trim( (string) get_user_meta( $user_id, 'billing_address_1', true ) );
		$postcode     = isset( $params['postcode'] ) ? self::normalize_digits( $params['postcode'] ) : self::normalize_digits( get_user_meta( $user_id, 'billing_postcode', true ) );
		$new_password = isset( $params['newPassword'] ) ? self::to_latin_digits( (string) $params['newPassword'] ) : '';

		if ( empty( $first_name ) || empty( $last_name ) ) {
			return new WP_Error( 'missing_name', 'لطفاً نام و نام خانوادگی خود را کامل وارد کنید.', array( 'status' => 400 ) );
		}

		if ( empty( $mobile_in ) || ! self::is_valid_iran_mobile( $mobile_in ) ) {
			return new WP_Error( 'invalid_mobile', 'شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع 09 وارد کنید.', array( 'status' => 400 ) );
		}

		if ( empty( $state ) || empty( $city ) || empty( $address_1 ) ) {
			return new WP_Error( 'missing_address', 'لطفاً استان، شهر و آدرس کامل پستی را وارد کنید.', array( 'status' => 400 ) );
		}

		if ( strlen( $postcode ) !== 10 ) {
			return new WP_Error( 'invalid_postcode', 'کد پستی باید دقیقاً ۱۰ رقم باشد.', array( 'status' => 400 ) );
		}

		// Prevent hijacking another user's mobile number
		$existing_mobile = get_users(
			array(
				'exclude'    => array( $user_id ),
				'meta_query' => array(
					'relation' => 'OR',
					array(
						'key'   => 'kn_mobile',
						'value' => $mobile_in,
					),
					array(
						'key'   => 'billing_phone',
						'value' => $mobile_in,
					),
				),
				'number'     => 1,
			)
		);
		if ( ! empty( $existing_mobile ) ) {
			return new WP_Error( 'mobile_exists', 'این شماره موبایل متعلق به حساب کاربری دیگری است.', array( 'status' => 409 ) );
		}

		$update_args = array(
			'ID'           => $user_id,
			'display_name' => $display_name ?: trim( $first_name . ' ' . $last_name ) ?: $user->display_name,
			'first_name'   => $first_name,
			'last_name'    => $last_name,
		);

		$final_email = $user->user_email;
		if ( empty( $email_in ) ) {
			$local_part    = strtolower( preg_replace( '/[^a-zA-Z0-9._-]/', '', $user->user_login ) );
			$default_email = sanitize_email( ( $local_part ?: $mobile_in ) . '@chootkeh.ir' );
			if ( ! email_exists( $default_email ) || (int) email_exists( $default_email ) === $user_id ) {
				$update_args['user_email'] = $default_email;
				$final_email               = $default_email;
			}
		} elseif ( $email_in !== $user->user_email ) {
			$sanitized = sanitize_email( $email_in );
			if ( ! is_email( $sanitized ) ) {
				return new WP_Error( 'invalid_email', 'ایمیل وارد شده معتبر نیست.', array( 'status' => 400 ) );
			}
			$owner = email_exists( $sanitized );
			if ( $owner && (int) $owner !== $user_id ) {
				return new WP_Error( 'email_exists', 'این ایمیل متعلق به حساب دیگری است.', array( 'status' => 409 ) );
			}
			$update_args['user_email'] = $sanitized;
			$final_email               = $sanitized;
			delete_user_meta( $user_id, 'kn_auto_email' );
		}

		if ( ! empty( $new_password ) ) {
			if ( strlen( $new_password ) < 6 ) {
				return new WP_Error( 'weak_password', 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.', array( 'status' => 400 ) );
			}
			$update_args['user_pass'] = $new_password;
		}

		$updated = wp_update_user( $update_args );
		if ( is_wp_error( $updated ) ) {
			return $updated;
		}

		self::sync_user_commerce_meta(
			$user_id,
			array(
				'first_name' => $first_name,
				'last_name'  => $last_name,
				'mobile'     => $mobile_in,
				'email'      => $final_email,
				'state'      => $state,
				'city'       => $city,
				'address_1'  => $address_1,
				'postcode'   => $postcode,
			)
		);

		clean_user_cache( $user_id );
		return get_user_by( 'id', $user_id );
	}

	/**
	 * Validate an app return URL strictly against http/https + configured allowed origins (prevents open redirects).
	 */
	public static function sanitize_app_return_url( $raw_url ) {
		$trimmed = trim( (string) $raw_url );
		if ( empty( $trimmed ) || strlen( $trimmed ) > 600 ) {
			return '';
		}
		if ( preg_match( '/[\r\n\x00-\x1f]/', $trimmed ) ) {
			return '';
		}

		$parsed = wp_parse_url( $trimmed );
		if ( ! is_array( $parsed ) || empty( $parsed['scheme'] ) || empty( $parsed['host'] ) ) {
			return '';
		}

		$scheme = strtolower( $parsed['scheme'] );
		if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
			return '';
		}

		$dest_origin = $scheme . '://' . strtolower( $parsed['host'] ) . ( isset( $parsed['port'] ) ? ':' . (int) $parsed['port'] : '' );
		$dest_host   = strtolower( $parsed['host'] );
		$home_host   = strtolower( (string) wp_parse_url( home_url( '/' ), PHP_URL_HOST ) );

		$settings = get_option( 'kn_soroban_settings', array() );
		$allowed  = trim( (string) ( $settings['allowed_origins'] ?? '*' ) );

		if ( $allowed !== '' && $allowed !== '*' ) {
			$ok      = ( $dest_host === $home_host );
			$origins = array_filter( array_map( 'trim', explode( ',', $allowed ) ) );
			foreach ( $origins as $orig ) {
				$orig_norm = strtolower( rtrim( $orig, '/' ) );
				if ( $orig_norm === $dest_origin ) {
					$ok = true;
					break;
				}
			}
			if ( ! $ok && ! empty( $_SERVER['HTTP_ORIGIN'] ) ) {
				$req_origin = strtolower( rtrim( sanitize_text_field( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) ), '/' ) );
				if ( $req_origin === $dest_origin ) {
					$ok = true;
				}
			}
			if ( ! $ok ) {
				return '';
			}
		}

		return esc_url_raw( $trimmed );
	}

	/**
	 * Sanitize originating view identifier for post-checkout return.
	 */
	public static function sanitize_return_from( $raw_from ) {
		$key = sanitize_key( (string) $raw_from );
		if ( in_array( $key, array( 'map', 'shop', 'orders' ), true ) ) {
			return $key;
		}
		return 'map';
	}

	/**
	 * Issue a single-use, short-lived (5 min) SSO handoff token so an authenticated
	 * headless app user lands on WooCommerce checkout already logged in.
	 */
	public static function issue_checkout_handoff( $user_id, $term_db_id = 0, $extra_items = array(), $return_url = '', $return_from = '' ) {
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

		$safe_return = self::sanitize_app_return_url( $return_url );
		$safe_from   = $return_from ? self::sanitize_return_from( $return_from ) : ( $term_db_id > 0 ? 'map' : 'shop' );

		$token_hash = hash( 'sha256', $raw_token );
		$payload    = array(
			'user_id'     => $user_id,
			'term_id'     => $term_db_id,
			'items'       => is_array( $extra_items ) ? $extra_items : array(),
			'return_url'  => $safe_return,
			'return_from' => $safe_from,
			'issued'      => time(),
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
			'user_id'     => absint( $payload['user_id'] ),
			'term_id'     => isset( $payload['term_id'] ) ? absint( $payload['term_id'] ) : 0,
			'items'       => isset( $payload['items'] ) && is_array( $payload['items'] ) ? $payload['items'] : array(),
			'return_url'  => isset( $payload['return_url'] ) ? self::sanitize_app_return_url( $payload['return_url'] ) : '',
			'return_from' => isset( $payload['return_from'] ) ? self::sanitize_return_from( $payload['return_from'] ) : 'map',
		);
	}

	/**
	 * Format user info for frontend.
	 */
	public static function format_user( WP_User $user ) {
		$uid        = (int) $user->ID;
		$mobile     = (string) ( get_user_meta( $uid, 'kn_mobile', true ) ?: get_user_meta( $uid, 'billing_phone', true ) );
		$first_name = (string) ( get_user_meta( $uid, 'first_name', true ) ?: get_user_meta( $uid, 'billing_first_name', true ) ?: $user->first_name );
		$last_name  = (string) ( get_user_meta( $uid, 'last_name', true ) ?: get_user_meta( $uid, 'billing_last_name', true ) ?: $user->last_name );
		$state      = (string) ( get_user_meta( $uid, 'billing_state', true ) ?: get_user_meta( $uid, 'shipping_state', true ) );
		$city       = (string) ( get_user_meta( $uid, 'billing_city', true ) ?: get_user_meta( $uid, 'shipping_city', true ) );
		$address1   = (string) ( get_user_meta( $uid, 'billing_address_1', true ) ?: get_user_meta( $uid, 'shipping_address_1', true ) );
		$postcode   = (string) ( get_user_meta( $uid, 'billing_postcode', true ) ?: get_user_meta( $uid, 'shipping_postcode', true ) );

		$missing_fields = self::get_missing_purchase_fields( $user );

		return array(
			'id'                   => $uid,
			'username'             => $user->user_login,
			'email'                => (string) $user->user_email,
			'mobile'               => $mobile,
			'firstName'            => $first_name,
			'lastName'             => $last_name,
			'displayName'          => $user->display_name ?: trim( $first_name . ' ' . $last_name ) ?: $user->user_login,
			'state'                => $state,
			'city'                 => $city,
			'address1'             => $address1,
			'postcode'             => $postcode,
			'profileComplete'      => empty( $missing_fields ),
			'missingProfileFields' => $missing_fields,
			'roles'                => array_values( $user->roles ),
			'isAdmin'              => user_can( $user, 'manage_options' ),
		);
	}

	/**
	 * Detect client platform ('mobile_app' vs 'web') from request payload or query params.
	 */
	public static function detect_platform_from_request( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		$raw    = '';
		if ( is_array( $params ) && ! empty( $params['platform'] ) ) {
			$raw = (string) $params['platform'];
		} else {
			$raw = (string) $request->get_param( 'platform' );
		}
		if ( $raw === 'mobile_app' || $raw === 'android' || $raw === 'ios' || $raw === 'capacitor' ) {
			return 'mobile_app';
		}
		return 'web';
	}

	/**
	 * Fetch user's session tokens for User CRM & Security Management.
	 */
	public static function get_user_tokens( $user_id ) {
		global $wpdb;
		$t_tokens = KN_DB::table_tokens();
		$rows     = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, device_label, expires_at, revoked, created_at FROM {$t_tokens} WHERE user_id = %d ORDER BY id DESC LIMIT 40",
				absint( $user_id )
			),
			ARRAY_A
		);
		return is_array( $rows ) ? $rows : array();
	}

	public static function revoke_token_by_id( $user_id, $token_id ) {
		global $wpdb;
		return false !== $wpdb->update(
			KN_DB::table_tokens(),
			array( 'revoked' => 1 ),
			array(
				'id'      => absint( $token_id ),
				'user_id' => absint( $user_id ),
			),
			array( '%d' ),
			array( '%d', '%d' )
		);
	}

	public static function revoke_all_user_tokens( $user_id ) {
		global $wpdb;
		return false !== $wpdb->update(
			KN_DB::table_tokens(),
			array( 'revoked' => 1 ),
			array( 'user_id' => absint( $user_id ) ),
			array( '%d' ),
			array( '%d' )
		);
	}

	/**
	 * Admin-side full user edit (profile, billing/shipping address, role, optional password reset).
	 */
	public static function admin_update_user_account( $user_id, $fields ) {
		$user_id = absint( $user_id );
		$user    = get_user_by( 'id', $user_id );
		if ( ! $user ) {
			return new WP_Error( 'not_found', 'کاربر یافت نشد.' );
		}

		$first_name   = sanitize_text_field( $fields['first_name'] ?? '' );
		$last_name    = sanitize_text_field( $fields['last_name'] ?? '' );
		$display_name = sanitize_text_field( $fields['display_name'] ?? '' );
		$mobile       = self::normalize_mobile( $fields['mobile'] ?? '' );
		$email_in     = sanitize_email( self::to_latin_digits( $fields['email'] ?? '' ) );
		$state        = sanitize_text_field( $fields['state'] ?? '' );
		$city         = sanitize_text_field( $fields['city'] ?? '' );
		$address_1    = sanitize_text_field( $fields['address_1'] ?? '' );
		$postcode     = self::normalize_digits( $fields['postcode'] ?? '' );
		$new_password = self::to_latin_digits( (string) ( $fields['new_password'] ?? '' ) );
		$role         = sanitize_key( $fields['role'] ?? '' );

		if ( $mobile !== '' && ! self::is_valid_iran_mobile( $mobile ) ) {
			return new WP_Error( 'invalid_mobile', 'فرمت شماره موبایل معتبر نیست (مثال: 09123456789).' );
		}

		if ( $mobile !== '' ) {
			$existing = get_users(
				array(
					'exclude'    => array( $user_id ),
					'meta_query' => array(
						'relation' => 'OR',
						array( 'key' => 'kn_mobile', 'value' => $mobile ),
						array( 'key' => 'billing_phone', 'value' => $mobile ),
					),
					'number'     => 1,
				)
			);
			if ( ! empty( $existing ) ) {
				return new WP_Error( 'mobile_exists', 'این شماره موبایل برای کاربر دیگری ثبت شده است.' );
			}
		}

		$update_args = array(
			'ID'           => $user_id,
			'first_name'   => $first_name,
			'last_name'    => $last_name,
			'display_name' => $display_name ?: ( trim( $first_name . ' ' . $last_name ) ?: $user->display_name ),
		);

		$final_email = $user->user_email;
		if ( ! empty( $email_in ) && $email_in !== $user->user_email ) {
			if ( ! is_email( $email_in ) ) {
				return new WP_Error( 'invalid_email', 'ایمیل وارد شده معتبر نیست.' );
			}
			$owner = email_exists( $email_in );
			if ( $owner && (int) $owner !== $user_id ) {
				return new WP_Error( 'email_exists', 'این ایمیل متعلق به حساب دیگری است.' );
			}
			$update_args['user_email'] = $email_in;
			$final_email               = $email_in;
			delete_user_meta( $user_id, 'kn_auto_email' );
		}

		if ( ! empty( $new_password ) ) {
			if ( strlen( $new_password ) < 6 ) {
				return new WP_Error( 'weak_password', 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' );
			}
			$update_args['user_pass'] = $new_password;
		}

		// Prevent admin from accidentally demoting themselves or assigning unknown roles
		if ( ! empty( $role ) && get_role( $role ) && $user_id !== get_current_user_id() ) {
			$update_args['role'] = $role;
		}

		$res = wp_update_user( $update_args );
		if ( is_wp_error( $res ) ) {
			return $res;
		}

		self::sync_user_commerce_meta(
			$user_id,
			array(
				'first_name' => $first_name,
				'last_name'  => $last_name,
				'mobile'     => $mobile,
				'email'      => $final_email,
				'state'      => $state,
				'city'       => $city,
				'address_1'  => $address_1,
				'postcode'   => $postcode,
			)
		);

		clean_user_cache( $user_id );
		return true;
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
