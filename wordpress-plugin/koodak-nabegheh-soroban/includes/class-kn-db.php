<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_DB {

	public static function table_terms() {
		global $wpdb;
		return $wpdb->prefix . 'kn_terms';
	}

	public static function table_stages() {
		global $wpdb;
		return $wpdb->prefix . 'kn_stages';
	}

	public static function table_steps() {
		global $wpdb;
		return $wpdb->prefix . 'kn_steps';
	}

	public static function table_questions() {
		global $wpdb;
		return $wpdb->prefix . 'kn_questions';
	}

	public static function table_profiles() {
		global $wpdb;
		return $wpdb->prefix . 'kn_child_profiles';
	}

	public static function table_tokens() {
		global $wpdb;
		return $wpdb->prefix . 'kn_tokens';
	}

	public static function table_entitlements() {
		global $wpdb;
		return $wpdb->prefix . 'kn_entitlements';
	}

	public static function table_tickets() {
		global $wpdb;
		return $wpdb->prefix . 'kn_tickets';
	}

	public static function table_ticket_messages() {
		global $wpdb;
		return $wpdb->prefix . 'kn_ticket_messages';
	}

	public static function table_otp_codes() {
		global $wpdb;
		return $wpdb->prefix . 'kn_otp_codes';
	}

	public static function table_analytics_events() {
		global $wpdb;
		return $wpdb->prefix . 'kn_analytics_events';
	}

	public static function table_user_logs() {
		global $wpdb;
		return $wpdb->prefix . 'kn_user_logs';
	}

	public static function table_banners() {
		global $wpdb;
		return $wpdb->prefix . 'kn_banners';
	}

	public static function table_dialogs() {
		global $wpdb;
		return $wpdb->prefix . 'kn_dialogs';
	}

	/**
	 * Create or upgrade custom database tables via dbDelta.
	 */
	public static function install_tables() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();

		$t_terms           = self::table_terms();
		$t_stages          = self::table_stages();
		$t_steps           = self::table_steps();
		$t_questions       = self::table_questions();
		$t_profiles        = self::table_profiles();
		$t_tokens          = self::table_tokens();
		$t_entitlements    = self::table_entitlements();
		$t_tickets          = self::table_tickets();
		$t_ticket_messages  = self::table_ticket_messages();
		$t_otp_codes        = self::table_otp_codes();
		$t_analytics        = self::table_analytics_events();
		$t_user_logs        = self::table_user_logs();
		$t_banners          = self::table_banners();
		$t_dialogs          = self::table_dialogs();

		$sql_terms = "CREATE TABLE {$t_terms} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			slug varchar(100) NOT NULL,
			term_number int(11) NOT NULL DEFAULT 1,
			title varchar(255) NOT NULL,
			subtitle varchar(255) NOT NULL DEFAULT '',
			story_title varchar(255) NOT NULL DEFAULT '',
			story_description text NOT NULL,
			biome varchar(40) NOT NULL DEFAULT 'farm',
			accent_color varchar(20) NOT NULL DEFAULT '#4BB543',
			image_url varchar(500) NOT NULL DEFAULT '',
			is_free tinyint(1) NOT NULL DEFAULT 0,
			price_amount bigint(20) unsigned NOT NULL DEFAULT 0,
			woo_product_id bigint(20) unsigned NOT NULL DEFAULT 0,
			checkout_url_override text NOT NULL,
			is_active tinyint(1) NOT NULL DEFAULT 1,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY slug (slug),
			KEY term_number (term_number)
		) {$charset_collate};";

		$sql_stages = "CREATE TABLE {$t_stages} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			term_id bigint(20) unsigned NOT NULL DEFAULT 1,
			slug varchar(100) NOT NULL,
			stage_number int(11) NOT NULL DEFAULT 1,
			title varchar(255) NOT NULL,
			short_goal text NOT NULL,
			story_caption text NOT NULL,
			landmark varchar(40) NOT NULL DEFAULT 'barn',
			skill varchar(60) NOT NULL DEFAULT 'recognition',
			columns_count tinyint(3) unsigned NOT NULL DEFAULT 1,
			unlock_requirement varchar(100) DEFAULT '',
			icon_name varchar(40) NOT NULL DEFAULT 'sparkles',
			accent_color varchar(20) NOT NULL DEFAULT '#0EA5E9',
			audio_url varchar(500) NOT NULL DEFAULT '',
			is_active tinyint(1) NOT NULL DEFAULT 1,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY slug (slug),
			KEY term_id (term_id),
			KEY stage_number (stage_number)
		) {$charset_collate};";

		$sql_steps = "CREATE TABLE {$t_steps} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			stage_id bigint(20) unsigned NOT NULL,
			step_slug varchar(100) NOT NULL,
			step_order int(11) NOT NULL DEFAULT 1,
			title varchar(255) NOT NULL,
			instruction text NOT NULL,
			spoken_text text NOT NULL,
			audio_url varchar(500) NOT NULL DEFAULT '',
			initial_value int(11) NOT NULL DEFAULT 0,
			target_value int(11) DEFAULT NULL,
			columns_count tinyint(3) unsigned NOT NULL DEFAULT 1,
			require_interaction tinyint(1) NOT NULL DEFAULT 1,
			auto_demo_steps tinyint(1) NOT NULL DEFAULT 0,
			highlight_column tinyint(3) DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY stage_id (stage_id),
			KEY step_order (step_order)
		) {$charset_collate};";

		$sql_questions = "CREATE TABLE {$t_questions} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			term_id bigint(20) unsigned NOT NULL DEFAULT 0,
			skill varchar(60) NOT NULL DEFAULT 'recognition',
			difficulty tinyint(3) unsigned NOT NULL DEFAULT 1,
			columns_count tinyint(3) unsigned NOT NULL DEFAULT 1,
			prompt_text text NOT NULL,
			spoken_text text NOT NULL,
			audio_url varchar(500) NOT NULL DEFAULT '',
			start_value int(11) NOT NULL DEFAULT 0,
			target_value int(11) NOT NULL DEFAULT 0,
			visual_type varchar(30) NOT NULL DEFAULT 'number',
			visual_count_a int(11) DEFAULT NULL,
			visual_count_b int(11) DEFAULT NULL,
			visual_emoji varchar(30) DEFAULT 'apple',
			operation varchar(5) DEFAULT NULL,
			is_active tinyint(1) NOT NULL DEFAULT 1,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY term_id (term_id),
			KEY skill_diff (skill, difficulty),
			KEY is_active (is_active)
		) {$charset_collate};";

		$sql_profiles = "CREATE TABLE {$t_profiles} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			client_profile_id varchar(80) NOT NULL,
			name varchar(120) NOT NULL,
			avatar varchar(40) NOT NULL DEFAULT 'owl',
			avatar_url varchar(500) NOT NULL DEFAULT '',
			age tinyint(3) unsigned NOT NULL DEFAULT 6,
			total_stars int(11) NOT NULL DEFAULT 0,
			practice_minutes int(11) NOT NULL DEFAULT 0,
			total_correct int(11) NOT NULL DEFAULT 0,
			total_attempts int(11) NOT NULL DEFAULT 0,
			difficulty_level tinyint(3) unsigned NOT NULL DEFAULT 1,
			lessons_json longtext NOT NULL,
			skills_json longtext NOT NULL,
			badges_json longtext NOT NULL,
			reward_points int(11) NOT NULL DEFAULT 0,
			daily_bonus_json longtext NOT NULL,
			created_at bigint(20) NOT NULL DEFAULT 0,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY user_id (user_id),
			UNIQUE KEY user_client_profile (user_id, client_profile_id)
		) {$charset_collate};";

		$sql_tokens = "CREATE TABLE {$t_tokens} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			token_hash char(64) NOT NULL,
			device_label varchar(120) DEFAULT '',
			expires_at datetime NOT NULL,
			revoked tinyint(1) NOT NULL DEFAULT 0,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY token_hash (token_hash),
			KEY user_id (user_id)
		) {$charset_collate};";

		$sql_entitlements = "CREATE TABLE {$t_entitlements} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			term_id bigint(20) unsigned NOT NULL,
			woo_order_id bigint(20) unsigned NOT NULL DEFAULT 0,
			source varchar(30) NOT NULL DEFAULT 'woocommerce',
			granted_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY user_term (user_id, term_id),
			KEY user_id (user_id),
			KEY term_id (term_id)
		) {$charset_collate};";

		$sql_tickets = "CREATE TABLE {$t_tickets} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			subject varchar(255) NOT NULL,
			category varchar(60) NOT NULL DEFAULT 'general',
			status varchar(30) NOT NULL DEFAULT 'open',
			priority varchar(20) NOT NULL DEFAULT 'normal',
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY user_id (user_id),
			KEY status (status)
		) {$charset_collate};";

		$sql_ticket_messages = "CREATE TABLE {$t_ticket_messages} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			ticket_id bigint(20) unsigned NOT NULL,
			sender_id bigint(20) unsigned NOT NULL DEFAULT 0,
			is_admin tinyint(1) NOT NULL DEFAULT 0,
			message text NOT NULL,
			attachment_url text NOT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY ticket_id (ticket_id)
		) {$charset_collate};";

		$sql_otp_codes = "CREATE TABLE {$t_otp_codes} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			mobile varchar(20) NOT NULL,
			code_hash char(64) NOT NULL,
			attempts tinyint(3) unsigned NOT NULL DEFAULT 0,
			max_attempts tinyint(3) unsigned NOT NULL DEFAULT 5,
			consumed tinyint(1) NOT NULL DEFAULT 0,
			ip_hash char(64) NOT NULL DEFAULT '',
			expires_at datetime NOT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY mobile_consumed (mobile, consumed),
			KEY ip_created (ip_hash, created_at)
		) {$charset_collate};";

		$sql_analytics = "CREATE TABLE {$t_analytics} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			event_type varchar(40) NOT NULL,
			target_id bigint(20) unsigned NOT NULL DEFAULT 0,
			platform varchar(20) NOT NULL DEFAULT 'web',
			device_os varchar(30) NOT NULL DEFAULT '',
			screen varchar(40) NOT NULL DEFAULT '',
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			session_key varchar(64) NOT NULL DEFAULT '',
			event_date date NOT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY event_type_date (event_type, event_date),
			KEY platform_date (platform, event_date),
			KEY target_event (target_id, event_type),
			KEY session_event (session_key, event_type, target_id)
		) {$charset_collate};";

		$sql_user_logs = "CREATE TABLE {$t_user_logs} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			event_type varchar(40) NOT NULL,
			platform varchar(20) NOT NULL DEFAULT 'web',
			device_label varchar(140) NOT NULL DEFAULT '',
			ip_address varchar(64) NOT NULL DEFAULT '',
			user_agent varchar(255) NOT NULL DEFAULT '',
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY user_created (user_id, created_at),
			KEY event_created (event_type, created_at)
		) {$charset_collate};";

		$sql_banners = "CREATE TABLE {$t_banners} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			title varchar(255) NOT NULL,
			subtitle varchar(500) NOT NULL DEFAULT '',
			badge_text varchar(80) NOT NULL DEFAULT '',
			image_url varchar(600) NOT NULL DEFAULT '',
			cta_text varchar(80) NOT NULL DEFAULT '',
			action_type varchar(30) NOT NULL DEFAULT 'none',
			action_target varchar(500) NOT NULL DEFAULT '',
			placement varchar(40) NOT NULL DEFAULT 'home_top',
			bg_color varchar(20) NOT NULL DEFAULT '#EFF6FF',
			text_color varchar(20) NOT NULL DEFAULT '#0F172A',
			target_platform varchar(20) NOT NULL DEFAULT 'all',
			start_at datetime DEFAULT NULL,
			end_at datetime DEFAULT NULL,
			sort_order int(11) NOT NULL DEFAULT 1,
			is_active tinyint(1) NOT NULL DEFAULT 1,
			impressions_web bigint(20) unsigned NOT NULL DEFAULT 0,
			impressions_mobile bigint(20) unsigned NOT NULL DEFAULT 0,
			clicks_web bigint(20) unsigned NOT NULL DEFAULT 0,
			clicks_mobile bigint(20) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY placement_active (placement, is_active),
			KEY sort_order (sort_order)
		) {$charset_collate};";

		$sql_dialogs = "CREATE TABLE {$t_dialogs} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			title varchar(255) NOT NULL,
			body text NOT NULL,
			badge_text varchar(80) NOT NULL DEFAULT '',
			image_url varchar(600) NOT NULL DEFAULT '',
			cta_text varchar(80) NOT NULL DEFAULT 'متوجه شدم',
			action_type varchar(30) NOT NULL DEFAULT 'dismiss',
			action_target varchar(500) NOT NULL DEFAULT '',
			secondary_text varchar(80) NOT NULL DEFAULT '',
			start_at datetime DEFAULT NULL,
			end_at datetime DEFAULT NULL,
			daily_start_time varchar(8) NOT NULL DEFAULT '',
			daily_end_time varchar(8) NOT NULL DEFAULT '',
			weekdays_mask varchar(30) NOT NULL DEFAULT '0,1,2,3,4,5,6',
			delay_seconds int(11) NOT NULL DEFAULT 0,
			auto_close_seconds int(11) NOT NULL DEFAULT 0,
			show_countdown tinyint(1) NOT NULL DEFAULT 1,
			allow_user_close tinyint(1) NOT NULL DEFAULT 1,
			close_on_backdrop tinyint(1) NOT NULL DEFAULT 1,
			frequency_mode varchar(30) NOT NULL DEFAULT 'once_per_day',
			frequency_hours int(11) NOT NULL DEFAULT 24,
			max_impressions_user int(11) NOT NULL DEFAULT 0,
			dialog_size varchar(20) NOT NULL DEFAULT 'md',
			position varchar(20) NOT NULL DEFAULT 'center',
			theme_style varchar(20) NOT NULL DEFAULT 'brand',
			overlay_blur tinyint(1) NOT NULL DEFAULT 1,
			animation varchar(20) NOT NULL DEFAULT 'scale',
			target_platform varchar(20) NOT NULL DEFAULT 'all',
			target_audience varchar(30) NOT NULL DEFAULT 'all',
			target_screens varchar(120) NOT NULL DEFAULT 'all',
			priority int(11) NOT NULL DEFAULT 10,
			is_active tinyint(1) NOT NULL DEFAULT 1,
			impressions_web bigint(20) unsigned NOT NULL DEFAULT 0,
			impressions_mobile bigint(20) unsigned NOT NULL DEFAULT 0,
			clicks_web bigint(20) unsigned NOT NULL DEFAULT 0,
			clicks_mobile bigint(20) unsigned NOT NULL DEFAULT 0,
			closes_count bigint(20) unsigned NOT NULL DEFAULT 0,
			autoclose_count bigint(20) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY active_priority (is_active, priority)
		) {$charset_collate};";

		dbDelta( $sql_terms );
		dbDelta( $sql_stages );
		dbDelta( $sql_steps );
		dbDelta( $sql_questions );
		dbDelta( $sql_profiles );
		dbDelta( $sql_tokens );
		dbDelta( $sql_entitlements );
		dbDelta( $sql_tickets );
		dbDelta( $sql_ticket_messages );
		dbDelta( $sql_otp_codes );
		dbDelta( $sql_analytics );
		dbDelta( $sql_user_logs );
		dbDelta( $sql_banners );
		dbDelta( $sql_dialogs );
	}

	/**
	 * Seed default storybook Terms, Stages, Steps, and Questions if tables are empty.
	 * Also migrates any existing v1 stages without a term into Term 1.
	 */
	public static function seed_defaults_if_empty() {
		global $wpdb;
		$t_terms  = self::table_terms();
		$t_stages = self::table_stages();

		$terms_count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_terms}" );
		$term_id_map = array();

		if ( $terms_count === 0 ) {
			foreach ( self::get_default_terms_seed() as $term ) {
				$wpdb->insert(
					$t_terms,
					array(
						'slug'                  => $term['slug'],
						'term_number'           => $term['term_number'],
						'title'                 => $term['title'],
						'subtitle'              => $term['subtitle'],
						'story_title'           => $term['story_title'],
						'story_description'     => $term['story_description'],
						'biome'                 => $term['biome'],
						'accent_color'          => $term['accent_color'],
						'image_url'             => '',
						'is_free'               => $term['is_free'],
						'price_amount'          => $term['price_amount'],
						'woo_product_id'        => 0,
						'checkout_url_override' => '',
						'is_active'             => 1,
					)
				);
				$term_id_map[ $term['slug'] ] = (int) $wpdb->insert_id;
			}
		} else {
			$existing_terms = $wpdb->get_results( "SELECT id, slug FROM {$t_terms}", ARRAY_A );
			foreach ( $existing_terms as $et ) {
				$term_id_map[ $et['slug'] ] = (int) $et['id'];
			}
		}

		// Ensure v1 stages (if any exist without valid term_id) attach to Term 1
		$first_term_id = ! empty( $term_id_map['term-1-starter'] )
			? (int) $term_id_map['term-1-starter']
			: (int) reset( $term_id_map );

		if ( $first_term_id > 0 ) {
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$t_stages} SET term_id = %d WHERE term_id = 0 OR term_id IS NULL",
					$first_term_id
				)
			);
		}

		// Seed stages for any seeded term that currently has 0 stages
		$stages_count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_stages}" );
		$default_stages = self::get_default_stages_seed();

		if ( $stages_count === 0 ) {
			foreach ( $default_stages as $stage ) {
				self::insert_seeded_stage( $stage, $term_id_map, $first_term_id );
			}
		} else {
			// If upgrading from v1.0.0 where only Term 1 had stages, seed Term 2 & Term 3 stages cleanly
			foreach ( $default_stages as $stage ) {
				$target_term_id = isset( $term_id_map[ $stage['term_slug'] ] )
					? (int) $term_id_map[ $stage['term_slug'] ]
					: $first_term_id;

				$exists = (int) $wpdb->get_var(
					$wpdb->prepare(
						"SELECT COUNT(*) FROM {$t_stages} WHERE slug = %s",
						$stage['slug']
					)
				);

				if ( $exists === 0 && $target_term_id !== $first_term_id ) {
					self::insert_seeded_stage( $stage, $term_id_map, $first_term_id );
				}
			}
		}

		$t_questions = self::table_questions();
		$q_count     = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_questions}" );
		if ( $q_count === 0 ) {
			foreach ( self::get_default_questions_seed() as $q ) {
				$wpdb->insert(
					$t_questions,
					array(
						'term_id'        => 0,
						'skill'          => $q['skill'],
						'difficulty'     => $q['difficulty'],
						'columns_count'  => $q['columns_count'],
						'prompt_text'    => $q['prompt_text'],
						'spoken_text'    => $q['spoken_text'],
						'start_value'    => $q['start_value'],
						'target_value'   => $q['target_value'],
						'visual_type'    => $q['visual_type'],
						'visual_count_a' => $q['visual_count_a'],
						'visual_count_b' => $q['visual_count_b'],
						'visual_emoji'   => $q['visual_emoji'],
						'operation'      => $q['operation'],
						'is_active'      => 1,
					)
				);
			}
		}
	}

	private static function insert_seeded_stage( $stage, $term_id_map, $fallback_term_id ) {
		global $wpdb;
		$steps   = $stage['steps'];
		$term_id = isset( $term_id_map[ $stage['term_slug'] ] )
			? (int) $term_id_map[ $stage['term_slug'] ]
			: (int) $fallback_term_id;

		$wpdb->insert(
			self::table_stages(),
			array(
				'term_id'            => $term_id,
				'slug'               => $stage['slug'],
				'stage_number'       => $stage['stage_number'],
				'title'              => $stage['title'],
				'short_goal'         => $stage['short_goal'],
				'story_caption'      => $stage['story_caption'] ?? '',
				'landmark'           => $stage['landmark'] ?? 'barn',
				'skill'              => $stage['skill'],
				'columns_count'      => $stage['columns_count'],
				'unlock_requirement' => $stage['unlock_requirement'],
				'icon_name'          => $stage['icon_name'],
				'accent_color'       => $stage['accent_color'],
				'is_active'          => 1,
			)
		);

		$stage_id = (int) $wpdb->insert_id;
		if ( $stage_id > 0 && ! empty( $steps ) ) {
			foreach ( $steps as $idx => $step ) {
				self::insert_step( $stage_id, $idx + 1, $step );
			}
		}
	}

	public static function insert_step( $stage_id, $order, $step ) {
		global $wpdb;
		return $wpdb->insert(
			self::table_steps(),
			array(
				'stage_id'            => absint( $stage_id ),
				'step_slug'           => sanitize_title( $step['step_slug'] ?? ( 'step-' . $stage_id . '-' . $order ) ),
				'step_order'          => absint( $order ),
				'title'               => sanitize_text_field( $step['title'] ),
				'instruction'         => wp_kses_post( $step['instruction'] ),
				'spoken_text'         => sanitize_text_field( $step['spoken_text'] ),
				'audio_url'           => esc_url_raw( $step['audio_url'] ?? '' ),
				'initial_value'       => intval( $step['initial_value'] ?? 0 ),
				'target_value'        => isset( $step['target_value'] ) && $step['target_value'] !== '' ? intval( $step['target_value'] ) : null,
				'columns_count'       => max( 1, min( 4, absint( $step['columns_count'] ?? 1 ) ) ),
				'require_interaction' => ! empty( $step['require_interaction'] ) ? 1 : 0,
				'auto_demo_steps'     => ! empty( $step['auto_demo_steps'] ) ? 1 : 0,
				'highlight_column'    => isset( $step['highlight_column'] ) && $step['highlight_column'] !== '' ? intval( $step['highlight_column'] ) : null,
			)
		);
	}

	/**
	 * Fetch all terms (ordered) without nested steps for quick admin dropdowns.
	 */
	public static function get_terms_list( $only_active = false ) {
		global $wpdb;
		$t_terms = self::table_terms();
		$where   = $only_active ? 'WHERE is_active = 1' : '';
		return $wpdb->get_results( "SELECT * FROM {$t_terms} {$where} ORDER BY term_number ASC, id ASC", ARRAY_A );
	}

	/**
	 * Get unlocked term database IDs for a given WordPress user.
	 */
	public static function get_user_entitlement_map( $user_id ) {
		global $wpdb;
		$user_id = absint( $user_id );
		if ( $user_id <= 0 ) {
			return array();
		}
		$t_ent = self::table_entitlements();
		$rows  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT term_id, source, woo_order_id FROM {$t_ent} WHERE user_id = %d",
				$user_id
			),
			ARRAY_A
		);
		$map = array();
		foreach ( $rows as $r ) {
			$map[ (int) $r['term_id'] ] = array(
				'source'     => $r['source'],
				'wooOrderId' => (int) $r['woo_order_id'],
			);
		}
		return $map;
	}

	public static function grant_term_entitlement( $user_id, $term_id, $source = 'woocommerce', $woo_order_id = 0 ) {
		global $wpdb;
		$user_id = absint( $user_id );
		$term_id = absint( $term_id );
		if ( $user_id <= 0 || $term_id <= 0 ) {
			return false;
		}
		$t_ent    = self::table_entitlements();
		$existing = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT id FROM {$t_ent} WHERE user_id = %d AND term_id = %d",
				$user_id,
				$term_id
			)
		);

		$allowed_sources = array( 'woocommerce', 'admin', 'free' );
		$safe_source     = in_array( $source, $allowed_sources, true ) ? $source : 'woocommerce';

		if ( $existing ) {
			return false !== $wpdb->update(
				$t_ent,
				array(
					'source'       => $safe_source,
					'woo_order_id' => absint( $woo_order_id ),
					'granted_at'   => current_time( 'mysql' ),
				),
				array( 'id' => (int) $existing ),
				array( '%s', '%d', '%s' ),
				array( '%d' )
			);
		}

		return false !== $wpdb->insert(
			$t_ent,
			array(
				'user_id'      => $user_id,
				'term_id'      => $term_id,
				'woo_order_id' => absint( $woo_order_id ),
				'source'       => $safe_source,
				'granted_at'   => current_time( 'mysql' ),
			),
			array( '%d', '%d', '%d', '%s', '%s' )
		);
	}

	public static function revoke_term_entitlement( $user_id, $term_id ) {
		global $wpdb;
		return false !== $wpdb->delete(
			self::table_entitlements(),
			array(
				'user_id' => absint( $user_id ),
				'term_id' => absint( $term_id ),
			),
			array( '%d', '%d' )
		);
	}

	/**
	 * Fetch full dynamic curriculum grouped by Terms -> Stages -> Steps.
	 */
	public static function get_terms_curriculum( $only_active = true, $user_id = 0 ) {
		global $wpdb;
		$t_terms  = self::table_terms();
		$t_stages = self::table_stages();
		$t_steps  = self::table_steps();

		$where_terms = $only_active ? 'WHERE is_active = 1' : '';
		$terms       = $wpdb->get_results( "SELECT * FROM {$t_terms} {$where_terms} ORDER BY term_number ASC, id ASC", ARRAY_A );
		$entitlements = self::get_user_entitlement_map( $user_id );
		$is_admin_user = $user_id > 0 && user_can( $user_id, 'manage_options' );

		$where_stages = $only_active ? 'WHERE is_active = 1' : '';
		$stages       = $wpdb->get_results( "SELECT * FROM {$t_stages} {$where_stages} ORDER BY stage_number ASC, id ASC", ARRAY_A );

		// Batch-fetch all steps in a single query to avoid N+1 database roundtrips.
		$all_steps_raw = $wpdb->get_results( "SELECT * FROM {$t_steps} ORDER BY stage_id ASC, step_order ASC, id ASC", ARRAY_A );
		$steps_by_stage = array();
		if ( is_array( $all_steps_raw ) ) {
			foreach ( $all_steps_raw as $sp ) {
				$sid = (int) $sp['stage_id'];
				if ( ! isset( $steps_by_stage[ $sid ] ) ) {
					$steps_by_stage[ $sid ] = array();
				}
				$steps_by_stage[ $sid ][] = $sp;
			}
		}

		$stages_by_term = array();
		foreach ( $stages as $st ) {
			$steps_raw = $steps_by_stage[ (int) $st['id'] ] ?? array();

			$steps = array();
			foreach ( $steps_raw as $sp ) {
				$step_item = array(
					'id'                 => $sp['step_slug'],
					'dbId'               => (int) $sp['id'],
					'title'              => $sp['title'],
					'instruction'        => $sp['instruction'],
					'spokenText'         => $sp['spoken_text'],
					'audioUrl'           => (string) ( $sp['audio_url'] ?? '' ),
					'initialValue'       => (int) $sp['initial_value'],
					'columns'            => (int) $sp['columns_count'],
					'requireInteraction' => (bool) $sp['require_interaction'],
					'autoDemoSteps'      => (bool) $sp['auto_demo_steps'],
				);
				if ( $sp['target_value'] !== null ) {
					$step_item['targetValue'] = (int) $sp['target_value'];
				}
				if ( $sp['highlight_column'] !== null ) {
					$step_item['highlightColumn'] = (int) $sp['highlight_column'];
				}
				$steps[] = $step_item;
			}

			$stage_item = array(
				'id'           => $st['slug'],
				'dbId'         => (int) $st['id'],
				'termDbId'     => (int) $st['term_id'],
				'stageNumber'  => (int) $st['stage_number'],
				'title'        => $st['title'],
				'shortGoal'    => $st['short_goal'],
				'storyCaption' => $st['story_caption'] ?: $st['short_goal'],
				'landmark'     => $st['landmark'] ?: 'barn',
				'skill'        => $st['skill'],
				'columns'      => (int) $st['columns_count'],
				'iconName'     => $st['icon_name'],
				'accentColor'  => $st['accent_color'],
				'audioUrl'     => (string) ( $st['audio_url'] ?? '' ),
				'isActive'     => (bool) $st['is_active'],
				'steps'        => $steps,
			);
			if ( ! empty( $st['unlock_requirement'] ) ) {
				$stage_item['unlockRequirement'] = $st['unlock_requirement'];
			}

			$tid = (int) $st['term_id'];
			if ( ! isset( $stages_by_term[ $tid ] ) ) {
				$stages_by_term[ $tid ] = array();
			}
			$stages_by_term[ $tid ][] = $stage_item;
		}

		$formatted_terms = array();
		$pending_orders  = ( $user_id > 0 && class_exists( 'KN_Woo' ) && method_exists( 'KN_Woo', 'get_pending_term_order_map' ) )
			? KN_Woo::get_pending_term_order_map( $user_id )
			: array();

		foreach ( $terms as $term ) {
			$tid        = (int) $term['id'];
			$is_free    = ! empty( $term['is_free'] );
			$ent        = $entitlements[ $tid ] ?? null;
			$unlocked   = $is_free || ! empty( $ent ) || $is_admin_user;
			$unlock_src = $is_free ? 'free' : ( $ent['source'] ?? ( $is_admin_user ? 'admin' : null ) );

			$woo_meta = class_exists( 'KN_Woo' )
				? KN_Woo::get_term_commerce_meta( $term, $user_id )
				: array(
					'priceAmount'           => (int) $term['price_amount'],
					'priceFormatted'        => number_format( (int) $term['price_amount'] ) . ' تومان',
					'regularPriceAmount'    => (int) $term['price_amount'],
					'regularPriceFormatted' => number_format( (int) $term['price_amount'] ) . ' تومان',
					'salePriceAmount'       => null,
					'salePriceFormatted'    => '',
					'onSale'                => false,
					'discountPercent'       => 0,
					'saleEndTimestamp'      => null,
					'checkoutUrl'           => esc_url_raw( (string) $term['checkout_url_override'] ),
				);

			$term_stages = $stages_by_term[ $tid ] ?? array();
			foreach ( $term_stages as &$ts ) {
				$ts['termId'] = $term['slug'];
			}
			unset( $ts );

			$formatted_terms[] = array(
				'id'                    => $term['slug'],
				'dbId'                  => $tid,
				'termNumber'            => (int) $term['term_number'],
				'title'                 => $term['title'],
				'subtitle'              => $term['subtitle'],
				'storyTitle'            => $term['story_title'],
				'storyDescription'      => $term['story_description'],
				'biome'                 => $term['biome'],
				'accentColor'           => $term['accent_color'],
				'imageUrl'              => esc_url_raw( (string) ( $term['image_url'] ?? '' ) ),
				'isFree'                => $is_free,
				'priceAmount'           => (int) $woo_meta['priceAmount'],
				'priceFormatted'        => $is_free ? 'رایگان' : $woo_meta['priceFormatted'],
				'regularPriceAmount'    => $is_free ? 0 : (int) ( $woo_meta['regularPriceAmount'] ?? $woo_meta['priceAmount'] ),
				'regularPriceFormatted' => $is_free ? 'رایگان' : ( $woo_meta['regularPriceFormatted'] ?? $woo_meta['priceFormatted'] ),
				'salePriceAmount'       => $is_free ? null : ( $woo_meta['salePriceAmount'] ?? null ),
				'salePriceFormatted'    => $is_free ? '' : ( $woo_meta['salePriceFormatted'] ?? '' ),
				'onSale'                => ! $is_free && ! empty( $woo_meta['onSale'] ),
				'discountPercent'       => $is_free ? 0 : (int) ( $woo_meta['discountPercent'] ?? 0 ),
				'saleEndTimestamp'      => $is_free ? null : ( $woo_meta['saleEndTimestamp'] ?? null ),
				'wooProductId'          => (int) $term['woo_product_id'],
				'checkoutUrlOverride'   => (string) $term['checkout_url_override'],
				'checkoutUrl'           => $woo_meta['checkoutUrl'],
				'isActive'              => (bool) $term['is_active'],
				'unlocked'              => $unlocked,
				'unlockedSource'        => $unlock_src,
				'pendingOrder'          => ( ! $unlocked && isset( $pending_orders[ $tid ] ) ) ? $pending_orders[ $tid ] : null,
				'stages'                => $term_stages,
			);
		}

		return $formatted_terms;
	}

	/**
	 * Ticket & Support Helpers
	 */
	public static function create_ticket( $user_id, $subject, $category, $message, $attachment_url = '' ) {
		global $wpdb;
		$user_id  = absint( $user_id );
		$subject  = sanitize_text_field( $subject );
		$category = sanitize_key( $category ?: 'general' );
		$message  = sanitize_textarea_field( $message );
		$att_url  = esc_url_raw( (string) $attachment_url );

		if ( $user_id <= 0 || empty( $subject ) || empty( $message ) ) {
			return false;
		}

		$now = current_time( 'mysql' );
		$ok  = $wpdb->insert(
			self::table_tickets(),
			array(
				'user_id'    => $user_id,
				'subject'    => $subject,
				'category'   => $category,
				'status'     => 'open',
				'priority'   => 'normal',
				'created_at' => $now,
				'updated_at' => $now,
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		if ( ! $ok ) {
			return false;
		}

		$ticket_id = (int) $wpdb->insert_id;
		$wpdb->insert(
			self::table_ticket_messages(),
			array(
				'ticket_id'      => $ticket_id,
				'sender_id'      => $user_id,
				'is_admin'       => 0,
				'message'        => $message,
				'attachment_url' => $att_url,
				'created_at'     => $now,
			),
			array( '%d', '%d', '%d', '%s', '%s', '%s' )
		);

		return self::get_ticket_detail( $ticket_id, $user_id, false );
	}

	public static function get_tickets_for_user( $user_id ) {
		global $wpdb;
		$user_id = absint( $user_id );
		if ( $user_id <= 0 ) {
			return array();
		}
		$t_tickets = self::table_tickets();
		$t_msgs    = self::table_ticket_messages();
		$rows      = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT t.*, (SELECT COUNT(*) FROM {$t_msgs} m WHERE m.ticket_id = t.id) AS message_count FROM {$t_tickets} t WHERE t.user_id = %d ORDER BY t.updated_at DESC, t.id DESC",
				$user_id
			),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'format_ticket_summary' ), is_array( $rows ) ? $rows : array() );
	}

	public static function get_all_tickets_admin( $status_filter = '' ) {
		global $wpdb;
		$t_tickets = self::table_tickets();
		$t_msgs    = self::table_ticket_messages();

		$where  = '';
		$params = array();
		if ( ! empty( $status_filter ) && in_array( $status_filter, array( 'open', 'answered', 'closed' ), true ) ) {
			$where    = 'WHERE t.status = %s';
			$params[] = $status_filter;
		}

		$sql = "SELECT t.*, u.user_login, u.display_name, u.user_email, (SELECT COUNT(*) FROM {$t_msgs} m WHERE m.ticket_id = t.id) AS message_count
			FROM {$t_tickets} t
			LEFT JOIN {$wpdb->users} u ON t.user_id = u.ID
			{$where}
			ORDER BY FIELD(t.status, 'open', 'answered', 'closed'), t.updated_at DESC, t.id DESC";

		$rows = ! empty( $params )
			? $wpdb->get_results( $wpdb->prepare( $sql, ...$params ), ARRAY_A )
			: $wpdb->get_results( $sql, ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	public static function format_ticket_summary( $row ) {
		$status_labels = array(
			'open'     => 'در انتظار پاسخ',
			'answered' => 'پاسخ داده شده',
			'closed'   => 'بسته شده',
		);
		$status = isset( $row['status'] ) ? $row['status'] : 'open';
		$c_at   = class_exists( 'KN_Jalali' ) ? KN_Jalali::format( $row['created_at'], true, true ) : $row['created_at'];
		$u_at   = class_exists( 'KN_Jalali' ) ? KN_Jalali::format( $row['updated_at'], true, true ) : $row['updated_at'];
		return array(
			'id'           => (int) $row['id'],
			'userId'       => (int) $row['user_id'],
			'subject'      => $row['subject'],
			'category'     => $row['category'],
			'status'       => $status,
			'statusLabel'  => $status_labels[ $status ] ?? $status,
			'priority'     => $row['priority'],
			'messageCount' => isset( $row['message_count'] ) ? (int) $row['message_count'] : 0,
			'createdAt'    => $c_at,
			'updatedAt'    => $u_at,
		);
	}

	public static function get_ticket_detail( $ticket_id, $requester_id = 0, $is_admin = false ) {
		global $wpdb;
		$ticket_id    = absint( $ticket_id );
		$requester_id = absint( $requester_id );

		$t_tickets = self::table_tickets();
		$t_msgs    = self::table_ticket_messages();

		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$t_tickets} WHERE id = %d", $ticket_id ),
			ARRAY_A
		);

		if ( ! $row ) {
			return null;
		}
		if ( ! $is_admin && (int) $row['user_id'] !== $requester_id ) {
			return null;
		}

		$msgs = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT m.*, u.display_name AS sender_name FROM {$t_msgs} m LEFT JOIN {$wpdb->users} u ON m.sender_id = u.ID WHERE m.ticket_id = %d ORDER BY m.id ASC",
				$ticket_id
			),
			ARRAY_A
		);

		$formatted_msgs = array();
		if ( is_array( $msgs ) ) {
			foreach ( $msgs as $m ) {
				$m_time           = class_exists( 'KN_Jalali' ) ? KN_Jalali::format( $m['created_at'], true, true ) : $m['created_at'];
				$formatted_msgs[] = array(
					'id'            => (int) $m['id'],
					'ticketId'      => (int) $m['ticket_id'],
					'senderId'      => (int) $m['sender_id'],
					'senderName'    => ! empty( $m['is_admin'] ) ? 'پشتیبانی کودک نابغه' : ( $m['sender_name'] ?: 'کاربر' ),
					'isAdmin'       => (bool) $m['is_admin'],
					'message'       => $m['message'],
					'attachmentUrl' => $m['attachment_url'],
					'createdAt'     => $m_time,
				);
			}
		}

		$summary                 = self::format_ticket_summary( $row );
		$summary['messages']     = $formatted_msgs;
		$summary['messageCount'] = count( $formatted_msgs );
		return $summary;
	}

	/**
	 * Log user authentication & visit events for User CRM Reports.
	 */
	public static function log_user_event( $user_id, $event_type, $platform = 'web', $device_label = '' ) {
		global $wpdb;
		$user_id = absint( $user_id );
		if ( $user_id <= 0 ) {
			return false;
		}
		$allowed_events = array( 'login_password', 'login_otp', 'register', 'logout', 'session_restore', 'app_visit' );
		$safe_event     = in_array( $event_type, $allowed_events, true ) ? $event_type : 'app_visit';
		$safe_platform  = ( $platform === 'mobile_app' ) ? 'mobile_app' : 'web';

		$ip = '';
		if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$parts = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
			$ip    = trim( (string) $parts[0] );
		} elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
		}
		$ua = ! empty( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';

		return false !== $wpdb->insert(
			self::table_user_logs(),
			array(
				'user_id'      => $user_id,
				'event_type'   => $safe_event,
				'platform'     => $safe_platform,
				'device_label' => sanitize_text_field( substr( (string) $device_label, 0, 140 ) ),
				'ip_address'   => sanitize_text_field( substr( $ip, 0, 64 ) ),
				'user_agent'   => substr( $ua, 0, 250 ),
				'created_at'   => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	public static function get_user_logs( $user_id = 0, $limit = 100 ) {
		global $wpdb;
		$t_logs = self::table_user_logs();
		$limit  = max( 1, min( 500, absint( $limit ) ) );
		if ( $user_id > 0 ) {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$t_logs} WHERE user_id = %d ORDER BY id DESC LIMIT %d",
					absint( $user_id ),
					$limit
				),
				ARRAY_A
			);
		} else {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT l.*, u.user_login, u.display_name FROM {$t_logs} l LEFT JOIN {$wpdb->users} u ON l.user_id = u.ID ORDER BY l.id DESC LIMIT %d",
					$limit
				),
				ARRAY_A
			);
		}
		return is_array( $rows ) ? $rows : array();
	}

	public static function add_ticket_reply( $ticket_id, $sender_id, $is_admin, $message, $attachment_url = '', $new_status = '' ) {
		global $wpdb;
		$ticket_id = absint( $ticket_id );
		$sender_id = absint( $sender_id );
		$message   = sanitize_textarea_field( $message );
		$att_url   = esc_url_raw( (string) $attachment_url );

		if ( $ticket_id <= 0 || empty( $message ) ) {
			return false;
		}

		$now = current_time( 'mysql' );
		$ok  = $wpdb->insert(
			self::table_ticket_messages(),
			array(
				'ticket_id'      => $ticket_id,
				'sender_id'      => $sender_id,
				'is_admin'       => $is_admin ? 1 : 0,
				'message'        => $message,
				'attachment_url' => $att_url,
				'created_at'     => $now,
			),
			array( '%d', '%d', '%d', '%s', '%s', '%s' )
		);

		if ( ! $ok ) {
			return false;
		}

		$status_to_set = in_array( $new_status, array( 'open', 'answered', 'closed' ), true )
			? $new_status
			: ( $is_admin ? 'answered' : 'open' );

		$wpdb->update(
			self::table_tickets(),
			array(
				'status'     => $status_to_set,
				'updated_at' => $now,
			),
			array( 'id' => $ticket_id ),
			array( '%s', '%s' ),
			array( '%d' )
		);

		return true;
	}

	public static function update_ticket_status( $ticket_id, $status ) {
		global $wpdb;
		if ( ! in_array( $status, array( 'open', 'answered', 'closed' ), true ) ) {
			return false;
		}
		return false !== $wpdb->update(
			self::table_tickets(),
			array(
				'status'     => $status,
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'id' => absint( $ticket_id ) ),
			array( '%s', '%s' ),
			array( '%d' )
		);
	}

	/**
	 * Fetch flat list of stages (backward-compatible helper + admin list).
	 */
	public static function get_curriculum( $only_active = true, $term_db_id = 0 ) {
		$terms  = self::get_terms_curriculum( $only_active, 0 );
		$stages = array();
		foreach ( $terms as $term ) {
			if ( $term_db_id > 0 && (int) $term['dbId'] !== (int) $term_db_id ) {
				continue;
			}
			foreach ( $term['stages'] as $st ) {
				$st['termTitle'] = $term['title'];
				$stages[]        = $st;
			}
		}
		return $stages;
	}

	/**
	 * Fetch practice questions formatted for frontend.
	 */
	public static function get_questions( $skill = '', $difficulty = 0, $only_active = true, $term_id = 0 ) {
		global $wpdb;
		$t_questions = self::table_questions();

		$clauses = array();
		$params  = array();

		if ( $only_active ) {
			$clauses[] = 'is_active = 1';
		}
		if ( ! empty( $skill ) ) {
			$clauses[] = 'skill = %s';
			$params[]  = $skill;
		}
		if ( $difficulty > 0 ) {
			$clauses[] = 'difficulty <= %d';
			$params[]  = $difficulty;
		}
		if ( $term_id > 0 ) {
			$clauses[] = '(term_id = %d OR term_id = 0)';
			$params[]  = absint( $term_id );
		}

		$sql = "SELECT * FROM {$t_questions}";
		if ( ! empty( $clauses ) ) {
			$sql .= ' WHERE ' . implode( ' AND ', $clauses );
		}
		$sql .= ' ORDER BY difficulty ASC, id DESC';

		$rows = ! empty( $params )
			? $wpdb->get_results( $wpdb->prepare( $sql, ...$params ), ARRAY_A )
			: $wpdb->get_results( $sql, ARRAY_A );

		$items = array();
		foreach ( $rows as $row ) {
			$item = array(
				'id'          => 'wp_q_' . $row['id'],
				'dbId'        => (int) $row['id'],
				'termDbId'    => (int) $row['term_id'],
				'skill'       => $row['skill'],
				'difficulty'  => (int) $row['difficulty'],
				'columns'     => (int) $row['columns_count'],
				'promptText'  => $row['prompt_text'],
				'spokenText'  => $row['spoken_text'],
				'audioUrl'    => (string) ( $row['audio_url'] ?? '' ),
				'startValue'  => (int) $row['start_value'],
				'targetValue' => (int) $row['target_value'],
				'visualType'  => $row['visual_type'],
				'visualEmoji' => $row['visual_emoji'],
				'isActive'    => (bool) $row['is_active'],
			);
			if ( $row['visual_count_a'] !== null ) {
				$item['visualCountA'] = (int) $row['visual_count_a'];
			}
			if ( $row['visual_count_b'] !== null ) {
				$item['visualCountB'] = (int) $row['visual_count_b'];
			}
			if ( ! empty( $row['operation'] ) ) {
				$item['operation'] = $row['operation'];
			}
			$items[] = $item;
		}

		return $items;
	}

	/**
	 * Fetch normalized global audio settings (SFX, BG music, phrase voice library) for REST API & Admin.
	 */
	public static function get_audio_settings() {
		$raw      = get_option( 'kn_soroban_audio_settings', array() );
		$sfx_keys = array( 'beadClick', 'uiTap', 'success', 'tryAgain', 'levelComplete', 'birdChirp' );
		$sfx_out  = array();
		$raw_sfx  = isset( $raw['sfx_urls'] ) && is_array( $raw['sfx_urls'] ) ? $raw['sfx_urls'] : array();
		foreach ( $sfx_keys as $k ) {
			if ( ! empty( $raw_sfx[ $k ] ) ) {
				$sfx_out[ $k ] = esc_url_raw( (string) $raw_sfx[ $k ] );
			}
		}

		$clips_out = array();
		$raw_clips = isset( $raw['voice_clips'] ) && is_array( $raw['voice_clips'] ) ? $raw['voice_clips'] : array();
		foreach ( $raw_clips as $clip ) {
			if ( ! is_array( $clip ) ) {
				continue;
			}
			$url    = esc_url_raw( (string) ( $clip['url'] ?? '' ) );
			$phrase = sanitize_text_field( (string) ( $clip['phrase'] ?? '' ) );
			$key    = sanitize_key( (string) ( $clip['key'] ?? '' ) );
			if ( ! empty( $url ) && ( ! empty( $phrase ) || ! empty( $key ) ) ) {
				$clips_out[] = array(
					'key'    => $key,
					'phrase' => $phrase,
					'url'    => $url,
				);
			}
		}

		return array(
			'sfxUrls'    => ! empty( $sfx_out ) ? $sfx_out : new stdClass(),
			'bgMusicUrl' => ! empty( $raw['bg_music_url'] ) ? esc_url_raw( (string) $raw['bg_music_url'] ) : '',
			'voiceClips' => $clips_out,
		);
	}

	/**
	 * Format a child profile database row to React ChildProfile JSON.
	 */
	public static function format_profile_row( $row ) {
		$lessons     = json_decode( $row['lessons_json'], true );
		$skills      = json_decode( $row['skills_json'], true );
		$badges      = json_decode( $row['badges_json'], true );
		$daily_bonus = isset( $row['daily_bonus_json'] ) ? json_decode( $row['daily_bonus_json'], true ) : null;

		return array(
			'id'              => $row['client_profile_id'],
			'dbId'            => (int) $row['id'],
			'userId'          => (int) $row['user_id'],
			'name'            => $row['name'],
			'avatar'          => $row['avatar'],
			'avatarUrl'       => esc_url_raw( (string) ( $row['avatar_url'] ?? '' ) ),
			'age'             => (int) $row['age'],
			'createdAt'       => (int) $row['created_at'],
			'totalStars'      => (int) $row['total_stars'],
			'practiceMinutes' => (int) $row['practice_minutes'],
			'totalCorrect'    => (int) $row['total_correct'],
			'totalAttempts'   => (int) $row['total_attempts'],
			'difficultyLevel' => (int) $row['difficulty_level'],
			'lessons'         => is_array( $lessons ) ? $lessons : new stdClass(),
			'skills'          => is_array( $skills ) ? $skills : self::default_skills_map(),
			'badges'          => is_array( $badges ) ? $badges : array(),
			'rewardPoints'    => isset( $row['reward_points'] ) ? max( 0, (int) $row['reward_points'] ) : 0,
			'dailyBonus'      => is_array( $daily_bonus ) ? $daily_bonus : array(
				'streak'           => 0,
				'lastClaimDate'    => '',
				'totalDaysClaimed' => 0,
				'history'          => array(),
			),
		);
	}

	public static function default_skills_map() {
		return array(
			'recognition'       => array( 'correct' => 0, 'attempts' => 0 ),
			'placeValue'        => array( 'correct' => 0, 'attempts' => 0 ),
			'simpleAddition'    => array( 'correct' => 0, 'attempts' => 0 ),
			'simpleSubtraction' => array( 'correct' => 0, 'attempts' => 0 ),
			'complements'       => array( 'correct' => 0, 'attempts' => 0 ),
			'mentalMath'        => array( 'correct' => 0, 'attempts' => 0 ),
		);
	}

	public static function get_user_profiles( $user_id ) {
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . self::table_profiles() . ' WHERE user_id = %d ORDER BY id ASC',
				absint( $user_id )
			),
			ARRAY_A
		);

		return array_map( array( __CLASS__, 'format_profile_row' ), $rows );
	}

	public static function upsert_profile( $user_id, $payload ) {
		global $wpdb;
		$t_profiles = self::table_profiles();

		$client_id = sanitize_text_field( $payload['id'] ?? ( 'child_' . time() . '_' . wp_rand( 100, 999 ) ) );
		$existing  = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id, avatar_url FROM {$t_profiles} WHERE user_id = %d AND client_profile_id = %s",
				absint( $user_id ),
				$client_id
			),
			ARRAY_A
		);

		$existing_avatar_url = is_array( $existing ) ? (string) ( $existing['avatar_url'] ?? '' ) : '';
		$avatar_url_to_save  = $existing_avatar_url;
		if ( array_key_exists( 'avatarUrl', $payload ) ) {
			$raw_avatar_url = trim( (string) $payload['avatarUrl'] );
			if ( $raw_avatar_url === '' ) {
				$avatar_url_to_save = '';
			} elseif ( stripos( $raw_avatar_url, 'data:image/' ) !== 0 ) {
				$parsed_av = wp_parse_url( $raw_avatar_url );
				if ( is_array( $parsed_av ) && ! empty( $parsed_av['scheme'] ) && in_array( strtolower( $parsed_av['scheme'] ), array( 'http', 'https' ), true ) ) {
					$avatar_url_to_save = esc_url_raw( $raw_avatar_url );
				}
			}
		}

		$clean_name = sanitize_text_field( $payload['name'] ?? '' );
		if ( trim( $clean_name ) === '' ) {
			$clean_name = 'کیا';
		}

		$data = array(
			'user_id'           => absint( $user_id ),
			'client_profile_id' => $client_id,
			'name'              => $clean_name,
			'avatar'            => sanitize_key( $payload['avatar'] ?? 'owl' ),
			'avatar_url'        => $avatar_url_to_save,
			'age'               => max( 3, min( 15, absint( $payload['age'] ?? 6 ) ) ),
			'total_stars'       => max( 0, intval( $payload['totalStars'] ?? 0 ) ),
			'practice_minutes'  => max( 0, intval( $payload['practiceMinutes'] ?? 0 ) ),
			'total_correct'     => max( 0, intval( $payload['totalCorrect'] ?? 0 ) ),
			'total_attempts'    => max( 0, intval( $payload['totalAttempts'] ?? 0 ) ),
			'difficulty_level'  => max( 1, min( 5, absint( $payload['difficultyLevel'] ?? 1 ) ) ),
			'lessons_json'      => wp_json_encode( $payload['lessons'] ?? new stdClass() ),
			'skills_json'       => wp_json_encode( $payload['skills'] ?? self::default_skills_map() ),
			'badges_json'       => wp_json_encode( $payload['badges'] ?? array() ),
			'reward_points'     => max( 0, intval( $payload['rewardPoints'] ?? 0 ) ),
			'daily_bonus_json'  => wp_json_encode(
				$payload['dailyBonus'] ?? array(
					'streak'           => 0,
					'lastClaimDate'    => '',
					'totalDaysClaimed' => 0,
					'history'          => array(),
				)
			),
			'created_at'        => ! empty( $payload['createdAt'] ) ? intval( $payload['createdAt'] ) : ( time() * 1000 ),
		);

		if ( $existing ) {
			$wpdb->update(
				$t_profiles,
				$data,
				array( 'id' => (int) $existing['id'] )
			);
		} else {
			$wpdb->insert( $t_profiles, $data );
		}

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$t_profiles} WHERE user_id = %d AND client_profile_id = %s",
				absint( $user_id ),
				$client_id
			),
			ARRAY_A
		);

		return $row ? self::format_profile_row( $row ) : null;
	}

	/**
	 * Fetch public child heroes leaderboard sorted by stars, reward points, or streak.
	 * Only exposes safe public game metrics (no parent PII, emails, phones, or addresses).
	 */
	public static function get_leaderboard( $sort = 'stars', $limit = 30, $current_user_id = 0 ) {
		global $wpdb;
		$t_profiles      = self::table_profiles();
		$limit           = max( 5, min( 100, absint( $limit ) ) );
		$current_user_id = absint( $current_user_id );
		$safe_sort       = in_array( $sort, array( 'stars', 'points', 'streak' ), true ) ? $sort : 'stars';

		$rows = $wpdb->get_results(
			"SELECT id, user_id, client_profile_id, name, avatar, avatar_url, age, total_stars, practice_minutes, total_correct, total_attempts, badges_json, reward_points, daily_bonus_json
			 FROM {$t_profiles}
			 ORDER BY total_stars DESC, reward_points DESC, total_correct DESC, id ASC
			 LIMIT 200",
			ARRAY_A
		);

		$entries = array();
		if ( is_array( $rows ) ) {
			foreach ( $rows as $row ) {
				$badges      = json_decode( $row['badges_json'] ?? '[]', true );
				$daily_bonus = json_decode( $row['daily_bonus_json'] ?? '{}', true );
				$attempts    = max( 0, (int) $row['total_attempts'] );
				$correct     = max( 0, (int) $row['total_correct'] );
				$accuracy    = $attempts > 0 ? min( 100, (int) round( ( $correct / $attempts ) * 100 ) ) : 0;
				$streak      = is_array( $daily_bonus ) && isset( $daily_bonus['streak'] ) ? max( 0, (int) $daily_bonus['streak'] ) : 0;

				$entries[] = array(
					'rank'            => 0,
					'profileId'       => (string) $row['client_profile_id'],
					'name'            => sanitize_text_field( (string) ( $row['name'] ?: 'کیا' ) ),
					'avatar'          => sanitize_key( (string) ( $row['avatar'] ?: 'owl' ) ),
					'avatarUrl'       => esc_url_raw( (string) ( $row['avatar_url'] ?? '' ) ),
					'age'             => max( 3, min( 15, (int) $row['age'] ) ),
					'totalStars'      => max( 0, (int) $row['total_stars'] ),
					'rewardPoints'    => max( 0, (int) ( $row['reward_points'] ?? 0 ) ),
					'badgesCount'     => is_array( $badges ) ? count( $badges ) : 0,
					'streak'          => $streak,
					'practiceMinutes' => max( 0, (int) $row['practice_minutes'] ),
					'accuracy'        => $accuracy,
					'isCurrentUser'   => $current_user_id > 0 && (int) $row['user_id'] === $current_user_id,
				);
			}
		}

		usort(
			$entries,
			static function ( $a, $b ) use ( $safe_sort ) {
				if ( $safe_sort === 'points' ) {
					if ( $b['rewardPoints'] !== $a['rewardPoints'] ) {
						return $b['rewardPoints'] <=> $a['rewardPoints'];
					}
				} elseif ( $safe_sort === 'streak' ) {
					if ( $b['streak'] !== $a['streak'] ) {
						return $b['streak'] <=> $a['streak'];
					}
				}
				if ( $b['totalStars'] !== $a['totalStars'] ) {
					return $b['totalStars'] <=> $a['totalStars'];
				}
				if ( $b['rewardPoints'] !== $a['rewardPoints'] ) {
					return $b['rewardPoints'] <=> $a['rewardPoints'];
				}
				return $b['badgesCount'] <=> $a['badgesCount'];
			}
		);

		$total_participants = count( $entries );
		$my_best_entry      = null;

		foreach ( $entries as $idx => &$entry ) {
			$entry['rank'] = $idx + 1;
			if ( ! empty( $entry['isCurrentUser'] ) && $my_best_entry === null ) {
				$my_best_entry = $entry;
			}
		}
		unset( $entry );

		return array(
			'sort'              => $safe_sort,
			'entries'           => array_slice( $entries, 0, $limit ),
			'myBestEntry'       => $my_best_entry,
			'totalParticipants' => $total_participants,
		);
	}

	private static function get_default_terms_seed() {
		return array(
			array(
				'slug'              => 'term-1-starter',
				'term_number'       => 1,
				'title'             => 'ترم ۱: مزرعه آفتابی اعداد',
				'subtitle'          => 'ترم استارتر رایگان — آشنایی با چرتکه و جمع و تفریق پایه',
				'story_title'       => 'ماجراجویی مزرعه آفتابی کیا',
				'story_description' => 'سلام قهرمان! کیا به مزرعه آفتابی آمده تا به دوستاش کمک کنه گوسفندها، دانه‌های گندم و سیب‌های باغ رو با چرتکه بشمارن.',
				'biome'             => 'farm',
				'accent_color'      => '#4BB543',
				'is_free'           => 1,
				'price_amount'      => 0,
			),
			array(
				'slug'              => 'term-2-forest',
				'term_number'       => 2,
				'title'             => 'ترم ۲: جنگل دوستی‌های جادویی',
				'subtitle'          => 'مکمل‌های ۵ و ۱۰ و رمزگشایی سریع مهره‌ها',
				'story_title'       => 'راز پل رنگین‌کمان در جنگل جادویی',
				'story_description' => 'در جنگل جادویی، دوستان ۵ و ۱۰ منتظر تو هستند! هر مرحله را حل کن تا چراغ‌های پل رنگین‌کمانی روشن شود.',
				'biome'             => 'forest',
				'accent_color'      => '#8E63EB',
				'is_free'           => 0,
				'price_amount'      => 190000,
			),
			array(
				'slug'              => 'term-3-island',
				'term_number'       => 3,
				'title'             => 'ترم ۳: جزیره گنج اعداد بزرگ',
				'subtitle'          => 'اعداد دو و سه رقمی و محاسبات ذهنی سریع',
				'story_title'       => 'سفر دریایی کاپیتان کیا به جزیره گنج',
				'story_description' => 'سوار قایق بادبانی شو! از فانوس دریایی بگذر و با محاسبه ذهنی کلید صندوقچه جواهرات را پیدا کن.',
				'biome'             => 'island',
				'accent_color'      => '#0EA5E9',
				'is_free'           => 0,
				'price_amount'      => 290000,
			),
		);
	}

	private static function get_default_stages_seed() {
		return array(
			// Term 1 (Free Starter Farm)
			array(
				'term_slug'          => 'term-1-starter',
				'slug'               => 'stage-1-intro',
				'stage_number'       => 1,
				'title'              => 'انبار قرمز چرتکه (اعداد ۱ تا ۹)',
				'short_goal'         => 'شناخت مهره ۵ و ۱ و ساخت اعداد یک‌رقمی',
				'story_caption'      => 'اولین ایستگاه در انبار قرمز مزرعه! بیایید مهره‌های زمین و آسمان را بشماریم.',
				'landmark'           => 'barn',
				'skill'              => 'recognition',
				'columns_count'      => 1,
				'unlock_requirement' => '',
				'icon_name'          => 'sparkles',
				'accent_color'       => '#EE5D48',
				'steps'              => array(
					array(
						'step_slug'           => 's1-1',
						'title'               => 'سلام چرتکه!',
						'instruction'         => 'این چرتکه سوروبان است! هر مهره پایینی ارزش ۱ دارد. یکی از مهره‌های پایینی را به میله وسط بچسبان تا عدد ۱ ساخته شود.',
						'spoken_text'         => 'سلام! هر مهره پایینی ارزش یک دارد. یکی از مهره‌های پایینی را به میله وسط نزدیک کن تا عدد یک ساخته شود.',
						'initial_value'       => 0,
						'target_value'        => 1,
						'columns_count'       => 1,
						'require_interaction' => 1,
						'auto_demo_steps'     => 0,
						'highlight_column'    => 0,
					),
					array(
						'step_slug'           => 's1-2',
						'title'               => 'مهره‌های پایینی: عدد ۳',
						'instruction'         => 'وقتی مهره‌ها به میله وسط نزدیک می‌شوند فعال هستند! حالا ۳ مهره پایینی را بالا بیاور تا عدد ۳ بسازی.',
						'spoken_text'         => 'آفرین! حالا سه مهره پایینی را بالا بیاور تا عدد سه ساخته شود.',
						'initial_value'       => 0,
						'target_value'        => 3,
						'columns_count'       => 1,
						'require_interaction' => 1,
						'auto_demo_steps'     => 0,
						'highlight_column'    => 0,
					),
					array(
						'step_slug'           => 's1-3',
						'title'               => 'مهره جادویی ۵',
						'instruction'         => 'مهره نارنجی بالایی ارزش ۵ دارد! آن را پایین بیاور تا به میله وسط برسد.',
						'spoken_text'         => 'مهره نارنجی بالایی ارزش پنج دارد. آن را پایین بیاور تا عدد پنج را بسازی.',
						'initial_value'       => 0,
						'target_value'        => 5,
						'columns_count'       => 1,
						'require_interaction' => 1,
						'auto_demo_steps'     => 0,
						'highlight_column'    => 0,
					),
					array(
						'step_slug'           => 's1-4',
						'title'               => 'ترکیب ۵ و ۲ = ۷',
						'instruction'         => 'برای ساخت عدد ۷، مهره ۵ را پایین بیاور و ۲ مهره پایینی را بالا ببر!',
						'spoken_text'         => 'برای ساخت عدد هفت، مهره پنج را پایین بیاور و دو مهره پایینی را بالا ببر.',
						'initial_value'       => 0,
						'target_value'        => 7,
						'columns_count'       => 1,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
						'highlight_column'    => 0,
					),
				),
			),
			array(
				'term_slug'          => 'term-1-starter',
				'slug'               => 'stage-2-place-value',
				'stage_number'       => 2,
				'title'              => 'آسیاب بادی یکان و دهگان',
				'short_goal'         => 'شناخت یکان، دهگان و صدگان با اعداد ۲ و ۳ رقمی',
				'story_caption'      => 'کنار آسیاب بادی مزرعه، گونی‌های گندم را دسته‌های ده‌تایی می‌کنیم!',
				'landmark'           => 'windmill',
				'skill'              => 'placeValue',
				'columns_count'      => 3,
				'unlock_requirement' => 'stage-1-intro',
				'icon_name'          => 'layers',
				'accent_color'       => '#F59E0B',
				'steps'              => array(
					array(
						'step_slug'           => 's2-1',
						'title'               => 'ستون دهگان (۱۰)',
						'instruction'         => 'ستون سمت راست «یکان» است و ستون وسط «دهگان»! در ستون وسط ۱ مهره پایینی بالا ببر تا عدد ۱۰ بسازی.',
						'spoken_text'         => 'در ستون وسط یک مهره پایینی بالا ببر تا عدد ده ساخته شود.',
						'initial_value'       => 0,
						'target_value'        => 10,
						'columns_count'       => 3,
						'require_interaction' => 1,
						'highlight_column'    => 1,
					),
					array(
						'step_slug'           => 's2-2',
						'title'               => 'ساختن عدد ۲۴',
						'instruction'         => 'برای ۲۴: دو مهره در ستون دهگان (۲۰) و چهار مهره در ستون یکان (۴) بالا ببر.',
						'spoken_text'         => 'برای ساختن عدد بیست و چهار، دو مهره در ستون دهگان و چهار مهره در ستون یکان بالا ببر.',
						'initial_value'       => 0,
						'target_value'        => 24,
						'columns_count'       => 3,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),
			array(
				'term_slug'          => 'term-1-starter',
				'slug'               => 'stage-3-addition',
				'stage_number'       => 3,
				'title'              => 'مزرعه گندم و جمع ساده',
				'short_goal'         => 'جمع مستقیم با مهره‌های چرتکه',
				'story_caption'      => 'خوشه‌های طلایی گندم را به سبد کشاورز اضافه کن!',
				'landmark'           => 'wheat',
				'skill'              => 'simpleAddition',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-2-place-value',
				'icon_name'          => 'plus',
				'accent_color'       => '#4BB543',
				'steps'              => array(
					array(
						'step_slug'           => 's3-1',
						'title'               => '۲ + ۲ = ۴',
						'instruction'         => 'روی چرتکه عدد ۲ آماده است. ۲ مهره دیگر بالا بیاور تا جواب ۴ را ببینی!',
						'spoken_text'         => 'عدد دو روی چرتکه است. دو مهره دیگر اضافه کن تا چهار شود.',
						'initial_value'       => 2,
						'target_value'        => 4,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
					array(
						'step_slug'           => 's3-2',
						'title'               => '۱۲ + ۱۵ = ۲۷',
						'instruction'         => 'یک دهگان و یک ۵ اضافه کن! انیمیشن حل را ببین و خودت انجامش بده.',
						'spoken_text'         => 'دوازده به اضافه پانزده را با چرتکه حساب کن تا به بیست و هفت برسی.',
						'initial_value'       => 12,
						'target_value'        => 27,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),
			array(
				'term_slug'          => 'term-1-starter',
				'slug'               => 'stage-4-subtraction',
				'stage_number'       => 4,
				'title'              => 'باغ آفتاب‌گردان و تفریق ساده',
				'short_goal'         => 'کم کردن مهره‌ها با دور کردن از میله وسط',
				'story_caption'      => 'چند گل آفتاب‌گردان چیدیم؟ بیایید با کم کردن مهره‌ها حساب کنیم!',
				'landmark'           => 'garden',
				'skill'              => 'simpleSubtraction',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-3-addition',
				'icon_name'          => 'minus',
				'accent_color'       => '#F59E0B',
				'steps'              => array(
					array(
						'step_slug'           => 's4-1',
						'title'               => '۴ - ۲ = ۲',
						'instruction'         => 'چرتکه عدد ۴ را نشان می‌دهد. ۲ مهره پایینی را پایین ببر تا ۲ بماند.',
						'spoken_text'         => 'عدد چهار روی چرتکه است. دو مهره را پایین ببر تا عدد دو بماند.',
						'initial_value'       => 4,
						'target_value'        => 2,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
					array(
						'step_slug'           => 's4-2',
						'title'               => '۳۷ - ۱۲ = ۲۵',
						'instruction'         => 'از ۳۷، یک دهگان و دو یکان کم کن تا ۲۵ ساخته شود.',
						'spoken_text'         => 'از سی و هفت، دوازده تا کم کن تا به بیست و پنج برسی.',
						'initial_value'       => 37,
						'target_value'        => 25,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),

			// Term 2 (Paid Forest Adventure)
			array(
				'term_slug'          => 'term-2-forest',
				'slug'               => 'stage-5-complements',
				'stage_number'       => 1,
				'title'              => 'کلبه درختی دوست ۵',
				'short_goal'         => 'جمع و تفریق هوشمندانه با دوستان عدد ۵',
				'story_caption'      => 'برای ورود به کلبه درختی جادویی، رمز دوست ۵ را روی چرتکه بساز!',
				'landmark'           => 'treehouse',
				'skill'              => 'complements',
				'columns_count'      => 2,
				'unlock_requirement' => '',
				'icon_name'          => 'puzzle',
				'accent_color'       => '#8E63EB',
				'steps'              => array(
					array(
						'step_slug'           => 's5-1',
						'title'               => 'دوست ۵: ۳ + ۴ = ۷',
						'instruction'         => 'برای اضافه کردن ۴ به ۳ از دوست ۵ کمک می‌گیریم: مهره ۵ پایین می‌آید و ۱ مهره کم می‌شود.',
						'spoken_text'         => 'برای اضافه کردن چهار به سه، مهره پنج را پایین بیاور و یک مهره پایینی را کم کن.',
						'initial_value'       => 3,
						'target_value'        => 7,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
					array(
						'step_slug'           => 's5-2',
						'title'               => 'دوست ۵ در تفریق: ۷ - ۴ = ۳',
						'instruction'         => 'یک مهره پایینی بالا ببر و مهره ۵ را به بالا برگردان.',
						'spoken_text'         => 'برای کم کردن چهار از هفت، یک مهره پایینی اضافه کن و مهره پنج را بالا ببر.',
						'initial_value'       => 7,
						'target_value'        => 3,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),
			array(
				'term_slug'          => 'term-2-forest',
				'slug'               => 'stage-6-ten-friends',
				'stage_number'       => 2,
				'title'              => 'پل معلق دوستان ۱۰',
				'short_goal'         => 'عبور به ستون دهگان با کمک دوستان ۱۰',
				'story_caption'      => 'از روی پل رنگین‌کمانی رد شو و دوست‌های عدد ۱۰ را صدا بزن!',
				'landmark'           => 'bridge',
				'skill'              => 'complements',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-5-complements',
				'icon_name'          => 'sparkles',
				'accent_color'       => '#EC5E95',
				'steps'              => array(
					array(
						'step_slug'           => 's6-t2-1',
						'title'               => 'دوست ۱۰: ۶ + ۷ = ۱۳',
						'instruction'         => 'یک دهگان اضافه کن و ۳ تا از یکان کم کن تا عدد ۱۳ ساخته شود!',
						'spoken_text'         => 'برای شش به اضافه هفت، یک دهگان اضافه کن و سه تا از یکان کم کن.',
						'initial_value'       => 6,
						'target_value'        => 13,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),
			array(
				'term_slug'          => 'term-2-forest',
				'slug'               => 'stage-7-waterfall',
				'stage_number'       => 3,
				'title'              => 'آبشار جادویی و قصر جغد دانا',
				'short_goal'         => 'تمرین سرعتی مکمل‌های ترکیبی',
				'story_caption'      => 'در کنار آبشار جادویی، قهرمانان با سرعت نور چرتکه می‌زنند!',
				'landmark'           => 'waterfall',
				'skill'              => 'mentalMath',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-6-ten-friends',
				'icon_name'          => 'brain',
				'accent_color'       => '#4BB543',
				'steps'              => array(
					array(
						'step_slug'           => 's7-t2-1',
						'title'               => 'معمای آبشار: ۸ + ۵ = ۱۳',
						'instruction'         => 'برای اضافه کردن ۵ به ۸، یک دهگان اضافه کن و ۵ تا کم کن!',
						'spoken_text'         => 'هشت به اضافه پنج را با کمک ستون دهگان حل کن.',
						'initial_value'       => 8,
						'target_value'        => 13,
						'columns_count'       => 2,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),

			// Term 3 (Paid Treasure Island Adventure)
			array(
				'term_slug'          => 'term-3-island',
				'slug'               => 'stage-8-island-boat',
				'stage_number'       => 1,
				'title'              => 'قایق بادبانی ده‌ها و صدها',
				'short_goal'         => 'ساخت و جمع اعداد دورقمی و سه‌رقمی',
				'story_caption'      => 'بادبان‌ها را بکش! برای رسیدن به جزیره باید جمع اعداد دو رقمی را بلد باشی.',
				'landmark'           => 'boat',
				'skill'              => 'placeValue',
				'columns_count'      => 3,
				'unlock_requirement' => '',
				'icon_name'          => 'layers',
				'accent_color'       => '#0EA5E9',
				'steps'              => array(
					array(
						'step_slug'           => 's8-t3-1',
						'title'               => 'ساخت عدد ۱۲۵',
						'instruction'         => '۱ صدگان، ۲ دهگان و ۵ یکان را بچسبان تا قطب‌نمای کشتی روشن شود.',
						'spoken_text'         => 'عدد صد و بیست و پنج را روی سه ستون چرتکه بساز.',
						'initial_value'       => 0,
						'target_value'        => 125,
						'columns_count'       => 3,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),
			array(
				'term_slug'          => 'term-3-island',
				'slug'               => 'stage-9-treasure-chest',
				'stage_number'       => 2,
				'title'              => 'فانوس دریایی و صندوقچه گنج',
				'short_goal'         => 'تصویرسازی ذهنی چرتکه برای باز کردن گنج',
				'story_caption'      => 'آخرین ایستگاه! رمز صندوقچه گنج کاپیتان کیا در ذهن توست.',
				'landmark'           => 'chest',
				'skill'              => 'mentalMath',
				'columns_count'      => 3,
				'unlock_requirement' => 'stage-8-island-boat',
				'icon_name'          => 'brain',
				'accent_color'       => '#F59E0B',
				'steps'              => array(
					array(
						'step_slug'           => 's9-t3-1',
						'title'               => 'رمز صندوقچه: ۱۰ + ۵ = ۱۵',
						'instruction'         => 'در ذهن خودت حساب کن و عدد ۱۵ را بساز تا صندوقچه باز شود!',
						'spoken_text'         => 'ده به اضافه پنج در ذهنت چند می‌شود؟ عدد پانزده را بساز.',
						'initial_value'       => 10,
						'target_value'        => 15,
						'columns_count'       => 3,
						'require_interaction' => 1,
						'auto_demo_steps'     => 1,
					),
				),
			),
		);
	}

	private static function get_default_questions_seed() {
		return array(
			array(
				'skill'          => 'recognition',
				'difficulty'     => 1,
				'columns_count'  => 1,
				'prompt_text'    => 'عدد ۴ را روی چرتکه بساز',
				'spoken_text'    => 'عدد چهار را روی چرتکه بساز',
				'start_value'    => 0,
				'target_value'   => 4,
				'visual_type'    => 'objects',
				'visual_count_a' => 4,
				'visual_count_b' => null,
				'visual_emoji'   => 'apple',
				'operation'      => null,
			),
			array(
				'skill'          => 'recognition',
				'difficulty'     => 2,
				'columns_count'  => 1,
				'prompt_text'    => 'عدد ۸ را با مهره ۵ و مهره‌های ۱ بساز',
				'spoken_text'    => 'عدد هشت را با چرتکه بساز',
				'start_value'    => 0,
				'target_value'   => 8,
				'visual_type'    => 'objects',
				'visual_count_a' => 8,
				'visual_count_b' => null,
				'visual_emoji'   => 'star',
				'operation'      => null,
			),
			array(
				'skill'          => 'simpleAddition',
				'difficulty'     => 1,
				'columns_count'  => 1,
				'prompt_text'    => '۳ + ۵ چند می‌شود؟',
				'spoken_text'    => 'سه به اضافه پنج چند می‌شود؟ روی چرتکه نشان بده.',
				'start_value'    => 3,
				'target_value'   => 8,
				'visual_type'    => 'objects',
				'visual_count_a' => 3,
				'visual_count_b' => 5,
				'visual_emoji'   => 'balloon',
				'operation'      => '+',
			),
			array(
				'skill'          => 'complements',
				'difficulty'     => 2,
				'columns_count'  => 2,
				'prompt_text'    => 'با دوست ۱۰ حل کن: ۶ + ۷ = ؟',
				'spoken_text'    => 'با دوست ده حل کن: شش به اضافه هفت چند می‌شود؟',
				'start_value'    => 6,
				'target_value'   => 13,
				'visual_type'    => 'number',
				'visual_count_a' => null,
				'visual_count_b' => null,
				'visual_emoji'   => 'star',
				'operation'      => '+',
			),
			array(
				'skill'          => 'mentalMath',
				'difficulty'     => 2,
				'columns_count'  => 2,
				'prompt_text'    => 'ذهنی حساب کن: ۱۰ + ۵ = ؟',
				'spoken_text'    => 'در ذهنت حساب کن: ده به اضافه پنج چند می‌شود؟',
				'start_value'    => 10,
				'target_value'   => 15,
				'visual_type'    => 'mental-flash',
				'visual_count_a' => null,
				'visual_count_b' => null,
				'visual_emoji'   => 'pencil',
				'operation'      => '+',
			),
		);
	}
}
