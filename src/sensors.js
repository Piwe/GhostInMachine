// Every device in the house. `zone` is where the reading points at, which is
// also the room the web UI lights up.

export const zones = {
  attic: 'Attic',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  hallway: 'Hallway & stairs',
  living: 'Living room',
  kitchen: 'Kitchen',
  basement: 'Basement',
  porch: 'Front porch',
  backdoor: 'Back door',
  garden: 'Garden',
  coop: 'Chicken coop',
  church: "St. Barbara's",
  tracks: 'Railway bed',
  post: 'Signal Post 9',
  minetown: 'Blackreef',
  network: 'Network',
};

export const sensors = {
  'front_door.contact': { zone: 'porch', label: 'front door contact', unit: '' },
  'front_door.vibration': { zone: 'porch', label: 'front door knock sensor', unit: 'g' },
  'front_door.camera': { zone: 'porch', label: 'doorbell camera', unit: '' },
  'back_door.contact': { zone: 'backdoor', label: 'back door contact', unit: '' },
  'back_door.vibration': { zone: 'backdoor', label: 'back door knock sensor', unit: 'g' },

  'bedroom.motion': { zone: 'bedroom', label: 'bedroom motion sensor', unit: '' },
  'bedroom.mic': { zone: 'bedroom', label: 'bedroom sound classifier', unit: 'dB' },
  'bedroom.temp': { zone: 'bedroom', label: 'bedroom thermostat', unit: '°C' },
  'bedroom.humidity': { zone: 'bedroom', label: 'bedroom humidity', unit: '%' },
  'bedroom.door': { zone: 'bedroom', label: 'bedroom door contact', unit: '' },
  'bedroom.wall': { zone: 'bedroom', label: 'bedroom wall vibration', unit: 'g' },
  'bed.occupancy': { zone: 'bedroom', label: 'bed occupancy pad', unit: 'persons' },
  'bed.tracker_you': { zone: 'bedroom', label: 'your sleep tracker', unit: 'bpm' },
  'bed.tracker_wife': { zone: 'bedroom', label: "your wife's sleep tracker", unit: 'bpm' },

  'bathroom.humidity': { zone: 'bathroom', label: 'bathroom humidity', unit: '%' },
  'bathroom.light': { zone: 'bathroom', label: 'bathroom mirror light', unit: '' },

  'hallway.motion': { zone: 'hallway', label: 'hallway motion sensor', unit: '' },
  'hallway.lights': { zone: 'hallway', label: 'hallway smart bulbs', unit: '' },
  'hallway.smoke': { zone: 'hallway', label: 'smoke & particulate detector', unit: 'µg/m³' },
  'hallway.wall': { zone: 'hallway', label: 'hallway wall vibration', unit: 'g' },
  'stairs.pressure': { zone: 'hallway', label: 'attic stair pressure strips', unit: 'kg' },

  'attic.mic': { zone: 'attic', label: 'attic sound classifier', unit: 'dB' },
  'attic.motion': { zone: 'attic', label: 'attic motion sensor', unit: '' },
  'attic.temp': { zone: 'attic', label: 'attic temperature', unit: '°C' },
  'attic.air': { zone: 'attic', label: 'attic air quality', unit: 'µg/m³' },
  'attic.baby_monitor': { zone: 'attic', label: 'old baby monitor (in storage)', unit: '' },

  'basement.vibration': { zone: 'basement', label: 'basement floor geophone', unit: 'g' },
  'basement.mic': { zone: 'basement', label: 'basement sound classifier', unit: 'dB' },
  'basement.co2': { zone: 'basement', label: 'basement CO₂', unit: 'ppm' },
  'basement.air': { zone: 'basement', label: 'basement air quality', unit: 'µg/m³' },
  'basement.lamp': { zone: 'basement', label: 'basement smart bulb', unit: 'K' },
  'basement.temp': { zone: 'basement', label: 'basement temperature', unit: '°C' },

  'kitchen.motion': { zone: 'kitchen', label: 'kitchen motion sensor', unit: '' },
  'kitchen.tap': { zone: 'kitchen', label: 'kitchen tap flow meter', unit: 'L/min' },
  'kitchen.fridge': { zone: 'kitchen', label: 'fridge door', unit: '' },
  'kitchen.scale': { zone: 'kitchen', label: 'pantry scale (foraging basket)', unit: 'g' },
  'kitchen.wall': { zone: 'kitchen', label: 'kitchen wall vibration', unit: 'g' },

  'living.tv': { zone: 'living', label: 'television', unit: '' },
  'living.speaker': { zone: 'living', label: 'smart speaker', unit: '' },
  'living.gun_cabinet': { zone: 'living', label: 'gun cabinet contact', unit: '' },
  'living.wall': { zone: 'living', label: 'living room wall vibration', unit: 'g' },

  'coop.motion': { zone: 'coop', label: 'coop motion sensor', unit: '' },
  'coop.mic': { zone: 'coop', label: 'coop microphone', unit: 'dB' },
  'coop.door': { zone: 'coop', label: 'automatic coop door', unit: '' },
  'coop.eggs': { zone: 'coop', label: 'nest-box egg counter', unit: 'eggs' },

  'garden.soil': { zone: 'garden', label: 'soil compaction probes', unit: 'kPa' },
  'garden.gate': { zone: 'garden', label: 'garden gate contact', unit: '' },
  'garden.chimes': { zone: 'garden', label: 'wind-chime microphone', unit: 'dB' },

  'yard.mic_church': { zone: 'church', label: 'east eave microphone (towards the church)', unit: 'dB' },
  'yard.mic_tracks': { zone: 'tracks', label: 'west eave microphone (towards the tracks)', unit: 'dB' },
  'yard.camera_tracks': { zone: 'tracks', label: 'driveway camera (faces the railway bed)', unit: '' },
  'yard.geophone': { zone: 'tracks', label: 'driveway geophone', unit: 'g' },
  'yard.mic_post': { zone: 'post', label: 'north eave microphone (towards Signal Post 9)', unit: 'dB' },
  'yard.camera_forest': { zone: 'minetown', label: 'back-yard camera (faces Blackreef)', unit: '' },
  'yard.weather': { zone: 'garden', label: 'weather station', unit: 'km/h' },

  'router.devices': { zone: 'network', label: 'Wi-Fi router', unit: '' },
  'router.ntp': { zone: 'network', label: 'router time sync', unit: '' },
};

// Imported logs: guess a zone from words in the entity name.
const ZONE_ALIASES = [
  ['backdoor', /back_?door|patio|rear/],
  ['porch', /front_?door|porch|doorbell|entrance/],
  ['bedroom', /bed|sleep/],
  ['bathroom', /bath|shower|toilet|mirror/],
  ['living', /living|lounge|tv|television|sofa|speaker|gun/],
  ['kitchen', /kitchen|fridge|oven|tap|sink|pantry|kettle/],
  ['hallway', /hall|stair|landing|corridor|smoke/],
  ['coop', /coop|chicken|hen|egg/],
  ['garden', /garden|yard|gate|soil|weather|chime/],
  ['network', /router|wifi|ntp|network/],
];

export function sensorInfo(id) {
  if (sensors[id]) return sensors[id];
  const lower = id.toLowerCase();
  const zone = Object.keys(zones).find((z) => lower.includes(z)) ||
    ZONE_ALIASES.find(([, re]) => re.test(lower))?.[0] || 'living';
  return { zone, label: id.replace(/^[a-z_]+\./, '').replace(/[._]/g, ' '), unit: '' };
}
