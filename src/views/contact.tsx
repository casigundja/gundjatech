import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

export const ContactView: FC<{ currentUser?: { name: string; role: string } | null }> = ({ currentUser }) => {
    return (
        <BaseLayout title="Contato • Fale com a GundjaTech" activeNav="contact" currentUser={currentUser}>
            <section style="padding: 60px 0;">
                <div class="gt-container" style="max-width: 900px;">
                    <div style="text-align: center; margin-bottom: 40px;">
                        <h1 style="font-size: 38px; font-weight: 800; margin-bottom: 12px;">Fale com Nossos Especialistas</h1>
                        <p style="color: #E7F0F5; font-size: 16px;">
                            Resposta em até 4 horas úteis. Análise preliminar do seu projeto antes da proposta.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; background: #04253a; border: 1px solid #16749A; border-radius: 16px; padding: 40px;">
                        <div>
                            <h3 style="color: #F2C230; font-size: 22px; font-weight: 700; margin-bottom: 16px;">Canais Diretos</h3>
                            <p style="color: #E7F0F5; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                                Se preferir um atendimento ágil por mensagem ou ligação, nossos diretores de projeto estão à disposição:
                            </p>
                            <div style="margin-bottom: 16px;">
                                <div style="font-size: 13px; color: #F2C230; font-weight: bold;">WhatsApp Comercial</div>
                                <div style="font-size: 16px; color: #fff;">+55 (19) 95324-8420</div>
                            </div>
                            <div style="margin-bottom: 24px;">
                                <div style="font-size: 13px; color: #F2C230; font-weight: bold;">E-mail</div>
                                <div style="font-size: 16px; color: #fff;">contato@gundjatech.com</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.04); border-left: 3px solid #F2C230; padding: 14px; font-size: 13px; color: #E7F0F5;">
                                🔒 Assinamos termo de confidencialidade (NDA) para proteger os dados e ideias do seu projeto antes da reunião inicial.
                            </div>
                        </div>

                        <div>
                            <form action="/contato" method="post">
                                <div style="margin-bottom: 14px;">
                                    <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Seu Nome *</label>
                                    <input type="text" name="name" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box;" />
                                </div>
                                <div style="margin-bottom: 14px;">
                                    <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 4px;">E-mail Corporativo *</label>
                                    <input type="email" name="email" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box;" />
                                </div>
                                <div style="margin-bottom: 14px;">
                                    <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Telefone / WhatsApp</label>
                                    <input type="tel" name="phone" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box;" />
                                </div>
                                <div style="margin-bottom: 16px;">
                                    <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Sobre o Projeto *</label>
                                    <textarea name="message" required rows={4} placeholder="Conte-nos o objetivo da sua empresa..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #16749A; background: #063B5C; color: #fff; box-sizing: border-box; font-family: inherit;"></textarea>
                                </div>
                                <button type="submit" class="gt-btn-cta" style="width: 100%; padding: 12px; border: none; font-size: 15px; cursor: pointer;">
                                    Enviar Mensagem
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </BaseLayout>
    );
};
