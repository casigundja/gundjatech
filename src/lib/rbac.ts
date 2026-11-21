import { UserRole } from '../types/env';

/**
 * Mapeamento e hierarquia de permissões por papel (RBAC nativo)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    superadmin: ['*'],
    admin: [
        'admin.dashboard.view',
        'clients.view', 'clients.manage',
        'requests.view', 'requests.manage',
        'quotations.view', 'quotations.manage',
        'projects.view', 'projects.manage',
        'services.view', 'services.manage',
        'domains.view', 'domains.manage',
        'campaigns.view', 'campaigns.manage',
        'finance.view', 'finance.manage',
        'chat.view', 'chat.manage',
        'users.view', 'users.manage',
        'settings.manage'
    ],
    manager: [
        'admin.dashboard.view',
        'clients.view', 'clients.manage',
        'requests.view', 'requests.manage',
        'quotations.view', 'quotations.manage',
        'projects.view', 'projects.manage',
        'services.view',
        'domains.view', 'domains.manage',
        'campaigns.view', 'campaigns.manage',
        'chat.view', 'chat.manage'
    ],
    attendant: [
        'admin.dashboard.view',
        'clients.view',
        'requests.view', 'requests.manage',
        'quotations.view',
        'chat.view', 'chat.manage'
    ],
    developer: [
        'admin.dashboard.view',
        'projects.view', 'projects.manage',
        'domains.view', 'domains.manage',
        'services.view'
    ],
    financial: [
        'admin.dashboard.view',
        'finance.view', 'finance.manage',
        'quotations.view'
    ],
    client: [
        'portal.access',
        'portal.projects.view',
        'portal.requests.view', 'portal.requests.create',
        'portal.quotations.view', 'portal.quotations.respond',
        'portal.domains.view',
        'portal.chat.access'
    ]
};

export function hasPermission(role: UserRole, permission: string): boolean {
    if (role === 'superadmin') {
        return true;
    }

    const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (permissions.includes('*')) {
        return true;
    }

    // Admins têm acesso automático a rotas portal.*
    if (role === 'admin' && permission.startsWith('portal.')) {
        return true;
    }

    return permissions.includes(permission);
}
