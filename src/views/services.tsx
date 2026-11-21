import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface ServicesListProps {
    currentUser?: { name: string; role: string } | null;
    services: Array<{
        id: number;
        name: string;
        slug: string;
        summary: string | null;
        description: string | null;
        price_starting_at: number | null;
        category_name?: string | null;
    }>;
}

export const ServicesListView: FC<ServicesListProps> = ({ currentUser, services }) => {
    return (
        <BaseLayout title="Serviços • GundjaTech" activeNav="services" currentUser={currentUser}>
            <section style="padding: 60px 0;">
                <div class="gt-container">
                    <div style="text-align: center; max-width: 700px; margin: 0 auto 50px;">
                        <h1 style="font-size: 38px; font-weight: 800; margin-bottom: 12px;">Serviços & Soluções Digitais</h1>
                        <p style="color: #E7F0F5; font-size: 16px;">
                            Da concepção visual à arquitetura de software e segurança na nuvem.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px;">
                        {services.map((s) => (
                            <div key={s.id} style="background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <h3 style="color: #F2C230; font-size: 20px; font-weight: 700; margin-bottom: 12px;">{s.name}</h3>
                                    <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                                        {s.summary || s.description || 'Solução tecnológica corporativa personalizada sob medida.'}
                                    </p>
                                </div>
                                <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                                    {s.price_starting_at ? (
                                        <span style="font-size: 13px; color: #E7F0F5;">
                                            A partir de <b style="color: #F2C230;">R$ {s.price_starting_at.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
                                        </span>
                                    ) : (
                                        <span style="font-size: 13px; color: #E7F0F5;">Sob consulta</span>
                                    )}
                                    <a href={`/servicos/${s.slug}`} style="color: #F2C230; font-weight: 700; font-size: 13px;">Detalhes →</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </BaseLayout>
    );
};
