<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Zero-dependency Persian Jalali (Solar Hijri) Calendar & Formatting Helper.
 * Ensures authentic Jalali dates everywhere in Admin, REST API, Analytics, Orders & DatePickers.
 */
class KN_Jalali {

	private static $months = array(
		1  => 'فروردین',
		2  => 'اردیبهشت',
		3  => 'خرداد',
		4  => 'تیر',
		5  => 'مرداد',
		6  => 'شهریور',
		7  => 'مهر',
		8  => 'آبان',
		9  => 'آذر',
		10 => 'دی',
		11 => 'بهمن',
		12 => 'اسفند',
	);

	private static $weekdays = array(
		0 => 'شنبه',
		1 => 'یکشنبه',
		2 => 'دوشنبه',
		3 => 'سه‌شنبه',
		4 => 'چهارشنبه',
		5 => 'پنجشنبه',
		6 => 'جمعه',
	);

	public static function to_persian_digits( $str ) {
		$en = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
		$fa = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' );
		return str_replace( $en, $fa, (string) $str );
	}

	public static function to_latin_digits( $str ) {
		$fa  = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' );
		$ar  = array( '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩' );
		$fw  = array( '０', '１', '２', '３', '４', '５', '６', '７', '８', '９' );
		$en  = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
		$out = str_replace( $fa, $en, (string) $str );
		$out = str_replace( $ar, $en, $out );
		return str_replace( $fw, $en, $out );
	}

	public static function month_name( $jm ) {
		$jm = (int) $jm;
		return self::$months[ $jm ] ?? '';
	}

	public static function weekday_names() {
		return self::$weekdays;
	}

	/**
	 * Returns 0 = Saturday .. 6 = Friday in site timezone.
	 */
	public static function weekday_index( $timestamp = null ) {
		$ts = $timestamp !== null ? (int) $timestamp : time();
		$dt = new DateTimeImmutable( '@' . $ts );
		$dt = $dt->setTimezone( wp_timezone() );
		$w  = (int) $dt->format( 'w' ); // 0 = Sun .. 6 = Sat
		return ( $w + 1 ) % 7;
	}

	public static function gregorian_to_jalali( $gy, $gm, $gd ) {
		$gy    = (int) $gy;
		$gm    = (int) $gm;
		$gd    = (int) $gd;
		$g_d_m = array( 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 );
		$gy2   = ( $gm > 2 ) ? ( $gy + 1 ) : $gy;
		$days  = 355666 + ( 365 * $gy ) + (int) ( ( $gy2 + 3 ) / 4 ) - (int) ( ( $gy2 + 99 ) / 100 ) + (int) ( ( $gy2 + 399 ) / 400 ) + $gd + $g_d_m[ $gm - 1 ];
		$jy    = -1595 + ( 33 * (int) ( $days / 12053 ) );
		$days %= 12053;
		$jy   += 4 * (int) ( $days / 1461 );
		$days %= 1461;
		if ( $days > 365 ) {
			$jy  += (int) ( ( $days - 1 ) / 365 );
			$days = ( $days - 1 ) % 365;
		}
		if ( $days < 186 ) {
			$jm = 1 + (int) ( $days / 31 );
			$jd = 1 + ( $days % 31 );
		} else {
			$jm = 7 + (int) ( ( $days - 186 ) / 30 );
			$jd = 1 + ( ( $days - 186 ) % 30 );
		}
		return array( $jy, $jm, $jd );
	}

