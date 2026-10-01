import { DureePassee } from './DureePassee';

export type LectureDeTemps = { readonly complete: true; readonly valeur: DureePassee } | { readonly complete: false };

export class TotalDeTemps {
  private constructor(private readonly lecture: LectureDeTemps) {}

  static complet(valeur: DureePassee): TotalDeTemps {
    return new TotalDeTemps({ complete: true, valeur });
  }

  static incomplet(): TotalDeTemps {
    return new TotalDeTemps({ complete: false });
  }

  snapshot(): LectureDeTemps {
    return this.lecture;
  }

  estNul(): boolean {
    return this.lecture.complete && this.lecture.valeur.estNulle();
  }
}
