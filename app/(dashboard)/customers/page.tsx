'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { customersAPI } from '@/lib/api';

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersAPI.list({ q: search || undefined }),
  });
  
  const customers = customersData?.data || [];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
      </div>
      
      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, email, phone..."
        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm">
        <table className="w-full">
          <thead className="border-b border-border/60 bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quotes</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Policies</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Premium</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  Loading customers...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  No customers found. Customers are automatically created when quotes are generated.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer border-b border-border/40 hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">
                      {customer.firstName} {customer.lastName}
                    </div>
                    {customer.city && (
                      <div className="text-xs text-muted-foreground">{customer.city}, {customer.country}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{customer.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm text-foreground">{customer.quotesCount || 0}</td>
                  <td className="px-6 py-4 text-right text-sm text-foreground">{customer.policiesCount || 0}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                    KES {(customer.totalPremium || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Stats Summary */}
      {customers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold text-foreground">{customers.length}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
            <p className="text-sm text-muted-foreground">Total Policies</p>
            <p className="text-2xl font-bold text-foreground">
              {customers.reduce((sum, c) => sum + (c.policiesCount || 0), 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
            <p className="text-sm text-muted-foreground">Total Premium Value</p>
            <p className="text-2xl font-bold text-foreground">
              KES {customers.reduce((sum, c) => sum + (c.totalPremium || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
