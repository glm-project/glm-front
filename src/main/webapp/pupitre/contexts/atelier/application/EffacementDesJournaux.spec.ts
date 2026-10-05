import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ContextesParGeste } from '@/pupitre/contexts/atelier/domain/designation/ContextesParGeste';
import { LotDeGestesDAtelier } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/DecisionDePointage';
import { FenetreOperateur } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/FenetreOperateur';
import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { Injector } from '@angular/core';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { EffacementDesJournauxFixture } from '@test/unit/fixtures/pupitre/atelier/EffacementDesJournauxFixture';
import { identifiantFixture } from '@test/unit/fixtures/pupitre/atelier/IdentifiantFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { setTimeout as roundTrip } from 'node:timers';
import { EffacementDesJournaux } from './EffacementDesJournaux';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { GestesRecordingQueue } from './GestesRecordingQueue';
import { PupitreSynchronization } from './PupitreSynchronization';

const entrepriseA = Entreprise.of('entreprise-a');
const entrepriseB = Entreprise.of('entreprise-b');

const referentielFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
    suivis: [],
  },
};

const gesteFixture = (id: string): GesteDePointage => ({
  nature: 'POINTAGE',
  id,
  dateDeSurvenue: '2026-09-05T09:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  intention: 'OUVERTURE',
  type: 'DEBUT',
});

const enAttente = (id: string): EvenementDuJournal => ({ geste: gesteFixture(id), etat: 'EN_ATTENTE' });

describe('EffacementDesJournaux', () => {
  let effacement: EffacementDesJournaux;
  let journaux: JournauxDuPupitreFixture;
  let etatHorsLigne: EtatHorsLigneDuPupitre;
  let enregistrement: GestesRecordingQueue;
  let tenant: string | undefined;

  beforeEach(() => {
    journaux = new JournauxDuPupitreFixture();
    journaux.answerReadsImmediately();
    tenant = 'entreprise-a';
    const injector = Injector.create({
      providers: [
        EffacementDesJournaux,
        EtatHorsLigneDuPupitre,
        GestesRecordingQueue,
        { provide: JournauxDuPupitrePort, useValue: journaux },
        { provide: EffacementDesJournauxPort, useValue: new EffacementDesJournauxFixture(journaux) },
        { provide: PupitreSynchronization, useValue: { synchronize: () => Promise.resolve() } },
        { provide: AuthenticationPort, useValue: { synchronizeSession: () => Promise.resolve(), currentTenant: () => tenant } },
      ],
    });
    effacement = injector.get(EffacementDesJournaux);
    etatHorsLigne = injector.get(EtatHorsLigneDuPupitre);
    enregistrement = injector.get(GestesRecordingQueue);
  });

  it('should count the pending gestures of the selected company only', async () => {
    givenJournals({
      [entrepriseA.toString()]: [enAttente('a-1'), { geste: gesteFixture('a-accepte'), etat: 'ACCEPTE' }, enAttente('a-2')],
      [entrepriseB.toString()]: [enAttente('b-1')],
    });

    const gestes = await effacement.pendingGestures();

    expect(gestes).toBe(2);
  });

  it('should count no pending gesture when no company is selected', async () => {
    givenJournals({ [entrepriseA.toString()]: [enAttente('a-1')] });
    givenNoSelectedCompany();

    const gestes = await effacement.pendingGestures();

    expect(gestes).toBe(0);
  });

  it('should erase the journal of every company, pending gestures included', async () => {
    givenJournals({ [entrepriseA.toString()]: [enAttente('a-1')], [entrepriseB.toString()]: [enAttente('b-1')] });

    await effacement.discardAll();

    await thenNoJournalHoldsAnyGesture();
  });

  it('should empty the journal view in memory, so the pupitre is not ready on an erased disk', async () => {
    await givenALoadedReference();

    await effacement.discardAll();

    thenNoReferenceIsAvailable();
  });

  it('should wait for a capture already initiated before erasing', async () => {
    const capture = await givenACaptureInFlight();

    const erasure = effacement.discardAll();
    capture.release();
    await Promise.all([capture.accepted, erasure]);

    await thenNoJournalHoldsAnyGesture();
  });

  it('should wait for an exchange in progress before erasing', async () => {
    givenJournals({ [entrepriseA.toString()]: [enAttente('a-1')] });
    const exchange = givenAnExchangeInProgress();

    const erasure = effacement.discardAll();
    const during = await whenReadingTheJournalWhileTheExchangeRuns();
    exchange.finish();
    await Promise.all([exchange.completion, erasure]);

    expect(during.evenements).toEqual([enAttente('a-1')]);
    await thenNoJournalHoldsAnyGesture();
  });

  const givenJournals = (parEntreprise: Record<string, readonly EvenementDuJournal[]>): void => {
    for (const [entreprise, evenements] of Object.entries(parEntreprise)) {
      journaux.seedJournal(Entreprise.of(entreprise), { ...EMPTY_JOURNAL_DU_PUPITRE, evenements });
    }
  };

  const givenNoSelectedCompany = (): void => {
    tenant = undefined;
  };

  const givenALoadedReference = async (): Promise<void> => {
    journaux.seedJournal(entrepriseA, referentielFixture);
    await etatHorsLigne.refresh('RESTORE', () => undefined);
  };

  const givenACaptureInFlight = async (): Promise<{ readonly release: () => void; readonly accepted: Promise<unknown> }> => {
    const append = journaux.delayNextAppend();
    const accepted = enregistrement.capture(fenetreFixture(), { kind: 'PREPAREE', gestes: lotFixture() }, () => fenetreFixture());
    await append.started;
    return { release: append.release, accepted };
  };

  const givenAnExchangeInProgress = (): { readonly finish: () => void; readonly completion: Promise<void> } => {
    const ending = new DeferredFixture<void>();
    const completion = journaux.synchronize(() => ending.promise);
    return {
      finish: () => {
        ending.resolve();
      },
      completion,
    };
  };

  const whenReadingTheJournalWhileTheExchangeRuns = async (): Promise<JournalDuPupitre> => {
    await new Promise(resolve => roundTrip(resolve));
    return journaux.read(entrepriseA);
  };

  const thenNoJournalHoldsAnyGesture = async (): Promise<void> => {
    expect((await journaux.read(entrepriseA)).evenements).toEqual([]);
    expect((await journaux.read(entrepriseB)).evenements).toEqual([]);
  };

  const thenNoReferenceIsAvailable = (): void => {
    expect(etatHorsLigne.referentielDisponible()).toBe(false);
  };

  const fenetreFixture = (): FenetreOperateur =>
    FenetreOperateur.open(
      entrepriseA,
      structuredClone(referentielFixture),
      identifiantFixture('049'),
      Date.parse('2026-09-05T09:00:00Z'),
      new IdentiteDeFenetre(1),
    );

  const lotFixture = (): LotDeGestesDAtelier => ({
    kind: 'GESTES',
    capture: () => [gesteFixture('capture-en-vol')],
    contextesParGeste: ContextesParGeste.empty(),
    intention: 1,
  });
});
