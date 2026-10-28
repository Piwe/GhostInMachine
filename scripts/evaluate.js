// How well does each scorer find the hauntings in nights it has never seen?
//   node scripts/evaluate.js [nights]

import { generateNight } from '../src/night.js';
import { featurize, labels } from '../src/anomaly/features.js';
import { trainingSet, runTabPFN } from '../src/anomaly/index.js';
import { trainLogistic } from '../src/anomaly/logistic.js';

const n = Number(process.argv[2]) || 15;
const nights = Array.from({ length: n }, (_, i) => generateNight({ seed: `holdout-${i}`, date: '2026-10-31', extras: 7 }));
const X = nights.flatMap(featurize);
const y = nights.flatMap(labels);
const train = trainingSet();
console.log(`train: ${train.X.length} events from 40 nights · test: ${X.length} events from ${n} unseen nights (${y.filter(Boolean).length} haunted)\n`);

const report = (name, scores, ms) => {
  const tp = scores.filter((s, i) => s >= 0.5 && y[i]).length;
  const fp = scores.filter((s, i) => s >= 0.5 && !y[i]).length;
  const pos = y.filter(Boolean).length;
  const precision = tp / (tp + fp || 1);
  const recall = tp / pos;
  console.log(`${name.padEnd(9)} ROC AUC ${auc(scores, y).toFixed(3)} · precision ${precision.toFixed(3)} · recall ${recall.toFixed(3)} · F1 ${(2 * precision * recall / (precision + recall || 1)).toFixed(3)} · ${ms} ms`);
};

let t = Date.now();
report('logistic', trainLogistic(train.X, train.y)(X), Date.now() - t);
t = Date.now();
try {
  report('TabPFN', await runTabPFN(train.X, train.y, X), Date.now() - t);
} catch (err) {
  console.log(`TabPFN    unavailable: ${err.message}`);
}

function auc(scores, labels) {
  const order = scores.map((s, i) => [s, labels[i]]).sort((a, b) => a[0] - b[0]);
  let rankSum = 0;
  order.forEach(([, l], i) => l && (rankSum += i + 1));
  const pos = labels.filter(Boolean).length;
  const neg = labels.length - pos;
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}
