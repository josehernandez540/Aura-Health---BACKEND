const ACCENTS = {
  a: 'áàäâ',
  e: 'éèëê',
  i: 'íìïî',
  o: 'óòöô',
  u: 'úùüû',
  n: 'ñ',
};

const ACCENT_MAP = Object.entries(ACCENTS).reduce((map, [plain, accented]) => {
  accented.split('').forEach((ch) => {
    map[ch] = plain;
    map[ch.toUpperCase()] = plain.toUpperCase();
  });
  return map;
}, {});

const stripAccents = (value) =>
  value
    .split('')
    .map((ch) => ACCENT_MAP[ch] ?? ch)
    .join('');

export const slugify = (value) =>
  stripAccents((value ?? '').toString())
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const todayStamp = () => new Date().toISOString().slice(0, 10);
