/**
 * Multi-language architecture. Strings resolve through t() so additional
 * locales can be dropped in without touching screens.
 */

type Dict = Record<string, string>;

const en: Dict = {
  'app.title': 'LIE DETECTOR',
  'app.tagline': 'Everyone has a story. Only one version survives the evidence.',
  'menu.cases': 'Case Files',
  'menu.daily': 'Daily Mystery',
  'menu.challenge': 'Challenge a Friend',
  'menu.collection': 'Collection',
  'menu.achievements': 'Achievements',
  'menu.stats': 'Statistics',
  'menu.profile': 'Profile',
  'menu.settings': 'Settings',
  'menu.tutorial': 'Academy',
  'nav.suspects': 'Suspects',
  'nav.evidence': 'Evidence',
  'nav.board': 'Board',
  'nav.timeline': 'Timeline',
  'action.interrogate': 'INTERROGATE',
  'action.accuse': 'FILE ACCUSATION',
  'action.present': 'PRESENT EVIDENCE',
  'action.analyse': 'RUN FORENSIC ANALYSIS',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.continue': 'Continue',
};

const es: Dict = {
  'app.tagline': 'Todos tienen una historia. Solo una sobrevive a las pruebas.',
  'menu.cases': 'Expedientes',
  'menu.daily': 'Misterio Diario',
  'menu.challenge': 'Desafía a un Amigo',
  'menu.collection': 'Colección',
  'menu.achievements': 'Logros',
  'menu.stats': 'Estadísticas',
  'menu.profile': 'Perfil',
  'menu.settings': 'Ajustes',
};

const fr: Dict = {
  'app.tagline': 'Chacun a sa version. Une seule survit aux preuves.',
  'menu.cases': 'Dossiers',
  'menu.daily': 'Mystère du Jour',
  'menu.challenge': 'Défier un Ami',
  'menu.collection': 'Collection',
  'menu.achievements': 'Succès',
  'menu.stats': 'Statistiques',
  'menu.profile': 'Profil',
  'menu.settings': 'Réglages',
};

const LOCALES: Record<string, Dict> = { en, es, fr };
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

let current = 'en';
export function setLanguage(code: string) {
  current = LOCALES[code] ? code : 'en';
}
export function t(key: string): string {
  return LOCALES[current]?.[key] ?? en[key] ?? key;
}
