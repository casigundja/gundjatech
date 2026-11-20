(function () {
  "use strict";
  var track = document.querySelector(".js-gt-era");
  if (!track) return;

  var inner = track.querySelector(".gt-era-inner");
  var head = track.querySelector(".gt-era-head");
  var leftTxt = track.querySelector(".gt-era-left");
  var rightTxt = track.querySelector(".gt-era-right");
  var art = track.querySelector(".gt-era-art");
  var artSvg = art ? art.querySelector("svg") : null;
  var deck = track.querySelector(".gt-era-deck");
  var tray = track.querySelector(".gt-era-tray");
  var card1 = track.querySelector(".gt-era-c1");
  var card2 = track.querySelector(".gt-era-c2");
  var card3 = track.querySelector(".gt-era-c3");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var curP = 0;
  var targetP = 0;
  var rafId = null;

  function clamp(v, mn, mx) {
    return v < mn ? mn : v > mx ? mx : v;
  }

  function seg(p, a, b) {
    return clamp((p - a) / (b - a), 0, 1);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function isDesktop() {
    return window.innerWidth >= 900 && !reduced;
  }

  function applyState(p) {
    if (!isDesktop()) {
      track.classList.add("gt-era-static");
      return;
    }
    track.classList.remove("gt-era-static");

    var vh = window.innerHeight || 900;
    var vw = window.innerWidth || 1440;

    // 1. Left phrase rises smoothly (+72px -> 0) and fades in (p: 0.00 -> 0.20)
    var tLeftIn = easeOutCubic(seg(p, 0.00, 0.20));
    // 2. Right phrase rises smoothly (+72px -> 0) and fades in (p: 0.23 -> 0.44)
    var tRightIn = easeOutCubic(seg(p, 0.23, 0.44));
    // 3. Central illustration width expands 0 -> targetW pushing phrases apart (p: 0.45 -> 0.64)
    var tSplit = easeInOutCubic(seg(p, 0.45, 0.64));
    // 4. Entire inner stack glides upward while card deck fades in centered (p: 0.63 -> 0.82)
    var tLift = easeInOutCubic(seg(p, 0.63, 0.82));
    // 5. Cards unfold from stacked center + outer gray tray expands + diagonal text stagger (p: 0.70 -> 0.95)
    var tSpread = easeInOutCubic(seg(p, 0.70, 0.95));

    // Flex-expanding illustration width: pushes left & right phrases apart organically
    var artTargetW = clamp(Math.min(350, vw * 0.245, vh * 0.36), 210, 350);
    var curArtW = artTargetW * tSplit;
    art.style.width = curArtW.toFixed(1) + "px";
    if (artSvg) {
      artSvg.style.opacity = clamp(tSplit * 1.4, 0, 1).toFixed(3);
      artSvg.style.transform = "scale(" + lerp(0.18, 1.0, tSplit).toFixed(3) + ")";
    }

    // Diagonal stagger on phrases during card unfold (left rises toward head, right drops toward desk)
    var staggerAmp = clamp(vh * 0.072, 34, 66);
    var ly = lerp(72, 0, tLeftIn) - staggerAmp * tSpread;
    var ry = lerp(72, 0, tRightIn) + staggerAmp * tSpread;

    leftTxt.style.opacity = tLeftIn.toFixed(3);
    leftTxt.style.transform = "translate3d(0," + ly.toFixed(1) + "px,0)";

    rightTxt.style.opacity = tRightIn.toFixed(3);
    rightTxt.style.transform = "translate3d(0," + ry.toFixed(1) + "px,0)";

    // Vertical positioning of inner block (header + deck):
    // Before lift (tLift=0), head sits vertically centered in the viewport;
    // After lift (tLift=1), the whole head+deck block sits cleanly centered between navbar (top) and dock (bottom).
    var innerH = inner.offsetHeight || 660;
    var headH = head.offsetHeight || 220;
    var usableTop = vh < 760 ? 66 : 74;
    var usableBot = vh - (vh < 760 ? 78 : 88);
    var safeCenterY = (usableTop + usableBot) * 0.5;

    // inner is flex-centered at vh / 2, so head center is at (vh/2 - innerH/2 + headH/2)
    // Shift inner down by (innerH/2 - headH/2) so head starts dead-center in viewport!
    var innerStartY = (innerH - headH) * 0.5;
    var innerEndY = safeCenterY - vh * 0.5;
    var innerY = lerp(innerStartY, innerEndY, tLift);
    inner.style.transform = "translate3d(0," + innerY.toFixed(1) + "px,0)";

    // Deck fades in & eases slightly upward into place as inner lifts
    var deckFade = easeOutCubic(seg(p, 0.64, 0.80));
    var deckExtraY = lerp(42, 0, tLift);
    deck.style.opacity = deckFade.toFixed(3);
    deck.style.transform = "translate3d(0," + deckExtraY.toFixed(1) + "px,0)";

    // Exact Superlógica card desmembramento math:
    // At tSpread=0, card1 (z:1) and card2 (z:2, translucent) sit centered behind card3 (z:3, wider blue).
    // At tSpread=1, all 3 reach their natural flex positions (translateX=0) while tray expands w3+8 -> deckW.
    var deckW = deck.offsetWidth || 1140;
    var w1 = card1.offsetWidth || 340;
    var w2 = card2.offsetWidth || 340;
    var w3 = card3.offsetWidth || 445;

    var c1StartX = (deckW - w1) * 0.5 - card1.offsetLeft;
    var c2StartX = (deckW - w2) * 0.5 - card2.offsetLeft;
    var c3StartX = (deckW - w3) * 0.5 - card3.offsetLeft;

    var c1x = lerp(c1StartX, 0, tSpread);
    var c2x = lerp(c2StartX, 0, tSpread);
    var c3x = lerp(c3StartX, 0, tSpread);

    card1.style.transform = "translate3d(" + c1x.toFixed(1) + "px,0,0)";
    card2.style.transform = "translate3d(" + c2x.toFixed(1) + "px,0,0)";
    card3.style.transform = "translate3d(" + c3x.toFixed(1) + "px,0,0)";

    // Expanding outer #EDEFF2 tray behind the 3 cards
    if (tray) {
      var trayW = lerp(w3 + 8, deckW, tSpread);
      tray.style.width = trayW.toFixed(1) + "px";
    }
  }

  function computeTarget() {
    var rect = track.getBoundingClientRect();
    var scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 1;
    return clamp(-rect.top / scrollable, 0, 1);
  }

  function tick() {
    rafId = null;
    curP += (targetP - curP) * 0.18;
    if (Math.abs(targetP - curP) < 0.0006) {
      curP = targetP;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    applyState(curP);
  }

  function onScroll() {
    if (!isDesktop()) {
      applyState(1);
      return;
    }
    targetP = computeTarget();
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    targetP = computeTarget();
    curP = targetP;
    applyState(curP);
  });

  // Initial render
  targetP = computeTarget();
  curP = targetP;
  applyState(curP);
})();
