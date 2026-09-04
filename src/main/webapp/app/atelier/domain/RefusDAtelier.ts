export const CODES_QUE_LES_PORTS_ATTEIGNENT = [
  'suivi-d-atelier-introuvable',
  'operateur-introuvable',
  'poste-de-travail-introuvable',
  'aucune-journee-de-travail-en-cours',
  'operateur-non-habilite',
  'suivi-d-atelier-cloture',
  'transition-d-atelier-interdite',
  'transition-de-presence-interdite',
  'journee-de-travail-deja-ouverte',
  'saisie-concurrente',
] as const;

export type CodeDeRefusDAtelier = (typeof CODES_QUE_LES_PORTS_ATTEIGNENT)[number];

export class RefusDAtelier extends Error {
  constructor(
    readonly code: CodeDeRefusDAtelier,
    message: string,
  ) {
    super(message);
  }
}
