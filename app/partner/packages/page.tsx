'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePartnerPackages } from '@/hooks/usePartnerPackages';

const formatWorkflowLabel = (state?: string) => {
  if (!state) return 'Draft';
  return state
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const resolveWorkflowVariant = (state?: string) => {
  switch (state) {
    case 'approved':
      return 'default';
    case 'pending_review':
      return 'secondary';
    case 'changes_requested':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function PartnerPackagesPage() {
  const {
    data: packages = [],
    isLoading,
    isError,
    error,
  } = usePartnerPackages({ include_versions: true, include_documents: false });

  const errorMessage = isError ? ((error as { message?: string } | null)?.message ?? 'Unable to load packages.') : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Packages</h1>
          <p className="text-sm text-muted-foreground">Manage your insurance packages and their status</p>
        </div>
        <Button asChild>
          <Link href="/partner/packages/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Package
          </Link>
        </Button>
      </header>

      {errorMessage && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-card px-4 py-12 text-center">
          <h3 className="mb-2 text-lg font-medium">No packages found</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            You haven&apos;t created any packages yet. Get started by creating a new package.
          </p>
          <Button asChild>
            <Link href="/partner/packages/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Package
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Review Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell className="capitalize">{pkg.category ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={resolveWorkflowVariant(pkg.workflowState)} className="capitalize">
                      {formatWorkflowLabel(pkg.workflowState)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pkg.partnerVisibility === 'visible' ? 'default' : 'outline'} className="capitalize">
                      {pkg.partnerVisibility ?? 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>{pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/partner/packages/${pkg.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
