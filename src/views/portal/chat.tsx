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
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Canal Direto com o Time de Engenharia</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Tire dúvidas técnicas, envie instruções ou solicite atualizações em tempo real.</p>
                </div>
            </div>

            <div class="gtb-card !p-0 flex flex-col overflow-hidden" style="height: calc(100vh - 210px); min-height: 420px;">
                <div class="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-8 h-8 rounded-lg bg-[#16749A]/20 border border-[#16749A]/35 flex items-center justify-center text-[#F2C230] shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        </span>
                        <div class="min-w-0">
                            <div class="text-xs font-extrabold text-white truncate">{conversation?.subject || 'Atendimento Exclusivo ao Cliente'}</div>
                            <div class="text-[11px] text-[#8C95AA]">Respondemos em minutos durante o horário comercial.</div>
                        </div>
                    </div>
                    <span class="gt-badge gt-badge-success">Chat Ativo</span>
                </div>

                <div
                    id="portal-messages"
                    data-conv-id={conversation?.id || 0}
                    data-last-id={messages.length > 0 ? messages[messages.length - 1].id : 0}
                    class="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5"
                >
                    {messages.length === 0 ? (
                        <div class="text-center text-[#8C95AA] m-auto py-8">
                            <div class="w-11 h-11 rounded-2xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] mx-auto mb-2.5">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            </div>
                            <div class="text-xs font-bold text-white">Inicie sua conversa com nosso time.</div>
                            <div class="text-[11px] text-[#8C95AA] mt-0.5">Qualquer dúvida sobre seu projeto ou fatura pode ser enviada abaixo.</div>
                        </div>
                    ) : (
                        messages.map((m: any) => {
                            const isMe = m.sender_type === 'client' || m.sender_type === 'user';
                            return (
                                <div style={`display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'};`}>
                                    <div style={`max-width: 82%; padding: 11px 15px; border-radius: 14px; font-size: 12.5px; line-height: 1.5; ${isMe ? 'background: linear-gradient(135deg, #063B5C 0%, #16749A 100%); color: #FFFFFF; border-bottom-right-radius: 3px;' : 'background: rgba(22, 116, 154, 0.12); color: inherit; border: 1px solid rgba(22, 116, 154, 0.28); border-bottom-left-radius: 3px;'}`}>
                                        <div style={`font-size: 10px; font-weight: 800; margin-bottom: 3px; ${isMe ? 'color: #F2C230;' : 'color: #16749A;'}`}>
                                            {isMe ? 'Você' : (m.is_ai ? 'GundjaTech AI (Atendimento)' : 'Engenharia GundjaTech')}
                                        </div>
                                        <div>{m.message}</div>
                                    </div>
                                    <span class="text-[10px] text-[#8C95AA] mt-1 px-1">{m.created_at?.slice(11, 16) || ''}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                <div class="p-3.5 sm:p-4 border-t border-white/10">
                    <form action={`/portal/atendimento/${conversation?.id || 1}/mensagem`} method="post" class="flex items-center gap-2.5 m-0">
                        <input
                            type="text"
                            name="message"
                            required
                            placeholder="Digite sua mensagem aqui..."
                            class="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white"
                        />
                        <button type="submit" class="gt-btn-primary gt-btn-sm shrink-0">
                            <span>Enviar</span>
                            <span>&rarr;</span>
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
                                    b.style.cssText = 'max-width:82%;padding:11px 15px;border-radius:14px;font-size:12.5px;line-height:1.5;' + (isMe ? 'background:linear-gradient(135deg,#063B5C 0%,#16749A 100%);color:#fff;' : 'background:rgba(22,116,154,0.12);border:1px solid rgba(22,116,154,0.28);');
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
