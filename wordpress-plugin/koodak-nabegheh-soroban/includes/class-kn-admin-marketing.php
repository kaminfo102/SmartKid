<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Promotional Banners & Advanced Scheduled Dialogs Admin Manager.
 */
class KN_Admin_Marketing {

	public static function render_page() {
		$active_tab = sanitize_key( wp_unslash( $_GET['tab'] ?? 'banners' ) );
		if ( ! in_array( $active_tab, array( 'banners', 'dialogs' ), true ) ) {
			$active_tab = 'banners';
		}

		KN_Admin::render_shell_open(
			'kn-soroban-marketing',
			'بنرهای تبلیغاتی و دیالوگ‌های هوشمند',
			'مدیریت بنرهای داخل اپ و فروشگاه همراه با آمار کلیک و بازدید وب/موبایل + دیالوگ‌های زمان‌بندی‌شده پیشرفته با تقویم شمسی'
		);
		?>

		<div class="kn-tabs">
			<a class="kn-tab <?php echo $active_tab === 'banners' ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=banners' ) ); ?>">
				📣 بنرهای تبلیغاتی (Banners)
			</a>
			<a class="kn-tab <?php echo $active_tab === 'dialogs' ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=dialogs' ) ); ?>">
				🪄 دیالوگ‌ها و پاپ‌آپ‌های زمان‌بندی‌شده (Scheduled Dialogs)
			</a>
		</div>

		<?php
		if ( $active_tab === 'dialogs' ) {
			self::render_dialogs_tab();
		} else {
			self::render_banners_tab();
		}

		KN_Admin::render_shell_close();
	}

