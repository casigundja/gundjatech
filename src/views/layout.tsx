import type { FC, PropsWithChildren } from 'hono/jsx';

interface LayoutProps {
    title: string;
    description?: string;
    canonical?: string;
    activeNav?: string;
    currentUser?: { name: string; role: string } | null;
}

export const BaseLayout: FC<PropsWithChildren<LayoutProps>> = ({
    title,
    description = 'GundjaTech • Engenharia digital de alto impacto, desenvolvimento sob medida, criação de sites e cibersegurança.',
    canonical,
    activeNav,
    currentUser,
    children
}) => {
    return (
        <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <meta name="description" content={description} />
                {canonical && <link rel="canonical" href={canonical} />}
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --gt-gold: #F2C230;
                        --gt-gold-hover: #E0B020;
                        --gt-dark-blue: #063B5C;
                        --gt-deep-dark: #03253b;
                        --gt-med-blue: #16749A;
                        --gt-ice: #E7F0F5;
                        --gt-white: #FFFFFF;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
                        background-color: var(--gt-dark-blue);
                        color: var(--gt-white);
                        line-height: 1.6;
                        overflow-x: hidden;
                    }
                    a { color: inherit; text-decoration: none; }
                    .gt-container {
                        width: 100%;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 0 24px;
                    }
                    /* HEADER */
                    .gt-navbar {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px 0;
                        border-bottom: 1px solid rgba(255,255,255,0.08);
                    }
                    .gt-logo {
                        font-size: 24px;
                        font-weight: 800;
                        letter-spacing: -0.5px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .gt-logo svg { width: 32px; height: 32px; }
                    .gt-logo-tech { color: var(--gt-gold); }
                    .gt-nav-links {
                        display: flex;
                        gap: 28px;
                        align-items: center;
                        font-size: 15px;
                        font-weight: 600;
                    }
                    .gt-nav-link { color: var(--gt-ice); transition: color 0.2s; }
                    .gt-nav-link:hover, .gt-nav-link.active { color: var(--gt-gold); }
                    .gt-btn-cta {
                        background: var(--gt-gold);
                        color: var(--gt-dark-blue);
                        padding: 10px 22px;
                        border-radius: 8px;
                        font-weight: 800;
                        font-size: 14px;
                        transition: background 0.2s, transform 0.1s;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .gt-btn-cta:hover {
                        background: var(--gt-gold-hover);
                        transform: translateY(-1px);
                    }
                    /* FOOTER */
                    .gt-footer {
                        background: var(--gt-deep-dark);
                        border-top: 1px solid rgba(255,255,255,0.08);
                        padding: 60px 0 30px;
                        margin-top: 80px;
                    }
                    .gt-footer-grid {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr 1.5fr;
                        gap: 40px;
                        margin-bottom: 40px;
                    }
                    .gt-footer-col h4 {
                        color: var(--gt-gold);
                        font-size: 16px;
                        font-weight: 700;
                        margin-bottom: 18px;
                    }
                    .gt-footer-col ul { list-style: none; }
                    .gt-footer-col ul li { margin-bottom: 10px; font-size: 14px; color: var(--gt-ice); }
                    .gt-footer-col ul li a:hover { color: var(--gt-gold); }
                    .gt-footer-bottom {
                        border-top: 1px solid rgba(255,255,255,0.06);
                        padding-top: 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 13px;
                        color: rgba(231,240,245,0.7);
                    }
                    @media (max-width: 768px) {
                        .gt-nav-links { display: none; }
                        .gt-footer-grid { grid-template-columns: 1fr; gap: 30px; }
                        .gt-footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
                    }
                ` }} />
            </head>
            <body>
                <header>
                    <div class="gt-container">
                        <nav class="gt-navbar">
                            <a href="/" class="gt-logo">
                                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36C28.8366 36 36 28.8366 36 20H20V12H34.8C32.4 7.2 26.6 4 20 4Z" fill="#16749A" />
                                    <circle cx="28" cy="12" r="4" fill="#F2C230" />
                                </svg>
                                <span>Gundja<span class="gt-logo-tech">Tech</span></span>
                            </a>
                            <div class="gt-nav-links">
                                <a href="/" class={`gt-nav-link ${activeNav === 'home' ? 'active' : ''}`}>Início</a>
                                <a href="/servicos" class={`gt-nav-link ${activeNav === 'services' ? 'active' : ''}`}>Serviços</a>
                                <a href="/portfolio" class={`gt-nav-link ${activeNav === 'portfolio' ? 'active' : ''}`}>Cases & Projetos</a>
                                <a href="/sobre" class={`gt-nav-link ${activeNav === 'about' ? 'active' : ''}`}>Sobre</a>
                                <a href="/blog" class={`gt-nav-link ${activeNav === 'blog' ? 'active' : ''}`}>Blog</a>
                                <a href="/contato" class={`gt-nav-link ${activeNav === 'contact' ? 'active' : ''}`}>Contato</a>
                            </div>
                            <div>
                                {currentUser ? (
                                    <a href={currentUser.role === 'client' ? '/portal/dashboard' : '/admin/dashboard'} class="gt-btn-cta">
                                        Meu Painel ({currentUser.name})
                                    </a>
                                ) : (
                                    <a href="/login" class="gt-btn-cta">
                                        Área do Cliente
                                    </a>
                                )}
                            </div>
                        </nav>
                    </div>
                </header>

                <main>{children}</main>

                <footer class="gt-footer">
                    <div class="gt-container">
                        <div class="gt-footer-grid">
                            <div class="gt-footer-col">
                                <div class="gt-logo" style="margin-bottom: 16px;">
                                    <span>Gundja<span class="gt-logo-tech">Tech</span></span>
                                </div>
                                <p style="font-size: 14px; color: var(--gt-ice); max-width: 320px; margin-bottom: 16px;">
                                    Engenharia digital de alta performance, desenvolvimento web sob medida, SEO técnico e cibersegurança empresarial.
                                </p>
                                <p style="font-size: 13px; color: var(--gt-gold); font-weight: 700;">
                                    🌍 Conectando projetos em Angola, Portugal e África do Sul.
                                </p>
                            </div>
                            <div class="gt-footer-col">
                                <h4>Soluções</h4>
                                <ul>
                                    <li><a href="/criacao-de-sites">Criação de Sites</a></li>
                                    <li><a href="/desenvolvimento-de-sites">Desenvolvimento Sob Medida</a></li>
                                    <li><a href="/criacao-de-sites-wordpress">WordPress & Elementor</a></li>
                                    <li><a href="/ciberseguranca">Cibersegurança & DNS</a></li>
                                    <li><a href="/quanto-custa-um-site">Quanto Custa um Site</a></li>
                                </ul>
                            </div>
                            <div class="gt-footer-col">
                                <h4>Cases</h4>
                                <ul>
                                    <li><a href="/cases/klasse">KLASSE Gestão Escolar</a></li>
                                    <li><a href="/cases/instituto-paraiso-do-saber">Instituto Paraíso do Saber</a></li>
                                    <li><a href="/cases/cotech-contabilidade">Cotech Contabilidade</a></li>
                                    <li><a href="/portfolio">Ver Todos os Cases</a></li>
                                </ul>
                            </div>
                            <div class="gt-footer-col">
                                <h4>Atendimento</h4>
                                <ul>
                                    <li>contato@gundjatech.com</li>
                                    <li>WhatsApp: +55 (19) 95324-8420</li>
                                    <li><a href="/acompanhar-solicitacao" style="color: var(--gt-gold); font-weight: bold;">Rastrear Solicitação →</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="gt-footer-bottom">
                            <div>© 2026 GundjaTech. Todos os direitos reservados.</div>
                            <div>
                                <a href="/politica-de-privacidade" style="margin-left: 20px;">Política de Privacidade</a>
                            </div>
                        </div>
                    </div>
                </footer>
            </body>
        </html>
    );
};
