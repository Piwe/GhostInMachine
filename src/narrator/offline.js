// A template narrator for when no model is running. It is deterministic and
// far less imaginative than the model, but it means the story never fails.

import { createRng } from '../rng.js';
import { activityById } from '../activities.js';
import { sensorInfo } from '../sensors.js';
import { clock, formatValue } from '../logs.js';

const titles = {
  church_bells: (f) => (f.strikes === 13 ? 'Thirteen Bells' : `The Bells of St. Barbara's`),
  mining_below: () => 'The Night Shift',
  steam_train: () => 'The Last Ore Train',
  attic_war: () => 'Hold the Line',
  speaker_rollcall: () => 'Shift Three, All Present',
  morse_lights: (f) => `The Hallway Says ${f.word}`,
  third_heartbeat: () => 'Three in the Bed',
  lantern_procession: () => 'Lanterns to Blackreef',
  ntp_past: (f) => `3:17 a.m., ${f.year}`,
  canary: () => 'The Canary Stopped Singing',
};

const openings = [
  (b) => `You went to bed at ${b}. The forest was quiet, the hens were shut in, and the house settled around you the way it always does. You stopped listening to it years ago. The house never stopped listening.`,
  (b) => `The bed pad registered you both at ${b}. Two warm bodies, heart rates easing down into sleep. That is the last ordinary thing the sensors would record for a while.`,
  (b) => `At ${b} you turned out the hallway lights and went to bed, and the house took the night shift. These are its notes.`,
];

const settingNotes = [
  'You have learned to sleep through the bells and the knocking, the digging and the trains. The sensors have not.',
  'You have lived here long enough to call some of this normal. The sensors are newer. They do not know what is normal here.',
];

const closings = [
  (w) => `At ${w} the bed pad felt you both get up. The coop door opened on schedule. The log returns to hourly temperatures, as if none of it happened.`,
  (w) => `By ${w} the sun was up over Blackreef and you were both awake, remembering nothing worse than a restless night.`,
];

const kickers = [
  'Tonight the sensors will be listening again.',
  'Somewhere under the forest, a shift is changing.',
  'You check the log again. A new line has appeared, timestamped tonight.',
];

export function tellStory(night) {
  return night.source === 'imported' ? tellImported(night) : tellSimulated(night);
}

function tellSimulated(night) {
  const r = createRng(`${night.seed}:story`);
  const featured = night.activities.find((a) => titles[a.id] && a.kind === 'extra') ||
    night.activities.find((a) => titles[a.id]);
  const title = featured ? titles[featured.id](featured.facts) : 'While You Were Asleep';

  const tell = (a) => activityById[a.id].tell({ r, facts: a.facts, at: (i) => clock(a.times[i]) });
  const evening = night.activities.filter((a) => a.start < night.bedtime);
  const asleep = night.activities.filter((a) => a.start >= night.bedtime);

  const paras = [];
  if (evening.length) {
    paras.push(`The sun went down behind Blackreef and the house began, as it does every night, to fill up with sounds that have no business being there.`);
    paras.push(...evening.map(tell));
  }
  paras.push(r.pick(openings)(clock(night.bedtime)));
  if (night.activities.some((a) => a.kind === 'setting')) paras.push(r.pick(settingNotes));
  paras.push(...asleep.map(tell));
  paras.push(r.pick(closings)(clock(night.wake)));
  if (night.dawn.length) {
    paras.push(`And then there are the things you find in the morning. ${night.dawn.join(' ')}`);
  }
  paras.push(r.pick(kickers));
  return `# ${title}\n\n${paras.join('\n\n')}\n`;
}

function tellImported(night) {
  const r = createRng(`${night.events.length}:${night.events[0].t}`);
  // Pick a handful of moments from different sensors: the most anomalous if the
  // night was scored, otherwise whatever happened in the small hours.
  const seen = new Set();
  const rank = night.scores ? (ev, i) => night.scores[i] : (ev) => smallHours(ev);
  const moments = night.events
    .map((ev, i) => ({ ...ev, rank: rank(ev, i) }))
    .sort((a, b) => b.rank - a.rank)
    .filter((ev, i) => !night.scores || ev.rank >= 0.5 || i < 3)
    .filter((ev) => !seen.has(ev.sensor) && seen.add(ev.sensor))
    .slice(0, 10)
    .sort((a, b) => a.t - b.t);

  const beats = [
    (when, what, value) => `At ${when} the ${what} changed to ${value}.`,
    (when, what, value) => `${when}: the ${what} reads ${value}. Nobody was up.`,
    (when, what, value) => `The ${what} woke at ${when} and reported ${value}, to no one.`,
    (when, what, value) => `At ${when}, ${value} from the ${what}. You were both asleep.`,
  ];
  const paras = [
    `Your house kept a diary while you slept: ${night.events.length} entries between ${clock(night.events[0].t)} and ${clock(night.events.at(-1).t)}. Most of it is dull. Read it closely and it isn't.`,
    ...moments.map((ev) => {
      const what = (ev.detail || sensorInfo(ev.sensor).label).toLowerCase();
      return r.pick(beats)(clock(ev.t), what, `"${formatValue(ev)}"`);
    }),
    'That is all the template narrator can tell you. Run a local model (see README) and the Ghost in the Machine will tell you what it means.',
  ];
  return `# What Your House Saw\n\n${paras.join('\n\n')}\n`;
}

function smallHours(ev) {
  const h = new Date(ev.t).getUTCHours();
  return h >= 0 && h < 5 ? 1 : 0;
}

// Stream the text in small pieces so the UI behaves the same as with a model.
export async function* streamText(text, delayMs = 12) {
  for (const piece of text.match(/\S+\s*/g) ?? []) {
    yield piece;
    if (delayMs) await new Promise((res) => setTimeout(res, delayMs));
  }
}
