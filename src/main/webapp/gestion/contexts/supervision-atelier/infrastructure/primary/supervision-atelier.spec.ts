import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { SupervisionAtelier } from './supervision-atelier';

class DonneesDeSupervisionFixture extends DonneesDeSupervisionPort {
  arrival = new DeferredFixture<void>();
  response = new DeferredFixture<DonneesDeSupervision>();

  read(): Promise<DonneesDeSupervision> {
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
  });

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
