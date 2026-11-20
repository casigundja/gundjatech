(function () {
    "use strict";

    var L = window.SNP_L || function (text) { return text; };
    var FREE_EMAIL_RE = /@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|bol|uol|terra|ig|globo|aol|proton|protonmail|zoho)\./i;

    function getSessionJson(key) {
        try { return JSON.parse(sessionStorage.getItem(key)); } catch (e) { return null; }
    }

    function setSessionJson(key, val) {
        try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }

    function pushDataLayer(event, extra) {
        if (window.dataLayer) {
            window.dataLayer.push(Object.assign({ event: event }, extra || {}));
        }
    }

    function scoreLead(lead) {
        var points = 0;
        if (lead.email && !FREE_EMAIL_RE.test(lead.email)) { points += 2; }
        if (lead.site) { points += 1; }
        if (lead.empresa) { points += 1; }
        return { quente: points >= 2, pontos: points };
    }

    var UTM_KEYS = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "li_fat_id"
    ];

    function getAttribution() {
        var first = null;
        try { first = JSON.parse(localStorage.getItem("snp_ft") || "null"); } catch (e) {}
        return { primeiro: first, ultimo: getSessionJson("snp_lt") };
    }

    (function captureAttribution() {
        var params = new URLSearchParams(location.search);
        var data = {};
        var hasData = false;
        UTM_KEYS.forEach(function (key) {
            var val = params.get(key);
            if (val) {
                data[key] = val.slice(0, 150);
                hasData = true;
            }
        });
        var refHost = "";
        try {
            var parsed = document.referrer ? new URL(document.referrer).hostname : "";
            if (parsed && parsed !== location.hostname) { refHost = parsed; }
        } catch (e) {}
        if (refHost) {
            data.referrer = refHost;
            hasData = true;
        }
        data.landing = location.pathname;
        data.em = new Date().toISOString();

        try {
            var existing = JSON.parse(localStorage.getItem("snp_ft") || "null");
            if (!existing || Date.now() - new Date(existing.em).getTime() > 7776e6) {
                localStorage.setItem("snp_ft", JSON.stringify(data));
            }
        } catch (e) {}

        if (hasData || !getSessionJson("snp_lt")) {
            setSessionJson("snp_lt", data);
        }
    })();

    function sendLead(payload) {
        var hasFile = typeof File !== "undefined" && payload.arquivo instanceof File;
        var url = "/api/lead";
        var fetchOpts;

        if (hasFile) {
            var fd = new FormData();
            if (payload.nome) { fd.append("nome", payload.nome); }
            if (payload.email) { fd.append("email", payload.email); }
            if (payload.telefone) { fd.append("telefone", payload.telefone); }
            if (payload.empresa) { fd.append("empresa", payload.empresa); }
            if (payload.site) { fd.append("site", payload.site); }
            if (payload.origem) { fd.append("origem", payload.origem); }
            if (payload.campanha) { fd.append("campanha", payload.campanha); }
            if (payload.mensagem) { fd.append("mensagem", payload.mensagem); }
            fd.append("pagina", location.href);
            fd.append("sobrenome_hp", payload.sobrenome_hp || "");
            fd.append("arquivo", payload.arquivo);

            fetchOpts = {
                method: "POST",
                headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
                body: fd
            };
        } else {
            var body = {
                nome: payload.nome || "",
                email: payload.email || "",
                telefone: payload.telefone || "",
                empresa: payload.empresa || "",
                site: payload.site || "",
                origem: payload.origem || "site",
                campanha: payload.campanha || "",
                mensagem: payload.mensagem || "",
                pagina: location.href,
                sobrenome_hp: payload.sobrenome_hp || "",
                atribuicao: getAttribution(),
                tempo: Math.round(performance.now())
            };

            fetchOpts = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify(body),
                keepalive: true
            };
        }

        return fetch(url, fetchOpts)
            .then(function (resp) {
                return resp.json().catch(function () { return { ok: false }; }).then(function (data) {
                    return resp.ok && data && data.ok ? data : false;
                });
            })
            .then(function (res) {
                if (res && res.ok) {
                    var score = scoreLead(payload);
                    pushDataLayer("generate_lead", {
                        origem: payload.origem || "site",
                        qualificado: score.quente,
                        lead_qualificacao: score.quente ? "qualificado" : "frio",
                        protocolo: res.protocol || ""
                    });
                    return res;
                }
                return false;
            })
            .catch(function () {
                return false;
            });
    }

    function detectDialogOrigin(form) {
        var dlg = form.closest("dialog");
        if (!dlg) { return ""; }
        if (dlg.id === "cadastro") { return "pop-up"; }
        if (dlg.id === "janela") { return "janela de contato"; }
        return "janela " + dlg.id;
    }

    function readFieldValue(form, name) {
        var radios = form.querySelectorAll('input[type="radio"][name="' + name + '"]');
        if (radios.length > 0) {
            var checked = form.querySelector('input[type="radio"][name="' + name + '"]:checked');
            return checked && checked.value ? checked.value.trim() : "";
        }
        var el = form.querySelector('[name="' + name + '"]');
        return el && el.value ? el.value.trim() : "";
    }

    window.SNP_enviaLead = sendLead;
    window.SNP_dadosForm = function (form) {
        var extraParts = ["mensagem", "assunto", "orcamento", "servico", "objetivo", "sites"]
            .map(function (field) {
                var val = readFieldValue(form, field);
                return val ? field + ": " + val : "";
            })
            .filter(Boolean)
            .join(" · ");

        var fileInput = form.querySelector('input[type="file"][name="arquivo"]');
        var attachedFile = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        var section = form.closest("section");

        return {
            nome: readFieldValue(form, "nome"),
            email: readFieldValue(form, "email"),
            telefone: readFieldValue(form, "telefone") || readFieldValue(form, "whatsapp"),
            empresa: readFieldValue(form, "empresa"),
            site: readFieldValue(form, "site"),
            origem: readFieldValue(form, "origem") || (section && section.id) || detectDialogOrigin(form) || "formulario",
            campanha: readFieldValue(form, "campanha"),
            sobrenome_hp: readFieldValue(form, "sobrenome_hp"),
            mensagem: extraParts,
            arquivo: attachedFile
        };
    };

    document.addEventListener("change", function (event) {
        var input = event.target;
        if (input && input.matches && input.matches('input[type="file"].js-anexo')) {
            var label = input.closest("label");
            var nameEl = label && label.querySelector(".js-anexo-nome");
            if (nameEl) {
                nameEl.textContent = input.files && input.files[0] ? input.files[0].name : L("Anexar arquivo");
            }
        }
    });

    // WhatsApp Qualification Modal
    var waDialog = null;
    var waHref = null;

    function openWhatsappWindow(lead, tag) {
        var baseHref = waHref || "https://wa.me/5519953248420";
        var baseUrl = baseHref.split("?")[0];
        var existingText = new URLSearchParams(baseHref.split("?")[1] || "").get("text") || "";
        var lines = [L("Olá! Sou") + " " + lead.nome + (lead.empresa ? ", " + L("da") + " " + lead.empresa : "") + "."];
        if (lead.site) { lines.push(L("Site") + ": " + lead.site); }
        if (existingText) { lines.push(existingText); }
        lines.push(L("Protocolo") + ": " + tag + "-" + Date.now().toString(36).slice(-5).toUpperCase());
        window.open(baseUrl + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    }

    function ensureWhatsappDialog() {
        if (waDialog) { return; }
        waDialog = document.createElement("dialog");
        waDialog.className = "wq";
        waDialog.setAttribute("aria-labelledby", "wq-tit");
        waDialog.innerHTML =
            '<div class="wq-caixa">' +
                '<aside class="wq-lado" aria-hidden="true">' +
                    '<p class="wq-kicker"><span class="wq-on"></span>' + L("Especialistas online") + '</p>' +
                    '<p class="wq-lado-tit">' + L("Sua conversa já começa") + ' <em>' + L("no ponto certo") + '</em></p>' +
                    '<div class="wq-fone">' +
                        '<div class="wq-fone-topo"><img src="/img/simbolo-branco.svg" alt=""><span><b>GundjaTech</b><small>' + L("Responde em até 4 horas úteis") + '</small></span></div>' +
                        '<div class="wq-fone-msgs"><p class="wq-bolha wq-bolha-eles">' + L("Olá! Como podemos ajudar?") + '</p><p class="wq-bolha wq-bolha-voce js-wq-previa"></p></div>' +
                    '</div>' +
                    '<ul class="wq-selos"><li>' + L("Atendimento direto com especialistas") + '</li><li>' + L("Seus dados protegidos (LGPD)") + '</li></ul>' +
                '</aside>' +
                '<form class="wq-form" novalidate>' +
                    '<button type="button" class="wq-x" aria-label="' + L("Fechar") + '">×</button>' +
                    '<h2 id="wq-tit">' + L("Antes de abrir o WhatsApp,") + ' <em>' + L("conta rapidinho:") + '</em></h2>' +
                    '<p class="wq-sub">' + L("Assim o especialista certo já responde com o que importa para o seu projeto.") + '</p>' +
                    '<label class="wq-campo">' + L("Nome") + '*<input name="nome" autocomplete="name" required></label>' +
                    '<label class="wq-campo">' + L("E-mail corporativo") + '*<input name="email" type="email" autocomplete="email" required placeholder="voce@empresa.com.br"></label>' +
                    '<label class="wq-campo wq-meio">WhatsApp*<input name="telefone" type="tel" autocomplete="tel" required placeholder="' + L("(11) 90000-0000") + '"></label>' +
                    '<label class="wq-campo wq-meio">' + L("Empresa") + '<input name="empresa" autocomplete="organization"></label>' +
                    '<div class="wq-campo wq-site"><label for="wq-site">' + L("Site da empresa") + '</label><div class="wq-site-linha"><input id="wq-site" name="site" inputmode="url" placeholder="www.suaempresa.com.br"><label class="wq-chip"><input type="checkbox" name="semsite"><span>' + L("Ainda não tenho site") + '</span></label></div></div>' +
                    '<input type="text" name="sobrenome_hp" tabindex="-1" autocomplete="off" class="wq-hp" aria-hidden="true">' +
                    '<button type="submit" class="btn wq-btn"><svg><use href="#i-whats"/></svg> ' + L("Abrir o WhatsApp") + '</button>' +
                '</form>' +
            '</div>';
        document.body.appendChild(waDialog);

        var form = waDialog.querySelector("form");
        var noSite = form.semsite;
        var siteInput = form.site;
        noSite.addEventListener("change", function () {
            siteInput.disabled = noSite.checked;
            if (noSite.checked) { siteInput.value = ""; }
        });

        waDialog.querySelector(".wq-x").addEventListener("click", function () { waDialog.close(); });
        waDialog.addEventListener("click", function (ev) { if (ev.target === waDialog) { waDialog.close(); } });

        var saved = getSessionJson("snp_wq_dados");
        if (saved) {
            ["nome", "email", "telefone", "empresa", "site"].forEach(function (k) {
                if (saved[k] && form[k]) { form[k].value = saved[k]; }
            });
        }

        var preview = waDialog.querySelector(".js-wq-previa");
        function updatePreview() {
            var firstName = form.nome.value.trim().split(/\s+/)[0];
            var company = form.empresa.value.trim();
            var site = noSite.checked ? "" : form.site.value.trim();
            var msg = L("Olá! Sou") + " " + (firstName || "...") + (company ? ", " + L("da") + " " + company : "") + ".";
            if (site) { msg += "\n" + L("Site") + ": " + site; }
            preview.textContent = msg;
        }
        form.addEventListener("input", updatePreview);
        noSite.addEventListener("change", updatePreview);
        updatePreview();

        form.addEventListener("submit", function (ev) {
            ev.preventDefault();
            if (form.sobrenome_hp.value) { return; }

            var invalid = form.querySelector(":invalid");
            if (invalid) {
                invalid.focus();
                invalid.reportValidity();
                return;
            }

            var minDigits = document.documentElement.lang === "pt-PT" ? 9 : 10;
            if (form.telefone.value.replace(/\D/g, "").length < minDigits) {
                form.telefone.setCustomValidity(L("Informe o WhatsApp com DDD"));
                form.telefone.reportValidity();
                form.telefone.setCustomValidity("");
                return;
            }

            var lead = {
                nome: form.nome.value.trim(),
                email: form.email.value.trim(),
                telefone: form.telefone.value.trim(),
                empresa: form.empresa.value.trim(),
                site: noSite.checked ? "" : form.site.value.trim(),
                origem: "whatsapp",
                sobrenome_hp: form.sobrenome_hp.value
            };
            var score = scoreLead(lead);
            setSessionJson("snp_wq_dados", lead);
            setSessionJson("snp_wq", score.quente ? "Q" : "F");

            sendLead(lead);
            fetch("/api/whatsapp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                keepalive: true,
                body: JSON.stringify({
                    nome: lead.nome,
                    email: lead.email,
                    telefone: lead.telefone,
                    empresa: lead.empresa,
                    site: lead.site,
                    qualificado: score.quente,
                    lingua: document.documentElement.lang
                })
            }).catch(function () {});

            waDialog.close();
            openWhatsappWindow(lead, score.quente ? "Q" : "F");
        });
    }

    document.addEventListener("click", function (ev) {
        var link = ev.target.closest && ev.target.closest('a[href*="wa.me/"]');
        if (!link) { return; }
        ev.preventDefault();
        ev.stopPropagation();
        waHref = link.getAttribute("href");
        var saved = getSessionJson("snp_wq_dados");
        var tag = getSessionJson("snp_wq");
        if (saved && tag) {
            openWhatsappWindow(saved, tag);
            return;
        }
        ensureWhatsappDialog();
        if (waDialog.showModal) { waDialog.showModal(); } else { waDialog.setAttribute("open", ""); }
        pushDataLayer("whatsapp_qualificacao_aberta");
        setTimeout(function () {
            var nameField = waDialog.querySelector('input[name="nome"]');
            if (nameField && !nameField.value) { nameField.focus(); }
        }, 60);
    }, true);
})();
