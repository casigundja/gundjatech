import type { FC } from 'hono/jsx';
import { AdminLayout } from './admin/layout';
import { PortalLayout } from './portal/layout';

interface AccountViewProps {
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        phone?: string | null;
        company?: string | null;
        created_at?: string | null;
    };
    successMessage?: string | null;
    errorMessage?: string | null;
}

const ROLE_TITLES: Record<string, string> = {
    superadmin: 'Super Administrador',
    admin: 'Administrador',
    manager: 'Gerente de Operações',
    attendant: 'Atendente CRM',
    developer: 'Desenvolvedor / Técnico',
    financial: 'Financeiro',
    client: 'Cliente do Portal',
};

export const AccountView: FC<AccountViewProps> = ({ user, successMessage, errorMessage }) => {
    const isClient = user.role === 'client';
    const backHref = isClient ? '/portal' : '/admin/dashboard';
    const initials = (user.name || 'GT').slice(0, 2).toUpperCase();
    const roleLabel = ROLE_TITLES[user.role] || user.role;
    const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—';

    const content = (
        <>
            <div class="gt-detail-toolbar">
                <a href={backHref} class="gt-back-link">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5" />
                        <path d="m12 19-7-7 7-7" />
                    </svg>
                    <span>Voltar ao Painel</span>
                </a>
            </div>

            <div class="gt-grid-detail items-start">
                {/* Coluna Principal: Perfil + Senha */}
                <div class="space-y-5 min-w-0">
                    {/* Dados do Perfil */}
                    <section class="gtb-card space-y-5 min-w-0">
                        <div class="flex items-center gap-3 pb-4 border-b border-white/10">
                            <span class="gtb-icon-box !w-9 !h-9" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <div>
                                <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Dados do Perfil</h2>
                                <p class="text-xs text-[#8C95AA] mt-0.5">Mantenha seus dados de contato e identificação atualizados.</p>
                            </div>
                        </div>

                        <form action="/minha-conta/perfil" method="post" data-dirty-guard="1" class="space-y-4">
                            <div class="gt-grid-2">
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={user.name || ''}
                                        required
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        E-mail de Acesso (não alterável)
                                    </label>
                                    <input
                                        type="email"
                                        value={user.email || ''}
                                        readOnly
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px] opacity-70 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div class="gt-grid-2">
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Telefone / WhatsApp
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={user.phone || ''}
                                        placeholder="(11) 99999-9999"
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                        style="font-variant-numeric: tabular-nums;"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Empresa / Organização
                                    </label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={user.company || ''}
                                        placeholder="Nome da empresa"
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                    />
                                </div>
                            </div>

                            <div class="pt-3 border-t border-white/10 flex items-center justify-end">
                                <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Salvar Alterações</span>
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Segurança & Alteração de Senha */}
                    <section class="gtb-card space-y-5 min-w-0">
                        <div class="flex items-center gap-3 pb-4 border-b border-white/10">
                            <span class="gtb-icon-box !w-9 !h-9" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <div>
                                <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Segurança &amp; Alteração de Senha</h2>
                                <p class="text-xs text-[#8C95AA] mt-0.5">Ao alterar sua senha, todas as outras sessões abertas são desconectadas automaticamente.</p>
                            </div>
                        </div>

                        <form
                            action="/minha-conta/senha"
                            method="post"
                            data-dirty-guard="1"
                            onsubmit="var p=this.querySelector('input[name=password]').value;var c=this.querySelector('input[name=password_confirmation]').value;if(p!==c){if(window.GT_ShowToast){window.GT_ShowToast('A confirmação da nova senha não confere.','warning');}return false;}"
                            class="space-y-4"
                        >
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                    Senha Atual *
                                </label>
                                <input
                                    type="password"
                                    name="current_password"
                                    required
                                    autocomplete="current-password"
                                    placeholder="Digite sua senha atual"
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                />
                            </div>

                            <div class="gt-grid-2">
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Nova Senha (mín. 8 caracteres) *
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        minLength={8}
                                        autocomplete="new-password"
                                        placeholder="Mínimo 8 caracteres"
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Confirmar Nova Senha *
                                    </label>
                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        required
                                        minLength={8}
                                        autocomplete="new-password"
                                        placeholder="Repita a nova senha"
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                    />
                                </div>
                            </div>

                            <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                                <span class="text-[11px] text-[#8C95AA]">Use letras, números e símbolos para maior proteção.</span>
                                <button type="submit" data-loading-text="Atualizando..." class="gt-btn-primary gt-btn-sm ml-auto">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Alterar Senha</span>
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                {/* Coluna Lateral: Resumo da Conta & Sessão */}
                <div class="space-y-5 min-w-0">
                    <aside class="gtb-card space-y-4 min-w-0">
                        <div class="flex items-center gap-3.5 pb-4 border-b border-white/10">
                            <div
                                class="shrink-0 flex items-center justify-center"
                                style="width: 48px; height: 48px; border-radius: 999px; padding: 2px; background: linear-gradient(135deg, #F2C230 0%, #16749A 100%); box-shadow: 0 6px 16px -6px rgba(6, 59, 92, 0.4);"
                            >
                                <div
                                    class="gtb-avatar-inner w-full h-full flex items-center justify-center text-sm font-extrabold tracking-tight"
                                    style="border-radius: 999px;"
                                >
                                    {initials}
                                </div>
                            </div>
                            <div class="min-w-0">
                                <h1 class="gt-font-display text-sm font-extrabold text-white truncate">{user.name}</h1>
                                <p class="text-xs text-[#8C95AA] truncate mt-0.5">{user.email}</p>
                            </div>
                        </div>

                        <div class="space-y-2.5 text-xs">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[#8C95AA]">Papel de Acesso</span>
                                <span class="gt-badge gt-badge-info">{roleLabel}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[#8C95AA]">Status da Conta</span>
                                <span class="gt-badge gt-badge-success">Ativa</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[#8C95AA]">Cadastro em</span>
                                <span class="font-semibold text-white" style="font-variant-numeric: tabular-nums;">{memberSince}</span>
                            </div>
                        </div>
                    </aside>

                    <aside class="gtb-card space-y-3 min-w-0">
                        <div>
                            <h2 class="gt-font-display text-sm font-extrabold text-white">Proteção da Conta</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5 leading-relaxed">
                                Sua sessão é protegida com assinatura criptográfica e hash PBKDF2-SHA256.
                            </p>
                        </div>

                        <form action="/auth/logout" method="post" class="pt-2 border-t border-white/10 m-0">
                            <button type="submit" class="gt-btn-danger-ghost gt-btn-sm w-full justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span>Sair da Conta</span>
                            </button>
                        </form>
                    </aside>
                </div>
            </div>
        </>
    );

    if (isClient) {
        return (
            <PortalLayout
                title="Minha Conta • Portal do Cliente GundjaTech"
                activeNav=""
                currentUser={user}
                clientName={user.company || user.name}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                {content}
            </PortalLayout>
        );
    }

    return (
        <AdminLayout
            title="Minha Conta • Painel Administrativo"
            activeNav=""
            currentUser={user}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            {content}
        </AdminLayout>
    );
};
