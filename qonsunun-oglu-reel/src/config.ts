// VolunTrack — "Qonşunun oğlu". Every string (both languages), voice line and beat rule. Pure data (no imports).

export const FPS = 30;
export const DURATION_FRAMES = 1200; // exactly 40.0 s
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type Lang = 'az' | 'en';
export const LANGS: Lang[] = ['az', 'en'];
export type Voice = 'ana' | 'men' | 'qo' | 'qq';

export const SPEAKERS: Record<Lang, Record<Voice, string>> = {
  az: {ana: 'ANA', men: 'MƏN', qo: 'QONŞUNUN OĞLU', qq: 'QONŞU'},
  en: {ana: 'MOM', men: 'ME', qo: 'THE NEIGHBOR’S SON', qq: 'NEIGHBOR'},
};

/** show: the brief's line (tags stripped for captions). say: the exact text sent to the voice, when it differs
 *  (respellings, and delivery tags trimmed to fit the 1,177-credit budget; spoken words never change). */
export type LineText = {show: string; say?: string; caption: string[]};
export type LineDef = {
  id: string;
  voice: Voice;
  az: LineText;
  en: LineText;
  /** target placement on the film timeline, seconds */
  target: [number, number];
  /** shouted lines shake 2 px for 6 frames on their loudest word (index into the caption words) */
  shout?: {az: number; en: number};
};

