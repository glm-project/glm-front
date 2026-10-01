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
    dureeOperationnelle: { complete: true, valeur: rang === 0 ? 'PT2H' : 'PT0S' },
    pointages:
      rang === 0
        ? [
            { id: 'debut-1', type: 'DEBUT', intention: 'OUVERTURE', dateDeSurvenue: `${jour}T08:00:00Z`, element: 'element-1' },
            { id: 'fin-1', type: 'FIN', intention: 'FIN', cible: 'debut-1', dateDeSurvenue: `${jour}T10:00:00Z`, element: 'element-1' },
          ]
        : [],
  }));

const joursDeFeuille = (annee: number, semaine: number): RestJourDeFeuille[] =>
  datesDe(annee, semaine).map((jour, rang) => ({
    jour,
    activites:
      rang === 0
        ? [
            {
              element: 'element-1',
              categorie: 'TRAVAIL',
              debut: `${jour}T08:00:00Z`,
              fin: `${jour}T10:00:00Z`,
              activite: { id: 'debut-1', debut: `${jour}T08:00:00Z`, fin: `${jour}T10:00:00Z`, etat: 'TERMINEE' },
            },
          ]
        : [],
  }));

export interface SemaineSemee {
  readonly synthese: RestSynthese;
  readonly feuille: RestFeuille;
}

const cleDe = (annee: number, semaine: number): string => `${String(annee)}|${String(semaine)}`;

export class SyntheseDesHeuresApiFixture {
  failRead = false;
  operateurInconnu = false;
  readonly evaluations: { source: 'SYNTHESE' | 'FEUILLE'; evaluation: string }[] = [];
  private attente: Promise<void> | undefined;
  readonly lectures: { annee: string; semaine: string }[] = [];
  private readonly semaines = new Map<string, SemaineSemee>();

  seed(semaine: SemaineSemee): void {
    this.semaines.set(cleDe(Number(semaine.synthese.annee), Number(semaine.synthese.semaine)), semaine);
  }

  suspendSynthese(): () => void {
    let reprendre = (): void => {};
    this.attente = new Promise(resolve => {
      reprendre = resolve;
    });
    return () => {
      reprendre();
      this.attente = undefined;
    };
  }

  install(): void {
    cy.intercept({ method: 'GET', pathname: SYNTHESE }, request => {
      const annee = String(request.query['annee']);
      const semaine = String(request.query['semaine']);
      this.lectures.push({ annee, semaine });
      const evaluation = String(request.query['evaluation']);
      this.evaluations.push({ source: 'SYNTHESE', evaluation });
      const reponse = this.reponse(annee, semaine, evaluation);
      if (this.attente !== undefined) {
        return this.attente.then(() => request.reply(reponse));
      }
      return request.reply(reponse);
    }).as('syntheseRead');
    this.installFeuille();
  }

  installFeuille(): void {
    cy.intercept({ method: 'GET', pathname: FEUILLE }, request => {
      const evaluation = String(request.query['evaluation']);
      this.evaluations.push({ source: 'FEUILLE', evaluation });
      request.reply(this.reponseDeFeuille(Number(request.query['annee']), Number(request.query['semaine']), evaluation));
    }).as('feuilleRead');
  }

  private reponse(annee: string, semaine: string, evaluation: string): { statusCode?: number; body: RestSynthese | { type?: string } } {
    if (this.failRead) {
      return { statusCode: 500, body: {} };
    }
    if (this.operateurInconnu) {
      return { statusCode: 404, body: { type: SYNTHESE_INTROUVABLE } };
    }
    return {
      body: {
        ...(this.semaines.get(cleDe(Number(annee), Number(semaine)))?.synthese ?? syntheseFixture(Number(annee), Number(semaine))),
        evaluation,
      },
    };
  }

  private reponseDeFeuille(
    annee: number,
    semaine: number,
    evaluation: string,
  ): { statusCode?: number; body: RestFeuille | { type: string } } {
    if (this.operateurInconnu) {
      return { statusCode: 404, body: { type: FEUILLE_INTROUVABLE } };
    }
    return { body: { ...(this.semaines.get(cleDe(annee, semaine))?.feuille ?? feuilleFixture(annee, semaine)), evaluation } };
  }
}

export const syntheseFixture = (annee: number, semaine: number): RestSynthese => ({
  annee,
  semaine,
  dureeOperationnelleTotale: { complete: true, valeur: 'PT2H' },
  conflits: [],
  evaluation: '2026-09-26T10:30:00Z',
  operateur: OPERATEUR,
  jours: joursDeSynthese(annee, semaine),
  elements: [
    {
      id: 'element-1',
      type: 'PRODUIT',
      nom: 'Moule 1015',
      duree: { complete: true, valeur: 'PT2H' },
      dureeNonConformite: { complete: true, valeur: 'PT0S' },
      postes: [],
    },
  ],
});

export const feuilleFixture = (annee: number, semaine: number): RestFeuille => ({
  evaluation: '2026-09-26T10:30:00Z',
  annee,
  semaine,
  operateur: OPERATEUR,
  jours: joursDeFeuille(annee, semaine),
});
