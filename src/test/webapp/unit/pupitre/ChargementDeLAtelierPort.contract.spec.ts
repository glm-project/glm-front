import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { TypeScriptChargementDeLAtelier } from '@/pupitre/contexts/atelier/infrastructure/primary/TypeScriptChargementDeLAtelier';
import {
  ChargementDeLAtelier,
  ChargementDeLAtelierPort,
  IssueDuChargementDeLAtelier,
} from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { AtelierChargement } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/AtelierChargement';
import { chargementProviders } from '@/pupitre/contexts/enrolement/infrastructure/secondary/atelier/chargement.providers';
import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';

const referentielFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };

class AtelierCoordinatorFixture {
  readonly reference = signal<ReferentielDuPupitre | undefined>(undefined);
  readonly connected = signal(true);
  synchronizations = 0;
  failure: Error | undefined;

  referentiel(): ReferentielDuPupitre | undefined {
    return this.reference();
  }

  referentielDisponible(): boolean {
    return this.referentiel() !== undefined;
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
        { provide: EtatHorsLigneDuPupitre, useValue: pupitre },
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

  it('should report no workshop reference when the active reference belongs to the previous company', async () => {
    const chargementDeLaNouvelleEntreprise = await givenAReferenceActiveForThePreviousCompany();

    const etat = chargementDeLaNouvelleEntreprise.etat();

    thenTheReferenceIs(etat, false);
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

  it('should report a failed workshop load as a distinct outcome', async () => {
    givenSynchronizationFails();

    const issue = await chargement.charger();

    expect(issue).toBe('ECHEC');
  });

  const givenAnActiveReference = (): void => {
    pupitre.reference.set(referentielFixture);
  };

  const givenAReferenceActiveForThePreviousCompany = async (): Promise<ChargementDeLAtelierPort> => {
    let entrepriseSelectionnee = 'entreprise-a';
    const journaux = new JournauxDuPupitreFixture();
    journaux.answerReadsImmediately();
    journaux.seedReferentiel(Entreprise.of(entrepriseSelectionnee), referentielFixture);
    const etatHorsLigne = offlineStateFor(journaux, () => entrepriseSelectionnee);
    await etatHorsLigne.refresh('RESTORE', () => undefined);
    entrepriseSelectionnee = 'entreprise-b';
    return workshopLoadingFor(etatHorsLigne);
  };

  const offlineStateFor = (journaux: JournauxDuPupitrePort, currentTenant: () => string | undefined): EtatHorsLigneDuPupitre =>
    Injector.create({
      providers: [
        EtatHorsLigneDuPupitre,
        { provide: JournauxDuPupitrePort, useValue: journaux },
        { provide: AuthenticationPort, useValue: { currentTenant } },
        {
          provide: PupitreSynchronization,
          useValue: { synchronize: () => Promise.resolve() },
        },
      ],
    }).get(EtatHorsLigneDuPupitre);

  const workshopLoadingFor = (etatHorsLigne: EtatHorsLigneDuPupitre): ChargementDeLAtelierPort =>
    Injector.create({
      providers: [
        TypeScriptChargementDeLAtelier,
        { provide: ChargementDeLAtelierPort, useClass: AtelierChargement },
        { provide: AtelierCoordinator, useValue: { synchronize: () => Promise.resolve() } },
        { provide: EtatHorsLigneDuPupitre, useValue: etatHorsLigne },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    }).get(ChargementDeLAtelierPort);

  const givenTheObservedConnectivityIs = (connected: boolean): void => {
    pupitre.connected.set(connected);
  };

  const givenSynchronizationFails = (): void => {
    pupitre.failure = new Error('atelier injoignable');
  };

  const whenReadingTheWorkshopState = (): ChargementDeLAtelier => chargement.etat();

  const whenLoadingTheWorkshop = (): Promise<IssueDuChargementDeLAtelier> => chargement.charger();

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
