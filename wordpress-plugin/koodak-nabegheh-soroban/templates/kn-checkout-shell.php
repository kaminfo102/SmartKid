<?php
/**
 * Distraction-Free Koodak Nabegheh Checkout Shell Template
 * Renders WooCommerce Checkout, Order-Pay, and Order-Received without WP theme headers/footers.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( function_exists( 'show_admin_bar' ) ) {
	show_admin_bar( false );
}

$settings        = get_option( 'kn_soroban_settings', array() );
$app_title       = ! empty( $settings['app_title'] ) ? $settings['app_title'] : 'کودک نابغه';
$is_thankyou     = function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-received' );
$is_order_pay    = function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' );
$order_id        = $is_thankyou ? absint( get_query_var( 'order-received' ) ) : ( $is_order_pay ? absint( get_query_var( 'order-pay' ) ) : 0 );
$current_user    = is_user_logged_in() ? wp_get_current_user() : null;
$user_label      = ( $current_user && $current_user->exists() ) ? ( $current_user->display_name ?: $current_user->user_login ) : '';
$user_mobile     = ( $current_user && $current_user->exists() ) ? (string) ( get_user_meta( $current_user->ID, 'kn_mobile', true ) ?: get_user_meta( $current_user->ID, 'billing_phone', true ) ) : '';
$return_url_base = class_exists( 'KN_Woo' ) ? KN_Woo::resolve_app_return_url( $order_id ) : '';
$return_from     = class_exists( 'KN_Woo' ) ? KN_Woo::resolve_app_return_from( $order_id ) : 'map';
$active_term_id  = class_exists( 'KN_Woo' ) ? KN_Woo::resolve_order_or_active_term_id( $order_id ) : 0;

$back_to_app_url = '';
if ( ! empty( $return_url_base ) ) {
	$args = array(
		'kn_payment_return' => '1',
		'kn_from'           => $return_from,
	);
	if ( $active_term_id > 0 ) {
		$args['kn_term'] = $active_term_id;
	}
	if ( $order_id > 0 && function_exists( 'wc_get_order' ) ) {
		$ord = wc_get_order( $order_id );
		if ( $ord ) {
			$args['kn_order_id']     = $ord->get_id();
			$args['kn_order_number'] = $ord->get_order_number();
			$args['kn_status']       = $ord->get_status();
		}
	} elseif ( ! $is_thankyou ) {
		$args['kn_status'] = 'cancelled';
	}
	$back_to_app_url = add_query_arg( $args, $return_url_base );
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?> dir="rtl">
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
	<title><?php echo esc_html( ( $is_thankyou ? 'نتیجه سفارش' : 'تکمیل پرداخت امن' ) . ' | ' . $app_title ); ?></title>
	<?php wp_head(); ?>
	<style id="kn-app-checkout-shell-css">
		:root {
			--kn-bg: #F5E4CE;
			--kn-card: #FFFFFF;
			--kn-soft: #FFF9F2;
			--kn-border: #EEDCC5;
			--kn-border-deep: #DFC6A8;
			--kn-primary: #5472EB;
			--kn-primary-dark: #354EB8;
			--kn-success: #4BB543;
			--kn-success-dark: #2E8228;
			--kn-amber: #FFCC33;
			--kn-text: #1E293B;
			--kn-muted: #64748B;
		}

		html, body.kn-app-checkout-body {
			margin: 0 !important;
			padding: 0 !important;
			background: var(--kn-bg) !important;
			background-image: radial-gradient(circle at top right, rgba(255, 204, 51, 0.22), transparent 45%),
				radial-gradient(circle at bottom left, rgba(84, 114, 235, 0.14), transparent 45%) !important;
			color: var(--kn-text);
			font-family: 'Vazirmatn', 'IRANSans', 'B Nazanin', Tahoma, system-ui, -apple-system, sans-serif !important;
			direction: rtl !important;
			min-height: 100vh;
			-webkit-font-smoothing: antialiased;
		}

		/* Hide any WordPress theme/plugin header, footer, adminbar, breadcrumbs or sidebars */
		#wpadminbar,
		header.site-header,
		footer.site-footer,
		nav.main-navigation,
		.wp-site-blocks > header,
		.wp-site-blocks > footer,
		.site-branding,
		.woocommerce-breadcrumb,
		aside#secondary,
		.widget-area,
		.elementor-location-header,
		.elementor-location-footer {
			display: none !important;
		}

		.kn-shell-header {
			background: linear-gradient(180deg, #FFCC33 0%, #FFE066 100%);
			border-bottom: 3px solid #F1BE2A;
			padding: 14px 16px;
			box-shadow: 0 8px 24px -10px rgba(160, 100, 10, 0.35);
		}

		.kn-shell-header-inner {
			max-width: 980px;
			margin: 0 auto;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			flex-wrap: wrap;
		}

		.kn-brand-wrap {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.kn-brand-badge {
			width: 46px;
			height: 46px;
			border-radius: 16px;
			background: #FFFFFF;
			border: 2px solid #F59E0B;
			box-shadow: 0 4px 0 #DF9D19;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		.kn-brand-title {
			font-size: 18px;
			font-weight: 900;
			color: #452700;
			line-height: 1.25;
		}

		.kn-brand-sub {
			font-size: 12px;
			font-weight: 700;
			color: #784800;
			margin-top: 2px;
		}

		.kn-header-actions {
			display: flex;
			align-items: center;
			gap: 10px;
			flex-wrap: wrap;
		}

		.kn-user-chip {
			background: rgba(255, 255, 255, 0.92);
			border: 2px solid #FDE68A;
			border-radius: 14px;
			padding: 7px 12px;
			font-size: 12px;
			font-weight: 800;
			color: #5C3A00;
		}

		.kn-back-app-btn {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			background: #FFFFFF;
			color: #354EB8 !important;
			text-decoration: none !important;
			border: 2px solid #CBD5E1;
			border-bottom: 4px solid #94A3B8;
			border-radius: 14px;
			padding: 8px 14px;
			font-size: 13px;
			font-weight: 800;
			cursor: pointer;
			transition: transform 0.15s ease;
		}

		.kn-back-app-btn:hover {
			transform: translateY(-1px);
			background: #EFF6FF;
		}

		.kn-shell-main {
			max-width: 980px;
			margin: 22px auto 34px;
			padding: 0 14px;
		}

		/* Stepper Bar */
		.kn-stepper {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
			margin-bottom: 18px;
		}

		.kn-step {
			background: rgba(255, 255, 255, 0.85);
			border: 2px solid var(--kn-border);
			border-radius: 16px;
			padding: 10px 12px;
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 12px;
			font-weight: 800;
			color: #64748B;
		}

		.kn-step.is-active {
			background: #FFFFFF;
			border-color: var(--kn-primary);
			color: #1E3A8A;
			box-shadow: 0 6px 14px -6px rgba(84, 114, 235, 0.35);
		}

		.kn-step.is-done {
			background: #ECFDF5;
			border-color: #6EE7B7;
			color: #065F46;
		}

		.kn-step-num {
			width: 24px;
			height: 24px;
			border-radius: 999px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			font-weight: 900;
			background: #E2E8F0;
			color: #334155;
			flex-shrink: 0;
		}

		.kn-step.is-active .kn-step-num {
			background: var(--kn-primary);
			color: #FFFFFF;
		}

		.kn-step.is-done .kn-step-num {
			background: var(--kn-success);
			color: #FFFFFF;
		}

		/* Main White Checkout Card */
		.kn-checkout-card {
			background: var(--kn-card);
			border: 2px solid var(--kn-border);
			border-bottom: 5px solid var(--kn-border-deep);
			border-radius: 26px;
			padding: 22px 20px;
			box-shadow: 0 20px 44px -14px rgba(145, 92, 32, 0.22);
		}

		@media (min-width: 768px) {
			.kn-checkout-card {
				padding: 28px 30px;
			}
		}

		@media (max-width: 600px) {
			.kn-stepper {
				grid-template-columns: 1fr;
			}
		}

		/* WooCommerce Classic Checkout Beautification */
		.kn-checkout-card .woocommerce {
			font-family: inherit !important;
			direction: rtl !important;
			text-align: right !important;
		}

		.kn-checkout-card .woocommerce form.checkout {
			display: grid;
			grid-template-columns: 1fr;
			gap: 22px;
		}

		@media (min-width: 860px) {
			.kn-checkout-card .woocommerce form.checkout:has(#customer_details) {
				grid-template-columns: 1.05fr 0.95fr;
				align-items: start;
			}
			.kn-checkout-card .woocommerce form.checkout #order_review_heading,
			.kn-checkout-card .woocommerce form.checkout #order_review {
				grid-column: 2;
			}
			.kn-checkout-card .woocommerce form.checkout #customer_details {
				grid-column: 1;
				grid-row: 1 / span 3;
			}
		}

		.kn-checkout-card .col2-set {
			width: 100% !important;
			display: block !important;
		}

		.kn-checkout-card .col2-set .col-1,
		.kn-checkout-card .col2-set .col-2 {
			width: 100% !important;
			float: none !important;
			background: var(--kn-soft);
			border: 2px solid var(--kn-border);
			border-radius: 20px;
			padding: 18px;
			margin-bottom: 16px;
			box-sizing: border-box;
		}

		.kn-checkout-card h3,
		.kn-checkout-card h2 {
			font-size: 16px !important;
			font-weight: 900 !important;
			color: #3B2618 !important;
			margin: 0 0 14px !important;
		}

		.kn-checkout-card .form-row {
			margin-bottom: 12px !important;
			padding: 0 !important;
			float: none !important;
			width: 100% !important;
		}

		.kn-checkout-card .form-row label {
			display: block;
			font-size: 12px !important;
			font-weight: 800 !important;
			color: #475569 !important;
			margin-bottom: 5px !important;
		}

		.kn-checkout-card input[type="text"],
		.kn-checkout-card input[type="tel"],
		.kn-checkout-card input[type="email"],
		.kn-checkout-card input[type="number"],
		.kn-checkout-card input[type="password"],
		.kn-checkout-card select,
		.kn-checkout-card textarea,
		.kn-checkout-card .select2-container--default .select2-selection--single {
			width: 100% !important;
			min-height: 46px !important;
			padding: 10px 14px !important;
			border-radius: 14px !important;
			border: 2px solid var(--kn-border) !important;
			background: #FFFFFF !important;
			color: #0F172A !important;
			font-size: 14px !important;
			font-weight: 700 !important;
			font-family: inherit !important;
			box-sizing: border-box !important;
			transition: border-color 0.15s ease, box-shadow 0.15s ease;
		}

		.kn-checkout-card input:focus,
		.kn-checkout-card select:focus,
		.kn-checkout-card textarea:focus {
			outline: none !important;
			border-color: var(--kn-primary) !important;
			box-shadow: 0 0 0 3px rgba(84, 114, 235, 0.16) !important;
		}

		/* Order Review Table */
		.kn-checkout-card table.shop_table {
			width: 100% !important;
			border-collapse: separate !important;
			border-spacing: 0 !important;
			border: 2px solid var(--kn-border) !important;
			border-radius: 18px !important;
			overflow: hidden;
			background: #FFFFFF !important;
			margin-bottom: 18px !important;
		}

		.kn-checkout-card table.shop_table th,
		.kn-checkout-card table.shop_table td {
			padding: 12px 14px !important;
			border-bottom: 1px solid #F3E8D8 !important;
			border-top: none !important;
			font-size: 13px !important;
			text-align: right !important;
		}

		.kn-checkout-card table.shop_table thead th {
			background: #FFF6EB !important;
			color: #783F1D !important;
			font-weight: 900 !important;
		}

		.kn-checkout-card table.shop_table tr.order-total th,
		.kn-checkout-card table.shop_table tr.order-total td {
			background: #ECFDF5 !important;
			color: #065F46 !important;
			font-weight: 900 !important;
			font-size: 15px !important;
			border-bottom: none !important;
		}

		/* Payment Box & Gateways */
		.kn-checkout-card #payment {
			background: var(--kn-soft) !important;
			border: 2px solid var(--kn-border) !important;
			border-radius: 20px !important;
			padding: 16px !important;
		}

		.kn-checkout-card #payment ul.payment_methods {
			list-style: none !important;
			padding: 0 !important;
			margin: 0 0 16px !important;
			border-bottom: none !important;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.kn-checkout-card #payment ul.payment_methods li {
			background: #FFFFFF !important;
			border: 2px solid var(--kn-border) !important;
			border-radius: 16px !important;
			padding: 12px 14px !important;
			margin: 0 !important;
			line-height: 1.7 !important;
		}

		.kn-checkout-card #payment ul.payment_methods li:has(input[type="radio"]:checked) {
			border-color: var(--kn-primary) !important;
			background: #F5F8FF !important;
		}

		.kn-checkout-card #payment ul.payment_methods li label {
			display: inline-flex !important;
			align-items: center;
			gap: 8px;
			font-weight: 800 !important;
			font-size: 14px !important;
			color: #1E293B !important;
			cursor: pointer;
		}

		.kn-checkout-card #payment div.payment_box {
			background: #FFFBEB !important;
			border: 1px solid #FDE68A !important;
			border-radius: 12px !important;
			padding: 10px 12px !important;
			margin: 10px 0 0 !important;
			font-size: 12px !important;
			color: #78350F !important;
		}

		.kn-checkout-card #payment div.payment_box::before {
			display: none !important;
		}

		/* Place Order & Block Checkout Buttons */
		.kn-checkout-card #place_order,
		.kn-checkout-card .woocommerce-button.button,
		.kn-checkout-card .wc-block-components-checkout-place-order-button {
			width: 100% !important;
			min-height: 54px !important;
			border-radius: 18px !important;
			background: var(--kn-success) !important;
			border: none !important;
			border-bottom: 4px solid var(--kn-success-dark) !important;
			color: #FFFFFF !important;
			font-size: 16px !important;
			font-weight: 900 !important;
			font-family: inherit !important;
			cursor: pointer !important;
			display: inline-flex !important;
			align-items: center !important;
			justify-content: center !important;
			gap: 8px !important;
			transition: transform 0.12s ease, filter 0.15s ease !important;
			box-shadow: 0 10px 20px -8px rgba(75, 181, 67, 0.5) !important;
		}

		.kn-checkout-card #place_order:hover,
		.kn-checkout-card .wc-block-components-checkout-place-order-button:hover {
			filter: brightness(1.04);
		}

		.kn-checkout-card #place_order:active,
		.kn-checkout-card .wc-block-components-checkout-place-order-button:active {
			transform: translateY(2px);
			border-bottom-width: 2px !important;
		}

		/* Notices */
		.kn-checkout-card .woocommerce-info,
		.kn-checkout-card .woocommerce-message,
		.kn-checkout-card .woocommerce-error {
			border-radius: 16px !important;
			border-top: none !important;
			padding: 14px 16px !important;
			margin-bottom: 16px !important;
			font-size: 13px !important;
			font-weight: 700 !important;
		}

		.kn-checkout-card .woocommerce-error {
			background: #FEF2F2 !important;
			border: 2px solid #FCA5A5 !important;
			color: #991B1B !important;
		}

		.kn-checkout-card .woocommerce-message {
			background: #ECFDF5 !important;
			border: 2px solid #6EE7B7 !important;
			color: #065F46 !important;
		}

		.kn-checkout-card .woocommerce-info {
			background: #EFF6FF !important;
			border: 2px solid #BFDBFE !important;
			color: #1E3A8A !important;
		}

		/* Thank you overview strip */
		.kn-checkout-card ul.woocommerce-order-overview {
			display: grid !important;
			grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
			gap: 10px !important;
			list-style: none !important;
			padding: 0 !important;
			margin: 16px 0 !important;
		}

		.kn-checkout-card ul.woocommerce-order-overview li {
			background: var(--kn-soft) !important;
			border: 2px solid var(--kn-border) !important;
			border-radius: 14px !important;
			padding: 10px 12px !important;
			margin: 0 !important;
			float: none !important;
			font-size: 12px !important;
		}

		.kn-checkout-card ul.woocommerce-order-overview li strong {
			display: block;
			margin-top: 4px;
			font-size: 14px !important;
			color: #0F172A !important;
		}

		.kn-shell-footer {
			max-width: 980px;
			margin: 0 auto 28px;
			padding: 0 14px;
			text-align: center;
			font-size: 12px;
			font-weight: 700;
			color: #785942;
		}
	</style>
