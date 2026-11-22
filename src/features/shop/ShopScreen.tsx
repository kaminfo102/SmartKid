import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  BacsAccount,
  DigitDisplayMode,
  StoreCatalogResponse,
  StoreProduct,
  UserOrder,
  WordPressUser,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import {
  fetchStoreCatalog,
  startStoreCheckout,
  submitOfflineOrder,
  validateSafeHttpUrl,
} from '../../lib/wordpressApi';
import type { OptimizedImageResult } from '../../lib/imageOptimizer';
import { ReceiptUploaderField } from '../../components/ReceiptUploaderField';
import { SaleCountdown } from '../../components/SaleCountdown';
import { audioEngine } from '../../lib/audioEngine';

interface ShopScreenProps {
  wpUrl: string;
  wpUser: WordPressUser | null;
  digitMode: DigitDisplayMode;
  bacsAccounts?: BacsAccount[];
  onOpenAuth: () => void;
  onOrderCreated?: () => void;
  onBack: () => void;
}

interface CartItem {
  product: StoreProduct;
  qty: number;
}

const ProductImageFrame: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#FFF1DC] to-[#FFE2BC] dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <ShoppingBag className="w-10 h-10 text-[#E07C47]" />
        <span className="text-xs font-extrabold text-[#783F1D] dark:text-slate-300 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({
  wpUrl,
  wpUser,
  digitMode,
  bacsAccounts = [],
  onOpenAuth,
  onOrderCreated,
  onBack,
}) => {
  const [catalog, setCatalog] = useState<StoreCatalogResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<StoreProduct | null>(null);

  const [checkoutTab, setCheckoutTab] = useState<'online' | 'bacs'>('online');
  const [submitting, setSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState<OptimizedImageResult | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [createdPendingOrder, setCreatedPendingOrder] = useState<UserOrder | null>(null);
  const [onlineRedirectNotice, setOnlineRedirectNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const loadCatalog = useCallback(async () => {
    if (!wpUrl) {
      setLoading(false);
      setErrorMsg('فروشگاه در حال آماده‌سازی است.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchStoreCatalog(wpUrl, selectedCategoryId, debouncedSearch);
      setCatalog(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در بارگذاری محصولات فروشگاه.');
    } finally {
      setLoading(false);
    }
  }, [wpUrl, selectedCategoryId, debouncedSearch]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const activeBacsAccounts = useMemo(() => {
    if (catalog?.bacsAccounts && catalog.bacsAccounts.length > 0) {
      return catalog.bacsAccounts;
    }
    return bacsAccounts;
  }, [catalog?.bacsAccounts, bacsAccounts]);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.priceAmount * item.qty, 0),
    [cart]
  );

  const addToCart = (product: StoreProduct) => {
    audioEngine.play('uiTap');
    setCreatedPendingOrder(null);
    setOnlineRedirectNotice(null);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        return prev.map((item, k) =>
          k === idx ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const getProductQtyInCart = (productId: number) => {
    return cart.find((c) => c.product.id === productId)?.qty ?? 0;
  };

  const handleOnlineCheckout = async () => {
    if (!wpUrl || !wpUser || cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await startStoreCheckout(
        wpUrl,
        cart.map((c) => ({ productId: c.product.id, qty: c.qty }))
      );
      const safe = validateSafeHttpUrl(res.checkoutUrl);
      if (!safe) {
        throw new Error('لینک درگاه پرداخت معتبر نبود.');
      }
      const a = document.createElement('a');
      a.href = safe;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setOnlineRedirectNotice(
        'صفحه پرداخت در پنجره جدید باز شد. پس از تکمیل پرداخت، وضعیت سفارش در بخش «حساب کاربری ← سفارش‌ها» قابل پیگیری است.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در شروع پرداخت آنلاین.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfflineBacsCheckout = async () => {
    if (!wpUrl || !wpUser || cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await submitOfflineOrder(wpUrl, {
        items: cart.map((c) => ({ productId: c.product.id, qty: c.qty })),
        note: paymentNote.trim() || undefined,
        receiptFile: receiptImage?.file ?? null,
      });
      setCreatedPendingOrder(res.order);
      setCart([]);
      setReceiptImage(null);
      setPaymentNote('');
      audioEngine.play('success');
      onOrderCreated?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ثبت سفارش کارت به کارت ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (val: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(val).catch(() => {});
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const formatMoney = (amt: number) => {
    const currency = catalog?.currency || 'تومان';
    return `${formatNumber(Math.round(amt).toLocaleString('en-US'), digitMode)} ${currency}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5E4CE] dark:bg-slate-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت به خانه"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200 shrink-0"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] truncate">
          فروشگاه کودک نابغه
        </h1>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label="باز کردن سبد خرید"
          className="min-h-[44px] px-3 rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center gap-1.5 text-[#783F1D] dark:text-white font-extrabold text-xs shrink-0"
        >
          <ShoppingCart className="w-4 h-4 text-[#4BB543]" />
          <span>سبد خرید</span>
          {totalItems > 0 && (
            <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-[#4BB543] text-white text-[11px] flex items-center justify-center tabular-nums">
              {formatNumber(totalItems, digitMode)}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-5 pb-14">
        {/* Campaign Focal Banner */}
        <section className="rounded-3xl bg-gradient-to-l from-[#FFCC33] via-[#FFD859] to-[#FFE89E] dark:from-slate-800 dark:to-slate-900 border-4 border-white dark:border-slate-700 shadow-[0_12px_28px_-8px_rgba(180,115,45,0.2)] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#593400] dark:text-white">
              {catalog?.settings.bannerTitle || 'فروشگاه تجهیزات آموزشی چرتکه کودک نابغه'}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-[#7A4E00] dark:text-slate-300 leading-relaxed">
              {catalog?.settings.bannerSubtitle ||
                'خرید چرتکه استاندارد، کتاب‌های کار، بسته‌های کمک‌آموزشی و محصولات ویژه کودکان ۴ تا ۱۵ سال'}
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی محصول..."
              className="w-full min-h-[46px] pr-10 pl-3 rounded-2xl bg-white/95 dark:bg-slate-800 border-2 border-amber-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5472EB]"
            />
          </div>
        </section>

        {/* Interactive Category Filter Buttons */}
        {catalog && catalog.categories.length > 0 && (
          <div
            role="tablist"
            aria-label="دسته‌بندی محصولات"
            className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
          >
            <button
              type="button"
              onClick={() => setSelectedCategoryId(0)}
              className={`min-h-[42px] px-4 rounded-2xl text-xs font-extrabold whitespace-nowrap shrink-0 border-b-4 transition-all ${
                selectedCategoryId === 0
                  ? 'bg-[#5472EB] border-[#354EB8] text-white'
                  : 'bg-white dark:bg-slate-800 border-[#DFC6A8] dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              همه محصولات
            </button>
            {catalog.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`min-h-[42px] px-4 rounded-2xl text-xs font-extrabold whitespace-nowrap shrink-0 border-b-4 transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#5472EB] border-[#354EB8] text-white'
                    : 'bg-white dark:bg-slate-800 border-[#DFC6A8] dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800 p-4 text-xs sm:text-sm font-extrabold text-rose-800 dark:text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#5472EB]" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              در حال دریافت محصولات فروشگاه...
            </span>
          </div>
        ) : !catalog || catalog.products.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-10 text-center space-y-2">
            <Package className="w-12 h-12 text-amber-400 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              محصولی برای نمایش یافت نشد
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {selectedCategoryId > 0 || debouncedSearch
                ? 'فیلتر دسته‌بندی یا عبارت جستجو را تغییر دهید.'
                : 'محصولات فروشگاه به‌زودی اضافه می‌شوند.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {catalog.products.map((product) => {
              const qtyInCart = getProductQtyInCart(product.id);
              const catName = product.categories[0]?.name || 'محصول آموزشی';
              return (
                <article
                  key={product.id}
                  className="group rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 overflow-hidden shadow-[0_10px_22px_-8px_rgba(170,104,40,0.16)] flex flex-col transition-transform hover:-translate-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setDetailProduct(product)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-[#FFF9F2] dark:bg-slate-800 text-right focus:outline-none"
                  >
                    <ProductImageFrame src={product.imageUrl} alt={product.name} />
                    {product.onSale && product.discountPercent > 0 && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-rose-600 text-white text-xs font-extrabold shadow-sm tabular-nums">
                        {formatNumber(product.discountPercent, digitMode)}٪ تخفیف
                      </span>
                    )}
                  </button>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{catName}</span>
                        <span aria-hidden="true">·</span>
                        <span className={product.inStock ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                          {product.inStock ? 'موجود' : 'ناموجود'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDetailProduct(product)}
                        className="text-right font-extrabold text-base text-slate-900 dark:text-white line-clamp-2 hover:text-[#5472EB] transition-colors"
                      >
                        {product.name}
                      </button>

                      {product.onSale && (
                        <div>
                          <SaleCountdown
                            saleEndTimestamp={product.saleEndTimestamp}
                            digitMode={digitMode}
                            compact
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[#F4E6D4] dark:border-slate-800">
                      <div className="flex items-baseline justify-between gap-2">
                        {product.onSale && product.regularPriceFormatted ? (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-extrabold text-[#4BB543] dark:text-emerald-400 tabular-nums">
                              {product.priceFormatted}
                            </span>
                            <span className="text-xs text-slate-400 line-through tabular-nums">
                              {product.regularPriceFormatted}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-extrabold text-[#4BB543] dark:text-emerald-400 tabular-nums">
                            {product.priceFormatted}
                          </span>
                        )}
                      </div>

                      {!product.inStock ? (
                        <div className="w-full min-h-[44px] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold text-xs flex items-center justify-center">
                          فعلاً ناموجود است
                        </div>
                      ) : qtyInCart > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-h-[44px] rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 flex items-center justify-between px-2">
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, 1)}
                              aria-label="افزایش تعداد"
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center shadow-xs"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                              {formatNumber(qtyInCart, digitMode)} در سبد
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(product.id, -1)}
                              aria-label="کاهش تعداد"
                              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 text-rose-600 flex items-center justify-center shadow-xs"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            className="min-h-[44px] px-3 rounded-2xl bg-[#4BB543] border-b-4 border-[#2E8228] text-white font-extrabold text-xs shrink-0"
                          >
                            تکمیل خرید
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="w-full min-h-[44px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>افزودن به سبد خرید</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#FFF9F2] dark:bg-slate-900 border-4 border-white dark:border-slate-700 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="relative aspect-[4/3] w-full bg-white dark:bg-slate-800 shrink-0">
              <ProductImageFrame src={detailProduct.imageUrl} alt={detailProduct.name} />
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                aria-label="بستن"
                className="absolute top-3 left-3 min-h-[42px] min-w-[42px] rounded-2xl bg-white/95 dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {detailProduct.name}
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg font-extrabold text-[#4BB543] dark:text-emerald-400">
                  {detailProduct.priceFormatted}
                </span>
                {detailProduct.onSale && detailProduct.regularPriceFormatted && (
                  <span className="text-sm text-slate-400 line-through">
                    {detailProduct.regularPriceFormatted}
                  </span>
                )}
                {detailProduct.onSale && (
                  <SaleCountdown
                    saleEndTimestamp={detailProduct.saleEndTimestamp}
                    digitMode={digitMode}
                  />
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {detailProduct.description || detailProduct.shortDescription || 'محصول آموزشی منتخب کودک نابغه.'}
              </p>
              {detailProduct.inStock && (
                <button
                  type="button"
                  onClick={() => {
                    addToCart(detailProduct);
                    setDetailProduct(null);
                    setCartOpen(true);
                  }}
                  className="w-full min-h-[48px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-sm flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>افزودن به سبد خرید و تکمیل سفارش</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart & Commercial Checkout Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="سبد خرید و تکمیل سفارش"
        >
          <div className="w-full max-w-md bg-[#FFF9F2] dark:bg-slate-900 h-full flex flex-col shadow-2xl border-r-4 border-white dark:border-slate-800">
            <div className="bg-gradient-to-b from-[#FFCC33] to-[#FFE066] dark:from-slate-800 dark:to-slate-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-base text-slate-900 dark:text-white">
                <ShoppingCart className="w-5 h-5" />
                <span>سبد خرید شما</span>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="بستن سبد خرید"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white/90 dark:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {createdPendingOrder ? (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 p-4 space-y-2.5 text-center">
                  <Clock className="w-10 h-10 text-amber-600 mx-auto" />
                  <h3 className="font-extrabold text-sm text-amber-950 dark:text-amber-200">
                    سفارش #{formatNumber(createdPendingOrder.orderNumber, digitMode)} ثبت شد!
                  </h3>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300 leading-relaxed">
                    سفارش در حال بررسی و تایید توسط مدیر می‌باشد. وضعیت سفارش را از بخش «حساب کاربری ← سفارش‌ها» دنبال کنید.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedPendingOrder(null);
                      setCartOpen(false);
                    }}
                    className="w-full min-h-[44px] rounded-2xl bg-[#4BB543] text-white font-extrabold text-xs"
                  >
                    بازگشت به فروشگاه
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <ShoppingBag className="w-12 h-12 text-amber-400 mx-auto" />
                  <div className="font-extrabold text-sm text-slate-800 dark:text-white">
                    سبد خرید شما خالی است
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    محصولات مورد نظر را از فروشگاه به سبد خرید اضافه کنید.
                  </p>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="space-y-2.5">
                    {cart.map(({ product, qty }) => (
                      <div
                        key={product.id}
                        className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {product.name}
                          </div>
                          <div className="text-xs font-bold text-[#4BB543] mt-0.5 tabular-nums">
                            {formatMoney(product.priceAmount * qty)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, 1)}
                            className="w-8 h-8 rounded-xl bg-[#FFF6EB] dark:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {formatNumber(qty, digitMode)}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, -1)}
                            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-slate-700 text-rose-600 flex items-center justify-center"
                          >
                            {qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal Summary */}
                  <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3.5 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                      مبلغ قابل پرداخت:
                    </span>
                    <span className="text-base font-extrabold text-[#4BB543] dark:text-emerald-400 tabular-nums">
                      {formatMoney(totalAmount)}
                    </span>
                  </div>

                  {!wpUser ? (
                    <div className="space-y-2.5">
                      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 p-3 text-xs font-bold text-amber-900 dark:text-amber-200">
                        برای ثبت سفارش و ارسال به نشانی شما، لطفاً وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCartOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full min-h-[48px] rounded-2xl bg-[#5472EB] border-b-4 border-[#354EB8] text-white font-extrabold text-sm flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>ورود / ثبت نام</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#FFF2E0] dark:bg-slate-800 border border-[#EEDCC5]">
                        <button
                          type="button"
                          onClick={() => setCheckoutTab('online')}
                          className={`min-h-[42px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                            checkoutTab === 'online'
                              ? 'bg-[#4BB543] text-white'
                              : 'text-[#783F1D] dark:text-slate-300'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>پرداخت آنلاین</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutTab('bacs')}
                          className={`min-h-[42px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                            checkoutTab === 'bacs'
                              ? 'bg-[#5472EB] text-white'
                              : 'text-[#783F1D] dark:text-slate-300'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>کارت به کارت / فیش</span>
                        </button>
                      </div>

                      {onlineRedirectNotice && (
                        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 p-3 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{onlineRedirectNotice}</span>
                        </div>
                      )}

                      {checkoutTab === 'online' ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleOnlineCheckout()}
                          className="w-full min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ExternalLink className="w-4 h-4" />
                          )}
                          <span>انتقال به درگاه پرداخت آنلاین</span>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {activeBacsAccounts.length > 0 && (
                            <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                                <Landmark className="w-4 h-4 text-[#5472EB]" />
                                <span>حساب بانکی جهت واریز:</span>
                              </div>
                              {activeBacsAccounts.map((acc, idx) => (
                                <div key={idx} className="text-xs space-y-1 border-t border-[#EFE0CE] pt-1.5 first:border-t-0 first:pt-0">
                                  <div className="font-bold text-slate-700 dark:text-slate-200">
                                    {acc.bankName} — {acc.accountName}
                                  </div>
                                  {acc.accountNumber && (
                                    <div className="flex items-center justify-between gap-2">
                                      <span dir="ltr" className="font-mono font-bold text-slate-900 dark:text-white">
                                        {acc.accountNumber}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(acc.accountNumber, `shop-${idx}`)}
                                        className="px-2 py-0.5 rounded-lg bg-[#FFF6EB] text-[11px] font-bold text-[#5472EB] inline-flex items-center gap-1"
                                      >
                                        {copiedKey === `shop-${idx}` ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>{copiedKey === `shop-${idx}` ? 'کپی شد' : 'کپی'}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 p-3">
                            <ReceiptUploaderField
                              digitMode={digitMode}
                              selectedImage={receiptImage}
                              onImageChange={setReceiptImage}
                              noteValue={paymentNote}
                              onNoteChange={setPaymentNote}
                            />
                          </div>

                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => void handleOfflineBacsCheckout()}
                            className="w-full min-h-[50px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            <span>ثبت سفارش و ارسال برای تایید مدیر</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
