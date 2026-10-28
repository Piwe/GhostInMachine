const $ = (id) => document.getElementById(id);
const svg = $('house');
const FULL_VIEW = [0, 0, 900, 520];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  catalog: null,
  night: null,
  index: -1,
  timer: null,
  storyAbort: null,
  tourStep: -1,
  view: [...FULL_VIEW],
};

// ───────────────────────── setup ─────────────────────────

async function init() {
  $('date').value = new Date().toISOString().slice(0, 10);
  $('extras').addEventListener('input', () => ($('extras-out').value = $('extras').value));

  state.catalog = await (await fetch('/api/catalog')).json();
  for (const tone of state.catalog.tones) $('tone').add(new Option(tone, tone));

  const status = await (await fetch('/api/status')).json();
  if (status.available) {
    narratorLine(`Narrator: ${status.model} via ${status.provider} (local, open-weight)`);
  } else {
    narratorLine(`No local model found (${status.error}). Stories will use the offline narrator. See README to run ${status.model}.`, true);
  }
  for (const [provider, ready] of Object.entries(status.voices)) {
    $('voice').querySelector(`[value="${provider}"]`).disabled = !ready;
  }
  if (status.voices.piper) $('voice').value = 'piper';
}

function narratorLine(text, warn = false) {
  $('narrator').textContent = text;
  $('narrator').classList.toggle('warn', warn);
}

// ───────────────────────── nights ─────────────────────────

$('controls').addEventListener('submit', async (e) => {
  e.preventDefault();
  endTour();
  const night = await postJson('/api/night', {
    seed: $('seed').value.trim(),
    date: $('date').value,
    extras: Number($('extras').value),
  });
  $('seed').placeholder = night.seed;
  load(night);
});

$('import').addEventListener('change', async () => {
  const file = $('import').files[0];
  if (!file) return;
  endTour();
  try {
    load(await postJson('/api/import', { text: await file.text() }));
  } catch (err) {
    narratorLine(`Could not read that log: ${err.message}`, true);
  }
  $('import').value = '';
});

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

function load(night) {
  stopReplay();
  state.night = night;
  state.index = -1;
  $('night-label').textContent = night.seed ? `night of ${night.date} · seed ${night.seed}` : `imported · ${night.events.length} events`;

  const log = $('log');
  log.replaceChildren(...night.events.map((ev) => {
    const li = document.createElement('li');
    li.textContent = ev.line;
    if (ev.activity) li.classList.add('anomaly');
    return li;
  }));

  $('scrub').max = night.events.length - 1;
  $('scrub').value = 0;
  $('scrub').disabled = $('play').disabled = false;
  $('listen').disabled = true;
  startReplay();
  scoreThenTell(night);
}

// The anomaly detector reads the log first, so the narrator knows what's strange.
async function scoreThenTell(night) {
  const label = $('detector');
  label.textContent = 'Anomaly detector is reading the log…';
  label.classList.remove('warn');
  $('story').innerHTML = '<p class="placeholder">The house is going through its records…</p>';
  try {
    const result = await postJson('/api/score', { night });
    if (state.night !== night) return;
    night.scores = result.scores;
    applyScores(result.scores);
    const name = result.scorer === 'tabpfn' ? 'TabPFN' : 'logistic baseline';
    const s = result.summary;
    label.textContent = s
      ? `Anomaly detector: ${name} · caught ${s.caught} of ${s.haunted} haunted readings, ${s.falseAlarms} false alarm${s.falseAlarms === 1 ? '' : 's'}`
      : `Anomaly detector: ${name} · flagged ${result.scores.filter((x) => x >= 0.5).length} of ${night.events.length} readings`;
    if (result.note) {
      label.textContent += ` · ${result.note}`;
      label.classList.add('warn');
    }
  } catch (err) {
    label.textContent = `Anomaly detector unavailable: ${err.message}`;
    label.classList.add('warn');
  }
  if (state.night === night) tellStory(night);
}

