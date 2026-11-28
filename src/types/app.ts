export type ScreenId =
  | 'welcome'
  | 'start'
  | 'auth'
  | 'profiles'
  | 'leaderboard'
  | 'map'
  | 'lesson'
  | 'practice'
  | 'games'
  | 'racing'
  | 'simulator'
  | 'abacus'
  | 'result'
  | 'shop'
  | 'tickets'
  | 'parents';

export interface WordPressUser {
  id: number;
  username: string;
  email: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  state?: string;
  city?: string;
  address1?: string;
  postcode?: string;
  roles: string[];
  isAdmin: boolean;
  profileComplete?: boolean;
  missingProfileFields?: string[];
}

export interface VoiceClipMapping {
  key?: string;
  phrase: string;
  url: string;
}

export interface AudioSettingsConfig {
  sfxUrls?: Partial<
    Record<
      'beadClick' | 'uiTap' | 'success' | 'tryAgain' | 'levelComplete' | 'birdChirp',
      string
    >
  >;
  bgMusicUrl?: string;
  voiceClips?: VoiceClipMapping[];
  ttsEnabled?: boolean;
  ttsProvider?: string;
}

export interface WordPressConfig {
  appTitle: string;
  dailyChallengeCount: number;
  allowRegistration: boolean;
  termsCount?: number;
  stagesCount?: number;
  questionsCount?: number;
  siteName?: string;
  wooActive?: boolean;
  wooCurrency?: string;
  smsOtpEnabled?: boolean;
  audioSettings?: AudioSettingsConfig;
}

export interface BacsAccount {
  accountName: string;
  accountNumber: string;
  bankName: string;
  iban: string;
  sortCode?: string;
}

export interface PendingOrderInfo {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  receiptUrl?: string;
  paymentNote?: string;
  totalFormatted?: string;
  dateCreated?: string;
}

export interface OrderLineItem {
  productId: number;
  name: string;
  qty: number;
  totalFormatted: string;
  termDbId?: number;
}

export interface UserOrder {
  id: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  pendingReview: boolean;
  dateCreated: string;
  totalAmount: number;
  totalFormatted: string;
  paymentMethod: string;
  paymentMethodTitle: string;
  items: OrderLineItem[];
  receiptUrl?: string;
  paymentNote?: string;
  canUploadReceipt: boolean;
}

export interface StoreCategory {
  id: number;
  name: string;
  slug: string;
}

export interface StoreProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  priceAmount: number;
  priceFormatted: string;
  regularPriceAmount: number;
  regularPriceFormatted: string;
  salePriceAmount: number | null;
  salePriceFormatted: string;
  onSale: boolean;
  discountPercent: number;
  saleEndTimestamp: number | null;
  inStock: boolean;
  stockStatus: string;
  categories: StoreCategory[];
  featured: boolean;
}

