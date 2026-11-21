<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class KN_DB {

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

	/**
	 * Create custom database tables via dbDelta.
	 */
	public static function install_tables() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();

		$t_stages    = self::table_stages();
		$t_steps     = self::table_steps();
		$t_questions = self::table_questions();
		$t_profiles  = self::table_profiles();
		$t_tokens    = self::table_tokens();

		$sql_stages = "CREATE TABLE {$t_stages} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			slug varchar(100) NOT NULL,
			stage_number int(11) NOT NULL DEFAULT 1,
			title varchar(255) NOT NULL,
			short_goal text NOT NULL,
			skill varchar(60) NOT NULL DEFAULT 'recognition',
			columns_count tinyint(3) unsigned NOT NULL DEFAULT 1,
			unlock_requirement varchar(100) DEFAULT '',
			icon_name varchar(40) NOT NULL DEFAULT 'sparkles',
			accent_color varchar(20) NOT NULL DEFAULT '#0EA5E9',
			is_active tinyint(1) NOT NULL DEFAULT 1,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY slug (slug),
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
			skill varchar(60) NOT NULL DEFAULT 'recognition',
			difficulty tinyint(3) unsigned NOT NULL DEFAULT 1,
			columns_count tinyint(3) unsigned NOT NULL DEFAULT 1,
			prompt_text text NOT NULL,
			spoken_text text NOT NULL,
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
			KEY skill_diff (skill, difficulty),
			KEY is_active (is_active)
		) {$charset_collate};";

		$sql_profiles = "CREATE TABLE {$t_profiles} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			client_profile_id varchar(80) NOT NULL,
			name varchar(120) NOT NULL,
			avatar varchar(40) NOT NULL DEFAULT 'owl',
			age tinyint(3) unsigned NOT NULL DEFAULT 6,
			total_stars int(11) NOT NULL DEFAULT 0,
			practice_minutes int(11) NOT NULL DEFAULT 0,
			total_correct int(11) NOT NULL DEFAULT 0,
			total_attempts int(11) NOT NULL DEFAULT 0,
			difficulty_level tinyint(3) unsigned NOT NULL DEFAULT 1,
			lessons_json longtext NOT NULL,
			skills_json longtext NOT NULL,
			badges_json longtext NOT NULL,
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

		dbDelta( $sql_stages );
		dbDelta( $sql_steps );
		dbDelta( $sql_questions );
		dbDelta( $sql_profiles );
		dbDelta( $sql_tokens );
	}

	/**
	 * Seed the 6 core Persian Soroban stages, steps, and starter questions if empty.
	 */
	public static function seed_defaults_if_empty() {
		global $wpdb;
		$t_stages = self::table_stages();
		$count    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_stages}" );

		if ( $count === 0 ) {
			$default_stages = self::get_default_stages_seed();
			foreach ( $default_stages as $stage ) {
				$steps = $stage['steps'];
				unset( $stage['steps'] );

				$wpdb->insert(
					$t_stages,
					array(
						'slug'               => $stage['slug'],
						'stage_number'       => $stage['stage_number'],
						'title'              => $stage['title'],
						'short_goal'         => $stage['short_goal'],
						'skill'              => $stage['skill'],
						'columns_count'      => $stage['columns_count'],
						'unlock_requirement' => $stage['unlock_requirement'],
						'icon_name'          => $stage['icon_name'],
						'accent_color'       => $stage['accent_color'],
						'is_active'          => 1,
					),
					array( '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%d' )
				);

				$stage_id = (int) $wpdb->insert_id;
				if ( $stage_id > 0 && ! empty( $steps ) ) {
					foreach ( $steps as $idx => $step ) {
						self::insert_step( $stage_id, $idx + 1, $step );
					}
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
					),
					array( '%s', '%d', '%d', '%s', '%s', '%d', '%d', '%s', '%d', '%d', '%s', '%s', '%d' )
				);
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
	 * Fetch full dynamic curriculum (stages + nested steps) formatted for frontend.
	 */
	public static function get_curriculum( $only_active = true ) {
		global $wpdb;
		$t_stages = self::table_stages();
		$t_steps  = self::table_steps();

		$where  = $only_active ? 'WHERE is_active = 1' : '';
		$stages = $wpdb->get_results( "SELECT * FROM {$t_stages} {$where} ORDER BY stage_number ASC, id ASC", ARRAY_A );

		if ( empty( $stages ) ) {
			return array();
		}

		$result = array();
		foreach ( $stages as $st ) {
			$steps_raw = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM {$t_steps} WHERE stage_id = %d ORDER BY step_order ASC, id ASC",
					$st['id']
				),
				ARRAY_A
			);

			$steps = array();
			foreach ( $steps_raw as $sp ) {
				$step_item = array(
					'id'                 => $sp['step_slug'],
					'dbId'               => (int) $sp['id'],
					'title'              => $sp['title'],
					'instruction'        => $sp['instruction'],
					'spokenText'         => $sp['spoken_text'],
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
				'stageNumber'  => (int) $st['stage_number'],
				'title'        => $st['title'],
				'shortGoal'    => $st['short_goal'],
				'skill'        => $st['skill'],
				'columns'      => (int) $st['columns_count'],
				'iconName'     => $st['icon_name'],
				'accentColor'  => $st['accent_color'],
				'isActive'     => (bool) $st['is_active'],
				'steps'        => $steps,
			);
			if ( ! empty( $st['unlock_requirement'] ) ) {
				$stage_item['unlockRequirement'] = $st['unlock_requirement'];
			}

			$result[] = $stage_item;
		}

		return $result;
	}

	/**
	 * Fetch practice questions formatted for frontend.
	 */
	public static function get_questions( $skill = '', $difficulty = 0, $only_active = true ) {
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
				'id'           => 'wp_q_' . $row['id'],
				'dbId'         => (int) $row['id'],
				'skill'        => $row['skill'],
				'difficulty'   => (int) $row['difficulty'],
				'columns'      => (int) $row['columns_count'],
				'promptText'   => $row['prompt_text'],
				'spokenText'   => $row['spoken_text'],
				'startValue'   => (int) $row['start_value'],
				'targetValue'  => (int) $row['target_value'],
				'visualType'   => $row['visual_type'],
				'visualEmoji'  => $row['visual_emoji'],
				'isActive'     => (bool) $row['is_active'],
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
	 * Format a child profile database row to React ChildProfile JSON.
	 */
	public static function format_profile_row( $row ) {
		$lessons = json_decode( $row['lessons_json'], true );
		$skills  = json_decode( $row['skills_json'], true );
		$badges  = json_decode( $row['badges_json'], true );

		return array(
			'id'              => $row['client_profile_id'],
			'dbId'            => (int) $row['id'],
			'userId'          => (int) $row['user_id'],
			'name'            => $row['name'],
			'avatar'          => $row['avatar'],
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
				"SELECT id FROM {$t_profiles} WHERE user_id = %d AND client_profile_id = %s",
				absint( $user_id ),
				$client_id
			),
			ARRAY_A
		);

		$data = array(
			'user_id'           => absint( $user_id ),
			'client_profile_id' => $client_id,
			'name'              => sanitize_text_field( $payload['name'] ?? 'قهرمان کوچک' ),
			'avatar'            => sanitize_key( $payload['avatar'] ?? 'owl' ),
			'age'               => max( 3, min( 15, absint( $payload['age'] ?? 6 ) ) ),
			'total_stars'       => max( 0, intval( $payload['totalStars'] ?? 0 ) ),
			'practice_minutes'  => max( 0, intval( $payload['practiceMinutes'] ?? 0 ) ),
			'total_correct'     => max( 0, intval( $payload['totalCorrect'] ?? 0 ) ),
			'total_attempts'    => max( 0, intval( $payload['totalAttempts'] ?? 0 ) ),
			'difficulty_level'  => max( 1, min( 5, absint( $payload['difficultyLevel'] ?? 1 ) ) ),
			'lessons_json'      => wp_json_encode( $payload['lessons'] ?? new stdClass() ),
			'skills_json'       => wp_json_encode( $payload['skills'] ?? self::default_skills_map() ),
			'badges_json'       => wp_json_encode( $payload['badges'] ?? array() ),
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

	private static function get_default_stages_seed() {
		return array(
			array(
				'slug'               => 'stage-1-intro',
				'stage_number'       => 1,
				'title'              => 'آشنایی با چرتکه و اعداد ۰ تا ۹',
				'short_goal'         => 'شناخت مهره ۵ و ۱ و ساخت اعداد یک‌رقمی',
				'skill'              => 'recognition',
				'columns_count'      => 1,
				'unlock_requirement' => '',
				'icon_name'          => 'sparkles',
				'accent_color'       => '#0EA5E9',
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
				'slug'               => 'stage-2-place-value',
				'stage_number'       => 2,
				'title'              => 'اعداد و ارزش مکانی',
				'short_goal'         => 'شناخت یکان، دهگان و صدگان با اعداد ۲ و ۳ رقمی',
				'skill'              => 'placeValue',
				'columns_count'      => 3,
				'unlock_requirement' => 'stage-1-intro',
				'icon_name'          => 'layers',
				'accent_color'       => '#10B981',
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
				'slug'               => 'stage-3-addition',
				'stage_number'       => 3,
				'title'              => 'جمع ساده',
				'short_goal'         => 'جمع مستقیم با مهره‌های چرتکه',
				'skill'              => 'simpleAddition',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-2-place-value',
				'icon_name'          => 'plus',
				'accent_color'       => '#2563EB',
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
				'slug'               => 'stage-4-subtraction',
				'stage_number'       => 4,
				'title'              => 'تفریق ساده',
				'short_goal'         => 'کم کردن مهره‌ها با دور کردن از میله وسط',
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
			array(
				'slug'               => 'stage-5-complements',
				'stage_number'       => 5,
				'title'              => 'مکمل‌های ۵ و ۱۰',
				'short_goal'         => 'حل مسائل هوشمندانه‌تر با دوستان ۵ و ۱۰',
				'skill'              => 'complements',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-4-subtraction',
				'icon_name'          => 'puzzle',
				'accent_color'       => '#8B5CF6',
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
				'slug'               => 'stage-6-mental',
				'stage_number'       => 6,
				'title'              => 'محاسبات ذهنی مقدماتی',
				'short_goal'         => 'تصویرسازی ذهنی چرتکه با نمایش کوتاه و صدا',
				'skill'              => 'mentalMath',
				'columns_count'      => 2,
				'unlock_requirement' => 'stage-5-complements',
				'icon_name'          => 'brain',
				'accent_color'       => '#EC4899',
				'steps'              => array(
					array(
						'step_slug'           => 's6-1',
						'title'               => 'چرتکه در ذهن من',
						'instruction'         => 'مهره‌ها را در ذهنت نگه دار: ۲ + ۵ چند می‌شود؟ عدد ۷ را بساز!',
						'spoken_text'         => 'چرتکه را در ذهنت تصور کن. دو به اضافه پنج چند می‌شود؟',
						'initial_value'       => 2,
						'target_value'        => 7,
						'columns_count'       => 2,
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
