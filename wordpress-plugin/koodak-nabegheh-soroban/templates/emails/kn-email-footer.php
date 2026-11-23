<?php
/**
 * Custom RTL Persian HTML Email Footer for Koodak Nabegheh (WooCommerce + WordPress)
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$kn_settings  = get_option( 'kn_soroban_settings', array() );
$kn_app_title = ! empty( $kn_settings['app_title'] ) ? $kn_settings['app_title'] : get_bloginfo( 'name', 'display' );
?>
														</div>
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>

					<!-- Brand Footer -->
					<table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_footer">
						<tr>
							<td valign="top" style="padding:20px 12px 6px;text-align:center;direction:rtl;color:#785942;font-family:Tahoma,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.7;">
								<div style="font-weight:700;margin-bottom:4px;">
									<?php echo esc_html( $kn_app_title ); ?> — پلتفرم هوشمند آموزش چرتکه کودکان
								</div>
								<div style="color:#9A7B63;font-size:11px;">
									این پیام به‌صورت خودکار ارسال شده است. در صورت نیاز می‌توانید از بخش «ارتباط با ما و پشتیبانی» در اپلیکیشن اقدام نمایید.
								</div>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</div>
</body>
</html>
