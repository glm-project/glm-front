import { components } from '@/app/generated/schema';

type RestJournee = components['schemas']['RestJourneeACorriger'];
type RestActivite = components['schemas']['RestActiviteDeLaJournee'];
type RestElement = components['schemas']['RestElementDeLaJournee'];
type RestPoste = components['schemas']['RestPosteDeLaJournee'];
type RestSuiviPresent = components['schemas']['RestSuiviPresent'];

const JOURNEE = '/api/atelier/operateurs/*/journees/*';
const RETRAIT = '/api/atelier/suivis/*/activites/*/retrait';
const CHANGEMENT_DE_POSTE = '/api/atelier/suivis/*/activites/*/poste';
const AJOUT = '/api/atelier/suivis/*/activites';
const CHEVAUCHEMENT = 'urn:glm:erreur:atelier:chevauchement';
const DATE_DE_SURVENUE_FUTURE = 'urn:glm:erreur:atelier:date-de-survenue-future';
const SAISIE_CONCURRENTE = 'urn:glm:erreur:atelier:saisie-concurrente';
const OPERATEUR_INTROUVABLE = 'urn:glm:erreur:atelier:operateur-introuvable';
const MOIS_D_OCTOBRE = 9;

export const OPERATEUR_DE_LA_JOURNEE = 'op-1';

export const instantLocal = (jour: number, heures: number, minutes = 0): string =>
  new Date(2026, MOIS_D_OCTOBRE, jour, heures, minutes).toISOString();

export const jourRecu = (jour: number): string => `2026-10-${String(jour).padStart(2, '0')}`;

export const elementRecu = (suffixe: string, categorie = 'OF'): RestElement => ({
  id: `element-${suffixe}`,
  categorie,
  nom: `PRD-2026-0000${suffixe}`,
  reference: `24-13${suffixe}`,
  description: `Pièce ${suffixe}`,
});

export const tourRecu: RestPoste = { id: 'poste-tour', libelle: 'Tour CN 1', nature: 'Tournage' };
export const fraiseuseRecue: RestPoste = { id: 'poste-fraise', libelle: 'Fraiseuse 1', nature: 'Fraisage' };

export const suiviRecu = (suivi: string, element: RestElement, clotureLe?: string): RestSuiviPresent => ({
  suivi,
  element,
  engageLe: instantLocal(1, 8),
  ...(clotureLe === undefined ? {} : { clotureLe }),
});

export const activiteRecue = (
  activite: Partial<RestActivite> & Pick<RestActivite, 'id' | 'suivi' | 'element' | 'debut' | 'etat'>,
): RestActivite => ({
  categorie: 'TRAVAIL',
  autresJours: [],
  ...activite,
});

export const journeeRecue = (
  jour: number,
  suivis: readonly RestSuiviPresent[],
  activites: readonly RestActivite[],
  dureeOperationnelle = 'PT0S',
): RestJournee => ({
  operateur: { id: OPERATEUR_DE_LA_JOURNEE, nom: 'Leroy', prenom: 'Hugo' },
  jour: jourRecu(jour),
  evaluation: instantLocal(jour, 12),
  bornes: { debut: instantLocal(jour, 0), fin: instantLocal(jour + 1, 0), finDuLendemain: instantLocal(jour + 2, 0) },
  dureeOperationnelle,
  activites: [...activites],
  choix: { suivis: [...suivis], postes: [tourRecu, fraiseuseRecue] },
});

export class JourneeApiFixture {
  failRead = false;
  operateurInconnu = false;
  journeeChangee = false;
  chevauchement = false;
  finFuture = false;
  private readonly journees = new Map<string, RestJournee>();
  private journeeApresLaCorrection: RestJournee | undefined;
  private lectureLibre: Promise<void> = Promise.resolve();

  retenirLesLecturesSuivantes(): void {
    this.lectureLibre = new Promise(() => undefined);
  }

  apresLaCorrection(journee: RestJournee): void {
    this.journeeApresLaCorrection = journee;
  }

  seed(journee: RestJournee): void {
    this.journees.set(journee.jour, journee);
  }

  install(): void {
    cy.intercept({ method: 'GET', pathname: JOURNEE }, request => {
      const jour = new URL(request.url).pathname.split('/').slice(-1)[0] ?? '';
      return this.lectureLibre.then(() => {
        request.reply(this.reponse(jour));
      });
    }).as('journeeRead');
  }

  installRetrait(): void {
    cy.intercept({ method: 'POST', pathname: RETRAIT }, request => {
      if (this.journeeApresLaCorrection !== undefined) {
        this.seed(this.journeeApresLaCorrection);
      }
      if (this.journeeChangee) {
        request.reply({ statusCode: 409, body: { type: SAISIE_CONCURRENTE } });
        return;
      }
      request.reply({ statusCode: 201, body: {} });
    }).as('retraitWrite');
  }

  installChangementDePoste(): void {
    cy.intercept({ method: 'POST', pathname: CHANGEMENT_DE_POSTE }, request => {
      if (this.chevauchement) {
        request.reply({ statusCode: 409, body: { type: CHEVAUCHEMENT } });
        return;
      }
      if (this.journeeApresLaCorrection !== undefined) {
        this.seed(this.journeeApresLaCorrection);
      }
      if (this.journeeChangee) {
        request.reply({ statusCode: 409, body: { type: SAISIE_CONCURRENTE } });
        return;
      }
      request.reply({ statusCode: 201, body: {} });
    }).as('changementWrite');
  }

  installAjout(): void {
    cy.intercept({ method: 'POST', pathname: AJOUT }, request => {
      if (this.chevauchement) {
        request.reply({ statusCode: 409, body: { type: CHEVAUCHEMENT } });
        return;
      }
      if (this.finFuture) {
        request.reply({ statusCode: 400, body: { type: DATE_DE_SURVENUE_FUTURE } });
        return;
      }
      if (this.journeeApresLaCorrection !== undefined) {
        this.seed(this.journeeApresLaCorrection);
      }
      if (this.journeeChangee) {
        request.reply({ statusCode: 409, body: { type: SAISIE_CONCURRENTE } });
        return;
      }
      request.reply({ statusCode: 201, body: {} });
    }).as('ajoutWrite');
  }

  private reponse(jour: string): { statusCode?: number; body: RestJournee | { type?: string } } {
    if (this.failRead) {
      return { statusCode: 500, body: {} };
    }
    if (this.operateurInconnu) {
      return { statusCode: 404, body: { type: OPERATEUR_INTROUVABLE } };
    }
    const journee = this.journees.get(jour);
    return journee === undefined ? { statusCode: 500, body: {} } : { body: journee };
  }
}
