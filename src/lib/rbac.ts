import { UserRole } from '../types/env';

/**
 * Mapeamento e hierarquia de permissões padrão por papel (RBAC nativo)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    superadmin: ['*'],
    admin: [
        'admin.dashboard.view',
        'clients.view', 'clients.manage',
        'requests.view', 'requests.manage',
        'quotations.view', 'quotations.manage',
        'projects.view', 'projects.manage', 'projects.delete',
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

export interface RbacModuleDef {
    key: string;
    label: string;
    description: string;
    viewPerm: string | null;
    managePerm: string | null;
    deletePerm?: string | null;
}

export const RBAC_MODULES: RbacModuleDef[] = [
    {
        key: 'dashboard',
        label: 'Dashboard Executivo',
        description: 'Painel principal com indicadores e visão geral da operação.',
        viewPerm: 'admin.dashboard.view',
        managePerm: null
    },
    {
        key: 'requests',
        label: 'Solicitações de Serviço',
        description: 'Fila de triagem, protocolos GNDJ e conversão para orçamento.',
        viewPerm: 'requests.view',
        managePerm: 'requests.manage'
    },
    {
        key: 'quotations',
        label: 'Orçamentos & Propostas',
        description: 'Elaboração, envio ao portal e aprovação de propostas comerciais.',
        viewPerm: 'quotations.view',
        managePerm: 'quotations.manage'
    },
    {
        key: 'projects',
        label: 'Projetos em Execução',
        description: 'Sprints, etapas, percentual de entrega e anexos técnicos.',
        viewPerm: 'projects.view',
        managePerm: 'projects.manage',
        deletePerm: 'projects.delete'
    },
    {
        key: 'clients',
        label: 'Clientes & CRM',
        description: 'Cadastro de empresas, contatos e ativação do Portal do Cliente.',
        viewPerm: 'clients.view',
        managePerm: 'clients.manage'
    },
    {
        key: 'services',
        label: 'Catálogo de Serviços',
        description: 'Serviços ofertados no site institucional e no formulário de orçamento.',
        viewPerm: 'services.view',
        managePerm: 'services.manage'
    },
    {
        key: 'domains',
        label: 'Domínios & DNS',
        description: 'Monitoramento de vencimentos, apontamentos DNS e renovações.',
        viewPerm: 'domains.view',
        managePerm: 'domains.manage'
    },
    {
        key: 'campaigns',
        label: 'Campanhas & Tráfego',
        description: 'Gestão de mídia paga (Meta Ads / Google Ads) e métricas.',
        viewPerm: 'campaigns.view',
        managePerm: 'campaigns.manage'
    },
    {
        key: 'finance',
        label: 'Financeiro & Faturas',
        description: 'Receita & Caixa, cobranças PIX, liquidações e relatórios.',
        viewPerm: 'finance.view',
        managePerm: 'finance.manage'
    },
    {
        key: 'chat',
        label: 'Suporte, Chat & CRM IA',
        description: 'Inbox de atendimento ao vivo, WhatsApp e configuração do Agente IA.',
        viewPerm: 'chat.view',
        managePerm: 'chat.manage'
    },
    {
        key: 'users',
        label: 'Equipe, Usuários & Acessos',
        description: 'Gestão de colaboradores, papéis e controle de permissões.',
        viewPerm: 'users.view',
        managePerm: 'users.manage'
    },
    {
        key: 'settings',
        label: 'Configurações & Canais',
        description: 'Integrações PIX, WhatsApp, e-mail e parâmetros globais.',
        viewPerm: null,
        managePerm: 'settings.manage'
    }
];

export const ALL_VALID_ADMIN_PERMISSIONS: Set<string> = new Set(
    RBAC_MODULES.flatMap((m) => [m.viewPerm, m.managePerm, m.deletePerm].filter(Boolean) as string[])
);

export const CONFIGURABLE_STAFF_ROLES: Array<{ key: UserRole; label: string; summary: string }> = [
    { key: 'admin', label: 'Administrador', summary: 'Diretoria e gestão ampla do painel (editável apenas por Super Admin).' },
    { key: 'manager', label: 'Gerente de Operações', summary: 'Coordenação comercial, clientes, projetos e atendimento.' },
    { key: 'attendant', label: 'Atendente CRM', summary: 'Atendimento ao vivo, triagem de solicitações e consulta de clientes.' },
    { key: 'developer', label: 'Dev / Técnico', summary: 'Execução de projetos, entregas, etapas e gestão de domínios/DNS.' },
    { key: 'financial', label: 'Financeiro', summary: 'Faturamento, conciliação PIX, fluxo de caixa e consulta de orçamentos.' }
];

export interface DynamicRbacConfig {
    roleOverrides: Partial<Record<UserRole, string[]>>;
    userOverrides: Record<string, string[]>;
}

const RBAC_ROLES_SETTING_KEY = 'rbac_role_permissions';
const RBAC_USERS_SETTING_KEY = 'rbac_user_overrides';

export async function loadDynamicRbacConfig(db: D1Database | undefined | null): Promise<DynamicRbacConfig> {
    const cfg: DynamicRbacConfig = { roleOverrides: {}, userOverrides: {} };
    if (!db) return cfg;
    try {
        const res = await db.prepare(
            `SELECT key, value FROM system_settings WHERE key IN (?, ?)`
        ).bind(RBAC_ROLES_SETTING_KEY, RBAC_USERS_SETTING_KEY).all<{ key: string; value: string }>();

        for (const row of res.results || []) {
            if (!row?.value) continue;
            try {
                const parsed = JSON.parse(row.value);
                if (row.key === RBAC_ROLES_SETTING_KEY && parsed && typeof parsed === 'object') {
                    cfg.roleOverrides = parsed;
                } else if (row.key === RBAC_USERS_SETTING_KEY && parsed && typeof parsed === 'object') {
                    cfg.userOverrides = parsed;
                }
            } catch {}
        }
    } catch {}
    return cfg;
}

export function resolveEffectivePermissions(
    role: UserRole,
    userId: number | string | undefined | null,
    cfg?: DynamicRbacConfig | null
): string[] {
    if (role === 'superadmin') return ['*'];
    const uidKey = userId != null ? String(userId) : '';
    if (uidKey && cfg?.userOverrides && Array.isArray(cfg.userOverrides[uidKey])) {
        return cfg.userOverrides[uidKey];
    }
    if (cfg?.roleOverrides && Array.isArray(cfg.roleOverrides[role])) {
        return cfg.roleOverrides[role] as string[];
    }
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

export function sanitizePermissionsList(raw: unknown): string[] {
    const arr = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : [];
    const clean = new Set<string>();
    for (const item of arr) {
        const p = String(item || '').trim();
        if (ALL_VALID_ADMIN_PERMISSIONS.has(p)) {
            clean.add(p);
        }
    }
    // Se tiver *.manage ou *.delete, garante automaticamente o *.view correspondente para que a página fique acessível
    for (const mod of RBAC_MODULES) {
        if (mod.viewPerm && ((mod.managePerm && clean.has(mod.managePerm)) || (mod.deletePerm && clean.has(mod.deletePerm)))) {
            clean.add(mod.viewPerm);
        }
    }
    return Array.from(clean);
}

async function upsertSetting(db: D1Database, key: string, value: string): Promise<void> {
    const existing = await db.prepare(`SELECT key FROM system_settings WHERE key = ?`).bind(key).first();
    if (existing) {
        await db.prepare(`UPDATE system_settings SET value = ?, updated_at = datetime('now') WHERE key = ?`).bind(value, key).run();
    } else {
        await db.prepare(`INSERT INTO system_settings (key, value, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`).bind(key, value).run();
    }
}

export async function saveRolePermissions(db: D1Database, role: UserRole, permissions: string[] | null): Promise<void> {
    const cfg = await loadDynamicRbacConfig(db);
    if (permissions === null) {
        delete cfg.roleOverrides[role];
    } else {
        cfg.roleOverrides[role] = sanitizePermissionsList(permissions);
    }
    await upsertSetting(db, RBAC_ROLES_SETTING_KEY, JSON.stringify(cfg.roleOverrides));
}

export async function saveUserPermissionOverride(db: D1Database, userId: number, permissions: string[] | null): Promise<void> {
    const cfg = await loadDynamicRbacConfig(db);
    const key = String(userId);
    if (permissions === null) {
        delete cfg.userOverrides[key];
    } else {
        cfg.userOverrides[key] = sanitizePermissionsList(permissions);
    }
    await upsertSetting(db, RBAC_USERS_SETTING_KEY, JSON.stringify(cfg.userOverrides));
}

export function hasPermission(role: UserRole, permission: string, effectivePermissions?: string[]): boolean {
    if (role === 'superadmin') {
        return true;
    }

    const permissions = Array.isArray(effectivePermissions)
        ? effectivePermissions
        : (DEFAULT_ROLE_PERMISSIONS[role] || []);

    if (permissions.includes('*')) {
        return true;
    }

    // Admins têm acesso automático a rotas portal.*
    if (role === 'admin' && permission.startsWith('portal.')) {
        return true;
    }

    return permissions.includes(permission);
}