function applyScores(scores) {
  [...$('log').children].forEach((li, i) => {
    if (scores[i] < 0.5) return;
    li.dataset.score = scores[i];
    li.style.setProperty('--score', scores[i]);
    li.title = `anomaly ${scores[i].toFixed(2)}`;
  });
}

// ───────────────────────── replay ─────────────────────────

function showEvent(i) {
  const { events } = state.night;
  const items = $('log').children;
  const from = Math.min(i, Math.max(state.index, -1));
  for (let k = from + 1; k <= i; k++) items[k]?.classList.add('played');
  for (let k = i + 1; k <= state.index; k++) items[k]?.classList.remove('played');
  items[state.index]?.classList.remove('current');
  items[i].classList.add('current');
  state.index = i;

  const ev = events[i];
  $('clock').textContent = ev.clock;
  $('scrub').value = i;
  const log = $('log');
  log.scrollTop = items[i].offsetTop - log.clientHeight / 2;
  flash(ev.zone, ev.activity != null || state.night.scores?.[i] >= 0.5);
}

const flashTimers = {};
function flash(zone, haunt) {
  const g = svg.querySelector(`[data-zone="${zone}"]`);
  if (!g) return;
  g.classList.add('lit');
  g.classList.toggle('haunt', haunt);
  clearTimeout(flashTimers[zone]);
  flashTimers[zone] = setTimeout(() => g.classList.remove('lit', 'haunt'), 1400);
}

// Compress the night into roughly 40 seconds, but never rush a burst of events.
function delayAfter(i) {
  const { events } = state.night;
  if (i + 1 >= events.length) return null;
  const span = events.at(-1).t - events[0].t || 1;
  const gap = events[i + 1].t - events[i].t;
  return Math.min(1500, Math.max(90, (gap / span) * 40000));
}

function startReplay() {
  stopReplay();
  if (state.index >= state.night.events.length - 1) state.index = -1;
  $('play').textContent = 'Pause';
  const tick = () => {
    showEvent(state.index + 1);
    const d = delayAfter(state.index);
    state.timer = d == null ? (stopReplay(), null) : setTimeout(tick, d);
  };
  tick();
}

function stopReplay() {
  clearTimeout(state.timer);
  state.timer = null;
  $('play').textContent = 'Replay the night';
}

$('play').addEventListener('click', () => (state.timer ? stopReplay() : startReplay()));
$('scrub').addEventListener('input', () => {
  stopReplay();
  showEvent(Number($('scrub').value));
});

// ───────────────────────── story ─────────────────────────

