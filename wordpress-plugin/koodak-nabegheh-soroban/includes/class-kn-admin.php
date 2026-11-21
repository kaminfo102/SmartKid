<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_Admin {

	private static $skills = array(
		'recognition'       => 'شناخت چرتکه و اعداد ۰ تا ۹',
		'placeValue'        => 'ارزش مکانی (یکان، دهگان، صدگان)',
		'simpleAddition'    => 'جمع ساده با چرتکه',
		'simpleSubtraction' => 'تفریق ساده با چرتکه',
		'complements'       => 'مکمل‌های ۵ و ۱۰',
		'mentalMath'        => 'محاسبات ذهنی مقدماتی',
	);

	private static $icons = array(
		'sparkles' => 'ستاره و جرقه‌ها (شروع)',
		'layers'   => 'لایه‌ها (ارزش مکانی)',
		'plus'     => 'به‌علاوه (جمع)',
		'minus'    => 'منها (تفریق)',
		'puzzle'   => 'پازل (مکمل‌ها)',
		'brain'    => 'مغز نابغه (ذهنی)',
	);

	private static $biomes = array(
		'farm'   => 'مزرعه آفتابی (انبار قرمز، آسیاب بادی، گندم‌زار)',
		'forest' => 'جنگل دوستی‌های جادویی (کلبه درختی، پل رنگین‌کمان)',
		'island' => 'جزیره گنج اعداد بزرگ (قایق بادبانی، فانوس دریایی)',
		'space'  => 'ایستگاه فضایی ستاره‌ها (موشک، سیاره جادویی)',
	);

	private static $landmarks = array(
		'barn'       => 'انبار قرمز مزرعه',
		'windmill'   => 'آسیاب بادی',
		'wheat'      => 'مزرعه گندم طلایی',
		'garden'     => 'باغ گل آفتاب‌گردان',
		'treehouse'  => 'کلبه درختی جادویی',
		'bridge'     => 'پل رنگین‌کمان',
		'waterfall'  => 'آبشار جادویی',
		'owlcastle'  => 'قصر جغد دانا',
		'boat'       => 'قایق بادبانی',
		'lighthouse' => 'فانوس دریایی',
		'cave'       => 'غار الماس',
		'chest'      => 'صندوقچه گنج',
		'rocket'     => 'موشک فضایی',
		'planet'     => 'سیاره اعداد',
	);

	private static $avatars = array(
		'owl'    => 'جغد دانا',
		'fox'    => 'روباه زرنگ',
		'rabbit' => 'خرگوش شاد',
		'bear'   => 'خرس مهربان',
		'panda'  => 'پاندا باهوش',
		'star'   => 'ستاره درخشان',
	);

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menus' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_action( 'admin_init', array( __CLASS__, 'handle_actions' ) );
	}

	public static function register_menus() {
		add_menu_page(
			'کودک نابغه — چرتکه و ترم‌ها',
			'کودک نابغه',
			'manage_options',
			'kn-soroban',
			array( __CLASS__, 'render_dashboard_page' ),
			'dashicons-awards',
			26
		);

		add_submenu_page(
			'kn-soroban',
			'داشبورد کلی',
			'داشبورد کلی',
			'manage_options',
			'kn-soroban',
			array( __CLASS__, 'render_dashboard_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'ترم‌ها و اتصال ووکامرس',
			'ترم‌ها و ووکامرس',
			'manage_options',
			'kn-soroban-terms',
			array( __CLASS__, 'render_terms_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'جاده یادگیری و مراحل',
			'جاده و مراحل',
			'manage_options',
			'kn-soroban-stages',
			array( __CLASS__, 'render_stages_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'بانک سوالات و تمرین‌ها',
			'بانک سوالات',
			'manage_options',
			'kn-soroban-questions',
			array( __CLASS__, 'render_questions_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'کاربران، دسترسی ترم‌ها و امتیازات',
			'کاربران و دسترسی ترم‌ها',
			'manage_options',
			'kn-soroban-users',
			array( __CLASS__, 'render_users_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'تنظیمات هدلس و API',
			'تنظیمات هدلس',
			'manage_options',
			'kn-soroban-settings',
			array( __CLASS__, 'render_settings_page' )
		);
	}

	public static function enqueue_assets( $hook ) {
		if ( strpos( (string) $hook, 'kn-soroban' ) === false ) {
			return;
		}
		wp_enqueue_style( 'kn-soroban-admin', KN_SOROBAN_URL . 'assets/admin.css', array(), KN_SOROBAN_VERSION );
		wp_enqueue_script( 'kn-soroban-admin', KN_SOROBAN_URL . 'assets/admin.js', array(), KN_SOROBAN_VERSION, true );
	}

	/**
	 * Process all secure POST form actions in WP Admin.
	 */
	public static function handle_actions() {
		if ( ! is_admin() || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( empty( $_POST['kn_action'] ) ) {
			return;
		}

		global $wpdb;
		$action = sanitize_key( wp_unslash( $_POST['kn_action'] ) );

		// 0A. Save or Create Term
		if ( $action === 'save_term' && check_admin_referer( 'kn_save_term' ) ) {
			$term_db_id = absint( $_POST['term_id'] ?? 0 );
			$slug_raw   = sanitize_title( wp_unslash( $_POST['slug'] ?? '' ) );
			if ( empty( $slug_raw ) ) {
				$slug_raw = 'term-' . time();
			}
			$biome = sanitize_key( wp_unslash( $_POST['biome'] ?? 'farm' ) );
			if ( ! array_key_exists( $biome, self::$biomes ) ) {
				$biome = 'farm';
			}

			$is_free              = ! empty( $_POST['is_free'] ) ? 1 : 0;
			$checkout_override_in = trim( (string) wp_unslash( $_POST['checkout_url_override'] ?? '' ) );
			$safe_override        = '';
			if ( ! empty( $checkout_override_in ) ) {
				$parsed = wp_parse_url( $checkout_override_in );
				if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
					$safe_override = esc_url_raw( $checkout_override_in );
				}
			}

			$data = array(
				'slug'                  => $slug_raw,
				'term_number'           => max( 1, absint( $_POST['term_number'] ?? 1 ) ),
				'title'                 => sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) ),
				'subtitle'              => sanitize_text_field( wp_unslash( $_POST['subtitle'] ?? '' ) ),
				'story_title'           => sanitize_text_field( wp_unslash( $_POST['story_title'] ?? '' ) ),
				'story_description'     => sanitize_textarea_field( wp_unslash( $_POST['story_description'] ?? '' ) ),
				'biome'                 => $biome,
				'accent_color'          => sanitize_hex_color( wp_unslash( $_POST['accent_color'] ?? '#4BB543' ) ) ?: '#4BB543',
				'is_free'               => $is_free,
				'price_amount'          => $is_free ? 0 : absint( $_POST['price_amount'] ?? 0 ),
				'woo_product_id'        => $is_free ? 0 : absint( $_POST['woo_product_id'] ?? 0 ),
				'checkout_url_override' => $safe_override,
				'is_active'             => ! empty( $_POST['is_active'] ) ? 1 : 0,
			);

			if ( $term_db_id > 0 ) {
				$wpdb->update( KN_DB::table_terms(), $data, array( 'id' => $term_db_id ) );
				self::redirect_with_notice( 'kn-soroban-terms', 'ترم با موفقیت ویرایش شد.' );
			} else {
				$wpdb->insert( KN_DB::table_terms(), $data );
				self::redirect_with_notice( 'kn-soroban-terms', 'ترم جدید با موفقیت ایجاد شد!' );
			}
		}

		// 0B. Delete Term
		if ( $action === 'delete_term' && check_admin_referer( 'kn_delete_term' ) ) {
			$term_db_id = absint( $_POST['term_id'] ?? 0 );
			if ( $term_db_id > 0 ) {
				$wpdb->delete( KN_DB::table_entitlements(), array( 'term_id' => $term_db_id ), array( '%d' ) );
				$wpdb->delete( KN_DB::table_terms(), array( 'id' => $term_db_id ), array( '%d' ) );
			}
			self::redirect_with_notice( 'kn-soroban-terms', 'ترم حذف شد.' );
		}

		// 1. Save or Create Stage
		if ( $action === 'save_stage' && check_admin_referer( 'kn_save_stage' ) ) {
			$stage_id = absint( $_POST['stage_id'] ?? 0 );
			$slug_raw = sanitize_title( wp_unslash( $_POST['slug'] ?? '' ) );
			if ( empty( $slug_raw ) ) {
				$slug_raw = 'stage-' . time();
			}
			$landmark = sanitize_key( wp_unslash( $_POST['landmark'] ?? 'barn' ) );
			if ( ! array_key_exists( $landmark, self::$landmarks ) ) {
				$landmark = 'barn';
			}

			$data = array(
				'term_id'            => max( 1, absint( $_POST['term_id'] ?? 1 ) ),
				'slug'               => $slug_raw,
				'stage_number'       => max( 1, absint( $_POST['stage_number'] ?? 1 ) ),
				'title'              => sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) ),
				'short_goal'         => sanitize_text_field( wp_unslash( $_POST['short_goal'] ?? '' ) ),
				'story_caption'      => sanitize_textarea_field( wp_unslash( $_POST['story_caption'] ?? '' ) ),
				'landmark'           => $landmark,
				'skill'              => sanitize_text_field( wp_unslash( $_POST['skill'] ?? 'recognition' ) ),
				'columns_count'      => max( 1, min( 4, absint( $_POST['columns_count'] ?? 1 ) ) ),
				'unlock_requirement' => sanitize_title( wp_unslash( $_POST['unlock_requirement'] ?? '' ) ),
				'icon_name'          => sanitize_key( wp_unslash( $_POST['icon_name'] ?? 'sparkles' ) ),
				'accent_color'       => sanitize_hex_color( wp_unslash( $_POST['accent_color'] ?? '#0EA5E9' ) ) ?: '#0EA5E9',
				'is_active'          => ! empty( $_POST['is_active'] ) ? 1 : 0,
			);

			if ( $stage_id > 0 ) {
				$wpdb->update( KN_DB::table_stages(), $data, array( 'id' => $stage_id ) );
				self::redirect_with_notice( 'kn-soroban-stages', 'مرحله با موفقیت ویرایش شد.' );
			} else {
				$wpdb->insert( KN_DB::table_stages(), $data );
				self::redirect_with_notice( 'kn-soroban-stages', 'مرحله جدید به جاده یادگیری اضافه شد!' );
			}
		}

		// 2. Delete Stage
		if ( $action === 'delete_stage' && check_admin_referer( 'kn_delete_stage' ) ) {
			$stage_id = absint( $_POST['stage_id'] ?? 0 );
			if ( $stage_id > 0 ) {
				$wpdb->delete( KN_DB::table_steps(), array( 'stage_id' => $stage_id ), array( '%d' ) );
				$wpdb->delete( KN_DB::table_stages(), array( 'id' => $stage_id ), array( '%d' ) );
			}
			self::redirect_with_notice( 'kn-soroban-stages', 'مرحله و گام‌های آن حذف شد.' );
		}

		// 3. Add or Update Step inside Stage
		if ( $action === 'save_step' && check_admin_referer( 'kn_save_step' ) ) {
			$step_id  = absint( $_POST['step_id'] ?? 0 );
			$stage_id = absint( $_POST['stage_id'] ?? 0 );
			$order    = max( 1, absint( $_POST['step_order'] ?? 1 ) );

			$data = array(
				'stage_id'            => $stage_id,
				'step_slug'           => sanitize_title( wp_unslash( $_POST['step_slug'] ?? ( 'step-' . $stage_id . '-' . time() ) ) ),
				'step_order'          => $order,
				'title'               => sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) ),
				'instruction'         => wp_kses_post( wp_unslash( $_POST['instruction'] ?? '' ) ),
				'spoken_text'         => sanitize_text_field( wp_unslash( $_POST['spoken_text'] ?? '' ) ),
				'initial_value'       => intval( $_POST['initial_value'] ?? 0 ),
				'target_value'        => ( isset( $_POST['target_value'] ) && $_POST['target_value'] !== '' ) ? intval( $_POST['target_value'] ) : null,
				'columns_count'       => max( 1, min( 4, absint( $_POST['columns_count'] ?? 1 ) ) ),
				'require_interaction' => ! empty( $_POST['require_interaction'] ) ? 1 : 0,
				'auto_demo_steps'     => ! empty( $_POST['auto_demo_steps'] ) ? 1 : 0,
				'highlight_column'    => ( isset( $_POST['highlight_column'] ) && $_POST['highlight_column'] !== '' ) ? intval( $_POST['highlight_column'] ) : null,
			);

			if ( $step_id > 0 ) {
				$wpdb->update( KN_DB::table_steps(), $data, array( 'id' => $step_id ) );
				self::redirect_with_notice( 'kn-soroban-stages', 'گام آموزشی به‌روزرسانی شد.' );
			} else {
				$wpdb->insert( KN_DB::table_steps(), $data );
				self::redirect_with_notice( 'kn-soroban-stages', 'گام آموزشی جدید اضافه شد!' );
			}
		}

		// 4. Delete Step
		if ( $action === 'delete_step' && check_admin_referer( 'kn_delete_step' ) ) {
			$step_id = absint( $_POST['step_id'] ?? 0 );
			if ( $step_id > 0 ) {
				$wpdb->delete( KN_DB::table_steps(), array( 'id' => $step_id ), array( '%d' ) );
			}
			self::redirect_with_notice( 'kn-soroban-stages', 'گام آموزشی حذف شد.' );
		}

		// 5. Save Question
		if ( $action === 'save_question' && check_admin_referer( 'kn_save_question' ) ) {
			$qid = absint( $_POST['question_id'] ?? 0 );
			$op  = sanitize_text_field( wp_unslash( $_POST['operation'] ?? '' ) );

			$data = array(
				'term_id'        => absint( $_POST['term_id'] ?? 0 ),
				'skill'          => sanitize_text_field( wp_unslash( $_POST['skill'] ?? 'recognition' ) ),
				'difficulty'     => max( 1, min( 5, absint( $_POST['difficulty'] ?? 1 ) ) ),
				'columns_count'  => max( 1, min( 4, absint( $_POST['columns_count'] ?? 1 ) ) ),
				'prompt_text'    => sanitize_text_field( wp_unslash( $_POST['prompt_text'] ?? '' ) ),
				'spoken_text'    => sanitize_text_field( wp_unslash( $_POST['spoken_text'] ?? '' ) ),
				'start_value'    => intval( $_POST['start_value'] ?? 0 ),
				'target_value'   => intval( $_POST['target_value'] ?? 0 ),
				'visual_type'    => sanitize_key( wp_unslash( $_POST['visual_type'] ?? 'number' ) ),
				'visual_count_a' => ( isset( $_POST['visual_count_a'] ) && $_POST['visual_count_a'] !== '' ) ? absint( $_POST['visual_count_a'] ) : null,
				'visual_count_b' => ( isset( $_POST['visual_count_b'] ) && $_POST['visual_count_b'] !== '' ) ? absint( $_POST['visual_count_b'] ) : null,
				'visual_emoji'   => sanitize_key( wp_unslash( $_POST['visual_emoji'] ?? 'apple' ) ),
				'operation'      => in_array( $op, array( '+', '-' ), true ) ? $op : null,
				'is_active'      => ! empty( $_POST['is_active'] ) ? 1 : 0,
			);

			if ( $qid > 0 ) {
				$wpdb->update( KN_DB::table_questions(), $data, array( 'id' => $qid ) );
				self::redirect_with_notice( 'kn-soroban-questions', 'سؤال تمرینی ویرایش شد.' );
			} else {
				$wpdb->insert( KN_DB::table_questions(), $data );
				self::redirect_with_notice( 'kn-soroban-questions', 'سؤال جدید به بانک تمرین‌ها اضافه شد!' );
			}
		}

		// 6. Delete Question
		if ( $action === 'delete_question' && check_admin_referer( 'kn_delete_question' ) ) {
			$qid = absint( $_POST['question_id'] ?? 0 );
			if ( $qid > 0 ) {
				$wpdb->delete( KN_DB::table_questions(), array( 'id' => $qid ), array( '%d' ) );
			}
			self::redirect_with_notice( 'kn-soroban-questions', 'سؤال حذف شد.' );
		}

		// 7. Create User + Child Profile from Admin
		if ( $action === 'admin_create_user' && check_admin_referer( 'kn_admin_create_user' ) ) {
			$result = KN_Auth::register_user(
				array(
					'email'       => sanitize_email( wp_unslash( $_POST['email'] ?? '' ) ),
					'username'    => sanitize_user( wp_unslash( $_POST['username'] ?? '' ), true ),
					'password'    => (string) ( $_POST['password'] ?? '' ),
					'displayName' => sanitize_text_field( wp_unslash( $_POST['display_name'] ?? '' ) ),
					'childName'   => sanitize_text_field( wp_unslash( $_POST['child_name'] ?? 'آرتین' ) ),
					'childAge'    => absint( $_POST['child_age'] ?? 6 ),
					'childAvatar' => sanitize_key( wp_unslash( $_POST['child_avatar'] ?? 'owl' ) ),
				)
			);
			if ( is_wp_error( $result ) ) {
				self::redirect_with_notice( 'kn-soroban-users', $result->get_error_message(), true );
			}
			self::redirect_with_notice( 'kn-soroban-users', 'کاربر و پروفایل کودک با موفقیت ساخته شد!' );
		}

		// 8. Update Child Profile Scores/Stars from Admin
		if ( $action === 'admin_update_profile' && check_admin_referer( 'kn_admin_update_profile' ) ) {
			$profile_db_id = absint( $_POST['profile_db_id'] ?? 0 );
			if ( $profile_db_id > 0 ) {
				$update = array(
					'name'             => sanitize_text_field( wp_unslash( $_POST['name'] ?? 'قهرمان' ) ),
					'age'              => max( 3, min( 15, absint( $_POST['age'] ?? 6 ) ) ),
					'total_stars'      => max( 0, intval( $_POST['total_stars'] ?? 0 ) ),
					'practice_minutes' => max( 0, intval( $_POST['practice_minutes'] ?? 0 ) ),
					'difficulty_level' => max( 1, min( 5, absint( $_POST['difficulty_level'] ?? 1 ) ) ),
				);
				if ( ! empty( $_POST['reset_progress'] ) ) {
					$update['total_stars']    = 0;
					$update['total_correct']  = 0;
					$update['total_attempts'] = 0;
					$update['lessons_json']   = wp_json_encode( new stdClass() );
					$update['skills_json']    = wp_json_encode( KN_DB::default_skills_map() );
				}
				$wpdb->update( KN_DB::table_profiles(), $update, array( 'id' => $profile_db_id ) );
			}
			self::redirect_with_notice( 'kn-soroban-users', 'امتیاز و مشخصات کودک ذخیره شد.' );
		}

		// 8B. Grant or Revoke Term Entitlement for a WP User
		if ( $action === 'admin_toggle_entitlement' && check_admin_referer( 'kn_admin_toggle_entitlement' ) ) {
			$target_uid = absint( $_POST['target_user_id'] ?? 0 );
			$term_db_id = absint( $_POST['term_id'] ?? 0 );
			$mode       = sanitize_key( wp_unslash( $_POST['entitlement_mode'] ?? 'grant' ) );

			if ( $target_uid > 0 && $term_db_id > 0 ) {
				if ( $mode === 'revoke' ) {
					KN_DB::revoke_term_entitlement( $target_uid, $term_db_id );
					self::redirect_with_notice( 'kn-soroban-users', 'دسترسی کاربر به ترم لغو شد.' );
				} else {
					KN_DB::grant_term_entitlement( $target_uid, $term_db_id, 'admin', 0 );
					self::redirect_with_notice( 'kn-soroban-users', 'ترم برای کاربر با موفقیت فعال شد!' );
				}
			}
		}

		// 9. Save Headless Settings
		if ( $action === 'save_settings' && check_admin_referer( 'kn_save_settings' ) ) {
			$settings = array(
				'app_title'              => sanitize_text_field( wp_unslash( $_POST['app_title'] ?? 'کودک نابغه' ) ),
				'allowed_origins'        => sanitize_text_field( wp_unslash( $_POST['allowed_origins'] ?? '*' ) ),
				'token_ttl_days'         => max( 1, min( 90, absint( $_POST['token_ttl_days'] ?? 30 ) ) ),
				'daily_challenge_count'  => max( 1, min( 20, absint( $_POST['daily_challenge_count'] ?? 5 ) ) ),
				'allow_registration'     => ! empty( $_POST['allow_registration'] ) ? 1 : 0,
				'default_digit_mode'     => ( isset( $_POST['default_digit_mode'] ) && $_POST['default_digit_mode'] === 'en' ) ? 'en' : 'fa',
				'default_sound_enabled'  => ! empty( $_POST['default_sound_enabled'] ) ? 1 : 0,
				'default_speech_enabled' => ! empty( $_POST['default_speech_enabled'] ) ? 1 : 0,
				'default_night_mode'     => ! empty( $_POST['default_night_mode'] ) ? 1 : 0,
				'default_abacus_scale'   => ( isset( $_POST['default_abacus_scale'] ) && $_POST['default_abacus_scale'] === 'large' ) ? 'large' : 'normal',
				'default_prefer_2d'      => ! empty( $_POST['default_prefer_2d'] ) ? 1 : 0,
			);
			update_option( 'kn_soroban_settings', $settings );
			self::redirect_with_notice( 'kn-soroban-settings', 'تنظیمات هدلس با موفقیت ذخیره شد.' );
		}

		// 10. Reseed Defaults if empty
		if ( $action === 'reseed_defaults' && check_admin_referer( 'kn_reseed_defaults' ) ) {
			KN_DB::seed_defaults_if_empty();
			self::redirect_with_notice( 'kn-soroban-settings', 'داده‌های پیش‌فرض (در صورت خالی بودن) بازیابی شدند.' );
		}
	}

	private static function redirect_with_notice( $page_slug, $message, $is_error = false ) {
		$url = add_query_arg(
			array(
				'page'      => $page_slug,
				'kn_notice' => rawurlencode( $message ),
				'kn_err'    => $is_error ? '1' : '0',
			),
			admin_url( 'admin.php' )
		);
		wp_safe_redirect( $url );
		exit;
	}

	private static function render_header( $title, $subtitle ) {
		$site_url = untrailingslashit( get_site_url() );
		$api_base = $site_url . '/wp-json/' . KN_SOROBAN_API_NS;
		?>
		<div class="kn-hero">
			<div>
				<h1><?php echo esc_html( $title ); ?></h1>
				<p><?php echo esc_html( $subtitle ); ?></p>
			</div>
			<div class="kn-api-box">
				<span style="font-size:12px;font-weight:800;color:#5c3a1f;">آدرس اتصال اپلیکیشن (Site URL):</span>
				<code><?php echo esc_html( $site_url ); ?></code>
				<button type="button" class="kn-btn kn-btn-amber" data-kn-copy="<?php echo esc_attr( $site_url ); ?>">کپی آدرس سایت</button>
				<button type="button" class="kn-btn kn-btn-ghost" data-kn-copy="<?php echo esc_attr( $api_base ); ?>">کپی API</button>
			</div>
		</div>
		<?php
		if ( ! empty( $_GET['kn_notice'] ) ) {
			$notice = sanitize_text_field( wp_unslash( $_GET['kn_notice'] ) );
			$is_err = ! empty( $_GET['kn_err'] ) && $_GET['kn_err'] === '1';
			printf(
				'<div class="kn-notice %s">%s</div>',
				$is_err ? 'kn-notice-error' : '',
				esc_html( $notice )
			);
		}
	}

	/**
	 * Page 1: Dashboard Overview
	 */
	public static function render_dashboard_page() {
		global $wpdb;
		$t_terms        = KN_DB::table_terms();
		$t_stages       = KN_DB::table_stages();
		$t_steps        = KN_DB::table_steps();
		$t_questions    = KN_DB::table_questions();
		$t_profiles     = KN_DB::table_profiles();
		$t_entitlements = KN_DB::table_entitlements();

		$terms_count     = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_terms}" );
		$stages_count    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_stages}" );
		$steps_count     = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_steps}" );
		$questions_count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_questions}" );
		$profiles_count  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_profiles}" );
		$total_stars     = (int) $wpdb->get_var( "SELECT COALESCE(SUM(total_stars), 0) FROM {$t_profiles}" );
		$ent_count       = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_entitlements}" );
		$woo_active      = KN_Woo::is_woo_active();

		$top_learners = $wpdb->get_results(
			"SELECT p.*, u.user_email, u.user_login FROM {$t_profiles} p LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID ORDER BY p.total_stars DESC, p.total_correct DESC LIMIT 10",
			ARRAY_A
		);
		?>
		<div class="kn-wrap">
			<?php self::render_header( 'داشبورد مدیریت «کودک نابغه»', 'کنترل کامل ترم‌های آموزشی، نقشه‌های داستانی، ووکامرس، بانک سوالات و پیشرفت کودکان' ); ?>

			<div class="kn-kpi-grid">
				<div class="kn-kpi-card">
					<div class="kn-kpi-badge kn-bg-violet">📚</div>
					<div>
						<div class="kn-kpi-num"><?php echo esc_html( number_format_i18n( $terms_count ) ); ?></div>
						<div class="kn-kpi-label">ترم‌های داستانی</div>
					</div>
				</div>
				<div class="kn-kpi-card">
					<div class="kn-kpi-badge kn-bg-blue">🗺️</div>
					<div>
						<div class="kn-kpi-num"><?php echo esc_html( number_format_i18n( $stages_count ) ); ?></div>
						<div class="kn-kpi-label">مراحل کل (<?php echo esc_html( number_format_i18n( $steps_count ) ); ?> گام)</div>
					</div>
				</div>
				<div class="kn-kpi-card">
					<div class="kn-kpi-badge kn-bg-green">❓</div>
					<div>
						<div class="kn-kpi-num"><?php echo esc_html( number_format_i18n( $questions_count ) ); ?></div>
						<div class="kn-kpi-label">سوالات بانک تمرین</div>
					</div>
				</div>
				<div class="kn-kpi-card">
					<div class="kn-kpi-badge kn-bg-pink">👧</div>
					<div>
						<div class="kn-kpi-num"><?php echo esc_html( number_format_i18n( $profiles_count ) ); ?></div>
						<div class="kn-kpi-label">کودکان (<?php echo esc_html( number_format_i18n( $total_stars ) ); ?> ⭐)</div>
					</div>
				</div>
				<div class="kn-kpi-card">
					<div class="kn-kpi-badge kn-bg-amber">🛒</div>
					<div>
						<div class="kn-kpi-num"><?php echo $woo_active ? 'متصل' : 'غیرفعال'; ?></div>
						<div class="kn-kpi-label">ووکامرس (<?php echo esc_html( number_format_i18n( $ent_count ) ); ?> دسترسی ترم)</div>
					</div>
				</div>
			</div>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>دسترسی سریع مدیریت</h2>
					<div style="display:flex;gap:8px;flex-wrap:wrap;">
						<a class="kn-btn kn-btn-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-terms' ) ); ?>">ترم‌ها و اتصال ووکامرس</a>
						<a class="kn-btn kn-btn-green" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-stages' ) ); ?>">مدیریت جاده‌ها و مراحل</a>
						<a class="kn-btn kn-btn-amber" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-questions' ) ); ?>">بانک سوالات</a>
						<a class="kn-btn kn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users' ) ); ?>">کاربران و دسترسی ترم‌ها</a>
					</div>
				</div>
				<p style="margin:0;font-size:13px;color:#5c3a1f;">
					<?php if ( $woo_active ) : ?>
						✅ <strong>ووکامرس فعال است:</strong> می‌توانید در صفحه «ترم‌ها و ووکامرس» هر ترم پولی را به محصول ووکامرس متصل کنید تا پس از پرداخت موفق، به‌طور خودکار برای کاربر باز شود.
					<?php else : ?>
						⚠️ <strong>توجه:</strong> افزونه <strong>WooCommerce</strong> هنوز روی این سایت نصب یا فعال نشده است. تا زمان فعال‌سازی ووکامرس، می‌توانید دسترسی ترم‌ها را به‌صورت دستی از بخش «کاربران و دسترسی ترم‌ها» فعال کنید.
					<?php endif; ?>
				</p>
			</div>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>برترین قهرمانان چرتکه (جدول امتیازات)</h2>
				</div>
				<?php if ( empty( $top_learners ) ) : ?>
					<p>هنوز کودکی ثبت نشده است. از بخش «کاربران و دسترسی ترم‌ها» یا اپلیکیشن ثبت‌نام کنید.</p>
				<?php else : ?>
					<table class="kn-table">
						<thead>
							<tr>
								<th>نام کودک</th>
								<th>حساب والد / ایمیل</th>
								<th>سن</th>
								<th>ستاره‌ها</th>
								<th>دقت پاسخ</th>
								<th>دقیقه تمرین</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $top_learners as $row ) : ?>
								<?php
								$acc = (int) $row['total_attempts'] > 0
									? round( ( (int) $row['total_correct'] / (int) $row['total_attempts'] ) * 100 )
									: 100;
								?>
								<tr>
									<td><strong><?php echo esc_html( $row['name'] ); ?></strong></td>
									<td><?php echo esc_html( $row['user_email'] ?: $row['user_login'] ); ?></td>
									<td><?php echo esc_html( $row['age'] ); ?> سال</td>
									<td><span class="kn-pill kn-pill-amber">⭐ <?php echo esc_html( $row['total_stars'] ); ?></span></td>
									<td><span class="kn-pill kn-pill-green"><?php echo esc_html( $acc ); ?>٪</span></td>
									<td><?php echo esc_html( $row['practice_minutes'] ); ?> دقیقه</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Page 2: Terms & WooCommerce Product Connection Manager
	 */
	public static function render_terms_page() {
		$terms        = KN_DB::get_terms_curriculum( false, 0 );
		$woo_active   = KN_Woo::is_woo_active();
		$woo_products = $woo_active ? KN_Woo::get_admin_products_list() : array();
		?>
		<div class="kn-wrap">
			<?php self::render_header( 'مدیریت ترم‌های داستانی و فروش با ووکامرس', 'هر ترم یک نقشه ماجراجویی و داستان اختصاصی دارد. ترم اول رایگان است و ترم‌های بعدی را می‌توانید به محصولات ووکامرس متصل کنید.' ); ?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>افزودن ترم جدید</h2>
					<button type="button" class="kn-btn kn-btn-primary" data-kn-toggle="kn-new-term-form">+ ترم جدید</button>
				</div>
				<div id="kn-new-term-form" class="kn-collapsible <?php echo empty( $terms ) ? 'is-open' : ''; ?>">
					<form method="post">
						<?php wp_nonce_field( 'kn_save_term' ); ?>
						<input type="hidden" name="kn_action" value="save_term" />
						<div class="kn-grid-3">
							<div class="kn-field">
								<label>عنوان ترم</label>
								<input type="text" name="title" required placeholder="مثلاً: ترم ۴: ایستگاه فضایی محاسبه سریع" />
							</div>
							<div class="kn-field">
								<label>شناسه یکتا (Slug انگلیسی)</label>
								<input type="text" name="slug" dir="ltr" placeholder="term-4-space" />
							</div>
							<div class="kn-field">
								<label>شماره ترتیب ترم</label>
								<input type="number" name="term_number" value="<?php echo esc_attr( count( $terms ) + 1 ); ?>" min="1" />
							</div>
						</div>

						<div class="kn-grid-2">
							<div class="kn-field">
								<label>زیرعنوان کوتاه</label>
								<input type="text" name="subtitle" required placeholder="خلاصه مهارت‌های این ترم" />
							</div>
							<div class="kn-field">
								<label>عنوان داستان نقشه</label>
								<input type="text" name="story_title" required placeholder="مثلاً: سفر فضایی کیا به سیاره اعداد" />
							</div>
						</div>

						<div class="kn-field">
							<label>متن داستان کودکانه (با صدای کیا هم خوانده می‌شود)</label>
							<textarea name="story_description" rows="2" required placeholder="داستان کوتاه و جذاب برای شروع نقشه این ترم..."></textarea>
						</div>

						<div class="kn-grid-3">
							<div class="kn-field">
								<label>تم دنیای نقشه (Biome)</label>
								<select name="biome">
									<?php foreach ( self::$biomes as $k => $lbl ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $lbl ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>رنگ تاکیدی</label>
								<input type="color" name="accent_color" value="#5472EB" style="height:40px;" />
							</div>
							<div class="kn-field" style="padding-top:22px;">
								<label style="margin-left:14px;"><input type="checkbox" name="is_free" value="1" /> ترم رایگان است</label>
								<label><input type="checkbox" name="is_active" value="1" checked /> فعال در اپ</label>
							</div>
						</div>

						<div class="kn-grid-3">
							<div class="kn-field">
								<label>مبلغ نمایشی (در صورت عدم انتخاب محصول ووکامرس)</label>
								<input type="number" name="price_amount" value="250000" min="0" />
							</div>
							<div class="kn-field">
								<label>محصول مرتبط در ووکامرس</label>
								<?php if ( $woo_active && ! empty( $woo_products ) ) : ?>
									<select name="woo_product_id">
										<option value="0">— انتخاب محصول ووکامرس —</option>
										<?php foreach ( $woo_products as $wp_prod ) : ?>
											<option value="<?php echo esc_attr( $wp_prod['id'] ); ?>">
												#<?php echo esc_html( $wp_prod['id'] . ' — ' . $wp_prod['name'] . ' (' . $wp_prod['price'] . ')' ); ?>
											</option>
										<?php endforeach; ?>
									</select>
								<?php else : ?>
									<input type="number" name="woo_product_id" value="0" min="0" placeholder="شناسه محصول ووکامرس (Product ID)" />
								<?php endif; ?>
							</div>
							<div class="kn-field">
								<label>لینک پرداخت اختصاصی (اختیاری)</label>
								<input type="text" name="checkout_url_override" dir="ltr" placeholder="https://yoursite.com/checkout/?add-to-cart=..." />
							</div>
						</div>

						<button type="submit" class="kn-btn kn-btn-green">ایجاد ترم جدید</button>
					</form>
				</div>
			</div>

			<?php foreach ( $terms as $term ) : ?>
				<div class="kn-stage-item">
					<div class="kn-stage-head">
						<div>
							<span class="kn-pill kn-pill-blue">ترم <?php echo esc_html( $term['termNumber'] ); ?></span>
							<span class="kn-pill <?php echo $term['isFree'] ? 'kn-pill-green' : 'kn-pill-amber'; ?>">
								<?php echo $term['isFree'] ? 'رایگان (استارتر)' : 'پولی: ' . esc_html( $term['priceFormatted'] ); ?>
							</span>
							<?php if ( ! $term['isFree'] && ! empty( $term['wooProductId'] ) ) : ?>
								<span class="kn-pill kn-pill-blue">محصول ووکامرس #<?php echo esc_html( $term['wooProductId'] ); ?></span>
							<?php endif; ?>
							<strong style="font-size:16px;margin-right:6px;"><?php echo esc_html( $term['title'] ); ?></strong>
							<div style="font-size:12px;color:#7c5b43;margin-top:4px;">
								داستان: <strong><?php echo esc_html( $term['storyTitle'] ); ?></strong> · دنیا: <?php echo esc_html( self::$biomes[ $term['biome'] ] ?? $term['biome'] ); ?> · تعداد مراحل جاده: <?php echo esc_html( count( $term['stages'] ) ); ?>
							</div>
						</div>
						<div style="display:flex;gap:8px;flex-wrap:wrap;">
							<button type="button" class="kn-btn kn-btn-ghost" data-kn-toggle="kn-edit-term-<?php echo esc_attr( $term['dbId'] ); ?>">ویرایش ترم</button>
							<a class="kn-btn kn-btn-amber" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-stages&filter_term=' . $term['dbId'] ) ); ?>">مدیریت مراحل این جاده</a>
							<form method="post" style="display:inline;" onsubmit="return confirm('این ترم حذف شود؟');">
								<?php wp_nonce_field( 'kn_delete_term' ); ?>
								<input type="hidden" name="kn_action" value="delete_term" />
								<input type="hidden" name="term_id" value="<?php echo esc_attr( $term['dbId'] ); ?>" />
								<button type="submit" class="kn-btn kn-btn-danger">حذف</button>
							</form>
						</div>
					</div>

					<div id="kn-edit-term-<?php echo esc_attr( $term['dbId'] ); ?>" class="kn-collapsible">
						<form method="post">
							<?php wp_nonce_field( 'kn_save_term' ); ?>
							<input type="hidden" name="kn_action" value="save_term" />
							<input type="hidden" name="term_id" value="<?php echo esc_attr( $term['dbId'] ); ?>" />
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>عنوان ترم</label>
									<input type="text" name="title" value="<?php echo esc_attr( $term['title'] ); ?>" required />
								</div>
								<div class="kn-field">
									<label>شناسه (Slug)</label>
									<input type="text" name="slug" dir="ltr" value="<?php echo esc_attr( $term['id'] ); ?>" required />
								</div>
								<div class="kn-field">
									<label>ترتیب</label>
									<input type="number" name="term_number" value="<?php echo esc_attr( $term['termNumber'] ); ?>" min="1" />
								</div>
							</div>
							<div class="kn-grid-2">
								<div class="kn-field">
									<label>زیرعنوان</label>
									<input type="text" name="subtitle" value="<?php echo esc_attr( $term['subtitle'] ); ?>" />
								</div>
								<div class="kn-field">
									<label>عنوان داستان</label>
									<input type="text" name="story_title" value="<?php echo esc_attr( $term['storyTitle'] ); ?>" />
								</div>
							</div>
							<div class="kn-field">
								<label>متن داستان کودکانه</label>
								<textarea name="story_description" rows="2"><?php echo esc_textarea( $term['storyDescription'] ); ?></textarea>
							</div>
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>تم دنیای نقشه</label>
									<select name="biome">
										<?php foreach ( self::$biomes as $k => $lbl ) : ?>
											<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $term['biome'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
										<?php endforeach; ?>
									</select>
								</div>
								<div class="kn-field">
									<label>رنگ</label>
									<input type="color" name="accent_color" value="<?php echo esc_attr( $term['accentColor'] ); ?>" style="height:40px;" />
								</div>
								<div class="kn-field" style="padding-top:22px;">
									<label style="margin-left:14px;"><input type="checkbox" name="is_free" value="1" <?php checked( $term['isFree'] ); ?> /> رایگان</label>
									<label><input type="checkbox" name="is_active" value="1" <?php checked( $term['isActive'] ); ?> /> فعال</label>
								</div>
							</div>
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>قیمت پایه (تومان)</label>
									<input type="number" name="price_amount" value="<?php echo esc_attr( $term['priceAmount'] ); ?>" min="0" />
								</div>
								<div class="kn-field">
									<label>شناسه / محصول ووکامرس</label>
									<?php if ( $woo_active && ! empty( $woo_products ) ) : ?>
										<select name="woo_product_id">
											<option value="0">— بدون محصول متصل —</option>
											<?php foreach ( $woo_products as $wp_prod ) : ?>
												<option value="<?php echo esc_attr( $wp_prod['id'] ); ?>" <?php selected( (int) $term['wooProductId'], (int) $wp_prod['id'] ); ?>>
													#<?php echo esc_html( $wp_prod['id'] . ' — ' . $wp_prod['name'] . ' (' . $wp_prod['price'] . ')' ); ?>
												</option>
											<?php endforeach; ?>
										</select>
									<?php else : ?>
										<input type="number" name="woo_product_id" value="<?php echo esc_attr( $term['wooProductId'] ); ?>" min="0" />
									<?php endif; ?>
								</div>
								<div class="kn-field">
									<label>لینک پرداخت جایگزین (اختیاری)</label>
									<input type="text" name="checkout_url_override" dir="ltr" value="<?php echo esc_attr( $term['checkoutUrlOverride'] ?? '' ); ?>" />
								</div>
							</div>
							<button type="submit" class="kn-btn kn-btn-primary">ذخیره تغییرات ترم</button>
						</form>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}

	/**
	 * Page 3: Road & Stages Builder (Scoped by Term + Landmarks + Story Captions + Steps)
	 */
	public static function render_stages_page() {
		$terms       = KN_DB::get_terms_list( false );
		$filter_term = absint( $_GET['filter_term'] ?? 0 );
		$stages      = KN_DB::get_curriculum( false, $filter_term );
		?>
		<div class="kn-wrap">
			<?php self::render_header( 'مدیریت جاده یادگیری و مراحل', 'برای هر ترم، مراحل جاده، مکان داستانی نقشه (انبار، آسیاب، کلبه درختی، صندوقچه گنج و...) و گام‌های آموزشی را بسازید.' ); ?>

			<!-- Filter by Term -->
			<div class="kn-card" style="padding:14px 20px;">
				<form method="get" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
					<input type="hidden" name="page" value="kn-soroban-stages" />
					<strong>فیلتر مراحل بر اساس ترم:</strong>
					<select name="filter_term" onchange="this.form.submit()" style="min-width:260px;padding:6px 10px;border-radius:10px;border:2px solid #eedcc5;">
						<option value="0">همه ترم‌ها</option>
						<?php foreach ( $terms as $tm ) : ?>
							<option value="<?php echo esc_attr( $tm['id'] ); ?>" <?php selected( $filter_term, (int) $tm['id'] ); ?>>
								<?php echo esc_html( $tm['title'] ); ?>
							</option>
						<?php endforeach; ?>
					</select>
				</form>
			</div>

			<!-- Add New Stage Form -->
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>افزودن مرحله جدید به جاده یادگیری</h2>
					<button type="button" class="kn-btn kn-btn-primary" data-kn-toggle="kn-new-stage-form">+ مرحله جدید</button>
				</div>
				<div id="kn-new-stage-form" class="kn-collapsible <?php echo empty( $stages ) ? 'is-open' : ''; ?>">
					<form method="post">
						<?php wp_nonce_field( 'kn_save_stage' ); ?>
						<input type="hidden" name="kn_action" value="save_stage" />
						<div class="kn-grid-3">
							<div class="kn-field">
								<label>متعلق به ترم</label>
								<select name="term_id">
									<?php foreach ( $terms as $tm ) : ?>
										<option value="<?php echo esc_attr( $tm['id'] ); ?>" <?php selected( $filter_term, (int) $tm['id'] ); ?>>
											<?php echo esc_html( $tm['title'] ); ?>
										</option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>عنوان مرحله</label>
								<input type="text" name="title" required placeholder="مثلاً: کلبه درختی دوستان ۵" />
							</div>
							<div class="kn-field">
								<label>شناسه یکتا (انگلیسی / Slug)</label>
								<input type="text" name="slug" dir="ltr" placeholder="stage-10-custom" />
							</div>
						</div>

						<div class="kn-grid-2">
							<div class="kn-field">
								<label>توضیح کوتاه و هدف مرحله</label>
								<input type="text" name="short_goal" required placeholder="کودک در این مرحله چه مهارتی یاد می‌گیرد؟" />
							</div>
							<div class="kn-field">
								<label>متن داستانی روی نقشه</label>
								<input type="text" name="story_caption" placeholder="مثلاً: کنار آسیاب بادی گندم‌ها را بشماریم!" />
							</div>
						</div>

						<div class="kn-grid-3">
							<div class="kn-field">
								<label>مکان داستانی نقشه (Landmark)</label>
								<select name="landmark">
									<?php foreach ( self::$landmarks as $k => $lbl ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $lbl ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>شماره ترتیب روی جاده ترم</label>
								<input type="number" name="stage_number" value="<?php echo esc_attr( count( $stages ) + 1 ); ?>" min="1" />
							</div>
							<div class="kn-field">
								<label>مهارت مرتبط</label>
								<select name="skill">
									<?php foreach ( self::$skills as $k => $lbl ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $lbl ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
						</div>

						<div class="kn-grid-3">
							<div class="kn-field">
								<label>تعداد ستون چرتکه</label>
								<input type="number" name="columns_count" value="2" min="1" max="4" />
							</div>
							<div class="kn-field">
								<label>پیش‌نیاز بازشدن مرحله</label>
								<select name="unlock_requirement">
									<option value="">آزاد از ابتدا (بدون پیش‌نیاز)</option>
									<?php foreach ( $stages as $st ) : ?>
										<option value="<?php echo esc_attr( $st['id'] ); ?>">پس از: <?php echo esc_html( $st['title'] ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>آیکن و رنگ</label>
								<div style="display:flex;gap:6px;">
									<select name="icon_name">
										<?php foreach ( self::$icons as $k => $lbl ) : ?>
											<option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $lbl ); ?></option>
										<?php endforeach; ?>
									</select>
									<input type="color" name="accent_color" value="#5472EB" style="height:40px;width:64px;" />
								</div>
							</div>
						</div>

						<div class="kn-field">
							<label><input type="checkbox" name="is_active" value="1" checked /> فعال در جاده اپلیکیشن</label>
						</div>

						<button type="submit" class="kn-btn kn-btn-green">ذخیره مرحله جدید</button>
					</form>
				</div>
			</div>

			<!-- Existing Stages List + Inline Step Builders -->
			<?php foreach ( $stages as $stage ) : ?>
				<div class="kn-stage-item">
					<div class="kn-stage-head">
						<div>
							<span class="kn-pill kn-pill-amber"><?php echo esc_html( $stage['termTitle'] ?? 'ترم' ); ?></span>
							<span class="kn-pill kn-pill-blue">مرحله <?php echo esc_html( $stage['stageNumber'] ); ?></span>
							<span class="kn-pill <?php echo $stage['isActive'] ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
								<?php echo $stage['isActive'] ? 'فعال' : 'پیش‌نویس'; ?>
							</span>
							<strong style="font-size:15px;margin-right:6px;"><?php echo esc_html( $stage['title'] ); ?></strong>
							<div style="font-size:12px;color:#7c5b43;margin-top:4px;">
								مکان نقشه: <strong><?php echo esc_html( self::$landmarks[ $stage['landmark'] ?? 'barn' ] ?? 'انبار' ); ?></strong> · <?php echo esc_html( $stage['shortGoal'] ); ?> · گام‌ها: <?php echo esc_html( count( $stage['steps'] ) ); ?>
							</div>
						</div>
						<div style="display:flex;gap:8px;flex-wrap:wrap;">
							<button type="button" class="kn-btn kn-btn-ghost" data-kn-toggle="kn-edit-stage-<?php echo esc_attr( $stage['dbId'] ); ?>">ویرایش مرحله</button>
							<button type="button" class="kn-btn kn-btn-amber" data-kn-toggle="kn-add-step-<?php echo esc_attr( $stage['dbId'] ); ?>">+ افزودن گام</button>
							<form method="post" style="display:inline;" onsubmit="return confirm('آیا از حذف این مرحله و تمام گام‌هایش مطمئن هستید؟');">
								<?php wp_nonce_field( 'kn_delete_stage' ); ?>
								<input type="hidden" name="kn_action" value="delete_stage" />
								<input type="hidden" name="stage_id" value="<?php echo esc_attr( $stage['dbId'] ); ?>" />
								<button type="submit" class="kn-btn kn-btn-danger">حذف</button>
							</form>
						</div>
					</div>

					<!-- Edit Stage Form -->
					<div id="kn-edit-stage-<?php echo esc_attr( $stage['dbId'] ); ?>" class="kn-collapsible">
						<form method="post">
							<?php wp_nonce_field( 'kn_save_stage' ); ?>
							<input type="hidden" name="kn_action" value="save_stage" />
							<input type="hidden" name="stage_id" value="<?php echo esc_attr( $stage['dbId'] ); ?>" />
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>ترم مرتبط</label>
									<select name="term_id">
										<?php foreach ( $terms as $tm ) : ?>
											<option value="<?php echo esc_attr( $tm['id'] ); ?>" <?php selected( (int) ( $stage['termDbId'] ?? 0 ), (int) $tm['id'] ); ?>>
												<?php echo esc_html( $tm['title'] ); ?>
											</option>
										<?php endforeach; ?>
									</select>
								</div>
								<div class="kn-field">
									<label>عنوان مرحله</label>
									<input type="text" name="title" value="<?php echo esc_attr( $stage['title'] ); ?>" required />
								</div>
								<div class="kn-field">
									<label>شناسه (Slug)</label>
									<input type="text" name="slug" dir="ltr" value="<?php echo esc_attr( $stage['id'] ); ?>" required />
								</div>
							</div>
							<div class="kn-grid-2">
								<div class="kn-field">
									<label>هدف کوتاه</label>
									<input type="text" name="short_goal" value="<?php echo esc_attr( $stage['shortGoal'] ); ?>" required />
								</div>
								<div class="kn-field">
									<label>متن داستانی روی نقشه</label>
									<input type="text" name="story_caption" value="<?php echo esc_attr( $stage['storyCaption'] ?? '' ); ?>" />
								</div>
							</div>
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>مکان داستانی نقشه</label>
									<select name="landmark">
										<?php foreach ( self::$landmarks as $k => $lbl ) : ?>
											<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $stage['landmark'] ?? 'barn', $k ); ?>><?php echo esc_html( $lbl ); ?></option>
										<?php endforeach; ?>
									</select>
								</div>
								<div class="kn-field">
									<label>ترتیب در ترم</label>
									<input type="number" name="stage_number" value="<?php echo esc_attr( $stage['stageNumber'] ); ?>" min="1" />
								</div>
								<div class="kn-field">
									<label>مهارت</label>
									<select name="skill">
										<?php foreach ( self::$skills as $k => $lbl ) : ?>
											<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $stage['skill'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
										<?php endforeach; ?>
									</select>
								</div>
							</div>
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>ستون چرتکه</label>
									<input type="number" name="columns_count" value="<?php echo esc_attr( $stage['columns'] ); ?>" min="1" max="4" />
								</div>
								<div class="kn-field">
									<label>پیش‌نیاز</label>
									<select name="unlock_requirement">
										<option value="">آزاد از ابتدا</option>
										<?php foreach ( $stages as $other ) : ?>
											<?php if ( $other['id'] !== $stage['id'] ) : ?>
												<option value="<?php echo esc_attr( $other['id'] ); ?>" <?php selected( $stage['unlockRequirement'] ?? '', $other['id'] ); ?>>
													<?php echo esc_html( $other['title'] ); ?>
												</option>
											<?php endif; ?>
										<?php endforeach; ?>
									</select>
								</div>
								<div class="kn-field">
									<label>آیکن و رنگ</label>
									<div style="display:flex;gap:6px;">
										<select name="icon_name">
											<?php foreach ( self::$icons as $k => $lbl ) : ?>
												<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $stage['iconName'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
											<?php endforeach; ?>
										</select>
										<input type="color" name="accent_color" value="<?php echo esc_attr( $stage['accentColor'] ); ?>" style="height:40px;width:64px;" />
									</div>
								</div>
							</div>
							<div class="kn-field">
								<label><input type="checkbox" name="is_active" value="1" <?php checked( $stage['isActive'] ); ?> /> فعال در اپلیکیشن</label>
							</div>
							<button type="submit" class="kn-btn kn-btn-primary">ذخیره تغییرات مرحله</button>
						</form>
					</div>

					<!-- Add Step Form -->
					<div id="kn-add-step-<?php echo esc_attr( $stage['dbId'] ); ?>" class="kn-collapsible">
						<form method="post">
							<?php wp_nonce_field( 'kn_save_step' ); ?>
							<input type="hidden" name="kn_action" value="save_step" />
							<input type="hidden" name="stage_id" value="<?php echo esc_attr( $stage['dbId'] ); ?>" />
							<h3 style="margin-top:0;font-size:14px;">افزودن گام جدید به «<?php echo esc_html( $stage['title'] ); ?>»</h3>
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>عنوان گام</label>
									<input type="text" name="title" required placeholder="مثلاً: عدد ۱۴ را بساز" />
								</div>
								<div class="kn-field">
									<label>ترتیب گام</label>
									<input type="number" name="step_order" value="<?php echo esc_attr( count( $stage['steps'] ) + 1 ); ?>" min="1" />
								</div>
								<div class="kn-field">
									<label>تعداد ستون</label>
									<input type="number" name="columns_count" value="<?php echo esc_attr( $stage['columns'] ); ?>" min="1" max="4" />
								</div>
							</div>
							<div class="kn-grid-2">
								<div class="kn-field">
									<label>متن راهنمای متنی برای کودک</label>
									<textarea name="instruction" rows="2" required></textarea>
								</div>
								<div class="kn-field">
									<label>متن گفتاری گوینده خانم فارسی (TTS)</label>
									<textarea name="spoken_text" rows="2" required></textarea>
								</div>
							</div>
							<div class="kn-grid-3">
								<div class="kn-field">
									<label>مقدار اولیه چرتکه</label>
									<input type="number" name="initial_value" value="0" />
								</div>
								<div class="kn-field">
									<label>عدد هدف (جواب درست)</label>
									<input type="number" name="target_value" required />
								</div>
								<div class="kn-field">
									<label>هایلایت ستون (۰=یکان، ۱=دهگان، اختیاری)</label>
									<input type="number" name="highlight_column" min="0" max="3" />
								</div>
							</div>
							<label style="margin-left:14px;"><input type="checkbox" name="require_interaction" value="1" checked /> نیاز به حرکت مهره</label>
							<label><input type="checkbox" name="auto_demo_steps" value="1" checked /> فعال‌سازی انیمیشن حل کیا</label>
							<div style="margin-top:10px;">
								<button type="submit" class="kn-btn kn-btn-green">ثبت گام آموزشی</button>
							</div>
						</form>
					</div>

					<!-- Steps inside this Stage -->
					<div class="kn-steps-list">
						<div style="font-size:12px;font-weight:800;color:#5c3a1f;margin-bottom:8px;">گام‌های آموزشی این مرحله:</div>
						<?php if ( empty( $stage['steps'] ) ) : ?>
							<div style="font-size:12px;color:#8b623d;">هنوز گامی برای این مرحله ثبت نشده است. روی «+ افزودن گام» کلیک کنید.</div>
						<?php else : ?>
							<?php foreach ( $stage['steps'] as $s_idx => $step ) : ?>
								<div class="kn-step-row">
									<div>
										<strong><?php echo esc_html( ( $s_idx + 1 ) . '. ' . $step['title'] ); ?></strong>
										<span class="kn-pill kn-pill-amber">
											شروع: <?php echo esc_html( $step['initialValue'] ); ?> ← هدف: <?php echo esc_html( $step['targetValue'] ?? '—' ); ?>
										</span>
										<div style="font-size:12px;color:#6b4a35;margin-top:2px;"><?php echo esc_html( $step['instruction'] ); ?></div>
									</div>
									<div style="display:flex;gap:6px;">
										<button type="button" class="kn-btn kn-btn-ghost" data-kn-toggle="kn-edit-step-<?php echo esc_attr( $step['dbId'] ); ?>">ویرایش</button>
										<form method="post" style="display:inline;" onsubmit="return confirm('این گام حذف شود؟');">
											<?php wp_nonce_field( 'kn_delete_step' ); ?>
											<input type="hidden" name="kn_action" value="delete_step" />
											<input type="hidden" name="step_id" value="<?php echo esc_attr( $step['dbId'] ); ?>" />
											<button type="submit" class="kn-btn kn-btn-danger">حذف</button>
										</form>
									</div>
								</div>

								<div id="kn-edit-step-<?php echo esc_attr( $step['dbId'] ); ?>" class="kn-collapsible" style="margin-bottom:10px;background:#fffaf3;padding:12px;border-radius:12px;">
									<form method="post">
										<?php wp_nonce_field( 'kn_save_step' ); ?>
										<input type="hidden" name="kn_action" value="save_step" />
										<input type="hidden" name="step_id" value="<?php echo esc_attr( $step['dbId'] ); ?>" />
										<input type="hidden" name="stage_id" value="<?php echo esc_attr( $stage['dbId'] ); ?>" />
										<input type="hidden" name="step_slug" value="<?php echo esc_attr( $step['id'] ); ?>" />
										<div class="kn-grid-3">
											<div class="kn-field">
												<label>عنوان</label>
												<input type="text" name="title" value="<?php echo esc_attr( $step['title'] ); ?>" required />
											</div>
											<div class="kn-field">
												<label>ترتیب</label>
												<input type="number" name="step_order" value="<?php echo esc_attr( $s_idx + 1 ); ?>" min="1" />
											</div>
											<div class="kn-field">
												<label>ستون</label>
												<input type="number" name="columns_count" value="<?php echo esc_attr( $step['columns'] ); ?>" min="1" max="4" />
											</div>
										</div>
										<div class="kn-grid-2">
											<div class="kn-field">
												<label>متن راهنما</label>
												<textarea name="instruction" rows="2" required><?php echo esc_textarea( $step['instruction'] ); ?></textarea>
											</div>
											<div class="kn-field">
												<label>متن صوتی</label>
												<textarea name="spoken_text" rows="2" required><?php echo esc_textarea( $step['spokenText'] ); ?></textarea>
											</div>
										</div>
										<div class="kn-grid-3">
											<div class="kn-field">
												<label>مقدار شروع</label>
												<input type="number" name="initial_value" value="<?php echo esc_attr( $step['initialValue'] ); ?>" />
											</div>
											<div class="kn-field">
												<label>عدد هدف</label>
												<input type="number" name="target_value" value="<?php echo esc_attr( $step['targetValue'] ?? '' ); ?>" />
											</div>
											<div class="kn-field">
												<label>هایلایت ستون</label>
												<input type="number" name="highlight_column" value="<?php echo esc_attr( $step['highlightColumn'] ?? '' ); ?>" min="0" max="3" />
											</div>
										</div>
										<label style="margin-left:14px;"><input type="checkbox" name="require_interaction" value="1" <?php checked( $step['requireInteraction'] ); ?> /> تعامل الزامی</label>
										<label><input type="checkbox" name="auto_demo_steps" value="1" <?php checked( $step['autoDemoSteps'] ); ?> /> دمو انیمیشن</label>
										<div style="margin-top:8px;">
											<button type="submit" class="kn-btn kn-btn-primary">ذخیره تغییرات گام</button>
										</div>
									</form>
								</div>
							<?php endforeach; ?>
						<?php endif; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}

	/**
	 * Page 4: Dynamic Practice Question Bank
	 */
	public static function render_questions_page() {
		$terms        = KN_DB::get_terms_list( false );
		$filter_skill = sanitize_text_field( wp_unslash( $_GET['filter_skill'] ?? '' ) );
		$questions    = KN_DB::get_questions( $filter_skill, 0, false, 0 );
		?>
		<div class="kn-wrap">
			<?php self::render_header( 'بانک سوالات و تمرین‌های داینامیک', 'سوالات دلخواه خود را برای هر ترم، مهارت و سطح سختی بسازید.' ); ?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>افزودن سؤال تمرینی جدید</h2>
					<button type="button" class="kn-btn kn-btn-green" data-kn-toggle="kn-new-question">+ سؤال جدید</button>
				</div>

				<div id="kn-new-question" class="kn-collapsible is-open">
					<form method="post">
						<?php wp_nonce_field( 'kn_save_question' ); ?>
						<input type="hidden" name="kn_action" value="save_question" />
						<div class="kn-grid-3">
							<div class="kn-field">
								<label>متعلق به ترم (اختیاری)</label>
								<select name="term_id">
									<option value="0">عمومی (همه ترم‌ها)</option>
									<?php foreach ( $terms as $tm ) : ?>
										<option value="<?php echo esc_attr( $tm['id'] ); ?>"><?php echo esc_html( $tm['title'] ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>مهارت</label>
								<select name="skill">
									<?php foreach ( self::$skills as $k => $lbl ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $lbl ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>سطح سختی (۱ تا ۵) و ستون‌ها</label>
								<div style="display:flex;gap:6px;">
									<input type="number" name="difficulty" value="1" min="1" max="5" title="سطح سختی" />
									<input type="number" name="columns_count" value="2" min="1" max="4" title="تعداد ستون چرتکه" />
								</div>
							</div>
						</div>

						<div class="kn-grid-2">
							<div class="kn-field">
								<label>صورت سؤال نمایشی</label>
								<input type="text" name="prompt_text" required placeholder="مثلاً: ۴ + ۵ چند می‌شود؟" />
							</div>
							<div class="kn-field">
								<label>متن صوتی گوینده خانم</label>
								<input type="text" name="spoken_text" required placeholder="مثلاً: چهار به اضافه پنج چند می‌شود؟ روی چرتکه نشان بده." />
							</div>
						</div>

						<div class="kn-grid-3">
							<div class="kn-field">
								<label>مقدار شروع روی چرتکه</label>
								<input type="number" name="start_value" value="0" />
							</div>
							<div class="kn-field">
								<label>جواب درست (هدف)</label>
								<input type="number" name="target_value" value="9" required />
							</div>
							<div class="kn-field">
								<label>نوع نمایش بصری</label>
								<select name="visual_type">
									<option value="number">عددی</option>
									<option value="objects">تصویر اشیاء کودکانه</option>
									<option value="mental-flash">محاسبه ذهنی (فلش)</option>
								</select>
							</div>
						</div>

						<div class="kn-grid-3">
							<div class="kn-field">
								<label>تعداد شیء اول (اختیاری)</label>
								<input type="number" name="visual_count_a" min="0" max="15" />
							</div>
							<div class="kn-field">
								<label>تعداد شیء دوم (اختیاری)</label>
								<input type="number" name="visual_count_b" min="0" max="15" />
							</div>
							<div class="kn-field">
								<label>عملگر / شکل</label>
								<div style="display:flex;gap:6px;">
									<select name="operation">
										<option value="">بدون عملگر</option>
										<option value="+">جمع (+)</option>
										<option value="-">تفریق (-)</option>
									</select>
									<select name="visual_emoji">
										<option value="apple">سیب</option>
										<option value="star">ستاره</option>
										<option value="balloon">بادکنک</option>
										<option value="pencil">مداد</option>
									</select>
								</div>
							</div>
						</div>

						<label style="display:inline-block;margin-bottom:10px;"><input type="checkbox" name="is_active" value="1" checked /> سؤال فعال باشد</label>
						<div>
							<button type="submit" class="kn-btn kn-btn-primary">افزودن به بانک سوالات</button>
						</div>
					</form>
				</div>
			</div>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>لیست سوالات ثبت‌شده (<?php echo esc_html( count( $questions ) ); ?>)</h2>
					<form method="get" style="display:flex;gap:8px;align-items:center;">
						<input type="hidden" name="page" value="kn-soroban-questions" />
						<select name="filter_skill" onchange="this.form.submit()">
							<option value="">همه مهارت‌ها</option>
							<?php foreach ( self::$skills as $k => $lbl ) : ?>
								<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $filter_skill, $k ); ?>><?php echo esc_html( $lbl ); ?></option>
							<?php endforeach; ?>
						</select>
					</form>
				</div>

				<?php if ( empty( $questions ) ) : ?>
					<p>سوالی یافت نشد.</p>
				<?php else : ?>
					<table class="kn-table">
						<thead>
							<tr>
								<th>صورت سؤال</th>
								<th>مهارت</th>
								<th>سطح</th>
								<th>شروع ← هدف</th>
								<th>وضعیت</th>
								<th>عملیات</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $questions as $q ) : ?>
								<tr>
									<td>
										<strong><?php echo esc_html( $q['promptText'] ); ?></strong>
										<div style="font-size:11px;color:#7c5b43;"><?php echo esc_html( $q['spokenText'] ); ?></div>
									</td>
									<td><?php echo esc_html( self::$skills[ $q['skill'] ] ?? $q['skill'] ); ?></td>
									<td><span class="kn-pill kn-pill-blue">سطح <?php echo esc_html( $q['difficulty'] ); ?></span></td>
									<td><?php echo esc_html( $q['startValue'] ); ?> ← <strong><?php echo esc_html( $q['targetValue'] ); ?></strong></td>
									<td>
										<span class="kn-pill <?php echo $q['isActive'] ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
											<?php echo $q['isActive'] ? 'فعال' : 'غیرفعال'; ?>
										</span>
									</td>
									<td>
										<form method="post" style="display:inline;" onsubmit="return confirm('این سؤال حذف شود؟');">
											<?php wp_nonce_field( 'kn_delete_question' ); ?>
											<input type="hidden" name="kn_action" value="delete_question" />
											<input type="hidden" name="question_id" value="<?php echo esc_attr( $q['dbId'] ); ?>" />
											<button type="submit" class="kn-btn kn-btn-danger">حذف</button>
										</form>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Page 5: Users, Child Profiles, Scores & Paid Term Access Manager
	 */
	public static function render_users_page() {
		global $wpdb;
		$t_profiles = KN_DB::table_profiles();
		$rows       = $wpdb->get_results(
			"SELECT p.*, u.user_email, u.user_login, u.display_name FROM {$t_profiles} p LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID ORDER BY p.id DESC",
			ARRAY_A
		);
		$paid_terms = array_filter(
			KN_DB::get_terms_list( false ),
			function ( $t ) {
				return empty( $t['is_free'] );
			}
		);
		$wp_users   = get_users( array( 'number' => 100, 'orderby' => 'ID', 'order' => 'DESC' ) );
		?>
		<div class="kn-wrap">
			<?php self::render_header( 'مدیریت کاربران، دسترسی ترم‌ها و امتیازات', 'ایجاد کاربر جدید، اعطای دستی دسترسی به ترم‌های پولی، مشاهده پیشرفت کودکان و ویرایش ستاره‌ها.' ); ?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>ایجاد کاربر جدید + پروفایل کودک</h2>
					<button type="button" class="kn-btn kn-btn-green" data-kn-toggle="kn-new-user-box">+ ساخت کاربر جدید</button>
				</div>
				<div id="kn-new-user-box" class="kn-collapsible">
					<form method="post">
						<?php wp_nonce_field( 'kn_admin_create_user' ); ?>
						<input type="hidden" name="kn_action" value="admin_create_user" />
						<div class="kn-grid-3">
							<div class="kn-field">
								<label>ایمیل والد / کاربر</label>
								<input type="email" name="email" required dir="ltr" placeholder="parent@example.com" />
							</div>
							<div class="kn-field">
								<label>نام کاربری (اختیاری)</label>
								<input type="text" name="username" dir="ltr" placeholder="ali_parent" />
							</div>
							<div class="kn-field">
								<label>رمز عبور (حداقل ۶ کاراکتر)</label>
								<input type="password" name="password" required minlength="6" dir="ltr" />
							</div>
						</div>
						<div class="kn-grid-3">
							<div class="kn-field">
								<label>نام والد</label>
								<input type="text" name="display_name" placeholder="مثلاً آقای رضایی" />
							</div>
							<div class="kn-field">
								<label>نام کودک</label>
								<input type="text" name="child_name" required placeholder="مثلاً آرتین" />
							</div>
							<div class="kn-field">
								<label>سن و شخصیت کودک</label>
								<div style="display:flex;gap:6px;">
									<input type="number" name="child_age" value="6" min="4" max="12" style="width:90px;" />
									<select name="child_avatar">
										<?php foreach ( self::$avatars as $k => $lbl ) : ?>
											<option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $lbl ); ?></option>
										<?php endforeach; ?>
									</select>
								</div>
							</div>
						</div>
						<button type="submit" class="kn-btn kn-btn-primary">ایجاد حساب و پروفایل</button>
					</form>
				</div>
			</div>

			<?php if ( ! empty( $paid_terms ) ) : ?>
				<div class="kn-card">
					<div class="kn-card-header">
						<h2>کنترل دسترسی کاربران به ترم‌های پولی (تکمیل‌کننده ووکامرس)</h2>
					</div>
					<table class="kn-table">
						<thead>
							<tr>
								<th>کاربر / ایمیل</th>
								<th>وضعیت ترم‌های پولی</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $wp_users as $u ) : ?>
								<?php $ent_map = KN_DB::get_user_entitlement_map( $u->ID ); ?>
								<tr>
									<td>
										<strong><?php echo esc_html( $u->display_name ?: $u->user_login ); ?></strong>
										<div style="font-size:11px;color:#7c5b43;"><?php echo esc_html( $u->user_email ); ?></div>
									</td>
									<td>
										<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
											<?php foreach ( $paid_terms as $pt ) : ?>
												<?php
												$tid      = (int) $pt['id'];
												$unlocked = isset( $ent_map[ $tid ] );
												?>
												<form method="post" style="display:inline-flex;align-items:center;gap:4px;background:#fffaf3;padding:4px 8px;border-radius:10px;border:1px solid #eedcc5;">
													<?php wp_nonce_field( 'kn_admin_toggle_entitlement' ); ?>
													<input type="hidden" name="kn_action" value="admin_toggle_entitlement" />
													<input type="hidden" name="target_user_id" value="<?php echo esc_attr( $u->ID ); ?>" />
													<input type="hidden" name="term_id" value="<?php echo esc_attr( $tid ); ?>" />
													<input type="hidden" name="entitlement_mode" value="<?php echo $unlocked ? 'revoke' : 'grant'; ?>" />
													<span style="font-size:12px;font-weight:700;"><?php echo esc_html( $pt['title'] ); ?>:</span>
													<?php if ( $unlocked ) : ?>
														<span class="kn-pill kn-pill-green">فعال</span>
														<button type="submit" class="kn-btn kn-btn-danger" style="padding:3px 8px;font-size:11px;">لغو</button>
													<?php else : ?>
														<span class="kn-pill kn-pill-slate">قفل</span>
														<button type="submit" class="kn-btn kn-btn-green" style="padding:3px 8px;font-size:11px;">فعال‌سازی</button>
													<?php endif; ?>
												</form>
											<?php endforeach; ?>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>پروفایل کودکان و مدیریت امتیازات (<?php echo esc_html( count( $rows ) ); ?>)</h2>
				</div>
				<?php if ( empty( $rows ) ) : ?>
					<p>هنوز پروفایلی در وردپرس ذخیره نشده است.</p>
				<?php else : ?>
					<table class="kn-table">
						<thead>
							<tr>
								<th>نام کودک</th>
								<th>کاربر وردپرس</th>
								<th>سن</th>
								<th>ستاره‌ها</th>
								<th>دقیقه تمرین</th>
								<th>سطح سختی</th>
								<th>ویرایش امتیاز</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $rows as $r ) : ?>
								<tr>
									<form method="post">
										<?php wp_nonce_field( 'kn_admin_update_profile' ); ?>
										<input type="hidden" name="kn_action" value="admin_update_profile" />
										<input type="hidden" name="profile_db_id" value="<?php echo esc_attr( $r['id'] ); ?>" />
										<td>
											<input type="text" name="name" value="<?php echo esc_attr( $r['name'] ); ?>" style="width:120px;padding:4px 8px;border:1px solid #eedcc5;border-radius:8px;" />
										</td>
										<td>
											<strong><?php echo esc_html( $r['user_login'] ); ?></strong>
											<div style="font-size:11px;color:#7c5b43;"><?php echo esc_html( $r['user_email'] ); ?></div>
										</td>
										<td>
											<input type="number" name="age" value="<?php echo esc_attr( $r['age'] ); ?>" min="3" max="15" style="width:65px;padding:4px 6px;border:1px solid #eedcc5;border-radius:8px;" />
										</td>
										<td>
											<input type="number" name="total_stars" value="<?php echo esc_attr( $r['total_stars'] ); ?>" min="0" style="width:75px;padding:4px 6px;border:1px solid #eedcc5;border-radius:8px;" />
										</td>
										<td>
											<input type="number" name="practice_minutes" value="<?php echo esc_attr( $r['practice_minutes'] ); ?>" min="0" style="width:70px;padding:4px 6px;border:1px solid #eedcc5;border-radius:8px;" />
										</td>
										<td>
											<input type="number" name="difficulty_level" value="<?php echo esc_attr( $r['difficulty_level'] ); ?>" min="1" max="5" style="width:60px;padding:4px 6px;border:1px solid #eedcc5;border-radius:8px;" />
										</td>
										<td>
											<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
												<button type="submit" class="kn-btn kn-btn-primary" style="padding:6px 10px;font-size:12px;">ذخیره</button>
												<label style="font-size:11px;color:#b91c1c;">
													<input type="checkbox" name="reset_progress" value="1" /> ریست پیشرفت
												</label>
											</div>
										</td>
									</form>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Page 6: Headless & Default App Settings
	 */
	public static function render_settings_page() {
		$s = get_option( 'kn_soroban_settings', array() );
		?>
		<div class="kn-wrap">
			<?php self::render_header( 'تنظیمات هدلس وردپرس و اپلیکیشن', 'پیکربندی امنیت CORS، توکن احراز هویت، تعداد سوالات چالش روزانه و تنظیمات پیش‌فرض کودک.' ); ?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>پیکربندی سرور هدلس</h2>
				</div>
				<form method="post">
					<?php wp_nonce_field( 'kn_save_settings' ); ?>
					<input type="hidden" name="kn_action" value="save_settings" />

					<div class="kn-grid-2">
						<div class="kn-field">
							<label>نام اپلیکیشن</label>
							<input type="text" name="app_title" value="<?php echo esc_attr( $s['app_title'] ?? 'کودک نابغه' ); ?>" />
						</div>
						<div class="kn-field">
							<label>دامنه‌های مجاز فرانت‌اند (CORS Allowed Origins)</label>
							<input type="text" name="allowed_origins" dir="ltr" value="<?php echo esc_attr( $s['allowed_origins'] ?? '*' ); ?>" placeholder="* یا https://app.example.com" />
						</div>
					</div>

					<div class="kn-grid-3">
						<div class="kn-field">
							<label>مدت اعتبار توکن ورود (روز)</label>
							<input type="number" name="token_ttl_days" value="<?php echo esc_attr( $s['token_ttl_days'] ?? 30 ); ?>" min="1" max="90" />
						</div>
						<div class="kn-field">
							<label>تعداد سوالات چالش روزانه</label>
							<input type="number" name="daily_challenge_count" value="<?php echo esc_attr( $s['daily_challenge_count'] ?? 5 ); ?>" min="1" max="20" />
						</div>
						<div class="kn-field" style="padding-top:24px;">
							<label><input type="checkbox" name="allow_registration" value="1" <?php checked( ! empty( $s['allow_registration'] ) ); ?> /> اجازه ثبت‌نام کاربران جدید از اپلیکیشن</label>
						</div>
					</div>

					<hr style="border:none;border-top:2px solid #f5eadb;margin:16px 0;" />
					<h3 style="margin-top:0;font-size:14px;">تنظیمات پیش‌فرض برای کاربران جدید</h3>

					<div class="kn-grid-3">
						<div class="kn-field">
							<label>نوع نمایش ارقام</label>
							<select name="default_digit_mode">
								<option value="fa" <?php selected( $s['default_digit_mode'] ?? 'fa', 'fa' ); ?>>ارقام فارسی (۱۲۳)</option>
								<option value="en" <?php selected( $s['default_digit_mode'] ?? 'fa', 'en' ); ?>>ارقام انگلیسی (123)</option>
							</select>
						</div>
						<div class="kn-field">
							<label>اندازه پیش‌فرض چرتکه</label>
							<select name="default_abacus_scale">
								<option value="normal" <?php selected( $s['default_abacus_scale'] ?? 'normal', 'normal' ); ?>>معمولی</option>
								<option value="large" <?php selected( $s['default_abacus_scale'] ?? 'normal', 'large' ); ?>>بزرگ</option>
							</select>
						</div>
						<div class="kn-field" style="padding-top:20px;">
							<label style="display:block;margin-bottom:6px;"><input type="checkbox" name="default_sound_enabled" value="1" <?php checked( ! empty( $s['default_sound_enabled'] ) ); ?> /> افکت صوتی فعال</label>
							<label style="display:block;margin-bottom:6px;"><input type="checkbox" name="default_speech_enabled" value="1" <?php checked( ! empty( $s['default_speech_enabled'] ) ); ?> /> گوینده خانم فارسی فعال</label>
							<label style="display:block;margin-bottom:6px;"><input type="checkbox" name="default_night_mode" value="1" <?php checked( ! empty( $s['default_night_mode'] ) ); ?> /> حالت شب</label>
							<label style="display:block;"><input type="checkbox" name="default_prefer_2d" value="1" <?php checked( ! empty( $s['default_prefer_2d'] ) ); ?> /> چرتکه دوبعدی پیش‌فرض</label>
						</div>
					</div>

					<button type="submit" class="kn-btn kn-btn-green">ذخیره تنظیمات هدلس</button>
				</form>
			</div>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>بازگردانی داده‌های اولیه</h2>
				</div>
				<form method="post">
					<?php wp_nonce_field( 'kn_reseed_defaults' ); ?>
					<input type="hidden" name="kn_action" value="reseed_defaults" />
					<p style="font-size:13px;color:#5c3a1f;">در صورتی که جدول ترم‌ها، مراحل یا سوالات خالی شده باشد، با زدن این دکمه داده‌های نمونه اولیه ساخته می‌شوند.</p>
					<button type="submit" class="kn-btn kn-btn-amber">بررسی و ایجاد داده‌های اولیه</button>
				</form>
			</div>
		</div>
		<?php
	}
}
