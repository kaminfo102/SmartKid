import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  UserCheck,
} from 'lucide-react';
import type { DigitDisplayMode, SupportTicket, WordPressUser } from '../../types/app';
import { formatNumber } from '../../lib/numbers';
import {
  createTicket,
  fetchTicketDetail,
  fetchTickets,
  replyTicket,
} from '../../lib/wordpressApi';
import type { OptimizedImageResult } from '../../lib/imageOptimizer';
import { ReceiptUploaderField } from '../../components/ReceiptUploaderField';
import { KidIconTile } from '../../components/KidIconTile';

interface SupportScreenProps {
  wpUrl: string;
  wpUser: WordPressUser | null;
  digitMode: DigitDisplayMode;
  onOpenAuth: () => void;
  onBack: () => void;
}

const TICKET_CATEGORIES = [
  'سوال آموزشی / فنی',
  'سفارش و پرداخت',
  'پیشنهاد و انتقاد',
  'گزارش خطا در اپلیکیشن',
];

export const SupportScreen: React.FC<SupportScreenProps> = ({
  wpUrl,
  wpUser,
  digitMode,
  onOpenAuth,
  onBack,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [mode, setMode] = useState<'list' | 'new' | 'detail'>('list');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<OptimizedImageResult | null>(null);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<OptimizedImageResult | null>(null);

  const loadTickets = useCallback(async () => {
    if (!wpUrl || !wpUser) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchTickets(wpUrl);
      setTickets(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در دریافت تیکت‌ها.');
    } finally {
      setLoading(false);
    }
  }, [wpUrl, wpUser]);

  useEffect(() => {
    if (wpUrl && wpUser) {
      void loadTickets();
    }
  }, [wpUrl, wpUser, loadTickets]);

  const handleOpenTicket = async (ticketId: number) => {
    if (!wpUrl || !wpUser) return;
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const full = await fetchTicketDetail(wpUrl, ticketId);
      setSelectedTicket(full);
      setMode('detail');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'دریافت جزئیات تیکت ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl || !wpUser) return;
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await createTicket(wpUrl, {
        subject: subject.trim(),
        category,
        message: message.trim(),
        attachmentFile: attachment?.file ?? null,
      });
      setTickets((prev) => [res.ticket, ...prev]);
      setSelectedTicket(res.ticket);
      setSubject('');
      setMessage('');
      setAttachment(null);
      setStatusMsg(res.message);
      setMode('detail');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ثبت تیکت ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl || !wpUser || !selectedTicket || !replyText.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const updated = await replyTicket(
        wpUrl,
        selectedTicket.id,
        replyText.trim(),
        replyAttachment?.file ?? null
      );
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReplyText('');
      setReplyAttachment(null);
      setStatusMsg('پاسخ شما ثبت شد.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ارسال پاسخ ناموفق بود.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5E4CE] dark:bg-slate-950">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#F49A67] to-[#F8BA88] dark:from-slate-900 dark:to-slate-900 border-b-2 border-[#E3B488] dark:border-slate-800 px-4 h-16 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (mode !== 'list') {
              setMode('list');
            } else {
              onBack();
            }
          }}
          aria-label="بازگشت"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800 border-b-4 border-[#DFC6A8] dark:border-slate-700 flex items-center justify-center text-[#783F1D] dark:text-slate-200"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(148,70,22,0.45)] truncate">
          ارتباط با ما و پشتیبانی
        </h1>

        {wpUser ? (
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setStatusMsg(null);
              setMode('new');
            }}
            className="min-h-[42px] px-3 rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>تیکت جدید</span>
          </button>
        ) : (
          <div className="w-11" />
        )}
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4 pb-12">
        {statusMsg && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-800 p-3 text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800 p-3 text-xs sm:text-sm font-extrabold text-rose-800 dark:text-rose-200">
            {errorMsg}
          </div>
        )}

        {!wpUser ? (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto w-fit">
              <KidIconTile color="sky" size="lg">
                <Headphones className="w-8 h-8" />
              </KidIconTile>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              مرکز پشتیبانی و ارسال تیکت کودک نابغه
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              برای ارسال پیام به تیم پشتیبانی، پیگیری سفارش‌ها یا دریافت راهنمایی آموزشی، وارد حساب کاربری خود شوید.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[48px] px-6 rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5" />
              <span>ورود یا ثبت نام</span>
            </button>
          </section>
        ) : mode === 'new' ? (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] dark:border-slate-800 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                ثبت تیکت پشتیبانی جدید
              </h2>
              <button
                type="button"
                onClick={() => setMode('list')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                بازگشت به فهرست
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    موضوع تیکت *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="مثلاً راهنمایی برای پرداخت یا دسترسی دوره"
                    className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    دپارتمان / موضوع
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    {TICKET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  متن پیام شما *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="سوال یا درخواست خود را با جزئیات بنویسید..."
                  className="w-full p-3.5 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <ReceiptUploaderField
                digitMode={digitMode}
                selectedImage={attachment}
                onImageChange={setAttachment}
                showNoteField={false}
                imageLabel="پیوست تصویر یا اسکرین‌شات (اختیاری)"
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[50px] rounded-2xl bg-[#4BB543] hover:bg-[#41A23A] border-b-4 border-[#2E8228] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>ارسال تیکت به پشتیبانی</span>
              </button>
            </form>
          </section>
        ) : mode === 'detail' && selectedTicket ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  تیکت #{formatNumber(selectedTicket.id, digitMode)} · {selectedTicket.category}
                </div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {selectedTicket.subject}
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                  selectedTicket.status === 'answered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedTicket.status === 'closed'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {selectedTicket.statusLabel}
              </span>
            </div>

            {/* Messages Thread */}
            <div className="space-y-3">
              {(selectedTicket.messages ?? []).map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl p-4 border-2 space-y-2 ${
                    msg.isAdmin
                      ? 'bg-[#EFF6FF] dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 mr-4 sm:mr-10'
                      : 'bg-white dark:bg-slate-900 border-[#EEDCC5] dark:border-slate-800 ml-4 sm:ml-10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold">
                    <span className={msg.isAdmin ? 'text-sky-800 dark:text-sky-300' : 'text-[#783F1D] dark:text-amber-300'}>
                      {msg.isAdmin ? 'تیم پشتیبانی کودک نابغه' : msg.senderName}
                    </span>
                    <span className="text-slate-400">{msg.createdAt}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                    {msg.message}
                  </p>
                  {msg.attachmentUrl && (
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img
                        src={msg.attachmentUrl}
                        alt="پیوست پیام"
                        className="max-h-40 rounded-xl border-2 border-white shadow-xs"
                      />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Reply Form */}
            {selectedTicket.status !== 'closed' && (
              <form
                onSubmit={handleSendReply}
                className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-4 space-y-3"
              >
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  ارسال پاسخ جدید
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  className="w-full p-3 rounded-2xl border-2 border-[#EEDCC5] dark:border-slate-700 bg-[#FFF9F2] dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
                <ReceiptUploaderField
                  digitMode={digitMode}
                  selectedImage={replyAttachment}
                  onImageChange={setReplyAttachment}
                  showNoteField={false}
                  imageLabel="پیوست تصویر در پاسخ (اختیاری)"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] rounded-2xl bg-[#5472EB] hover:bg-[#425FD6] border-b-4 border-[#354EB8] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>ارسال پاسخ</span>
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm sm:text-base font-extrabold text-[#5B3A1D] dark:text-white">
                تیکت‌های من
              </h2>
              <button
                type="button"
                onClick={() => void loadTickets()}
                disabled={loading}
                className="min-h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-[#EEDCC5] dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>به‌روزرسانی</span>
              </button>
            </div>

            {loading && tickets.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] p-8 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#5472EB]" />
                <span className="text-xs font-bold text-slate-500">در حال دریافت تیکت‌ها...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] dark:border-slate-800 p-8 text-center space-y-3">
                <Headphones className="w-10 h-10 text-amber-400 mx-auto" />
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  هنوز تیکتی ثبت نکرده‌اید
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  در صورت داشتن هرگونه سؤال درباره دوره‌ها، پرداخت یا فروشگاه می‌توانید تیکت جدید ثبت کنید.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className="min-h-[44px] px-5 rounded-2xl bg-[#4BB543] border-b-4 border-[#2E8228] text-white font-extrabold text-xs inline-flex items-center gap-1.5"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>ثبت اولین تیکت</span>
                </button>
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void handleOpenTicket(t.id)}
                  className="w-full rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#EEDCC5] border-b-4 border-b-[#DFC6A8] hover:border-[#5472EB] dark:border-slate-800 p-4 text-right flex items-center justify-between gap-3 transition-all"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {t.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>#{formatNumber(t.id, digitMode)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.updatedAt}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 ${
                      t.status === 'answered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'closed'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {t.statusLabel}
                  </span>
                </button>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
};
