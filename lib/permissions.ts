export type UserRole = 'admin' | 'agent' | 'support' | 'partner';

const FALLBACK_ROLE: UserRole = 'support';

const isKnownRole = (value: string): value is UserRole => {
  const normalized = value.toLowerCase();
  return normalized === 'admin' || normalized === 'agent' || normalized === 'support' || normalized === 'partner';
};

export const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return FALLBACK_ROLE;
  return isKnownRole(role) ? (role.toLowerCase() as UserRole) : FALLBACK_ROLE;
};

type NavItem = {
  href: string;
  label: string;
  roles: readonly UserRole[];
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'agent', 'support'] },
  { href: '/analytics', label: 'Analytics', roles: ['admin', 'agent'] },
  { href: '/quotes', label: 'Quotes', roles: ['admin', 'agent'] },
  { href: '/customers', label: 'Customers', roles: ['admin', 'agent'] },
  { href: '/policies', label: 'Policies', roles: ['admin', 'agent', 'support'] },
  { href: '/payments', label: 'Payments', roles: ['admin', 'agent'] },
  { href: '/services', label: 'Services', roles: ['admin'] },
  { href: '/tenants', label: 'Tenants', roles: ['admin'] },
  { href: '/ai-settings', label: 'AI Settings', roles: ['admin'] },
  { href: '/packages', label: 'Packages', roles: ['admin', 'agent'] },
  { href: '/reviews', label: 'Review queue', roles: ['admin'] },
  { href: '/onboarding', label: 'Onboarding', roles: ['admin'] },
  { href: '/distribution', label: 'Distribution', roles: ['admin'] },
  { href: '/automation', label: 'Automation', roles: ['admin'] },
  { href: '/users', label: 'Users', roles: ['admin'] },
  { href: '/vendors', label: 'Vendors', roles: ['admin'] },
  { href: '/pricing', label: 'Pricing', roles: ['admin'] },
  { href: '/security', label: 'Security', roles: ['admin'] },
  { href: '/workflows', label: 'Workflows', roles: ['admin', 'agent'] },
] as const;

export const ROUTE_GUARDS: ReadonlyArray<{ prefix: string; roles: readonly UserRole[] }> = [
  ...NAV_ITEMS.map(({ href, roles }) => ({ prefix: href, roles })),
  { prefix: '/partner', roles: ['partner', 'admin', 'agent'] as const },
];

export const ACTION_PERMISSIONS = {
  manageServices: ['admin'] as const,
  managePackages: ['admin'] as const,
  manageVendors: ['admin'] as const,
  managePricing: ['admin'] as const,
  manageUsers: ['admin'] as const,
  manageTenants: ['admin'] as const,
  manageAI: ['admin'] as const,
};

export const isRoleAllowed = (role: UserRole, allowed: readonly UserRole[]) => allowed.includes(role);
