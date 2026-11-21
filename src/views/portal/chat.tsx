import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalChatProps {
    currentUser: any;
    clientName?: string;
    conversation: any;
    messages: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalChatView: FC<PortalChatProps> = ({
    currentUser,
    clientName,
    conversation,
    messages,
    successMessage,
    errorMessage
}) => {
    return (
        <PortalLayout
            title="Falar com Atendimento • Portal do Cliente GundjaTech"
            activeNav="chat"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Canal Direto com o Time de Engenharia</h1>
                <p style="font-size: 13px; color: #527287; margin-top: 4px;">Tire dúvidas técnicas, envie instruções ou solicite atualizações em tempo real.</p>
            </div>

            <div class="gt-card" style="display: flex; flex-direction: column; height: calc(100vh - 240px); overflow: hidden;">
                <div style="padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid var(--gt-border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: #063B5C;">{conversation?.subject || 'Atendimento Exclusivo ao Cliente'}</div>
                        <div style="font-size: 11px; color: #8CAAB9;">Respondemos em minutos durante o horário comercial.</div>
                    </div>
                    <span class="gt-badge gt-badge-success">Chat Ativo</span>
                </div>

                <div id="portal-messages" data-conv-id={conversation?.id || 0} data-last-id={messages.length > 0 ? messages[messages.length - 1].id : 0} style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 14px; background: #FAFDFE;">
                    {messages.length === 0 ? (
                        <div style="text-align: center; color: #8CAAB9; margin: auto;">
                            <div style="font-size: 32px; margin-bottom: 8px;">👋</div>
                            <div style="font-size: 13px; font-weight: 700;">Inicie sua conversa com nosso time.</div>
                            <div style="font-size: 11px;">Qualquer dúvida sobre seu projeto ou fatura pode ser enviada abaixo.</div>
                        </div>
                    ) : (
                        messages.map((m: any) => {
                            const isMe = m.sender_type === 'client' || m.sender_type === 'user';
                            return (
                                <div style={`display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};`}>
                                    <div style={`max-width: 75%; padding: 12px 16px; border-radius: 14px; font-size: 13px; line-height: 1.5; ${isMe ? 'background: #063B5C; color: #FFFFFF; border-bottom-right-radius: 2px;' : 'background: #FFFFFF; color: #063B5C; border: 1px solid var(--gt-border); border-bottom-left-radius: 2px;'}`}>
                                        <div style={`font-size: 10px; font-weight: 700; margin-bottom: 4px; ${isMe ? 'color: #F2C230;' : 'color: #16749A;'}`}>
                                            {isMe ? 'Você' : (m.is_ai ? 'GundjaTech AI (Atendimento)' : 'Engenharia GundjaTech')}
                                        </div>
                                        <div>{m.message}</div>
                                    </div>
                                    <span style="font-size: 10px; color: #8CAAB9; margin-top: 4px; padding: 0 4px;">{m.created_at?.slice(11, 16) || ''}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                <div style="padding: 16px 20px; background: #FFFFFF; border-top: 1px solid var(--gt-border);">
                    <form action={`/portal/atendimento/${conversation?.id || 1}/mensagem`} method="post" style="display: flex; gap: 12px;">
                        <input
                            type="text"
                            name="message"
                            required
                            placeholder="Digite sua mensagem aqui..."
                            style="flex: 1; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--gt-border); font-size: 13px; color: #063B5C;"
                        />
                        <button type="submit" class="gt-btn-primary">
                            Enviar &rarr;
                        </button>
                    </form>
                </div>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                (function () {
                    var box = document.getElementById('portal-messages');
                    if (!box) return;
                    box.scrollTop = box.scrollHeight;
                    var convId = box.dataset.convId;
                    if (!convId || convId === '0') return;
                    var lastId = parseInt(box.dataset.lastId || '0', 10) || 0;
                    function playPortalChime() {
                        try {
                            var Ctx = window.AudioContext || window.webkitAudioContext;
                            if (!Ctx) return;
                            var ctx = new Ctx();
                            var osc = ctx.createOscillator();
                            var gain = ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(880, ctx.currentTime);
                            gain.gain.setValueAtTime(0.08, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.start();
                            osc.stop(ctx.currentTime + 0.24);
                        } catch (e) {}
                    }
                    async function pollPortalChat() {
                        try {
                            var r = await fetch('/portal/atendimento/' + convId + '/mensagens?after_id=' + lastId, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
                            if (!r.ok) return;
                            var d = await r.json();
                            var list = (d && Array.isArray(d.messages)) ? d.messages : [];
                            if (list.length > 0) {
                                var hasStaff = false;
                                list.forEach(function (m) {
                                    if (m.id > lastId) lastId = m.id;
                                    var isMe = m.sender_type === 'client' || m.sender_type === 'user';
                                    if (!isMe) hasStaff = true;
                                    var wrap = document.createElement('div');
                                    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (isMe ? 'flex-end' : 'flex-start') + ';';
                                    var b = document.createElement('div');
                                    b.style.cssText = 'max-width:75%;padding:12px 16px;border-radius:14px;font-size:13px;line-height:1.5;' + (isMe ? 'background:#063B5C;color:#fff;' : 'background:#fff;color:#063B5C;border:1px solid #CFE0EB;');
                                    b.textContent = m.message;
                                    wrap.appendChild(b);
                                    box.appendChild(wrap);
                                });
                                box.scrollTop = box.scrollHeight;
                                if (hasStaff) playPortalChime();
                            }
                        } catch (e) {
                        } finally {
                            setTimeout(pollPortalChat, 5000);
                        }
                    }
                    setTimeout(pollPortalChat, 5000);
                })();
            ` }} />
        </PortalLayout>
    );
};
