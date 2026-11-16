// Every string on screen, in both languages, and the word anchors that time each cut.
// Numbers and their sources: see sources.md. Company figures are labelled as the maker's.

export type Lang = 'en' | 'az';
export type LineId = 'H1' | 'H2' | 'H3' | 'B1' | 'B1b' | 'B2' | 'B3' | 'B4' | 'B4s' | 'B5' | 'B6' | 'B7' | 'B8';
export type Variant = 'A' | 'B' | 'C';

/**
 * Captions: one string per chunk (2-4 words), words separated by spaces.
 * "*word" turns olive. "word+2" is one caption word covering two spoken words ("10,000" for "ten thousand").
 * The caption words, counted this way, match the voice words one to one.
 */
export const CAPTIONS: Record<Lang, Record<LineId, string[]>> = {
  en: {
    H1: ['Investors poured *billions', 'into indoor farms.', 'Many of the biggest', 'went *bust.'],
    B1: ['The real farm revolution', 'is happening *outside.'],
    B2: ['A US robot', 'spots *weeds', 'with AI', 'and burns them', 'with *lasers.', 'Up to *10,000+2', 'a minute,', 'its maker says.'],
    B3: ['China now has', 'over *300,000', 'farm *drones.'],
    B4: ['In New Zealand,', 'cows wear', '*solar *collars.', '*Sound and *vibration', 'steer them.', 'The fence', 'is an *app.'],
    B4s: ['They wear', '*solar *collars.', '*Sound and *vibration', 'steer them.', 'The fence', 'is an *app.'],
    B5: ['European *satellites', 'photograph every field', 'on Earth', 'every *5 *days.', 'For *free.'],
    B6: ['Why now?', 'About *70%+2', 'of the fresh water', 'we use', 'goes to *farming.'],
    B7: ['In *Azerbaijan,', 'over *a *third', 'of all workers', 'are in agriculture.', 'So this is', 'our *future too.'],
    B8: [],
    H2: ["There's a robot", 'that burns weeds', 'with *lasers.', 'Up to *10,000+2', 'a minute.'],
    B1b: ["And that's just one", 'of the technologies', 'changing farming', 'right *now.'],
    H3: ['In New Zealand,', 'some cows', "don't need", '*fences anymore.'],
  },
  az: {
    H1: ['İnvestorlar qapalı fermalara', '*milyardlarla *dollar qoydu.', 'Ən böyüklərinin bir çoxu', '*iflas *etdi.'],
    B1: ['Əsl inqilab isə', '*açıq *tarlada gedir.'],
    B2: ['Amerikada bir robot', '*alaq *otlarını', 'süni intellektlə tapır', 'və *lazerlə yandırır.', 'İstehsalçısına görə,', 'dəqiqədə *10 *minə qədər.'],
    B3: ['Çində artıq', '*300 *mindən çox', 'kənd təsərrüfatı *dronu var.'],
    B4: ['Yeni Zelandiyada inəklər', 'günəş enerjili *boyunluq taxır.', '*Səs və *titrəmə', 'onları yönləndirir.', 'Hasar isə', 'telefondakı *tətbiqdir.'],
    B4s: ['Onlar günəş enerjili', '*boyunluq taxır.', '*Səs və *titrəmə', 'onları yönləndirir.', 'Hasar isə *tətbiqdir.'],
    B5: ['Avropa *peykləri', 'hər *5 *gündən bir', 'Yer üzündəki', 'hər tarlanı çəkir.', '*Pulsuz.'],
    B6: ['Niyə məhz indi?', 'İstifadə etdiyimiz şirin suyun', 'təxminən *70 *faizi', 'kənd təsərrüfatına gedir.'],
    B7: ['*Azərbaycanda işləyənlərin', '*üçdə *birindən çoxu', 'kənd təsərrüfatındadır.', 'Deməli, bu,', 'bizim də *gələcəyimizdir.'],
    B8: [],
    H2: ['Alaq otlarını *lazerlə', 'yandıran robot var.', 'Dəqiqədə *10 *minə qədər.'],
    B1b: ['Və bu,', 'bu gün kənd təsərrüfatını', 'dəyişən texnologiyalardan', 'yalnız *biridir.'],
    H3: ['Yeni Zelandiyada', 'bəzi inəklərə', 'artıq *hasar lazım deyil.'],
  },
};

