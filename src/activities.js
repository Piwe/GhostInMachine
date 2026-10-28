// The haunting catalog.
//
// `setting` activities come straight from concept.txt: they are what this house
// always sounds like after sunset. `extra` activities are the random layer that
// makes every night different.
//
// Each activity:
//   window   [fromHour, toHour]  clock hours, 24+ means after midnight
//   generate(r) -> { events: [[offsetSeconds, sensorId, value, detail], ...], facts }
//   tell({ r, facts, at })       a paragraph for the offline narrator; at(i) is the
//                                HH:MM of the i-th event
//   residue(facts)               what you find in the morning (optional)

const every = (n, gap, fn) => Array.from({ length: n }, (_, i) => fn(i, i * gap));

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen'];
const words = (n) => NUMBERS[n] ?? String(n);
const Words = (n) => words(n)[0].toUpperCase() + words(n).slice(1);

export const activities = [
  // ───────────────────────── setting (from concept.txt) ─────────────────────────
  {
    id: 'church_bells',
    title: "St. Barbara's bells",
    kind: 'setting',
    window: [18.6, 23.5],
    generate(r) {
      const strikes = r.pick([12, 13, 13, 13, 3, 7]);
      const events = every(strikes, r.int(4, 6), (i, t) => [
        t, 'yard.mic_church', r.int(84, 93),
        `class=church_bell strike=${i + 1}/${strikes} pitch=${r.int(398, 414)}Hz`,
      ]);
      events.push([strikes * 5 + 30, 'yard.mic_church', 31, 'class=silence (birds, insects also silent)']);
      return { events, facts: { strikes } };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the microphone on the east eave, the one that faces St. Barbara's, logged a bell. It counted ${words(facts.strikes)} strikes, each at the same bronze pitch, then a silence so complete that even the insects in the forest stopped. Nobody has rung those bells since 1971. Nobody can ring them: they were taken down and sold.`,
    residue: () => 'The east eave microphone has a thin crust of verdigris on its grille.',
  },
  {
    id: 'twin_knocks',
    title: 'Knocks on both doors',
    kind: 'setting',
    window: [19, 24],
    generate(r) {
      const rounds = r.int(3, 4);
      const knocks = r.pick([2, 3, 3, 4]);
      const events = [];
      for (let k = 0; k < rounds; k++) {
        const base = k * r.int(40, 90);
        const lag = r.int(120, 480);
        events.push([base, 'front_door.vibration', +r.float(0.2, 0.4).toFixed(2), `knocks=${knocks} timid`]);
        events.push([base, 'back_door.vibration', +r.float(0.2, 0.4).toFixed(2), `knocks=${knocks} timid offset=+${lag}ms from front`]);
        events.push([base + 1, 'front_door.camera', 'clear', 'person_detected=false motion=false']);
      }
      return { events, facts: { rounds, knocks } };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} came the knocking. ${Words(facts.knocks)} timid knocks on the front door and, less than half a second later, the same ${words(facts.knocks)} on the back, as if one visitor could stand at both ends of the house at once. The doorbell camera watched the whole thing and reported, ${words(facts.rounds)} times over, that nobody was there.`,
    residue: () => 'There are small knuckle-shaped smudges of soot on both doors, at the height of a child.',
  },
  {
    id: 'mining_below',
    title: 'Mining in the basement',
    kind: 'setting',
    window: [23, 28],
    generate(r) {
      const minutes = r.int(14, 38);
      const rate = r.int(28, 36);
      const events = [
        [0, 'basement.vibration', 0.41, `pattern=rhythmic ${rate} strikes/min source=below_slab`],
        [5, 'basement.mic', 58, 'class=pick_on_rock confidence=0.87'],
        [90, 'basement.co2', 1180, 'rising (baseline 450)'],
        [240, 'basement.mic', 49, 'class=speech language=unknown voices=3+'],
        [minutes * 60 - 120, 'basement.co2', 2650, 'rising'],
        [minutes * 60, 'basement.vibration', 2.9, 'pattern=impulse duration=4.1s classified=rockfall'],
        [minutes * 60 + 5, 'basement.mic', 22, 'class=silence'],
      ];
      return { events, facts: { minutes, rate } };
    },
    tell: ({ facts, at }) =>
      `Beneath the bedroom, the basement geophone woke at ${at(0)}: ${facts.rate} strikes a minute, steady as a heartbeat, coming from below the concrete slab. The sound classifier was sure of it: pick on rock. The air down there began to thicken, CO₂ climbing like it does in a sealed room full of breathing men, and somewhere in the middle the microphone caught voices, three or more, in a language it could not name. After ${facts.minutes} minutes came one long shudder the sensor filed as a rockfall. Then nothing at all.`,
    residue: () => 'A fine grey rock dust covers the basement steps. It is not from the house.',
  },
  {
    id: 'steam_train',
    title: 'The steam train',
    kind: 'setting',
    window: [24, 28.5],
    generate(r) {
      const cars = r.int(9, 17);
      return {
        events: [
          [0, 'yard.mic_tracks', 74, 'class=steam_whistle doppler=approaching'],
          [20, 'yard.geophone', 0.66, `pattern=periodic axle_count≈${cars * 4}`],
          [26, 'yard.camera_tracks', 'motion', 'object=large length≈' + cars * 11 + 'm thermal=none'],
          [40, 'bedroom.wall', 0.08, 'sympathetic vibration'],
          [70, 'yard.mic_tracks', 61, 'class=steam_whistle doppler=receding'],
          [95, 'yard.geophone', 0.01, 'quiet'],
        ],
        facts: { cars },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the west microphone heard a steam whistle coming down the Blackreef branch line. The driveway geophone counted the axles as they passed: roughly ${words(facts.cars)} wagons' worth. The camera saw something long and moving cross the clearing, ${facts.cars * 11} metres of it, and on thermal it was perfectly cold. The rails were lifted in 1961. The bedroom wall hummed along anyway.`,
    residue: () => 'Across the railway bed, two straight lines of flattened grass run exactly one gauge apart.',
  },
  {
    id: 'attic_war',
    title: 'Gunfire in the attic',
    kind: 'setting',
    window: [25, 29],
    generate(r) {
      const shots = r.int(5, 11);
      const events = every(shots, r.int(2, 9), (i, t) => [
        t, 'attic.mic', r.int(96, 112), `class=gunshot confidence=${r.float(0.81, 0.97).toFixed(2)}`,
      ]);
      events.push([shots * 6, 'yard.mic_post', 68, 'class=explosion distance≈1.2km direction=N']);
      events.push([shots * 6 + 8, 'attic.air', 312, 'PM2.5 spike, nitrate signature']);
      events.push([shots * 6 + 20, 'attic.mic', 44, 'class=shouting words="hold the line"']);
      events.push([shots * 6 + 30, 'attic.temp', 4.1, 'dropped 9.3°C in 60s']);
      return { events, facts: { shots } };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the war came back. The attic classifier logged ${words(facts.shots)} gunshots, close and flat, then the north microphone heard a detonation out towards Signal Post 9, which has been empty since 1945. The attic air filled with particulates that the detector described, with some confusion, as nitrates. Someone shouted "hold the line". The attic went cold.`,
    residue: () => 'A brass cartridge case, green with age, lies on the attic floor beneath the window.',
  },

  // ───────────────────────── extras (random each night) ─────────────────────────
  {
    id: 'coop_panic',
    title: 'The chickens panic',
    kind: 'extra',
    window: [20, 29],
    generate(r) {
      const open = r.chance(0.5);
      return {
        events: [
          [0, 'coop.mic', 79, 'class=chicken_distress'],
          [3, 'coop.motion', 'active', 'count=all birds moving'],
          [40, open ? 'coop.door' : 'coop.mic', open ? 'open' : 21, open ? 'opened from INSIDE (motor not engaged)' : 'class=silence (abrupt)'],
          [42, 'coop.motion', 'still', 'all birds stationary, facing west'],
        ],
        facts: { open },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the chickens screamed. Every bird in the coop moved at once, and then, just as suddenly, none of them moved at all. ${facts.open ? 'The coop door opened itself, not with the motor, but pushed from the inside.' : 'The silence afterwards was abrupt, like a hand over a mouth.'} The motion sensor's last note: all birds stationary, all facing west, towards the tracks.`,
    residue: () => 'The hens will not leave the coop, and all of them are still facing west.',
  },
  {
    id: 'out_of_season_berries',
    title: 'The foraging basket fills',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      const grams = r.int(220, 480);
      return {
        events: [
          [0, 'kitchen.motion', 'active', 'no matching hallway motion'],
          [12, 'kitchen.scale', grams, `+${grams}g added to foraging basket`],
          [14, 'kitchen.motion', 'clear', ''],
        ],
        facts: { grams },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} something moved in the kitchen without ever crossing the hallway to get there. The pantry scale under your wife's foraging basket registered ${facts.grams} grams added, gently, the way she sets down a full basket after a good day.`,
    residue: (f) => `The foraging basket holds ${f.grams}g of blackberries, perfectly ripe, months out of season and still cold.`,
  },
  {
    id: 'gun_cabinet',
    title: 'The gun cabinet opens',
    kind: 'extra',
    window: [23, 29],
    generate(r) {
      const gap = r.int(240, 1500);
      return {
        events: [
          [0, 'living.gun_cabinet', 'open', 'lock state=locked (contact reports open)'],
          [gap, 'living.gun_cabinet', 'closed', `open for ${Math.round(gap / 60)} min`],
        ],
        facts: { minutes: Math.round(gap / 60) },
      };
    },
    tell: ({ facts, at }) =>
      `Your gun cabinet opened at ${at(0)}. The lock still reported itself locked; the contact on the door disagreed. It stayed open for ${facts.minutes} minutes, long enough for somebody to choose, and closed again at ${at(1)}.`,
    residue: () => 'Your rifle is back in the cabinet, but it has been cleaned and oiled, and you did not do it.',
  },
  {
    id: 'morse_lights',
    title: 'The hallway lights speak Morse',
    kind: 'extra',
    window: [22, 29],
    generate(r) {
      const word = r.pick(['DIG', 'STAY', 'SHIFT', 'BELOW', 'HOME', 'SOS', 'WAKE']);
      const code = word.split('').map((c) => MORSE[c]).join(' / ');
      return {
        events: [
          [0, 'hallway.lights', 'flicker', `pattern=${code}`],
          [30, 'hallway.lights', 'flicker', `pattern=${code} (repeat)`],
          [60, 'hallway.lights', 'off', 'automation=none, manual=none'],
        ],
        facts: { word, code },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the hallway bulbs began to flicker in short and long pulses: ${facts.code}. No automation triggered it. They repeated it once, in case you missed it. It spells ${facts.word}.`,
  },
  {
    id: 'canary',
    title: "The miner's canary",
    kind: 'extra',
    window: [23, 28],
    generate(r) {
      const secs = r.int(40, 160);
      return {
        events: [
          [0, 'basement.mic', 38, 'class=bird_song species≈Serinus canaria'],
          [secs, 'basement.mic', 12, 'class=silence (song stopped mid-phrase)'],
          [secs + 30, 'basement.co2', 1900, 'rising'],
        ],
        facts: { secs },
      };
    },
    tell: ({ at }) =>
      `At ${at(0)}, in a basement with no windows and no birds, the microphone heard a canary singing. It sang for a little while. Then it stopped mid-phrase, and miners know exactly what that means, and the CO₂ reading started to climb.`,
  },
  {
    id: 'cold_spot',
    title: 'A cold spot by the bed',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      const drop = +r.float(7, 12).toFixed(1);
      return {
        events: [
          [0, 'bedroom.temp', +(19.5 - drop).toFixed(1), `dropped ${drop}°C in 40s, heating=on`],
          [10, 'bedroom.humidity', 91, 'spike (breath-like)'],
          [260, 'bedroom.temp', 19.3, 'recovered'],
        ],
        facts: { drop },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the bedroom thermostat dropped ${facts.drop} degrees in forty seconds, with the heating running. Humidity jumped at the same time, the way a window fogs when someone breathes close to it. It lasted about four minutes, right beside the bed.`,
  },
  {
    id: 'speaker_rollcall',
    title: 'The smart speaker takes roll call',
    kind: 'extra',
    window: [25, 29],
    generate(r) {
      const names = r.sample(['Pieterse', 'Mokoena', 'Dlamini', 'Van Wyk', 'Ndlovu', 'Brennan', 'Sithole', 'Kruger', 'Nkosi'], 4);
      const events = [[0, 'living.speaker', 'wake', 'wake word detected (no wake word in audio)']];
      names.forEach((n, i) => events.push([4 + i * 3, 'living.speaker', 'transcript', `"${n}." ... "Present."`]));
      events.push([4 + names.length * 3 + 2, 'living.speaker', 'transcript', '"Shift three, all present." intent=unknown']);
      return { events, facts: { names } };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the smart speaker woke without its wake word and began transcribing. A voice read out surnames: ${facts.names.join(', ')}. After each one, another voice answered "Present." Then: "Shift three, all present." The speaker filed it under intent unknown and went back to sleep.`,
  },
  {
    id: 'organ',
    title: 'The organ plays',
    kind: 'extra',
    window: [21, 27],
    generate(r) {
      const hymn = r.pick(['Abide With Me', 'Nearer, My God, to Thee', 'Eternal Father, Strong to Save', 'The Day Thou Gavest']);
      return {
        events: [
          [0, 'yard.mic_church', 52, `class=pipe_organ melody≈"${hymn}"`],
          [r.int(180, 300), 'yard.mic_church', 30, 'class=silence'],
        ],
        facts: { hymn },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the east microphone picked up an organ in St. Barbara's, slow and slightly out of tune. The audio classifier matched the melody to "${facts.hymn}". The church organ's pipes were stripped for scrap decades ago.`,
  },
  {
    id: 'lantern_procession',
    title: 'Lanterns towards Blackreef',
    kind: 'extra',
    window: [22, 28],
    generate(r) {
      const n = r.int(5, 14);
      return {
        events: [
          [0, 'yard.camera_forest', 'motion', `points_of_light=${n} moving=E→W speed≈walking`],
          [35, 'yard.camera_forest', 'person', `person_detected=${n} confidence=0.38`],
          [120, 'yard.camera_forest', 'clear', 'lights entered tree line towards mine'],
        ],
        facts: { n },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the back-yard camera counted ${words(facts.n)} small lights moving through the forest at walking pace, in single file, heading for Blackreef. It decided, without much confidence, that they were people. They went into the trees towards the old mine and did not come back out.`,
  },
  {
    id: 'reveille',
    title: 'Reveille at the wrong hour',
    kind: 'extra',
    window: [26, 29],
    generate() {
      return {
        events: [
          [0, 'yard.mic_post', 71, 'class=bugle call≈reveille'],
          [22, 'yard.mic_post', 40, 'class=footsteps marching count≈many'],
          [90, 'yard.mic_post', 25, 'class=silence'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(0)}, hours before dawn, a bugle sounded reveille at Signal Post 9. The north microphone then heard boots, many of them, keeping step, until they marched out of range.`,
  },
  {
    id: 'kitchen_tap',
    title: 'The kitchen tap runs',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      const litres = +r.float(2.5, 6).toFixed(1);
      return {
        events: [
          [0, 'kitchen.tap', 3.1, 'flow started, no kitchen motion'],
          [r.int(60, 140), 'kitchen.tap', 0, `flow stopped total=${litres}L`],
        ],
        facts: { litres },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the kitchen tap opened. The flow meter recorded ${facts.litres} litres running into the sink, though the motion sensor swore the kitchen was empty. It closed again by itself.`,
    residue: () => 'The sink has a gritty brown ring in it, like water drawn from a mine sump.',
  },
  {
    id: 'bedroom_door',
    title: 'The bedroom door opens',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      return {
        events: [
          [0, 'bed.occupancy', 2, 'both residents in bed'],
          [2, 'bedroom.door', 'open', ''],
          [r.int(30, 200), 'bedroom.door', 'closed', 'bed.occupancy still 2'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(1)} the bedroom door opened. The bed pad confirms that you were both in bed at the time. It stood open for a while, as if somebody were deciding whether to come in, and then it closed.`,
  },
  {
    id: 'third_heartbeat',
    title: 'A third heartbeat',
    kind: 'extra',
    window: [25, 29],
    generate(r) {
      const bpm = r.int(38, 46);
      return {
        events: [
          [0, 'bed.occupancy', 3, 'weight distribution: third body on left edge'],
          [10, 'bed.tracker_you', bpm, `heart rate locked to ${bpm}bpm (yours averages 58)`],
          [12, 'bed.tracker_wife', bpm, `heart rate locked to ${bpm}bpm (hers averages 62)`],
          [r.int(300, 700), 'bed.occupancy', 2, ''],
        ],
        facts: { bpm },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the bed pad counted three people. The weight was on the left edge, beside you. For the next few minutes both your sleep trackers recorded the same slow heartbeat, ${facts.bpm} beats a minute, too slow for either of you, as though your hearts had fallen in step with something else lying there.`,
  },
  {
    id: 'mirror_message',
    title: 'Writing in the mirror',
    kind: 'extra',
    window: [25, 29],
    generate(r) {
      return {
        events: [
          [0, 'bathroom.humidity', 94, 'rising, no water flow'],
          [20, 'bathroom.light', 'on', 'mirror light switched on, no motion'],
          [r.int(200, 400), 'bathroom.light', 'off', ''],
        ],
        facts: { text: r.pick(['NO 3 SHAFT', '1931', 'LET US UP', 'WE ARE STILL HERE']) },
      };
    },
    tell: ({ at }) =>
      `At ${at(0)} the bathroom filled with steam with no water running, and the mirror light switched itself on, as if someone wanted to see what they were writing.`,
    residue: (f) => `When you shower in the morning, letters appear in the steam on the mirror: ${f.text}.`,
  },
  {
    id: 'tv_static',
    title: 'The television wakes',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      return {
        events: [
          [0, 'living.tv', 'on', 'input=antenna channel=0 (no channel 0 configured)'],
          [5, 'living.tv', 'audio', 'volume 4→31 content=static with voice under it'],
          [r.int(60, 180), 'living.tv', 'off', 'power button not pressed'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `The television switched itself on at ${at(0)}, tuned to channel zero, which does not exist. It turned the volume up on the static, and under the static, faintly, was a voice.`,
  },
  {
    id: 'wind_chimes',
    title: 'Chimes without wind',
    kind: 'extra',
    window: [21, 29],
    generate(r) {
      return {
        events: [
          [0, 'yard.weather', 0, 'wind speed 0.0 km/h'],
          [3, 'garden.chimes', 63, 'class=wind_chimes sustained'],
          [r.int(40, 120), 'garden.chimes', 18, 'stopped'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(0)} the weather station measured no wind at all. The chimes in the garden rang anyway, for over a minute, as if being brushed by someone walking past.`,
  },
  {
    id: 'wall_scratching',
    title: 'Scratching in the walls',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      return {
        events: [
          [0, 'kitchen.wall', 0.04, 'pattern=scratching'],
          [r.int(30, 60), 'living.wall', 0.05, 'pattern=scratching'],
          [r.int(70, 110), 'hallway.wall', 0.06, 'pattern=scratching'],
          [r.int(120, 160), 'bedroom.wall', 0.07, 'pattern=scratching (headboard side)'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `Something began scratching inside the kitchen wall at ${at(0)}. The vibration sensors followed it room by room: living room, hallway, and by ${at(3)} the bedroom wall, on the headboard side, right behind your heads.`,
  },
  {
    id: 'miner_at_door',
    title: 'A figure with a helmet lamp',
    kind: 'extra',
    window: [24, 29],
    generate() {
      return {
        events: [
          [0, 'front_door.camera', 'person', 'person_detected=true confidence=0.41 note=bright point light at head height'],
          [6, 'front_door.camera', 'clip_corrupt', 'recording saved, 0 bytes'],
          [8, 'front_door.camera', 'clear', ''],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(0)} the doorbell camera finally saw someone. A figure on the porch with a single bright light at head height, like a miner's lamp. The camera saved the clip. The clip is zero bytes long.`,
    residue: () => 'There is a faint ring of black coal dust on the porch, where someone stood very still.',
  },
  {
    id: 'carbide_lamp',
    title: 'The basement bulb changes colour',
    kind: 'extra',
    window: [23, 29],
    generate(r) {
      return {
        events: [
          [0, 'basement.lamp', 1700, 'on, colour temp 1700K (bulb minimum is 2200K)'],
          [r.int(200, 600), 'basement.lamp', 0, 'off'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(0)} the basement bulb switched on at 1700 kelvin, a warmer, dirtier light than it is able to make. The colour of a carbide lamp.`,
  },
  {
    id: 'phantom_dog',
    title: 'A dog you do not own',
    kind: 'extra',
    window: [22, 29],
    generate(r) {
      return {
        events: [
          [0, 'hallway.motion', 'active', 'height<0.6m'],
          [4, 'bedroom.mic', 41, 'class=dog whimpering, outside bedroom door'],
          [r.int(60, 200), 'bedroom.mic', 39, 'class=dog scratching at door'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(0)} something low, under knee height, moved down the hallway. Outside your bedroom door the microphone heard a dog whimpering, and later scratching to be let in. You do not have a dog.`,
  },
  {
    id: 'unknown_device',
    title: 'An unknown device joins the network',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      const name = r.pick(['FIELD-TELEPHONE-9', 'SHAFT-3-CAGE', 'SIGNAL-BOX-BRF', 'ST-BARBARA-BELFRY']);
      return {
        events: [
          [0, 'router.devices', 'joined', `hostname=${name} mac=00:00:00:19:31:03 signal=-12dBm (inside the house)`],
          [r.int(300, 900), 'router.devices', 'left', `hostname=${name}`],
        ],
        facts: { name },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} a device joined your Wi-Fi without the password. It called itself ${facts.name}. Its signal was the strongest in the house, which means it was inside the house.`,
  },
  {
    id: 'baby_monitor',
    title: 'The old baby monitor',
    kind: 'extra',
    window: [24, 29],
    generate() {
      return {
        events: [
          [0, 'attic.baby_monitor', 'powered', 'no batteries installed'],
          [5, 'attic.baby_monitor', 'receiving', 'channel B: lullaby, woman humming'],
          [120, 'attic.baby_monitor', 'off', ''],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `The old baby monitor in the attic storage box powered on at ${at(0)}. It has no batteries in it. For two minutes it picked up a woman, somewhere, humming a lullaby to a child.`,
  },
  {
    id: 'attic_stairs',
    title: 'Footsteps on the attic stairs',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      const kg = r.int(55, 90);
      return {
        events: every(6, 3, (i, t) => [t, 'stairs.pressure', kg, `step ${i + 1}/12`]).concat([
          [19, 'stairs.pressure', 0, 'stopped at step 6 of 12'],
        ]),
        facts: { kg },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the pressure strips on the attic stairs felt someone climbing: ${facts.kg} kilograms, one step every three seconds. They stopped halfway, at step six of twelve, and never registered coming back down.`,
  },
  {
    id: 'coal_smoke',
    title: 'Coal smoke in the hallway',
    kind: 'extra',
    window: [22, 29],
    generate(r) {
      return {
        events: [
          [0, 'hallway.smoke', 180, 'PM2.5 rising profile=coal combustion'],
          [30, 'hallway.smoke', 'chirp', 'pre-alarm'],
          [r.int(200, 400), 'hallway.smoke', 9, 'cleared, no ventilation change'],
        ],
        facts: {},
      };
    },
    tell: ({ at }) =>
      `At ${at(0)} the hallway detector smelled coal smoke. Not wood. Coal, the kind that used to pour from a locomotive's stack. It chirped once in warning, and then the air cleared on its own, with every window shut.`,
  },
  {
    id: 'choir',
    title: 'A choir in the empty church',
    kind: 'extra',
    window: [21, 28],
    generate(r) {
      const voices = r.int(20, 40);
      return {
        events: [
          [0, 'yard.mic_church', 49, `class=choir voices≈${voices}`],
          [r.int(90, 240), 'yard.mic_church', 30, 'class=silence'],
        ],
        facts: { voices },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} St. Barbara's had a congregation again. The east microphone estimated about ${facts.voices} voices singing in its nave. The doors of that church have been chained since 1971.`,
  },
  {
    id: 'garden_footprints',
    title: 'Something walks the garden',
    kind: 'extra',
    window: [23, 29],
    generate(r) {
      const n = r.int(5, 8);
      return {
        events: [[0, 'garden.gate', 'open', '']].concat(
          every(n, 4, (i, t) => [t + 3, 'garden.soil', r.int(140, 190), `probe ${i + 1}: compaction spike (boot-sized)`]),
          [[n * 4 + 10, 'garden.gate', 'closed', '']],
        ),
        facts: { n },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the garden gate opened. One after another, ${words(facts.n)} soil probes registered a heavy boot pressing into the beds in a straight line, towards the house. The gate closed again behind it.`,
    residue: () => 'There is a line of hobnailed bootprints across the vegetable beds. They stop at the kitchen window.',
  },
  {
    id: 'ntp_past',
    title: 'The router time-travels',
    kind: 'extra',
    window: [24, 29],
    generate(r) {
      const year = r.pick(['1931', '1944', '1961']);
      return {
        events: [
          [0, 'router.ntp', 'sync', `time server returned ${year}-10-31T03:17:00 offset=-${2026 - +year}y`],
          [2, 'router.ntp', 'rejected', 'clock kept'],
        ],
        facts: { year },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} your router asked the internet what time it was. The answer came back as 3:17 in the morning, in ${facts.year}. The router rejected it. You might wonder who was answering.`,
  },
  {
    id: 'extra_egg',
    title: 'An egg too many',
    kind: 'extra',
    window: [26, 29.5],
    generate(r) {
      const hens = r.int(6, 9);
      return {
        events: [
          [0, 'coop.eggs', hens + 1, `count=${hens + 1} (flock size ${hens})`],
          [1, 'coop.motion', 'still', 'no hens on nest'],
        ],
        facts: { hens },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the nest-box counter recorded ${words(facts.hens + 1)} eggs. You keep ${words(facts.hens)} hens, and none of them were on the nest.`,
    residue: () => 'One egg in the nest box is cold and black, and heavier than an egg should be.',
  },
  {
    id: 'sleep_talking',
    title: 'You both talk in your sleep',
    kind: 'extra',
    window: [25, 29],
    generate(r) {
      const phrase = r.pick(['"It\'s not our shift."', '"The cage is coming up."', '"Light the lamps."', '"Don\'t open the door."']);
      return {
        events: [
          [0, 'bedroom.mic', 34, `class=speech speaker=resident_1 text=${phrase}`],
          [1, 'bedroom.mic', 34, `class=speech speaker=resident_2 text=${phrase} (in unison)`],
          [2, 'bed.tracker_you', 'REM', 'asleep'],
          [3, 'bed.tracker_wife', 'REM', 'asleep'],
        ],
        facts: { phrase },
      };
    },
    tell: ({ facts, at }) =>
      `At ${at(0)} the bedroom microphone recorded both of you speaking, in unison, fast asleep: ${facts.phrase} Neither of you remembers it.`,
  },
];

const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
  J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
};

export const activityById = Object.fromEntries(activities.map((a) => [a.id, a]));
