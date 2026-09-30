import { Montant } from './Montant';

export type LectureDeMontant = { readonly complete: true; readonly valeur: Montant } | { readonly complete: false };

export class TotalDeMontant {
  private constructor(private readonly lecture: LectureDeMontant) {}

  static complet(valeur: Montant): TotalDeMontant {
    return new TotalDeMontant({ complete: true, valeur });
  }

  static incomplet(): TotalDeMontant {
    return new TotalDeMontant({ complete: false });
  }

  snapshot(): LectureDeMontant {
    return this.lecture;
  }
}
