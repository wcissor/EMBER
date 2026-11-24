// VolunTrack — "Qonşunun qızı" (part 2 of "Qonşunun oğlu"). Every string, voice line and beat rule. Pure data.
// Azerbaijani only; the `en` fields mirror `az` so part 1's typed helpers keep working.

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type Lang = 'az' | 'en';
export const LANGS: Lang[] = ['az'];
export type Voice = 'ana' | 'men' | 'qo' | 'qq' | 'qz';
export const VOICES: Voice[] = ['ana', 'men', 'qo', 'qq', 'qz'];

const SP = {ana: 'ANA', men: 'MƏN', qo: 'QONŞUNUN OĞLU', qq: 'QONŞU', qz: 'QONŞUNUN QIZI'};
export const SPEAKERS: Record<Lang, Record<Voice, string>> = {az: SP, en: SP};

/** show: the approved line (delivery tags in brackets, never spoken). say: what is sent to the voice when it differs
 *  (respellings only; every spoken word is the script's). caption: rows as captioned. */
export type LineText = {show: string; say?: string; caption: string[]};
export type LineDef = {
  id: string;
  voice: Voice;
  /** which take file holds the line (default: the voice). 'men-p1' = part 1's recording of the callback line. */
  take?: string;
  az: LineText;
  en: LineText;
  /** target placement on the film timeline, seconds */
  target: [number, number];
  /** shouted lines shake 2 px for 6 frames on their loudest word (index into the caption words) */
  shout?: {az: number; en: number};
  /** caption speaker tag override (lines two characters say together) */
  speaker?: string;
  /** spoken with another line at the same time: no caption of its own */
  silentCaption?: boolean;
};

const L = (id: string, voice: Voice, target: [number, number], az: LineText, extra: Partial<LineDef> = {}): LineDef => ({id, voice, target, az, en: az, ...extra});

