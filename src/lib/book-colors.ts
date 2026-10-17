export interface BookColorPalette {
  theme: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBorder: string;
  cardHeaderBg: string;
  dotColor: string;
  ringColor: string;
  calendarBg: string;
  calendarBorder: string;
  calendarText: string;
  calendarDot: string;
  pickerBg: string;
  badge: string;
  indicator: string;
  calendarEvent: string;
  bgLight: string;
  borderPrimary: string;
}

type RawBookColorPalette = Omit<BookColorPalette, 'badge' | 'indicator' | 'calendarEvent' | 'bgLight' | 'borderPrimary'>;

const RAW_PALETTES: Record<string, RawBookColorPalette> = {
  yellow: {
    theme: 'yellow',
    label: 'Amarillo',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    cardBorder: 'border-amber-300',
    cardHeaderBg: 'bg-amber-50/60',
    dotColor: 'bg-amber-400',
    ringColor: 'ring-amber-400',
    calendarBg: 'bg-amber-100 hover:bg-amber-200/80',
    calendarBorder: 'border-amber-500',
    calendarText: 'text-amber-950',
    calendarDot: 'bg-amber-400',
    pickerBg: 'bg-amber-400',
  },
  red: {
    theme: 'red',
    label: 'Rojo',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    badgeBorder: 'border-rose-300',
    cardBorder: 'border-rose-300',
    cardHeaderBg: 'bg-rose-50/60',
    dotColor: 'bg-rose-500',
    ringColor: 'ring-rose-500',
    calendarBg: 'bg-rose-100 hover:bg-rose-200/80',
    calendarBorder: 'border-rose-500',
    calendarText: 'text-rose-950',
    calendarDot: 'bg-rose-500',
    pickerBg: 'bg-rose-500',
  },
  blue: {
    theme: 'blue',
    label: 'Azul',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-300',
    cardBorder: 'border-sky-300',
    cardHeaderBg: 'bg-sky-50/60',
    dotColor: 'bg-sky-500',
    ringColor: 'ring-sky-500',
    calendarBg: 'bg-sky-100 hover:bg-sky-200/80',
    calendarBorder: 'border-sky-500',
    calendarText: 'text-sky-950',
    calendarDot: 'bg-sky-500',
    pickerBg: 'bg-sky-500',
  },
  emerald: {
    theme: 'emerald',
    label: 'Verde Esmeralda',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    cardBorder: 'border-emerald-300',
    cardHeaderBg: 'bg-emerald-50/60',
    dotColor: 'bg-emerald-500',
    ringColor: 'ring-emerald-500',
    calendarBg: 'bg-emerald-100 hover:bg-emerald-200/80',
    calendarBorder: 'border-emerald-500',
    calendarText: 'text-emerald-950',
    calendarDot: 'bg-emerald-500',
    pickerBg: 'bg-emerald-500',
  },
  purple: {
    theme: 'purple',
    label: 'Púrpura / Morado',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    cardBorder: 'border-purple-300',
    cardHeaderBg: 'bg-purple-50/60',
    dotColor: 'bg-purple-500',
    ringColor: 'ring-purple-500',
    calendarBg: 'bg-purple-100 hover:bg-purple-200/80',
    calendarBorder: 'border-purple-500',
    calendarText: 'text-purple-950',
    calendarDot: 'bg-purple-500',
    pickerBg: 'bg-purple-500',
  },
  orange: {
    theme: 'orange',
    label: 'Naranja',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-900',
    badgeBorder: 'border-orange-300',
    cardBorder: 'border-orange-300',
    cardHeaderBg: 'bg-orange-50/60',
    dotColor: 'bg-orange-500',
    ringColor: 'ring-orange-500',
    calendarBg: 'bg-orange-100 hover:bg-orange-200/80',
    calendarBorder: 'border-orange-500',
    calendarText: 'text-orange-950',
    calendarDot: 'bg-orange-500',
    pickerBg: 'bg-orange-500',
  },
  indigo: {
    theme: 'indigo',
    label: 'Índigo',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    cardBorder: 'border-indigo-300',
    cardHeaderBg: 'bg-indigo-50/60',
    dotColor: 'bg-indigo-500',
    ringColor: 'ring-indigo-500',
    calendarBg: 'bg-indigo-100 hover:bg-indigo-200/80',
    calendarBorder: 'border-indigo-500',
    calendarText: 'text-indigo-950',
    calendarDot: 'bg-indigo-500',
    pickerBg: 'bg-indigo-500',
  },
  teal: {
    theme: 'teal',
    label: 'Turquesa',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    cardBorder: 'border-teal-300',
    cardHeaderBg: 'bg-teal-50/60',
    dotColor: 'bg-teal-500',
    ringColor: 'ring-teal-500',
    calendarBg: 'bg-teal-100 hover:bg-teal-200/80',
    calendarBorder: 'border-teal-500',
    calendarText: 'text-teal-950',
    calendarDot: 'bg-teal-500',
    pickerBg: 'bg-teal-500',
  },
  pink: {
    theme: 'pink',
    label: 'Rosa',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-900',
    badgeBorder: 'border-pink-300',
    cardBorder: 'border-pink-300',
    cardHeaderBg: 'bg-pink-50/60',
    dotColor: 'bg-pink-500',
    ringColor: 'ring-pink-500',
    calendarBg: 'bg-pink-100 hover:bg-pink-200/80',
    calendarBorder: 'border-pink-500',
    calendarText: 'text-pink-950',
    calendarDot: 'bg-pink-500',
    pickerBg: 'bg-pink-500',
  },
  slate: {
    theme: 'slate',
    label: 'Pizarra / Gris',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    cardBorder: 'border-slate-300',
    cardHeaderBg: 'bg-slate-100/70',
    dotColor: 'bg-slate-500',
    ringColor: 'ring-slate-500',
    calendarBg: 'bg-slate-100 hover:bg-slate-200/80',
    calendarBorder: 'border-slate-500',
    calendarText: 'text-slate-950',
    calendarDot: 'bg-slate-500',
    pickerBg: 'bg-slate-500',
  },
};

