const PRIORITY_ROUTES = [
    { href: '/dashboard',                   permission: 'dashboard:read' },
    { href: '/events',                      permission: 'events:read' },
    { href: '/members',                     permission: 'members:read' },
    { href: '/attendance',                  permission: 'attendance:read' },
    { href: '/announcements',               permission: 'announcements:read' },
    { href: '/departments',                 permission: 'departments:read' },
    { href: '/follow-up',                   permission: 'follow_up:read' },
    { href: '/finances/reports',            permission: 'finance:report' },
    { href: '/finances/requests',           permission: 'finance:approve' },
    { href: '/finances/journal-entries',    permission: 'finance:read' },
    { href: '/finances/tithes',             permission: 'tithe:read' },
    { href: '/finances/reconciliation',     permission: 'finance:reconcile' },
    { href: '/inventories',                 permission: 'asset_management:read' },
    { href: '/facility-rental',             permission: 'facility_rental:read' },
    { href: '/classes',                     permission: 'classes:read' },
    { href: '/childrens-church',            permission: 'children_church:read' },
    { href: '/sunday-school',               permission: 'sunday_school:read' },
    { href: '/admin-management',            permission: 'admin:read' },
    { href: '/venue',                       permission: 'venues:read' },
    { href: '/prayer',                      permission: 'prayer:read' },
];

export function getFirstAccessibleRoute(perms: string[]): string | null {
    return PRIORITY_ROUTES.find(r => perms.includes(r.permission))?.href ?? null;
}
