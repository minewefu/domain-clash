/* DOMAIN CLASH — player page wiring (only active in player mode): gate, transport, act menu, keyboard. */
(function () {
  'use strict';
  const HT = window.HT;
  const $ = id => document.getElementById(id);
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  // the film's plan (fixed act spans) and colour script — cards show every act; playable once it is in the timeline
  const PLAN = [
    { id: 'I', n: 'I', title: 'The Strongest', from: 0, to: 210, chip: ['#323353', '#4d65b4', '#c7dcd0', '#f9c22b'] },
    { id: 'II', n: 'II', title: 'Domain War', from: 210, to: 480, chip: ['#2e222f', '#484a77', '#8fd3ff', '#ae2334', '#6e2727', '#ffffff'] },
    { id: 'III', n: 'III', title: 'Unlimited Void', from: 480, to: 660, chip: ['#ffffff', '#fbff86', '#ab947a', '#7f708a'] },
    { id: 'IV', n: 'IV', title: 'Adaptation', from: 660, to: 900, chip: ['#313638', '#374e4a', '#9e4539', '#ffffff', '#f9c22b'] },
    { id: 'V', n: 'V', title: 'Hollow Purple', from: 900, to: 1050, chip: ['#f9c22b', '#cf657f', '#905ea9', '#6b3e75'] },
    { id: 'VI', n: 'VI', title: 'The World-Cutting Slash', from: 1050, to: 1200, chip: ['#ffffff', '#fdcbb0', '#8fd3ff', '#fbff86'] },
  ];
  HT.onBoot = () => {
    const stage = $('stage'), gate = $('gate'), bigplay = $('bigplay');
    if (!stage) return;
    const play = $('play'), time = $('time'), scrub = $('scrub'), mute = $('mute'), dither = $('dither'), fs = $('fs');
    const acts = $('acts'), ticks = $('ticks');
    const D = HT.duration;
    let started = false, lastUi = 0, curAct = -1;
    const spans = HT.actSpans || [];
    const liveIds = new Set(spans.map(a => a.id));
    // poster frame behind the gate
    HT.player.seek(Math.min(HT.POSTER_T === undefined ? D * 0.4 : HT.POSTER_T, D - 1));
    const note = $('actsnote');
    if (liveIds.has('test') && ![...liveIds].some(id => id !== 'test')) note.textContent = 'Foundation milestone: the 30-second fight test is playing; the acts follow';
    // act cards
    const cards = [];
    PLAN.forEach((a, k) => {
      const span = spans.find(s => s.id === a.id);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'act'; b.id = 'act-' + a.id;
      b.innerHTML = `<span class="num">${a.n}</span><span class="ttl">${a.title}</span><span class="span">${fmt(a.from)}–${fmt(a.to)}</span>` +
        `<span class="chip">${a.chip.map(c => `<i style="background:${c}"></i>`).join('')}</span>` +
        `<span class="state${span ? ' live' : ''}">${span ? 'PLAY' : 'IN PRODUCTION · M' + (k < 4 ? k + 1 : 5)}</span>`;
      if (span) b.addEventListener('click', () => start(span.start + 0.02));
      else { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      acts.appendChild(b);
      cards.push({ el: b, span });
    });
    // scrub ticks at act and scene boundaries
    (HT.timeline || []).forEach((e, i) => { if (i > 0) { const t = document.createElement('b'); t.style.left = (e.start / D) * 100 + '%'; if (e.actIndex !== HT.timeline[i - 1].actIndex) t.style.background = 'var(--muted)'; ticks.appendChild(t); } });
    const start = (at) => {
      started = true; gate.hidden = true;
      if (HT.audio && HT.audio.init) { try { HT.audio.init(); } catch (e) { console.warn(e); } }
      HT.player.play(at);
    };
    bigplay.addEventListener('click', () => start(0));
    play.addEventListener('click', () => { if (!started) return start(0); HT.player.toggle(); });
    scrub.addEventListener('input', () => {
      const t = (scrub.value / 1000) * D;
      if (!started) { started = true; gate.hidden = true; }
      HT.player.seek(t);
    });
    mute.addEventListener('click', () => {
      const m = mute.getAttribute('aria-pressed') !== 'true';
      mute.setAttribute('aria-pressed', String(m));
      mute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
      mute.firstChild.textContent = m ? '✕ ' : '♪ ';
      if (HT.audio && HT.audio.setMuted) HT.audio.setMuted(m);
    });
    dither.addEventListener('click', () => {
      HT.settings.quantize = !HT.settings.quantize;
      dither.setAttribute('aria-pressed', String(HT.settings.quantize));
      if (!HT.player.playing) HT.player.draw();
    });
    const toggleFs = () => {
      if (document.fullscreenElement) { document.exitFullscreen && document.exitFullscreen(); return; }
      const p = stage.requestFullscreen ? stage.requestFullscreen() : null;
      if (p && p.catch) p.catch(() => {});
    };
    fs.addEventListener('click', toggleFs);
    document.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' && e.target.type !== 'range')) return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'k') { e.preventDefault(); if (!started) start(0); else HT.player.toggle(); }
      else if (k === 'arrowright') { e.preventDefault(); HT.player.seek(HT.player.time + 5); }
      else if (k === 'arrowleft') { e.preventDefault(); HT.player.seek(HT.player.time - 5); }
      else if (k === 'm') mute.click();
      else if (k === 'f') toggleFs();
      else if (/^[1-6]$/.test(k)) { const c = cards[+k - 1]; if (c && c.span) start(c.span.start + 0.02); }
    });
    const update = () => {
      const nowMs = performance.now();
      if (nowMs - lastUi < 90 && HT.player.playing) return;
      lastUi = nowMs;
      const t = started ? HT.player.time : 0; // the poster frame behind the gate isn't a playback position
      time.textContent = fmt(t) + ' / ' + fmt(D);
      const p = (t / D) * 1000;
      if (document.activeElement !== scrub) scrub.value = String(Math.round(p));
      scrub.style.setProperty('--p', (p / 10).toFixed(2) + '%');
      play.textContent = HT.player.playing ? '❚❚' : '▶';
      play.setAttribute('aria-label', HT.player.playing ? 'Pause' : 'Play');
      const e = HT.timeline[HT.sceneAt(t)];
      const ai = e ? PLAN.findIndex(a => a.id === e.act) : -1;
      if (ai !== curAct) { curAct = ai; cards.forEach((c, i) => c.el.setAttribute('aria-current', i === ai ? 'true' : 'false')); }
      if (started && !HT.player.playing && t >= D - 0.05) { gate.hidden = false; bigplay.lastChild.textContent = 'Play again'; started = false; }
    };
    HT.player.on(update);
    lastUi = -1e9; update();
  };
})();
