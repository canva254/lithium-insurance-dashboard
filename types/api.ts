export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ServiceDefinition {
  key: string;
  name: string;
  label: string;
  enabled: boolean;
  workflow_key?: string | null;
  min_premium?: number | null;
  commission_rate?: number | null;
  description?: string | null;
  pricing_strategy?: string | null;
  extras: Record<string, any>;
  status?: string | null;
  version_number?: number | null;
  latest_version_number?: number | null;
  default_vendor_id?: string | null;
  tenant_id?: string | null;
}

export type ServiceUpdatePayload = Partial<
  Omit<ServiceDefinition, 'key' | 'extras' | 'status' | 'version_number' | 'latest_version_number'>
> & {
  extras?: Record<string, any>;
};

export interface TenantDefinition {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  is_active: boolean;
}

export interface TenantCreatePayload {
  name: string;
  slug?: string;
  description?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  support_email?: string;
  support_phone?: string;
  is_active?: boolean;
}

export type TenantUpdatePayload = Partial<TenantCreatePayload>;

export interface TenantServiceOverride {
  id: string;
  serviceId: string;
  override: Record<string, any>;
  status?: string;
  updatedAt?: string;
}

export interface TenantServiceOverrideRequest {
  override: Record<string, any>;
  status?: string;
}

