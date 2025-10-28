'use client';

import { useEffect, useState } from 'react';

import { partnerAPI } from '@/lib/api';
import type { ServiceDefinition } from '@/types/api';

export default function PartnerServicesPage() {
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await partnerAPI.listServices({ include_disabled: false, include_global: true });
        setServices(response.data ?? []);
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load services.');
      } finally {
        setLoading(false);
      }
    };

    void fetchServices();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Available services</h1>
        <p className="text-sm text-muted-foreground">
          Services currently enabled for this tenant. Disabled categories will not be surfaced to your customers.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Loading services...
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No services available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <article key={service.key} className="flex flex-col justify-between rounded-lg border border-border/60 bg-card p-5 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{service.label}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${service.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'}`}>
                    {service.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
              </div>
              <dl className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <dt>Workflow</dt>
                  <dd className="font-medium text-foreground">{service.workflow_key ?? '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Pricing strategy</dt>
                  <dd className="font-medium text-foreground">{service.pricing_strategy ?? 'Manual'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Minimum premium</dt>
                  <dd className="font-medium text-foreground">
                    {service.min_premium != null ? `KES ${service.min_premium.toLocaleString()}` : 'Not configured'}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