	public static function jalali_to_gregorian( $jy, $jm, $jd ) {
		$jy   = (int) $jy + 1595;
		$jm   = (int) $jm;
		$jd   = (int) $jd;
		$days = -355668 + ( 365 * $jy ) + ( (int) ( $jy / 33 ) * 8 ) + (int) ( ( ( $jy % 33 ) + 3 ) / 4 ) + $jd + ( ( $jm < 7 ) ? ( $jm - 1 ) * 31 : ( ( $jm - 7 ) * 30 ) + 186 );
		$gy   = 400 * (int) ( $days / 146097 );
		$days %= 146097;
		if ( $days > 36524 ) {
			$gy  += 100 * (int) ( --$days / 36524 );
			$days %= 36524;
			if ( $days >= 365 ) {
				$days++;
			}
		}
		$gy   += 4 * (int) ( $days / 1461 );
		$days %= 1461;
		if ( $days > 365 ) {
			$gy  += (int) ( ( $days - 1 ) / 365 );
			$days = ( $days - 1 ) % 365;
		}
		$gd    = $days + 1;
		$sal_a = array( 0, 31, ( ( $gy % 4 === 0 && $gy % 100 !== 0 ) || ( $gy % 400 === 0 ) ) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 );
		for ( $gm = 0; $gm < 13 && $gd > $sal_a[ $gm ]; $gm++ ) {
			$gd -= $sal_a[ $gm ];
		}
		return array( $gy, $gm, $gd );
	}

	public static function is_jalali_leap_year( $jy ) {
		$breaks = array( -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178 );
		$jy     = (int) $jy;
		$bl     = count( $breaks );
		$jp     = $breaks[0];
		$jump   = 0;
		for ( $i = 1; $i < $bl; $i++ ) {
			$jm   = $breaks[ $i ];
			$jump = $jm - $jp;
			if ( $jy < $jm ) {
				break;
			}
			$jp = $jm;
		}
		$n = $jy - $jp;
		if ( $jump - $n < 6 ) {
			$n = $n - $jump + (int) ( ( $jump + 4 ) / 33 ) * 33;
		}
		$leap = ( ( ( $n + 1 ) % 33 ) - 1 ) % 4;
		if ( $leap === -1 ) {
			$leap = 4;
		}
		return $leap === 0;
	}

	/**
	 * Convert a MySQL datetime string (assumed local WP timezone unless $assume_utc=true),
	 * WC_DateTime object, or Unix timestamp into DateTimeImmutable in WP timezone.
	 */
	public static function parse_datetime( $input, $assume_utc = false ) {
		if ( empty( $input ) || $input === '0000-00-00 00:00:00' ) {
			return null;
		}
		$tz = wp_timezone();

		if ( is_object( $input ) && method_exists( $input, 'getTimestamp' ) ) {
			$dt = new DateTimeImmutable( '@' . $input->getTimestamp() );
			return $dt->setTimezone( $tz );
		}

		if ( is_numeric( $input ) ) {
			$ts = (int) $input;
			if ( $ts <= 0 ) {
				return null;
			}
			$dt = new DateTimeImmutable( '@' . $ts );
			return $dt->setTimezone( $tz );
		}

		$str = trim( (string) $input );
		if ( $str === '' ) {
			return null;
		}

		try {
			$src_tz = $assume_utc ? new DateTimeZone( 'UTC' ) : $tz;
			$dt     = new DateTimeImmutable( $str, $src_tz );
			return $dt->setTimezone( $tz );
		} catch ( Exception $e ) {
			return null;
		}
	}

	/**
	 * Format date/time as Persian Jalali string: ۱۴۰۵/۰۹/۰۳ - ۱۷:۲۰
	 */
	public static function format( $input, $with_time = true, $persian_digits = true, $assume_utc = false ) {
		$dt = self::parse_datetime( $input, $assume_utc );
		if ( ! $dt ) {
			return '—';
		}
		list( $jy, $jm, $jd ) = self::gregorian_to_jalali( (int) $dt->format( 'Y' ), (int) $dt->format( 'm' ), (int) $dt->format( 'd' ) );
		$date_str = sprintf( '%04d/%02d/%02d', $jy, $jm, $jd );
		if ( $with_time ) {
			$date_str .= ' - ' . $dt->format( 'H:i' );
		}
		return $persian_digits ? self::to_persian_digits( $date_str ) : $date_str;
	}

	public static function format_date_only( $input, $persian_digits = true, $assume_utc = false ) {
		return self::format( $input, false, $persian_digits, $assume_utc );
	}

	public static function format_for_input( $input, $assume_utc = false ) {
		$dt = self::parse_datetime( $input, $assume_utc );
		if ( ! $dt ) {
			return '';
		}
		list( $jy, $jm, $jd ) = self::gregorian_to_jalali( (int) $dt->format( 'Y' ), (int) $dt->format( 'm' ), (int) $dt->format( 'd' ) );
		return sprintf( '%04d/%02d/%02d', $jy, $jm, $jd );
	}

