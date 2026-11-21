import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface HomeProps {
    currentUser?: { name: string; role: string } | null;
    categories: Array<{ id: number; name: string; slug: string; description: string | null; services?: Array<{ name: string; slug: string; summary: string | null; price_starting_at: number | null }> }>;
    featuredProjects: Array<{ id: number; title: string; slug: string; client_name: string | null; summary: string | null; category: string | null }>;
    latestPosts: Array<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null }>;
}

export const HomeView: FC<HomeProps> = ({ currentUser, categories, featuredProjects, latestPosts }) => {
    return (
        <BaseLayout title="GundjaTech • Criação de Sites, Sistemas Web e Cibersegurança" activeNav="home" currentUser={currentUser}>
            {/* HERO SECTION */}
            <section style="padding: 90px 0 70px; text-align: center; position: relative;">
                <div class="gt-container" style="max-width: 900px;">
                    <div style="display: inline-block; background: rgba(242, 194, 48, 0.12); border: 1px solid rgba(242, 194, 48, 0.3); color: #F2C230; padding: 6px 16px; border-radius: 50px; font-size: 13px; font-weight: 700; margin-bottom: 24px;">
                        ⚡ Engenharia Digital de Alta Performance
                    </div>
                    <h1 style="font-size: 46px; font-weight: 800; line-height: 1.2; letter-spacing: -1px; margin-bottom: 22px;">
                        Criamos sites profissionais e sistemas sob medida que <span style="color: #F2C230;">geram resultados reais</span>
                    </h1>
                    <p style="font-size: 19px; color: #E7F0F5; line-height: 1.6; max-width: 720px; margin: 0 auto 36px;">
                        Do design exclusivo à infraestrutura segura. Ajudamos empresas no Brasil, Angola e Portugal a conquistarem autoridade, velocidade e novos clientes.
                    </p>
                    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                        <a href="/solicitar-orcamento" class="gt-btn-cta" style="padding: 14px 32px; font-size: 16px;">
                            Solicitar Proposta Comercial →
                        </a>
                        <a href="https://wa.me/5519953248420" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #FFFFFF; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-flex; align-items: center; gap: 8px;">
                            Falar no WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            {/* DIFERENCIAIS / MÉTRICAS */}
            <section style="background: #04253a; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 40px 0;">
                <div class="gt-container">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; text-align: center;">
                        <div>
                            <div style="font-size: 32px; font-weight: 800; color: #F2C230;">100%</div>
                            <div style="font-size: 14px; color: #E7F0F5;">Projetos entregues no prazo</div>
                        </div>
                        <div>
                            <div style="font-size: 32px; font-weight: 800; color: #F2C230;">3</div>
                            <div style="font-size: 14px; color: #E7F0F5;">Continentes atendidos</div>
                        </div>
                        <div>
                            <div style="font-size: 32px; font-weight: 800; color: #F2C230;">99.9%</div>
                            <div style="font-size: 14px; color: #E7F0F5;">Disponibilidade & Cloud</div>
                        </div>
                        <div>
                            <div style="font-size: 32px; font-weight: 800; color: #F2C230;">10+</div>
                            <div style="font-size: 14px; color: #E7F0F5;">Anos de engenharia digital</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SERVIÇOS EM DESTAQUE */}
            <section style="padding: 80px 0;">
                <div class="gt-container">
                    <div style="text-align: center; margin-bottom: 50px;">
                        <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 12px;">Soluções Estratégicas para o seu Negócio</h2>
                        <p style="color: #E7F0F5; font-size: 16px;">Tudo o que sua empresa precisa para liderar seu segmento digital</p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px;">
                        <div style="background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 32px; transition: transform 0.2s;">
                            <div style="font-size: 28px; margin-bottom: 16px;">🌐</div>
                            <h3 style="color: #F2C230; font-size: 20px; font-weight: 700; margin-bottom: 12px;">Criação de Sites</h3>
                            <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                                Sites institucionais, corporativos B2B e landing pages desenvolvidos com pesquisa de público, UX e SEO avançado.
                            </p>
                            <a href="/criacao-de-sites" style="color: #F2C230; font-weight: 700; font-size: 14px;">Conhecer detalhes →</a>
                        </div>

                        <div style="background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 32px;">
                            <div style="font-size: 28px; margin-bottom: 16px;">⚙️</div>
                            <h3 style="color: #F2C230; font-size: 20px; font-weight: 700; margin-bottom: 12px;">Desenvolvimento Sob Medida</h3>
                            <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                                Plataformas web, portais de clientes, dashboards analíticos e integrações complexas com ERPs e CRMs.
                            </p>
                            <a href="/desenvolvimento-de-sites" style="color: #F2C230; font-weight: 700; font-size: 14px;">Conhecer detalhes →</a>
                        </div>

                        <div style="background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 32px;">
                            <div style="font-size: 28px; margin-bottom: 16px;">🛡️</div>
                            <h3 style="color: #F2C230; font-size: 20px; font-weight: 700; margin-bottom: 12px;">Cibersegurança & Nuvem</h3>
                            <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                                Gestão profissional de DNS, certificados SSL, proteção anti-DDoS, backups automatizados e conformidade LGPD.
                            </p>
                            <a href="/ciberseguranca" style="color: #F2C230; font-weight: 700; font-size: 14px;">Conhecer detalhes →</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* CASES EM DESTAQUE */}
            <section style="padding: 70px 0; background: #03253b; border-top: 1px solid rgba(255,255,255,0.06);">
                <div class="gt-container">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
                        <div>
                            <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 8px;">Cases de Sucesso</h2>
                            <p style="color: #E7F0F5; font-size: 15px;">Conheça projetos reais desenvolvidos pela GundjaTech</p>
                        </div>
                        <a href="/portfolio" style="color: #F2C230; font-weight: 700;">Ver todos os projetos →</a>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px;">
                        <div style="background: #063B5C; border: 1px solid #16749A; border-radius: 12px; overflow: hidden;">
                            <div style="height: 180px; background: #16749A; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #F2C230;">
                                KLASSE
                            </div>
                            <div style="padding: 24px;">
                                <div style="font-size: 12px; color: #F2C230; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Educação & Gestão</div>
                                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">Plataforma Escolar KLASSE</h3>
                                <p style="font-size: 14px; color: #E7F0F5; line-height: 1.5; margin-bottom: 16px;">
                                    Ecossistema completo de gestão educacional com portal de notas, presenças e comunicação institucional.
                                </p>
                                <a href="/cases/klasse" style="color: #F2C230; font-weight: 700; font-size: 13px;">Ler estudo de caso →</a>
                            </div>
                        </div>

                        <div style="background: #063B5C; border: 1px solid #16749A; border-radius: 12px; overflow: hidden;">
                            <div style="height: 180px; background: #16749A; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #F2C230; text-align: center; padding: 20px;">
                                Instituto Paraíso do Saber
                            </div>
                            <div style="padding: 24px;">
                                <div style="font-size: 12px; color: #F2C230; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Ensino & Matrículas</div>
                                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">Portal Institucional</h3>
                                <p style="font-size: 14px; color: #E7F0F5; line-height: 1.5; margin-bottom: 16px;">
                                    Novo portal focado em captação de novas matrículas, credibilidade e velocidade no carregamento.
                                </p>
                                <a href="/cases/instituto-paraiso-do-saber" style="color: #F2C230; font-weight: 700; font-size: 13px;">Ler estudo de caso →</a>
                            </div>
                        </div>

                        <div style="background: #063B5C; border: 1px solid #16749A; border-radius: 12px; overflow: hidden;">
                            <div style="height: 180px; background: #16749A; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #F2C230; text-align: center; padding: 20px;">
                                Cotech Contabilidade
                            </div>
                            <div style="padding: 24px;">
                                <div style="font-size: 12px; color: #F2C230; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">B2B & Finanças</div>
                                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">Presença Digital & Conversão</h3>
                                <p style="font-size: 14px; color: #E7F0F5; line-height: 1.5; margin-bottom: 16px;">
                                    Redesign estrutural focado em leads qualificados para abertura de empresas e BPO financeiro.
                                </p>
                                <a href="/cases/cotech-contabilidade" style="color: #F2C230; font-weight: 700; font-size: 13px;">Ler estudo de caso →</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA FINAL */}
            <section style="padding: 80px 0; text-align: center;">
                <div class="gt-container" style="max-width: 760px; background: #04253a; border: 1px solid #16749A; border-radius: 16px; padding: 48px 32px;">
                    <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 14px;">Pronto para levar a presença digital da sua empresa a outro nível?</h2>
                    <p style="color: #E7F0F5; font-size: 16px; margin-bottom: 28px;">
                        Nossos diretores analisam o seu negócio e apresentam uma proposta personalizada com escopo, prazo e investimento fechados.
                    </p>
                    <a href="/solicitar-orcamento" class="gt-btn-cta" style="padding: 14px 32px; font-size: 16px;">
                        Solicitar Orçamento Gratuito →
                    </a>
                </div>
            </section>
        </BaseLayout>
    );
};
