import type { FC, PropsWithChildren } from 'hono/jsx';

interface AdminLayoutProps {
    title?: string;
    activeNav?: string;
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const AdminLayout: FC<PropsWithChildren<AdminLayoutProps>> = ({
    title = 'Painel Administrativo • GundjaTech',
    activeNav = 'dashboard',
    currentUser,
    successMessage,
    errorMessage,
    children
}) => {
    const initials = currentUser.name.slice(0, 2).toUpperCase();

    return (
        <html lang="pt-BR" class="h-full">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --gt-gold: #F2C230;
                        --gt-dark: #063B5C;
                        --gt-darker: #032033;
                        --gt-blue: #16749A;
                        --gt-ice: #E7F0F5;
                        --gt-white: #FFFFFF;
                        --gt-card-bg: #04263D;
                        --gt-border: rgba(22, 116, 154, 0.25);
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                        background-color: var(--gt-darker);
                        color: #E7F0F5;
                        height: 100vh;
                        display: flex;
                        overflow: hidden;
                    }
                    .gt-sidebar {
                        width: 260px;
                        background: #041B2B;
                        border-right: 1px solid var(--gt-border);
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        flex-shrink: 0;
                        z-index: 40;
                    }
                    .gt-sidebar-header {
                        height: 72px;
                        padding: 0 20px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 1px solid var(--gt-border);
                    }
                    .gt-logo {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        text-decoration: none;
                        font-weight: 800;
                        font-size: 19px;
                        color: #FFFFFF;
                    }
                    .gt-logo-tech { color: var(--gt-gold); }
                    .gt-badge-admin {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        padding: 2px 8px;
                        border-radius: 6px;
                        background: rgba(242, 194, 48, 0.15);
                        color: var(--gt-gold);
                        border: 1px solid rgba(242, 194, 48, 0.4);
                    }
                    .gt-admin-user-info {
                        padding: 14px 20px;
                        background: rgba(6, 59, 92, 0.3);
                        border-bottom: 1px solid var(--gt-border);
                    }
                    .gt-nav {
                        padding: 16px 12px;
                        flex: 1;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .gt-nav-section {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        color: #628FA8;
                        letter-spacing: 0.8px;
                        padding: 14px 10px 6px;
                    }
                    .gt-nav-link {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 14px;
                        border-radius: 10px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #B5D1E2;
                        text-decoration: none;
                        transition: all 0.15s ease;
                    }
                    .gt-nav-link:hover {
                        background: rgba(22, 116, 154, 0.2);
                        color: #FFFFFF;
                    }
                    .gt-nav-link.active {
                        background: var(--gt-gold);
                        color: var(--gt-darker);
                        font-weight: 800;
                    }
                    .gt-sidebar-footer {
                        padding: 16px;
                        border-top: 1px solid var(--gt-border);
                        background: rgba(4, 27, 43, 0.6);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .gt-user-card {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        text-decoration: none;
                        overflow: hidden;
                    }
                    .gt-avatar {
                        width: 34px;
                        height: 34px;
                        border-radius: 8px;
                        background: linear-gradient(135deg, var(--gt-blue), var(--gt-gold));
                        color: var(--gt-darker);
                        font-weight: 800;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }
                    .gt-main {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        overflow: hidden;
                    }
                    .gt-topbar {
                        height: 72px;
                        padding: 0 32px;
                        background: #041B2B;
                        border-bottom: 1px solid var(--gt-border);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        flex-shrink: 0;
                    }
                    .gt-content {
                        flex: 1;
                        overflow-y: auto;
                        padding: 32px;
                        background: var(--gt-darker);
                    }
                    .gt-card {
                        background: var(--gt-card-bg);
                        border: 1px solid var(--gt-border);
                        border-radius: 16px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                    }
                    .gt-btn-primary {
                        background: var(--gt-gold);
                        color: var(--gt-darker);
                        font-weight: 800;
                        padding: 10px 18px;
                        border-radius: 10px;
                        text-decoration: none;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        border: none;
                        cursor: pointer;
                        font-size: 13px;
                        transition: background 0.15s ease;
                    }
                    .gt-btn-primary:hover {
                        background: #E0B020;
                    }
                    .gt-btn-outline {
                        background: transparent;
                        color: #E7F0F5;
                        font-weight: 700;
                        padding: 8px 16px;
                        border-radius: 10px;
                        text-decoration: none;
                        border: 1px solid var(--gt-border);
                        cursor: pointer;
                        font-size: 13px;
                    }
                    .gt-btn-outline:hover {
                        background: rgba(22, 116, 154, 0.2);
                        color: #FFFFFF;
                    }
                    .gt-alert-success {
                        background: rgba(16, 185, 129, 0.15);
                        border: 1px solid rgba(16, 185, 129, 0.4);
                        color: #6EE7B7;
                        padding: 12px 16px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                        font-size: 13px;
                        font-weight: 600;
                    }
                    .gt-alert-error {
                        background: rgba(239, 68, 68, 0.15);
                        border: 1px solid rgba(239, 68, 68, 0.4);
                        color: #FCA5A5;
                        padding: 12px 16px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                        font-size: 13px;
                        font-weight: 600;
                    }
                    .gt-badge {
                        display: inline-block;
                        padding: 4px 10px;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                    }
                    .gt-badge-success { background: rgba(16, 185, 129, 0.2); color: #34D399; }
                    .gt-badge-warning { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }
                    .gt-badge-info { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
                    .gt-badge-danger { background: rgba(239, 68, 68, 0.2); color: #F87171; }
                    .gt-mobile-toggle {
                        display: none;
                        background: transparent;
                        border: 1px solid var(--gt-border);
                        color: #FFFFFF;
                        padding: 6px 10px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    @media (max-width: 768px) {
                        .gt-sidebar {
                            position: fixed;
                            top: 0;
                            left: 0;
                            bottom: 0;
                            transform: translateX(-100%);
                            transition: transform 0.25s ease;
                        }
                        .gt-sidebar.open {
                            transform: translateX(0);
                        }
                        .gt-mobile-toggle {
                            display: inline-flex;
                        }
                        .gt-topbar {
                            padding: 0 16px;
                        }
                        .gt-content {
                            padding: 18px 16px;
                        }
                        .gt-card {
                            overflow-x: auto;
                        }
                    }
                ` }} />
            </head>
            <body>
                <aside class="gt-sidebar">
                    <div>
                        <div class="gt-sidebar-header">
                            <a href="/admin/dashboard" class="gt-logo">
                                <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                                    <path d="M20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36C28.8366 36 36 28.8366 36 20H20V12H34.8C32.4 7.2 26.6 4 20 4Z" fill="#16749A" />
                                    <circle cx="28" cy="12" r="4" fill="#F2C230" />
                                </svg>
                                <span>Gundja<span class="gt-logo-tech">Tech</span></span>
                            </a>
                            <span class="gt-badge-admin">Admin</span>
                        </div>

                        <div class="gt-admin-user-info">
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Perfil Staff</div>
                            <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-top: 2px;">{currentUser.name} ({currentUser.role})</div>
                        </div>

                        <nav class="gt-nav">
                            <a href="/admin/dashboard" class={`gt-nav-link ${activeNav === 'dashboard' ? 'active' : ''}`}>
                                <span>📊 Dashboard Executivo</span>
                            </a>

                            <div class="gt-nav-section">Operação & Entregas</div>
                            <a href="/admin/solicitacoes" class={`gt-nav-link ${activeNav === 'requests' ? 'active' : ''}`}>
                                <span>📋 Solicitações & Leads</span>
                            </a>
                            <a href="/admin/projetos" class={`gt-nav-link ${activeNav === 'projects' ? 'active' : ''}`}>
                                <span>🚀 Projetos & Entregas</span>
                            </a>
                            <a href="/admin/clientes" class={`gt-nav-link ${activeNav === 'clients' ? 'active' : ''}`}>
                                <span>🏢 Clientes & Empresas</span>
                            </a>
                            <a href="/admin/atendimento" class={`gt-nav-link ${activeNav === 'chat' ? 'active' : ''}`}>
                                <span>💬 CRM & Chat ao Vivo</span>
                            </a>

                            <div class="gt-nav-section">Financeiro & Ativos</div>
                            <a href="/admin/financeiro" class={`gt-nav-link ${activeNav === 'finance' ? 'active' : ''}`}>
                                <span>💳 Faturas & Finanças</span>
                            </a>
                            <a href="/admin/dominios" class={`gt-nav-link ${activeNav === 'domains' ? 'active' : ''}`}>
                                <span>🌐 Domínios & DNS</span>
                            </a>
                            <a href="/admin/campanhas" class={`gt-nav-link ${activeNav === 'campaigns' ? 'active' : ''}`}>
                                <span>📈 Campanhas & Ads</span>
                            </a>

                            <div class="gt-nav-section">Produtos & Catálogo</div>
                            <a href="/admin/servicos" class={`gt-nav-link ${activeNav === 'services' ? 'active' : ''}`}>
                                <span>🛠 Pacotes de Serviços</span>
                            </a>

                            <div class="gt-nav-section">Acesso & Configurações</div>
                            <a href="/admin/usuarios" class={`gt-nav-link ${activeNav === 'users' ? 'active' : ''}`}>
                                <span>👥 Equipe & Permissões</span>
                            </a>
                        </nav>
                    </div>

                    <div class="gt-sidebar-footer">
                        <a href="/minha-conta" class="gt-user-card" title="Minha Conta">
                            <div class="gt-avatar">{initials}</div>
                            <div style="overflow: hidden;">
                                <div style="font-size: 12px; font-weight: 700; color: #FFFFFF; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{currentUser.name}</div>
                                <div style="font-size: 10px; color: #8CAAB9; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{currentUser.email}</div>
                            </div>
                        </a>
                        <form action="/auth/logout" method="post" style="margin: 0;">
                            <button type="submit" title="Sair do Painel" style="background: none; border: none; cursor: pointer; color: #8CAAB9; padding: 6px; border-radius: 6px;">
                                🚪
                            </button>
                        </form>
                    </div>
                </aside>

                <main class="gt-main">
                    <header class="gt-topbar">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <button type="button" class="gt-mobile-toggle" onclick="document.querySelector('.gt-sidebar').classList.toggle('open')" aria-label="Alternar Menu">
                                ☰
                            </button>
                            <div style="font-size: 16px; font-weight: 800; color: #FFFFFF;">
                                {title.split('•')[0].trim()}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <a href="/portal" target="_blank" class="gt-btn-outline" style="font-size: 12px;">
                                Ver Portal do Cliente ↗
                            </a>
                            <a href="/" target="_blank" class="gt-btn-outline" style="font-size: 12px;">
                                Ir para o Site ↗
                            </a>
                        </div>
                    </header>

                    <div class="gt-content">
                        {successMessage && <div class="gt-alert-success">✓ {successMessage}</div>}
                        {errorMessage && <div class="gt-alert-error">✕ {errorMessage}</div>}
                        {children}
                    </div>
                </main>
            </body>
        </html>
    );
};
