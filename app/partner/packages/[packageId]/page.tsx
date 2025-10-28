import PackageDetailClient from './package-detail-client';

export default function PartnerPackageDetailPage({ params }: { params: { packageId: string } }) {
  return <PackageDetailClient packageId={params.packageId} />;
}
