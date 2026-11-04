// VolunTrack — "Deadline Passed" reel.
// Every string, voice line and beat rule lives here. Pure data (no imports) so Node scripts can read it too.

export const FPS = 60;
export const DURATION_FRAMES = 2040; // exactly 34.0 s
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type Voice = 'S' | 'V';

export type LineDef = {
  id: string;
  voice: Voice;
  /** The line exactly as written in the script, delivery tags included (sent to the voice). */
  show: string;
  /** Spelling sent to the voice when it differs from `show` (pronunciation fixes only). */
  say?: string;
  /** Target placement on the film timeline, seconds. */
  target: [number, number];
  /** Caption layout: the show text without tags, broken at phrase boundaries (max 2 × 24 chars). */
  caption: string[];
  /** Words (as they appear in the caption) that get echo type. */
  emphasis?: string[];
};

export const LINES: LineDef[] = [
  {id: '01', voice: 'S', show: '[excited] Found one!', target: [0.1, 0.65], caption: ['Found one!']},
  {id: '02', voice: 'S', show: '[deadpan] …It closed in April.', target: [1.15, 2.3], caption: ['…It closed in April.']},
  {id: '03', voice: 'S', show: 'Next.', target: [2.65, 2.95], caption: ['Next.']},
  {id: '04', voice: 'S', show: '[flatly] I’m sixteen.', target: [3.45, 4.05], caption: ['I’m sixteen.']},
  {id: '05', voice: 'S', show: '[hopeful] This one’s open—', target: [4.2, 4.85], caption: ['This one’s open—']},
  {id: '06', voice: 'S', show: '[sighs] DM’d them in June.', target: [5.4, 6.6], caption: ['DM’d them in June.']},
  {id: '07', voice: 'S', show: '[exasperated] Is ANYTHING actually open?!', target: [7.05, 8.55], caption: ['Is ANYTHING', 'actually open?!'], emphasis: ['ANYTHING', 'open?!']},
  {id: '08', voice: 'V', show: 'Yes.', target: [9.1, 9.55], caption: ['Yes.'], emphasis: ['Yes.']},
  {id: '09', voice: 'V', show: 'One feed. Every listing checked.', target: [10.3, 11.95], caption: ['One feed.', 'Every listing checked.']},
  {id: '10', voice: 'V', show: 'Enter your age.', target: [12.05, 12.95], caption: ['Enter your age.']},
  {id: '11', voice: 'S', show: '[hesitant] …Sixteen?', target: [13.25, 13.95], caption: ['…Sixteen?']},
  {id: '12', voice: 'S', show: '[gasps] Wait — they’re all open?', target: [14.9, 16.0], caption: ['Wait —', 'they’re all open?']},
  {id: '13', voice: 'V', show: 'Only roles you can apply to.', target: [16.15, 17.85], caption: ['Only roles you', 'can apply to.']},
  {id: '14', voice: 'V', show: 'Apply — straight to the organizer’s form.', target: [19.6, 21.75], caption: ['Apply — straight to', 'the organizer’s form.']},
  {id: '15', voice: 'V', show: 'No middleman.', target: [21.85, 22.55], caption: ['No middleman.']},
  {id: '16', voice: 'S', show: '[laughs] That’s it?', target: [22.7, 23.2], caption: ['That’s it?']},
  {id: '17', voice: 'V', show: '[warmly] That’s it.', target: [23.3, 23.8], caption: ['That’s it.']},
  {id: '18', voice: 'V', show: 'Run a volunteer program?', target: [23.95, 25.25], caption: ['Run a volunteer', 'program?']},
  {id: '19', voice: 'V', show: 'Post it free — we check it,', target: [25.4, 27.0], caption: ['Post it free —', 'we check it,']},
  {id: '20', voice: 'V', show: 'and students find it.', target: [27.1, 28.3], caption: ['and students find it.']},
  {id: '21', voice: 'V', show: 'VolunTrack.', target: [28.75, 29.45], caption: ['VolunTrack.']},
  {id: '22', voice: 'S', show: 'Find volunteering.', target: [29.6, 30.5], caption: ['Find volunteering.']},
  {id: '23', voice: 'V', show: 'Find volunteers.', target: [30.6, 31.4], caption: ['Find volunteers.']},
  {id: '24', voice: 'V', show: 'Comment your age.', target: [31.65, 32.55], caption: ['Comment your age.']},
];

