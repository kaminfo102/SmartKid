import type {
  AppSettings,
  AudioSettingsConfig,
  AvatarId,
  BacsAccount,
  ChildProfile,
  LessonDefinition,
  PendingOrderInfo,
  PracticeQuestion,
  SkillKey,
  StoreCatalogResponse,
  SupportTicket,
  TermDefinition,
  UserOrder,
  WordPressConfig,
  WordPressUser,
} from '../types/app';

const WP_SITE_URL_STORAGE_KEY = 'koodak_nabegheh_wp_url';
const WP_API_BASE_PATH = '/wp-json/koodak-nabegheh/v1';

/**
 * Auth Bearer token is kept strictly in JS memory (never written to localStorage/sessionStorage).
 */
let memoryBearerToken: string | null = null;

export function setMemoryBearerToken(token: string | null): void {
  memoryBearerToken = token && token.trim() ? token.trim() : null;
}

export function hasMemoryBearerToken(): boolean {
  return Boolean(memoryBearerToken);
}

/**
 * Convert Persian/Arabic numerals to ASCII Latin digits.
 */
export function normalizePersianDigits(raw: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return raw
    .replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
}

/**
 * Normalize an Iranian mobile number (handles spaces, dashes, +98/0098/98, Persian digits).
 */
export function normalizeIranMobile(raw: string): string {
  const digits = normalizePersianDigits(raw).replace(/\D/g, '');
  if (digits.length === 14 && digits.startsWith('00989')) {
    return '0' + digits.slice(4);
  }
  if (digits.length === 12 && digits.startsWith('989')) {
    return '0' + digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Strictly validate an Iranian mobile number (11 digits starting with 09).
 */
export function isValidIranMobile(raw: string): boolean {
  return /^09\d{9}$/.test(normalizeIranMobile(raw));
}

/**
 * Normalize and validate a URL (strictly restricts to http: / https:).
 */
export function normalizeWordPressUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, ''));
  } catch {
    return '';
  }
}

export function validateSafeHttpUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export function getSavedWordPressUrl(): string {
  const envUrl = import.meta.env.VITE_WORDPRESS_URL;
  if (typeof window === 'undefined') {
    return typeof envUrl === 'string' ? normalizeWordPressUrl(envUrl) : '';
  }
  try {
    const stored = window.localStorage.getItem(WP_SITE_URL_STORAGE_KEY);
    if (stored) {
      const normalized = normalizeWordPressUrl(stored);
      if (normalized) return normalized;
    }
  } catch {
    // ignore storage errors
  }
  return typeof envUrl === 'string' ? normalizeWordPressUrl(envUrl) : '';
}

