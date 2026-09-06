import { ContexteDeGesteDAtelier, ElementDePointage, IntentionGlobaleDAtelier } from '../../../domain/designation/FenetreOperateur';
import { TypeDElement } from '../../../domain/journal-du-pupitre/JournalDuPupitre';

export const formatDuree = (dureeMs: number): string => {
  const minutes = Math.floor(dureeMs / 60_000);
  const heures = Math.floor(minutes / 60);
  return `${heures} h ${String(minutes % 60).padStart(2, '0')}`;
};

const ZONES: Record<TypeDElement, string> = {
  PRODUIT: 'Moules',
  ORDRE_DE_FABRICATION: 'OF',
};

const COMMANDES_GLOBALES: Record<IntentionGlobaleDAtelier, string> = {
  PAUSE: 'PAUSE',
  REPRENDRE: 'REPRENDRE',
  TOUT_ARRETER: 'TOUT ARRÊTER',
};

export const libelleContexteAtelier = (contexte: ContexteDeGesteDAtelier): string =>
  contexte.kind === 'ELEMENT' ? contexte.numero : COMMANDES_GLOBALES[contexte.intention];

export const LIBELLES_POINTAGE = {
  zones: ZONES,
  nonConformite: 'NC',
  actionPrincipale: (element: ElementDePointage): 'DÉMARRER' | 'ARRÊTER' => (element.isActive() ? 'ARRÊTER' : 'DÉMARRER'),
  actionSecondaire: (element: ElementDePointage): 'NC' | 'BON' => (element.isNonConforme() ? 'BON' : 'NC'),
  duree: (dureeMs: number): string => `depuis ${formatDuree(dureeMs)}`,
  glm: 'GLM',
  glmActif: 'Aucun élément en cours — ton temps de présence est compté ici.',
  glmInactif: 'Ton temps est affecté.',
  actionsGlobales: 'Pointages globaux',
  pause: COMMANDES_GLOBALES.PAUSE,
  reprise: COMMANDES_GLOBALES.REPRENDRE,
  arretTotal: COMMANDES_GLOBALES.TOUT_ARRETER,
  choixPoste: 'Sur quel poste ?',
  element: (numero: string): string => `Élément ${numero}`,
  annuler: 'Annuler',
} as const;

export const LIBELLES_ENTETE_PUPITRE = {
  code: (matricule: string): string => `Code ${matricule}`,
  enLigne: 'En ligne',
  horsLigne: 'Hors ligne',
  fin: "J'ai fini",
} as const;
