export const CODES_DE_REFUS_D_ATELIER = [
  'suivi-d-atelier-introuvable',
  'operateur-introuvable',
  'poste-de-travail-introuvable',
  'operateur-non-habilite',
  'suivi-d-atelier-cloture',
  'saisie-concurrente',
  'pointage-ignore',
] as const;

export type CodeDeRefusDAtelier = (typeof CODES_DE_REFUS_D_ATELIER)[number];

const ERREURS_DE_L_ATELIER = 'urn:glm:erreur:atelier:';

export const codeDeRefusDepuisUrn = (urn: string): CodeDeRefusDAtelier | undefined =>
  CODES_DE_REFUS_D_ATELIER.find(code => ERREURS_DE_L_ATELIER + code === urn);

export class MotifDeRefus {
  private constructor(private readonly code: CodeDeRefusDAtelier | undefined) {}

  static none(): MotifDeRefus {
    return new MotifDeRefus(undefined);
  }

  static fromUrn(urn: string): MotifDeRefus {
    return new MotifDeRefus(codeDeRefusDepuisUrn(urn));
  }

  static from(code: CodeDeRefusDAtelier | undefined): MotifDeRefus {
    return new MotifDeRefus(code);
  }

  is(code: CodeDeRefusDAtelier): boolean {
    return this.code === code;
  }

  isShownToTheOperator(): boolean {
    return !this.is('pointage-ignore');
  }
}
