=== کودک نابغه — پلاگین مدیریت چرتکه سوروبان، فروشگاه و تیکتینگ ===
Contributors: koodaknabegheh
Tags: headless, soroban, abacus, education, woocommerce, rest-api, ticketing
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.0

پلاگین اختصاصی هدلس وردپرس + ووکامرس برای پلتفرم تجاری آموزش چرتکه کودکان «کودک نابغه».

== امکانات نسخه 2.9.0 ==
1. رابط کاربری مدیریتی یکپارچه، سبک و بهینه (Persian RTL Admin Theme) با حذف کوئری‌های تکراری (N+1) و تاریخ‌نگار اصیل شمسی + دیت‌پیکر جلالی در تمام بخش‌ها.
2. بخش گزارشات و تحلیل پیشرفته: آمار بازدید و نشست‌های تفکیکی وب‌اپلیکیشن در برابر اپلیکیشن موبایل (APK)، نمودار روند روزانه، تفکیک سیستم‌عامل، گزارش فروش و نرخ کلیک (CTR) بنرها و دیالوگ‌ها.
3. مدیریت بنرهای تبلیغاتی با انتخاب جایگاه نمایش، تصویر رسانه، پلتفرم هدف، زمان‌بندی شمسی و شمارشگر بازدید و کلیک.
4. سیستم دیالوگ‌ها و پاپ‌آپ‌های هوشمند زمان‌بندی‌شده: کنترل تاریخ/ساعت شروع و پایان، بازه ساعتی روزانه، روزهای هفته، تاخیر، بسته شدن خودکار با شمارشگر، تناوب نمایش، اندازه، موقعیت، تم ظاهری و هدف‌گذاری صفحه/مخاطب.
5. مدیریت کامل سفارشات ووکامرس (سازگار با HPOS، تغییر وضعیت، کد رهگیری، تایید سریع کارت‌به‌کارت و خروجی CSV اکسل فارسی) و مدیریت کامل محصولات ووکامرس (قیمت، تخفیف زمان‌دار شمسی، موجودی و دسته‌بندی).
6. باشگاه کامل کاربران (CRM) همراه با پروفایل‌های کودک، سفارشات، اعطا/لغو دسترسی ترم، گزارش ورود/خروج وب و موبایل و مدیریت نشست‌های فعال.

== مسیرهای REST API ==
- GET  /wp-json/koodak-nabegheh/v1/health
- GET  /wp-json/koodak-nabegheh/v1/curriculum
- POST /wp-json/koodak-nabegheh/v1/analytics/visit
- GET  /wp-json/koodak-nabegheh/v1/marketing/active
- POST /wp-json/koodak-nabegheh/v1/marketing/track
- POST /wp-json/koodak-nabegheh/v1/terms/{id}/checkout
- POST /wp-json/koodak-nabegheh/v1/terms/{id}/verify-purchase
- GET  /wp-json/koodak-nabegheh/v1/questions
- POST /wp-json/koodak-nabegheh/v1/auth/otp/send
- POST /wp-json/koodak-nabegheh/v1/auth/otp/verify
- POST /wp-json/koodak-nabegheh/v1/auth/register
- POST /wp-json/koodak-nabegheh/v1/auth/login
- POST /wp-json/koodak-nabegheh/v1/auth/logout
- GET  /wp-json/koodak-nabegheh/v1/auth/me
- PUT  /wp-json/koodak-nabegheh/v1/account/profile
- GET  /wp-json/koodak-nabegheh/v1/account/orders
- POST /wp-json/koodak-nabegheh/v1/orders/{id}/receipt
- POST /wp-json/koodak-nabegheh/v1/checkout/offline
- GET  /wp-json/koodak-nabegheh/v1/store/products
- POST /wp-json/koodak-nabegheh/v1/store/checkout
- GET/POST /wp-json/koodak-nabegheh/v1/tickets
- GET /wp-json/koodak-nabegheh/v1/tickets/{id}
- POST /wp-json/koodak-nabegheh/v1/tickets/{id}/reply
- GET/POST /wp-json/koodak-nabegheh/v1/profiles
- PUT/DELETE /wp-json/koodak-nabegheh/v1/profiles/{client_id}
- POST /wp-json/koodak-nabegheh/v1/profiles/{client_id}/avatar
- GET/PUT /wp-json/koodak-nabegheh/v1/settings