export const LINES: LineDef[] = [
  {id: '01', voice: 'ana', target: [0.1, 2.3], shout: {az: 2, en: 4},
    az: {show: '[shouting across the courtyard] Qonşunun oğlu YENƏ könüllü olub!', say: '[shouting] Qonşunun oğlu YENƏ könüllü olub!', caption: ['Qonşunun oğlu YENƏ', 'könüllü olub!']},
    en: {show: '[shouting across the courtyard] The neighbor’s son volunteered AGAIN!', say: '[shouting] The neighbor’s son volunteered AGAIN!', caption: ['The neighbor’s son', 'volunteered AGAIN!']}},
  {id: '02', voice: 'ana', target: [3.3, 4.1], az: {show: 'Ağac əkir.', caption: ['Ağac əkir.']}, en: {show: 'He plants trees.', caption: ['He plants trees.']}},
  {id: '03', voice: 'ana', target: [4.3, 5.5], az: {show: 'Uşaqlara dərs keçir.', caption: ['Uşaqlara dərs keçir.']}, en: {show: 'He teaches kids.', caption: ['He teaches kids.']}},
  {id: '04', voice: 'ana', target: [5.7, 7.0], az: {show: 'Marafonda su paylayır.', caption: ['Marafonda su paylayır.']}, en: {show: 'He hands out water at the marathon.', caption: ['He hands out water', 'at the marathon.']}},
  {id: '05', voice: 'ana', target: [7.2, 8.7], az: {show: 'İngiliscə tərcümə edir!', caption: ['İngiliscə tərcümə edir!']}, en: {show: 'He translates English!', caption: ['He translates English!']}},
  {id: '06', voice: 'ana', target: [8.85, 9.9], az: {show: '[incredulous] Cəmi on altı yaşı var!', caption: ['Cəmi on altı yaşı var!']}, en: {show: '[incredulous] And he’s only sixteen!', caption: ['And he’s only sixteen!']}},
  {id: '07', voice: 'ana', target: [10.3, 10.9], az: {show: 'Bəs sən?', caption: ['Bəs sən?']}, en: {show: 'And you?', caption: ['And you?']}},
  {id: '08', voice: 'men', target: [11.3, 12.9],
    az: {show: '[deadpan] Mən?.. Reels-ə baxıram.', say: '[deadpan] Mən?.. Rils-ə baxıram.', caption: ['Mən?..', 'Reels-ə baxıram.']},
    en: {show: '[deadpan] Me? …I watch reels.', caption: ['Me?', '…I watch reels.']}},
  {id: '09', voice: 'ana', target: [13.7, 14.9], az: {show: '[quietly, slowly] Modemi… söndürürəm.', say: '[quietly] Modemi… söndürürəm.', caption: ['Modemi…', 'söndürürəm.']}, en: {show: '[quietly, slowly] I’m… switching off the modem.', say: '[quietly] I’m… switching off the modem.', caption: ['I’m…', 'switching off the modem.']}},
  {id: '10', voice: 'men', target: [15.0, 16.2], az: {show: '[panicking] Yox-yox-yox! Axtarıram!', caption: ['Yox-yox-yox!', 'Axtarıram!']}, en: {show: '[panicking] No-no-no! I’m looking!', caption: ['No-no-no!', 'I’m looking!']}},
  {id: '11', voice: 'men', target: [17.0, 18.2], az: {show: '[whispering] Onun sirri nədir?', say: '[whispers] Onun sirri nədir?', caption: ['Onun sirri nədir?']}, en: {show: '[whispering] What’s his secret?', say: '[whispers] What’s his secret?', caption: ['What’s his secret?']}},
  {id: '12', voice: 'qo', target: [19.4, 20.8], az: {show: '[warmly] Salam! Kömək lazımdır?', say: 'Salam! Kömək lazımdır?', caption: ['Salam!', 'Kömək lazımdır?']}, en: {show: '[warmly] Hi! Need help?', say: 'Hi! Need help?', caption: ['Hi! Need help?']}},
  {id: '13', voice: 'men', target: [21.0, 21.9], az: {show: '[desperate] Sirrin nədir?!', caption: ['Sirrin nədir?!']}, en: {show: '[desperate] What’s your secret?!', caption: ['What’s your secret?!']}},
  {id: '14', voice: 'qo', target: [22.1, 22.9], az: {show: '[smiling] Sirr yoxdur.', caption: ['Sirr yoxdur.']}, en: {show: '[smiling] There’s no secret.', caption: ['There’s no secret.']}},
  {id: '15', voice: 'qo', target: [23.3, 24.2], az: {show: 'VolunTrack.', say: 'Voləntrek.', caption: ['VolunTrack.']}, en: {show: 'VolunTrack.', caption: ['VolunTrack.']}},
  {id: '16', voice: 'men', target: [28.1, 28.9], az: {show: 'Ağac əkdim.', caption: ['Ağac əkdim.']}, en: {show: 'Planted a tree.', caption: ['Planted a tree.']}},
  {id: '17', voice: 'men', target: [29.1, 29.8], az: {show: 'Dərs keçdim.', caption: ['Dərs keçdim.']}, en: {show: 'Taught a class.', caption: ['Taught a class.']}},
  {id: '18', voice: 'men', target: [30.0, 30.8], az: {show: 'Su payladım.', caption: ['Su payladım.']}, en: {show: 'Handed out water.', caption: ['Handed out water.']}},
  {id: '19', voice: 'qq', target: [32.1, 33.2], shout: {az: 2, en: 4},
    az: {show: '[shouting across the courtyard] Qonşunun oğluna bax!', say: '[shouting] Qonşunun oğluna bax!', caption: ['Qonşunun oğluna bax!']},
    en: {show: '[shouting across the courtyard] Look at the neighbor’s son!', say: '[shouting] Look at the neighbor’s son!', caption: ['Look at the', 'neighbor’s son!']}},
  {id: '20', voice: 'ana', target: [33.3, 34.3], shout: {az: 1, en: 1},
    az: {show: '[proudly, shouting] O MƏNİM oğlumdur!', caption: ['O MƏNİM oğlumdur!']},
    en: {show: '[proudly, shouting] That’s MY son!', caption: ['That’s MY son!']}},
  {id: '21', voice: 'men', target: [34.4, 35.9], az: {show: '[smug] İndi qonşunun oğlu mənəm.', caption: ['İndi qonşunun', 'oğlu mənəm.']}, en: {show: '[smug] Now I’m the neighbor’s son.', caption: ['Now I’m the', 'neighbor’s son.']}},
];

/** On-screen text with no voice (section 5). */
export const TEXT: Record<Lang, {title: string; titleSub: string; endLine: string; cta: string; url: string; ageLabel: string; apply: string; typed: string}> = {
  az: {title: 'QONŞUNUN OĞLU', titleSub: '(hər evdə var)', endLine: 'Qonşunun oğlu ol.', cta: 'Qonşunun oğlunu teq et', url: 'voluntrack.site', ageLabel: 'Yaşın', apply: 'Müraciət et', typed: '16'},
  en: {title: 'THE NEIGHBOR’S SON', titleSub: '(every home has one)', endLine: 'Be the neighbor’s son.', cta: 'Tag the neighbor’s son', url: 'voluntrack.site', ageLabel: 'Your age', apply: 'Apply', typed: '16'},
};

/** The UI moment's role cards: generic, no organization names. Ages, format, category. */
export const ROLES: {key: string; age: string; az: {title: string; format: string; category: string}; en: {title: string; format: string; category: string}}[] = [
  {key: 'eco', age: '14–29', az: {title: 'Eko-könüllü', format: 'Bakı', category: 'Ətraf mühit'}, en: {title: 'Eco-volunteer', format: 'Baku', category: 'Environment'}},
  {key: 'translate', age: '16+', az: {title: 'Tərcümə könüllüsü', format: 'Onlayn', category: 'Sosial'}, en: {title: 'Translation volunteer', format: 'Online', category: 'Social & Civic'}},
  {key: 'science', age: '14+', az: {title: 'Elmi layihə könüllüsü', format: 'Onlayn', category: 'Təhsil'}, en: {title: 'Science project volunteer', format: 'Online', category: 'Education'}},
];

