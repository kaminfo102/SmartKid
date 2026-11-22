=== کودک نابغه — پلاگین مدیریت چرتکه سوروبان، فروشگاه و تیکتینگ ===
Contributors: koodaknabegheh
Tags: headless, soroban, abacus, education, woocommerce, rest-api, ticketing
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.2.0

پلاگین اختصاصی هدلس وردپرس + ووکامرس برای پلتفرم تجاری آموزش چرتکه کودکان «کودک نابغه».

== امکانات نسخه 2.2.0 ==
1. فروشگاه کامل درون‌برنامه‌ای: انتخاب دسته‌بندی‌ها و محصولات اختصاصی ووکامرس برای نمایش در بخش «فروشگاه» اپلیکیشن همراه با تخفیف ویژه و زمان محدود.
2. پرداخت واریز به حساب / کارت به کارت با آپلود اختیاری تصویر فیش بانکی (بهینه‌شده زیر ۱۰۰ کیلوبایت) در پوشه اختصاصی نام کاربری کاربر + ثبت کد پیگیری و توضیحات + وضعیت «در حال بررسی و تایید توسط مدیر».
3. ثبت‌نام تجاری پیشرفته: شماره موبایل اجباری به‌عنوان نام کاربری پیش‌فرض، استان، شهر، آدرس کامل، کد پستی (ذخیره در صورت‌حساب و حمل‌ونقل ووکامرس)، ایمیل اختیاری و امکان ویرایش اطلاعات حساب و مشاهده تاریخچه سفارش‌ها.
4. سیستم تیکتینگ و ارتباط با ما کامل: ارسال تیکت از اپلیکیشن، پیوست تصویر زیر ۱۰۰ کیلوبایت، مشاهده پاسخ مدیر و تغییر وضعیت تیکت‌ها در پیشخوان وردپرس.
5. پشتیبانی سنی ۴ تا ۱۵ سال در ثبت‌نام و پروفایل کودک.
6. ورود خودکار یک‌بارمصرف (SSO Handoff) به تسویه‌حساب ووکامرس بدون نیاز به ورود مجدد یا پر کردن فرم آدرس.

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
