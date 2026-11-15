// Every string in the reel. Change wording here only.
// Facts used: two antennas (RUTA website: "Two antennas. A compact body."), diversity reception and an
// on-device model that predicts packet loss (the reel brief). No measurements, results or customers.

export type ScriptLine = {vo: string; keyword: string};

// The voice lines, exactly as spoken. The TTS prompt spells the company "Ruta" so v4 does not read
// the capitals as emphasis; captions show it as "RUTA".
export const SCRIPT: ScriptLine[] = [
  {vo: 'Out in the field, sensor data goes missing.', keyword: 'missing'},
  {vo: 'Distance, crops, weather. The signal fades, and readings never arrive.', keyword: 'never arrive'},
  {vo: 'AgLink is a smart field modem, made by RUTA.', keyword: 'AgLink'},
  {vo: 'Two antennas listen at once, and it takes the stronger signal.', keyword: 'stronger signal'},
  {vo: 'An AI model on the device predicts packet loss before it happens, so it can adapt in time.', keyword: 'before it happens'},
  {vo: 'No cloud round trip. The data gets through.', keyword: 'gets through'},
  {vo: 'AgLink. By RUTA.', keyword: ''},
];

// On-screen captions, one entry per voice line. Each line is split into chunks of at most two
// lines, so nothing wraps past two lines at 54 px. A leading "^" marks a keyword word: it turns
// olive as it is spoken. Words map one-to-one, in order, onto the voice's word timings.
// Line 7 has no caption: the end card says it.
export const CAPTIONS: string[][][][] = [
  [[['Out', 'in', 'the', 'field,'], ['sensor', 'data', 'goes', '^missing.']]],
  [
    [['Distance,', 'crops,', 'weather.']],
    [['The', 'signal', 'fades,'], ['and', 'readings', '^never', '^arrive.']],
  ],
  [[['^AgLink', 'is', 'a', 'smart', 'field', 'modem,'], ['made', 'by', 'RUTA.']]],
  [[['Two', 'antennas', 'listen', 'at', 'once,'], ['and', 'it', 'takes', 'the', '^stronger', '^signal.']]],
  [
    [['An', 'AI', 'model', 'on', 'the', 'device'], ['predicts', 'packet', 'loss']],
    [['^before', '^it', '^happens,'], ['so', 'it', 'can', 'adapt', 'in', 'time.']],
  ],
  [[['No', 'cloud', 'round', 'trip.'], ['The', 'data', '^gets', '^through.']]],
  [],
];

// Labels name things. They never show measurements.
export const LABELS = {
  sensor: 'Sensor',
  receiver: 'Receiver',
  distance: 'Distance',
  crops: 'Crops',
  weather: 'Weather',
  received: 'Received',
  rxA: 'RX A',
  rxB: 'RX B',
  out: 'Out',
  aglink: 'AgLink',
  now: 'Now',
  forecastLoss: 'Forecast · Loss',
  onDevice: 'On-device',
  cloud: 'Cloud',
};

export const NAME = 'AgLink';
export const BY = 'by';

// End card. Add the website or Instagram handle here when there is one; empty hides the line.
export const END_CARD = {
  name: 'AgLink',
  line: 'smart field modem',
  handle: '',
};
