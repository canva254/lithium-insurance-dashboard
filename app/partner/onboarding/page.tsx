'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  usePartnerOnboardingRequest,
  useSavePartnerOnboardingDraft,
  useSubmitPartnerOnboarding,
} from '@/hooks/useOnboarding';

const InputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const TextareaClass =
  'min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const ButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const PrimaryButtonClass =
  'inline-flex items-center justify-center rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  submitted: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

type OnboardingForm = {
  companyName: string;
  companyRegistration: string;
  companyWebsite: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  distributionFocus: string;
  integrations: string;
  notes: string;
};

const emptyForm = (): OnboardingForm => ({
  companyName: '',
  companyRegistration: '',
  companyWebsite: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  distributionFocus: '',
  integrations: '',
  notes: '',
});

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export default function PartnerOnboardingPage() {
  const onboardingQuery = usePartnerOnboardingRequest();
  const draftMutation = useSavePartnerOnboardingDraft();
  const submitMutation = useSubmitPartnerOnboarding();

  const request = onboardingQuery.data;
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!request) {
      setForm(emptyForm());
      return;
    }
    const data = request.data || {};
    setForm({
      companyName: data.companyName ?? '',
      companyRegistration: data.companyRegistration ?? '',
      companyWebsite: data.companyWebsite ?? '',
      contactName: data.contactName ?? '',
      contactEmail: data.contactEmail ?? '',
      contactPhone: data.contactPhone ?? '',
      distributionFocus: data.distributionFocus ?? '',
      integrations: data.integrations ?? '',
      notes: data.notes ?? '',
    });
  }, [request?.id, request?.data]);

  const submitting = submitMutation.isLoading;
  const saving = draftMutation.isLoading;
  const locked = request?.status === 'submitted' || request?.status === 'approved';

  const handleFieldChange = (field: keyof OnboardingForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buildPayload = () => {
    const existing = request?.data ?? {};
    return {
      ...existing,
      ...form,
    };
  };

  const handleSaveDraft = async () => {
    if (!request) return;
    setStatusMessage('');
    try {
      await draftMutation.mutateAsync({ data: buildPayload() });
      setStatusMessage('Draft saved successfully.');
    } catch (error) {
      setStatusMessage('Unable to save draft.');
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!request) return;
    setStatusMessage('');
    try {
      await submitMutation.mutateAsync({ data: buildPayload() });
      setStatusMessage('Submission sent for review.');
    } catch (error) {
      setStatusMessage('Unable to submit onboarding details.');
      console.error(error);
    }
  };

  const statusBadge = useMemo(() => {
    if (!request) return null;
    const style = STATUS_STYLES[request.status] ?? 'bg-muted text-foreground border-border';
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${style}`}>
        {request.status}
      </span>
    );
  }, [request?.status]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
          <p className="text-sm text-muted-foreground">
            Provide company details to help our team review and activate your partnership.
          </p>
        </div>
        {statusBadge}
      </header>

      {!request && !onboardingQuery.isLoading ? (
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          No onboarding request is currently assigned to your account. Contact support for assistance.
        </div>
      ) : null}

      {onboardingQuery.isLoading ? (
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Loading onboarding details…
        </div>
      ) : null}

      {request ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Company name
              </label>
              <input
                className={InputClass}
                value={form.companyName}
                onChange={(event) => handleFieldChange('companyName', event.target.value)}
                placeholder="Registered legal entity"
                disabled={locked}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Registration number
              </label>
              <input
                className={InputClass}
                value={form.companyRegistration}
                onChange={(event) => handleFieldChange('companyRegistration', event.target.value)}
                placeholder="Company or tax registration"
                disabled={locked}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Company website
              </label>
              <input
                className={InputClass}
                value={form.companyWebsite}
                onChange={(event) => handleFieldChange('companyWebsite', event.target.value)}
                placeholder="https://example.com"
                disabled={locked}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Distribution focus
              </label>
              <input
                className={InputClass}
                value={form.distributionFocus}
                onChange={(event) => handleFieldChange('distributionFocus', event.target.value)}
                placeholder="e.g. SME, embedded, brokers"
                disabled={locked}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Primary contact name
              </label>
              <input
                className={InputClass}
                value={form.contactName}
                onChange={(event) => handleFieldChange('contactName', event.target.value)}
                placeholder="Full name"
                disabled={locked}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact email
              </label>
              <input
                className={InputClass}
                value={form.contactEmail}
                onChange={(event) => handleFieldChange('contactEmail', event.target.value)}
                placeholder="name@example.com"
                disabled={locked}
                type="email"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact phone
              </label>
              <input
                className={InputClass}
                value={form.contactPhone}
                onChange={(event) => handleFieldChange('contactPhone', event.target.value)}
                placeholder="+254700000000"
                disabled={locked}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Integrations / systems
              </label>
              <input
                className={InputClass}
                value={form.integrations}
                onChange={(event) => handleFieldChange('integrations', event.target.value)}
                placeholder="CRM, policy admin, payment gateways"
                disabled={locked}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Additional notes
            </label>
            <textarea
              className={TextareaClass}
              value={form.notes}
              onChange={(event) => handleFieldChange('notes', event.target.value)}
              placeholder="Share integration timelines, certification requirements, or anything else we should know."
              disabled={locked}
            />
          </div>

          {request.rejectionReason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Review feedback: {request.rejectionReason}
            </div>
          )}

          <div className="grid gap-4 rounded-md border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <div className="font-semibold text-foreground">Created</div>
              <div>{formatDateTime(request.createdAt)}</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">Submitted</div>
              <div>{formatDateTime(request.submittedAt)}</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">Last decision</div>
              <div>{formatDateTime(request.approvedAt || request.rejectedAt)}</div>
            </div>
          </div>

          {statusMessage && (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {statusMessage}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={ButtonClass}
              onClick={handleSaveDraft}
              disabled={locked || saving}
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              className={PrimaryButtonClass}
              onClick={handleSubmit}
              disabled={locked || submitting}
            >
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