export const LINES: LineDef[] = [
  // 1 · Hook: the comment, the door, the title
  L('P01', 'ana', [0.85, 2.05], {show: '[shouting] Necə yəni olmur?!', caption: ['Necə yəni olmur?!']}, {shout: {az: 2, en: 2}}),
  // 2 · The column
  L('P02', 'men', [3.05, 4.5], {show: '[smug] İndi qonşunun oğlu mənəm.', caption: ['İndi qonşunun', 'oğlu mənəm.']}, {take: 'men-p1'}),
  L('P03', 'ana', [4.8, 5.95], {show: '[shouting] Qonşunun qızına bax!', caption: ['Qonşunun qızına bax!']}, {shout: {az: 2, en: 2}}),
  L('P04', 'men', [6.6, 7.4], {show: '[shocked] Yenə?!', caption: ['Yenə?!']}),
  // 3 · The deeds
  L('P05', 'ana', [7.75, 8.8], {show: '[proudly] Həyəti təmizlətdi.', caption: ['Həyəti təmizlətdi.']}),
  L('P06', 'ana', [9.05, 10.2], {show: 'Uşaqlara kitab yığdı.', caption: ['Uşaqlara kitab yığdı.']}),
  L('P07', 'ana', [10.45, 11.95], {show: 'Bütün bina onun dalınca gedir.', caption: ['Bütün bina', 'onun dalınca gedir.']}),
  L('P08', 'ana', [12.15, 13.25], {show: '[incredulous] Cəmi on beş yaşı var!', caption: ['Cəmi on beş yaşı var!']}),
  L('P09', 'men', [13.55, 16.11], {show: '[whining] Ana, axı mən də qonşunun oğluyam!', caption: ['Ana, axı mən də', 'qonşunun oğluyam!']}),
  L('P10', 'ana', [16.35, 17.7], {show: '[dryly] Qonşunun qızı başqa səviyyədir.', caption: ['Qonşunun qızı', 'başqa səviyyədir.']}),
  // 4 · The stairwell
  L('P11', 'men', [18.9, 19.62], {show: '[determined] Bu dəfə yox.', caption: ['Bu dəfə yox.']}),
  L('P12', 'men', [20.3, 21.45], {show: '[curious] Sənin sirrin nədir?', caption: ['Sənin sirrin nədir?']}),
  L('P13', 'qo', [21.8, 24.52], {show: '[sheepish] Etiraf edirəm… VolunTrack-i mənə o göstərib.', say: '[sheepish] Etiraf edirəm… Voləntreki mənə o göstərib.', caption: ['Etiraf edirəm…', 'VolunTrack-i mənə o göstərib.']}),
  // 5 · The phone
  L('P14', 'qz', [25.2, 26.6], {show: '[casually] Linki atdım, aç.', caption: ['Linki atdım, aç.']}),
  L('P15', 'men', [27.0, 28.15], {show: '[surprised] Qeydiyyatsız açıldı?', caption: ['Qeydiyyatsız açıldı?']}),
  L('P16', 'qz', [28.4, 31.55], {show: '[calm] Baxmağa hesab lazım deyil. Müraciət bir dəqiqəlik işdir.', caption: ['Baxmağa hesab lazım deyil.', 'Müraciət bir dəqiqəlik işdir.']}),
  // 6 · Morning
  L('P17', 'qq', [32.7, 33.55], {show: '[shouting] Qızıma bax!', caption: ['Qızıma bax!']}, {shout: {az: 1, en: 1}}),
  L('P18', 'ana', [33.75, 34.6], {show: '[proudly] Oğluma bax!', caption: ['Oğluma bax!']}, {shout: {az: 1, en: 1}}),
  L('P19', 'ana', [34.95, 36.05], {show: '[softly] …Həyətimizə bax.', caption: ['…Həyətimizə bax.']}, {speaker: 'ANA VƏ QONŞU'}),
  L('P19b', 'qq', [34.95, 36.05], {show: '[softly] …Həyətimizə bax.', caption: ['…Həyətimizə bax.']}, {silentCaption: true}),
  // 7 · To camera
  L('P20', 'qz', [37.0, 38.9], {show: '[warmly] Ola bilərsiniz. Növbə sizdədir.', caption: ['Ola bilərsiniz.', 'Növbə sizdədir.']}),
];

/** On-screen text with no voice. Comment bubbles carry the comment's exact text and nothing else (no names, no photos). */
export const TEXT = {
  title: 'QONŞUNUN QIZI',
  titleSub: '(o da var)',
  part: '2-ci hissə',
  bubble1: 'qonşunun qızı olmur?',
  bubble2: 'Qonşunun qızı ola bilərik?',
  endLine: 'Qonşunun qızı ol.',
  url: 'voluntrack.site',
  cta: 'Qonşunun qızını teq et',
};

/** The phone scene's demo data: a fictional organiser and role, no counts, no real people. */
export const DEMO = {
  sender: 'Qonşunun qızı',
  message: 'Linki atdım 👇',
  org: 'Həyət Könüllüləri',
  role: 'Həyət təmizliyi',
  category: 'Ətraf mühit',
  place: 'Bakı',
  age: '14+',
  when: 'Şənbə, 10:00',
  about: 'Həyəti birlikdə təmizləyirik, kitab rəfi qururuq.',
  signUp: 'Müraciət üçün daxil ol',
  apply: 'Müraciət et',
  applied: 'Müraciət edildi',
  formTitle: 'Həyət Könüllüləri · qeydiyyat forması',
  email: 'demo@voluntrack.site',
};

/** Part 1's window D (kept for the shared stage kit). */
export const WINDOW_D_SUBTITLE = {from: 'Hello', to: 'Salam'};

/** Placement rules (part 1's): lines start on target, never sped up by more than 6%, comic pauses kept. */
export const PLACEMENT = {
  maxShiftFrames: 9,
  maxSpeedup: 0.06,
  keepPauseAfter: ['P02', 'P04', 'P10'],
  minGapBeforeSec: {} as Record<string, number>,
  tailSec: 0.3,
};

