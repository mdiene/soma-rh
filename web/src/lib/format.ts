const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Montant en francs CFA, sans décimales (affichage) — les calculs restent en pleine précision. */
export function fcfa(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return nf0.format(Math.round(n))
}

export function num(v: number | string | null | undefined, digits = 2): string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return digits === 2 ? nf2.format(n) : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n)
}

export function pct(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v) * 100
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)} %`
}

export function date(v: string | null | undefined): string {
  if (!v) return ''
  const [y, m, d] = v.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
/** Abréviations usuelles (juin et juillet restent distincts). */
export const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function monthLabel(period: string | null | undefined): string {
  if (!period) return ''
  const [y, m] = period.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

/** Premier et dernier jour du mois d'une période AAAA-MM-01. */
export function monthBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, '0')}` }
}

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/* -------------------------------------------- montant en toutes lettres (fr) */
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function below100(n: number): string {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  let u = n % 10
  if (t === 7 || t === 9) u += 10
  let word = TENS[t]
  if (u === 0) return t === 8 ? 'quatre-vingts' : word
  if ((u === 1 || u === 11) && t < 8) word += ' et'
  return `${word}${word.endsWith(' et') ? ' ' : '-'}${UNITS[u]}`
}

function below1000(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  let s = ''
  if (h > 0) s = h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 ? 's' : ''}`
  if (r > 0) s = s ? `${s} ${below100(r)}` : below100(r)
  return s
}

export function amountInWords(value: number): string {
  let n = Math.round(Math.abs(value))
  if (n === 0) return 'zéro franc CFA'
  const parts: string[] = []
  const scales: [number, string, string][] = [[1e9, 'milliard', 'milliards'], [1e6, 'million', 'millions']]
  for (const [size, sing, plur] of scales) {
    const q = Math.floor(n / size)
    if (q > 0) { parts.push(`${below1000(q)} ${q > 1 ? plur : sing}`); n %= size }
  }
  const th = Math.floor(n / 1000)
  if (th > 0) {
    parts.push(th === 1 ? 'mille' : `${below1000(th).replace(/cents$/, 'cent')} mille`)
    n %= 1000
  }
  if (n > 0) parts.push(below1000(n))
  return `${parts.join(' ')} francs CFA`
}
