// Scores every event in a night: how likely is it that this reading is not
// ordinary life? TabPFN (open-weight tabular foundation model) when available,
// otherwise a logistic-regression baseline. Both learn from simulated nights.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateNight } from '../night.js';
import { featurize, labels, CATEGORICAL } from './features.js';
import { trainLogistic } from './logistic.js';
import { createRng } from '../rng.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = fileURLToPath(new URL('./tabpfn_score.py', import.meta.url));
const VENV_PYTHON = `${ROOT}.venv/bin/python`;
export const PYTHON = process.env.GHOST_PYTHON || (existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3');

// Labelled training data from simulated nights, built once per process.
let training;
export function trainingSet({ nights = 40, maxRows = 1500 } = {}) {
  if (training) return training;
  const X = [];
  const y = [];
  for (let i = 0; i < nights; i++) {
    const night = generateNight({ seed: `train-${i}`, date: '2026-10-01', extras: 4 + (i % 9) });
    X.push(...featurize(night));
    y.push(...labels(night));
  }
  // TabPFN works best on a few thousand rows: sample both classes, with
  // hauntings capped at 40% so routine still dominates as it does in real life.
  const r = createRng('training');
  const pos = y.filter(Boolean).length;
  const posRate = Math.min(1, (maxRows * 0.4) / pos);
  const negRate = Math.min(1, (maxRows - Math.min(pos, maxRows * 0.4)) / (y.length - pos));
  const keep = [];
  y.forEach((label, i) => r.chance(label ? posRate : negRate) && keep.push(i));
  training = { X: keep.map((i) => X[i]), y: keep.map((i) => y[i]) };
  return training;
}

let tabpfnDownUntil = 0;
let tabpfnError = '';

export function runTabPFN(X_train, y_train, X_test) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill(), Number(process.env.TABPFN_TIMEOUT_MS) || 180000);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(err.trim().split('\n').at(-1) || `TabPFN exited with ${code}`));
      try {
        resolve(JSON.parse(out).proba);
      } catch {
        reject(new Error('TabPFN returned no scores'));
      }
    });
    child.stdin.end(JSON.stringify({ X_train, y_train, X_test, categorical: CATEGORICAL }));
  });
}

// scorer: 'auto' (TabPFN, falling back to logistic), 'tabpfn', 'logistic' or 'none'
export async function scoreNight(night, { scorer = process.env.GHOST_SCORER || 'auto' } = {}) {
  if (scorer === 'none' || !night.events.length) return { scorer: 'none', scores: null };
  const { X, y } = trainingSet();
  const rows = featurize(night);

  if (scorer === 'tabpfn' || (scorer === 'auto' && Date.now() > tabpfnDownUntil)) {
    try {
      const scores = await runTabPFN(X, y, rows);
      return { scorer: 'tabpfn', scores };
    } catch (err) {
      if (scorer === 'tabpfn') throw err;
      // Don't retry a missing install on every request.
      tabpfnDownUntil = Date.now() + 10 * 60 * 1000;
      tabpfnError = err.message;
    }
  }
  const scores = trainLogistic(X, y)(rows).map((p) => +p.toFixed(4));
  return { scorer: 'logistic', scores, note: tabpfnError ? `TabPFN unavailable (${tabpfnError.slice(0, 90)}…); using the logistic baseline. See README: Anomaly detection.` : undefined };
}

// For simulated nights we know the truth, so we can say how well it did.
export function summarise(night, scores, threshold = 0.5) {
  const truth = labels(night);
  let tp = 0;
  let fp = 0;
  scores.forEach((s, i) => {
    if (s >= threshold) truth[i] ? tp++ : fp++;
  });
  return { flagged: tp + fp, caught: tp, haunted: truth.filter(Boolean).length, falseAlarms: fp };
}
