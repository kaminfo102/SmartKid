<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_SMS {

	const OTP_LENGTH               = 6;
	const OTP_TTL_SECONDS          = 180;
	const RESEND_COOLDOWN_SECONDS  = 60;
	const MAX_VERIFY_ATTEMPTS      = 5;
	const HOURLY_MOBILE_LIMIT      = 6;
	const HOURLY_IP_LIMIT          = 15;

	/**
	 * Return whether SMS.ir OTP authentication is enabled and configured.
	 */
	public static function is_enabled() {
		$settings    = get_option( 'kn_soroban_settings', array() );
		$enabled     = ! empty( $settings['smsir_enabled'] );
		$api_key     = trim( (string) ( $settings['smsir_api_key'] ?? '' ) );
		$template_id = absint( $settings['smsir_template_id'] ?? 0 );
		return $enabled && ! empty( $api_key ) && $template_id > 0;
	}

	/**
	 * Hash OTP bound to normalized mobile number and site auth salt.
	 */
	private static function hash_otp( $code, $mobile ) {
		$secret = wp_salt( 'auth' );
		if ( empty( $secret ) ) {
			$secret = hash( 'sha256', ABSPATH . get_site_url() );
		}
		return hash_hmac( 'sha256', (string) $code . '|' . (string) $mobile, $secret );
	}

	/**
	 * Hash client IP address for rate-limiting without storing raw PII.
	 */
	private static function get_client_ip_hash() {
		$ip = '';
		if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
			$ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) );
		} elseif ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$parts = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
			$ip    = trim( (string) ( $parts[0] ?? '' ) );
		} elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
		}
		$salt = wp_salt( 'nonce' );
		return hash( 'sha256', $ip . '|' . $salt );
	}

	/**
	 * Call SMS.ir REST API v1 (/v1/send/verify) to dispatch the verification template SMS.
	 */
	private static function send_verify_sms( $mobile, $code ) {
		$settings    = get_option( 'kn_soroban_settings', array() );
		$enabled     = ! empty( $settings['smsir_enabled'] );
		$api_key     = trim( (string) ( $settings['smsir_api_key'] ?? '' ) );
		$template_id = absint( $settings['smsir_template_id'] ?? 0 );
		$param_name  = sanitize_text_field( trim( (string) ( $settings['smsir_param_name'] ?? 'Code' ) ) );
		if ( empty( $param_name ) ) {
			$param_name = 'Code';
		}

		if ( ! $enabled ) {
			return new WP_Error(
				'sms_disabled',
				'سرویس ورود پیامکی در تنظیمات سرور غیرفعال است. لطفاً با پشتیبانی تماس بگیرید یا از ورود با رمز عبور استفاده کنید.',
				array( 'status' => 503 )
			);
		}

		if ( empty( $api_key ) || $template_id <= 0 ) {
			return new WP_Error(
				'sms_not_configured',
				'تنظیمات پنل پیامکی (کلید API یا شناسه قالب sms.ir) هنوز توسط مدیر سایت تکمیل نشده است.',
				array( 'status' => 503 )
			);
		}

		$payload = array(
			'mobile'     => $mobile,
			'templateId' => $template_id,
			'parameters' => array(
				array(
					'name'  => $param_name,
					'value' => (string) $code,
				),
			),
		);

		$response = wp_remote_post(
			'https://api.sms.ir/v1/send/verify',
			array(
				'timeout' => 15,
				'headers' => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'application/json',
					'x-api-key'    => $api_key,
				),
				'body'    => wp_json_encode( $payload ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'sms_network_error',
				'خطا در اتصال به سرویس پیامک sms.ir. لطفاً لحظاتی دیگر دوباره تلاش کنید.',
				array( 'status' => 502 )
			);
		}

		$http_code = (int) wp_remote_retrieve_response_code( $response );
		$raw_body  = wp_remote_retrieve_body( $response );
		$decoded   = json_decode( (string) $raw_body, true );

		if ( $http_code >= 200 && $http_code < 300 && is_array( $decoded ) && isset( $decoded['status'] ) && (int) $decoded['status'] === 1 ) {
			return true;
		}

		$remote_msg = ( is_array( $decoded ) && ! empty( $decoded['message'] ) )
			? sanitize_text_field( (string) $decoded['message'] )
			: '';

		$public_msg = 'ارسال پیامک کد تایید ناموفق بود.';
		if ( ! empty( $remote_msg ) && $http_code >= 400 && $http_code < 500 ) {
			$public_msg .= ' (' . $remote_msg . ')';
		}

		return new WP_Error(
			'sms_provider_error',
			$public_msg,
			array( 'status' => 502 )
		);
	}

	/**
	 * Generate and send an OTP verification code to an Iranian mobile number with strict rate limiting.
	 */
	public static function request_otp( $raw_mobile ) {
		global $wpdb;

		$mobile = KN_Auth::normalize_mobile( $raw_mobile );
		if ( ! KN_Auth::is_valid_iran_mobile( $mobile ) ) {
			return new WP_Error(
				'invalid_mobile',
				'شماره موبایل معتبر نیست. لطفاً شماره ۱۱ رقمی با شروع 09 وارد کنید (مثلاً 09123456789).',
				array( 'status' => 400 )
			);
		}

		$lock_key = 'kn_otp_lock_' . md5( $mobile );
		if ( get_transient( $lock_key ) ) {
			return new WP_Error(
				'otp_busy',
				'درخواست قبلی در حال پردازش است. لطفاً چند ثانیه صبر کنید.',
				array( 'status' => 429 )
			);
		}
		set_transient( $lock_key, '1', 8 );

		$t_otp   = KN_DB::table_otp_codes();
		$ip_hash = self::get_client_ip_hash();
		$now_ts  = time();

		// 1) Resend cooldown check per mobile
		$latest = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id, created_at FROM {$t_otp} WHERE mobile = %s ORDER BY id DESC LIMIT 1",
				$mobile
			),
			ARRAY_A
		);

		if ( $latest && ! empty( $latest['created_at'] ) ) {
			$created_ts = strtotime( $latest['created_at'] . ' UTC' );
			$elapsed    = $now_ts - $created_ts;
			if ( $elapsed >= 0 && $elapsed < self::RESEND_COOLDOWN_SECONDS ) {
				delete_transient( $lock_key );
				$retry_after = self::RESEND_COOLDOWN_SECONDS - $elapsed;
				return new WP_Error(
					'otp_cooldown',
					sprintf( 'لطفاً %d ثانیه تا درخواست مجدد کد تایید صبر کنید.', $retry_after ),
					array(
						'status'     => 429,
						'retryAfter' => $retry_after,
					)
				);
			}
		}

		// 2) Hourly rate limit per mobile
		$hour_ago      = gmdate( 'Y-m-d H:i:s', $now_ts - HOUR_IN_SECONDS );
		$mobile_hourly = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$t_otp} WHERE mobile = %s AND created_at >= %s",
				$mobile,
				$hour_ago
			)
		);
		if ( $mobile_hourly >= self::HOURLY_MOBILE_LIMIT ) {
			delete_transient( $lock_key );
			return new WP_Error(
				'otp_rate_limited',
				'تعداد درخواست‌های کد تایید برای این شماره در یک ساعت گذشته به سقف مجاز رسیده است. لطفاً بعداً تلاش کنید.',
				array( 'status' => 429 )
			);
		}

		// 3) Hourly rate limit per IP
		$ip_hourly = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$t_otp} WHERE ip_hash = %s AND created_at >= %s",
				$ip_hash,
				$hour_ago
			)
		);
		if ( $ip_hourly >= self::HOURLY_IP_LIMIT ) {
			delete_transient( $lock_key );
			return new WP_Error(
				'otp_ip_rate_limited',
				'تعداد درخواست‌های پیامک از این اتصال بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
				array( 'status' => 429 )
			);
		}

		// Generate cryptographic 6-digit OTP code
		try {
			$code_int = random_int( 100000, 999999 );
		} catch ( Exception $e ) {
			$code_int = wp_rand( 100000, 999999 );
		}
		$code = str_pad( (string) $code_int, self::OTP_LENGTH, '0', STR_PAD_LEFT );

		$sent = self::send_verify_sms( $mobile, $code );
		if ( is_wp_error( $sent ) ) {
			delete_transient( $lock_key );
			return $sent;
		}

		// Invalidate any prior unconsumed OTPs for this mobile
		$wpdb->update(
			$t_otp,
			array( 'consumed' => 1 ),
			array(
				'mobile'   => $mobile,
				'consumed' => 0,
			),
			array( '%d' ),
			array( '%s', '%d' )
		);

		$expires_at = gmdate( 'Y-m-d H:i:s', $now_ts + self::OTP_TTL_SECONDS );
		$created_at = gmdate( 'Y-m-d H:i:s', $now_ts );

		$wpdb->insert(
			$t_otp,
			array(
				'mobile'       => $mobile,
				'code_hash'    => self::hash_otp( $code, $mobile ),
				'attempts'     => 0,
				'max_attempts' => self::MAX_VERIFY_ATTEMPTS,
				'consumed'     => 0,
				'ip_hash'      => $ip_hash,
				'expires_at'   => $expires_at,
				'created_at'   => $created_at,
			),
			array( '%s', '%s', '%d', '%d', '%d', '%s', '%s', '%s' )
		);

		// Prune stale OTP rows older than 24 hours occasionally
		if ( wp_rand( 1, 10 ) === 1 ) {
			$cutoff = gmdate( 'Y-m-d H:i:s', $now_ts - DAY_IN_SECONDS );
			$wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$t_otp} WHERE created_at < %s",
					$cutoff
				)
			);
		}

		delete_transient( $lock_key );

		return array(
			'ok'                 => true,
			'mobile'             => $mobile,
			'codeLength'         => self::OTP_LENGTH,
			'expiresInSeconds'   => self::OTP_TTL_SECONDS,
			'resendAfterSeconds' => self::RESEND_COOLDOWN_SECONDS,
			'message'            => sprintf( 'کد تایید %d رقمی به شماره %s پیامک شد.', self::OTP_LENGTH, $mobile ),
		);
	}

	/**
	 * Verify a user-supplied OTP code against the stored HMAC hash. Single-use with attempt cap.
	 */
	public static function verify_otp( $raw_mobile, $raw_code ) {
		global $wpdb;

		$mobile = KN_Auth::normalize_mobile( $raw_mobile );
		$code   = KN_Auth::normalize_digits( $raw_code );

		if ( ! KN_Auth::is_valid_iran_mobile( $mobile ) ) {
			return new WP_Error( 'invalid_mobile', 'شماره موبایل معتبر نیست.', array( 'status' => 400 ) );
		}

		if ( strlen( $code ) !== self::OTP_LENGTH ) {
			return new WP_Error(
				'invalid_otp_format',
				sprintf( 'لطفاً کد تایید %d رقمی را کامل وارد کنید.', self::OTP_LENGTH ),
				array( 'status' => 400 )
			);
		}

		$t_otp = KN_DB::table_otp_codes();
		$row   = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$t_otp} WHERE mobile = %s AND consumed = 0 ORDER BY id DESC LIMIT 1",
				$mobile
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return new WP_Error(
				'otp_not_found',
				'کد تایید فعالی برای این شماره یافت نشد. لطفاً ابتدا درخواست ارسال کد را بزنید.',
				array( 'status' => 400 )
			);
		}

		$now_ts     = time();
		$expires_ts = strtotime( $row['expires_at'] . ' UTC' );
		if ( $expires_ts < $now_ts ) {
			$wpdb->update(
				$t_otp,
				array( 'consumed' => 1 ),
				array( 'id' => (int) $row['id'] ),
				array( '%d' ),
				array( '%d' )
			);
			return new WP_Error(
				'otp_expired',
				'مهلت استفاده از کد تایید به پایان رسیده است. لطفاً کد جدید دریافت کنید.',
				array( 'status' => 400 )
			);
		}

		$attempts     = (int) $row['attempts'];
		$max_attempts = max( 1, (int) $row['max_attempts'] );
		if ( $attempts >= $max_attempts ) {
			$wpdb->update(
				$t_otp,
				array( 'consumed' => 1 ),
				array( 'id' => (int) $row['id'] ),
				array( '%d' ),
				array( '%d' )
			);
			return new WP_Error(
				'otp_max_attempts',
				'تعداد تلاش‌های اشتباه بیش از حد مجاز است. لطفاً کد تایید جدید دریافت کنید.',
				array( 'status' => 429 )
			);
		}

		$provided_hash = self::hash_otp( $code, $mobile );
		if ( ! hash_equals( (string) $row['code_hash'], $provided_hash ) ) {
			$next_attempts = $attempts + 1;
			$exhausted     = $next_attempts >= $max_attempts;
			$wpdb->update(
				$t_otp,
				array(
					'attempts' => $next_attempts,
					'consumed' => $exhausted ? 1 : 0,
				),
				array( 'id' => (int) $row['id'] ),
				array( '%d', '%d' ),
				array( '%d' )
			);

			if ( $exhausted ) {
				return new WP_Error(
					'otp_max_attempts',
					'کد اشتباه بود و این کد منقضی شد. لطفاً کد جدید دریافت کنید.',
					array( 'status' => 429 )
				);
			}

			return new WP_Error(
				'otp_invalid',
				sprintf( 'کد تایید واردشده صحیح نیست (%d تلاش باقی‌مانده).', $max_attempts - $next_attempts ),
				array( 'status' => 400 )
			);
		}

		// Mark single-use OTP as consumed immediately upon successful verification
		$wpdb->update(
			$t_otp,
			array( 'consumed' => 1 ),
			array( 'id' => (int) $row['id'] ),
			array( '%d' ),
			array( '%d' )
		);

		return true;
	}
}
