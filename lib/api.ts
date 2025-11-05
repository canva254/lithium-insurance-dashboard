import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetRequestPayload,
  PasswordResetConfirmPayload,
  PasswordResetRequestResponse,
  User,
  InsurancePackage,
  FilterParams,
  CreatePackageRequest,
  UpdatePackageRequest,
  PackageVersionDraftRequest,
  PackageVersionSubmitRequest,
  PackageVersionDecisionRequest,
  PackageBulkActionRequest,
  PolicyVersion,
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  PricingRates,
  Discount,
  AnalyticsOverview,
  AnalyticsSummary,
  AnalyticsEvent,
  SalesData,
  UserStats,
  WorkflowListItem,
  WorkflowDetail,
  WorkflowSession,
  WorkflowSubmitResponse,
  WorkflowQuoteStatus,
  PolicyDocument,
  AdminUser,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  UpdateAdminUserStatusPayload,
  ResetAdminUserPayload,
  AdminSession,
  TwoFactorSetup,
  ServiceDefinition,
  ServiceUpdatePayload,
  TenantDefinition,
  TenantCreatePayload,
  TenantUpdatePayload,
  TenantServiceOverride,
  TenantServiceOverrideRequest,
  TenantAISettings,
  TenantAISettingsUpdatePayload,
  PartnerPackage,
  PartnerPackageCreateRequest,
  PartnerPackageVersionDraftRequest,
  PartnerPackageSubmitRequest,
  PartnerPackageVersion,
  PartnerPackageDocument,
  PartnerNotification,
  PendingPackageReview,
  PartnerOnboardingRequest,
  PartnerOnboardingCreatePayload,
  PartnerOnboardingUpdatePayload,
  PartnerOnboardingDecisionPayload,
  PartnerOnboardingSubmitPayload,
  DistributionChannel,
  DistributionChannelCreatePayload,
  DistributionChannelUpdatePayload,
  DistributionChannelSyncPayload,
  AutomationJob,
  AutomationJobCreatePayload,
  AutomationJobUpdatePayload,
  AutomationRun,
  PolicyListResponse,
  PolicyRecord,
  PolicyUpdatePayload,
  Quote,
  QuoteCreateRequest,
  QuoteUpdateRequest,
  QuoteConvertRequest,
  Customer,
  CustomerCreateRequest,
  CustomerUpdateRequest,
  Invoice,
  InvoiceCreateRequest,
  Payment,
  MpesaStkPushRequest,
  MpesaStkPushResponse,
  PaymentStatusResponse,
} from '@/types/api';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    timeout: 30000,
    withCredentials: true,
  });

  instance.interceptors.request.use(
    async (config) => {
      if (typeof window !== 'undefined') {
        const session = (await getSession()) as (Session & { accessToken?: string; csrfToken?: string }) | null;
        const token = session?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (session?.csrfToken) {
          config.headers['X-CSRF-Token'] = session.csrfToken;
        }
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<any>>) => {
      if (response.data && typeof response.data === 'object') {
        return {
          ...response,
          data: {
            success: true,
            data: response.data.data ?? response.data,
            message: response.data.message ?? '',
          },
        } as AxiosResponse<ApiResponse<any>>;
      }
      return response;
    },
    (error) => {
      // DISABLED: Auto-logout on 401 causes infinite loops
      // Only logout on explicit authentication failures, not all 401s
      // if (typeof window !== 'undefined' && error.response?.status === 401) {
      //   signOut({ callbackUrl: '/login' }).catch(() => {
      //     // ignore sign-out errors
      //   });
      // }

      const responseData = error.response?.data;
      const formattedError = {
        success: false,
        message: responseData?.message || error.message || 'An error occurred',
        data: responseData?.data ?? responseData ?? null,
        status: error.response?.status,
      };

      return Promise.reject(formattedError);
    },
  );

  return instance;
};

const api = createApiClient();

const unwrap = async <T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<ApiResponse<T>> => {
  const response = await promise;
  return response.data;
};

