import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { EffacementDesJournaux } from '@/pupitre/contexts/atelier/application/EffacementDesJournaux';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { JournauxDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/JournauxDeLAtelierPort';
import { journauxProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/journaux.providers';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { EffacementDesJournauxFixture } from '@test/unit/fixtures/pupitre/atelier/EffacementDesJournauxFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';

const entreprise = Entreprise.of('entreprise-a');

const enAttente = (id: string): EvenementDuJournal => ({
  etat: 'EN_ATTENTE',
  geste: {
    nature: 'POINTAGE',
    id,
    dateDeSurvenue: '2026-09-05T09:00:00Z',
    operateurId: 'jean',
    suiviId: 'piece',
    intention: 'OUVERTURE',
    type: 'DEBUT',
  } satisfies GesteDePointage,
});

class UnreadableJournauxFixture extends JournauxDuPupitrePort {
  constructor(private readonly journaux: JournauxDuPupitreFixture) {
    super();
  }

  override read(): Promise<JournalDuPupitre> {
    return Promise.reject(new Error('disque illisible'));
  }

  override append(entreprise: Entreprise, gestes: readonly GesteDePointage[], repriseAEffacer?: string): Promise<void> {
    return this.journaux.append(entreprise, gestes, repriseAEffacer);
  }

  override saveReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.journaux.saveReferentiel(entreprise, referentiel);
  }

  override saveResult(entreprise: Entreprise, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
    return this.journaux.saveResult(entreprise, resultat);
  }

  override markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre> {
    return this.journaux.markDisconnected(entreprise);
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.journaux.synchronize(action);
  }
}

class UnerasableEffacementFixture extends EffacementDesJournauxPort {
  override discardAll(): Promise<void> {
    return Promise.reject(new Error('effacement impossible'));
  }
}

describe('JournauxDeLAtelierPort contract, honoured by the workshop adapter', () => {
  let journaux: JournauxDuPupitreFixture;
  let errorHandler: ErrorHandlerFixture;
  let atelier: JournauxDeLAtelierPort;

  beforeEach(() => {
    journaux = new JournauxDuPupitreFixture();
    journaux.answerReadsImmediately();
    errorHandler = new ErrorHandlerFixture();
    atelier = buildFor(journaux, new EffacementDesJournauxFixture(journaux));
  });

  it('should report how many gestures the selected company has not published yet', async () => {
    givenPendingGestures(2);

    const gestes = await atelier.pendingGestures();

    expect(gestes).toBe(2);
  });

  it('should leave no pending gesture once the journals are discarded', async () => {
    givenPendingGestures(2);

    await atelier.discardAll();

    expect(await atelier.pendingGestures()).toBe(0);
  });

  it('should reject a count it cannot read, so the caller can warn without a number', async () => {
    atelier = buildFor(new UnreadableJournauxFixture(journaux), new UnerasableEffacementFixture());

    await expect(atelier.pendingGestures()).rejects.toThrow('disque illisible');
  });

  it('should report a failed erasure instead of rejecting, so the reset goes on', async () => {
    atelier = buildFor(journaux, new UnerasableEffacementFixture());

    await atelier.discardAll();

    expect(errorHandler.errors).toEqual([new Error('effacement impossible')]);
  });

  const buildFor = (journauxDuPupitre: JournauxDuPupitrePort, effacement: EffacementDesJournauxPort): JournauxDeLAtelierPort => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...journauxProviders,
        EffacementDesJournaux,
        EtatHorsLigneDuPupitre,
        GestesRecordingQueue,
        { provide: JournauxDuPupitrePort, useValue: journauxDuPupitre },
        { provide: EffacementDesJournauxPort, useValue: effacement },
        { provide: PupitreSynchronization, useValue: { synchronize: () => Promise.resolve() } },
        { provide: AuthenticationPort, useValue: { synchronizeSession: () => Promise.resolve(), currentTenant: () => 'entreprise-a' } },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    });
    return TestBed.inject(JournauxDeLAtelierPort);
  };

  const givenPendingGestures = (count: number): void => {
    journaux.seedJournal(entreprise, {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      evenements: Array.from({ length: count }, (_, index) => enAttente(`geste-${index}`)),
    });
  };
});
