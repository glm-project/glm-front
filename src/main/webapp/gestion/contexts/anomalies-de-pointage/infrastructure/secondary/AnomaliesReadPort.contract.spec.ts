import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { CadreDuFait } from '../../domain/acte/CadreDuFait';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { DossierAnomalie, LectureDossier } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { PosteAnomalieId } from '../../domain/dossier/PosteAnomalieId';
import { OperateurAnomalie } from '../../domain/dossier/ReferentielAnomalies';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { HttpAnomalies } from './HttpAnomalies';

const cadreOuvert = CadreDuFait.depuis([], '2100-01-01T00:00:00Z');
const ligneFixture: components['schemas']['RestConflitEnListe'] = {
  nature: 'CONFLIT',
  adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
  revision: 7,
  elementId: 'moule-42',
  designation: 'M-042',
  operateurId: 'op-camille',
  operateur: { id: 'op-camille', nom: 'Martin', prenom: 'Camille' },
  posteId: 'poste-dmu',
  poste: { id: 'poste-dmu', libelle: 'DMU 50' },
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 3,
};

const restOperateurFixture = (
  id: string,
  extra: Partial<components['schemas']['RestOperateur']> = {},
): components['schemas']['RestOperateur'] => ({
  id,
  prenom: 'Camille',
  nom: 'Martin',
  natures: [],
  postes: [],
  ...extra,
});

const restPosteFixture = (id: string, libelle: string): components['schemas']['RestPosteDeTravail'] => ({
  id,
  libelle,
  nature: 'tournage',
});

const restElementFixture = (
  id: string,
  extra: Partial<components['schemas']['RestElementDeFabrication']> = {},
): components['schemas']['RestElementDeFabrication'] => ({ id, nom: 'Bielle', type: 'PRODUIT', ...extra });

