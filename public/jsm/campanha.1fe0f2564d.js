(function () {
    "use strict";

    var L = window.SNP_L || function (text) { return text; };
    var qs = function (sel, root) { return (root || document).querySelector(sel); };
    var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var WA_URL = "https://wa.me/5519953248420";

    function getSession(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function setSession(key, val) {
        try { sessionStorage.setItem(key, val); } catch (e) { }
    }

    function removeSession(key) {
        try { sessionStorage.removeItem(key); } catch (e) { }
    }

    function pushDataLayer(event, extra) {
        if (window.dataLayer) {
            window.dataLayer.push(Object.assign({ event: event }, extra || {}));
        }
    }

    document.addEventListener("submit", function (ev) {
        if (ev.target && ev.target.matches && ev.target.matches(".js-form") && !ev.target.querySelector(":invalid")) {
            setSession("snp_lead", "1");
        }
    }, true);

    // Sticky Header Scroll Class
    var header = qs(".js-header");
    if (header) {
        var onHeaderScroll = function () { header.classList.toggle("rolou", window.scrollY > 40); };
        window.addEventListener("scroll", onHeaderScroll, { passive: true });
        onHeaderScroll();
    }

    // Bottom Floating Dock Visibility
    var dock = qs(".dock");
    var hero = qs(".js-hero") || qs(".js-hm3");
    var inputFocused = false;
    var dockObstructions = qsa("main form, .diag, #contato, .rodape, .op-planos, .js-sem-dock").filter(function (el) {
        return !el.closest("dialog");
    });

    function updateDock() {
        if (!dock) { return; }
        var threshold = hero ? 0.6 * hero.offsetHeight : 400;
        var vh = window.innerHeight;
        var overlaps = dockObstructions.some(function (el) {
            var r = el.getBoundingClientRect();
            return r.top < vh - 40 && r.bottom > 80;
        });
        dock.classList.toggle("recolhida", window.scrollY < threshold || overlaps || inputFocused);
    }

    document.addEventListener("focusin", function (ev) {
        if (ev.target && ev.target.matches && ev.target.matches("input, textarea, select")) {
            inputFocused = true;
            updateDock();
        }
    });
    document.addEventListener("focusout", function () {
        inputFocused = false;
        setTimeout(updateDock, 50);
    });
    window.addEventListener("scroll", updateDock, { passive: true });
    window.addEventListener("resize", updateDock);
    updateDock();

    // Campaign Modal (#cadastro)
    var campaignDialog = qs("#cadastro");
    if (campaignDialog) {
        qsa(".js-cadastro").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (!campaignDialog.open) {
                    if (campaignDialog.showModal) { campaignDialog.showModal(); } else { campaignDialog.setAttribute("open", ""); }
                    pushDataLayer("popup_campanha", { origem: "botao" });
                }
            });
        });
        var closeCampaignBtn = qs(".js-fechar-cadastro");
        if (closeCampaignBtn) {
            closeCampaignBtn.addEventListener("click", function () { campaignDialog.close(); });
        }
        campaignDialog.addEventListener("click", function (ev) {
            if (ev.target === campaignDialog) { campaignDialog.close(); }
        });
    }

    // =========================================================================
    // LIVE TWO-WAY WEBSITE CHAT CONNECTED TO /api/chat/* AND /admin/atendimento
    // =========================================================================
    var chatRoot = qs(".js-chat");
    var chatPanel = qs(".js-chat-painel");
    var chatToggleBtn = qs(".js-chat-btn");
    var chatMessagesEl = qs(".js-chat-msgs");
    var chatOptionsEl = qs(".js-chat-opcoes");
    var chatForm = qs(".js-chat-form");
    var chatInput = qs("#chat-campo");
    var chatInvite = qs(".js-chat-convite");

    if (chatRoot && chatPanel && chatToggleBtn && chatMessagesEl && chatOptionsEl && chatForm && chatInput) {
        var chatStarted = false;
        var currentStep = null;
        var visitorData = {};
        var liveSession = null;
        var pollTimer = null;
        var renderedMsgIds = {};
        var isSendingLiveMessage = false;
        var closedHandled = false;

        try {
            var storedSession = getSession("gt_chat_session");
            if (storedSession) {
                liveSession = JSON.parse(storedSession);
            }
        } catch (e) {
            liveSession = null;
        }

        function saveLiveSession() {
            if (liveSession) {
                setSession("gt_chat_session", JSON.stringify(liveSession));
            }
        }

        function stopPollingLiveMessages() {
            if (pollTimer) {
                clearTimeout(pollTimer);
                pollTimer = null;
            }
        }

        function handleClosedConversation(noticeText) {
            stopPollingLiveMessages();
            chatForm.hidden = true;
            currentStep = null;
            if (!closedHandled) {
                closedHandled = true;
                appendBotBubbleInstant(noticeText || L("Este atendimento foi encerrado pela equipe. Você pode iniciar uma nova conversa ou falar no WhatsApp."));
            }
            renderOptions([
                {
                    texto: L("Iniciar nova conversa"),
                    silent: true,
                    acao: function () {
                        removeSession("gt_chat_session");
                        liveSession = null;
                        renderedMsgIds = {};
                        closedHandled = false;
                        stopPollingLiveMessages();
                        chatMessagesEl.innerHTML = "";
                        chatStarted = false;
                        openChat();
                    }
                },
                { texto: L("Falar no WhatsApp"), link: WA_URL }
            ]);
        }

        function scrollChatBottom() {
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function appendUserBubble(text, msgId) {
            if (msgId && renderedMsgIds[msgId]) { return; }
            if (msgId) { renderedMsgIds[msgId] = true; }
            var el = document.createElement("div");
            el.className = "msg-eu";
            el.textContent = text;
            chatMessagesEl.appendChild(el);
            scrollChatBottom();
        }

        function appendBotBubbleInstant(text, msgId) {
            if (msgId && renderedMsgIds[msgId]) { return; }
            if (msgId) { renderedMsgIds[msgId] = true; }
            var el = document.createElement("div");
            el.className = "msg-bot";
            el.textContent = text;
            chatMessagesEl.appendChild(el);
            scrollChatBottom();
        }

        function sendBotMessages(messages, done) {
            var queue = [].concat(messages);
            (function next() {
                if (queue.length === 0) {
                    if (done) { done(); }
                    return;
                }
                var typing = document.createElement("div");
                typing.className = "msg-digitando";
                typing.innerHTML = "<i></i><i></i><i></i>";
                chatMessagesEl.appendChild(typing);
                scrollChatBottom();
                setTimeout(function () {
                    typing.remove();
                    appendBotBubbleInstant(queue.shift());
                    next();
                }, reducedMotion ? 120 : 520);
            })();
        }

        function enableFreeTextInput() {
            if (closedHandled) { return; }
            if (!currentStep || currentStep.tipo === "livre") {
                currentStep = { tipo: "livre" };
                chatForm.hidden = false;
                chatInput.disabled = false;
                chatInput.type = "text";
                chatInput.placeholder = L("Digite sua mensagem ou escolha uma opção...");
            }
        }

        function renderOptions(options) {
            chatOptionsEl.innerHTML = "";
            options.forEach(function (opt) {
                var btn;
                if (opt.link) {
                    btn = document.createElement("a");
                    btn.href = opt.link;
                    btn.target = opt.sameTab ? "_self" : "_blank";
                    if (!opt.sameTab) { btn.rel = "noopener"; }
                } else {
                    btn = document.createElement("button");
                    btn.type = "button";
                }
                btn.textContent = opt.texto;
                btn.addEventListener("click", function () {
                    if (opt.link) {
                        pushDataLayer("chat_whatsapp");
                    } else {
                        visitorData.escolhas = (visitorData.escolhas || []).concat([opt.texto]);
                        chatOptionsEl.innerHTML = "";
                        if (!opt.silent) { appendUserBubble(opt.texto); }
                        opt.acao();
                    }
                });
                chatOptionsEl.appendChild(btn);
            });
            enableFreeTextInput();
        }

        function askInput(prompts, type, callback) {
            sendBotMessages(prompts, function () {
                currentStep = { tipo: type, depois: callback };
                chatForm.hidden = false;
                chatInput.type = type === "tel" ? "tel" : (type === "email" ? "email" : "text");
                chatInput.placeholder = L(
                    type === "tel" ? "(11) 90000-0000"
                        : (type === "email" ? "seu@empresa.com.br" : "Digite aqui...")
                );
                chatInput.focus();
            });
        }

        function enableLiveChatInput() {
            currentStep = { tipo: "live" };
            chatForm.hidden = false;
            chatInput.type = "text";
            chatInput.placeholder = L("Escreva sua mensagem para a equipe...");
        }

        function startPollingLiveMessages() {
            stopPollingLiveMessages();
            if (!liveSession || !liveSession.token || closedHandled) { return; }

            var scheduleNext = function () {
                if (!liveSession || !liveSession.token || closedHandled) { return; }
                pollTimer = setTimeout(pollOnce, 5000);
            };

            var pollOnce = function () {
                if (!liveSession || !liveSession.token || closedHandled) { return; }
                if (isSendingLiveMessage) {
                    scheduleNext();
                    return;
                }
                var url = "/api/chat/messages?token=" + encodeURIComponent(liveSession.token) + "&after_id=" + (liveSession.lastId || 0);
                fetch(url, {
                    headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
                })
                    .then(function (r) { return r.ok ? r.json() : null; })
                    .then(function (data) {
                        if (!data || !data.ok || !Array.isArray(data.messages)) { return; }
                        data.messages.forEach(function (msg) {
                            if (msg.id > (liveSession.lastId || 0)) {
                                liveSession.lastId = msg.id;
                            }
                            if (msg.sender_type === "staff") {
                                var prefix = msg.sender_name ? msg.sender_name + ": " : "";
                                appendBotBubbleInstant(prefix + msg.message, msg.id);
                            } else if (!isSendingLiveMessage) {
                                appendUserBubble(msg.message, msg.id);
                            }
                        });
                        saveLiveSession();

                        if (data.status === "closed") {
                            handleClosedConversation();
                        }
                    })
                    .catch(function () { })
                    .then(function () {
                        scheduleNext();
                    });
            };

            scheduleNext();
        }

        function restoreExistingLiveSession() {
            if (!liveSession || !liveSession.token) { return false; }
            chatStarted = true;
            closedHandled = false;
            chatMessagesEl.innerHTML = "";
            renderedMsgIds = {};

            appendBotBubbleInstant(L("Atendimento conectado à equipe GundjaTech em tempo real."));
            enableLiveChatInput();

            fetch("/api/chat/messages?token=" + encodeURIComponent(liveSession.token), {
                headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
            })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (data) {
                    if (!data || !data.ok) {
                        removeSession("gt_chat_session");
                        liveSession = null;
                        chatMessagesEl.innerHTML = "";
                        chatStarted = false;
                        openChat();
                        return;
                    }
                    (data.messages || []).forEach(function (msg) {
                        if (msg.id > (liveSession.lastId || 0)) {
                            liveSession.lastId = msg.id;
                        }
                        if (msg.sender_type === "staff") {
                            var prefix = msg.sender_name ? msg.sender_name + ": " : "";
                            appendBotBubbleInstant(prefix + msg.message, msg.id);
                        } else {
                            appendUserBubble(msg.message, msg.id);
                        }
                    });
                    saveLiveSession();
                    if (data.status === "closed") {
                        handleClosedConversation();
                    } else {
                        startPollingLiveMessages();
                    }
                })
                .catch(function () {
                    startPollingLiveMessages();
                });

            return true;
        }

        var isSecurityTheme = document.body.dataset.tema === "seguranca";
        var copy = isSecurityTheme ? {
            oferta: L("Ótimo! Um especialista analisa a segurança do seu site e mostra o que corrigir primeiro, sem custo."),
            fim: L("Atendimento conectado! Um especialista em segurança da GundjaTech já recebeu sua conversa no painel e pode responder por aqui mesmo."),
            whats: L("Olá! Sou {n} e quero o diagnóstico de segurança do meu site."),
            ola: L("Precisa de ajuda com a segurança do seu site?"),
            op1: L("Quero o diagnóstico grátis"),
            op2: L("Meu site foi invadido"),
            preco: [
                L("Depende do número de sites e do nível de monitoramento."),
                L("Primeiro fazemos o diagnóstico gratuito e você recebe uma proposta fechada. Quer começar por ele?")
            ],
            ver: "camadas",
            verTxt: L("Ver como protegemos")
        } : {
            oferta: L("Ótimo! Um especialista analisa o seu projeto e mostra o que mudar para gerar mais clientes."),
            fim: L("Atendimento conectado! Nossa equipe já recebeu sua mensagem no painel e pode responder por aqui em tempo real."),
            whats: L("Olá! Sou {n} e quero falar sobre meu projeto com a GundjaTech."),
            ola: L("Precisa de ajuda com o site ou sistema da sua empresa?"),
            op1: L("Quero um site novo"),
            op2: L("Quero refazer meu site"),
            preco: [
                L("Depende do escopo: número de páginas, integrações e funcionalidades."),
                L("Você recebe uma proposta fechada, com prazo e valor em contrato. Quer começar pela análise do seu projeto?")
            ],
            ver: "projetos",
            verTxt: L("Ver projetos")
        };

        function scrollToTargetSection() {
            var target = document.getElementById(copy.ver);
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
                return;
            }
            window.location.href = isSecurityTheme ? "/ciberseguranca#camadas" : "/portfolio";
        }

        function startEmergencyFlow() {
            sendBotMessages([
                L("Vamos resolver isso agora."),
                L("Chama a gente no WhatsApp que um especialista entra no caso imediatamente ou deixe seu contato aqui.")
            ], function () {
                renderOptions([
                    { texto: L("Chamar no WhatsApp agora"), link: WA_URL + "?text=" + encodeURIComponent(L("URGENTE: meu site foi invadido e preciso de ajuda.")) },
                    { texto: L("Atendimento ao vivo aqui"), acao: startLeadCaptureFlow }
                ]);
            });
        }

        function startLeadCaptureFlow(fromFreeText) {
            var introPrompts = fromFreeText === true
                ? [L("Perfeito, recebi sua mensagem! Para conectarmos seu atendimento em tempo real, como posso te chamar?")]
                : [copy.oferta, L("Como posso te chamar?")];

            askInput(introPrompts, "texto", function (fullName) {
                visitorData.nomeCompleto = fullName;
                visitorData.nome = fullName.split(" ")[0];

                askInput(L("Prazer, ") + visitorData.nome + L("! Qual é o seu e-mail? De preferência o da empresa."), "email", function (email) {
                    visitorData.email = email.toLowerCase();

                    askInput(L("Obrigado! E qual é o seu WhatsApp com DDD?"), "tel", function (phone) {
                        visitorData.tel = phone;
                        setSession("snp_lead", "1");

                        var isCorp = !/@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|bol|uol|terra|ig|globo|aol|proton|protonmail|zoho)\./i.test(visitorData.email);
                        setSession("snp_wq_dados", JSON.stringify({
                            nome: visitorData.nomeCompleto,
                            email: visitorData.email,
                            telefone: phone,
                            empresa: "",
                            site: "",
                            origem: "chat"
                        }));
                        setSession("snp_wq", JSON.stringify(isCorp ? "Q" : "F"));

                        var choicesSummary = (visitorData.escolhas || []).join(" > ") || L("Atendimento Online");
                        var initialMsg = visitorData.mensagemLivre
                            ? visitorData.mensagemLivre
                            : (L("Interesse informado no chat: ") + choicesSummary);

                        var pendingTyping = document.createElement("div");
                        pendingTyping.className = "msg-digitando";
                        pendingTyping.innerHTML = "<i></i><i></i><i></i>";
                        chatMessagesEl.appendChild(pendingTyping);
                        scrollChatBottom();

                        fetch("/api/chat/start", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                                "X-Requested-With": "XMLHttpRequest"
                            },
                            body: JSON.stringify({
                                nome: visitorData.nomeCompleto || visitorData.nome,
                                email: visitorData.email,
                                telefone: phone,
                                assunto: choicesSummary,
                                mensagem: initialMsg,
                                tema: isSecurityTheme ? "seguranca" : "geral"
                            })
                        })
                            .then(function (resp) {
                                return resp.json().catch(function () { return { ok: false }; }).then(function (parsed) {
                                    return resp.ok ? parsed : { ok: false };
                                });
                            })
                            .then(function (data) {
                                pendingTyping.remove();
                                if (!data || !data.ok || !data.visitor_token) {
                                    sendBotMessages([L("Houve uma instabilidade ao conectar o chat agora. Tente enviar novamente ou fale direto no WhatsApp.")], function () {
                                        renderOptions([
                                            { texto: L("Tentar conectar novamente"), acao: startLeadCaptureFlow },
                                            { texto: L("Falar agora no WhatsApp"), link: WA_URL + "?text=" + encodeURIComponent(copy.whats.replace("{n}", visitorData.nome)) }
                                        ]);
                                    });
                                    return;
                                }

                                var lastId = 0;
                                var aiMsgId = data.ai_reply ? data.ai_reply.id : null;
                                (data.messages || []).forEach(function (m) {
                                    if (m.id !== aiMsgId) {
                                        renderedMsgIds[m.id] = true;
                                    }
                                    if (m.id > lastId) { lastId = m.id; }
                                });
                                closedHandled = false;
                                liveSession = {
                                    token: data.visitor_token,
                                    conversationId: data.conversation_id,
                                    protocol: data.protocol || null,
                                    lastId: lastId
                                };
                                saveLiveSession();

                                var confirmLines = [];
                                if (data.protocol) {
                                    confirmLines.push(L("Atendimento conectado! Protocolo: ") + data.protocol + ".");
                                } else {
                                    confirmLines.push(copy.fim);
                                }
                                if (data.ai_reply && data.ai_reply.message) {
                                    renderedMsgIds[data.ai_reply.id] = true;
                                    confirmLines.push(data.ai_reply.message);
                                } else {
                                    confirmLines.push(L("Nossa equipe já recebeu sua mensagem no painel. Pode enviar mais detalhes abaixo!"));
                                }
                                startPollingLiveMessages();

                                sendBotMessages(confirmLines, function () {
                                    enableLiveChatInput();
                                    renderOptions([
                                        { texto: L("Falar agora no WhatsApp"), link: WA_URL + "?text=" + encodeURIComponent(copy.whats.replace("{n}", visitorData.nome)) },
                                        { texto: copy.verTxt, acao: function () { scrollToTargetSection(); } }
                                    ]);
                                });
                            })
                            .catch(function () {
                                pendingTyping.remove();
                                sendBotMessages([L("Sem conexão no momento. Tente novamente ou chame diretamente no WhatsApp.")], function () {
                                    renderOptions([
                                        { texto: L("Falar agora no WhatsApp"), link: WA_URL + "?text=" + encodeURIComponent(copy.whats.replace("{n}", visitorData.nome)) }
                                    ]);
                                });
                            });
                    });
                });
            });
        }

        chatForm.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var value = chatInput.value.trim();
            if (!value || closedHandled) { return; }

            if (!currentStep || currentStep.tipo === "livre") {
                chatInput.value = "";
                chatOptionsEl.innerHTML = "";
                appendUserBubble(value);
                visitorData.escolhas = (visitorData.escolhas || []).concat([value]);
                visitorData.mensagemLivre = value;

                var protoMatch = value.match(/\b((?:GNDJ|CHAT|CNT|WPP)-\d{8}-[A-Z0-9]{4})\b/i);
                if (protoMatch || /protocolo|acompanhar\s+solicita/i.test(value)) {
                    var protoCode = protoMatch ? protoMatch[1].toUpperCase() : "";
                    var trackHref = "/acompanhar-solicitacao" + (protoCode ? "?protocol=" + encodeURIComponent(protoCode) : "");
                    sendBotMessages([
                        protoCode
                            ? L("Localizei o código ") + protoCode + L("! Você pode consultar o status completo agora ou continuar falando com nossa equipe por aqui.")
                            : L("Você pode consultar seu protocolo em tempo real na página de rastreamento ou continuar o atendimento com nossa equipe por aqui.")
                    ], function () {
                        renderOptions([
                            { texto: protoCode ? (L("Consultar ") + protoCode + " →") : L("Consultar protocolo agora →"), link: trackHref, sameTab: true },
                            { texto: L("Continuar atendimento no chat"), acao: function () { startLeadCaptureFlow(true); } },
                            { texto: L("Falar no WhatsApp"), link: WA_URL }
                        ]);
                    });
                    return;
                }

                startLeadCaptureFlow(true);
                return;
            }

            if (currentStep.tipo === "live") {
                if (!liveSession || !liveSession.token || isSendingLiveMessage) { return; }
                isSendingLiveMessage = true;
                chatInput.value = "";
                chatInput.disabled = true;
                appendUserBubble(value);

                var replyTyping = document.createElement("div");
                replyTyping.className = "msg-digitando";
                replyTyping.innerHTML = "<i></i><i></i><i></i>";
                chatMessagesEl.appendChild(replyTyping);
                scrollChatBottom();

                fetch("/api/chat/message", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify({
                        visitor_token: liveSession.token,
                        message: value
                    })
                })
                    .then(function (resp) {
                        return resp.json().catch(function () { return { ok: false }; }).then(function (parsed) {
                            return { httpStatus: resp.status, ok: resp.ok, body: parsed };
                        });
                    })
                    .then(function (result) {
                        replyTyping.remove();
                        isSendingLiveMessage = false;
                        chatInput.disabled = false;

                        var data = result.body;
                        if (result.httpStatus === 409 || (data && data.status === "closed")) {
                            handleClosedConversation(data && data.message ? data.message : null);
                            return;
                        }

                        chatInput.focus();
                        if (result.ok && data && data.ok && data.message) {
                            renderedMsgIds[data.message.id] = true;
                            if (data.message.id > (liveSession.lastId || 0)) {
                                liveSession.lastId = data.message.id;
                            }
                            if (data.ai_reply && data.ai_reply.message) {
                                if (data.ai_reply.id > (liveSession.lastId || 0)) {
                                    liveSession.lastId = data.ai_reply.id;
                                }
                                appendBotBubbleInstant(data.ai_reply.message, data.ai_reply.id);
                            }
                            saveLiveSession();
                        } else {
                            appendBotBubbleInstant(L("Não foi possível enviar sua mensagem. Tente novamente."));
                        }
                    })
                    .catch(function () {
                        replyTyping.remove();
                        isSendingLiveMessage = false;
                        chatInput.disabled = false;
                        appendBotBubbleInstant(L("Sem conexão no momento. Tente novamente ou chame no WhatsApp."));
                    });
                return;
            }

            if (currentStep.tipo === "tel") {
                var minDigits = document.documentElement.lang === "pt-PT" ? 9 : 10;
                if (value.replace(/\D/g, "").length < minDigits) {
                    sendBotMessages(L("Confere o número pra mim? Preciso do DDD e do telefone."));
                    return;
                }
            }

            if (currentStep.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
                sendBotMessages(L("Confere o e-mail pra mim? Ele é obrigatório para continuarmos."));
                return;
            }

            appendUserBubble(value);
            chatInput.value = "";
            chatForm.hidden = true;
            var nextAction = currentStep.depois;
            currentStep = null;
            nextAction(value);
        });

        function openChat() {
            chatRoot.classList.add("aberto");
            chatPanel.hidden = false;
            if (chatInvite) { chatInvite.classList.remove("on"); }
            chatToggleBtn.setAttribute("aria-expanded", "true");
            chatToggleBtn.setAttribute("aria-label", "Fechar chat");
            setSession("snp_convite", "1");

            if (!chatStarted) {
                if (restoreExistingLiveSession()) { return; }
                chatStarted = true;
                enableFreeTextInput();
                pushDataLayer("chat_aberto");
                sendBotMessages([L("Oi! Aqui é da GundjaTech."), copy.ola], function () {
                    renderOptions([
                        { texto: copy.op1, acao: startLeadCaptureFlow },
                        { texto: copy.op2, acao: isSecurityTheme ? startEmergencyFlow : startLeadCaptureFlow },
                        {
                            texto: L("Quanto custa?"),
                            acao: function () {
                                sendBotMessages(copy.preco, function () {
                                    renderOptions([
                                        { texto: L("Sim, quero falar com um especialista"), acao: startLeadCaptureFlow },
                                        { texto: L("Falar no WhatsApp"), link: WA_URL }
                                    ]);
                                });
                            }
                        },
                        {
                            texto: L("Só estou olhando"),
                            acao: function () {
                                sendBotMessages(L("Fica à vontade! Se precisar, é só chamar por aqui."), function () {
                                    renderOptions([
                                        { texto: copy.verTxt, acao: scrollToTargetSection },
                                        { texto: L("Iniciar atendimento"), acao: startLeadCaptureFlow }
                                    ]);
                                });
                            }
                        }
                    ]);
                });
            }
        }

        function closeChat() {
            chatRoot.classList.remove("aberto");
            chatPanel.hidden = true;
            chatToggleBtn.setAttribute("aria-expanded", "false");
            chatToggleBtn.setAttribute("aria-label", "Abrir chat");
        }

        chatToggleBtn.addEventListener("click", function () {
            if (chatRoot.classList.contains("aberto")) { closeChat(); } else { openChat(); }
        });
        qsa(".js-abre-chat").forEach(function (el) {
            el.addEventListener("click", function () {
                if (!chatRoot.classList.contains("aberto")) { openChat(); }
            });
        });
        var chatCloseBtn = qs(".js-chat-fecha");
        if (chatCloseBtn) { chatCloseBtn.addEventListener("click", closeChat); }
        if (chatInvite) {
            chatInvite.addEventListener("click", function (ev) {
                if (!ev.target.closest(".js-convite-fecha")) { openChat(); }
            });
            var inviteCloseBtn = qs(".js-convite-fecha");
            if (inviteCloseBtn) {
                inviteCloseBtn.addEventListener("click", function () {
                    chatInvite.classList.remove("on");
                    setSession("snp_convite", "1");
                });
            }
            if (getSession("snp_convite") !== "1") {
                setTimeout(function () {
                    if (!chatRoot.classList.contains("aberto") && !document.querySelector("dialog[open]")) {
                        chatInvite.classList.add("on");
                    }
                }, 6000);
            }
        }
        document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape" && chatRoot.classList.contains("aberto")) { closeChat(); }
        });
    }
})();

// Mobile Navigation Menu
(function () {
    "use strict";
    var menuBtn = document.querySelector(".js-mm-btn");
    var menuDrawer = document.querySelector(".js-mm");
    if (!menuBtn || !menuDrawer) { return; }

    function closeMenu() {
        menuDrawer.hidden = true;
        document.documentElement.classList.remove("mm-aberto");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Abrir menu");
        document.body.style.overflow = "";
    }

    menuBtn.addEventListener("click", function () {
        if (!menuDrawer.hidden) { return closeMenu(); }
        menuDrawer.hidden = false;
        document.documentElement.classList.add("mm-aberto");
        menuBtn.setAttribute("aria-expanded", "true");
        menuBtn.setAttribute("aria-label", "Fechar menu");
        document.body.style.overflow = "hidden";
    });
    menuDrawer.addEventListener("click", function (ev) {
        if (ev.target.closest("a")) { closeMenu(); }
    });
    document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && !menuDrawer.hidden) { closeMenu(); }
    });
})();
