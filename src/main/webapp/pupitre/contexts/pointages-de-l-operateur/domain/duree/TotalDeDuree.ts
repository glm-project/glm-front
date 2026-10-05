import { DureeTravaillee } from './DureeTravaillee';

export type LectureDeTotal = { readonly complete: true; readonly valeur: DureeTravaillee } | { readonly complete: false };

export class TotalDeDuree {
  private constructor(private readonly lecture: LectureDeTotal) {}

  static complet(valeur: DureeTravaillee): TotalDeDuree {
    return new TotalDeDuree({ complete: true, valeur });
  }

  static incomplet(): TotalDeDuree {
    return new TotalDeDuree({ complete: false });
  }

  snapshot(): LectureDeTotal {
    return this.lecture;
  }
}