	public static function format_time_for_input( $input, $assume_utc = false ) {
		$dt = self::parse_datetime( $input, $assume_utc );
		if ( ! $dt ) {
			return '';
		}
		return $dt->format( 'H:i' );
	}

	/**
	 * Parse a Jalali date string (e.g. 1405/09/03 or ۱۴۰۵-۹-۳) + optional HH:MM time into Gregorian MySQL datetime (site local time).
	 */
	public static function parse_jalali_to_mysql( $jdate_str, $time_str = '00:00', $end_of_day = false ) {
		$clean = trim( self::to_latin_digits( (string) $jdate_str ) );
		if ( $clean === '' ) {
			return '';
		}

		if ( ! preg_match( '/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $clean, $m ) ) {
			// Also accept YYYY-MM-DD Gregorian if passed cleanly (> 1900)
			return '';
		}

		$jy = (int) $m[1];
		$jm = (int) $m[2];
		$jd = (int) $m[3];

		// If someone accidentally passed a Gregorian year (e.g. 2026) accept safely
		if ( $jy >= 1970 && $jy <= 2150 ) {
			$gy = $jy;
			$gm = $jm;
			$gd = $jd;
		} else {
			if ( $jy < 1300 || $jy > 1550 || $jm < 1 || $jm > 12 ) {
				return '';
			}
			$max_day = ( $jm <= 6 ) ? 31 : ( ( $jm <= 11 ) ? 30 : ( self::is_jalali_leap_year( $jy ) ? 30 : 29 ) );
			if ( $jd < 1 || $jd > $max_day ) {
				return '';
			}
			list( $gy, $gm, $gd ) = self::jalali_to_gregorian( $jy, $jm, $jd );
		}

		$time_clean = trim( self::to_latin_digits( (string) $time_str ) );
		$hour       = $end_of_day ? 23 : 0;
		$min        = $end_of_day ? 59 : 0;
		$sec        = $end_of_day ? 59 : 0;

		if ( preg_match( '/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/', $time_clean, $tm ) ) {
			$hour = min( 23, max( 0, (int) $tm[1] ) );
			$min  = min( 59, max( 0, (int) $tm[2] ) );
			$sec  = isset( $tm[3] ) ? min( 59, max( 0, (int) $tm[3] ) ) : ( $end_of_day ? 59 : 0 );
		}

		return sprintf( '%04d-%02d-%02d %02d:%02d:%02d', $gy, $gm, $gd, $hour, $min, $sec );
	}

	public static function parse_jalali_to_date( $jdate_str ) {
		$mysql = self::parse_jalali_to_mysql( $jdate_str, '00:00', false );
		return $mysql !== '' ? substr( $mysql, 0, 10 ) : '';
	}

	public static function current_jalali_today_input() {
		return self::format_for_input( time() );
	}

	public static function current_jalali_days_ago_input( $days ) {
		return self::format_for_input( time() - ( max( 0, (int) $days ) * DAY_IN_SECONDS ) );
	}

	public static function relative_time( $input, $assume_utc = false ) {
		$dt = self::parse_datetime( $input, $assume_utc );
		if ( ! $dt ) {
			return '—';
		}
		$diff = time() - $dt->getTimestamp();
		if ( $diff < 0 ) {
			return self::format( $dt, true, true );
		}
		if ( $diff < 60 ) {
			return 'لحظاتی پیش';
		}
		if ( $diff < 3600 ) {
			return self::to_persian_digits( (int) floor( $diff / 60 ) ) . ' دقیقه پیش';
		}
		if ( $diff < DAY_IN_SECONDS ) {
			return self::to_persian_digits( (int) floor( $diff / 3600 ) ) . ' ساعت پیش';
		}
		if ( $diff < 7 * DAY_IN_SECONDS ) {
			return self::to_persian_digits( (int) floor( $diff / DAY_IN_SECONDS ) ) . ' روز پیش';
		}
		return self::format( $dt, false, true );
	}
}
