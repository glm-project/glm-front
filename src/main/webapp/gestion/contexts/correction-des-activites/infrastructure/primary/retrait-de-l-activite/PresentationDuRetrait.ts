import { EffetSurLesJournees } from '../../../domain/correction/EffetSurLesJournees';
import { ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

const LIBELLES = LIBELLES_CORRECTION_DES_ACTIVITES;

export interface LigneDEffet {
  readonly libelle: string;
  readonly valeur: string;
}

export interface PresentationDuRetrait {
  readonly titre: string;
  readonly element: string;
  readonly designation: string | undefined;
  readonly poste: string;
  readonly type: string;
  readonly duree: string;
  readonly effets: readonly LigneDEffet[];
  readonly debordement: string | undefined;
}

export const presentationDuRetrait = (journee: JourneeACorriger, activite: ActiviteTerminee): PresentationDuRetrait => {
  const effet = EffetSurLesJournees.duRetrait(journee, activite);
  return {
    titre: LIBELLES.retrait.titre(activite),
    element: LIBELLES.nomDeLElement(activite.element),
    designation: activite.element.description,
    poste: LIBELLES.posteDe(activite),
    type: LIBELLES.type(activite.categorie),
    duree: LIBELLES.duree(activite.dureeTotale()),
    effets: [
      {
        libelle: LIBELLES.retrait.operationnelDuJour(effet.jourAffiche.jour),
        valeur: LIBELLES.retrait.avantApres(effet.jourAffiche.avant, effet.jourAffiche.apres),
      },
      ...effet.autresJours.map(autre => ({
        libelle: LIBELLES.retrait.autreJour(autre.jour),
        valeur: LIBELLES.retrait.retire(autre.retire),
      })),
    ],
    debordement: effet.autresJours.length === 0 ? undefined : LIBELLES.retrait.debordement(effet.autresJours),
  };
};
