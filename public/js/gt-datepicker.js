/**
 * GundjaTech Executive DatePicker (Zero-dependency, Light & Dark, Paleta 3)
 * Aprimora automaticamente todos os <input type="date"> no Painel Admin e Portal do Cliente,
 * preservando value (YYYY-MM-DD), required, min/max e eventos input/change (dirty-guard).
 */
(function () {
    if (window.__GT_DATEPICKER_INIT__) return;
    window.__GT_DATEPICKER_INIT__ = true;

    var MONTHS_PT = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    var WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    function parseIso(val) {
        if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
        var p = val.split('-');
        return { y: parseInt(p[0], 10), m: parseInt(p[1], 10) - 1, d: parseInt(p[2], 10) };
    }

    function toIso(y, m, d) {
        return y + '-' + pad2(m + 1) + '-' + pad2(d);
    }

    function formatBr(val) {
        var p = parseIso(val);
        if (!p) return '';
        return pad2(p.d) + '/' + pad2(p.m + 1) + '/' + p.y;
    }

    function getTodayIso() {
        var now = new Date();
        return toIso(now.getFullYear(), now.getMonth(), now.getDate());
    }

    var popover = null;
    var activeInput = null;
    var activeTrigger = null;
    var viewYear = new Date().getFullYear();
    var viewMonth = new Date().getMonth();

    function ensurePopover() {
        if (popover) return popover;
        popover = document.createElement('div');
        popover.className = 'gt-dp-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', 'Selecionar data');
        popover.style.display = 'none';
        document.body.appendChild(popover);
        return popover;
    }

    function closePopover() {
        if (popover) popover.style.display = 'none';
        if (activeTrigger) activeTrigger.classList.remove('is-open');
        activeInput = null;
        activeTrigger = null;
    }

    function positionPopover() {
        if (!popover || !activeTrigger) return;
        var rect = activeTrigger.getBoundingClientRect();
        var popW = 286;
        var popH = popover.offsetHeight || 318;
        var top = rect.bottom + 8;
        var left = rect.left;

        if (top + popH > window.innerHeight - 12 && rect.top - popH - 8 > 12) {
            top = rect.top - popH - 8;
        }
        if (left + popW > window.innerWidth - 12) {
            left = Math.max(12, window.innerWidth - popW - 12);
        }
        if (left < 12) left = 12;

        popover.style.top = Math.round(top) + 'px';
        popover.style.left = Math.round(left) + 'px';
    }

    function applyValue(isoVal) {
        if (!activeInput) return;
        activeInput.value = isoVal || '';
        updateTriggerText(activeInput, activeTrigger);
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        closePopover();
    }

    function renderPopover() {
        if (!popover || !activeInput) return;
        var selectedIso = activeInput.value || '';
        var todayIso = getTodayIso();
        var minIso = activeInput.getAttribute('min') || '';
        var maxIso = activeInput.getAttribute('max') || '';
        var isRequired = activeInput.hasAttribute('required');

        var firstDay = new Date(viewYear, viewMonth, 1).getDay();
        var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        var daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

        var html = '';
        html += '<div class="gt-dp-head">';
        html += '<button type="button" class="gt-dp-nav" data-dp-nav="-1" aria-label="Mês anterior">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
        html += '</button>';
        html += '<div class="gt-dp-title-wrap">';
        html += '<select class="gt-dp-month-sel" aria-label="Mês">';
        for (var m = 0; m < 12; m++) {
            html += '<option value="' + m + '"' + (m === viewMonth ? ' selected' : '') + '>' + MONTHS_PT[m] + '</option>';
        }
        html += '</select>';
        html += '<select class="gt-dp-year-sel" aria-label="Ano">';
        for (var y = viewYear - 8; y <= viewYear + 8; y++) {
            html += '<option value="' + y + '"' + (y === viewYear ? ' selected' : '') + '>' + y + '</option>';
        }
        html += '</select>';
        html += '</div>';
        html += '<button type="button" class="gt-dp-nav" data-dp-nav="1" aria-label="Próximo mês">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
        html += '</button>';
        html += '</div>';

        html += '<div class="gt-dp-body">';
        html += '<div class="gt-dp-weekdays">';
        for (var w = 0; w < 7; w++) {
            html += '<span>' + WEEKDAYS_PT[w] + '</span>';
        }
        html += '</div>';

        html += '<div class="gt-dp-grid">';
        // Dias do mês anterior
        for (var i = firstDay - 1; i >= 0; i--) {
            var pd = daysInPrev - i;
            var pm = viewMonth === 0 ? 11 : viewMonth - 1;
            var py = viewMonth === 0 ? viewYear - 1 : viewYear;
            var pIso = toIso(py, pm, pd);
            var pDisabled = (minIso && pIso < minIso) || (maxIso && pIso > maxIso);
            html += '<button type="button" class="gt-dp-day is-muted" data-dp-date="' + pIso + '"' + (pDisabled ? ' disabled' : '') + '>' + pd + '</button>';
        }
        // Dias do mês atual
        for (var d = 1; d <= daysInMonth; d++) {
            var iso = toIso(viewYear, viewMonth, d);
            var cls = 'gt-dp-day';
            if (iso === selectedIso) cls += ' is-selected';
            if (iso === todayIso) cls += ' is-today';
            var disabled = (minIso && iso < minIso) || (maxIso && iso > maxIso);
            html += '<button type="button" class="' + cls + '" data-dp-date="' + iso + '"' + (disabled ? ' disabled' : '') + '>' + d + '</button>';
        }
        // Completar grade (42 células)
        var totalCells = firstDay + daysInMonth;
        var remaining = (7 - (totalCells % 7)) % 7;
        for (var nd = 1; nd <= remaining; nd++) {
            var nm = viewMonth === 11 ? 0 : viewMonth + 1;
            var ny = viewMonth === 11 ? viewYear + 1 : viewYear;
            var nIso = toIso(ny, nm, nd);
            var nDisabled = (minIso && nIso < minIso) || (maxIso && nIso > maxIso);
            html += '<button type="button" class="gt-dp-day is-muted" data-dp-date="' + nIso + '"' + (nDisabled ? ' disabled' : '') + '>' + nd + '</button>';
        }
        html += '</div>';
        html += '</div>';

        html += '<div class="gt-dp-foot">';
        if (!isRequired) {
            html += '<button type="button" class="gt-dp-foot-btn" data-dp-action="clear">Limpar</button>';
        } else {
            html += '<span></span>';
        }
        html += '<button type="button" class="gt-dp-foot-btn is-accent" data-dp-action="today">Hoje</button>';
        html += '</div>';

        popover.innerHTML = html;

        var monthSel = popover.querySelector('.gt-dp-month-sel');
        var yearSel = popover.querySelector('.gt-dp-year-sel');
        if (monthSel) {
            monthSel.addEventListener('change', function () {
                viewMonth = parseInt(this.value, 10);
                renderPopover();
            });
        }
        if (yearSel) {
            yearSel.addEventListener('change', function () {
                viewYear = parseInt(this.value, 10);
                renderPopover();
            });
        }
        popover.querySelectorAll('[data-dp-nav]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var dir = parseInt(this.getAttribute('data-dp-nav'), 10);
                viewMonth += dir;
                if (viewMonth < 0) { viewMonth = 11; viewYear--; }
                if (viewMonth > 11) { viewMonth = 0; viewYear++; }
                renderPopover();
            });
        });
        popover.querySelectorAll('[data-dp-date]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (this.disabled) return;
                applyValue(this.getAttribute('data-dp-date'));
            });
        });
        var clearBtn = popover.querySelector('[data-dp-action="clear"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () { applyValue(''); });
        }
        var todayBtn = popover.querySelector('[data-dp-action="today"]');
        if (todayBtn) {
            todayBtn.addEventListener('click', function () { applyValue(todayIso); });
        }
        positionPopover();
    }

    function openPopover(input, trigger) {
        ensurePopover();
        if (activeInput === input && popover.style.display === 'block') {
            closePopover();
            return;
        }
        if (activeTrigger) activeTrigger.classList.remove('is-open');
        activeInput = input;
        activeTrigger = trigger;
        activeTrigger.classList.add('is-open');

        var parsed = parseIso(input.value) || parseIso(getTodayIso());
        viewYear = parsed.y;
        viewMonth = parsed.m;

        popover.style.display = 'block';
        renderPopover();
    }

    function updateTriggerText(input, trigger) {
        if (!trigger) return;
        var valSpan = trigger.querySelector('.gt-dp-trigger-val');
        if (!valSpan) return;
        var br = formatBr(input.value);
        if (br) {
            valSpan.textContent = br;
            valSpan.classList.remove('is-placeholder');
        } else {
            valSpan.textContent = 'dd/mm/aaaa';
            valSpan.classList.add('is-placeholder');
        }
    }

    function enhanceDateInput(input) {
        if (!input || input.dataset.gtDpEnhanced === '1') return;
        input.dataset.gtDpEnhanced = '1';

        var wrap = document.createElement('div');
        wrap.className = 'gt-dp-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        input.classList.add('gt-dp-native');
        input.setAttribute('tabindex', '-1');
        input.setAttribute('aria-hidden', 'true');

        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'gt-dp-trigger';
        if (input.disabled) trigger.disabled = true;
        trigger.innerHTML =
            '<span class="gt-dp-trigger-val"></span>' +
            '<span class="gt-dp-trigger-icon" aria-hidden="true">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>' +
            '</svg></span>';

        updateTriggerText(input, trigger);
        wrap.appendChild(trigger);

        trigger.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (input.disabled) return;
            openPopover(input, trigger);
        });

        input.addEventListener('change', function () {
            updateTriggerText(input, trigger);
        });
    }

    function scanDateInputs() {
        document.querySelectorAll('input[type="date"]').forEach(enhanceDateInput);
    }

    document.addEventListener('mousedown', function (ev) {
        if (!popover || popover.style.display !== 'block') return;
        if (popover.contains(ev.target)) return;
        if (activeTrigger && activeTrigger.contains(ev.target)) return;
        closePopover();
    });

    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && popover && popover.style.display === 'block') {
            closePopover();
        }
    });

    window.addEventListener('resize', function () {
        if (popover && popover.style.display === 'block') positionPopover();
    });

    window.addEventListener('scroll', function (ev) {
        if (!popover || popover.style.display !== 'block') return;
        if (ev.target && popover.contains(ev.target)) return;
        closePopover();
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scanDateInputs);
    } else {
        scanDateInputs();
    }
})();
