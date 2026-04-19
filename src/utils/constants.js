export const PAC_TARGETS = {
  '-11': { low: 18, high: 20 },
  '-12': { low: 19, high: 21 },
  '-14': { low: 22, high: 24 },
  '-16': { low: 25, high: 27 },
  '-18': { low: 28, high: 30 },
  '-20': { low: 30, high: 32 },
}

export const SORBET_PAC_TARGETS = {
  '-11': { low: 21, high: 24 },
  '-12': { low: 22, high: 25 },
  '-14': { low: 25, high: 28 },
  '-16': { low: 28, high: 32 },
  '-18': { low: 31, high: 35 },
  '-20': { low: 33, high: 38 },
}

// FPD value → POD multiplier
export const FPD_TO_POD = {
  '1.0': 1.00,
  '1.9': 0.74,
  '1.4': 0.80,
  '0.8': 0.48,
  '1.5': 1.10,
  '0':   0,
}

// Base sugar coefficients — verify lactose.fpd in gelato_pro_v6.html if results differ
export const SUGAR_COEFFS = {
  sucrose:   { fpd: 1.0, pod: 1.00 },
  dextrose:  { fpd: 1.9, pod: 0.74 },
  glucose42: { fpd: 0.8, pod: 0.48 },
  lactose:   { fpd: 0.2, pod: 0.16 },
}

export const STAB_PRESETS = {
  base50c: { name: 'Aromitalia Base 50C',      rec: 50,  fat: 0, sug: 30, carb: 85, prot: 0, ts: 95, fpd: '1.0', cost: 6.00 },
  base100: { name: 'Aromitalia Base 100',       rec: 100, fat: 0, sug: 50, carb: 90, prot: 0, ts: 95, fpd: '1.0', cost: 4.50 },
  neutro:  { name: 'Neutro (stabilizer only)',  rec: 5,   fat: 0, sug: 0,  carb: 10, prot: 0, ts: 95, fpd: '1.0', cost: 12.00 },
  custom:  { name: 'Custom Base',               rec: 50,  fat: 0, sug: 0,  carb: 0,  prot: 0, ts: 95, fpd: '1.0', cost: 5.00 },
}

export const ADVANCED_SUGARS = [
  { id: 'trehalose',  label: 'Τρεχαλόζη',               fpd: 0.45, pod: 0.45, dm: 1.00 },
  { id: 'invert',     label: 'Αντεστραμμένη γλυκόζη',   fpd: 1.90, pod: 1.20, dm: 1.00 },
  { id: 'fructose',   label: 'Φρουκτόζη',                fpd: 1.80, pod: 1.70, dm: 1.00 },
  { id: 'honey',      label: 'Μέλι (80% ξηρά ουσία)',    fpd: 1.50, pod: 1.30, dm: 0.80 },
  { id: 'agave',      label: 'Σιρόπι Αγαύης (75% ξ.ο.)', fpd: 1.60, pod: 1.40, dm: 0.75 },
  { id: 'maltodex',   label: 'Μαλτοδεξτρίνη DE10',       fpd: 0.10, pod: 0.05, dm: 1.00 },
  { id: 'isomalt',    label: 'Ισομαλτιτόλη',             fpd: 0.50, pod: 0.45, dm: 1.00 },
  { id: 'erythritol', label: 'Ερυθριτόλη',                fpd: 2.00, pod: 0.65, dm: 1.00 },
]

export const PRO_INGREDIENTS = [
  { id: 'dark_choc',  label: 'Κουβερτούρα μαύρη 70%',        fat: 38, sug: 32, carb: 47, prot: 5,  ts: 97, fpd: '1.0', defaultCost: 8.00 },
  { id: 'white_choc', label: 'Κουβερτούρα λευκή',             fat: 36, sug: 46, carb: 60, prot: 6,  ts: 98, fpd: '1.0', defaultCost: 7.00 },
  { id: 'milk_choc',  label: 'Κουβερτούρα γάλακτος',          fat: 33, sug: 47, carb: 58, prot: 7,  ts: 98, fpd: '1.0', defaultCost: 6.50 },
  { id: 'hazelnut',   label: 'Φουντουκόπαστα 100%',           fat: 60, sug: 5,  carb: 10, prot: 14, ts: 99, fpd: '1.0', defaultCost: 14.00 },
  { id: 'pistachio',  label: 'Πιστακιόπαστα 100%',            fat: 50, sug: 5,  carb: 15, prot: 18, ts: 99, fpd: '1.0', defaultCost: 40.00 },
  { id: 'almond',     label: 'Αμυγδαλόπαστα 100%',            fat: 50, sug: 5,  carb: 12, prot: 20, ts: 98, fpd: '1.0', defaultCost: 18.00 },
  { id: 'peanut',     label: 'Φυστικοβούτυρο',                fat: 50, sug: 8,  carb: 20, prot: 25, ts: 98, fpd: '1.0', defaultCost: 5.00 },
  { id: 'egg_yolk',   label: 'Κρόκοι αυγών',                  fat: 27, sug: 0,  carb: 3,  prot: 16, ts: 50, fpd: '0',   defaultCost: 5.00 },
  { id: 'honey',      label: 'Μέλι',                           fat: 0,  sug: 80, carb: 82, prot: 0,  ts: 82, fpd: '1.5', defaultCost: 8.00 },
  { id: 'tahini',     label: 'Ταχίνι',                         fat: 55, sug: 0,  carb: 20, prot: 18, ts: 98, fpd: '0',   defaultCost: 6.00 },
  { id: 'caramel',    label: 'Σάλτσα καραμέλας',              fat: 8,  sug: 55, carb: 70, prot: 2,  ts: 80, fpd: '1.0', defaultCost: 5.00 },
  { id: 'nutella',    label: 'Φουντουκόκρεμα (Nutella type)', fat: 30, sug: 55, carb: 58, prot: 6,  ts: 88, fpd: '1.0', defaultCost: 6.00 },
  { id: 'speculoos',  label: 'Κρέμα Speculoos',               fat: 22, sug: 35, carb: 55, prot: 5,  ts: 85, fpd: '1.0', defaultCost: 7.00 },
]
