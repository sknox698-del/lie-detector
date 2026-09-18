/**
 * Deterministic seeded RNG (mulberry32) + string hashing.
 * Every case is fully reproducible from its seed, which makes
 * "Challenge a Friend" case-codes work with zero backend.
 */

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class RNG {
  private s: number;
  constructor(seed: number | string) {
    this.s = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }
  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  sample<T>(arr: readonly T[], n: number): T[] {
    return this.shuffle(arr).slice(0, Math.min(n, arr.length));
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Reversible, unambiguous 8-character case code, e.g. "K7QM-3XPD".
 * 7 characters encode the 32-bit seed, the 8th encodes the difficulty tier,
 * so a code alone fully reconstructs a case with zero backend.
 */
export function caseCode(seed: number, difficultyIndex: number): string {
  let n = seed >>> 0;
  let out = '';
  for (let i = 0; i < 7; i++) {
    out += CODE_ALPHABET[n % 32];
    n = Math.floor(n / 32);
  }
  out += CODE_ALPHABET[Math.max(0, Math.min(31, difficultyIndex))];
  return out.slice(0, 4) + '-' + out.slice(4);
}

export function parseCaseCode(code: string): { seed: number; difficultyIndex: number } | null {
  const c = (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 8) return null;
  let seed = 0;
  for (let i = 6; i >= 0; i--) {
    const idx = CODE_ALPHABET.indexOf(c[i]);
    if (idx < 0) return null;
    seed = seed * 32 + idx;
  }
  const d = CODE_ALPHABET.indexOf(c[7]);
  if (d < 0 || d > 5) return null;
  if (seed > 0xffffffff) return null;
  return { seed: seed >>> 0, difficultyIndex: d };
}

export function dailySeed(date = new Date()): number {
  const key = `DAILY::${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  return hashString(key);
}

export function weeklySeed(date = new Date()): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return hashString(`WEEKLY::${d.getUTCFullYear()}-W${week}`);
}
