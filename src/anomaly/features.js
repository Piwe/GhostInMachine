// Turns each log event into a row of numbers a tabular model can learn from.
// Only generic signals are used (time, occupancy, rarity, bursts, deviation),
// so a model trained on simulated nights still makes sense of a real export.

import { zones } from '../sensors.js';

export const FEATURES = [
  'hour', 'in_bed', 'zone', 'kind', 'outside', 'numeric', 'deviation',
  'gap', 'state_change', 'burst', 'burst_zones', 'rarity', 'while_asleep',
];
// Columns TabPFN should treat as categories rather than quantities.
export const CATEGORICAL = ['zone', 'kind'].map((f) => FEATURES.indexOf(f));

const ZONE_IDS = Object.keys(zones);
const OUTSIDE = new Set(['porch', 'backdoor', 'garden', 'coop', 'church', 'tracks', 'post', 'minetown']);
const KINDS = [
  ['bed', /bed\.|occupancy|tracker/],
  ['motion', /motion|presence|occupancy/],
  ['contact', /door|contact|gate|window|cabinet/],
  ['sound', /mic|sound|monitor|chime/],
  ['climate', /temp|humid|weather|thermo/],
  ['vibration', /vibration|wall|geophone|knock/],
  ['light', /light|lamp|bulb/],
  ['media', /tv|speaker|media/],
  ['air', /co2|air|smoke|pm/],
  ['camera', /camera/],
  ['network', /router|wifi|ntp/],
  ['flow', /tap|flow|water|scale|eggs|soil/],
];

// Kinds that report on their own schedule, so a reading at 3 a.m. means nothing by itself.
const PASSIVE = new Set(['bed', 'climate', 'air', 'network'].map((k) => KINDS.findIndex(([name]) => name === k)));

function kindOf(sensor) {
  const i = KINDS.findIndex(([, re]) => re.test(sensor.toLowerCase()));
  return i < 0 ? KINDS.length : i;
}

const BED_STATES = { on: 2, off: 0, true: 2, false: 0, occupied: 2, clear: 0 };

export function featurize(night) {
  const { events } = night;
  const perSensor = new Map();
  for (const ev of events) {
    if (!perSensor.has(ev.sensor)) perSensor.set(ev.sensor, []);
    perSensor.get(ev.sensor).push(ev);
  }
  const hasBedSensor = events.some((ev) => /bed.*occupancy|occupancy.*bed/.test(ev.sensor));
  const stats = new Map();
  for (const [sensor, list] of perSensor) {
    const nums = list.map((e) => e.value).filter((v) => typeof v === 'number').sort((a, b) => a - b);
    const median = nums[Math.floor(nums.length / 2)] ?? 0;
    const mad = nums.map((v) => Math.abs(v - median)).sort((a, b) => a - b)[Math.floor(nums.length / 2)] ?? 0;
    stats.set(sensor, { median, spread: mad || Math.abs(median) * 0.1 || 1, share: list.length / events.length });
  }

  let occupancy = 0;
  const last = new Map();
  let lo = 0;
  let hi = 0;
  return events.map((ev) => {
    if (/bed.*occupancy|occupancy.*bed/.test(ev.sensor)) {
      occupancy = typeof ev.value === 'number' ? ev.value : (BED_STATES[String(ev.value).toLowerCase()] ?? occupancy);
    }
    const date = new Date(ev.t);
    const clockHours = date.getUTCHours() + date.getUTCMinutes() / 60;
    const hour = (clockHours - 18 + 24) % 24; // hours since 18:00
    const inBed = hasBedSensor ? occupancy : (hour > 4.5 && hour < 11.5 ? 2 : 0);

    const kind = kindOf(ev.sensor);
    const s = stats.get(ev.sensor);
    const numeric = typeof ev.value === 'number';
    const deviation = numeric ? Math.min(10, Math.abs(ev.value - s.median) / s.spread) : 0;

    const prev = last.get(ev.sensor);
    last.set(ev.sensor, ev);
    const gap = prev ? Math.log1p((ev.t - prev.t) / 60000) : 8;
    const stateChange = prev && prev.value === ev.value ? 0 : 1;

    // Events within a minute either side, via a sliding window.
    while (events[lo].t < ev.t - 60000) lo++;
    while (hi + 1 < events.length && events[hi + 1].t <= ev.t + 60000) hi++;
    const window = events.slice(lo, hi + 1);

    return [
      +hour.toFixed(3),
      inBed,
      Math.max(0, ZONE_IDS.indexOf(ev.zone)),
      kind,
      OUTSIDE.has(ev.zone) ? 1 : 0,
      numeric ? 1 : 0,
      +deviation.toFixed(3),
      +gap.toFixed(3),
      stateChange,
      Math.log1p(window.length - 1),
      new Set(window.map((e) => e.zone)).size,
      +(-Math.log(s.share)).toFixed(3),
      // Something acted while everybody was in bed.
      inBed >= 2 && !PASSIVE.has(kind) ? 1 : 0,
    ];
  });
}

export const labels = (night) => night.events.map((ev) => (ev.activity ? 1 : 0));
