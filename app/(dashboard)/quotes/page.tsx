'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesAPI } from '@/lib/api';
import type { Quote } from '@/types/api';

export default function QuotesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['quotes', statusFilter, search],
    queryFn: () => quotesAPI.list({
      status: statusFilter || undefined,
      q: search || undefined,
      limit: 50,
    }),
  });
  
  const quotes = quotesData?.data || [];
  
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted: 'bg-purple-100 text-purple-800',
      expired: 'bg-gray-100 text-gray-600',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quotes</h1>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <select
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="converted">Converted</option>
        </select>
      </div>
      
      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm">
        <table className="w-full">
          <thead className="border-b border-border/60 bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Premium</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  Loading quotes...
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  No quotes found. Generate quotes via the Telegram bot to see them here.
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <td className="px-6 py-4 text-sm text-foreground">
                    {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">{quote.contactName || '-'}</div>
                    <div className="text-xs text-muted-foreground">{quote.contactEmail || quote.contactPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{quote.productKey}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{quote.coverType}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                    {quote.currency} {quote.premium.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(quote.status)}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{quote.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