export interface TenantAISettings {
  id: string;
  tenantId: string;
  aiEnabled: boolean;
  provider?: string | null;
  model?: string | null;
  temperature: number;
  maxTokens: number;
  promptTemplate?: string | null;
  toneGuidelines?: string | null;
  toolWhitelist: string[];
  autonomyLevel: number;
  metadata: Record<string, any>;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TenantAISettingsUpdatePayload {
  aiEnabled?: boolean;
  provider?: string | null;
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
  promptTemplate?: string | null;
  toneGuidelines?: string | null;
  toolWhitelist?: string[];
  autonomyLevel?: number;
  metadata?: Record<string, any>;
}

export interface LoginRequest {
  email: string;
  password: string;
  otp?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  csrfToken: string;
  sessionId: string;
  user: User;
}

export interface PasswordResetRequestPayload {
  email: string;
}

export interface PasswordResetConfirmPayload {
  token: string;
  password: string;
}

export interface PasswordResetRequestResponse {
  requested: boolean;
  token?: string;
  expiresAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'support';
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PackageCategory = 'motor' | 'health' | 'travel' | 'home' | 'business' | 'life' | 'property';

export interface InsurancePackage {
  id: string;
  name: string;
  description: string;
  category: PackageCategory;
  basePrice: number;
  features: string[];
  vendorId?: string;
  isActive: boolean;
  workflowState: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  currentVersionId?: string;
  latestVersion?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
  documents?: PolicyDocument[];
  versions?: PolicyVersion[];
}

export interface CreatePackageRequest {
  name: string;
  description: string;
  category: PackageCategory;
  basePrice: number;
  features: string[];
  vendorId?: string;
  isActive?: boolean;
  tags?: string[];
}

export type UpdatePackageRequest = Partial<CreatePackageRequest>;

export interface PartnerPackageDocument {
  id: string;
  fileName: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  uploadedRole?: string;
  downloadUrl?: string;
}

export interface PartnerPackageVersion {
  id: string;
  packageId?: string;
  version?: number;
  name?: string;
  description?: string;
  category?: PackageCategory | string;
  basePrice?: number;
  features: string[];
  tags: string[];
  isActive: boolean;
  changeSummary?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  createdBy?: string;
  createdByRole?: string;
  createdAt?: string;
  submittedBy?: string;
  submittedRole?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  reviewNotes?: string;
  partnerVisibility?: string;
}

export interface PartnerPackage {
  id: string;
  vendorId?: string;
  name: string;
  description?: string;
  category?: PackageCategory | string;
  basePrice: number;
  features: string[];
  tags: string[];
  isActive: boolean;
  workflowState?: string;
  currentVersionId?: string;
  latestVersion?: number;
  tenantId?: string;
  partnerVisibility?: string;
  createdAt?: string;
  updatedAt?: string;
  versions?: PartnerPackageVersion[];
  documents?: PartnerPackageDocument[];
}

export type PackageDefinition = PartnerPackage;

export interface PartnerPackageCreateRequest {
  name: string;
  description?: string;
  category: PackageCategory | string;
  basePrice: number;
  features: string[];
  tags?: string[];
  vendorId?: string;
  tenantId?: string;
  changeSummary?: string;
  partnerVisibility?: string;
}

export type PartnerPackageVersionDraftRequest = Partial<{
  name: string;
  description: string;
  category: PackageCategory | string;
  basePrice: number;
  features: string[];
  tags: string[];
  isActive: boolean;
  vendorId: string;
  changeSummary: string;
  partnerVisibility: string;
}>;

export interface PartnerPackageSubmitRequest {
  comment?: string;
}

export interface Vendor {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  logoFile?: File | null;
  website?: string;
  contactEmail?: string;
  phone?: string;
  isActive?: boolean;
}

export type UpdateVendorRequest = Partial<CreateVendorRequest>;

export interface AnalyticsOverview {
  totalPolicies: number;
  activePolicies: number;
  totalRevenue: number;
  monthlyGrowth: number;
  topPackages: { name: string; count: number }[];
}

export interface SalesData {
  date: string;
  policies: number;
  revenue: number;
}

export interface AnalyticsSummary {
  // Real bot data
  policies?: {
    total: number;
    active: number;
    inactive: number;
  };
  customers?: {
    total: number;
  };
  quotes?: {
    total: number;
  };
  payments?: {
    total: number;
    completed: number;
    pending: number;
  };
  conversations?: {
    total: number;
  };
  // Admin data
  packages: {
    total: number;
    active: number;
    inactive: number;
    pendingReview: number;
    approvalsLast7Days: number;
  };
  vendors: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  security: {
    activeSessions: number;
    twoFactorEnabled: number;
    totalAdmins: number;
  };
  eventsLast24h: number;
  eventsByDay: { date: string; count: number }[];
  topEvents: { event: string; count: number }[];
}

export interface AnalyticsEvent {
  id: string;
  event: string;
  namespace?: string;
  actorId?: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  usersByPlan: { name: string; count: number }[];
}

export interface PricingRates {
  baseRates: Record<string, number>;
  discounts: Discount[];
}

export interface Discount {
  id?: string;
  type: 'percentage' | 'fixed';
  value: number;
  code: string;
  validUntil?: string;
  minPurchase?: number;
  isActive?: boolean;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: 'active' | 'inactive' | 'pending';
  category?: string;
  startDate?: string;
  endDate?: string;
  vendorId?: string;
  workflowState?: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
}

export interface PolicyDocument {
  id: string;
  packageId: string;
  fileName: string;
  fileSize?: number;
  contentType?: string;
  uploadedAt: string;
  downloadUrl: string;
}

export interface PolicyRecord {
  id: number;
  holderName: string;
  product: string;
  details?: string;
  policyNumber: string;
  expiryDate?: string;
  premium?: number | null;
  status: string;
  userId: string;
  createdAt?: string;
}

export interface PolicyListResponse {
  items: PolicyRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ============================================
// Quotes, Customers, Payments
// ============================================

export interface Quote {
  id: string;
  customerId?: string | null;
  tenantId?: string | null;
  productKey: string;
  source: string;
  
  // Contact info
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  
  // Motor-specific
  vehicleType?: string | null;
  makeModel?: string | null;
  year?: number | null;
  estValue?: number | null;
  
  // Coverage
  coverType: string;
  durationMonths: number;
  addons?: string | null;
  
  // Pricing
  premium: number;
  fees: number;
  taxes: number;
  totalAmount: number;
  currency: string;
  
  // Risk data
  riskData?: Record<string, any> | null;
  
  // Status
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted' | 'expired';
  
  // Timestamps
  createdAt?: string | null;
  updatedAt?: string | null;
  expiresAt?: string | null;
  
