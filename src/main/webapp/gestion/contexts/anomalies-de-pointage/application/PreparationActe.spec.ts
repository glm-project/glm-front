import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TestBed } from '@angular/core/testing';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { ActeResolution } from '../domain/acte/ActeResolution';
import {
  ApercuAnomalie,
  ApplicationActePort,
  PrevisualisationAnomaliePort,
  ResultatApercu,
  ResultatApplication,
  ResultatVerification,
} from '../domain/acte/AnomaliesActesPorts';
import { PropositionResolution } from '../domain/acte/ResolutionDeLAnomalie';
import { SaisieActe } from '../domain/acte/SaisieActe';
import { AdresseDossier, DossierAnomalie } from '../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../domain/dossier/SuiviAnomalieId';
import { PreparationActe } from './PreparationActe';

const dossierFixture: DossierAnomalie = {
  etat: 'EN_CONFLIT',
  ligne: {
    adresse: { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('fin-17') },
    element: new ElementAnomalieId('element-1'),
    designation: 'Pièce',
    operateur: 'Luc',
    poste: '',
    date: '2026-09-14',
    explication: 'Deux fins',
    nombrePointages: 2,
  },
  version: 1,
  cloture: false,
  engagement: '2026-09-14T08:00:00+02:00',
  journal: [],
  activites: [],
  choix: [],
  enConflit: true,
  finAutomatique: false,
  consequences: [],
  continuations: [],
};
const dossierFinAutomatiqueFixture: DossierAnomalie = {
  ...dossierFixture,
  etat: 'FIN_AUTOMATIQUE',
  enConflit: false,
  finAutomatique: true,
};
const finARegulariserFixture = SaisieActe.regularise({
  type: 'FIN',
  intention: 'FIN',
  activiteVisee: 'travail-8',
  operateur: 'op-camille',
  poste: '',
  instant: '',
});
const cancellationFixture = (pointage = 'fin-17'): SaisieActe => SaisieActe.cancel(pointage).afterChange({ motif: 'Double appui' });
const previewFixture = (saisie: SaisieActe): ApercuAnomalie => ({
  empreinteConsequences: 'empreinte-1',
  evaluation: '2026-10-03T10:00:00Z',
  commande: 'commande-1',
  version: 1,
  adresse: dossierFixture.ligne.adresse,
  acte: requiredFixture(saisie.command(), 'chosen acte'),
  avant: dossierFixture,
  apres: { ...dossierFixture, enConflit: false },
});

const propositionFixture = (saisie: SaisieActe): PropositionResolution => ({
  empreinteConsequences: 'empreinte-1',
  commande: 'commande-1',
  version: 1,
  adresse: dossierFixture.ligne.adresse,
  acte: requiredFixture(saisie.command(), 'chosen acte'),
});

class PendingIoFixture<T> {
  private announce: (() => void) | undefined;
  private settle: ((result: T) => void) | undefined;
  private reject: ((failure: unknown) => void) | undefined;
  readonly arrival = new Promise<void>(resolve => {
    this.announce = resolve;
  });
  readonly completion = new Promise<T>((resolve, reject) => {
    this.settle = resolve;
    this.reject = reject;
  });

  arrive(): Promise<T> {
    requiredFixture(this.announce, 'arrival')();
    return this.completion;
  }

  release(result: T): void {
    requiredFixture(this.settle, 'completion')(result);
  }

  fail(failure: unknown): void {
    requiredFixture(this.reject, 'failure')(failure);
  }
}
class PrevisualisationFixture extends PrevisualisationAnomaliePort {
  readonly requests: { readonly adresse: AdresseDossier; readonly version: number; readonly acte: ActeResolution }[] = [];
  pending: PendingIoFixture<ResultatApercu> | undefined;

  override preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu> {
    this.requests.push({ adresse, version, acte });
    return requiredFixture(this.pending, 'preview response').arrive();
  }
}
class ApplicationFixture extends ApplicationActePort {
  readonly requests: PropositionResolution[] = [];
  pending: PendingIoFixture<ResultatApplication> | undefined;
  verification: ResultatVerification = { kind: 'ATTESTE', dossier: { ...dossierFixture, version: 2, enConflit: false } };
  verificationFailure: Error | undefined;
  verificationPending: PendingIoFixture<ResultatVerification> | undefined;

