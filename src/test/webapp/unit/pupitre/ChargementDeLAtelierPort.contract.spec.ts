import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { ChargementDeLAtelier, ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { chargementProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/chargement.providers';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

const referentielFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };

class AtelierCoordinatorFixture {
  readonly reference = signal<ReferentielDuPupitre | undefined>(undefined);
  readonly connected = signal(true);
  synchronizations = 0;
  failure: Error | undefined;

  referentiel(): ReferentielDuPupitre | undefined {
    return this.reference();
  }

  synchronize(): Promise<void> {
    this.synchronizations += 1;
    return this.failure === undefined ? Promise.resolve() : Promise.reject(this.failure);
  }
}

describe('ChargementDeLAtelierPort contract, honoured by the workshop adapter', () => {
  let chargement: ChargementDeLAtelierPort;
  let pupitre: AtelierCoordinatorFixture;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(() => {
    pupitre = new AtelierCoordinatorFixture();
    errorHandler = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [
        ...chargementProviders,
        { provide: AtelierCoordinator, useValue: pupitre },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    });
    chargement = TestBed.inject(ChargementDeLAtelierPort);
  });

  it('should report no workshop before its first complete reference is active', () => {
    const etat = whenReadingTheWorkshopState();

    thenTheReferenceIs(etat, false);
  });

  it('should report the workshop as loaded once its reference is active', () => {
    givenAnActiveReference();

    const etat = whenReadingTheWorkshopState();

    thenTheReferenceIs(etat, true);
  });

  it.each([true, false])('should report the connectivity the pupitre observed (%s)', connected => {
    givenTheObservedConnectivityIs(connected);

    const etat = whenReadingTheWorkshopState();

    thenConnectivityIs(etat, connected);
  });

  it('should synchronize the pupitre when asked to load the workshop', async () => {
    await whenLoadingTheWorkshop();

    thenSynchronizationsAre(1);
  });

  it('should report a failed load instead of rejecting, so the runtime keeps starting', async () => {
    givenSynchronizationFails();

    await whenLoadingTheWorkshop();

    thenTheFailureWasReported();
  });

  const givenAnActiveReference = (): void => {
    pupitre.reference.set(referentielFixture);
  };

  const givenTheObservedConnectivityIs = (connected: boolean): void => {
    pupitre.connected.set(connected);
  };

  const givenSynchronizationFails = (): void => {
    pupitre.failure = new Error('atelier injoignable');
  };

  const whenReadingTheWorkshopState = (): ChargementDeLAtelier => chargement.etat();

  const whenLoadingTheWorkshop = (): Promise<void> => chargement.charger();

  const thenTheReferenceIs = (etat: ChargementDeLAtelier, disponible: boolean): void => {
    expect(etat.referentielDisponible).toBe(disponible);
  };

  const thenConnectivityIs = (etat: ChargementDeLAtelier, connected: boolean): void => {
    expect(etat.connecte).toBe(connected);
  };

  const thenSynchronizationsAre = (count: number): void => {
    expect(pupitre.synchronizations).toBe(count);
  };

  const thenTheFailureWasReported = (): void => {
    expect(errorHandler.errors).toEqual([new Error('atelier injoignable')]);
  };
});
