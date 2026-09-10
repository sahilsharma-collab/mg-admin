/**
 * Request contract for the Market Genius API — GENERATED, DO NOT EDIT.
 *
 * Source of truth: market-genius-api-typescript/schemas/*.schema.ts
 * Regenerate with:  npm run contracts:build
 *
 * These are the shapes `validateRequest` enforces. A request that does not
 * satisfy the type here is rejected with a 400 before any handler runs, so
 * a consumer that compiles against this file cannot send a body the API
 * will refuse for shape reasons.
 *
 * Fully expanded on purpose: there are no imports, no dependency on zod and
 * no build step, so this file can simply be copied into a consumer.
 *
 * Requests only — responses are not described by Zod in this codebase and
 * are still hand-written in each consumer.
 */

// ── admin.schema.ts ─────────────────────────────────────────────

export type AssignRoleInput = { userId: number; role: 'ADMIN' | 'MODERATOR' | 'USER'; };

export type UpdateAdminProfileInput = { name?: string | undefined; email?: string | undefined; };

// ── appVersion.schema.ts ────────────────────────────────────────

export type UpdateVersionInput = {
  platform: string;
  version: string;
  buildNumber: number;
  required?: boolean | undefined;
  notes?: string | undefined;
};

export type CheckUpdatesInput = {
  platform: string;
  currentVersion: string;
  currentBuildNumber?: number | undefined;
};

export type PlatformParam = { platform: 'android' | 'ios'; };

// ── auth.schema.ts ──────────────────────────────────────────────

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  userName: string;
  phone?: string | undefined;
  city?: string | undefined;
  exnessId?: string | undefined;
  imgUrl?: string | undefined;
  countryCode?: string | undefined;
};

export type LoginInput = { email: string; password: string; deviceId: string; };

export type ForgotPasswordInput = { email: string; };

export type VerifyOtpInput = { email: string; otp: string; };

export type ResetPasswordInput = { email: string; otp: string; newPassword: string; };

export type ChangePasswordInput = { oldPassword: string; newPassword: string; };

export type RefreshTokenInput = { refreshToken?: string | undefined; };

// ── banner.schema.ts ────────────────────────────────────────────

export type CreateBannerInput = {
  title: string;
  imageUrl: string;
  lightModeImageUrl: string;
  link?: string | undefined;
  foregroundImageUrl?: string | undefined;
  isActive?: boolean | undefined;
  foregroundImageUrlLight?: string | undefined;
};

export type UpdateBannerInput = {
  title?: string | undefined;
  imageUrl?: string | undefined;
  lightModeImageUrl?: string | undefined;
  link?: string | null | undefined;
  foregroundImageUrl?: string | null | undefined;
  isActive?: boolean | undefined;
  foregroundImageUrlLight?: string | null | undefined;
};

// ── common.schema.ts ────────────────────────────────────────────

export type IdParam = { id: string; };

export type PaginationQuery = { page?: string | undefined; limit?: string | undefined; };

export type SearchQuery = { query: string; };

// ── engagement.schema.ts ────────────────────────────────────────

export type EngagementInput = {
  events: { notificationId: number; event: 'RENDERED' | 'OPENED' | 'DISMISSED'; occurredAt: string; platform?: 'IOS' | 'ANDROID' | 'UNKNOWN' | undefined; }[];
};

// ── event.schema.ts ─────────────────────────────────────────────

export type CreateEventInput = { categoryId: number; date: string; notificationTime?: number | undefined; };

export type UpdateEventInput = { categoryId: number; date: string; notificationTime?: number | undefined; };

export type CreateEventCategoryInput = {
  title: string;
  description?: string | undefined;
  imgUrl?: string | undefined;
  currencyPair?: string | undefined;
};

// ── exness.schema.ts ────────────────────────────────────────────

export type AddExnessIdInput = {
  broker: string;
  exnessId?: string | undefined;
  email?: string | undefined;
};

export type TradeReactionInput = { emoji: string; tradeId: number; };

