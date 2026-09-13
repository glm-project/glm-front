import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { SupervisionAtelier } from './supervision-atelier';

class DeferredFixture<T> {
  resolve: (value: T) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  reject: (error: Error) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

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
const donneesFixture: DonneesDeSupervision = {
  operateurs: [aliceFixture],
  journees: [JourneeDeTravail.open(aliceFixture.id, 'PRESENT')],
  activites: [
    new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: undefined,
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T10:00:00Z'),
    }),
  ],
};

class SupervisionFixture {
  constructor(
    private readonly component: ComponentFixture<SupervisionAtelier>,
    private readonly donneesFixture: DonneesDeSupervisionFixture,
  ) {}

  displayedCounts(): { operateurs: string | undefined; journees: string | undefined; activites: string | undefined } {
    return {
      operateurs: this.element('supervision-operateurs-count')?.textContent.trim(),
      journees: this.element('supervision-journees-count')?.textContent.trim(),
      activites: this.element('supervision-activites-count')?.textContent.trim(),
    };
  }

  loadingMessage(): string | undefined {
    return this.element('supervision-loading')?.textContent;
  }

  errorMessage(): string | undefined {
    return this.element('supervision-error')?.textContent;
  }

  hasDisplayedData(): boolean {
    return this.element('supervision-data') !== null;
  }

  canRefresh(): boolean {
    return !this.refreshButton().disabled;
  }

  async open(): Promise<void> {
    this.component.detectChanges();
    await this.donneesFixture.arrival.promise;
  }

  private element(selector: string): HTMLElement | null {
    const host = this.component.nativeElement as HTMLElement;
    return host.querySelector(dataSelector(selector));
  }

  async receiveDonnees(donnees: DonneesDeSupervision = donneesFixture): Promise<void> {
    this.donneesFixture.response.resolve(donnees);
    await this.component.whenStable();
  }

  async failAcquisition(): Promise<void> {
    this.donneesFixture.response.reject(new Error('Source unavailable'));
    await this.component.whenStable();
  }

  async refresh(): Promise<void> {
    this.donneesFixture.prepare();
    this.refreshButton().click();
    await this.open();
  }

  private refreshButton(): HTMLButtonElement {
    const button = this.element('supervision-refresh');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Missing refresh button');
    }
    return button;
  }

  async loadDonnees(): Promise<void> {
    await this.open();
    await this.receiveDonnees();
  }
}

describe('Supervision atelier component', () => {
  let supervisionFixture: SupervisionFixture;
  beforeEach(() => {
    const donneesFixture = new DonneesDeSupervisionFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: DonneesDeSupervisionPort, useValue: donneesFixture },
      ],
    });
    supervisionFixture = new SupervisionFixture(TestBed.createComponent(SupervisionAtelier), donneesFixture);
  });

  it('should display loading until the data arrives', async () => {
    await supervisionFixture.open();

    expect(supervisionFixture.loadingMessage()).toContain('Chargement');
    expect(supervisionFixture.hasDisplayedData()).toBe(false);
    expect(supervisionFixture.canRefresh()).toBe(false);

    await supervisionFixture.receiveDonnees();
  });

  it('should display the acquired collections without interpreting their business validity', async () => {
    await supervisionFixture.open();

    await supervisionFixture.receiveDonnees();

    expect(supervisionFixture.displayedCounts()).toEqual({ operateurs: '1', journees: '1', activites: '1' });
    expect(supervisionFixture.loadingMessage()).toBeUndefined();
    expect(supervisionFixture.errorMessage()).toBeUndefined();
  });

  it('should display empty collections as a successful acquisition', async () => {
    await supervisionFixture.open();

    await supervisionFixture.receiveDonnees({ operateurs: [], journees: [], activites: [] });

    expect(supervisionFixture.displayedCounts()).toEqual({ operateurs: '0', journees: '0', activites: '0' });
    expect(supervisionFixture.errorMessage()).toBeUndefined();
  });

  it('should display an acquisition error without data', async () => {
    await supervisionFixture.open();

    await supervisionFixture.failAcquisition();

    expect(supervisionFixture.errorMessage()).toContain('Impossible de charger');
    expect(supervisionFixture.hasDisplayedData()).toBe(false);
    expect(supervisionFixture.canRefresh()).toBe(true);
  });

  it('should replace previously displayed data with an error when refresh fails', async () => {
    await supervisionFixture.loadDonnees();
    await supervisionFixture.refresh();

    await supervisionFixture.failAcquisition();

    expect(supervisionFixture.errorMessage()).toContain('Impossible de charger');
    expect(supervisionFixture.hasDisplayedData()).toBe(false);
  });

  it('should display fresh data when the user retries after an error', async () => {
    await supervisionFixture.open();
    await supervisionFixture.failAcquisition();
    await supervisionFixture.refresh();

    await supervisionFixture.receiveDonnees();

    expect(supervisionFixture.displayedCounts()).toEqual({ operateurs: '1', journees: '1', activites: '1' });
    expect(supervisionFixture.errorMessage()).toBeUndefined();
  });
});
