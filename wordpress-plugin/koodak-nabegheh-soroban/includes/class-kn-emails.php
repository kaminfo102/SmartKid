<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Branded Persian RTL HTML Email Templates for WooCommerce Orders and WordPress Notifications.
 */
class KN_Emails {

	public static function init() {
		// Override WooCommerce Email Header & Footer templates cleanly.
		add_filter( 'wc_get_template', array( __CLASS__, 'filter_wc_email_templates' ), 999, 5 );

		// Enhance WooCommerce email CSS (inlined automatically by WooCommerce).
		add_filter( 'woocommerce_email_styles', array( __CLASS__, 'filter_wc_email_styles' ), 999, 2 );

		// Add clear Persian status, receipt preview/note & CTA button inside WooCommerce order emails.
		add_action( 'woocommerce_email_after_order_table', array( __CLASS__, 'render_order_email_kn_details' ), 20, 4 );

		// Style standard WordPress notification emails (welcome / password reset / system notices).
		add_filter( 'wp_new_user_notification_email', array( __CLASS__, 'style_new_user_email' ), 20, 3 );
		add_filter( 'retrieve_password_message', array( __CLASS__, 'style_retrieve_password_email' ), 20, 4 );
		add_filter( 'wp_mail', array( __CLASS__, 'wrap_plain_wp_mail_in_html' ), 999 );
	}

	/**
	 * Swap WooCommerce email header/footer with our RTL Koodak Nabegheh templates.
	 */
	public static function filter_wc_email_templates( $template, $template_name, $args, $template_path, $default_path ) {
		if ( 'emails/email-header.php' === $template_name ) {
			$custom = KN_SOROBAN_DIR . 'templates/emails/kn-email-header.php';
			if ( file_exists( $custom ) ) {
				return $custom;
			}
		}
		if ( 'emails/email-footer.php' === $template_name ) {
			$custom = KN_SOROBAN_DIR . 'templates/emails/kn-email-footer.php';
			if ( file_exists( $custom ) ) {
				return $custom;
			}
		}
		return $template;
	}

