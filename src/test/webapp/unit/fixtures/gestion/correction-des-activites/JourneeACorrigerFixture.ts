import { ActiviteDeLaJournee, ActiviteTerminee } from '@/gestion/contexts/correction-des-activites/domain/journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/ActiviteDeLaJourneeId';
import { BornesDuJour } from '@/gestion/contexts/correction-des-activites/domain/journee/BornesDuJour';
import { CategorieDActivite } from '@/gestion/contexts/correction-des-activites/domain/journee/CategorieDActivite';
import { CategorieDElement } from '@/gestion/contexts/correction-des-activites/domain/journee/CategorieDElement';
import { ChoixDAjout } from '@/gestion/contexts/correction-des-activites/domain/journee/ChoixDAjout';
import { Duree } from '@/gestion/contexts/correction-des-activites/domain/journee/Duree';
import { ElementDeLaJournee } from '@/gestion/contexts/correction-des-activites/domain/journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/ElementDeLaJourneeId';
import { EtatDActivite } from '@/gestion/contexts/correction-des-activites/domain/journee/EtatDActivite';
import { InstantDeLaJournee } from '@/gestion/contexts/correction-des-activites/domain/journee/InstantDeLaJournee';
import { JourACorriger } from '@/gestion/contexts/correction-des-activites/domain/journee/JourACorriger';
import { JourneeACorriger } from '@/gestion/contexts/correction-des-activites/domain/journee/JourneeACorriger';
import { JourneeACorrigerPort } from '@/gestion/contexts/correction-des-activites/domain/journee/JourneeACorrigerPort';
import { OperateurDeLaJournee } from '@/gestion/contexts/correction-des-activites/domain/journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/OperateurDeLaJourneeId';
import { PortionDeJour } from '@/gestion/contexts/correction-des-activites/domain/journee/PortionDeJour';
import { PosteDeLaJournee } from '@/gestion/contexts/correction-des-activites/domain/journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '@/gestion/contexts/correction-des-activites/domain/journee/SuiviDAtelierId';
import { SuiviPresent } from '@/gestion/contexts/correction-des-activites/domain/journee/SuiviPresent';
import { SuivisPresents } from '@/gestion/contexts/correction-des-activites/domain/journee/SuivisPresents';

export const OPERATEUR_DE_LA_JOURNEE = 'op-1';

const MOIS_D_OCTOBRE = 9;

export const instantLocal = (jour: number, heures: number, minutes = 0): InstantDeLaJournee =>
  new InstantDeLaJournee(new Date(2026, MOIS_D_OCTOBRE, jour, heures, minutes).toISOString());

export const jourDOctobre = (jour: number): JourACorriger => new JourACorriger(`2026-10-${String(jour).padStart(2, '0')}`);

export const bornesDuJourDOctobre = (jour: number): BornesDuJour =>
  new BornesDuJour({ debut: instantLocal(jour, 0), fin: instantLocal(jour + 1, 0) });

export const tourFixture = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-tour'), 'Tour CN 1', 'Tournage');
export const fraiseuseFixture = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-fraise'), 'Fraiseuse 1', 'Fraisage');

export const elementFixture = (suffixe: string, categorie = 'OF'): ElementDeLaJournee =>
  new ElementDeLaJournee({
    id: new ElementDeLaJourneeId(`element-${suffixe}`),
    categorie: new CategorieDElement(categorie),
    nom: `PRD-2026-0000${suffixe}`,
    reference: `24-13${suffixe}`,
    description: `Pièce ${suffixe}`,
  });

export interface SuiviSemis {
  readonly suivi: string;
  readonly element: ElementDeLaJournee;
  readonly clotureLe?: InstantDeLaJournee | undefined;
}

const suivisPresentsDe = (suivis: readonly SuiviSemis[]): SuivisPresents =>
  new SuivisPresents(
    suivis.map(
      semis =>
        new SuiviPresent({
          suivi: new SuiviDAtelierId(semis.suivi),
          element: semis.element,
          engageLe: instantLocal(1, 8),
          clotureLe: semis.clotureLe,
        }),
    ),
  );