export interface StoreCatalogResponse {
  enabled: boolean;
  settings: {
    bannerTitle: string;
    bannerSubtitle: string;
  };
  categories: StoreCategory[];
  products: StoreProduct[];
  bacsAccounts: BacsAccount[];
  currency: string;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  senderName: string;
  isAdmin: boolean;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  category: string;
  status: 'open' | 'answered' | 'closed' | string;
  statusLabel: string;
  priority: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export type TermBiome = 'farm' | 'forest' | 'island' | 'space';

export type StageLandmark =
  | 'barn'
  | 'windmill'
  | 'wheat'
  | 'garden'
  | 'treehouse'
  | 'bridge'
  | 'waterfall'
  | 'owlcastle'
  | 'boat'
  | 'lighthouse'
  | 'cave'
  | 'chest'
  | 'rocket'
  | 'planet';

export type KiaMood = 'idle' | 'happy' | 'cheering' | 'sad' | 'teaching';

export type DigitDisplayMode = 'fa' | 'en';

export type AvatarId = 'owl' | 'fox' | 'rabbit' | 'bear' | 'panda' | 'star';

export interface SorobanColumnState {
  /** Whether the upper bead (worth 5 * 10^place) is pushed down toward the beam */
  heavenActive: boolean;
  /** How many lower beads (0..4, each worth 1 * 10^place) are pushed up toward the beam */
  earthCount: number;
}

export type SorobanState = SorobanColumnState[];

export interface SorobanGuidedMove {
  columnIndex: number; // 0 = rightmost (units), 1 = tens, 2 = hundreds
  beadType: 'heaven' | 'earth';
  beadIndex?: number; // 0..3 for earth beads (0 is closest to beam)
  direction: 'toward-beam' | 'away-from-beam';
  hintText: string;
}

export interface SorobanMoveStep {
  stateAfter: SorobanState;
  move: SorobanGuidedMove;
  spokenText: string;
  formulaLabel?: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  speechEnabled: boolean;
  reducedMotion: boolean;
  nightMode: boolean;
  digitMode: DigitDisplayMode;
  abacusScale: 'normal' | 'large';
  prefer2D: boolean;
}

export type SkillKey =
  | 'recognition'
  | 'placeValue'
  | 'simpleAddition'
  | 'simpleSubtraction'
  | 'complements'
  | 'mentalMath';

export interface SkillStats {
  correct: number;
  attempts: number;
}

export interface LessonProgress {
  completed: boolean;
  stars: number; // 0..3
  bestScore: number;
}

export interface DailyBonusState {
  streak: number;
  lastClaimDate: string; // YYYY-MM-DD in local timezone
  totalDaysClaimed: number;
  history: string[]; // Recent claimed YYYY-MM-DD dates
}

export interface RewardMedalDefinition {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'streak' | 'shop';
  categoryLabel: string;
  icon: 'star' | 'trophy' | 'target' | 'brain' | 'flame' | 'sun' | 'crown' | 'rocket' | 'gem' | 'compass';
  accentColor: string;
  pointsCost?: number;
}

export interface DailyRacingState {
  date: string; // YYYY-MM-DD in local timezone
  usedSeconds: number;
  dailyLimitSeconds: number;
  bestStage: number; // 1..6
  bestScore: number;
  totalCoinsEarned: number;
  selectedCarId?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  avatar: AvatarId;
  avatarUrl?: string;
  age: number;
  createdAt: number;
  totalStars: number;
  practiceMinutes: number;
  totalCorrect: number;
  totalAttempts: number;
  difficultyLevel: number; // 1..5 adaptive
  lessons: Record<string, LessonProgress>;
  skills: Record<SkillKey, SkillStats>;
  badges: string[];
  rewardPoints?: number;
  dailyBonus?: DailyBonusState;
  dailyRacing?: DailyRacingState;
}

export interface LessonStep {
  id: string;
  title: string;
  instruction: string;
  spokenText: string;
  initialValue?: number;
  targetValue?: number;
  columns: number;
  requireInteraction: boolean;
  autoDemoSteps?: boolean;
  highlightColumn?: number;
  audioUrl?: string;
}

export interface LessonDefinition {
  id: string;
  dbId?: number;
  termId?: string;
  termDbId?: number;
  stageNumber: number;
  title: string;
  shortGoal: string;
  storyCaption?: string;
  landmark?: StageLandmark;
  skill: SkillKey;
  columns: number;
  unlockRequirement?: string;
  iconName: 'sparkles' | 'layers' | 'plus' | 'minus' | 'puzzle' | 'brain';
  accentColor: string;
  audioUrl?: string;
  steps: LessonStep[];
}

export interface TermDefinition {
  id: string;
  dbId?: number;
  termNumber: number;
  title: string;
  subtitle: string;
  storyTitle: string;
  storyDescription: string;
  biome: TermBiome;
  accentColor: string;
  imageUrl?: string;
  isFree: boolean;
  priceAmount: number;
  priceFormatted: string;
  regularPriceAmount?: number;
  regularPriceFormatted?: string;
  salePriceAmount?: number | null;
  salePriceFormatted?: string;
  onSale?: boolean;
  discountPercent?: number;
  saleEndTimestamp?: number | null;
  wooProductId?: number;
  checkoutUrl?: string;
  unlocked: boolean;
  unlockedSource?: 'free' | 'woocommerce' | 'admin' | null;
  pendingOrder?: PendingOrderInfo | null;
  stages: LessonDefinition[];
}

export interface PracticeQuestion {
  id: string;
  termDbId?: number;
  skill: SkillKey;
  difficulty?: number;
  columns: number;
  promptText: string;
  spokenText: string;
  startValue: number;
  targetValue: number;
  visualType?: 'number' | 'objects' | 'mental-flash';
  visualCountA?: number;
  visualCountB?: number;
  visualEmoji?: 'apple' | 'star' | 'balloon' | 'pencil';
  operation?: '+' | '-';
  audioUrl?: string;
}

export type GameModeId = 'build' | 'find-number' | 'count-add' | 'spot-mistake';

export interface SessionResult {
  title: string;
  skill: SkillKey;
  stars: number; // 1..3
  correctCount: number;
  totalCount: number;
  message: string;
  nextAction: 'next-lesson' | 'map' | 'games' | 'practice';
  lessonId?: string;
}

export type ClientPlatform = 'web' | 'mobile_app';

export type MarketingEventType =
  | 'banner_impression'
  | 'banner_click'
  | 'dialog_impression'
  | 'dialog_click'
  | 'dialog_close'
  | 'dialog_autoclose';

export interface PromotionalBanner {
  id: number;
  title: string;
  subtitle: string;
  badgeText: string;
  imageUrl: string;
  ctaText: string;
  actionType: 'none' | 'app_screen' | 'external_url';
  actionTarget: string;
  placement: 'home_top' | 'home_bottom' | 'shop_top' | 'map_top';
  bgColor: string;
  textColor: string;
}

export interface ScheduledDialog {
  id: number;
  title: string;
  body: string;
  badgeText: string;
  imageUrl: string;
  ctaText: string;
  actionType: 'dismiss' | 'app_screen' | 'external_url' | 'term_checkout';
  actionTarget: string;
  secondaryText: string;
  delaySeconds: number;
  autoCloseSeconds: number;
  showCountdown: boolean;
  allowUserClose: boolean;
  closeOnBackdrop: boolean;
  frequencyMode: 'once_ever' | 'once_per_session' | 'once_per_day' | 'every_n_hours' | 'always';
  frequencyHours: number;
  maxImpressionsUser: number;
  dialogSize: 'sm' | 'md' | 'lg' | 'fullscreen';
  position: 'center' | 'bottom_sheet';
  themeStyle: 'brand' | 'celebration' | 'urgent' | 'dark' | 'glass';
  overlayBlur: boolean;
  animation: 'scale' | 'slide_up' | 'fade';
  targetScreens: string[];
  priority: number;
  serverNowTs?: number;
}

export interface ActiveMarketingResponse {
  banners: PromotionalBanner[];
  dialogs: ScheduledDialog[];
  serverTime?: string;
}

export interface RodState {
  upperActive: boolean;
  lowerCount: number;
}

export type SorobanThemeId = 'photo_match' | 'classic_ebony' | 'warm_walnut';

export type CameraPreset = 'front' | 'angled' | 'fit';

export type ColorMode = 'dark' | 'light';

export interface SorobanTheme {
  id: SorobanThemeId;
  name: string;
  frameColor: string;
  frameEdgeColor: string;
  frameGrainColor: string;
  beamColor: string;
  rodColor: string;
  brassColor: string;
  beadColor: string;
  markerBeadColor: string;
  beadRoughness: number;
  beadMetalness: number;
  studioBgDark: string;
  studioBgLight: string;
  plateText: string;
}

export type LeaderboardSortKey = 'stars' | 'points' | 'streak';

export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  name: string;
  avatar: AvatarId;
  avatarUrl?: string;
  age: number;
  totalStars: number;
  rewardPoints: number;
  badgesCount: number;
  streak: number;
  practiceMinutes: number;
  accuracy: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  sort: LeaderboardSortKey;
  entries: LeaderboardEntry[];
  myBestEntry?: LeaderboardEntry | null;
  totalParticipants: number;
}



