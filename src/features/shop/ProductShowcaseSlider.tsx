import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { DigitDisplayMode, StoreProduct } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { SaleCountdown } from '../../components/SaleCountdown';

interface ProductShowcaseSliderProps {
  products: StoreProduct[];
  loading: boolean;
  digitMode: DigitDisplayMode;
  getQtyInCart: (productId: number) => number;
  onAddToCart: (product: StoreProduct) => void;
  onUpdateQty: (productId: number, delta: number) => void;
  onOpenDetail: (product: StoreProduct) => void;
  onOpenCart: () => void;
}

const SliderImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

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
      className="w-full h-full object-cover"
    />
  );
};

export const ProductShowcaseSlider: React.FC<ProductShowcaseSliderProps> = ({
  products,
  loading,
  digitMode,
  getQtyInCart,
  onAddToCart,
  onUpdateQty,
  onOpenDetail,
  onOpenCart,
}) => {
  const slides = useMemo(() => {
    if (!products || products.length === 0) return [];
    const sorted = [...products].sort((a, b) => {
      const scoreA = (a.featured ? 4 : 0) + (a.onSale ? 2 : 0) + (a.inStock ? 1 : 0);
      const scoreB = (b.featured ? 4 : 0) + (b.onSale ? 2 : 0) + (b.inStock ? 1 : 0);
      return scoreB - scoreA;
    });
    return sorted.slice(0, 8);
  }, [products]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused]);

  if (loading && slides.length === 0) {
    return (
      <section
        aria-label="در حال بارگذاری اسلایدر محصولات"
        className="rounded-3xl bg-white/90 dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-4 sm:p-5 shadow-[0_12px_28px_-10px_rgba(170,104,40,0.18)] animate-pulse"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 aspect-[16/10] rounded-2xl bg-[#F4E3CC] dark:bg-slate-800" />
          <div className="md:col-span-7 space-y-3">
            <div className="h-4 w-24 rounded-lg bg-[#F4E3CC] dark:bg-slate-800" />
            <div className="h-6 w-3/4 rounded-lg bg-[#F4E3CC] dark:bg-slate-800" />
            <div className="h-4 w-full rounded-lg bg-[#F4E3CC] dark:bg-slate-800" />
            <div className="h-11 w-44 rounded-2xl bg-[#F4E3CC] dark:bg-slate-800" />
          </div>
        </div>
      </section>
    );
  }

  if (slides.length === 0) return null;

  const current = slides[activeIndex] ?? slides[0];
  const qtyInCart = getQtyInCart(current.id);
  const catName = current.categories[0]?.name || 'محصول آموزشی';
  const snippet = (current.shortDescription || current.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX !== null && endX !== null) {
      const diff = endX - startX;
      if (Math.abs(diff) > 40) {
        // In RTL, swiping right->left or left->right feels natural with prev/next
        if (diff > 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    }
    window.setTimeout(() => setIsPaused(false), 3000);
  };

  return (
    <section
      aria-label="اسلایدر محصولات برگزیده فروشگاه"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#FFF4DE] via-white to-[#FFECD0] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-700 shadow-[0_16px_34px_-12px_rgba(170,104,40,0.24)] p-3.5 sm:p-5"
    >
      {/* Subtle decorative warm glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#FFCC33]/25 dark:bg-amber-500/10 blur-2xl"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-5 items-center"
        >
          {/* Visual Product Stage */}
          <div className="md:col-span-5 relative">
            <button
              type="button"
              onClick={() => onOpenDetail(current)}
              className="relative block w-full aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-md focus:outline-none group"
            >
              <SliderImage src={current.imageUrl} alt={current.name} />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent pointer-events-none" />
            </button>

            {current.onSale && current.discountPercent > 0 ? (
              <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[11px] font-black shadow-md inline-flex items-center gap-1 tabular-nums">
                <Tag className="w-3 h-3" />
                <span>{formatNumber(current.discountPercent, digitMode)}٪ تخفیف</span>
              </span>
            ) : current.featured ? (
              <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-[#FF9500] text-white text-[11px] font-black shadow-md inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>پیشنهاد ویژه</span>
              </span>
            ) : null}

            {slides.length > 1 && (
              <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-slate-950/70 text-white text-[10px] font-extrabold tabular-nums">
                {formatNumber(activeIndex + 1, digitMode)} /{' '}
                {formatNumber(slides.length, digitMode)}
              </span>
            )}
          </div>

          {/* Product Details & Quick Actions */}
          <div className="md:col-span-7 flex flex-col justify-between gap-2.5 sm:gap-3.5 min-w-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold text-[#B45309] dark:text-amber-300">
                  {catName} · {current.inStock ? 'آماده ارسال' : 'ناموجود'}
                </span>
                {current.onSale && (
                  <SaleCountdown
                    saleEndTimestamp={current.saleEndTimestamp}
                    digitMode={digitMode}
                    compact
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenDetail(current)}
                className="text-right font-black text-base sm:text-xl text-slate-900 dark:text-white line-clamp-2 hover:text-[#5472EB] transition-colors leading-snug"
              >
                {current.name}
              </button>

              {snippet && (
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {snippet}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#EFE0CE] dark:border-slate-700/80">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base sm:text-xl font-black text-[#4BB543] dark:text-emerald-400 tabular-nums">
                  {current.priceFormatted}
                </span>
                {current.onSale && current.regularPriceFormatted && (
                  <span className="text-xs sm:text-sm text-slate-400 line-through tabular-nums">
                    {current.regularPriceFormatted}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!current.inStock ? (
                  <button
                    type="button"
                    onClick={() => onOpenDetail(current)}
                    className="flex-1 sm:flex-initial min-h-[42px] px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>جزئیات محصول</span>
                  </button>
                ) : qtyInCart > 0 ? (
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <div className="min-h-[42px] rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 flex items-center gap-1.5 px-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(current.id, 1)}
                        aria-label="افزایش تعداد"
                        className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black text-slate-900 dark:text-white px-1 tabular-nums">
                        {formatNumber(qtyInCart, digitMode)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(current.id, -1)}
                        aria-label="کاهش تعداد"
                        className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 text-rose-600 flex items-center justify-center shadow-xs"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenCart}
                      className="flex-1 sm:flex-initial min-h-[42px] px-3.5 rounded-2xl bg-[#4BB543] border-b-4 border-[#2E8228] text-white font-extrabold text-xs whitespace-nowrap"
                    >
                      تکمیل خرید
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCart(current)}
                    className="flex-1 sm:flex-initial min-h-[42px] px-4 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all"
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    <span>افزودن به سبد خرید</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenDetail(current)}
                  aria-label="مشاهده جزئیات محصول"
                  title="جزئیات محصول"
                  className="min-h-[42px] min-w-[42px] px-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EEDCC5] dark:border-slate-700 text-[#783F1D] dark:text-slate-200 hover:border-[#5472EB] inline-flex items-center justify-center shrink-0 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slider Navigation Bar: Prev/Next Arrows & Interactive Indicators */}
      {slides.length > 1 && (
        <div className="relative z-10 mt-3.5 pt-3 border-t border-[#EFE0CE]/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="اسلاید قبلی"
            className="w-9 h-9 rounded-xl bg-white/95 dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-[#783F1D] dark:text-slate-200 flex items-center justify-center shadow-xs hover:bg-white shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dot indicators on mobile / Mini Thumbnails on sm+ */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {slides.map((slide, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`نمایش ${slide.name}`}
                  className={`transition-all shrink-0 flex items-center gap-1.5 ${
                    isCurrent
                      ? 'sm:px-2 sm:py-1 sm:rounded-xl sm:bg-white sm:dark:bg-slate-800 sm:border-2 sm:border-[#5472EB] sm:shadow-xs'
                      : 'sm:p-1 sm:rounded-xl sm:bg-white/60 sm:dark:bg-slate-800/50 sm:border sm:border-[#EEDCC5] sm:dark:border-slate-700 sm:opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Mobile dot */}
                  <span
                    className={`sm:hidden block h-2 rounded-full transition-all ${
                      isCurrent
                        ? 'w-6 bg-[#5472EB]'
                        : 'w-2 bg-[#DFC6A8] dark:bg-slate-700'
                    }`}
                  />
                  {/* Tablet/Desktop mini-thumb */}
                  <span className="hidden sm:flex items-center gap-1.5">
                    {slide.imageUrl ? (
                      <img
                        src={slide.imageUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-lg object-cover shrink-0 bg-[#FFF6EB]"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-lg bg-[#FFF1DC] dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#E07C47]" />
                      </span>
                    )}
                    <span className="hidden lg:inline text-[11px] font-extrabold text-slate-800 dark:text-slate-100 max-w-[92px] truncate">
                      {slide.name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="اسلاید بعدی"
            className="w-9 h-9 rounded-xl bg-white/95 dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-[#783F1D] dark:text-slate-200 flex items-center justify-center shadow-xs hover:bg-white shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};
