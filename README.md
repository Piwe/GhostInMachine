# 👻 Ghost in the Machine

**A ghost story generator that weaves your smart home's sensor logs into a creepy tale of what happened while you were asleep.**

Built for the [DEV Hacktoberfest Open-Source AI Challenge: Ghost in the Machine](https://dev.to/devteam/join-the-hacktoberfest-open-source-ai-challenge-ghost-in-the-machine-2850-in-prizes-across-21-3cho).

**Try it live: [ghost-in-the-machine-bwff.onrender.com](https://ghost-in-the-machine-bwff.onrender.com)**. It's on Render's free tier, so the first visit can take up to a minute to wake. The hosted site has no GPU, so it uses the fallbacks below (template narrator, JS anomaly baseline, browser voice). Run it locally for Gemma, TabPFN and Piper.

The house sits in the middle of a forest, behind the abandoned gold-mining town of Blackreef, opposite an old railway bed, next to a wartime military post and close to a deconsecrated Gothic church. Every night after sunset the church bells ring, someone knocks on the front and back doors at the same moment, picks strike rock under the basement, a steam train crosses where the rails were lifted in 1961, and a war is fought in the attic.

Every night, the smart home writes it all down. An anomaly detector picks out what isn't ordinary life, and a **local open-weight model** reads the log and tells you what happened. Then it reads the story to you.

| Stage | Open tool | Fallback |
|---|---|---|
| Spot the anomalies | **[TabPFN](https://github.com/PriorLabs/TabPFN)**, an open-weight tabular foundation model | logistic-regression baseline in JS |
| Tell the story | **[Gemma 4](https://ollama.com/library/gemma4)** (`gemma4:e4b`) via Ollama, or any open model behind an OpenAI-compatible server (llama.cpp, vLLM, LM Studio) | template narrator |
| Read it aloud | **[Piper](https://github.com/OHF-Voice/piper1-gpl)**, offline neural TTS. Optional: ElevenLabs | the browser's speech synthesis |

Every stage degrades gracefully, so the app always tells a story, even with nothing installed.

- **Simulated nights**: a seeded generator produces a believable night (dinner, TV, a shower, a 2 a.m. bathroom trip, owls on the outdoor mics) and hides the setting's hauntings in it, plus a random handful from 29 more.
- **Your own logs**: feed it a Home Assistant history export (or JSON, JSONL, CSV) and it narrates *your* house.
- **Web UI**: a cross-section of the house lights up as the night replays; flagged readings glow amber in the log; the story streams in beside it and can be read aloud. Click any time in the story to jump to that moment.
- **Guided tour**: *Tour the grounds* walks through the setting stop by stop, zooming the diagram to each place.
- **No npm dependencies.** Node 18+. Python is only needed for TabPFN and Piper.

## Quick start

```bash
# 1. The narrator: Gemma 4 on Ollama (https://ollama.com)
ollama pull gemma4:e4b

# 2. Optional Python extras: TabPFN and Piper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m piper.download_voices --download-dir voices en_GB-alan-medium

# 3. Run
npm start                 # web UI on http://localhost:3131
node cli.js --show-log    # or a story in the terminal
```

Other models and servers:

```bash
GHOST_MODEL=gemma4:12b npm start
node cli.js --model gemma3:4b
node cli.js --provider openai --base-url http://localhost:8080 --model gemma-4-e4b-it   # llama.cpp llama-server
```

## Anomaly detection with TabPFN

Real logs don't come labelled. The house can't tell you which reading was a ghost, so a model has to decide what's unusual. Each event becomes a row of generic features (hours since dusk, how many people are in bed, room, sensor kind, deviation from that sensor's normal, time since its last reading, burstiness, rarity, and whether something acted while everyone was asleep). TabPFN learns from 40 labelled simulated nights *in context*: no training run, one forward pass. Then it scores every event in the night you're looking at.

The scores are used three ways: flagged lines go to the narrator tagged `[anomaly 0.97]`, so the story is built around the strangest moments; the web UI marks them in the log; and for real exports the template narrator tells only the flagged ones.

**Enable TabPFN** (free for non-commercial use, one-time licence):

1. Log in at <https://ux.priorlabs.ai>, accept the licence on the Licenses tab.
2. Copy your API key from <https://ux.priorlabs.ai/account>.
3. `export TABPFN_TOKEN=<your key>` before `npm start`. The weights download once, then run locally.

Without it, the app says so and uses the logistic baseline. Compare them on nights neither has seen:

```bash
node scripts/evaluate.js
```

| Scorer | ROC AUC | Precision | Recall | F1 |
|---|---|---|---|---|
| Logistic baseline | 0.972 | 0.903 | 0.900 | 0.902 |
| TabPFN | *run `scripts/evaluate.js` with `TABPFN_TOKEN` set* | | | |

`--scorer auto|tabpfn|logistic|none` picks one explicitly. `TABPFN_DEVICE=cuda` uses a GPU, and `TABPFN_ESTIMATORS` trades speed for accuracy (default 4).

## Voice

- **Piper** (default when installed): open source, offline, and the `en_GB-alan-medium` voice is a fine grave narrator. Change it with `PIPER_VOICE`, and slow it down with `PIPER_LENGTH_SCALE` (default 1.15).
- **ElevenLabs** (optional): set `ELEVENLABS_API_KEY`; choose a voice with `ELEVENLABS_VOICE_ID`. A story is roughly 4,000–5,000 characters, so check your plan's quota.
- **Browser**: always available in the web UI, nothing to install.

Times are spoken as words ("two nineteen"), not digits. From the CLI, `--voice piper` or `--voice elevenlabs` saves the audio next to the story.

## The CLI

```
node cli.js [options]

  --seed <s>          replay a specific night (same seed, same haunting)
  --date <YYYY-MM-DD> the evening the night starts on
  --extras <n>        how many random hauntings to add (default 7)
  --setting <n>       how many of the 5 setting activities to use (default all)
  --include <a,b>     force specific activities (see --list)
  --log <file>        narrate a real log instead
  --scorer <s>        auto | tabpfn | logistic | none
  --tone <t>          literary | campfire | report | creepypasta
  --model <m>         narrator model (default gemma4:e4b)
  --offline           use the template narrator
  --strict            fail rather than fall back when the model is unavailable
  --voice <v>         piper | elevenlabs: also save the story as audio
  --prompt            print the exact prompt sent to the model
  --save <dir>        write the log (.jsonl, .log) and the story (.md)
  --list              list the activity catalog
```

Examples:

```bash
node cli.js --seed 1031 --date 2026-10-31 --tone campfire --voice piper --save nights
node cli.js --include third_heartbeat,speaker_rollcall --extras 3
node cli.js --log examples/home-assistant-history.json --tone report
```

## Narrating your own house

Export history from Home Assistant:

```bash
curl -H "Authorization: Bearer $HA_TOKEN" \
  "http://homeassistant.local:8123/api/history/period/2026-10-30T18:00:00?end_time=2026-10-31T07:00:00" \
  > last-night.json
node cli.js --log last-night.json
```

Or upload it with **Use my own log** in the web UI. Also accepted:

- JSON array or JSONL of `{ "time", "sensor", "value", "detail" }` (the format `--save` writes)
- CSV with `entity_id,state,last_changed` columns

Entity names are matched to rooms by keyword (`front_door` → porch, `bed_occupancy` → bedroom, `living_room_tv` → living room), so the diagram still lights up.

## Deploy

The web UI is live at [ghost-in-the-machine-bwff.onrender.com](https://ghost-in-the-machine-bwff.onrender.com). `render.yaml` deploys it to Render's free tier, and [DEPLOY.md](DEPLOY.md) covers putting it on a free .tech domain and pointing it at a hosted model.

## Configuration

| Variable | Default | |
|---|---|---|
| `GHOST_MODEL` | `gemma4:e4b` | narrator model |
| `GHOST_PROVIDER` | `ollama` | `ollama` or `openai` (any OpenAI-compatible server) |
| `GHOST_BASE_URL` | `http://localhost:11434` / `:8080` | model server |
| `GHOST_API_KEY` | | bearer token for a hosted model server |
| `GHOST_SCORER` | `auto` | `auto`, `tabpfn`, `logistic`, `none` |
| `GHOST_PYTHON` | `.venv/bin/python` or `python3` | Python for TabPFN and Piper |
| `TABPFN_TOKEN` | | Prior Labs API key (licence acceptance) |
| `PIPER_VOICE` | `en_GB-alan-medium` | |
| `ELEVENLABS_API_KEY` | | enables ElevenLabs |
| `RATE_LIMIT_PER_HOUR` | `60` | per-IP limit on stories, scoring and voice |
| `PORT` | `3131` | |

## The activity catalog

The five **setting** activities come from the original concept and happen every night. The **extra** activities are drawn at random.

| id | kind | title |
|----|------|-------|
| `church_bells` | setting | St. Barbara's bells |
| `twin_knocks` | setting | Knocks on both doors |
| `mining_below` | setting | Mining in the basement |
| `steam_train` | setting | The steam train |
| `attic_war` | setting | Gunfire in the attic |
| `coop_panic` | extra | The chickens panic |
| `out_of_season_berries` | extra | The foraging basket fills |
| `gun_cabinet` | extra | The gun cabinet opens |
| `morse_lights` | extra | The hallway lights speak Morse |
| `canary` | extra | The miner's canary |
| `cold_spot` | extra | A cold spot by the bed |
| `speaker_rollcall` | extra | The smart speaker takes roll call |
| `organ` | extra | The organ plays |
| `lantern_procession` | extra | Lanterns towards Blackreef |
| `reveille` | extra | Reveille at the wrong hour |
| `kitchen_tap` | extra | The kitchen tap runs |
| `bedroom_door` | extra | The bedroom door opens |
| `third_heartbeat` | extra | A third heartbeat |
| `mirror_message` | extra | Writing in the mirror |
| `tv_static` | extra | The television wakes |
| `wind_chimes` | extra | Chimes without wind |
| `wall_scratching` | extra | Scratching in the walls |
| `miner_at_door` | extra | A figure with a helmet lamp |
| `carbide_lamp` | extra | The basement bulb changes colour |
| `phantom_dog` | extra | A dog you do not own |
| `unknown_device` | extra | An unknown device joins the network |
| `baby_monitor` | extra | The old baby monitor |
| `attic_stairs` | extra | Footsteps on the attic stairs |
| `coal_smoke` | extra | Coal smoke in the hallway |
| `choir` | extra | A choir in the empty church |
| `garden_footprints` | extra | Something walks the garden |
| `ntp_past` | extra | The router time-travels |
| `extra_egg` | extra | An egg too many |
| `sleep_talking` | extra | You both talk in your sleep |

## How it works

```
src/
  setting.js        the house, its history, and the guided-tour stops
  sensors.js        every device in the house and which zone it watches
  activities.js     the haunting catalog: each activity emits sensor events,
                    a paragraph for the offline narrator, and a morning clue
  night.js          seeded simulation: ordinary telemetry + hauntings → a night
  logs.js           log formatting, and importing real exports
  anomaly/
    features.js     one numeric row per event
    index.js        training set from simulated nights, TabPFN bridge, fallback
    logistic.js     the JS baseline
    tabpfn_score.py the Python side of the TabPFN bridge
  voice.js          Piper and ElevenLabs
  narrator/
    prompt.js       builds the system + user prompt (setting, log, morning clues)
    llm.js          streams from Ollama or an OpenAI-compatible server
    offline.js      template narrator fallback
cli.js              terminal storyteller
server.js           zero-dependency HTTP server for the web UI
public/             the web UI (house diagram, replay, story, voice, tour)
scripts/evaluate.js TabPFN vs baseline on unseen nights
```

The prompt asks the model to anchor every eerie beat to a real log line, by time and sensor, and forbids inventing readings. The horror comes from the gap between dry telemetry (`bed.occupancy 3 persons`) and what it implies.

Nights are deterministic per seed, which makes it easy to share one: *"try seed 1031"*.

## Make it your house

Everything about the place lives in `src/setting.js` (landmarks, history, tour) and `src/activities.js` (hauntings). Add an activity by appending an object with a `window`, a `generate(r)` that returns sensor events, and a `tell()` paragraph. Sensors go in `src/sensors.js`; a new zone also needs a `<g class="zone" data-zone="…">` in `public/index.html`.

## Tests

```bash
npm test
```

## License

MIT
