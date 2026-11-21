import React, { useState } from 'react';
import { ArrowRight, Check, Plus, Star } from 'lucide-react';
import type { AvatarId, ChildProfile, DigitDisplayMode } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import { AVATAR_OPTIONS, AvatarGraphic } from '../../components/MascotDana';

interface ProfileScreenProps {
  profiles: ChildProfile[];
  activeProfileId: string;
  digitMode: DigitDisplayMode;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string, avatar: AvatarId, age: number) => void;
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profiles,
  activeProfileId,
  digitMode,
  onSelectProfile,
  onCreateProfile,
  onBack,
}) => {
  const [showCreator, setShowCreator] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState<AvatarId>('fox');
  const [newAge, setNewAge] = useState(6);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProfile(newName.trim(), newAvatar, newAge);
    setNewName('');
    setShowCreator(false);
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
        <h1 className="text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)]">
          انتخاب کودک
        </h1>
        <div className="w-11" />
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-5">
        <p className="text-sm font-bold text-[#6A4523] dark:text-slate-300 text-center">
          پروفایل خودت را انتخاب کن یا یک قهرمان جدید بساز!
        </p>

        {/* Existing Profiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  onSelectProfile(profile.id);
                  onBack();
                }}
                aria-label={`انتخاب پروفایل ${profile.name}`}
                className={`min-h-[80px] p-4 rounded-3xl border-2 border-b-4 text-right flex items-center justify-between gap-3 transition-all ${
                  isActive
                    ? 'bg-sky-50 border-blue-500 border-b-blue-600 dark:bg-blue-950/50 dark:border-blue-500'
                    : 'bg-white border-[#EEDCC5] border-b-[#DFC6A8] hover:border-blue-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarGraphic avatar={profile.avatar} className="w-12 h-12 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                      {profile.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatNumber(profile.age, digitMode)} ساله</span>
                      <span>·</span>
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
            );
          })}
        </div>

        {/* Add New Child Profile */}
        {!showCreator ? (
          <button
            type="button"
            onClick={() => setShowCreator(true)}
            className="w-full min-h-[56px] rounded-3xl border-2 border-dashed border-[#D99B58] dark:border-blue-600 bg-white/80 dark:bg-blue-950/20 hover:bg-white text-[#8B4D17] dark:text-blue-300 font-extrabold text-base flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-5 h-5" />
            <span>ساخت پروفایل کودک جدید</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 border-b-4 border-b-[#DFC6A8] p-5 space-y-4 shadow-md"
          >
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
              ساخت پروفایل جدید
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نام یا اسم مستعار کودک
              </label>
              <input
                type="text"
                maxLength={18}
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً سارا یا امیر..."
                className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سن: {formatNumber(newAge, digitMode)} سال
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[4, 5, 6, 7, 8, 9, 10].map((ageOpt) => (
                  <button
                    key={ageOpt}
                    type="button"
                    onClick={() => setNewAge(ageOpt)}
                    className={`min-h-[44px] min-w-[44px] rounded-2xl font-bold text-sm transition-colors ${
                      newAge === ageOpt
                        ? 'bg-[#5472EB] border-b-4 border-[#354EB8] text-white'
                        : 'bg-[#FFF6EB] dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatNumber(ageOpt, digitMode)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                انتخاب تصویر شخصیت
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewAvatar(opt.id)}
                    className={`min-h-[68px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      newAvatar === opt.id
                        ? 'border-blue-600 bg-sky-50 dark:bg-blue-950/50 ring-2 ring-blue-400'
                        : 'border-[#EFE0CE] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800'
                    }`}
                  >
                    <AvatarGraphic avatar={opt.id} className="w-10 h-10" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-base"
              >
                ذخیره پروفایل
              </button>
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="min-h-[50px] px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm"
              >
                انصراف
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