/** Word anchors (0-based voice word index) for cuts and reveals, per language. */
export const ANCHORS: Record<Lang, Record<LineId, Record<string, number>>> = {
  en: {
    H1: {cut1: 3, cut2: 6, money: 6, bust: 11},
    B1: {cut1: 3, big: 6},
    B2: {spot: 3, cut1: 7, burn: 8, laser: 11, cut2: 12, count: 14, cut3: 18},
    B3: {cut1: 4, count: 4},
    B4: {cut1: 4, collar: 5, cut2: 7, sound: 7, vib: 9, cut3: 12, app: 16},
    B4s: {collar: 2, cut1: 4, sound: 4, vib: 6, cut2: 9, app: 13},
    B5: {cut1: 3, field: 4, days: 7, cut2: 9, free: 10},
    B6: {cut1: 2, count: 3, cut2: 9},
    B7: {land: 1, count: 2, cut1: 4, cut2: 11},
    B8: {},
    H2: {cut1: 4, burn: 4, laser: 7, cut2: 8},
    B1b: {cut1: 6},
    H3: {cut1: 5},
  },
  az: {
    H1: {cut1: 3, cut2: 6, money: 6, bust: 10},
    B1: {cut1: 2, big: 3},
    B2: {spot: 3, cut1: 8, burn: 9, laser: 9, cut2: 11, count: 14, cut3: 14},
    B3: {cut1: 2, count: 2},
    B4: {cut1: 3, collar: 5, cut2: 7, sound: 7, vib: 9, cut3: 12, app: 15},
    B4s: {collar: 3, cut1: 5, sound: 5, vib: 7, cut2: 10, app: 12},
    B5: {days: 2, cut1: 6, field: 9, cut2: 11, free: 11},
    B6: {cut1: 5, count: 8, cut2: 10},
    B7: {land: 0, count: 2, cut1: 4, cut2: 7},
    B8: {},
    H2: {cut1: 3, burn: 3, laser: 2, cut2: 6},
    B1b: {cut1: 6},
    H3: {cut1: 4},
  },
};

/** A big number: optional kicker above, the number (counts up unless count is false), lines below, a small note. */
export type Num = {kicker?: string; value: number; final: string; prefix?: string; suffix?: string; sub?: string[]; note?: string; count?: boolean};

type Texts = {
  money: Num; bankrupt: string; srcH1: string;
  outside: string[];
  illustration: string; c10k: Num; srcB2: string;
  c300k: Num; srcB3: string;
  nz: string; collar: string; sound: string; vibration: string; fence: string; srcB4: string;
  orbit: string; days: Num; free: string; srcB5: string; kansas: string; s2credit: string; nasa: string;
  c70: Num; srcB6: string;
  aze: string; c36: Num; srcB7: string; kura: string; mapCredit: string;
  question: string[]; questionKey: number; options: string;
};

