// Turns a night of sensor logs into a chat prompt for a local open-weight model.

import { describeSetting } from '../setting.js';
import { formatLine, clock } from '../logs.js';

export const tones = {
  literary: 'Quiet, literary horror in the tradition of M. R. James and Shirley Jackson. Restrained, precise, cumulative dread. No gore.',
  campfire: 'A ghost story told aloud around a campfire: conversational, rhythmic, with a jump-scare ending.',
  report: 'An incident report written by a home-automation technician who slowly realises what the data means. Clinical at first, unravelling by the end.',
  creepypasta: 'A first-person internet creepypasta post, as if the homeowner is posting the logs online looking for answers. Ends with an unsettling edit/update.',
};

const MAX_LINES = 260;

export function buildMessages(night, { tone = 'literary' } = {}) {
  const style = tones[tone] ?? tones.literary;
  const system = [
    'You are the Ghost in the Machine: a narrator who reads smart-home sensor logs and tells the residents what happened in their house while they were asleep.',
    `Style: ${style}`,
    'Rules:',
    '- Write in the second person ("you", "your wife"), past tense, unless the style says otherwise.',
    '- Every eerie beat must be anchored to a real line in the log: mention its time (HH:MM) and the sensor that noticed it. Do not invent sensor readings that are not in the log.',
    '- You may interpret what the readings mean, and connect them to the history of the place. The horror comes from the gap between dry data and what it implies.',
    '- Ordinary readings (hourly temperatures, scheduled automations) are there for texture; use them sparingly to show how normal the night should have been.',
    '- Lines tagged [anomaly 0.97] were flagged by an anomaly detector as unlike ordinary life in this house (1.0 = certainly strange). Build the story around the highest-scored lines. Untagged lines are probably routine, but the detector can miss things, so use your judgement.',
    '- If morning discoveries are listed, end with them.',
    '- Start with a title on its own line formatted as "# Title". Aim for 600 to 900 words. Plain prose, no bullet points, no log dumps.',
  ].join('\n');

  const parts = [`## The house\n${describeSetting()}`];
  if (night.bedtime) {
    parts.push(`## The night of ${night.date}\nYou went to bed at ${clock(night.bedtime)} and got up at ${clock(night.wake)}.`);
  }
  parts.push(`## Sensor log (house-local time)\n${selectLines(night).join('\n')}`);
  if (night.dawn.length) {
    parts.push(`## What you found in the morning\n${night.dawn.map((d) => `- ${d}`).join('\n')}`);
  }
  parts.push('Tell us what happened while we were asleep.');

  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.join('\n\n') },
  ];
}

// Real exports can hold thousands of rows; keep the model's context focused by
// dropping repeated readings, keeping every flagged anomaly, and thinning the rest.
const FLAG = 0.5;

function selectLines({ events, scores }) {
  const last = new Map();
  const rows = events
    .map((ev, i) => ({ ev, score: scores?.[i] }))
    .filter(({ ev }) => {
      const key = `${ev.value}|${ev.detail}`;
      const repeat = last.get(ev.sensor) === key;
      last.set(ev.sensor, key);
      return !repeat;
    });
  const flagged = rows.filter((r) => r.score >= FLAG);
  const routine = rows.filter((r) => !(r.score >= FLAG));
  const room = Math.max(0, MAX_LINES - flagged.length);
  const step = Math.max(1, routine.length / (room || 1));
  const thinned = room ? routine.filter((_, i) => Math.floor(i % step) === 0).slice(0, room) : [];
  return [...flagged.slice(0, MAX_LINES), ...thinned]
    .sort((a, b) => a.ev.t - b.ev.t)
    .map(({ ev, score }) => (score >= FLAG ? `${formatLine(ev)}  [anomaly ${score.toFixed(2)}]` : formatLine(ev)));
}
