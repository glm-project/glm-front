import { components } from '@/app/generated/schema';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];

const ROUTE = '/api/couts-de-revient/*';

const PERIODE = { debut: '2026-05-11T09:00:00Z', fin: '2026-05-11T12:00:00Z' };

const fraisage: RestLigne = {
  nature: 'Fraisage',
  periode: PERIODE,
  temps: { travail: 'PT2H', nonConformite: 'PT1H', total: 'PT3H' },
  nonConformites: [{ debut: '2026-05-11T10:00:00Z', fin: '2026-05-11T11:00:00Z' }],
  cout: { machine: 135, mainDOeuvre: 60, total: 195 },
};

const tournage: RestLigne = {
  nature: 'Tournage',
  periode: PERIODE,
  temps: { travail: 'PT1H', nonConformite: 'PT0S', total: 'PT1H' },
  nonConformites: [],
  cout: { machine: 60, mainDOeuvre: 20, total: 80 },
};

/** Le comportement nominal d'une entreprise sans parc machine : l'opérateur reste payé, la machine ne coûte rien. */
const sansPoste: RestLigne = {
  periode: PERIODE,
  temps: { travail: 'PT1H', nonConformite: 'PT0S', total: 'PT1H' },
  nonConformites: [],
  cout: { machine: 0, mainDOeuvre: 20, total: 20 },
};

export const coutDeRevientFixture = (): RestRapport => ({
  element: { id: 'element-1', nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' },
  lignes: [fraisage, tournage, sansPoste],
  temps: { travail: 'PT4H', nonConformite: 'PT1H', total: 'PT5H' },
  cout: { machine: 195, mainDOeuvre: 100, total: 295 },
});

export const rapportVideFixture = (): RestRapport => ({
  element: { id: 'element-1', nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' },
  lignes: [],
  temps: { travail: 'PT0S', nonConformite: 'PT0S', total: 'PT0S' },
  cout: { machine: 0, mainDOeuvre: 0, total: 0 },
});

export class CoutDeRevientApiFixture {
  failRead = false;
  elementInconnu = false;
  sansPointage = false;
  readonly lectures: string[] = [];

  install(): void {
    cy.intercept({ method: 'GET', pathname: ROUTE }, request => {
      this.lectures.push(request.url.slice(request.url.lastIndexOf('/') + 1));
      request.reply(this.reponse());
    }).as('coutDeRevientRead');
  }

  private reponse(): { statusCode?: number; body: RestRapport | object } {
    if (this.failRead) {
      return { statusCode: 500, body: {} };
    }
    /* Le back ne pose aucune URN sur ce 404 : le double reproduit le `ProblemDetail` nu qu'il rend. */
    if (this.elementInconnu) {
      return { statusCode: 404, body: { title: 'element de fabrication introuvable' } };
    }
    if (this.sansPointage) {
      return { body: rapportVideFixture() };
    }
    return { body: coutDeRevientFixture() };
  }
}