  // Customer details (joined)
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface QuoteCreateRequest {
  customerId?: string;
  tenantId?: string;
  productKey: string;
  source?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  vehicleType?: string;
  makeModel?: string;
  year?: number;
  estValue?: number;
  coverType: string;
  durationMonths?: number;
  addons?: string;
  premium: number;
  fees?: number;
  taxes?: number;
  currency?: string;
  riskData?: Record<string, any>;
}

export interface QuoteUpdateRequest {
  customerId?: string;
  status?: string;
  premium?: number;
  fees?: number;
  taxes?: number;
}

export interface QuoteConvertRequest {
  skipPaymentCheck?: boolean;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  tenantId?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  
  // Aggregated data
  quotesCount?: number;
  policiesCount?: number;
  totalPremium?: number;
}

export interface CustomerCreateRequest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  city?: string;
  country?: string;
  tenantId?: string;
  userId?: string;
}

export interface CustomerUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface Invoice {
  id: string;
  customerId?: string | null;
  quoteId?: string | null;
  policyId?: string | null;
  tenantId?: string | null;
  
  invoiceNumber: string;
  amount: number;
  fees: number;
  taxes: number;
  totalAmount: number;
  currency: string;
  
  provider: string;
  providerRef?: string | null;
  
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  
  createdAt?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  
  metadata?: Record<string, any> | null;
  notes?: string | null;
  
