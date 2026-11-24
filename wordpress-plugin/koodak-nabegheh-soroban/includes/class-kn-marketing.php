<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Promotional Banners, Advanced Scheduled Dialogs & Web/Mobile App Analytics Engine.
 */
class KN_Marketing {

	public static $placements = array(
		'home_top'    => 'صفحه اصلی — بالای صفحه',
		'home_bottom' => 'صفحه اصلی — پایین صفحه',
		'shop_top'    => 'فروشگاه اپلیکیشن — بالای لیست محصولات',
		'map_top'     => 'نقشه مراحل و ترم‌ها — بالای نقشه',
	);

	public static $banner_actions = array(
		'none'         => 'فقط نمایشی (بدون لینک)',
		'app_screen'   => 'باز کردن صفحه داخل اپلیکیشن',
		'external_url' => 'باز کردن لینک خارجی (وب / تلگرام / محصول)',
	);

	public static $dialog_actions = array(
		'dismiss'       => 'فقط بستن دیالوگ',
		'app_screen'    => 'هدایت به صفحه داخل اپلیکیشن',
		'external_url'  => 'باز کردن لینک خارجی',
		'term_checkout' => 'شروع خرید ترم خاص (شناسه ترم)',
	);

	public static $app_screens = array(
		'start'     => 'صفحه اصلی',
		'map'       => 'نقشه مراحل و ترم‌ها',
		'shop'      => 'فروشگاه تجهیزات و کتاب',
		'games'     => 'بازی‌های فکری',
		'practice'  => 'تمرین هوشمند',
		'simulator' => 'چرتکه آزاد',
		'tickets'   => 'پشتیبانی و تیکت‌ها',
		'parents'   => 'بخش والدین',
	);

	public static $dialog_sizes = array(
		'sm'         => 'کوچک (Compact)',
		'md'         => 'متوسط (استاندارد)',
		'lg'         => 'بزرگ (عریض)',
		'fullscreen' => 'تمام صفحه (Hero)',
	);

	public static $dialog_positions = array(
		'center'       => 'وسط صفحه (Modal)',
		'bottom_sheet' => 'پنجره کشویی پایین (Bottom Sheet)',
	);

	public static $dialog_themes = array(
		'brand'       => 'رسمی کودک نابغه (آبی روشن)',
		'celebration' => 'جشنواره و تخفیف (طلایی/نارنجی)',
		'urgent'      => 'اطلاعیه مهم (قرمز/هشدار)',
		'dark'        => 'حالت تیره مدرن (Dark Slate)',
		'glass'       => 'شیشه‌ای ملایم (Glass)',
	);

	public static $dialog_frequencies = array(
		'once_ever'      => 'فقط یک بار برای همیشه (هر کاربر)',
		'once_per_session' => 'یک بار در هر نشست ورود به اپ',
		'once_per_day'   => 'حداکثر روزی یک بار',
		'every_n_hours'  => 'هر چند ساعت یک بار (تعیین ساعت)',
		'always'         => 'همیشه در هر بار ورود به صفحه هدف',
	);

	public static $audiences = array(
		'all'          => 'همه کاربران (مهمان و عضو)',
		'logged_in'    => 'فقط کاربران وارد شده',
		'guest'        => 'فقط کاربران مهمان (وارد نشده)',
		'paid_users'   => 'کاربران دارای ترم پولی فعال',
		'unpaid_users' => 'کاربران بدون ترم پولی (تشویق به خرید)',
	);

