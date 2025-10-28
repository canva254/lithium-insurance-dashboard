'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import {
  useCreateWorkflowSession,
  usePatchWorkflowSession,
  useSubmitWorkflowSession,
  useWorkflowDetail,
  useWorkflowList,
  useWorkflowQuote,
} from '@/hooks/useWorkflows';
import type { WorkflowValidationError } from '@/types/api';
import { EmptyState } from '@/components/empty-state';

type StepData = Record<string, unknown>;

export default function WorkflowsPage() {
  const workflowsQuery = useWorkflowList();
  const workflows = useMemo(() => workflowsQuery.data ?? [], [workflowsQuery.data]);
  const listLoading = workflowsQuery.isLoading;
  const listError = workflowsQuery.isError;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Map<string, StepData>>(new Map());
  const [validationErrors, setValidationErrors] = useState<WorkflowValidationError[]>([]);
  const [submissionResult, setSubmissionResult] = useState<{ quote_id: string; status: string } | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<{ id: string; status: string; price?: number; rating_source?: string } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflows.length) return;
    setSelectedKey((current) => current ?? workflows[0]?.key ?? null);
  }, [workflows]);

  const workflowDetailQuery = useWorkflowDetail(selectedKey ?? undefined, !!selectedKey);
  const createSession = useCreateWorkflowSession();
  const patchSession = usePatchWorkflowSession();
  const submitSession = useSubmitWorkflowSession();
  const quoteMutation = useWorkflowQuote();

  const steps = useMemo(() => {
    const rawSteps = (workflowDetailQuery.data?.flow as { steps?: any[] } | undefined)?.steps ?? [];
    return Array.isArray(rawSteps) ? rawSteps : [];
  }, [workflowDetailQuery.data?.flow]);

  const sanitizeKey = (input: unknown): string => {
    const key = typeof input === 'string' || typeof input === 'number' ? String(input) : '';
    return key.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  const currentStep = steps.at(stepIndex) ?? null;
  const currentStepKey = currentStep ? sanitizeKey(currentStep.id) : null; // eslint-disable-line security/detect-object-injection -- identifiers sanitized
  const currentStepData = currentStepKey ? stepData.get(currentStepKey) ?? {} : {};

  const generalValidationMessage = validationErrors.find((item) => item.field === '*' || item.field === '');

  const resetStateForSession = () => {
    setSessionId(null);
    setStepIndex(0);
    setStepData(new Map());
    setValidationErrors([]);
    setSubmissionResult(null);
    setQuoteStatus(null);
    setSessionError(null);
  };

  const startSessionForKey = async (key: string, cancelRef?: { current: boolean }) => {
    resetStateForSession();
    try {
      const response = await createSession.mutateAsync({ key });
      if (!cancelRef?.current) {
        setSessionId(response.data.session_id);
      }
    } catch (err: any) {
      if (!cancelRef?.current) {
        setSessionError(err?.message ?? 'Failed to start workflow session.');
      }
    }
  };

  useEffect(() => {
    if (!selectedKey) {
      return;
    }

    const cancelRef = { current: false };
    startSessionForKey(selectedKey, cancelRef);

    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    if (!currentStep) return;
    const stepKey = sanitizeKey(currentStep.id);
    const fieldKey = sanitizeKey(fieldId);
    if (!stepKey || !fieldKey) return;

    setStepData((prev) => {
      const next = new Map(prev);
      const previousFields = (next.get(stepKey) ?? {}) as StepData;
      next.set(stepKey, {
        ...previousFields,
        [fieldKey]: value,
      });
      return next;
    });
  };

  const handlePrevious = () => {
    setValidationErrors([]);
    setSessionError(null);
    setQuoteStatus(null);
    setSubmissionResult(null);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleAdvance = async () => {
    if (!sessionId || !currentStep) return;
    setValidationErrors([]);
    setSessionError(null);

    const payload = stepData.get(sanitizeKey(currentStep.id)) ?? {};

    try {
      await patchSession.mutateAsync({ sessionId, dataPatch: { [currentStep.id]: payload } });

      if (stepIndex + 1 < steps.length) {
        setStepIndex((prev) => prev + 1);
        return;
      }

      const result = await submitSession.mutateAsync(sessionId);
      setSubmissionResult(result.data);
      setQuoteStatus(null);
    } catch (err: any) {
      if (Array.isArray(err?.data?.errors)) {
        setValidationErrors(err.data.errors);
      } else {
        setSessionError(err?.message ?? 'Workflow action failed.');
      }
    }
  };

  const handleRestart = () => {
    if (!selectedKey) return;
    startSessionForKey(selectedKey);
  };

  const handleRefreshQuote = async () => {
    if (!submissionResult?.quote_id) return;
    setSessionError(null);
    try {
      const response = await quoteMutation.mutateAsync(submissionResult.quote_id);
      setQuoteStatus(response.data);
    } catch (err: any) {
      setSessionError(err?.message ?? 'Unable to fetch quote status.');
    }
  };

  if (listLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (listError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
        Unable to load workflows. Please try again.
      </div>
    );
  }

  if (!workflows.length) {
    return (
      <EmptyState
        title="No workflows available"
        description="Ensure the backend is reachable and seeded, then retry to load available simulations."
        action={
          <button
            onClick={() => workflowsQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        }
        className="min-h-[40vh]"
      />
    );
  }

  const isActionLoading = patchSession.isLoading || submitSession.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Workflow simulator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview JSON-driven flows and submit sessions against the quoting API.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <aside className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flows</h2>
          <nav className="mt-3 space-y-2">
            {workflows.map((workflow) => {
              const active = workflow.key === selectedKey;
              return (
                <button
                  key={workflow.key}
                  onClick={() => setSelectedKey(workflow.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="block font-medium text-foreground/90">{workflow.title}</span>
                  <span className="text-xs text-muted-foreground">v{workflow.version}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {workflowDetailQuery.isLoading || !workflowDetailQuery.data ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            </div>
          ) : steps.length === 0 ? (
            <div className="text-sm text-muted-foreground">This workflow does not define any steps yet.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{workflowDetailQuery.data.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Step {stepIndex + 1} of {steps.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRestart}
                    className="rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                    disabled={createSession.isLoading}
                  >
                    Restart flow
                  </button>
                </div>
              </div>

              {sessionError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  {sessionError}
                </div>
              )}

              {generalValidationMessage && (
                <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                  {generalValidationMessage.message}
                </div>
              )}

              {currentStep ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{currentStep.title ?? 'Step'}</h3>
                    {currentStep.description ? (
                      <p className="text-xs text-muted-foreground">{currentStep.description}</p>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {(currentStep.fields ?? []).map((field: any) => {
                      const fieldError = validationErrors.find((item) => item.field === field.id);
                      const value = (currentStepData as Record<string, unknown>)[field.id];

                      return (
                        <div key={field.id} className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {field.label}
                            {field.required ? <span className="text-destructive"> *</span> : null}
                          </label>
                          <FieldInput
                            field={field}
                            value={value}
                            onChange={(val) => handleFieldChange(field.id, val)}
                          />
                          {fieldError ? (
                            <p className="text-xs text-destructive-foreground">{fieldError.message}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handlePrevious}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                      disabled={stepIndex === 0 || isActionLoading}
                    >
                      Previous
                    </button>

                    <div className="flex gap-3">
                      <button
                        onClick={handleAdvance}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                        disabled={isActionLoading || !sessionId}
                      >
                        {isActionLoading ? 'Processing…' : stepIndex + 1 < steps.length ? 'Next step' : 'Submit flow'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {submissionResult && (
                <div className="rounded-lg border border-border bg-background px-4 py-4">
                  <h4 className="text-sm font-semibold text-foreground">Submission status</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quote ID: <span className="font-medium text-foreground">{submissionResult.quote_id}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Current status: {submissionResult.status}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <button
                      onClick={handleRefreshQuote}
                      className="rounded-md border border-border px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted"
                      disabled={quoteMutation.isLoading}
                    >
                      Check quote status
                    </button>
                    {quoteStatus ? (
                      <span className="text-xs text-muted-foreground">
                        Latest: {quoteStatus.status}
                        {typeof quoteStatus.price === 'number' ? ` • Price ${quoteStatus.price}` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: any;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const commonInputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40';

  switch (field.type) {
    case 'email':
    case 'tel':
    case 'text':
      return (
        <input
          type={field.type}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className={commonInputClass}
          required={field.required}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === '' ? '' : Number(next));
          }}
          className={commonInputClass}
          required={field.required}
        />
      );
    case 'radio':
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map((option: string) => (
            <label key={option} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="radio"
                name={field.id}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="h-4 w-4 border-border text-primary focus:ring-primary"
                required={field.required}
              />
              {option}
            </label>
          ))}
        </div>
      );
    case 'select':
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className={commonInputClass}
          required={field.required}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'checkbox':
      return (
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          {field.checkboxLabel ?? 'Yes'}
        </label>
      );
    default:
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          className={commonInputClass}
        />
      );
  }
}
