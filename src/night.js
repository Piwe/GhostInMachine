// Simulates one night of sensor logs: ordinary house telemetry, the setting
// activities from concept.txt, and a random handful of extra hauntings.

import { createRng } from './rng.js';
import { setting } from './setting.js';
import { sensorInfo } from './sensors.js';
import { activities, activityById } from './activities.js';

const HOUR = 3600 * 1000;

export function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}

export function generateNight({
  seed = randomSeed(),
  date = localDate(),
  extras = 7,
  settingCount = Infinity,
  include = [],
} = {}) {
  const r = createRng(seed);
  const base = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(base)) throw new Error(`Invalid date: ${date}`);
  const at = (hours) => base + Math.round(hours * HOUR);

  const forced = include.map((id) => {
    if (!activityById[id]) throw new Error(`Unknown activity: ${id}`);
    return activityById[id];
  });
  const settingPool = activities.filter((a) => a.kind === 'setting' && !forced.includes(a));
  const extraPool = activities.filter((a) => a.kind === 'extra' && !forced.includes(a));
  const chosen = [
    ...forced,
    ...r.sample(settingPool, Math.min(settingCount, settingPool.length)),
    ...r.sample(extraPool, Math.max(0, Math.min(extras, extraPool.length))),
  ];

  const bedtime = r.float(21.8, 22.6);
  const wake = setting.sunrise + r.float(0.1, 0.5);
  const events = [];
  const push = (t, sensor, value, detail = '', activity = null) => {
    const info = sensorInfo(sensor);
    events.push({ t, sensor, zone: info.zone, value, unit: info.unit, detail, activity });
  };

  ordinaryLife(r, at, push, bedtime, wake);

  const story = chosen.map((a) => {
    const start = at(r.float(a.window[0], a.window[1]));
    const { events: raw, facts } = a.generate(r);
    const times = raw.map(([offset]) => start + offset * 1000);
    raw.forEach(([, sensor, value, detail], i) => push(times[i], sensor, value, detail, a.id));
    return { id: a.id, title: a.title, kind: a.kind, start, times, facts };
  });

  events.sort((a, b) => a.t - b.t);
  story.sort((a, b) => a.start - b.start);

  const dawn = story
    .map((s) => activityById[s.id].residue?.(s.facts))
    .filter(Boolean);

  return {
    source: 'simulated',
    seed: String(seed),
    date,
    bedtime: at(bedtime),
    wake: at(wake),
    activities: story,
    events,
    dawn: r.sample(dawn, Math.min(3, dawn.length)),
  };
}

