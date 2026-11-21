import type { FC, PropsWithChildren } from 'hono/jsx';

interface PortalLayoutProps {
    title?: string;
    activeNav?: string;
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    clientName?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalLayout: FC<PropsWithChildren<PortalLayoutProps>> = ({
    title = 'Portal do Cliente • GundjaTech',
    activeNav = 'dashboard',
    currentUser,
    clientName,
    successMessage,
    errorMessage,
    children
}) => {
    const initials = currentUser.name.slice(0, 2).toUpperCase();
    const displayName = clientName || currentUser.name;

    return (
        <html lang="pt-BR" class="h-full">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <link rel="icon" type="image/svg+xml" href="/img/favicon.svg?v=gt-icon2" />
                <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png?v=gt-icon2" />
                <link rel="preload" href="/fonts/ZalandoSansExpanded-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link rel="preload" href="/fonts/ZalandoSansExpanded-Bold.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="/build/assets/app-DaNuWIIs.css" />
                <link rel="stylesheet" href="/css/gt-panel.css?v=5" />
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --gt-gold: #F2C230;
                        --gt-dark: #063B5C;
                        --gt-blue: #16749A;
                        --gt-ice: #E7F0F5;
                        --gt-white: #FFFFFF;
                        --gt-border: #CFE0EB;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                        background-color: var(--gt-ice);
                        color: var(--gt-dark);
                        height: 100vh;
                        display: flex;
                        overflow: hidden;
                    }
                    .gt-sidebar {
                        width: 260px;
                        background: #FFFFFF;
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
                        color: var(--gt-dark);
                    }
                    .gt-logo-tech { color: var(--gt-gold); }
                    .gt-badge-client {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        padding: 2px 8px;
                        border-radius: 6px;
                        background: #FEF7DC;
                        color: #9A6B00;
                        border: 1px solid rgba(242, 194, 48, 0.4);
                    }
                    .gt-client-info {
                        padding: 14px 20px;
                        background: #F4F8FA;
                        border-bottom: 1px solid var(--gt-border);
                    }
                    .gt-client-label {
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #67879C;
                        letter-spacing: 0.5px;
                    }
                    .gt-client-name {
                        font-size: 13px;
                        font-weight: 700;
                        color: var(--gt-dark);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        margin-top: 2px;
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
                        color: #8CAAB9;
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
                        color: #4F687B;
                        text-decoration: none;
                        transition: all 0.15s ease;
                    }
                    .gt-nav-link:hover {
                        background: #EBF3F8;
                        color: var(--gt-dark);
                    }
                    .gt-nav-link.active {
                        background: var(--gt-dark);
                        color: var(--gt-gold);
                        font-weight: 700;
                    }
                    .gt-sidebar-footer {
                        padding: 16px;
                        border-top: 1px solid var(--gt-border);
                        background: #F8FAFC;
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
                        background: linear-gradient(135deg, var(--gt-dark), var(--gt-blue));
                        color: var(--gt-gold);
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
                        background: #FFFFFF;
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
                    }
                    .gt-card {
                        background: #FFFFFF;
                        border: 1px solid var(--gt-border);
                        border-radius: 16px;
                        box-shadow: 0 4px 16px rgba(6, 59, 92, 0.04);
                    }
                    .gt-btn-primary {
                        background: var(--gt-gold);
                        color: var(--gt-dark);
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
                        color: var(--gt-dark);
                        font-weight: 700;
                        padding: 8px 16px;
                        border-radius: 10px;
                        text-decoration: none;
                        border: 1px solid var(--gt-border);
                        cursor: pointer;
                        font-size: 13px;
                    }
                    .gt-btn-outline:hover {
                        background: #F4F8FA;
                    }
                    .gt-alert-success {
                        background: #ECFDF5;
                        border: 1px solid #A7F3D0;
                        color: #065F46;
                        padding: 12px 16px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                        font-size: 13px;
                        font-weight: 600;
                    }
                    .gt-alert-error {
                        background: #FEF2F2;
                        border: 1px solid #FECACA;
                        color: #991B1B;
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
                    .gt-badge-success { background: #DCFCE7; color: #166534; }
                    .gt-badge-warning { background: #FEF3C7; color: #92400E; }
                    .gt-badge-info { background: #E0F2FE; color: #0369A1; }
                    .gt-badge-danger { background: #FEE2E2; color: #991B1B; }
                    .gt-mobile-toggle {
                        display: none;
                        background: transparent;
                        border: 1px solid var(--gt-border);
                        color: var(--gt-dark);
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
                            <a href="/portal" class="gt-logo">
                                <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                                    <path d="M20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36C28.8366 36 36 28.8366 36 20H20V12H34.8C32.4 7.2 26.6 4 20 4Z" fill="#16749A" />
                                    <circle cx="28" cy="12" r="4" fill="#F2C230" />
                                </svg>
                                <span>Gundja<span class="gt-logo-tech">Tech</span></span>
                            </a>
                            <span class="gt-badge-client">Cliente</span>
                        </div>

                        <div class="gt-client-info">
                            <div class="gt-client-label">Área do Cliente</div>
                            <div class="gt-client-name">{displayName}</div>
                        </div>

                        <nav class="gt-nav">
                            <a href="/portal" class={`gt-nav-link ${activeNav === 'dashboard' ? 'active' : ''}`}>
                                <span>📊 Início & Resumo</span>
                            </a>

                            <div class="gt-nav-section">Projetos & Pedidos</div>
                            <a href="/portal/solicitacoes" class={`gt-nav-link ${activeNav === 'requests' ? 'active' : ''}`}>
                                <span>📋 Minhas Solicitações</span>
                            </a>
                            <a href="/portal/projetos" class={`gt-nav-link ${activeNav === 'projects' ? 'active' : ''}`}>
                                <span>🚀 Meus Projetos</span>
                            </a>
                            <a href="/portal/orcamentos" class={`gt-nav-link ${activeNav === 'quotations' ? 'active' : ''}`}>
                                <span>📑 Orçamentos Recebidos</span>
                            </a>

                            <div class="gt-nav-section">Ativos & Suporte</div>
                            <a href="/portal/dominios" class={`gt-nav-link ${activeNav === 'domains' ? 'active' : ''}`}>
                                <span>🌐 Meus Domínios</span>
                            </a>
                            <a href="/portal/campanhas" class={`gt-nav-link ${activeNav === 'campaigns' ? 'active' : ''}`}>
                                <span>📈 Tráfego & Anúncios</span>
                            </a>
                            <a href="/portal/financeiro" class={`gt-nav-link ${activeNav === 'finance' ? 'active' : ''}`}>
                                <span>💳 Financeiro & Faturas</span>
                            </a>
                            <a href="/portal/atendimento" class={`gt-nav-link ${activeNav === 'chat' ? 'active' : ''}`}>
                                <span>💬 Falar com Atendimento</span>
                            </a>
                        </nav>
                    </div>

                    <div class="gt-sidebar-footer">
                        <a href="/minha-conta" class="gt-user-card" title="Minha Conta">
                            <div class="gt-avatar">{initials}</div>
                            <div style="overflow: hidden;">
                                <div style="font-size: 12px; font-weight: 700; color: #063B5C; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{currentUser.name}</div>
                                <div style="font-size: 10px; color: #67879C; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{currentUser.email}</div>
                            </div>
                        </a>
                        <form action="/auth/logout" method="post" style="margin: 0;">
                            <button type="submit" title="Sair do Portal" style="background: none; border: none; cursor: pointer; color: #8CAAB9; padding: 6px; border-radius: 6px;">
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
                            <div style="font-size: 16px; font-weight: 800; color: #063B5C;">
                                {title.split('•')[0].trim()}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <a href="/portal/solicitacoes/nova" class="gt-btn-primary">
                                + Nova Solicitação
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
