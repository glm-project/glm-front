import { ActiviteDeLaJournee, ActiviteTerminee } from '../../../domain/journee/ActiviteDeLaJournee';
import { CategorieDActivite } from '../../../domain/journee/CategorieDActivite';
import { JourACorriger } from '../../../domain/journee/JourACorriger';
import { JourneeACorriger } from '../../../domain/journee/JourneeACorriger';
import { LIBELLES_CORRECTION_DES_ACTIVITES } from '../LibellesCorrectionDesActivites';

const LIBELLES = LIBELLES_CORRECTION_DES_ACTIVITES;

export type StyleDeType = 'travail' | 'nc';

export interface LienVersUnJour {
  readonly libelle: string;
  readonly jour: string;
}

export interface LigneDActivite {
  readonly cle: string;
  readonly horaires: string;
  readonly element: string;
  readonly designation: string | undefined;
  readonly poste: string;
  readonly type: string;
  readonly styleDeType: StyleDeType;
  readonly duree: string | undefined;
  readonly total: string | undefined;
  readonly debutAilleurs: LienVersUnJour | undefined;
  readonly finAilleurs: LienVersUnJour | undefined;
  readonly etat: string | undefined;
  readonly cloture: string | undefined;
  readonly retrait: RetraitDUneActivite | undefined;
}

export interface RetraitDUneActivite {
  readonly activite: ActiviteTerminee;
  readonly nom: string;
}

const STYLES_DE_TYPE: Record<CategorieDActivite, StyleDeType> = { TRAVAIL: 'travail', NON_CONFORMITE: 'nc' };

const dureeDuJour = (activite: ActiviteDeLaJournee): string | undefined =>
  activite.etat.kind === 'EN_COURS' ? undefined : LIBELLES.duree(activite.etat.dureeSurLeJour);

const lienVers = (jour: JourACorriger | undefined, libelle: (jour: JourACorriger) => string): LienVersUnJour | undefined =>
  jour === undefined ? undefined : { libelle: libelle(jour), jour: jour.value };

const totalSurPlusieursJours = (activite: ActiviteDeLaJournee): string | undefined => {
  const total = activite.dureeTotale();
  return !activite.estACheval() || total === undefined ? undefined : LIBELLES.surLeTotal(total);
};

const clotureDeLActivite = (activite: ActiviteDeLaJournee, journee: JourneeACorriger): string | undefined => {
  const clotureLe = journee.clotureDe(activite);
  return clotureLe === undefined || activite.etat.kind === 'EN_COURS' ? undefined : LIBELLES.clotureLe(clotureLe);
};

const retraitDeLActivite = (activite: ActiviteDeLaJournee, journee: JourneeACorriger): RetraitDUneActivite | undefined =>
  journee.estCorrigeable(activite) ? { activite, nom: LIBELLES.retrait.bouton(activite, journee.bornes) } : undefined;

const ligneDActivite = (activite: ActiviteDeLaJournee, journee: JourneeACorriger): LigneDActivite => ({
  cle: activite.id.value,
  horaires: LIBELLES.horaires(activite, journee.bornes),
  element: LIBELLES.nomDeLElement(activite.element),
  designation: activite.element.description,
  poste: LIBELLES.posteDe(activite),
  type: LIBELLES.type(activite.categorie),
  styleDeType: STYLES_DE_TYPE[activite.categorie],
  duree: dureeDuJour(activite),
  total: totalSurPlusieursJours(activite),
  debutAilleurs: lienVers(activite.jourDuDebut(journee.jour), LIBELLES.debutLe),
  finAilleurs: lienVers(activite.jourDeLaFin(journee.jour), LIBELLES.finLe),
  etat: LIBELLES.etatDe(activite),
  cloture: clotureDeLActivite(activite, journee),
  retrait: retraitDeLActivite(activite, journee),
});

const chronologique = (une: ActiviteDeLaJournee, autre: ActiviteDeLaJournee): number => (une.debut.estAvant(autre.debut) ? -1 : 1);

export const lignesDesActivites = (journee: JourneeACorriger): readonly LigneDActivite[] =>
  [...journee.activites].sort(chronologique).map(activite => ligneDActivite(activite, journee));