export const authAPI = {
  login: (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    unwrap(api.post('/admin/auth/login', credentials)),
  logout: (refreshToken: string): Promise<ApiResponse<void>> =>
    unwrap(api.post('/admin/auth/logout', { refreshToken })),
  getProfile: (): Promise<ApiResponse<User>> => unwrap(api.get('/admin/auth/me')),
  refreshToken: (refreshToken: string): Promise<ApiResponse<LoginResponse>> =>
    unwrap(api.post('/admin/auth/refresh-token', { refreshToken })),
  requestPasswordReset: (payload: PasswordResetRequestPayload): Promise<ApiResponse<PasswordResetRequestResponse>> =>
    unwrap(api.post('/admin/auth/password-reset/request', payload)),
  confirmPasswordReset: (payload: PasswordResetConfirmPayload): Promise<ApiResponse<void>> =>
    unwrap(api.post('/admin/auth/password-reset/confirm', payload)),
  setupTwoFactor: (): Promise<ApiResponse<TwoFactorSetup>> => unwrap(api.post('/admin/auth/2fa/setup')),
  enableTwoFactor: (code: string): Promise<ApiResponse<{ twoFactorEnabled: boolean }>> =>
    unwrap(api.post('/admin/auth/2fa/enable', { code })),
  disableTwoFactor: (code: string): Promise<ApiResponse<{ twoFactorEnabled: boolean }>> =>
    unwrap(api.post('/admin/auth/2fa/disable', { code })),
  listSessions: (): Promise<ApiResponse<AdminSession[]>> => unwrap(api.get('/admin/auth/sessions')),
  revokeSession: (sessionId: string, reason?: string): Promise<ApiResponse<void>> =>
    unwrap(api.post(`/admin/auth/sessions/${sessionId}/revoke`, { reason })),
};

export const packagesAPI = {
  getAll: (params?: FilterParams): Promise<ApiResponse<InsurancePackage[]>> =>
    unwrap(api.get('/admin/packages', { params })),
  getById: (id: string): Promise<ApiResponse<InsurancePackage>> => unwrap(api.get(`/admin/packages/${id}`)),
  create: (data: CreatePackageRequest): Promise<ApiResponse<InsurancePackage>> =>
    unwrap(api.post('/admin/packages', data)),
  update: (id: string, data: UpdatePackageRequest): Promise<ApiResponse<InsurancePackage>> =>
    unwrap(api.put(`/admin/packages/${id}`, data)),
  delete: (id: string): Promise<ApiResponse<void>> => unwrap(api.delete(`/admin/packages/${id}`)),
  toggleStatus: (id: string, isActive: boolean): Promise<ApiResponse<InsurancePackage>> =>
    unwrap(api.patch(`/admin/packages/${id}/status`, { isActive })),
  createVersion: (id: string, data: PackageVersionDraftRequest): Promise<ApiResponse<PolicyVersion>> =>
    unwrap(api.post(`/admin/packages/${id}/versions`, data)),
  listVersions: (id: string): Promise<ApiResponse<PolicyVersion[]>> =>
    unwrap(api.get(`/admin/packages/${id}/versions`)),
  getVersion: (packageId: string, versionId: string): Promise<ApiResponse<PolicyVersion>> =>
    unwrap(api.get(`/admin/packages/${packageId}/versions/${versionId}`)),
  submitVersion: (
    packageId: string,
    versionId: string,
    data?: PackageVersionSubmitRequest,
  ): Promise<ApiResponse<PolicyVersion>> => unwrap(api.post(`/admin/packages/${packageId}/versions/${versionId}/submit`, data ?? {})),
  approveVersion: (packageId: string, versionId: string): Promise<ApiResponse<PolicyVersion>> =>
    unwrap(api.post(`/admin/packages/${packageId}/versions/${versionId}/approve`, {})),
  rejectVersion: (
    packageId: string,
    versionId: string,
    data: PackageVersionDecisionRequest,
  ): Promise<ApiResponse<PolicyVersion>> =>
    unwrap(api.post(`/admin/packages/${packageId}/versions/${versionId}/reject`, data)),
  bulk: (data: PackageBulkActionRequest): Promise<ApiResponse<{ updated: number; packageIds: string[] }>> =>
    unwrap(api.post('/admin/packages/bulk', data)),
  listDocuments: (id: string): Promise<ApiResponse<PolicyDocument[]>> =>
    unwrap(api.get(`/admin/packages/${id}/documents`)),
  uploadDocument: (id: string, file: File): Promise<ApiResponse<PolicyDocument>> => {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap(
      api.post(`/admin/packages/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
  deleteDocument: (packageId: string, documentId: string): Promise<ApiResponse<void>> =>
    unwrap(api.delete(`/admin/packages/${packageId}/documents/${documentId}`)),
  downloadDocument: async (packageId: string, documentId: string): Promise<Blob> => {
    const response = await api.get(`/admin/packages/${packageId}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export const policiesAPI = {
  list: (
    params?: {
      status?: string;
      product?: string;
      q?: string;
      userId?: string;
      policyNumber?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<ApiResponse<PolicyListResponse>> => unwrap(api.get('/admin/policies', { params })),
  getById: (policyId: number): Promise<ApiResponse<PolicyRecord>> => unwrap(api.get(`/admin/policies/${policyId}`)),
  update: (policyId: number, payload: PolicyUpdatePayload): Promise<ApiResponse<PolicyRecord>> =>
    unwrap(api.patch(`/admin/policies/${policyId}`, payload)),
  remove: (policyId: number): Promise<ApiResponse<void>> => unwrap(api.delete(`/admin/policies/${policyId}`)),
};

export const usersAPI = {
  getAll: (params?: { search?: string; role?: string; status?: 'active' | 'inactive' }): Promise<ApiResponse<AdminUser[]>> =>
    unwrap(api.get('/admin/users', { params })),
  create: (data: CreateAdminUserPayload): Promise<ApiResponse<AdminUser>> => unwrap(api.post('/admin/users', data)),
  update: (id: string, data: UpdateAdminUserPayload): Promise<ApiResponse<AdminUser>> =>
    unwrap(api.put(`/admin/users/${id}`, data)),
  updateStatus: (id: string, data: UpdateAdminUserStatusPayload): Promise<ApiResponse<AdminUser>> =>
    unwrap(api.patch(`/admin/users/${id}/status`, data)),
  resetPassword: (id: string, data: ResetAdminUserPayload): Promise<ApiResponse<AdminUser>> =>
    unwrap(api.post(`/admin/users/${id}/reset-password`, data)),
};

export const tenantsAPI = {
  list: (includeInactive = false): Promise<ApiResponse<TenantDefinition[]>> =>
    unwrap(api.get('/admin/tenants', { params: { include_inactive: includeInactive } })),
  create: (payload: TenantCreatePayload): Promise<ApiResponse<TenantDefinition>> =>
    unwrap(api.post('/admin/tenants', payload)),
  update: (tenantId: string, payload: TenantUpdatePayload): Promise<ApiResponse<TenantDefinition>> =>
    unwrap(api.patch(`/admin/tenants/${tenantId}`, payload)),
  listServiceOverrides: (tenantId: string): Promise<ApiResponse<TenantServiceOverride[]>> =>
    unwrap(api.get(`/admin/tenants/${tenantId}/service-overrides`)),
  upsertServiceOverride: (
    tenantId: string,
    serviceId: string,
    payload: TenantServiceOverrideRequest,
  ): Promise<ApiResponse<TenantServiceOverride>> =>
    unwrap(api.put(`/admin/tenants/${tenantId}/service-overrides/${serviceId}`, payload)),
};

export const aiSettingsAPI = {
  list: (): Promise<ApiResponse<TenantAISettings[]>> => unwrap(api.get('/admin/ai/settings')),
  get: (tenantId: string): Promise<ApiResponse<TenantAISettings>> =>
    unwrap(api.get(`/admin/tenants/${tenantId}/ai-settings`)),
  update: (tenantId: string, payload: TenantAISettingsUpdatePayload): Promise<ApiResponse<TenantAISettings>> =>
    unwrap(api.put(`/admin/tenants/${tenantId}/ai-settings`, payload)),
};

export const distributionAPI = {
  list: (
    params?: { tenant_id?: string; status?: string },
  ): Promise<ApiResponse<DistributionChannel[]>> => unwrap(api.get('/admin/distribution/channels', { params })),
  create: (
    payload: DistributionChannelCreatePayload,
  ): Promise<ApiResponse<DistributionChannel>> => unwrap(api.post('/admin/distribution/channels', payload)),
  update: (
    channelId: string,
    payload: DistributionChannelUpdatePayload,
  ): Promise<ApiResponse<DistributionChannel>> => unwrap(api.patch(`/admin/distribution/channels/${channelId}`, payload)),
  remove: (channelId: string): Promise<ApiResponse<{ id: string }>> =>
    unwrap(api.delete(`/admin/distribution/channels/${channelId}`)),
  logSync: (
    channelId: string,
    payload: DistributionChannelSyncPayload,
  ): Promise<ApiResponse<DistributionChannel>> => unwrap(api.post(`/admin/distribution/channels/${channelId}/sync`, payload)),
};

export const onboardingAPI = {
  list: (
    params?: { status?: string; tenant_id?: string; user_id?: string; limit?: number },
  ): Promise<ApiResponse<PartnerOnboardingRequest[]>> => unwrap(api.get('/admin/onboarding/requests', { params })),
  create: (payload: PartnerOnboardingCreatePayload): Promise<ApiResponse<PartnerOnboardingRequest>> =>
    unwrap(api.post('/admin/onboarding/requests', payload)),
  update: (
    requestId: string,
    payload: PartnerOnboardingUpdatePayload,
  ): Promise<ApiResponse<PartnerOnboardingRequest>> => unwrap(api.put(`/admin/onboarding/requests/${requestId}`, payload)),
  approve: (
    requestId: string,
    payload?: PartnerOnboardingDecisionPayload,
  ): Promise<ApiResponse<PartnerOnboardingRequest>> =>
    unwrap(api.post(`/admin/onboarding/requests/${requestId}/approve`, payload ?? {})),
  reject: (
    requestId: string,
    payload: PartnerOnboardingDecisionPayload,
  ): Promise<ApiResponse<PartnerOnboardingRequest>> =>
    unwrap(api.post(`/admin/onboarding/requests/${requestId}/reject`, payload)),
};

export const partnerAPI = {
  getTenant: (tenantId?: string): Promise<ApiResponse<TenantDefinition>> =>
    unwrap(api.get('/partner/tenant', { params: tenantId ? { tenant_id: tenantId } : undefined })),
  listServices: (
    params?: { include_disabled?: boolean; include_global?: boolean; tenant_id?: string },
  ): Promise<ApiResponse<ServiceDefinition[]>> =>
    unwrap(api.get('/partner/services', { params })),
  listPackages: (
    params?: {
      include_documents?: boolean;
      include_versions?: boolean;
      vendor_id?: string;
      tenant_id?: string;
    },
  ): Promise<ApiResponse<PartnerPackage[]>> => unwrap(api.get('/partner/packages', { params })),
  getPackage: (
    packageId: string,
    params?: { tenant_id?: string },
  ): Promise<ApiResponse<PartnerPackage>> => unwrap(api.get(`/partner/packages/${packageId}`, { params })),
  createPackage: (payload: PartnerPackageCreateRequest): Promise<ApiResponse<PartnerPackage>> =>
    unwrap(api.post('/partner/packages', payload)),
  createPackageVersion: (
    packageId: string,
    payload: PartnerPackageVersionDraftRequest,
  ): Promise<ApiResponse<PartnerPackageVersion>> => unwrap(api.post(`/partner/packages/${packageId}/versions`, payload)),
  updatePackageVersion: (
    packageId: string,
    versionId: string,
    payload: PartnerPackageVersionDraftRequest,
  ): Promise<ApiResponse<PartnerPackageVersion>> =>
    unwrap(api.patch(`/partner/packages/${packageId}/versions/${versionId}`, payload)),
  submitPackageVersion: (
    packageId: string,
    versionId: string,
    payload?: PartnerPackageSubmitRequest,
  ): Promise<ApiResponse<PartnerPackageVersion>> =>
    unwrap(api.post(`/partner/packages/${packageId}/versions/${versionId}/submit`, payload ?? {})),
  listPackageVersions: (
    packageId: string,
    params?: { tenant_id?: string },
  ): Promise<ApiResponse<PartnerPackageVersion[]>> =>
    unwrap(api.get(`/partner/packages/${packageId}/versions`, { params })),
  listPackageDocuments: (
    packageId: string,
    params?: { tenant_id?: string },
  ): Promise<ApiResponse<PartnerPackageDocument[]>> =>
    unwrap(api.get(`/partner/packages/${packageId}/documents`, { params })),
  uploadPackageDocument: (
    packageId: string,
    file: File,
    params?: { tenant_id?: string },
  ): Promise<ApiResponse<PartnerPackageDocument>> => {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap(
      api.post(`/partner/packages/${packageId}/documents`, formData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
  getOnboardingRequest: (): Promise<ApiResponse<PartnerOnboardingRequest | null>> =>
    unwrap(api.get('/partner/onboarding/request')),
  saveOnboardingDraft: (
    payload: PartnerOnboardingSubmitPayload,
  ): Promise<ApiResponse<PartnerOnboardingRequest>> => unwrap(api.put('/partner/onboarding/request', payload)),
  submitOnboarding: (
    payload: PartnerOnboardingSubmitPayload,
  ): Promise<ApiResponse<PartnerOnboardingRequest>> => unwrap(api.post('/partner/onboarding/request/submit', payload)),
  listNotifications: (status?: string): Promise<ApiResponse<PartnerNotification[]>> =>
    unwrap(api.get('/partner/notifications', { params: status ? { status } : undefined })),
  markNotificationRead: (notificationId: string): Promise<ApiResponse<PartnerNotification>> =>
    unwrap(api.post(`/partner/notifications/${notificationId}/read`, {})),
};

export const reviewAPI = {
  listPendingPackageReviews: (
    params?: { tenant_id?: string; limit?: number },
  ): Promise<ApiResponse<PendingPackageReview[]>> => unwrap(api.get('/admin/reviews/pending/packages', { params })),
};

export const automationAPI = {
  listJobs: (
    params?: { tenant_id?: string; status?: string },
  ): Promise<ApiResponse<AutomationJob[]>> => unwrap(api.get('/admin/automation/jobs', { params })),
  createJob: (
    payload: AutomationJobCreatePayload,
  ): Promise<ApiResponse<AutomationJob>> => unwrap(api.post('/admin/automation/jobs', payload)),
  updateJob: (
    jobId: string,
    payload: AutomationJobUpdatePayload,
  ): Promise<ApiResponse<AutomationJob>> => unwrap(api.patch(`/admin/automation/jobs/${jobId}`, payload)),
  deleteJob: (jobId: string): Promise<ApiResponse<{ id: string }>> =>
    unwrap(api.delete(`/admin/automation/jobs/${jobId}`)),
  recordRun: (
    jobId: string,
    payload: { status: string; message?: string; jobStatus?: string },
  ): Promise<ApiResponse<AutomationJob>> => unwrap(api.post(`/admin/automation/jobs/${jobId}/run`, payload)),
  listRuns: (jobId: string, limit = 50): Promise<ApiResponse<AutomationRun[]>> =>
    unwrap(api.get(`/admin/automation/jobs/${jobId}/runs`, { params: { limit } })),
};

export const vendorsAPI = {
  getAll: (params?: FilterParams): Promise<ApiResponse<Vendor[]>> => unwrap(api.get('/admin/vendors', { params })),
  getById: (id: string): Promise<ApiResponse<Vendor>> => unwrap(api.get(`/admin/vendors/${id}`)),
  create: (data: CreateVendorRequest): Promise<ApiResponse<Vendor>> =>
    unwrap(
      api.post('/admin/vendors', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  update: (id: string, data: UpdateVendorRequest): Promise<ApiResponse<Vendor>> =>
    unwrap(
      api.put(`/admin/vendors/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),
  delete: (id: string): Promise<ApiResponse<void>> => unwrap(api.delete(`/admin/vendors/${id}`)),
};

export const pricingAPI = {
  getRates: (): Promise<ApiResponse<PricingRates>> => unwrap(api.get('/admin/pricing/rates')),
  updateRates: (data: Partial<PricingRates>): Promise<ApiResponse<PricingRates>> =>
    unwrap(api.post('/admin/pricing/rates', data)),
  getDiscounts: (): Promise<ApiResponse<Discount[]>> => unwrap(api.get('/admin/pricing/discounts')),
  createDiscount: (data: Omit<Discount, 'id'>): Promise<ApiResponse<Discount>> =>
    unwrap(api.post('/admin/pricing/discounts', data)),
  updateDiscount: (id: string, data: Partial<Discount>): Promise<ApiResponse<Discount>> =>
    unwrap(api.put(`/admin/pricing/discounts/${id}`, data)),
  deleteDiscount: (id: string): Promise<ApiResponse<void>> => unwrap(api.delete(`/admin/pricing/discounts/${id}`)),
};

export const analyticsAPI = {
  getSummary: (): Promise<ApiResponse<AnalyticsSummary>> => unwrap(api.get('/admin/analytics/summary')),
  getEvents: (limit = 50): Promise<ApiResponse<AnalyticsEvent[]>> =>
    unwrap(api.get('/admin/analytics/events', { params: { limit } })),
  getOverview: (): Promise<ApiResponse<AnalyticsOverview>> => unwrap(api.get('/admin/analytics/overview')),
  getSales: (period = 'monthly'): Promise<ApiResponse<SalesData[]>> =>
    unwrap(api.get(`/admin/analytics/sales?period=${period}`)),
  getUserStats: (): Promise<ApiResponse<UserStats>> => unwrap(api.get('/admin/analytics/user-stats')),
  getPolicyStats: (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<any>> =>
    unwrap(api.get('/admin/analytics/policy-stats', { params })),
};

export const servicesAPI = {
  list: (includeDisabled = true): Promise<ApiResponse<ServiceDefinition[]>> =>
    unwrap(api.get('/admin/services', { params: { include_disabled: includeDisabled } })),
  create: (payload: any): Promise<ApiResponse<ServiceDefinition>> =>
    unwrap(api.post('/admin/services', payload)),
  update: (key: string, payload: ServiceUpdatePayload): Promise<ApiResponse<ServiceDefinition>> =>
    unwrap(api.patch(`/admin/services/${key}`, payload)),
  delete: (key: string): Promise<ApiResponse<void>> =>
    unwrap(api.delete(`/admin/services/${key}`)),
};

export const workflowAPI = {
  list: (): Promise<ApiResponse<WorkflowListItem[]>> => unwrap(api.get('/admin/workflows')),
  get: (key: string): Promise<ApiResponse<WorkflowDetail>> => unwrap(api.get(`/admin/workflows/${key}`)),
  createSession: (
    key: string,
    initialData: Record<string, unknown> = {},
  ): Promise<ApiResponse<WorkflowSession>> => unwrap(api.post(`/admin/workflows/${key}/sessions`, { initialData })),
  patchSession: (
    sessionId: string,
    dataPatch: Record<string, unknown>,
  ): Promise<ApiResponse<{ status: string }>> =>
    unwrap(api.patch(`/admin/workflows/sessions/${sessionId}`, { dataPatch })),
  submitSession: (sessionId: string): Promise<ApiResponse<WorkflowSubmitResponse>> =>
    unwrap(api.post(`/admin/workflows/sessions/${sessionId}/submit`)),
  getQuote: (quoteId: string): Promise<ApiResponse<WorkflowQuoteStatus>> =>
    unwrap(api.get(`/admin/workflows/quotes/${quoteId}`)),
};

// ============================================
// Quotes API
// ============================================
export const quotesAPI = {
  list: (params?: {
    status?: string;
    product_key?: string;
    source?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Quote[]>> => unwrap(api.get('/admin/quotes', { params })),
  
  getById: (id: string): Promise<ApiResponse<Quote>> => unwrap(api.get(`/admin/quotes/${id}`)),
  
  update: (id: string, data: QuoteUpdateRequest): Promise<ApiResponse<Quote>> =>
    unwrap(api.patch(`/admin/quotes/${id}`, data)),
  
  convert: (id: string, data?: QuoteConvertRequest): Promise<ApiResponse<{ success: boolean; policyId: string; message: string }>> =>
    unwrap(api.post(`/admin/quotes/${id}/convert`, data || {})),
};

// ============================================
// Customers API
// ============================================
export const customersAPI = {
  list: (params?: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Customer[]>> => unwrap(api.get('/admin/customers', { params })),
  
  getById: (id: string): Promise<ApiResponse<Customer>> => unwrap(api.get(`/admin/customers/${id}`)),
  
  create: (data: CustomerCreateRequest): Promise<ApiResponse<Customer>> =>
    unwrap(api.post('/admin/customers', data)),
  
  update: (id: string, data: CustomerUpdateRequest): Promise<ApiResponse<Customer>> =>
    unwrap(api.patch(`/admin/customers/${id}`, data)),
};

// ============================================
// Payments API
// ============================================
export const paymentsAPI = {
  initiateMpesa: (data: MpesaStkPushRequest): Promise<ApiResponse<MpesaStkPushResponse>> =>
    unwrap(api.post('/payments/mpesa/stk/initiate', data)),
  
  getStatus: (params: { invoice_id?: string; payment_id?: string }): Promise<ApiResponse<PaymentStatusResponse>> =>
    unwrap(api.get('/payments/status', { params })),
  
  listInvoices: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Invoice[]>> => unwrap(api.get('/admin/invoices', { params })),
  
  listPayments: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Payment[]>> => unwrap(api.get('/admin/payments', { params })),
};


