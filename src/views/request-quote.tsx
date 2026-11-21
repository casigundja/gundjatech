import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface RequestQuoteProps {
    currentUser?: { name: string; role: string } | null;
    services: Array<{ id: number; name: string; slug: string }>;
    selectedServiceId?: number | null;
}

export const RequestQuoteView: FC<RequestQuoteProps> = ({ currentUser, services, selectedServiceId }) => {
    return (
        <BaseLayout
            title="Solicitar Orçamento de Site & Sistemas • GundjaTech"
            description="Solicite uma proposta comercial personalizada para criação de sites, sistemas web, portais ou cibersegurança."
            currentUser={currentUser}
        >
            <section style="padding: 70px 0;">
                <div class="gt-container" style="max-width: 800px;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <div style="display: inline-block; background: rgba(242, 194, 48, 0.12); border: 1px solid rgba(242, 194, 48, 0.3); color: #F2C230; padding: 6px 16px; border-radius: 50px; font-size: 13px; font-weight: 700; margin-bottom: 16px;">
                            📋 Proposta Comercial Sob Medida
                        </div>
                        <h1 style="font-size: 36px; font-weight: 800; margin-bottom: 12px; color: #FFFFFF;">
                            Solicite seu Orçamento
                        </h1>
                        <p style="color: #E7F0F5; font-size: 16px;">
                            Preencha os detalhes do seu projeto. Retornamos com escopo, prazo e investimento em até 4 horas úteis.
                        </p>
                    </div>

                    <div style="background: #04253a; border: 1px solid #16749A; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                        <form action="/solicitar-orcamento" method="post" enctype="multipart/form-data">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Seu Nome Completo *</label>
                                    <input type="text" name="contact_name" required placeholder="Ex: Roberto Silva" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Nome da Empresa</label>
                                    <input type="text" name="company_name" placeholder="Ex: Silva & Associados" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">E-mail Corporativo *</label>
                                    <input type="email" name="email" required placeholder="voce@empresa.com.br" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">WhatsApp / Telefone *</label>
                                    <input type="tel" name="phone" required placeholder="(11) 90000-0000" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                                </div>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Tipo de Solução Desejada *</label>
                                <select name="service_id" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;">
                                    <option value="">Selecione um serviço...</option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.id} selected={selectedServiceId === s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Título do Projeto *</label>
                                <input type="text" name="title" required placeholder="Ex: Criação do novo portal institucional da empresa" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Descrição Detalhada do Projeto *</label>
                                <textarea name="description" required rows={5} placeholder="Conte-nos o objetivo principal, páginas necessárias, referências visuais que gosta ou integrações que precisará..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none; font-family: inherit;"></textarea>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                                <div>
                                    <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Investimento Previsto (R$)</label>
                                    <input type="number" name="estimated_budget" placeholder="Ex: 5000" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Prazo Desejado</label>
                                    <input type="date" name="desired_deadline" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; outline: none;" />
                                </div>
                            </div>

                            <div style="margin-bottom: 28px;">
                                <label style="display: block; font-size: 13px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Anexo / Briefing (Opcional - PDF, DOC, Imagens)</label>
                                <input type="file" name="attachment" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px dashed #16749A; background: rgba(22, 116, 154, 0.1); color: #E7F0F5; box-sizing: border-box;" />
                            </div>

                            <button type="submit" class="gt-btn-cta" style="width: 100%; padding: 15px; font-size: 16px; border: none; cursor: pointer; justify-content: center;">
                                Enviar Pedido de Orçamento →
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </BaseLayout>
    );
};
