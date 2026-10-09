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

export class MotifDeRefus {
  private constructor(private readonly motif: CodeDeRefusDAtelier | undefined) {}

  static none(): MotifDeRefus {
    return new MotifDeRefus(undefined);
  }

  static from(code: CodeDeRefusDAtelier | undefined): MotifDeRefus {
    return new MotifDeRefus(code);
  }

  code(): CodeDeRefusDAtelier | undefined {
    return this.motif;
  }

  is(code: CodeDeRefusDAtelier): boolean {
    return this.motif === code;
  }

  isShownToTheOperator(): boolean {
    return this.is('suivi-d-atelier-cloture');
  }
}
