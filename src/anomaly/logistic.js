// A plain logistic regression, trained in JS. It's the fallback when TabPFN
// isn't installed, and the baseline TabPFN is measured against.

export function trainLogistic(X, y, { epochs = 300, rate = 0.3, l2 = 1e-3 } = {}) {
  const d = X[0].length;
  const mean = Array(d).fill(0);
  const std = Array(d).fill(0);
  for (const row of X) row.forEach((v, j) => (mean[j] += v / X.length));
  for (const row of X) row.forEach((v, j) => (std[j] += (v - mean[j]) ** 2 / X.length));
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;
  const norm = (row) => row.map((v, j) => (v - mean[j]) / std[j]);
  const Xn = X.map(norm);

  // Weight the rarer class up so hauntings aren't drowned out by routine.
  const pos = y.filter(Boolean).length || 1;
  const wPos = X.length / (2 * pos);
  const wNeg = X.length / (2 * (X.length - pos || 1));

  const w = Array(d).fill(0);
  let b = 0;
  for (let e = 0; e < epochs; e++) {
    const gw = Array(d).fill(0);
    let gb = 0;
    Xn.forEach((row, i) => {
      const p = sigmoid(dot(w, row) + b);
      const err = (p - y[i]) * (y[i] ? wPos : wNeg);
      row.forEach((v, j) => (gw[j] += err * v));
      gb += err;
    });
    for (let j = 0; j < d; j++) w[j] -= rate * (gw[j] / X.length + l2 * w[j]);
    b -= rate * (gb / X.length);
  }
  return (rows) => rows.map((row) => sigmoid(dot(w, norm(row)) + b));
}

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
