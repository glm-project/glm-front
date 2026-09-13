import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { FenetreDePresence } from '../../domain/FenetreDePresence';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { SupervisionAtelier } from './supervision-atelier';

class DonneesDeSupervisionFixture extends DonneesDeSupervisionPort {
  reads = 0;
  arrival = new DeferredFixture<void>();
  response = new DeferredFixture<DonneesDeSupervision>();

  read(): Promise<DonneesDeSupervision> {
    this.reads += 1;
    this.arrival.resolve();
    return this.response.promise;
  }

  prepare(): void {
    this.arrival = new DeferredFixture<void>();
    this.response = new DeferredFixture<DonneesDeSupervision>();
  }
}

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const bobFixture = new OperateurDeclare(new IdentifiantOperateur('bob'), 'Durand', 'Bob');
const chloeFixture = new OperateurDeclare(new IdentifiantOperateur('chloe'), 'Bernard', 'Chloé');
const donneesFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture, bobFixture, chloeFixture],
  journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT'), JourneeDeTravail.open(bobFixture.id, 'EN_PAUSE')],
  activites: [],
};

describe('Supervision atelier component', () => {
  let componentFixture: ComponentFixture<SupervisionAtelier>;
  let sourceFixture: DonneesDeSupervisionFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 8, 13, 10, 0));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    sourceFixture = new DonneesDeSupervisionFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: DonneesDeSupervisionPort, useValue: sourceFixture },
      ],
    });
    componentFixture = TestBed.createComponent(SupervisionAtelier);
  });

  afterEach(async () => {
    sourceFixture.response.resolve({ operateurs: [], journees: [], activites: [] });
    await componentFixture.whenStable();
    componentFixture.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should reload at thirty seconds and leave the grid unchanged before then', async () => {
    await givenDonneesDisplayed();

    sourceFixture.prepare();
    await whenTimePasses(29_999);
    const beforeDeadline = displayedOperatorCount();
    await whenTimePasses(1);
    const atDeadline = isLoadingDisplayed();
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(beforeDeadline).toBe(3);
    expect(atDeadline).toBe(true);
    thenEmptyStateIsDisplayed();
  });

  it('should suspend hidden polling and restart immediately with a new thirty-second cadence', async () => {
    await givenDonneesDisplayed();

    await whenTimePasses(10_000);
    whenVisibilityChanges('hidden');
    sourceFixture.prepare();
    await whenTimePasses(60_000);
    const whileHidden = displayedOperatorCount();
    whenVisibilityChanges('visible');
    await whenSupervisionOpened();
    const onReturn = isLoadingDisplayed();
    await whenDonneesArrive();
    sourceFixture.prepare();
    await whenTimePasses(29_999);
    const beforeNextDeadline = displayedOperatorCount();
    await whenTimePasses(1);
    const atNextDeadline = isLoadingDisplayed();
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(whileHidden).toBe(3);
    expect(onReturn).toBe(true);
    expect(beforeNextDeadline).toBe(3);
    expect(atNextDeadline).toBe(true);
    thenEmptyStateIsDisplayed();
  });

  it('should finish a slow read before reading again on visibility return without displaying its obsolete result', async () => {
    await givenDonneesDisplayed();
    await refresh();
    const obsoleteResponse = sourceFixture.response;

    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    await whenTimePasses(60_000);
    const readsBeforeRelease = sourceFixture.reads;
    sourceFixture.prepare();
    obsoleteResponse.resolve({ operateurs: [], journees: [], activites: [] });
    await whenSupervisionOpened();
    const obsoleteResultWasWithheld = isLoadingDisplayed();
    const readsAfterRelease = sourceFixture.reads;
    await whenDonneesArrive();

    expect(readsBeforeRelease).toBe(2);
    expect(readsAfterRelease).toBe(3);
    expect(obsoleteResultWasWithheld).toBe(true);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should perform the visibility return read even when the pending acquisition fails', async () => {
    await givenAcquisitionInProgress();
    const obsoleteResponse = sourceFixture.response;

    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    sourceFixture.prepare();
    obsoleteResponse.reject(new Error('Old acquisition failed'));
    await whenSupervisionOpened();
    const readsAfterFailure = sourceFixture.reads;
    await whenDonneesArrive();

    expect(readsAfterFailure).toBe(2);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should discard a pending visibility refresh when unmounted and protect a newly mounted view', async () => {
    await givenDonneesDisplayed();
    await refresh();
    const obsoleteResponse = sourceFixture.response;
    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');

    whenSupervisionClosed();
    sourceFixture.prepare();
    whenSupervisionRemounted();
    await whenSupervisionOpened();
    await whenDonneesArrive();
    obsoleteResponse.resolve({ operateurs: [], journees: [], activites: [] });
    await obsoleteResponse.promise;
    await whenViewSettles();

    expect(sourceFixture.reads).toBe(3);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should cancel a deferred visibility read when the tab is hidden again before completion', async () => {
    await givenAcquisitionInProgress();

    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    whenVisibilityChanges('hidden');
    await whenDonneesArrive();
    await whenTimePasses(60_000);

    expect(sourceFixture.reads).toBe(1);
    expect(displayedOperatorCount()).toBe(3);
  });

  it('should skip elapsed polling deadlines and disabled manual refresh during a slow read without queuing retries', async () => {
    await givenDonneesDisplayed();
    await refresh();

    await whenTimePasses(90_000);
    whenRefreshClicked();
    const readsWhilePending = sourceFixture.reads;
    const manualRefreshDisabled = isRefreshDisabled();
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(readsWhilePending).toBe(2);
    expect(sourceFixture.reads).toBe(2);
    expect(manualRefreshDisabled).toBe(true);
    thenEmptyStateIsDisplayed();
  });

  it('should replace an automatic refresh failure with fresh data at the next deadline', async () => {
    await givenDonneesDisplayed();
    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenAcquisitionFails();
    const failure = { gridSize: displayedOperatorCount(), error: isErrorDisplayed() };

    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive();

    expect(failure).toEqual({ gridSize: 0, error: true });
    expect(displayedOperatorCount()).toBe(3);
    expect(isErrorDisplayed()).toBe(false);
  });

  it('should reevaluate the same acquired data at each read while keeping absolute times fixed between reads', async () => {
    await givenAcquisitionInProgress();
    const donneesAtThreshold = {
      ...donneesFixture,
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(new Instant(new Date(2026, 8, 12, 18, 0).toISOString()))]),
      ],
      activites: [activiteFixture('act-1', 'Moule 1015')],
    };
    await whenDonneesArrive(donneesAtThreshold);

    await whenTimePasses(29_999);
    const beforeRead = displayedAnomalies();
    sourceFixture.prepare();
    await whenTimePasses(1);
    await whenDonneesArrive(donneesAtThreshold);

    expect(beforeRead).toEqual([]);
    expect(displayedAnomalies()).toEqual(['Journée ouverte depuis plus de 16 h']);
    expect(displayedActivityStart()).toBe('08:12');
  });

  it('should leave no polling timer after unmount and restart one cadence on remount', async () => {
    await givenDonneesDisplayed();

    whenSupervisionClosed();
    const timersAfterClosing = pollingTimerCount();
    whenVisibilityChanges('hidden');
    whenVisibilityChanges('visible');
    await whenTimePasses(60_000);
    const readsAfterClosing = sourceFixture.reads;
    sourceFixture.prepare();
    whenSupervisionRemounted();
    await whenSupervisionOpened();
    await whenDonneesArrive();
    sourceFixture.prepare();
    await whenTimePasses(30_000);
    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    expect(timersAfterClosing).toBe(0);
    expect(readsAfterClosing).toBe(1);
    expect(sourceFixture.reads).toBe(3);
    expect(pollingTimerCount()).toBe(1);
    thenEmptyStateIsDisplayed();
  });

  it('should keep polling suspended when mounted in an already hidden tab', async () => {
    whenSupervisionClosed();
    whenVisibilityChanges('hidden');
    whenSupervisionRemounted();
    await givenDonneesDisplayed();

    await whenTimePasses(60_000);

    expect(sourceFixture.reads).toBe(1);
    expect(pollingTimerCount()).toBe(0);
    expect(displayedOperatorCount()).toBe(3);
  });

  const pollingTimerCount = (): number => vi.getTimerCount();

  const displayedAnomalies = (): string[] => elements('supervision-anomalie').map(anomalie => anomalie.textContent.trim());
  const displayedActivityStart = (): string | undefined => element('supervision-activite-debut')?.textContent.trim();

  const isErrorDisplayed = (): boolean => element('supervision-error') !== null;

  const whenRefreshClicked = (): void => {
    refreshButton().click();
  };
  const isRefreshDisabled = (): boolean => refreshButton().disabled;

  const whenSupervisionClosed = (): void => {
    componentFixture.destroy();
  };
  const whenSupervisionRemounted = (): void => {
    componentFixture = TestBed.createComponent(SupervisionAtelier);
  };

  const displayedOperatorCount = (): number => elements('supervision-tuile').length;
  const isLoadingDisplayed = (): boolean => element('supervision-loading') !== null;

  const whenVisibilityChanges = (visibility: DocumentVisibilityState): void => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
    document.dispatchEvent(new Event('visibilitychange'));
    componentFixture.detectChanges();
  };

  const whenViewSettles = async (): Promise<void> => {
    await componentFixture.whenStable();
  };

  const whenTimePasses = async (milliseconds: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(milliseconds);
    componentFixture.detectChanges();
  };

  it('should display loading until the data arrives', async () => {
    givenDonneesPending();

    await whenSupervisionOpened();

    thenLoadingIsDisplayed();
  });

  it('should display a tile for each declared operator with their presence status', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    thenOperatorsAreDisplayed([
      { nomComplet: 'Bernard Chloé', presence: 'Absent' },
      { nomComplet: 'Durand Bob', presence: 'En pause' },
      { nomComplet: 'Martin Alice', presence: 'Présent' },
    ]);
  });

  it('should display an empty state when there are no declared operators', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({ operateurs: [], journees: [], activites: [] });

    thenEmptyStateIsDisplayed();
  });

  it('should display an error without grid when acquired data produces an unexploitable supervision result', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      operateurs: [aliceFixture],
      journees: [],
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('act-orphan'),
          operateurId: undefined,
          nom: 'OF-42',
          categorie: new CategorieActivite('NC'),
          debut: new Instant('2026-09-13T10:00:00Z'),
        }),
      ],
    });

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should display an acquisition error without data', async () => {
    await givenAcquisitionInProgress();

    await whenAcquisitionFails();

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should replace previously displayed data with an error when refresh fails', async () => {
    await givenDonneesDisplayed();

    await whenRefreshFails();

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should replace previously displayed data with an error when refresh returns an unexploitable result', async () => {
    await givenDonneesDisplayed();

    await refresh();
    await whenDonneesArrive({
      operateurs: [aliceFixture],
      journees: [],
      activites: [
        new ActiviteDeSupervision({
          id: new IdentifiantActivite('act-orphan-refresh'),
          operateurId: undefined,
          nom: 'OF-42',
          categorie: new CategorieActivite('NC'),
          debut: new Instant('2026-09-13T10:00:00Z'),
        }),
      ],
    });

    thenErrorReplacesDataAndRetryIsAvailable();
  });

  it('should display fresh data when the user retries after an error', async () => {
    await givenAcquisitionFailed();

    await whenRetrySucceeds();

    thenOperatorsAreDisplayed([
      { nomComplet: 'Bernard Chloé', presence: 'Absent' },
      { nomComplet: 'Durand Bob', presence: 'En pause' },
      { nomComplet: 'Martin Alice', presence: 'Présent' },
    ]);
  });

  it('should display every ongoing element in its operator tile', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act-1', 'Moule 1015'), activiteFixture('act-2', 'OF-2026-000042')],
    });

    thenEveryElementIsInItsOperatorTile();
  });

  it('should display an absolute start time and omit a missing workstation', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act-1', 'Moule 1015', 'Tour 1'), activiteFixture('act-2', 'OF-2026-000042')],
    });

    thenActivityDetailsShowAbsoluteTimesAndOnlyKnownWorkstations();
  });

  it('should mark only a present operator without activities as GLM', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    thenOnlyThePresentIdleOperatorIsInGlm();
  });

  it('should remove GLM when an activity arrives for a present operator', async () => {
    await givenDonneesDisplayed();

    await refresh();
    await whenDonneesArrive({ ...donneesFixture, activites: [activiteFixture('act-1', 'Moule 1015')] });

    thenNoOperatorIsInGlm();
  });

  it('should mark the nonconforming activity without changing presence or hiding other activities', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      activites: [activiteFixture('act-nc', 'Moule 1015', 'Tour 1', 'NC'), activiteFixture('act-bon', 'OF-42')],
    });

    thenOnlyTheNonconformingActivityIsMarked();
  });

  it('should display the absolute opening date and time supplied by the working visit', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(new Instant(new Date(2026, 8, 12, 6, 4).toISOString()))]),
      ],
    });

    thenTheWorkingVisitOpeningIsDated();
  });

  it('should flag an old open visit while retaining its presence and activity', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      journees: [
        JourneeDeTravail.open(aliceFixture.id, 'PRESENT', [new FenetreDePresence(new Instant(new Date(2026, 8, 12, 6, 4).toISOString()))]),
      ],
      activites: [activiteFixture('act-1', 'Moule 1015')],
    });

    thenTheOldVisitIsFlaggedWithoutCorrectingIt();
  });

  it('should explain a working visit without windows without inventing an opening time', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive();

    thenVisitsWithoutWindowsHaveNoInventedOpening();
  });

  it('should flag an absent operator activity while retaining its details and absent status', async () => {
    await givenAcquisitionInProgress();

    await whenDonneesArrive({
      ...donneesFixture,
      journees: [],
      activites: [activiteFixture('act-1', 'Moule 1015', 'Tour 1')],
    });

    thenTheAbsentOperatorKeepsTheActivityDetails();
  });

  const thenEveryElementIsInItsOperatorTile = (): void => {
    expect(elements('supervision-activite-nom').map(activite => activite.textContent.trim())).toEqual(['Moule 1015', 'OF-2026-000042']);
    expect(tileFor('alice').querySelectorAll(dataSelector('supervision-activite'))).toHaveLength(2);
    expect(tileFor('bob').querySelectorAll(dataSelector('supervision-activite'))).toHaveLength(0);
  };

  const thenActivityDetailsShowAbsoluteTimesAndOnlyKnownWorkstations = (): void => {
    expect(elements('supervision-activite-debut').map(debut => debut.textContent.trim())).toEqual(['08:12', '08:12']);
    expect(element('supervision-activite-debut')?.getAttribute('datetime')).toBe(new Date(2026, 8, 13, 8, 12).toISOString());
    expect(elements('supervision-activite-poste').map(poste => poste.textContent.trim())).toEqual(['Tour 1']);
    expect(elements('supervision-activite')[1]?.querySelector(dataSelector('supervision-activite-poste'))).toBeNull();
  };

  const thenOnlyThePresentIdleOperatorIsInGlm = (): void => {
    expect(tileFor('alice').querySelector(dataSelector('supervision-glm'))?.textContent).toContain('GLM');
    expect(elements('supervision-glm')).toHaveLength(1);
    expect(tileFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
  };

  const thenNoOperatorIsInGlm = (): void => {
    expect(elements('supervision-glm')).toHaveLength(0);
  };

  const thenOnlyTheNonconformingActivityIsMarked = (): void => {
    expect(elements('supervision-nc').map(marque => marque.textContent.trim())).toEqual(['NC']);
    expect(elements('supervision-activite')[0]?.querySelector(dataSelector('supervision-nc'))).not.toBeNull();
    expect(elements('supervision-activite')[1]?.querySelector(dataSelector('supervision-nc'))).toBeNull();
    expect(tileFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
    expect(elements('supervision-activite')).toHaveLength(2);
  };

  const thenTheWorkingVisitOpeningIsDated = (): void => {
    expect(tileFor('alice').querySelector(dataSelector('supervision-ouverture'))?.textContent).toContain('12/09/2026 06:04');
    expect(elements('supervision-ouverture')).toHaveLength(1);
    expect(element('supervision-ouverture')?.getAttribute('datetime')).toBe(new Date(2026, 8, 12, 6, 4).toISOString());
  };

  const thenTheOldVisitIsFlaggedWithoutCorrectingIt = (): void => {
    expect(tileFor('alice').querySelector(dataSelector('supervision-anomalie'))?.textContent).toContain(
      'Journée ouverte depuis plus de 16 h',
    );
    expect(tileFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
    expect(tileFor('alice').querySelector(dataSelector('supervision-activite-nom'))?.textContent).toContain('Moule 1015');
    expect(tileFor('bob').querySelector(dataSelector('supervision-anomalie'))).toBeNull();
    expect(tileFor('alice').querySelector('a, button')).toBeNull();
  };

  const thenVisitsWithoutWindowsHaveNoInventedOpening = (): void => {
    expect(tileFor('alice').querySelector(dataSelector('supervision-anomalie'))?.textContent).toBe(
      "Journée ouverte sans heure d'ouverture",
    );
    expect(tileFor('alice').querySelector(dataSelector('supervision-ouverture'))).toBeNull();
    expect(tileFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Présent');
    expect(tileFor('bob').querySelector(dataSelector('supervision-anomalie'))?.textContent).toBe("Journée ouverte sans heure d'ouverture");
    expect(tileFor('bob').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('En pause');
  };

  const thenTheAbsentOperatorKeepsTheActivityDetails = (): void => {
    expect(tileFor('alice').querySelector(dataSelector('supervision-anomalie'))?.textContent).toBe('Activité d’un opérateur absent');
    expect(tileFor('alice').querySelector(dataSelector('supervision-presence'))?.textContent).toContain('Absent');
    expect(tileFor('alice').querySelector(dataSelector('supervision-activite-nom'))?.textContent).toContain('Moule 1015');
    expect(tileFor('alice').querySelector(dataSelector('supervision-activite-poste'))?.textContent).toContain('Tour 1');
    expect(tileFor('alice').querySelector(dataSelector('supervision-activite-debut'))?.textContent).toBe('08:12');
    expect(tileFor('alice').querySelector(dataSelector('supervision-ouverture'))).toBeNull();
    expect(tileFor('alice').querySelector(dataSelector('supervision-glm'))).toBeNull();
  };

  const tileFor = (id: string): HTMLElement =>
    requiredFixture(
      elements('supervision-tuile').find(tile => tile.dataset['operateurId'] === id),
      'operator tile',
    );

  const givenDonneesPending = (): void => {
    sourceFixture.prepare();
  };

  const givenAcquisitionInProgress = async (): Promise<void> => {
    givenDonneesPending();
    await whenSupervisionOpened();
  };

  const givenDonneesDisplayed = async (): Promise<void> => {
    await givenAcquisitionInProgress();
    await whenDonneesArrive();
  };

  const givenAcquisitionFailed = async (): Promise<void> => {
    await givenAcquisitionInProgress();
    await whenAcquisitionFails();
  };

  const whenSupervisionOpened = async (): Promise<void> => {
    componentFixture.detectChanges();
    await sourceFixture.arrival.promise;
  };

  const whenDonneesArrive = async (donnees: DonneesDeSupervision = donneesFixture): Promise<void> => {
    sourceFixture.response.resolve(donnees);
    await componentFixture.whenStable();
  };

  const whenAcquisitionFails = async (): Promise<void> => {
    sourceFixture.response.reject(new Error('Source unavailable'));
    await componentFixture.whenStable();
  };

  const whenRefreshFails = async (): Promise<void> => {
    await refresh();
    await whenAcquisitionFails();
  };

  const whenRetrySucceeds = async (): Promise<void> => {
    await refresh();
    await whenDonneesArrive();
  };

  const thenLoadingIsDisplayed = (): void => {
    expect(element('supervision-loading')?.textContent).toContain('Chargement');
    expect(element('supervision-grille')).toBeNull();
    expect(refreshButton().disabled).toBe(true);
  };

  const thenOperatorsAreDisplayed = (expected: readonly { nomComplet: string; presence: string }[]): void => {
    const tiles = elements('supervision-tuile');
    expect(tiles).toHaveLength(expected.length);
    tiles.forEach((tile, index) => {
      const exp = requiredFixture(expected[index], `expected operator at ${index}`);
      const nom = tile.querySelector(dataSelector('supervision-operateur-nom'))?.textContent.trim();
      const presence = tile.querySelector(dataSelector('supervision-presence'))?.textContent.trim();
      expect(nom).toBe(exp.nomComplet);
      expect(presence).toBe(exp.presence);
    });
    expect(element('supervision-loading')).toBeNull();
    expect(element('supervision-error')).toBeNull();
  };

  const thenEmptyStateIsDisplayed = (): void => {
    expect(element('supervision-empty')?.textContent).toContain('Aucun opérateur déclaré');
    expect(elements('supervision-tuile')).toHaveLength(0);
    expect(element('supervision-loading')).toBeNull();
    expect(element('supervision-error')).toBeNull();
  };

  const thenErrorReplacesDataAndRetryIsAvailable = (): void => {
    expect(element('supervision-error')?.textContent).toContain('Impossible de charger');
    expect(element('supervision-grille')).toBeNull();
    expect(refreshButton().disabled).toBe(false);
  };

  const refresh = async (): Promise<void> => {
    sourceFixture.prepare();
    refreshButton().click();
    await whenSupervisionOpened();
  };

  const element = (selector: string): HTMLElement | null => {
    const host = componentFixture.nativeElement as HTMLElement;
    return host.querySelector(dataSelector(selector));
  };

  const elements = (selector: string): HTMLElement[] => {
    const host = componentFixture.nativeElement as HTMLElement;
    return Array.from(host.querySelectorAll(dataSelector(selector)));
  };

  const refreshButton = (): HTMLButtonElement => {
    const button = element('supervision-refresh');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing refresh button');
    }
    return button;
  };
});

const activiteFixture = (id: string, nom: string, poste?: string, categorie = 'FABRICATION'): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    id: new IdentifiantActivite(id),
    operateurId: aliceFixture.id,
    nom,
    categorie: new CategorieActivite(categorie),
    debut: new Instant(new Date(2026, 8, 13, 8, 12).toISOString()),
    ...(poste === undefined ? {} : { poste }),
  });