export const TEXT: Record<Lang, Texts> = {
  en: {
    money: {kicker: 'NEARLY', value: 1, final: '$1B', count: false, sub: ['raised.']}, bankrupt: 'Filed for bankruptcy.', srcH1: 'SOURCE: TECHCRUNCH 2025 · PLENTY',
    outside: ['OUTSIDE.'],
    illustration: 'ILLUSTRATION', c10k: {value: 10000, final: '10,000', sub: ['a minute'], note: "MAKER'S FIGURE"}, srcB2: 'SOURCE: CARBON ROBOTICS 2025',
    c300k: {value: 300000, final: '300,000+', suffix: '+', sub: ['farm drones in China']}, srcB3: 'SOURCE: CLEANTECHNICA 2026',
    nz: 'NEW ZEALAND', collar: 'SOLAR COLLAR', sound: 'SOUND', vibration: 'VIBRATION', fence: 'VIRTUAL FENCE · ILLUSTRATION', srcB4: 'SOURCE: HALTER',
    orbit: 'SENTINEL-2 ORBIT · DIAGRAM', days: {kicker: 'EVERY', value: 5, final: '5', count: false, sub: ['days.']}, free: 'Free.', srcB5: 'SOURCE: ESA · COPERNICUS',
    kansas: 'KANSAS, USA · 2 AUG 2026', s2credit: 'CONTAINS MODIFIED COPERNICUS SENTINEL DATA 2026', nasa: 'IMAGERY: NASA',
    c70: {value: 70, final: '≈70%', prefix: '≈', suffix: '%', sub: ['of the fresh water we use']}, srcB6: 'SOURCE: FAO AQUASTAT 2025',
    aze: 'AZERBAIJAN', c36: {value: 36, final: '36%', suffix: '%', sub: ['of workers']}, srcB7: 'SOURCE: WORLD BANK 2023', kura: 'KURA–ARAZ LOWLAND · 23 JUL 2026',
    mapCredit: 'IMAGERY: NASA · BORDER: NATURAL EARTH',
    question: ['Which', 'one', 'would', 'you', 'bring', 'to', 'your', 'village', 'first?'], questionKey: 7, options: 'LASERS · DRONES · COLLARS · SATELLITES',
  },
  az: {
    money: {kicker: 'TƏXMİNƏN', value: 1, final: '1 mlrd $', count: false, sub: ['cəlb edildi.']}, bankrupt: 'İflas üçün müraciət etdi.', srcH1: 'MƏNBƏ: TECHCRUNCH 2025 · PLENTY',
    outside: ['AÇIQ', 'TARLADA.'],
    illustration: 'İLLÜSTRASİYA', c10k: {kicker: 'DƏQİQƏDƏ', value: 10000, final: '10 000', note: 'İSTEHSALÇININ RƏQƏMİ'}, srcB2: 'MƏNBƏ: CARBON ROBOTICS 2025',
    c300k: {kicker: 'ÇİNDƏ', value: 300000, final: '300 000+', suffix: '+', sub: ['kənd təsərrüfatı dronu']}, srcB3: 'MƏNBƏ: CLEANTECHNICA 2026',
    nz: 'YENİ ZELANDİYA', collar: 'GÜNƏŞ ENERJİLİ BOYUNLUQ', sound: 'SƏS', vibration: 'TİTRƏMƏ', fence: 'VİRTUAL HASAR · İLLÜSTRASİYA', srcB4: 'MƏNBƏ: HALTER',
    orbit: 'SENTINEL-2 ORBİTİ · SXEM', days: {kicker: 'HƏR', value: 5, final: '5', count: false, sub: ['gündən bir.']}, free: 'Pulsuz.', srcB5: 'MƏNBƏ: ESA · COPERNICUS',
    kansas: 'KANZAS, ABŞ · 2 AVQ 2026', s2credit: 'CONTAINS MODIFIED COPERNICUS SENTINEL DATA 2026', nasa: 'TƏSVİR: NASA',
    c70: {kicker: 'İSTİFADƏ ETDİYİMİZ ŞİRİN SUYUN', value: 70, final: '≈70%', prefix: '≈', suffix: '%'}, srcB6: 'MƏNBƏ: FAO AQUASTAT 2025',
    aze: 'AZƏRBAYCAN', c36: {kicker: 'İŞLƏYƏNLƏRİN', value: 36, final: '36%', suffix: '%'}, srcB7: 'MƏNBƏ: DÜNYA BANKI 2023', kura: 'KÜR-ARAZ OVALIĞI · 23 İYUL 2026',
    mapCredit: 'TƏSVİR: NASA · SƏRHƏD: NATURAL EARTH',
    question: ['Sən', 'kəndinə', 'ilk', 'hansını', 'gətirərdin?'], questionKey: 1, options: 'LAZER · DRON · BOYUNLUQ · PEYK',
  },
};