/** Voice generation settings (section 5). */
export const VOICE = {
  model: 'eleven_v4',
  student: {name: 'Laura', voiceId: 'FGY2WhTYpPnrIDTdsKH5', stability: 0.0},
  vt: {name: 'Will', voiceId: 'bIHbv24MWmeRgasZH58o', stability: 0.5},
  outputFormat: 'mp3_44100_128',
};

/**
 * Placement rules (section 5 "Placing the voice"). Gaps are the minimum silence before a line,
 * sized so the visual beat between the two lines can land between words.
 */
export const PLACEMENT = {
  maxShiftFrames: 12,
  maxSpeedup: 0.06,
  /** Performed sounds ([sighs], [gasps], [laughs]) are kept but capped, never words. */
  nonverbalMaxSec: 0.3,
  /** Pauses inside a line (at a dash or between sentences) are capped. */
  internalPauseMaxSec: 0.22,
  /** LINK EXPIRED cuts L05 off: its last 120 ms are ducked by 15 dB. */
  cutoffLine: '05',
  cutoffDuckMs: 120,
  cutoffDuckDb: 15,
  minGapBeforeSec: {
    '02': 0.38, // DEADLINE PASSED lands between "one!" and "…It"
    '03': 0.2,
    '04': 0.36, // YOUTH card lands on "Next.", 18+ ONLY hits after it
    '05': 0.28, // APPLY HERE post lands on the pile
    '06': 0.32, // DM card slides in, bubble sends
    '07': 0.26, // SEEN swells and hits, the barrage starts under L07
    '08': 0.53, // freeze + half a second of nothing
    '09': 0.62, // rays + quadrant split
    '10': 0.12,
    '11': 0.3,
    '12': 0.78, // ripple, particles, feed snap (the hero moment)
    '13': 0.15,
    '14': 0.9, // categories glide, toggle flips, star arcs to Apply
    '15': 0.12,
    '16': 0.15,
    '17': 0.1,
    '18': 0.12, // the flip starts as L17 ends
    '19': 0.15,
    '20': 0.04,
    '21': 0.36, // dots drift, logo starts forming
    '22': 0.15, // logo resolves on the downbeat at L22
    '23': 0.12,
    '24': 0.2,
  } as Record<string, number>,
  /** The film must leave this much after L24 (hold + 14-frame loop). */
  tailSec: 0.8,
};

/** Music grid (section 7): bars every 120 frames from the music entry. */
export const MUSIC = {
  bpm: 120,
  barFrames: 120,
  entryAfterLine08Frames: 3, // the rays and the cue start right after "Yes."
  applyBar: 5, // S5 ("Apply") lands 5 bars after the entry
  logoBar: 10, // the logo resolves on the downbeat 10 bars after the entry
  resolveBar: 12, // held chord
};

export const SITE = {
  url: 'voluntrack.site',
  qrTarget: 'https://voluntrack.site',
};

// ───────────────────────────── Before world copy ─────────────────────────────

export type Illustration = 'sapling' | 'box' | 'brush' | 'laptop';

export type PostDef = {
  key: string;
  poster: string;
  sub?: string;
  art: Illustration;
  tint: 'sage' | 'sand' | 'rose';
  button?: string;
};

export const POSTS: Record<string, PostDef> = {
  hook: {key: 'hook', poster: 'VOLUNTEERS NEEDED!', sub: 'Apply by April 30', art: 'sapling', tint: 'sage'},
  youth: {key: 'youth', poster: 'YOUTH VOLUNTEERS WANTED!', art: 'box', tint: 'sand'},
  applyHere: {key: 'applyHere', poster: 'VOLUNTEERS NEEDED!', art: 'brush', tint: 'rose', button: 'APPLY HERE'},
  // Barrage + wall cards (anonymous, generic)
  w1: {key: 'w1', poster: 'VOLUNTEERS NEEDED!', art: 'laptop', tint: 'sand'},
  w2: {key: 'w2', poster: 'APPLY HERE', art: 'box', tint: 'rose'},
  w3: {key: 'w3', poster: 'YOUTH VOLUNTEERS WANTED!', art: 'sapling', tint: 'sage'},
  w4: {key: 'w4', poster: 'VOLUNTEERS NEEDED!', art: 'brush', tint: 'sand'},
  w5: {key: 'w5', poster: 'APPLY HERE', art: 'laptop', tint: 'sage'},
  w6: {key: 'w6', poster: 'VOLUNTEERS NEEDED!', art: 'box', tint: 'rose'},
  w7: {key: 'w7', poster: 'YOUTH VOLUNTEERS WANTED!', art: 'brush', tint: 'sage'},
};