  override async verify(): Promise<typeof this.verification> {
    if (this.verificationPending !== undefined) return this.verificationPending.arrive();
    await new Promise(resolve => setTimeout(resolve));
    if (this.verificationFailure !== undefined) throw this.verificationFailure;
    return this.verification;
  }

  override apply(apercu: PropositionResolution): Promise<ResultatApplication> {
    this.requests.push(apercu);
    return requiredFixture(this.pending, 'application response').arrive();
  }
}
class ErrorsFixture extends ErrorHandlerPort {
  readonly failures: unknown[] = [];
  override handleError(failure: unknown): void {
    this.failures.push(failure);
  }
}

describe('Preparation of an acte through asynchronous ports', () => {
  let preparation: PreparationActe;
  let previews: PrevisualisationFixture;
  let applications: ApplicationFixture;
  let errors: ErrorsFixture;

  beforeEach(() => {
    previews = new PrevisualisationFixture();
    applications = new ApplicationFixture();
    errors = new ErrorsFixture();
    TestBed.configureTestingModule({
      providers: [
        PreparationActe,
        { provide: PrevisualisationAnomaliePort, useValue: previews },
        { provide: ApplicationActePort, useValue: applications },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
    preparation = TestBed.inject(PreparationActe);
  });

  it('should ignore a refusal from an older proposition while the new preview is still pending', async () => {
    const ancienne = givenPreviewWaits();
    preparation.choose(cancellationFixture());
    const premier = preparation.preview(dossierFixture);
    await ancienne.arrival;
    const courante = givenPreviewWaits();
    const nouvelleSaisie = cancellationFixture('fin-18');
    preparation.choose(nouvelleSaisie);
    const second = preparation.preview(dossierFixture);
    await courante.arrival;

    ancienne.release({ kind: 'REFUS', raison: 'Ancienne cible' });
    await premier;
    const etatPendantLeNouvelApercu = preparation.operation().kind;
    courante.release({ kind: 'APERCU', apercu: previewFixture(nouvelleSaisie) });
    await second;

    expect(etatPendantLeNouvelApercu).toBe('PREVISUALISATION');
    expect(preparation.resolution().confirmation()).toEqual(propositionFixture(nouvelleSaisie));
    expect(preparation.operation().kind).toBe('REPOS');
  });

  it('should discard a response from the dossier left during previewing', async () => {
    const attente = givenPreviewWaits();
    preparation.choose(cancellationFixture());
    const lecture = preparation.preview(dossierFixture);
    await attente.arrival;

    preparation.contextChanged();
    attente.release({ kind: 'REFUS', raison: 'Ancien dossier' });
    await lecture;

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().saisie.command()).toBeUndefined();
  });

  it('should apply an explicitly confirmed preview only once despite repeated confirmations', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();

    const premiere = preparation.confirm();
    await attente.arrival;
    const seconde = preparation.confirm();
    const pendingState = preparation.operation().kind;
    attente.release({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2, enConflit: false } });
    await Promise.all([premiere, seconde]);
    await preparation.confirm();

    expect(pendingState).toBe('CONFIRMATION');
    expect(applications.requests).toHaveLength(1);
    expect(preparation.operation()).toEqual({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2, enConflit: false } });
    expect(preparation.resolution().confirmation()).toBeUndefined();
  });

  it('should preserve an edited proposition without showing the old preview failure', async () => {
    const attente = givenPreviewWaits();
    preparation.choose(cancellationFixture());
    const ancienne = preparation.preview(dossierFixture);
    await attente.arrival;

    preparation.change({ motif: 'Autre décision' });
    attente.fail(new Error('Port indisponible'));
    await ancienne;

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Autre décision' });
    expect(preparation.resolution().confirmation()).toBeUndefined();
  });

  it('should discard the result of a confirmation after the manager changes dossier', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const confirmation = preparation.confirm();
    await attente.arrival;

    preparation.contextChanged();
    attente.release({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2, enConflit: false } });
    await confirmation;

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().saisie.command()).toBeUndefined();
  });

  it('should block any blind replay when the confirmed acte has an unknown outcome', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const confirmation = preparation.confirm();
    await attente.arrival;

    attente.release({ kind: 'ISSUE_INCONNUE' });
    await confirmation;
    await preparation.confirm();
    preparation.change({ motif: 'Autre décision' });
    await preparation.preview(dossierFixture);

    expect(applications.requests).toHaveLength(1);
    expect(previews.requests).toHaveLength(1);
    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(preparation.resolution().confirmation()).toBeUndefined();
  });

  it('should block confirmation while refreshing the consequences of its proposition', async () => {
    await givenValidPreview();
    const attente = givenPreviewWaits();
    const miseAJour = preparation.preview(dossierFixture);
    await attente.arrival;

    await preparation.confirm();
    const demandesPendantLAttente = applications.requests.length;
    attente.release({ kind: 'REFUS', raison: 'Événement annulé' });
    await miseAJour;

    expect(demandesPendantLAttente).toBe(0);
    expect(preparation.operation()).toEqual({ kind: 'REFUS', raison: 'Événement annulé' });
    expect(preparation.resolution().confirmation()).toBeUndefined();
  });

  it('should keep the submitted acte immutable until its confirmation completes', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const confirmation = preparation.confirm();
    await attente.arrival;

    preparation.choose(cancellationFixture('autre-fin'));
    preparation.change({ motif: 'Nouvelle décision' });
    await preparation.preview(dossierFixture);
    const acteEnAttente = preparation.resolution().saisie.command();
    attente.release({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2 } });
    await confirmation;

    expect(acteEnAttente).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(previews.requests).toHaveLength(1);
    expect(preparation.operation()).toEqual({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2 } });
  });

  it('should invalidate the preview after a concurrent write and retain the proposition for rereading', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const confirmation = preparation.confirm();
    await attente.arrival;

    attente.release({ kind: 'CONCURRENCE' });
    await confirmation;
    await preparation.confirm();

    expect(preparation.operation().kind).toBe('CONCURRENCE');
    expect(preparation.resolution().confirmation()).toBeUndefined();
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(applications.requests).toHaveLength(1);
  });

  it('should show a refused confirmation without discarding the exact proposal or retrying it automatically', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const confirmation = preparation.confirm();
    await attente.arrival;

    attente.release({ kind: 'REFUS', raison: 'Confirmation refusée' });
    await confirmation;

    expect(preparation.operation()).toEqual({ kind: 'REFUS', raison: 'Confirmation refusée' });
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(preparation.resolution().confirmation()).toEqual(propositionFixture(cancellationFixture()));
    expect(applications.requests).toHaveLength(1);
  });

  it('should treat an unexpected confirmation failure as an unknown outcome without replaying it', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const panne = new Error('Réponse perdue');
    const confirmation = preparation.confirm();
    await attente.arrival;

    attente.fail(panne);
    await confirmation;
    await preparation.confirm();

    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(preparation.resolution().confirmation()).toBeUndefined();
    expect(applications.requests).toHaveLength(1);
    expect(errors.failures).toEqual([panne]);
  });

  it('should refuse to preview an incomplete acte without starting any port request', async () => {
    preparation.choose(SaisieActe.regularise());

    await preparation.preview(dossierFixture);
    await preparation.confirm();

    expect(preparation.operation().kind).toBe('REPOS');
    expect(previews.requests).toHaveLength(0);
    expect(applications.requests).toHaveLength(0);
  });

  it.each([{ kind: 'REFUS', raison: 'Événement annulé' }, { kind: 'CONCURRENCE' }] satisfies readonly ResultatApercu[])(
    'should retain the proposal when previewing returns $kind',
    async resultat => {
      const attente = givenPreviewWaits();
      preparation.choose(cancellationFixture());
      const previsualisation = preparation.preview(dossierFixture);
      await attente.arrival;

      attente.release(resultat);
      await previsualisation;

      expect(preparation.operation()).toEqual(resultat);
      expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
      expect(preparation.resolution().confirmation()).toBeUndefined();
    },
  );

  it('should show a current preview failure and keep the proposal available for retrying', async () => {
    const attente = givenPreviewWaits();
    const panne = new Error('Lecture impossible');
    preparation.choose(cancellationFixture());
    const previsualisation = preparation.preview(dossierFixture);
    await attente.arrival;

    attente.fail(panne);
    await previsualisation;

    expect(preparation.operation().kind).toBe('ERREUR');
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(preparation.resolution().confirmation()).toBeUndefined();
    expect(errors.failures).toEqual([panne]);
  });

  it('should ignore a lost confirmation response after leaving its dossier', async () => {
    await givenValidPreview();
    const attente = givenApplicationWaits();
    const confirmation = preparation.confirm();
    await attente.arrival;

    preparation.contextChanged();
    attente.fail(new Error('Réponse perdue'));
    await confirmation;

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().saisie.command()).toBeUndefined();
  });

  it('should expose an error when the preview describes a dossier version different from the request', async () => {
    const attente = givenPreviewWaits();
    const saisie = cancellationFixture();
    preparation.choose(saisie);
    const previsualisation = preparation.preview(dossierFixture);
    await attente.arrival;

    attente.release({ kind: 'APERCU', apercu: { ...previewFixture(saisie), version: 2, avant: { ...dossierFixture, version: 2 } } });
    await previsualisation;

    expect(preparation.operation().kind).toBe('ERREUR');
    expect(preparation.resolution().confirmation()).toBeUndefined();
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
  });

  it('should keep a new choice blocked until the unknown outcome has been checked by rereading', async () => {
    await givenUnknownOutcome();

    preparation.choose(cancellationFixture('fin-18'));
    await preparation.preview(dossierFixture);

    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(previews.requests).toHaveLength(1);
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
  });

  it('should retain the uncertain proposition while its canonical receipt is not attested', async () => {
    await givenUnknownOutcome();
    applications.verification = { kind: 'NON_ATTESTE' };

    await preparation.verify();
    await preparation.preview(dossierFixture);

    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(preparation.resolution().saisie.command()).toEqual({ kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui' });
    expect(preparation.resolution().confirmation()).toBeUndefined();
    expect(previews.requests).toHaveLength(1);
  });

  it('should recover a committed acte through its canonical receipt after a lost response', async () => {
    await givenUnknownOutcome();

    await preparation.verify();

    expect(preparation.operation()).toEqual({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2, enConflit: false } });
    expect(applications.requests).toHaveLength(1);
  });

  it('should retain uncertainty and report an unavailable receipt verification without rejecting the user action', async () => {
    await givenUnknownOutcome();
    const panne = new Error('Vérification indisponible');
    applications.verificationFailure = panne;

    await preparation.verify();

    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(errors.failures).toEqual([panne]);
    expect(applications.requests).toHaveLength(1);
  });

  it('should explicitly retry the identical uncertain confirmation after its receipt remains unattested', async () => {
    await givenUnknownOutcome();
    applications.verification = { kind: 'NON_ATTESTE' };
    await preparation.verify();
    const attente = givenApplicationWaits();
    attente.release({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 3, enConflit: false } });

    await preparation.retryConfirmation();

    expect(applications.requests).toHaveLength(2);
    expect(applications.requests[1]).toEqual(applications.requests[0]);
    expect(previews.requests).toHaveLength(1);
    expect(preparation.operation()).toEqual({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 3, enConflit: false } });
  });

  it('should refuse retrying a confirmation whose canonical receipt has already settled the uncertainty', async () => {
    await givenUnknownOutcome();
    await preparation.verify();
    const attente = givenApplicationWaits();
    attente.release({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2, enConflit: false } });

    await preparation.retryConfirmation();

    expect(applications.requests).toHaveLength(1);
    expect(preparation.operation()).toEqual({ kind: 'APPLIQUE', dossier: { ...dossierFixture, version: 2, enConflit: false } });
  });

  it('should leave an unsubmitted proposition untouched when retrying without an uncertain confirmation', async () => {
    await givenValidPreview();

    await preparation.retryConfirmation();

    expect(applications.requests).toEqual([]);
    expect(preparation.resolution().confirmation()).toEqual(propositionFixture(cancellationFixture()));
  });

  it('should dispatch one explicit retry while retaining uncertainty if its response is also lost', async () => {
    await givenUnknownOutcome();
    const attente = givenApplicationWaits();
    const panne = new Error('Nouvelle réponse perdue');

    const reprise = preparation.retryConfirmation();
    await attente.arrival;
    await preparation.retryConfirmation();
    attente.fail(panne);
    await reprise;

    expect(applications.requests).toHaveLength(2);
    expect(applications.requests[1]).toEqual(applications.requests[0]);
    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(errors.failures).toEqual([panne]);
  });

  it('should ignore an older receipt after leaving and reopening a dossier with a new uncertain acte', async () => {
    await givenUnknownOutcome();
    const ancienne = new PendingIoFixture<ResultatVerification>();
    applications.verificationPending = ancienne;
    const verification = preparation.verify();
    await ancienne.arrival;

    preparation.contextChanged();
    await givenUnknownOutcome();
    ancienne.release({ kind: 'ATTESTE', dossier: { ...dossierFixture, version: 2 } });
    await verification;

    expect(preparation.operation().kind).toBe('ISSUE_INCONNUE');
    expect(applications.requests).toHaveLength(2);
  });

  it('should preserve a prepared acte when verifying without an unknown outcome', async () => {
    await givenValidPreview();

    await preparation.verify();

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().confirmation()).toEqual(propositionFixture(cancellationFixture()));
  });

  it('should require a new explicit choice after verifying the unknown outcome', async () => {
    await givenUnknownOutcome();
    const saisie = cancellationFixture('fin-18');
    const attente = givenPreviewWaits();

    await preparation.verify();
    preparation.choose(saisie);
    const previsualisation = preparation.preview({ ...dossierFixture, version: 2 });
    await attente.arrival;
    const apercu = { ...previewFixture(saisie), version: 2, avant: { ...dossierFixture, version: 2 } };
    attente.release({ kind: 'APERCU', apercu });
    await previsualisation;

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().confirmation()).toEqual({ ...propositionFixture(saisie), version: 2 });
    expect(previews.requests).toHaveLength(2);
  });

  it('should not preview an end regularisation before the manager dates it', async () => {
    preparation.choose(finARegulariserFixture);

    await preparation.preview(dossierFinAutomatiqueFixture);

    expect(previews.requests).toEqual([]);
    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().saisie.errors()).toEqual(['INSTANT_INVALIDE']);
  });

  it('should preview the end regularisation at the instant entered by the manager against the received version', async () => {
    const attente = givenPreviewWaits();
    preparation.choose(finARegulariserFixture);
    preparation.change({ fait: { instant: '2026-09-14T17:00:00+02:00' } });

    const demande = preparation.preview({ ...dossierFinAutomatiqueFixture, version: 4 });
    await attente.arrival;
    attente.release({ kind: 'REFUS', raison: 'Suivi clôturé' });
    await demande;

    expect(previews.requests).toEqual([
      {
        adresse: dossierFixture.ligne.adresse,
        version: 4,
        acte: {
          kind: 'REGULARISATION',
          fait: {
            type: 'FIN',
            intention: 'FIN',
            activiteVisee: 'travail-8',
            operateur: 'op-camille',
            poste: '',
            instant: '2026-09-14T17:00:00+02:00',
          },
        },
      },
    ]);
    expect(preparation.operation()).toEqual({ kind: 'REFUS', raison: 'Suivi clôturé' });
  });

  it('should keep the dated end regularisation after a refusal so the manager can adjust its instant', async () => {
    const attente = givenPreviewWaits();
    preparation.choose(finARegulariserFixture);
    preparation.change({ fait: { instant: '2026-09-15T17:00:00+02:00' } });
    const demande = preparation.preview(dossierFinAutomatiqueFixture);
    await attente.arrival;
    attente.release({ kind: 'REFUS', raison: 'La date de survenue est dans le futur' });
    await demande;

    preparation.change({ fait: { instant: '2026-09-14T17:00:00+02:00' } });

    expect(preparation.operation().kind).toBe('REPOS');
    expect(preparation.resolution().saisie.command()).toMatchObject({
      kind: 'REGULARISATION',
      fait: { instant: '2026-09-14T17:00:00+02:00' },
    });
  });

  const givenPreviewWaits = (): PendingIoFixture<ResultatApercu> => {
    const pending = new PendingIoFixture<ResultatApercu>();
    previews.pending = pending;
    return pending;
  };

  const givenApplicationWaits = (): PendingIoFixture<ResultatApplication> => {
    const pending = new PendingIoFixture<ResultatApplication>();
    applications.pending = pending;
    return pending;
  };

  const givenValidPreview = async (): Promise<void> => {
    const pending = givenPreviewWaits();
    const saisie = cancellationFixture();
    preparation.choose(saisie);
    const operation = preparation.preview(dossierFixture);
    await pending.arrival;
    pending.release({ kind: 'APERCU', apercu: previewFixture(saisie) });
    await operation;
  };

  const givenUnknownOutcome = async (): Promise<void> => {
    await givenValidPreview();
    const pending = givenApplicationWaits();
    const operation = preparation.confirm();
    await pending.arrival;
    pending.release({ kind: 'ISSUE_INCONNUE' });
    await operation;
  };
});
