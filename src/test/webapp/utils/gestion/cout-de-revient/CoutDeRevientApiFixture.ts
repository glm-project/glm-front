import { components } from '@/app/generated/schema';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];

const ROUTE = '/api/couts-de-revient/*';

const completFixture = <T>(valeur: T): { complete: true; valeur: T } => ({ complete: true, valeur });

const PERIODE = { debut: '2026-05-11T09:00:00Z', fin: '2026-05-11T12:00:00Z' };

const fraisage: RestLigne = {
  nature: 'Fraisage',
  periode: PERIODE,
  temps: { travail: completFixture('PT2H'), nonConformite: completFixture('PT1H'), total: completFixture('PT3H') },
  finsAutomatiques: [],
  nonConformites: [{ debut: '2026-05-11T10:00:00Z', fin: '2026-05-11T11:00:00Z' }],
  cout: { machine: completFixture(135), mainDOeuvre: completFixture(60), total: completFixture(195) },
  pointages: [],
};

const tournage: RestLigne = {
  nature: 'Tournage',
  periode: PERIODE,
  temps: { travail: completFixture('PT1H'), nonConformite: completFixture('PT0S'), total: completFixture('PT1H') },
  finsAutomatiques: [],
  nonConformites: [],
  cout: { machine: completFixture(60), mainDOeuvre: completFixture(20), total: completFixture(80) },
  pointages: [],
};

const sansPoste: RestLigne = {
  periode: PERIODE,
  temps: { travail: completFixture('PT1H'), nonConformite: completFixture('PT0S'), total: completFixture('PT1H') },
  finsAutomatiques: [],
  nonConformites: [],
  cout: { machine: completFixture(0), mainDOeuvre: completFixture(20), total: completFixture(20) },
  pointages: [],
};

export const coutDeRevientFixture = (): RestRapport => ({
  evaluation: '2026-05-11T12:00:00Z',
  activitesEnCours: 0,
  conflits: [],
  element: { id: 'element-1', nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' },
  lignes: [fraisage, tournage, sansPoste],
  temps: { travail: completFixture('PT4H'), nonConformite: completFixture('PT1H'), total: completFixture('PT5H') },
  cout: { machine: completFixture(195), mainDOeuvre: completFixture(100), total: completFixture(295) },
});

export const rapportVideFixture = (): RestRapport => ({
  evaluation: '2026-05-11T12:00:00Z',
  activitesEnCours: 0,
  conflits: [],
  element: { id: 'element-1', nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' },
  lignes: [],
  temps: { travail: completFixture('PT0S'), nonConformite: completFixture('PT0S'), total: completFixture('PT0S') },
  cout: { machine: completFixture(0), mainDOeuvre: completFixture(0), total: completFixture(0) },
});

export const rapportIncompletFixture = (): RestRapport => {
  const temps = { travail: completFixture('PT5H'), nonConformite: { complete: false }, total: { complete: false } };
  const cout = { machine: completFixture(300), mainDOeuvre: { complete: false }, total: { complete: false } };
  return {
    ...coutDeRevientFixture(),
    temps,
    cout,
    lignes: [{ ...fraisage, temps, cout, periode: { debut: '2026-05-11T08:00:00Z' }, nonConformites: [] }],
    conflits: [
      {
        element: 'element-1',
        operateur: 'operateur-a',
        poste: 'poste-a',
        activites: ['activite-a', 'activite-b'],
        pointages: ['pointage-a', 'pointage-b'],
      },
      { element: 'autre-element', operateur: 'operateur-b', activites: [], pointages: ['pointage-c'] },
    ],
  };
};

export const rapportAutomatiqueFixture = (): RestRapport => {
  const temps = { travail: completFixture('PT13H'), nonConformite: completFixture('PT0S'), total: completFixture('PT13H') };
  const cout = { machine: completFixture(585), mainDOeuvre: completFixture(260), total: completFixture(845) };
  const periode = { debut: '2026-05-11T08:00:00Z', fin: '2026-05-11T21:00:00Z' };
  return {
    ...coutDeRevientFixture(),
    temps,
    cout,
    lignes: [{ ...fraisage, temps, cout, periode, nonConformites: [], finsAutomatiques: [periode] }],
  };
};

export const rapportEnCoursFixture = (): RestRapport => ({ ...rapportVideFixture(), activitesEnCours: 2 });

export const rapportConflitSansActiviteFixture = (): RestRapport => ({
  ...rapportVideFixture(),
  conflits: [{ element: 'element-1', operateur: 'operateur-a', activites: [], pointages: ['pointage-a'] }],
});

export class CoutDeRevientApiFixture {
  failRead = false;
  elementInconnu = false;
  sansPointage = false;
  readonly lectures: string[] = [];
  rapport: RestRapport = coutDeRevientFixture();

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
    if (this.elementInconnu) {
      return { statusCode: 404, body: { title: 'element de fabrication introuvable' } };
    }
    if (this.sansPointage) {
      return { body: rapportVideFixture() };
    }
    return { body: this.rapport };
  }
}
