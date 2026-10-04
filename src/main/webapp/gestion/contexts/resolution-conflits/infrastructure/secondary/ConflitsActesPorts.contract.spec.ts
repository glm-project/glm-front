import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ActeResolution } from '../../domain/acte/ActeResolution';
import { PrevisualisationConflitPort } from '../../domain/acte/ConflitsActesPorts';
import { AdresseDossier } from '../../domain/dossier/DossierConflit';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { HttpConflits } from './HttpConflits';

const adresseFixture: AdresseDossier = { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-17') };
const acteFixture: ActeResolution = { kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui confirmé' };
const correctionFixture: ActeResolution = {
  kind: 'CORRECTION',
  pointage: 'fin-17',
  motif: 'Cible confirmée',
  fait: {
    type: 'FIN',
    intention: 'FIN',
    activiteVisee: 'nc-12',
    operateur: 'op-camille',
    poste: 'poste-dmu',
    instant: '2026-09-14T17:00:00.123456789+02:00',
  },
};
const correctionRecueFixture: components['schemas']['RestActeCorrection'] = correctionFixture;
const perimetreFixture: components['schemas']['RestSequenceDuDossier'] = {
  operateurId: 'op-camille',
  activites: ['travail-8'],
  pointages: ['debut-8', 'fin-17'],
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 2,
};
const dossierFixture = (kind: 'EN_CONFLIT' | 'ANCRE_ANNULEE', revision: number): components['schemas']['RestDossierConflit'] => ({
  kind,
  adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
  revision,
  evaluation: '2026-10-04T10:00:00Z',
  ...(kind === 'EN_CONFLIT' ? { sequence: perimetreFixture } : {}),
  perimetre: perimetreFixture,
  activites: [],
  diagnostics: [],
  choix: [],
  suivi: {
    id: 'suivi-camille',
    element: 'moule-42',
    nom: 'M-042',
    type: 'PRODUIT',
    engageLe: '2026-09-14T06:00:00Z',
    engagePar: 'gestionnaire',
    etat: 'EN_ATTENTE',
    activitesEnCours: [],
    conflits: [],
    journal: [],
  },
});

describe('Beyond the contract: HTTP conflict actes', () => {
  let preview: PrevisualisationConflitPort;
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: PrevisualisationConflitPort, useClass: HttpConflits },
      ],
    });
    preview = TestBed.inject(PrevisualisationConflitPort);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
  });

  it('should preview the proposed cancellation and expose its command with the canonical result at the cancelled anchor', async () => {
    const apercu = preview.preview(adresseFixture, 7, acteFixture);

    const commande = whenPreviewAnswers();
    const resultat = await apercu;

    expect(resultat).toMatchObject({
      kind: 'APERCU',
      apercu: {
        adresse: adresseFixture,
        commande,
        reference: 'opaque-reference',
        version: 7,
        acte: acteFixture,
        avant: { version: 7, enConflit: true, ligne: { nombrePointages: 2 } },
        apres: { version: 8, enConflit: false, ligne: { adresse: adresseFixture, nombrePointages: 2 } },
      },
    });
  });

  it('should retain the exact regularisation timestamp while omitting its absent target and workstation', async () => {
    const acte: ActeResolution = {
      kind: 'REGULARISATION',
      fait: {
        type: 'DEBUT',
        intention: 'OUVERTURE',
        activiteVisee: '',
        operateur: 'op-camille',
        poste: '',
        instant: '2026-09-14T08:00:00.123456789+02:00',
      },
    };
    const attendu: components['schemas']['RestActeDeResolution'] = {
      kind: 'REGULARISATION',
      fait: { type: 'DEBUT', intention: 'OUVERTURE', operateur: 'op-camille', instant: '2026-09-14T08:00:00.123456789+02:00' },
    };

    const apercu = preview.preview(adresseFixture, 7, acte);
    whenPreviewAnswers(attendu);
    const resultat = await apercu;

    expect(resultat).toMatchObject({ kind: 'APERCU', apercu: { acte } });
  });

  it.each([
    { nom: 'command', changement: { commande: 'autre-commande' } },
    { nom: 'address', changement: { adresse: { suivi: 'suivi-camille', pointage: 'autre-pointage' } } },
    { nom: 'revision', changement: { revision: 6 } },
    { nom: 'reference', changement: { reference: '' } },
    { nom: 'acte', changement: { acte: { ...acteFixture, motif: 'Motif altéré' } } },
  ])('should reject a preview with an altered $nom instead of authorizing confirmation', async ({ changement }) => {
    const apercu = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);

    whenPreviewAnswers(acteFixture, changement);
    const resultat = await apercu;

    expect(resultat).toEqual(new Error('Réponse d’aperçu incohérente.'));
  });

  it.each([
    { nom: 'target', changement: { activiteVisee: 'travail-8' } },
    { nom: 'type', changement: { type: 'DEBUT' as const } },
    { nom: 'intention', changement: { intention: 'TRANSITION' as const } },
    { nom: 'operator', changement: { operateur: 'autre-operateur' } },
    { nom: 'workstation', changement: { poste: 'autre-poste' } },
    { nom: 'nanosecond', changement: { instant: '2026-09-14T17:00:00.123456788+02:00' } },
  ])('should reject a correction preview whose echoed $nom differs from the proposition', async ({ changement }) => {
    const apercu = preview.preview(adresseFixture, 7, correctionFixture).catch((failure: unknown) => failure);

    whenPreviewAnswers(correctionRecueFixture, {
      acte: { ...correctionRecueFixture, fait: { ...correctionRecueFixture.fait, ...changement } },
    });
    const resultat = await apercu;

    expect(resultat).toEqual(new Error('Réponse d’aperçu incohérente.'));
  });

  it('should accept a nanosecond-equivalent echo with another offset while retaining the original proposition spelling', async () => {
    const apercu = preview.preview(adresseFixture, 7, correctionFixture);

    whenPreviewAnswers(correctionRecueFixture, {
      acte: { ...correctionRecueFixture, fait: { ...correctionRecueFixture.fait, instant: '2026-09-14T15:00:00.123456789Z' } },
    });
    const resultat = await apercu;

    expect(resultat).toMatchObject({ kind: 'APERCU', apercu: { acte: correctionFixture } });
  });

  const whenPreviewAnswers = (
    acte: components['schemas']['RestActeDeResolution'] = acteFixture,
    changement: Partial<components['schemas']['RestApercuDeResolution']> = {},
  ): string => {
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus');
    const body = request.request.body as components['schemas']['RestDemandeDApercu'];
    expect(request.request.method).toBe('POST');
    expect(body).toEqual({ revision: 7, acte, commande: body.commande });
    expect(body.commande).toMatch(/^[0-9a-f-]{36}$/);
    request.flush({
      commande: body.commande,
      adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
      revision: 7,
      evaluation: '2026-10-04T10:00:00Z',
      expireLe: '2026-10-04T10:05:00Z',
      reference: 'opaque-reference',
      acte,
      avant: dossierFixture('EN_CONFLIT', 7),
      apres: dossierFixture('ANCRE_ANNULEE', 8),
      ...changement,
    } satisfies components['schemas']['RestApercuDeResolution']);
    return body.commande;
  };
});