	public static function sanitize_url_or_screen( $action_type, $raw_target ) {
		$trimmed = trim( (string) $raw_target );
		if ( $action_type === 'app_screen' ) {
			$key = sanitize_key( $trimmed );
			return array_key_exists( $key, self::$app_screens ) ? $key : 'start';
		}
		if ( $action_type === 'term_checkout' ) {
			return (string) absint( $trimmed );
		}
		if ( $action_type === 'external_url' ) {
			if ( empty( $trimmed ) ) {
				return '';
			}
			$parsed = wp_parse_url( $trimmed );
			if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
				return esc_url_raw( $trimmed );
			}
			return '';
		}
		return '';
	}

	public static function sanitize_image_url( $raw ) {
		$trimmed = trim( (string) $raw );
		if ( empty( $trimmed ) ) {
			return '';
		}
		$parsed = wp_parse_url( $trimmed );
		if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
			return esc_url_raw( $trimmed );
		}
		return '';
	}

	/* =====================================================================
	 * BANNERS CRUD
	 * ===================================================================== */

	public static function get_all_banners() {
		global $wpdb;
		$t    = KN_DB::table_banners();
		$rows = $wpdb->get_results( "SELECT * FROM {$t} ORDER BY sort_order ASC, id DESC", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public static function get_banner( $id ) {
		global $wpdb;
		$t = KN_DB::table_banners();
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$t} WHERE id = %d", absint( $id ) ), ARRAY_A );
	}

	public static function save_banner( $post, $id = 0 ) {
		global $wpdb;
		$t           = KN_DB::table_banners();
		$action_type = sanitize_key( $post['action_type'] ?? 'none' );
		if ( ! array_key_exists( $action_type, self::$banner_actions ) ) {
			$action_type = 'none';
		}
		$placement = sanitize_key( $post['placement'] ?? 'home_top' );
		if ( ! array_key_exists( $placement, self::$placements ) ) {
			$placement = 'home_top';
		}
		$target_platform = sanitize_key( $post['target_platform'] ?? 'all' );
		if ( ! in_array( $target_platform, array( 'all', 'web', 'mobile_app' ), true ) ) {
			$target_platform = 'all';
		}

		$start_mysql = KN_Jalali::parse_jalali_to_mysql( $post['start_jdate'] ?? '', $post['start_time'] ?? '00:00', false );
		$end_mysql   = KN_Jalali::parse_jalali_to_mysql( $post['end_jdate'] ?? '', $post['end_time'] ?? '23:59', true );

		$data = array(
			'title'           => sanitize_text_field( $post['title'] ?? '' ),
			'subtitle'        => sanitize_text_field( $post['subtitle'] ?? '' ),
			'badge_text'      => sanitize_text_field( $post['badge_text'] ?? '' ),
			'image_url'       => self::sanitize_image_url( $post['image_url'] ?? '' ),
			'cta_text'        => sanitize_text_field( $post['cta_text'] ?? '' ),
			'action_type'     => $action_type,
			'action_target'   => self::sanitize_url_or_screen( $action_type, $post['action_target'] ?? '' ),
			'placement'       => $placement,
			'bg_color'        => sanitize_hex_color( $post['bg_color'] ?? '#EFF6FF' ) ?: '#EFF6FF',
			'text_color'      => sanitize_hex_color( $post['text_color'] ?? '#0F172A' ) ?: '#0F172A',
			'target_platform' => $target_platform,
			'start_at'        => $start_mysql !== '' ? $start_mysql : null,
			'end_at'          => $end_mysql !== '' ? $end_mysql : null,
			'sort_order'      => max( 1, absint( $post['sort_order'] ?? 1 ) ),
			'is_active'       => ! empty( $post['is_active'] ) ? 1 : 0,
		);

		if ( empty( $data['title'] ) ) {
			return false;
		}

		if ( $id > 0 ) {
			$wpdb->update( $t, $data, array( 'id' => absint( $id ) ) );
			return absint( $id );
		}
		$wpdb->insert( $t, $data );
		return (int) $wpdb->insert_id;
	}

	public static function delete_banner( $id ) {
		global $wpdb;
		return false !== $wpdb->delete( KN_DB::table_banners(), array( 'id' => absint( $id ) ), array( '%d' ) );
	}

	/* =====================================================================
	 * SCHEDULED DIALOGS CRUD
	 * ===================================================================== */

	public static function get_all_dialogs() {
		global $wpdb;
		$t    = KN_DB::table_dialogs();
		$rows = $wpdb->get_results( "SELECT * FROM {$t} ORDER BY priority ASC, id DESC", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public static function get_dialog( $id ) {
		global $wpdb;
		$t = KN_DB::table_dialogs();
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$t} WHERE id = %d", absint( $id ) ), ARRAY_A );
	}

	private static function sanitize_hhmm( $raw ) {
		$clean = trim( KN_Jalali::to_latin_digits( (string) $raw ) );
		if ( preg_match( '/^(\d{1,2}):(\d{1,2})$/', $clean, $m ) ) {
			$h = min( 23, max( 0, (int) $m[1] ) );
			$i = min( 59, max( 0, (int) $m[2] ) );
			return sprintf( '%02d:%02d', $h, $i );
		}
		return '';
	}

	public static function save_dialog( $post, $id = 0 ) {
		global $wpdb;
		$t           = KN_DB::table_dialogs();
		$action_type = sanitize_key( $post['action_type'] ?? 'dismiss' );
		if ( ! array_key_exists( $action_type, self::$dialog_actions ) ) {
			$action_type = 'dismiss';
		}

		$target_platform = sanitize_key( $post['target_platform'] ?? 'all' );
		if ( ! in_array( $target_platform, array( 'all', 'web', 'mobile_app' ), true ) ) {
			$target_platform = 'all';
		}

		$audience = sanitize_key( $post['target_audience'] ?? 'all' );
		if ( ! array_key_exists( $audience, self::$audiences ) ) {
			$audience = 'all';
		}

		$size = sanitize_key( $post['dialog_size'] ?? 'md' );
		if ( ! array_key_exists( $size, self::$dialog_sizes ) ) {
			$size = 'md';
		}

		$position = sanitize_key( $post['position'] ?? 'center' );
		if ( ! array_key_exists( $position, self::$dialog_positions ) ) {
			$position = 'center';
		}

		$theme = sanitize_key( $post['theme_style'] ?? 'brand' );
		if ( ! array_key_exists( $theme, self::$dialog_themes ) ) {
			$theme = 'brand';
		}

		$freq_mode = sanitize_key( $post['frequency_mode'] ?? 'once_per_day' );
		if ( ! array_key_exists( $freq_mode, self::$dialog_frequencies ) ) {
			$freq_mode = 'once_per_day';
		}

		$anim = sanitize_key( $post['animation'] ?? 'scale' );
		if ( ! in_array( $anim, array( 'scale', 'slide_up', 'fade' ), true ) ) {
			$anim = 'scale';
		}

		$weekdays_in = isset( $post['weekdays'] ) && is_array( $post['weekdays'] ) ? $post['weekdays'] : array( '0', '1', '2', '3', '4', '5', '6' );
		$weekdays    = array();
		foreach ( $weekdays_in as $wd ) {
			$d = (int) $wd;
			if ( $d >= 0 && $d <= 6 && ! in_array( $d, $weekdays, true ) ) {
				$weekdays[] = $d;
			}
		}
		sort( $weekdays );
		$weekdays_mask = ! empty( $weekdays ) ? implode( ',', $weekdays ) : '0,1,2,3,4,5,6';

		$screens_in = isset( $post['target_screens'] ) && is_array( $post['target_screens'] ) ? $post['target_screens'] : array( 'all' );
		$screens    = array();
		foreach ( $screens_in as $sc ) {
			$skey = sanitize_key( $sc );
			if ( $skey === 'all' || array_key_exists( $skey, self::$app_screens ) ) {
				$screens[] = $skey;
			}
		}
		$screens_str = in_array( 'all', $screens, true ) || empty( $screens ) ? 'all' : implode( ',', array_unique( $screens ) );

		$start_mysql = KN_Jalali::parse_jalali_to_mysql( $post['start_jdate'] ?? '', $post['start_time'] ?? '00:00', false );
		$end_mysql   = KN_Jalali::parse_jalali_to_mysql( $post['end_jdate'] ?? '', $post['end_time'] ?? '23:59', true );

		$data = array(
			'title'                => sanitize_text_field( $post['title'] ?? '' ),
			'body'                 => wp_kses_post( $post['body'] ?? '' ),
			'badge_text'           => sanitize_text_field( $post['badge_text'] ?? '' ),
			'image_url'            => self::sanitize_image_url( $post['image_url'] ?? '' ),
			'cta_text'             => sanitize_text_field( $post['cta_text'] ?? 'متوجه شدم' ),
			'action_type'          => $action_type,
			'action_target'        => self::sanitize_url_or_screen( $action_type, $post['action_target'] ?? '' ),
			'secondary_text'       => sanitize_text_field( $post['secondary_text'] ?? '' ),
			'start_at'             => $start_mysql !== '' ? $start_mysql : null,
			'end_at'               => $end_mysql !== '' ? $end_mysql : null,
			'daily_start_time'     => self::sanitize_hhmm( $post['daily_start_time'] ?? '' ),
			'daily_end_time'       => self::sanitize_hhmm( $post['daily_end_time'] ?? '' ),
			'weekdays_mask'        => $weekdays_mask,
			'delay_seconds'        => max( 0, min( 120, absint( $post['delay_seconds'] ?? 0 ) ) ),
			'auto_close_seconds'   => max( 0, min( 300, absint( $post['auto_close_seconds'] ?? 0 ) ) ),
			'show_countdown'       => ! empty( $post['show_countdown'] ) ? 1 : 0,
			'allow_user_close'     => ! empty( $post['allow_user_close'] ) ? 1 : 0,
			'close_on_backdrop'    => ! empty( $post['close_on_backdrop'] ) ? 1 : 0,
			'frequency_mode'       => $freq_mode,
			'frequency_hours'      => max( 1, min( 720, absint( $post['frequency_hours'] ?? 24 ) ) ),
			'max_impressions_user' => max( 0, min( 1000, absint( $post['max_impressions_user'] ?? 0 ) ) ),
			'dialog_size'          => $size,
			'position'             => $position,
			'theme_style'          => $theme,
			'overlay_blur'         => ! empty( $post['overlay_blur'] ) ? 1 : 0,
			'animation'            => $anim,
			'target_platform'      => $target_platform,
			'target_audience'      => $audience,
			'target_screens'       => $screens_str,
			'priority'             => max( 1, min( 999, absint( $post['priority'] ?? 10 ) ) ),
			'is_active'            => ! empty( $post['is_active'] ) ? 1 : 0,
		);

		if ( empty( $data['title'] ) ) {
			return false;
		}

		if ( $id > 0 ) {
			$wpdb->update( $t, $data, array( 'id' => absint( $id ) ) );
			return absint( $id );
		}
		$wpdb->insert( $t, $data );
		return (int) $wpdb->insert_id;
	}

	public static function delete_dialog( $id ) {
		global $wpdb;
		return false !== $wpdb->delete( KN_DB::table_dialogs(), array( 'id' => absint( $id ) ), array( '%d' ) );
	}

	/* =====================================================================
	 * ACTIVE DELIVERY FOR FRONTEND (WEB & MOBILE APP)
	 * ===================================================================== */

	private static function is_within_schedule( $start_at, $end_at, $now_ts ) {
		if ( ! empty( $start_at ) ) {
			$dt_start = KN_Jalali::parse_datetime( $start_at );
			if ( $dt_start && $now_ts < $dt_start->getTimestamp() ) {
				return false;
			}
		}
		if ( ! empty( $end_at ) ) {
			$dt_end = KN_Jalali::parse_datetime( $end_at );
			if ( $dt_end && $now_ts > $dt_end->getTimestamp() ) {
				return false;
			}
		}
		return true;
	}

	private static function matches_daily_window( $daily_start, $daily_end, $now_hhmm ) {
		if ( $daily_start === '' && $daily_end === '' ) {
			return true;
		}
		$start = $daily_start !== '' ? $daily_start : '00:00';
		$end   = $daily_end !== '' ? $daily_end : '23:59';
		if ( $start <= $end ) {
			return $now_hhmm >= $start && $now_hhmm <= $end;
		}
		// Overnight range e.g. 22:00 - 06:00
		return $now_hhmm >= $start || $now_hhmm <= $end;
	}

	public static function get_active_marketing_payload( $platform = 'web', $user_id = 0 ) {
		global $wpdb;
		$platform = ( $platform === 'mobile_app' ) ? 'mobile_app' : 'web';
		$user_id  = absint( $user_id );
		$now_ts   = time();
		$dt_now   = new DateTimeImmutable( '@' . $now_ts );
		$dt_local = $dt_now->setTimezone( wp_timezone() );
		$now_hhmm = $dt_local->format( 'H:i' );
		$today_wd = (string) KN_Jalali::weekday_index( $now_ts );

		// Determine if user has paid term entitlement
		$has_paid_term = false;
		if ( $user_id > 0 ) {
			$ent_map = KN_DB::get_user_entitlement_map( $user_id );
			foreach ( $ent_map as $info ) {
				if ( isset( $info['source'] ) && $info['source'] !== 'free' ) {
					$has_paid_term = true;
					break;
				}
			}
		}

		// Banners
		$t_banners   = KN_DB::table_banners();
		$raw_banners = $wpdb->get_results(
			"SELECT * FROM {$t_banners} WHERE is_active = 1 ORDER BY sort_order ASC, id DESC",
			ARRAY_A
		);
		$banners_out = array();
		if ( is_array( $raw_banners ) ) {
			foreach ( $raw_banners as $b ) {
				if ( $b['target_platform'] !== 'all' && $b['target_platform'] !== $platform ) {
					continue;
				}
				if ( ! self::is_within_schedule( $b['start_at'], $b['end_at'], $now_ts ) ) {
					continue;
				}
				$banners_out[] = array(
					'id'           => (int) $b['id'],
					'title'        => $b['title'],
					'subtitle'     => $b['subtitle'],
					'badgeText'    => $b['badge_text'],
					'imageUrl'     => esc_url_raw( (string) $b['image_url'] ),
					'ctaText'      => $b['cta_text'],
					'actionType'   => $b['action_type'],
					'actionTarget' => $b['action_target'],
					'placement'    => $b['placement'],
					'bgColor'      => $b['bg_color'],
					'textColor'    => $b['text_color'],
				);
			}
		}

		// Dialogs
		$t_dialogs   = KN_DB::table_dialogs();
		$raw_dialogs = $wpdb->get_results(
			"SELECT * FROM {$t_dialogs} WHERE is_active = 1 ORDER BY priority ASC, id DESC",
			ARRAY_A
		);
		$dialogs_out = array();
		if ( is_array( $raw_dialogs ) ) {
			foreach ( $raw_dialogs as $d ) {
				if ( $d['target_platform'] !== 'all' && $d['target_platform'] !== $platform ) {
					continue;
				}
				if ( ! self::is_within_schedule( $d['start_at'], $d['end_at'], $now_ts ) ) {
					continue;
				}
				if ( ! self::matches_daily_window( $d['daily_start_time'], $d['daily_end_time'], $now_hhmm ) ) {
					continue;
				}
				$wd_list = array_map( 'trim', explode( ',', (string) $d['weekdays_mask'] ) );
				if ( ! empty( $wd_list ) && ! in_array( $today_wd, $wd_list, true ) ) {
					continue;
				}

				$aud = (string) $d['target_audience'];
				if ( $aud === 'logged_in' && $user_id <= 0 ) {
					continue;
				}
				if ( $aud === 'guest' && $user_id > 0 ) {
					continue;
				}
				if ( $aud === 'paid_users' && ! $has_paid_term ) {
					continue;
				}
				if ( $aud === 'unpaid_users' && $has_paid_term ) {
					continue;
				}

				$screens_raw = trim( (string) $d['target_screens'] );
				$screens_arr = ( $screens_raw === '' || $screens_raw === 'all' )
					? array( 'all' )
					: array_values( array_filter( array_map( 'trim', explode( ',', $screens_raw ) ) ) );

				$dialogs_out[] = array(
					'id'                 => (int) $d['id'],
					'title'              => $d['title'],
					'body'               => $d['body'],
					'badgeText'          => $d['badge_text'],
					'imageUrl'           => esc_url_raw( (string) $d['image_url'] ),
					'ctaText'            => $d['cta_text'],
					'actionType'         => $d['action_type'],
					'actionTarget'       => $d['action_target'],
					'secondaryText'      => $d['secondary_text'],
					'delaySeconds'       => (int) $d['delay_seconds'],
					'autoCloseSeconds'   => (int) $d['auto_close_seconds'],
					'showCountdown'      => (bool) $d['show_countdown'],
					'allowUserClose'     => (bool) $d['allow_user_close'],
					'closeOnBackdrop'    => (bool) $d['close_on_backdrop'],
					'frequencyMode'      => $d['frequency_mode'],
					'frequencyHours'     => (int) $d['frequency_hours'],
					'maxImpressionsUser' => (int) $d['max_impressions_user'],
					'dialogSize'         => $d['dialog_size'],
					'position'           => $d['position'],
					'themeStyle'         => $d['theme_style'],
					'overlayBlur'        => (bool) $d['overlay_blur'],
					'animation'          => $d['animation'],
					'targetScreens'      => $screens_arr,
					'priority'           => (int) $d['priority'],
					'serverNowTs'        => $now_ts * 1000,
				);
			}
		}

		return array(
			'banners'     => $banners_out,
			'dialogs'     => $dialogs_out,
			'serverTime'  => KN_Jalali::format( $now_ts, true, true ),
		);
	}

	/* =====================================================================
	 * ANALYTICS RECORDING & AGGREGATION
	 * ===================================================================== */

	public static function record_event( $event_type, $target_id = 0, $platform = 'web', $device_os = '', $screen = '', $user_id = 0, $session_key = '' ) {
		global $wpdb;

		$allowed_types = array(
			'app_visit',
			'banner_impression',
			'banner_click',
			'dialog_impression',
			'dialog_click',
			'dialog_close',
			'dialog_autoclose',
		);
		if ( ! in_array( $event_type, $allowed_types, true ) ) {
			return false;
		}

		$platform    = ( $platform === 'mobile_app' ) ? 'mobile_app' : 'web';
		$target_id   = absint( $target_id );
		$user_id     = absint( $user_id );
		$session_key = sanitize_key( substr( (string) $session_key, 0, 64 ) );
		if ( $session_key === '' ) {
			$ip          = ! empty( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0.0.0.0';
			$ua          = ! empty( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
			$session_key = substr( hash( 'sha256', $ip . '|' . $ua . '|' . wp_date( 'Y-m-d' ) ), 0, 32 );
		}

		$today_date = wp_date( 'Y-m-d' );
		$now_mysql  = current_time( 'mysql' );

		$wpdb->insert(
			KN_DB::table_analytics_events(),
			array(
				'event_type'  => $event_type,
				'target_id'   => $target_id,
				'platform'    => $platform,
				'device_os'   => sanitize_key( substr( (string) $device_os, 0, 30 ) ),
				'screen'      => sanitize_key( substr( (string) $screen, 0, 40 ) ),
				'user_id'     => $user_id,
				'session_key' => $session_key,
				'event_date'  => $today_date,
				'created_at'  => $now_mysql,
			),
			array( '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s' )
		);

		// Atomic counter updates on banners & dialogs
		if ( $target_id > 0 ) {
			if ( $event_type === 'banner_impression' ) {
				$col = ( $platform === 'mobile_app' ) ? 'impressions_mobile' : 'impressions_web';
				$wpdb->query( $wpdb->prepare( 'UPDATE ' . KN_DB::table_banners() . " SET {$col} = {$col} + 1 WHERE id = %d", $target_id ) );
			} elseif ( $event_type === 'banner_click' ) {
				$col = ( $platform === 'mobile_app' ) ? 'clicks_mobile' : 'clicks_web';
				$wpdb->query( $wpdb->prepare( 'UPDATE ' . KN_DB::table_banners() . " SET {$col} = {$col} + 1 WHERE id = %d", $target_id ) );
			} elseif ( $event_type === 'dialog_impression' ) {
				$col = ( $platform === 'mobile_app' ) ? 'impressions_mobile' : 'impressions_web';
				$wpdb->query( $wpdb->prepare( 'UPDATE ' . KN_DB::table_dialogs() . " SET {$col} = {$col} + 1 WHERE id = %d", $target_id ) );
			} elseif ( $event_type === 'dialog_click' ) {
				$col = ( $platform === 'mobile_app' ) ? 'clicks_mobile' : 'clicks_web';
				$wpdb->query( $wpdb->prepare( 'UPDATE ' . KN_DB::table_dialogs() . " SET {$col} = {$col} + 1 WHERE id = %d", $target_id ) );
			} elseif ( $event_type === 'dialog_close' ) {
				$wpdb->query( $wpdb->prepare( 'UPDATE ' . KN_DB::table_dialogs() . ' SET closes_count = closes_count + 1 WHERE id = %d', $target_id ) );
			} elseif ( $event_type === 'dialog_autoclose' ) {
				$wpdb->query( $wpdb->prepare( 'UPDATE ' . KN_DB::table_dialogs() . ' SET autoclose_count = autoclose_count + 1 WHERE id = %d', $target_id ) );
			}
		}

		// Record authenticated visit inside user logs (at most once every 30 minutes per user/platform)
		if ( $event_type === 'app_visit' && $user_id > 0 ) {
			$tkey = 'kn_uvisit_' . $user_id . '_' . $platform;
			if ( ! get_transient( $tkey ) ) {
				KN_DB::log_user_event( $user_id, 'app_visit', $platform, $device_os );
				set_transient( $tkey, 1, 30 * MINUTE_IN_SECONDS );
			}
		}

		return true;
	}

	/**
	 * Comprehensive Dashboard & Reports Aggregation over a Gregorian date range ($from_date .. $to_date Y-m-d).
	 */
	public static function get_analytics_report( $from_date = '', $to_date = '' ) {
		global $wpdb;

		if ( empty( $to_date ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $to_date ) ) {
			$to_date = wp_date( 'Y-m-d' );
		}
		if ( empty( $from_date ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $from_date ) ) {
			$dt_end   = new DateTimeImmutable( $to_date, wp_timezone() );
			$from_date = $dt_end->modify( '-29 days' )->format( 'Y-m-d' );
		}
		if ( $from_date > $to_date ) {
			$tmp       = $from_date;
			$from_date = $to_date;
			$to_date   = $tmp;
		}

		$t_events = KN_DB::table_analytics_events();
		$t_logs   = KN_DB::table_user_logs();

		// 1) App Visits summary (Web vs Mobile App)
		$visit_rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT platform, COUNT(*) AS total_visits, COUNT(DISTINCT session_key) AS unique_sessions
				 FROM {$t_events}
				 WHERE event_type = 'app_visit' AND event_date BETWEEN %s AND %s
				 GROUP BY platform",
				$from_date,
				$to_date
			),
			ARRAY_A
		);

		$visits = array(
			'web_total'     => 0,
			'web_unique'    => 0,
			'mobile_total'  => 0,
			'mobile_unique' => 0,
			'total'         => 0,
		);
		if ( is_array( $visit_rows ) ) {
			foreach ( $visit_rows as $vr ) {
				if ( $vr['platform'] === 'mobile_app' ) {
					$visits['mobile_total']  = (int) $vr['total_visits'];
					$visits['mobile_unique'] = (int) $vr['unique_sessions'];
				} else {
					$visits['web_total']  = (int) $vr['total_visits'];
					$visits['web_unique'] = (int) $vr['unique_sessions'];
				}
			}
		}
		$visits['total'] = $visits['web_total'] + $visits['mobile_total'];

		// Daily visits series
		$daily_raw = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT event_date, platform, COUNT(*) AS cnt
				 FROM {$t_events}
				 WHERE event_type = 'app_visit' AND event_date BETWEEN %s AND %s
				 GROUP BY event_date, platform
				 ORDER BY event_date ASC",
				$from_date,
				$to_date
			),
			ARRAY_A
		);
		$daily_map = array();
		if ( is_array( $daily_raw ) ) {
			foreach ( $daily_raw as $dr ) {
				$d = $dr['event_date'];
				if ( ! isset( $daily_map[ $d ] ) ) {
					$daily_map[ $d ] = array( 'web' => 0, 'mobile_app' => 0 );
				}
				$p = ( $dr['platform'] === 'mobile_app' ) ? 'mobile_app' : 'web';
				$daily_map[ $d ][ $p ] = (int) $dr['cnt'];
			}
		}

		$daily_series = array();
		try {
			$cur    = new DateTimeImmutable( $from_date, wp_timezone() );
			$end_dt = new DateTimeImmutable( $to_date, wp_timezone() );
			$guard  = 0;
			while ( $cur <= $end_dt && $guard < 95 ) {
				$guard++;
				$g_key = $cur->format( 'Y-m-d' );
				list( $jy, $jm, $jd ) = KN_Jalali::gregorian_to_jalali( (int) $cur->format( 'Y' ), (int) $cur->format( 'm' ), (int) $cur->format( 'd' ) );
				$j_short = KN_Jalali::to_persian_digits( $jd . ' ' . KN_Jalali::month_name( $jm ) );
				$daily_series[] = array(
					'gDate'  => $g_key,
					'jLabel' => $j_short,
					'jFull'  => KN_Jalali::to_persian_digits( sprintf( '%04d/%02d/%02d', $jy, $jm, $jd ) ),
					'web'    => $daily_map[ $g_key ]['web'] ?? 0,
					'mobile' => $daily_map[ $g_key ]['mobile_app'] ?? 0,
				);
				$cur = $cur->modify( '+1 day' );
			}
		} catch ( Exception $e ) {
			// Fallback empty series
		}

		// 2) Device OS breakdown
		$os_rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT COALESCE(NULLIF(device_os, ''), platform) AS os_name, COUNT(*) AS cnt
				 FROM {$t_events}
				 WHERE event_type = 'app_visit' AND event_date BETWEEN %s AND %s
				 GROUP BY os_name
				 ORDER BY cnt DESC",
				$from_date,
				$to_date
			),
			ARRAY_A
		);

		// 3) Banners & Dialogs performance summary
		$banners = self::get_all_banners();
		$dialogs = self::get_all_dialogs();

		$banner_totals = array( 'impressions' => 0, 'clicks' => 0, 'web_imp' => 0, 'mobile_imp' => 0, 'ctr' => 0 );
		foreach ( $banners as $b ) {
			$banner_totals['web_imp']     += (int) $b['impressions_web'];
			$banner_totals['mobile_imp']  += (int) $b['impressions_mobile'];
			$banner_totals['impressions'] += (int) $b['impressions_web'] + (int) $b['impressions_mobile'];
			$banner_totals['clicks']      += (int) $b['clicks_web'] + (int) $b['clicks_mobile'];
		}
		if ( $banner_totals['impressions'] > 0 ) {
			$banner_totals['ctr'] = round( ( $banner_totals['clicks'] / $banner_totals['impressions'] ) * 100, 1 );
		}

		$dialog_totals = array( 'impressions' => 0, 'clicks' => 0, 'closes' => 0, 'autocloses' => 0, 'ctr' => 0 );
		foreach ( $dialogs as $d ) {
			$dialog_totals['impressions'] += (int) $d['impressions_web'] + (int) $d['impressions_mobile'];
			$dialog_totals['clicks']      += (int) $d['clicks_web'] + (int) $d['clicks_mobile'];
			$dialog_totals['closes']      += (int) $d['closes_count'];
			$dialog_totals['autocloses']  += (int) $d['autoclose_count'];
		}
		if ( $dialog_totals['impressions'] > 0 ) {
			$dialog_totals['ctr'] = round( ( $dialog_totals['clicks'] / $dialog_totals['impressions'] ) * 100, 1 );
		}

		// 4) Auth Logs in period
		$from_dt_str = $from_date . ' 00:00:00';
		$to_dt_str   = $to_date . ' 23:59:59';
		$auth_rows   = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT event_type, platform, COUNT(*) AS cnt
				 FROM {$t_logs}
				 WHERE created_at BETWEEN %s AND %s
				 GROUP BY event_type, platform",
				$from_dt_str,
				$to_dt_str
			),
			ARRAY_A
		);
		$auth_stats = array( 'logins' => 0, 'registrations' => 0, 'logouts' => 0, 'otp_logins' => 0 );
		if ( is_array( $auth_rows ) ) {
			foreach ( $auth_rows as $ar ) {
				$c = (int) $ar['cnt'];
				if ( $ar['event_type'] === 'login_password' ) {
					$auth_stats['logins'] += $c;
				} elseif ( $ar['event_type'] === 'login_otp' ) {
					$auth_stats['logins']     += $c;
					$auth_stats['otp_logins'] += $c;
				} elseif ( $ar['event_type'] === 'register' ) {
					$auth_stats['registrations'] += $c;
				} elseif ( $ar['event_type'] === 'logout' ) {
					$auth_stats['logouts'] += $c;
				}
			}
		}

		// 5) WooCommerce Orders & Revenue in date range
		$commerce = array(
			'total_revenue'    => 0,
			'completed_orders' => 0,
			'pending_orders'   => 0,
			'failed_cancelled' => 0,
			'total_orders'     => 0,
			'avg_order'        => 0,
			'top_items'        => array(),
		);
		if ( class_exists( 'KN_Woo' ) && KN_Woo::is_woo_active() ) {
			$orders = wc_get_orders(
				array(
					'limit'        => 300,
					'date_created' => $from_date . '...' . $to_date,
					'orderby'      => 'date',
					'order'        => 'DESC',
				)
			);
			$item_sales = array();
			foreach ( $orders as $order ) {
				if ( ! ( $order instanceof WC_Order ) ) {
					continue;
				}
				$commerce['total_orders']++;
				$st  = (string) $order->get_status();
				$tot = (int) round( (float) $order->get_total() );
				if ( in_array( $st, array( 'completed', 'processing' ), true ) ) {
					$commerce['completed_orders']++;
					$commerce['total_revenue'] += $tot;
					foreach ( $order->get_items() as $item ) {
						$iname = $item->get_name();
						if ( ! isset( $item_sales[ $iname ] ) ) {
							$item_sales[ $iname ] = array( 'name' => $iname, 'qty' => 0, 'revenue' => 0 );
						}
						$item_sales[ $iname ]['qty']     += method_exists( $item, 'get_quantity' ) ? (int) $item->get_quantity() : 1;
						$item_sales[ $iname ]['revenue'] += method_exists( $item, 'get_total' ) ? (int) round( (float) $item->get_total() ) : 0;
					}
				} elseif ( in_array( $st, array( 'on-hold', 'pending' ), true ) ) {
					$commerce['pending_orders']++;
				} else {
					$commerce['failed_cancelled']++;
				}
			}
			if ( $commerce['completed_orders'] > 0 ) {
				$commerce['avg_order'] = (int) round( $commerce['total_revenue'] / $commerce['completed_orders'] );
			}
			usort(
				$item_sales,
				function ( $a, $b ) {
					return $b['revenue'] <=> $a['revenue'];
				}
			);
			$commerce['top_items'] = array_slice( $item_sales, 0, 8 );
		}

		return array(
			'fromDate'      => $from_date,
			'toDate'        => $to_date,
			'fromJalali'    => KN_Jalali::format_for_input( $from_date ),
			'toJalali'      => KN_Jalali::format_for_input( $to_date ),
			'visits'        => $visits,
			'dailySeries'   => $daily_series,
			'osBreakdown'   => is_array( $os_rows ) ? $os_rows : array(),
			'bannerTotals'  => $banner_totals,
			'banners'       => $banners,
			'dialogTotals'  => $dialog_totals,
			'dialogs'       => $dialogs,
			'authStats'     => $auth_stats,
			'commerce'      => $commerce,
		);
	}
}
