<?php
/**
 * Plugin Name:       کودک نابغه — مدیریت چرتکه سوروبان و ترم‌های ووکامرس
 * Plugin URI:        https://coffeete.ir/kaminfo
 * Description:       بک‌اند اختصاصی هدلس وردپرس و ووکامرس برای اپلیکیشن آموزش چرتکه «کودک نابغه» شامل مدیریت ترم‌ها، نقشه ماجراجویی داستانی، مراحل و گام‌ها، بانک سوالات، احراز هویت کاربران، پروفایل کودکان، امتیازات و فروش ترم‌ها با ووکامرس.
 * Version:           2.2.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            تیم کودک نابغه
 * Text Domain:       koodak-nabegheh
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'KN_SOROBAN_VERSION', '2.2.0' );
define( 'KN_SOROBAN_FILE', __FILE__ );
define( 'KN_SOROBAN_DIR', plugin_dir_path( __FILE__ ) );
define( 'KN_SOROBAN_URL', plugin_dir_url( __FILE__ ) );
define( 'KN_SOROBAN_API_NS', 'koodak-nabegheh/v1' );

require_once KN_SOROBAN_DIR . 'includes/class-kn-db.php';
require_once KN_SOROBAN_DIR . 'includes/class-kn-woo.php';
require_once KN_SOROBAN_DIR . 'includes/class-kn-auth.php';
require_once KN_SOROBAN_DIR . 'includes/class-kn-rest.php';
require_once KN_SOROBAN_DIR . 'includes/class-kn-admin.php';

/**
 * Plugin activation: create/upgrade custom tables, seed Terms/Stages/Questions, add student role.
 */
function kn_soroban_activate() {
	KN_DB::install_tables();
	KN_DB::seed_defaults_if_empty();
	update_option( 'kn_soroban_db_version', KN_SOROBAN_VERSION );

	if ( ! get_role( 'kn_student' ) ) {
		add_role(
			'kn_student',
			'دانش‌آموز / والد کودک نابغه',
			array(
				'read' => true,
			)
		);
	}

	if ( false === get_option( 'kn_soroban_settings' ) ) {
		update_option(
			'kn_soroban_settings',
			array(
				'app_title'              => 'کودک نابغه',
				'allowed_origins'        => '*',
				'token_ttl_days'         => 30,
				'daily_challenge_count'  => 5,
				'allow_registration'     => 1,
				'default_digit_mode'     => 'fa',
				'default_sound_enabled'  => 1,
				'default_speech_enabled' => 1,
				'default_night_mode'     => 0,
				'default_abacus_scale'   => 'normal',
				'default_prefer_2d'      => 0,
			)
		);
	}

	if ( false === get_option( 'kn_soroban_store_settings' ) ) {
		update_option(
			'kn_soroban_store_settings',
			array(
				'enabled'           => 1,
				'banner_title'      => 'فروشگاه تجهیزات و کتاب‌های کودک نابغه',
				'banner_subtitle'   => 'چرتکه آموزشی، کتاب کار و بسته‌های کمک‌آموزشی با ارسال سریع',
				'category_ids'      => array(),
				'product_ids'       => array(),
				'featured_ids'      => array(),
				'show_all_if_empty' => 1,
			)
		);
	}

	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'kn_soroban_activate' );

/**
 * Plugin deactivation: flush rewrite rules.
 */
function kn_soroban_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'kn_soroban_deactivate' );

/**
 * Bootstrap plugin components on plugins_loaded.
 */
function kn_soroban_init() {
	if ( get_option( 'kn_soroban_db_version' ) !== KN_SOROBAN_VERSION ) {
		KN_DB::install_tables();
		KN_DB::seed_defaults_if_empty();
		update_option( 'kn_soroban_db_version', KN_SOROBAN_VERSION );
	}

	KN_Woo::init();
	KN_REST::init();

	if ( is_admin() ) {
		KN_Admin::init();
	}
}
add_action( 'plugins_loaded', 'kn_soroban_init' );
