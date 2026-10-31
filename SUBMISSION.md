---
title: Ghost in the Machine: my smart home writes down what happens after dark
tags: devchallenge, hacktoberfest, opensource, ai
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge: Ghost in the Machine](https://dev.to/devteam/join-the-hacktoberfest-open-source-ai-challenge-ghost-in-the-machine-2850-in-prizes-across-21-3cho).*

## What I Built

My wife and I live in a house in the middle of a forest. Behind us is an abandoned mining town. Opposite us, an old railway track. Next door, a former military post, and close by, an old Gothic church. We spend our days hunting and foraging, and we keep chickens and a small garden.

The trouble starts after sunset. The church bells ring. Someone knocks, timidly, on the front door and the back door at almost the same moment. From the bedroom we hear mining in the basement and a steam train crossing the passage. In the attic: gunshots, and the sounds of war.

**Ghost in the Machine** imagines that house wired with smart sensors, and asks: what did the house *record* while we were asleep? It generates a night of realistic sensor telemetry and hides the hauntings inside it. **TabPFN** picks out the readings that aren't ordinary life, **Gemma 4** running locally reads the log and tells you the story, and **Piper** reads it to you in the dark.

> At 02:19 the bedroom door opened. The bed pad confirms that you were both in bed at the time.

It can also read **your** house: point it at a Home Assistant history export and it will narrate last night.

## How I Interpreted the Theme

"Ghost in the machine" usually means a mind inside a mechanism. I took it literally: the ghosts leave traces in the machines. A geophone counting pick strikes below the slab. A CO₂ sensor climbing like a sealed room full of breathing men. A smart speaker transcribing a roll call: surnames, each answered with "Present", then "Shift three, all present."

The setting honours the past, too. Every haunting belongs to something that was abandoned: the Blackreef mine that collapsed on the night shift in 1931, the branch line whose rails were lifted in 1961, the signal post emptied in 1945, the church that lost its bells in 1971. St. Barbara, the church's patron saint, watches over miners *and* artillerymen, which ties the basement and the attic together.

## Demo

![The night of 31 October replaying: the hall lights up as the stair sensor logs a climb that stops at step 6 of 12, and the story tells the same moment](https://raw.githubusercontent.com/Piwe/GhostInMachine/main/docs/screenshots/replay.png)
*Seed 1031 replaying at 01:35. The stair pressure strips log a climb that stops halfway up, and the story beside the log tells the same moment. Lines flagged by the anomaly detector have an amber edge. This story came from the offline template narrator.*

![A stop on the guided tour: the basement and the No. 3 drift running under the house](https://raw.githubusercontent.com/Piwe/GhostInMachine/main/docs/screenshots/tour.png)
*The guided tour walks you round the grounds before the first night. Here it's the stop where the old mine runs under the house.*

![The same night on a phone](https://raw.githubusercontent.com/Piwe/GhostInMachine/main/docs/screenshots/mobile.png)
*The same night on a phone.*

**Live site: [ghost-in-the-machine-bwff.onrender.com](https://ghost-in-the-machine-bwff.onrender.com)** (free tier, so the first load can take up to a minute while it wakes). Render has no GPU, so the hosted version uses the template narrator and the JS baseline scorer. Gemma and TabPFN run when you start it locally.
<!-- TODO: swap in the .tech domain once it's pointed at Render -->

Try a night yourself: `node cli.js --seed 1031 --date 2026-10-31 --voice piper`

## Code

{% github Piwe/GhostInMachine %}

## How I Built It

Three open models, one per stage, and each one has a fallback so the app always finishes the story:

```
sensor log ──▶ TabPFN ──▶ Gemma 4 ──▶ Piper ──▶ 🔊
             which readings   what do they   read it
             are strange?     mean?          aloud
```

**The setting and the hauntings.** `src/setting.js` holds the house, its landmarks and their histories, plus the stops of a guided tour that zooms the house diagram from Blackreef down to the drift under the bedroom. `src/activities.js` has 34 hauntings. Five are the setting and happen every night. The other 29 are drawn at random: the hens panicking and then all facing west, the foraging basket filling with out-of-season blackberries, the hallway lights flickering Morse, a third heartbeat in the bed, an unknown device called `SHAFT-3-CAGE` joining the Wi-Fi with the strongest signal in the house.

**Ordinary life.** Dread needs a baseline, and so does a detector. Every simulated night also has dinner, the TV, a shower, the hens being shut in, owls on the outdoor microphones, and one of us getting up at 2 a.m. That makes the problem honest: the bedroom door opening at 02:19 is routine if the bed pad says one person got up, and a haunting if it says both of us were still in bed.

**TabPFN finds the ghosts.** A real Home Assistant export doesn't come labelled. Each event becomes a row of generic features (hours since dusk, how many people are in bed, deviation from that sensor's normal, burstiness, rarity, whether something acted while everyone slept). TabPFN, an open-weight tabular foundation model, takes 40 labelled simulated nights as context and scores a new night in a single forward pass, with no training loop. A logistic-regression baseline in plain JS is the fallback, and the comparison point:

| Scorer (15 unseen nights) | ROC AUC | F1 |
|---|---|---|
| Logistic baseline | 0.972 | 0.902 |
| TabPFN | <!-- TODO: node scripts/evaluate.js --> | |

<!-- TODO: one sentence on what TabPFN caught that the baseline missed. With the example Home Assistant log, the baseline misses the TV switching on at 04:02 because it can't learn "TV on" × "everyone in bed". -->

**Gemma 4 tells the story.** The flagged readings go to the narrator tagged `[anomaly 0.97]`. The prompt's key rule: every eerie beat must cite a real log line by time and sensor, and the model may not invent readings. That constraint is what makes it scary: the model can only *interpret*. It runs through Ollama (`gemma4:e4b`) or any OpenAI-compatible server such as llama.cpp, in four tones: literary, campfire, technician's incident report, or creepypasta.

**Piper reads it aloud.** Open-source neural TTS, fully offline, slowed down a little and with times spoken as words. ElevenLabs is an optional upgrade; the browser's own voice is the fallback.

**The web UI** is plain HTML, CSS and JavaScript around an SVG cross-section of the house. Rooms glow as their sensors fire during replay, anomalous lines glow amber in the log, and times in the story are clickable: they jump the replay to that moment. It's deployed on Render's free tier at [ghost-in-the-machine-bwff.onrender.com](https://ghost-in-the-machine-bwff.onrender.com).

**No npm dependencies.** Node 18+ for the app; Python only for TabPFN and Piper.

## Why Open Innovation Matters Here

This project reads the most private data a home produces: when you go to bed, when one of you gets up in the night, which doors open at 3 a.m. I wouldn't send that to anyone's API, and I don't have to. The detector, the narrator and the voice all run on my own machine, and nothing leaves the house except the story, if I choose to share it.

Open models also make it hackable in the way a ghost story should be: swap in a different model and hear a different narrator; change the setting file and it's your house, your history, your ghosts.

## Prize Categories

- **Best Use of Gemma**: Gemma 4 (`gemma4:e4b`) is the narrator, run locally.
- **Best Use of TabPFN**: TabPFN is the anomaly detector that decides which readings are hauntings.
- **Best Use of Render** and **Best Use of a .tech Domain**: the web UI is deployed on Render at [ghost-in-the-machine-bwff.onrender.com](https://ghost-in-the-machine-bwff.onrender.com). <!-- TODO: .tech domain -->
- **Best Use of ElevenLabs**: <!-- only if you actually use it, e.g. for the demo video narration -->

<!-- Optional: embed the agent session that built this project. -->