describe('Beyond the contract: HTTP anomaly dossier reading', () => {
  let port: AnomaliesReadPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: AnomaliesReadPort, useClass: HttpAnomalies },
      ],
    });
    port = TestBed.inject(AnomaliesReadPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should reject and report an incomplete required page instead of displaying partial conflict data', async () => {
    const lecture = port.list({ nature: 'CONFLIT', operateur: 'Camille', element: 'M-042', page: 2 }).catch((failure: unknown) => failure);

    whenPageAnswers([ligneFixture], false);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Lecture des anomalies incomplète.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should acquire one filtered page while preserving the server total and exact first timestamp', async () => {
    const filtre = { nature: 'CONFLIT' as const, operateur: 'Camille', element: 'M-042', page: 2 };

    const lecture = port.list(filtre);
    whenPageAnswers();
    const page = await lecture;

    expect(page).toMatchObject({
      nature: 'CONFLIT',
      lignes: [
        {
          adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') },
          element: new ElementAnomalieId('moule-42'),
          designation: 'M-042',
          operateur: 'Camille Martin',
          poste: 'DMU 50',
          date: '2026-09-14T08:00:00.123456789+02:00',
          explication: '',
          nombrePointages: 3,
        },
      ],
      total: 12,
      complete: true,
    });
  });

  it('should present neither name nor operator identity when the operator and workstation references cannot be resolved', async () => {
    const ligne = givenUnresolvedReferences();

    const lecture = port.list({ nature: 'CONFLIT', operateur: 'Camille', element: 'M-042', page: 2 });
    whenPageAnswers([ligne]);
    const page = await lecture;

    expect(page.lignes[0]).toMatchObject({ operateur: '', poste: '', posteId: 'poste-dmu' });
    expect(page.lignes[0]).not.toHaveProperty('operateurId');
  });

  it('should retain the journal of a cancelled anchor instead of opening another sequence', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers();
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'ANCRE_ANNULEE',
      journal: [
        {
          id: new PointageAnomalieId('fin-17'),
          fait: {
            type: 'FIN',
            intention: 'FIN',
            activiteVisee: 'travail-8',
            operateur: 'op-camille',
            poste: '',
            instant: '2026-09-14T17:00:00.123456789+02:00',
          },
          operateurNom: '',
          posteLibelle: '',
          annulation: { motif: 'Double pression confirmée', auteur: 'gestionnaire', instant: '2026-09-15T08:00:00Z' },
          auteur: 'camille',
          enregistre: '2026-09-15T07:00:00Z',
          regularisation: false,
        },
      ],
    });
  });

  it('should carry the operator name and the workstation label of each journal fact beside the received identities', async () => {
    const dossier = dossierAnnuleFixture();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers({
      ...dossier,
      suivi: {
        ...dossier.suivi,
        journal: dossier.suivi.journal.map(pointage => ({
          ...pointage,
          operateur: { id: 'op-camille', nom: 'Martin', prenom: 'Camille' },
          posteId: 'poste-dmu',
          poste: { id: 'poste-dmu', libelle: 'DMU 50' },
        })),
      },
    });
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'ANCRE_ANNULEE',
      journal: [{ fait: { operateur: 'op-camille', poste: 'poste-dmu' }, operateurNom: 'Camille Martin', posteLibelle: 'DMU 50' }],
    });
  });

  it('should retain the journal of an address that no longer carries any anomaly', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers({ ...dossierAnnuleFixture(), kind: 'SANS_ANOMALIE' });
    const resultat = await lecture;

    expect(resultat).toMatchObject({ kind: 'SANS_ANOMALIE', journal: [{ id: new PointageAnomalieId('fin-17') }] });
  });

  it('should return an inaccessible follow-up explicitly without revealing a journal', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenFollowUpIsMissing();
    const resultat = await lecture;

    expect(resultat).toEqual({ kind: 'INTROUVABLE', journal: [] });
    expect(errors.errors).toEqual([]);
  });

  it('should retain the replacement link and manager regularisation in the original journal', async () => {
    const dossier = givenAReplacementInTheJournal();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'ANCRE_ANNULEE',
      journal: [
        { id: new PointageAnomalieId('fin-17'), annulation: { motif: 'Double pression confirmée' } },
        { id: new PointageAnomalieId('fin-corrigee'), remplace: new PointageAnomalieId('fin-17'), regularisation: true },
      ],
    });
  });

  it('should preserve the stable activity opened by a corrected opening and its absent target', async () => {
    const dossier = givenACorrectedOpening();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      journal: [
        { id: new PointageAnomalieId('fin-17') },
        {
          id: new PointageAnomalieId('ouverture-corrigee'),
          activiteCreee: new ActiviteAnomalieId('travail-8'),
          fait: { intention: 'OUVERTURE', activiteVisee: '' },
        },
      ],
    });
  });

  it('should read an automatic end from its perimeter without inventing a sequence or a conflict', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers();
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: {
        version: 8,
        etat: 'FIN_AUTOMATIQUE',
        enConflit: false,
        finAutomatique: true,
        cloture: false,
        ligne: { adresse: { suivi: adresse.suivi, pointage: adresse.pointage }, nombrePointages: 1 },
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            ouvrant: new PointageAnomalieId('debut-8'),
            etat: 'ECHUE',
            periode: {
              categorie: 'TRAVAIL',
              debut: '2026-09-14T08:00:00.123456789+02:00',
              fin: '2026-09-14T21:00:00.123456789+02:00',
              duree: 'PT13H',
            },
          },
        ],
        diagnostics: [],
      },
    });
  });

  it('should keep the closure of the workshop supplied with an automatic end', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    dossier.suivi = { ...dossier.suivi, etat: 'CLOTURE', clotureLe: '2026-09-14T23:00:00Z', cloturePar: 'gestionnaire' };
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({ kind: 'DOSSIER', dossier: { cloture: true, finCloture: '2026-09-14T23:00:00Z' } });
  });

  it('should reject an automatic end missing its perimeter instead of reconstructing it from the journal', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    delete dossier.perimetre;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenAutomaticEndDossierAnswers(dossier);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Périmètre du dossier absent.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should reject an automatic end whose received duration is missing instead of computing it', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    delete requiredFixture(dossier.activites[0], 'automatic end activity').duree;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Durée définitive de l’activité absente.'));
  });

  it('should prefill the guided end regularisation from the received fact and leave its time for the manager', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers();
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided regularisation');
    expect(choix.id).toBe('REGULARISER_FIN:debut-8');
    expect(choix.saisie.proposition).toEqual({
      kind: 'REGULARISATION',
      fait: { type: 'FIN', intention: 'FIN', activiteVisee: 'travail-8', operateur: 'op-camille', poste: 'poste-dmu', instant: '' },
    });
    expect(choix.saisie.command(cadreOuvert)).toBeUndefined();
  });

  it('should prefill the guided end regularisation of an activity without workstation', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    delete requiredFixture(dossier.choix[0], 'guided regularisation').fait?.poste;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided regularisation');
    expect(choix.saisie.proposition).toMatchObject({ kind: 'REGULARISATION', fait: { poste: '', instant: '' } });
  });

  it.each([
    {
      code: 'CORRIGER_FIN_TARDIVE' as const,
      fait: { type: 'FIN' as const, intention: 'FIN' as const, instant: '2026-09-14T23:00:00.123456789+02:00' },
    },
    {
      code: 'CORRIGER_TRANSITION_TARDIVE' as const,
      fait: { type: 'NON_CONFORMITE' as const, intention: 'TRANSITION' as const, instant: '2026-09-14T22:00:00+02:00' },
    },
  ])('should prefill the guided $code with the instant of the late fact and leave its reason empty', async ({ code, fait }) => {
    const dossier = dossierFinAutomatiqueFixture();
    dossier.choix = [
      { code, kind: 'CORRECTION', pointage: 'tardif-30', fait: { ...fait, activiteVisee: 'travail-8', operateur: 'op-camille' } },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided late correction');
    expect(choix.id).toBe(`${code}:tardif-30`);
    expect(choix.saisie.proposition).toEqual({
      kind: 'CORRECTION',
      pointage: 'tardif-30',
      motif: '',
      fait: { ...fait, activiteVisee: 'travail-8', operateur: 'op-camille', poste: '' },
    });
    expect(choix.saisie.command(cadreOuvert)).toBeUndefined();
  });

  it('should reject a guided end regularisation missing its fact', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    delete requiredFixture(dossier.choix[0], 'guided regularisation').fait;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Fait de la proposition guidée absent.'));
  });

  it('should reject a guided end regularisation that already carries a time instead of keeping an invented one', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    const choix = requiredFixture(dossier.choix[0], 'guided regularisation');
    choix.fait = { type: 'FIN', intention: 'FIN', activiteVisee: 'travail-8', operateur: 'op-camille', instant: '2026-09-14T17:00:00Z' };
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Proposition guidée incohérente.'));
  });

  it('should reject a guided end regularisation missing the activity it ends', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    delete requiredFixture(dossier.choix[0], 'guided regularisation').fait?.activiteVisee;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Cible de la proposition guidée absente.'));
  });

  it.each(['CORRIGER_FIN_TARDIVE' as const, 'CORRIGER_TRANSITION_TARDIVE' as const])(
    'should reject a guided %s whose fact lacks the time of the late pointage',
    async code => {
      const dossier = dossierFinAutomatiqueFixture();
      dossier.choix = [
        {
          code,
          kind: 'CORRECTION',
          pointage: 'tardif-30',
          fait: { type: 'FIN', intention: 'FIN', activiteVisee: 'travail-8', operateur: 'op-camille' },
        },
      ];
      const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenAutomaticEndDossierAnswers(dossier);
      const resultat = await lecture;

      expect(resultat).toEqual(new Error('Instant de la proposition guidée absent.'));
    },
  );

  const dossierFinAutomatiqueFixture = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierAnnuleFixture();
    return {
      ...dossier,
      kind: 'FIN_AUTOMATIQUE',
      adresse: { suivi: 'suivi-camille', pointage: 'debut-8' },
      finAutomatique: true,
      perimetre: {
        operateurId: 'op-camille',
        posteId: 'poste-dmu',
        activites: ['travail-8'],
        pointages: ['debut-8'],
        datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
        nombrePointages: 1,
      },
      activites: [
        {
          evenement: 'debut-8',
          activite: 'travail-8',
          operateurId: 'op-camille',
          posteId: 'poste-dmu',
          categorie: 'TRAVAIL',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          fin: '2026-09-14T21:00:00.123456789+02:00',
          duree: 'PT13H',
          etat: 'ECHUE',
        },
      ],
      choix: [
        {
          code: 'REGULARISER_FIN',
          kind: 'REGULARISATION',
          pointage: 'debut-8',
          fait: { type: 'FIN', intention: 'FIN', activiteVisee: 'travail-8', operateur: 'op-camille', poste: 'poste-dmu' },
        },
      ],
    };
  };

  const whenAutomaticEndDossierAnswers = (dossier = dossierFinAutomatiqueFixture()): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/debut-8').flush(dossier);
  };

  const givenACorrectedOpening = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierAnnuleFixture();
    const original = requiredFixture(dossier.suivi.journal[0], 'original finish');
    const ouverture: components['schemas']['RestEvenementDAtelier'] = {
      ...original,
      id: 'ouverture-corrigee',
      type: 'DEBUT',
      intention: 'OUVERTURE',
      activite: 'travail-8',
      estUneRegularisation: true,
    };
    delete ouverture.cible;
    delete ouverture.annulation;
    return { ...dossier, suivi: { ...dossier.suivi, journal: [original, ouverture] } };
  };

  const givenAReplacementInTheJournal = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierAnnuleFixture();
    const original = requiredFixture(dossier.suivi.journal[0], 'original finish');
    const remplacement = { ...original, id: 'fin-corrigee', estUneRegularisation: true, remplace: 'fin-17' };
    delete remplacement.annulation;
    return { ...dossier, suivi: { ...dossier.suivi, journal: [original, remplacement] } };
  };

  it('should retain the authoritative sequence scope and unresolved activity without inventing a duration', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers();
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: {
        version: 8,
        etat: 'EN_CONFLIT',
        enConflit: true,
        finAutomatique: false,
        cloture: false,
        ligne: {
          adresse,
          nombrePointages: 3,
          date: '2026-09-14T08:00:00.123456789+02:00',
          posteId: 'poste-dmu',
        },
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            etat: 'A_RESOUDRE',
            periode: { categorie: 'TRAVAIL', debut: '2026-09-14T08:00:00.123456789+02:00' },
          },
        ],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: {
              activite: new ActiviteAnomalieId('travail-8'),
              ouvrant: new PointageAnomalieId('debut-8'),
              termineePar: new PointageAnomalieId('nc-12'),
            },
          },
        ],
      },
    });
  });

  it('should preserve an exact received duration and workshop closure while another sequence remains unresolved', async () => {
    const dossier = givenAClosedDossierWithExactDuration();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: {
        cloture: true,
        finCloture: '2026-09-14T18:00:00Z',
        ligne: { poste: '' },
        activites: [{ etat: 'TERMINEE', periode: { fin: '2026-09-14T17:00:00+02:00', duree: 'PT8H59M59.876543211S' } }],
        diagnostics: [{ raison: 'CIBLE_DEJA_TERMINEE', cible: { activite: new ActiviteAnomalieId('travail-8') } }],
      },
    });
  });

  it('should expose the authoritative guided cancellation while leaving its motive for the manager', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [{ code: 'ANNULER_TRANSITION', kind: 'ANNULATION', pointage: 'nc-12' }];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided cancellation');
    expect(choix.id).toBe('ANNULER_TRANSITION:nc-12');
    expect(choix.saisie.proposition).toEqual({ kind: 'ANNULATION', pointage: 'nc-12', motif: '' });
    expect(choix.saisie.command(cadreOuvert)).toBeUndefined();
  });

  it('should acquire the exact guided replacement fact without inventing a motive or workstation', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [
      {
        code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
        kind: 'CORRECTION',
        pointage: 'fin-17',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: 'nc-12',
          operateur: 'op-camille',
          instant: '2026-09-14T17:00:00.123456789+02:00',
        },
      },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided correction');
    expect(choix.saisie.proposition).toEqual({
      kind: 'CORRECTION',
      pointage: 'fin-17',
      motif: '',
      fait: {
        type: 'FIN',
        intention: 'FIN',
        activiteVisee: 'nc-12',
        operateur: 'op-camille',
        poste: '',
        instant: '2026-09-14T17:00:00.123456789+02:00',
      },
    });
    expect(choix.saisie.command(cadreOuvert)).toBeUndefined();
  });

  it('should unite the pointages of the perimeter and of the sequence of a conflict into the perimeter of the dossier', async () => {
    const dossier = givenAConflictWhoseJournalExceedsItsScope();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    const lu = dossierFromReading(resultat);
    expect(lu.perimetre.pointagesDe(lu).map(pointage => pointage.id.pointage)).toEqual(['debut-8', 'nc-12', 'fin-17']);
    expect(lu.journal.map(pointage => pointage.id.pointage)).toEqual(['debut-8', 'nc-12', 'fin-17', 'ailleurs-30']);
  });

  it('should read the perimeter of an automatic end from the pointages of its perimeter alone', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    dossier.suivi = { ...dossier.suivi, journal: [journalFact('debut-8'), journalFact('ailleurs-30')] };
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    const lu = dossierFromReading(resultat);
    expect(lu.perimetre.pointagesDe(lu).map(pointage => pointage.id.pointage)).toEqual(['debut-8']);
  });

  it('should read the operator of a conflict from its sequence', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.sequence = { ...requiredFixture(dossier.sequence, 'sequence'), operateurId: 'op-camille' };
    dossier.perimetre = { ...requiredFixture(dossier.perimetre, 'perimeter'), operateurId: 'op-alex' };
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(dossierFromReading(resultat).operateur).toEqual(new OperateurAnomalieId('op-camille'));
  });

  it('should read the operator of an automatic end from its perimeter', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    dossier.perimetre = { ...requiredFixture(dossier.perimetre, 'perimeter'), operateurId: 'op-alex' };
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

    const lecture = port.read(adresse);
    whenAutomaticEndDossierAnswers(dossier);
    const resultat = await lecture;

    expect(dossierFromReading(resultat).operateur).toEqual(new OperateurAnomalieId('op-alex'));
  });

  it('should reject a conflict missing its perimeter instead of reading only its sequence', async () => {
    const dossier = dossierAnomalieFixture();
    delete dossier.perimetre;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Périmètre du dossier absent.'));
    expect(errors.errors).toEqual([failure]);
  });

  const journalFact = (id: string): components['schemas']['RestEvenementDAtelier'] => ({
    ...requiredFixture(dossierAnnuleFixture().suivi.journal[0], 'journal fact'),
    id,
  });

  const givenAConflictWhoseJournalExceedsItsScope = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierAnomalieFixture();
    return {
      ...dossier,
      sequence: { ...requiredFixture(dossier.sequence, 'sequence'), pointages: ['nc-12', 'fin-17'] },
      perimetre: { ...requiredFixture(dossier.perimetre, 'perimeter'), pointages: ['debut-8'] },
      suivi: {
        ...dossier.suivi,
        journal: ['debut-8', 'nc-12', 'fin-17', 'ailleurs-30'].map(journalFact),
      },
    };
  };

  it('should reject a dossier missing its required sequence instead of reconstructing it from the journal', async () => {
    const dossier = dossierAnomalieFixture();
    delete dossier.sequence;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Séquence du dossier absente.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should expose only the authoritative continuation address with its own scope and unresolved references', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.continuations = [
      { ...givenUnresolvedReferences(), adresse: { suivi: 'suivi-camille', pointage: 'fin-corrigee' }, nombrePointages: 2 },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(dossierFromReading(resultat).continuations).toMatchObject([
      {
        adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-corrigee') },
        nombrePointages: 2,
        operateur: '',
        poste: '',
        posteId: 'poste-dmu',
        date: '2026-09-14T08:00:00.123456789+02:00',
      },
    ]);
  });

  it('should reject a guided correction missing its required fact and report the incomplete acquisition once', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [{ code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE', kind: 'CORRECTION', pointage: 'fin-17' }];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Fait de la proposition guidée absent.'));
    expect(errors.errors).toEqual([resultat]);
  });

  it('should reject a guided finish correction missing its replacement target instead of selecting another activity', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [
      {
        code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
        kind: 'CORRECTION',
        pointage: 'fin-17',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          operateur: 'op-camille',
          instant: '2026-09-14T17:00:00.123456789+02:00',
        },
      },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Cible de la proposition guidée absente.'));
    expect(errors.errors).toEqual([resultat]);
  });

  it.each([
    { code: 'ANNULER_TRANSITION' as const, kind: 'CORRECTION' as const },
    { code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' as const, kind: 'ANNULATION' as const },
    { code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' as const, kind: 'REGULARISATION' as const },
    { code: 'REGULARISER_FIN' as const, kind: 'CORRECTION' as const },
    { code: 'REGULARISER_FIN' as const, kind: 'ANNULATION' as const },
    { code: 'CORRIGER_FIN_TARDIVE' as const, kind: 'REGULARISATION' as const },
    { code: 'CORRIGER_TRANSITION_TARDIVE' as const, kind: 'ANNULATION' as const },
  ])('should reject an unsupported $code and $kind combination rather than inventing a guided hypothesis', async ({ code, kind }) => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [
      {
        code,
        kind,
        pointage: 'fin-17',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: 'nc-12',
          operateur: 'op-camille',
          instant: '2026-09-14T17:00:00.123456789+02:00',
        },
      },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Proposition guidée incohérente.'));
    expect(errors.errors).toEqual([resultat]);
  });

  it.each(['TERMINEE', 'ECHUE'] as const)(
    'should reject $etat work missing its authoritative duration instead of showing a complete dossier',
    async etat => {
      const dossier = givenAClosedDossierWithExactDuration();
      const activite = requiredFixture(dossier.activites[0], 'finished work');
      activite.etat = etat;
      delete activite.duree;
      const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenConflictDossierAnswers(dossier);
      const resultat = await lecture;

      expect(resultat).toEqual(new Error('Durée définitive de l’activité absente.'));
      expect(errors.errors).toEqual([resultat]);
    },
  );

  const givenAClosedDossierWithExactDuration = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierAnomalieFixture();
    const sequence = requiredFixture(dossier.sequence, 'addressed sequence');
    delete sequence.posteId;
    return {
      ...dossier,
      suivi: { ...dossier.suivi, etat: 'CLOTURE', clotureLe: '2026-09-14T18:00:00Z', cloturePar: 'gestionnaire' },
      activites: [
        {
          evenement: 'debut-8',
          activite: 'travail-8',
          operateurId: 'op-camille',
          categorie: 'TRAVAIL',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          fin: '2026-09-14T17:00:00+02:00',
          duree: 'PT8H59M59.876543211S',
          etat: 'TERMINEE',
        },
      ],
      diagnostics: [{ pointage: 'fin-17', raison: 'CIBLE_DEJA_TERMINEE', cible: { activite: 'travail-8' } }],
    };
  };

  const dossierAnomalieFixture = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierAnnuleFixture();
    return {
      ...dossier,
      kind: 'EN_CONFLIT',
      enConflit: true,
      finAutomatique: false,
      sequence: {
        operateurId: 'op-camille',
        posteId: 'poste-dmu',
        activites: ['travail-8', 'nc-12'],
        pointages: ['debut-8', 'nc-12', 'fin-17'],
        datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
        nombrePointages: 3,
      },
      perimetre: {
        operateurId: 'op-camille',
        posteId: 'poste-dmu',
        activites: ['travail-8', 'nc-12'],
        pointages: ['debut-8', 'nc-12', 'fin-17'],
        datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
        nombrePointages: 3,
      },
      activites: [
        {
          evenement: 'debut-8',
          activite: 'travail-8',
          operateurId: 'op-camille',
          posteId: 'poste-dmu',
          categorie: 'TRAVAIL',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          etat: 'A_RESOUDRE',
        },
      ],
      diagnostics: [
        { pointage: 'fin-17', raison: 'CIBLE_REMPLACEE', cible: { activite: 'travail-8', ouvrant: 'debut-8', termineePar: 'nc-12' } },
      ],
    };
  };

  const whenConflictDossierAnswers = (dossier = dossierAnomalieFixture()): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17').flush(dossier);
  };

  const dossierFromReading = (lecture: LectureDossier): DossierAnomalie => {
    if (lecture.kind !== 'DOSSIER') throw new Error('Missing dossier fixture');
    return lecture.dossier;
  };

  it('should read the whole operator and workstation referential across server pages into the anomaly vocabulary', async () => {
    const operateurs = Array.from({ length: 125 }, (_, index) => restOperateurFixture(`op-${index}`, { nom: `Nom ${index}` }));
    operateurs[1] = restOperateurFixture('op-camille', {
      prenom: 'Camille',
      nom: 'Martin',
      identifiant: '007',
      postes: [{ id: 'poste-tour', libelle: 'Tour 1', nature: 'tournage' }],
    });
    const postes = [restPosteFixture('poste-fraiseuse', 'Fraiseuse 1'), restPosteFixture('poste-tour', 'Tour 1')];

    const lecture = port.referentiel();
    await Promise.all([answerPages('/api/operateurs', operateurs), answerPages('/api/postes-de-travail', postes)]);
    const referentiel = await lecture;

    expect(referentiel.operateurs).toHaveLength(125);
    expect(referentiel.operateurs[1]).toEqual({
      id: new OperateurAnomalieId('op-camille'),
      nom: 'Camille Martin',
      code: '007',
      postesHabilites: [new PosteAnomalieId('poste-tour')],
    });
    expect(referentiel.operateurs[2]).toEqual({
      id: new OperateurAnomalieId('op-2'),
      nom: 'Camille Nom 2',
      postesHabilites: [],
    });
    expect(referentiel.operateurs[2]).not.toHaveProperty('code');
    expect(referentiel.postes).toEqual([
      { id: new PosteAnomalieId('poste-fraiseuse'), libelle: 'Fraiseuse 1' },
      { id: new PosteAnomalieId('poste-tour'), libelle: 'Tour 1' },
    ]);
    expect(errors.errors).toEqual([]);
  });

  it.each<{ collection: string; incoherence: string; attendu: string; pages: { taille: number; total: number; page?: number }[] }>([
    {
      collection: 'operator',
      incoherence: 'a changing total',
      attendu: 'Le nombre des entrées est incohérent pendant la lecture.',
      pages: [
        { taille: 100, total: 101 },
        { taille: 1, total: 102 },
      ],
    },
    {
      collection: 'operator',
      incoherence: 'a truncated page',
      attendu: 'Le référentiel reçu est tronqué.',
      pages: [{ taille: 99, total: 100 }],
    },
    {
      collection: 'operator',
      incoherence: 'a page other than the requested one',
      attendu: 'La page reçue ne correspond pas à la page demandée.',
      pages: [{ taille: 1, total: 1, page: 3 }],
    },
    {
      collection: 'workstation',
      incoherence: 'a changing total',
      attendu: 'Le nombre des entrées est incohérent pendant la lecture.',
      pages: [
        { taille: 100, total: 101 },
        { taille: 1, total: 102 },
      ],
    },
    {
      collection: 'workstation',
      incoherence: 'a truncated page',
      attendu: 'Le référentiel reçu est tronqué.',
      pages: [{ taille: 99, total: 100 }],
    },
    {
      collection: 'workstation',
      incoherence: 'a page other than the requested one',
      attendu: 'La page reçue ne correspond pas à la page demandée.',
      pages: [{ taille: 1, total: 1, page: 3 }],
    },
  ])('should refuse and report the $collection collection of the referential with $incoherence', async ({ collection, attendu, pages }) => {
    const incoherent = collection === 'operator' ? '/api/operateurs' : '/api/postes-de-travail';
    const sain = collection === 'operator' ? '/api/postes-de-travail' : '/api/operateurs';
    const contenu = collection === 'operator' ? restOperateurFixture : (id: string) => restPosteFixture(id, id);

    const lecture = port.referentiel().catch((failure: unknown) => failure);
    await Promise.all([
      answerPages(sain, []),
      (async () => {
        for (const [index, page] of pages.entries()) {
          await flushPage(
            incoherent,
            index,
            Array.from({ length: page.taille }, (_, element) => contenu(`id-${index}-${element}`)),
            page.total,
            page.page,
          );
        }
      })(),
    ]);
    const failure = await lecture;

    expect(failure).toEqual(new Error(attendu));
    expect(errors.errors).toEqual([failure]);
  });

  it.each([
    { collection: 'operator', url: '/api/operateurs', contenu: restOperateurFixture },
    { collection: 'workstation', url: '/api/postes-de-travail', contenu: (id: string) => restPosteFixture(id, id) },
  ])('should refuse and report a referential whose $collection collection repeats an identity', async ({ url, contenu }) => {
    const sain = url === '/api/operateurs' ? '/api/postes-de-travail' : '/api/operateurs';

    const lecture = port.referentiel().catch((failure: unknown) => failure);
    await Promise.all([answerPages(sain, []), answerPages(url, [contenu('doublon'), contenu('doublon')])]);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Le référentiel contient une identité dupliquée.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should report a failed referential read once and reject instead of offering a partial list', async () => {
    const lecture = port.referentiel().catch((failure: unknown) => failure);
    await Promise.all([
      answerPages('/api/operateurs', [restOperateurFixture('op-camille')]),
      whenReferentialFails('/api/postes-de-travail?page=0&size=100'),
    ]);
    const failure = await lecture;

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  it('should read the operators alone across server pages, without asking for any workstation', async () => {
    const operateurs = Array.from({ length: 125 }, (_, index) => restOperateurFixture(`op-${index}`, { nom: `Nom ${index}` }));
    operateurs[1] = restOperateurFixture('op-camille', {
      identifiant: '007',
      postes: [{ id: 'poste-tour', libelle: 'Tour 1', nature: 'tournage' }],
    });

    const lus = await whenReadingTheOperatorsAnsweredWith(operateurs);

    expect(lus).toHaveLength(125);
    expect(lus[1]).toEqual({
      id: new OperateurAnomalieId('op-camille'),
      nom: 'Camille Martin',
      code: '007',
      postesHabilites: [new PosteAnomalieId('poste-tour')],
    });
    thenNoWorkstationWasAsked();
    expect(errors.errors).toEqual([]);
  });

  it.each<{ incoherence: string; attendu: string; pages: { taille: number; total: number; page?: number }[] }>([
    {
      incoherence: 'a changing total',
      attendu: 'Le nombre des entrées est incohérent pendant la lecture.',
      pages: [
        { taille: 100, total: 101 },
        { taille: 1, total: 102 },
      ],
    },
    { incoherence: 'a truncated page', attendu: 'Le référentiel reçu est tronqué.', pages: [{ taille: 99, total: 100 }] },
    {
      incoherence: 'a page other than the requested one',
      attendu: 'La page reçue ne correspond pas à la page demandée.',
      pages: [{ taille: 1, total: 1, page: 3 }],
    },
  ])('should refuse and report an operator list with $incoherence', async ({ attendu, pages }) => {
    const failure = await whenReadingTheOperatorsWhilePagesAnswer(pages);

    expect(failure).toEqual(new Error(attendu));
    expect(errors.errors).toEqual([failure]);
  });

  it('should refuse and report an operator list that repeats an identity', async () => {
    const failure = await whenReadingTheOperatorsAnsweredWith([restOperateurFixture('doublon'), restOperateurFixture('doublon')]).catch(
      (failure: unknown) => failure,
    );

    expect(failure).toEqual(new Error('Le référentiel contient une identité dupliquée.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should report a failed operator read once and reject', async () => {
    const lecture = port.operateurs().catch((failure: unknown) => failure);
    await whenReferentialFails('/api/operateurs?page=0&size=100');
    const failure = await lecture;

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  const whenReadingTheOperatorsAnsweredWith = async (operateurs: readonly unknown[]): Promise<readonly OperateurAnomalie[]> => {
    const lecture = port.operateurs();
    lecture.catch(() => undefined);
    await answerPages('/api/operateurs', operateurs);
    return lecture;
  };

  const whenReadingTheOperatorsWhilePagesAnswer = async (pages: { taille: number; total: number; page?: number }[]): Promise<unknown> => {
    const lecture = port.operateurs().catch((failure: unknown) => failure);
    for (const [index, page] of pages.entries()) {
      await flushPage(
        '/api/operateurs',
        index,
        Array.from({ length: page.taille }, (_, operateur) => restOperateurFixture(`id-${index}-${operateur}`)),
        page.total,
        page.page,
      );
    }
    return lecture;
  };

  const thenNoWorkstationWasAsked = (): void => {
    server.expectNone('/api/postes-de-travail?page=0&size=100');
  };

  it('should read the whole element referential across server pages, over the whole period, into the anomaly vocabulary', async () => {
    const elements = Array.from({ length: 125 }, (_, index) => restElementFixture(`element-${index}`, { nom: `Pièce ${index}` }));
    elements[1] = restElementFixture('element-of', { nom: 'Bielle', reference: 'OF M24-0655' });

    const lecture = port.elements();
    await answerElementPages(elements);
    const lus = await lecture;

    expect(lus).toHaveLength(125);
    expect(lus[1]).toEqual({ id: new ElementAnomalieId('element-of'), nom: 'Bielle', reference: 'OF M24-0655' });
    expect(lus[2]).toEqual({ id: new ElementAnomalieId('element-2'), nom: 'Pièce 2' });
    expect(lus[2]).not.toHaveProperty('reference');
    expect(errors.errors).toEqual([]);
  });

  it('should ask the elements of every period, since the filter looks for an element whatever its dates', async () => {
    const demande = await whenReadingTheElementsOfAnEmptyServer();

    expect(demande.params.get('debut')).toBe('1970-01-01T00:00:00Z');
    expect(demande.params.get('fin')).toBe('2999-12-31T23:59:59Z');
  });

  it.each<{ incoherence: string; attendu: string; pages: { taille: number; total: number; page?: number }[] }>([
    {
      incoherence: 'a changing total',
      attendu: 'Le nombre des entrées est incohérent pendant la lecture.',
      pages: [
        { taille: 100, total: 101 },
        { taille: 1, total: 102 },
      ],
    },
    { incoherence: 'a truncated page', attendu: 'Le référentiel reçu est tronqué.', pages: [{ taille: 99, total: 100 }] },
    {
      incoherence: 'a page other than the requested one',
      attendu: 'La page reçue ne correspond pas à la page demandée.',
      pages: [{ taille: 1, total: 1, page: 3 }],
    },
  ])('should refuse and report an element referential with $incoherence', async ({ attendu, pages }) => {
    const failure = await whenReadingTheElementsWhilePagesAnswer(pages);

    expect(failure).toEqual(new Error(attendu));
    expect(errors.errors).toEqual([failure]);
  });

  it('should refuse and report an element referential that repeats an identity', async () => {
    const failure = await whenReadingTheElementsAnsweredWith([restElementFixture('doublon'), restElementFixture('doublon')]);

    expect(failure).toEqual(new Error('Le référentiel contient une identité dupliquée.'));
    expect(errors.errors).toEqual([failure]);
  });

  it.each<{ champ: string; element: components['schemas']['RestElementDeFabrication'] }>([
    { champ: 'element.id', element: { nom: 'Bielle' } },
    { champ: 'element.nom', element: { id: 'element-sans-nom' } },
  ])('should refuse and report an element received without its $champ', async ({ champ, element }) => {
    const failure = await whenReadingTheElementsAnsweredWith([element]);

    expect(failure).toEqual(new Error(`${champ} manque dans la réponse du serveur`));
    expect(errors.errors).toEqual([failure]);
  });

  it('should report a failed element read once and reject instead of offering a partial list', async () => {
    const failure = await whenTheElementReadFails();

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  const whenReadingTheElementsOfAnEmptyServer = async (): Promise<HttpRequest<unknown>> => {
    const lecture = port.elements();
    await new Promise(resolve => setTimeout(resolve));
    const demande = server.expectOne(request => request.url === '/api/elements-de-fabrication');
    demande.flush({ content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 });
    await lecture;
    return demande.request;
  };

  const whenReadingTheElementsWhilePagesAnswer = async (pages: { taille: number; total: number; page?: number }[]): Promise<unknown> => {
    const lecture = port.elements().catch((failure: unknown) => failure);
    for (const [index, page] of pages.entries()) {
      await flushElementsPage(
        index,
        Array.from({ length: page.taille }, (_, element) => restElementFixture(`id-${index}-${element}`)),
        page.total,
        page.page,
      );
    }
    return lecture;
  };

  const whenReadingTheElementsAnsweredWith = async (elements: readonly unknown[]): Promise<unknown> => {
    const lecture = port.elements().catch((failure: unknown) => failure);
    await answerElementPages(elements);
    return lecture;
  };

  const whenTheElementReadFails = async (): Promise<unknown> => {
    const lecture = port.elements().catch((failure: unknown) => failure);
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(request => request.url === '/api/elements-de-fabrication').flush({}, { status: 500, statusText: 'Failure' });
    return lecture;
  };

  const flushElementsPage = async (page: number, content: unknown[], total: number, answeredPage = page): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(request => request.url === '/api/elements-de-fabrication' && request.params.get('page') === String(page))
      .flush({ content, currentPage: answeredPage, pageSize: 100, totalElementsCount: total });
  };

  const answerElementPages = async (elements: readonly unknown[]): Promise<void> => {
    let page = 0;
    do {
      await flushElementsPage(page, elements.slice(page * 100, (page + 1) * 100), elements.length);
      page += 1;
    } while (page * 100 < elements.length);
  };

  const flushPage = async (url: string, page: number, content: unknown[], total: number, answeredPage = page): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(`${url}?page=${page}&size=100`)
      .flush({ content, currentPage: answeredPage, pageSize: 100, totalElementsCount: total });
  };

  const answerPages = async (url: string, elements: readonly unknown[]): Promise<void> => {
    let page = 0;
    do {
      await flushPage(url, page, elements.slice(page * 100, (page + 1) * 100), elements.length);
      page += 1;
    } while (page * 100 < elements.length);
  };

  const whenReferentialFails = async (url: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(url).flush({}, { status: 500, statusText: 'Failure' });
  };

  it.each([
    { status: 500, urn: undefined },
    { status: 404, urn: 'urn:glm:erreur:atelier:code-inconnu' },
    { status: 403, urn: undefined },
  ])(
    'should reject a failed read with status $status and report it once instead of claiming the dossier is missing',
    async ({ status, urn }) => {
      const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenDossierFails(status, urn);
      const failure = await lecture;

      expect(failure).toBeInstanceOf(HttpErrorResponse);
      expect(errors.errors).toEqual([failure]);
    },
  );

  const whenDossierFails = (status: number, urn: string | undefined): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17').flush({ type: urn }, { status, statusText: 'Read failed' });
  };

  const whenFollowUpIsMissing = (): void => {
    server
      .expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17')
      .flush(
        { type: 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable', detail: 'Suivi introuvable.' },
        { status: 404, statusText: 'Not found' },
      );
  };

  const dossierAnnuleFixture = (): components['schemas']['RestDossierAnomalie'] => ({
    kind: 'ANCRE_ANNULEE',
    enConflit: false,
    finAutomatique: false,
    adresse: ligneFixture.adresse,
    revision: 8,
    evaluation: '2026-09-15T08:00:00Z',
    choix: [],
    continuations: [],
    diagnostics: [],
    activites: [],
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
      journal: [
        {
          id: 'fin-17',
          type: 'FIN',
          intention: 'FIN',
          cible: 'travail-8',
          operateurId: 'op-camille',
          auteur: 'camille',
          dateDeSurvenue: '2026-09-14T17:00:00.123456789+02:00',
          dateDEnregistrement: '2026-09-15T07:00:00Z',
          estUneRegularisation: false,
          annulation: { motif: 'Double pression confirmée', auteur: 'gestionnaire', date: '2026-09-15T08:00:00Z' },
        },
      ],
    },
  });

  const whenCancelledDossierAnswers = (dossier = dossierAnnuleFixture()): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17').flush(dossier);
  };

  const givenUnresolvedReferences = (): components['schemas']['RestConflitEnListe'] => {
    const ligne = { ...ligneFixture };
    delete ligne.operateur;
    delete ligne.poste;
    return ligne;
  };

  const whenPageAnswers = (lignes: components['schemas']['RestConflitEnListe'][] = [ligneFixture], complete = true): void => {
    server.expectOne('/api/atelier/anomalies?nature=CONFLIT&operateur=Camille&element=M-042&page=1&size=5').flush({
      lignes,
      total: 12,
      complete,
      page: 1,
      size: 5,
    });
  };
});