</head>
<body <?php body_class( 'kn-app-checkout-body woocommerce-checkout' ); ?>>
<?php
if ( function_exists( 'wp_body_open' ) ) {
	wp_body_open();
}
?>
	<header class="kn-shell-header">
		<div class="kn-shell-header-inner">
			<div class="kn-brand-wrap">
				<div class="kn-brand-badge" aria-hidden="true">
					<svg width="28" height="28" viewBox="0 0 36 36" fill="none">
						<rect x="4" y="6" width="28" height="24" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5" />
						<line x1="6" y1="14" x2="30" y2="14" stroke="#B45309" stroke-width="2" />
						<circle cx="12" cy="10" r="3" fill="#EA580C" />
						<circle cx="20" cy="10" r="3" fill="#5472EB" />
						<circle cx="15" cy="21" r="3" fill="#4BB543" />
						<circle cx="24" cy="21" r="3" fill="#F59E0B" />
					</svg>
				</div>
				<div>
					<div class="kn-brand-title"><?php echo esc_html( $app_title ); ?> — تکمیل پرداخت امن</div>
					<div class="kn-brand-sub">
						<?php echo $is_thankyou ? 'گزارش نهایی ثبت و وضعیت سفارش' : 'تایید نهایی سفارش و انتقال مستقیم به درگاه پرداخت'; ?>
					</div>
				</div>
			</div>

			<div class="kn-header-actions">
				<?php if ( ! empty( $user_label ) ) : ?>
					<div class="kn-user-chip">
						<span><?php echo esc_html( $user_label ); ?></span>
						<?php if ( ! empty( $user_mobile ) ) : ?>
							<span dir="ltr"> (<?php echo esc_html( $user_mobile ); ?>)</span>
						<?php endif; ?>
					</div>
				<?php endif; ?>

				<?php if ( ! empty( $back_to_app_url ) ) : ?>
					<a href="<?php echo esc_url( $back_to_app_url ); ?>" class="kn-back-app-btn">
						<span>&#8594;</span>
						<span>بازگشت به اپلیکیشن</span>
					</a>
				<?php else : ?>
					<button type="button" onclick="window.history.back()" class="kn-back-app-btn">
						<span>&#8594;</span>
						<span>بازگشت به اپلیکیشن</span>
					</button>
				<?php endif; ?>
			</div>
		</div>
	</header>

	<main class="kn-shell-main">
		<div class="kn-stepper" aria-label="مراحل پرداخت">
			<div class="kn-step is-done">
				<span class="kn-step-num">✓</span>
				<span>۱. اتصال خودکار حساب کاربری</span>
			</div>
			<div class="kn-step <?php echo $is_thankyou ? 'is-done' : 'is-active'; ?>">
				<span class="kn-step-num"><?php echo $is_thankyou ? '✓' : '۲'; ?></span>
				<span>۲. بررسی سفارش و انتخاب روش پرداخت</span>
			</div>
			<div class="kn-step <?php echo $is_thankyou ? 'is-active' : ''; ?>">
				<span class="kn-step-num">۳</span>
				<span>۳. تایید و بازگشت خودکار به اپلیکیشن</span>
			</div>
		</div>

		<section class="kn-checkout-card">
			<?php
			$rendered = false;
			if ( have_posts() ) {
				while ( have_posts() ) {
					the_post();
					$content = get_the_content();
					if ( ! empty( trim( wp_strip_all_tags( $content ) ) ) || has_blocks( $content ) || strpos( $content, 'woocommerce_checkout' ) !== false ) {
						the_content();
						$rendered = true;
					}
				}
			}
			if ( ! $rendered && function_exists( 'do_shortcode' ) ) {
				echo do_shortcode( '[woocommerce_checkout]' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}
			?>
		</section>
	</main>

	<footer class="kn-shell-footer">
		پرداخت امن و رمزنگاری‌شده · دسترسی دوره‌ها بلافاصله پس از تایید پرداخت در اپلیکیشن <?php echo esc_html( $app_title ); ?> فعال می‌شود.
	</footer>

	<script id="kn-checkout-digit-normalizer">
	(function() {
		var faMap = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
		function toLatinDigits(str) {
			return String(str || '').replace(/[۰-۹٠-٩]/g, function(ch) { return faMap[ch] || ch; });
		}
		function shouldNormalizeInput(el) {
			if (!el || el.tagName !== 'INPUT') return false;
			var type = (el.type || '').toLowerCase();
			if (type === 'tel' || type === 'number' || type === 'email') return true;
			var name = (el.name || '').toLowerCase();
			var id = (el.id || '').toLowerCase();
			return /phone|mobile|postcode|zip|code|card|otp|email/.test(name + ' ' + id);
		}
		document.addEventListener('input', function(ev) {
			var target = ev.target;
			if (!shouldNormalizeInput(target)) return;
			var converted = toLatinDigits(target.value);
			if (converted !== target.value) {
				var start = target.selectionStart;
				var end = target.selectionEnd;
				target.value = converted;
				if (typeof start === 'number' && typeof end === 'number') {
					try { target.setSelectionRange(start, end); } catch (e) {}
				}
			}
		}, true);
	})();
	</script>
<?php wp_footer(); ?>
</body>
</html>
