export const CODES_DE_REFUS_D_ATELIER = [
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

export type CodeDeRefusDAtelier = (typeof CODES_DE_REFUS_D_ATELIER)[number];

export class RefusDAtelier extends Error {
  constructor(
    readonly code: CodeDeRefusDAtelier,
    message: string,
  ) {
    super(message);
  }
}
