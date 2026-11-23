=== کودک نابغه — پلاگین مدیریت چرتکه سوروبان، فروشگاه و تیکتینگ ===
Contributors: koodaknabegheh
Tags: headless, soroban, abacus, education, woocommerce, rest-api, ticketing
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.7.0

پلاگین اختصاصی هدلس وردپرس + ووکامرس برای پلتفرم تجاری آموزش چرتکه کودکان «کودک نابغه».

== امکانات نسخه 2.7.0 ==
1. صفحه اختصاصی و بدون حواس‌پرتی پرداخت ووکامرس (Checkout / Order-Pay / Order-Received): حذف هدر، فوتر، منوها و سایدبارهای قالب وردپرس با طراحی مدرن، راست‌چین و هم‌رنگ اپلیکیشن کودک نابغه.
2. بازگشت خودکار و هوشمند به اپلیکیشن پس از پرداخت یا ثبت سفارش (Auto Return Flow): انتقال خودکار یا دکمه بازگشت فوری به همان بخش مبدا (نقشه دوره‌ها، فروشگاه یا تاریخچه سفارش‌ها) همراه با فعال‌سازی فوری ترم و به‌روزرسانی خودکار وضعیت سفارش‌ها.
3. قالب‌های اختصاصی HTML ایمیل‌های ووکامرس و وردپرس: طراحی گرم و حرفه‌ای راست‌چین با نشان وضعیت فارسی سفارش، لینک تصویر رسید بانکی و دکمه ورود به اپلیکیشن.
4. تبدیل خودکار ارقام فارسی و عربی به لاتین و اصلاح ذخیره کد پستی ۱۰ رقمی در تمام فرم‌ها و تسویه‌حساب.
5. فروشگاه کامل درون‌برنامه‌ای، پرداخت کارت به کارت با فشرده‌سازی خودکار فیش بانکی زیر ۱۰۰ کیلوبایت، تیکتینگ پشتیبانی و ورود خودکار SSO Handoff.

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
- GET/PUT /wp-json/koodak-nabegheh/v1/settings
