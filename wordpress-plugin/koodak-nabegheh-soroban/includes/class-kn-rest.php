<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_REST {

	public static function init() {
		add_action( 'init', array( __CLASS__, 'handle_cors_preflight_early' ), 1 );
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_filter( 'rest_allowed_cors_headers', array( __CLASS__, 'filter_allowed_cors_headers' ), 99 );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'add_cors_headers' ), 99, 4 );
		add_filter( 'rest_authentication_errors', array( __CLASS__, 'bypass_third_party_jwt_errors' ), 999 );
	}

	/**
	 * Resolve validated Access-Control-Allow-Origin for the incoming request.
	 */
	private static function resolve_allowed_origin() {
		$settings       = get_option( 'kn_soroban_settings', array() );
		$allowed_raw    = isset( $settings['allowed_origins'] ) ? trim( (string) $settings['allowed_origins'] ) : '*';
		$request_origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? trim( sanitize_text_field( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) ) ) : '';

		if ( empty( $request_origin ) ) {
			return '';
		}

		if ( $allowed_raw === '*' || $allowed_raw === '' ) {
			return esc_url_raw( $request_origin );
		}

		$normalized_req = untrailingslashit( strtolower( $request_origin ) );
		$allowed_list   = array_filter( array_map( 'trim', explode( ',', $allowed_raw ) ) );
		foreach ( $allowed_list as $item ) {
			if ( untrailingslashit( strtolower( $item ) ) === $normalized_req ) {
				return esc_url_raw( $request_origin );
			}
		}

		return '';
	}

	private static function emit_cors_headers() {
		$origin = self::resolve_allowed_origin();
		if ( ! empty( $origin ) ) {
			header( 'Access-Control-Allow-Origin: ' . $origin );
			header( 'Vary: Origin' );
		}
		header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-KN-Auth, X-KN-App, X-Requested-With' );
		header( 'Access-Control-Allow-Credentials: true' );
		header( 'Access-Control-Max-Age: 86400' );
	}

	/**
	 * Answer browser CORS OPTIONS preflight requests early before WP core/security plugins strip custom headers.
	 */
	public static function handle_cors_preflight_early() {
		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : '';
		if ( $method !== 'OPTIONS' ) {
			return;
		}

		$uri        = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
		$rest_route = isset( $_GET['rest_route'] ) ? sanitize_text_field( wp_unslash( $_GET['rest_route'] ) ) : '';
		if ( strpos( $uri, KN_SOROBAN_API_NS ) === false && strpos( $rest_route, KN_SOROBAN_API_NS ) === false ) {
			return;
		}

		self::emit_cors_headers();
		status_header( 204 );
		exit;
	}

	/**
	 * Ensure WordPress core's rest_send_cors_headers() also permits X-KN-App and X-KN-Auth.
	 */
	public static function filter_allowed_cors_headers( $allow_headers ) {
		if ( ! is_array( $allow_headers ) ) {
			$allow_headers = array();
		}
		$extra = array(
			'Authorization',
			'Content-Type',
			'X-WP-Nonce',
			'X-KN-Auth',
			'X-KN-App',
			'X-Requested-With',
		);
		return array_values( array_unique( array_merge( $allow_headers, $extra ) ) );
	}

	/**
	 * Prevent third-party WordPress JWT plugins ("Wrong number of segments") from blocking
	 * koodak-nabegheh/v1 routes that perform their own strict token/cookie authentication.
	 */
	public static function bypass_third_party_jwt_errors( $result ) {
		if ( ! is_wp_error( $result ) ) {
			return $result;
		}
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
		if ( strpos( $uri, KN_SOROBAN_API_NS ) !== false && $result->get_error_code() !== 'kn_unauthorized' ) {
			return null;
		}
		return $result;
	}

	/**
	 * Add configurable CORS headers for Headless frontend apps.
	 */
	public static function add_cors_headers( $served, $result, $request, $server ) {
		$route = $request->get_route();
		if ( strpos( $route, '/' . KN_SOROBAN_API_NS ) !== 0 ) {
			return $served;
		}

		self::emit_cors_headers();

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
			'/auth/otp/send',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_otp_send' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/auth/otp/verify',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_otp_verify' ),
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
			'/auth/session',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_session_restore' ),
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

		// Account profile update & orders history
		register_rest_route(
			$ns,
			'/account/profile',
			array(
				'methods'             => 'PUT',
				'callback'            => array( __CLASS__, 'handle_update_account' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		register_rest_route(
			$ns,
			'/account/orders',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_get_orders' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		register_rest_route(
			$ns,
			'/orders/(?P<id>\d+)/receipt',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_upload_order_receipt' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		register_rest_route(
			$ns,
			'/checkout/offline',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_offline_checkout' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		// Dynamic Terms + Learning Roads + Stages & Steps
		register_rest_route(
			$ns,
			'/curriculum',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_curriculum' ),
				'permission_callback' => '__return_true',
			)
		);

		// Term Checkout & Order Verification
		register_rest_route(
			$ns,
			'/terms/(?P<id>\d+)/checkout',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_term_checkout' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		register_rest_route(
			$ns,
			'/terms/(?P<id>\d+)/verify-purchase',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_term_verify_purchase' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		// In-App Store Catalog & Cart Checkout
		register_rest_route(
			$ns,
			'/store/products',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_store_products' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/store/checkout',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_store_checkout' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		// Support Ticketing System
		register_rest_route(
			$ns,
			'/tickets',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( __CLASS__, 'handle_get_tickets' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'handle_create_ticket' ),
					'permission_callback' => array( __CLASS__, 'require_auth' ),
				),
			)
		);

		register_rest_route(
			$ns,
			'/tickets/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_get_ticket_detail' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
			)
		);

		register_rest_route(
			$ns,
			'/tickets/(?P<id>\d+)/reply',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_reply_ticket' ),
				'permission_callback' => array( __CLASS__, 'require_auth' ),
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

		register_rest_route(
			$ns,
			'/profiles/(?P<client_id>[a-zA-Z0-9_\-]+)/avatar',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'handle_upload_profile_avatar' ),
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

		// Web vs Mobile App Visit Analytics & Active Promotional Banners / Scheduled Dialogs
		register_rest_route(
			$ns,
			'/analytics/visit',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_analytics_visit' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/marketing/active',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_marketing_active' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/marketing/track',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_marketing_track' ),
				'permission_callback' => '__return_true',
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
		$terms     = KN_DB::get_terms_list( true );
		$stages    = KN_DB::get_curriculum( true );
		$questions = KN_DB::get_questions( '', 0, true );
		$settings  = get_option( 'kn_soroban_settings', array() );

		return rest_ensure_response(
			array(
				'ok'                  => true,
				'pluginVersion'       => KN_SOROBAN_VERSION,
				'siteName'            => get_bloginfo( 'name' ),
				'appTitle'            => $settings['app_title'] ?? 'کودک نابغه',
				'allowRegistration'   => ! empty( $settings['allow_registration'] ),
				'dailyChallengeCount' => isset( $settings['daily_challenge_count'] ) ? absint( $settings['daily_challenge_count'] ) : 5,
				'termsCount'          => count( $terms ),
				'stagesCount'         => count( $stages ),
				'questionsCount'      => count( $questions ),
				'wooActive'           => KN_Woo::is_woo_active(),
				'wooCurrency'         => KN_Woo::get_currency_label(),
				'smsOtpEnabled'       => KN_SMS::is_enabled(),
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
		$platform   = KN_Auth::detect_platform_from_request( $request );
		$token_data = KN_Auth::issue_token( $user->ID, $device );
		KN_Auth::set_session_cookie( $token_data['token'], intval( $token_data['expiresAt'] / 1000 ) );
		KN_DB::log_user_event( $user->ID, 'register', $platform, $device );
		$profiles   = KN_DB::get_user_profiles( $user->ID );
		$settings   = self::get_user_app_settings( $user->ID );
		$ent_map    = KN_DB::get_user_entitlement_map( $user->ID );

		return rest_ensure_response(
			array(
				'token'           => $token_data['token'],
				'expiresAt'       => $token_data['expiresAt'],
				'user'            => KN_Auth::format_user( $user ),
				'profiles'        => $profiles,
				'settings'        => $settings,
				'unlockedTermIds' => array_map( 'intval', array_keys( $ent_map ) ),
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
			return new WP_Error( 'missing_credentials', 'شماره موبایل یا ایمیل و رمز عبور الزامی است.', array( 'status' => 400 ) );
		}

		$resolved_login = KN_Auth::find_login_username( $login );
		$user           = wp_authenticate( $resolved_login, $password );
		if ( is_wp_error( $user ) ) {
			return new WP_Error( 'invalid_credentials', 'مشخصات ورود یا رمز عبور اشتباه است.', array( 'status' => 401 ) );
		}

		$profiles = KN_DB::get_user_profiles( $user->ID );
		if ( empty( $profiles ) ) {
			KN_DB::upsert_profile(
				$user->ID,
				array(
					'id'     => 'child_' . time(),
					'name'   => $user->display_name ? $user->display_name : 'کیا',
					'avatar' => 'owl',
					'age'    => 6,
				)
			);
			$profiles = KN_DB::get_user_profiles( $user->ID );
		}

		$device     = isset( $params['deviceLabel'] ) ? (string) $params['deviceLabel'] : 'Web App';
		$platform   = KN_Auth::detect_platform_from_request( $request );
		$token_data = KN_Auth::issue_token( $user->ID, $device );
		KN_Auth::set_session_cookie( $token_data['token'], intval( $token_data['expiresAt'] / 1000 ) );
		KN_DB::log_user_event( $user->ID, 'login_password', $platform, $device );
		$settings   = self::get_user_app_settings( $user->ID );
		$ent_map    = KN_DB::get_user_entitlement_map( $user->ID );

		return rest_ensure_response(
			array(
				'token'           => $token_data['token'],
				'expiresAt'       => $token_data['expiresAt'],
				'user'            => KN_Auth::format_user( $user ),
				'profiles'        => $profiles,
				'settings'        => $settings,
				'unlockedTermIds' => array_map( 'intval', array_keys( $ent_map ) ),
			)
		);
	}

	public static function handle_otp_send( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$mobile = isset( $params['mobile'] ) ? (string) $params['mobile'] : '';
		$result = KN_SMS::request_otp( $mobile );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	public static function handle_otp_verify( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$mobile     = isset( $params['mobile'] ) ? (string) $params['mobile'] : '';
		$code       = isset( $params['code'] ) ? (string) $params['code'] : '';
		$child_name = isset( $params['childName'] ) ? sanitize_text_field( (string) $params['childName'] ) : '';

		$verified = KN_SMS::verify_otp( $mobile, $code );
		if ( is_wp_error( $verified ) ) {
			return $verified;
		}

		$auth_result = KN_Auth::login_or_register_by_otp( $mobile, $child_name );
		if ( is_wp_error( $auth_result ) ) {
			return $auth_result;
		}

		/** @var WP_User $user */
		$user        = $auth_result['user'];
		$is_new_user = ! empty( $auth_result['isNewUser'] );
		$device      = isset( $params['deviceLabel'] ) ? (string) $params['deviceLabel'] : 'Mobile OTP';
		$platform    = KN_Auth::detect_platform_from_request( $request );
		$token_data  = KN_Auth::issue_token( $user->ID, $device );
		KN_Auth::set_session_cookie( $token_data['token'], intval( $token_data['expiresAt'] / 1000 ) );
		KN_DB::log_user_event( $user->ID, $is_new_user ? 'register' : 'login_otp', $platform, $device );

		$profiles = KN_DB::get_user_profiles( $user->ID );
		$settings = self::get_user_app_settings( $user->ID );
		$ent_map  = KN_DB::get_user_entitlement_map( $user->ID );

		return rest_ensure_response(
			array(
				'token'           => $token_data['token'],
				'expiresAt'       => $token_data['expiresAt'],
				'user'            => KN_Auth::format_user( $user ),
				'profiles'        => $profiles,
				'settings'        => $settings,
				'unlockedTermIds' => array_map( 'intval', array_keys( $ent_map ) ),
				'isNewUser'       => $is_new_user,
			)
		);
	}

	public static function handle_session_restore( WP_REST_Request $request ) {
		$app_header = $request->get_header( 'x-kn-app' );
		if ( empty( $app_header ) && ! empty( $_SERVER['HTTP_X_KN_APP'] ) ) {
			$app_header = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_KN_APP'] ) );
		}
		if ( empty( $app_header ) ) {
			return rest_ensure_response( array( 'authenticated' => false ) );
		}

		$user = KN_Auth::authenticate_request( $request );
		if ( ! $user ) {
			KN_Auth::clear_session_cookie();
			return rest_ensure_response( array( 'authenticated' => false ) );
		}

		$found = KN_Auth::extract_token_with_source( $request );
		$token = $found['token'];
		$exp   = time() + ( 30 * DAY_IN_SECONDS );
		if ( empty( $token ) ) {
			$issued = KN_Auth::issue_token( $user->ID, 'Session Restore' );
			$token  = $issued['token'];
			$exp    = intval( $issued['expiresAt'] / 1000 );
		}
		KN_Auth::set_session_cookie( $token, $exp );

		$platform = KN_Auth::detect_platform_from_request( $request );
		$r_key    = 'kn_srest_' . $user->ID . '_' . $platform;
		if ( ! get_transient( $r_key ) ) {
			KN_DB::log_user_event( $user->ID, 'session_restore', $platform, '' );
			set_transient( $r_key, 1, HOUR_IN_SECONDS );
		}

		$ent_map = KN_DB::get_user_entitlement_map( $user->ID );
		return rest_ensure_response(
			array(
				'authenticated'   => true,
				'token'           => $token,
				'expiresAt'       => $exp * 1000,
				'user'            => KN_Auth::format_user( $user ),
				'profiles'        => KN_DB::get_user_profiles( $user->ID ),
				'settings'        => self::get_user_app_settings( $user->ID ),
				'unlockedTermIds' => array_map( 'intval', array_keys( $ent_map ) ),
			)
		);
	}

	public static function handle_logout( WP_REST_Request $request ) {
		$user = KN_Auth::authenticate_request( $request );
		if ( $user ) {
			$platform = KN_Auth::detect_platform_from_request( $request );
			KN_DB::log_user_event( $user->ID, 'logout', $platform, '' );
		}
		KN_Auth::revoke_request_token( $request );
		return rest_ensure_response( array( 'ok' => true ) );
	}

	public static function handle_me( WP_REST_Request $request ) {
		$user    = self::get_authed_user( $request );
		$ent_map = KN_DB::get_user_entitlement_map( $user->ID );
		return rest_ensure_response(
			array(
				'user'            => KN_Auth::format_user( $user ),
				'profiles'        => KN_DB::get_user_profiles( $user->ID ),
				'settings'        => self::get_user_app_settings( $user->ID ),
				'unlockedTermIds' => array_map( 'intval', array_keys( $ent_map ) ),
			)
		);
	}

	public static function handle_update_account( WP_REST_Request $request ) {
		$user   = self::get_authed_user( $request );
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$updated = KN_Auth::update_account_profile( $user, $params );
		if ( is_wp_error( $updated ) ) {
			return $updated;
		}

		return rest_ensure_response(
			array(
				'user'    => KN_Auth::format_user( $updated ),
				'message' => 'مشخصات حساب کاربری با موفقیت به‌روزرسانی شد.',
			)
		);
	}

	public static function handle_get_orders( WP_REST_Request $request ) {
		$user = self::get_authed_user( $request );
		return rest_ensure_response(
			array(
				'orders'       => KN_Woo::get_user_orders( $user->ID ),
				'bacsAccounts' => KN_Woo::get_bacs_accounts(),
			)
		);
	}

	public static function handle_upload_order_receipt( WP_REST_Request $request ) {
		$user     = self::get_authed_user( $request );
		$order_id = absint( $request->get_param( 'id' ) );
		$files    = $request->get_file_params();
		$file     = ! empty( $files['receipt'] ) ? $files['receipt'] : null;
		$note     = (string) $request->get_param( 'note' );

		$res = KN_Woo::attach_receipt_to_order( $user, $order_id, $file, $note );
		if ( is_wp_error( $res ) ) {
			return $res;
		}

		return rest_ensure_response(
			array(
				'order'   => $res,
				'message' => 'رسید بانکی و توضیحات شما با موفقیت ثبت شد.',
			)
		);
	}

	private static function ensure_complete_profile_for_purchase( WP_User $user ) {
		$missing = KN_Auth::get_missing_purchase_fields( $user );
		if ( ! empty( $missing ) ) {
			return new WP_Error(
				'profile_incomplete',
				'برای ثبت سفارش و خرید، ابتدا باید مشخصات کامل خود (نام، نام خانوادگی، استان، شهر، آدرس پستی و کد پستی ۱۰ رقمی) را تکمیل کنید.',
				array(
					'status'        => 422,
					'missingFields' => $missing,
				)
			);
		}
		return true;
	}

	public static function handle_offline_checkout( WP_REST_Request $request ) {
		$user       = self::get_authed_user( $request );
		$check_prof = self::ensure_complete_profile_for_purchase( $user );
		if ( is_wp_error( $check_prof ) ) {
			return $check_prof;
		}
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$items = array();
		if ( ! empty( $params['items'] ) ) {
			$raw_items = is_string( $params['items'] ) ? json_decode( $params['items'], true ) : $params['items'];
			if ( is_array( $raw_items ) ) {
				$items = $raw_items;
			}
		} elseif ( ! empty( $params['termDbId'] ) ) {
			$items[] = array(
				'termDbId'  => absint( $params['termDbId'] ),
				'productId' => absint( $params['productId'] ?? 0 ),
				'qty'       => 1,
			);
		}

		$note  = isset( $params['note'] ) ? (string) $params['note'] : (string) $request->get_param( 'note' );
		$files = $request->get_file_params();
		$file  = ! empty( $files['receipt'] ) ? $files['receipt'] : null;

		$res = KN_Woo::create_offline_bacs_order( $user, $items, $note, $file );
		if ( is_wp_error( $res ) ) {
			return $res;
		}

		return rest_ensure_response( $res );
	}

	public static function handle_curriculum( WP_REST_Request $request ) {
		$authed_user = KN_Auth::authenticate_request( $request );
		$user_id     = $authed_user ? (int) $authed_user->ID : 0;

		$terms    = KN_DB::get_terms_curriculum( true, $user_id );
		$settings = get_option( 'kn_soroban_settings', array() );

		$flat_stages       = array();
		$unlocked_term_ids = array();
		foreach ( $terms as $term ) {
			if ( ! empty( $term['unlocked'] ) ) {
				$unlocked_term_ids[] = (int) $term['dbId'];
			}
			foreach ( $term['stages'] as $st ) {
				$flat_stages[] = $st;
			}
		}

		return rest_ensure_response(
			array(
				'terms'           => $terms,
				'stages'          => $flat_stages,
				'unlockedTermIds' => $unlocked_term_ids,
				'wooActive'       => KN_Woo::is_woo_active(),
				'wooCurrency'     => KN_Woo::get_currency_label(),
				'bacsAccounts'    => KN_Woo::get_bacs_accounts(),
				'config'          => array(
					'appTitle'            => $settings['app_title'] ?? 'کودک نابغه',
					'dailyChallengeCount' => isset( $settings['daily_challenge_count'] ) ? absint( $settings['daily_challenge_count'] ) : 5,
					'wooActive'           => KN_Woo::is_woo_active(),
					'wooCurrency'         => KN_Woo::get_currency_label(),
					'smsOtpEnabled'       => KN_SMS::is_enabled(),
					'audioSettings'       => KN_DB::get_audio_settings(),
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

	public static function handle_term_checkout( WP_REST_Request $request ) {
		global $wpdb;
		$user       = self::get_authed_user( $request );
		$term_db_id = absint( $request->get_param( 'id' ) );
		$params     = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$return_url  = isset( $params['returnUrl'] ) ? KN_Auth::sanitize_app_return_url( $params['returnUrl'] ) : '';
		$return_from = isset( $params['from'] ) ? KN_Auth::sanitize_return_from( $params['from'] ) : 'map';

		$term = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . KN_DB::table_terms() . ' WHERE id = %d',
				$term_db_id
			),
			ARRAY_A
		);

		if ( ! $term ) {
			return new WP_Error( 'term_not_found', 'دوره مورد نظر یافت نشد.', array( 'status' => 404 ) );
		}

		$entitlements     = KN_DB::get_user_entitlement_map( $user->ID );
		$already_unlocked = ! empty( $term['is_free'] ) || isset( $entitlements[ $term_db_id ] ) || user_can( $user->ID, 'manage_options' );
		if ( ! $already_unlocked ) {
			$check_prof = self::ensure_complete_profile_for_purchase( $user );
			if ( is_wp_error( $check_prof ) ) {
				return $check_prof;
			}
		}
		$commerce         = KN_Woo::get_term_commerce_meta( $term, $user->ID, true, $return_url, $return_from );
		$pending_map      = KN_Woo::get_pending_term_order_map( $user->ID );

		return rest_ensure_response(
			array(
				'termDbId'              => $term_db_id,
				'termTitle'             => $term['title'],
				'alreadyUnlocked'       => $already_unlocked,
				'pendingOrder'          => $pending_map[ $term_db_id ] ?? null,
				'wooActive'             => KN_Woo::is_woo_active(),
				'wooProductId'          => (int) $term['woo_product_id'],
				'priceAmount'           => (int) $commerce['priceAmount'],
				'priceFormatted'        => $commerce['priceFormatted'],
				'regularPriceAmount'    => (int) $commerce['regularPriceAmount'],
				'regularPriceFormatted' => $commerce['regularPriceFormatted'],
				'salePriceAmount'       => $commerce['salePriceAmount'],
				'salePriceFormatted'    => $commerce['salePriceFormatted'],
				'onSale'                => (bool) $commerce['onSale'],
				'discountPercent'       => (int) $commerce['discountPercent'],
				'saleEndTimestamp'      => $commerce['saleEndTimestamp'],
				'checkoutUrl'           => $commerce['checkoutUrl'],
				'bacsAccounts'          => KN_Woo::get_bacs_accounts(),
			)
		);
	}

	public static function handle_term_verify_purchase( WP_REST_Request $request ) {
		$user       = self::get_authed_user( $request );
		$term_db_id = absint( $request->get_param( 'id' ) );

		$res = KN_Woo::verify_user_purchase_for_term( $user->ID, $term_db_id );
		if ( is_wp_error( $res ) ) {
			return $res;
		}

		$ent_map                = KN_DB::get_user_entitlement_map( $user->ID );
		$res['unlockedTermIds'] = array_map( 'intval', array_keys( $ent_map ) );

		return rest_ensure_response( $res );
	}

	public static function handle_store_products( WP_REST_Request $request ) {
		$category_id = absint( $request->get_param( 'category' ) );
		$search      = sanitize_text_field( (string) $request->get_param( 'search' ) );
		return rest_ensure_response( KN_Woo::get_store_catalog( $category_id, $search ) );
	}

	public static function handle_store_checkout( WP_REST_Request $request ) {
		$user       = self::get_authed_user( $request );
		$check_prof = self::ensure_complete_profile_for_purchase( $user );
		if ( is_wp_error( $check_prof ) ) {
			return $check_prof;
		}
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$items       = isset( $params['items'] ) ? $params['items'] : array();
		$return_url  = isset( $params['returnUrl'] ) ? KN_Auth::sanitize_app_return_url( $params['returnUrl'] ) : '';
		$return_from = isset( $params['from'] ) ? KN_Auth::sanitize_return_from( $params['from'] ) : 'shop';
		$res         = KN_Woo::create_store_sso_checkout_url( $user->ID, $items, $return_url, $return_from );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		return rest_ensure_response( $res );
	}

	public static function handle_get_tickets( WP_REST_Request $request ) {
		$user = self::get_authed_user( $request );
		return rest_ensure_response(
			array(
				'tickets' => KN_DB::get_tickets_for_user( $user->ID ),
			)
		);
	}

	public static function handle_create_ticket( WP_REST_Request $request ) {
		$user    = self::get_authed_user( $request );
		$params  = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$subject  = isset( $params['subject'] ) ? (string) $params['subject'] : (string) $request->get_param( 'subject' );
		$category = isset( $params['category'] ) ? (string) $params['category'] : (string) $request->get_param( 'category' );
		$message  = isset( $params['message'] ) ? (string) $params['message'] : (string) $request->get_param( 'message' );

		if ( empty( trim( $subject ) ) || empty( trim( $message ) ) ) {
			return new WP_Error( 'invalid_ticket', 'موضوع و متن پیام تیکت الزامی است.', array( 'status' => 400 ) );
		}

		$attachment_url = '';
		$files          = $request->get_file_params();
		if ( ! empty( $files['attachment'] ) && ! empty( $files['attachment']['tmp_name'] ) ) {
			$saved = KN_Woo::save_compressed_user_image( $user, $files['attachment'], 'ticket' );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			$attachment_url = $saved['url'];
		}

		$ticket = KN_DB::create_ticket( $user->ID, $subject, $category, $message, $attachment_url );
		if ( ! $ticket ) {
			return new WP_Error( 'ticket_failed', 'امکان ثبت تیکت در این لحظه وجود ندارد.', array( 'status' => 500 ) );
		}

		return rest_ensure_response(
			array(
				'ticket'  => $ticket,
				'message' => 'تیکت پشتیبانی شما با موفقیت ثبت شد و کارشناسان ما به‌زودی پاسخ می‌دهند.',
			)
		);
	}

	public static function handle_get_ticket_detail( WP_REST_Request $request ) {
		$user      = self::get_authed_user( $request );
		$ticket_id = absint( $request->get_param( 'id' ) );
		$is_admin  = user_can( $user, 'manage_options' );
		$ticket    = KN_DB::get_ticket_detail( $ticket_id, $user->ID, $is_admin );

		if ( ! $ticket ) {
			return new WP_Error( 'ticket_not_found', 'تیکت مورد نظر یافت نشد.', array( 'status' => 404 ) );
		}

		return rest_ensure_response( array( 'ticket' => $ticket ) );
	}

	public static function handle_reply_ticket( WP_REST_Request $request ) {
		$user      = self::get_authed_user( $request );
		$ticket_id = absint( $request->get_param( 'id' ) );
		$is_admin  = user_can( $user, 'manage_options' );
		$existing  = KN_DB::get_ticket_detail( $ticket_id, $user->ID, $is_admin );

		if ( ! $existing ) {
			return new WP_Error( 'ticket_not_found', 'تیکت مورد نظر یافت نشد.', array( 'status' => 404 ) );
		}

		$params  = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$message = isset( $params['message'] ) ? (string) $params['message'] : (string) $request->get_param( 'message' );
		if ( empty( trim( $message ) ) ) {
			return new WP_Error( 'empty_reply', 'متن پاسخ را وارد کنید.', array( 'status' => 400 ) );
		}

		$attachment_url = '';
		$files          = $request->get_file_params();
		if ( ! empty( $files['attachment'] ) && ! empty( $files['attachment']['tmp_name'] ) ) {
			$saved = KN_Woo::save_compressed_user_image( $user, $files['attachment'], 'ticket' );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			$attachment_url = $saved['url'];
		}

		$ok = KN_DB::add_ticket_reply( $ticket_id, $user->ID, $is_admin, $message, $attachment_url );
		if ( ! $ok ) {
			return new WP_Error( 'reply_failed', 'خطا در ارسال پاسخ.', array( 'status' => 500 ) );
		}

		return rest_ensure_response(
			array(
				'ticket' => KN_DB::get_ticket_detail( $ticket_id, $user->ID, $is_admin ),
			)
		);
	}

	public static function handle_questions( WP_REST_Request $request ) {
		$skill      = sanitize_text_field( (string) $request->get_param( 'skill' ) );
		$difficulty = absint( $request->get_param( 'difficulty' ) );
		$term_id    = absint( $request->get_param( 'termId' ) );
		$questions  = KN_DB::get_questions( $skill, $difficulty, true, $term_id );

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

	public static function handle_upload_profile_avatar( WP_REST_Request $request ) {
		global $wpdb;
		$user      = self::get_authed_user( $request );
		$client_id = sanitize_text_field( (string) $request->get_param( 'client_id' ) );

		if ( empty( $client_id ) ) {
			return new WP_Error( 'invalid_profile', 'شناسه پروفایل کودک معتبر نیست.', array( 'status' => 400 ) );
		}

		$files = $request->get_file_params();
		$file  = ! empty( $files['avatar'] ) ? $files['avatar'] : null;
		if ( ! $file || empty( $file['tmp_name'] ) ) {
			return new WP_Error( 'missing_avatar', 'فایل تصویر پروفایل دریافت نشد.', array( 'status' => 400 ) );
		}

		$t_profiles = KN_DB::table_profiles();
		$existing   = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$t_profiles} WHERE user_id = %d AND client_profile_id = %s",
				absint( $user->ID ),
				$client_id
			),
			ARRAY_A
		);

		if ( ! $existing ) {
			KN_DB::upsert_profile(
				$user->ID,
				array(
					'id'     => $client_id,
					'name'   => 'کیا',
					'avatar' => 'owl',
					'age'    => 6,
				)
			);
		}

		$saved = KN_Woo::save_compressed_user_image( $user, $file, 'avatar', 'kn-avatars' );
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}

		$wpdb->update(
			$t_profiles,
			array( 'avatar_url' => esc_url_raw( $saved['url'] ) ),
			array(
				'user_id'           => absint( $user->ID ),
				'client_profile_id' => $client_id,
			),
			array( '%s' ),
			array( '%d', '%s' )
		);

		$updated_row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$t_profiles} WHERE user_id = %d AND client_profile_id = %s",
				absint( $user->ID ),
				$client_id
			),
			ARRAY_A
		);

		return rest_ensure_response(
			array(
				'ok'        => true,
				'avatarUrl' => esc_url_raw( $saved['url'] ),
				'profile'   => $updated_row ? KN_DB::format_profile_row( $updated_row ) : null,
				'profiles'  => KN_DB::get_user_profiles( $user->ID ),
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

	public static function handle_analytics_visit( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$user        = KN_Auth::authenticate_request( $request );
		$user_id     = $user ? (int) $user->ID : 0;
		$platform    = KN_Auth::detect_platform_from_request( $request );
		$device_os   = isset( $params['deviceOs'] ) ? sanitize_key( (string) $params['deviceOs'] ) : '';
		$screen      = isset( $params['screen'] ) ? sanitize_key( (string) $params['screen'] ) : 'start';
		$session_key = isset( $params['sessionKey'] ) ? sanitize_key( (string) $params['sessionKey'] ) : '';

		KN_Marketing::record_event( 'app_visit', 0, $platform, $device_os, $screen, $user_id, $session_key );

		return rest_ensure_response( array( 'ok' => true ) );
	}

	public static function handle_marketing_active( WP_REST_Request $request ) {
		$user     = KN_Auth::authenticate_request( $request );
		$user_id  = $user ? (int) $user->ID : 0;
		$platform = KN_Auth::detect_platform_from_request( $request );
		return rest_ensure_response( KN_Marketing::get_active_marketing_payload( $platform, $user_id ) );
	}

	public static function handle_marketing_track( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}
		$user        = KN_Auth::authenticate_request( $request );
		$user_id     = $user ? (int) $user->ID : 0;
		$event_type  = isset( $params['eventType'] ) ? sanitize_key( (string) $params['eventType'] ) : '';
		$target_id   = isset( $params['targetId'] ) ? absint( $params['targetId'] ) : 0;
		$platform    = KN_Auth::detect_platform_from_request( $request );
		$device_os   = isset( $params['deviceOs'] ) ? sanitize_key( (string) $params['deviceOs'] ) : '';
		$screen      = isset( $params['screen'] ) ? sanitize_key( (string) $params['screen'] ) : '';
		$session_key = isset( $params['sessionKey'] ) ? sanitize_key( (string) $params['sessionKey'] ) : '';

		$allowed_marketing = array(
			'banner_impression',
			'banner_click',
			'dialog_impression',
			'dialog_click',
			'dialog_close',
			'dialog_autoclose',
		);
		if ( ! in_array( $event_type, $allowed_marketing, true ) || $target_id <= 0 ) {
			return new WP_Error( 'invalid_event', 'رویداد بازاریابی نامعتبر است.', array( 'status' => 400 ) );
		}

		KN_Marketing::record_event( $event_type, $target_id, $platform, $device_os, $screen, $user_id, $session_key );
		return rest_ensure_response( array( 'ok' => true ) );
	}
}