// ── exnessCode.schema.ts ────────────────────────────────────────

export type CreateExnessCodeInput = { code: string; };

// ── faq.schema.ts ───────────────────────────────────────────────

export type CreateFaqInput = { question: string; answer: string; };

export type UpdateFaqInput = { question?: string | undefined; answer?: string | undefined; };

// ── impression.schema.ts ────────────────────────────────────────

export type RecordImpressionInput = { targetId: number; targetType: string; };

export type BatchImpressionInput = { impressions: { targetId: number; targetType: string; }[]; };

// ── liveTrade.schema.ts ─────────────────────────────────────────

export type CreateLiveTradeInput = {
  title: string;
  description?: string | null | undefined;
  imgUrl?: string | null | undefined;
  voiceNoteUrl?: string | null | undefined;
  pdfKey?: string | null | undefined;
  pdfName?: string | null | undefined;
  pdfSize?: number | null | undefined;
};

export type UpdateLiveTradeInput = {
  title: string;
  description?: string | null | undefined;
  imgUrl?: string | null | undefined;
  voiceNoteUrl?: string | null | undefined;
  pdfKey?: string | null | undefined;
  pdfName?: string | null | undefined;
  pdfSize?: number | null | undefined;
};

export type BatchViewTrackerInput = { tradeIds: number[]; };

export type GetLiveTradeQuery = { page?: string | undefined; limit?: string | undefined; };

export type SearchLiveTradeQuery = { query: string; };

// ── marketAnalysis.schema.ts ────────────────────────────────────

export type CreateMarketAnalysisInput = {
  title: string;
  description?: string | null | undefined;
  imgUrl?: string | null | undefined;
  voiceNoteUrl?: string | null | undefined;
  pdfKey?: string | null | undefined;
  pdfName?: string | null | undefined;
  pdfSize?: number | null | undefined;
};

export type UpdateMarketAnalysisInput = {
  title: string;
  description?: string | null | undefined;
  imgUrl?: string | null | undefined;
  voiceNoteUrl?: string | null | undefined;
  pdfKey?: string | null | undefined;
  pdfName?: string | null | undefined;
  pdfSize?: number | null | undefined;
};

export type BatchMarketViewInput = { marketIds: number[]; };

// ── notification.schema.ts ──────────────────────────────────────

export type AddPushTokenInput = { token: string; };

export type SendNotificationInput = { title: string; body: string; data?: Record<string, string> | undefined; };

export type RegisterDeviceInput = {
  token: string;
  platform?: 'IOS' | 'ANDROID' | 'UNKNOWN' | undefined;
  permission?: 'UNKNOWN' | 'GRANTED' | 'DENIED' | undefined;
  appVersion?: string | undefined;
};

export type DeregisterDeviceInput = { token: string; };

export type CursorChannel = 'LIVE_TRADE_VERIFIED' | 'LIVE_TRADE_UNVERIFIED' | 'MARKET_ANALYSIS' | 'EVENT' | 'COMMUNITY';

export type MissedNotificationsInput = {
  cursors: Partial<Record<'LIVE_TRADE_VERIFIED' | 'LIVE_TRADE_UNVERIFIED' | 'MARKET_ANALYSIS' | 'EVENT' | 'COMMUNITY', string>>;
  limit?: number | undefined;
};

// ── otp.schema.ts ───────────────────────────────────────────────

export type SendOtpInput = { email: string; };

export type VerifyEmailOtpInput = { email: string; otp: string; };

export type SendMobileOtpInput = { phone: string; countryCode: string; };

export type VerifyMobileOtpInput = { phone: string; countryCode: string; otp: string; };

export type LoginWithOtpInput = { phone: string; countryCode: string; otp: string; deviceId: string; };

// ── pdfUrl.schema.ts ────────────────────────────────────────────

export type CreatePdfUrlInput = { url: string; };

// ── post.schema.ts ──────────────────────────────────────────────

