<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WooCommerce Integration for Paid Terms, Seamless SSO Checkout, Express Form-Free Checkout
 * (Classic Shortcode + WooCommerce Checkout Block), and Automated Entitlement Unlocking.
 */
class KN_Woo {

	/**
	 * Cached map of [ woo_product_id => term_db_id ] for the current request.
	 *
	 * @var array<int, int>|null
	 */
	private static $term_product_map = null;

	/**
	 * Guard against duplicate banner rendering when both block & classic hooks fire.
	 *
	 * @var bool
	 */
	private static $banner_rendered = false;

	public static function init() {
		// Handle one-time SSO login handoff before any output is sent.
		add_action( 'init', array( __CLASS__, 'handle_sso_checkout_redirect' ), 5 );

		if ( ! self::is_woo_active() ) {
			return;
		}

		// Grant term access automatically when WooCommerce order is paid / processing / completed.
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'grant_access_from_order' ), 10, 1 );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'grant_access_from_order' ), 10, 1 );
		add_action( 'woocommerce_payment_complete', array( __CLASS__, 'grant_access_from_order' ), 10, 1 );

		// Hydrate WC()->customer before Checkout Block or Classic Checkout renders.
		add_action( 'template_redirect', array( __CLASS__, 'sync_express_customer_on_checkout' ), 15 );

		// Express Checkout (no re-login, no manual billing/shipping form) strictly for Term purchases.
		add_filter( 'woocommerce_product_needs_shipping', array( __CLASS__, 'filter_product_needs_shipping' ), 999, 2 );
		add_filter( 'woocommerce_cart_needs_shipping', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_cart_needs_shipping_address', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_checkout_registration_enabled', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_checkout_registration_required', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );
		add_filter( 'woocommerce_enable_order_notes_field', array( __CLASS__, 'filter_false_for_term_checkout' ), 999 );

		add_filter( 'woocommerce_checkout_fields', array( __CLASS__, 'simplify_term_checkout_fields' ), 99999 );
		add_filter( 'woocommerce_billing_fields', array( __CLASS__, 'simplify_term_billing_fields' ), 99999 );
		add_filter( 'woocommerce_default_address_fields', array( __CLASS__, 'simplify_term_default_address_fields' ), 99999 );
		add_filter( 'woocommerce_get_country_locale', array( __CLASS__, 'simplify_term_country_locale' ), 99999 );
		add_filter( 'woocommerce_checkout_get_value', array( __CLASS__, 'prefill_term_checkout_value' ), 999, 2 );

		// UI Banner, Express Styles & Block Store Sync for both Classic and Block Checkouts.
		add_action( 'woocommerce_before_checkout_form', array( __CLASS__, 'render_express_checkout_banner' ), 5 );
		add_filter( 'render_block', array( __CLASS__, 'prepend_express_banner_to_checkout_block' ), 10, 2 );
		add_action( 'wp_head', array( __CLASS__, 'render_express_checkout_styles' ), 99 );
		add_action( 'wp_footer', array( __CLASS__, 'render_checkout_block_express_script' ), 99 );

		// Bind authenticated customer + account billing info + _kn_term_id on Classic and Block checkouts.
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'prepare_order_customer_and_meta' ), 10, 2 );
		add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'attach_term_meta_on_checkout' ), 10, 1 );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( __CLASS__, 'prepare_store_api_order_meta' ), 10, 2 );
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
	 * Fetch WooCommerce product list for the WP Admin Term editor dropdown.
	 */
	public static function get_admin_products_list() {
		if ( ! self::is_woo_active() || ! function_exists( 'wc_get_products' ) ) {
			return array();
		}

		$products = wc_get_products(
			array(
				'limit'   => 100,
				'status'  => 'publish',
				'orderby' => 'title',
				'order'   => 'ASC',
			)
		);

		$list = array();
		foreach ( $products as $p ) {
			$list[] = array(
				'id'    => $p->get_id(),
				'name'  => $p->get_name(),
				'price' => $p->get_price(),
			);
		}
		return $list;
	}

	/**
	 * Compute live price and WooCommerce checkout URL for a Term row.
	 * Only issues a one-time SSO handoff URL when explicitly requested from an authenticated
	 * checkout endpoint ($issue_sso = true).
	 */
	public static function get_term_commerce_meta( $term_row, $user_id = 0, $issue_sso = false ) {
		$price_amount = isset( $term_row['price_amount'] ) ? (int) $term_row['price_amount'] : 0;
		$product_id   = isset( $term_row['woo_product_id'] ) ? absint( $term_row['woo_product_id'] ) : 0;
		$override_url = isset( $term_row['checkout_url_override'] ) ? trim( (string) $term_row['checkout_url_override'] ) : '';
		$currency     = self::get_currency_label();
		$checkout_url = '';

		if ( self::is_woo_active() && $product_id > 0 ) {
			$product = wc_get_product( $product_id );
			if ( $product ) {
				$raw_price = $product->get_price();
				if ( $raw_price !== '' && is_numeric( $raw_price ) ) {
					$price_amount = (int) round( (float) $raw_price );
				}

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

		$has_valid_override = false;
		if ( ! empty( $override_url ) ) {
			$parsed = wp_parse_url( $override_url );
			if ( is_array( $parsed ) && isset( $parsed['scheme'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ) {
				$checkout_url       = esc_url_raw( $override_url );
				$has_valid_override = true;
			}
		}

		// When invoked from authenticated checkout initiation, wrap with single-use WordPress SSO handoff.
		if ( $issue_sso && $user_id > 0 && ! empty( $checkout_url ) ) {
			$allow_sso = true;
			if ( $has_valid_override ) {
				$home_host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
				$dest_host = wp_parse_url( $checkout_url, PHP_URL_HOST );
				// Never send SSO handoff token to an external domain.
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

		$formatted = $price_amount > 0
			? number_format( $price_amount ) . ' ' . $currency
			: 'تماس / رایگان';

		return array(
			'priceAmount'    => $price_amount,
			'priceFormatted' => $formatted,
			'checkoutUrl'    => $checkout_url,
		);
	}

	/**
	 * Handle single-use SSO checkout handoff:
	 * 1. Validate & burn one-time transient token.
	 * 2. Log the WordPress user into the browser session cleanly (auth cookie).
	 * 3. Pre-populate complete WooCommerce customer profile and load the Term product into cart.
	 * 4. Redirect to WooCommerce checkout with clean URL (token stripped).
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

		// Authenticate browser session seamlessly as this WordPress user.
		wp_clear_auth_cookie();
		wp_set_current_user( $user->ID, $user->user_login );
		wp_set_auth_cookie( $user->ID, true, is_ssl() );
		do_action( 'wp_login', $user->user_login, $user );

		$term_id = ! empty( $handoff['term_id'] ) ? absint( $handoff['term_id'] ) : 0;
		if ( $term_id <= 0 && isset( $_GET['kn_term'] ) ) {
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

			if ( WC()->session && $term_id > 0 ) {
				WC()->session->set( 'kn_active_term_id', $term_id );
			}

			$product_id = $term && ! empty( $term['woo_product_id'] ) ? absint( $term['woo_product_id'] ) : 0;
			if ( $product_id > 0 && WC()->cart ) {
				WC()->cart->empty_cart();
				WC()->cart->add_to_cart( $product_id, 1 );
				WC()->cart->calculate_totals();
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
	 * Ensure WC()->customer has valid complete billing & shipping fields on Checkout page load
	 * so WooCommerce Checkout Block never fails hidden client-side validation.
	 */
	public static function sync_express_customer_on_checkout() {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}
		if ( ! self::is_term_checkout_context() || ! is_user_logged_in() ) {
			return;
		}

		nocache_headers();
		$user = wp_get_current_user();
		if ( $user && $user->exists() ) {
			self::hydrate_wc_customer_for_user( $user, true );
			if ( function_exists( 'WC' ) && WC() && WC()->cart ) {
				WC()->cart->calculate_totals();
			}
		}
	}

	/**
	 * Populate missing WC()->customer fields from the WordPress account + safe store defaults.
	 */
	private static function hydrate_wc_customer_for_user( WP_User $user, $save = true ) {
		if ( ! function_exists( 'WC' ) || ! WC() || ! WC()->customer ) {
			return;
		}

		$profile  = self::resolve_user_billing_profile( $user );
		$customer = WC()->customer;

		if ( '' === trim( (string) $customer->get_billing_first_name() ) ) {
			$customer->set_billing_first_name( $profile['first_name'] );
		}
		if ( '' === trim( (string) $customer->get_billing_last_name() ) ) {
			$customer->set_billing_last_name( $profile['last_name'] );
		}
		if ( '' === trim( (string) $customer->get_billing_email() ) && ! empty( $profile['email'] ) ) {
			$customer->set_billing_email( $profile['email'] );
		}
		if ( '' === trim( (string) $customer->get_billing_phone() ) && ! empty( $profile['phone'] ) ) {
			$customer->set_billing_phone( $profile['phone'] );
		}
		if ( '' === trim( (string) $customer->get_billing_country() ) && ! empty( $profile['country'] ) ) {
			$customer->set_billing_country( $profile['country'] );
		}
		if ( '' === trim( (string) $customer->get_billing_state() ) && ! empty( $profile['state'] ) ) {
			$customer->set_billing_state( $profile['state'] );
		}
		if ( '' === trim( (string) $customer->get_billing_city() ) && ! empty( $profile['city'] ) ) {
			$customer->set_billing_city( $profile['city'] );
		}
		if ( '' === trim( (string) $customer->get_billing_address_1() ) && ! empty( $profile['address_1'] ) ) {
			$customer->set_billing_address_1( $profile['address_1'] );
		}
		if ( '' === trim( (string) $customer->get_billing_postcode() ) && ! empty( $profile['postcode'] ) ) {
			$customer->set_billing_postcode( $profile['postcode'] );
		}

		// Mirror key shipping properties too in case a Block theme reads shipping defaults.
		if ( '' === trim( (string) $customer->get_shipping_first_name() ) ) {
			$customer->set_shipping_first_name( $profile['first_name'] );
		}
		if ( '' === trim( (string) $customer->get_shipping_last_name() ) ) {
			$customer->set_shipping_last_name( $profile['last_name'] );
		}
		if ( '' === trim( (string) $customer->get_shipping_country() ) && ! empty( $profile['country'] ) ) {
			$customer->set_shipping_country( $profile['country'] );
		}
		if ( '' === trim( (string) $customer->get_shipping_state() ) && ! empty( $profile['state'] ) ) {
			$customer->set_shipping_state( $profile['state'] );
		}
		if ( '' === trim( (string) $customer->get_shipping_city() ) && ! empty( $profile['city'] ) ) {
			$customer->set_shipping_city( $profile['city'] );
		}
		if ( '' === trim( (string) $customer->get_shipping_address_1() ) && ! empty( $profile['address_1'] ) ) {
			$customer->set_shipping_address_1( $profile['address_1'] );
		}
		if ( '' === trim( (string) $customer->get_shipping_postcode() ) && ! empty( $profile['postcode'] ) ) {
			$customer->set_shipping_postcode( $profile['postcode'] );
		}

		if ( $save ) {
			$customer->save();
		}
	}

	/**
	 * Build reliable fallback billing details strictly from the authenticated WordPress user
	 * and WooCommerce store base settings.
	 */
	private static function resolve_user_billing_profile( WP_User $user ) {
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

		$phone = sanitize_text_field( (string) get_user_meta( $user->ID, 'billing_phone', true ) );
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
			$address_1 = 'دسترسی دیجیتال ترم آموزشی کودک نابغه';
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

	/**
	 * Determine active Term DB ID if the current cart / checkout session is for a Term.
	 */
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

	/**
	 * True only when the user is checking out a Term AND is logged into WordPress.
	 */
	public static function is_term_checkout_context() {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return false;
		}
		if ( ! is_user_logged_in() ) {
			return false;
		}
		return self::get_active_checkout_term_id() > 0;
	}

	/**
	 * Term WooCommerce products are digital course unlocks and never need physical shipping.
	 */
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

	/**
	 * Remove all unnecessary billing, shipping, and order note fields for logged-in Term checkouts.
	 */
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

	/**
	 * Ensure standalone billing field filter (used by some themes/plugins & Persian WooCommerce)
	 * does not enforce required address/city/state/phone fields during Term checkouts.
	 */
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

	/**
	 * Ensure Store API / Block Checkout doesn't block digital Term checkout on address fields.
	 */
	public static function simplify_term_default_address_fields( $fields ) {
		if ( ! self::is_term_checkout_context() || ! is_array( $fields ) ) {
			return $fields;
		}

		foreach ( $fields as $key => $cfg ) {
			$fields[ $key ]['required'] = false;
		}

		return $fields;
	}

	/**
	 * Relax country-specific locale requirements (e.g. state/city/postcode forced by Persian WooCommerce)
	 * on Term express checkouts.
	 */
	public static function simplify_term_country_locale( $locales ) {
		if ( ! self::is_term_checkout_context() || ! is_array( $locales ) ) {
			return $locales;
		}

		$optional_keys = array( 'address_1', 'address_2', 'city', 'state', 'postcode', 'company' );
		foreach ( $locales as $country_code => $rules ) {
			if ( ! is_array( $rules ) ) {
				continue;
			}
			foreach ( $optional_keys as $key ) {
				if ( isset( $locales[ $country_code ][ $key ] ) && is_array( $locales[ $country_code ][ $key ] ) ) {
					$locales[ $country_code ][ $key ]['required'] = false;
				} else {
					$locales[ $country_code ][ $key ] = array( 'required' => false );
				}
			}
		}

		return $locales;
	}

	/**
	 * Automatically fill billing fields from the logged-in WordPress user.
	 */
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

	/**
	 * Build shared connected-account banner + error surface HTML for Classic & Block checkouts.
	 */
	private static function get_express_checkout_banner_html() {
		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			return '';
		}

		$profile = self::resolve_user_billing_profile( $user );
		$term_id = self::get_active_checkout_term_id();

		ob_start();
		?>
		<div class="kn-express-banner" style="direction:rtl;text-align:right;margin:0 0 20px;padding:16px 18px;border-radius:16px;background:linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%);border:2px solid #A7F3D0;color:#064E3B;font-family:inherit;">
			<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
				<div style="font-weight:800;font-size:15px;">
					حساب کاربری شما به صورت خودکار متصل شد
				</div>
				<button type="button" id="kn-toggle-express-fields" style="background:#FFFFFF;border:1px solid #93C5FD;color:#1D4ED8;border-radius:10px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;">
					نمایش / ویرایش مشخصات حساب
				</button>
			</div>
			<div style="font-size:13px;line-height:1.8;color:#0F172A;">
				سفارش مستقیم به نام
				<strong><?php echo esc_html( $user->display_name ? $user->display_name : $profile['first_name'] ); ?></strong>
				<?php if ( ! empty( $profile['email'] ) ) : ?>
					(<span><?php echo esc_html( $profile['email'] ); ?></span>)
				<?php endif; ?>
				ثبت می‌شود و نیازی به ورود مجدد یا پر کردن فرم آدرس نیست. فقط روش پرداخت را انتخاب و دکمه پرداخت را بزنید.
			</div>
			<div id="kn-express-error-box" style="display:none;margin-top:12px;padding:12px 14px;border-radius:12px;background:#FEF2F2;border:2px solid #FCA5A5;color:#991B1B;font-size:13px;font-weight:700;line-height:1.7;"></div>
		</div>
		<?php if ( $term_id > 0 ) : ?>
			<input type="hidden" name="kn_term" value="<?php echo esc_attr( $term_id ); ?>" />
		<?php endif; ?>
		<?php
		return ob_get_clean();
	}

	/**
	 * Render banner for Classic Shortcode Checkout ([woocommerce_checkout]).
	 */
	public static function render_express_checkout_banner() {
		if ( self::$banner_rendered || ! self::is_term_checkout_context() ) {
			return;
		}
		self::$banner_rendered = true;
		echo self::get_express_checkout_banner_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Prepend banner above WooCommerce Checkout Block (wp:woocommerce/checkout).
	 */
	public static function prepend_express_banner_to_checkout_block( $block_content, $block ) {
		if ( self::$banner_rendered || ! is_array( $block ) || ( $block['blockName'] ?? '' ) !== 'woocommerce/checkout' ) {
			return $block_content;
		}
		if ( ! self::is_term_checkout_context() ) {
			return $block_content;
		}
		self::$banner_rendered = true;
		return self::get_express_checkout_banner_html() . $block_content;
	}

	/**
	 * Hide redundant address boxes visually on Term express checkout WITHOUT ever hiding
	 * WooCommerce validation error messages.
	 */
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
			body:not(.kn-show-express-fields) .woocommerce-checkout .woocommerce-billing-fields:not(:has(.woocommerce-invalid)):not(:has(.woocommerce-error)),
			body:not(.kn-show-express-fields) .woocommerce-checkout .wc-block-checkout__contact-fields:not(:has(.wc-block-components-validation-error)):not(:has(.has-error)):not(:has([aria-invalid="true"])),
			body:not(.kn-show-express-fields) .woocommerce-checkout .wc-block-checkout__billing-fields:not(:has(.wc-block-components-validation-error)):not(:has(.has-error)):not(:has([aria-invalid="true"])) {
				display: none !important;
			}
		</style>
		<?php
	}

	/**
	 * Sync WooCommerce Checkout Block Redux store (wc/store/cart) with WP account defaults
	 * and surface any validation/gateway errors inside #kn-express-error-box so Place Order
	 * never fails silently.
	 */
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
		$profile = self::resolve_user_billing_profile( $user );
		$payload = array(
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
		?>
		<script id="kn-express-checkout-js">
		(function() {
			var defaults = <?php echo wp_json_encode( $payload ); ?>;
			var syncedOnce = false;

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

			function collectBlockValidationErrors() {
				var msgs = [];
				if (window.wp && window.wp.data && window.wp.data.select) {
					var valSel = window.wp.data.select('wc/store/validation');
					if (valSel && typeof valSel.getValidationErrors === 'function') {
						var errs = valSel.getValidationErrors() || {};
						Object.keys(errs).forEach(function(k) {
							if (errs[k] && errs[k].message) {
								msgs.push(String(errs[k].message));
							}
						});
					}
					var noticeSel = window.wp.data.select('core/notices');
					if (noticeSel && typeof noticeSel.getNotices === 'function') {
						['wc/checkout', 'wc/checkout/payments', 'wc/checkout/billing-address', 'wc/checkout/contact-information', 'default'].forEach(function(ctx) {
							var list = noticeSel.getNotices(ctx) || [];
							list.forEach(function(n) {
								if (n && n.status === 'error' && n.content) {
									msgs.push(String(n.content).replace(/<[^>]*>/g, ''));
								}
							});
						});
					}
				}
				document.querySelectorAll('.wc-block-components-validation-error p, .wc-block-components-notice-banner.is-error .wc-block-components-notice-banner__content, .woocommerce-error li').forEach(function(el) {
					var txt = (el.textContent || '').trim();
					if (txt && msgs.indexOf(txt) === -1) {
						msgs.push(txt);
					}
				});
				return msgs;
			}

			function syncWooBlockStore() {
				if (!window.wp || !window.wp.data || !window.wp.data.select || !window.wp.data.dispatch) {
					return false;
				}
				var cartSel = window.wp.data.select('wc/store/cart');
				var cartDisp = window.wp.data.dispatch('wc/store/cart');
				if (!cartSel || !cartDisp || typeof cartSel.getCustomerData !== 'function' || typeof cartDisp.setBillingAddress !== 'function') {
					return false;
				}

				var customer = cartSel.getCustomerData() || {};
				var billing = customer.billingAddress || {};
				var patch = {};
				Object.keys(defaults).forEach(function(key) {
					var cur = billing[key];
					if (typeof cur !== 'string' || cur.trim() === '') {
						if (defaults[key]) {
							patch[key] = defaults[key];
						}
					}
				});

				if (Object.keys(patch).length > 0 && !syncedOnce) {
					syncedOnce = true;
					cartDisp.setBillingAddress(patch);
					var valDisp = window.wp.data.dispatch('wc/store/validation');
					if (valDisp && typeof valDisp.clearAllValidationErrors === 'function') {
						setTimeout(function() { valDisp.clearAllValidationErrors(); }, 250);
					}
				}
				return true;
			}

			document.addEventListener('DOMContentLoaded', function() {
				var toggleBtn = document.getElementById('kn-toggle-express-fields');
				if (toggleBtn) {
					toggleBtn.addEventListener('click', function() {
						document.body.classList.toggle('kn-show-express-fields');
					});
				}

				var attempts = 0;
				var timer = setInterval(function() {
					attempts++;
					if (syncWooBlockStore() || attempts > 20) {
						clearInterval(timer);
					}
				}, 250);
			});

			document.addEventListener('click', function(ev) {
				var target = ev.target;
				if (!target || !target.closest) return;
				var btn = target.closest('.wc-block-components-checkout-place-order-button');
				if (!btn) return;

				var checkErrors = function() {
					var errs = collectBlockValidationErrors();
					if (errs.length > 0) {
						document.body.classList.add('kn-show-express-fields');
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
	 * Classic Checkout: guarantee customer ID, fallback account billing info, and _kn_term_id.
	 */
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
				if ( '' === trim( (string) $order->get_billing_first_name() ) ) {
					$order->set_billing_first_name( $profile['first_name'] );
				}
				if ( '' === trim( (string) $order->get_billing_last_name() ) ) {
					$order->set_billing_last_name( $profile['last_name'] );
				}
				if ( '' === trim( (string) $order->get_billing_email() ) && ! empty( $profile['email'] ) ) {
					$order->set_billing_email( $profile['email'] );
				}
				if ( '' === trim( (string) $order->get_billing_phone() ) && ! empty( $profile['phone'] ) ) {
					$order->set_billing_phone( $profile['phone'] );
				}
				if ( '' === trim( (string) $order->get_billing_country() ) && ! empty( $profile['country'] ) ) {
					$order->set_billing_country( $profile['country'] );
				}
				if ( '' === trim( (string) $order->get_billing_state() ) && ! empty( $profile['state'] ) ) {
					$order->set_billing_state( $profile['state'] );
				}
				if ( '' === trim( (string) $order->get_billing_city() ) && ! empty( $profile['city'] ) ) {
					$order->set_billing_city( $profile['city'] );
				}
				if ( '' === trim( (string) $order->get_billing_address_1() ) && ! empty( $profile['address_1'] ) ) {
					$order->set_billing_address_1( $profile['address_1'] );
				}
				if ( '' === trim( (string) $order->get_billing_postcode() ) && ! empty( $profile['postcode'] ) ) {
					$order->set_billing_postcode( $profile['postcode'] );
				}
			}
		}

		$term_id = self::get_active_checkout_term_id();
		if ( $term_id > 0 ) {
			$order->update_meta_data( '_kn_term_id', $term_id );
		}
	}

	/**
	 * Store API / WooCommerce Block Checkout: attach customer billing details and _kn_term_id.
	 */
	public static function prepare_store_api_order_meta( $order, $request ) {
		self::prepare_order_customer_and_meta( $order, array() );
		if ( $order && is_object( $order ) ) {
			$order->save();
		}
	}

	/**
	 * Store kn_term meta on WooCommerce order when created via direct checkout link.
	 */
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
		$t_terms  = KN_DB::table_terms();
		$terms    = $wpdb->get_results( "SELECT id, woo_product_id FROM {$t_terms} WHERE is_free = 0", ARRAY_A );
		$unlocked = array();

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
	 * Verify on-demand if an authenticated WordPress user has a paid WooCommerce order for a Term.
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
			return new WP_Error( 'term_not_found', 'ترم مورد نظر یافت نشد.', array( 'status' => 404 ) );
		}

		if ( ! empty( $term['is_free'] ) ) {
			return array(
				'unlocked' => true,
				'source'   => 'free',
				'message'  => 'این ترم رایگان است و از ابتدا فعال می‌باشد.',
			);
		}

		// Already unlocked via DB entitlement?
		$entitlements = KN_DB::get_user_entitlement_map( $user_id );
		if ( isset( $entitlements[ $term_db_id ] ) ) {
			return array(
				'unlocked' => true,
				'source'   => $entitlements[ $term_db_id ]['source'],
				'message'  => 'این ترم قبلاً برای حساب شما فعال شده است!',
			);
		}

		if ( ! self::is_woo_active() ) {
			return array(
				'unlocked' => false,
				'source'   => null,
				'message'  => 'افزونه ووکامرس روی سایت وردپرس فعال نیست یا هنوز سفارشی ثبت نشده است.',
			);
		}

		$target_pid = (int) $term['woo_product_id'];
		if ( $target_pid <= 0 ) {
			return array(
				'unlocked' => false,
				'source'   => null,
				'message'  => 'هنوز محصول ووکامرس برای این ترم در پیشخوان وردپرس متصل نشده است.',
			);
		}

		// Query paid WooCommerce orders strictly owned by this authenticated user (or verified account email)
		$user_obj = get_userdata( $user_id );
		$orders   = wc_get_orders(
			array(
				'customer_id' => $user_id,
				'status'      => array( 'completed', 'processing' ),
				'limit'       => 30,
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);

		if ( $user_obj && ! empty( $user_obj->user_email ) ) {
			$email_orders = wc_get_orders(
				array(
					'billing_email' => $user_obj->user_email,
					'status'        => array( 'completed', 'processing' ),
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
				// Only accept guest orders (customer_id == 0) or orders belonging to same user_id
				if ( (int) $eo->get_customer_id() === 0 || (int) $eo->get_customer_id() === $user_id ) {
					$seen[ $eo->get_id() ] = $eo;
				}
			}
			$orders = array_values( $seen );
		}

		foreach ( $orders as $order ) {
			$meta_term_id = (int) $order->get_meta( '_kn_term_id', true );
			if ( $meta_term_id > 0 && $meta_term_id === $term_db_id ) {
				KN_DB::grant_term_entitlement( $user_id, $term_db_id, 'woocommerce', (int) $order->get_id() );
				return array(
					'unlocked' => true,
					'source'   => 'woocommerce',
					'orderId'  => (int) $order->get_id(),
					'message'  => 'پرداخت شما در ووکامرس تایید شد و ترم با موفقیت فعال گردید!',
				);
			}
			foreach ( $order->get_items() as $item ) {
				$pid = method_exists( $item, 'get_product_id' ) ? (int) $item->get_product_id() : 0;
				$vid = method_exists( $item, 'get_variation_id' ) ? (int) $item->get_variation_id() : 0;
				if ( $pid === $target_pid || $vid === $target_pid ) {
					KN_DB::grant_term_entitlement( $user_id, $term_db_id, 'woocommerce', (int) $order->get_id() );
					return array(
						'unlocked' => true,
						'source'   => 'woocommerce',
						'orderId'  => (int) $order->get_id(),
						'message'  => 'پرداخت شما در ووکامرس تایید شد و ترم با موفقیت فعال گردید!',
					);
				}
			}
		}

		return array(
			'unlocked' => false,
			'source'   => null,
			'message'  => 'سفارش تکمیل‌شده یا در حال انجامی برای این ترم یافت نشد. لطفاً ابتدا پرداخت را در ووکامرس تکمیل کنید.',
		);
	}
}