export const STAMPS = {
  deadline: 'DEADLINE PASSED',
  adultsOnly: '18+ ONLY',
  linkExpired: 'LINK EXPIRED',
  seen: 'SEEN',
  closed: 'CLOSED',
  full: 'FULL',
};

/** The seven barrage stamps, in order (section 6, S2). */
export const BARRAGE = ['CLOSED', 'FULL', 'CLOSED', 'DEADLINE PASSED', '18+ ONLY', 'CLOSED', 'CLOSED'];

export const DM = {
  bubble: 'Hi! Is this still open?',
  seenLabel: 'Seen · June',
};

// ───────────────────────────── After world copy ─────────────────────────────

export const CATEGORIES = [
  'Social & Civic',
  'Education',
  'Environment',
  'Tech & Media',
  'Arts & Culture',
  'Sports & Health',
  'Events & Logistics',
];

export type RoleDef = {
  key: string;
  title: string;
  format: 'Online' | 'Baku';
  age: string;
  minAge: number;
  category: string;
};

export const ROLES: RoleDef[] = [
  {key: 'eco', title: 'Eco-volunteer', format: 'Baku', age: '14–29', minAge: 14, category: 'Environment'},
  {key: 'science', title: 'Citizen science volunteer', format: 'Online', age: '14+', minAge: 14, category: 'Education'},
  {key: 'adult', title: 'Online volunteer', format: 'Online', age: '18+', minAge: 18, category: 'Social & Civic'},
  {key: 'translate', title: 'Translation volunteer', format: 'Online', age: '16+', minAge: 16, category: 'Social & Civic'},
  {key: 'subtitle', title: 'Subtitle translator', format: 'Online', age: '13+', minAge: 13, category: 'Arts & Culture'},
];

export const UI = {
  ageLabel: 'Enter your age',
  ageTyped: '16',
  ageChip: 'Age 16',
  categoryAll: 'All categories',
  formatOnline: 'Online',
  formatBaku: 'Baku',
  statusOpen: 'Open · until filled',
  statusChecked: 'Checked',
  apply: 'Apply',
  sheetTitle: 'Organizer’s own form',
  sheetFields: ['Full name', 'School or university', 'Why do you want to join?'],
  diagramYou: 'You',
  diagramForm: 'Their form',
  orgTitle: 'Submit a role',
  orgFields: [
    {label: 'Role title', value: 'Weekend clean-up crew'},
    {label: 'Age range', value: '14+'},
    {label: 'Category', value: 'Environment'},
    {label: 'Online or Baku', value: 'Baku'},
    {label: 'Your application form', value: 'Link to your form', placeholder: true},
  ],
  orgSubmit: 'Submit for review',
  orgFree: 'Free',
  orgInReview: 'In review',
  orgChecked: 'Checked',
  ringLabelBefore: 'your followers',
  ringLabelAfter: 'students who are looking',
};

export const END_CARD = {
  headline: ['FIND VOLUNTEERING.', 'FIND VOLUNTEERS.'],
  url: 'voluntrack.site',
  cta: 'Comment your age',
  ctaSub: 'We’ll reply with roles that fit.',
};

// ───────────────────────────── Beats (section 6) ─────────────────────────────
// Every visual hit is an anchor on a word of the measured voice (resolved by src/timeline.ts).
//   {w: [line, word], edge: 's'|'e', off}  word start/end + offset (frames)
//   {w: [line, word], frac}                a fraction of the way through the word
//   {line, edge, off}                      line start/end + offset
//   {ref: beat, off}                       another beat + offset
//   {abs}                                  absolute frame
//   {max: [...]} / {min: [...]}            latest / earliest of several anchors
//   {music: 'rays'|'entry'|'resolve'}      music grid from the placement solver
export type Anchor =
  | {w: [string, string]; edge?: 's' | 'e'; off?: number; frac?: number}
  | {line: string; edge: 's' | 'e'; off?: number}
  | {ref: string; off?: number}
  | {abs: number}
  | {max: Anchor[]}
  | {min: Anchor[]}
  | {music: 'rays' | 'entry' | 'resolve'; off?: number};

