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
			'گزارشات و تحلیل عملکرد',
			'گزارشات و تحلیل',
			'manage_options',
			'kn-soroban-analytics',
			array( 'KN_Admin_Analytics', 'render_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'بنرهای تبلیغاتی و دیالوگ‌های هوشمند',
			'بنرها و دیالوگ‌ها',
			'manage_options',
			'kn-soroban-marketing',
			array( 'KN_Admin_Marketing', 'render_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'مدیریت کامل سفارشات ووکامرس',
			'مدیریت سفارشات',
			'manage_options',
			'kn-soroban-orders',
			array( 'KN_Admin_Commerce', 'render_orders_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'مدیریت کامل محصولات ووکامرس',
			'مدیریت محصولات',
			'manage_options',
			'kn-soroban-products',
			array( 'KN_Admin_Commerce', 'render_products_page' )
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
			'کاربران، گزارشات فردی و دسترسی ترم‌ها',
			'کاربران و گزارشات فردی',
			'manage_options',
			'kn-soroban-users',
			array( __CLASS__, 'render_users_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'تنظیمات فروشگاه اپلیکیشن و فیش‌ها',
			'تنظیمات فروشگاه اپ',
			'manage_options',
			'kn-soroban-shop',
			array( __CLASS__, 'render_shop_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'تیکت‌ها و پشتیبانی',
			'تیکت‌ها و پشتیبانی',
			'manage_options',
			'kn-soroban-tickets',
			array( __CLASS__, 'render_tickets_page' )
		);

		add_submenu_page(
			'kn-soroban',
			'مدیریت صدا، افکت و گویندگی',
			'مدیریت صدا و گویندگی',
			'manage_options',
			'kn-soroban-audio',
			array( __CLASS__, 'render_audio_page' )
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
		wp_enqueue_media();
		wp_enqueue_style( 'kn-soroban-admin', KN_SOROBAN_URL . 'assets/admin.css', array(), KN_SOROBAN_VERSION );
		wp_enqueue_script( 'kn-soroban-jalali-picker', KN_SOROBAN_URL . 'assets/jalali-picker.js', array(), KN_SOROBAN_VERSION, true );
		wp_enqueue_script( 'kn-soroban-admin', KN_SOROBAN_URL . 'assets/admin.js', array( 'jquery', 'kn-soroban-jalali-picker' ), KN_SOROBAN_VERSION, true );
	}

	private static function sanitize_audio_url_input( $raw ) {
		$trimmed = trim( (string) $raw );
		if ( $trimmed === '' ) {
			return '';
		}
		// Allow site-relative /audio/... paths as well as full http(s) media URLs.
		if ( strpos( $trimmed, '/audio/' ) === 0 ) {
			return '/' . ltrim( sanitize_text_field( $trimmed ), '/' );
		}
		$parsed = wp_parse_url( $trimmed );
		if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
			return esc_url_raw( $trimmed );
		}
		return esc_url_raw( $trimmed );
	}

	private static function render_audio_picker_field( $name, $value, $input_id, $label = 'فایل صوتی اختصاصی (اختیاری - MP3 / OGG)', $placeholder = 'آدرس فایل صوتی یا از کتابخانه رسانه انتخاب کنید...' ) {
		$val = (string) $value;
		?>
		<div class="kn-field">
			<label for="<?php echo esc_attr( $input_id ); ?>"><?php echo esc_html( $label ); ?></label>
			<div class="kn-media-row">
				<input
					type="text"
					id="<?php echo esc_attr( $input_id ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					dir="ltr"
					data-kn-audio-input="1"
					value="<?php echo esc_attr( $val ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
				/>
				<button type="button" class="kn-btn kn-btn-amber" data-kn-media-target="<?php echo esc_attr( $input_id ); ?>">انتخاب / آپلود صوت</button>
				<button type="button" class="kn-btn kn-btn-ghost" data-kn-media-clear="<?php echo esc_attr( $input_id ); ?>">پاک کردن</button>
			</div>
			<audio
				class="kn-audio-preview"
				controls
				preload="none"
				data-kn-audio-preview="<?php echo esc_attr( $input_id ); ?>"
				<?php echo $val !== '' ? 'src="' . esc_url( $val ) . '"' : 'style="display:none;"'; ?>
			></audio>
		</div>
		<?php
	}

	private static function sanitize_image_url_input( $raw ) {
		$trimmed = trim( (string) $raw );
		if ( $trimmed === '' ) {
			return '';
		}
		$parsed = wp_parse_url( $trimmed );
		if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
			return esc_url_raw( $trimmed );
		}
		return '';
	}

	public static function render_image_picker_field_public( $name, $value, $input_id, $label = 'انتخاب تصویر', $placeholder = 'آدرس تصویر را وارد یا از کتابخانه رسانه انتخاب کنید...' ) {
		self::render_image_picker_field( $name, $value, $input_id, $label, $placeholder );
	}

	private static function render_image_picker_field( $name, $value, $input_id, $label = 'تصویر کاور ترم (اختیاری - JPG / PNG / WebP)', $placeholder = 'آدرس تصویر را وارد یا از کتابخانه رسانه انتخاب کنید...' ) {
		$val = (string) $value;
		?>
		<div class="kn-field">
			<label for="<?php echo esc_attr( $input_id ); ?>"><?php echo esc_html( $label ); ?></label>
			<div class="kn-media-row">
				<input
					type="text"
					id="<?php echo esc_attr( $input_id ); ?>"
					name="<?php echo esc_attr( $name ); ?>"
					dir="ltr"
					data-kn-image-input="1"
					value="<?php echo esc_attr( $val ); ?>"
					placeholder="<?php echo esc_attr( $placeholder ); ?>"
				/>
				<button type="button" class="kn-btn kn-btn-amber" data-kn-image-target="<?php echo esc_attr( $input_id ); ?>">انتخاب / آپلود تصویر</button>
				<button type="button" class="kn-btn kn-btn-ghost" data-kn-image-clear="<?php echo esc_attr( $input_id ); ?>">پاک کردن</button>
			</div>
			<img
				alt=""
				data-kn-image-preview="<?php echo esc_attr( $input_id ); ?>"
				<?php echo $val !== '' ? 'src="' . esc_url( $val ) . '"' : ''; ?>
				style="margin-top:8px;max-width:160px;max-height:110px;border-radius:12px;border:1px solid #cbd5e1;object-fit:cover;<?php echo $val !== '' ? 'display:block;' : 'display:none;'; ?>"
			/>
		</div>
		<?php
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
				'image_url'             => self::sanitize_image_url_input( wp_unslash( $_POST['image_url'] ?? '' ) ),
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
				'audio_url'          => self::sanitize_audio_url_input( wp_unslash( $_POST['audio_url'] ?? '' ) ),
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
				'audio_url'           => self::sanitize_audio_url_input( wp_unslash( $_POST['audio_url'] ?? '' ) ),
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
				'audio_url'      => self::sanitize_audio_url_input( wp_unslash( $_POST['audio_url'] ?? '' ) ),
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
					'mobile'      => sanitize_text_field( wp_unslash( $_POST['mobile'] ?? '' ) ),
					'email'       => sanitize_email( wp_unslash( $_POST['email'] ?? '' ) ),
					'username'    => sanitize_user( wp_unslash( $_POST['username'] ?? '' ), true ),
					'password'    => (string) ( $_POST['password'] ?? '' ),
					'firstName'   => sanitize_text_field( wp_unslash( $_POST['first_name'] ?? '' ) ),
					'lastName'    => sanitize_text_field( wp_unslash( $_POST['last_name'] ?? '' ) ),
					'displayName' => sanitize_text_field( wp_unslash( $_POST['display_name'] ?? '' ) ),
					'state'       => sanitize_text_field( wp_unslash( $_POST['state'] ?? '' ) ),
					'city'        => sanitize_text_field( wp_unslash( $_POST['city'] ?? '' ) ),
					'address1'    => sanitize_text_field( wp_unslash( $_POST['address1'] ?? '' ) ),
					'postcode'    => sanitize_text_field( wp_unslash( $_POST['postcode'] ?? '' ) ),
					'childName'   => sanitize_text_field( wp_unslash( $_POST['child_name'] ?? 'کیا' ) ),
					'childAge'    => absint( $_POST['child_age'] ?? 6 ),
					'childAvatar' => sanitize_key( wp_unslash( $_POST['child_avatar'] ?? 'owl' ) ),
				)
			);
			if ( is_wp_error( $result ) ) {
				self::redirect_with_notice( 'kn-soroban-users', $result->get_error_message(), true );
			}
			self::redirect_with_notice( 'kn-soroban-users', 'کاربر و پروفایل کودک با موفقیت ساخته شد!' );
		}

		// 8. Update Child Profile Scores/Stars/RewardPoints from Admin
		if ( $action === 'admin_update_profile' && check_admin_referer( 'kn_admin_update_profile' ) ) {
			$profile_db_id = absint( $_POST['profile_db_id'] ?? 0 );
			if ( $profile_db_id > 0 ) {
				$clean_name = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
				$update     = array(
					'name'             => trim( $clean_name ) !== '' ? $clean_name : 'کیا',
					'age'              => max( 3, min( 15, absint( $_POST['age'] ?? 6 ) ) ),
					'total_stars'      => max( 0, intval( $_POST['total_stars'] ?? 0 ) ),
					'reward_points'    => max( 0, intval( $_POST['reward_points'] ?? 0 ) ),
					'practice_minutes' => max( 0, intval( $_POST['practice_minutes'] ?? 0 ) ),
					'difficulty_level' => max( 1, min( 5, absint( $_POST['difficulty_level'] ?? 1 ) ) ),
				);
				if ( ! empty( $_POST['reset_progress'] ) ) {
					$update['total_stars']      = 0;
					$update['reward_points']    = 0;
					$update['total_correct']    = 0;
					$update['total_attempts']   = 0;
					$update['lessons_json']     = wp_json_encode( new stdClass() );
					$update['skills_json']      = wp_json_encode( KN_DB::default_skills_map() );
					$update['badges_json']      = wp_json_encode( array() );
					$update['daily_bonus_json'] = wp_json_encode(
						array(
							'streak'           => 0,
							'lastClaimDate'    => '',
							'totalDaysClaimed' => 0,
							'history'          => array(),
						)
					);
				}
				$wpdb->update( KN_DB::table_profiles(), $update, array( 'id' => $profile_db_id ) );
			}
			$ret_uid = absint( $_POST['return_user_id'] ?? 0 );
			if ( $ret_uid > 0 ) {
				self::redirect_with_notice( 'kn-soroban-users', 'امتیاز و مشخصات کودک ذخیره شد.', false, array( 'user_id' => $ret_uid ) );
			}
			self::redirect_with_notice( 'kn-soroban-users', 'امتیاز و مشخصات کودک ذخیره شد.' );
		}

		// 8B. Grant or Revoke Term Entitlement for a WP User
		if ( $action === 'admin_toggle_entitlement' && check_admin_referer( 'kn_admin_toggle_entitlement' ) ) {
			$target_uid = absint( $_POST['target_user_id'] ?? 0 );
			$term_db_id = absint( $_POST['term_id'] ?? 0 );
			$mode       = sanitize_key( wp_unslash( $_POST['entitlement_mode'] ?? 'grant' ) );
			$ret_uid    = absint( $_POST['return_user_id'] ?? 0 );
			$extra      = $ret_uid > 0 ? array( 'user_id' => $ret_uid ) : array();

			if ( $target_uid > 0 && $term_db_id > 0 ) {
				if ( $mode === 'revoke' ) {
					KN_DB::revoke_term_entitlement( $target_uid, $term_db_id );
					self::redirect_with_notice( 'kn-soroban-users', 'دسترسی کاربر به ترم لغو شد.', false, $extra );
				} else {
					KN_DB::grant_term_entitlement( $target_uid, $term_db_id, 'admin', 0 );
					self::redirect_with_notice( 'kn-soroban-users', 'ترم برای کاربر با موفقیت فعال شد!', false, $extra );
				}
			}
		}

		// 9. Save Headless Settings
		if ( $action === 'save_settings' && check_admin_referer( 'kn_save_settings' ) ) {
			$existing_settings = get_option( 'kn_soroban_settings', array() );
			$clear_api_key     = ! empty( $_POST['smsir_clear_api_key'] );
			$posted_api_key    = trim( sanitize_text_field( wp_unslash( $_POST['smsir_api_key'] ?? '' ) ) );
			$final_api_key     = $clear_api_key
				? ''
				: ( '' !== $posted_api_key ? $posted_api_key : (string) ( $existing_settings['smsir_api_key'] ?? '' ) );

			$param_name = sanitize_text_field( trim( wp_unslash( $_POST['smsir_param_name'] ?? 'Code' ) ) );
			if ( '' === $param_name ) {
				$param_name = 'Code';
			}

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
				'smsir_enabled'          => ! empty( $_POST['smsir_enabled'] ) ? 1 : 0,
				'smsir_api_key'          => $final_api_key,
				'smsir_template_id'      => absint( $_POST['smsir_template_id'] ?? 0 ),
				'smsir_param_name'       => $param_name,
			);
			update_option( 'kn_soroban_settings', $settings );
			self::redirect_with_notice( 'kn-soroban-settings', 'تنظیمات هدلس و پیامک با موفقیت ذخیره شد.' );
		}

		// 10. Reseed Defaults if empty
		if ( $action === 'reseed_defaults' && check_admin_referer( 'kn_reseed_defaults' ) ) {
			KN_DB::seed_defaults_if_empty();
			self::redirect_with_notice( 'kn-soroban-settings', 'داده‌های پیش‌فرض (در صورت خالی بودن) بازیابی شدند.' );
		}

		// 11. Save Storefront Settings
		if ( $action === 'save_store_settings' && check_admin_referer( 'kn_save_store_settings' ) ) {
			$sel_cats = isset( $_POST['selected_categories'] ) && is_array( $_POST['selected_categories'] )
				? array_values( array_filter( array_map( 'absint', wp_unslash( $_POST['selected_categories'] ) ) ) )
				: array();
			$sel_prods = isset( $_POST['selected_products'] ) && is_array( $_POST['selected_products'] )
				? array_values( array_filter( array_map( 'absint', wp_unslash( $_POST['selected_products'] ) ) ) )
				: array();
			$feat_prods = isset( $_POST['featured_products'] ) && is_array( $_POST['featured_products'] )
				? array_values( array_filter( array_map( 'absint', wp_unslash( $_POST['featured_products'] ) ) ) )
				: array();

			$store_settings = array(
				'enabled'             => ! empty( $_POST['enabled'] ) ? 1 : 0,
				'banner_title'        => sanitize_text_field( wp_unslash( $_POST['banner_title'] ?? 'فروشگاه کودک نابغه' ) ),
				'banner_subtitle'     => sanitize_text_field( wp_unslash( $_POST['banner_subtitle'] ?? '' ) ),
				'show_all_if_empty'   => ! empty( $_POST['show_all_if_empty'] ) ? 1 : 0,
				'selected_categories' => $sel_cats,
				'selected_products'   => $sel_prods,
				'featured_products'   => $feat_prods,
			);
			update_option( 'kn_soroban_store_settings', $store_settings );
			self::redirect_with_notice( 'kn-soroban-shop', 'تنظیمات فروشگاه اپلیکیشن با موفقیت ذخیره شد.' );
		}

		// 12. One-click Approve Pending Bank Transfer Order
		if ( $action === 'approve_bacs_order' && check_admin_referer( 'kn_approve_bacs_order' ) ) {
			$order_id    = absint( $_POST['order_id'] ?? 0 );
			$return_page = sanitize_key( wp_unslash( $_POST['return_page'] ?? 'kn-soroban-shop' ) );
			if ( ! in_array( $return_page, array( 'kn-soroban-shop', 'kn-soroban-orders' ), true ) ) {
				$return_page = 'kn-soroban-shop';
			}
			if ( $order_id > 0 && KN_Woo::is_woo_active() ) {
				$order = wc_get_order( $order_id );
				if ( $order ) {
					$order->update_status( 'completed', 'فیش بانکی توسط مدیر از پنل کودک نابغه تایید شد.' );
					KN_Woo::grant_access_from_order( $order_id );
					self::redirect_with_notice( $return_page, 'سفارش #' . $order->get_order_number() . ' تایید و دسترسی مربوطه فعال شد!' );
				}
			}
			self::redirect_with_notice( $return_page, 'سفارش یافت نشد.', true );
		}

		// 13. Admin Reply to Support Ticket
		if ( $action === 'admin_reply_ticket' && check_admin_referer( 'kn_admin_reply_ticket' ) ) {
			$ticket_id  = absint( $_POST['ticket_id'] ?? 0 );
			$reply_text = sanitize_textarea_field( wp_unslash( $_POST['reply_message'] ?? '' ) );
			$new_status = sanitize_key( wp_unslash( $_POST['ticket_status'] ?? 'answered' ) );
			if ( $ticket_id > 0 && ! empty( $reply_text ) ) {
				KN_DB::add_ticket_reply( $ticket_id, get_current_user_id(), true, $reply_text, '', $new_status );
				self::redirect_with_notice( 'kn-soroban-tickets', 'پاسخ شما در تیکت ثبت شد.' );
			} elseif ( $ticket_id > 0 && in_array( $new_status, array( 'open', 'answered', 'closed' ), true ) ) {
				KN_DB::update_ticket_status( $ticket_id, $new_status );
				self::redirect_with_notice( 'kn-soroban-tickets', 'وضعیت تیکت به‌روزرسانی شد.' );
			}
		}

		// 14. Save Hybrid Audio & Voiceover Library Settings
		if ( $action === 'save_audio_settings' && check_admin_referer( 'kn_save_audio_settings' ) ) {
			$sfx_keys = array( 'beadClick', 'uiTap', 'success', 'tryAgain', 'levelComplete', 'birdChirp' );
			$sfx_in   = isset( $_POST['sfx_urls'] ) && is_array( $_POST['sfx_urls'] ) ? wp_unslash( $_POST['sfx_urls'] ) : array();
			$sfx_out  = array();
			foreach ( $sfx_keys as $k ) {
				$clean_u = self::sanitize_audio_url_input( $sfx_in[ $k ] ?? '' );
				if ( $clean_u !== '' ) {
					$sfx_out[ $k ] = $clean_u;
				}
			}

			$bg_music_url = self::sanitize_audio_url_input( wp_unslash( $_POST['bg_music_url'] ?? '' ) );

			$v_keys    = isset( $_POST['voice_keys'] ) && is_array( $_POST['voice_keys'] ) ? wp_unslash( $_POST['voice_keys'] ) : array();
			$v_phrases = isset( $_POST['voice_phrases'] ) && is_array( $_POST['voice_phrases'] ) ? wp_unslash( $_POST['voice_phrases'] ) : array();
			$v_urls    = isset( $_POST['voice_urls'] ) && is_array( $_POST['voice_urls'] ) ? wp_unslash( $_POST['voice_urls'] ) : array();

			$clips_out = array();
			$max_len   = max( count( $v_keys ), count( $v_phrases ), count( $v_urls ) );
			for ( $i = 0; $i < $max_len; $i++ ) {
				$c_key    = sanitize_key( (string) ( $v_keys[ $i ] ?? '' ) );
				$c_phrase = sanitize_text_field( (string) ( $v_phrases[ $i ] ?? '' ) );
				$c_url    = self::sanitize_audio_url_input( $v_urls[ $i ] ?? '' );
				if ( $c_url !== '' && ( $c_key !== '' || $c_phrase !== '' ) ) {
					$clips_out[] = array(
						'key'    => $c_key,
						'phrase' => $c_phrase,
						'url'    => $c_url,
					);
				}
			}

			update_option(
				'kn_soroban_audio_settings',
				array(
					'sfx_urls'     => $sfx_out,
					'bg_music_url' => $bg_music_url,
					'voice_clips'  => $clips_out,
				)
			);
			self::redirect_with_notice( 'kn-soroban-audio', 'تنظیمات فایل‌های صوتی، موسیقی پس‌زمینه و کتابخانه گویندگی ذخیره شد.' );
		}

		// 15. Promotional Banners CRUD
		if ( $action === 'save_banner' && check_admin_referer( 'kn_save_banner' ) ) {
			$banner_id = absint( $_POST['banner_id'] ?? 0 );
			$saved_id  = KN_Marketing::save_banner( wp_unslash( $_POST ), $banner_id );
			if ( ! $saved_id ) {
				self::redirect_with_notice( 'kn-soroban-marketing', 'عنوان بنر الزامی است.', true, array( 'tab' => 'banners' ) );
			}
			self::redirect_with_notice( 'kn-soroban-marketing', 'بنر تبلیغاتی با موفقیت ذخیره شد.', false, array( 'tab' => 'banners' ) );
		}

		if ( $action === 'toggle_banner' && check_admin_referer( 'kn_toggle_banner' ) ) {
			$banner_id = absint( $_POST['banner_id'] ?? 0 );
			$b         = KN_Marketing::get_banner( $banner_id );
			if ( $b ) {
				$new_state = ! empty( $b['is_active'] ) ? 0 : 1;
				$wpdb->update( KN_DB::table_banners(), array( 'is_active' => $new_state ), array( 'id' => $banner_id ), array( '%d' ), array( '%d' ) );
			}
			self::redirect_with_notice( 'kn-soroban-marketing', 'وضعیت بنر به‌روزرسانی شد.', false, array( 'tab' => 'banners' ) );
		}

		if ( $action === 'delete_banner' && check_admin_referer( 'kn_delete_banner' ) ) {
			$banner_id = absint( $_POST['banner_id'] ?? 0 );
			KN_Marketing::delete_banner( $banner_id );
			self::redirect_with_notice( 'kn-soroban-marketing', 'بنر تبلیغاتی حذف شد.', false, array( 'tab' => 'banners' ) );
		}

		// 16. Advanced Scheduled Dialogs CRUD
		if ( $action === 'save_dialog' && check_admin_referer( 'kn_save_dialog' ) ) {
			$dialog_id = absint( $_POST['dialog_id'] ?? 0 );
			$saved_id  = KN_Marketing::save_dialog( wp_unslash( $_POST ), $dialog_id );
			if ( ! $saved_id ) {
				self::redirect_with_notice( 'kn-soroban-marketing', 'عنوان دیالوگ الزامی است.', true, array( 'tab' => 'dialogs' ) );
			}
			self::redirect_with_notice( 'kn-soroban-marketing', 'دیالوگ زمان‌بندی‌شده ذخیره شد.', false, array( 'tab' => 'dialogs' ) );
		}

		if ( $action === 'toggle_dialog' && check_admin_referer( 'kn_toggle_dialog' ) ) {
			$dialog_id = absint( $_POST['dialog_id'] ?? 0 );
			$d         = KN_Marketing::get_dialog( $dialog_id );
			if ( $d ) {
				$new_state = ! empty( $d['is_active'] ) ? 0 : 1;
				$wpdb->update( KN_DB::table_dialogs(), array( 'is_active' => $new_state ), array( 'id' => $dialog_id ), array( '%d' ), array( '%d' ) );
			}
			self::redirect_with_notice( 'kn-soroban-marketing', 'وضعیت دیالوگ به‌روزرسانی شد.', false, array( 'tab' => 'dialogs' ) );
		}

		if ( $action === 'delete_dialog' && check_admin_referer( 'kn_delete_dialog' ) ) {
			$dialog_id = absint( $_POST['dialog_id'] ?? 0 );
			KN_Marketing::delete_dialog( $dialog_id );
			self::redirect_with_notice( 'kn-soroban-marketing', 'دیالوگ حذف شد.', false, array( 'tab' => 'dialogs' ) );
		}

		// 17. WooCommerce Full Orders Management & CSV Export
		if ( $action === 'admin_update_order' && check_admin_referer( 'kn_admin_update_order' ) ) {
			$order_id = absint( $_POST['order_id'] ?? 0 );
			$res      = KN_Woo::admin_update_order( $order_id, wp_unslash( $_POST ) );
			if ( is_wp_error( $res ) ) {
				self::redirect_with_notice( 'kn-soroban-orders', $res->get_error_message(), true, array( 'order_id' => $order_id ) );
			}
			self::redirect_with_notice( 'kn-soroban-orders', 'سفارش با موفقیت به‌روزرسانی شد.', false, array( 'order_id' => $order_id ) );
		}

		if ( $action === 'admin_delete_order' && check_admin_referer( 'kn_admin_delete_order' ) ) {
			$order_id = absint( $_POST['order_id'] ?? 0 );
			KN_Woo::admin_delete_order( $order_id, false );
			self::redirect_with_notice( 'kn-soroban-orders', 'سفارش به زباله‌دان منتقل شد.' );
		}

		if ( $action === 'export_orders_csv' && check_admin_referer( 'kn_export_orders' ) ) {
			$from_g = ! empty( $_POST['from_jdate'] ) ? KN_Jalali::parse_jalali_to_date( sanitize_text_field( wp_unslash( $_POST['from_jdate'] ) ) ) : '';
			$to_g   = ! empty( $_POST['to_jdate'] ) ? KN_Jalali::parse_jalali_to_date( sanitize_text_field( wp_unslash( $_POST['to_jdate'] ) ) ) : '';
			$res    = KN_Woo::admin_get_orders(
				array(
					'status'    => sanitize_key( wp_unslash( $_POST['status'] ?? 'all' ) ),
					'search'    => sanitize_text_field( wp_unslash( $_POST['search'] ?? '' ) ),
					'from_date' => $from_g,
					'to_date'   => $to_g,
					'limit'     => 300,
				)
			);

			$csv_safe = function ( $v ) {
				$s = (string) $v;
				if ( preg_match( '/^[=+\-@\t\r]/', $s ) ) {
					return "'" . $s;
				}
				return $s;
			};

			header( 'Content-Type: text/csv; charset=utf-8' );
			header( 'Content-Disposition: attachment; filename="kn-orders-' . wp_date( 'Y-m-d' ) . '.csv"' );
			echo "\xEF\xBB\xBF";
			$out = fopen( 'php://output', 'w' );
			fputcsv( $out, array( 'شماره سفارش', 'خریدار', 'موبایل', 'شهر', 'اقلام', 'مبلغ', 'وضعیت', 'روش پرداخت', 'کد رهگیری', 'تاریخ شمسی' ) );
			foreach ( $res['orders'] as $ord ) {
				$items_txt = array();
				foreach ( $ord['items'] as $it ) {
					$items_txt[] = $it['name'] . ' × ' . $it['qty'];
				}
				fputcsv(
					$out,
					array(
						$csv_safe( '#' . $ord['orderNumber'] ),
						$csv_safe( $ord['customerName'] ),
						$csv_safe( $ord['customerPhone'] ),
						$csv_safe( $ord['city'] ?? '' ),
						$csv_safe( implode( ' | ', $items_txt ) ),
						$csv_safe( $ord['totalAmount'] ),
						$csv_safe( $ord['statusLabel'] ),
						$csv_safe( $ord['paymentMethodTitle'] ?: $ord['paymentMethod'] ),
						$csv_safe( $ord['trackingCode'] ?? '' ),
						$csv_safe( $ord['dateCreated'] ),
					)
				);
			}
			fclose( $out );
			exit;
		}

		// 18. WooCommerce Products CRUD
		if ( $action === 'admin_save_product' && check_admin_referer( 'kn_admin_save_product' ) ) {
			$saved = KN_Woo::admin_save_product( wp_unslash( $_POST ) );
			if ( is_wp_error( $saved ) ) {
				self::redirect_with_notice( 'kn-soroban-products', $saved->get_error_message(), true );
			}
			self::redirect_with_notice( 'kn-soroban-products', 'محصول با موفقیت در ووکامرس ذخیره شد!' );
		}

		if ( $action === 'admin_duplicate_product' && check_admin_referer( 'kn_admin_duplicate_product' ) ) {
			$pid = absint( $_POST['product_id'] ?? 0 );
			KN_Woo::admin_duplicate_product( $pid );
			self::redirect_with_notice( 'kn-soroban-products', 'نسخه کپی (پیش‌نویس) از محصول ایجاد شد.' );
		}

		if ( $action === 'admin_delete_product' && check_admin_referer( 'kn_admin_delete_product' ) ) {
			$pid = absint( $_POST['product_id'] ?? 0 );
			KN_Woo::admin_delete_product( $pid, false );
			self::redirect_with_notice( 'kn-soroban-products', 'محصول به زباله‌دان منتقل شد.' );
		}

		// 19. Users CRM Account Update & Session Token Revocation
		if ( $action === 'admin_update_user' && check_admin_referer( 'kn_admin_update_user' ) ) {
			$uid = absint( $_POST['target_user_id'] ?? 0 );
			$res = KN_Auth::admin_update_user_account( $uid, wp_unslash( $_POST ) );
			if ( is_wp_error( $res ) ) {
				self::redirect_with_notice( 'kn-soroban-users', $res->get_error_message(), true, array( 'user_id' => $uid ) );
			}
			self::redirect_with_notice( 'kn-soroban-users', 'اطلاعات کاربر با موفقیت ذخیره شد.', false, array( 'user_id' => $uid ) );
		}

		if ( $action === 'admin_revoke_token' && check_admin_referer( 'kn_admin_revoke_token' ) ) {
			$uid = absint( $_POST['target_user_id'] ?? 0 );
			$tid = absint( $_POST['token_id'] ?? 0 );
			KN_Auth::revoke_token_by_id( $uid, $tid );
			self::redirect_with_notice( 'kn-soroban-users', 'نشست انتخاب‌شده لغو شد.', false, array( 'user_id' => $uid ) );
		}

		if ( $action === 'admin_revoke_all_tokens' && check_admin_referer( 'kn_admin_revoke_all_tokens' ) ) {
			$uid = absint( $_POST['target_user_id'] ?? 0 );
			KN_Auth::revoke_all_user_tokens( $uid );
			self::redirect_with_notice( 'kn-soroban-users', 'همه نشست‌های فعال کاربر با موفقیت لغو شدند.', false, array( 'user_id' => $uid ) );
		}
	}

	private static function redirect_with_notice( $page_slug, $message, $is_error = false, $extra_args = array() ) {
		$args = array(
			'page'      => $page_slug,
			'kn_notice' => rawurlencode( $message ),
			'kn_err'    => $is_error ? '1' : '0',
		);
		if ( is_array( $extra_args ) && ! empty( $extra_args ) ) {
			foreach ( $extra_args as $ek => $ev ) {
				$args[ sanitize_key( $ek ) ] = $ev;
			}
		}
		$url = add_query_arg( $args, admin_url( 'admin.php' ) );
		wp_safe_redirect( $url );
		exit;
	}

	public static function render_shell_open( $active_page, $title, $subtitle ) {
		$groups = array(
			'داشبورد و تحلیل' => array(
				'kn-soroban'           => array( 'label' => 'داشبورد کلی', 'icon' => 'dashicons-dashboard' ),
				'kn-soroban-analytics' => array( 'label' => 'گزارشات و تحلیل', 'icon' => 'dashicons-chart-bar' ),
				'kn-soroban-marketing' => array( 'label' => 'بنرها و دیالوگ‌ها', 'icon' => 'dashicons-megaphone' ),
			),
			'فروشگاه و ووکامرس' => array(
				'kn-soroban-orders'   => array( 'label' => 'مدیریت سفارشات', 'icon' => 'dashicons-cart' ),
				'kn-soroban-products' => array( 'label' => 'مدیریت محصولات', 'icon' => 'dashicons-products' ),
				'kn-soroban-shop'     => array( 'label' => 'تنظیمات فروشگاه اپ', 'icon' => 'dashicons-store' ),
			),
			'آموزش و محتوا' => array(
				'kn-soroban-terms'     => array( 'label' => 'ترم‌ها و ووکامرس', 'icon' => 'dashicons-welcome-learn-more' ),
				'kn-soroban-stages'    => array( 'label' => 'جاده و مراحل', 'icon' => 'dashicons-location-alt' ),
				'kn-soroban-questions' => array( 'label' => 'بانک سوالات', 'icon' => 'dashicons-editor-help' ),
				'kn-soroban-audio'     => array( 'label' => 'مدیریت صدا و گویندگی', 'icon' => 'dashicons-format-audio' ),
			),
			'کاربران و سیستم' => array(
				'kn-soroban-users'    => array( 'label' => 'کاربران و گزارشات فردی', 'icon' => 'dashicons-groups' ),
				'kn-soroban-tickets'  => array( 'label' => 'تیکت‌ها و پشتیبانی', 'icon' => 'dashicons-sos' ),
				'kn-soroban-settings' => array( 'label' => 'تنظیمات هدلس و پیامک', 'icon' => 'dashicons-admin-generic' ),
			),
		);
		?>
		<div class="kn-shell">
			<aside class="kn-sidebar" aria-label="منوی مدیریت کودک نابغه">
				<div class="kn-brand-box">
					<div class="kn-brand-mark">ک</div>
					<div>
						<div class="kn-brand-title">کودک نابغه</div>
						<div class="kn-brand-sub">نسخه <?php echo esc_html( KN_Jalali::to_persian_digits( KN_SOROBAN_VERSION ) ); ?> · <?php echo esc_html( KN_Jalali::format_date_only( time(), true ) ); ?></div>
					</div>
				</div>
				<?php foreach ( $groups as $g_title => $items ) : ?>
					<div class="kn-nav-group"><?php echo esc_html( $g_title ); ?></div>
					<nav class="kn-nav-list">
						<?php foreach ( $items as $slug => $meta ) : ?>
							<a class="kn-nav-link <?php echo $active_page === $slug ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=' . $slug ) ); ?>">
								<span style="display:inline-flex;align-items:center;gap:7px;">
									<span class="dashicons <?php echo esc_attr( $meta['icon'] ); ?>"></span>
									<?php echo esc_html( $meta['label'] ); ?>
								</span>
							</a>
						<?php endforeach; ?>
					</nav>
				<?php endforeach; ?>
			</aside>
			<div class="kn-main">
				<div class="kn-wrap">
					<?php self::render_header( $title, $subtitle ); ?>
		<?php
	}

	public static function render_shell_close() {
		?>
				</div>
			</div>
		</div>
		<?php
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
				<span style="font-size:11.5px;font-weight:700;color:#475569;">آدرس اتصال:</span>
				<code><?php echo esc_html( $site_url ); ?></code>
				<button type="button" class="kn-btn kn-btn-amber kn-btn-sm" data-kn-copy="<?php echo esc_attr( $site_url ); ?>">کپی آدرس</button>
				<button type="button" class="kn-btn kn-btn-ghost kn-btn-sm" data-kn-copy="<?php echo esc_attr( $api_base ); ?>">کپی API</button>
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

		$from_7d = gmdate( 'Y-m-d', current_time( 'timestamp' ) - ( 6 * DAY_IN_SECONDS ) );
		$to_7d   = current_time( 'Y-m-d' );
		$rep_7d  = KN_Marketing::get_analytics_report( $from_7d, $to_7d );
		$visits  = $rep_7d['visits'];
		$comm    = $rep_7d['commerce'];

		$top_learners = $wpdb->get_results(
			"SELECT p.*, u.user_email, u.user_login FROM {$t_profiles} p LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID ORDER BY p.total_stars DESC, p.total_correct DESC LIMIT 10",
			ARRAY_A
		);

		self::render_shell_open(
			'kn-soroban',
			'داشبورد مدیریت «کودک نابغه»',
			'نمای یکپارچه وضعیت آموزش، بازدید وب‌اپ و اپلیکیشن موبایل، فروش ووکامرس و جدول قهرمانان'
		);
		?>

		<div class="kn-kpi-grid">
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-blue">🌐</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['web_total'] ) ) ); ?></div>
					<div class="kn-kpi-label">بازدید وب‌اپ (۷ روز اخیر)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-green">📱</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['mobile_total'] ) ) ); ?></div>
					<div class="kn-kpi-label">بازدید اپ موبایل (۷ روز اخیر)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-amber">💰</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $comm['total_revenue'] ) ) ); ?></div>
					<div class="kn-kpi-label">فروش ووکامرس (۷ روز · <?php echo esc_html( KN_Jalali::to_persian_digits( $comm['completed_orders'] ) ); ?> سفارش)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-violet">📚</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( $terms_count ) ); ?> / <?php echo esc_html( KN_Jalali::to_persian_digits( $stages_count ) ); ?></div>
					<div class="kn-kpi-label">ترم‌ها / مراحل (<?php echo esc_html( KN_Jalali::to_persian_digits( $questions_count ) ); ?> سؤال)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-pink">👧</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $profiles_count ) ) ); ?></div>
					<div class="kn-kpi-label">کودکان (<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $total_stars ) ) ); ?> ⭐)</div>
				</div>
			</div>
		</div>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>روند بازدید ۷ روز اخیر (وب‌اپ در برابر اپلیکیشن موبایل)</h2>
				<div style="display:flex;gap:12px;align-items:center;">
					<div class="kn-chart-legend">
						<span><i class="kn-legend-dot" style="background:#2563eb;"></i>وب‌اپ</span>
						<span><i class="kn-legend-dot" style="background:#059669;"></i>موبایل APK</span>
					</div>
					<a class="kn-btn kn-btn-primary kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-analytics' ) ); ?>">گزارش جامع تحلیلی</a>
				</div>
			</div>
			<?php KN_Admin_Analytics::render_dual_bar_svg_chart( $rep_7d['dailySeries'] ); ?>
		</div>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>دسترسی سریع بخش‌های مدیریتی</h2>
				<span class="kn-pill <?php echo $woo_active ? 'kn-pill-green' : 'kn-pill-amber'; ?>">
					<?php echo $woo_active ? 'ووکامرس متصل (' . KN_Jalali::to_persian_digits( $ent_count ) . ' دسترسی فعال)' : 'ووکامرس غیرفعال'; ?>
				</span>
			</div>
			<div style="display:flex;gap:8px;flex-wrap:wrap;">
				<a class="kn-btn kn-btn-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-analytics' ) ); ?>">گزارشات و تحلیل</a>
				<a class="kn-btn kn-btn-green" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing' ) ); ?>">بنرها و دیالوگ‌های هوشمند</a>
				<a class="kn-btn kn-btn-amber" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-orders' ) ); ?>">مدیریت سفارشات</a>
				<a class="kn-btn kn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-products' ) ); ?>">مدیریت محصولات</a>
				<a class="kn-btn kn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users' ) ); ?>">کاربران و گزارشات فردی</a>
				<a class="kn-btn kn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-terms' ) ); ?>">ترم‌ها و ووکامرس</a>
				<a class="kn-btn kn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-stages' ) ); ?>">جاده و مراحل</a>
			</div>
		</div>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>برترین قهرمانان چرتکه (جدول امتیازات)</h2>
			</div>
			<?php if ( empty( $top_learners ) ) : ?>
				<p>هنوز کودکی ثبت نشده است. از بخش «کاربران و گزارشات فردی» یا اپلیکیشن ثبت‌نام کنید.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
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
									<td>
										<a href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users&user_id=' . $row['user_id'] ) ); ?>" style="text-decoration:none;color:var(--kn-primary);font-weight:700;">
											<?php echo esc_html( $row['user_email'] ?: $row['user_login'] ); ?>
										</a>
									</td>
									<td><?php echo esc_html( KN_Jalali::to_persian_digits( $row['age'] ) ); ?> سال</td>
									<td><span class="kn-pill kn-pill-amber">⭐ <?php echo esc_html( KN_Jalali::to_persian_digits( $row['total_stars'] ) ); ?></span></td>
									<td><span class="kn-pill kn-pill-green"><?php echo esc_html( KN_Jalali::to_persian_digits( $acc ) ); ?>٪</span></td>
									<td><?php echo esc_html( KN_Jalali::to_persian_digits( $row['practice_minutes'] ) ); ?> دقیقه</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 2: Terms & WooCommerce Product Connection Manager
	 */
	public static function render_terms_page() {
		$terms        = KN_DB::get_terms_curriculum( false, 0 );
		$woo_active   = KN_Woo::is_woo_active();
		$woo_products = $woo_active ? KN_Woo::get_admin_products_list() : array();
		self::render_shell_open(
			'kn-soroban-terms',
			'مدیریت ترم‌های داستانی و فروش با ووکامرس',
			'هر ترم یک نقشه ماجراجویی و داستان اختصاصی دارد. ترم اول رایگان است و ترم‌های بعدی را می‌توانید به محصولات ووکامرس متصل کنید.'
		);
		?>

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

						<?php self::render_image_picker_field( 'image_url', '', 'kn-new-term-image', 'تصویر کاور ترم (نمایش در نقشه ترم‌ها و صفحه خرید)' ); ?>

						<button type="submit" class="kn-btn kn-btn-green">ایجاد ترم جدید</button>
					</form>
				</div>
			</div>

			<?php foreach ( $terms as $term ) : ?>
				<div class="kn-stage-item">
					<div class="kn-stage-head">
						<div style="display:flex;align-items:center;gap:12px;">
							<?php if ( ! empty( $term['imageUrl'] ) ) : ?>
								<img src="<?php echo esc_url( $term['imageUrl'] ); ?>" alt="" style="width:52px;height:52px;border-radius:12px;object-fit:cover;border:2px solid #eedcc5;flex-shrink:0;" />
							<?php endif; ?>
							<div>
								<span class="kn-pill kn-pill-blue">ترم <?php echo esc_html( $term['termNumber'] ); ?></span>
								<span class="kn-pill <?php echo $term['isFree'] ? 'kn-pill-green' : 'kn-pill-amber'; ?>">
									<?php echo $term['isFree'] ? 'رایگان (استارتر)' : 'پولی: ' . esc_html( $term['priceFormatted'] ); ?>
								</span>
								<?php if ( ! $term['isFree'] && ! empty( $term['onSale'] ) ) : ?>
									<span class="kn-pill kn-pill-green">تخفیف ویژه <?php echo esc_html( $term['discountPercent'] ); ?>٪ (اصلی: <?php echo esc_html( $term['regularPriceFormatted'] ); ?>)</span>
								<?php endif; ?>
								<?php if ( ! $term['isFree'] && ! empty( $term['wooProductId'] ) ) : ?>
									<span class="kn-pill kn-pill-blue">محصول ووکامرس #<?php echo esc_html( $term['wooProductId'] ); ?></span>
								<?php endif; ?>
								<strong style="font-size:16px;margin-right:6px;"><?php echo esc_html( $term['title'] ); ?></strong>
								<div style="font-size:12px;color:#7c5b43;margin-top:4px;">
									داستان: <strong><?php echo esc_html( $term['storyTitle'] ); ?></strong> · دنیا: <?php echo esc_html( self::$biomes[ $term['biome'] ] ?? $term['biome'] ); ?> · تعداد مراحل جاده: <?php echo esc_html( count( $term['stages'] ) ); ?>
								</div>
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
							<?php self::render_image_picker_field( 'image_url', $term['imageUrl'] ?? '', 'kn-term-image-' . $term['dbId'], 'تصویر کاور ترم (نمایش در نقشه ترم‌ها و صفحه خرید)' ); ?>
							<button type="submit" class="kn-btn kn-btn-primary">ذخیره تغییرات ترم</button>
						</form>
					</div>
				</div>
			<?php endforeach; ?>
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 3: Road & Stages Builder (Scoped by Term + Landmarks + Story Captions + Steps)
	 */
	public static function render_stages_page() {
		$terms       = KN_DB::get_terms_list( false );
		$filter_term = absint( $_GET['filter_term'] ?? 0 );
		$stages      = KN_DB::get_curriculum( false, $filter_term );
		self::render_shell_open(
			'kn-soroban-stages',
			'مدیریت جاده یادگیری و مراحل',
			'برای هر ترم، مراحل جاده، مکان داستانی نقشه (انبار، آسیاب، کلبه درختی، صندوقچه گنج و...) و گام‌های آموزشی را بسازید.'
		);
		?>

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

						<?php self::render_audio_picker_field( 'audio_url', '', 'kn-stage-audio-new', 'فایل صوتی معرفی مرحله (اختیاری - MP3 / OGG)', 'https://yoursite.com/wp-content/uploads/.../stage-intro.mp3' ); ?>

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
							<?php if ( ! empty( $stage['audioUrl'] ) ) : ?>
								<span class="kn-audio-badge">🔊 صوت مرحله</span>
							<?php endif; ?>
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
							<?php self::render_audio_picker_field( 'audio_url', $stage['audioUrl'] ?? '', 'kn-stage-audio-' . $stage['dbId'], 'فایل صوتی معرفی مرحله (اختیاری - MP3 / OGG)' ); ?>
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
							<?php self::render_audio_picker_field( 'audio_url', '', 'kn-add-step-audio-' . $stage['dbId'], 'فایل صوتی اختصاصی این گام (اختیاری - MP3 / OGG)' ); ?>
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
										<?php if ( ! empty( $step['audioUrl'] ) ) : ?>
											<span class="kn-audio-badge">🔊 صوت اختصاصی</span>
										<?php endif; ?>
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
										<?php self::render_audio_picker_field( 'audio_url', $step['audioUrl'] ?? '', 'kn-edit-step-audio-' . $step['dbId'], 'فایل صوتی اختصاصی این گام (اختیاری - MP3 / OGG)' ); ?>
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
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 4: Dynamic Practice Question Bank
	 */
	public static function render_questions_page() {
		$terms        = KN_DB::get_terms_list( false );
		$filter_skill = sanitize_text_field( wp_unslash( $_GET['filter_skill'] ?? '' ) );
		$questions    = KN_DB::get_questions( $filter_skill, 0, false, 0 );
		self::render_shell_open(
			'kn-soroban-questions',
			'بانک سوالات و تمرین‌های داینامیک',
			'سوالات دلخواه خود را برای هر ترم، مهارت و سطح سختی بسازید.'
		);
		?>

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

						<?php self::render_audio_picker_field( 'audio_url', '', 'kn-question-audio-new', 'فایل صوتی اختصاصی سؤال (اختیاری - MP3 / OGG)' ); ?>

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
										<?php if ( ! empty( $q['audioUrl'] ) ) : ?>
											<span class="kn-audio-badge">🔊 صوت اختصاصی</span>
										<?php endif; ?>
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
										<div style="display:flex;gap:6px;flex-wrap:wrap;">
											<button type="button" class="kn-btn kn-btn-ghost" style="padding:5px 10px;font-size:12px;" data-kn-toggle="kn-edit-q-<?php echo esc_attr( $q['dbId'] ); ?>">ویرایش</button>
											<form method="post" style="display:inline;" onsubmit="return confirm('این سؤال حذف شود؟');">
												<?php wp_nonce_field( 'kn_delete_question' ); ?>
												<input type="hidden" name="kn_action" value="delete_question" />
												<input type="hidden" name="question_id" value="<?php echo esc_attr( $q['dbId'] ); ?>" />
												<button type="submit" class="kn-btn kn-btn-danger" style="padding:5px 10px;font-size:12px;">حذف</button>
											</form>
										</div>
									</td>
								</tr>
								<tr>
									<td colspan="6" style="padding:0;border-bottom:none;">
										<div id="kn-edit-q-<?php echo esc_attr( $q['dbId'] ); ?>" class="kn-collapsible" style="margin:0 0 10px;padding:14px;background:#fffaf3;border:1px solid #eedcc5;border-radius:12px;">
											<form method="post">
												<?php wp_nonce_field( 'kn_save_question' ); ?>
												<input type="hidden" name="kn_action" value="save_question" />
												<input type="hidden" name="question_id" value="<?php echo esc_attr( $q['dbId'] ); ?>" />
												<div class="kn-grid-3">
													<div class="kn-field">
														<label>متعلق به ترم</label>
														<select name="term_id">
															<option value="0">عمومی (همه ترم‌ها)</option>
															<?php foreach ( $terms as $tm ) : ?>
																<option value="<?php echo esc_attr( $tm['id'] ); ?>" <?php selected( (int) ( $q['termDbId'] ?? 0 ), (int) $tm['id'] ); ?>>
																	<?php echo esc_html( $tm['title'] ); ?>
																</option>
															<?php endforeach; ?>
														</select>
													</div>
													<div class="kn-field">
														<label>مهارت</label>
														<select name="skill">
															<?php foreach ( self::$skills as $k => $lbl ) : ?>
																<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $q['skill'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
															<?php endforeach; ?>
														</select>
													</div>
													<div class="kn-field">
														<label>سختی (۱-۵) / ستون (۱-۴)</label>
														<div style="display:flex;gap:6px;">
															<input type="number" name="difficulty" value="<?php echo esc_attr( $q['difficulty'] ); ?>" min="1" max="5" />
															<input type="number" name="columns_count" value="<?php echo esc_attr( $q['columns'] ); ?>" min="1" max="4" />
														</div>
													</div>
												</div>
												<div class="kn-grid-2">
													<div class="kn-field">
														<label>صورت سؤال نمایشی</label>
														<input type="text" name="prompt_text" value="<?php echo esc_attr( $q['promptText'] ); ?>" required />
													</div>
													<div class="kn-field">
														<label>متن صوتی گوینده</label>
														<input type="text" name="spoken_text" value="<?php echo esc_attr( $q['spokenText'] ); ?>" required />
													</div>
												</div>
												<div class="kn-grid-3">
													<div class="kn-field">
														<label>مقدار شروع</label>
														<input type="number" name="start_value" value="<?php echo esc_attr( $q['startValue'] ); ?>" />
													</div>
													<div class="kn-field">
														<label>جواب درست (هدف)</label>
														<input type="number" name="target_value" value="<?php echo esc_attr( $q['targetValue'] ); ?>" required />
													</div>
													<div class="kn-field">
														<label>نمایش بصری / عملگر / شکل</label>
														<div style="display:flex;gap:6px;">
															<select name="visual_type">
																<option value="number" <?php selected( $q['visualType'], 'number' ); ?>>عددی</option>
																<option value="objects" <?php selected( $q['visualType'], 'objects' ); ?>>اشیاء</option>
																<option value="mental-flash" <?php selected( $q['visualType'], 'mental-flash' ); ?>>ذهنی</option>
															</select>
															<select name="operation">
																<option value="" <?php selected( $q['operation'] ?? '', '' ); ?>>بدون عملگر</option>
																<option value="+" <?php selected( $q['operation'] ?? '', '+' ); ?>>+</option>
																<option value="-" <?php selected( $q['operation'] ?? '', '-' ); ?>>-</option>
															</select>
															<select name="visual_emoji">
																<option value="apple" <?php selected( $q['visualEmoji'] ?? 'apple', 'apple' ); ?>>سیب</option>
																<option value="star" <?php selected( $q['visualEmoji'] ?? 'apple', 'star' ); ?>>ستاره</option>
																<option value="balloon" <?php selected( $q['visualEmoji'] ?? 'apple', 'balloon' ); ?>>بادکنک</option>
																<option value="pencil" <?php selected( $q['visualEmoji'] ?? 'apple', 'pencil' ); ?>>مداد</option>
															</select>
														</div>
													</div>
												</div>
												<div class="kn-grid-2">
													<div class="kn-field">
														<label>تعداد شیء اول (اختیاری)</label>
														<input type="number" name="visual_count_a" value="<?php echo esc_attr( $q['visualCountA'] ?? '' ); ?>" min="0" max="15" />
													</div>
													<div class="kn-field">
														<label>تعداد شیء دوم (اختیاری)</label>
														<input type="number" name="visual_count_b" value="<?php echo esc_attr( $q['visualCountB'] ?? '' ); ?>" min="0" max="15" />
													</div>
												</div>
												<?php self::render_audio_picker_field( 'audio_url', $q['audioUrl'] ?? '', 'kn-question-audio-' . $q['dbId'], 'فایل صوتی اختصاصی این سؤال (اختیاری)' ); ?>
												<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
													<label><input type="checkbox" name="is_active" value="1" <?php checked( $q['isActive'] ); ?> /> سؤال فعال باشد</label>
													<button type="submit" class="kn-btn kn-btn-primary">ذخیره تغییرات سؤال</button>
												</div>
											</form>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</div>
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 5: Users CRM, Per-User Activity Reports & Child Profiles Manager
	 */
	public static function render_users_page() {
		KN_Admin_Users::render_page();
	}

	/**
	 * Page 6: Headless & Default App Settings
	 */
	public static function render_settings_page() {
		$s = get_option( 'kn_soroban_settings', array() );
		self::render_shell_open(
			'kn-soroban-settings',
			'تنظیمات هدلس وردپرس و اپلیکیشن',
			'پیکربندی امنیت CORS، توکن احراز هویت، پیامک تایید sms.ir، تعداد سوالات چالش روزانه و تنظیمات پیش‌فرض کودک.'
		);
		?>

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

					<hr style="border:none;border-top:2px solid #f5eadb;margin:16px 0;" />
					<h3 style="margin-top:0;font-size:14px;">تنظیمات پیامک تایید و ورود با موبایل (sms.ir — سرویس ارسال سریع Verify)</h3>
					<p style="font-size:12px;color:#5c3a1f;margin-top:0;line-height:1.8;">
						برای فعال‌سازی ورود و ثبت‌نام سریع فقط با شماره موبایل و کد یک‌بارمصرف، کلید API پنل <strong>sms.ir</strong> و شناسه قالب تایید (Template ID دارای پارامتر <code>#Code#</code>) را وارد کنید. کلید API هرگز در اپلیکیشن نمایش داده نمی‌شود و فقط روی سرور نگهداری می‌گردد.
					</p>

					<?php $has_sms_key = ! empty( $s['smsir_api_key'] ); ?>
					<div class="kn-grid-2">
						<div class="kn-field">
							<label>
								کلید API پنل sms.ir (x-api-key)
								<?php if ( $has_sms_key ) : ?>
									<span class="kn-pill kn-pill-green" style="margin-right:6px;">ذخیره شده (امن)</span>
								<?php else : ?>
									<span class="kn-pill kn-pill-amber" style="margin-right:6px;">تنظیم نشده</span>
								<?php endif; ?>
							</label>
							<input
								type="password"
								name="smsir_api_key"
								dir="ltr"
								autocomplete="new-password"
								value=""
								placeholder="<?php echo $has_sms_key ? 'برای حفظ کلید فعلی خالی بگذارید یا کلید جدید وارد کنید' : 'کلید API دریافتی از پنل sms.ir را وارد کنید'; ?>"
							/>
							<?php if ( $has_sms_key ) : ?>
								<label style="display:inline-block;margin-top:6px;font-size:11px;color:#b91c1c;">
									<input type="checkbox" name="smsir_clear_api_key" value="1" /> حذف کلید API ذخیره شده فعلی
								</label>
							<?php endif; ?>
						</div>

						<div class="kn-field">
							<label style="display:block;margin-bottom:8px;">وضعیت ورود پیامکی (OTP)</label>
							<label style="display:block;padding:10px 12px;background:#fff8ed;border:1px solid #eedcc5;border-radius:10px;">
								<input type="checkbox" name="smsir_enabled" value="1" <?php checked( ! empty( $s['smsir_enabled'] ) ); ?> />
								فعال‌سازی ورود و ثبت‌نام با پیامک کد یک‌بارمصرف sms.ir
							</label>
						</div>
					</div>

					<div class="kn-grid-2">
						<div class="kn-field">
							<label>شناسه قالب ارسال سریع (Template ID در sms.ir)</label>
							<input type="number" name="smsir_template_id" dir="ltr" value="<?php echo esc_attr( ! empty( $s['smsir_template_id'] ) ? $s['smsir_template_id'] : '' ); ?>" placeholder="مثلاً 123456" min="1" />
						</div>
						<div class="kn-field">
							<label>نام متغیر کد در قالب sms.ir (پیش‌فرض: Code)</label>
							<input type="text" name="smsir_param_name" dir="ltr" value="<?php echo esc_attr( ! empty( $s['smsir_param_name'] ) ? $s['smsir_param_name'] : 'Code' ); ?>" placeholder="Code" />
						</div>
					</div>

					<button type="submit" class="kn-btn kn-btn-green">ذخیره تنظیمات هدلس و پیامک</button>
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
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 7: In-App Storefront Manager & Pending Bank Transfer Receipts Approval
	 */
	public static function render_shop_page() {
		$store = get_option(
			'kn_soroban_store_settings',
			array(
				'enabled'             => 1,
				'banner_title'        => 'فروشگاه کودک نابغه',
				'banner_subtitle'     => 'چرتکه‌های آموزشی، پک‌های تمرین، کتاب کار و ابزارهای هوش ریاضی',
				'show_all_if_empty'   => 1,
				'selected_categories' => array(),
				'selected_products'   => array(),
				'featured_products'   => array(),
			)
		);
		$woo_active     = KN_Woo::is_woo_active();
		$categories     = $woo_active ? KN_Woo::get_admin_product_categories() : array();
		$products       = $woo_active ? KN_Woo::get_admin_products_list() : array();
		$pending_orders = $woo_active ? KN_Woo::get_pending_bacs_orders_admin() : array();
		$sel_cats       = array_map( 'intval', (array) ( $store['selected_categories'] ?? array() ) );
		$sel_prods      = array_map( 'intval', (array) ( $store['selected_products'] ?? array() ) );
		$feat_prods     = array_map( 'intval', (array) ( $store['featured_products'] ?? array() ) );
		self::render_shell_open(
			'kn-soroban-shop',
			'فروشگاه اپلیکیشن و تایید فیش‌های واریزی',
			'انتخاب دسته‌ها و محصولات نمایش داده‌شده در فروشگاه اپلیکیشن کودک نابغه + بررسی و تایید یک‌کلیکی فیش‌های بانکی.'
		);
		?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>تایید سفارش‌های واریز به حساب و فیش‌های بانکی (<?php echo esc_html( count( $pending_orders ) ); ?>)</h2>
				</div>
				<?php if ( empty( $pending_orders ) ) : ?>
					<p style="font-size:13px;color:#5c3a1f;">در حال حاضر هیچ سفارش در انتظار تاییدی وجود ندارد.</p>
				<?php else : ?>
					<table class="kn-table">
						<thead>
							<tr>
								<th>سفارش</th>
								<th>خریدار / موبایل</th>
								<th>اقلام و مبلغ</th>
								<th>فیش بانکی و توضیحات</th>
								<th>عملیات مدیر</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $pending_orders as $po ) : ?>
								<tr>
									<td>
										<strong>#<?php echo esc_html( $po['orderNumber'] ); ?></strong>
										<div style="font-size:11px;color:#7c5b43;"><?php echo esc_html( $po['dateCreated'] ); ?></div>
										<span class="kn-pill kn-pill-amber"><?php echo esc_html( $po['statusLabel'] ); ?></span>
									</td>
									<td>
										<strong><?php echo esc_html( $po['customerName'] ?: 'کاربر' ); ?></strong>
										<div style="font-size:12px;color:#475569;" dir="ltr"><?php echo esc_html( $po['customerPhone'] ); ?></div>
									</td>
									<td>
										<?php foreach ( $po['items'] as $it ) : ?>
											<div style="font-size:12px;">• <?php echo esc_html( $it['name'] ); ?> × <?php echo esc_html( $it['qty'] ); ?></div>
										<?php endforeach; ?>
										<div style="font-weight:800;color:#047857;margin-top:4px;"><?php echo esc_html( $po['totalFormatted'] ); ?></div>
									</td>
									<td>
										<?php if ( ! empty( $po['receiptUrl'] ) ) : ?>
											<a href="<?php echo esc_url( $po['receiptUrl'] ); ?>" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-bottom:4px;">
												<img src="<?php echo esc_url( $po['receiptUrl'] ); ?>" alt="فیش" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid #F59E0B;" />
											</a>
										<?php else : ?>
											<span class="kn-pill kn-pill-slate">بدون تصویر فیش</span>
										<?php endif; ?>
										<?php if ( ! empty( $po['paymentNote'] ) ) : ?>
											<div style="font-size:11px;color:#334155;margin-top:4px;max-width:260px;">📝 <?php echo esc_html( $po['paymentNote'] ); ?></div>
										<?php endif; ?>
									</td>
									<td>
										<form method="post" onsubmit="return confirm('پرداخت این سفارش تایید و دسترسی آن فعال شود؟');">
											<?php wp_nonce_field( 'kn_approve_bacs_order' ); ?>
											<input type="hidden" name="kn_action" value="approve_bacs_order" />
											<input type="hidden" name="order_id" value="<?php echo esc_attr( $po['id'] ); ?>" />
											<button type="submit" class="kn-btn kn-btn-green">تایید پرداخت و فعال‌سازی</button>
										</form>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</div>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>تنظیمات و محصولات فروشگاه داخل اپلیکیشن</h2>
				</div>
				<form method="post">
					<?php wp_nonce_field( 'kn_save_store_settings' ); ?>
					<input type="hidden" name="kn_action" value="save_store_settings" />

					<div class="kn-grid-2">
						<div class="kn-field">
							<label>عنوان بنر فروشگاه</label>
							<input type="text" name="banner_title" value="<?php echo esc_attr( $store['banner_title'] ?? 'فروشگاه کودک نابغه' ); ?>" />
						</div>
						<div class="kn-field">
							<label>توضیح کوتاه بالای فروشگاه</label>
							<input type="text" name="banner_subtitle" value="<?php echo esc_attr( $store['banner_subtitle'] ?? '' ); ?>" />
						</div>
					</div>

					<div style="display:flex;gap:18px;flex-wrap:wrap;margin:10px 0 18px;">
						<label><input type="checkbox" name="enabled" value="1" <?php checked( ! empty( $store['enabled'] ) ); ?> /> بخش فروشگاه در اپلیکیشن فعال باشد</label>
						<label><input type="checkbox" name="show_all_if_empty" value="1" <?php checked( ! empty( $store['show_all_if_empty'] ) ); ?> /> در صورت خالی بودن انتخاب‌ها، همه محصولات منتشرشده ووکامرس نمایش داده شوند</label>
					</div>

					<div class="kn-grid-2">
						<div class="kn-field">
							<label>انتخاب دسته‌بندی‌های ووکامرس برای نمایش در فروشگاه اپ</label>
							<div style="max-height:220px;overflow-y:auto;border:2px solid #eedcc5;border-radius:12px;padding:10px;background:#fffaf3;">
								<?php if ( empty( $categories ) ) : ?>
									<p style="font-size:12px;color:#7c5b43;">دسته‌بندی محصولی یافت نشد.</p>
								<?php else : ?>
									<?php foreach ( $categories as $cat ) : ?>
										<label style="display:block;margin-bottom:6px;font-weight:600;">
											<input type="checkbox" name="selected_categories[]" value="<?php echo esc_attr( $cat['id'] ); ?>" <?php checked( in_array( (int) $cat['id'], $sel_cats, true ) ); ?> />
											<?php echo esc_html( $cat['name'] ); ?> (<?php echo esc_html( $cat['count'] ); ?>)
										</label>
									<?php endforeach; ?>
								<?php endif; ?>
							</div>
						</div>

						<div class="kn-field">
							<label>انتخاب محصولات خاص (و علامت‌گذاری محصولات ویژه)</label>
							<div style="max-height:220px;overflow-y:auto;border:2px solid #eedcc5;border-radius:12px;padding:10px;background:#fffaf3;">
								<?php if ( empty( $products ) ) : ?>
									<p style="font-size:12px;color:#7c5b43;">محصولی در ووکامرس یافت نشد.</p>
								<?php else : ?>
									<?php foreach ( $products as $prod ) : ?>
										<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;border-bottom:1px dashed #eedcc5;">
											<label style="font-weight:600;">
												<input type="checkbox" name="selected_products[]" value="<?php echo esc_attr( $prod['id'] ); ?>" <?php checked( in_array( (int) $prod['id'], $sel_prods, true ) ); ?> />
												#<?php echo esc_html( $prod['id'] . ' — ' . $prod['name'] ); ?>
												<?php if ( ! empty( $prod['on_sale'] ) ) : ?>
													<span class="kn-pill kn-pill-green">حراج</span>
												<?php endif; ?>
											</label>
											<label style="font-size:11px;color:#b45309;white-space:nowrap;">
												<input type="checkbox" name="featured_products[]" value="<?php echo esc_attr( $prod['id'] ); ?>" <?php checked( in_array( (int) $prod['id'], $feat_prods, true ) ); ?> /> ویژه
											</label>
										</div>
									<?php endforeach; ?>
								<?php endif; ?>
							</div>
						</div>
					</div>

					<button type="submit" class="kn-btn kn-btn-primary" style="margin-top:10px;">ذخیره تنظیمات فروشگاه اپلیکیشن</button>
				</form>
			</div>
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 8: Customer Support Ticketing Inbox & Reply Manager
	 */
	public static function render_tickets_page() {
		$status_filter = sanitize_key( wp_unslash( $_GET['ticket_status'] ?? '' ) );
		$tickets       = KN_DB::get_all_tickets_admin( $status_filter );
		$view_id       = absint( $_GET['view_ticket'] ?? 0 );
		$active_ticket = $view_id > 0 ? KN_DB::get_ticket_detail( $view_id, 0, true ) : null;
		self::render_shell_open(
			'kn-soroban-tickets',
			'تیکت‌ها و پشتیبانی کاربران',
			'مشاهده پیام‌ها و پیوست‌های ارسالی کاربران از اپلیکیشن و ارسال پاسخ مستقیم با تاریخ شمسی.'
		);
		?>

			<div class="kn-card" style="padding:14px 20px;">
				<form method="get" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
					<input type="hidden" name="page" value="kn-soroban-tickets" />
					<strong>فیلتر وضعیت:</strong>
					<select name="ticket_status" onchange="this.form.submit()">
						<option value="">همه تیکت‌ها</option>
						<option value="open" <?php selected( $status_filter, 'open' ); ?>>در انتظار پاسخ</option>
						<option value="answered" <?php selected( $status_filter, 'answered' ); ?>>پاسخ داده شده</option>
						<option value="closed" <?php selected( $status_filter, 'closed' ); ?>>بسته شده</option>
					</select>
				</form>
			</div>

			<?php if ( $active_ticket ) : ?>
				<div class="kn-card" style="border:2px solid #3B82F6;">
					<div class="kn-card-header">
						<h2>تیکت #<?php echo esc_html( $active_ticket['id'] ); ?>: <?php echo esc_html( $active_ticket['subject'] ); ?></h2>
						<span class="kn-pill kn-pill-blue"><?php echo esc_html( $active_ticket['statusLabel'] ); ?></span>
					</div>
					<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
						<?php foreach ( $active_ticket['messages'] as $msg ) : ?>
							<div style="padding:12px 14px;border-radius:12px;background:<?php echo $msg['isAdmin'] ? '#EFF6FF' : '#FFFBEB'; ?>;border:1px solid <?php echo $msg['isAdmin'] ? '#BFDBFE' : '#FDE68A'; ?>;">
								<div style="font-size:12px;font-weight:800;margin-bottom:4px;">
									<?php echo esc_html( $msg['senderName'] ); ?> · <span style="font-weight:400;color:#64748B;"><?php echo esc_html( $msg['createdAt'] ); ?></span>
								</div>
								<div style="font-size:13px;line-height:1.8;white-space:pre-wrap;"><?php echo esc_html( $msg['message'] ); ?></div>
								<?php if ( ! empty( $msg['attachmentUrl'] ) ) : ?>
									<div style="margin-top:8px;">
										<a href="<?php echo esc_url( $msg['attachmentUrl'] ); ?>" target="_blank" rel="noopener noreferrer">
											<img src="<?php echo esc_url( $msg['attachmentUrl'] ); ?>" alt="پیوست" style="max-width:220px;border-radius:10px;border:1px solid #cbd5e1;" />
										</a>
									</div>
								<?php endif; ?>
							</div>
						<?php endforeach; ?>
					</div>

					<form method="post">
						<?php wp_nonce_field( 'kn_admin_reply_ticket' ); ?>
						<input type="hidden" name="kn_action" value="admin_reply_ticket" />
						<input type="hidden" name="ticket_id" value="<?php echo esc_attr( $active_ticket['id'] ); ?>" />
						<div class="kn-field">
							<label>پاسخ مدیریت</label>
							<textarea name="reply_message" rows="3" placeholder="پاسخ خود را بنویسید..."></textarea>
						</div>
						<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
							<select name="ticket_status">
								<option value="answered">وضعیت: پاسخ داده شده</option>
								<option value="open">وضعیت: در انتظار پاسخ</option>
								<option value="closed">وضعیت: بسته شده</option>
							</select>
							<button type="submit" class="kn-btn kn-btn-primary">ارسال پاسخ و ذخیره وضعیت</button>
						</div>
					</form>
				</div>
			<?php endif; ?>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>فهرست تیکت‌ها (<?php echo esc_html( count( $tickets ) ); ?>)</h2>
				</div>
				<?php if ( empty( $tickets ) ) : ?>
					<p>تیکتی ثبت نشده است.</p>
				<?php else : ?>
					<table class="kn-table">
						<thead>
							<tr>
								<th>شناسه</th>
								<th>موضوع</th>
								<th>کاربر</th>
								<th>دسته‌بندی</th>
								<th>وضعیت</th>
								<th>به‌روزرسانی</th>
								<th>مشاهده</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $tickets as $tk ) : ?>
								<?php $sum = KN_DB::format_ticket_summary( $tk ); ?>
								<tr>
									<td>#<?php echo esc_html( $tk['id'] ); ?></td>
									<td><strong><?php echo esc_html( $tk['subject'] ); ?></strong> (<?php echo esc_html( $sum['messageCount'] ); ?> پیام)</td>
									<td><?php echo esc_html( $tk['display_name'] ?: $tk['user_login'] ); ?></td>
									<td><?php echo esc_html( $tk['category'] ); ?></td>
									<td>
										<span class="kn-pill <?php echo $tk['status'] === 'open' ? 'kn-pill-amber' : ( $tk['status'] === 'answered' ? 'kn-pill-green' : 'kn-pill-slate' ); ?>">
											<?php echo esc_html( $sum['statusLabel'] ); ?>
										</span>
									</td>
									<td><?php echo esc_html( KN_Jalali::format( $tk['updated_at'], true, true ) ); ?></td>
									<td>
										<a class="kn-btn kn-btn-primary" style="padding:5px 10px;font-size:12px;" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-tickets&view_ticket=' . $tk['id'] ) ); ?>">باز کردن و پاسخ</a>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>
			</div>
		<?php
		self::render_shell_close();
	}

	/**
	 * Page 9: Hybrid Audio, SFX, Background Music & Voiceover Library Manager
	 */
	public static function render_audio_page() {
		$audio_cfg = KN_DB::get_audio_settings();
		$sfx_urls  = is_object( $audio_cfg['sfxUrls'] ) ? array() : (array) $audio_cfg['sfxUrls'];
		$bg_url    = (string) ( $audio_cfg['bgMusicUrl'] ?? '' );
		$clips     = is_array( $audio_cfg['voiceClips'] ) ? $audio_cfg['voiceClips'] : array();

		$sfx_catalog = array(
			'beadClick'     => array(
				'label'       => 'صدای حرکت مهره چرتکه (Bead Click)',
				'static_path' => '/audio/sfx/bead-click.mp3',
			),
			'uiTap'         => array(
				'label'       => 'صدای لمس دکمه‌ها و منو (UI Tap)',
				'static_path' => '/audio/sfx/ui-tap.mp3',
			),
			'success'       => array(
				'label'       => 'صدای تشویق پاسخ درست (Success)',
				'static_path' => '/audio/sfx/success.mp3',
			),
			'tryAgain'      => array(
				'label'       => 'صدای ملایم تلاش مجدد (Try Again)',
				'static_path' => '/audio/sfx/try-again.mp3',
			),
			'levelComplete' => array(
				'label'       => 'صدای جشن تکمیل مرحله (Level Complete)',
				'static_path' => '/audio/sfx/level-complete.mp3',
			),
			'birdChirp'     => array(
				'label'       => 'صدای خوشامدگویی / پرنده (Bird Chirp)',
				'static_path' => '/audio/sfx/bird-chirp.mp3',
			),
		);

		$seed_helper_keys = array(
			array( 'key' => 'praise_correct', 'phrase' => 'آفرین نابغه کوچولو! عالی و دقیق حل کردی!' ),
			array( 'key' => 'try_again', 'phrase' => 'نزدیک بود! دوباره به مهره‌ها نگاه کن و با دقت امتحان کن.' ),
			array( 'key' => 'welcome', 'phrase' => 'سلام قهرمان! آماده سفر روی چرتکه هستی؟' ),
			array( 'key' => 'level_complete', 'phrase' => 'هورا! این مرحله را با موفقیت کامل کردی!' ),
		);
		self::render_shell_open(
			'kn-soroban-audio',
			'مدیریت صدا، افکت‌های صوتی و گویندگی',
			'سیستم صوتی هیبرید: اگر فایل صوتی را اینجا آپلود کنید، با اولویت اول از وردپرس پخش می‌شود؛ و در غیر این صورت فایل ثابت اپلیکیشن یا سنتز هوشمند اجرا می‌گردد.'
		);
		?>

			<form method="post">
				<?php wp_nonce_field( 'kn_save_audio_settings' ); ?>
				<input type="hidden" name="kn_action" value="save_audio_settings" />

				<!-- Card 1: App Sound Effects -->
				<div class="kn-card">
					<div class="kn-card-header">
						<h2>۱. افکت‌های صوتی (Sound Effects - MP3 / OGG / WAV)</h2>
						<span class="kn-pill kn-pill-blue">پخش بدون تاخیر با Web Audio Buffer</span>
					</div>
					<p style="font-size:12px;color:#7c5b43;margin-top:0;">
						برای هر افکت می‌توانید فایل ضبط‌شده دلخواه خود را از کتابخانه رسانه وردپرس انتخاب کنید. در صورت خالی ماندن، فایل ثابت داخل پوشه <code>/public/audio/sfx/</code> یا افکت نرم‌افزاری پخش می‌شود.
					</p>
					<div class="kn-grid-2">
						<?php foreach ( $sfx_catalog as $sfx_key => $meta ) : ?>
							<div style="background:#fffaf3;border:1px solid #eedcc5;border-radius:14px;padding:12px;">
								<?php
								self::render_audio_picker_field(
									'sfx_urls[' . $sfx_key . ']',
									$sfx_urls[ $sfx_key ] ?? '',
									'kn-sfx-' . $sfx_key,
									$meta['label'],
									$meta['static_path']
								);
								?>
								<div style="font-size:11px;color:#7c5b43;">مسیر فایل ثابت پشتیبان: <code dir="ltr"><?php echo esc_html( $meta['static_path'] ); ?></code></div>
							</div>
						<?php endforeach; ?>
					</div>
				</div>

				<!-- Card 2: Background Music -->
				<div class="kn-card">
					<div class="kn-card-header">
						<h2>۲. موسیقی پس‌زمینه کودکانه (Background Music Loop)</h2>
						<span class="kn-pill kn-pill-amber">پخش ملایم و تکرارشونده</span>
					</div>
					<?php
					self::render_audio_picker_field(
						'bg_music_url',
						$bg_url,
						'kn-bg-music-url',
						'فایل موسیقی پس‌زمینه (MP3 / OGG با حجم بهینه و ریتم ملایم)',
						'/audio/music/bg-music.mp3'
					);
					?>
					<div style="font-size:11px;color:#7c5b43;">مسیر فایل ثابت پشتیبان: <code dir="ltr">/audio/music/bg-music.mp3</code> (در صورت نبود فایل، ملودی ملایم داخلی پخش می‌شود).</div>
				</div>

				<!-- Card 3: Voiceover Library -->
				<div class="kn-card">
					<div class="kn-card-header">
						<h2>۳. کتابخانه صداهای گوینده و جملات پرتکرار (Voiceover Library)</h2>
						<button type="button" class="kn-btn kn-btn-green" data-kn-add-voice-row="1">+ افزودن جمله و فایل صوتی جدید</button>
					</div>
					<p style="font-size:12px;color:#7c5b43;margin-top:0;">
						کلیدهای استاندارد مثل <code dir="ltr">praise_correct</code> (تشویق پاسخ درست)، <code dir="ltr">try_again</code> (تلاش مجدد)، <code dir="ltr">welcome</code> و <code dir="ltr">level_complete</code> یا متن دقیق جملات را به فایل صوتی گوینده خود متصل کنید. همچنین در صفحه «جاده و مراحل» و «بانک سوالات» می‌توانید برای هر مرحله، گام یا سؤال یک فایل اختصاصی تنظیم کنید.
					</p>

					<table class="kn-table">
						<thead>
							<tr>
								<th style="width:170px;">کلید یکتا (اختیاری)</th>
								<th style="width:260px;">متن جمله فارسی (تطابق دقیق)</th>
								<th>فایل صوتی گوینده و پیش‌نمایش</th>
								<th style="width:90px;">حذف</th>
							</tr>
						</thead>
						<tbody id="kn-voice-clips-body">
							<?php
							$rows_to_render = ! empty( $clips ) ? $clips : $seed_helper_keys;
							foreach ( $rows_to_render as $idx => $clip ) :
								$row_input_id = 'kn-voice-url-' . $idx;
								$c_key        = (string) ( $clip['key'] ?? '' );
								$c_phrase     = (string) ( $clip['phrase'] ?? '' );
								$c_url        = (string) ( $clip['url'] ?? '' );
								?>
								<tr class="kn-voice-clip-row">
									<td>
										<input type="text" name="voice_keys[]" dir="ltr" value="<?php echo esc_attr( $c_key ); ?>" placeholder="praise_correct" style="width:100%;padding:7px 10px;border:2px solid #eedcc5;border-radius:10px;" />
									</td>
									<td>
										<input type="text" name="voice_phrases[]" value="<?php echo esc_attr( $c_phrase ); ?>" placeholder="متن جمله..." style="width:100%;padding:7px 10px;border:2px solid #eedcc5;border-radius:10px;" />
									</td>
									<td>
										<div class="kn-media-row">
											<input type="text" id="<?php echo esc_attr( $row_input_id ); ?>" name="voice_urls[]" dir="ltr" data-kn-audio-input="1" value="<?php echo esc_attr( $c_url ); ?>" placeholder="https://.../voice.mp3" style="padding:7px 10px;border:2px solid #eedcc5;border-radius:10px;" />
											<button type="button" class="kn-btn kn-btn-amber" data-kn-media-target="<?php echo esc_attr( $row_input_id ); ?>">انتخاب / آپلود صوت</button>
											<button type="button" class="kn-btn kn-btn-ghost" data-kn-media-clear="<?php echo esc_attr( $row_input_id ); ?>">پاک</button>
										</div>
										<audio class="kn-audio-preview" controls preload="none" data-kn-audio-preview="<?php echo esc_attr( $row_input_id ); ?>" <?php echo $c_url !== '' ? 'src="' . esc_url( $c_url ) . '"' : 'style="display:none;"'; ?>></audio>
									</td>
									<td>
										<button type="button" class="kn-btn kn-btn-danger" data-kn-remove-voice-row="1" style="padding:6px 10px;font-size:12px;">حذف</button>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<template id="kn-voice-row-template">
						<tr class="kn-voice-clip-row">
							<td>
								<input type="text" name="voice_keys[]" dir="ltr" value="" placeholder="custom_key" style="width:100%;padding:7px 10px;border:2px solid #eedcc5;border-radius:10px;" />
							</td>
							<td>
								<input type="text" name="voice_phrases[]" value="" placeholder="متن دقیق جمله فارسی..." style="width:100%;padding:7px 10px;border:2px solid #eedcc5;border-radius:10px;" />
							</td>
							<td>
								<div class="kn-media-row">
									<input type="text" id="kn-voice-url-__INDEX__" name="voice_urls[]" dir="ltr" data-kn-audio-input="1" value="" placeholder="https://.../voice.mp3" style="padding:7px 10px;border:2px solid #eedcc5;border-radius:10px;" />
									<button type="button" class="kn-btn kn-btn-amber" data-kn-media-target="kn-voice-url-__INDEX__">انتخاب / آپلود صوت</button>
									<button type="button" class="kn-btn kn-btn-ghost" data-kn-media-clear="kn-voice-url-__INDEX__">پاک</button>
								</div>
								<audio class="kn-audio-preview" controls preload="none" data-kn-audio-preview="kn-voice-url-__INDEX__" style="display:none;"></audio>
							</td>
							<td>
								<button type="button" class="kn-btn kn-btn-danger" data-kn-remove-voice-row="1" style="padding:6px 10px;font-size:12px;">حذف</button>
							</td>
						</tr>
					</template>
				</div>

				<button type="submit" class="kn-btn kn-btn-primary" style="font-size:14px;padding:12px 24px;">ذخیره کامل تنظیمات صدا و گویندگی</button>
			</form>
		<?php
		self::render_shell_close();
	}
}

