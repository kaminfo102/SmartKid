import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Car,
  Check,
  Clock,
  Coffee,
  Edit3,
  Globe,
  Headphones,
  Mic,
  MicOff,
  Moon,
  Music,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UserCircle2,
  Users,
  Volume2,
  VolumeX,
  X,
  ZapOff,
} from 'lucide-react';
import type {
  AppSettings,
  ChildProfile,
  LessonDefinition,
  SkillKey,
  WordPressUser,
} from '../../types/app';
import type { WordPressAuthResponse } from '../../lib/wordpressApi';
import { formatNumber } from '../../lib/numbers';
import { AvatarGraphic } from '../../components/MascotDana';
import {
  ChildAvatarEditorModal,
  type ChildAvatarSavePayload,
} from '../../components/ChildAvatarEditorModal';
import { WordPressAuthScreen } from '../../components/WordPressAuthScreen';
import { ProgressPanel } from './ProgressPanel';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { SUPPORT_COFFEE_URL } from '../../components/BuyCoffeeButton';
import { KidIconTile, type KidTileColor } from '../../components/KidIconTile';
import { DEFAULT_DAILY_RACING_LIMIT_SECONDS } from '../../lib/storage';

export type ParentsHubTab = 'children' | 'account' | 'settings';

interface SettingsPanelProps {
  profiles: ChildProfile[];
  activeProfile: ChildProfile;
  settings: AppSettings;
  lessons?: LessonDefinition[];
  initialTab?: ParentsHubTab;
  wpUrl: string;
  wpUser: WordPressUser | null;
  wpConnected: boolean;
  stagesCount: number;
  questionsCount: number;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (payload: ChildAvatarSavePayload) => Promise<void> | void;
  onUpdateProfile: (
    profileId: string,
    payload: ChildAvatarSavePayload
  ) => Promise<void> | void;
  onDeleteProfile: (profileId: string) => Promise<void> | void;
  onUpdateWpUrl: (url: string) => void;
  onAuthSuccess: (res: WordPressAuthResponse) => void;
  onUpdateUser?: (user: WordPressUser) => void;
  onLogout: () => void;
  onRefreshFromWordPress: (overrideUrl?: string) => Promise<boolean>;
  onOpenTickets?: () => void;
  onPracticeSkill?: (skill: SkillKey) => void;
  onOpenShop?: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateRacingLimit?: (limitSeconds: number) => void;
  onClearAllData: () => void;
  onBack: () => void;
  ordersRefreshTrigger?: number;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  profiles,
  activeProfile,
  settings,
  lessons,
  initialTab = 'children',
  wpUrl,
  wpUser,
  wpConnected,
  stagesCount,
  questionsCount,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onUpdateWpUrl,
  onAuthSuccess,
  onUpdateUser,
  onLogout,
  onRefreshFromWordPress,
  onOpenTickets,
  onPracticeSkill,
  onOpenShop,
  onUpdateSettings,
  onUpdateRacingLimit,
  onClearAllData,
  onBack,
  ordersRefreshTrigger = 0,
}) => {
  const [tab, setTab] = useState<ParentsHubTab>(initialTab);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<
    { mode: 'create' } | { mode: 'edit'; profile: ChildProfile } | null
  >(null);
  const [savingChild, setSavingChild] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleSaveEditor = async (payload: ChildAvatarSavePayload) => {
    if (!editorState) return;
    setSavingChild(true);
    try {
      if (editorState.mode === 'create') {
        await onCreateProfile(payload);
      } else {
        await onUpdateProfile(editorState.profile.id, payload);
      }
      setEditorState(null);
    } finally {
      setSavingChild(false);
    }
  };

  const iconToggleCard = (
    ariaLabel: string,
    checked: boolean,
    onChange: (val: boolean) => void,
    activeIcon: React.ReactNode,
    inactiveIcon: React.ReactNode,
    tileColor: KidTileColor
  ) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border-2 p-3.5 flex items-center justify-between gap-3 transition-all active:translate-y-0.5 ${
        checked
          ? 'bg-[#FFFBF5] dark:bg-slate-800/80 border-[#46B849] dark:border-emerald-600 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-[#EFE0CE] dark:border-slate-800 opacity-85 hover:opacity-100'
      }`}
    >
      <KidIconTile color={tileColor} size="md">
        {checked ? activeIcon : inactiveIcon}
      </KidIconTile>

      <span
        aria-hidden="true"
        className={`min-h-[36px] min-w-[56px] px-1 rounded-full flex items-center transition-colors shrink-0 border-2 ${
          checked
            ? 'bg-[#46B849] border-[#2E8D30] justify-end'
            : 'bg-slate-200 border-slate-300 dark:bg-slate-700 dark:border-slate-600 justify-start'
        }`}
      >
        <span className="w-6 h-6 rounded-full bg-white shadow-sm block" />
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F5E4CE] dark:bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت به خانه"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-5 h-5 text-white shrink-0" />
          <h1 className="text-base sm:text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] truncate">
            مرکز والدین و حساب کاربری
          </h1>
        </div>

        <div className="w-11" />
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 space-y-5 pb-12">
        {/* Unified 3-Tab Parents & Account Segmented Switcher */}
        <div
          role="tablist"
          aria-label="بخش‌های مرکز والدین و حساب کاربری"
          className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 shadow-[0_8px_20px_-6px_rgba(170,104,40,0.14)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'children'}
            onClick={() => setTab('children')}
            className={`min-h-[46px] px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'children'
                ? 'bg-[#5472EB] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#FFF6EB] dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">فرزندان و کارنامه</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'account'}
            onClick={() => setTab('account')}
            className={`min-h-[46px] px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'account'
                ? 'bg-[#5472EB] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#FFF6EB] dark:hover:bg-slate-800'
            }`}
          >
            <UserCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {wpUser ? 'حساب و سفارش‌ها' : 'ورود / ثبت‌نام'}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'settings'}
            onClick={() => setTab('settings')}
            className={`min-h-[46px] px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'settings'
                ? 'bg-[#5472EB] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#FFF6EB] dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">تنظیمات و پشتیبانی</span>
          </button>
        </div>

        {/* TAB 1: Children Profiles Management & Progress Report */}
        {tab === 'children' && (
          <div className="space-y-5">
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] shadow-[0_10px_24px_-8px_rgba(170,104,40,0.16)] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    پروفایل فرزندان
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    بین پروفایل‌ها جابه‌جا شوید، نام و تصویر پروفایل بگذارید یا فرزند جدید اضافه کنید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorState({ mode: 'create' })}
                  className="min-h-[44px] px-4 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن فرزند جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profiles.map((child) => {
                  const isActive = child.id === activeProfile.id;
                  const canDelete = profiles.length > 1;
                  const confirming = confirmDeleteId === child.id;

                  return (
                    <div
                      key={child.id}
                      className={`rounded-2xl border-2 p-3 flex flex-col gap-2.5 transition-all ${
                        isActive
                          ? 'bg-sky-50 border-blue-500 dark:bg-blue-950/40 dark:border-blue-500'
                          : 'bg-[#FFFBF5] border-[#EFE0CE] dark:bg-slate-800/60 dark:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProfile(child.id)}
                        className="w-full text-right flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#EEDCC5] dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                            <AvatarGraphic
                              avatar={child.avatar}
                              imageUrl={child.avatarUrl}
                              alt={child.name}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {child.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 tabular-nums">
                              <span>
                                {formatNumber(child.age, settings.digitMode)} ساله
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {formatNumber(child.totalStars, settings.digitMode)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <span className="w-7 h-7 rounded-full bg-[#5472EB] text-white flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EFE0CE] dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() =>
                            setEditorState({ mode: 'edit', profile: child })
                          }
                          className="min-h-[36px] px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-600 text-xs font-extrabold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#5472EB]" />
                          <span>ویرایش نام و عکس</span>
                        </button>

                        {canDelete ? (
                          confirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  void onDeleteProfile(child.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="min-h-[36px] px-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold"
                              >
                                تایید حذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="min-h-[36px] px-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                              >
                                لغو
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(child.id)}
                              className="min-h-[36px] px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">
                            پروفایل پیش‌فرض
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <ProgressPanel
              profile={activeProfile}
              digitMode={settings.digitMode}
              lessons={lessons}
              onPracticeSkill={onPracticeSkill}
              onOpenShop={onOpenShop}
              onEditProfile={() =>
                setEditorState({ mode: 'edit', profile: activeProfile })
              }
            />
          </div>
        )}

        {/* TAB 2: Account, Orders, Edit Billing Profile & Admin Server Settings */}
        {tab === 'account' && (
          <WordPressAuthScreen
            embedded={true}
            refreshTrigger={ordersRefreshTrigger}
            wpUrl={wpUrl}
            wpUser={wpUser}
            wpConnected={wpConnected}
            stagesCount={stagesCount}
            questionsCount={questionsCount}
            digitMode={settings.digitMode}
            onUpdateWpUrl={onUpdateWpUrl}
            onAuthSuccess={onAuthSuccess}
            onUpdateUser={onUpdateUser}
            onLogout={onLogout}
            onRefreshFromWordPress={onRefreshFromWordPress}
            onOpenProfiles={() => setTab('children')}
            onOpenTickets={onOpenTickets}
            onBack={() => setTab('children')}
          />
        )}

        {/* TAB 3: Icon-Only Minimal Settings */}
        {tab === 'settings' && (
          <div className="space-y-4">
            {/* Icon-Only Toggles Grid */}
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] shadow-[0_10px_24px_-8px_rgba(170,104,40,0.16)] p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {iconToggleCard(
                  'افکت‌های صوتی',
                  settings.soundEnabled,
                  (val) => onUpdateSettings({ soundEnabled: val }),
                  <Volume2 className="w-6 h-6" />,
                  <VolumeX className="w-6 h-6" />,
                  'blue'
                )}

                {iconToggleCard(
                  'گوینده فارسی',
                  settings.speechEnabled,
                  (val) => onUpdateSettings({ speechEnabled: val }),
                  <Mic className="w-6 h-6" />,
                  <MicOff className="w-6 h-6" />,
                  'pink'
                )}

                {iconToggleCard(
                  'موسیقی پس‌زمینه',
                  settings.musicEnabled,
                  (val) => onUpdateSettings({ musicEnabled: val }),
                  <Music className="w-6 h-6" />,
                  <Music className="w-6 h-6 opacity-50" />,
                  'violet'
                )}

                {iconToggleCard(
                  'کاهش انیمیشن',
                  settings.reducedMotion,
                  (val) => onUpdateSettings({ reducedMotion: val }),
                  <ZapOff className="w-6 h-6" />,
                  <Sparkles className="w-6 h-6" />,
                  'amber'
                )}

                {iconToggleCard(
                  'حالت مطالعه شب',
                  settings.nightMode,
                  (val) => onUpdateSettings({ nightMode: val }),
                  <Moon className="w-6 h-6" />,
                  <Sun className="w-6 h-6" />,
                  'sky'
                )}
              </div>

              {/* Compact Multi-Choice Icon Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  title="نمایش اعداد"
                  className="rounded-2xl border-2 border-[#EFE0CE] dark:border-slate-800 p-3 flex items-center justify-between gap-2"
                >
                  <KidIconTile color="green" size="md">
                    <Globe className="w-5 h-5" />
                  </KidIconTile>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700">
                    <button
                      type="button"
                      aria-label="اعداد فارسی"
                      onClick={() => onUpdateSettings({ digitMode: 'fa' })}
                      className={`min-h-[38px] px-3.5 rounded-lg text-sm font-black tabular-nums transition-colors ${
                        settings.digitMode === 'fa'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      ۱۲۳
                    </button>
                    <button
                      type="button"
                      aria-label="اعداد انگلیسی"
                      onClick={() => onUpdateSettings({ digitMode: 'en' })}
                      className={`min-h-[38px] px-3.5 rounded-lg text-sm font-black tabular-nums transition-colors ${
                        settings.digitMode === 'en'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      123
                    </button>
                  </div>
                </div>

                {onUpdateRacingLimit && (
                  <div
                    title="زمان روزانه بازی ماشین"
                    className="rounded-2xl border-2 border-[#EFE0CE] dark:border-slate-800 p-3 flex items-center justify-between gap-2"
                  >
                    <KidIconTile color="amber" size="md">
                      <Car className="w-5 h-5" />
                    </KidIconTile>
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FFF6EB] dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-1 shrink-0" />
                      {[300, 600, 900, 1200].map((secs) => {
                        const currentLimit =
                          activeProfile.dailyRacing?.dailyLimitSeconds ??
                          DEFAULT_DAILY_RACING_LIMIT_SECONDS;
                        const selected = currentLimit === secs;
                        const mins = Math.round(secs / 60);
                        return (
                          <button
                            key={secs}
                            type="button"
                            aria-label={`${mins} دقیقه`}
                            title={`${mins} دقیقه`}
                            onClick={() => onUpdateRacingLimit(secs)}
                            className={`min-h-[38px] min-w-[36px] px-2 rounded-lg text-xs font-black tabular-nums transition-colors ${
                              selected
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {formatNumber(mins, settings.digitMode)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Icon-Only Quick Utility Actions */}
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] shadow-[0_10px_24px_-8px_rgba(170,104,40,0.16)] p-4 flex items-center justify-center gap-3 flex-wrap">
              {onOpenTickets && (
                <button
                  type="button"
                  onClick={onOpenTickets}
                  aria-label="پشتیبانی و ارسال تیکت"
                  title="پشتیبانی"
                  className="min-h-[48px] min-w-[48px] px-4 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] active:border-b-0 active:translate-y-0.5 text-white flex items-center justify-center transition-all"
                >
                  <Headphones className="w-5 h-5" />
                </button>
              )}

              <a
                href={SUPPORT_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="حمایت از کودک نابغه"
                title="حمایت"
                className="min-h-[48px] min-w-[48px] px-4 rounded-2xl bg-[#92400E] hover:bg-[#78350F] border-b-4 border-[#451A03] active:border-b-0 active:translate-y-0.5 text-amber-200 flex items-center justify-center transition-all"
              >
                <Coffee className="w-5 h-5" />
              </a>

              <PWAInstallButton iconOnly />

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  aria-label="حذف اطلاعات محلی"
                  title="حذف اطلاعات محلی"
                  className="min-h-[48px] min-w-[48px] px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 border-b-4 border-amber-300 dark:border-amber-800 active:border-b-0 active:translate-y-0.5 text-amber-950 dark:text-amber-100 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="تایید حذف اطلاعات محلی"
                    title="تایید حذف"
                    onClick={() => {
                      onClearAllData();
                      setConfirmClear(false);
                    }}
                    className="min-h-[48px] min-w-[48px] px-3.5 rounded-2xl bg-rose-600 border-b-4 border-rose-800 text-white flex items-center justify-center"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="لغو حذف"
                    title="لغو"
                    onClick={() => setConfirmClear(false)}
                    className="min-h-[48px] min-w-[48px] px-3.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {editorState && (
        <ChildAvatarEditorModal
          mode={editorState.mode}
          initialProfile={editorState.mode === 'edit' ? editorState.profile : null}
          digitMode={settings.digitMode}
          saving={savingChild}
          onClose={() => setEditorState(null)}
          onSave={handleSaveEditor}
        />
      )}
    </div>
  );
};
