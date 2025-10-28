import { render, screen } from '@testing-library/react';

import PackageDetailClient from '@/app/partner/packages/[packageId]/package-detail-client';

jest.mock('@/hooks/usePartnerPackages', () => ({
  usePartnerPackage: jest.fn(),
  usePartnerPackageVersions: jest.fn(),
  usePartnerPackageDocuments: jest.fn(),
  useUploadPartnerPackageDocument: jest.fn(() => ({ mutateAsync: jest.fn(), isLoading: false })),
  useSubmitPartnerPackageVersion: jest.fn(() => ({ mutateAsync: jest.fn(), isLoading: false })),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const mockedHooks = jest.requireMock('@/hooks/usePartnerPackages') as {
  usePartnerPackage: jest.Mock;
  usePartnerPackageVersions: jest.Mock;
  usePartnerPackageDocuments: jest.Mock;
  useUploadPartnerPackageDocument: jest.Mock;
  useSubmitPartnerPackageVersion: jest.Mock;
};

const basePackage = {
  id: 'pkg-1',
  name: 'Motor Package',
  description: 'Comprehensive motor insurance.',
  category: 'motor',
  basePrice: 12000,
  features: ['towing'],
  tags: ['core'],
  isActive: true,
  workflowState: 'pending_review',
  partnerVisibility: 'pending',
  latestVersion: 2,
  updatedAt: '2025-10-10T12:00:00Z',
};

const latestVersion = {
  id: 'ver-2',
  packageId: 'pkg-1',
  version: 2,
  name: 'Motor Package v2',
  description: 'Latest pricing updates',
  category: 'motor',
  basePrice: 15000,
  features: ['towing', 'windscreen cover'],
  tags: ['core'],
  isActive: true,
  changeSummary: 'Added windscreen cover',
  status: 'pending_review',
  createdAt: '2025-10-11T12:00:00Z',
  submittedAt: '2025-10-11T13:00:00Z',
  partnerVisibility: 'pending',
};

const previousVersion = {
  id: 'ver-1',
  packageId: 'pkg-1',
  version: 1,
  name: 'Motor Package',
  description: 'Initial release',
  category: 'motor',
  basePrice: 14000,
  features: ['towing'],
  tags: ['core', 'legacy'],
  isActive: true,
  changeSummary: 'Initial publication',
  status: 'approved',
  createdAt: '2025-10-01T09:00:00Z',
  approvedAt: '2025-10-02T10:00:00Z',
  partnerVisibility: 'visible',
};

const documentRecord = {
  id: 'doc-1',
  fileName: 'brochure.pdf',
  fileSize: 1024,
  contentType: 'application/pdf',
  uploadedAt: '2025-10-11T14:00:00Z',
  uploadedBy: 'Partner User',
  uploadedRole: 'partner',
  downloadUrl: '/partner/packages/pkg-1/documents/doc-1/download',
};

describe('PackageDetailClient', () => {
  beforeEach(() => {
    mockedHooks.usePartnerPackage.mockReturnValue({
      data: basePackage,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockedHooks.usePartnerPackageVersions.mockReturnValue({
      data: [latestVersion, previousVersion],
      isLoading: false,
    });

    mockedHooks.usePartnerPackageDocuments.mockReturnValue({
      data: [documentRecord],
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders version comparison with detected changes', () => {
    render(<PackageDetailClient packageId="pkg-1" />);

    expect(screen.getByText('Compare versions')).toBeInTheDocument();
    expect(screen.getByText('Baseline version')).toBeInTheDocument();
    expect(screen.getByText('Comparison version')).toBeInTheDocument();

    expect(screen.getByText('windscreen cover')).toBeInTheDocument();
    expect(screen.getByText('legacy')).toBeInTheDocument();
  });

  it('lists supporting documents with download links and guidance', () => {
    render(<PackageDetailClient packageId="pkg-1" />);

    expect(screen.getByText('Accepted formats: PDF, Word, Excel, PNG, JPG. Maximum size 25 MB.')).toBeInTheDocument();
    expect(screen.getByText('brochure.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded/)).toBeInTheDocument();

    const viewLink = screen.getByRole('link', { name: 'View' });
    expect(viewLink).toHaveAttribute('href', documentRecord.downloadUrl);
  });
});