  // Joined data
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface InvoiceCreateRequest {
  customerId?: string;
  quoteId?: string;
  policyId?: string;
  tenantId?: string;
  amount: number;
  fees?: number;
  taxes?: number;
  currency?: string;
  provider?: string;
  dueDate?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId?: string | null;
  tenantId?: string | null;
  
  amount: number;
  currency: string;
  method: string;
  
  mpesaReceiptNo?: string | null;
  mpesaPhone?: string | null;
  mpesaCheckoutRequestId?: string | null;
  mpesaMerchantRequestId?: string | null;
  
  provider: string;
  providerRef?: string | null;
  providerStatus?: string | null;
  
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  
  errorMessage?: string | null;
  
  createdAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
}

export interface MpesaStkPushRequest {
  invoiceId?: string;
  quoteId?: string;
  amount: number;
  phone: string;
  accountReference?: string;
  transactionDesc?: string;
}

export interface MpesaStkPushResponse {
  checkoutRequestId: string;
  merchantRequestId: string;
  invoiceId: string;
  paymentId: string;
  status: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  invoiceId: string;
  status: string;
  amount?: number | null;
  mpesaReceiptNo?: string | null;
  errorMessage?: string | null;
}

export interface PolicyUpdatePayload {
  holderName?: string;
  details?: string;
  expiryDate?: string;
  premium?: number;
  status?: string;
}

export interface PartnerNotification {
  id: string;
  kind: string;
  title: string;
  body?: string;
  status: string;
  payload: Record<string, any>;
  recipientUserId?: string;
  recipientRole?: string;
  tenantId?: string;
  createdAt?: string;
  readAt?: string;
}

export type PartnerOnboardingData = Record<string, any>;

export interface PartnerOnboardingRequest {
  id: string;
  userId: string;
  vendorId?: string | null;
  tenantId?: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  data: PartnerOnboardingData;
  createdAt?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  tenant?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  user?: { id: string; email?: string; name?: string; role?: string } | null;
}

export interface PartnerOnboardingCreatePayload {
  userId: string;
  vendorId?: string | null;
  tenantId?: string | null;
  data?: PartnerOnboardingData;
}

export interface PartnerOnboardingUpdatePayload {
  vendorId?: string | null;
  tenantId?: string | null;
  data?: PartnerOnboardingData;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface PartnerOnboardingDecisionPayload {
  reason?: string;
}

export interface PartnerOnboardingSubmitPayload {
  data: PartnerOnboardingData;
}

export interface DistributionChannel {
  id: string;
  tenantId?: string | null;
  name: string;
  channelType: string;
  config: Record<string, any>;
  status: string;
  lastSyncedAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DistributionChannelCreatePayload {
  name: string;
  channelType: string;
  config?: Record<string, any>;
  tenantId?: string | null;
  status?: string | null;
}

export interface DistributionChannelUpdatePayload {
  name?: string;
  channelType?: string;
  config?: Record<string, any>;
  tenantId?: string | null;
  status?: string | null;
}

export interface DistributionChannelSyncPayload {
  status: string;
  message?: string;
}

export interface AutomationJob {
  id: string;
  tenantId?: string | null;
  jobType: string;
  name: string;
  payload: Record<string, any>;
  scheduleAt?: string | null;
  status: string;
  lastRunAt?: string | null;
  lastRunStatus?: string | null;
  createdBy?: string | null;
  createdByRole?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AutomationJobCreatePayload {
  jobType: string;
  name: string;
  payload?: Record<string, any>;
  scheduleAt?: string | null;
  tenantId?: string | null;
  status?: string | null;
}

export interface AutomationJobUpdatePayload {
  jobType?: string;
  name?: string;
  payload?: Record<string, any>;
  scheduleAt?: string | null;
  tenantId?: string | null;
  status?: string | null;
}

export interface AutomationRun {
  id: string;
  jobId: string;
  status: string;
  executedAt?: string | null;
  message?: string | null;
}

export type AdminUserRole = 'admin' | 'agent' | 'support';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminUserRole;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  meta?: Record<string, unknown>;
}

export interface CreateAdminUserPayload {
  email: string;
  name: string;
  role: AdminUserRole;
  isActive?: boolean;
  sendInvite?: boolean;
}

export interface UpdateAdminUserPayload {
  name?: string;
  role?: AdminUserRole;
}

export interface UpdateAdminUserStatusPayload {
  isActive: boolean;
}

export interface ResetAdminUserPayload {
  sendEmail?: boolean;
}

export interface AdminSession {
  id: string;
  createdAt?: string;
  lastSeenAt?: string;
  ipAddress?: string;
  userAgent?: string;
  revokedAt?: string;
  active: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}

export interface PolicyVersion {
  id: string;
  packageId?: string;
  version: number;
  name: string;
  description?: string;
  category?: string;
  basePrice: number;
  features: string[];
  tags: string[];
  isActive: boolean;
  changeSummary?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  partnerVisibility?: 'pending' | 'visible' | 'hidden';
  createdBy?: string;
  createdAt?: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface PackageVersionDraftRequest {
  name?: string;
  description?: string;
  category?: string;
  basePrice?: number;
  features?: string[];
  tags?: string[];
  isActive?: boolean;
  vendorId?: string;
  changeSummary?: string;
}

export interface PackageVersionSubmitRequest {
  comment?: string;
}

export interface PackageVersionDecisionRequest {
  reason?: string;
}

export interface PendingPackageReview {
  id: string;
  packageId: string;
  versionNumber: number;
  name?: string;
  description?: string;
  category?: PackageCategory | string;
  basePrice?: number;
  features: string[];
  tags: string[];
  isActive: boolean;
  changeSummary?: string;
  status: string;
  createdBy?: string;
  createdByRole?: string;
  createdAt?: string;
  submittedBy?: string;
  submittedRole?: string;
  submittedAt?: string;
  rejectedReason?: string;
  reviewNotes?: string;
  vendorId?: string;
  tenantId?: string;
  partnerVisibility?: string;
  workflowState?: string;
}

export interface PackageBulkActionRequest {
  packageIds: string[];
  action: string;
  tags?: string[];
}

export interface WorkflowListItem {
  key: string;
  title: string;
  version: number;
}

export interface WorkflowDetail {
  key: string;
  title: string;
  version: number;
  flow: Record<string, any>;
}

export interface WorkflowSession {
  session_id: string;
}

export interface WorkflowSubmitResponse {
  quote_id: string;
  status: string;
}

export interface WorkflowQuoteStatus {
  id: string;
  status: string;
  price?: number;
  rating_source?: string;
}

export interface WorkflowValidationError {
  field: string;
  message: string;
}