/** Window D's typed subtitle (a language pair, not a count). */
export const WINDOW_D_SUBTITLE = {from: 'Hello', to: 'Salam'};

/** Placement rules (section 5 "Placing the voice"). */
export const PLACEMENT = {
  maxShiftFrames: 9,
  maxSpeedup: 0.06,
  /** comic pauses after these lines are never shortened */
  keepPauseAfter: ['08', '14'],
  /** L11 needs room after L10 for the bolt, the door slam and the push into the stairwell (≥ 18 frames). */
  minGapBeforeSec: {'11': 0.6} as Record<string, number>,
  tailSec: 0.3,
};

// ───────────────────────────── Beats (section 6) ─────────────────────────────
//   {w: [line, word index], edge, off}  word start/end + offset (frames)   ·  {line, edge, off}
//   {ref, off}  ·  {abs}  ·  {max: [...]}/{min: [...]}
export type Anchor =
  | {w: [string, number]; edge?: 's' | 'e'; off?: number}
  | {line: string; edge: 's' | 'e'; off?: number}
  | {ref: string; off?: number}
  | {abs: number}
  | {max: Anchor[]}
  | {min: Anchor[]};

export const BEATS: Record<string, Anchor> = {
  // S1 · Hook
  whipStart: {line: '01', edge: 's', off: 15},
  whipLand: {ref: 'whipStart', off: 15},
  sonTurn: {ref: 'whipLand', off: 17},
  title: {max: [{line: '01', edge: 'e', off: 1}, {abs: 70}]},
  // S2 · The legend
  winA: {line: '02', edge: 's'},
  winB: {line: '03', edge: 's'},
  winC: {line: '04', edge: 's'},
  winD: {line: '05', edge: 's'},
  allFour: {line: '06', edge: 's'},
  rays2: {ref: 'allFour', off: 4},
  // S3 · "Bəs sən?"
  whipBack: {line: '06', edge: 'e', off: 6},
  anaDoor: {ref: 'whipBack', off: 5},
  eyesSlide: {w: ['08', 0], edge: 's'},
  silence: {line: '08', edge: 'e', off: 3},
  plugReach: {line: '09', edge: 's'},
  flip: {line: '10', edge: 's', off: 2},
  bolt: {line: '10', edge: 'e'},
  // the push into the stairwell starts 6 frames before the whisper (as in the shot list), at least 10 after the bolt
  push: {max: [{ref: 'bolt', off: 10}, {line: '11', edge: 's', off: -6}]},
  doorSlam: {ref: 'push', off: -4},
  // S4 · The investigation
  tiptoe: {line: '11', edge: 's'},
  catStep: {line: '11', edge: 'e', off: 6},
  tumbleLand: {ref: 'catStep', off: 20},
  offerHand: {line: '12', edge: 's'},
  grab: {line: '13', edge: 's'},
  smile: {line: '14', edge: 's'},
  phoneTurn: {line: '14', edge: 'e', off: 3},
  vtLit: {line: '15', edge: 's'},
  flood: {line: '15', edge: 'e'},
  // S5 · The glow-up
  uiIn: {ref: 'flood', off: 11},
  type1: {ref: 'uiIn', off: 27},
  type6: {ref: 'type1', off: 12},
  cards: {ref: 'uiIn', off: 54},
  tap: {ref: 'uiIn', off: 81},
  cardLand: {ref: 'tap', off: 21},
  deed1: {line: '16', edge: 's'},
  deed2: {line: '17', edge: 's'},
  deed3: {line: '18', edge: 's'},
  bedroomBlue: {line: '18', edge: 'e', off: 6},
  // S6 · The punchline
  wide: {line: '19', edge: 's', off: -3},
  qqPoint: {line: '19', edge: 's'},
  anaBurst: {line: '20', edge: 's'},
  kidStep: {line: '21', edge: 's'},
  kidRays: {line: '21', edge: 'e', off: -15},
  // S7 · End card
  crane: {max: [{line: '21', edge: 'e', off: 3}, {abs: 1080}]},
  ripple: {ref: 'crane', off: 6},
  logo: {ref: 'crane', off: 30},
  endLine: {ref: 'crane', off: 30},
  cta: {ref: 'crane', off: 45},
  resolve: {abs: 1170},
};

export const SHOTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;
