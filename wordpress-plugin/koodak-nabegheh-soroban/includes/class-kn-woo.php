<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WooCommerce Integration for Paid Terms, In-App Store Catalog, Seamless SSO Checkout,
 * Bank Transfer (BACS) Review Flow, <=100KB Per-User Receipt Uploader, and Automated Unlocks.
 */
class KN_Woo {

	/**
	 * Cached map of [ woo_product_id => term_db_id ] for the current request.
	 *
	 * @var array<int, int>|null
	 */
	private static $term_product_map = null;

	/**
	 * Maximum allowed uploaded receipt/attachment size (100 KB).
	 */
	const MAX_IMAGE_BYTES = 102400;

	public static function init() {
		// Handle one-time SSO login handoff before any output is sent.
		add_action( 'init', array( __CLASS__, 'handle_sso_checkout_redirect' ), 5 );
		add_action( 'template_redirect', array( __CLASS__, 'handle_thankyou_receipt_post' ), 5 );

		if ( ! self::is_woo_active() ) {
			return;
		}

		// Grant term access automatically when WooCommerce order is paid / processing / completed.
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'grant_access_from_order' ), 10, 1 );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'grant_access_from_order' ), 10, 1 );
		add_action( 'woocommerce_payment_complete', array( __CLASS__, 'grant_access_from_order' ), 10, 1 );

		// Hydrate missing WC()->customer billing fields cleanly before Checkout renders.
		add_action( 'template_redirect', array( __CLASS__, 'sync_express_customer_on_checkout' ), 15 );

		// Express Checkout (no re-login, no physical shipping) strictly for Term purchases.
		add_filter( 'woocommerce_product_needs_shipping', array( __CLASS__, 'filter_product_needs_shipping' ), 999, 2 );
		add_filter( 'woocommerce_cart_needs_shipping', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_cart_needs_shipping_address', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_checkout_registration_enabled', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_checkout_registration_required', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_enable_order_notes_field', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );

		add_filter( 'woocommerce_checkout_fields', array( __CLASS__, 'simplify_term_checkout_fields' ), 99999 );
		add_filter( 'woocommerce_billing_fields', array( __CLASS__, 'simplify_term_billing_fields' ), 99999 );
		add_filter( 'woocommerce_default_address_fields', array( __CLASS__, 'simplify_term_default_address_fields' ), 99999 );
		add_filter( 'woocommerce_checkout_get_value', array( __CLASS__, 'prefill_term_checkout_value' ), 999, 2 );

		// UI Banner, Safe Express Styles & Post-Mount Helper for Classic and Block Checkouts.
		add_action( 'woocommerce_before_checkout_form', array( __CLASS__, 'render_express_checkout_banner' ), 5 );
		add_action( 'wp_head', array( __CLASS__, 'render_express_checkout_styles' ), 99 );
		add_action( 'wp_footer', array( __CLASS__, 'render_checkout_block_express_script' ), 99 );

		// Receipt uploader on Classic Checkout & Thank-you page for bank transfer / offline orders.
		add_action( 'woocommerce_review_order_before_submit', array( __CLASS__, 'render_classic_checkout_receipt_fields' ), 20 );
		add_action( 'woocommerce_thankyou', array( __CLASS__, 'render_thankyou_receipt_box' ), 15 );

		// Bind authenticated customer + account billing info + _kn_term_id + receipt meta on checkouts.
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'prepare_order_customer_and_meta' ), 10, 2 );
		add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'attach_term_meta_on_checkout' ), 10, 1 );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( __CLASS__, 'prepare_store_api_order_meta' ), 10, 2 );

		// Show uploaded bank receipt & payment note inside WP Admin Order edit page.
		add_action( 'woocommerce_admin_order_data_after_billing_address', array( __CLASS__, 'render_admin_order_receipt_meta' ), 15 );
	}

	public static function is_woo_active() {
		return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_product' ) && function_exists( 'wc_get_order' );
	}

	public static function get_currency_label() {
		if ( self::is_woo_active() && function_exists( 'get_woocommerce_currency_symbol' ) ) {
			$symbol = html_entity_decode( wp_strip_all_tags( get_woocommerce_currency_symbol() ), ENT_QUOTES, 'UTF-8' );
			if ( ! empty( $symbol ) ) {
				return $symbol;
			}
		}
		return 'تومان';
	}

	/**
	 * Fetch WooCommerce product list for the WP Admin Term & Store pickers.
	 */
	public static function get_admin_products_list() {
		if ( ! self::is_woo_active() || ! function_exists( 'wc_get_products' ) ) {
			return array();
		}

		$products = wc_get_products(
			array(
				'limit'   => 150,
				'status'  => 'publish',
				'orderby' => 'title',
				'order'   => 'ASC',
			)
		);

		$list = array();
		foreach ( $products as $p ) {
			$list[] = array(
				'id'      => $p->get_id(),
				'name'    => $p->get_name(),
				'price'   => $p->get_price(),
				'on_sale' => $p->is_on_sale(),
			);
		}
		return $list;
	}

	/**
	 * Fetch WooCommerce product categories for Admin Store configuration.
	 */
	public static function get_admin_product_categories() {
		if ( ! taxonomy_exists( 'product_cat' ) ) {
			return array();
		}
		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => false,
			)
		);
		if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
			return array();
		}
		$out = array();
		foreach ( $terms as $t ) {
			if ( $t->slug === 'uncategorized' ) {
				continue;
			}
			$out[] = array(
				'id'    => (int) $t->term_id,
				'name'  => $t->name,
				'slug'  => $t->slug,
				'count' => (int) $t->count,
			);
		}
		return $out;
	}

	/**
	 * Extract structured regular/sale pricing and sale end countdown timestamp from a WC_Product.
	 */
	private static function extract_product_pricing( $product, $fallback_price = 0 ) {
		$currency       = self::get_currency_label();
		$regular_amount = max( 0, (int) $fallback_price );
		$sale_amount    = null;
		$active_amount  = $regular_amount;
		$on_sale        = false;
		$discount_pct   = 0;
		$sale_end_ts    = null;

		if ( $product && is_object( $product ) ) {
			$reg_raw    = $product->get_regular_price();
			$sale_raw   = $product->get_sale_price();
			$active_raw = $product->get_price();

			if ( $active_raw !== '' && is_numeric( $active_raw ) ) {
				$active_amount = (int) round( (float) $active_raw );
			}
			if ( $reg_raw !== '' && is_numeric( $reg_raw ) ) {
				$regular_amount = (int) round( (float) $reg_raw );
			} else {
				$regular_amount = $active_amount;
			}

			if ( $product->is_on_sale() && $sale_raw !== '' && is_numeric( $sale_raw ) ) {
				$sale_val = (int) round( (float) $sale_raw );
				if ( $regular_amount > 0 && $sale_val < $regular_amount ) {
					$on_sale       = true;
					$sale_amount   = $sale_val;
					$active_amount = $sale_val;
					$discount_pct  = (int) round( ( ( $regular_amount - $sale_val ) / $regular_amount ) * 100 );
				}
			}

			if ( method_exists( $product, 'get_date_on_sale_to' ) ) {
				$end_dt = $product->get_date_on_sale_to();
				if ( $end_dt && is_object( $end_dt ) && method_exists( $end_dt, 'getTimestamp' ) ) {
					$ts = (int) $end_dt->getTimestamp();
					if ( $ts > time() ) {
						$sale_end_ts = $ts * 1000;
					}
				}
			}
		}

		$format_fn = function ( $amount ) use ( $currency ) {
			return $amount > 0 ? number_format( $amount ) . ' ' . $currency : 'رایگان';
		};

		return array(
			'priceAmount'           => $active_amount,
			'priceFormatted'        => $active_amount > 0 ? $format_fn( $active_amount ) : 'تماس / رایگان',
			'regularPriceAmount'    => $regular_amount,
			'regularPriceFormatted' => $format_fn( $regular_amount ),
			'salePriceAmount'       => $sale_amount,
			'salePriceFormatted'    => $sale_amount !== null ? $format_fn( $sale_amount ) : '',
			'onSale'                => $on_sale,
			'discountPercent'       => $discount_pct,
			'saleEndTimestamp'      => $sale_end_ts,
		);
	}

	/**
	 * Compute live price, sale discount metadata, and checkout URL for a Term row.
	 */
	public static function get_term_commerce_meta( $term_row, $user_id = 0, $issue_sso = false ) {
		$fallback_price = isset( $term_row['price_amount'] ) ? (int) $term_row['price_amount'] : 0;
		$product_id     = isset( $term_row['woo_product_id'] ) ? absint( $term_row['woo_product_id'] ) : 0;
		$override_url   = isset( $term_row['checkout_url_override'] ) ? trim( (string) $term_row['checkout_url_override'] ) : '';
		$checkout_url   = '';
		$product        = null;

		if ( self::is_woo_active() && $product_id > 0 ) {
			$product = wc_get_product( $product_id );
			if ( $product ) {
				if ( function_exists( 'wc_get_checkout_url' ) ) {
					$checkout_url = add_query_arg(
						array(
							'add-to-cart' => $product_id,
							'kn_term'     => (int) $term_row['id'],
						),
						wc_get_checkout_url()
					);
				} else {
					$checkout_url = $product->get_permalink();
				}
			}
		}

		$pricing            = self::extract_product_pricing( $product, $fallback_price );
		$has_valid_override = false;

		if ( ! empty( $override_url ) ) {
			$parsed = wp_parse_url( $override_url );
			if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
				$checkout_url       = esc_url_raw( $override_url );
				$has_valid_override = true;
			}
		}

		if ( $issue_sso && $user_id > 0 && ! empty( $checkout_url ) ) {
			$allow_sso = true;
			if ( $has_valid_override ) {
				$home_host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
				$dest_host = wp_parse_url( $checkout_url, PHP_URL_HOST );
				if ( ! empty( $dest_host ) && ! empty( $home_host ) && strtolower( $dest_host ) !== strtolower( $home_host ) ) {
					$allow_sso = false;
				}
			}

			if ( $allow_sso ) {
				$sso_token = KN_Auth::issue_checkout_handoff( $user_id, (int) $term_row['id'] );
				if ( ! empty( $sso_token ) ) {
					$checkout_url = add_query_arg(
						array(
							'kn_checkout_sso' => $sso_token,
							'kn_term'         => (int) $term_row['id'],
						),
						home_url( '/' )
					);
				}
			}
		}

		$pricing['checkoutUrl'] = $checkout_url;
		return $pricing;
	}

	/**
	 * Return Bank Transfer (BACS) accounts configured in WooCommerce.
	 */
	public static function get_bacs_accounts() {
		$accounts = get_option( 'woocommerce_bacs_accounts', array() );
		$out      = array();

		if ( is_array( $accounts ) ) {
			foreach ( $accounts as $acc ) {
				if ( empty( $acc['account_number'] ) && empty( $acc['iban'] ) ) {
					continue;
				}
				$out[] = array(
					'accountName'   => sanitize_text_field( (string) ( $acc['account_name'] ?? '' ) ),
					'accountNumber' => sanitize_text_field( (string) ( $acc['account_number'] ?? '' ) ),
					'bankName'      => sanitize_text_field( (string) ( $acc['bank_name'] ?? '' ) ),
					'iban'          => sanitize_text_field( (string) ( $acc['iban'] ?? '' ) ),
					'sortCode'      => sanitize_text_field( (string) ( $acc['sort_code'] ?? '' ) ),
				);
			}
		}

		return $out;
	}

	/**
	 * Handle single-use SSO checkout handoff for both Paid Terms and In-App Store carts.
	 */
	public static function handle_sso_checkout_redirect() {
		if ( empty( $_GET['kn_checkout_sso'] ) ) {
			return;
		}

		nocache_headers();

		$raw_token = sanitize_text_field( wp_unslash( $_GET['kn_checkout_sso'] ) );
		$handoff   = KN_Auth::consume_checkout_handoff( $raw_token );

		if ( ! $handoff || empty( $handoff['user_id'] ) ) {
			wp_die(
				'لینک ورود خودکار به صفحه پرداخت منقضی شده یا قبلاً استفاده شده است. لطفاً به اپلیکیشن «کودک نابغه» بازگردید و دوباره دکمه پرداخت را بزنید.',
				'انقضای لینک پرداخت',
				array( 'response' => 403 )
			);
		}

		$user = get_user_by( 'id', absint( $handoff['user_id'] ) );
		if ( ! $user ) {
			wp_die(
				'حساب کاربری متصل به این سفارش یافت نشد.',
				'خطای حساب کاربری',
				array( 'response' => 404 )
			);
		}

		wp_clear_auth_cookie();
		wp_set_current_user( $user->ID, $user->user_login );
		wp_set_auth_cookie( $user->ID, true, is_ssl() );
		do_action( 'wp_login', $user->user_login, $user );

		$term_id     = ! empty( $handoff['term_id'] ) ? absint( $handoff['term_id'] ) : 0;
		$extra_items = ! empty( $handoff['items'] ) && is_array( $handoff['items'] ) ? $handoff['items'] : array();

		if ( $term_id <= 0 && empty( $extra_items ) && isset( $_GET['kn_term'] ) ) {
			$term_id = absint( $_GET['kn_term'] );
		}

		global $wpdb;
		$term = null;
		if ( $term_id > 0 ) {
			$term = $wpdb->get_row(
				$wpdb->prepare(
					'SELECT * FROM ' . KN_DB::table_terms() . ' WHERE id = %d',
					$term_id
				),
				ARRAY_A
			);
		}

		$redirect_url = home_url( '/' );
		if ( self::is_woo_active() && function_exists( 'WC' ) && WC() ) {
			if ( method_exists( WC(), 'initialize_session' ) && is_null( WC()->session ) ) {
				WC()->initialize_session();
			}
			if ( WC()->session && ! WC()->session->has_session() ) {
				WC()->session->set_customer_session_cookie( true );
			}
			if ( function_exists( 'wc_load_cart' ) && is_null( WC()->cart ) ) {
				wc_load_cart();
			} elseif ( method_exists( WC(), 'initialize_cart' ) && is_null( WC()->cart ) ) {
				WC()->initialize_cart();
			}

			self::hydrate_wc_customer_for_user( $user, true );

			if ( WC()->session ) {
				WC()->session->set( 'kn_active_term_id', $term_id );
			}

			if ( WC()->cart ) {
				if ( ! empty( $extra_items ) ) {
					WC()->cart->empty_cart();
					foreach ( $extra_items as $item ) {
						$pid = isset( $item['productId'] ) ? absint( $item['productId'] ) : 0;
						$qty = isset( $item['qty'] ) ? max( 1, absint( $item['qty'] ) ) : 1;
						if ( $pid > 0 ) {
							WC()->cart->add_to_cart( $pid, $qty );
						}
					}
					WC()->cart->calculate_totals();
				} elseif ( $term && ! empty( $term['woo_product_id'] ) ) {
					$product_id = absint( $term['woo_product_id'] );
					if ( $product_id > 0 ) {
						WC()->cart->empty_cart();
						WC()->cart->add_to_cart( $product_id, 1 );
						WC()->cart->calculate_totals();
					}
				}
			}

			if ( function_exists( 'wc_get_checkout_url' ) ) {
				$redirect_url = wc_get_checkout_url();
			}
		}

		if ( $term && ! empty( $term['checkout_url_override'] ) ) {
			$override  = trim( (string) $term['checkout_url_override'] );
			$home_host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
			$dest_host = wp_parse_url( $override, PHP_URL_HOST );
			if ( ! empty( $dest_host ) && ! empty( $home_host ) && strtolower( $dest_host ) === strtolower( $home_host ) ) {
				$redirect_url = esc_url_raw( $override );
			}
		}

		if ( $term_id > 0 ) {
			$redirect_url = add_query_arg( 'kn_term', $term_id, $redirect_url );
		}

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Ensure WC()->customer has valid billing & shipping defaults when visiting Checkout.
	 */
	public static function sync_express_customer_on_checkout() {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}
		if ( ! is_user_logged_in() ) {
			return;
		}
		$user = wp_get_current_user();
		if ( $user && $user->exists() ) {
			self::hydrate_wc_customer_for_user( $user, true );
		}
	}

	/**
	 * Populate missing WC()->customer billing and shipping fields from WordPress user meta.
	 */
	private static function hydrate_wc_customer_for_user( WP_User $user, $save = true ) {
		if ( ! function_exists( 'WC' ) || ! WC() || ! WC()->customer ) {
			return;
		}

		$profile  = self::resolve_user_billing_profile( $user );
		$customer = WC()->customer;
		$changed  = false;

		$pairs = array(
			'first_name' => $profile['first_name'],
			'last_name'  => $profile['last_name'],
			'email'      => $profile['email'],
			'phone'      => $profile['phone'],
			'country'    => $profile['country'],
			'state'      => $profile['state'],
			'city'       => $profile['city'],
			'address_1'  => $profile['address_1'],
			'postcode'   => $profile['postcode'],
		);

		foreach ( $pairs as $key => $val ) {
			if ( empty( $val ) ) {
				continue;
			}
			$b_getter = 'get_billing_' . $key;
			$b_setter = 'set_billing_' . $key;
			if ( method_exists( $customer, $b_getter ) && method_exists( $customer, $b_setter ) ) {
				if ( '' === trim( (string) $customer->$b_getter() ) ) {
					$customer->$b_setter( $val );
					$changed = true;
				}
			}
			if ( $key !== 'email' ) {
				$s_getter = 'get_shipping_' . $key;
				$s_setter = 'set_shipping_' . $key;
				if ( method_exists( $customer, $s_getter ) && method_exists( $customer, $s_setter ) ) {
					if ( '' === trim( (string) $customer->$s_getter() ) ) {
						$customer->$s_setter( $val );
						$changed = true;
					}
				}
			}
		}

		if ( $save && $changed ) {
			$customer->save();
		}
	}

	/**
	 * Build reliable fallback billing details from authenticated WordPress user.
	 */
	public static function resolve_user_billing_profile( WP_User $user ) {
		$first_name = trim( (string) $user->first_name );
		if ( '' === $first_name ) {
			$first_name = trim( (string) get_user_meta( $user->ID, 'billing_first_name', true ) );
		}
		if ( '' === $first_name ) {
			$first_name = trim( (string) $user->display_name );
		}
		if ( '' === $first_name ) {
			$first_name = trim( (string) $user->user_login );
		}
		if ( '' === $first_name ) {
			$first_name = 'کاربر';
		}

		$last_name = trim( (string) $user->last_name );
		if ( '' === $last_name ) {
			$last_name = trim( (string) get_user_meta( $user->ID, 'billing_last_name', true ) );
		}
		if ( '' === $last_name ) {
			$last_name = 'کودک نابغه';
		}

		$email = sanitize_email( (string) $user->user_email );
		if ( '' === $email ) {
			$email = sanitize_email( (string) get_user_meta( $user->ID, 'billing_email', true ) );
		}

		$phone = sanitize_text_field( (string) get_user_meta( $user->ID, 'kn_mobile', true ) );
		if ( '' === $phone ) {
			$phone = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_phone', true ) );
		}
		if ( '' === $phone ) {
			$phone = '09120000000';
		}

		$country = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_country', true ) );
		if ( '' === $country && function_exists( 'WC' ) && WC() && WC()->countries ) {
			$country = (string) WC()->countries->get_base_country();
		}
		if ( '' === $country ) {
			$country = 'IR';
		}

		$state = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_state', true ) );
		if ( '' === $state && function_exists( 'WC' ) && WC() && WC()->countries ) {
			$base_state = (string) WC()->countries->get_base_state();
			$states     = WC()->countries->get_states( $country );
			if ( ! empty( $base_state ) && ( empty( $states ) || isset( $states[ $base_state ] ) ) ) {
				$state = $base_state;
			} elseif ( is_array( $states ) && ! empty( $states ) ) {
				if ( isset( $states['THR'] ) ) {
					$state = 'THR';
				} else {
					$keys  = array_keys( $states );
					$state = (string) reset( $keys );
				}
			}
		}

		$city = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_city', true ) );
		if ( '' === $city && function_exists( 'WC' ) && WC() && WC()->countries ) {
			$city = trim( (string) WC()->countries->get_base_city() );
		}
		if ( '' === $city ) {
			$city = 'تهران';
		}

		$address_1 = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_address_1', true ) );
		if ( '' === $address_1 && function_exists( 'WC' ) && WC() && WC()->countries ) {
			$address_1 = trim( (string) WC()->countries->get_base_address() );
		}
		if ( '' === $address_1 ) {
			$address_1 = 'ثبت‌شده در حساب کاربری کودک نابغه';
		}

		$postcode = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_postcode', true ) );
		if ( '' === $postcode && function_exists( 'WC' ) && WC() && WC()->countries ) {
			$postcode = trim( (string) WC()->countries->get_base_postcode() );
		}
		if ( '' === $postcode ) {
			$postcode = '1111111111';
		}

		return array(
			'first_name' => $first_name,
			'last_name'  => $last_name,
			'email'      => $email,
			'phone'      => $phone,
			'country'    => $country,
			'state'      => $state,
			'city'       => $city,
			'address_1'  => $address_1,
			'postcode'   => $postcode,
		);
	}

	/**
	 * Map WooCommerce product IDs -> Term DB IDs for paid Terms.
	 *
	 * @return array<int, int>
	 */
	private static function get_paid_term_product_map() {
		if ( is_array( self::$term_product_map ) ) {
			return self::$term_product_map;
		}
		global $wpdb;
		$t_terms = KN_DB::table_terms();
		$rows    = $wpdb->get_results( "SELECT id, woo_product_id FROM {$t_terms} WHERE is_free = 0 AND woo_product_id > 0", ARRAY_A );
		$map     = array();
		if ( is_array( $rows ) ) {
			foreach ( $rows as $row ) {
				$pid = absint( $row['woo_product_id'] );
				$tid = absint( $row['id'] );
				if ( $pid > 0 && $tid > 0 ) {
					$map[ $pid ] = $tid;
				}
			}
		}
		self::$term_product_map = $map;
		return $map;
	}

	public static function get_active_checkout_term_id() {
		if ( isset( $_GET['kn_term'] ) ) {
			$tid = absint( $_GET['kn_term'] );
			if ( $tid > 0 ) {
				return $tid;
			}
		}

		if ( isset( $_POST['kn_term'] ) ) {
			$tid = absint( $_POST['kn_term'] );
			if ( $tid > 0 ) {
				return $tid;
			}
		}

		if ( function_exists( 'WC' ) && WC() && WC()->cart && ! WC()->cart->is_empty() ) {
			$map = self::get_paid_term_product_map();
			if ( ! empty( $map ) ) {
				foreach ( WC()->cart->get_cart() as $item ) {
					$pid = isset( $item['product_id'] ) ? absint( $item['product_id'] ) : 0;
					$vid = isset( $item['variation_id'] ) ? absint( $item['variation_id'] ) : 0;
					if ( $pid > 0 && isset( $map[ $pid ] ) ) {
						return $map[ $pid ];
					}
					if ( $vid > 0 && isset( $map[ $vid ] ) ) {
						return $map[ $vid ];
					}
				}
			}

			if ( WC()->session ) {
				$sess_tid = absint( WC()->session->get( 'kn_active_term_id' ) );
				if ( $sess_tid > 0 ) {
					return $sess_tid;
				}
			}
		}

		return 0;
	}

	public static function is_term_checkout_context() {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return false;
		}
		if ( ! is_user_logged_in() ) {
			return false;
		}
		return self::get_active_checkout_term_id() > 0;
	}

	public static function filter_product_needs_shipping( $needs_shipping, $product ) {
		if ( $product && is_object( $product ) && method_exists( $product, 'get_id' ) ) {
			$map = self::get_paid_term_product_map();
			if ( isset( $map[ absint( $product->get_id() ) ] ) ) {
				return false;
			}
		}
		return $needs_shipping;
	}

	public static function filter_false_for_term_checkout( $value ) {
		if ( self::is_term_checkout_context() ) {
			return false;
		}
		return $value;
	}

	public static function simplify_term_checkout_fields( $fields ) {
		if ( ! self::is_term_checkout_context() ) {
			return $fields;
		}

		unset( $fields['shipping'] );
		unset( $fields['order']['order_comments'] );

		if ( isset( $fields['billing'] ) && is_array( $fields['billing'] ) ) {
			$keep = array( 'billing_first_name', 'billing_last_name', 'billing_email' );
			foreach ( $fields['billing'] as $key => $cfg ) {
				if ( ! in_array( $key, $keep, true ) ) {
					unset( $fields['billing'][ $key ] );
				} else {
					$fields['billing'][ $key ]['required'] = false;
				}
			}
		}

		return $fields;
	}

	public static function simplify_term_billing_fields( $fields ) {
		if ( ! self::is_term_checkout_context() || ! is_array( $fields ) ) {
			return $fields;
		}

		$keep = array( 'billing_first_name', 'billing_last_name', 'billing_email' );
		foreach ( $fields as $key => $cfg ) {
			if ( ! in_array( $key, $keep, true ) ) {
				unset( $fields[ $key ] );
			} else {
				$fields[ $key ]['required'] = false;
			}
		}

		return $fields;
	}

	public static function simplify_term_default_address_fields( $fields ) {
		if ( ! self::is_term_checkout_context() || ! is_array( $fields ) ) {
			return $fields;
		}

		foreach ( $fields as $key => $cfg ) {
			if ( is_array( $cfg ) ) {
				$fields[ $key ]['required'] = false;
			}
		}

		return $fields;
	}

	public static function prefill_term_checkout_value( $value, $input ) {
		if ( ! self::is_term_checkout_context() ) {
			return $value;
		}

		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			return $value;
		}

		$profile = self::resolve_user_billing_profile( $user );
		$map     = array(
			'billing_first_name' => $profile['first_name'],
			'billing_last_name'  => $profile['last_name'],
			'billing_email'      => $profile['email'],
			'billing_phone'      => $profile['phone'],
			'billing_country'    => $profile['country'],
			'billing_state'      => $profile['state'],
			'billing_city'       => $profile['city'],
			'billing_address_1'  => $profile['address_1'],
			'billing_postcode'   => $profile['postcode'],
		);

		if ( isset( $map[ $input ] ) && '' === trim( (string) $value ) ) {
			return $map[ $input ];
		}

		return $value;
	}

	public static function render_express_checkout_banner() {
		if ( ! self::is_term_checkout_context() ) {
			return;
		}
		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			return;
		}
		$profile = self::resolve_user_billing_profile( $user );
		$term_id = self::get_active_checkout_term_id();
		?>
		<div id="kn-express-banner" class="kn-express-banner" style="direction:rtl;text-align:right;margin:0 0 20px;padding:16px 18px;border-radius:16px;background:linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%);border:2px solid #A7F3D0;color:#064E3B;font-family:inherit;">
			<div style="font-weight:800;font-size:15px;margin-bottom:6px;">
				حساب کاربری شما به صورت خودکار متصل شد
			</div>
			<div style="font-size:13px;line-height:1.8;color:#0F172A;">
				سفارش مستقیم به نام
				<strong><?php echo esc_html( $user->display_name ? $user->display_name : $profile['first_name'] ); ?></strong>
				ثبت می‌شود و نیازی به ورود مجدد یا پر کردن فرم آدرس نیست. فقط روش پرداخت را انتخاب و دکمه پرداخت را بزنید.
			</div>
		</div>
		<?php if ( $term_id > 0 ) : ?>
			<input type="hidden" name="kn_term" value="<?php echo esc_attr( $term_id ); ?>" />
		<?php endif; ?>
		<?php
	}

	public static function render_express_checkout_styles() {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}
		if ( ! self::is_term_checkout_context() ) {
			return;
		}
		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			return;
		}
		$profile = self::resolve_user_billing_profile( $user );
		if ( empty( $profile['email'] ) ) {
			return;
		}
		?>
		<style id="kn-express-checkout-css">
			.woocommerce-checkout .woocommerce-shipping-fields,
			.woocommerce-checkout .woocommerce-additional-fields,
			.woocommerce-checkout .wc-block-checkout__shipping-fields,
			.woocommerce-checkout .wc-block-checkout__order-notes {
				display: none !important;
			}
			body:not(.kn-show-express-fields) .woocommerce-checkout .woocommerce-billing-fields {
				display: none !important;
			}
			body:not(.kn-show-express-fields) .woocommerce-checkout .kn-express-collapsed {
				display: none !important;
			}
		</style>
		<?php
	}

	public static function render_checkout_block_express_script() {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}
		if ( ! self::is_term_checkout_context() || ! is_user_logged_in() ) {
			return;
		}
		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			return;
		}
		$profile      = self::resolve_user_billing_profile( $user );
		$display_name = $user->display_name ? $user->display_name : $profile['first_name'];
		$phone        = $profile['phone'];
		?>
		<script id="kn-express-checkout-js">
		(function() {
			var accountName = <?php echo wp_json_encode( $display_name ); ?>;
			var accountPhone = <?php echo wp_json_encode( $phone ); ?>;
			var bannerInjected = false;

			function injectBannerAboveBlock(checkoutRoot) {
				if (bannerInjected || document.getElementById('kn-express-banner')) {
					bannerInjected = true;
					return;
				}
				if (!checkoutRoot || !checkoutRoot.parentNode) return;
				bannerInjected = true;

				var banner = document.createElement('div');
				banner.id = 'kn-express-banner';
				banner.className = 'kn-express-banner';
				banner.style.cssText = 'direction:rtl;text-align:right;margin:0 0 20px;padding:16px 18px;border-radius:16px;background:linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%);border:2px solid #A7F3D0;color:#064E3B;font-family:inherit;';

				var topRow = document.createElement('div');
				topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px;';

				var title = document.createElement('div');
				title.style.cssText = 'font-weight:800;font-size:15px;';
				title.textContent = 'حساب کاربری شما به صورت خودکار متصل شد';

				var toggleBtn = document.createElement('button');
				toggleBtn.type = 'button';
				toggleBtn.id = 'kn-toggle-express-fields';
				toggleBtn.style.cssText = 'background:#FFFFFF;border:1px solid #93C5FD;color:#1D4ED8;border-radius:10px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;';
				toggleBtn.textContent = 'نمایش / ویرایش مشخصات حساب';
				toggleBtn.addEventListener('click', function() {
					document.body.classList.toggle('kn-show-express-fields');
				});

				topRow.appendChild(title);
				topRow.appendChild(toggleBtn);

				var desc = document.createElement('div');
				desc.style.cssText = 'font-size:13px;line-height:1.8;color:#0F172A;';
				var who = accountName + (accountPhone ? ' (' + accountPhone + ')' : '');
				desc.textContent = 'سفارش مستقیم به نام «' + who + '» ثبت می‌شود. روش پرداخت را انتخاب و دکمه پرداخت را بزنید.';

				var errBox = document.createElement('div');
				errBox.id = 'kn-express-error-box';
				errBox.style.cssText = 'display:none;margin-top:12px;padding:12px 14px;border-radius:12px;background:#FEF2F2;border:2px solid #FCA5A5;color:#991B1B;font-size:13px;font-weight:700;line-height:1.7;';

				banner.appendChild(topRow);
				banner.appendChild(desc);
				banner.appendChild(errBox);
				checkoutRoot.parentNode.insertBefore(banner, checkoutRoot);
			}

			function sectionHasMissingRequiredOrError(section) {
				if (!section) return true;
				if (section.querySelector('.wc-block-components-validation-error, .has-error, [aria-invalid="true"]')) {
					return true;
				}
				var requiredFields = section.querySelectorAll('input[required], select[required], textarea[required]');
				for (var i = 0; i < requiredFields.length; i++) {
					var el = requiredFields[i];
					if (el.offsetParent === null && !section.classList.contains('kn-express-collapsed')) {
						continue;
					}
					if (!el.value || String(el.value).trim() === '') {
						return true;
					}
				}
				return false;
			}

			function showErrorBox(messages) {
				var box = document.getElementById('kn-express-error-box');
				if (!box) return;
				if (!messages || !messages.length) {
					box.style.display = 'none';
					box.textContent = '';
					return;
				}
				box.style.display = 'block';
				box.innerHTML = '';
				var title = document.createElement('div');
				title.textContent = 'لطفاً موارد زیر را بررسی کنید:';
				title.style.marginBottom = '4px';
				box.appendChild(title);
				var ul = document.createElement('ul');
				ul.style.margin = '0';
				ul.style.paddingRight = '18px';
				messages.forEach(function(msg) {
					var li = document.createElement('li');
					li.textContent = msg;
					ul.appendChild(li);
				});
				box.appendChild(ul);
			}

			function collectErrors() {
				var msgs = [];
				document.querySelectorAll('.wc-block-components-validation-error p, .wc-block-components-notice-banner.is-error .wc-block-components-notice-banner__content, .woocommerce-error li').forEach(function(el) {
					var txt = (el.textContent || '').trim();
					if (txt && msgs.indexOf(txt) === -1) {
						msgs.push(txt);
					}
				});
				return msgs;
			}

			function evaluateCheckoutBlock() {
				var checkoutRoot = document.querySelector('.wp-block-woocommerce-checkout');
				if (!checkoutRoot) return false;
				var mainReady = checkoutRoot.querySelector('.wc-block-checkout__main, .wc-block-checkout__payment-method, .wc-block-components-checkout-place-order-button');
				if (!mainReady) return false;

				injectBannerAboveBlock(checkoutRoot);

				var sections = checkoutRoot.querySelectorAll('.wc-block-checkout__contact-fields, .wc-block-checkout__billing-fields');
				sections.forEach(function(sec) {
					if (sectionHasMissingRequiredOrError(sec)) {
						sec.classList.remove('kn-express-collapsed');
					} else {
						sec.classList.add('kn-express-collapsed');
					}
				});
				return true;
			}

			document.addEventListener('DOMContentLoaded', function() {
				var tries = 0;
				var timer = setInterval(function() {
					tries++;
					if (evaluateCheckoutBlock() || tries > 30) {
						clearInterval(timer);
					}
				}, 300);
			});

			document.addEventListener('click', function(ev) {
				var target = ev.target;
				if (!target || !target.closest) return;
				var btn = target.closest('.wc-block-components-checkout-place-order-button');
				if (!btn) return;

				var checkErrors = function() {
					var errs = collectErrors();
					if (errs.length > 0) {
						document.body.classList.add('kn-show-express-fields');
						document.querySelectorAll('.kn-express-collapsed').forEach(function(el) {
							el.classList.remove('kn-express-collapsed');
						});
						showErrorBox(errs);
					}
				};
				setTimeout(checkErrors, 250);
				setTimeout(checkErrors, 1500);
			}, true);
		})();
		</script>
		<?php
	}

	/**
	 * Classic Checkout: Optional Bank Receipt (<= 100KB auto-compressed) & Payment Description fields.
	 */
	public static function render_classic_checkout_receipt_fields() {
		if ( ! is_user_logged_in() ) {
			return;
		}
		?>
		<div id="kn-classic-receipt-box" style="direction:rtl;text-align:right;margin:14px 0 18px;padding:14px 16px;border-radius:16px;background:#FFFBEB;border:2px solid #FDE68A;">
			<div style="font-weight:800;font-size:14px;color:#92400E;margin-bottom:6px;">
				اطلاعات تکمیلی پرداخت (اختیاری — ویژه واریز به حساب / کارت به کارت)
			</div>
			<p style="font-size:12px;color:#78350F;margin:0 0 10px;line-height:1.7;">
				در صورت انتخاب پرداخت بانکی/واریز به حساب، می‌توانید تصویر رسید بانکی (حداکثر ۱۰۰ کیلوبایت، بهینه‌سازی خودکار) و توضیحات واریز را ثبت کنید.
			</p>
			<div style="margin-bottom:10px;">
				<label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">تصویر رسید پرداخت (اختیاری):</label>
				<input type="file" id="kn-classic-receipt-file" accept="image/*" />
				<input type="hidden" name="kn_receipt_data_url" id="kn-classic-receipt-data-url" value="" />
				<div id="kn-classic-receipt-status" style="font-size:11px;color:#047857;margin-top:4px;font-weight:700;"></div>
			</div>
			<div>
				<label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">توضیحات یا شماره پیگیری پرداخت (اختیاری):</label>
				<textarea name="kn_payment_note" rows="2" placeholder="مثلاً شماره ارجاع بانکی، چهار رقم آخر کارت یا ساعت واریز..." style="width:100%;border-radius:10px;border:1px solid #FCD34D;padding:8px 10px;font-size:12px;"></textarea>
			</div>
		</div>
		<script>
		(function(){
			var input = document.getElementById('kn-classic-receipt-file');
			var hidden = document.getElementById('kn-classic-receipt-data-url');
			var status = document.getElementById('kn-classic-receipt-status');
			if (!input || !hidden) return;
			input.addEventListener('change', function(){
				var file = input.files && input.files[0];
				if (!file) { hidden.value = ''; status.textContent = ''; return; }
				var reader = new FileReader();
				reader.onload = function(ev){
					var img = new Image();
					img.onload = function(){
						var canvas = document.createElement('canvas');
						var dims = [1100, 860, 680, 520];
						var quals = [0.8, 0.62, 0.45, 0.3, 0.18];
						var best = '';
						for (var d=0; d<dims.length && !best; d++) {
							var scale = Math.min(1, dims[d] / Math.max(img.width, img.height));
							canvas.width = Math.max(1, Math.round(img.width * scale));
							canvas.height = Math.max(1, Math.round(img.height * scale));
							var ctx = canvas.getContext('2d');
							ctx.fillStyle = '#ffffff';
							ctx.fillRect(0, 0, canvas.width, canvas.height);
							ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
							for (var q=0; q<quals.length; q++) {
								var dataUrl = canvas.toDataURL('image/jpeg', quals[q]);
								var approxBytes = Math.ceil((dataUrl.length - 23) * 0.75);
								if (approxBytes <= 102400) {
									best = dataUrl;
									status.textContent = 'رسید آماده ارسال شد (' + Math.round(approxBytes/1024) + ' کیلوبایت)';
									break;
								}
							}
						}
						if (!best) {
							status.textContent = 'حجم فایل خیلی زیاد بود؛ لطفاً عکس دیگری انتخاب کنید.';
						}
						hidden.value = best;
					};
					img.src = ev.target.result;
				};
				reader.readAsDataURL(file);
			});
		})();
		</script>
		<?php
	}

	/**
	 * Thank-You page receipt upload box when an order is on-hold/pending (e.g. direct bank transfer).
	 */
	public static function render_thankyou_receipt_box( $order_id ) {
		$order = wc_get_order( absint( $order_id ) );
		if ( ! $order ) {
			return;
		}
		if ( ! in_array( $order->get_status(), array( 'on-hold', 'pending' ), true ) ) {
			return;
		}
		$current_user_id = get_current_user_id();
		if ( $current_user_id <= 0 || (int) $order->get_customer_id() !== $current_user_id ) {
			return;
		}

		$existing_receipt = (string) $order->get_meta( '_kn_receipt_url', true );
		$existing_note    = (string) $order->get_meta( '_kn_payment_note', true );
		$uploaded_ok      = ! empty( $_GET['kn_receipt_saved'] );
		?>
		<div style="direction:rtl;text-align:right;margin:20px 0;padding:18px 20px;border-radius:18px;background:#FFFBEB;border:2px solid #F59E0B;">
			<h3 style="margin:0 0 8px;font-size:16px;color:#92400E;">سفارش در حال بررسی و تایید توسط مدیر می‌باشد</h3>
			<p style="margin:0 0 12px;font-size:13px;color:#78350F;line-height:1.8;">
				سفارش شماره <strong>#<?php echo esc_html( $order->get_order_number() ); ?></strong> با موفقیت ثبت شد. پس از بررسی و تایید مدیر، دسترسی شما فوراً فعال خواهد شد.
			</p>
			<?php if ( $uploaded_ok ) : ?>
				<div style="padding:10px 14px;border-radius:12px;background:#ECFDF5;border:1px solid #34D399;color:#065F46;font-weight:700;font-size:13px;margin-bottom:12px;">
					رسید پرداخت و توضیحات شما با موفقیت برای بررسی مدیر ثبت شد!
				</div>
			<?php endif; ?>
			<?php if ( ! empty( $existing_receipt ) ) : ?>
				<div style="margin-bottom:12px;">
					<div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:6px;">رسید ثبت‌شده فعلی:</div>
					<a href="<?php echo esc_url( $existing_receipt ); ?>" target="_blank" rel="noopener noreferrer">
						<img src="<?php echo esc_url( $existing_receipt ); ?>" alt="رسید بانکی" style="max-width:220px;border-radius:12px;border:2px solid #A7F3D0;" />
					</a>
				</div>
			<?php endif; ?>
			<form method="post" enctype="multipart/form-data">
				<?php wp_nonce_field( 'kn_thankyou_receipt_' . $order->get_id() ); ?>
				<input type="hidden" name="kn_thankyou_order_id" value="<?php echo esc_attr( $order->get_id() ); ?>" />
				<div style="margin-bottom:10px;">
					<label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">آپلود یا تغییر تصویر رسید بانکی (اختیاری - حداکثر ۱۰۰ کیلوبایت):</label>
					<input type="file" name="kn_thankyou_receipt_file" accept="image/*" />
				</div>
				<div style="margin-bottom:12px;">
					<label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">توضیحات یا کد پیگیری واریز (اختیاری):</label>
					<textarea name="kn_thankyou_payment_note" rows="2" style="width:100%;border-radius:10px;border:1px solid #FCD34D;padding:8px 10px;font-size:13px;"><?php echo esc_textarea( $existing_note ); ?></textarea>
				</div>
				<button type="submit" style="background:#EA580C;color:#fff;border:none;border-radius:12px;padding:10px 18px;font-weight:800;cursor:pointer;">
					ثبت رسید و توضیحات
				</button>
			</form>
		</div>
		<?php
	}

	/**
	 * Handle Thank-You page receipt upload POST cleanly before headers are sent.
	 */
	public static function handle_thankyou_receipt_post() {
		if ( empty( $_POST['kn_thankyou_order_id'] ) ) {
			return;
		}
		$order_id = absint( $_POST['kn_thankyou_order_id'] );
		if ( ! is_user_logged_in() || $order_id <= 0 ) {
			return;
		}
		if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ?? '' ) ), 'kn_thankyou_receipt_' . $order_id ) ) {
			return;
		}
		$user = wp_get_current_user();
		$file = ! empty( $_FILES['kn_thankyou_receipt_file']['tmp_name'] ) ? $_FILES['kn_thankyou_receipt_file'] : null;
		$note = sanitize_textarea_field( wp_unslash( $_POST['kn_thankyou_payment_note'] ?? '' ) );

		self::attach_receipt_to_order( $user, $order_id, $file, $note );

		wp_safe_redirect( add_query_arg( 'kn_receipt_saved', '1', wp_get_referer() ?: home_url( '/' ) ) );
		exit;
	}

	/**
	 * Show uploaded bank receipt thumbnail + note in WP Admin Order screen.
	 */
	public static function render_admin_order_receipt_meta( $order ) {
		if ( ! $order || ! is_object( $order ) ) {
			return;
		}
		$receipt_url  = (string) $order->get_meta( '_kn_receipt_url', true );
		$payment_note = (string) $order->get_meta( '_kn_payment_note', true );

		if ( empty( $receipt_url ) && empty( $payment_note ) ) {
			return;
		}
		?>
		<div style="margin-top:12px;padding:12px;background:#FFFBEB;border:2px solid #F59E0B;border-radius:10px;">
			<p style="margin:0 0 6px;font-weight:800;color:#92400E;">اطلاعات فیش واریزی اپلیکیشن کودک نابغه</p>
			<?php if ( ! empty( $payment_note ) ) : ?>
				<p style="margin:0 0 8px;font-size:12px;color:#334155;"><strong>توضیحات کاربر:</strong> <?php echo esc_html( $payment_note ); ?></p>
			<?php endif; ?>
			<?php if ( ! empty( $receipt_url ) ) : ?>
				<a href="<?php echo esc_url( $receipt_url ); ?>" target="_blank" rel="noopener noreferrer">
					<img src="<?php echo esc_url( $receipt_url ); ?>" alt="رسید بانکی" style="max-width:200px;border-radius:8px;border:1px solid #FCD34D;display:block;margin-bottom:6px;" />
					<span>مشاهده تصویر کامل رسید</span>
				</a>
			<?php endif; ?>
		</div>
		<?php
	}

	public static function prepare_order_customer_and_meta( $order, $data ) {
		if ( ! $order || ! is_object( $order ) ) {
			return;
		}

		$user_id = get_current_user_id();
		if ( $user_id > 0 ) {
			$order->set_customer_id( $user_id );
			$user = get_user_by( 'id', $user_id );
			if ( $user ) {
				$profile = self::resolve_user_billing_profile( $user );
				$fields  = array(
					'first_name' => $profile['first_name'],
					'last_name'  => $profile['last_name'],
					'email'      => $profile['email'],
					'phone'      => $profile['phone'],
					'country'    => $profile['country'],
					'state'      => $profile['state'],
					'city'       => $profile['city'],
					'address_1'  => $profile['address_1'],
					'postcode'   => $profile['postcode'],
				);
				foreach ( $fields as $k => $v ) {
					if ( empty( $v ) ) {
						continue;
					}
					$b_get = 'get_billing_' . $k;
					$b_set = 'set_billing_' . $k;
					if ( method_exists( $order, $b_get ) && method_exists( $order, $b_set ) ) {
						if ( '' === trim( (string) $order->$b_get() ) ) {
							$order->$b_set( $v );
						}
					}
					if ( $k !== 'email' ) {
						$s_get = 'get_shipping_' . $k;
						$s_set = 'set_shipping_' . $k;
						if ( method_exists( $order, $s_get ) && method_exists( $order, $s_set ) ) {
							if ( '' === trim( (string) $order->$s_get() ) ) {
								$order->$s_set( $v );
							}
						}
					}
				}
			}
		}

		$term_id = self::get_active_checkout_term_id();
		if ( $term_id > 0 ) {
			$order->update_meta_data( '_kn_term_id', $term_id );
		}

		if ( ! empty( $_POST['kn_payment_note'] ) ) {
			$note = sanitize_textarea_field( wp_unslash( $_POST['kn_payment_note'] ) );
			if ( ! empty( $note ) ) {
				$order->update_meta_data( '_kn_payment_note', $note );
			}
		}

		if ( ! empty( $_POST['kn_receipt_data_url'] ) && $user_id > 0 ) {
			$user = get_user_by( 'id', $user_id );
			if ( $user ) {
				$saved = self::save_base64_user_image( $user, (string) wp_unslash( $_POST['kn_receipt_data_url'] ), 'receipt' );
				if ( ! is_wp_error( $saved ) && ! empty( $saved['url'] ) ) {
					$order->update_meta_data( '_kn_receipt_url', $saved['url'] );
				}
			}
		}
	}

	public static function prepare_store_api_order_meta( $order, $request ) {
		self::prepare_order_customer_and_meta( $order, array() );
		if ( $order && is_object( $order ) ) {
			$order->save();
		}
	}

	public static function attach_term_meta_on_checkout( $order ) {
		if ( ! $order || ! is_object( $order ) ) {
			return;
		}
		$term_id = self::get_active_checkout_term_id();
		if ( $term_id > 0 ) {
			$order->update_meta_data( '_kn_term_id', $term_id );
			$order->save();
		}
	}

	/**
	 * Validate and persist an uploaded image strictly <= 100 KB into a dedicated user folder on WordPress host:
	 * wp-content/uploads/<kn-receipts|kn-avatars>/<sanitized_username>/
	 */
	public static function save_compressed_user_image( WP_User $user, $file_array, $prefix = 'receipt', $folder_slug = 'kn-receipts' ) {
		if ( empty( $file_array ) || ! is_array( $file_array ) || empty( $file_array['tmp_name'] ) ) {
			return new WP_Error( 'missing_file', 'فایل تصویری دریافت نشد.', array( 'status' => 400 ) );
		}
		if ( ! empty( $file_array['error'] ) && (int) $file_array['error'] !== UPLOAD_ERR_OK ) {
			return new WP_Error( 'upload_error', 'خطا در دریافت فایل تصویر.', array( 'status' => 400 ) );
		}

		$tmp_path  = (string) $file_array['tmp_name'];
		$file_size = @filesize( $tmp_path );
		if ( false === $file_size || $file_size <= 0 ) {
			return new WP_Error( 'empty_file', 'فایل تصویر خالی است.', array( 'status' => 400 ) );
		}
		if ( $file_size > self::MAX_IMAGE_BYTES ) {
			return new WP_Error( 'file_too_large', 'حجم تصویر نباید بیشتر از ۱۰۰ کیلوبایت باشد.', array( 'status' => 400 ) );
		}

		$img_info = @getimagesize( $tmp_path );
		if ( ! is_array( $img_info ) || empty( $img_info['mime'] ) ) {
			return new WP_Error( 'invalid_image', 'فایل انتخاب‌شده یک تصویر معتبر نیست.', array( 'status' => 400 ) );
		}

		$allowed_mimes = array(
			'image/jpeg' => 'jpg',
			'image/png'  => 'png',
			'image/webp' => 'webp',
		);
		$mime = strtolower( (string) $img_info['mime'] );
		if ( ! isset( $allowed_mimes[ $mime ] ) ) {
			return new WP_Error( 'unsupported_image_type', 'تنها فرمت‌های تصویر JPG، PNG یا WebP مجاز هستند.', array( 'status' => 400 ) );
		}
		$ext = $allowed_mimes[ $mime ];

		$dirs = self::ensure_user_receipt_dir( $user, $folder_slug );
		if ( is_wp_error( $dirs ) ) {
			return $dirs;
		}

		$safe_prefix = sanitize_key( $prefix ?: 'receipt' );
		$filename    = $safe_prefix . '-' . gmdate( 'YmdHis' ) . '-' . wp_generate_password( 10, false, false ) . '.' . $ext;
		$dest_path   = trailingslashit( $dirs['path'] ) . $filename;
		$dest_url    = trailingslashit( $dirs['url'] ) . $filename;

		$moved = false;
		if ( is_uploaded_file( $tmp_path ) ) {
			$moved = @move_uploaded_file( $tmp_path, $dest_path );
		} else {
			$moved = @copy( $tmp_path, $dest_path );
		}

		if ( ! $moved || ! file_exists( $dest_path ) ) {
			return new WP_Error( 'save_failed', 'ذخیره تصویر روی هاست انجام نشد.', array( 'status' => 500 ) );
		}

		@chmod( $dest_path, 0644 );

		return array(
			'url'  => esc_url_raw( $dest_url ),
			'path' => $dest_path,
			'size' => (int) filesize( $dest_path ),
		);
	}

	/**
	 * Decode and store a base64 data URL image <= 100 KB into the per-user folder.
	 */
	private static function save_base64_user_image( WP_User $user, $data_url, $prefix = 'receipt' ) {
		if ( ! preg_match( '/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/is', trim( $data_url ), $m ) ) {
			return new WP_Error( 'invalid_image', 'فرمت تصویر نامعتبر است.', array( 'status' => 400 ) );
		}
		$binary = base64_decode( $m[2], true );
		if ( false === $binary || strlen( $binary ) === 0 || strlen( $binary ) > self::MAX_IMAGE_BYTES ) {
			return new WP_Error( 'file_too_large', 'حجم تصویر نباید بیشتر از ۱۰۰ کیلوبایت باشد.', array( 'status' => 400 ) );
		}

		$tmp = wp_tempnam( 'kn_img' );
		if ( ! $tmp ) {
			return new WP_Error( 'tmp_failed', 'خطا در ایجاد فایل موقت.', array( 'status' => 500 ) );
		}
		file_put_contents( $tmp, $binary );
		$img_info = @getimagesize( $tmp );
		if ( ! is_array( $img_info ) ) {
			@unlink( $tmp );
			return new WP_Error( 'invalid_image', 'فایل تصویر معتبر نیست.', array( 'status' => 400 ) );
		}

		$res = self::save_compressed_user_image(
			$user,
			array(
				'tmp_name' => $tmp,
				'error'    => UPLOAD_ERR_OK,
			),
			$prefix
		);
		@unlink( $tmp );
		return $res;
	}

	/**
	 * Auto-create wp-content/uploads/<kn-receipts|kn-avatars>/<sanitized_username>/ with script-execution disabled.
	 */
	private static function ensure_user_receipt_dir( WP_User $user, $folder_slug = 'kn-receipts' ) {
		$upload_dir = wp_upload_dir();
		if ( ! empty( $upload_dir['error'] ) ) {
			return new WP_Error( 'upload_dir_error', $upload_dir['error'], array( 'status' => 500 ) );
		}

		$safe_root = in_array( $folder_slug, array( 'kn-receipts', 'kn-avatars' ), true ) ? $folder_slug : 'kn-receipts';

		$raw_folder = preg_replace( '/[^a-zA-Z0-9_\-]/', '_', strtolower( (string) $user->user_login ) );
		$raw_folder = trim( (string) $raw_folder, '_-' );
		if ( empty( $raw_folder ) ) {
			$raw_folder = 'user_' . (int) $user->ID;
		}
		$user_folder = sanitize_file_name( $raw_folder );

		$root_path = trailingslashit( $upload_dir['basedir'] ) . $safe_root;
		$root_url  = trailingslashit( $upload_dir['baseurl'] ) . $safe_root;
		$user_path = trailingslashit( $root_path ) . $user_folder;
		$user_url  = trailingslashit( $root_url ) . $user_folder;

		if ( ! wp_mkdir_p( $user_path ) ) {
			return new WP_Error( 'mkdir_failed', 'امکان ایجاد پوشه اختصاصی کاربر روی هاست وجود ندارد.', array( 'status' => 500 ) );
		}

		$htaccess_body = "<IfModule mod_php7.c>\nphp_flag engine off\n</IfModule>\n<IfModule mod_php8.c>\nphp_flag engine off\n</IfModule>\n<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|cgi|pl|py|jsp|asp|sh)$\">\nOrder Allow,Deny\nDeny from all\n</FilesMatch>\nOptions -Indexes\n";
		$index_body    = "<?php\n// Silence is golden.\n";

		foreach ( array( $root_path, $user_path ) as $dir ) {
			$ht_file = trailingslashit( $dir ) . '.htaccess';
			if ( ! file_exists( $ht_file ) ) {
				@file_put_contents( $ht_file, $htaccess_body );
			}
			$idx_file = trailingslashit( $dir ) . 'index.php';
			if ( ! file_exists( $idx_file ) ) {
				@file_put_contents( $idx_file, $index_body );
			}
		}

		return array(
			'path' => $user_path,
			'url'  => $user_url,
		);
	}

	/**
	 * Inspect a paid WooCommerce order and unlock matching Paid Terms for the customer.
	 */
	public static function grant_access_from_order( $order_id ) {
		if ( ! self::is_woo_active() ) {
			return array();
		}
		$order = wc_get_order( absint( $order_id ) );
		if ( ! $order ) {
			return array();
		}

		$status = $order->get_status();
		if ( ! in_array( $status, array( 'processing', 'completed' ), true ) ) {
			return array();
		}

		$user_id = (int) $order->get_customer_id();
		if ( $user_id <= 0 ) {
			$billing_email = sanitize_email( $order->get_billing_email() );
			if ( ! empty( $billing_email ) ) {
				$wp_user = get_user_by( 'email', $billing_email );
				if ( $wp_user ) {
					$user_id = (int) $wp_user->ID;
				}
			}
		}

		if ( $user_id <= 0 ) {
			return array();
		}

		$product_ids = array();
		foreach ( $order->get_items() as $item ) {
			if ( method_exists( $item, 'get_product_id' ) ) {
				$pid = (int) $item->get_product_id();
				if ( $pid > 0 ) {
					$product_ids[] = $pid;
				}
			}
			if ( method_exists( $item, 'get_variation_id' ) ) {
				$vid = (int) $item->get_variation_id();
				if ( $vid > 0 ) {
					$product_ids[] = $vid;
				}
			}
		}

		global $wpdb;
		$t_terms      = KN_DB::table_terms();
		$terms        = $wpdb->get_results( "SELECT id, woo_product_id FROM {$t_terms} WHERE is_free = 0", ARRAY_A );
		$unlocked     = array();
		$meta_term_id = (int) $order->get_meta( '_kn_term_id', true );

		foreach ( $terms as $term ) {
			$tid = (int) $term['id'];
			$pid = (int) $term['woo_product_id'];
			if ( ( $pid > 0 && in_array( $pid, $product_ids, true ) ) || ( $meta_term_id > 0 && $meta_term_id === $tid ) ) {
				KN_DB::grant_term_entitlement( $user_id, $tid, 'woocommerce', (int) $order->get_id() );
				$unlocked[] = $tid;
			}
		}

		return $unlocked;
	}

	/**
	 * Fetch pending / on-hold Term orders for a user so UI can display "در حال بررسی و تایید توسط مدیر" instead of Buy button.
	 */
	public static function get_pending_term_order_map( $user_id ) {
		$user_id = absint( $user_id );
		if ( $user_id <= 0 || ! self::is_woo_active() ) {
			return array();
		}

		$orders = wc_get_orders(
			array(
				'customer_id' => $user_id,
				'status'      => array( 'on-hold', 'pending' ),
				'limit'       => 30,
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);

		$term_map = self::get_paid_term_product_map();
		$currency = self::get_currency_label();
		$pending  = array();

		foreach ( $orders as $order ) {
			$matched_tids = array();
			$meta_tid     = (int) $order->get_meta( '_kn_term_id', true );
			if ( $meta_tid > 0 ) {
				$matched_tids[] = $meta_tid;
			}
			foreach ( $order->get_items() as $item ) {
				$pid = method_exists( $item, 'get_product_id' ) ? (int) $item->get_product_id() : 0;
				$vid = method_exists( $item, 'get_variation_id' ) ? (int) $item->get_variation_id() : 0;
				if ( $pid > 0 && isset( $term_map[ $pid ] ) ) {
					$matched_tids[] = $term_map[ $pid ];
				}
				if ( $vid > 0 && isset( $term_map[ $vid ] ) ) {
					$matched_tids[] = $term_map[ $vid ];
				}
			}

			$matched_tids = array_unique( array_filter( $matched_tids ) );
			if ( empty( $matched_tids ) ) {
				continue;
			}

			$date_obj = $order->get_date_created();
			$summary  = array(
				'orderId'        => (int) $order->get_id(),
				'orderNumber'    => (string) $order->get_order_number(),
				'orderStatus'    => (string) $order->get_status(),
				'receiptUrl'     => (string) $order->get_meta( '_kn_receipt_url', true ),
				'paymentNote'    => (string) $order->get_meta( '_kn_payment_note', true ),
				'totalFormatted' => number_format( (int) round( (float) $order->get_total() ) ) . ' ' . $currency,
				'dateCreated'    => $date_obj ? $date_obj->date_i18n( 'Y-m-d H:i' ) : '',
			);

			foreach ( $matched_tids as $tid ) {
				if ( ! isset( $pending[ $tid ] ) ) {
					$pending[ $tid ] = $summary;
				}
			}
		}

		return $pending;
	}

	/**
	 * Verify if user has either a completed/processing order (unlock immediately)
	 * OR an on-hold/pending order awaiting admin approval.
	 */
	public static function verify_user_purchase_for_term( $user_id, $term_db_id ) {
		global $wpdb;
		$user_id    = absint( $user_id );
		$term_db_id = absint( $term_db_id );

		$term = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . KN_DB::table_terms() . ' WHERE id = %d',
				$term_db_id
			),
			ARRAY_A
		);

		if ( ! $term ) {
			return new WP_Error( 'term_not_found', 'دوره مورد نظر یافت نشد.', array( 'status' => 404 ) );
		}

		if ( ! empty( $term['is_free'] ) ) {
			return array(
				'unlocked'      => true,
				'pendingReview' => false,
				'source'        => 'free',
				'message'       => 'این دوره رایگان است و از ابتدا فعال می‌باشد.',
			);
		}

		$entitlements = KN_DB::get_user_entitlement_map( $user_id );
		if ( isset( $entitlements[ $term_db_id ] ) ) {
			return array(
				'unlocked'      => true,
				'pendingReview' => false,
				'source'        => $entitlements[ $term_db_id ]['source'],
				'message'       => 'این دوره برای حساب شما فعال شده است!',
			);
		}

		if ( ! self::is_woo_active() ) {
			return array(
				'unlocked'      => false,
				'pendingReview' => false,
				'source'        => null,
				'message'       => 'سیستم پرداخت هنوز در انتظار تایید است یا سفارشی ثبت نشده است.',
			);
		}

		$target_pid = (int) $term['woo_product_id'];
		$user_obj   = get_userdata( $user_id );

		$orders = wc_get_orders(
			array(
				'customer_id' => $user_id,
				'status'      => array( 'completed', 'processing', 'on-hold', 'pending' ),
				'limit'       => 35,
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);

		if ( $user_obj && ! empty( $user_obj->user_email ) ) {
			$email_orders = wc_get_orders(
				array(
					'billing_email' => $user_obj->user_email,
					'status'        => array( 'completed', 'processing', 'on-hold', 'pending' ),
					'limit'         => 20,
					'orderby'       => 'date',
					'order'         => 'DESC',
				)
			);
			$seen = array();
			foreach ( $orders as $o ) {
				$seen[ $o->get_id() ] = $o;
			}
			foreach ( $email_orders as $eo ) {
				if ( (int) $eo->get_customer_id() === 0 || (int) $eo->get_customer_id() === $user_id ) {
					$seen[ $eo->get_id() ] = $eo;
				}
			}
			$orders = array_values( $seen );
		}

		$pending_match = null;

		foreach ( $orders as $order ) {
			$matches      = false;
			$meta_term_id = (int) $order->get_meta( '_kn_term_id', true );
			if ( $meta_term_id > 0 && $meta_term_id === $term_db_id ) {
				$matches = true;
			}
			if ( ! $matches && $target_pid > 0 ) {
				foreach ( $order->get_items() as $item ) {
					$pid = method_exists( $item, 'get_product_id' ) ? (int) $item->get_product_id() : 0;
					$vid = method_exists( $item, 'get_variation_id' ) ? (int) $item->get_variation_id() : 0;
					if ( $pid === $target_pid || $vid === $target_pid ) {
						$matches = true;
						break;
					}
				}
			}

			if ( ! $matches ) {
				continue;
			}

			$status = (string) $order->get_status();
			if ( in_array( $status, array( 'completed', 'processing' ), true ) ) {
				KN_DB::grant_term_entitlement( $user_id, $term_db_id, 'woocommerce', (int) $order->get_id() );
				return array(
					'unlocked'      => true,
					'pendingReview' => false,
					'source'        => 'woocommerce',
					'orderId'       => (int) $order->get_id(),
					'message'       => 'پرداخت شما با موفقیت تایید شد و دوره فوراً فعال گردید!',
				);
			}

			if ( in_array( $status, array( 'on-hold', 'pending' ), true ) && null === $pending_match ) {
				$pending_match = $order;
			}
		}

		if ( $pending_match ) {
			return array(
				'unlocked'      => false,
				'pendingReview' => true,
				'orderStatus'   => (string) $pending_match->get_status(),
				'orderId'       => (int) $pending_match->get_id(),
				'orderNumber'   => (string) $pending_match->get_order_number(),
				'receiptUrl'    => (string) $pending_match->get_meta( '_kn_receipt_url', true ),
				'paymentNote'   => (string) $pending_match->get_meta( '_kn_payment_note', true ),
				'source'        => null,
				'message'       => 'سفارش شما ثبت شده و در حال بررسی و تایید توسط مدیر می‌باشد.',
			);
		}

		return array(
			'unlocked'      => false,
			'pendingReview' => false,
			'source'        => null,
			'message'       => 'سفارش فعالی برای این دوره یافت نشد. لطفاً ابتدا پرداخت را تکمیل کنید.',
		);
	}

	/**
	 * Format a single WooCommerce order cleanly for the frontend Account -> Orders view.
	 */
	public static function format_order_summary( WC_Order $order ) {
		$currency = self::get_currency_label();
		$status   = (string) $order->get_status();

		$status_labels = array(
			'pending'    => 'در انتظار پرداخت / بررسی',
			'on-hold'    => 'در حال بررسی و تایید توسط مدیر',
			'processing' => 'تایید شده (در حال پردازش)',
			'completed'  => 'تکمیل و فعال شده',
			'cancelled'  => 'لغو شده',
			'refunded'   => 'مسترد شده',
			'failed'     => 'ناموفق',
		);

		$term_map = self::get_paid_term_product_map();
		$meta_tid = (int) $order->get_meta( '_kn_term_id', true );
		$items    = array();

		foreach ( $order->get_items() as $item ) {
			$pid      = method_exists( $item, 'get_product_id' ) ? (int) $item->get_product_id() : 0;
			$qty      = method_exists( $item, 'get_quantity' ) ? (int) $item->get_quantity() : 1;
			$line_tot = method_exists( $item, 'get_total' ) ? (int) round( (float) $item->get_total() ) : 0;
			$items[]  = array(
				'productId'      => $pid,
				'name'           => $item->get_name(),
				'qty'            => $qty,
				'totalFormatted' => number_format( $line_tot ) . ' ' . $currency,
				'termDbId'       => ( $pid > 0 && isset( $term_map[ $pid ] ) ) ? $term_map[ $pid ] : ( $meta_tid > 0 ? $meta_tid : 0 ),
			);
		}

		$date_obj = $order->get_date_created();

		return array(
			'id'                 => (int) $order->get_id(),
			'orderNumber'        => (string) $order->get_order_number(),
			'status'             => $status,
			'statusLabel'        => $status_labels[ $status ] ?? $status,
			'pendingReview'      => in_array( $status, array( 'on-hold', 'pending' ), true ),
			'dateCreated'        => $date_obj ? $date_obj->date_i18n( 'Y-m-d H:i' ) : '',
			'totalAmount'        => (int) round( (float) $order->get_total() ),
			'totalFormatted'     => number_format( (int) round( (float) $order->get_total() ) ) . ' ' . $currency,
			'paymentMethod'      => (string) $order->get_payment_method(),
			'paymentMethodTitle' => (string) $order->get_payment_method_title(),
			'items'              => $items,
			'receiptUrl'         => (string) $order->get_meta( '_kn_receipt_url', true ),
			'paymentNote'        => (string) $order->get_meta( '_kn_payment_note', true ),
			'canUploadReceipt'   => in_array( $status, array( 'on-hold', 'pending' ), true ),
		);
	}

	/**
	 * Fetch user's orders for Account -> Orders screen.
	 */
	public static function get_user_orders( $user_id ) {
		if ( ! self::is_woo_active() || absint( $user_id ) <= 0 ) {
			return array();
		}

		$orders = wc_get_orders(
			array(
				'customer_id' => absint( $user_id ),
				'limit'       => 50,
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);

		$list = array();
		foreach ( $orders as $order ) {
			if ( $order instanceof WC_Order ) {
				$list[] = self::format_order_summary( $order );
			}
		}
		return $list;
	}

	/**
	 * Attach or update a compressed receipt image (<= 100 KB) and note on an existing user order.
	 */
	public static function attach_receipt_to_order( WP_User $user, $order_id, $file_array = null, $note = '' ) {
		if ( ! self::is_woo_active() ) {
			return new WP_Error( 'woo_inactive', 'سیستم سفارش فعال نیست.', array( 'status' => 400 ) );
		}

		$order = wc_get_order( absint( $order_id ) );
		if ( ! $order ) {
			return new WP_Error( 'order_not_found', 'سفارش مورد نظر یافت نشد.', array( 'status' => 404 ) );
		}

		if ( (int) $order->get_customer_id() !== (int) $user->ID && ! user_can( $user, 'manage_options' ) ) {
			return new WP_Error( 'forbidden', 'شما مجاز به ویرایش این سفارش نیستید.', array( 'status' => 403 ) );
		}

		$clean_note = sanitize_textarea_field( $note );
		$updated    = false;

		if ( ! empty( $file_array ) && is_array( $file_array ) && ! empty( $file_array['tmp_name'] ) ) {
			$saved = self::save_compressed_user_image( $user, $file_array, 'receipt' );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			$order->update_meta_data( '_kn_receipt_url', $saved['url'] );
			$updated = true;
		}

		if ( $clean_note !== '' ) {
			$order->update_meta_data( '_kn_payment_note', $clean_note );
			$updated = true;
		}

		if ( ! $updated ) {
			return new WP_Error( 'nothing_to_update', 'لطفاً تصویر رسید یا توضیحات واریز را وارد کنید.', array( 'status' => 400 ) );
		}

		$note_msg = 'اطلاعات فیش واریزی توسط کاربر ثبت/به‌روزرسانی شد.';
		if ( $clean_note !== '' ) {
			$note_msg .= ' توضیحات: ' . $clean_note;
		}
		$order->add_order_note( $note_msg );
		$order->save();

		return self::format_order_summary( $order );
	}

	/**
	 * Create an offline Bank Transfer (BACS) WooCommerce order directly from the app with optional <=100KB receipt & note.
	 */
	public static function create_offline_bacs_order( WP_User $user, $items, $note = '', $file_array = null ) {
		if ( ! self::is_woo_active() ) {
			return new WP_Error( 'woo_inactive', 'سیستم ثبت سفارش در سرور فعال نیست.', array( 'status' => 500 ) );
		}
		if ( empty( $items ) || ! is_array( $items ) ) {
			return new WP_Error( 'empty_items', 'هیچ محصول یا دوره‌ای برای سفارش انتخاب نشده است.', array( 'status' => 400 ) );
		}

		// Save uploaded receipt first if present so invalid files fail cleanly before order creation.
		$receipt_url = '';
		if ( ! empty( $file_array ) && is_array( $file_array ) && ! empty( $file_array['tmp_name'] ) ) {
			$saved = self::save_compressed_user_image( $user, $file_array, 'receipt' );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			$receipt_url = $saved['url'];
		}

		$order = wc_create_order(
			array(
				'customer_id' => $user->ID,
			)
		);
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		global $wpdb;
		$matched_term_id = 0;
		$added_count     = 0;

		foreach ( $items as $item ) {
			$pid     = isset( $item['productId'] ) ? absint( $item['productId'] ) : 0;
			$qty     = isset( $item['qty'] ) ? max( 1, absint( $item['qty'] ) ) : 1;
			$term_id = isset( $item['termDbId'] ) ? absint( $item['termDbId'] ) : 0;

			if ( $term_id > 0 && $matched_term_id === 0 ) {
				$matched_term_id = $term_id;
			}

			if ( $term_id > 0 && $pid <= 0 ) {
				$term_row = $wpdb->get_row(
					$wpdb->prepare( 'SELECT * FROM ' . KN_DB::table_terms() . ' WHERE id = %d', $term_id ),
					ARRAY_A
				);
				if ( $term_row && ! empty( $term_row['woo_product_id'] ) ) {
					$pid = absint( $term_row['woo_product_id'] );
				} elseif ( $term_row ) {
					$fee = new WC_Order_Item_Fee();
					$fee->set_name( $term_row['title'] );
					$fee->set_total( (string) absint( $term_row['price_amount'] ) );
					$order->add_item( $fee );
					$added_count++;
					continue;
				}
			}

			if ( $pid > 0 ) {
				$product = wc_get_product( $pid );
				if ( $product ) {
					$order->add_product( $product, $qty );
					$added_count++;
				}
			}
		}

		if ( $added_count === 0 ) {
			$order->delete( true );
			return new WP_Error( 'invalid_items', 'اقلام انتخاب‌شده برای ثبت سفارش معتبر نیستند.', array( 'status' => 400 ) );
		}

		$profile = self::resolve_user_billing_profile( $user );
		$address = array(
			'first_name' => $profile['first_name'],
			'last_name'  => $profile['last_name'],
			'email'      => $profile['email'],
			'phone'      => $profile['phone'],
			'country'    => $profile['country'],
			'state'      => $profile['state'],
			'city'       => $profile['city'],
			'address_1'  => $profile['address_1'],
			'postcode'   => $profile['postcode'],
		);
		$order->set_address( $address, 'billing' );
		$order->set_address( $address, 'shipping' );

		$order->set_payment_method( 'bacs' );
		$order->set_payment_method_title( 'واریز به حساب / کارت به کارت (نیاز به تایید مدیر)' );

		if ( $matched_term_id > 0 ) {
			$order->update_meta_data( '_kn_term_id', $matched_term_id );
		}

		$clean_note = sanitize_textarea_field( $note );
		if ( ! empty( $receipt_url ) ) {
			$order->update_meta_data( '_kn_receipt_url', $receipt_url );
		}
		if ( $clean_note !== '' ) {
			$order->update_meta_data( '_kn_payment_note', $clean_note );
		}

		$order->calculate_totals();
		$order->set_status( 'on-hold', 'سفارش واریز به حساب از اپلیکیشن کودک نابغه ثبت شد و در انتظار بررسی و تایید مدیر است.' );
		if ( $clean_note !== '' ) {
			$order->add_order_note( 'توضیحات خریدار: ' . $clean_note );
		}
		$order->save();

		return array(
			'order'         => self::format_order_summary( $order ),
			'pendingReview' => true,
			'message'       => 'سفارش شما ثبت شد و در حال بررسی و تایید توسط مدیر می‌باشد.',
		);
	}

	/**
	 * Build WooCommerce Storefront catalog filtered by Admin settings (kn_soroban_store_settings).
	 */
	public static function get_store_catalog( $category_id = 0, $search = '' ) {
		$settings = get_option(
			'kn_soroban_store_settings',
			array(
				'enabled'             => 1,
				'banner_title'        => 'فروشگاه کودک نابغه',
				'banner_subtitle'     => 'چرتکه‌های آموزشی، پک‌های تمرین، کتاب کار و ابزارهای هوش ریاضی',
				'selected_categories' => array(),
				'selected_products'   => array(),
				'featured_products'   => array(),
				'show_all_if_empty'   => 1,
			)
		);

		$selected_cats     = array_values( array_filter( array_map( 'absint', (array) ( $settings['selected_categories'] ?? array() ) ) ) );
		$selected_products = array_values( array_filter( array_map( 'absint', (array) ( $settings['selected_products'] ?? array() ) ) ) );
		$featured_products = array_values( array_filter( array_map( 'absint', (array) ( $settings['featured_products'] ?? array() ) ) ) );
		$show_all          = ! empty( $settings['show_all_if_empty'] );
		$enabled           = ! empty( $settings['enabled'] );

		if ( ! $enabled || ! self::is_woo_active() || ! function_exists( 'wc_get_products' ) ) {
			return array(
				'enabled'      => $enabled,
				'settings'     => array(
					'bannerTitle'    => (string) ( $settings['banner_title'] ?? 'فروشگاه کودک نابغه' ),
					'bannerSubtitle' => (string) ( $settings['banner_subtitle'] ?? '' ),
				),
				'categories'   => array(),
				'products'     => array(),
				'bacsAccounts' => self::get_bacs_accounts(),
				'currency'     => self::get_currency_label(),
			);
		}

		$query_args = array(
			'status'  => 'publish',
			'limit'   => 120,
			'orderby' => 'menu_order date',
			'order'   => 'ASC',
		);

		if ( ! empty( $search ) ) {
			$query_args['s'] = sanitize_text_field( $search );
		}

		$products_by_id = array();
		$has_filter     = ! empty( $selected_cats ) || ! empty( $selected_products );

		if ( $has_filter ) {
			if ( ! empty( $selected_cats ) ) {
				$cat_args              = $query_args;
				$cat_args['tax_query'] = array(
					array(
						'taxonomy' => 'product_cat',
						'field'    => 'term_id',
						'terms'    => $selected_cats,
					),
				);
				foreach ( wc_get_products( $cat_args ) as $p ) {
					$products_by_id[ $p->get_id() ] = $p;
				}
			}
			if ( ! empty( $selected_products ) ) {
				$prod_args            = $query_args;
				$prod_args['include'] = $selected_products;
				foreach ( wc_get_products( $prod_args ) as $p ) {
					$products_by_id[ $p->get_id() ] = $p;
				}
			}
		} elseif ( $show_all ) {
			foreach ( wc_get_products( $query_args ) as $p ) {
				$products_by_id[ $p->get_id() ] = $p;
			}
		}

		$categories_map = array();
		$catalog        = array();
		$cat_filter     = absint( $category_id );

		foreach ( $products_by_id as $p ) {
			if ( ! $p || ! is_object( $p ) ) {
				continue;
			}
			$pid     = (int) $p->get_id();
			$terms   = wp_get_post_terms( $pid, 'product_cat' );
			$p_cats  = array();
			$in_cat  = ( $cat_filter === 0 );

			if ( is_array( $terms ) ) {
				foreach ( $terms as $t ) {
					if ( $t->slug === 'uncategorized' ) {
						continue;
					}
					$tid      = (int) $t->term_id;
					$p_cats[] = array(
						'id'   => $tid,
						'name' => $t->name,
						'slug' => $t->slug,
					);
					if ( ! isset( $categories_map[ $tid ] ) ) {
						$categories_map[ $tid ] = array(
							'id'   => $tid,
							'name' => $t->name,
							'slug' => $t->slug,
						);
					}
					if ( $cat_filter > 0 && $tid === $cat_filter ) {
						$in_cat = true;
					}
				}
			}

			if ( ! $in_cat ) {
				continue;
			}

			$pricing  = self::extract_product_pricing( $p, 0 );
			$image_id = $p->get_image_id();
			$img_url  = $image_id ? wp_get_attachment_image_url( $image_id, 'medium_large' ) : '';
			$short    = wp_strip_all_tags( html_entity_decode( (string) $p->get_short_description(), ENT_QUOTES, 'UTF-8' ) );
			$desc     = wp_strip_all_tags( html_entity_decode( (string) $p->get_description(), ENT_QUOTES, 'UTF-8' ) );

			$catalog[] = array(
				'id'                    => $pid,
				'name'                  => $p->get_name(),
				'slug'                  => $p->get_slug(),
				'shortDescription'      => trim( $short ),
				'description'           => trim( $desc ),
				'imageUrl'              => $img_url ? esc_url_raw( $img_url ) : '',
				'priceAmount'           => $pricing['priceAmount'],
				'priceFormatted'        => $pricing['priceFormatted'],
				'regularPriceAmount'    => $pricing['regularPriceAmount'],
				'regularPriceFormatted' => $pricing['regularPriceFormatted'],
				'salePriceAmount'       => $pricing['salePriceAmount'],
				'salePriceFormatted'    => $pricing['salePriceFormatted'],
				'onSale'                => $pricing['onSale'],
				'discountPercent'       => $pricing['discountPercent'],
				'saleEndTimestamp'      => $pricing['saleEndTimestamp'],
				'inStock'               => $p->is_in_stock(),
				'stockStatus'           => (string) $p->get_stock_status(),
				'categories'            => $p_cats,
				'featured'              => in_array( $pid, $featured_products, true ),
			);
		}

		// Sort featured items first while keeping order clean
		usort(
			$catalog,
			function ( $a, $b ) {
				if ( $a['featured'] !== $b['featured'] ) {
					return $a['featured'] ? -1 : 1;
				}
				return $a['id'] <=> $b['id'];
			}
		);

		return array(
			'enabled'      => true,
			'settings'     => array(
				'bannerTitle'    => (string) ( $settings['banner_title'] ?? 'فروشگاه کودک نابغه' ),
				'bannerSubtitle' => (string) ( $settings['banner_subtitle'] ?? 'چرتکه‌های آموزشی، پک‌های تمرین و ابزارهای هوش ریاضی' ),
			),
			'categories'   => array_values( $categories_map ),
			'products'     => $catalog,
			'bacsAccounts' => self::get_bacs_accounts(),
			'currency'     => self::get_currency_label(),
		);
	}

	/**
	 * Issue a single-use SSO checkout redirect URL for one or more Store products.
	 */
	public static function create_store_sso_checkout_url( $user_id, $items ) {
		if ( ! self::is_woo_active() ) {
			return new WP_Error( 'woo_inactive', 'درگاه پرداخت در دسترس نیست.', array( 'status' => 400 ) );
		}
		$clean = array();
		foreach ( (array) $items as $it ) {
			$pid = isset( $it['productId'] ) ? absint( $it['productId'] ) : 0;
			$qty = isset( $it['qty'] ) ? max( 1, min( 50, absint( $it['qty'] ) ) ) : 1;
			if ( $pid > 0 ) {
				$clean[] = array(
					'productId' => $pid,
					'qty'       => $qty,
				);
			}
		}
		if ( empty( $clean ) ) {
			return new WP_Error( 'empty_cart', 'سبد خرید خالی است.', array( 'status' => 400 ) );
		}

		$token = KN_Auth::issue_checkout_handoff( $user_id, 0, $clean );
		$url   = add_query_arg(
			array(
				'kn_checkout_sso' => $token,
			),
			home_url( '/' )
		);

		return array(
			'checkoutUrl' => $url,
		);
	}

	/**
	 * List on-hold / pending WooCommerce orders for Admin Bank Transfer & Receipt Approval page.
	 */
	public static function get_pending_bacs_orders_admin() {
		if ( ! self::is_woo_active() ) {
			return array();
		}
		$orders = wc_get_orders(
			array(
				'status'  => array( 'on-hold', 'pending' ),
				'limit'   => 60,
				'orderby' => 'date',
				'order'   => 'DESC',
			)
		);

		$rows = array();
		foreach ( $orders as $order ) {
			if ( ! ( $order instanceof WC_Order ) ) {
				continue;
			}
			$summary                  = self::format_order_summary( $order );
			$summary['customerName']  = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
			$summary['customerPhone'] = (string) $order->get_billing_phone();
			$summary['customerEmail'] = (string) $order->get_billing_email();
			$rows[]                   = $summary;
		}
		return $rows;
	}
}
