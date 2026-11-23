<?php
/**
 * Custom RTL Persian HTML Email Header for Koodak Nabegheh (WooCommerce + WordPress)
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$kn_settings  = get_option( 'kn_soroban_settings', array() );
$kn_app_title = ! empty( $kn_settings['app_title'] ) ? $kn_settings['app_title'] : get_bloginfo( 'name', 'display' );
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> dir="rtl">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title><?php echo esc_html( $kn_app_title ); ?></title>
</head>
<body leftmargin="0" marginwidth="0" topmargin="0" marginheight="0" offset="0" dir="rtl" class="kn-email-shell" style="margin:0;padding:0;background-color:#F5E4CE;direction:rtl;font-family:Tahoma,'Segoe UI',Arial,sans-serif;">
	<div id="wrapper" dir="rtl" class="kn-email-shell" style="background-color:#F5E4CE;margin:0;padding:32px 12px;width:100%;-webkit-text-size-adjust:none;direction:rtl;">
		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;">
			<tr>
				<td align="center" valign="top">
					<table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_container" style="background-color:#FFFFFF;border:2px solid #EEDCC5;border-radius:22px;overflow:hidden;box-shadow:0 12px 28px rgba(145,92,32,0.12);">
						<tr>
							<td align="center" valign="top">
								<!-- Warm Amber Branded Header -->
								<table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_header" style="background:linear-gradient(135deg,#FFCC33 0%,#F49A67 100%);background-color:#FFCC33;color:#452700;border-bottom:3px solid #F1BE2A;">
									<tr>
										<td id="header_wrapper" style="padding:26px 28px;text-align:right;direction:rtl;">
											<div style="font-size:12px;font-weight:700;color:#783F1D;margin-bottom:6px;">
												<?php echo esc_html( $kn_app_title ); ?>
											</div>
											<h1 style="margin:0;font-size:22px;font-weight:800;line-height:1.45;color:#3B2000;text-align:right;font-family:Tahoma,'Segoe UI',Arial,sans-serif;">
												<?php echo esc_html( $email_heading ); ?>
											</h1>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td align="center" valign="top">
								<!-- Body -->
								<table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_body">
									<tr>
										<td valign="top" id="body_content" style="background-color:#FFFFFF;">
											<table border="0" cellpadding="20" cellspacing="0" width="100%">
												<tr>
													<td valign="top" style="padding:26px 28px;">
														<div id="body_content_inner" style="color:#334155;font-family:Tahoma,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.85;text-align:right;direction:rtl;">