function buildFullPalette(base: RawBookColorPalette): BookColorPalette {
  return {
    ...base,
    badge: `${base.badgeBg} ${base.badgeText} ${base.badgeBorder}`,
    indicator: base.dotColor,
    calendarEvent: `${base.calendarBg} border-l-4 ${base.calendarBorder} ${base.calendarText}`,
    bgLight: base.badgeBg,
    borderPrimary: base.calendarBorder,
  };
}

export const BOOK_COLOR_PALETTES: Record<string, BookColorPalette> = Object.fromEntries(
  Object.entries(RAW_PALETTES).map(([key, raw]) => [key, buildFullPalette(raw)])
);

export const AVAILABLE_BOOK_COLOR_THEMES = Object.values(BOOK_COLOR_PALETTES);

/**
 * Obtiene la paleta visual para un libro a partir de su colorTheme o enum previo
 */
export function getBookColorStyles(colorTheme?: string | null, legacyBook?: string | null): BookColorPalette {
  const rawKey = (colorTheme || '').trim().toLowerCase();
  
  if (rawKey && BOOK_COLOR_PALETTES[rawKey]) {
    return BOOK_COLOR_PALETTES[rawKey];
  }

  // Normalización de nombres en español o variantes comunes
  if (rawKey === 'amarillo' || rawKey === 'amber') return BOOK_COLOR_PALETTES.yellow;
  if (rawKey === 'rojo' || rawKey === 'rose') return BOOK_COLOR_PALETTES.red;
  if (rawKey === 'azul' || rawKey === 'sky') return BOOK_COLOR_PALETTES.blue;
  if (rawKey === 'rosa' || rawKey === 'rosado' || rawKey === 'fuchsia') return BOOK_COLOR_PALETTES.pink;
  if (rawKey === 'verde' || rawKey === 'esmeralda' || rawKey === 'green') return BOOK_COLOR_PALETTES.emerald;
  if (rawKey === 'morado' || rawKey === 'purpura' || rawKey === 'púrpura' || rawKey === 'violeta') return BOOK_COLOR_PALETTES.purple;
  if (rawKey === 'naranja') return BOOK_COLOR_PALETTES.orange;
  if (rawKey === 'turquesa') return BOOK_COLOR_PALETTES.teal;
  if (rawKey === 'gris' || rawKey === 'gray' || rawKey === 'grey' || rawKey === 'pizarra') return BOOK_COLOR_PALETTES.slate;

  // Mapeo retrocompatible con el enum CourseBook previo
  if (legacyBook) {
    const upper = legacyBook.toUpperCase().trim();
    if (upper === 'AMARILLO') return BOOK_COLOR_PALETTES.yellow;
    if (upper === 'ROJO') return BOOK_COLOR_PALETTES.red;
    if (upper === 'AZUL') return BOOK_COLOR_PALETTES.blue;
  }

  return BOOK_COLOR_PALETTES.yellow;
}
