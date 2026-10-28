// Streams a story from a locally running open-weight model.
//   provider "ollama":  Ollama's native /api/chat (default http://localhost:11434)
//   provider "openai":  any OpenAI-compatible server: llama.cpp's llama-server,
//                       vLLM, LM Studio, LocalAI (default http://localhost:8080)

export const defaults = {
  provider: process.env.GHOST_PROVIDER || 'ollama',
  model: process.env.GHOST_MODEL || 'gemma4:e4b',
  baseUrl: process.env.GHOST_BASE_URL || '',
};

// For a hosted endpoint (a GPU droplet, a tunnel to your own Ollama) that wants a key.
const authHeaders = () => (process.env.GHOST_API_KEY ? { Authorization: `Bearer ${process.env.GHOST_API_KEY}` } : {});

function resolve(opts = {}) {
  const provider = opts.provider || defaults.provider;
  const baseUrl = (opts.baseUrl || defaults.baseUrl ||
    (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8080')).replace(/\/$/, '');
  return { provider, baseUrl, model: opts.model || defaults.model };
}

export async function listModels(opts) {
  const { provider, baseUrl } = resolve(opts);
  const url = provider === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/v1/models`;
  const res = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const body = await res.json();
  return provider === 'ollama' ? body.models.map((m) => m.name) : body.data.map((m) => m.id);
}

export async function* streamStory(messages, opts = {}) {
  const { provider, baseUrl, model } = resolve(opts);
  const temperature = opts.temperature ?? 0.9;
  const seed = opts.seed != null ? numericSeed(opts.seed) : undefined;

  const [url, body] = provider === 'ollama'
    ? [`${baseUrl}/api/chat`, { model, messages, stream: true, options: { temperature, seed } }]
    : [`${baseUrl}/v1/chat/completions`, { model, messages, stream: true, temperature, seed }];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`${model} via ${provider} failed: ${res.status} ${await res.text()}`);

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const text = provider === 'ollama' ? parseOllama(line) : parseOpenAi(line);
      if (text) yield text;
    }
  }
}

function parseOllama(line) {
  if (!line.trim()) return '';
  const msg = JSON.parse(line);
  if (msg.error) throw new Error(msg.error);
  return msg.message?.content ?? '';
}

function parseOpenAi(line) {
  const data = line.replace(/^data:\s*/, '').trim();
  if (!data || data === '[DONE]' || !line.startsWith('data:')) return '';
  return JSON.parse(data).choices?.[0]?.delta?.content ?? '';
}

function numericSeed(seed) {
  let h = 0;
  for (const c of String(seed)) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
