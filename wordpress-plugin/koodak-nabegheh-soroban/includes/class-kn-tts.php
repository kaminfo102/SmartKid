<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_TTS {

	const OPTION_KEY        = 'kn_soroban_tts_settings';
	const CACHE_MAX_FILES   = 250;
	const HOURLY_IP_LIMIT   = 300;
	const MINUTE_IP_LIMIT   = 45;

	/**
	 * Catalog of supported AI TTS providers with safe HTTPS defaults.
	 */
	public static function get_providers_catalog() {
		return array(
			'gapgpt'     => array(
				'label'         => 'گپ‌جی‌پی‌تی ایرانی (GapGPT — صدای اصلی Kore و سایر مدل‌ها)',
				'base_url'      => 'https://api.gapgpt.ir/v1',
				'alt_base_url'  => 'https://api.gapapi.com/v1',
				'default_model' => 'gemini-3.8-flash-tts',
				'default_voice' => 'Kore',
				'models'        => array( 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts', 'gpt-4o-mini-tts', 'tts-1', 'tts-1-hd' ),
				'voices'        => array( 'Kore', 'Aoede', 'Zephyr', 'Leda', 'Puck', 'nova', 'shimmer', 'coral', 'alloy' ),
				'hint'          => 'برای همان صدای اصلی اپلیکیشن، مدل gemini-3.8-flash-tts (یا gemini-3.8-flash-lite-tts) و صدای Kore را انتخاب کنید. آدرس ایران: https://api.gapgpt.ir/v1 — CDN خارجی: https://api.gapapi.com/v1',
			),
			'openai'     => array(
				'label'         => 'OpenAI TTS رسمی',
				'base_url'      => 'https://api.openai.com/v1',
				'default_model' => 'gpt-4o-mini-tts',
				'default_voice' => 'nova',
				'models'        => array( 'gpt-4o-mini-tts', 'tts-1', 'tts-1-hd' ),
				'voices'        => array( 'nova', 'shimmer', 'coral', 'alloy', 'sage', 'ash', 'echo', 'fable', 'onyx' ),
				'hint'          => 'آدرس استاندارد: https://api.openai.com/v1',
			),
			'avalai'     => array(
				'label'         => 'آوا‌ای‌آی ایرانی (AvalAI — سازگار با OpenAI)',
				'base_url'      => 'https://api.avalai.ir/v1',
				'default_model' => 'gpt-4o-mini-tts',
				'default_voice' => 'nova',
				'models'        => array( 'gpt-4o-mini-tts', 'tts-1', 'tts-1-hd' ),
				'voices'        => array( 'nova', 'shimmer', 'coral', 'alloy', 'sage', 'ash', 'echo', 'fable', 'onyx' ),
				'hint'          => 'آدرس استاندارد: https://api.avalai.ir/v1',
			),
			'elevenlabs' => array(
				'label'         => 'ElevenLabs (صداگذاری طبیعی چندزبانه)',
				'base_url'      => 'https://api.elevenlabs.io/v1',
				'default_model' => 'eleven_multilingual_v2',
				'default_voice' => '21m00Tcm4TlvDq8ikWAM',
				'models'        => array( 'eleven_multilingual_v2', 'eleven_flash_v2_5', 'eleven_turbo_v2_5' ),
				'voices'        => array( '21m00Tcm4TlvDq8ikWAM', 'EXAVITQu4vr4xnSDxMaL', 'XB0fDUnXU5powFXDhCwa' ),
				'hint'          => 'در فیلد صدا (Voice) شناسه Voice ID الون‌لبز را وارد کنید (مثلاً 21m00Tcm4TlvDq8ikWAM).',
			),
			'gemini'     => array(
				'label'         => 'Google Gemini TTS',
				'base_url'      => 'https://generativelanguage.googleapis.com/v1beta',
				'default_model' => 'gemini-2.5-flash-preview-tts',
				'default_voice' => 'Kore',
				'models'        => array( 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts' ),
				'voices'        => array( 'Kore', 'Aoede', 'Zephyr', 'Puck', 'Charon', 'Fenrir' ),
				'hint'          => 'آدرس استاندارد: https://generativelanguage.googleapis.com/v1beta',
			),
			'custom'     => array(
				'label'         => 'سرویس دلخواه سازگار با OpenAI (/audio/speech)',
				'base_url'      => '',
				'default_model' => 'tts-1',
				'default_voice' => 'nova',
				'models'        => array( 'gpt-4o-mini-tts', 'tts-1', 'tts-1-hd' ),
				'voices'        => array( 'nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx' ),
				'hint'          => 'آدرس پایه API سرویس را با https وارد کنید (مثلاً https://example.com/v1).',
			),
		);
	}

	/**
	 * Default persisted configuration (no secrets).
	 */
	public static function get_defaults() {
		return array(
			'enabled'             => 0,
			'provider'            => 'gapgpt',
			'base_url'            => 'https://api.gapgpt.ir/v1',
			'api_key'             => '',
			'model'               => 'gemini-3.8-flash-tts',
			'voice'               => 'Kore',
			'format'              => 'wav',
			'speed'               => '0.95',
			'instructions'        => 'Warm, gentle, cheerful Iranian female kindergarten teacher speaking clear, friendly Persian (fa-IR) warmly and slowly for children ages 4 to 15.',
			'pronunciation_rules' => array(
				array(
					'from' => 'چرتکه',
					'to'   => 'چُرتُکه',
				),
			),
			'cache_enabled'       => 1,
			'require_auth'        => 0,
		);
	}

	/**
	 * Sanitize list of pronunciation replacement rules (word/phrase => phonetic spelling).
	 */
	public static function sanitize_pronunciation_rules( $raw_rules ) {
		if ( ! is_array( $raw_rules ) ) {
			return array();
		}
		$clean = array();
		foreach ( $raw_rules as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$from = trim( sanitize_text_field( (string) ( $row['from'] ?? '' ) ) );
			$to   = trim( sanitize_text_field( (string) ( $row['to'] ?? '' ) ) );
			if ( $from === '' || $to === '' ) {
				continue;
			}
			if ( mb_strlen( $from, 'UTF-8' ) > 120 ) {
				$from = mb_substr( $from, 0, 120, 'UTF-8' );
			}
			if ( mb_strlen( $to, 'UTF-8' ) > 120 ) {
				$to = mb_substr( $to, 0, 120, 'UTF-8' );
			}
			$clean[] = array(
				'from' => $from,
				'to'   => $to,
			);
			if ( count( $clean ) >= 100 ) {
				break;
			}
		}
		return $clean;
	}

	/**
	 * Return full normalized settings (only for server-side / admin use; never expose api_key to public REST).
	 */
	public static function get_settings() {
		$defaults = self::get_defaults();
		$raw      = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $raw ) ) {
			$raw = array();
		}
		$merged = array_merge( $defaults, $raw );

		$catalog  = self::get_providers_catalog();
		$provider = sanitize_key( (string) $merged['provider'] );
		if ( ! isset( $catalog[ $provider ] ) ) {
			$provider = 'gapgpt';
		}

		$base_url = trim( (string) $merged['base_url'] );
		if ( $base_url === '' && ! empty( $catalog[ $provider ]['base_url'] ) ) {
			$base_url = $catalog[ $provider ]['base_url'];
		}

		$model = trim( sanitize_text_field( (string) $merged['model'] ) );
		if ( $model === '' ) {
			$model = $catalog[ $provider ]['default_model'];
		}

		$voice = trim( sanitize_text_field( (string) $merged['voice'] ) );
		if ( $voice === '' ) {
			$voice = $catalog[ $provider ]['default_voice'];
		}

		$format = strtolower( trim( sanitize_key( (string) $merged['format'] ) ) );
		if ( ! in_array( $format, array( 'mp3', 'wav', 'opus', 'aac' ), true ) ) {
			$format = 'mp3';
		}

		$speed_f = (float) $merged['speed'];
		if ( $speed_f < 0.5 || $speed_f > 2.0 ) {
			$speed_f = 0.95;
		}

		$pron_rules = array_key_exists( 'pronunciation_rules', $raw )
			? self::sanitize_pronunciation_rules( $raw['pronunciation_rules'] )
			: $defaults['pronunciation_rules'];

		return array(
			'enabled'             => ! empty( $merged['enabled'] ) ? 1 : 0,
			'provider'            => $provider,
			'base_url'            => untrailingslashit( $base_url ),
			'api_key'             => trim( (string) $merged['api_key'] ),
			'model'               => $model,
			'voice'               => $voice,
			'format'              => $format,
			'speed'               => number_format( $speed_f, 2, '.', '' ),
			'instructions'        => sanitize_textarea_field( (string) $merged['instructions'] ),
			'pronunciation_rules' => $pron_rules,
			'cache_enabled'       => ! empty( $merged['cache_enabled'] ) ? 1 : 0,
			'require_auth'        => ! empty( $merged['require_auth'] ) ? 1 : 0,
		);
	}

	/**
	 * Public safe provider name (without secrets).
	 */
	public static function get_public_provider() {
		$cfg = self::get_settings();
		return $cfg['provider'];
	}

	/**
	 * Whether server-side AI TTS is configured and active.
	 */
	public static function is_enabled() {
		$cfg = self::get_settings();
		if ( empty( $cfg['enabled'] ) || empty( $cfg['api_key'] ) ) {
			return false;
		}
		return self::validate_safe_external_base_url( $cfg['base_url'] ) !== '';
	}

	/**
	 * Strict SSRF-safe external HTTPS URL validation for AI provider base URLs.
	 */
	public static function validate_safe_external_base_url( $raw_url ) {
		$trimmed = untrailingslashit( trim( (string) $raw_url ) );
		if ( $trimmed === '' ) {
			return '';
		}
		$parsed = wp_parse_url( $trimmed );
		if ( ! is_array( $parsed ) || empty( $parsed['scheme'] ) || empty( $parsed['host'] ) ) {
			return '';
		}
		$scheme = strtolower( (string) $parsed['scheme'] );
		if ( $scheme !== 'https' ) {
			return '';
		}
		if ( ! empty( $parsed['user'] ) || ! empty( $parsed['pass'] ) ) {
			return '';
		}

		$host = strtolower( trim( (string) $parsed['host'], '[]' ) );
		if ( $host === '' || $host === 'localhost' || substr( $host, -6 ) === '.local' || substr( $host, -9 ) === '.internal' ) {
			return '';
		}

		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			if ( ! filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
				return '';
			}
		} else {
			$resolved = @gethostbynamel( $host );
			if ( is_array( $resolved ) && ! empty( $resolved ) ) {
				foreach ( $resolved as $ip ) {
					if ( ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
						return '';
					}
				}
			}
		}

		return esc_url_raw( $trimmed );
	}

	/**
	 * Resolve upload cache directory for TTS audio files.
	 */
	private static function get_cache_dir() {
		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
			return '';
		}
		$dir = trailingslashit( $uploads['basedir'] ) . 'kn-tts-cache';
		if ( ! file_exists( $dir ) ) {
			if ( ! wp_mkdir_p( $dir ) ) {
				return '';
			}
			@file_put_contents( $dir . '/index.php', "<?php\n// Silence is golden.\n" );
			@file_put_contents( $dir . '/.htaccess', "Deny from all\n" );
		}
		return is_writable( $dir ) ? $dir : '';
	}

	/**
	 * Clear all cached TTS audio files and return removed count.
	 */
	public static function clear_cache() {
		$uploads = wp_upload_dir();
		if ( empty( $uploads['basedir'] ) ) {
			return 0;
		}
		$dir = trailingslashit( $uploads['basedir'] ) . 'kn-tts-cache';
		if ( ! is_dir( $dir ) ) {
			return 0;
		}
		$files = glob( $dir . '/*.json' );
		$count = 0;
		if ( is_array( $files ) ) {
			foreach ( $files as $file ) {
				if ( is_file( $file ) && @unlink( $file ) ) {
					$count++;
				}
			}
		}
		return $count;
	}

	/**
	 * Count cached TTS phrases.
	 */
	public static function get_cache_count() {
		$uploads = wp_upload_dir();
		if ( empty( $uploads['basedir'] ) ) {
			return 0;
		}
		$dir = trailingslashit( $uploads['basedir'] ) . 'kn-tts-cache';
		if ( ! is_dir( $dir ) ) {
			return 0;
		}
		$files = glob( $dir . '/*.json' );
		return is_array( $files ) ? count( $files ) : 0;
	}

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
		return hash( 'sha256', $ip . '|' . wp_salt( 'nonce' ) );
	}

	private static function check_rate_limit() {
		$ip_hash = substr( self::get_client_ip_hash(), 0, 24 );
		$min_key = 'kn_tts_m_' . $ip_hash;
		$hr_key  = 'kn_tts_h_' . $ip_hash;

		$min_count = (int) get_transient( $min_key );
		if ( $min_count >= self::MINUTE_IP_LIMIT ) {
			return new WP_Error(
				'tts_rate_limited',
				'تعداد درخواست‌های تولید صدا بیش از حد مجاز است. لطفاً کمی صبر کنید.',
				array( 'status' => 429 )
			);
		}

		$hr_count = (int) get_transient( $hr_key );
		if ( $hr_count >= self::HOURLY_IP_LIMIT ) {
			return new WP_Error(
				'tts_rate_limited',
				'سقف ساعتی تولید صدای هوشمند پر شده است.',
				array( 'status' => 429 )
			);
		}

		set_transient( $min_key, $min_count + 1, MINUTE_IN_SECONDS );
		set_transient( $hr_key, $hr_count + 1, HOUR_IN_SECONDS );
		return true;
	}

	private static function format_to_mime( $format ) {
		switch ( strtolower( (string) $format ) ) {
			case 'wav':
				return 'audio/wav';
			case 'opus':
				return 'audio/ogg';
			case 'aac':
				return 'audio/aac';
			case 'mp3':
			default:
				return 'audio/mpeg';
		}
	}

	private static function tone_instruction( $tone, $base_instructions ) {
		if ( $tone === 'cheer' ) {
			$tone_hint = 'لحن بسیار شاد، پرانرژی و تشویق‌کننده برای تحسین موفقیت کودک داشته باش.';
		} elseif ( $tone === 'encourage' ) {
			$tone_hint = 'لحن بسیار مهربان، آرامش‌بخش و دلگرم‌کننده برای تشویق کودک به تلاش دوباره داشته باش.';
		} else {
			$tone_hint = 'لحن آموزگار مهربان، واضح و صمیمی برای آموزش کودک داشته باش.';
		}
		$clean_base = trim( (string) $base_instructions );
		return $clean_base !== '' ? ( $clean_base . ' ' . $tone_hint ) : $tone_hint;
	}

	/**
	 * Exact Gemini TTS style strings matching the original server.ts Persian kindergarten teacher voice (Kore).
	 */
	private static function gemini_tone_style( $tone, $custom_instructions = '' ) {
		if ( $tone === 'cheer' ) {
			$style = 'Joyful, bright, encouraging Iranian female teacher speaking natural enthusiastic Persian (fa-IR) to celebrate a young child success.';
		} elseif ( $tone === 'encourage' ) {
			$style = 'Kind, soft, reassuring Iranian female teacher speaking calm, gentle Persian (fa-IR) to kindly encourage a young child to try again.';
		} else {
			$style = 'Warm, gentle, cheerful Iranian female kindergarten teacher speaking clear, friendly Persian (fa-IR) warmly and slowly for children ages 4 to 15.';
		}

		$clean_custom         = trim( (string) $custom_instructions );
		$legacy_persian_def   = 'با لحن گرم، مهربان، شاد و شمرده به زبان فارسی معیار و کودکانه برای کودکان ۴ تا ۱۵ سال صحبت کن.';
		$default_teach_en     = 'Warm, gentle, cheerful Iranian female kindergarten teacher speaking clear, friendly Persian (fa-IR) warmly and slowly for children ages 4 to 15.';
		if (
			$clean_custom !== '' &&
			$clean_custom !== $legacy_persian_def &&
			$clean_custom !== $default_teach_en
		) {
			return $style . ' ' . $clean_custom;
		}
		return $style;
	}

	private static function gemini_say_prompt( $tone, $text, $custom_instructions = '' ) {
		$style = self::gemini_tone_style( $tone, $custom_instructions );
		return 'Speak the following Persian text aloud following this exact voice & pronunciation style (' . $style . '): ' . $text;
	}

	/**
	 * Apply custom pronunciation correction dictionary to spoken text using Unicode word boundaries.
	 */
	public static function apply_pronunciation_rules( $text, $rules ) {
		$out = (string) $text;
		if ( $out === '' || ! is_array( $rules ) || empty( $rules ) ) {
			return $out;
		}

		$sorted = $rules;
		usort(
			$sorted,
			function ( $a, $b ) {
				return mb_strlen( (string) ( $b['from'] ?? '' ), 'UTF-8' ) - mb_strlen( (string) ( $a['from'] ?? '' ), 'UTF-8' );
			}
		);

		foreach ( $sorted as $rule ) {
			$from = isset( $rule['from'] ) ? trim( (string) $rule['from'] ) : '';
			$to   = isset( $rule['to'] ) ? trim( (string) $rule['to'] ) : '';
			if ( $from === '' || $to === '' ) {
				continue;
			}
			$pattern = '/(?<![\p{L}\p{N}])' . preg_quote( $from, '/' ) . '(?![\p{L}\p{N}])/u';
			$replaced = @preg_replace( $pattern, str_replace( array( '\\', '$' ), array( '\\\\', '\\$' ), $to ), $out );
			if ( is_string( $replaced ) && $replaced !== '' ) {
				$out = $replaced;
			}
		}
		return $out;
	}

	/**
	 * Ensure OpenAI-style base URL includes /v1 when bare domain is supplied (e.g. https://api.gapgpt.ir -> https://api.gapgpt.ir/v1).
	 */
	private static function normalize_v1_base_url( $base_url ) {
		$trimmed = untrailingslashit( trim( (string) $base_url ) );
		$parsed  = wp_parse_url( $trimmed );
		$path    = isset( $parsed['path'] ) ? untrailingslashit( (string) $parsed['path'] ) : '';
		if ( $path === '' ) {
			return $trimmed . '/v1';
		}
		return $trimmed;
	}

	/**
	 * Build ordered list of base URLs to try for GapGPT (primary + official Cloudflare/Iran CDN failover).
	 */
	private static function get_candidate_base_urls( $provider, $safe_base ) {
		$candidates = array( $safe_base );
		if ( $provider !== 'gapgpt' ) {
			return $candidates;
		}

		$host = strtolower( (string) wp_parse_url( $safe_base, PHP_URL_HOST ) );
		if ( $host === 'api.gapgpt.ir' || $host === 'api.gapgpt.app' ) {
			$candidates[] = 'https://api.gapapi.com/v1';
		} elseif ( $host === 'api.gapapi.com' ) {
			$candidates[] = 'https://api.gapgpt.ir/v1';
		}

		return array_values( array_unique( $candidates ) );
	}

	/**
	 * Map OpenAI voice names to Gemini prebuilt voice names when running Gemini TTS models through GapGPT.
	 */
	private static function resolve_gemini_voice_name( $voice ) {
		$gemini_voices = array( 'Kore', 'Aoede', 'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Leda', 'Orus' );
		foreach ( $gemini_voices as $gv ) {
			if ( strcasecmp( $voice, $gv ) === 0 ) {
				return $gv;
			}
		}
		$lower = strtolower( trim( (string) $voice ) );
		if ( in_array( $lower, array( 'echo', 'onyx', 'ash' ), true ) ) {
			return 'Puck';
		}
		if ( in_array( $lower, array( 'shimmer', 'coral', 'sage' ), true ) ) {
			return 'Aoede';
		}
		return 'Kore';
	}

	/**
	 * Wrap raw 16-bit PCM bytes (e.g. from Gemini TTS) in a standard RIFF/WAV header.
	 */
	private static function wrap_pcm_as_wav( $pcm_bytes, $sample_rate = 24000, $channels = 1, $bits_per_sample = 16 ) {
		$data_size   = strlen( $pcm_bytes );
		$byte_rate   = (int) ( $sample_rate * $channels * ( $bits_per_sample / 8 ) );
		$block_align = (int) ( $channels * ( $bits_per_sample / 8 ) );

		$header = pack(
			'A4VA4A4VvvVVvvA4V',
			'RIFF',
			36 + $data_size,
			'WAVE',
			'fmt ',
			16,
			1,
			$channels,
			$sample_rate,
			$byte_rate,
			$block_align,
			$bits_per_sample,
			'data',
			$data_size
		);

		return $header . $pcm_bytes;
	}

	/**
	 * Handle public/app REST synthesis request.
	 */
	public static function handle_rest_tts( WP_REST_Request $request ) {
		$cfg = self::get_settings();
		if ( empty( $cfg['enabled'] ) ) {
			return new WP_Error(
				'tts_disabled',
				'سرویس تولید صدای هوشمند در وردپرس غیرفعال است.',
				array( 'status' => 503 )
			);
		}

		if ( ! empty( $cfg['require_auth'] ) ) {
			$user = KN_Auth::authenticate_request( $request );
			if ( ! $user ) {
				return new WP_Error(
					'kn_unauthorized',
					'برای استفاده از گوینده هوشمند ابتدا وارد حساب کاربری خود شوید.',
					array( 'status' => 401 )
				);
			}
		}

		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			$params = $request->get_params();
		}

		$raw_text = isset( $params['text'] ) ? trim( sanitize_textarea_field( (string) $params['text'] ) ) : '';
		if ( $raw_text === '' ) {
			return new WP_Error( 'tts_text_required', 'متن برای تولید صدا الزامی است.', array( 'status' => 400 ) );
		}
		if ( mb_strlen( $raw_text, 'UTF-8' ) > 400 ) {
			return new WP_Error( 'tts_text_too_long', 'حداکثر طول متن ۴۰۰ کاراکتر است.', array( 'status' => 400 ) );
		}

		$raw_tone = isset( $params['tone'] ) ? sanitize_key( (string) $params['tone'] ) : 'teach';
		$tone     = in_array( $raw_tone, array( 'teach', 'cheer', 'encourage' ), true ) ? $raw_tone : 'teach';

		$result = self::synthesize( $raw_text, $tone, false );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'audioBase64' => $result['audioBase64'],
				'mimeType'    => $result['mimeType'],
				'provider'    => $result['provider'],
				'cached'      => ! empty( $result['cached'] ),
			)
		);
	}

	/**
	 * Synthesize Persian speech using the configured AI provider with optional server-side caching.
	 */
	public static function synthesize( $text, $tone = 'teach', $bypass_cache = false ) {
		$cfg = self::get_settings();

		if ( empty( $cfg['api_key'] ) ) {
			return new WP_Error(
				'tts_missing_key',
				'کلید API سرویس تبدیل متن به صدا در وردپرس وارد نشده است.',
				array( 'status' => 503 )
			);
		}

		$safe_base = self::validate_safe_external_base_url( $cfg['base_url'] );
		if ( $safe_base === '' ) {
			return new WP_Error(
				'tts_invalid_base_url',
				'آدرس پایه API سرویس باید یک دامنه عمومی معتبر با https باشد.',
				array( 'status' => 400 )
			);
		}

		$spoken_text = self::apply_pronunciation_rules( $text, $cfg['pronunciation_rules'] ?? array() );

		$cache_dir  = ( ! $bypass_cache && ! empty( $cfg['cache_enabled'] ) ) ? self::get_cache_dir() : '';
		$cache_hash = hash(
			'sha256',
			implode(
				'|',
				array(
					$cfg['provider'],
					$safe_base,
					$cfg['model'],
					$cfg['voice'],
					$cfg['format'],
					$cfg['speed'],
					$cfg['instructions'],
					wp_json_encode( $cfg['pronunciation_rules'] ?? array() ),
					$tone,
					$spoken_text,
				)
			)
		);
		$cache_file = $cache_dir !== '' ? ( $cache_dir . '/' . $cache_hash . '.json' ) : '';

		if ( $cache_file !== '' && file_exists( $cache_file ) ) {
			$cached_raw  = @file_get_contents( $cache_file );
			$cached_json = json_decode( (string) $cached_raw, true );
			if ( is_array( $cached_json ) && ! empty( $cached_json['audioBase64'] ) ) {
				@touch( $cache_file );
				return array(
					'audioBase64' => (string) $cached_json['audioBase64'],
					'mimeType'    => (string) ( $cached_json['mimeType'] ?? 'audio/mpeg' ),
					'provider'    => $cfg['provider'],
					'spokenText'  => $spoken_text,
					'cached'      => true,
				);
			}
		}

		if ( ! $bypass_cache ) {
			$rate_ok = self::check_rate_limit();
			if ( is_wp_error( $rate_ok ) ) {
				return $rate_ok;
			}
		}

		$provider   = $cfg['provider'];
		$candidates = self::get_candidate_base_urls( $provider, $safe_base );
		$res        = null;
		$used_base  = $safe_base;

		foreach ( $candidates as $idx => $candidate_base ) {
			$attempt_base = self::validate_safe_external_base_url( $candidate_base );
			if ( $attempt_base === '' ) {
				continue;
			}

			$used_base   = $attempt_base;
			$req_timeout = ( $idx < count( $candidates ) - 1 ) ? 10 : 25;
			$res         = self::dispatch_provider_call( $provider, $attempt_base, $cfg, $spoken_text, $tone, $req_timeout );

			if ( ! is_wp_error( $res ) ) {
				break;
			}

			// Retry on alternate GapGPT CDN only when a network transport error occurs (e.g. cURL error 7 / 28).
			if ( $res->get_error_code() !== 'tts_network_error' || $idx >= count( $candidates ) - 1 ) {
				break;
			}
		}

		if ( is_wp_error( $res ) ) {
			return $res;
		}
		if ( ! is_array( $res ) || empty( $res['audioBase64'] ) ) {
			return new WP_Error( 'tts_empty_audio', 'پاسخ صوتی معتبری از سرویس دریافت نشد.', array( 'status' => 502 ) );
		}

		if ( $cache_file !== '' ) {
			self::prune_cache_if_needed( $cache_dir );
			@file_put_contents(
				$cache_file,
				wp_json_encode(
					array(
						'audioBase64' => $res['audioBase64'],
						'mimeType'    => $res['mimeType'],
						'provider'    => $provider,
						'createdAt'   => time(),
					)
				)
			);
		}

		$res['provider']    = $provider;
		$res['usedBaseUrl'] = $used_base;
		$res['spokenText']  = $spoken_text;
		$res['cached']      = false;
		return $res;
	}

	private static function dispatch_provider_call( $provider, $base_url, $cfg, $text, $tone, $timeout = 25 ) {
		if ( $provider === 'elevenlabs' ) {
			return self::call_elevenlabs( $base_url, $cfg, $text, $timeout );
		}

		if ( $provider === 'gemini' ) {
			return self::call_gemini_tts( $base_url, $cfg, $text, $tone, false, $timeout );
		}

		// GapGPT supports both OpenAI-compatible (/v1/audio/speech) and Gemini TTS models (/v1/models/{model}:generateContent with Bearer auth).
		if ( stripos( (string) $cfg['model'], 'gemini' ) !== false ) {
			$gemini_res = self::call_gemini_tts( self::normalize_v1_base_url( $base_url ), $cfg, $text, $tone, true, $timeout );
			if ( ! is_wp_error( $gemini_res ) || $gemini_res->get_error_code() === 'tts_network_error' ) {
				return $gemini_res;
			}
			// Fallback to /audio/speech if proxy routes Gemini TTS via OpenAI speech endpoint.
			return self::call_openai_compatible( $base_url, $cfg, $text, $tone, $timeout );
		}

		return self::call_openai_compatible( $base_url, $cfg, $text, $tone, $timeout );
	}

	private static function prune_cache_if_needed( $cache_dir ) {
		$files = glob( $cache_dir . '/*.json' );
		if ( ! is_array( $files ) || count( $files ) < self::CACHE_MAX_FILES ) {
			return;
		}
		usort(
			$files,
			function ( $a, $b ) {
				return (int) @filemtime( $a ) - (int) @filemtime( $b );
			}
		);
		$to_remove = count( $files ) - self::CACHE_MAX_FILES + 10;
		for ( $i = 0; $i < $to_remove && isset( $files[ $i ] ); $i++ ) {
			@unlink( $files[ $i ] );
		}
	}

	private static function extract_api_error_message( $raw_body ) {
		$decoded = json_decode( (string) $raw_body, true );
		if ( is_array( $decoded ) ) {
			if ( isset( $decoded['error']['message'] ) && is_string( $decoded['error']['message'] ) ) {
				return sanitize_text_field( $decoded['error']['message'] );
			}
			if ( isset( $decoded['detail']['message'] ) && is_string( $decoded['detail']['message'] ) ) {
				return sanitize_text_field( $decoded['detail']['message'] );
			}
			if ( isset( $decoded['message'] ) && is_string( $decoded['message'] ) ) {
				return sanitize_text_field( $decoded['message'] );
			}
		}
		return '';
	}

	/**
	 * Call GapGPT / OpenAI / AvalAI / Custom OpenAI-compatible POST {base_url}/audio/speech.
	 */
	private static function call_openai_compatible( $base_url, $cfg, $text, $tone, $timeout = 25 ) {
		$endpoint = self::normalize_v1_base_url( $base_url );
		if ( substr( $endpoint, -13 ) !== '/audio/speech' ) {
			$endpoint .= '/audio/speech';
		}

		$payload = array(
			'model'           => $cfg['model'],
			'input'           => $text,
			'voice'           => $cfg['voice'],
			'response_format' => $cfg['format'],
			'speed'           => (float) $cfg['speed'],
		);

		// Only send 'instructions' on models that support steerability (e.g. gpt-4o-mini-tts)
		$lower_model = strtolower( (string) $cfg['model'] );
		if ( strpos( $lower_model, '4o' ) !== false || strpos( $lower_model, 'instruct' ) !== false ) {
			$instr = self::tone_instruction( $tone, $cfg['instructions'] );
			if ( $instr !== '' ) {
				$payload['instructions'] = $instr;
			}
		}

		$response = wp_remote_post(
			$endpoint,
			array(
				'timeout' => max( 5, (int) $timeout ),
				'headers' => array(
					'Authorization' => 'Bearer ' . $cfg['api_key'],
					'Content-Type'  => 'application/json',
				),
				'body'    => wp_json_encode( $payload ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'tts_network_error',
				'خطا در برقراری ارتباط با سرور هوش مصنوعی (' . esc_html( wp_parse_url( $endpoint, PHP_URL_HOST ) ) . '): ' . $response->get_error_message(),
				array( 'status' => 502 )
			);
		}

		$http_code = (int) wp_remote_retrieve_response_code( $response );
		$raw_body  = (string) wp_remote_retrieve_body( $response );
		$resp_ct   = strtolower( (string) wp_remote_retrieve_header( $response, 'content-type' ) );

		if ( $http_code < 200 || $http_code >= 300 || strpos( $resp_ct, 'application/json' ) !== false ) {
			$msg = self::extract_api_error_message( $raw_body );
			return new WP_Error(
				'tts_provider_error',
				$msg !== ''
					? sprintf( 'خطای سرویس هوش مصنوعی (%d): %s', $http_code, $msg )
					: sprintf( 'پاسخ نامعتبر از سرویس هوش مصنوعی (کد %d).', $http_code ),
				array( 'status' => 502 )
			);
		}

		if ( strlen( $raw_body ) < 128 ) {
			return new WP_Error( 'tts_empty_audio', 'فایل صوتی معتبری از سرویس دریافت نشد.', array( 'status' => 502 ) );
		}

		$mime = self::format_to_mime( $cfg['format'] );
		if ( strpos( $resp_ct, 'audio/' ) !== false ) {
			$parts = explode( ';', $resp_ct );
			$mime  = trim( $parts[0] );
		}

		return array(
			'audioBase64' => base64_encode( $raw_body ),
			'mimeType'    => $mime,
		);
	}

	/**
	 * Call ElevenLabs TTS API.
	 */
	private static function call_elevenlabs( $base_url, $cfg, $text, $timeout = 25 ) {
		$voice_id = rawurlencode( $cfg['voice'] );
		$endpoint = untrailingslashit( $base_url ) . '/text-to-speech/' . $voice_id;

		$payload = array(
			'text'           => $text,
			'model_id'       => $cfg['model'],
			'voice_settings' => array(
				'stability'        => 0.55,
				'similarity_boost' => 0.78,
			),
		);

		$response = wp_remote_post(
			$endpoint,
			array(
				'timeout' => max( 5, (int) $timeout ),
				'headers' => array(
					'xi-api-key'   => $cfg['api_key'],
					'Content-Type' => 'application/json',
					'Accept'       => 'audio/mpeg',
				),
				'body'    => wp_json_encode( $payload ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'tts_network_error',
				'خطا در اتصال به ElevenLabs: ' . $response->get_error_message(),
				array( 'status' => 502 )
			);
		}

		$http_code = (int) wp_remote_retrieve_response_code( $response );
		$raw_body  = (string) wp_remote_retrieve_body( $response );
		$resp_ct   = strtolower( (string) wp_remote_retrieve_header( $response, 'content-type' ) );

		if ( $http_code < 200 || $http_code >= 300 || strpos( $resp_ct, 'application/json' ) !== false ) {
			$msg = self::extract_api_error_message( $raw_body );
			return new WP_Error(
				'tts_provider_error',
				$msg !== ''
					? sprintf( 'خطای ElevenLabs (%d): %s', $http_code, $msg )
					: sprintf( 'پاسخ نامعتبر از ElevenLabs (کد %d).', $http_code ),
				array( 'status' => 502 )
			);
		}

		return array(
			'audioBase64' => base64_encode( $raw_body ),
			'mimeType'    => 'audio/mpeg',
		);
	}

	/**
	 * Call Google Gemini TTS REST API (direct Google with x-goog-api-key, or GapGPT proxy with Authorization: Bearer).
	 * Uses speechMetadata.style on Gemini 3.8 TTS models (exact match to original server.ts Kore voice) and clean "Say ..." style prompt otherwise.
	 */
	private static function call_gemini_tts( $base_url, $cfg, $text, $tone, $use_bearer_auth = false, $timeout = 25 ) {
		$model    = rawurlencode( $cfg['model'] );
		$endpoint = untrailingslashit( $base_url ) . '/models/' . $model . ':generateContent';

		$style_desc   = self::gemini_tone_style( $tone, $cfg['instructions'] );
		$voice_name   = self::resolve_gemini_voice_name( $cfg['voice'] );
		$is_v38_model = stripos( (string) $cfg['model'], '3.8' ) !== false;

		$headers = array(
			'Content-Type' => 'application/json',
		);
		if ( $use_bearer_auth ) {
			$headers['Authorization'] = 'Bearer ' . $cfg['api_key'];
		} else {
			$headers['x-goog-api-key'] = $cfg['api_key'];
		}

		$build_payload = function ( $use_speech_metadata ) use ( $text, $style_desc, $tone, $voice_name, $cfg ) {
			$part = $use_speech_metadata
				? array(
					'text'           => $text,
					'speechMetadata' => array(
						'style' => $style_desc,
					),
				)
				: array(
					'text' => self::gemini_say_prompt( $tone, $text, $cfg['instructions'] ?? '' ),
				);

			return array(
				'contents'         => array(
					array(
						'role'  => 'user',
						'parts' => array( $part ),
					),
				),
				'generationConfig' => array(
					'responseModalities' => array( 'AUDIO' ),
					'speechConfig'       => array(
						'voiceConfig' => array(
							'prebuiltVoiceConfig' => array(
								'voiceName' => $voice_name,
							),
						),
					),
				),
			);
		};

		$use_metadata_first = $is_v38_model;
		$response           = wp_remote_post(
			$endpoint,
			array(
				'timeout' => max( 5, (int) $timeout ),
				'headers' => $headers,
				'body'    => wp_json_encode( $build_payload( $use_metadata_first ) ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'tts_network_error',
				'خطا در اتصال به Gemini TTS (' . esc_html( wp_parse_url( $endpoint, PHP_URL_HOST ) ) . '): ' . $response->get_error_message(),
				array( 'status' => 502 )
			);
		}

		$http_code = (int) wp_remote_retrieve_response_code( $response );
		$raw_body  = (string) wp_remote_retrieve_body( $response );
		$decoded   = json_decode( $raw_body, true );

		// If the upstream gateway rejects speechMetadata on 400, retry cleanly using the standard Say-direction prompt.
		if ( $use_metadata_first && $http_code === 400 ) {
			$retry_res = wp_remote_post(
				$endpoint,
				array(
					'timeout' => max( 5, (int) $timeout ),
					'headers' => $headers,
					'body'    => wp_json_encode( $build_payload( false ) ),
				)
			);
			if ( ! is_wp_error( $retry_res ) ) {
				$response  = $retry_res;
				$http_code = (int) wp_remote_retrieve_response_code( $response );
				$raw_body  = (string) wp_remote_retrieve_body( $response );
				$decoded   = json_decode( $raw_body, true );
			}
		}

		if ( $http_code < 200 || $http_code >= 300 || ! is_array( $decoded ) ) {
			$msg = self::extract_api_error_message( $raw_body );
			return new WP_Error(
				'tts_provider_error',
				$msg !== ''
					? sprintf( 'خطای Gemini TTS (%d): %s', $http_code, $msg )
					: sprintf( 'پاسخ نامعتبر از Gemini TTS (کد %d).', $http_code ),
				array( 'status' => 502 )
			);
		}

		$inline = $decoded['candidates'][0]['content']['parts'][0]['inlineData'] ?? null;
		if ( ! is_array( $inline ) || empty( $inline['data'] ) ) {
			return new WP_Error( 'tts_empty_audio', 'داده صوتی در پاسخ Gemini یافت نشد.', array( 'status' => 502 ) );
		}

		$b64      = (string) $inline['data'];
		$raw_mime = strtolower( (string) ( $inline['mimeType'] ?? 'audio/wav' ) );

		// Gemini often returns raw linear16 PCM (audio/L16;codec=pcm;rate=24000); wrap in WAV header for browser <audio>.
		if ( strpos( $raw_mime, 'l16' ) !== false || strpos( $raw_mime, 'pcm' ) !== false ) {
			$rate = 24000;
			if ( preg_match( '/rate=(\d+)/', $raw_mime, $m ) ) {
				$rate = max( 8000, min( 48000, (int) $m[1] ) );
			}
			$pcm = base64_decode( $b64, true );
			if ( $pcm !== false ) {
				$wav = self::wrap_pcm_as_wav( $pcm, $rate, 1, 16 );
				return array(
					'audioBase64' => base64_encode( $wav ),
					'mimeType'    => 'audio/wav',
				);
			}
		}

		$mime_parts = explode( ';', $raw_mime );
		return array(
			'audioBase64' => $b64,
			'mimeType'    => trim( $mime_parts[0] ) ?: 'audio/wav',
		);
	}
}