// Everyday telemetry, so the hauntings hide inside a believable log and an
// anomaly detector has to work to find them.
function ordinaryLife(r, at, push, bedtime, wake) {
  const { sunset, sunrise } = setting;
  push(at(sunset), 'yard.weather', r.int(2, 9), 'sunset; wind light, westerly');
  push(at(sunset + 0.05), 'front_door.contact', 'open', 'going out to the coop');
  push(at(sunset + 0.1), 'coop.door', 'closed', 'scheduled close');
  push(at(sunset + 0.15), 'front_door.contact', 'closed', '');
  push(at(sunset + 0.3), 'hallway.lights', 'on', 'evening scene');

  // Cooking and dishes.
  const dinner = r.float(18.9, 19.4);
  for (let k = 0; k < r.int(3, 6); k++) push(at(dinner + k * 0.12), 'kitchen.motion', 'active', '');
  push(at(dinner + 0.1), 'kitchen.fridge', 'open', '');
  push(at(dinner + 0.11), 'kitchen.fridge', 'closed', '');
  push(at(dinner + 0.75), 'kitchen.tap', +r.float(5, 7).toFixed(1), 'flow started');
  push(at(dinner + 0.8), 'kitchen.tap', 0, `flow stopped total=${r.float(8, 20).toFixed(1)}L`);

  // An evening in front of the television.
  const tvOn = r.float(19.7, 20.2);
  push(at(tvOn), 'living.tv', 'on', 'input=streaming');
  push(at(tvOn + 0.02), 'living.speaker', 'transcript', '"Turn the volume down." intent=volume');
  push(at(bedtime - r.float(0.4, 0.6)), 'living.tv', 'off', 'power button');
  for (let k = 0; k < r.int(2, 5); k++) push(at(r.float(sunset + 0.5, bedtime)), 'hallway.motion', 'active', '');

  // Shower before bed.
  const shower = bedtime - r.float(0.3, 0.45);
  push(at(shower), 'bathroom.light', 'on', 'motion');
  push(at(shower + 0.05), 'bathroom.humidity', r.int(80, 90), 'shower running');
  push(at(shower + 0.25), 'bathroom.light', 'off', '');
  push(at(shower + 0.6), 'bathroom.humidity', r.int(55, 62), 'falling');

  push(at(bedtime - 0.02), 'bedroom.motion', 'active', '');
  push(at(bedtime), 'bed.occupancy', 2, 'both residents in bed');
  push(at(bedtime + 0.01), 'bedroom.door', 'closed', '');
  push(at(bedtime + 0.05), 'hallway.lights', 'off', 'bedtime scene');
  push(at(bedtime + 0.4), 'bed.tracker_you', r.int(54, 60), 'asleep');
  push(at(bedtime + 0.5), 'bed.tracker_wife', r.int(58, 64), 'asleep');

  // Steady readings through the night.
  for (let h = Math.ceil(sunset); h < wake; h += 1) {
    push(at(h), 'bedroom.temp', +r.float(18.8, 19.8).toFixed(1), 'hourly');
    if (h % 2 === 0) {
      push(at(h + 0.02), 'yard.weather', r.int(0, 8), 'hourly');
      push(at(h + 0.03), 'basement.co2', r.int(430, 520), 'hourly');
      push(at(h + 0.04), 'attic.temp', +r.float(11, 14.5).toFixed(1), 'hourly');
    }
  }

  // Wildlife on the outdoor microphones.
  const wild = [
    ['yard.mic_tracks', 'class=owl'], ['yard.mic_church', 'class=wind'], ['yard.mic_post', 'class=jackal'],
    ['garden.chimes', 'class=wind_chimes (wind 11km/h)'], ['coop.mic', 'class=hen_murmur'], ['yard.camera_forest', 'motion: small animal'],
  ];
  for (let k = 0; k < r.int(3, 6); k++) {
    const [sensor, detail] = r.pick(wild);
    push(at(r.float(sunset + 1, wake - 0.5)), sensor, sensor.includes('camera') ? 'motion' : r.int(30, 48), detail);
  }

  // One of you gets up in the night.
  if (r.chance(0.65)) {
    const trip = r.float(1, 4.5) + 24;
    push(at(trip), 'bed.occupancy', 1, '');
    push(at(trip + 0.005), 'bedroom.door', 'open', '');
    push(at(trip + 0.008), 'hallway.motion', 'active', '');
    push(at(trip + 0.01), 'bathroom.light', 'on', 'night mode 10%');
    push(at(trip + 0.06), 'bathroom.light', 'off', '');
    push(at(trip + 0.065), 'bedroom.door', 'closed', '');
    push(at(trip + 0.07), 'bed.occupancy', 2, '');
  }
  if (r.chance(0.5)) push(at(r.float(0, 5) + 24), 'router.devices', 'joined', "hostname=wife-phone (reconnected)");

  // Morning.
  push(at(sunrise - 0.2), 'coop.mic', r.int(50, 62), 'class=rooster');
  push(at(wake), 'bed.occupancy', 0, 'residents up');
  push(at(wake + 0.02), 'hallway.lights', 'on', 'morning scene');
  push(at(wake + 0.05), 'coop.door', 'open', 'scheduled open');
  push(at(wake + 0.1), 'kitchen.motion', 'active', '');
  push(at(wake + 0.12), 'kitchen.tap', +r.float(4, 6).toFixed(1), 'kettle');
}

function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
