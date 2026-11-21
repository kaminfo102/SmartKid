=== کودک نابغه — بک‌اند هدلس وردپرس و مدیریت چرتکه سوروبان ===
Contributors: koodaknabegheh
Tags: headless, soroban, abacus, education, rest-api, kids
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

بک‌اند کامل هدلس وردپرس برای اپلیکیشن آموزشی چرتکه ژاپنی «کودک نابغه».

== امکانات کلیدی ==
1. مدیریت کامل جاده یادگیری (مراحل، ترتیب، آیکن، رنگ، شرط بازشدن، گام‌های آموزشی و متن صوتی)
2. بانک سوالات تمرینی کاملاً داینامیک با دسته‌بندی مهارت و سطح سختی ۱ تا ۵
3. احراز هویت اختصاصی هدلس (ثبت‌نام، ورود، خروج، توکن امن امضاشده HMAC-SHA256)
4. مدیریت کاربران، پروفایل چندفرزندی کودکان، امتیازات (ستاره‌ها)، دقیقه تمرین و ریست پیشرفت
5. تنظیمات هدلس (CORS، زمان اعتبار توکن، تنظیمات پیش‌فرض صدا/شب/ارقام)

== نصب ==
1. فایل zip افزونه را از بخش «افزونه‌ها > افزودن افزونه > بارگذاری افزونه» در پیشخوان وردپرس آپلود و فعال کنید.
2. پس از فعال‌سازی، منوی جدید «کودک نابغه» در پیشخوان ظاهر می‌شود.
3. آدرس API نمایش داده‌شده در داشبورد افزونه (مثلاً https://yoursite.com) را در اپلیکیشن «کودک نابغه > بخش والدین > اتصال به وردپرس هدلس» وارد کنید.

== مسیرهای REST API ==
Namespace: /wp-json/koodak-nabegheh/v1
- GET  /health
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET  /auth/me
- GET  /curriculum
- GET  /questions
- GET/POST /profiles
- PUT/DELETE /profiles/{client_id}
- GET/PUT /settings
