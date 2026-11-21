<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_REST {

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'add_cors_headers' ), 10, 4 );
	}

	/**
	 * Add configurable CORS headers for Headless frontend apps.
	 */
	public static function add_cors_headers( $served, $result, $request, $server ) {
		$route = $request->get_route();
		if ( strpos( $route, '/' . KN_SOROBAN_API_NS ) !== 0 ) {
			return $served;
		}

		$settings        = get_option( 'kn_soroban_settings', array() );
		$allowed_raw     = isset( $settings['allowed_origins'] ) ? trim( (string) $settings['allowed_origins'] ) : '*';
		$request_origin  = isset( $_SERVER['HTTP_ORIGIN'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) ) : '';

		if ( $allowed_raw === '*' && ! empty( $request_origin ) ) {
			header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $request_origin ) );
			header( 'Vary: Origin' );
		} elseif ( ! empty( $request_origin ) ) {
			$allowed_list = array_filter( array_map( 'trim', explode( ',', $allowed_raw ) ) );
			if ( in_array( $request_origin, $allowed_list, true ) ) {
				header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $request_origin ) );
				header( 'Vary: Origin' );
			}
		}

		header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
		header( 'Access-Control-Allow-Credentials: true' );

		return $served;
	}

	public static function register_routes() {
		$ns = KN_SOROBAN_API_NS;

		// Health & public app metadata
		register_rest_route(
			$ns,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_health' ),
				'permission_callback' => '__return_true',
			)
		);

		// Auth endpoints
		register_rest_route(
			$ns,
			'/auth/register',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_register' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/auth/login',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_login' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/auth/logout',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_logout' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/auth/me',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_me' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		// Dynamic learning road (stages & steps)
		register_rest_route(
			$ns,
			'/curriculum',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_curriculum' ),
				'permission_callback' => '__return_true',
			)
		);

		// Dynamic practice question bank
		register_rest_route(
			$ns,
			'/questions',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_questions' ),
				'permission_callback' => '__return_true',
			)
		);

		// Child profiles CRUD (authenticated user owns their profiles)
		register_rest_route(
			$ns,
			'/profiles',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( __CLASS__, 'handle_get_profiles' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'handle_upsert_profile' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
			)
		);

		register_rest_route(
			$ns,
			'/profiles/(?P<client_id>[a-zA-Z0-9_\-]+)',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( __CLASS__, 'handle_update_profile' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( __CLASS__, 'handle_delete_profile' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
			)
		);

		// User settings sync
		register_rest_route(
			$ns,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( __CLASS__, 'handle_get_settings' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( __CLASS__, 'handle_update_settings' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
			)
		);
	}

	/**
	 * Permission callback that attaches authenticated WP_User to the request.
	 */
	public static function require_auth( WP_REST_Request $request ) {
		$user = KN_Auth::authenticate_request( $request );
		if ( ! $user ) {
			return new WP_Error(
				'kn_unauthorized',
				'نشست کاربری معتبر نیست. لطفاً دوباره وارد حساب خود شوید.',
				array( 'status' => 401 )
			);
		}
		$request->set_param( '_kn_user', $user );
		return true;
	}

	private static function get_authed_user( WP_REST_Request $request ) {
		$user = $request->get_param( '_kn_user' );
		if ( $user instanceof WP_User ) {
			return $user;
		}
		return KN_Auth::authenticate_request( $request );
	}

	private static function get_user_app_settings( $user_id ) {
		$plugin_settings = get_option( 'kn_soroban_settings', array() );
		$defaults        = array(
			'soundEnabled'  => ! empty( $plugin_settings['default_sound_enabled'] ),
			'musicEnabled'  => false,
			'speechEnabled' => ! empty( $plugin_settings['default_speech_enabled'] ),
			'reducedMotion' => false,
			'nightMode'     => ! empty( $plugin_settings['default_night_mode'] ),
			'digitMode'     => ( isset( $plugin_settings['default_digit_mode'] ) && $plugin_settings['default_digit_mode'] === 'en' ) ? 'en' : 'fa',
			'abacusScale'   => ( isset( $plugin_settings['default_abacus_scale'] ) && $plugin_settings['default_abacus_scale'] === 'large' ) ? 'large' : 'normal',
			'prefer2D'      => ! empty( $plugin_settings['default_prefer_2d'] ),
		);

		$saved = get_user_meta( $user_id, 'kn_soroban_user_settings', true );
		if ( is_array( $saved ) ) {
			return array_merge( $defaults, $saved );
		}
		return $defaults;
	}

	public static function handle_health() {
		$stages    = KN_DB::get_curriculum( true );
		$questions = KN_DB::get_questions( '', 0, true );
		$settings  = get_option( 'kn_soroban_settings', array() );

		return rest_ensure_response(
			array(
				'ok'                 => true,
				'pluginVersion'      => KN_SOROBAN_VERSION,
				'siteName'           => get_bloginfo( 'name' ),
				'appTitle'           => $settings['app_title'] ?? 'کودک نابغه',
				'allowRegistration'  => ! empty( $settings['allow_registration'] ),
				'dailyChallengeCount'=> isset( $settings['daily_challenge_count'] ) ? absint( $settings['daily_challenge_count'] ) : 5,
				'stagesCount'        => count( $stages ),
				'questionsCount'     => count( $questions ),
			)
		);
	}

	public static function handle_register( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$user = KN_Auth::register_user( $params );
		if ( is_wp_error( $user ) ) {
			return $user;
		}

		$device     = isset( $params['deviceLabel'] ) ? (string) $params['deviceLabel'] : 'Web App';
		$token_data = KN_Auth::issue_token( $user->ID, $device );
		$profiles   = KN_DB::get_user_profiles( $user->ID );
		$settings   = self::get_user_app_settings( $user->ID );

		return rest_ensure_response(
			array(
				'token'     => $token_data['token'],
				'expiresAt' => $token_data['expiresAt'],
				'user'      => KN_Auth::format_user( $user ),
				'profiles'  => $profiles,
				'settings'  => $settings,
			)
		);
	}

	public static function handle_login( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$login    = isset( $params['identifier'] ) ? sanitize_text_field( $params['identifier'] ) : ( isset( $params['email'] ) ? sanitize_text_field( $params['email'] ) : '' );
		$password = isset( $params['password'] ) ? (string) $params['password'] : '';

		if ( empty( $login ) || empty( $password ) ) {
			return new WP_Error( 'missing_credentials', 'نام کاربری/ایمیل و رمز عبور الزامی است.', array( 'status' => 400 ) );
		}

		$user = wp_authenticate( $login, $password );
		if ( is_wp_error( $user ) ) {
			return new WP_Error( 'invalid_credentials', 'ایمیل/نام کاربری یا رمز عبور اشتباه است.', array( 'status' => 401 ) );
		}

		$profiles = KN_DB::get_user_profiles( $user->ID );
		if ( empty( $profiles ) ) {
			KN_DB::upsert_profile(
				$user->ID,
				array(
					'id'     => 'child_' . time(),
					'name'   => $user->display_name ? $user->display_name : 'آرتین',
					'avatar' => 'owl',
					'age'    => 6,
				)
			);
			$profiles = KN_DB::get_user_profiles( $user->ID );
		}

		$device     = isset( $params['deviceLabel'] ) ? (string) $params['deviceLabel'] : 'Web App';
		$token_data = KN_Auth::issue_token( $user->ID, $device );
		$settings   = self::get_user_app_settings( $user->ID );

		return rest_ensure_response(
			array(
				'token'     => $token_data['token'],
				'expiresAt' => $token_data['expiresAt'],
				'user'      => KN_Auth::format_user( $user ),
				'profiles'  => $profiles,
				'settings'  => $settings,
			)
		);
	}

	public static function handle_logout( WP_REST_Request $request ) {
		KN_Auth::revoke_request_token( $request );
		return rest_ensure_response( array( 'ok' => true ) );
	}

	public static function handle_me( WP_REST_Request $request ) {
		$user = self::get_authed_user( $request );
		return rest_ensure_response(
			array(
				'user'     => KN_Auth::format_user( $user ),
				'profiles' => KN_DB::get_user_profiles( $user->ID ),
				'settings' => self::get_user_app_settings( $user->ID ),
			)
		);
	}

	public static function handle_curriculum() {
		$stages   = KN_DB::get_curriculum( true );
		$settings = get_option( 'kn_soroban_settings', array() );

		return rest_ensure_response(
			array(
				'stages' => $stages,
				'config' => array(
					'appTitle'            => $settings['app_title'] ?? 'کودک نابغه',
					'dailyChallengeCount' => isset( $settings['daily_challenge_count'] ) ? absint( $settings['daily_challenge_count'] ) : 5,
					'defaultSettings'     => array(
						'soundEnabled'  => ! empty( $settings['default_sound_enabled'] ),
						'speechEnabled' => ! empty( $settings['default_speech_enabled'] ),
						'nightMode'     => ! empty( $settings['default_night_mode'] ),
						'digitMode'     => ( isset( $settings['default_digit_mode'] ) && $settings['default_digit_mode'] === 'en' ) ? 'en' : 'fa',
						'abacusScale'   => ( isset( $settings['default_abacus_scale'] ) && $settings['default_abacus_scale'] === 'large' ) ? 'large' : 'normal',
						'prefer2D'      => ! empty( $settings['default_prefer_2d'] ),
					),
				),
			)
		);
	}

	public static function handle_questions( WP_REST_Request $request ) {
		$skill      = sanitize_text_field( (string) $request->get_param( 'skill' ) );
		$difficulty = absint( $request->get_param( 'difficulty' ) );
		$questions  = KN_DB::get_questions( $skill, $difficulty, true );

		return rest_ensure_response(
			array(
				'questions' => $questions,
			)
		);
	}

	public static function handle_get_profiles( WP_REST_Request $request ) {
		$user = self::get_authed_user( $request );
		return rest_ensure_response(
			array(
				'profiles' => KN_DB::get_user_profiles( $user->ID ),
			)
		);
	}

	public static function handle_upsert_profile( WP_REST_Request $request ) {
		$user   = self::get_authed_user( $request );
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			return new WP_Error( 'invalid_body', 'اطلاعات پروفایل نامعتبر است.', array( 'status' => 400 ) );
		}

		$profile = KN_DB::upsert_profile( $user->ID, $params );
		return rest_ensure_response(
			array(
				'profile'  => $profile,
				'profiles' => KN_DB::get_user_profiles( $user->ID ),
			)
		);
	}

	public static function handle_update_profile( WP_REST_Request $request ) {
		$user      = self::get_authed_user( $request );
		$client_id = sanitize_text_field( (string) $request->get_param( 'client_id' ) );
		$params    = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = array();
		}
		$params['id'] = $client_id;

		$profile = KN_DB::upsert_profile( $user->ID, $params );
		return rest_ensure_response(
			array(
				'profile'  => $profile,
				'profiles' => KN_DB::get_user_profiles( $user->ID ),
			)
		);
	}

	public static function handle_delete_profile( WP_REST_Request $request ) {
		global $wpdb;
		$user      = self::get_authed_user( $request );
		$client_id = sanitize_text_field( (string) $request->get_param( 'client_id' ) );

		$wpdb->delete(
			KN_DB::table_profiles(),
			array(
				'user_id'           => $user->ID,
				'client_profile_id' => $client_id,
			),
			array( '%d', '%s' )
		);

		return rest_ensure_response(
			array(
				'ok'       => true,
				'profiles' => KN_DB::get_user_profiles( $user->ID ),
			)
		);
	}

	public static function handle_get_settings( WP_REST_Request $request ) {
		$user = self::get_authed_user( $request );
		return rest_ensure_response(
			array(
				'settings' => self::get_user_app_settings( $user->ID ),
			)
		);
	}

	public static function handle_update_settings( WP_REST_Request $request ) {
		$user   = self::get_authed_user( $request );
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			return new WP_Error( 'invalid_body', 'تنظیمات نامعتبر است.', array( 'status' => 400 ) );
		}

		$clean = array(
			'soundEnabled'  => ! empty( $params['soundEnabled'] ),
			'musicEnabled'  => ! empty( $params['musicEnabled'] ),
			'speechEnabled' => ! empty( $params['speechEnabled'] ),
			'reducedMotion' => ! empty( $params['reducedMotion'] ),
			'nightMode'     => ! empty( $params['nightMode'] ),
			'digitMode'     => ( isset( $params['digitMode'] ) && $params['digitMode'] === 'en' ) ? 'en' : 'fa',
			'abacusScale'   => ( isset( $params['abacusScale'] ) && $params['abacusScale'] === 'large' ) ? 'large' : 'normal',
			'prefer2D'      => ! empty( $params['prefer2D'] ),
		);

		update_user_meta( $user->ID, 'kn_soroban_user_settings', $clean );

		return rest_ensure_response(
			array(
				'settings' => $clean,
			)
		);
	}
}
