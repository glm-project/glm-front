import { components } from '@/app/generated/schema';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];
type RestPointage = components['schemas']['RestPointageDuCout'];

const ROUTE = '/api/couts-de-revient/*';

const completFixture = <T>(valeur: T): { complete: true; valeur: T } => ({ complete: true, valeur });

const PERIODE = { debut: '2026-05-11T09:00:00Z', fin: '2026-05-11T12:00:00Z' };

const pointageDeFraisage: RestPointage = {
  anomalies: [],
  operateur: { id: 'operateur-julien', prenom: 'Julien', nom: 'Martin' },
  poste: { id: 'poste-dmg', libelle: 'DMG DMU 50' },
  categorie: 'TRAVAIL',
  debut: '2026-05-11T09:00:00Z',
  fin: '2026-05-11T12:00:00Z',
  duree: completFixture('PT3H'),
  coutHoraire: 45,
  tauxHoraire: 20,
  cout: { machine: completFixture(135), mainDOeuvre: completFixture(50), total: completFixture(185) },
  parts: [
    {
      debut: '2026-05-11T09:00:00Z',
      fin: '2026-05-11T10:00:00Z',
      duree: 'PT1H',
      diviseur: 1,
      mainDOeuvre: completFixture(20),
      paralleles: [],
      bloquants: [],
    },
    {
      debut: '2026-05-11T10:00:00Z',
      fin: '2026-05-11T11:00:00Z',
      duree: 'PT1H',
      diviseur: 2,
      mainDOeuvre: completFixture(10),
      paralleles: [
        {
          element: { id: 'element-192', nom: 'OF-2026-000192', categorie: 'OF', type: 'ORDRE_DE_FABRICATION' },
          poste: { id: 'poste-haas', libelle: 'Haas VF-2' },
          nature: 'Fraisage',
        },
      ],
      bloquants: [],
    },
    {
      debut: '2026-05-11T11:00:00Z',
      fin: '2026-05-11T12:00:00Z',
      duree: 'PT1H',
      diviseur: 1,
      mainDOeuvre: completFixture(20),
      paralleles: [],
      bloquants: [],
    },
  ],
  contradictoires: [],
};

const pointageAResoudre: RestPointage = {
  anomalies: ['A_RESOUDRE'],
  operateur: { id: 'operateur-julien', prenom: 'Julien', nom: 'Martin' },
  poste: { id: 'poste-dmg', libelle: 'DMG DMU 50' },
  categorie: 'TRAVAIL',
  debut: '2026-05-11T08:00:00Z',
  finAuPlusTard: '2026-05-11T11:40:00Z',
  duree: { complete: false },
  coutHoraire: 45,
  tauxHoraire: 20,
  cout: { machine: { complete: false }, mainDOeuvre: { complete: false }, total: { complete: false } },
  parts: [],
  contradictoires: [
    { id: 'fait-1', type: 'DEBUT', survenue: '2026-05-11T08:00:00Z' },
    { id: 'fait-2', type: 'DEBUT', survenue: '2026-05-11T09:10:00Z' },
  ],
};

const fraisage: RestLigne = {
  nature: 'Fraisage',
  periode: PERIODE,
  temps: { travail: completFixture('PT2H'), nonConformite: completFixture('PT1H'), total: completFixture('PT3H') },
  finsAutomatiques: [],
  nonConformites: [{ debut: '2026-05-11T10:00:00Z', fin: '2026-05-11T11:00:00Z' }],
  cout: { machine: completFixture(135), mainDOeuvre: completFixture(60), total: completFixture(195) },
  pointages: [pointageDeFraisage],
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
  element: { id: 'element-1', nom: 'OF-2026-000001', categorie: 'OF', type: 'ORDRE_DE_FABRICATION' },
  lignes: [fraisage, tournage, sansPoste],
  temps: { travail: completFixture('PT4H'), nonConformite: completFixture('PT1H'), total: completFixture('PT5H') },
  cout: { machine: completFixture(195), mainDOeuvre: completFixture(100), total: completFixture(295) },
});

export const rapportVideFixture = (): RestRapport => ({
  evaluation: '2026-05-11T12:00:00Z',
  activitesEnCours: 0,
  conflits: [],
  element: { id: 'element-1', nom: 'OF-2026-000001', categorie: 'OF', type: 'ORDRE_DE_FABRICATION' },
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
    lignes: [{ ...fraisage, temps, cout, periode: { debut: '2026-05-11T08:00:00Z' }, nonConformites: [], pointages: [pointageAResoudre] }],
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
    lignes: [
      {
        ...fraisage,
        temps,
        cout,
        periode,
        nonConformites: [],
        finsAutomatiques: [periode],
        pointages: [
          {
            ...pointageDeFraisage,
            anomalies: ['FIN_AUTOMATIQUE'],
            debut: periode.debut,
            fin: periode.fin,
            duree: completFixture('PT13H'),
            cout,
            parts: [],
          },
        ],
      },
    ],
  };
};

export const rapportEnCoursFixture = (): RestRapport => ({ ...rapportVideFixture(), activitesEnCours: 2 });

export class CoutDeRevientApiFixture {
  failRead = false;
  elementInconnu = false;
  sansPointage = false;
  readonly lectures: string[] = [];
  rapport: RestRapport = coutDeRevientFixture();

  install(): void {
    cy.intercept({ method: 'GET', pathname: '/api/elements-de-fabrication/*' }, request => {
      request.reply({ id: request.url.slice(request.url.lastIndexOf('/') + 1) });
    }).as('costElementRead');
    cy.intercept({ method: 'GET', pathname: ROUTE }, request => {
      const element = request.url.slice(request.url.lastIndexOf('/') + 1);
      this.lectures.push(element);
      request.reply(this.reponse(element));
    }).as('coutDeRevientRead');
  }

  private reponse(element: string): { statusCode?: number; body: RestRapport | object } {
    if (this.failRead) {
      return { statusCode: 500, body: {} };
    }
    if (this.elementInconnu) {
      return { statusCode: 404, body: { title: 'element de fabrication introuvable' } };
    }
    if (this.sansPointage) {
      const rapport = rapportVideFixture();
      return { body: { ...rapport, element: { ...rapport.element, id: element } } };
    }
    return { body: { ...this.rapport, element: { ...this.rapport.element, id: element } } };
  }
}
