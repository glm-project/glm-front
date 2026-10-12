import { components } from '@/app/generated/schema';

type RestJournee = components['schemas']['RestJourneeACorriger'];
type RestActivite = components['schemas']['RestActiviteDeLaJournee'];
type RestElement = components['schemas']['RestElementDeLaJournee'];
type RestPoste = components['schemas']['RestPosteDeLaJournee'];
type RestSuiviPresent = components['schemas']['RestSuiviPresent'];

const JOURNEE = '/api/atelier/operateurs/*/journees/*';
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
  private readonly journees = new Map<string, RestJournee>();

  seed(journee: RestJournee): void {
    this.journees.set(journee.jour, journee);
  }

  install(): void {
    cy.intercept({ method: 'GET', pathname: JOURNEE }, request => {
      const jour = new URL(request.url).pathname.split('/').slice(-1)[0] ?? '';
      request.reply(this.reponse(jour));
    }).as('journeeRead');
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
