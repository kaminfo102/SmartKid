import React, { useState } from 'react';
import {
  ArrowRight,
  Volume2,
  Music,
  Sparkles,
  Moon,
  Trash2,
  Globe,
  MessageSquare,
} from 'lucide-react';
import type { AppSettings, ChildProfile } from '../../types/app';
import { ProgressPanel } from './ProgressPanel';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { BuyCoffeeButton } from '../../components/BuyCoffeeButton';
import { KidIconTile, type KidTileColor } from '../../components/KidIconTile';

interface SettingsPanelProps {
  profile: ChildProfile;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onClearAllData: () => void;
  onBack: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  profile,
  settings,
  onUpdateSettings,
  onClearAllData,
  onBack,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const toggleRow = (
    label: string,
    desc: string,
    checked: boolean,
    onChange: (val: boolean) => void,
    icon: React.ReactNode,
    tileColor: KidTileColor
  ) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[#EFE0CE] dark:border-slate-800 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <KidIconTile color={tileColor} size="md">
          {icon}
        </KidIconTile>
        <div className="min-w-0">
          <div className="font-extrabold text-sm text-slate-900 dark:text-white">{label}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{desc}</div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`min-h-[44px] min-w-[64px] px-1 rounded-full flex items-center transition-colors shrink-0 border-2 ${
          checked
            ? 'bg-[#46B849] border-[#2E8D30] justify-end'
            : 'bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600 justify-start'
        }`}
      >
        <span className="w-8 h-8 rounded-full bg-white shadow-sm block" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5E4CE] dark:bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)]">
          بخش والدین و تنظیمات
        </h1>
        <div className="w-11" />
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 space-y-5 pb-10">
        <ProgressPanel profile={profile} digitMode={settings.digitMode} />

        {/* Parent Support Banner */}
        <BuyCoffeeButton variant="card" reducedMotion={settings.reducedMotion} />

        {/* App Settings */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-4 sm:p-5">
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
            تنظیمات صدا، نمایش و دسترسی‌پذیری
          </h2>

          {toggleRow(
            'افکت‌های صوتی',
            'صدای مهره‌های چرتکه و تشویق پاسخ درست',
            settings.soundEnabled,
            (val) => onUpdateSettings({ soundEnabled: val }),
            <Volume2 className="w-5 h-5" />,
            'blue'
          )}

          {toggleRow(
            'گوینده خانم (فارسی کودکانه)',
            'خواندن درس‌ها و تشویق‌ها با صدای مهربان خانم مناسب کودکان',
            settings.speechEnabled,
            (val) => onUpdateSettings({ speechEnabled: val }),
            <MessageSquare className="w-5 h-5" />,
            'pink'
          )}

          {toggleRow(
            'موسیقی ملایم پس‌زمینه',
            'ملودی آرام هنگام یادگیری',
            settings.musicEnabled,
            (val) => onUpdateSettings({ musicEnabled: val }),
            <Music className="w-5 h-5" />,
            'violet'
          )}

          {toggleRow(
            'کاهش انیمیشن (حساسیت حسی)',
            'توقف حرکات اضافه برای تمرکز بیشتر کودک',
            settings.reducedMotion,
            (val) => onUpdateSettings({ reducedMotion: val }),
            <Sparkles className="w-5 h-5" />,
            'amber'
          )}

          {toggleRow(
            'حالت مطالعه شب',
            'رنگ‌های تیره و ملایم برای نور کم',
            settings.nightMode,
            (val) => onUpdateSettings({ nightMode: val }),
            <Moon className="w-5 h-5" />,
            'sky'
          )}

          {/* Digits & Language option */}
          <div className="flex items-center justify-between gap-3 py-3 border-t border-[#EFE0CE] dark:border-slate-800">
            <div className="flex items-center gap-3">
              <KidIconTile color="green" size="md">
                <Globe className="w-5 h-5" />
              </KidIconTile>
              <div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                  نمایش اعداد و زبان
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  زبان فعلی: فارسی (امکان انتخاب ارقام فارسی یا انگلیسی)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700">
              <button
                type="button"
                onClick={() => onUpdateSettings({ digitMode: 'fa' })}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold ${
                  settings.digitMode === 'fa'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ۱۲۳ فارسی
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ digitMode: 'en' })}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold ${
                  settings.digitMode === 'en'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                123
              </button>
            </div>
          </div>
        </section>

        {/* PWA & Local Data Management */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
              نصب آفلاین و مدیریت اطلاعات محلی
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              تمام پیشرفت‌ها فقط روی همین دستگاه ذخیره می‌شوند و هیچ اطلاعاتی به سرور ارسال نمی‌شود.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PWAInstallButton />

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[44px] px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 border-b-4 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف اطلاعات محلی</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllData();
                    setConfirmClear(false);
                  }}
                  className="min-h-[44px] px-3 rounded-2xl bg-amber-600 border-b-4 border-amber-800 text-white font-bold text-xs"
                >
                  تایید حذف کامل
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[44px] px-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs"
                >
                  لغو
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
