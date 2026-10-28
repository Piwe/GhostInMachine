import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNight } from '../src/night.js';
import { activities } from '../src/activities.js';
import { sensors } from '../src/sensors.js';
import { parseImportedLog } from '../src/logs.js';
import { buildMessages } from '../src/narrator/prompt.js';
import { tellStory } from '../src/narrator/offline.js';
import { tour } from '../src/setting.js';
import { readFileSync } from 'node:fs';

const everything = activities.map((a) => a.id);

test('the same seed haunts the same way', () => {
  const a = generateNight({ seed: 'samhain', date: '2026-10-31' });
  const b = generateNight({ seed: 'samhain', date: '2026-10-31' });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.events, generateNight({ seed: 'other', date: '2026-10-31' }).events);
});

test('every setting activity happens every night by default', () => {
  const night = generateNight({ seed: 1, date: '2026-10-31', extras: 0 });
  const ids = night.activities.map((a) => a.id).sort();
  assert.deepEqual(ids, activities.filter((a) => a.kind === 'setting').map((a) => a.id).sort());
});

test('every activity only uses real sensors and tells a story', () => {
  for (let seed = 0; seed < 20; seed++) {
    const night = generateNight({ seed, date: '2026-10-31', include: everything });
    for (const ev of night.events) assert.ok(sensors[ev.sensor], `unknown sensor ${ev.sensor}`);
    assert.equal(night.activities.length, activities.length);
    const story = tellStory(night);
    assert.match(story, /^# /);
    assert.doesNotMatch(story, /undefined|NaN/);
  }
});

test('events are in time order and inside the night', () => {
  const night = generateNight({ seed: 'order', date: '2026-10-31', extras: 15 });
  for (let i = 1; i < night.events.length; i++) assert.ok(night.events[i].t >= night.events[i - 1].t);
  assert.ok(night.events[0].t >= Date.parse('2026-10-31T18:00:00Z'));
  assert.ok(night.events.at(-1).t <= Date.parse('2026-11-01T07:00:00Z'));
});

test('imports a Home Assistant history export', () => {
  const night = parseImportedLog(readFileSync(new URL('../examples/home-assistant-history.json', import.meta.url), 'utf8'));
  assert.equal(night.source, 'imported');
  assert.ok(night.events.length > 10);
  assert.match(tellStory(night), /What Your House Saw/);
});

test('imports CSV and JSONL', () => {
  const csv = 'entity_id,state,last_changed\nbinary_sensor.basement_motion,on,2026-10-31T02:13:00Z\n';
  assert.equal(parseImportedLog(csv).events[0].zone, 'basement');
  const jsonl = '{"time":"2026-10-31 03:17:00","sensor":"attic.mic","value":101}\n';
  assert.equal(parseImportedLog(jsonl).events[0].value, 101);
});

test('the prompt carries the setting, the log and the morning', () => {
  const night = generateNight({ seed: 'prompt', date: '2026-10-31' });
  const [system, user] = buildMessages(night, { tone: 'report' });
  assert.match(system.content, /incident report/);
  assert.match(user.content, /Blackreef/);
  assert.match(user.content, /yard\.mic_church/);
  if (night.dawn.length) assert.match(user.content, /What you found in the morning/);
});

test('tour stops point at zones that exist in the house diagram', () => {
  const svg = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const stop of tour) {
    for (const zone of stop.zones) assert.match(svg, new RegExp(`data-zone="${zone}"`));
    assert.equal(stop.view.length, 4);
  }
});

import { featurize, FEATURES, labels } from '../src/anomaly/features.js';
import { scoreNight, trainingSet } from '../src/anomaly/index.js';
import { trainLogistic } from '../src/anomaly/logistic.js';
import { speakable } from '../src/voice.js';
import { sensorInfo } from '../src/sensors.js';

test('features: one row per event, one column per feature, no NaN', () => {
  const night = generateNight({ seed: 'features', date: '2026-10-31' });
  const rows = featurize(night);
  assert.equal(rows.length, night.events.length);
  for (const row of rows) {
    assert.equal(row.length, FEATURES.length);
    assert.ok(row.every(Number.isFinite));
  }
});

test('training set holds both ordinary and haunted readings', () => {
  const { y } = trainingSet();
  const share = y.filter(Boolean).length / y.length;
  assert.ok(share > 0.2 && share < 0.6, `haunted share ${share}`);
});

test('the logistic baseline finds hauntings in unseen nights', () => {
  const { X, y } = trainingSet();
  const predict = trainLogistic(X, y);
  const night = generateNight({ seed: 'unseen', date: '2026-10-31' });
  const scores = predict(featurize(night));
  const truth = labels(night);
  const hits = scores.filter((s, i) => (s >= 0.5) === !!truth[i]).length;
  assert.ok(hits / scores.length > 0.8, `accuracy ${hits / scores.length}`);
});

test('scored lines are tagged in the prompt', async () => {
  const night = generateNight({ seed: 'tagged', date: '2026-10-31' });
  night.scores = (await scoreNight(night, { scorer: 'logistic' })).scores;
  const [, user] = buildMessages(night);
  assert.match(user.content, /\[anomaly 0\.\d\d\]/);
});

test('times are spoken as words', () => {
  assert.equal(speakable('# Bells\n\nAt 02:19, 00:05 and 03:00.'), "Bells.\n\nAt two nineteen, twelve oh five and three o'clock.");
});

test('imported entity names find their rooms', () => {
  assert.equal(sensorInfo('binary_sensor.front_door_vibration').zone, 'porch');
  assert.equal(sensorInfo('binary_sensor.bed_occupancy').zone, 'bedroom');
  assert.equal(sensorInfo('media_player.living_room_tv').zone, 'living');
});
