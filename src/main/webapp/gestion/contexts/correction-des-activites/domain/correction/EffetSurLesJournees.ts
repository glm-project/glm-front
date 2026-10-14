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

export interface RetraitSurUnAutreJour {
  readonly jour: JourACorriger;
  readonly retire: Duree;
}

export interface AjoutSurUnAutreJour {
  readonly jour: JourACorriger;
  readonly ajoute: Duree;
}

interface EffetParJour {
  readonly jourAffiche: EffetSurLeJourAffiche;
  readonly autresJoursRetires: readonly RetraitSurUnAutreJour[];
  readonly autresJoursAjoutes: readonly AjoutSurUnAutreJour[];
}

export class EffetSurLesJournees {
  readonly jourAffiche: EffetSurLeJourAffiche;
  readonly autresJoursRetires: readonly RetraitSurUnAutreJour[];
  readonly autresJoursAjoutes: readonly AjoutSurUnAutreJour[];

  private constructor(effet: EffetParJour) {
    this.jourAffiche = effet.jourAffiche;
    this.autresJoursRetires = effet.autresJoursRetires;
    this.autresJoursAjoutes = effet.autresJoursAjoutes;
  }

  static duRetrait(journee: JourneeACorriger, activite: ActiviteTerminee): EffetSurLesJournees {
    return new EffetSurLesJournees({
      jourAffiche: {
        jour: journee.jour,
        avant: journee.dureeOperationnelle,
        apres: journee.dureeOperationnelle.moins(activite.etat.dureeSurLeJour),
      },
      autresJoursRetires: activite.autresJours.map(autre => ({ jour: autre.jour, retire: autre.duree })),
      autresJoursAjoutes: [],
    });
  }

  static dUnAjout(journee: JourneeACorriger, plage: PlageDAjout): EffetSurLesJournees | undefined {
    const portions = plage.portions();
    return portions === undefined
      ? undefined
      : new EffetSurLesJournees({
          jourAffiche: {
            jour: journee.jour,
            avant: journee.dureeOperationnelle,
            apres: journee.dureeOperationnelle.plus(portions.duJourAffiche.duree),
          },
          autresJoursRetires: [],
          autresJoursAjoutes:
            portions.duLendemain === undefined ? [] : [{ jour: portions.duLendemain.jour, ajoute: portions.duLendemain.duree }],
        });
  }
}
