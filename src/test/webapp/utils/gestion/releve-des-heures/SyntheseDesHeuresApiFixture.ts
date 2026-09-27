import { components } from '@/app/generated/schema';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestJourDeFeuille = components['schemas']['RestJourDeLaSemaine'];

const SYNTHESE = '/api/syntheses-des-heures/*';
const FEUILLE = '/api/feuilles-de-temps/*';
const SYNTHESE_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const FEUILLE_INTROUVABLE = 'urn:glm:erreur:feuille-de-temps:operateur-introuvable';
const MILLISECONDES_PAR_JOUR = 86_400_000;
const OPERATEUR = { id: 'op-1', nom: 'Dupont', prenom: 'Jean' };

/** Le lundi de la semaine ISO demandée, calculé comme le back le fait, à partir du 4 janvier. */
const lundiDe = (annee: number, semaine: number): Date => {
  const quatreJanvier = new Date(Date.UTC(annee, 0, 4));
  const jour = quatreJanvier.getUTCDay() === 0 ? 7 : quatreJanvier.getUTCDay();
  return new Date(quatreJanvier.getTime() + (1 - jour + (semaine - 1) * 7) * MILLISECONDES_PAR_JOUR);
};

const datesDe = (annee: number, semaine: number): string[] => {
  const lundi = lundiDe(annee, semaine);
  return Array.from({ length: 7 }, (_, rang) => new Date(lundi.getTime() + rang * MILLISECONDES_PAR_JOUR).toISOString().slice(0, 10));
};

const joursDeSynthese = (annee: number, semaine: number): RestJour[] =>
  datesDe(annee, semaine).map((jour, rang) => ({
    jour,
    duree: rang === 0 ? 'PT7H30M' : 'PT0S',
    dureePresumee: 'PT0S',
    pointages:
      rang === 0
        ? [
            { type: 'ARRIVEE' as const, dateDeSurvenue: `${jour}T06:02:00Z` },
            { type: 'DEPART' as const, dateDeSurvenue: `${jour}T15:32:00Z` },
          ]
        : [],
  }));

const joursDeFeuille = (annee: number, semaine: number): RestJourDeFeuille[] =>
  datesDe(annee, semaine).map((jour, rang) => ({
    jour,
    presence: rang === 0 ? [{ debut: `${jour}T06:02:00Z`, fin: `${jour}T15:32:00Z`, presumee: false }] : [],
  }));

export interface SemaineSemee {
  readonly synthese: RestSynthese;
  readonly feuille: RestFeuille;
}

const cleDe = (annee: number, semaine: number): string => `${String(annee)}|${String(semaine)}`;

export class SyntheseDesHeuresApiFixture {
  failRead = false;
  operateurInconnu = false;
  readonly lectures: { annee: string; semaine: string }[] = [];
  private readonly semaines = new Map<string, SemaineSemee>();

  seed(semaine: SemaineSemee): void {
    this.semaines.set(cleDe(Number(semaine.synthese.annee), Number(semaine.synthese.semaine)), semaine);
  }

  install(): void {
    cy.intercept({ method: 'GET', pathname: SYNTHESE }, request => {
      const annee = String(request.query['annee']);
      const semaine = String(request.query['semaine']);
      this.lectures.push({ annee, semaine });
      request.reply(this.reponse(annee, semaine));
    }).as('syntheseRead');
    this.installFeuille();
  }

  installFeuille(): void {
    cy.intercept({ method: 'GET', pathname: FEUILLE }, request => {
      request.reply(this.reponseDeFeuille(Number(request.query['annee']), Number(request.query['semaine'])));
    }).as('feuilleRead');
  }

  private reponse(annee: string, semaine: string): { statusCode?: number; body: RestSynthese | { type: string } } {
    if (this.failRead) {
      return { statusCode: 500, body: {} };
    }
    if (this.operateurInconnu) {
      return { statusCode: 404, body: { type: SYNTHESE_INTROUVABLE } };
    }
    return { body: this.semaines.get(cleDe(Number(annee), Number(semaine)))?.synthese ?? syntheseFixture(Number(annee), Number(semaine)) };
  }

  private reponseDeFeuille(annee: number, semaine: number): { statusCode?: number; body: RestFeuille | { type: string } } {
    if (this.operateurInconnu) {
      return { statusCode: 404, body: { type: FEUILLE_INTROUVABLE } };
    }
    return { body: this.semaines.get(cleDe(annee, semaine))?.feuille ?? feuilleFixture(annee, semaine) };
  }
}

export const syntheseFixture = (annee: number, semaine: number): RestSynthese => ({
  annee,
  semaine,
  dureeTotale: 'PT7H30M',
  dureePresumeeTotale: 'PT0S',
  operateur: OPERATEUR,
  jours: joursDeSynthese(annee, semaine),
});

export const feuilleFixture = (annee: number, semaine: number): RestFeuille => ({
  annee,
  semaine,
  operateur: OPERATEUR,
  jours: joursDeFeuille(annee, semaine),
});
