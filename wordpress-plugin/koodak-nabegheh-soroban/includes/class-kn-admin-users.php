<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Full Users CRM, Per-User Orders/Activity Reports, Active Session Tokens, Entitlements & Child Profiles Manager.
 */
class KN_Admin_Users {

	private static $avatars = array(
		'owl'    => 'جغد دانا',
		'fox'    => 'روباه زرنگ',
		'rabbit' => 'خرگوش شاد',
		'bear'   => 'خرس مهربان',
		'panda'  => 'پاندا باهوش',
		'star'   => 'ستاره درخشان',
	);

	private static $log_labels = array(
		'login_password'  => 'ورود با رمز عبور',
		'login_otp'       => 'ورود با پیامک OTP',
		'register'        => 'ثبت‌نام حساب جدید',
		'logout'          => 'خروج از حساب',
		'session_restore' => 'بازگردانی خودکار نشست',
		'app_visit'       => 'بازدید از اپلیکیشن',
	);

	public static function render_page() {
		$detail_uid = absint( $_GET['user_id'] ?? 0 );
		if ( $detail_uid > 0 ) {
			self::render_user_detail_report( $detail_uid );
			return;
		}
		self::render_users_directory();
	}

	private static function render_users_directory() {
		global $wpdb;

		$search_q   = sanitize_text_field( wp_unslash( $_GET['s_user'] ?? '' ) );
		$t_profiles = KN_DB::table_profiles();
		$t_ent      = KN_DB::table_entitlements();

		$user_args = array(
			'number'  => 120,
			'orderby' => 'ID',
			'order'   => 'DESC',
		);
		if ( $search_q !== '' ) {
			$user_args['search']         = '*' . $search_q . '*';
			$user_args['search_columns'] = array( 'user_login', 'user_email', 'display_name' );
		}
		$wp_users = get_users( $user_args );

		// Aggregate counts per user without N+1 queries
		$prof_counts = array();
		$p_rows      = $wpdb->get_results( "SELECT user_id, COUNT(*) AS cnt, COALESCE(SUM(total_stars), 0) AS stars FROM {$t_profiles} GROUP BY user_id", ARRAY_A );
		if ( is_array( $p_rows ) ) {
			foreach ( $p_rows as $pr ) {
				$prof_counts[ (int) $pr['user_id'] ] = $pr;
			}
		}

		$ent_counts = array();
		$e_rows     = $wpdb->get_results( "SELECT user_id, COUNT(*) AS cnt FROM {$t_ent} GROUP BY user_id", ARRAY_A );
		if ( is_array( $e_rows ) ) {
			foreach ( $e_rows as $er ) {
				$ent_counts[ (int) $er['user_id'] ] = (int) $er['cnt'];
			}
		}

		$all_profiles = $wpdb->get_results(
			"SELECT p.*, u.user_email, u.user_login, u.display_name FROM {$t_profiles} p LEFT JOIN {$wpdb->users} u ON p.user_id = u.ID ORDER BY p.id DESC LIMIT 120",
			ARRAY_A
		);

		$recent_logs = KN_DB::get_user_logs( 0, 25 );

		KN_Admin::render_shell_open(
			'kn-soroban-users',
			'مدیریت کاربران، پرونده جامع و گزارشات فردی',
			'مدیریت حساب کاربری والدین، پروفایل کودکان، دسترسی ترم‌ها، سفارشات، تاریخچه ورود/خروج و نشست‌های فعال با تاریخ شمسی'
		);
		?>

		<!-- Create User Form -->
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
							<label>شماره موبایل والد / کاربر (الزامی)</label>
							<input type="text" name="mobile" required dir="ltr" placeholder="09123456789" />
						</div>
						<div class="kn-field">
							<label>ایمیل (اختیاری)</label>
							<input type="email" name="email" dir="ltr" placeholder="parent@example.com" />
						</div>
						<div class="kn-field">
							<label>رمز عبور (حداقل ۶ کاراکتر)</label>
							<input type="password" name="password" required minlength="6" dir="ltr" />
						</div>
					</div>
					<div class="kn-grid-3">
						<div class="kn-field">
							<label>نام والد</label>
							<input type="text" name="first_name" placeholder="مثلاً علی" />
						</div>
						<div class="kn-field">
							<label>نام خانوادگی والد</label>
							<input type="text" name="last_name" placeholder="مثلاً رضایی" />
						</div>
						<div class="kn-field">
							<label>استان و شهر</label>
							<div style="display:flex;gap:6px;">
								<input type="text" name="state" placeholder="استان" />
								<input type="text" name="city" placeholder="شهر" />
							</div>
						</div>
					</div>
					<div class="kn-grid-3">
						<div class="kn-field">
							<label>آدرس پستی کامل</label>
							<input type="text" name="address1" placeholder="خیابان، کوچه، پلاک..." />
						</div>
						<div class="kn-field">
							<label>کد پستی</label>
							<input type="text" name="postcode" dir="ltr" placeholder="1234567890" />
						</div>
						<div class="kn-field">
							<label>نام، سن (۴ تا ۱۵) و شخصیت کودک</label>
							<div style="display:flex;gap:6px;">
								<input type="text" name="child_name" required value="کیا" placeholder="نام کودک" />
								<input type="number" name="child_age" value="6" min="4" max="15" style="width:70px;" />
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

		<!-- Users Directory -->
		<div class="kn-card">
			<div class="kn-card-header">
				<h2>فهرست کاربران و گزارش فردی (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $wp_users ) ) ); ?>)</h2>
				<form method="get" style="display:flex;gap:8px;align-items:center;">
					<input type="hidden" name="page" value="kn-soroban-users" />
					<input type="text" name="s_user" class="kn-input-sm" value="<?php echo esc_attr( $search_q ); ?>" placeholder="جستجوی نام، موبایل یا ایمیل..." style="min-width:210px;" />
					<button type="submit" class="kn-btn kn-btn-primary kn-btn-sm">جستجو</button>
				</form>
			</div>

			<div class="kn-table-wrap">
				<table class="kn-table">
					<thead>
						<tr>
							<th>شناسه و نام کاربر</th>
							<th>موبایل / ایمیل</th>
							<th>تاریخ عضویت (شمسی)</th>
							<th>کودکان و ستاره</th>
							<th>ترم‌های فعال</th>
							<th>گزارش و مدیریت کامل</th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $wp_users as $u ) : ?>
							<?php
							$uid      = (int) $u->ID;
							$mobile   = (string) ( get_user_meta( $uid, 'kn_mobile', true ) ?: get_user_meta( $uid, 'billing_phone', true ) );
							$p_stat   = $prof_counts[ $uid ] ?? array( 'cnt' => 0, 'stars' => 0 );
							$e_cnt    = $ent_counts[ $uid ] ?? 0;
							$reg_j    = KN_Jalali::format_date_only( $u->user_registered, true, true );
							?>
							<tr>
								<td>
									<strong>#<?php echo esc_html( KN_Jalali::to_persian_digits( $uid ) ); ?> — <?php echo esc_html( $u->display_name ?: $u->user_login ); ?></strong>
									<div style="font-size:11px;color:var(--kn-ink-subtle);" dir="ltr">@<?php echo esc_html( $u->user_login ); ?></div>
								</td>
								<td>
									<div style="font-weight:700;" dir="ltr"><?php echo esc_html( $mobile ?: '—' ); ?></div>
									<div style="font-size:11px;color:var(--kn-ink-subtle);" dir="ltr"><?php echo esc_html( $u->user_email ); ?></div>
								</td>
								<td style="font-size:12px;"><?php echo esc_html( $reg_j ); ?></td>
								<td>
									<span class="kn-pill kn-pill-violet"><?php echo esc_html( KN_Jalali::to_persian_digits( $p_stat['cnt'] ) ); ?> کودک</span>
									<span class="kn-pill kn-pill-amber">⭐ <?php echo esc_html( KN_Jalali::to_persian_digits( $p_stat['stars'] ) ); ?></span>
								</td>
								<td>
									<span class="kn-pill <?php echo $e_cnt > 0 ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
										<?php echo esc_html( KN_Jalali::to_persian_digits( $e_cnt ) ); ?> ترم پولی
									</span>
								</td>
								<td>
									<a class="kn-btn kn-btn-primary kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users&user_id=' . $uid ) ); ?>">
										گزارش جامع و ویرایش
									</a>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Child Profiles Quick Score Editor -->
		<div class="kn-card">
			<div class="kn-card-header">
				<h2>پروفایل کودکان و ویرایش سریع امتیازات (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $all_profiles ) ) ); ?>)</h2>
				<input type="text" class="kn-input-sm" placeholder="فیلتر جدول کودکان..." data-kn-filter-table="kn-child-profiles-table" style="min-width:190px;" />
			</div>
			<?php if ( empty( $all_profiles ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">هنوز پروفایلی در وردپرس ذخیره نشده است.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table" id="kn-child-profiles-table">
						<thead>
							<tr>
								<th>کودک / تصویر</th>
								<th>حساب والد</th>
								<th>سن</th>
								<th>ستاره</th>
								<th>امتیاز جایزه</th>
								<th>دقیقه تمرین</th>
								<th>سطح</th>
								<th>ذخیره</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $all_profiles as $r ) : ?>
								<?php
								$db_bonus   = ! empty( $r['daily_bonus_json'] ) ? json_decode( $r['daily_bonus_json'], true ) : array();
								$streak_cnt = is_array( $db_bonus ) && isset( $db_bonus['streak'] ) ? intval( $db_bonus['streak'] ) : 0;
								?>
								<tr>
									<form method="post">
										<?php wp_nonce_field( 'kn_admin_update_profile' ); ?>
										<input type="hidden" name="kn_action" value="admin_update_profile" />
										<input type="hidden" name="profile_db_id" value="<?php echo esc_attr( $r['id'] ); ?>" />
										<td>
											<div style="display:flex;align-items:center;gap:8px;">
												<?php if ( ! empty( $r['avatar_url'] ) ) : ?>
													<img src="<?php echo esc_url( $r['avatar_url'] ); ?>" alt="" style="width:34px;height:34px;border-radius:999px;object-fit:cover;border:1px solid var(--kn-border);flex-shrink:0;" />
												<?php endif; ?>
												<div>
													<input type="text" name="name" value="<?php echo esc_attr( $r['name'] ); ?>" class="kn-input-sm" style="width:110px;" />
													<?php if ( $streak_cnt > 0 ) : ?>
														<div style="font-size:10.5px;color:#b45309;margin-top:2px;">🔥 رشته روزانه: <?php echo esc_html( KN_Jalali::to_persian_digits( $streak_cnt ) ); ?> روز</div>
													<?php endif; ?>
												</div>
											</div>
										</td>
										<td>
											<a href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users&user_id=' . $r['user_id'] ) ); ?>" style="font-weight:700;text-decoration:none;color:var(--kn-primary);">
												<?php echo esc_html( $r['display_name'] ?: $r['user_login'] ); ?>
											</a>
											<div style="font-size:11px;color:var(--kn-ink-subtle);" dir="ltr"><?php echo esc_html( $r['user_email'] ); ?></div>
										</td>
										<td><input type="number" name="age" value="<?php echo esc_attr( $r['age'] ); ?>" min="3" max="15" class="kn-input-sm" style="width:58px;" /></td>
										<td><input type="number" name="total_stars" value="<?php echo esc_attr( $r['total_stars'] ); ?>" min="0" class="kn-input-sm" style="width:68px;" /></td>
										<td><input type="number" name="reward_points" value="<?php echo esc_attr( $r['reward_points'] ?? 0 ); ?>" min="0" class="kn-input-sm" style="width:74px;" /></td>
										<td><input type="number" name="practice_minutes" value="<?php echo esc_attr( $r['practice_minutes'] ); ?>" min="0" class="kn-input-sm" style="width:64px;" /></td>
										<td><input type="number" name="difficulty_level" value="<?php echo esc_attr( $r['difficulty_level'] ); ?>" min="1" max="5" class="kn-input-sm" style="width:54px;" /></td>
										<td>
											<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
												<button type="submit" class="kn-btn kn-btn-primary kn-btn-sm">ذخیره</button>
												<label style="font-size:11px;color:var(--kn-red);"><input type="checkbox" name="reset_progress" value="1" /> ریست</label>
											</div>
										</td>
									</form>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>

		<!-- Latest Login/Logout Activity Feed across Users -->
		<div class="kn-card">
			<div class="kn-card-header">
				<h2>آخرین رخدادهای ورود، خروج و ثبت‌نام کاربران</h2>
			</div>
			<?php if ( empty( $recent_logs ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">هنوز رخدادی در سیستم لاگ کاربران ثبت نشده است.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table">
						<thead>
							<tr>
								<th>کاربر</th>
								<th>نوع رویداد</th>
								<th>پلتفرم</th>
								<th>دستگاه / IP</th>
								<th>زمان شمسی</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $recent_logs as $lg ) : ?>
								<tr>
									<td>
										<a href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users&user_id=' . $lg['user_id'] ) ); ?>" style="font-weight:700;text-decoration:none;color:var(--kn-primary);">
											<?php echo esc_html( $lg['display_name'] ?: $lg['user_login'] ); ?>
										</a>
									</td>
									<td><span class="kn-pill kn-pill-blue"><?php echo esc_html( self::$log_labels[ $lg['event_type'] ] ?? $lg['event_type'] ); ?></span></td>
									<td>
										<span class="kn-pill <?php echo $lg['platform'] === 'mobile_app' ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
											<?php echo $lg['platform'] === 'mobile_app' ? 'اپلیکیشن موبایل' : 'وب‌اپ'; ?>
										</span>
									</td>
									<td style="font-size:11.5px;"><?php echo esc_html( trim( $lg['device_label'] . ' · ' . $lg['ip_address'], ' ·' ) ); ?></td>
									<td style="font-size:12px;"><?php echo esc_html( KN_Jalali::format( $lg['created_at'], true, true ) ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>

		<?php
		KN_Admin::render_shell_close();
	}

	/**
	 * Comprehensive Single-User CRM, Orders & Auth Logs Report (?page=kn-soroban-users&user_id=X).
	 */
	private static function render_user_detail_report( $user_id ) {
		$user = get_user_by( 'id', absint( $user_id ) );
		if ( ! $user ) {
			KN_Admin::render_shell_open( 'kn-soroban-users', 'کاربر یافت نشد', 'پرونده کاربری درخواستی وجود ندارد.' );
			echo '<div class="kn-notice kn-notice-error">کاربر مورد نظر یافت نشد.</div>';
			echo '<a class="kn-btn kn-btn-primary" href="' . esc_url( admin_url( 'admin.php?page=kn-soroban-users' ) ) . '">بازگشت به فهرست کاربران</a>';
			KN_Admin::render_shell_close();
			return;
		}

		$uid        = (int) $user->ID;
		$mobile     = (string) ( get_user_meta( $uid, 'kn_mobile', true ) ?: get_user_meta( $uid, 'billing_phone', true ) );
		$first_name = (string) ( get_user_meta( $uid, 'first_name', true ) ?: get_user_meta( $uid, 'billing_first_name', true ) ?: $user->first_name );
		$last_name  = (string) ( get_user_meta( $uid, 'last_name', true ) ?: get_user_meta( $uid, 'billing_last_name', true ) ?: $user->last_name );
		$state      = (string) ( get_user_meta( $uid, 'billing_state', true ) ?: get_user_meta( $uid, 'shipping_state', true ) );
		$city       = (string) ( get_user_meta( $uid, 'billing_city', true ) ?: get_user_meta( $uid, 'shipping_city', true ) );
		$address_1  = (string) ( get_user_meta( $uid, 'billing_address_1', true ) ?: get_user_meta( $uid, 'shipping_address_1', true ) );
		$postcode   = (string) ( get_user_meta( $uid, 'billing_postcode', true ) ?: get_user_meta( $uid, 'shipping_postcode', true ) );
		$reg_jalali = KN_Jalali::format( $user->user_registered, true, true, true );

		$profiles   = KN_DB::get_user_profiles( $uid );
		$ent_map    = KN_DB::get_user_entitlement_map( $uid );
		$paid_terms = array_filter(
			KN_DB::get_terms_list( false ),
			function ( $t ) {
				return empty( $t['is_free'] );
			}
		);
		$logs       = KN_DB::get_user_logs( $uid, 100 );
		$tokens     = KN_Auth::get_user_tokens( $uid );

		$orders_res = KN_Woo::is_woo_active() ? KN_Woo::admin_get_orders( array( 'customer_id' => $uid, 'limit' => 100 ) ) : array( 'orders' => array() );
		$u_orders   = $orders_res['orders'];

		$total_spent = 0;
		foreach ( $u_orders as $uo ) {
			if ( in_array( $uo['status'], array( 'completed', 'processing' ), true ) ) {
				$total_spent += (int) $uo['totalAmount'];
			}
		}

		$user_roles    = wp_roles()->get_names();
		$current_role  = ! empty( $user->roles ) ? (string) reset( $user->roles ) : 'kn_student';

		KN_Admin::render_shell_open(
			'kn-soroban-users',
			'گزارش جامع کاربر: ' . ( $user->display_name ?: $user->user_login ),
			'پروفایل حساب کاربری، سفارشات ووکامرس، دسترسی ترم‌ها، گزارش ورود و خروج (وب/اپ) و مدیریت نشست‌های فعال'
		);
		?>

		<div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
			<a class="kn-btn kn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users' ) ); ?>">← بازگشت به فهرست کاربران</a>
			<span class="kn-pill kn-pill-blue">عضویت در تاریخ شمسی: <?php echo esc_html( $reg_jalali ); ?></span>
		</div>

		<!-- User KPI Summary -->
		<div class="kn-kpi-grid">
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-blue">🛒</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( count( $u_orders ) ) ); ?></div>
					<div class="kn-kpi-label">تعداد کل سفارشات</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-green">💳</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $total_spent ) ) ); ?></div>
					<div class="kn-kpi-label">مجموع پرداختی موفق</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-amber">🔓</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( count( $ent_map ) ) ); ?></div>
					<div class="kn-kpi-label">ترم‌های پولی فعال</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-violet">👧</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( count( $profiles ) ) ); ?></div>
					<div class="kn-kpi-label">پروفایل کودک</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-slate">🕒</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( count( $logs ) ) ); ?></div>
					<div class="kn-kpi-label">رخداد ورود / فعالیت ثبت‌شده</div>
				</div>
			</div>
		</div>

		<div class="kn-grid-2">
			<!-- Full Account Edit Form -->
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>ویرایش اطلاعات حساب، نشانی و رمز عبور</h2>
					<span class="kn-pill kn-pill-slate" dir="ltr">@<?php echo esc_html( $user->user_login ); ?></span>
				</div>
				<form method="post">
					<?php wp_nonce_field( 'kn_admin_update_user' ); ?>
					<input type="hidden" name="kn_action" value="admin_update_user" />
					<input type="hidden" name="target_user_id" value="<?php echo esc_attr( $uid ); ?>" />

					<div class="kn-grid-2">
						<div class="kn-field">
							<label>نام</label>
							<input type="text" name="first_name" value="<?php echo esc_attr( $first_name ); ?>" />
						</div>
						<div class="kn-field">
							<label>نام خانوادگی</label>
							<input type="text" name="last_name" value="<?php echo esc_attr( $last_name ); ?>" />
						</div>
					</div>
					<div class="kn-grid-2">
						<div class="kn-field">
							<label>نام نمایشی</label>
							<input type="text" name="display_name" value="<?php echo esc_attr( $user->display_name ); ?>" />
						</div>
						<div class="kn-field">
							<label>شماره موبایل</label>
							<input type="text" name="mobile" dir="ltr" value="<?php echo esc_attr( $mobile ); ?>" placeholder="09123456789" />
						</div>
					</div>
					<div class="kn-grid-2">
						<div class="kn-field">
							<label>ایمیل</label>
							<input type="email" name="email" dir="ltr" value="<?php echo esc_attr( $user->user_email ); ?>" />
						</div>
						<div class="kn-field">
							<label>نقش کاربری</label>
							<select name="role" <?php echo $uid === get_current_user_id() ? 'disabled' : ''; ?>>
								<?php foreach ( $user_roles as $rk => $rl ) : ?>
									<option value="<?php echo esc_attr( $rk ); ?>" <?php selected( $current_role, $rk ); ?>><?php echo esc_html( translate_user_role( $rl ) ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
					</div>
					<div class="kn-grid-3">
						<div class="kn-field">
							<label>استان</label>
							<input type="text" name="state" value="<?php echo esc_attr( $state ); ?>" />
						</div>
						<div class="kn-field">
							<label>شهر</label>
							<input type="text" name="city" value="<?php echo esc_attr( $city ); ?>" />
						</div>
						<div class="kn-field">
							<label>کد پستی</label>
							<input type="text" name="postcode" dir="ltr" value="<?php echo esc_attr( $postcode ); ?>" />
						</div>
					</div>
					<div class="kn-grid-2">
						<div class="kn-field">
							<label>آدرس پستی کامل</label>
							<input type="text" name="address_1" value="<?php echo esc_attr( $address_1 ); ?>" />
						</div>
						<div class="kn-field">
							<label>تغییر رمز عبور (اختیاری - در صورت نیاز)</label>
							<input type="password" name="new_password" dir="ltr" autocomplete="new-password" placeholder="حداقل ۶ کاراکتر..." />
						</div>
					</div>
					<button type="submit" class="kn-btn kn-btn-primary">ذخیره مشخصات کاربر</button>
				</form>
			</div>

			<!-- Paid Term Entitlements & Child Profiles -->
			<div style="display:flex;flex-direction:column;gap:16px;">
				<div class="kn-card" style="margin-bottom:0;">
					<div class="kn-card-header">
						<h2>دسترسی به ترم‌های پولی</h2>
					</div>
					<?php if ( empty( $paid_terms ) ) : ?>
						<p style="font-size:12.5px;color:var(--kn-ink-subtle);">ترم پولی تعریف نشده است.</p>
					<?php else : ?>
						<div style="display:grid;gap:8px;">
							<?php foreach ( $paid_terms as $pt ) : ?>
								<?php
								$tid      = (int) $pt['id'];
								$unlocked = isset( $ent_map[ $tid ] );
								$ent_info = $ent_map[ $tid ] ?? null;
								?>
								<form method="post" style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--kn-bg);padding:8px 12px;border-radius:10px;border:1px solid var(--kn-border);">
									<?php wp_nonce_field( 'kn_admin_toggle_entitlement' ); ?>
									<input type="hidden" name="kn_action" value="admin_toggle_entitlement" />
									<input type="hidden" name="target_user_id" value="<?php echo esc_attr( $uid ); ?>" />
									<input type="hidden" name="term_id" value="<?php echo esc_attr( $tid ); ?>" />
									<input type="hidden" name="return_user_id" value="<?php echo esc_attr( $uid ); ?>" />
									<input type="hidden" name="entitlement_mode" value="<?php echo $unlocked ? 'revoke' : 'grant'; ?>" />
									<div>
										<strong style="font-size:12.5px;"><?php echo esc_html( $pt['title'] ); ?></strong>
										<?php if ( $unlocked && ! empty( $ent_info['grantedAt'] ) ) : ?>
											<div style="font-size:11px;color:var(--kn-ink-subtle);">فعال‌سازی: <?php echo esc_html( KN_Jalali::format_date_only( $ent_info['grantedAt'], true ) ); ?></div>
										<?php endif; ?>
									</div>
									<div style="display:flex;gap:6px;align-items:center;">
										<?php if ( $unlocked ) : ?>
											<span class="kn-pill kn-pill-green">فعال</span>
											<button type="submit" class="kn-btn kn-btn-danger kn-btn-sm">لغو دسترسی</button>
										<?php else : ?>
											<span class="kn-pill kn-pill-slate">قفل</span>
											<button type="submit" class="kn-btn kn-btn-green kn-btn-sm">فعال‌سازی</button>
										<?php endif; ?>
									</div>
								</form>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</div>

				<div class="kn-card" style="margin-bottom:0;">
					<div class="kn-card-header">
						<h2>پروفایل کودکان این حساب (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $profiles ) ) ); ?>)</h2>
					</div>
					<?php if ( empty( $profiles ) ) : ?>
						<p style="font-size:12.5px;color:var(--kn-ink-subtle);">کودکی برای این حساب ثبت نشده است.</p>
					<?php else : ?>
						<?php foreach ( $profiles as $pr ) : ?>
							<form method="post" style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:10px;margin-bottom:8px;">
								<?php wp_nonce_field( 'kn_admin_update_profile' ); ?>
								<input type="hidden" name="kn_action" value="admin_update_profile" />
								<input type="hidden" name="profile_db_id" value="<?php echo esc_attr( $pr['dbId'] ); ?>" />
								<input type="hidden" name="return_user_id" value="<?php echo esc_attr( $uid ); ?>" />
								<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
									<?php if ( ! empty( $pr['avatarUrl'] ) ) : ?>
										<img src="<?php echo esc_url( $pr['avatarUrl'] ); ?>" alt="" style="width:36px;height:36px;border-radius:999px;object-fit:cover;border:1px solid var(--kn-border);" />
									<?php endif; ?>
									<input type="text" name="name" value="<?php echo esc_attr( $pr['name'] ); ?>" class="kn-input-sm" style="width:110px;" />
									<label style="font-size:11px;">سن <input type="number" name="age" value="<?php echo esc_attr( $pr['age'] ); ?>" min="3" max="15" class="kn-input-sm" style="width:52px;" /></label>
									<label style="font-size:11px;">ستاره <input type="number" name="total_stars" value="<?php echo esc_attr( $pr['totalStars'] ); ?>" min="0" class="kn-input-sm" style="width:62px;" /></label>
									<label style="font-size:11px;">جایزه <input type="number" name="reward_points" value="<?php echo esc_attr( $pr['rewardPoints'] ); ?>" min="0" class="kn-input-sm" style="width:66px;" /></label>
									<input type="hidden" name="practice_minutes" value="<?php echo esc_attr( $pr['practiceMinutes'] ); ?>" />
									<input type="hidden" name="difficulty_level" value="<?php echo esc_attr( $pr['difficultyLevel'] ); ?>" />
									<button type="submit" class="kn-btn kn-btn-primary kn-btn-sm">ذخیره</button>
								</div>
							</form>
						<?php endforeach; ?>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<!-- User Orders Table -->
		<div class="kn-card">
			<div class="kn-card-header">
				<h2>گزارش سفارشات کاربر (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $u_orders ) ) ); ?>)</h2>
			</div>
			<?php if ( empty( $u_orders ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">این کاربر هنوز سفارشی ثبت نکرده است.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table">
						<thead>
							<tr>
								<th>سفارش</th>
								<th>اقلام</th>
								<th>مبلغ و روش پرداخت</th>
								<th>تاریخ شمسی</th>
								<th>وضعیت</th>
								<th>مدیریت</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $u_orders as $uo ) : ?>
								<tr>
									<td><strong>#<?php echo esc_html( KN_Jalali::to_persian_digits( $uo['orderNumber'] ) ); ?></strong></td>
									<td>
										<?php foreach ( $uo['items'] as $it ) : ?>
											<div style="font-size:12px;">• <?php echo esc_html( $it['name'] ); ?> × <?php echo esc_html( KN_Jalali::to_persian_digits( $it['qty'] ) ); ?></div>
										<?php endforeach; ?>
									</td>
									<td>
										<strong><?php echo esc_html( $uo['totalFormatted'] ); ?></strong>
										<div style="font-size:11px;color:var(--kn-ink-subtle);"><?php echo esc_html( $uo['paymentMethodTitle'] ?: $uo['paymentMethod'] ); ?></div>
									</td>
									<td><?php echo esc_html( $uo['dateCreated'] ); ?></td>
									<td><span class="kn-pill kn-pill-blue"><?php echo esc_html( $uo['statusLabel'] ); ?></span></td>
									<td><a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-orders&order_id=' . $uo['id'] ) ); ?>">جزئیات سفارش</a></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>

		<div class="kn-grid-2">
			<!-- Login / Logout / Visit Logs -->
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>گزارش تاریخچه ورود، خروج و فعالیت کاربر</h2>
				</div>
				<?php if ( empty( $logs ) ) : ?>
					<p style="font-size:13px;color:var(--kn-ink-subtle);">هنوز رویداد ورود یا خروجی برای این کاربر ثبت نشده است.</p>
				<?php else : ?>
					<div class="kn-table-wrap">
						<table class="kn-table">
							<thead>
								<tr>
									<th>رویداد</th>
									<th>پلتفرم</th>
									<th>دستگاه / IP</th>
									<th>زمان شمسی</th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $logs as $lg ) : ?>
									<tr>
										<td><span class="kn-pill kn-pill-blue"><?php echo esc_html( self::$log_labels[ $lg['event_type'] ] ?? $lg['event_type'] ); ?></span></td>
										<td>
											<span class="kn-pill <?php echo $lg['platform'] === 'mobile_app' ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
												<?php echo $lg['platform'] === 'mobile_app' ? 'اپلیکیشن موبایل' : 'وب‌اپ'; ?>
											</span>
										</td>
										<td style="font-size:11.5px;"><?php echo esc_html( trim( $lg['device_label'] . ' · ' . $lg['ip_address'], ' ·' ) ); ?></td>
										<td style="font-size:11.5px;">
											<div><?php echo esc_html( KN_Jalali::format( $lg['created_at'], true, true ) ); ?></div>
											<div style="color:var(--kn-ink-subtle);"><?php echo esc_html( KN_Jalali::relative_time( $lg['created_at'] ) ); ?></div>
										</td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				<?php endif; ?>
			</div>

			<!-- Active Session Tokens -->
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>نشست‌های فعال و توکن‌های اپلیکیشن</h2>
					<?php if ( ! empty( $tokens ) ) : ?>
						<form method="post" onsubmit="return confirm('همه نشست‌های فعال این کاربر از سیستم خارج شوند؟');">
							<?php wp_nonce_field( 'kn_admin_revoke_all_tokens' ); ?>
							<input type="hidden" name="kn_action" value="admin_revoke_all_tokens" />
							<input type="hidden" name="target_user_id" value="<?php echo esc_attr( $uid ); ?>" />
							<button type="submit" class="kn-btn kn-btn-danger kn-btn-sm">خروج اجباری از همه دستگاه‌ها</button>
						</form>
					<?php endif; ?>
				</div>
				<?php if ( empty( $tokens ) ) : ?>
					<p style="font-size:13px;color:var(--kn-ink-subtle);">نشست فعالی برای این کاربر ثبت نشده است.</p>
				<?php else : ?>
					<div class="kn-table-wrap">
						<table class="kn-table">
							<thead>
								<tr>
									<th>دستگاه</th>
									<th>تاریخ ایجاد / انقضا (شمسی)</th>
									<th>وضعیت</th>
									<th>عملیات</th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $tokens as $tk ) : ?>
									<?php $is_revoked = ! empty( $tk['revoked'] ) || strtotime( (string) $tk['expires_at'] ) < time(); ?>
									<tr>
										<td><strong><?php echo esc_html( $tk['device_label'] ?: 'Web / Mobile' ); ?></strong></td>
										<td style="font-size:11.5px;">
											<div>ایجاد: <?php echo esc_html( KN_Jalali::format( $tk['created_at'], true, true ) ); ?></div>
											<div>انقضا: <?php echo esc_html( KN_Jalali::format( $tk['expires_at'], true, true ) ); ?></div>
										</td>
										<td>
											<span class="kn-pill <?php echo $is_revoked ? 'kn-pill-slate' : 'kn-pill-green'; ?>">
												<?php echo $is_revoked ? 'منقضی / لغو شده' : 'فعال'; ?>
											</span>
										</td>
										<td>
											<?php if ( empty( $tk['revoked'] ) ) : ?>
												<form method="post" style="display:inline;">
													<?php wp_nonce_field( 'kn_admin_revoke_token' ); ?>
													<input type="hidden" name="kn_action" value="admin_revoke_token" />
													<input type="hidden" name="target_user_id" value="<?php echo esc_attr( $uid ); ?>" />
													<input type="hidden" name="token_id" value="<?php echo esc_attr( $tk['id'] ); ?>" />
													<button type="submit" class="kn-btn kn-btn-danger kn-btn-sm">لغو نشست</button>
												</form>
											<?php endif; ?>
										</td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				<?php endif; ?>
			</div>
		</div>
		<?php
		KN_Admin::render_shell_close();
	}
}