// ───────────────────────────── Beats ─────────────────────────────
//   {w: [line, word index], edge, off}  ·  {line, edge, off}  ·  {ref, off}  ·  {abs}  ·  {max: [...]}/{min: [...]}
export type Anchor =
  | {w: [string, number]; edge?: 's' | 'e'; off?: number}
  | {line: string; edge: 's' | 'e'; off?: number}
  | {ref: string; off?: number}
  | {abs: number}
  | {max: Anchor[]}
  | {min: Anchor[]};

export const BEATS: Record<string, Anchor> = {
  // 1 · Hook (0–2.8 s): the comment bubble pops, Mom's balcony door bangs open, the title stamps on the beat
  bubble1: {abs: 5},
  doorBang: {line: 'P01', edge: 's', off: -9},
  title: {max: [{line: 'P01', edge: 'e', off: 3}, {abs: 64}]},
  // 2 · The column (2.8–7.5 s)
  s2: {line: 'P02', edge: 's', off: -7},
  whipToHer: {line: 'P03', edge: 's', off: -5},
  herWin: {line: 'P03', edge: 's', off: 7},
  column: {ref: 'herWin', off: 7},
  faceDrop: {line: 'P04', edge: 's', off: -2},
  cutToKid: {ref: 'faceDrop', off: -7},
  musicStop: {line: 'P04', edge: 's', off: -6},
  // 3 · The deeds
  deed1: {line: 'P05', edge: 's'},
  deed2: {line: 'P06', edge: 's'},
  deed3: {line: 'P07', edge: 's'},
  count: {line: 'P08', edge: 's', off: -2},
  whine: {line: 'P09', edge: 's', off: -3},
  whinePunch: {w: ['P09', 4], edge: 's', off: -2},
  level: {line: 'P10', edge: 's', off: -2},
  button: {line: 'P10', edge: 'e', off: 1},
  // 4 · The stairwell
  stairs: {line: 'P10', edge: 'e', off: 14},
  catOver: {line: 'P11', edge: 's', off: -16},
  bump: {line: 'P12', edge: 's', off: -17},
  nodUp: {line: 'P13', edge: 's', off: -12},
  sting: {w: ['P13', 4], edge: 's', off: -1},
  // 5 · The phone
  phoneIn: {line: 'P13', edge: 'e', off: 9},
  msgPop: {line: 'P14', edge: 's', off: -5},
  linkTap: {line: 'P14', edge: 'e', off: 5},
  pageOpen: {ref: 'linkTap', off: 7},
  signTap: {line: 'P16', edge: 's', off: 4},
  applyTap: {ref: 'signTap', off: 24},
  formFlash: {ref: 'applyTap', off: 5},
  backRole: {ref: 'formFlash', off: 12},
  tick: {ref: 'backRole', off: 5},
  winGlow: {max: [{line: 'P16', edge: 'e', off: -6}, {ref: 'tick', off: 16}]},
  // 6 · Morning
  morning: {ref: 'winGlow', off: 20},
  qqPoint: {line: 'P17', edge: 's', off: -2},
  anaPoint: {line: 'P18', edge: 's', off: -2},
  soften: {line: 'P19', edge: 's', off: -4},
  // 7 · To camera
  bubble2: {line: 'P19', edge: 'e', off: 6},
  toCam: {line: 'P20', edge: 's', off: -8},
  musicLift: {line: 'P20', edge: 'e', off: 2},
  // 8 · The star, then back to frame 0
  dusk: {line: 'P20', edge: 'e', off: 8},
  starOn: {ref: 'dusk', off: 6},
  logo: {ref: 'starOn', off: 34},
  endLine: {ref: 'starOn', off: 30},
  cta: {ref: 'starOn', off: 44},
  loopBack: {ref: 'starOn', off: 64},
  end: {ref: 'loopBack', off: 20},
};

export const SHOTS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'] as const;