export const BEATS: Record<string, Anchor> = {
  // S1 · Hook
  hookLand: {abs: 12},
  stampDeadline: {max: [{line: '01', edge: 'e', off: 6}, {abs: 40}]},
  // S2 · The noise
  youthStart: {w: ['03', 'Next.'], edge: 's', off: -3},
  stamp18: {max: [{line: '03', edge: 'e', off: 4}, {ref: 'youthStart', off: 22}]},
  applyCardStart: {line: '04', edge: 'e', off: 2},
  tapRing: {w: ['05', 'one’s'], edge: 's'},
  stampLink: {w: ['05', 'open—'], edge: 's', off: 4},
  dmStart: {max: [{line: '05', edge: 'e', off: 2}, {ref: 'stampLink', off: 12}]},
  bubbleSend: {ref: 'dmStart', off: 16},
  seenLabel: {w: ['06', 'June.'], edge: 's'},
  seenStamp: {line: '06', edge: 'e', off: 7},
  barrageStart: {ref: 'seenStamp', off: 3},
  freeze: {w: ['07', 'open?!'], edge: 'e'},
  // S3 · The Turn
  lightPoint: {ref: 'freeze', off: 16},
  yes: {line: '08', edge: 's'},
  rays: {music: 'rays'},
  split: {ref: 'rays', off: 8},
  gridFade: {ref: 'rays', off: 24},
  columnDraw: {w: ['09', 'feed.'], edge: 's'},
  checkBadge: {w: ['09', 'checked.'], edge: 's'},
  // S4 · The age field
  stackIn: {line: '09', edge: 'e', off: 3},
  fieldRise: {line: '10', edge: 's'},
  digit1: {w: ['11', '…Sixteen?'], edge: 's'},
  digit6: {w: ['11', '…Sixteen?'], frac: 0.45},
  fieldPulse: {line: '11', edge: 'e', off: 5},
  rippleHit: {ref: 'fieldPulse', off: 8},
  hero: {ref: 'fieldPulse', off: 10},
  openLights: {w: ['12', 'open?'], edge: 's'},
  applyFill: {w: ['13', 'apply'], edge: 's'},
  categoryGlide: {line: '13', edge: 'e', off: 8},
  toggleFlip: {ref: 'categoryGlide', off: 22},
  applyTap: {w: ['14', 'Apply'], edge: 's'},
  // S5 · Apply
  sheetExpand: {ref: 'applyTap', off: 14},
  diagram: {ref: 'applyTap', off: 64},
  middlemanPop: {w: ['15', 'middleman.'], edge: 's'},
  wink: {w: ['17', 'it.'], edge: 's'},
  // S6 · The other side
  flip: {line: '17', edge: 'e', off: 2},
  plusPulse: {w: ['18', 'program?'], edge: 's'},
  formFill: {ref: 'flip', off: 26},
  submitPress: {w: ['19', 'Post'], edge: 's'},
  freeChip: {w: ['19', 'free'], edge: 's'},
  checked: {w: ['19', 'check'], edge: 's'},
  collapse: {line: '20', edge: 's'},
  blowout: {w: ['20', 'students'], edge: 's'},
  drift: {line: '20', edge: 'e'},
  // S7 · End card
  logoRise: {line: '20', edge: 'e', off: 12},
  vtWord: {line: '21', edge: 's'},
  logoResolve: {line: '22', edge: 's'},
  urlQr: {min: [{line: '23', edge: 's', off: 4}, {abs: 1840}]},
  cta: {line: '24', edge: 's'},
  loopStart: {abs: 2026},
  musicEntry: {music: 'entry'},
  musicResolve: {music: 'resolve'},
};

/** Barrage stamp hits relative to barrageStart (f408, 414, 420, 425, 430, 435, 440 in the shot list). */
export const BARRAGE_OFFSETS = [0, 6, 12, 17, 22, 27, 32];
/** After the barrage a new card lands every 10 frames until the freeze. */
export const WALL_EVERY = 10;