	/**
	 * Append clean RTL Persian typography and table/card styling to WooCommerce emails.
	 */
	public static function filter_wc_email_styles( $css, $email = null ) {
		$extra = '
			body, #wrapper, #template_container, #body_content_inner {
				direction: rtl !important;
				text-align: right !important;
				font-family: Tahoma, "Segoe UI", Arial, sans-serif !important;
			}
			#body_content_inner p {
				margin: 0 0 14px;
				color: #334155;
				line-height: 1.85;
			}
			#body_content_inner h2 {
				color: #3B2618 !important;
				font-size: 16px !important;
				font-weight: 800 !important;
				margin: 20px 0 10px !important;
				text-align: right !important;
			}
			#body_content_inner a {
				color: #5472EB;
				font-weight: 700;
			}
			table.td {
				width: 100% !important;
				border-collapse: collapse !important;
				border: 2px solid #EEDCC5 !important;
				border-radius: 12px !important;
				overflow: hidden;
				background: #FFFDF9 !important;
			}
			table.td th.td,
			table.td td.td {
				border: 1px solid #EFE0CE !important;
				padding: 10px 12px !important;
				text-align: right !important;
				font-size: 13px !important;
				color: #1E293B !important;
			}
			table.td thead th.td {
				background: #FFF6EB !important;
				color: #783F1D !important;
				font-weight: 800 !important;
			}
			table.td tfoot tr:last-child th.td,
			table.td tfoot tr:last-child td.td {
				background: #ECFDF5 !important;
				color: #065F46 !important;
				font-weight: 800 !important;
			}
			address.address {
				background: #FFF9F2 !important;
				border: 1px solid #EEDCC5 !important;
				border-radius: 12px !important;
				padding: 12px 14px !important;
				color: #334155 !important;
				font-style: normal !important;
				line-height: 1.8 !important;
				text-align: right !important;
			}
		';
		return $css . "\n" . $extra;
	}

	/**
	 * Append Koodak Nabegheh status badge, receipt details & return CTA into WooCommerce order emails.
	 */
	public static function render_order_email_kn_details( $order, $sent_to_admin, $plain_text, $email ) {
		if ( ! $order || ! is_object( $order ) ) {
			return;
		}

		$status       = (string) $order->get_status();
		$receipt_url  = (string) $order->get_meta( '_kn_receipt_url', true );
		$payment_note = (string) $order->get_meta( '_kn_payment_note', true );
		$term_id      = (int) $order->get_meta( '_kn_term_id', true );
		$return_url   = (string) $order->get_meta( '_kn_return_url', true );

		$status_map = array(
			'pending'    => array( 'در انتظار پرداخت / بررسی', '#FEF3C7', '#92400E' ),
			'on-hold'    => array( 'در حال بررسی و تایید مدیر', '#FFFBEB', '#B45309' ),
			'processing' => array( 'تایید شده (در حال پردازش)', '#ECFDF5', '#065F46' ),
			'completed'  => array( 'تکمیل و فعال شده', '#ECFDF5', '#065F46' ),
			'cancelled'  => array( 'لغو شده', '#F1F5F9', '#475569' ),
			'failed'     => array( 'پرداخت ناموفق', '#FEF2F2', '#991B1B' ),
			'refunded'   => array( 'مسترد شده', '#EFF6FF', '#1E40AF' ),
		);
		$badge = $status_map[ $status ] ?? array( $status, '#F8FAFC', '#334155' );

		if ( $plain_text ) {
			echo "\n----------------------------------------\n";
			echo 'وضعیت سفارش در کودک نابغه: ' . $badge[0] . "\n";
			if ( $term_id > 0 && in_array( $status, array( 'processing', 'completed' ), true ) ) {
				echo "دسترسی دوره آموزشی شما در اپلیکیشن کودک نابغه فعال شد.\n";
			}
			if ( ! empty( $payment_note ) ) {
				echo 'توضیحات پرداخت: ' . $payment_note . "\n";
			}
			if ( ! empty( $receipt_url ) ) {
				echo 'تصویر فیش بانکی: ' . $receipt_url . "\n";
			}
			return;
		}
		?>
		<div dir="rtl" style="margin:20px 0 6px;padding:16px 18px;border-radius:16px;background:#FFF9F2;border:2px solid #EEDCC5;text-align:right;">
			<div style="font-size:13px;font-weight:800;color:#5B3A1D;margin-bottom:8px;">
				وضعیت سفارش در اپلیکیشن کودک نابغه:
				<span style="display:inline-block;padding:4px 10px;border-radius:10px;background:<?php echo esc_attr( $badge[1] ); ?>;color:<?php echo esc_attr( $badge[2] ); ?>;font-size:12px;margin-right:6px;">
					<?php echo esc_html( $badge[0] ); ?>
				</span>
			</div>

			<?php if ( $term_id > 0 && in_array( $status, array( 'processing', 'completed' ), true ) ) : ?>
				<p style="margin:6px 0 10px;font-size:13px;color:#065F46;font-weight:700;">
					دسترسی دوره آموزشی خریداری‌شده بلافاصله برای حساب کودک شما باز شده است و از بخش «نقشه ماجراجویی» قابل استفاده است.
				</p>
			<?php elseif ( in_array( $status, array( 'on-hold', 'pending' ), true ) ) : ?>
				<p style="margin:6px 0 10px;font-size:13px;color:#78350F;">
					سفارش شما ثبت شده است و پس از بررسی و تایید مدیر، وضعیت آن به‌روزرسانی می‌شود.
				</p>
			<?php endif; ?>

			<?php if ( ! empty( $payment_note ) ) : ?>
				<div style="margin:8px 0;font-size:12px;color:#334155;">
					<strong>توضیحات / کد پیگیری ثبت‌شده:</strong> <?php echo esc_html( $payment_note ); ?>
				</div>
			<?php endif; ?>

			<?php if ( ! empty( $receipt_url ) ) : ?>
				<div style="margin:8px 0;font-size:12px;">
					<a href="<?php echo esc_url( $receipt_url ); ?>" target="_blank" rel="noopener noreferrer" style="color:#5472EB;font-weight:800;">
						مشاهده تصویر رسید بانکی پیوست‌شده
					</a>
				</div>
			<?php endif; ?>

			<?php if ( ! $sent_to_admin && ! empty( $return_url ) ) : ?>
				<div style="margin-top:14px;">
					<a href="<?php echo esc_url( $return_url ); ?>" style="display:inline-block;padding:10px 18px;border-radius:12px;background:#5472EB;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:800;">
						ورود به اپلیکیشن کودک نابغه
					</a>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Branded HTML email for WordPress new-user welcome notifications.
	 */
	public static function style_new_user_email( $wp_new_user_notification_email, $user, $blogname ) {
		if ( ! ( $user instanceof WP_User ) ) {
			return $wp_new_user_notification_email;
		}
		$settings  = get_option( 'kn_soroban_settings', array() );
		$app_title = ! empty( $settings['app_title'] ) ? $settings['app_title'] : $blogname;
		$display   = $user->display_name ?: $user->user_login;

		$body_html = '
			<p>سلام <strong>' . esc_html( $display ) . '</strong> عزیز،</p>
			<p>به خانواده بزرگ <strong>' . esc_html( $app_title ) . '</strong> خوش آمدید! حساب کاربری شما با نام کاربری <strong dir="ltr">' . esc_html( $user->user_login ) . '</strong> با موفقیت ایجاد شد.</p>
			<div style="margin:14px 0;padding:14px 16px;border-radius:14px;background:#FFF9F2;border:1px solid #EEDCC5;font-size:13px;">
				از این پس می‌توانید پیشرفت یادگیری چرتکه سوروبان، مدال‌های کودک، خرید دوره‌ها و پیگیری سفارش‌ها را با یک حساب کاربری مدیریت کنید.
			</div>
		';

		$wp_new_user_notification_email['subject'] = sprintf( 'خوش آمدید به %s | اطلاعات حساب کاربری', $app_title );
		$wp_new_user_notification_email['headers'] = array( 'Content-Type: text/html; charset=UTF-8' );
		$wp_new_user_notification_email['message'] = self::render_standalone_html_email(
			'خوش آمدید به ' . $app_title,
			$body_html
		);

		return $wp_new_user_notification_email;
	}

	/**
	 * Branded HTML email for WordPress password reset requests.
	 */
	public static function style_retrieve_password_email( $message, $key, $user_login, $user_data ) {
		$settings  = get_option( 'kn_soroban_settings', array() );
		$app_title = ! empty( $settings['app_title'] ) ? $settings['app_title'] : get_bloginfo( 'name', 'display' );
		$reset_url = network_site_url( "wp-login.php?action=rp&key=$key&login=" . rawurlencode( $user_login ), 'login' );

		$body_html = '
			<p>سلام <strong>' . esc_html( $user_login ) . '</strong>،</p>
			<p>درخواستی برای بازنشانی رمز عبور حساب کاربری شما در <strong>' . esc_html( $app_title ) . '</strong> ثبت شده است.</p>
			<p style="margin:18px 0;">
				<a href="' . esc_url( $reset_url ) . '" style="display:inline-block;padding:11px 20px;border-radius:12px;background:#5472EB;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:13px;">
					تنظیم رمز عبور جدید
				</a>
			</p>
			<p style="font-size:12px;color:#64748B;">اگر این درخواست توسط شما انجام نشده است، می‌توانید این ایمیل را نادیده بگیرید.</p>
		';

		return self::render_standalone_html_email( 'بازنشانی رمز عبور | ' . $app_title, $body_html );
	}

	/**
	 * Wrap plain-text WordPress system emails into the Koodak Nabegheh RTL HTML email shell.
	 */
	public static function wrap_plain_wp_mail_in_html( $args ) {
		if ( ! is_array( $args ) || empty( $args['message'] ) ) {
			return $args;
		}
		$msg = (string) $args['message'];
		if ( stripos( $msg, 'kn-email-shell' ) !== false || stripos( $msg, '<html' ) !== false ) {
			return $args;
		}

		// Skip if explicitly non-HTML multipart or MIME content-type other than text/plain.
		$headers     = $args['headers'] ?? array();
		$header_text = is_array( $headers ) ? implode( "\n", $headers ) : (string) $headers;
		if ( stripos( $header_text, 'multipart/' ) !== false ) {
			return $args;
		}

		$is_plain_only = ( stripos( $msg, '<p' ) === false && stripos( $msg, '<div' ) === false && stripos( $msg, '<table' ) === false );
		$inner_html    = $is_plain_only
			? '<p>' . nl2br( make_clickable( esc_html( $msg ) ) ) . '</p>'
			: $msg;

		$subject          = ! empty( $args['subject'] ) ? (string) $args['subject'] : 'پیام جدید';
		$args['message']  = self::render_standalone_html_email( $subject, $inner_html );

		if ( is_array( $headers ) ) {
			$has_ct = false;
			foreach ( $headers as $h ) {
				if ( stripos( (string) $h, 'content-type:' ) !== false ) {
					$has_ct = true;
					break;
				}
			}
			if ( ! $has_ct ) {
				$headers[]       = 'Content-Type: text/html; charset=UTF-8';
				$args['headers'] = $headers;
			}
		} else {
			if ( stripos( $header_text, 'content-type:' ) === false ) {
				$args['headers'] = trim( $header_text . "\r\nContent-Type: text/html; charset=UTF-8" );
			}
		}

		return $args;
	}

	/**
	 * Render standalone full HTML document using the shared kn-email header & footer templates.
	 */
	public static function render_standalone_html_email( $email_heading, $inner_html ) {
		ob_start();
		$header_file = KN_SOROBAN_DIR . 'templates/emails/kn-email-header.php';
		$footer_file = KN_SOROBAN_DIR . 'templates/emails/kn-email-footer.php';
		if ( file_exists( $header_file ) ) {
			include $header_file;
		}
		echo $inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		if ( file_exists( $footer_file ) ) {
			include $footer_file;
		}
		return ob_get_clean();
	}
}