export type CreatePostInput = {
  title: string;
  content?: string | null | undefined;
  imageUrl?: string | null | undefined;
  voiceNoteUrl?: string | null | undefined;
  isPoll?: boolean | undefined;
  pollOptions?: string[] | undefined;
  pollEndsAt?: string | null | undefined;
  allowMultipleVotes?: boolean | undefined;
  tagIds?: number[] | undefined;
  pdfKey?: string | null | undefined;
  pdfName?: string | null | undefined;
  pdfSize?: number | null | undefined;
};

export type UpdatePostInput = {
  title: string;
  content?: string | null | undefined;
  imageUrl?: string | null | undefined;
  voiceNoteUrl?: string | null | undefined;
  isPoll?: boolean | undefined;
  pollOptions?: string[] | undefined;
  pollEndsAt?: string | null | undefined;
  allowMultipleVotes?: boolean | undefined;
  tagIds?: number[] | undefined;
  pdfKey?: string | null | undefined;
  pdfName?: string | null | undefined;
  pdfSize?: number | null | undefined;
};

export type VoteOnPollInput = { postId: number; optionIds: number | number[]; };

export type ReportPostInput = { postId: number; };

export type GetPostsQuery = {
  page?: string | undefined;
  limit?: string | undefined;
  tagIds?: string | string[] | undefined;
  cursor?: string | undefined;
};

export type BatchPostViewInput = { postIds: number[]; };

// ── reply.schema.ts ─────────────────────────────────────────────

export type CreateReplyInput = {
  postId: number;
  content?: string | undefined;
  imageUrl?: string | null | undefined;
  parentId?: number | null | undefined;
};

export type UpdateReplyInput = { content: string; imageUrl?: string | null | undefined; };

export type ReportReplyInput = { replyId: number; };

export type HandleReplyReportInput = { reportId: number; status: string; blockUser?: boolean | undefined; };

// ── socialAuth.schema.ts ────────────────────────────────────────

export type SocialAuthInput = {
  provider: 'google' | 'apple';
  idToken: string;
  deviceId?: string | undefined;
  fullName?: string | undefined;
};

export type CompleteSocialProfileInput = { city: string; };

// ── tag.schema.ts ───────────────────────────────────────────────

export type CreateTagInput = {
  name: string;
  description?: string | undefined;
  color?: string | undefined;
  icon?: string | undefined;
};

export type UpdateTagInput = {
  name?: string | undefined;
  description?: string | undefined;
  color?: string | undefined;
  icon?: string | undefined;
  isActive?: boolean | undefined;
};

// ── telemetry.schema.ts ─────────────────────────────────────────

export type TelemetryEventType = 'post_view' | 'trade_view' | 'market_view' | 'impression';

export type ImpressionTargetType = 'POST' | 'TRADE' | 'MARKET';

export type BatchTelemetryInput = {
  events: { type: 'post_view' | 'trade_view' | 'market_view' | 'impression'; targetId: number; targetType?: 'POST' | 'TRADE' | 'MARKET' | undefined; }[];
};

// ── user.schema.ts ──────────────────────────────────────────────

export type UpdateProfileInput = {
  name: string;
  city: string;
  phone: string;
  countryCode: string;
  imgUrl?: string | undefined;
  bio?: string | undefined;
};

export type GetUsersQuery = {
  page?: string | undefined;
  limit?: string | undefined;
  query?: string | undefined;
  email?: string | undefined;
  exnessId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export type UserIdParam = { userId: string; };

// ── verification.schema.ts ──────────────────────────────────────

export type StartVerificationInput = {
  email?: string | undefined;
  phone?: string | undefined;
  countryCode?: string | undefined;
  verificationId?: string | number | undefined;
};

export type CompleteRegistrationInput = {
  email: string;
  phone: string | undefined;
  countryCode: string;
  password: string;
  name: string;
  userName: string;
  deviceId: string;
  city?: string | undefined;
  imgUrl?: string | undefined;
};

// ── youtube.schema.ts ───────────────────────────────────────────

export type AddVideoInput = { videoId: string; type: string; };

export type UpdateVideoInput = { videoId: string; type: string; };