export interface ActiviteSemee {
  readonly id: string;
  readonly suivi: string;
  readonly poste?: PosteDeLaJournee | undefined;
  readonly categorie?: CategorieDActivite;
  readonly debut: InstantDeLaJournee;
  readonly etat: EtatDActivite;
  readonly autresJours?: readonly { readonly jour: number; readonly duree: string }[];
}

export const terminee = (
  fin: InstantDeLaJournee,
  duree: string,
  kind: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT' = 'TERMINEE',
): EtatDActivite => ({ kind, fin, dureeSurLeJour: new Duree(duree) });

export const enCours: EtatDActivite = { kind: 'EN_COURS' };

export interface JourneeSemee {
  readonly jour: number;
  readonly suivis: readonly SuiviSemis[];
  readonly activites: readonly ActiviteSemee[];
  readonly operationnelle?: string;
  readonly postes?: readonly PosteDeLaJournee[];
}

export const journeeFixture = (semis: JourneeSemee): JourneeACorriger => {
  const suivisPresents = suivisPresentsDe(semis.suivis);
  const element = (suivi: string): ElementDeLaJournee => {
    const present = suivisPresents.de(new SuiviDAtelierId(suivi));
    if (present === undefined) {
      throw new Error(`Suivi ${suivi} non semé`);
    }
    return present.element;
  };
  return new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId(OPERATEUR_DE_LA_JOURNEE), 'Leroy', 'Hugo'),
    jour: jourDOctobre(semis.jour),
    bornes: bornesDuJourDOctobre(semis.jour),
    dureeOperationnelle: new Duree(semis.operationnelle ?? 'PT0S'),
    activites: semis.activites.map(
      activite =>
        new ActiviteDeLaJournee({
          id: new ActiviteDeLaJourneeId(activite.id),
          suivi: new SuiviDAtelierId(activite.suivi),
          element: element(activite.suivi),
          poste: activite.poste,
          categorie: activite.categorie ?? 'TRAVAIL',
          debut: activite.debut,
          etat: activite.etat,
          autresJours: (activite.autresJours ?? []).map(autre => new PortionDeJour(jourDOctobre(autre.jour), new Duree(autre.duree))),
        }),
    ),
    choix: new ChoixDAjout({ suivis: suivisPresents, postes: semis.postes ?? [] }),
  });
};

export const activiteDeLaJournee = (journee: JourneeACorriger, id: string): ActiviteDeLaJournee => {
  const activite = journee.activites.find(candidate => candidate.id.value === id);
  if (activite === undefined) {
    throw new Error(`Activité ${id} non semée`);
  }
  return activite;
};

export const activiteTerminee = (journee: JourneeACorriger, id: string): ActiviteTerminee => {
  const activite = activiteDeLaJournee(journee, id);
  if (!activite.estTerminee()) {
    throw new Error(`Activité ${id} non terminée`);
  }
  return activite;
};

const auTourSuivant = <T>(valeur: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(valeur)));

export class JourneeACorrigerFixture extends JourneeACorrigerPort {
  readonly lectures: { readonly operateur: string; readonly jour: string }[] = [];
  readonly journees = new Map<string, JourneeACorriger>();
  operateurInconnu = false;
  echec: Error | undefined;

  override lire(operateur: OperateurDeLaJourneeId, jour: JourACorriger): Promise<JourneeACorriger | undefined> {
    this.lectures.push({ operateur: operateur.value, jour: jour.value });
    if (this.echec !== undefined) {
      return Promise.reject(this.echec);
    }
    if (this.operateurInconnu) {
      return auTourSuivant(undefined);
    }
    const journee = this.journees.get(jour.value);
    return journee === undefined ? Promise.reject(new Error(`Aucune journée semée pour ${jour.value}`)) : auTourSuivant(journee);
  }
}
