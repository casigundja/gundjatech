import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface PortfolioProps {
    currentUser?: { name: string; role: string } | null;
    projects: Array<{
        id: number;
        title: string;
        slug: string;
        client_name: string | null;
        summary: string | null;
        category: string | null;
        website_url?: string | null;
    }>;
}

export const PortfolioView: FC<PortfolioProps> = ({ currentUser, projects }) => {
    return (
        <BaseLayout title="Portfólio & Cases de Sucesso • GundjaTech" activeNav="portfolio" currentUser={currentUser}>
            <section style="padding: 60px 0;">
                <div class="gt-container">
                    <div style="text-align: center; max-width: 700px; margin: 0 auto 50px;">
                        <h1 style="font-size: 38px; font-weight: 800; margin-bottom: 12px;">Nosso Portfólio</h1>
                        <p style="color: #E7F0F5; font-size: 16px;">
                            Projetos reais entregues para líderes em educação, tecnologia, saúde e finanças.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px;">
                        {projects.map((p) => (
                            <div key={p.id} style="background: #04253a; border: 1px solid #16749A; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
                                <div style="height: 160px; background: #16749A; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #F2C230; padding: 20px; text-align: center;">
                                    {p.client_name || p.title}
                                </div>
                                <div style="padding: 24px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                                    <div>
                                        <div style="font-size: 12px; color: #F2C230; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">
                                            {p.category || 'Case de Sucesso'}
                                        </div>
                                        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">{p.title}</h3>
                                        <p style="font-size: 14px; color: #E7F0F5; line-height: 1.5; margin-bottom: 16px;">
                                            {p.summary || 'Solução desenvolvida sob medida pela equipe da GundjaTech.'}
                                        </p>
                                    </div>
                                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
                                        <a href={`/cases/${p.slug}`} style="color: #F2C230; font-weight: 700; font-size: 13px;">Ver Estudo de Caso →</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </BaseLayout>
    );
};
