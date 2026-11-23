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

const WP_SITE_URL_STORAGE_KEY = 'koodak_nabegheh_wp_admin_url';
const WP_ENV_SNAPSHOT_KEY = 'koodak_nabegheh_wp_env_snapshot';
const LEGACY_WP_URL_STORAGE_KEY = 'koodak_nabegheh_wp_url';
const WP_API_BASE_PATH = '/wp-json/koodak-nabegheh/v1';

/**
 * Auth token is kept strictly in JS memory (never written to localStorage/sessionStorage).
 * Cross-refresh persistence relies on the server-issued HttpOnly cookie (kn_session).
 */
let memoryBearerToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setMemoryBearerToken(token: string | null): void {
  memoryBearerToken = token && token.trim() ? token.trim() : null;
}

export function hasMemoryBearerToken(): boolean {
  return Boolean(memoryBearerToken);
}

export function setOnUnauthorizedSession(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
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

export function validateSafeImageSrc(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (
    /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  if (
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('data:image/jpeg;base64,') === false &&
      trimmed.startsWith('assets/')
  ) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  return validateSafeHttpUrl(trimmed);
}

export function dataUrlToImageFile(
  dataUrl: string,
  filename = 'child-avatar.jpg'
): File | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(
    dataUrl.trim()
  );
  if (!match) return null;
  try {
    const mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    const bin = atob(match[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime, lastModified: Date.now() });
  } catch {
    return null;
  }
}

export function getEnvWordPressUrl(): string {
  const envUrl = import.meta.env.VITE_WORDPRESS_URL;
  return typeof envUrl === 'string' ? normalizeWordPressUrl(envUrl) : '';
}

export function getSavedWordPressUrl(): string {
  const envUrl = getEnvWordPressUrl();
  if (typeof window === 'undefined') {
    return envUrl;
  }
  try {
    // Clean up legacy non-admin URL cache if present
    window.localStorage.removeItem(LEGACY_WP_URL_STORAGE_KEY);

    const adminOverride = window.localStorage.getItem(WP_SITE_URL_STORAGE_KEY);
    const envSnapshot = window.localStorage.getItem(WP_ENV_SNAPSHOT_KEY) || '';
    // If .env changed since the admin override was saved, prefer the newly built .env URL
    if (adminOverride && (!envUrl || envSnapshot === envUrl)) {
      const normalized = normalizeWordPressUrl(adminOverride);
      if (normalized) return normalized;
    }
  } catch {
    // ignore storage errors
  }
  return envUrl;
}

export function saveWordPressUrl(rawUrl: string): string {
  const normalized = normalizeWordPressUrl(rawUrl);
  const envUrl = getEnvWordPressUrl();
  if (typeof window !== 'undefined') {
    try {
      if (normalized) {
        window.localStorage.setItem(WP_SITE_URL_STORAGE_KEY, normalized);
        window.localStorage.setItem(WP_ENV_SNAPSHOT_KEY, envUrl);
      } else {
        window.localStorage.removeItem(WP_SITE_URL_STORAGE_KEY);
        window.localStorage.removeItem(WP_ENV_SNAPSHOT_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
  return normalized;
}

export async function detectSameOriginWordPressUrl(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const origin = normalizeWordPressUrl(window.location.origin);
  if (!origin) return '';
  try {
    const res = await fetch(`${origin}${WP_API_BASE_PATH}/health`, {
      method: 'GET',
    });
    if (!res.ok) return '';
    const data = (await res.json().catch(() => null)) as { ok?: boolean; pluginVersion?: string } | null;
    if (data?.ok && typeof data.pluginVersion === 'string') {
      return origin;
    }
  } catch {
    // not hosted alongside WordPress
  }
  return '';
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

  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;
  const needsCustomHeaders =
    method !== 'GET' ||
    requireAuth ||
    Boolean(memoryBearerToken) ||
    endpoint === '/auth/session';

  const headers: Record<string, string> = {
    ...(hasBody && !(typeof FormData !== 'undefined' && options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(needsCustomHeaders ? { 'X-KN-App': 'koodak-nabegheh' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (memoryBearerToken) {
    headers['X-KN-Auth'] = memoryBearerToken;
  }

  const res = await fetch(`${base}${WP_API_BASE_PATH}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && requireAuth) {
      setMemoryBearerToken(null);
      unauthorizedHandler?.();
    }
    const msg =
      typeof data?.message === 'string' && data.message
        ? data.message
        : res.status === 401
        ? 'نشست کاربری منقضی شده است. لطفاً دوباره وارد حساب خود شوید.'
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

  const headers: Record<string, string> = {
    'X-KN-App': 'koodak-nabegheh',
  };
  if (memoryBearerToken) {
    headers['X-KN-Auth'] = memoryBearerToken;
  }

  const res = await fetch(`${base}${WP_API_BASE_PATH}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && requireAuth) {
      setMemoryBearerToken(null);
      unauthorizedHandler?.();
    }
    const msg =
      typeof data?.message === 'string' && data.message
        ? data.message
        : res.status === 401
        ? 'نشست کاربری منقضی شده است. لطفاً دوباره وارد حساب خود شوید.'
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

export async function restoreWordPressSession(
  siteUrl: string
): Promise<WordPressAuthResponse | null> {
  const base = normalizeWordPressUrl(siteUrl);
  if (!base) return null;
  try {
    const res = await fetch(`${base}${WP_API_BASE_PATH}/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-KN-App': 'koodak-nabegheh',
        ...(memoryBearerToken ? { 'X-KN-Auth': memoryBearerToken } : {}),
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | (WordPressAuthResponse & { authenticated?: boolean })
      | null;
    if (data?.authenticated && data.token && data.user) {
      setMemoryBearerToken(data.token);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutWordPress(siteUrl: string): Promise<void> {
  try {
    if (siteUrl) {
      await wpRequest(siteUrl, '/auth/logout', { method: 'POST' }, false);
    }
  } catch {
    // ignore network failure on logout
  } finally {
    setMemoryBearerToken(null);
  }
}

export async function syncProfileToWordPress(
  siteUrl: string,
  profile: ChildProfile
): Promise<ChildProfile[]> {
  if (!siteUrl) return [];
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
  if (!siteUrl) return [];
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

export async function deleteProfileInWordPress(
  siteUrl: string,
  clientId: string
): Promise<ChildProfile[]> {
  if (!siteUrl || !clientId) return [];
  const data = await wpRequest<{ ok: boolean; profiles: ChildProfile[] }>(
    siteUrl,
    `/profiles/${encodeURIComponent(clientId)}`,
    {
      method: 'DELETE',
    },
    true
  );
  return Array.isArray(data.profiles) ? data.profiles : [];
}

export async function uploadChildAvatarInWordPress(
  siteUrl: string,
  clientId: string,
  file: File
): Promise<{
  ok: boolean;
  avatarUrl: string;
  profile: ChildProfile | null;
  profiles: ChildProfile[];
}> {
  const fd = new FormData();
  fd.append('avatar', file);
  return wpFormRequest<{
    ok: boolean;
    avatarUrl: string;
    profile: ChildProfile | null;
    profiles: ChildProfile[];
  }>(
    siteUrl,
    `/profiles/${encodeURIComponent(clientId)}/avatar`,
    fd,
    true
  );
}

export async function syncSettingsToWordPress(
  siteUrl: string,
  settings: AppSettings
): Promise<void> {
  if (!siteUrl) return;
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
