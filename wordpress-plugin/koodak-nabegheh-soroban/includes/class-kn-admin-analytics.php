<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Analytics & Reports Dashboard Page (Web vs Mobile App, Jalali Trends, Commerce, Banners & Dialogs CTR).
 */
class KN_Admin_Analytics {

	public static function render_page() {
		$preset     = sanitize_key( wp_unslash( $_GET['preset'] ?? '' ) );
		$from_j_in  = sanitize_text_field( wp_unslash( $_GET['from_jdate'] ?? '' ) );
		$to_j_in    = sanitize_text_field( wp_unslash( $_GET['to_jdate'] ?? '' ) );

		if ( $preset === '7d' ) {
			$from_g = gmdate( 'Y-m-d', current_time( 'timestamp' ) - ( 6 * DAY_IN_SECONDS ) );
			$to_g   = current_time( 'Y-m-d' );
		} elseif ( $preset === '30d' ) {
			$from_g = gmdate( 'Y-m-d', current_time( 'timestamp' ) - ( 29 * DAY_IN_SECONDS ) );
			$to_g   = current_time( 'Y-m-d' );
		} elseif ( $preset === '90d' ) {
			$from_g = gmdate( 'Y-m-d', current_time( 'timestamp' ) - ( 89 * DAY_IN_SECONDS ) );
			$to_g   = current_time( 'Y-m-d' );
		} else {
			$from_g = $from_j_in !== '' ? KN_Jalali::parse_jalali_to_date( $from_j_in ) : '';
			$to_g   = $to_j_in !== '' ? KN_Jalali::parse_jalali_to_date( $to_j_in ) : '';
		}

		$report = KN_Marketing::get_analytics_report( $from_g, $to_g );
		$visits = $report['visits'];
		$comm   = $report['commerce'];
		$btot   = $report['bannerTotals'];
		$dtot   = $report['dialogTotals'];
		$auth   = $report['authStats'];
		$series = $report['dailySeries'];

		KN_Admin::render_shell_open(
			'kn-soroban-analytics',
			'گزارشات و تحلیل عملکرد اپلیکیشن',
			'پایش بازدید وب‌اپلیکیشن و اپلیکیشن موبایل (APK)، نمودار روند شمسی، فروش ووکامرس و اثربخشی بنرها و دیالوگ‌ها'
		);
		?>

		<!-- Filter Bar with Jalali DatePicker & Presets -->
		<form method="get" class="kn-filter-bar">
			<input type="hidden" name="page" value="kn-soroban-analytics" />
			<div class="kn-filter-item">
				<label>از تاریخ (شمسی)</label>
				<input type="text" name="from_jdate" data-kn-jdate="1" class="kn-jdate-input kn-input-sm" value="<?php echo esc_attr( $report['fromJalali'] ); ?>" placeholder="1405/01/01" autocomplete="off" />
			</div>
			<div class="kn-filter-item">
				<label>تا تاریخ (شمسی)</label>
				<input type="text" name="to_jdate" data-kn-jdate="1" class="kn-jdate-input kn-input-sm" value="<?php echo esc_attr( $report['toJalali'] ); ?>" placeholder="1405/01/30" autocomplete="off" />
			</div>
			<button type="submit" class="kn-btn kn-btn-primary">اعمال بازه تاریخ</button>
			<div style="display:flex;gap:6px;flex-wrap:wrap;margin-right:auto;">
				<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-analytics&preset=7d' ) ); ?>">۷ روز اخیر</a>
				<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-analytics&preset=30d' ) ); ?>">۳۰ روز اخیر</a>
				<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-analytics&preset=90d' ) ); ?>">۳ ماه اخیر</a>
			</div>
		</form>

		<!-- Top KPI Grid -->
		<div class="kn-kpi-grid">
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-slate">📊</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['total'] ) ) ); ?></div>
					<div class="kn-kpi-label">کل بازدیدهای ثبت‌شده</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-blue">🌐</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['web_total'] ) ) ); ?></div>
					<div class="kn-kpi-label">بازدید وب‌اپ (<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['web_unique'] ) ) ); ?> نشست یکتا)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-green">📱</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['mobile_total'] ) ) ); ?></div>
					<div class="kn-kpi-label">بازدید اپلیکیشن موبایل (<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $visits['mobile_unique'] ) ) ); ?> دستگاه یکتا)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-amber">💰</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $comm['total_revenue'] ) ) ); ?></div>
					<div class="kn-kpi-label">فروش موفق ووکامرس (<?php echo esc_html( KN_Jalali::to_persian_digits( $comm['completed_orders'] ) ); ?> سفارش)</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-violet">📣</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( $btot['ctr'] ) ); ?>٪ / <?php echo esc_html( KN_Jalali::to_persian_digits( $dtot['ctr'] ) ); ?>٪</div>
					<div class="kn-kpi-label">نرخ کلیک بنر / دیالوگ</div>
				</div>
			</div>
		</div>

		<!-- Daily Visits Trend Chart (Web vs Mobile App) -->
		<div class="kn-card">
			<div class="kn-card-header">
				<div>
					<h2>نمودار روزانه بازدید وب‌اپ و اپلیکیشن موبایل (تقویم شمسی)</h2>
					<div style="font-size:11.5px;color:var(--kn-ink-subtle);margin-top:2px;">
						بازه: <?php echo esc_html( KN_Jalali::to_persian_digits( $report['fromJalali'] ) ); ?> تا <?php echo esc_html( KN_Jalali::to_persian_digits( $report['toJalali'] ) ); ?>
					</div>
				</div>
				<div class="kn-chart-legend">
					<span><i class="kn-legend-dot" style="background:#2563eb;"></i>وب‌اپلیکیشن</span>
					<span><i class="kn-legend-dot" style="background:#059669;"></i>اپلیکیشن موبایل (APK)</span>
				</div>
			</div>

			<?php self::render_dual_bar_svg_chart( $series ); ?>
		</div>

		<div class="kn-grid-2">
			<!-- Platform & OS + Auth Activity -->
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>تفکیک دستگاه‌ها و ورود کاربران در بازه</h2>
				</div>

				<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px;">
					<div style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:10px 12px;">
						<div style="font-size:11px;color:var(--kn-ink-subtle);">مجموع ورودها (رمز / پیامک)</div>
						<div style="font-size:18px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;">
							<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $auth['logins'] ) ) ); ?>
							<span style="font-size:11px;font-weight:600;color:var(--kn-primary);">(<?php echo esc_html( KN_Jalali::to_persian_digits( $auth['otp_logins'] ) ); ?> با OTP)</span>
						</div>
					</div>
					<div style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:10px 12px;">
						<div style="font-size:11px;color:var(--kn-ink-subtle);">ثبت‌نام جدید / خروج ثبت‌شده</div>
						<div style="font-size:18px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;">
							<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $auth['registrations'] ) ) ); ?> / <?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $auth['logouts'] ) ) ); ?>
						</div>
					</div>
				</div>

				<?php if ( empty( $report['osBreakdown'] ) ) : ?>
					<p style="font-size:12.5px;color:var(--kn-ink-subtle);">هنوز داده‌ای از سیستم‌عامل کاربران در این بازه ثبت نشده است.</p>
				<?php else : ?>
					<?php
					$total_os = max( 1, (int) $visits['total'] );
					$os_labels = array(
						'android'    => 'اندروید (اپلیکیشن موبایل / وب)',
						'ios'        => 'آیفون / iOS',
						'windows'    => 'ویندوز (دسکتاپ)',
						'mac'        => 'مک (macOS)',
						'linux'      => 'لینوکس',
						'web'        => 'مرورگر وب',
						'mobile_app' => 'اپلیکیشن موبایل',
					);
					foreach ( $report['osBreakdown'] as $os ) :
						$cnt = (int) $os['cnt'];
						$pct = min( 100, round( ( $cnt / $total_os ) * 100 ) );
						$lbl = $os_labels[ $os['os_name'] ] ?? $os['os_name'];
						?>
						<div style="margin-bottom:10px;">
							<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px;">
								<span><?php echo esc_html( $lbl ); ?></span>
								<span><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $cnt ) ) ); ?> (<?php echo esc_html( KN_Jalali::to_persian_digits( $pct ) ); ?>٪)</span>
							</div>
							<div style="height:8px;background:var(--kn-surface-alt);border-radius:999px;overflow:hidden;">
								<div style="height:100%;width:<?php echo esc_attr( $pct ); ?>%;background:linear-gradient(90deg,#2563eb,#4f46e5);border-radius:999px;"></div>
							</div>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>
			</div>

			<!-- WooCommerce Sales Breakdown -->
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>تحلیل فروش و پرفروش‌ترین اقلام (بازه انتخابی)</h2>
					<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-orders' ) ); ?>">مدیریت سفارشات</a>
				</div>

				<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px;">
					<div style="background:var(--kn-green-soft);border-radius:10px;padding:10px;">
						<div style="font-size:11px;color:#065f46;">تکمیل / پردازش</div>
						<div style="font-size:17px;font-weight:800;color:#047857;"><?php echo esc_html( KN_Jalali::to_persian_digits( $comm['completed_orders'] ) ); ?></div>
					</div>
					<div style="background:var(--kn-amber-soft);border-radius:10px;padding:10px;">
						<div style="font-size:11px;color:#92400e;">در انتظار بررسی/واریز</div>
						<div style="font-size:17px;font-weight:800;color:#b45309;"><?php echo esc_html( KN_Jalali::to_persian_digits( $comm['pending_orders'] ) ); ?></div>
					</div>
					<div style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:10px;">
						<div style="font-size:11px;color:var(--kn-ink-subtle);">میانگین سبد خرید</div>
						<div style="font-size:15px;font-weight:800;"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $comm['avg_order'] ) ) ); ?></div>
					</div>
				</div>

				<?php if ( empty( $comm['top_items'] ) ) : ?>
					<p style="font-size:12.5px;color:var(--kn-ink-subtle);">در این بازه تاریخی هنوز سفارش موفقی ثبت نشده است.</p>
				<?php else : ?>
					<div class="kn-table-wrap">
						<table class="kn-table">
							<thead>
								<tr>
									<th>نام ترم / محصول</th>
									<th>تعداد</th>
									<th>درآمد کل</th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $comm['top_items'] as $ti ) : ?>
									<tr>
										<td><strong><?php echo esc_html( $ti['name'] ); ?></strong></td>
										<td><?php echo esc_html( KN_Jalali::to_persian_digits( $ti['qty'] ) ); ?></td>
										<td><strong style="color:var(--kn-green);"><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $ti['revenue'] ) ) ); ?></strong></td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				<?php endif; ?>
			</div>
		</div>

		<!-- Banners & Dialogs Performance Tables -->
		<div class="kn-grid-2">
			<div class="kn-card">
				<div class="kn-card-header">
					<h2>گزارش عملکرد بنرهای تبلیغاتی</h2>
					<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=banners' ) ); ?>">مدیریت بنرها</a>
				</div>
				<?php if ( empty( $report['banners'] ) ) : ?>
					<p style="font-size:12.5px;color:var(--kn-ink-subtle);">بنر تبلیغاتی تعریف نشده است.</p>
				<?php else : ?>
					<div class="kn-table-wrap">
						<table class="kn-table">
							<thead>
								<tr>
									<th>عنوان بنر</th>
									<th>بازدید (وب / موبایل)</th>
									<th>کلیک</th>
									<th>CTR</th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $report['banners'] as $b ) : ?>
									<?php
									$imp = (int) $b['impressions_web'] + (int) $b['impressions_mobile'];
									$clk = (int) $b['clicks_web'] + (int) $b['clicks_mobile'];
									$ctr = $imp > 0 ? round( ( $clk / $imp ) * 100, 1 ) : 0;
									?>
									<tr>
										<td>
											<strong><?php echo esc_html( $b['title'] ); ?></strong>
											<div style="font-size:11px;color:var(--kn-ink-subtle);"><?php echo esc_html( KN_Marketing::$placements[ $b['placement'] ] ?? $b['placement'] ); ?></div>
										</td>
										<td>
											<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $imp ) ) ); ?>
											<div style="font-size:11px;color:var(--kn-ink-subtle);">
												وب: <?php echo esc_html( KN_Jalali::to_persian_digits( $b['impressions_web'] ) ); ?> | اپ: <?php echo esc_html( KN_Jalali::to_persian_digits( $b['impressions_mobile'] ) ); ?>
											</div>
										</td>
										<td><strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $clk ) ) ); ?></strong></td>
										<td><span class="kn-pill kn-pill-blue"><?php echo esc_html( KN_Jalali::to_persian_digits( $ctr ) ); ?>٪</span></td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				<?php endif; ?>
			</div>

			<div class="kn-card">
				<div class="kn-card-header">
					<h2>گزارش تعامل دیالوگ‌های زمان‌بندی‌شده</h2>
					<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-marketing&tab=dialogs' ) ); ?>">مدیریت دیالوگ‌ها</a>
				</div>
				<?php if ( empty( $report['dialogs'] ) ) : ?>
					<p style="font-size:12.5px;color:var(--kn-ink-subtle);">دیالوگ زمان‌بندی‌شده‌ای تعریف نشده است.</p>
				<?php else : ?>
					<div class="kn-table-wrap">
						<table class="kn-table">
							<thead>
								<tr>
									<th>عنوان دیالوگ</th>
									<th>نمایش (وب / اپ)</th>
									<th>کلیک / بسته شدن</th>
									<th>CTR</th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $report['dialogs'] as $d ) : ?>
									<?php
									$imp = (int) $d['impressions_web'] + (int) $d['impressions_mobile'];
									$clk = (int) $d['clicks_web'] + (int) $d['clicks_mobile'];
									$ctr = $imp > 0 ? round( ( $clk / $imp ) * 100, 1 ) : 0;
									?>
									<tr>
										<td>
											<strong><?php echo esc_html( $d['title'] ); ?></strong>
											<div style="font-size:11px;color:var(--kn-ink-subtle);">بستن دستی: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['closes_count'] ) ); ?> | خودکار: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['autoclose_count'] ) ); ?></div>
										</td>
										<td>
											<?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $imp ) ) ); ?>
											<div style="font-size:11px;color:var(--kn-ink-subtle);">
												وب: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['impressions_web'] ) ); ?> | اپ: <?php echo esc_html( KN_Jalali::to_persian_digits( $d['impressions_mobile'] ) ); ?>
											</div>
										</td>
										<td><strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( $clk ) ) ); ?></strong></td>
										<td><span class="kn-pill kn-pill-violet"><?php echo esc_html( KN_Jalali::to_persian_digits( $ctr ) ); ?>٪</span></td>
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

	/**
	 * Render responsive inline SVG Dual Bar Chart for Web vs Mobile App daily visits.
	 */
	public static function render_dual_bar_svg_chart( $series ) {
		if ( empty( $series ) ) {
			echo '<p style="font-size:12.5px;color:var(--kn-ink-subtle);">داده‌ای برای نمایش در این بازه وجود ندارد.</p>';
			return;
		}
		$max_val = 1;
		foreach ( $series as $pt ) {
			$max_val = max( $max_val, (int) $pt['web'], (int) $pt['mobile'] );
		}

		$count       = count( $series );
		$slot_width  = max( 26, min( 54, (int) floor( 760 / max( 1, $count ) ) ) );
		$svg_width   = max( 680, $count * $slot_width + 64 );
		$svg_height  = 230;
		$pad_top     = 16;
		$pad_bottom  = 42;
		$pad_left    = 46;
		$chart_h     = $svg_height - $pad_top - $pad_bottom;
		$label_every = $count > 16 ? (int) ceil( $count / 10 ) : 1;
		?>
		<div class="kn-chart-box">
			<svg viewBox="0 0 <?php echo esc_attr( $svg_width ); ?> <?php echo esc_attr( $svg_height ); ?>" style="width:100%;min-width:600px;height:230px;display:block;font-family:Vazirmatn,Tahoma,sans-serif;" role="img" aria-label="نمودار بازدید روزانه وب‌اپ و اپلیکیشن موبایل">
				<?php
				// Grid lines (4 steps)
				for ( $g = 0; $g <= 4; $g++ ) {
					$y   = $pad_top + (int) round( ( $chart_h / 4 ) * $g );
					$val = (int) round( $max_val * ( 4 - $g ) / 4 );
					?>
					<line x1="<?php echo esc_attr( $pad_left ); ?>" y1="<?php echo esc_attr( $y ); ?>" x2="<?php echo esc_attr( $svg_width - 12 ); ?>" y2="<?php echo esc_attr( $y ); ?>" stroke="#e2e8f0" stroke-dasharray="3,3" />
					<text x="<?php echo esc_attr( $pad_left - 8 ); ?>" y="<?php echo esc_attr( $y + 4 ); ?>" text-anchor="end" font-size="10" fill="#64748b"><?php echo esc_html( KN_Jalali::to_persian_digits( $val ) ); ?></text>
				<?php } ?>

				<?php
				foreach ( $series as $idx => $pt ) {
					$x_base   = $pad_left + 10 + ( $idx * $slot_width );
					$bar_w    = max( 6, min( 14, (int) floor( ( $slot_width - 8 ) / 2 ) ) );
					$web_cnt  = (int) $pt['web'];
					$mob_cnt  = (int) $pt['mobile'];
					$web_h    = $web_cnt > 0 ? max( 3, (int) round( ( $web_cnt / $max_val ) * $chart_h ) ) : 0;
					$mob_h    = $mob_cnt > 0 ? max( 3, (int) round( ( $mob_cnt / $max_val ) * $chart_h ) ) : 0;
					$y_bottom = $pad_top + $chart_h;
					$tooltip  = $pt['jFull'] . ' — وب: ' . KN_Jalali::to_persian_digits( $web_cnt ) . ' | موبایل: ' . KN_Jalali::to_persian_digits( $mob_cnt );
					?>
					<g>
						<title><?php echo esc_html( $tooltip ); ?></title>
						<?php if ( $web_h > 0 ) : ?>
							<rect x="<?php echo esc_attr( $x_base ); ?>" y="<?php echo esc_attr( $y_bottom - $web_h ); ?>" width="<?php echo esc_attr( $bar_w ); ?>" height="<?php echo esc_attr( $web_h ); ?>" rx="3" fill="#2563eb" />
						<?php else : ?>
							<rect x="<?php echo esc_attr( $x_base ); ?>" y="<?php echo esc_attr( $y_bottom - 2 ); ?>" width="<?php echo esc_attr( $bar_w ); ?>" height="2" rx="1" fill="#dbeafe" />
						<?php endif; ?>

						<?php if ( $mob_h > 0 ) : ?>
							<rect x="<?php echo esc_attr( $x_base + $bar_w + 2 ); ?>" y="<?php echo esc_attr( $y_bottom - $mob_h ); ?>" width="<?php echo esc_attr( $bar_w ); ?>" height="<?php echo esc_attr( $mob_h ); ?>" rx="3" fill="#059669" />
						<?php else : ?>
							<rect x="<?php echo esc_attr( $x_base + $bar_w + 2 ); ?>" y="<?php echo esc_attr( $y_bottom - 2 ); ?>" width="<?php echo esc_attr( $bar_w ); ?>" height="2" rx="1" fill="#d1fae5" />
						<?php endif; ?>

						<?php if ( $idx % $label_every === 0 || $idx === $count - 1 ) : ?>
							<text x="<?php echo esc_attr( $x_base + $bar_w ); ?>" y="<?php echo esc_attr( $y_bottom + 18 ); ?>" text-anchor="middle" font-size="10" fill="#475569"><?php echo esc_html( $pt['jLabel'] ); ?></text>
						<?php endif; ?>
					</g>
				<?php } ?>
			</svg>
		</div>
		<?php
	}
}