	private static function render_banners_tab() {
		$banners     = KN_Marketing::get_all_banners();
		$edit_id     = absint( $_GET['edit_banner'] ?? 0 );
		$edit_banner = $edit_id > 0 ? KN_Marketing::get_banner( $edit_id ) : null;
		$is_editing  = is_array( $edit_banner );

		$val = $is_editing ? $edit_banner : array(
			'id'              => 0,
			'title'           => '',
			'subtitle'        => '',
			'badge_text'      => '',
			'image_url'       => '',
			'cta_text'        => 'مشاهده',
			'action_type'     => 'none',
			'action_target'   => '',
			'placement'       => 'home_top',
			'bg_color'        => '#EFF6FF',
			'text_color'      => '#0F172A',
			'target_platform' => 'all',
			'start_at'        => '',
			'end_at'          => '',
			'sort_order'      => count( $banners ) + 1,
			'is_active'       => 1,
		);

		$start_j = ! empty( $val['start_at'] ) ? KN_Jalali::format_for_input( $val['start_at'] ) : '';
		$start_t = ! empty( $val['start_at'] ) ? KN_Jalali::format_time_for_input( $val['start_at'] ) : '00:00';
		$end_j   = ! empty( $val['end_at'] ) ? KN_Jalali::format_for_input( $val['end_at'] ) : '';
		$end_t   = ! empty( $val['end_at'] ) ? KN_Jalali::format_time_for_input( $val['end_at'] ) : '23:59';
		?>
		<div class="kn-card">
			<div class="kn-card-header">
				<h2><?php echo $is_editing ? 'ویرایش بنر #' . esc_html( $val['id'] ) : 'افزودن بنر تبلیغاتی جدید'; ?></h2>
				<?php if ( $is_editing ) : ?>
					<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=banners' ) ); ?>">انصراف و ساخت بنر جدید</a>
				<?php else : ?>
					<button type="button" class="kn-btn kn-btn-primary" data-kn-toggle="kn-banner-form-box">+ بنر جدید</button>
				<?php endif; ?>
			</div>

			<div id="kn-banner-form-box" class="kn-collapsible <?php echo ( $is_editing || empty( $banners ) ) ? 'is-open' : ''; ?>">
				<form method="post">
					<?php wp_nonce_field( 'kn_save_banner' ); ?>
					<input type="hidden" name="kn_action" value="save_banner" />
					<input type="hidden" name="banner_id" value="<?php echo esc_attr( $val['id'] ); ?>" />

					<div class="kn-grid-3">
						<div class="kn-field">
							<label>عنوان اصلی بنر (الزامی)</label>
							<input type="text" name="title" required value="<?php echo esc_attr( $val['title'] ); ?>" placeholder="مثلاً: جشنواره تابستانی چرتکه" />
						</div>
						<div class="kn-field">
							<label>متن توضیح / زیرعنوان</label>
							<input type="text" name="subtitle" value="<?php echo esc_attr( $val['subtitle'] ); ?>" placeholder="توضیح کوتاه زیر عنوان بنر..." />
						</div>
						<div class="kn-field">
							<label>برچسب بالای بنر (Badge - اختیاری)</label>
							<input type="text" name="badge_text" value="<?php echo esc_attr( $val['badge_text'] ); ?>" placeholder="مثلاً: تخفیف ویژه یا جدید" />
						</div>
					</div>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>محل نمایش در اپلیکیشن</label>
							<select name="placement">
								<?php foreach ( KN_Marketing::$placements as $k => $lbl ) : ?>
									<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['placement'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
						<div class="kn-field">
							<label>پلتفرم هدف</label>
							<select name="target_platform">
								<option value="all" <?php selected( $val['target_platform'], 'all' ); ?>>همه (وب + اپلیکیشن موبایل)</option>
								<option value="web" <?php selected( $val['target_platform'], 'web' ); ?>>فقط وب‌اپلیکیشن</option>
								<option value="mobile_app" <?php selected( $val['target_platform'], 'mobile_app' ); ?>>فقط اپلیکیشن موبایل (APK)</option>
							</select>
						</div>
						<div class="kn-field">
							<label>عملیات کلیک روی بنر</label>
							<select name="action_type">
								<?php foreach ( KN_Marketing::$banner_actions as $k => $lbl ) : ?>
									<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['action_type'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
						<div class="kn-field">
							<label>مقصد کلیک (آدرس URL یا نام صفحه مثل shop / map)</label>
							<input type="text" name="action_target" dir="ltr" value="<?php echo esc_attr( $val['action_target'] ); ?>" placeholder="shop یا https://..." />
						</div>
					</div>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>متن دکمه اقدام (CTA)</label>
							<input type="text" name="cta_text" value="<?php echo esc_attr( $val['cta_text'] ); ?>" placeholder="مشاهده" />
						</div>
						<div class="kn-field">
							<label>تاریخ و ساعت شروع نمایش (شمسی)</label>
							<div style="display:flex;gap:6px;">
								<input type="text" name="start_jdate" data-kn-jdate="1" class="kn-jdate-input" value="<?php echo esc_attr( $start_j ); ?>" placeholder="بلافاصله" autocomplete="off" />
								<input type="time" name="start_time" value="<?php echo esc_attr( $start_t ); ?>" style="width:105px;" />
							</div>
						</div>
						<div class="kn-field">
							<label>تاریخ و ساعت پایان نمایش (شمسی)</label>
							<div style="display:flex;gap:6px;">
								<input type="text" name="end_jdate" data-kn-jdate="1" class="kn-jdate-input" value="<?php echo esc_attr( $end_j ); ?>" placeholder="نامحدود" autocomplete="off" />
								<input type="time" name="end_time" value="<?php echo esc_attr( $end_t ); ?>" style="width:105px;" />
							</div>
						</div>
						<div class="kn-field">
							<label>رنگ پس‌زمینه / متن / ترتیب</label>
							<div style="display:flex;gap:6px;align-items:center;">
								<input type="color" name="bg_color" value="<?php echo esc_attr( $val['bg_color'] ); ?>" title="رنگ پس‌زمینه" style="height:36px;width:54px;" />
								<input type="color" name="text_color" value="<?php echo esc_attr( $val['text_color'] ); ?>" title="رنگ متن" style="height:36px;width:54px;" />
								<input type="number" name="sort_order" value="<?php echo esc_attr( $val['sort_order'] ); ?>" min="1" style="width:68px;" title="ترتیب نمایش" />
							</div>
						</div>
					</div>

					<?php KN_Admin::render_image_picker_field_public( 'image_url', $val['image_url'], 'kn-banner-img-input', 'تصویر بنر تبلیغاتی (اختیاری - JPG / PNG / WebP)' ); ?>

					<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:6px;">
						<label style="font-weight:700;"><input type="checkbox" name="is_active" value="1" <?php checked( ! empty( $val['is_active'] ) ); ?> /> بنر فعال باشد</label>
						<button type="submit" class="kn-btn kn-btn-green"><?php echo $is_editing ? 'ذخیره تغییرات بنر' : 'ایجاد بنر تبلیغاتی'; ?></button>
					</div>
				</form>
			</div>
		</div>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>فهرست بنرهای تبلیغاتی و آمار بازدید / کلیک (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $banners ) ) ); ?>)</h2>
			</div>
			<?php if ( empty( $banners ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">هنوز بنری ساخته نشده است.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table">
						<thead>
							<tr>
								<th>پیش‌نمایش و عنوان</th>
								<th>محل و پلتفرم</th>
								<th>زمان‌بندی شمسی</th>
								<th>بازدید (وب / اپ)</th>
								<th>کلیک (وب / اپ)</th>
								<th>وضعیت</th>
								<th>عملیات</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $banners as $b ) : ?>
								<?php
								$imp_total = (int) $b['impressions_web'] + (int) $b['impressions_mobile'];
								$clk_total = (int) $b['clicks_web'] + (int) $b['clicks_mobile'];
								$ctr       = $imp_total > 0 ? round( ( $clk_total / $imp_total ) * 100, 1 ) : 0;
								?>
								<tr>
									<td>
										<div style="display:flex;align-items:center;gap:10px;">
											<?php if ( ! empty( $b['image_url'] ) ) : ?>
												<img src="<?php echo esc_url( $b['image_url'] ); ?>" alt="" style="width:54px;height:40px;object-fit:cover;border-radius:8px;border:1px solid var(--kn-border);flex-shrink:0;" />
											<?php else : ?>
												<div style="width:54px;height:40px;border-radius:8px;background:<?php echo esc_attr( $b['bg_color'] ); ?>;border:1px solid var(--kn-border);flex-shrink:0;"></div>
											<?php endif; ?>
											<div>
												<strong><?php echo esc_html( $b['title'] ); ?></strong>
												<?php if ( ! empty( $b['badge_text'] ) ) : ?>
													<span class="kn-pill kn-pill-amber"><?php echo esc_html( $b['badge_text'] ); ?></span>
												<?php endif; ?>
												<div style="font-size:11px;color:var(--kn-ink-subtle);"><?php echo esc_html( $b['subtitle'] ); ?></div>
											</div>
										</div>
									</td>
									<td>
										<div><?php echo esc_html( KN_Marketing::$placements[ $b['placement'] ] ?? $b['placement'] ); ?></div>
										<span class="kn-pill kn-pill-slate">
											<?php echo $b['target_platform'] === 'web' ? 'فقط وب' : ( $b['target_platform'] === 'mobile_app' ? 'فقط اپ موبایل' : 'وب + موبایل' ); ?>
										</span>
									</td>
									<td style="font-size:11.5px;">
										<div>شروع: <?php echo ! empty( $b['start_at'] ) ? esc_html( KN_Jalali::format( $b['start_at'], true, true ) ) : 'فوری'; ?></div>
										<div>پایان: <?php echo ! empty( $b['end_at'] ) ? esc_html( KN_Jalali::format( $b['end_at'], true, true ) ) : 'نامحدود'; ?></div>
									</td>
									<td>
										<strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $imp_total ) ) ); ?></strong>
										<div style="font-size:11px;color:var(--kn-ink-subtle);">وب: <?php echo esc_html( KN_Jalali::to_persian_digits( $b['impressions_web'] ) ); ?> | اپ: <?php echo esc_html( KN_Jalali::to_persian_digits( $b['impressions_mobile'] ) ); ?></div>
									</td>
									<td>
										<strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $clk_total ) ) ); ?></strong>
										<span class="kn-pill kn-pill-blue">CTR <?php echo esc_html( KN_Jalali::to_persian_digits( $ctr ) ); ?>٪</span>
										<div style="font-size:11px;color:var(--kn-ink-subtle);">وب: <?php echo esc_html( KN_Jalali::to_persian_digits( $b['clicks_web'] ) ); ?> | اپ: <?php echo esc_html( KN_Jalali::to_persian_digits( $b['clicks_mobile'] ) ); ?></div>
									</td>
									<td>
										<span class="kn-pill <?php echo ! empty( $b['is_active'] ) ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
											<?php echo ! empty( $b['is_active'] ) ? 'فعال' : 'غیرفعال'; ?>
										</span>
									</td>
									<td>
										<div style="display:flex;gap:6px;flex-wrap:wrap;">
											<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=banners&edit_banner=' . $b['id'] ) ); ?>">ویرایش</a>
											<form method="post" style="display:inline;">
												<?php wp_nonce_field( 'kn_toggle_banner' ); ?>
												<input type="hidden" name="kn_action" value="toggle_banner" />
												<input type="hidden" name="banner_id" value="<?php echo esc_attr( $b['id'] ); ?>" />
												<button type="submit" class="kn-btn kn-btn-amber kn-btn-sm"><?php echo ! empty( $b['is_active'] ) ? 'توقف' : 'فعال'; ?></button>
											</form>
											<form method="post" style="display:inline;" onsubmit="return confirm('این بنر تبلیغاتی حذف شود؟');">
												<?php wp_nonce_field( 'kn_delete_banner' ); ?>
												<input type="hidden" name="kn_action" value="delete_banner" />
												<input type="hidden" name="banner_id" value="<?php echo esc_attr( $b['id'] ); ?>" />
												<button type="submit" class="kn-btn kn-btn-danger kn-btn-sm">حذف</button>
											</form>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	private static function render_dialogs_tab() {
		$dialogs     = KN_Marketing::get_all_dialogs();
		$terms       = KN_DB::get_terms_list( false );
		$edit_id     = absint( $_GET['edit_dialog'] ?? 0 );
		$edit_dialog = $edit_id > 0 ? KN_Marketing::get_dialog( $edit_id ) : null;
		$is_editing  = is_array( $edit_dialog );

		$val = $is_editing ? $edit_dialog : array(
			'id'                   => 0,
			'title'                => '',
			'body'                 => '',
			'badge_text'           => '',
			'image_url'            => '',
			'cta_text'             => 'متوجه شدم',
			'action_type'          => 'dismiss',
			'action_target'        => '',
			'secondary_text'       => 'بعداً یادآوری کن',
			'start_at'             => '',
			'end_at'               => '',
			'daily_start_time'     => '',
			'daily_end_time'       => '',
			'weekdays_mask'        => '0,1,2,3,4,5,6',
			'delay_seconds'        => 1,
			'auto_close_seconds'   => 0,
			'show_countdown'       => 1,
			'allow_user_close'     => 1,
			'close_on_backdrop'    => 1,
			'frequency_mode'       => 'once_per_day',
			'frequency_hours'      => 24,
			'max_impressions_user' => 0,
			'dialog_size'          => 'md',
			'position'             => 'center',
			'theme_style'          => 'brand',
			'overlay_blur'         => 1,
			'animation'            => 'scale',
			'target_platform'      => 'all',
			'target_audience'      => 'all',
			'target_screens'       => 'all',
			'priority'             => 10,
			'is_active'            => 1,
		);

		$start_j = ! empty( $val['start_at'] ) ? KN_Jalali::format_for_input( $val['start_at'] ) : '';
		$start_t = ! empty( $val['start_at'] ) ? KN_Jalali::format_time_for_input( $val['start_at'] ) : '00:00';
		$end_j   = ! empty( $val['end_at'] ) ? KN_Jalali::format_for_input( $val['end_at'] ) : '';
		$end_t   = ! empty( $val['end_at'] ) ? KN_Jalali::format_time_for_input( $val['end_at'] ) : '23:59';

		$selected_wd      = array_map( 'trim', explode( ',', (string) $val['weekdays_mask'] ) );
		$selected_screens = array_map( 'trim', explode( ',', (string) $val['target_screens'] ) );
		$weekdays_labels  = KN_Jalali::weekday_names();
		?>
		<div class="kn-card">
			<div class="kn-card-header">
				<h2><?php echo $is_editing ? 'ویرایش دیالوگ پیشرفته #' . esc_html( $val['id'] ) : 'ساخت دیالوگ زمان‌بندی‌شده پیشرفته'; ?></h2>
				<?php if ( $is_editing ) : ?>
					<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=dialogs' ) ); ?>">انصراف و ساخت دیالوگ جدید</a>
				<?php else : ?>
					<button type="button" class="kn-btn kn-btn-primary" data-kn-toggle="kn-dialog-form-box">+ ساخت دیالوگ جدید</button>
				<?php endif; ?>
			</div>

			<div id="kn-dialog-form-box" class="kn-collapsible <?php echo ( $is_editing || empty( $dialogs ) ) ? 'is-open' : ''; ?>">
				<form method="post">
					<?php wp_nonce_field( 'kn_save_dialog' ); ?>
					<input type="hidden" name="kn_action" value="save_dialog" />
					<input type="hidden" name="dialog_id" value="<?php echo esc_attr( $val['id'] ); ?>" />

					<h3 style="margin:0 0 10px;font-size:13.5px;color:var(--kn-primary);">۱. محتوا، تصویر و دکمه‌های اقدام</h3>
					<div class="kn-grid-3">
						<div class="kn-field">
							<label>عنوان دیالوگ (الزامی)</label>
							<input type="text" name="title" required value="<?php echo esc_attr( $val['title'] ); ?>" placeholder="مثلاً: تخفیف ویژه ترم دوم سوروبان" />
						</div>
						<div class="kn-field">
							<label>نشان بالای عنوان (Badge)</label>
							<input type="text" name="badge_text" value="<?php echo esc_attr( $val['badge_text'] ); ?>" placeholder="مثلاً: فقط امروز | اطلاعیه مهم" />
						</div>
						<div class="kn-field">
							<label>اولویت نمایش (عدد کوچک‌تر = اولویت بالاتر)</label>
							<input type="number" name="priority" value="<?php echo esc_attr( $val['priority'] ); ?>" min="1" max="999" />
						</div>
					</div>

					<div class="kn-field">
						<label>متن پیام داخل دیالوگ</label>
						<textarea name="body" rows="3" placeholder="متن کامل اطلاعیه، خبر یا پیشنهاد ویژه برای والدین و کودکان..."><?php echo esc_textarea( $val['body'] ); ?></textarea>
					</div>

					<?php KN_Admin::render_image_picker_field_public( 'image_url', $val['image_url'], 'kn-dialog-img-input', 'تصویر داخل دیالوگ (اختیاری - پوستر یا بنر)' ); ?>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>متن دکمه اصلی (CTA)</label>
							<input type="text" name="cta_text" value="<?php echo esc_attr( $val['cta_text'] ); ?>" />
						</div>
						<div class="kn-field">
							<label>عملکرد دکمه اصلی و کلیک روی تصویر</label>
							<select name="action_type">
								<?php foreach ( KN_Marketing::$dialog_actions as $k => $lbl ) : ?>
									<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['action_type'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
						<div class="kn-field">
							<label>مقصد کلیک (لینک URL، نام صفحه یا شناسه ترم)</label>
							<input type="text" name="action_target" dir="ltr" value="<?php echo esc_attr( $val['action_target'] ); ?>" placeholder="shop / https://... / 2" />
							<?php if ( ! empty( $terms ) ) : ?>
								<div style="font-size:10.5px;color:var(--kn-ink-subtle);margin-top:3px;">
									شناسه‌های ترم: <?php foreach ( $terms as $tm ) { echo esc_html( $tm['id'] . '=' . $tm['title'] . ' ' ); } ?>
								</div>
							<?php endif; ?>
						</div>
						<div class="kn-field">
							<label>متن دکمه دوم (بستن اختیاری)</label>
							<input type="text" name="secondary_text" value="<?php echo esc_attr( $val['secondary_text'] ); ?>" placeholder="بستن" />
						</div>
					</div>

					<hr style="border:none;border-top:1px solid var(--kn-border);margin:14px 0;" />
					<h3 style="margin:0 0 10px;font-size:13.5px;color:var(--kn-primary);">۲. زمان‌بندی دقیق (تاریخ شمسی، ساعت و روزهای هفته) و رفتار بسته شدن</h3>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>تاریخ و ساعت شروع نمایش (شمسی)</label>
							<div style="display:flex;gap:6px;">
								<input type="text" name="start_jdate" data-kn-jdate="1" class="kn-jdate-input" value="<?php echo esc_attr( $start_j ); ?>" placeholder="بلافاصله" autocomplete="off" />
								<input type="time" name="start_time" value="<?php echo esc_attr( $start_t ); ?>" style="width:105px;" />
							</div>
						</div>
						<div class="kn-field">
							<label>تاریخ و ساعت پایان نمایش (شمسی)</label>
							<div style="display:flex;gap:6px;">
								<input type="text" name="end_jdate" data-kn-jdate="1" class="kn-jdate-input" value="<?php echo esc_attr( $end_j ); ?>" placeholder="نامحدود" autocomplete="off" />
								<input type="time" name="end_time" value="<?php echo esc_attr( $end_t ); ?>" style="width:105px;" />
							</div>
						</div>
						<div class="kn-field">
							<label>ساعت مجاز نمایش روزانه (از ساعت)</label>
							<input type="time" name="daily_start_time" value="<?php echo esc_attr( $val['daily_start_time'] ); ?>" />
						</div>
						<div class="kn-field">
							<label>ساعت مجاز نمایش روزانه (تا ساعت)</label>
							<input type="time" name="daily_end_time" value="<?php echo esc_attr( $val['daily_end_time'] ); ?>" />
						</div>
					</div>

					<div class="kn-field">
						<label>روزهای هفته مجاز برای نمایش</label>
						<div class="kn-check-chips">
							<?php foreach ( $weekdays_labels as $wd_idx => $wd_name ) : ?>
								<label class="kn-check-chip">
									<input type="checkbox" name="weekdays[]" value="<?php echo esc_attr( $wd_idx ); ?>" <?php checked( in_array( (string) $wd_idx, $selected_wd, true ) ); ?> />
									<?php echo esc_html( $wd_name ); ?>
								</label>
							<?php endforeach; ?>
						</div>
					</div>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>تاخیر قبل از ظاهر شدن (ثانیه)</label>
							<input type="number" name="delay_seconds" value="<?php echo esc_attr( $val['delay_seconds'] ); ?>" min="0" max="120" />
						</div>
						<div class="kn-field">
							<label>بسته شدن خودکار پس از (ثانیه — ۰ = فقط دستی)</label>
							<input type="number" name="auto_close_seconds" value="<?php echo esc_attr( $val['auto_close_seconds'] ); ?>" min="0" max="300" />
						</div>
						<div class="kn-field">
							<label>تعداد تکرار برای هر کاربر</label>
							<select name="frequency_mode">
								<?php foreach ( KN_Marketing::$dialog_frequencies as $k => $lbl ) : ?>
									<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['frequency_mode'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
						<div class="kn-field">
							<label>فاصله ساعتی (برای حالت هر N ساعت) / سقف کل نمایش</label>
							<div style="display:flex;gap:6px;">
								<input type="number" name="frequency_hours" value="<?php echo esc_attr( $val['frequency_hours'] ); ?>" min="1" max="720" title="هر چند ساعت" />
								<input type="number" name="max_impressions_user" value="<?php echo esc_attr( $val['max_impressions_user'] ); ?>" min="0" max="1000" title="سقف نمایش برای هر کاربر (۰=نامحدود)" placeholder="سقف کل" />
							</div>
						</div>
					</div>

					<div style="display:flex;gap:18px;flex-wrap:wrap;margin:8px 0 14px;padding:10px 12px;background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;">
						<label><input type="checkbox" name="allow_user_close" value="1" <?php checked( ! empty( $val['allow_user_close'] ) ); ?> /> کاربر بتواند دیالوگ را ببندد (دکمه ضربدر)</label>
						<label><input type="checkbox" name="close_on_backdrop" value="1" <?php checked( ! empty( $val['close_on_backdrop'] ) ); ?> /> بسته شدن با کلیک بیرون کادر</label>
						<label><input type="checkbox" name="show_countdown" value="1" <?php checked( ! empty( $val['show_countdown'] ) ); ?> /> نمایش شمارنده معکوس در زمان بسته شدن خودکار</label>
					</div>

					<hr style="border:none;border-top:1px solid var(--kn-border);margin:14px 0;" />
					<h3 style="margin:0 0 10px;font-size:13.5px;color:var(--kn-primary);">۳. ظاهر، ابعاد، پلتفرم و مخاطب هدف</h3>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>سایز دیالوگ</label>
							<select name="dialog_size">
								<?php foreach ( KN_Marketing::$dialog_sizes as $k => $lbl ) : ?>
									<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['dialog_size'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
						<div class="kn-field">
							<label>جایگاه و انیمیشن</label>
							<div style="display:flex;gap:6px;">
								<select name="position">
									<?php foreach ( KN_Marketing::$dialog_positions as $k => $lbl ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['position'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
									<?php endforeach; ?>
								</select>
								<select name="animation">
									<option value="scale" <?php selected( $val['animation'], 'scale' ); ?>>Scale</option>
									<option value="slide_up" <?php selected( $val['animation'], 'slide_up' ); ?>>Slide Up</option>
									<option value="fade" <?php selected( $val['animation'], 'fade' ); ?>>Fade</option>
								</select>
							</div>
						</div>
						<div class="kn-field">
							<label>تم رنگی دیالوگ</label>
							<select name="theme_style">
								<?php foreach ( KN_Marketing::$dialog_themes as $k => $lbl ) : ?>
									<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['theme_style'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
								<?php endforeach; ?>
							</select>
						</div>
						<div class="kn-field">
							<label>پلتفرم و گروه مخاطب</label>
							<div style="display:flex;gap:6px;">
								<select name="target_platform">
									<option value="all" <?php selected( $val['target_platform'], 'all' ); ?>>همه پلتفرم‌ها</option>
									<option value="web" <?php selected( $val['target_platform'], 'web' ); ?>>وب‌اپ</option>
									<option value="mobile_app" <?php selected( $val['target_platform'], 'mobile_app' ); ?>>اپ موبایل</option>
								</select>
								<select name="target_audience">
									<?php foreach ( KN_Marketing::$audiences as $k => $lbl ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $val['target_audience'], $k ); ?>><?php echo esc_html( $lbl ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
						</div>
					</div>

					<div class="kn-field">
						<label>صفحات هدف داخل اپلیکیشن</label>
						<div class="kn-check-chips">
							<label class="kn-check-chip">
								<input type="checkbox" name="target_screens[]" value="all" <?php checked( in_array( 'all', $selected_screens, true ) ); ?> />
								همه صفحات
							</label>
							<?php foreach ( KN_Marketing::$app_screens as $sc_key => $sc_lbl ) : ?>
								<label class="kn-check-chip">
									<input type="checkbox" name="target_screens[]" value="<?php echo esc_attr( $sc_key ); ?>" <?php checked( in_array( $sc_key, $selected_screens, true ) ); ?> />
									<?php echo esc_html( $sc_lbl ); ?>
								</label>
							<?php endforeach; ?>
						</div>
					</div>

					<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:8px;">
						<label><input type="checkbox" name="overlay_blur" value="1" <?php checked( ! empty( $val['overlay_blur'] ) ); ?> /> محوشدن پس‌زمینه (Backdrop Blur)</label>
						<label style="font-weight:700;"><input type="checkbox" name="is_active" value="1" <?php checked( ! empty( $val['is_active'] ) ); ?> /> دیالوگ فعال باشد</label>
						<button type="submit" class="kn-btn kn-btn-green"><?php echo $is_editing ? 'ذخیره تغییرات دیالوگ' : 'ساخت دیالوگ زمان‌بندی‌شده'; ?></button>
					</div>
				</form>
			</div>
		</div>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>فهرست دیالوگ‌ها و گزارش تعامل کاربران (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $dialogs ) ) ); ?>)</h2>
			</div>
			<?php if ( empty( $dialogs ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">هنوز دیالوگی ایجاد نشده است.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table">
						<thead>
							<tr>
								<th>دیالوگ و ظاهر</th>
								<th>زمان‌بندی شمسی و قواعد</th>
								<th>پلتفرم / مخاطب</th>
								<th>آمار نمایش و کلیک</th>
								<th>وضعیت</th>
								<th>عملیات</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $dialogs as $d ) : ?>
								<?php
								$imp = (int) $d['impressions_web'] + (int) $d['impressions_mobile'];
								$clk = (int) $d['clicks_web'] + (int) $d['clicks_mobile'];
								$ctr = $imp > 0 ? round( ( $clk / $imp ) * 100, 1 ) : 0;
								?>
								<tr>
									<td>
										<div style="display:flex;align-items:center;gap:10px;">
											<?php if ( ! empty( $d['image_url'] ) ) : ?>
												<img src="<?php echo esc_url( $d['image_url'] ); ?>" alt="" style="width:46px;height:46px;object-fit:cover;border-radius:10px;border:1px solid var(--kn-border);flex-shrink:0;" />
											<?php endif; ?>
											<div>
												<strong><?php echo esc_html( $d['title'] ); ?></strong>
												<div style="font-size:11px;color:var(--kn-ink-subtle);">
													سایز: <?php echo esc_html( $d['dialog_size'] ); ?> · تم: <?php echo esc_html( $d['theme_style'] ); ?> · اولویت: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['priority'] ) ); ?>
												</div>
											</div>
										</div>
									</td>
									<td style="font-size:11.5px;">
										<div>شروع: <?php echo ! empty( $d['start_at'] ) ? esc_html( KN_Jalali::format( $d['start_at'], true, true ) ) : 'فوری'; ?></div>
										<div>پایان: <?php echo ! empty( $d['end_at'] ) ? esc_html( KN_Jalali::format( $d['end_at'], true, true ) ) : 'نامحدود'; ?></div>
										<?php if ( ! empty( $d['daily_start_time'] ) || ! empty( $d['daily_end_time'] ) ) : ?>
											<div style="color:var(--kn-primary);">ساعت روزانه: <?php echo esc_html( $d['daily_start_time'] ?: '00:00' ); ?> تا <?php echo esc_html( $d['daily_end_time'] ?: '23:59' ); ?></div>
										<?php endif; ?>
										<div>
											بستن خودکار: <?php echo (int) $d['auto_close_seconds'] > 0 ? esc_html( KN_Jalali::to_persian_digits( $d['auto_close_seconds'] ) . ' ثانیه' ) : 'دستی'; ?>
										</div>
									</td>
									<td>
										<div><span class="kn-pill kn-pill-slate"><?php echo $d['target_platform'] === 'web' ? 'وب' : ( $d['target_platform'] === 'mobile_app' ? 'موبایل' : 'همه' ); ?></span></div>
										<div style="font-size:11px;color:var(--kn-ink-subtle);margin-top:3px;"><?php echo esc_html( KN_Marketing::$audiences[ $d['target_audience'] ] ?? $d['target_audience'] ); ?></div>
										<div style="font-size:11px;color:var(--kn-ink-subtle);"><?php echo esc_html( KN_Marketing::$dialog_frequencies[ $d['frequency_mode'] ] ?? $d['frequency_mode'] ); ?></div>
									</td>
									<td>
										<div><strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $imp ) ) ); ?></strong> نمایش (وب <?php echo esc_html( KN_Jalali::to_persian_digits( $d['impressions_web'] ) ); ?> / اپ <?php echo esc_html( KN_Jalali::to_persian_digits( $d['impressions_mobile'] ) ); ?>)</div>
										<div><strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $clk ) ) ); ?></strong> کلیک <span class="kn-pill kn-pill-violet">CTR <?php echo esc_html( KN_Jalali::to_persian_digits( $ctr ) ); ?>٪</span></div>
										<div style="font-size:11px;color:var(--kn-ink-subtle);">بستن دستی: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['closes_count'] ) ); ?> | خودکار: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['autoclose_count'] ) ); ?></div>
									</td>
									<td>
										<span class="kn-pill <?php echo ! empty( $d['is_active'] ) ? 'kn-pill-green' : 'kn-pill-slate'; ?>">
											<?php echo ! empty( $d['is_active'] ) ? 'فعال' : 'غیرفعال'; ?>
										</span>
									</td>
									<td>
										<div style="display:flex;gap:6px;flex-wrap:wrap;">
											<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=dialogs&edit_dialog=' . $d['id'] ) ); ?>">ویرایش</a>
											<form method="post" style="display:inline;">
												<?php wp_nonce_field( 'kn_toggle_dialog' ); ?>
												<input type="hidden" name="kn_action" value="toggle_dialog" />
												<input type="hidden" name="dialog_id" value="<?php echo esc_attr( $d['id'] ); ?>" />
												<button type="submit" class="kn-btn kn-btn-amber kn-btn-sm"><?php echo ! empty( $d['is_active'] ) ? 'توقف' : 'فعال'; ?></button>
											</form>
											<form method="post" style="display:inline;" onsubmit="return confirm('این دیالوگ حذف شود؟');">
												<?php wp_nonce_field( 'kn_delete_dialog' ); ?>
												<input type="hidden" name="kn_action" value="delete_dialog" />
												<input type="hidden" name="dialog_id" value="<?php echo esc_attr( $d['id'] ); ?>" />
												<button type="submit" class="kn-btn kn-btn-danger kn-btn-sm">حذف</button>
											</form>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}
}