export function saveWordPressUrl(rawUrl: string): string {
  const normalized = normalizeWordPressUrl(rawUrl);
  if (typeof window !== 'undefined') {
    try {
      if (normalized) {
        window.localStorage.setItem(WP_SITE_URL_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(WP_SITE_URL_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
  return normalized;
}

async function wpRequest<T>(
  siteUrl: string,
  endpoint: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const base = normalizeWordPressUrl(siteUrl);
  if (!base) {
    throw new Error('اتصال به سرور برنامه هنوز پیکربندی نشده است.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (requireAuth) {
    if (!memoryBearerToken) {
      throw new Error('لطفاً ابتدا وارد حساب کاربری خود شوید.');
    }
    headers['Authorization'] = `Bearer ${memoryBearerToken}`;
  } else if (memoryBearerToken) {
    headers['Authorization'] = `Bearer ${memoryBearerToken}`;
  }

  const res = await fetch(`${base}${WP_API_BASE_PATH}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.message === 'string' && data.message
        ? data.message
        : `خطا در ارتباط با سرور (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

async function wpFormRequest<T>(
  siteUrl: string,
  endpoint: string,
  formData: FormData,
  requireAuth = true
): Promise<T> {
  const base = normalizeWordPressUrl(siteUrl);
  if (!base) {
    throw new Error('اتصال به سرور برنامه هنوز پیکربندی نشده است.');
  }

  const headers: Record<string, string> = {};
  if (requireAuth) {
    if (!memoryBearerToken) {
      throw new Error('لطفاً ابتدا وارد حساب کاربری خود شوید.');
    }
    headers['Authorization'] = `Bearer ${memoryBearerToken}`;
  } else if (memoryBearerToken) {
    headers['Authorization'] = `Bearer ${memoryBearerToken}`;
  }

  const res = await fetch(`${base}${WP_API_BASE_PATH}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.message === 'string' && data.message
        ? data.message
        : `خطا در ارسال اطلاعات (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export interface WordPressHealthResponse {
  ok: boolean;
  pluginVersion: string;
  siteName: string;
  appTitle: string;
  allowRegistration: boolean;
  dailyChallengeCount: number;
  termsCount?: number;
  stagesCount: number;
  questionsCount: number;
  wooActive?: boolean;
  wooCurrency?: string;
}

export async function checkWordPressHealth(
  siteUrl: string
): Promise<WordPressHealthResponse> {
  return wpRequest<WordPressHealthResponse>(siteUrl, '/health', { method: 'GET' });
}

export interface WordPressCurriculumResponse {
  terms?: TermDefinition[];
  stages: LessonDefinition[];
  unlockedTermIds?: number[];
  wooActive?: boolean;
  wooCurrency?: string;
  bacsAccounts?: BacsAccount[];
  config?: {
    appTitle?: string;
    dailyChallengeCount?: number;
    wooActive?: boolean;
    wooCurrency?: string;
    defaultSettings?: Partial<AppSettings>;
    audioSettings?: AudioSettingsConfig;
  };
}

export async function fetchWordPressCurriculum(siteUrl: string): Promise<{
  terms: TermDefinition[];
  stages: LessonDefinition[];
  unlockedTermIds: number[];
  bacsAccounts: BacsAccount[];
  config: Partial<WordPressConfig>;
  defaultSettings?: Partial<AppSettings>;
}> {
  const data = await wpRequest<WordPressCurriculumResponse>(siteUrl, '/curriculum', {
    method: 'GET',
  });
  return {
    terms: Array.isArray(data.terms) ? data.terms : [],
    stages: Array.isArray(data.stages) ? data.stages : [],
    unlockedTermIds: Array.isArray(data.unlockedTermIds) ? data.unlockedTermIds : [],
    bacsAccounts: Array.isArray(data.bacsAccounts) ? data.bacsAccounts : [],
    config: {
      appTitle: data.config?.appTitle,
      dailyChallengeCount: data.config?.dailyChallengeCount,
      wooActive: data.wooActive ?? data.config?.wooActive,
      wooCurrency: data.wooCurrency ?? data.config?.wooCurrency,
      audioSettings: data.config?.audioSettings,
    },
    defaultSettings: data.config?.defaultSettings,
  };
}

export async function fetchWordPressQuestions(
  siteUrl: string,
  skill?: SkillKey,
  difficulty?: number
): Promise<PracticeQuestion[]> {
  const params = new URLSearchParams();
  if (skill) params.set('skill', skill);
  if (difficulty && difficulty > 0) params.set('difficulty', String(difficulty));
  const qs = params.toString();
  const data = await wpRequest<{ questions: PracticeQuestion[] }>(
    siteUrl,
    `/questions${qs ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
  return Array.isArray(data.questions) ? data.questions : [];
}

export interface WordPressCheckoutResponse {
  termDbId: number;
  termTitle: string;
  alreadyUnlocked: boolean;
  pendingOrder?: PendingOrderInfo | null;
  wooActive: boolean;
  wooProductId: number;
  priceAmount: number;
  priceFormatted: string;
  regularPriceAmount?: number;
  regularPriceFormatted?: string;
  salePriceAmount?: number | null;
  salePriceFormatted?: string;
  onSale?: boolean;
  discountPercent?: number;
  saleEndTimestamp?: number | null;
  checkoutUrl: string;
  bacsAccounts?: BacsAccount[];
}

export async function startWooCommerceTermCheckout(
  siteUrl: string,
  termDbId: number
): Promise<WordPressCheckoutResponse> {
  return wpRequest<WordPressCheckoutResponse>(
    siteUrl,
    `/terms/${encodeURIComponent(String(termDbId))}/checkout`,
    { method: 'POST' },
    true
  );
}

export interface WordPressVerifyPurchaseResponse {
  unlocked: boolean;
  pendingReview?: boolean;
  orderStatus?: string;
  orderNumber?: string;
  receiptUrl?: string;
  paymentNote?: string;
  source: string | null;
  orderId?: number;
  message: string;
  unlockedTermIds?: number[];
}

export async function verifyWooCommercePurchase(
  siteUrl: string,
  termDbId: number
): Promise<WordPressVerifyPurchaseResponse> {
  return wpRequest<WordPressVerifyPurchaseResponse>(
    siteUrl,
    `/terms/${encodeURIComponent(String(termDbId))}/verify-purchase`,
    { method: 'POST' },
    true
  );
}

export interface OfflineOrderResponse {
  order: UserOrder;
  pendingReview: boolean;
  message: string;
}

export async function submitOfflineOrder(
  siteUrl: string,
  payload: {
    termDbId?: number;
    productId?: number;
    items?: Array<{ productId?: number; termDbId?: number; qty: number }>;
    note?: string;
    receiptFile?: File | null;
  }
): Promise<OfflineOrderResponse> {
  const fd = new FormData();
  if (payload.items && payload.items.length > 0) {
    fd.append('items', JSON.stringify(payload.items));
  } else if (payload.termDbId) {
    fd.append('termDbId', String(payload.termDbId));
    if (payload.productId) fd.append('productId', String(payload.productId));
  }
  if (payload.note) {
    fd.append('note', payload.note);
  }
  if (payload.receiptFile) {
    fd.append('receipt', payload.receiptFile);
  }
  return wpFormRequest<OfflineOrderResponse>(siteUrl, '/checkout/offline', fd, true);
}

export async function uploadOrderReceipt(
  siteUrl: string,
  orderId: number,
  receiptFile: File | null,
  note: string
): Promise<{ order: UserOrder; message: string }> {
  const fd = new FormData();
  if (receiptFile) {
    fd.append('receipt', receiptFile);
  }
  if (note.trim()) {
    fd.append('note', note.trim());
  }
  return wpFormRequest<{ order: UserOrder; message: string }>(
    siteUrl,
    `/orders/${encodeURIComponent(String(orderId))}/receipt`,
    fd,
    true
  );
}

export async function fetchUserOrders(siteUrl: string): Promise<{
  orders: UserOrder[];
  bacsAccounts: BacsAccount[];
}> {
  return wpRequest<{ orders: UserOrder[]; bacsAccounts: BacsAccount[] }>(
    siteUrl,
    '/account/orders',
    { method: 'GET' },
    true
  );
}

export async function fetchAccountMe(siteUrl: string): Promise<{
  user: WordPressUser;
  profiles: ChildProfile[];
  settings: AppSettings;
  unlockedTermIds: number[];
}> {
  return wpRequest<{
    user: WordPressUser;
    profiles: ChildProfile[];
    settings: AppSettings;
    unlockedTermIds: number[];
  }>(siteUrl, '/auth/me', { method: 'GET' }, true);
}

export async function updateAccountProfile(
  siteUrl: string,
  payload: {
    firstName: string;
    lastName: string;
    displayName?: string;
    mobile: string;
    email?: string;
    state: string;
    city: string;
    address1: string;
    postcode: string;
    newPassword?: string;
  }
): Promise<{ user: WordPressUser; message: string }> {
  return wpRequest<{ user: WordPressUser; message: string }>(
    siteUrl,
    '/account/profile',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function fetchStoreCatalog(
  siteUrl: string,
  categoryId = 0,
  search = ''
): Promise<StoreCatalogResponse> {
  const params = new URLSearchParams();
  if (categoryId > 0) params.set('category', String(categoryId));
  if (search.trim()) params.set('search', search.trim());
  const qs = params.toString();
  return wpRequest<StoreCatalogResponse>(
    siteUrl,
    `/store/products${qs ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

export async function startStoreCheckout(
  siteUrl: string,
  items: Array<{ productId: number; qty: number }>
): Promise<{ checkoutUrl: string }> {
  return wpRequest<{ checkoutUrl: string }>(
    siteUrl,
    '/store/checkout',
    {
      method: 'POST',
      body: JSON.stringify({ items }),
    },
    true
  );
}

export async function fetchTickets(siteUrl: string): Promise<SupportTicket[]> {
  const data = await wpRequest<{ tickets: SupportTicket[] }>(
    siteUrl,
    '/tickets',
    { method: 'GET' },
    true
  );
  return Array.isArray(data.tickets) ? data.tickets : [];
}

export async function createTicket(
  siteUrl: string,
  payload: {
    subject: string;
    category: string;
    message: string;
    attachmentFile?: File | null;
  }
): Promise<{ ticket: SupportTicket; message: string }> {
  const fd = new FormData();
  fd.append('subject', payload.subject);
  fd.append('category', payload.category);
  fd.append('message', payload.message);
  if (payload.attachmentFile) {
    fd.append('attachment', payload.attachmentFile);
  }
  return wpFormRequest<{ ticket: SupportTicket; message: string }>(
    siteUrl,
    '/tickets',
    fd,
    true
  );
}

export async function fetchTicketDetail(
  siteUrl: string,
  ticketId: number
): Promise<SupportTicket> {
  const data = await wpRequest<{ ticket: SupportTicket }>(
    siteUrl,
    `/tickets/${encodeURIComponent(String(ticketId))}`,
    { method: 'GET' },
    true
  );
  return data.ticket;
}

export async function replyTicket(
  siteUrl: string,
  ticketId: number,
  message: string,
  attachmentFile?: File | null
): Promise<SupportTicket> {
  const fd = new FormData();
  fd.append('message', message);
  if (attachmentFile) {
    fd.append('attachment', attachmentFile);
  }
  const data = await wpFormRequest<{ ticket: SupportTicket }>(
    siteUrl,
    `/tickets/${encodeURIComponent(String(ticketId))}/reply`,
    fd,
    true
  );
  return data.ticket;
}

export interface WordPressAuthResponse {
  token: string;
  expiresAt: number;
  user: WordPressUser;
  profiles: ChildProfile[];
  settings: AppSettings;
  unlockedTermIds?: number[];
}

export async function loginWordPress(
  siteUrl: string,
  identifier: string,
  password: string
): Promise<WordPressAuthResponse> {
  const data = await wpRequest<WordPressAuthResponse>(siteUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier,
      password,
      deviceLabel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web',
    }),
  });
  setMemoryBearerToken(data.token);
  return data;
}

export async function registerWordPress(
  siteUrl: string,
  payload: {
    mobile: string;
    username?: string;
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    state: string;
    city: string;
    address1: string;
    postcode: string;
    childName: string;
    childAge: number;
    childAvatar: AvatarId;
  }
): Promise<WordPressAuthResponse> {
  const data = await wpRequest<WordPressAuthResponse>(siteUrl, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      deviceLabel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web',
    }),
  });
  setMemoryBearerToken(data.token);
  return data;
}

export async function logoutWordPress(siteUrl: string): Promise<void> {
  try {
    if (siteUrl && memoryBearerToken) {
      await wpRequest(siteUrl, '/auth/logout', { method: 'POST' }, true);
    }
  } finally {
    setMemoryBearerToken(null);
  }
}

export async function syncProfileToWordPress(
  siteUrl: string,
  profile: ChildProfile
): Promise<ChildProfile[]> {
  if (!siteUrl || !memoryBearerToken) return [];
  const data = await wpRequest<{ profiles: ChildProfile[] }>(
    siteUrl,
    `/profiles/${encodeURIComponent(profile.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(profile),
    },
    true
  );
  return Array.isArray(data.profiles) ? data.profiles : [];
}

export async function createProfileInWordPress(
  siteUrl: string,
  profile: ChildProfile
): Promise<ChildProfile[]> {
  if (!siteUrl || !memoryBearerToken) return [];
  const data = await wpRequest<{ profiles: ChildProfile[] }>(
    siteUrl,
    '/profiles',
    {
      method: 'POST',
      body: JSON.stringify(profile),
    },
    true
  );
  return Array.isArray(data.profiles) ? data.profiles : [];
}

export async function syncSettingsToWordPress(
  siteUrl: string,
  settings: AppSettings
): Promise<void> {
  if (!siteUrl || !memoryBearerToken) return;
  await wpRequest(
    siteUrl,
    '/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    },
    true
  );
}
