import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { InstantPointage } from '../dossier/InstantPointage';

export class SaisieDeRegularisation {
  private constructor(
    readonly id: string,
    readonly activite: ActiviteAnomalieId,
    readonly dateDeSurvenue: string,
  ) {}

  static pour(
    precedente: SaisieDeRegularisation | undefined,
    activite: ActiviteAnomalieId,
    dateDeSurvenue: string,
    nouvelIdentifiant: () => string,
  ): SaisieDeRegularisation {
    if (precedente?.porte(activite, dateDeSurvenue) === true) return precedente;
    return new SaisieDeRegularisation(nouvelIdentifiant(), activite, dateDeSurvenue);
  }

  private porte(activite: ActiviteAnomalieId, dateDeSurvenue: string): boolean {
    return (
      this.activite.activite === activite.activite
      && new InstantPointage(this.dateDeSurvenue).compareTo(new InstantPointage(dateDeSurvenue)) === 0
    );
  }
}
