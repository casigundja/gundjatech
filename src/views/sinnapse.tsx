import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface SinnapsePageProps {
    title: string;
    description: string;
    h1: string;
    subtitle: string;
    badgeText?: string;
    schemaJsonLd?: string;
    currentUser?: { name: string; role: string } | null;
}

export const SinnapseLandingView: FC<SinnapsePageProps> = ({
    title,
    description,
    h1,
    subtitle,
    badgeText = 'Metodologia OneFlow • 100% de Entrega no Prazo',
    schemaJsonLd,
    currentUser
}) => {
    return (
        <BaseLayout title={title} description={description} currentUser={currentUser}>
            {schemaJsonLd && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJsonLd }} />
            )}

            {/* HERO */}
            <section style="padding: 80px 0 60px; text-align: center;">
                <div class="gt-container" style="max-width: 880px;">
                    <div style="display: inline-block; background: rgba(242, 194, 48, 0.12); border: 1px solid rgba(242, 194, 48, 0.3); color: #F2C230; padding: 6px 16px; border-radius: 50px; font-size: 13px; font-weight: 700; margin-bottom: 24px;">
                        {badgeText}
                    </div>
                    <h1 style="font-size: 42px; font-weight: 800; line-height: 1.25; margin-bottom: 20px;">
                        {h1}
                    </h1>
                    <p style="font-size: 18px; color: #E7F0F5; line-height: 1.6; max-width: 720px; margin: 0 auto 32px;">
                        {subtitle}
                    </p>
                    <div style="display: flex; gap: 16px; justify-content: center;">
                        <a href="/solicitar-orcamento" class="gt-btn-cta" style="padding: 14px 30px; font-size: 16px;">
                            Solicitar Orçamento do Site →
                        </a>
                        <a href="https://wa.me/5519953248420" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #fff; padding: 14px 26px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                            WhatsApp Direto
                        </a>
                    </div>
                </div>
            </section>

            {/* BENEFÍCIOS EXCLUSIVOS */}
            <section style="padding: 60px 0; background: #04253a; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div class="gt-container">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px;">
                        <div style="background: #063B5C; border: 1px solid #16749A; border-radius: 12px; padding: 28px;">
                            <h3 style="color: #F2C230; font-size: 18px; font-weight: bold; margin-bottom: 10px;">Design Exclusivo</h3>
                            <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6;">
                                Nada de templates genéricos. O layout do seu site é desenhado do zero para a sua marca, validado e aprovado etapa por etapa.
                            </p>
                        </div>
                        <div style="background: #063B5C; border: 1px solid #16749A; border-radius: 12px; padding: 28px;">
                            <h3 style="color: #F2C230; font-size: 18px; font-weight: bold; margin-bottom: 10px;">SEO Técnico & Performance</h3>
                            <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6;">
                                Arquitetura limpa, carregamento ultrarrápido e marcação de dados estruturados para aparecer no topo do Google e em respostas de IA.
                            </p>
                        </div>
                        <div style="background: #063B5C; border: 1px solid #16749A; border-radius: 12px; padding: 28px;">
                            <h3 style="color: #F2C230; font-size: 18px; font-weight: bold; margin-bottom: 10px;">Garantia em Contrato</h3>
                            <p style="color: #E7F0F5; font-size: 14px; line-height: 1.6;">
                                Cronograma fechado com datas de entrega definidas e garantia de satisfação registrada formalmente em contrato.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO DE CONVERSÃO / CONTATO */}
            <section style="padding: 70px 0; text-align: center;">
                <div class="gt-container" style="max-width: 700px;">
                    <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 12px;">Vamos tirar o seu novo site do papel?</h2>
                    <p style="color: #E7F0F5; font-size: 15px; margin-bottom: 26px;">
                        Converse com um especialista agora mesmo e receba um diagnóstico técnico gratuito da presença digital da sua empresa.
                    </p>
                    <a href="/solicitar-orcamento" class="gt-btn-cta" style="padding: 14px 32px; font-size: 16px;">
                        Iniciar Conversa Comercial →
                    </a>
                </div>
            </section>
        </BaseLayout>
    );
};
