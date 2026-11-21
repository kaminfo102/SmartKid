=== کودک نابغه — پلاگین مدیریت چرتکه سوروبان و ترم‌های ووکامرس (Headless WordPress) ===
Contributors: koodaknabegheh
Tags: headless, soroban, abacus, education, woocommerce, rest-api
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.1.1

پلاگین اختصاصی هدلس وردپرس + ووکامرس برای اپلیکیشن آموزش چرتکه کودکان «کودک نابغه».

== امکانات نسخه 2.1.1 ==
1. سازگاری کامل با بلوک تسویه‌حساب جدید ووکامرس (WooCommerce Checkout Block): پر کردن خودکار تمامی فیلدهای آدرس/کشور/استان/شهر/کدپستی/ایمیل/نام، حذف نیاز به ارسال پستی برای محصولات ترم، نمایش بنر اتصال حساب بالای فرم بلوک و نمایش شفاف خطاهای احتمالی.
2. ورود خودکار یک‌بارمصرف (SSO Handoff) به تسویه‌حساب ووکامرس بدون نیاز به ورود مجدد.
3. مدیریت ترم‌های داستانی متعدد (ترم ۱ رایگان + ترم‌های ۲، ۳ و بیشتر به صورت پولی).
4. اتصال کامل به WooCommerce: انتخاب محصول ووکامرس برای هر ترم، فعال‌سازی خودکار پس از تکمیل سفارش و بررسی آنلاین سفارش‌های کاربر.
5. مدیریت نقشه ماجراجویی هر ترم با مکان‌های داستانی (انبار قرمز، آسیاب بادی، مزرعه گندم، کلبه درختی، پل رنگین‌کمان، فانوس دریایی، صندوقچه گنج و...).
6. مدیریت کامل جاده مراحل، گام‌های آموزشی، بانک سوالات تمرین، پروفایل کودکان، ستاره‌ها و اعطای/لغو دسترسی دستی ترم‌ها.
7. احراز هویت امن مبتنی بر توکن امضاشده (HMAC-SHA256) و CORS قابل تنظیم.

== مسیرهای REST API ==
- GET  /wp-json/koodak-nabegheh/v1/health
- GET  /wp-json/koodak-nabegheh/v1/curriculum
- POST /wp-json/koodak-nabegheh/v1/terms/{id}/checkout
- POST /wp-json/koodak-nabegheh/v1/terms/{id}/verify-purchase
- GET  /wp-json/koodak-nabegheh/v1/questions
- POST /wp-json/koodak-nabegheh/v1/auth/register
- POST /wp-json/koodak-nabegheh/v1/auth/login
- POST /wp-json/koodak-nabegheh/v1/auth/logout
- GET  /wp-json/koodak-nabegheh/v1/auth/me
- GET/POST /wp-json/koodak-nabegheh/v1/profiles
- PUT/DELETE /wp-json/koodak-nabegheh/v1/profiles/{client_id}
- GET/PUT /wp-json/koodak-nabegheh/v1/settings
