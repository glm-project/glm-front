import { components } from '@/app/generated/schema';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];
type RestPointage = components['schemas']['RestPointageDuCout'];

const ROUTE = '/api/couts-de-revient/*';

const valeurFixture = <T>(valeur: T): { valeur: T } => ({ valeur });

const PERIODE = { debut: '2026-05-11T09:00:00Z', fin: '2026-05-11T12:00:00Z' };

const pointageDeFraisage: RestPointage = {
  anomalies: [],
  operateur: { id: 'operateur-julien', prenom: 'Julien', nom: 'Martin' },
  poste: { id: 'poste-dmg', libelle: 'DMG DMU 50' },
  categorie: 'TRAVAIL',
  debut: '2026-05-11T09:00:00Z',
  fin: '2026-05-11T12:00:00Z',
  duree: valeurFixture('PT3H'),
  coutHoraire: 45,
  tauxHoraire: 20,
  cout: { machine: valeurFixture(135), mainDOeuvre: valeurFixture(50), total: valeurFixture(185) },
  parts: [
    {
      debut: '2026-05-11T09:00:00Z',
      fin: '2026-05-11T10:00:00Z',
      duree: 'PT1H',
      diviseur: 1,
      mainDOeuvre: valeurFixture(20),
      paralleles: [],
    },
    {
      debut: '2026-05-11T10:00:00Z',
      fin: '2026-05-11T11:00:00Z',
      duree: 'PT1H',
      diviseur: 2,
      mainDOeuvre: valeurFixture(10),
      paralleles: [
        {
          element: { id: 'element-192', nom: 'OF-2026-000192', categorie: 'OF' },
          poste: { id: 'poste-haas', libelle: 'Haas VF-2' },
          nature: 'Fraisage',
        },
      ],
    },
    {
      debut: '2026-05-11T11:00:00Z',
      fin: '2026-05-11T12:00:00Z',
      duree: 'PT1H',
      diviseur: 1,
      mainDOeuvre: valeurFixture(20),
      paralleles: [],
    },
  ],
};

const fraisage: RestLigne = {
  nature: 'Fraisage',
  periode: PERIODE,
  temps: { travail: valeurFixture('PT2H'), nonConformite: valeurFixture('PT1H'), total: valeurFixture('PT3H') },
  finsAutomatiques: [],
  nonConformites: [{ debut: '2026-05-11T10:00:00Z', fin: '2026-05-11T11:00:00Z' }],
  cout: { machine: valeurFixture(135), mainDOeuvre: valeurFixture(60), total: valeurFixture(195) },
  pointages: [pointageDeFraisage],
};

const tournage: RestLigne = {
  nature: 'Tournage',
  periode: PERIODE,
  temps: { travail: valeurFixture('PT1H'), nonConformite: valeurFixture('PT0S'), total: valeurFixture('PT1H') },
  finsAutomatiques: [],
  nonConformites: [],
  cout: { machine: valeurFixture(60), mainDOeuvre: valeurFixture(20), total: valeurFixture(80) },
  pointages: [],
};

const sansPoste: RestLigne = {
  periode: PERIODE,
  temps: { travail: valeurFixture('PT1H'), nonConformite: valeurFixture('PT0S'), total: valeurFixture('PT1H') },
  finsAutomatiques: [],
  nonConformites: [],
  cout: { machine: valeurFixture(0), mainDOeuvre: valeurFixture(20), total: valeurFixture(20) },
  pointages: [],
};

export const coutDeRevientFixture = (): RestRapport => ({
  evaluation: '2026-05-11T12:00:00Z',
  activitesEnCours: 0,
  element: { id: 'element-1', nom: 'OF-2026-000001', categorie: 'OF' },
  lignes: [fraisage, tournage, sansPoste],
  temps: { travail: valeurFixture('PT4H'), nonConformite: valeurFixture('PT1H'), total: valeurFixture('PT5H') },
  cout: { machine: valeurFixture(195), mainDOeuvre: valeurFixture(100), total: valeurFixture(295) },
});

export const rapportVideFixture = (): RestRapport => ({
  evaluation: '2026-05-11T12:00:00Z',
  activitesEnCours: 0,
  element: { id: 'element-1', nom: 'OF-2026-000001', categorie: 'OF' },
  lignes: [],
  temps: { travail: valeurFixture('PT0S'), nonConformite: valeurFixture('PT0S'), total: valeurFixture('PT0S') },
  cout: { machine: valeurFixture(0), mainDOeuvre: valeurFixture(0), total: valeurFixture(0) },
});

export const rapportAutomatiqueFixture = (): RestRapport => {
  const temps = { travail: valeurFixture('PT13H'), nonConformite: valeurFixture('PT0S'), total: valeurFixture('PT13H') };
  const cout = { machine: valeurFixture(585), mainDOeuvre: valeurFixture(260), total: valeurFixture(845) };
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
            duree: valeurFixture('PT13H'),
            cout,
            parts: [],
          },
        ],
      },
    ],
  };
};

export const rapportEnCoursFixture = (): RestRapport => ({ ...rapportVideFixture(), activitesEnCours: 2 });

export const fichierExporteFixture = (adresse: string): { body: string; headers: Record<string, string> } => {
  const { pathname, searchParams } = new URL(adresse);
  const extension = pathname.slice(pathname.lastIndexOf('.') + 1);
  const version = searchParams.get('version');
  const suffixe = version === null ? '' : `-${version}`;
  return {
    body: `${extension}${suffixe}`,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="cout-de-revient-OF-2026-000001${suffixe}.${extension}"`,
    },
  };
};

export class CoutDeRevientApiFixture {
  failRead = false;
  elementInconnu = false;
  sansPointage = false;
  readonly lectures: string[] = [];
  readonly exports: string[] = [];
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
    cy.intercept({ method: 'GET', pathname: '/api/couts-de-revient/*/export.*' }, request => {
      this.exports.push(request.url);
      request.reply(fichierExporteFixture(request.url));
    }).as('coutDeRevientExport');
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
