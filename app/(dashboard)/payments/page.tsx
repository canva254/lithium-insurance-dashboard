'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsAPI } from '@/lib/api';

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: () => paymentsAPI.listPayments({
      status: statusFilter || undefined,
      limit: 100,
    }),
  });
  
  const payments = paymentsData?.data || [];
  
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      succeeded: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };
  
  // Calculate stats
  const stats = {
    total: payments.length,
    succeeded: payments.filter(p => p.status === 'succeeded').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    totalAmount: payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0),
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payments</h1>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
          <p className="text-sm text-muted-foreground">Total Payments</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
          <p className="text-sm text-green-600 dark:text-green-400">Succeeded</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.succeeded}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground">KES {stats.totalAmount.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Filter */}
      <select
        className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="succeeded">Succeeded</option>
        <option value="failed">Failed</option>
      </select>
      
      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm">
        <table className="w-full">
          <thead className="border-b border-border/60 bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  Loading payments...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  No payments found. Payments will appear here after M-Pesa transactions.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground">
                    {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-foreground">{payment.invoiceId}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-medium text-foreground">
                      {payment.currency} {payment.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm capitalize text-foreground">{payment.method}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-foreground">{payment.mpesaPhone || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-foreground">{payment.mpesaReceiptNo || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(payment.status)}`}>
                      {payment.status}
                    </span>
                    {payment.errorMessage && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">{payment.errorMessage}</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Recent Activity Info */}
      {payments.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>M-Pesa Integration Active:</strong> Payments are processed in real-time. 
            Successful payments automatically convert quotes to policies.
          </p>
        </div>
      )}
    </div>
  );
}
