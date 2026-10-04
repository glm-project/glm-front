import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { PreparationActe } from '../../application/PreparationActe';
import { ActeResolution } from '../../domain/acte/ActeResolution';
import { ApplicationActePort, PrevisualisationConflitPort } from '../../domain/acte/ConflitsActesPorts';
import { ReferenceApercu } from '../../domain/acte/ResolutionDuConflit';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ConflitsReadPort } from '../../domain/dossier/ConflitsReadPort';
import { AdresseDossier } from '../../domain/dossier/DossierConflit';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { HttpConflits } from './HttpConflits';

const adresseFixture: AdresseDossier = { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-17') };
const acteFixture: ActeResolution = { kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui confirmé' };
const referenceFixture: ReferenceApercu = {
  adresse: adresseFixture,
  commande: '80000000-0000-0000-0000-000000000001',
  reference: 'opaque-reference',
  version: 7,
};
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
  enConflit: kind === 'EN_CONFLIT',
  adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
  revision,
  evaluation: '2026-10-04T10:00:00Z',
  ...(kind === 'EN_CONFLIT' ? { sequence: perimetreFixture } : {}),
  perimetre: perimetreFixture,
  activites: [],
  diagnostics: [],
  choix: [],
  continuations: [],
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
  let application: ApplicationActePort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    errors = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useValue: errors },
        PreparationActe,
        { provide: ConflitsReadPort, useClass: HttpConflits },
        { provide: PrevisualisationConflitPort, useClass: HttpConflits },
        { provide: ApplicationActePort, useClass: HttpConflits },
      ],
    });
    preview = TestBed.inject(PrevisualisationConflitPort);
    application = TestBed.inject(ApplicationActePort);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
    vi.useRealTimers();
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

  it('should expose a known invalid-preview refusal without describing an API limitation', async () => {
    const demande = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);

    whenRequestFails('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus', 'apercu-invalide', 400, 'Aperçu invalide');
    const resultat = await demande;

    expect(resultat).toEqual({ kind: 'REFUS', raison: 'Aperçu invalide' });
  });

  it.each(['apercu-obsolete', 'saisie-concurrente'])(
    'should invalidate preview preparation after the known concurrent refusal %s',
    async code => {
      const demande = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);

      whenRequestFails('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus', code, 409, 'Le suivi a changé');
      const resultat = await demande;

      expect(resultat).toEqual({ kind: 'CONCURRENCE' });
    },
  );

  it.each([
    'confirmation-reutilisee',
    'suivi-d-atelier-introuvable',
    'evenement-d-atelier-introuvable',
    'operateur-introuvable',
    'poste-de-travail-introuvable',
    'activite-visee-introuvable',
    'operateur-non-habilite',
    'activite-visee-incoherente',
    'evenement-deja-annule',
    'evenement-anterieur-a-l-engagement',
    'identifiant-evenement-reutilise',
    'date-de-survenue-future',
  ])('should preserve the known preview refusal %s and its message', async code => {
    const demande = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);

    whenRequestFails('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus', code, 409, 'Acte refusé par Atelier');
    const resultat = await demande;

    expect(resultat).toEqual({ kind: 'REFUS', raison: 'Acte refusé par Atelier' });
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

  it.each([
    { suivi: 'autre-suivi', pointage: 'fin-17' },
    { suivi: 'suivi-camille', pointage: 'autre-pointage' },
  ])('should reject preview consequences belonging to another addressed dossier $suivi/$pointage', async adresse => {
    const apres = dossierFixture('ANCRE_ANNULEE', 8);
    apres.adresse = adresse;

    const apercu = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);
    whenPreviewAnswers(acteFixture, { apres });
    const resultat = await apercu;

    expect(resultat).toEqual(new Error('Réponse d’aperçu incohérente.'));
  });

  it.each(['avant', 'apres'] as const)('should reject the %s dossier evaluated at another nanosecond than its preview', async cote => {
    const dossier = dossierFixture(cote === 'avant' ? 'EN_CONFLIT' : 'ANCRE_ANNULEE', cote === 'avant' ? 7 : 8);
    dossier.evaluation = '2026-10-04T10:00:00.000000001Z';

    const apercu = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);
    whenPreviewAnswers(acteFixture, { [cote]: dossier });
    const resultat = await apercu;

    expect(resultat).toEqual(new Error('Réponse d’aperçu incohérente.'));
  });

  it('should accept before and after evaluations expressed with equivalent offsets', async () => {
    const avant = { ...dossierFixture('EN_CONFLIT', 7), evaluation: '2026-10-04T12:00:00+02:00' };
    const apres = { ...dossierFixture('ANCRE_ANNULEE', 8), evaluation: '2026-10-04T07:00:00-03:00' };

    const apercu = preview.preview(adresseFixture, 7, acteFixture);
    whenPreviewAnswers(acteFixture, { avant, apres });
    const resultat = await apercu;

    expect(resultat).toMatchObject({ kind: 'APERCU', apercu: { acte: acteFixture } });
  });

  it('should reject an echoed acte of another kind instead of allowing confirmation', async () => {
    const apercu = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);

    whenPreviewAnswers(acteFixture, { acte: { kind: 'REGULARISATION', fait: correctionRecueFixture.fait } });
    const resultat = await apercu;

    expect(resultat).toEqual(new Error('Réponse d’aperçu incohérente.'));
  });

  it('should preserve an authoritative remaining conflict even when the proposed result cancels the anchor', async () => {
    const apercu = preview.preview(adresseFixture, 7, acteFixture);

    whenPreviewAnswers(acteFixture, { apres: { ...dossierFixture('ANCRE_ANNULEE', 8), enConflit: true } });
    const resultat = await apercu;

    expect(resultat).toMatchObject({ kind: 'APERCU', apercu: { apres: { enConflit: true } } });
  });

  it('should reject an act preview missing its authoritative perimeter instead of falling back to the current sequence', async () => {
    const avant = dossierFixture('EN_CONFLIT', 7);
    delete avant.perimetre;

    const apercu = preview.preview(adresseFixture, 7, acteFixture).catch((failure: unknown) => failure);
    whenPreviewAnswers(acteFixture, { avant });
    const resultat = await apercu;

    expect(resultat).toEqual(new Error('Périmètre du dossier absent.'));
  });

  it('should confirm the exact public command and return the current canonical dossier from its receipt', async () => {
    const confirmation = application.apply(referenceFixture);

    whenConfirmationAnswers();
    const resultat = await confirmation;

    expect(resultat).toMatchObject({ kind: 'APPLIQUE', dossier: { version: 9, enConflit: false, ligne: { adresse: adresseFixture } } });
  });

  it('should keep a thirty-second confirmation timeout unknown and retry only its original public command', async () => {
    const { preparation, commande } = await givenAPreparedCancellation();

    const premiereDemande = await whenTheConfirmationTimesOut(preparation);
    const inconnue = preparation.operation();
    const verification = preparation.verify();
    whenReceiptAnswers({ kind: 'NON_ATTESTEE' }, commande);
    await verification;
    const nonAttestee = preparation.operation();
    const reprise = preparation.retryConfirmation();
    const confirmation = confirmationFixture();
    confirmation.recu.commande = commande;
    const deuxiemeDemande = whenTheRetriedConfirmationAnswers(confirmation);
    await reprise;

    expect(inconnue).toEqual({ kind: 'ISSUE_INCONNUE' });
    expect(nonAttestee).toEqual({ kind: 'ISSUE_INCONNUE' });
    expect(premiereDemande).toEqual({ commande, reference: referenceFixture.reference });
    expect(deuxiemeDemande).toEqual(premiereDemande);
    expect(errors.errors).toMatchObject([{ name: 'TimeoutError' }]);
    expect(preparation.operation()).toMatchObject({ kind: 'APPLIQUE', dossier: { version: 9, enConflit: false } });
  });

  const givenAPreparedCancellation = async () => {
    const lecture = TestBed.inject(ConflitsReadPort).read(adresseFixture);
    server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17').flush(dossierFixture('EN_CONFLIT', 7));
    const dossier = await lecture;
    if (dossier.kind !== 'DOSSIER') throw new Error('Dossier de préparation fixture absent');
    const preparation = TestBed.inject(PreparationActe);
    preparation.choose(SaisieActe.cancel('fin-17').afterChange({ motif: acteFixture.motif }));
    const demande = preparation.preview(dossier.dossier);
    const commande = whenPreviewAnswers();
    await demande;
    return { preparation, commande };
  };

  const whenTheConfirmationTimesOut = async (preparation: PreparationActe): Promise<unknown> => {
    vi.useFakeTimers();
    const confirmation = preparation.confirm();
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution');
    await vi.advanceTimersByTimeAsync(30_000);
    await confirmation;
    vi.useRealTimers();
    return request.request.body;
  };

  const whenTheRetriedConfirmationAnswers = (confirmation: components['schemas']['RestConfirmationEnregistree']): unknown => {
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution');
    request.flush(confirmation);
    return request.request.body;
  };

  it.each([
    { code: 'apercu-invalide', attendu: { kind: 'REFUS', raison: 'Confirmation refusée' } },
    { code: 'confirmation-reutilisee', attendu: { kind: 'REFUS', raison: 'Confirmation refusée' } },
    { code: 'apercu-obsolete', attendu: { kind: 'CONCURRENCE' } },
    { code: 'saisie-concurrente', attendu: { kind: 'CONCURRENCE' } },
  ])('should expose the known confirmation refusal $code without attesting a write', async ({ code, attendu }) => {
    const demande = application.apply(referenceFixture).catch((failure: unknown) => failure);

    whenRequestFails('/api/atelier/suivis/suivi-camille/confirmations-de-resolution', code, 409, 'Confirmation refusée');
    const resultat = await demande;

    expect(resultat).toEqual(attendu);
  });

  it('should verify a public command without a prior local preview and return its current canonical dossier', async () => {
    const verification = application.verify(referenceFixture).catch((failure: unknown) => failure);

    whenReceiptAnswers(confirmationFixture());
    const resultat = await verification;

    expect(resultat).toMatchObject({ kind: 'ATTESTE', dossier: { version: 9, enConflit: false, ligne: { adresse: adresseFixture } } });
  });

  it('should retain the known inaccessible-follow-up refusal without attesting absence of a confirmation', async () => {
    const demande = application.verify(referenceFixture).catch((failure: unknown) => failure);

    whenRequestFails(
      `/api/atelier/suivis/suivi-camille/confirmations-de-resolution/${referenceFixture.commande}`,
      'suivi-d-atelier-introuvable',
      404,
      'Suivi inaccessible',
    );
    const resultat = await demande;

    expect(resultat).toEqual({ kind: 'REFUS', raison: 'Suivi inaccessible' });
  });

  it.each(
    [
      { nom: 'follow-up', changement: { adresse: { suivi: 'autre-suivi', pointage: 'fin-17' } } },
      { nom: 'anchor', changement: { adresse: { suivi: 'suivi-camille', pointage: 'autre-pointage' } } },
      { nom: 'registered revision', changement: { revision: 7 } },
    ].flatMap(changement => (['apply', 'verify'] as const).map(operation => ({ ...changement, operation }))),
  )('should reject a canonical dossier with an inconsistent $nom during $operation', async ({ changement, operation }) => {
    const confirmation = confirmationFixture();
    confirmation.dossier = { ...confirmation.dossier, ...changement };

    const reponse = application[operation](referenceFixture).catch((failure: unknown) => failure);
    whenCanonicalAnswers(operation, confirmation);
    const resultat = await reponse;

    expect(resultat).toEqual(new Error('Reçu de confirmation incohérent.'));
  });

  it.each(
    [
      { nom: 'command', changement: { commande: 'autre-commande' } },
      { nom: 'address', changement: { adresse: { suivi: 'suivi-camille', pointage: 'autre-pointage' } } },
      { nom: 'initial revision', changement: { revisionDeDepart: 6 } },
    ].flatMap(changement => (['apply', 'verify'] as const).map(operation => ({ ...changement, operation }))),
  )('should reject a receipt for another $nom during $operation', async ({ changement, operation }) => {
    const recu = confirmationFixture();
    recu.recu = { ...recu.recu, ...changement };

    const reponse = application[operation](referenceFixture).catch((failure: unknown) => failure);
    whenCanonicalAnswers(operation, recu);
    const resultat = await reponse;

    expect(resultat).toEqual(new Error('Reçu de confirmation incohérent.'));
  });

  const whenCanonicalAnswers = (operation: 'apply' | 'verify', resultat: components['schemas']['RestConfirmationDeResolution']): void => {
    if (operation === 'apply') whenConfirmationAnswers(resultat);
    else whenReceiptAnswers(resultat);
  };

  it.each([
    { operation: 'apply' as const, attendu: { kind: 'ISSUE_INCONNUE' } },
    { operation: 'verify' as const, attendu: { kind: 'NON_ATTESTE' } },
  ])('should preserve uncertainty when $operation receives no attested receipt', async ({ operation, attendu }) => {
    const demande = application[operation](referenceFixture);

    whenCanonicalAnswers(operation, { kind: 'NON_ATTESTEE' });
    const resultat = await demande;

    expect(resultat).toEqual(attendu);
  });

  it.each((['preview', 'apply', 'verify'] as const).flatMap(operation => [403, 409, 500].map(status => ({ operation, status }))))(
    'should reject the unknown code with status $status during $operation as a technical failure',
    async ({ operation, status }) => {
      const demande = requestActOperation(operation).catch((failure: unknown) => failure);

      whenRequestFails(actOperationUrl(operation), 'code-inconnu', status, 'Refus inconnu');
      const resultat = await demande;

      expect(resultat).toMatchObject({ name: 'HttpErrorResponse', status, error: { type: 'urn:glm:erreur:atelier:code-inconnu' } });
    },
  );

  const requestActOperation = (operation: 'preview' | 'apply' | 'verify'): Promise<unknown> =>
    ({
      preview: () => preview.preview(adresseFixture, 7, acteFixture),
      apply: () => application.apply(referenceFixture),
      verify: () => application.verify(referenceFixture),
    })[operation]();

  const actOperationUrl = (operation: 'preview' | 'apply' | 'verify'): string =>
    ({
      preview: '/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus',
      apply: '/api/atelier/suivis/suivi-camille/confirmations-de-resolution',
      verify: `/api/atelier/suivis/suivi-camille/confirmations-de-resolution/${referenceFixture.commande}`,
    })[operation];

  const whenRequestFails = (url: string, code: string, status: number, message: string): void => {
    server.expectOne(url).flush({ type: `urn:glm:erreur:atelier:${code}`, message }, { status, statusText: 'Refused' });
  };

  const whenReceiptAnswers = (
    resultat: components['schemas']['RestConfirmationDeResolution'],
    commande = referenceFixture.commande,
  ): void => {
    const request = server.expectOne(`/api/atelier/suivis/suivi-camille/confirmations-de-resolution/${commande}`);
    expect(request.request.method).toBe('GET');
    request.flush(resultat);
  };

  const confirmationFixture = (): components['schemas']['RestConfirmationEnregistree'] => ({
    kind: 'ENREGISTREE',
    recu: {
      commande: referenceFixture.commande,
      adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
      acte: acteFixture,
      revisionDeDepart: 7,
      revisionEnregistree: 8,
      enregistreLe: '2026-10-04T10:00:00Z',
      evenementsTouches: ['fin-17'],
    },
    dossier: dossierFixture('ANCRE_ANNULEE', 9),
  });

  const whenConfirmationAnswers = (resultat: components['schemas']['RestConfirmationDeResolution'] = confirmationFixture()): void => {
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ commande: referenceFixture.commande, reference: referenceFixture.reference });
    request.flush(resultat);
  };

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
