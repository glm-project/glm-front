import { ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { Duree } from '../journee/Duree';
import { JourACorriger } from '../journee/JourACorriger';
import { JourneeACorriger } from '../journee/JourneeACorriger';
import { PlageDAjout } from './PlageDAjout';

export interface EffetSurLeJourAffiche {
  readonly jour: JourACorriger;
  readonly avant: Duree;
  readonly apres: Duree;
}

export interface EffetSurUnAutreJour {
  readonly jour: JourACorriger;
  readonly retire: Duree;
}

export class EffetSurLesJournees {
  private constructor(
    readonly jourAffiche: EffetSurLeJourAffiche,
    readonly autresJours: readonly EffetSurUnAutreJour[],
  ) {}

  static duRetrait(journee: JourneeACorriger, activite: ActiviteTerminee): EffetSurLesJournees {
    return new EffetSurLesJournees(
      { jour: journee.jour, avant: journee.dureeOperationnelle, apres: journee.dureeOperationnelle.moins(activite.etat.dureeSurLeJour) },
      activite.autresJours.map(autre => ({ jour: autre.jour, retire: autre.duree })),
    );
  }

  static dUnAjout(journee: JourneeACorriger, plage: PlageDAjout): EffetSurLesJournees | undefined {
    const ajoutee = plage.duree();
    return ajoutee === undefined
      ? undefined
      : new EffetSurLesJournees(
          { jour: journee.jour, avant: journee.dureeOperationnelle, apres: journee.dureeOperationnelle.plus(ajoutee) },
          [],
        );
  }
}