async function tellStory(night) {
  state.storyAbort?.abort();
  speechSynthesis.cancel();
  const abort = (state.storyAbort = new AbortController());
  const article = $('story');
  let text = '';
  article.innerHTML = '<span class="cursor"></span>';

  try {
    const res = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ night, tone: $('tone').value, offline: $('offline').checked }),
      signal: abort.signal,
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines.filter(Boolean)) {
        const msg = JSON.parse(line);
        if (msg.narrator) narratorLine(`Narrator: ${msg.narrator}${msg.warning ? ` · ${msg.warning}` : ''}`, !!msg.warning);
        if (msg.error) throw new Error(msg.error);
        if (msg.text) {
          text += msg.text;
          article.innerHTML = renderStory(text) + '<span class="cursor"></span>';
        }
      }
    }
    article.innerHTML = renderStory(text);
    state.story = text;
    $('listen').disabled = !text.trim();
  } catch (err) {
    if (err.name !== 'AbortError') article.innerHTML = renderStory(text) + `<p class="placeholder">The narrator fell silent: ${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function renderStory(md) {
  return md.trim().split(/\n\s*\n/).map((block) => {
    let html = escapeHtml(block.trim())
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\b([01]\d|2[0-3]):([0-5]\d)\b/g, '<time>$1:$2</time>');
    const heading = html.match(/^#{1,3}\s+(.*)/);
    return heading ? `<h2>${heading[1]}</h2>` : `<p>${html.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

// Clicking a time in the story jumps the replay to that moment in the log.
$('story').addEventListener('click', (e) => {
  const time = e.target.closest('time');
  if (!time || !state.night) return;
  const { events } = state.night;
  const t = time.textContent;
  // Prefer the haunting at exactly that minute; otherwise the next thing logged.
  let target = events.findIndex((ev) => ev.clock === t && ev.activity);
  if (target < 0) target = events.findIndex((ev) => ev.clock === t);
  if (target < 0) return;
  stopReplay();
  showEvent(target);
  $('house').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
});

// ───────────────────────── narration ─────────────────────────

$('listen').addEventListener('click', async () => {
  const provider = $('voice').value;
  const audio = $('audio');
  if (provider === 'browser') return speakInBrowser(state.story);

  $('listen').disabled = true;
  $('listen').textContent = 'Clearing its throat…';
  try {
    const res = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.story, provider }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(await res.blob());
    audio.hidden = false;
    audio.play();
  } catch (err) {
    narratorLine(`Voice failed: ${err.message}`, true);
  }
  $('listen').disabled = false;
  $('listen').textContent = 'Read it to me';
});

function speakInBrowser(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/^#+\s*/gm, ''));
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find((v) => v.lang === 'en-GB') || voices.find((v) => v.lang.startsWith('en')) || null;
  utterance.rate = 0.88;
  utterance.pitch = 0.7;
  speechSynthesis.speak(utterance);
}

// ───────────────────────── guided tour ─────────────────────────

function animateView(to) {
  const from = [...state.view];
  state.view = to;
  if (reducedMotion) return svg.setAttribute('viewBox', to.join(' '));
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / 900);
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    svg.setAttribute('viewBox', from.map((v, k) => v + (to[k] - v) * e).join(' '));
    if (p < 1 && state.view === to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showTourStep(n) {
  const stops = state.catalog.tour;
  state.tourStep = Math.max(0, Math.min(n, stops.length - 1));
  const stop = stops[state.tourStep];

  svg.querySelectorAll('.zone.focus').forEach((g) => g.classList.remove('focus'));
  for (const z of stop.zones) svg.querySelector(`[data-zone="${z}"]`)?.classList.add('focus');
  animateView(stop.view);

  $('tour').hidden = false;
  $('tour-step').textContent = `Stop ${state.tourStep + 1} of ${stops.length}`;
  $('tour-title').textContent = stop.title;
  $('tour-text').textContent = stop.text;
  $('tour-prev').disabled = state.tourStep === 0;
  const last = state.tourStep === stops.length - 1;
  $('tour-next').textContent = last ? 'Haunt tonight' : 'Next';
}

function startTour() {
  stopReplay();
  showTourStep(0);
  $('tour-next').focus();
}

function endTour() {
  if (state.tourStep < 0) return;
  state.tourStep = -1;
  $('tour').hidden = true;
  svg.querySelectorAll('.zone.focus').forEach((g) => g.classList.remove('focus'));
  animateView([...FULL_VIEW]);
}

$('tour-start').addEventListener('click', startTour);
$('tour-link').addEventListener('click', (e) => { e.preventDefault(); startTour(); });
$('tour-prev').addEventListener('click', () => showTourStep(state.tourStep - 1));
$('tour-exit').addEventListener('click', endTour);
$('tour-next').addEventListener('click', () => {
  if (state.tourStep === state.catalog.tour.length - 1) {
    endTour();
    $('controls').requestSubmit();
  } else {
    showTourStep(state.tourStep + 1);
  }
});
document.addEventListener('keydown', (e) => {
  if (state.tourStep < 0 || e.target.matches('input, select')) return;
  if (e.key === 'ArrowRight') showTourStep(state.tourStep + 1);
  if (e.key === 'ArrowLeft') showTourStep(state.tourStep - 1);
  if (e.key === 'Escape') endTour();
});

init();
