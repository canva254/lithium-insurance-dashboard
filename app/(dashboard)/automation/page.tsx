'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  useAutomationJobs,
  useAutomationRuns,
  useCreateAutomationJob,
  useUpdateAutomationJob,
  useDeleteAutomationJob,
  useRecordAutomationRun,
} from '@/hooks/useAutomationJobs';
import { tenantsAPI } from '@/lib/api';
import type { AutomationJob, AutomationRun, TenantDefinition } from '@/types/api';

const ButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const OutlineButtonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60';

const InputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const TextareaClass =
  'min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const STATUS_OPTIONS = ['scheduled', 'running', 'completed', 'failed', 'paused'] as const;

type JobFormState = {
  name: string;
  jobType: string;
  tenantId: string;
  status: string;
  scheduleAt: string;
  payloadJson: string;
};

const emptyJobForm = (): JobFormState => ({
  name: '',
  jobType: '',
  tenantId: '',
  status: 'scheduled',
  scheduleAt: '',
  payloadJson: '{\n  \n}',
});

export default function AutomationJobsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<JobFormState>(emptyJobForm);
  const [runStatus, setRunStatus] = useState('completed');
  const [runMessage, setRunMessage] = useState('');
  const [runJobStatus, setRunJobStatus] = useState('completed');
  const [formError, setFormError] = useState<string | null>(null);

  const tenantsQuery = useQuery<TenantDefinition[]>(['tenants', 'all'], async () => {
    const response = await tenantsAPI.list(true);
    return response.data ?? [];
  });

  const jobsQuery = useAutomationJobs();
  const createMutation = useCreateAutomationJob();
  const updateMutation = useUpdateAutomationJob();
  const deleteMutation = useDeleteAutomationJob();
  const runMutation = useRecordAutomationRun();

  const jobs = jobsQuery.data ?? [];
  const selectedJob = useMemo<AutomationJob | null>(() => {
    if (!jobs.length) return null;
    if (selectedId) {
      return jobs.find((item) => item.id === selectedId) ?? null;
    }
    return showCreate ? null : jobs[0];
  }, [jobs, selectedId, showCreate]);

  const runsQuery = useAutomationRuns(selectedJob?.id ?? '', Boolean(selectedJob));
  const runs = runsQuery.data ?? [];

  useEffect(() => {
    if (!selectedJob || showCreate) {
      setForm(emptyJobForm());
      return;
    }
    setForm({
      name: selectedJob.name,
      jobType: selectedJob.jobType,
      tenantId: selectedJob.tenantId ?? '',
      status: selectedJob.status ?? 'scheduled',
      scheduleAt: selectedJob.scheduleAt ?? '',
      payloadJson: JSON.stringify(selectedJob.payload ?? {}, null, 2),
    });
    setRunJobStatus(selectedJob.status ?? 'scheduled');
  }, [selectedJob?.id, showCreate]);

  const tenants = tenantsQuery.data ?? [];
  const loading = jobsQuery.isLoading;

  const handleSelect = (job: AutomationJob) => {
    setSelectedId(job.id);
    setShowCreate(false);
    setFormError(null);
  };

  const parsePayload = () => {
    if (!form.payloadJson.trim()) {
      return {};
    }
    try {
      return JSON.parse(form.payloadJson);
    } catch (error) {
      setFormError('Payload JSON is invalid.');
      throw error;
    }
  };

  const handleCreate = async () => {
    try {
      setFormError(null);
      const payload = {
        name: form.name.trim(),
        jobType: form.jobType.trim(),
        tenantId: form.tenantId || undefined,
        status: form.status || undefined,
        scheduleAt: form.scheduleAt || undefined,
        payload: parsePayload(),
      };
      if (!payload.name || !payload.jobType) {
        setFormError('Name and job type are required.');
        return;
      }
      const response = await createMutation.mutateAsync(payload);
      if (response?.id) {
        setSelectedId(response.id);
        setShowCreate(false);
      }
      setForm(emptyJobForm());
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      setFormError((error as Error)?.message || 'Unable to create job.');
    }
  };

  const handleUpdate = async () => {
    if (!selectedJob) return;
    try {
      setFormError(null);
      const payload = {
        name: form.name.trim() || undefined,
        jobType: form.jobType.trim() || undefined,
        tenantId: form.tenantId || null,
        status: form.status || undefined,
        scheduleAt: form.scheduleAt || undefined,
        payload: parsePayload(),
      };
      await updateMutation.mutateAsync({ jobId: selectedJob.id, payload });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      setFormError((error as Error)?.message || 'Unable to update job.');
    }
  };

  const handleDelete = async () => {
    if (!selectedJob) return;
    await deleteMutation.mutateAsync(selectedJob.id);
    setSelectedId(null);
  };

  const handleRecordRun = async () => {
    if (!selectedJob) return;
    await runMutation.mutateAsync({
      jobId: selectedJob.id,
      payload: {
        status: runStatus,
        message: runMessage || undefined,
        jobStatus: runJobStatus || undefined,
      },
    });
    setRunMessage('');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Orchestrate renewal reminders, CRM synchronisation, and webhook deliveries.
          </p>
        </div>
        <button
          type="button"
          className={ButtonClass}
          onClick={() => {
            setShowCreate((prev) => !prev);
            setForm(emptyJobForm());
            setFormError(null);
            if (!showCreate) {
              setSelectedId(null);
            }
          }}
        >
          {showCreate ? 'Close form' : 'New job'}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-lg border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground">Jobs</div>
          <div className="max-h-[520px] divide-y divide-border/40 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-12 text-sm text-muted-foreground">
                Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No automation jobs defined.</div>
            ) : (
              jobs.map((job) => {
                const active = selectedJob?.id === job.id && !showCreate;
                return (
                  <button
                    key={job.id}
                    type="button"
                    className={`w-full px-4 py-3 text-left text-sm transition ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelect(job)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{job.name}</span>
                      <span className="text-xs text-muted-foreground">{job.jobType}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Status: {job.status}</div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="space-y-4 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          {showCreate ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create automation job</h2>
                <p className="text-sm text-muted-foreground">Schedule outbound automations and integrations.</p>
              </div>
              <JobForm
                form={form}
                tenants={tenants}
                setForm={setForm}
                disabled={createMutation.isLoading}
              />
              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={OutlineButtonClass}
                  onClick={() => setShowCreate(false)}
                  disabled={createMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={ButtonClass}
                  onClick={handleCreate}
                  disabled={createMutation.isLoading}
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create job'}
                </button>
              </div>
            </div>
          ) : selectedJob ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedJob.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedJob.jobType}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${OutlineButtonClass} border-destructive text-destructive`}
                    onClick={handleDelete}
                    disabled={deleteMutation.isLoading}
                  >
                    {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="font-semibold text-foreground">Status</div>
                  <div className="mt-1 text-sm text-foreground">{selectedJob.status}</div>
                  <div className="mt-2">Last run at: {selectedJob.lastRunAt ?? '--'}</div>
                  <div>Last result: {selectedJob.lastRunStatus ?? '--'}</div>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="font-semibold text-foreground">Metadata</div>
                  <div className="mt-1">Tenant: {selectedJob.tenantId ?? 'Global'}</div>
                  <div>Schedule at: {selectedJob.scheduleAt ?? '--'}</div>
                  <div>Created: {selectedJob.createdAt ?? '--'}</div>
                </div>
              </div>

              <JobForm
                form={form}
                tenants={tenants}
                setForm={setForm}
                disabled={updateMutation.isLoading}
              />

              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  className={ButtonClass}
                  onClick={handleUpdate}
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save changes'}
                </button>
              </div>

              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Record run outcome</h3>
                  <p className="text-xs text-muted-foreground">
                    Track manual executions or external worker activity for auditing.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Run status</label>
                    <select
                      className={InputClass}
                      value={runStatus}
                      onChange={(event) => setRunStatus(event.target.value)}
                    >
                      {['completed', 'failed', 'skipped'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Job status</label>
                    <select
                      className={InputClass}
                      value={runJobStatus}
                      onChange={(event) => setRunJobStatus(event.target.value)}
                    >
                      {['scheduled', 'running', 'completed', 'failed', 'paused'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">Message</label>
                    <input
                      className={InputClass}
                      value={runMessage}
                      onChange={(event) => setRunMessage(event.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={OutlineButtonClass}
                    onClick={handleRecordRun}
                    disabled={runMutation.isLoading}
                  >
                    {runMutation.isLoading ? 'Recording...' : 'Record run'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Recent runs</h3>
                {runs.length === 0 ? (
                  <div className="rounded-md border border-border/60 bg-muted/10 px-3 py-4 text-xs text-muted-foreground">
                    No run history yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {runs.map((run) => (
                      <RunCard key={run.id} run={run} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Payload</h3>
                <pre className="max-h-72 overflow-auto rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(selectedJob.payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a job or create a new one to get started.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type JobFormProps = {
  form: JobFormState;
  tenants: TenantDefinition[];
  setForm: Dispatch<SetStateAction<JobFormState>>;
  disabled?: boolean;
};

const JobForm = ({ form, tenants, setForm, disabled }: JobFormProps) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
          <input
            className={InputClass}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Renewal reminder"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job type</label>
          <input
            className={InputClass}
            value={form.jobType}
            onChange={(event) => setForm((prev) => ({ ...prev, jobType: event.target.value }))}
            placeholder="renewal_reminder | webhook_dispatch"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tenant</label>
          <select
            className={InputClass}
            value={form.tenantId}
            onChange={(event) => setForm((prev) => ({ ...prev, tenantId: event.target.value }))}
            disabled={disabled}
          >
            <option value="">Global</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
          <select
            className={InputClass}
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            disabled={disabled}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule at</label>
          <input
            className={InputClass}
            value={form.scheduleAt}
            onChange={(event) => setForm((prev) => ({ ...prev, scheduleAt: event.target.value }))}
            placeholder="2030-01-01T00:00:00Z"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payload JSON</label>
        <textarea
          className={TextareaClass}
          value={form.payloadJson}
          onChange={(event) => setForm((prev) => ({ ...prev, payloadJson: event.target.value }))}
          disabled={disabled}
          placeholder={`{\n  "template": "renewal",\n  "daysBefore": 7\n}`}
        />
      </div>
    </div>
  );
}

function RunCard({ run }: { run: AutomationRun }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
      <div className="flex justify-between text-foreground">
        <span className="font-semibold">{run.status}</span>
        <span>{run.executedAt ?? '--'}</span>
      </div>
      {run.message && <div className="mt-1">{run.message}</div>}
    </div>
  );
}
