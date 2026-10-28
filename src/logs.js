// Turning events into log lines, and real smart-home exports back into events.

import { sensorInfo } from './sensors.js';

// Times are house-local and stored as if they were UTC, so no timezone drifts in.
export const clock = (t) => new Date(t).toISOString().slice(11, 16);
export const stamp = (t) => new Date(t).toISOString().slice(0, 19).replace('T', ' ');

const WORD_UNITS = new Set(['persons', 'eggs']);

export function formatValue(ev) {
  if (!ev.unit || typeof ev.value !== 'number') return String(ev.value);
  return WORD_UNITS.has(ev.unit) ? `${ev.value} ${ev.unit}` : `${ev.value}${ev.unit}`;
}

export function formatLine(ev) {
  return `${stamp(ev.t)}  ${ev.sensor.padEnd(22)} ${formatValue(ev).padEnd(10)} ${ev.detail}`.trimEnd();
}

export function formatLog(night) {
  return night.events.map(formatLine).join('\n');
}

export function toJsonl(night) {
  return night.events
    .map((ev) => JSON.stringify({ time: stamp(ev.t), sensor: ev.sensor, value: ev.value, detail: ev.detail }))
    .join('\n');
}

// Accepts:
//   - Home Assistant /api/history output: [[{entity_id, state, last_changed, attributes}], ...]
//   - a JSON array or JSONL of {time|timestamp|last_changed, sensor|entity_id, value|state, detail?}
//   - CSV with a header row containing entity_id/sensor, state/value, last_changed/time
export function parseImportedLog(text) {
  const trimmed = text.trim();
  let rows;
  if (trimmed.startsWith('[')) {
    rows = JSON.parse(trimmed).flat();
  } else if (trimmed.startsWith('{')) {
    rows = trimmed.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  } else {
    rows = parseCsv(trimmed);
  }

  const events = rows
    .map((row) => {
      const sensor = row.sensor ?? row.entity_id;
      const time = row.time ?? row.timestamp ?? row.last_changed ?? row.last_updated;
      if (!sensor || !time) return null;
      const t = toHouseTime(time);
      if (Number.isNaN(t)) return null;
      const value = row.value ?? row.state ?? '';
      const info = sensorInfo(sensor);
      const unit = row.attributes?.unit_of_measurement ?? info.unit;
      const detail = row.detail ?? row.attributes?.friendly_name ?? '';
      const num = Number(value);
      return {
        t, sensor, zone: info.zone, unit, detail, activity: null,
        value: value !== '' && !Number.isNaN(num) ? num : value,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);

  if (!events.length) throw new Error('No usable events found in that log.');
  return {
    source: 'imported',
    seed: null,
    date: stamp(events[0].t).slice(0, 10),
    bedtime: null,
    wake: null,
    activities: [],
    events,
    dawn: [],
  };
}

// Drop any timezone suffix so the story reads in the house's wall-clock time.
function toHouseTime(value) {
  const s = String(value).trim().replace(' ', 'T').replace(/(Z|[+-]\d\d:?\d\d)$/, '');
  return Date.parse(`${s}Z`);
}

function parseCsv(text) {
  const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const cols = header.split(',').map((c) => c.trim());
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]));
  });
}
