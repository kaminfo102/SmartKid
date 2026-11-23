import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  Edit3,
  Plus,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  ChildProfile,
  DigitDisplayMode,
  LessonDefinition,
  SkillKey,
} from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { AvatarGraphic } from '../../components/MascotDana';
import {
  ChildAvatarEditorModal,
  type ChildAvatarSavePayload,
} from '../../components/ChildAvatarEditorModal';
import { ChildProfileDetails } from './ChildProfileDetails';

interface ProfileScreenProps {
  profiles: ChildProfile[];
  activeProfileId: string;
  digitMode: DigitDisplayMode;
  lessons?: LessonDefinition[];
  initialTab?: 'details' | 'profiles';
  onSelectProfile: (id: string) => void;
  onCreateProfile: (payload: ChildAvatarSavePayload) => Promise<void> | void;
  onUpdateProfile: (
    profileId: string,
    payload: ChildAvatarSavePayload
  ) => Promise<void> | void;
  onDeleteProfile: (profileId: string) => Promise<void> | void;
  onPracticeSkill?: (skill: SkillKey) => void;
  onOpenShop?: () => void;
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profiles,
  activeProfileId,
  digitMode,
  lessons,
  initialTab = 'details',
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onPracticeSkill,
  onOpenShop,
  onBack,
}) => {
  const [tab, setTab] = useState<'details' | 'profiles'>(initialTab);
  const [editorState, setEditorState] = useState<
    { mode: 'create' } | { mode: 'edit'; profile: ChildProfile } | null
  >(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  const handleSaveEditor = async (payload: ChildAvatarSavePayload) => {
    if (!editorState) return;
    setSaving(true);
    try {
      if (editorState.mode === 'create') {
        await onCreateProfile(payload);
      } else {
        await onUpdateProfile(editorState.profile.id, payload);
      }
      setEditorState(null);
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] truncate">
          {tab === 'details'
            ? `پروفایل ${activeProfile.name}`
            : 'انتخاب، ویرایش یا ساخت کودک'}
        </h1>
        <div className="w-11" />
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-5 space-y-5 pb-12">
        {/* Segmented Control */}
        <div
          role="tablist"
          aria-label="بخش‌های پروفایل کودک"
          className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 max-w-md mx-auto shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'details'}
            onClick={() => setTab('details')}
            className={`min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'details'
                ? 'bg-[#5472EB] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#FFF6EB] dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>کارنامه و مدال‌ها</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profiles'}
            onClick={() => setTab('profiles')}
            className={`min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'profiles'
                ? 'bg-[#5472EB] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#FFF6EB] dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مدیریت کودکان</span>
          </button>
        </div>

        {tab === 'details' ? (
          <ChildProfileDetails
            profile={activeProfile}
            digitMode={digitMode}
            lessons={lessons}
            onPracticeSkill={onPracticeSkill}
            onOpenShop={onOpenShop}
            onEditProfile={() =>
              setEditorState({ mode: 'edit', profile: activeProfile })
            }
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-5">
            <p className="text-sm font-bold text-[#6A4523] dark:text-slate-300 text-center">
              کودک فعال را انتخاب کنید، عکس و نام او را ویرایش کنید یا پروفایل جدید بسازید.
            </p>

            {/* Existing Profiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                const canDelete = profiles.length > 1;
                const isConfirmingDelete = confirmDeleteId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className={`rounded-2xl border-2 border-b-4 p-3.5 shadow-[0_8px_20px_-6px_rgba(170,104,40,0.14)] flex flex-col gap-3 transition-all ${
                      isActive
                        ? 'bg-sky-50 border-blue-500 border-b-blue-600 dark:bg-blue-950/50 dark:border-blue-500'
                        : 'bg-white border-[#EEDCC5] border-b-[#DFC6A8] dark:bg-slate-900 dark:border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProfile(profile.id);
                        setTab('details');
                      }}
                      aria-label={`انتخاب پروفایل ${profile.name}`}
                      className="w-full text-right flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF6EB] dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <AvatarGraphic
                            avatar={profile.avatar}
                            imageUrl={profile.avatarUrl}
                            alt={profile.name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                            {profile.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 tabular-nums">
                            <span>{formatNumber(profile.age, digitMode)} ساله</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {formatNumber(profile.totalStars, digitMode)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </button>

                    {/* Edit / Delete Child Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0DFCB] dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditorState({ mode: 'edit', profile })}
                        className="min-h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 hover:bg-[#FFF9F2]"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#5472EB]" />
                        <span>ویرایش نام و عکس</span>
                      </button>

                      {canDelete ? (
                        isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                void onDeleteProfile(profile.id);
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-[38px] px-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold"
                            >
                              تایید حذف
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[38px] px-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                            >
                              لغو
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(profile.id)}
                            aria-label={`حذف پروفایل ${profile.name}`}
                            className="min-h-[38px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          حداقل ۱ پروفایل لازم است
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setEditorState({ mode: 'create' })}
              className="w-full min-h-[56px] rounded-2xl border-2 border-dashed border-[#D99B58] dark:border-blue-600 bg-white/85 dark:bg-blue-950/20 hover:bg-white text-[#8B4D17] dark:text-blue-300 font-extrabold text-base flex items-center justify-center gap-2 transition-colors shadow-[0_8px_20px_-6px_rgba(170,104,40,0.12)]"
            >
              <Plus className="w-5 h-5" />
              <span>ساخت پروفایل کودک جدید</span>
            </button>
          </div>
        )}
      </main>

      {editorState && (
        <ChildAvatarEditorModal
          mode={editorState.mode}
          initialProfile={editorState.mode === 'edit' ? editorState.profile : null}
          digitMode={digitMode}
          saving={saving}
          onClose={() => setEditorState(null)}
          onSave={handleSaveEditor}
        />
      )}
    </div>
  );
};
