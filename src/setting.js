// The environment from concept.txt. These facts never change between nights;
// the activities in activities.js are what make each night different.

export const setting = {
  house: 'a timber-and-stone house in the middle of a forest',
  residents: 'you and your wife',
  routine: [
    'You spend most of the day hunting.',
    'Your wife forages for wild fruit and berries.',
    'You keep chickens and a small vegetable garden.',
  ],
  landmarks: [
    {
      id: 'minetown',
      name: 'Blackreef',
      where: 'behind the house',
      what: 'an abandoned gold-mining town',
      history: 'The mine closed in 1931 after the No. 3 shaft collapsed on the night shift. Old survey maps show the drift running under the forest, under the house.',
    },
    {
      id: 'tracks',
      name: 'the Blackreef branch line',
      where: 'opposite the house',
      what: 'an old railway track',
      history: 'The last ore train ran in 1961. The rails were lifted the same year; only the gravel bed remains.',
    },
    {
      id: 'post',
      name: 'Signal Post 9',
      where: 'next to the house',
      what: 'a former military post',
      history: 'A wartime signals and artillery post, abandoned in 1945. The concrete bunkers are still there under the creepers.',
    },
    {
      id: 'church',
      name: "St. Barbara's",
      where: 'close to the house',
      what: 'an old Gothic church',
      history: 'St. Barbara is the patron saint of miners and artillerymen. The church was deconsecrated in 1971 and its bells were taken down and sold.',
    },
  ],
  sunset: 18.4, // 18:24
  sunrise: 29.7, // 05:42 the next morning
};

export function describeSetting() {
  const lines = [
    `You and your wife live in ${setting.house}.`,
    ...setting.routine,
    ...setting.landmarks.map(
      (l) => `${capitalise(l.where)} is ${l.what}, ${l.name}. ${l.history}`,
    ),
  ];
  return lines.join('\n');
}

function capitalise(s) {
  return s[0].toUpperCase() + s.slice(1);
}

// The guided tour in the web UI. `view` is the SVG viewBox to zoom to
// [x, y, width, height]; `zones` light up while the stop is showing.
export const tour = [
  {
    title: 'A house in the forest',
    zones: [],
    view: [0, 0, 900, 520],
    text: 'You and your wife live in a timber-and-stone house deep in the forest. By day it is the quietest place you know. Everything around it was abandoned a long time ago. Not everything stayed abandoned.',
  },
  {
    title: 'Home',
    zones: ['bedroom', 'living', 'kitchen', 'hallway', 'bathroom'],
    view: [280, 120, 340, 196],
    text: 'You spend your days hunting; your wife forages for wild fruit and berries, and her basket lives on the pantry scale in the kitchen. The house is wired with sensors: doors, floors, air, sound. You put them in for convenience. They have turned out to be witnesses.',
  },
  {
    title: 'The garden and the hens',
    zones: ['garden', 'coop'],
    view: [580, 280, 200, 115],
    text: 'A small vegetable garden with soil probes in the beds, and a coop with an automatic door and an egg counter. The coop door closes at sunset. That is when it begins.',
  },
  {
    title: "St. Barbara's",
    zones: ['church'],
    view: [680, 20, 200, 300],
    text: "An old Gothic church close by, deconsecrated in 1971. Its bells were taken down and sold. Every evening after sunset you hear them ring. St. Barbara is the patron saint of miners and artillerymen. Keep that in mind.",
  },
  {
    title: 'Two doors, one knock',
    zones: ['porch', 'backdoor'],
    view: [260, 250, 370, 214],
    text: 'Then the knocking: timid knocks on the front door and the back door, almost at the same moment, as if one visitor could stand at both ends of the house. The doorbell camera has never seen anyone there.',
  },
  {
    title: 'Blackreef',
    zones: ['minetown'],
    view: [20, 80, 280, 162],
    text: 'Behind the house is Blackreef, an abandoned gold-mining town. The mine closed in 1931 after the No. 3 shaft collapsed on the night shift. The men on that shift were never brought up.',
  },
  {
    title: 'Beneath the bedroom',
    zones: ['basement', 'minetown'],
    view: [80, 205, 560, 323],
    text: 'Old survey maps show the No. 3 drift running under the forest, and under your house. When you lie in bed you hear it: picks on rock in the basement, steady as a heartbeat.',
  },
  {
    title: 'The branch line',
    zones: ['tracks'],
    view: [0, 300, 300, 173],
    text: 'Opposite the house is the old Blackreef branch line. The last ore train ran in 1961 and the rails were lifted the same year. You still hear a steam train move across the passage most nights.',
  },
  {
    title: 'Signal Post 9',
    zones: ['post'],
    view: [130, 250, 180, 104],
    text: 'Next door is a former military post, a wartime signals and artillery position abandoned in 1945. The bunkers are still there under the creepers.',
  },
  {
    title: 'The attic',
    zones: ['attic'],
    view: [290, 60, 320, 185],
    text: 'And above you, in the attic, the war never ended. Gunshots. Distant shelling. Men shouting. The air up there sometimes smells of cordite in the morning.',
  },
  {
    title: 'That is the setting',
    zones: [],
    view: [0, 0, 900, 520],
    text: 'Those sounds are every night. Something new joins them each time: the hens, the hallway lights, the smart speaker, a third heartbeat in the bed. Press Haunt tonight to see what the house logged while you were asleep.',
  },
];
