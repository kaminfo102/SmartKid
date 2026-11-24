<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Full WooCommerce Orders Management & Products Catalog CRUD inside Koodak Nabegheh Admin.
 */
class KN_Admin_Commerce {

	private static function status_pill_class( $st ) {
		if ( $st === 'completed' ) {
			return 'kn-pill-green';
		}
		if ( $st === 'processing' ) {
			return 'kn-pill-blue';
		}
		if ( $st === 'on-hold' || $st === 'pending' ) {
			return 'kn-pill-amber';
		}
		return 'kn-pill-red';
	}

	public static function render_orders_page() {
		$woo_active  = KN_Woo::is_woo_active();
		$status_f    = sanitize_key( wp_unslash( $_GET['status'] ?? 'all' ) );
		$pay_f       = sanitize_key( wp_unslash( $_GET['payment_method'] ?? '' ) );
		$search_f    = sanitize_text_field( wp_unslash( $_GET['search'] ?? '' ) );
		$from_j      = sanitize_text_field( wp_unslash( $_GET['from_jdate'] ?? '' ) );
		$to_j        = sanitize_text_field( wp_unslash( $_GET['to_jdate'] ?? '' ) );
		$inspect_id  = absint( $_GET['order_id'] ?? 0 );

		$from_g = $from_j !== '' ? KN_Jalali::parse_jalali_to_date( $from_j ) : '';
		$to_g   = $to_j !== '' ? KN_Jalali::parse_jalali_to_date( $to_j ) : '';

		$result = $woo_active ? KN_Woo::admin_get_orders(
			array(
				'status'         => $status_f,
				'payment_method' => $pay_f,
				'search'         => $search_f,
				'from_date'      => $from_g,
				'to_date'        => $to_g,
				'limit'          => 150,
			)
		) : array( 'orders' => array(), 'counts' => array() );

		$orders      = $result['orders'];
		$counts      = $result['counts'];
		$order_detail = ( $woo_active && $inspect_id > 0 ) ? KN_Woo::admin_get_order_detail( $inspect_id ) : null;

		$all_statuses = array(
			'pending'    => 'در انتظار پرداخت',
			'on-hold'    => 'در انتظار بررسی / تایید فیش',
			'processing' => 'در حال انجام',
			'completed'  => 'تکمیل شده',
			'cancelled'  => 'لغو شده',
			'refunded'   => 'مسترد شده',
			'failed'     => 'ناموفق',
		);

		KN_Admin::render_shell_open(
			'kn-soroban-orders',
			'مدیریت کامل سفارشات ووکامرس',
			'بررسی سفارش‌های ترم و فروشگاه، تایید فیش‌های واریزی، ثبت کد رهگیری، یادداشت مشتری و خروجی اکسل با تاریخ شمسی'
		);

		if ( ! $woo_active ) : ?>
			<div class="kn-notice kn-notice-error">افزونه WooCommerce فعال نیست. برای مدیریت سفارشات، ابتدا ووکامرس را فعال کنید.</div>
		<?php
			KN_Admin::render_shell_close();
			return;
		endif;
		?>

		<!-- Status KPI Cards -->
		<div class="kn-kpi-grid">
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-amber">⏳</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( ( $counts['on-hold'] ?? 0 ) + ( $counts['pending'] ?? 0 ) ) ); ?></div>
					<div class="kn-kpi-label">در انتظار بررسی / واریز</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-blue">📦</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( $counts['processing'] ?? 0 ) ); ?></div>
					<div class="kn-kpi-label">در حال پردازش / ارسال</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-green">✅</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( $counts['completed'] ?? 0 ) ); ?></div>
					<div class="kn-kpi-label">تکمیل شده</div>
				</div>
			</div>
			<div class="kn-kpi-card">
				<div class="kn-kpi-badge kn-bg-slate">🚫</div>
				<div>
					<div class="kn-kpi-num"><?php echo esc_html( KN_Jalali::to_persian_digits( ( $counts['cancelled'] ?? 0 ) + ( $counts['failed'] ?? 0 ) ) ); ?></div>
					<div class="kn-kpi-label">لغو شده / ناموفق</div>
				</div>
			</div>
		</div>

		<!-- Filter Bar & CSV Export -->
		<div class="kn-filter-bar" style="justify-content:space-between;">
			<form method="get" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;flex:1;">
				<input type="hidden" name="page" value="kn-soroban-orders" />
				<div class="kn-filter-item" style="min-width:190px;">
					<label>جستجو (شماره، نام، موبایل، شهر)</label>
					<input type="text" name="search" class="kn-input-sm" value="<?php echo esc_attr( $search_f ); ?>" placeholder="جستجوی سریع..." />
				</div>
				<div class="kn-filter-item">
					<label>وضعیت سفارش</label>
					<select name="status" class="kn-input-sm">
						<option value="all" <?php selected( $status_f, 'all' ); ?>>همه وضعیت‌ها</option>
						<?php foreach ( $all_statuses as $sk => $sl ) : ?>
							<option value="<?php echo esc_attr( $sk ); ?>" <?php selected( $status_f, $sk ); ?>><?php echo esc_html( $sl ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
				<div class="kn-filter-item">
					<label>روش پرداخت</label>
					<select name="payment_method" class="kn-input-sm">
						<option value="" <?php selected( $pay_f, '' ); ?>>همه روش‌ها</option>
						<option value="bacs" <?php selected( $pay_f, 'bacs' ); ?>>کارت به کارت / فیش بانکی</option>
					</select>
				</div>
				<div class="kn-filter-item">
					<label>از تاریخ شمسی</label>
					<input type="text" name="from_jdate" data-kn-jdate="1" class="kn-jdate-input kn-input-sm" value="<?php echo esc_attr( $from_j ); ?>" placeholder="1405/01/01" autocomplete="off" />
				</div>
				<div class="kn-filter-item">
					<label>تا تاریخ شمسی</label>
					<input type="text" name="to_jdate" data-kn-jdate="1" class="kn-jdate-input kn-input-sm" value="<?php echo esc_attr( $to_j ); ?>" placeholder="1405/12/29" autocomplete="off" />
				</div>
				<button type="submit" class="kn-btn kn-btn-primary">فیلتر سفارشات</button>
			</form>

			<form method="post">
				<?php wp_nonce_field( 'kn_export_orders' ); ?>
				<input type="hidden" name="kn_action" value="export_orders_csv" />
				<input type="hidden" name="status" value="<?php echo esc_attr( $status_f ); ?>" />
				<input type="hidden" name="search" value="<?php echo esc_attr( $search_f ); ?>" />
				<input type="hidden" name="from_jdate" value="<?php echo esc_attr( $from_j ); ?>" />
				<input type="hidden" name="to_jdate" value="<?php echo esc_attr( $to_j ); ?>" />
				<button type="submit" class="kn-btn kn-btn-ghost">⬇ خروجی اکسل (CSV شمسی)</button>
			</form>
		</div>

		<?php if ( $order_detail ) : ?>
			<div class="kn-card" style="border:2px solid var(--kn-primary);">
				<div class="kn-card-header">
					<div>
						<h2>مدیریت سفارش #<?php echo esc_html( KN_Jalali::to_persian_digits( $order_detail['orderNumber'] ) ); ?></h2>
						<div style="font-size:12px;color:var(--kn-ink-subtle);margin-top:2px;">
							تاریخ ثبت: <?php echo esc_html( $order_detail['dateCreated'] ); ?> · مبلغ کل: <strong style="color:var(--kn-green);"><?php echo esc_html( $order_detail['totalFormatted'] ); ?></strong>
						</div>
					</div>
					<div style="display:flex;gap:8px;align-items:center;">
						<span class="kn-pill <?php echo esc_attr( self::status_pill_class( $order_detail['status'] ) ); ?>"><?php echo esc_html( $order_detail['statusLabel'] ); ?></span>
						<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-orders' ) ); ?>">بستن جزئیات</a>
					</div>
				</div>

				<div class="kn-grid-3">
					<div style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:12px;">
						<h3 style="margin:0 0 8px;font-size:13px;">اطلاعات خریدار و نشانی</h3>
						<div style="font-size:12.5px;line-height:1.9;">
							<div><strong>نام:</strong> <?php echo esc_html( $order_detail['customerName'] ?: '—' ); ?></div>
							<div><strong>موبایل:</strong> <span dir="ltr"><?php echo esc_html( $order_detail['customerPhone'] ?: '—' ); ?></span></div>
							<div><strong>ایمیل:</strong> <span dir="ltr"><?php echo esc_html( $order_detail['customerEmail'] ?: '—' ); ?></span></div>
							<div><strong>استان / شهر:</strong> <?php echo esc_html( trim( $order_detail['address']['state'] . ' / ' . $order_detail['address']['city'], ' /' ) ?: '—' ); ?></div>
							<div><strong>نشانی:</strong> <?php echo esc_html( $order_detail['address']['address1'] ?: '—' ); ?></div>
							<div><strong>کد پستی:</strong> <span dir="ltr"><?php echo esc_html( $order_detail['address']['postcode'] ?: '—' ); ?></span></div>
							<?php if ( ! empty( $order_detail['customerId'] ) ) : ?>
								<div style="margin-top:6px;">
									<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-users&user_id=' . $order_detail['customerId'] ) ); ?>">پرونده کامل کاربر</a>
								</div>
							<?php endif; ?>
						</div>
					</div>

					<div style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:12px;">
						<h3 style="margin:0 0 8px;font-size:13px;">اقلام سفارش و رسید پرداخت</h3>
						<?php foreach ( $order_detail['items'] as $it ) : ?>
							<div style="font-size:12.5px;padding:4px 0;border-bottom:1px dashed var(--kn-border);">
								• <strong><?php echo esc_html( $it['name'] ); ?></strong> × <?php echo esc_html( KN_Jalali::to_persian_digits( $it['qty'] ) ); ?>
							</div>
						<?php endforeach; ?>
						<div style="font-size:12px;margin-top:8px;"><strong>روش پرداخت:</strong> <?php echo esc_html( $order_detail['paymentMethodTitle'] ?: $order_detail['paymentMethod'] ); ?></div>
						<?php if ( ! empty( $order_detail['receiptUrl'] ) ) : ?>
							<div style="margin-top:10px;">
								<div style="font-size:11.5px;font-weight:700;margin-bottom:4px;">تصویر فیش بانکی:</div>
								<a href="<?php echo esc_url( $order_detail['receiptUrl'] ); ?>" target="_blank" rel="noopener noreferrer">
									<img src="<?php echo esc_url( $order_detail['receiptUrl'] ); ?>" alt="رسید بانکی" style="max-width:190px;max-height:140px;border-radius:10px;border:2px solid #f59e0b;" />
								</a>
							</div>
						<?php endif; ?>
						<?php if ( ! empty( $order_detail['paymentNote'] ) ) : ?>
							<div style="margin-top:8px;font-size:12px;background:#fffbeb;padding:8px;border-radius:8px;border:1px solid #fde68a;">
								<strong>توضیح واریز کاربر:</strong> <?php echo esc_html( $order_detail['paymentNote'] ); ?>
							</div>
						<?php endif; ?>
					</div>

					<div style="background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;padding:12px;">
						<h3 style="margin:0 0 8px;font-size:13px;">تغییر وضعیت، کد رهگیری و یادداشت</h3>
						<form method="post">
							<?php wp_nonce_field( 'kn_admin_update_order' ); ?>
							<input type="hidden" name="kn_action" value="admin_update_order" />
							<input type="hidden" name="order_id" value="<?php echo esc_attr( $order_detail['id'] ); ?>" />

							<div class="kn-field">
								<label>وضعیت جدید سفارش</label>
								<select name="status">
									<?php foreach ( $all_statuses as $sk => $sl ) : ?>
										<option value="<?php echo esc_attr( $sk ); ?>" <?php selected( $order_detail['status'], $sk ); ?>><?php echo esc_html( $sl ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="kn-field">
								<label>کد رهگیری پستی / تراکنش</label>
								<input type="text" name="tracking_code" dir="ltr" value="<?php echo esc_attr( $order_detail['trackingCode'] ?? '' ); ?>" placeholder="کد مرسوله یا شماره پیگیری..." />
							</div>
							<div class="kn-field">
								<label>افزودن یادداشت</label>
								<textarea name="admin_note" rows="2" placeholder="متن یادداشت داخلی یا پیام برای مشتری..."></textarea>
								<label style="margin-top:4px;font-weight:600;"><input type="checkbox" name="note_to_customer" value="1" /> ارسال پیام یادداشت برای مشتری (ایمیل)</label>
							</div>
							<button type="submit" class="kn-btn kn-btn-primary">ذخیره تغییرات سفارش</button>
						</form>
					</div>
				</div>

				<?php if ( ! empty( $order_detail['notes'] ) ) : ?>
					<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--kn-border);">
						<strong style="font-size:12.5px;">تاریخچه یادداشت‌های سفارش:</strong>
						<div style="display:grid;gap:6px;margin-top:8px;">
							<?php foreach ( $order_detail['notes'] as $note ) : ?>
								<div style="font-size:12px;background:var(--kn-bg);padding:8px 10px;border-radius:8px;border:1px solid var(--kn-border);">
									<span style="color:var(--kn-ink-subtle);"><?php echo esc_html( $note['dateJalali'] ); ?>:</span>
									<?php echo esc_html( $note['content'] ); ?>
									<?php if ( ! empty( $note['customerNote'] ) ) : ?>
										<span class="kn-pill kn-pill-blue">ارسال‌شده به مشتری</span>
									<?php endif; ?>
								</div>
							<?php endforeach; ?>
						</div>
					</div>
				<?php endif; ?>
			</div>
		<?php endif; ?>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>فهرست سفارشات (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $orders ) ) ); ?>)</h2>
				<input type="text" class="kn-input-sm" placeholder="فیلتر سریع در جدول..." data-kn-filter-table="kn-orders-table" style="min-width:220px;" />
			</div>

			<?php if ( empty( $orders ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">سفارشی با این فیلترها یافت نشد.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table" id="kn-orders-table">
						<thead>
							<tr>
								<th>سفارش</th>
								<th>خریدار / شهر</th>
								<th>اقلام</th>
								<th>مبلغ و روش پرداخت</th>
								<th>تاریخ شمسی</th>
								<th>وضعیت</th>
								<th>عملیات</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $orders as $ord ) : ?>
								<tr>
									<td>
										<strong>#<?php echo esc_html( KN_Jalali::to_persian_digits( $ord['orderNumber'] ) ); ?></strong>
										<?php if ( ! empty( $ord['trackingCode'] ) ) : ?>
											<div style="font-size:10.5px;color:var(--kn-primary);" dir="ltr">Track: <?php echo esc_html( $ord['trackingCode'] ); ?></div>
										<?php endif; ?>
									</td>
									<td>
										<strong><?php echo esc_html( $ord['customerName'] ); ?></strong>
										<div style="font-size:11px;color:var(--kn-ink-subtle);" dir="ltr"><?php echo esc_html( $ord['customerPhone'] ); ?></div>
										<?php if ( ! empty( $ord['city'] ) ) : ?>
											<div style="font-size:11px;color:var(--kn-ink-subtle);"><?php echo esc_html( $ord['city'] ); ?></div>
										<?php endif; ?>
									</td>
									<td>
										<?php foreach ( $ord['items'] as $it ) : ?>
											<div style="font-size:12px;">• <?php echo esc_html( $it['name'] ); ?> × <?php echo esc_html( KN_Jalali::to_persian_digits( $it['qty'] ) ); ?></div>
										<?php endforeach; ?>
									</td>
									<td>
										<strong style="color:var(--kn-green);"><?php echo esc_html( $ord['totalFormatted'] ); ?></strong>
										<div style="font-size:11px;color:var(--kn-ink-subtle);"><?php echo esc_html( $ord['paymentMethodTitle'] ?: $ord['paymentMethod'] ); ?></div>
										<?php if ( ! empty( $ord['receiptUrl'] ) ) : ?>
											<span class="kn-pill kn-pill-amber">دارای فیش بانکی</span>
										<?php endif; ?>
									</td>
									<td style="font-size:12px;"><?php echo esc_html( $ord['dateCreated'] ); ?></td>
									<td>
										<span class="kn-pill <?php echo esc_attr( self::status_pill_class( $ord['status'] ) ); ?>"><?php echo esc_html( $ord['statusLabel'] ); ?></span>
									</td>
									<td>
										<div style="display:flex;gap:6px;flex-wrap:wrap;">
											<a class="kn-btn kn-btn-primary kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-orders&order_id=' . $ord['id'] ) ); ?>">مدیریت</a>
											<?php if ( in_array( $ord['status'], array( 'on-hold', 'pending' ), true ) ) : ?>
												<form method="post" style="display:inline;" onsubmit="return confirm('این سفارش تکمیل و دسترسی ترم‌های آن فعال شود؟');">
													<?php wp_nonce_field( 'kn_approve_bacs_order' ); ?>
													<input type="hidden" name="kn_action" value="approve_bacs_order" />
													<input type="hidden" name="order_id" value="<?php echo esc_attr( $ord['id'] ); ?>" />
													<input type="hidden" name="return_page" value="kn-soroban-orders" />
													<button type="submit" class="kn-btn kn-btn-green kn-btn-sm">تایید سریع</button>
												</form>
											<?php endif; ?>
											<form method="post" style="display:inline;" onsubmit="return confirm('این سفارش به زباله‌دان منتقل شود؟');">
												<?php wp_nonce_field( 'kn_admin_delete_order' ); ?>
												<input type="hidden" name="kn_action" value="admin_delete_order" />
												<input type="hidden" name="order_id" value="<?php echo esc_attr( $ord['id'] ); ?>" />
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
		KN_Admin::render_shell_close();
	}

	public static function render_products_page() {
		$woo_active = KN_Woo::is_woo_active();
		$search_f   = sanitize_text_field( wp_unslash( $_GET['search'] ?? '' ) );
		$status_f   = sanitize_key( wp_unslash( $_GET['status'] ?? '' ) );
		$cat_f      = absint( $_GET['category'] ?? 0 );
		$edit_id    = absint( $_GET['edit_product'] ?? 0 );

		$categories = $woo_active ? KN_Woo::get_admin_product_categories() : array();
		$products   = $woo_active ? KN_Woo::admin_get_products(
			array(
				'search'   => $search_f,
				'status'   => $status_f,
				'category' => $cat_f,
			)
		) : array();

		$edit_prod = null;
		if ( $edit_id > 0 && $woo_active ) {
			foreach ( KN_Woo::admin_get_products( array() ) as $pr ) {
				if ( (int) $pr['id'] === $edit_id ) {
					$edit_prod = $pr;
					break;
				}
			}
		}
		$is_editing = is_array( $edit_prod );
		$val        = $is_editing ? $edit_prod : array(
			'id'                => 0,
			'name'              => '',
			'sku'               => '',
			'status'            => 'publish',
			'regular_price'     => '',
			'sale_price'        => '',
			'sale_from_jalali'  => '',
			'sale_to_jalali'    => '',
			'manage_stock'      => false,
			'stock_quantity'    => 10,
			'stock_status'      => 'instock',
			'virtual'           => false,
			'image_url'         => '',
			'short_description' => '',
			'description'       => '',
			'category_ids'      => array(),
			'in_app_store'      => true,
			'is_featured_app'   => false,
		);

		KN_Admin::render_shell_open(
			'kn-soroban-products',
			'مدیریت کامل محصولات ووکامرس',
			'ایجاد، ویرایش، کپی و مدیریت موجودی، قیمت و زمان‌بندی حراج شمسی محصولات متصل به اپلیکیشن و فروشگاه'
		);

		if ( ! $woo_active ) : ?>
			<div class="kn-notice kn-notice-error">افزونه WooCommerce فعال نیست.</div>
		<?php
			KN_Admin::render_shell_close();
			return;
		endif;
		?>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2><?php echo $is_editing ? 'ویرایش محصول #' . esc_html( $val['id'] ) : 'افزودن محصول جدید به ووکامرس و اپلیکیشن'; ?></h2>
				<?php if ( $is_editing ) : ?>
					<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-products' ) ); ?>">انصراف و ایجاد محصول جدید</a>
				<?php else : ?>
					<button type="button" class="kn-btn kn-btn-primary" data-kn-toggle="kn-product-form-box">+ محصول جدید</button>
				<?php endif; ?>
			</div>

			<div id="kn-product-form-box" class="kn-collapsible <?php echo $is_editing ? 'is-open' : ''; ?>">
				<form method="post">
					<?php wp_nonce_field( 'kn_admin_save_product' ); ?>
					<input type="hidden" name="kn_action" value="admin_save_product" />
					<input type="hidden" name="product_id" value="<?php echo esc_attr( $val['id'] ); ?>" />
					<input type="hidden" name="sync_app_store_flags" value="1" />

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>نام محصول (الزامی)</label>
							<input type="text" name="name" required value="<?php echo esc_attr( $val['name'] ); ?>" placeholder="مثلاً: چرتکه چوبی ۱۳ ستونه حرفه‌ای" />
						</div>
						<div class="kn-field">
							<label>شناسه انبار (SKU - اختیاری)</label>
							<input type="text" name="sku" dir="ltr" value="<?php echo esc_attr( $val['sku'] ); ?>" placeholder="KN-ABACUS-13" />
						</div>
						<div class="kn-field">
							<label>قیمت اصلی</label>
							<input type="text" name="regular_price" dir="ltr" value="<?php echo esc_attr( $val['regular_price'] ); ?>" placeholder="450000" />
						</div>
						<div class="kn-field">
							<label>قیمت با تخفیف / حراج (اختیاری)</label>
							<input type="text" name="sale_price" dir="ltr" value="<?php echo esc_attr( $val['sale_price'] ); ?>" placeholder="390000" />
						</div>
					</div>

					<div class="kn-grid-4">
						<div class="kn-field">
							<label>شروع تخفیف (تاریخ شمسی)</label>
							<input type="text" name="sale_from_jalali" data-kn-jdate="1" class="kn-jdate-input" value="<?php echo esc_attr( $val['sale_from_jalali'] ); ?>" placeholder="بلافاصله" autocomplete="off" />
						</div>
						<div class="kn-field">
							<label>پایان تخفیف (تاریخ شمسی)</label>
							<input type="text" name="sale_to_jalali" data-kn-jdate="1" class="kn-jdate-input" value="<?php echo esc_attr( $val['sale_to_jalali'] ); ?>" placeholder="نامحدود" autocomplete="off" />
						</div>
						<div class="kn-field">
							<label>وضعیت انتشار</label>
							<select name="status">
								<option value="publish" <?php selected( $val['status'], 'publish' ); ?>>منتشر شده (فعال)</option>
								<option value="draft" <?php selected( $val['status'], 'draft' ); ?>>پیش‌نویس</option>
							</select>
						</div>
						<div class="kn-field">
							<label>وضعیت انبار و تعداد موجودی</label>
							<div style="display:flex;gap:6px;">
								<select name="stock_status">
									<option value="instock" <?php selected( $val['stock_status'], 'instock' ); ?>>موجود در انبار</option>
									<option value="outofstock" <?php selected( $val['stock_status'], 'outofstock' ); ?>>ناموجود</option>
								</select>
								<input type="number" name="stock_quantity" value="<?php echo esc_attr( $val['stock_quantity'] !== null ? $val['stock_quantity'] : 10 ); ?>" min="0" style="width:76px;" title="تعداد موجودی" />
							</div>
						</div>
					</div>

					<div style="display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 12px;padding:10px 12px;background:var(--kn-bg);border:1px solid var(--kn-border);border-radius:10px;">
						<label><input type="checkbox" name="manage_stock" value="1" <?php checked( ! empty( $val['manage_stock'] ) ); ?> /> کنترل تعداد موجودی انبار</label>
						<label><input type="checkbox" name="is_virtual" value="1" <?php checked( ! empty( $val['virtual'] ) ); ?> /> محصول مجازی / دانلودی (بدون ارسال پستی)</label>
						<label><input type="checkbox" name="in_app_store" value="1" <?php checked( ! empty( $val['in_app_store'] ) ); ?> /> نمایش در فروشگاه اپلیکیشن</label>
						<label><input type="checkbox" name="is_featured_app" value="1" <?php checked( ! empty( $val['is_featured_app'] ) ); ?> /> محصول ویژه در بالای فروشگاه اپ</label>
					</div>

					<div class="kn-grid-2">
						<div class="kn-field">
							<label>توضیح کوتاه محصول</label>
							<textarea name="short_description" rows="2"><?php echo esc_textarea( $val['short_description'] ); ?></textarea>
						</div>
						<div class="kn-field">
							<label>دسته‌بندی‌های محصول</label>
							<div style="max-height:92px;overflow-y:auto;border:1px solid var(--kn-border-strong);border-radius:9px;padding:8px;background:#fff;">
								<?php foreach ( $categories as $cat ) : ?>
									<label style="display:inline-flex;align-items:center;gap:4px;margin-left:12px;font-weight:600;font-size:12px;">
										<input type="checkbox" name="category_ids[]" value="<?php echo esc_attr( $cat['id'] ); ?>" <?php checked( in_array( (int) $cat['id'], $val['category_ids'], true ) ); ?> />
										<?php echo esc_html( $cat['name'] ); ?>
									</label>
								<?php endforeach; ?>
							</div>
						</div>
					</div>

					<div class="kn-field">
						<label>توضیحات کامل محصول</label>
						<textarea name="description" rows="3"><?php echo esc_textarea( $val['description'] ); ?></textarea>
					</div>

					<?php KN_Admin::render_image_picker_field_public( 'image_url', $val['image_url'], 'kn-product-img-input', 'تصویر شاخص محصول (از کتابخانه رسانه وردپرس)' ); ?>

					<button type="submit" class="kn-btn kn-btn-green"><?php echo $is_editing ? 'ذخیره تغییرات محصول' : 'ایجاد محصول در ووکامرس'; ?></button>
				</form>
			</div>
		</div>

		<!-- Filter Bar -->
		<form method="get" class="kn-filter-bar">
			<input type="hidden" name="page" value="kn-soroban-products" />
			<div class="kn-filter-item" style="min-width:200px;">
				<label>جستجوی محصول</label>
				<input type="text" name="search" class="kn-input-sm" value="<?php echo esc_attr( $search_f ); ?>" placeholder="نام یا کلمه کلیدی..." />
			</div>
			<div class="kn-filter-item">
				<label>دسته‌بندی</label>
				<select name="category" class="kn-input-sm">
					<option value="0">همه دسته‌ها</option>
					<?php foreach ( $categories as $cat ) : ?>
						<option value="<?php echo esc_attr( $cat['id'] ); ?>" <?php selected( $cat_f, (int) $cat['id'] ); ?>><?php echo esc_html( $cat['name'] ); ?></option>
					<?php endforeach; ?>
				</select>
			</div>
			<div class="kn-filter-item">
				<label>وضعیت</label>
				<select name="status" class="kn-input-sm">
					<option value="">همه</option>
					<option value="publish" <?php selected( $status_f, 'publish' ); ?>>منتشر شده</option>
					<option value="draft" <?php selected( $status_f, 'draft' ); ?>>پیش‌نویس</option>
				</select>
			</div>
			<button type="submit" class="kn-btn kn-btn-primary">اعمال فیلتر</button>
		</form>

		<div class="kn-card">
			<div class="kn-card-header">
				<h2>فهرست محصولات ووکامرس (<?php echo esc_html( KN_Jalali::to_persian_digits( count( $products ) ) ); ?>)</h2>
				<input type="text" class="kn-input-sm" placeholder="جستجوی لحظه‌ای..." data-kn-filter-table="kn-products-table" style="min-width:200px;" />
			</div>

			<?php if ( empty( $products ) ) : ?>
				<p style="font-size:13px;color:var(--kn-ink-subtle);">محصولی یافت نشد.</p>
			<?php else : ?>
				<div class="kn-table-wrap">
					<table class="kn-table" id="kn-products-table">
						<thead>
							<tr>
								<th>محصول</th>
								<th>قیمت / حراج شمسی</th>
								<th>موجودی و فروش</th>
								<th>نمایش در اپلیکیشن</th>
								<th>تاریخ ثبت</th>
								<th>عملیات</th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $products as $p ) : ?>
								<tr>
									<td>
										<div style="display:flex;align-items:center;gap:10px;">
											<?php if ( ! empty( $p['image_url'] ) ) : ?>
												<img src="<?php echo esc_url( $p['image_url'] ); ?>" alt="" style="width:46px;height:46px;object-fit:cover;border-radius:10px;border:1px solid var(--kn-border);flex-shrink:0;" />
											<?php endif; ?>
											<div>
												<strong>#<?php echo esc_html( KN_Jalali::to_persian_digits( $p['id'] ) ); ?> — <?php echo esc_html( $p['name'] ); ?></strong>
												<div style="font-size:11px;color:var(--kn-ink-subtle);">
													<?php if ( ! empty( $p['sku'] ) ) : ?>SKU: <?php echo esc_html( $p['sku'] ); ?> · <?php endif; ?>
													<?php echo esc_html( implode( '، ', $p['category_names'] ) ?: 'بدون دسته' ); ?>
												</div>
											</div>
										</div>
									</td>
									<td>
										<?php if ( $p['price'] !== '' ) : ?>
											<strong><?php echo esc_html( KN_Jalali::to_persian_digits( number_format( (float) $p['price'] ) ) ); ?></strong>
										<?php else : ?>
											<span>—</span>
										<?php endif; ?>
										<?php if ( ! empty( $p['on_sale'] ) ) : ?>
											<span class="kn-pill kn-pill-green">حراج</span>
										<?php endif; ?>
										<?php if ( ! empty( $p['sale_from_jalali'] ) || ! empty( $p['sale_to_jalali'] ) ) : ?>
											<div style="font-size:10.5px;color:var(--kn-primary);">
												<?php echo esc_html( KN_Jalali::to_persian_digits( $p['sale_from_jalali'] ?: '—' ) ); ?> تا <?php echo esc_html( KN_Jalali::to_persian_digits( $p['sale_to_jalali'] ?: '—' ) ); ?>
											</div>
										<?php endif; ?>
									</td>
									<td>
										<span class="kn-pill <?php echo $p['stock_status'] === 'instock' ? 'kn-pill-green' : 'kn-pill-red'; ?>">
											<?php echo $p['stock_status'] === 'instock' ? 'موجود' : 'ناموجود'; ?>
											<?php if ( $p['manage_stock'] && $p['stock_quantity'] !== null ) : ?>
												(<?php echo esc_html( KN_Jalali::to_persian_digits( $p['stock_quantity'] ) ); ?>)
											<?php endif; ?>
										</span>
										<div style="font-size:11px;color:var(--kn-ink-subtle);margin-top:3px;">فروش کل: <?php echo esc_html( KN_Jalali::to_persian_digits( $p['total_sales'] ) ); ?></div>
									</td>
									<td>
										<?php if ( ! empty( $p['in_app_store'] ) ) : ?>
											<span class="kn-pill kn-pill-blue">در فروشگاه اپ</span>
										<?php else : ?>
											<span class="kn-pill kn-pill-slate">مخفی از اپ</span>
										<?php endif; ?>
										<?php if ( ! empty( $p['is_featured_app'] ) ) : ?>
											<span class="kn-pill kn-pill-amber">ویژه</span>
										<?php endif; ?>
										<div style="font-size:10.5px;color:var(--kn-ink-subtle);margin-top:2px;"><?php echo $p['status'] === 'publish' ? 'منتشرشده' : 'پیش‌نویس'; ?></div>
									</td>
									<td style="font-size:11.5px;"><?php echo esc_html( $p['date_created_j'] ); ?></td>
									<td>
										<div style="display:flex;gap:6px;flex-wrap:wrap;">
											<a class="kn-btn kn-btn-ghost kn-btn-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=kn-soroban-products&edit_product=' . $p['id'] ) ); ?>">ویرایش</a>
											<form method="post" style="display:inline;">
												<?php wp_nonce_field( 'kn_admin_duplicate_product' ); ?>
												<input type="hidden" name="kn_action" value="admin_duplicate_product" />
												<input type="hidden" name="product_id" value="<?php echo esc_attr( $p['id'] ); ?>" />
												<button type="submit" class="kn-btn kn-btn-amber kn-btn-sm">کپی</button>
											</form>
											<form method="post" style="display:inline;" onsubmit="return confirm('این محصول به زباله‌دان منتقل شود؟');">
												<?php wp_nonce_field( 'kn_admin_delete_product' ); ?>
												<input type="hidden" name="kn_action" value="admin_delete_product" />
												<input type="hidden" name="product_id" value="<?php echo esc_attr( $p['id'] ); ?>" />
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
		KN_Admin::render_shell_close();
	}
}
