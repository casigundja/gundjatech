import { MiddlewareHandler } from 'hono';
import { Env, AppVariables, UserRole } from '../types/env';
import { getSession } from '../lib/session';
import { hasPermission } from '../lib/rbac';

/**
 * Popula c.set('user') e c.set('sessionId') se houver cookie de sessão válido
 */
export const attachSession: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    const cookieHeader = c.req.header('cookie');
    const sessionResult = await getSession(c.env, cookieHeader);
    if (sessionResult) {
        c.set('user', sessionResult.user);
        c.set('sessionId', sessionResult.sessionId);
    } else {
        c.set('user', null);
        c.set('sessionId', null);
    }
    await next();
};

/**
 * Exige usuário autenticado
 */
export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    const user = c.get('user');
    if (!user) {
        if (c.req.header('accept')?.includes('application/json') || c.req.path.startsWith('/api/')) {
            return c.json({ error: 'Unauthenticated', message: 'Faça login para continuar.' }, 401);
        }
        return c.redirect('/login');
    }

    if (user.is_active === false) {
        return c.json({ error: 'Forbidden', message: 'Sua conta de usuário está desativada.' }, 403);
    }

    await next();
};

/**
 * Exige visitante não-autenticado (guest)
 */
export const requireGuest: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    const user = c.get('user');
    if (user) {
        if (user.role === 'client') {
            return c.redirect('/portal/dashboard');
        }
        return c.redirect('/admin/dashboard');
    }
    await next();
};

const STAFF_ROLES: UserRole[] = ['superadmin', 'admin', 'manager', 'attendant', 'developer', 'financial'];

/**
 * Exige membro da equipe interna (Staff)
 */
export const requireStaff: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    const user = c.get('user');
    if (!user) {
        return c.redirect('/login');
    }

    if (user.is_active === false) {
        return c.json({ error: 'Forbidden', message: 'Sua conta de usuário está desativada.' }, 403);
    }

    if (user.role === 'client' || !STAFF_ROLES.includes(user.role)) {
        return c.redirect('/portal/dashboard');
    }

    await next();
};

/**
 * Exige papel específico
 */
export function requireRole(...roles: UserRole[]): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> {
    return async (c, next) => {
        const user = c.get('user');
        if (!user) {
            return c.redirect('/login');
        }

        if (user.role === 'superadmin' || roles.includes(user.role)) {
            return next();
        }

        return c.json({ error: 'Forbidden', message: 'Acesso não autorizado para o seu cargo.' }, 403);
    };
}

/**
 * Exige permissão específica (RBAC granular substituindo policies/gates do Laravel)
 */
export function requirePermission(permission: string): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> {
    return async (c, next) => {
        const user = c.get('user');
        if (!user) {
            return c.redirect('/login');
        }

        if (!hasPermission(user.role, permission, user.effectivePermissions)) {
            return c.json({ error: 'Forbidden', message: 'Você não possui permissão para acessar este recurso.' }, 403);
        }

        await next();
    };
}
