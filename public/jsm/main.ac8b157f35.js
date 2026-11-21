(function () {
    "use strict";

    document.addEventListener("click", function (ev) {
        document.querySelectorAll("details.idioma-menu[open]").forEach(function (det) {
            if (!det.contains(ev.target)) {
                det.removeAttribute("open");
            }
        });
    });

    var L = window.SNP_L || function (text) { return text; };
    var qs = function (sel, root) { return (root || document).querySelector(sel); };
    var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
    var hasIO = "IntersectionObserver" in window;

    function observe(elements, callback, options) {
        if (hasIO) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    callback(entry.target, entry.isIntersecting, io);
                });
            }, options || { rootMargin: "0px 0px -10% 0px" });
            elements.forEach(function (el) { io.observe(el); });
        } else {
            elements.forEach(function (el) { callback(el, true); });
        }
    }

    var contactDialog = qs("#janela");
    function openContactDialog() {
        if (!contactDialog) { return; }
        if (contactDialog.showModal) { contactDialog.showModal(); } else { contactDialog.setAttribute("open", ""); }
    }

    qsa(".js-abrir").forEach(function (btn) { btn.addEventListener("click", openContactDialog); });
    qsa(".js-abrir-link").forEach(function (link) {
        link.addEventListener("click", function (ev) {
            ev.preventDefault();
            openContactDialog();
        });
    });
    var closeBtn = qs(".js-fechar");
    if (closeBtn && contactDialog) {
        closeBtn.addEventListener("click", function () { contactDialog.close(); });
    }
    if (contactDialog) {
        contactDialog.addEventListener("click", function (ev) {
            if (ev.target === contactDialog) { contactDialog.close(); }
        });
    }

    function renderProtocolReceipt(form, result) {
        var okBox = form.querySelector(".ok");
        if (!okBox || !result || !result.protocol) { return; }

        var existing = okBox.querySelector(".gt-protocol-receipt");
        if (existing) { existing.remove(); }

        var wrap = document.createElement("div");
        wrap.className = "gt-protocol-receipt";

        var badge = document.createElement("div");
        badge.className = "gt-protocol-badge";

        var label = document.createElement("span");
        label.className = "gt-protocol-label";
        label.textContent = L("Protocolo") + ":";

        var code = document.createElement("strong");
        code.className = "gt-protocol-code";
        code.textContent = result.protocol;

        badge.appendChild(label);
        badge.appendChild(code);
        wrap.appendChild(badge);

        if (result.track_url) {
            var link = document.createElement("a");
            link.href = result.track_url;
            link.className = "gt-protocol-cta";
            link.textContent = L("Acompanhar solicitação →");
            wrap.appendChild(link);
        }

        okBox.appendChild(wrap);
    }

    qsa(".js-form").forEach(function (form) {
        form.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var invalid = form.querySelector(":invalid");
            if (invalid) {
                invalid.focus();
                invalid.reportValidity();
                return;
            }

            var submitBtn = form.querySelector("[type=submit]");
            if (window.SNP_enviaLead && window.SNP_dadosForm) {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.dataset.txt = submitBtn.dataset.txt || submitBtn.innerHTML;
                    submitBtn.textContent = L("Enviando...");
                }
                var prevErr = form.querySelector(".form-erro");
                if (prevErr) { prevErr.remove(); }

                window.SNP_enviaLead(window.SNP_dadosForm(form)).then(function (result) {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = submitBtn.dataset.txt;
                    }
                    if (result) {
                        renderProtocolReceipt(form, result);
                        form.classList.add("enviado");
                    } else {
                        var err = document.createElement("p");
                        err.className = "form-erro";
                        err.setAttribute("role", "alert");
                        err.textContent = L("Não conseguimos enviar agora. Tente de novo ou chame no WhatsApp.");
                        (submitBtn && submitBtn.parentNode ? submitBtn.parentNode : form).appendChild(err);
                    }
                });
            } else {
                form.classList.add("enviado");
            }
        });
    });

    qsa(".js-news").forEach(function (form) {
        form.addEventListener("submit", function (ev) {
            ev.preventDefault();
            var input = qs("input", form);
            if (!input) { return; }
            if (input.checkValidity()) {
                var emailVal = input.value.trim();
                if (window.SNP_enviaLead && emailVal) {
                    window.SNP_enviaLead({
                        nome: "Assinante Newsletter",
                        email: emailVal,
                        origem: "newsletter",
                        mensagem: "Inscrição na newsletter GundjaTech."
                    });
                }
                input.value = "";
                input.placeholder = L("Inscrição confirmada!");
            } else {
                input.reportValidity();
            }
        });
    });

    observe(qsa(".case-mock, .servico-mock, .parede"), function (el, visible) {
        el.classList.toggle("ativo-mock", visible && !reducedMotion);
    }, { threshold: 0.15 });

    qsa(".js-palavras").forEach(function (el) {
        var idx = 0;
        (function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (child) {
                if (child.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach(function (token) {
                        if (!token) { return; }
                        if (/^\s+$/.test(token)) {
                            frag.appendChild(document.createTextNode(token));
                        } else {
                            var span = document.createElement("span");
                            span.className = "pal";
                            span.textContent = token;
                            span.style.transitionDelay = (0.06 * idx++) + "s";
                            frag.appendChild(span);
                        }
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        })(el);
    });

    observe(qsa(".js-palavras"), function (el, visible, io) {
        if (visible) {
            el.classList.add("visivel");
            if (io) { io.unobserve(el); }
        }
    });

    observe(qsa(".js-ia-caixa"), function (el, visible, io) {
        if (visible) {
            el.classList.add("ativo");
            if (io) { io.unobserve(el); }
        }
    }, { threshold: 0.3 });

    var aiHint = qs(".ia-dica");
    qsa(".ia-grade span").forEach(function (badge) {
        badge.addEventListener("mouseenter", function () {
            if (aiHint) { aiHint.textContent = badge.dataset.nome; }
        });
    });

    var caseCards = qsa(".case");
    var showcase = qs(".js-vitrine");
    var showcaseScreen = qs(".js-vit-tela");
    var showcaseParallax = qs(".js-vit-paralaxe");
    var showcaseVideos = qsa(".js-vit");
    var showcaseTabs = qsa(".vit-aba");
    var currentVideoIdx = 0;
    var showcaseVisible = false;

    function activateVideo(index) {
        showcaseVideos.forEach(function (vid, i) {
            var active = i === index;
            vid.classList.toggle("ativo", active);
            if (!active) { vid.pause(); }
        });
        showcaseTabs.forEach(function (tab, i) {
            tab.classList.remove("ativo");
            tab.setAttribute("aria-selected", i === index ? "true" : "false");
            if (i === index) {
                tab.offsetWidth;
                tab.classList.add("ativo");
            }
        });
        currentVideoIdx = index;
        var current = showcaseVideos[index];
        current.preload = "auto";
        current.currentTime = 0;
        var duration = isFinite(current.duration) && current.duration ? current.duration : 16.7;
        if (showcaseTabs[index]) {
            showcaseTabs[index].style.setProperty("--tempo", duration + "s");
        }
        if (showcaseVisible && !reducedMotion) {
            var p = current.play();
            if (p && p.catch) { p.catch(function () {}); }
        }
        showcaseVideos[(index + 1) % showcaseVideos.length].preload = "auto";
    }

    showcaseVideos.forEach(function (vid, idx) {
        vid.addEventListener("ended", function () {
            if (idx === currentVideoIdx) {
                activateVideo((idx + 1) % showcaseVideos.length);
            }
        });
    });

    showcaseTabs.forEach(function (tab, idx) {
        tab.setAttribute("role", "tab");
        tab.addEventListener("click", function () { activateVideo(idx); });
    });

    observe(showcase ? [showcase] : [], function (el, visible) {
        showcaseVisible = visible;
        if (visible && showcaseVideos[currentVideoIdx]) {
            if (showcaseVideos[currentVideoIdx].paused) {
                var p = showcaseVideos[currentVideoIdx].play();
                if (p && p.catch) { p.catch(function () {}); }
            }
        } else if (showcaseVideos[currentVideoIdx]) {
            showcaseVideos[currentVideoIdx].pause();
        }
    }, { threshold: 0.25 });

    if (showcaseVideos.length) { activateVideo(0); }

    var serviceMocks = qsa(".servico-mock");

    function animateCounter(el, target, duration, suffix) {
        var start = null;
        (function step(ts) {
            if (!start) { start = ts; }
            var progress = clamp((ts - start) / duration, 0, 1);
            el.textContent = Math.round(target * easeOut(progress)) + (suffix || "");
            if (progress < 1) { requestAnimationFrame(step); }
        })(performance.now());
    }

    observe(qsa(".js-garantias"), function (section, visible, io) {
        if (!visible) { return; }
        section.classList.add("ativo");
        if (io) { io.unobserve(section); }

        qsa(".js-conta", section).forEach(function (counter) {
            if (reducedMotion) {
                counter.textContent = counter.dataset.alvo;
            } else {
                setTimeout(function () { animateCounter(counter, +counter.dataset.alvo, 1800); }, 300);
            }
        });

        var clockEl = qs(".js-relogio", section);
        if (clockEl) {
            setTimeout(function () { animateCounter(clockEl, 4, 1600, "h"); }, 600);
        }

        var typingEl = qs(".js-digita", section);
        if (typingEl) {
            if (reducedMotion) {
                typingEl.textContent = typingEl.dataset.texto;
            } else {
                setTimeout(function () {
                    var txt = typingEl.dataset.texto || "";
                    var pos = 0;
                    (function typeNext() {
                        typingEl.textContent = txt.slice(0, pos++);
                        if (pos <= txt.length) {
                            setTimeout(typeNext, txt[pos - 2] === "\n" ? 380 : 32);
                        }
                    })();
                }, 700);
            }
        }
    }, { threshold: 0.2 });

    qsa(".g-card").forEach(function (card) {
        card.addEventListener("pointermove", function (ev) {
            var rect = card.getBoundingClientRect();
            card.style.setProperty("--mx", (ev.clientX - rect.left) + "px");
            card.style.setProperty("--my", (ev.clientY - rect.top) + "px");
        });
    });

    // Authentic GundjaTech project highlights & partner feedback (no fabricated third-party celebrity claims)
    var testimonials = [
        [L("A plataforma KLASSE elevou nosso posicionamento digital e simplificou a jornada das escolas que buscam gestão financeira, matrículas e documentos acadêmicos em tempo real."), L("Equipe KLASSE"), L("EdTech · Gestão Escolar")],
        [L("Nosso portal institucional organizou todos os cursos técnicos de saúde e trouxe muito mais clareza para o processo de admissões, laboratórios e contato com novos alunos."), L("Direção Acadêmica"), L("Instituto Paraíso do Saber")],
        [L("A nova plataforma corporativa com simuladores fiscais interativos diferenciou nossa marca no setor contábil e aumentou a qualificação dos contatos empresariais."), L("Diretoria Executiva"), L("Cotech Contabilidade")],
        [L("Comunicação direta com quem executa, prazos respeitados em contrato e entrega técnica pensada para velocidade, SEO e geração de oportunidades reais."), L("Atendimento GundjaTech"), L("Projetos Web & Sistemas")],
        [L("Monitoramento contínuo, blindagem de segurança, backups automáticos e operação gerenciada que mantêm nosso site estável todos os dias."), L("Operação Contínua"), L("Cibersegurança & Cloud")],
        [L("Arquitetura limpa, painel administrativo integrado ao portal do cliente e total transparência em cada etapa do desenvolvimento."), L("Engenharia Digital"), L("Sistemas & Plataformas")]
    ];

    function renderTestimonialCard(item) {
        var initials = item[1].split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
        return '<figure class="dep"><div class="est" aria-label="5 estrelas">★★★★★</div><blockquote style="margin:0">' + item[0] + '</blockquote><figcaption class="quem"><span class="av">' + initials + '</span><span><b>' + item[1] + '</b><small>' + item[2] + '</small></span></figcaption></figure>';
    }

    qsa(".js-col").forEach(function (col, idx) {
        var html = testimonials.slice(idx % testimonials.length)
            .concat(testimonials.slice(0, idx % testimonials.length))
            .slice(0, 5)
            .map(renderTestimonialCard)
            .join("");
        col.innerHTML = html + html.replace(/<figure class="dep">/g, '<figure class="dep" aria-hidden="true">');
    });

    var moreBtn = qs(".js-mais");
    var moreMenu = qs("#menu-mais");
    if (moreBtn && moreMenu) {
        moreBtn.addEventListener("click", function () {
            var open = moreMenu.classList.toggle("on");
            moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });
        qsa("a", moreMenu).forEach(function (link) {
            link.addEventListener("click", function () {
                moreMenu.classList.remove("on");
                moreBtn.setAttribute("aria-expanded", "false");
            });
        });
        document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape") {
                moreMenu.classList.remove("on");
                moreBtn.setAttribute("aria-expanded", "false");
            }
        });
    }

    var toTopBtn = qs(".js-topo");
    if (toTopBtn) {
        toTopBtn.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
        });
    }

    var ticking = false;
    var wallBg = qs(".parede-plano");

    function updateScrollEffects() {
        if (wallBg && !reducedMotion) {
            var z = clamp(window.scrollY / window.innerHeight, 0, 1);
            wallBg.style.setProperty("--zoom", (1 + 0.08 * z).toFixed(3));
        }

        if (window.innerWidth >= 992) {
            caseCards.forEach(function (card, idx) {
                var next = caseCards[idx + 1];
                if (next) {
                    var progress = clamp(1 - (next.getBoundingClientRect().top - card.getBoundingClientRect().top) / card.offsetHeight, 0, 1);
                    card.style.transform = "scale(" + (1 - 0.06 * progress).toFixed(3) + ")";
                    card.style.filter = "brightness(" + (1 - 0.12 * progress).toFixed(3) + ")";
                }
            });

            serviceMocks.forEach(function (mock) {
                var rect = mock.getBoundingClientRect();
                var ratio = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
                mock.style.setProperty("--p1", (30 * ratio).toFixed(1) + "px");
                mock.style.setProperty("--p2", (-70 * ratio).toFixed(1) + "px");
            });
        }

        if (showcase && showcaseScreen && showcaseParallax) {
            var rect = showcase.getBoundingClientRect();
            var vh = window.innerHeight;
            var t = reducedMotion ? 1 : easeOut(clamp((vh - rect.top) / (0.85 * vh), 0, 1));
            showcaseScreen.style.setProperty("--rx", lerp(28, 0, t).toFixed(2) + "deg");
            showcaseScreen.style.setProperty("--esc", lerp(0.82, 1, t).toFixed(3));
            showcaseScreen.style.setProperty("--ty", lerp(40, 0, t).toFixed(1) + "px");
            showcaseScreen.style.setProperty("--clip", lerp(8, 0, t).toFixed(2) + "%");
            var py = clamp((rect.top + rect.height / 2 - vh / 2) / vh, -1, 1);
            showcaseParallax.style.setProperty("--py", (-50 * py).toFixed(1) + "px");
        }

        if (toTopBtn) {
            toTopBtn.classList.toggle("on", window.scrollY > window.innerHeight);
        }
    }

    window.addEventListener("scroll", function () {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(function () {
                ticking = false;
                updateScrollEffects();
            });
        }
    }, { passive: true });
    window.addEventListener("resize", updateScrollEffects);
    updateScrollEffects();

    var revealTargets = qsa(".cases h2, .fazemos h2, .compara h2, .oferta-card, #dep-titulo, #faq-titulo, .contato-card, .garantias-topo");
    revealTargets.forEach(function (el) { el.classList.add("revelar"); });
    observe(revealTargets, function (el, visible, io) {
        if (visible) {
            el.classList.add("visivel");
            if (io) { io.unobserve(el); }
        }
    });
})();
