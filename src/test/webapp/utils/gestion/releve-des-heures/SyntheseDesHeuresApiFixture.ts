import { components } from '@/app/generated/schema';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];

const ROUTE = '/api/syntheses-des-heures/*';
const OPERATEUR_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const MILLISECONDES_PAR_JOUR = 86_400_000;

/** Le lundi de la semaine ISO demandée, calculé comme le back le fait, à partir du 4 janvier. */
const lundiDe = (annee: number, semaine: number): Date => {
  const quatreJanvier = new Date(Date.UTC(annee, 0, 4));
  const jour = quatreJanvier.getUTCDay() === 0 ? 7 : quatreJanvier.getUTCDay();
  return new Date(quatreJanvier.getTime() + (1 - jour + (semaine - 1) * 7) * MILLISECONDES_PAR_JOUR);
};

const joursDe = (annee: number, semaine: number): RestJour[] => {
  const lundi = lundiDe(annee, semaine);
  return Array.from({ length: 7 }, (_, rang) => ({
    jour: new Date(lundi.getTime() + rang * MILLISECONDES_PAR_JOUR).toISOString().slice(0, 10),
    duree: rang === 0 ? 'PT7H30M' : 'PT0S',
    pointages:
      rang === 0
        ? [
            { type: 'ARRIVEE' as const, dateDeSurvenue: `${new Date(lundi).toISOString().slice(0, 10)}T06:02:00Z` },
            { type: 'DEPART' as const, dateDeSurvenue: `${new Date(lundi).toISOString().slice(0, 10)}T15:32:00Z` },
          ]
        : [],
  }));
};

export class SyntheseDesHeuresApiFixture {
  failRead = false;
  operateurInconnu = false;
  readonly lectures: { annee: string; semaine: string }[] = [];

  install(): void {
    cy.intercept({ method: 'GET', pathname: ROUTE }, request => {
      const annee = String(request.query['annee']);
      const semaine = String(request.query['semaine']);
      this.lectures.push({ annee, semaine });
      request.reply(this.reponse(annee, semaine));
    }).as('syntheseRead');
  }

  private reponse(annee: string, semaine: string): { statusCode?: number; body: RestSynthese | { type: string } } {
    if (this.failRead) {
      return { statusCode: 500, body: {} };
    }
    if (this.operateurInconnu) {
      return { statusCode: 404, body: { type: OPERATEUR_INTROUVABLE } };
    }
    return { body: syntheseFixture(Number(annee), Number(semaine)) };
  }
}

export const syntheseFixture = (annee: number, semaine: number): RestSynthese => ({
  annee,
  semaine,
  dureeTotale: 'PT7H30M',
  operateur: { id: 'op-1', nom: 'Dupont', prenom: 'Jean' },
  jours: joursDe(annee, semaine),
});
