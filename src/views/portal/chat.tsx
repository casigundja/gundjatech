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

function formatBrtTime(raw?: string | null): string {
    if (!raw) return '';
    try {
        const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return raw.slice(11, 16);
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        }).format(d);
    } catch {
        return raw.slice(11, 16);
    }
}

export const PortalChatView: FC<PortalChatProps> = ({
    currentUser,
    clientName,
    conversation,
    messages,
    successMessage,
    errorMessage
}) => {
    const userInitials = String(currentUser?.name || 'VC').slice(0, 2).toUpperCase();

    return (
        <PortalLayout
            title="Atendimento • Portal do Cliente GundjaTech"
            activeNav="chat"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Canal Direto com o Time</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Tire dúvidas técnicas, envie instruções ou solicite atualizações em tempo real.</p>
                </div>
            </div>

            <div class="gt-grid-detail items-start">
                {/* Main Chat Workspace */}
                <div class="gtb-card !p-0 flex flex-col overflow-hidden gt-portal-chat-box">
                    <div class="gt-chat-header px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="gt-chat-brand-icon">
                                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                            </span>
                            <div class="min-w-0">
                                <div class="text-xs font-extrabold text-white truncate">{conversation?.subject || 'Atendimento Exclusivo ao Cliente'}</div>
                                <div class="flex items-center gap-2 text-[11px] text-[#8C95AA] mt-0.5">
                                    <span class="inline-flex items-center gap-1 text-emerald-500 font-bold">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Online agora
                                    </span>
                                    <span>•</span>
                                    <span>Suporte IA &amp; Especialistas GundjaTech</span>
                                </div>
                            </div>
                        </div>
                        <span class="gt-badge gt-badge-success">
                            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span>Chat Ativo</span>
                        </span>
                    </div>

                    <div
                        id="portal-messages"
                        data-conv-id={conversation?.id || 0}
                        data-last-id={messages.length > 0 ? messages[messages.length - 1].id : 0}
                        data-user-initials={userInitials}
                        class="gt-chat-canvas flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4"
                    >
                        {messages.length === 0 ? (
                            <div class="text-center m-auto py-8 max-w-md">
                                <div class="w-12 h-12 rounded-2xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] mx-auto mb-3">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                </div>
                                <div class="text-sm font-extrabold text-white">Inicie sua conversa com nosso time</div>
                                <div class="text-xs text-[#8C95AA] mt-1">Escolha um atalho ao lado ou digite sua mensagem abaixo.</div>
                            </div>
                        ) : (
                            messages.map((m: any) => {
                                const isMe = m.sender_type === 'client' || m.sender_type === 'user';
                                return (
                                    <div class={`gt-chat-row ${isMe ? 'is-me' : 'is-them'}`}>
                                        {!isMe && <span class="gt-chat-mini-avatar is-team">GT</span>}
                                        <div class={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 max-w-[82%]`}>
                                            <div class={isMe ? 'gt-chat-bubble-me' : 'gt-chat-bubble-them'}>
                                                <div class={isMe ? 'gt-chat-sender-me' : 'gt-chat-sender-them'}>
                                                    {isMe ? 'Você' : (m.is_ai ? 'GundjaTech AI (Atendimento)' : 'Time GundjaTech')}
                                                </div>
                                                <div class="gt-chat-msg-text">{m.message}</div>
                                            </div>
                                            <span class="text-[10px] text-[#8C95AA] mt-1 px-1">{formatBrtTime(m.created_at)}</span>
                                        </div>
                                        {isMe && <span class="gt-chat-mini-avatar is-me">{userInitials}</span>}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div class="gt-chat-composer p-3.5 sm:p-4 border-t border-white/10">
                        <form action={`/portal/atendimento/${conversation?.id || 1}/mensagem`} method="post" class="flex items-center gap-2.5 m-0">
                            <input
                                id="portal-chat-input"
                                type="text"
                                name="message"
                                required
                                placeholder="Digite sua mensagem aqui..."
                                class="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white"
                            />
                            <button type="submit" class="gt-btn-primary gt-btn-sm shrink-0">
                                <span>Enviar</span>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Support Info & Quick Actions Sidebar */}
                <div class="space-y-4">
                    <div class="gtb-card !p-5">
                        <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                        <h2 class="text-xs font-extrabold uppercase tracking-wider text-[#16749A] mb-3.5">Detalhes do Canal</h2>
                        <div class="space-y-2.5 text-xs">
                            <div class="flex items-center justify-between py-1.5 border-b border-white/5">
                                <span class="text-[#8C95AA]">Tempo de resposta</span>
                                <strong class="text-white">&lt; 5 minutos</strong>
                            </div>
                            <div class="flex items-center justify-between py-1.5 border-b border-white/5">
                                <span class="text-[#8C95AA]">Atendimento IA</span>
                                <strong class="text-emerald-400">24h / 7 dias</strong>
                            </div>
                            <div class="flex items-center justify-between py-1.5">
                                <span class="text-[#8C95AA]">Equipe Humana</span>
                                <strong class="text-white">Seg–Sex • 08h–18h</strong>
                            </div>
                        </div>
                    </div>

                    <div class="gtb-card !p-5">
                        <h2 class="text-xs font-extrabold uppercase tracking-wider text-[#16749A] mb-3">Mensagens Rápidas</h2>
                        <div class="flex flex-col gap-2">
                            <button type="button" onclick="var i=document.getElementById('portal-chat-input');if(i){i.value='Olá! Gostaria de acompanhar o status do meu projeto.';i.focus();}" class="gt-chat-quick-btn">
                                <span>Acompanhar status de projeto</span>
                                <span>&rarr;</span>
                            </button>
                            <button type="button" onclick="var i=document.getElementById('portal-chat-input');if(i){i.value='Preciso de um novo orçamento para minha empresa.';i.focus();}" class="gt-chat-quick-btn">
                                <span>Solicitar novo orçamento</span>
                                <span>&rarr;</span>
                            </button>
                            <button type="button" onclick="var i=document.getElementById('portal-chat-input');if(i){i.value='Tenho uma dúvida sobre fatura ou pagamento.';i.focus();}" class="gt-chat-quick-btn">
                                <span>Dúvida financeira ou fatura</span>
                                <span>&rarr;</span>
                            </button>
                            <button type="button" onclick="var i=document.getElementById('portal-chat-input');if(i){i.value='Gostaria de falar com um especialista humano.';i.focus();}" class="gt-chat-quick-btn">
                                <span>Falar com especialista humano</span>
                                <span>&rarr;</span>
                            </button>
                        </div>
                    </div>

                    <div class="gt-petrol-cta-card rounded-2xl p-5">
                        <div class="gt-petrol-cta-title mb-1.5">Novo Escopo ou Demanda?</div>
                        <p class="gt-petrol-cta-desc">
                            Formalize um pedido técnico com protocolo GNDJ para receber proposta e prazo detalhado.
                        </p>
                        <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm w-full justify-center">
                            <span>+ Abrir Nova Solicitação</span>
                        </a>
                    </div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: `
                (function () {
                    var box = document.getElementById('portal-messages');
                    if (!box) return;
                    box.scrollTop = box.scrollHeight;
                    var convId = box.dataset.convId;
                    var userInit = box.dataset.userInitials || 'VC';
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
                        if (document.hidden) {
                            setTimeout(pollPortalChat, 12000);
                            return;
                        }
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
                                    var row = document.createElement('div');
                                    row.className = 'gt-chat-row ' + (isMe ? 'is-me' : 'is-them');
                                    var av = document.createElement('span');
                                    av.className = 'gt-chat-mini-avatar ' + (isMe ? 'is-me' : 'is-team');
                                    av.textContent = isMe ? userInit : 'GT';
                                    var col = document.createElement('div');
                                    col.className = 'flex flex-col ' + (isMe ? 'items-end' : 'items-start') + ' min-w-0 max-w-[82%]';
                                    var b = document.createElement('div');
                                    b.className = isMe ? 'gt-chat-bubble-me' : 'gt-chat-bubble-them';
                                    var s = document.createElement('div');
                                    s.className = isMe ? 'gt-chat-sender-me' : 'gt-chat-sender-them';
                                    s.textContent = isMe ? 'Você' : (m.is_ai ? 'GundjaTech AI (Atendimento)' : 'Time GundjaTech');
                                    var txt = document.createElement('div');
                                    txt.className = 'gt-chat-msg-text';
                                    txt.textContent = m.message;
                                    b.appendChild(s);
                                    b.appendChild(txt);
                                    col.appendChild(b);
                                    if (!isMe) { row.appendChild(av); row.appendChild(col); }
                                    else { row.appendChild(col); row.appendChild(av); }
                                    box.appendChild(row);
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
