import { buildMessages } from './prompt.js';
import { streamStory, listModels, defaults } from './llm.js';
import { tellStory, streamText } from './offline.js';

// Yields { narrator } once, then text chunks. Falls back to the offline
// narrator if the model server is unreachable, unless offline was requested.
export async function* narrate(night, opts = {}) {
  if (!opts.offline) {
    try {
      const models = await listModels(opts);
      const model = opts.model || defaults.model;
      const provider = opts.provider || defaults.provider;
      if (provider === 'ollama' && !models.some((m) => m === model || m === `${model}:latest`)) {
        throw new Error(`model "${model}" is not pulled. Run: ollama pull ${model}`);
      }
      yield { narrator: `${model} (${provider}, local)` };
      yield* streamStory(buildMessages(night, opts), { ...opts, seed: night.seed ?? undefined });
      return;
    } catch (err) {
      if (opts.strict) throw err;
      yield { narrator: 'offline templates', warning: `Model unavailable: ${err.message}` };
    }
  } else {
    yield { narrator: 'offline templates' };
  }
  yield* streamText(tellStory(night), opts.delayMs);
}

export { buildMessages, tellStory, listModels, defaults };
