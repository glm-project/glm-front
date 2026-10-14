import { CalendrierLocal } from '../../domain/correction/CalendrierLocal';
import { InstantDeLaJournee } from '../../domain/journee/InstantDeLaJournee';

const ANNEE = { debut: 0, fin: 4 };
const MOIS = { debut: 5, fin: 7 };
const JOUR = { debut: 8, fin: 10 };

const composante = (jour: string, { debut, fin }: { readonly debut: number; readonly fin: number }): number =>
  Number(jour.slice(debut, fin));

export const calendrierDuNavigateur: CalendrierLocal = {
  instantA: (jour, heures, minutes) =>
    new InstantDeLaJournee(
      new Date(
        composante(jour.value, ANNEE),
        composante(jour.value, MOIS) - 1,
        composante(jour.value, JOUR),
        heures,
        minutes,
      ).toISOString(),
    ),
};
