import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { DemonstrationConflitsPort, IncidentDemo } from '../../../domain/dossier/DemonstrationConflitsPort';
import { FiltreConflits, LectureDossier, LigneConflit, PageConflits } from '../../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../../domain/dossier/SuiviConflitId';
import { ListeConflits } from './ListeConflits';

class ConflitsReadFixture extends ConflitsReadPort {
  page: PageConflits = { lignes: [], total: 0, complete: true };
  failure: Error | undefined;
  readonly demandes: FiltreConflits[] = [];
  private notifyArrival = (): void => undefined;
  private heldReading: Promise<PageConflits> | undefined;

  override async list(filtre: FiltreConflits): Promise<PageConflits> {
    const held = this.heldReading;
    this.demandes.push(filtre);
    this.notifyArrival();
    await new Promise(resolve => setTimeout(resolve));
    if (this.failure !== undefined) {
      throw this.failure;
    }
    return held ?? this.page;
  }

  nextReading(): Promise<void> {
    return new Promise(resolve => {
      this.notifyArrival = resolve;
    });
  }

  holdReading(): () => void {
    let release = (): void => undefined;
    this.heldReading = new Promise(resolve => {
      release = () => {
        resolve(this.page);
        this.heldReading = undefined;
      };
    });
    return release;
  }

  override read(): Promise<LectureDossier> {
    return Promise.resolve({ kind: 'INTROUVABLE', journal: [] });
  }
}

class RouteFixture {
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({}));
}

interface UrlTreeFixture {
  readonly queryParams: Record<string, string>;
}

class RouterFixture {
  readonly events = EMPTY;
  readonly navigations: FiltreConflits[] = [];
  navigationResult = true;
  navigationFailure: Error | undefined;

  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string> }): UrlTreeFixture {
    return { queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(tree: UrlTreeFixture): string {
    return `/?${new URLSearchParams(tree.queryParams).toString()}`;
  }

  navigate(_commands: unknown[], extras: { queryParams: FiltreConflits }): Promise<boolean> {
    this.navigations.push(extras.queryParams);
    return this.navigationFailure === undefined ? Promise.resolve(this.navigationResult) : Promise.reject(this.navigationFailure);
  }
}

class DemonstrationConflitsFixture extends DemonstrationConflitsPort {
  readonly incidents: IncidentDemo[] = [];

  override async reset(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve));
  }

  override arm(incident: IncidentDemo): void {
    this.incidents.push(incident);
  }
}

const ligneFixture = (): LigneConflit => ({
  adresse: { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-camille') },
  element: new ElementConflitId('moule-42'),
  designation: 'M-042',
  operateur: 'Camille Martin',
  poste: 'Fraiseuse',
  date: '2 octobre 2026',
  explication: 'La fin vise une activité déjà terminée.',
  nombrePointages: 3,
});

describe('Conflict list', () => {
  let componentFixture: ComponentFixture<ListeConflits>;
  let portFixture: ConflitsReadFixture;
  let routeFixture: RouteFixture;
  let routerFixture: RouterFixture;
  let errorFixture: ErrorHandlerFixture;

  beforeEach(() => {
    portFixture = new ConflitsReadFixture();
    routeFixture = new RouteFixture();
    routerFixture = new RouterFixture();
    errorFixture = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ConflitsReadPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
        { provide: Router, useValue: routerFixture },
        { provide: DemonstrationConflitsPort, useClass: DemonstrationConflitsFixture },
        { provide: ErrorHandlerPort, useValue: errorFixture },
      ],
    });
  });

  it('should explain that the complete global list has no conflicts', async () => {
    await whenTheListIsRendered();

    expect(textOf('conflits-vide')).toContain('Aucun conflit');
    expect(present('conflits-table')).toBe(false);
  });

  it('should omit simulation controls when the list has no demonstration port', async () => {
    givenNoDemonstration();

    await whenTheListIsRendered();

    expect(present('conflits-demo')).toBe(false);
    expect(textOf('conflits-vide')).toContain('Aucun conflit');
  });

  it('should keep unresolved operator and workstation identities visible in the conflict list', async () => {
    portFixture.page = {
      lignes: [{ ...ligneFixture(), operateur: '', operateurId: 'op-absent', poste: '', posteId: 'poste-supprime' }],
      total: 1,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Opérateur non résolu · op-absent');
    expect(textOf('conflit-ligne')).toContain('Poste non résolu · poste-supprime');
  });

  it('should distinguish work clocked without a workstation from an unresolved workstation reference', async () => {
    portFixture.page = { lignes: [{ ...ligneFixture(), poste: '' }], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Sans poste');
    expect(textOf('conflit-ligne')).not.toContain('Poste non résolu');
  });

  it('should identify a conflicting sequence when the API supplies no presentation explanation', async () => {
    portFixture.page = { lignes: [{ ...ligneFixture(), explication: '' }], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Séquence en conflit');
  });

  it('should distinguish no matching conflicts from an empty global list', async () => {
    givenAnAddress({ operateur: 'Camille', element: 'M-042', page: '2' });

    await whenTheListIsRendered();

    expect(textOf('conflits-vide-filtre')).toContain('Aucun conflit ne correspond');
    expect(present('conflits-vide')).toBe(false);
    expect(portFixture.demandes).toEqual([{ operateur: 'Camille', element: 'M-042', page: 2 }]);
    expect(inputValue('conflits-filtre-operateur')).toBe('Camille');
    expect(inputValue('conflits-filtre-element')).toBe('M-042');
  });

  const givenAnAddress = (params: Record<string, string>): void => {
    routeFixture.queryParamMap.next(convertToParamMap(params));
  };

  it('should request the submitted filters on the first page', async () => {
    givenAnAddress({ page: '2' });
    await whenTheListIsRendered();

    await whenFiltering(' Camille ', ' M-042 ');

    expect(routerFixture.navigations).toEqual([{ operateur: 'Camille', element: 'M-042', page: 1 }]);
  });

  it('should explain an acquisition failure without showing an empty list', async () => {
    portFixture.failure = new Error('Acquisition indisponible');

    await whenTheListIsRendered();

    expect(textOf('conflits-erreur')).toContain('Impossible de charger');
    expect(present('conflits-vide')).toBe(false);
    expect(present('conflits-table')).toBe(false);
  });

  it('should reacquire the current filters when the operator retries a failed read', async () => {
    givenAnAddress({ operateur: 'Camille', page: '2' });
    portFixture.failure = new Error('Acquisition indisponible');
    await whenTheListIsRendered();

    await whenTheReadingRecovers();

    expect(present('conflits-erreur')).toBe(false);
    expect(textOf('conflits-vide-filtre')).toContain('Aucun conflit ne correspond');
    expect(portFixture.demandes).toEqual([
      { operateur: 'Camille', element: '', page: 2 },
      { operateur: 'Camille', element: '', page: 2 },
    ]);
  });

  it('should never describe an empty partial acquisition as a complete global list', async () => {
    portFixture.page = { lignes: [], total: 0, complete: false };

    await whenTheListIsRendered();

    expect(textOf('conflits-partiel')).toContain('Liste partielle');
    expect(present('conflits-vide')).toBe(false);
    expect(present('conflits-vide-filtre')).toBe(false);
  });

  it('should show the second and last acquired page with only the previous page enabled', async () => {
    givenAnAddress({ operateur: 'Camille', page: '2' });
    portFixture.page = { lignes: [ligneFixture()], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflits-pagination')).toContain('Page 2 sur 2');
    expect(button('conflits-page-precedente').disabled).toBe(false);
    expect(button('conflits-page-suivante').disabled).toBe(true);
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
  });

  it('should reacquire the current list after resetting the demonstration', async () => {
    portFixture.page = { lignes: [ligneFixture()], total: 1, complete: true };
    await whenTheListIsRendered();

    await whenTheDemonstrationIsReset();

    expect(textOf('conflits-vide')).toContain('Aucun conflit');
    expect(present('conflit-ligne')).toBe(false);
    expect(portFixture.demandes).toHaveLength(2);
  });

  it('should refuse page zero without acquiring a misleading list', async () => {
    givenAnAddress({ page: '0' });

    await whenTheListIsRendered();

    expect(textOf('conflits-adresse-invalide')).toContain('Numéro de page invalide');
    expect(portFixture.demandes).toEqual([]);
    expect(present('conflits-vide')).toBe(false);
  });

  it('should refuse a fractional page without acquiring a misleading list', async () => {
    givenAnAddress({ page: '1.5' });

    await whenTheListIsRendered();

    expect(textOf('conflits-adresse-invalide')).toContain('Numéro de page invalide');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should distinguish a page emptied by resolutions from a list with no remaining conflicts', async () => {
    givenAnAddress({ page: '3' });
    portFixture.page = { lignes: [], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflits-page-vide')).toContain('Cette page ne contient plus de dossier');
    expect(present('conflits-vide')).toBe(false);
    expect(button('conflits-premiere-page').disabled).toBe(false);
  });

  it('should retain the acquired list when filter navigation is cancelled', async () => {
    portFixture.page = { lignes: [ligneFixture()], total: 1, complete: true };
    routerFixture.navigationResult = false;
    await whenTheListIsRendered();

    await whenFiltering('Autre opérateur', 'M-042');

    expect(textOf('conflits-navigation-erreur')).toContain('Impossible d’appliquer les filtres');
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should report a failed filter navigation once and retain the acquired list', async () => {
    const failure = new Error('Navigation indisponible');
    portFixture.page = { lignes: [ligneFixture()], total: 1, complete: true };
    routerFixture.navigationFailure = failure;
    await whenTheListIsRendered();

    await whenFiltering('Autre opérateur', 'M-042');

    expect(textOf('conflits-navigation-erreur')).toContain('Impossible d’appliquer les filtres');
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(errorFixture.errors).toEqual([failure]);
  });

  it('should distinguish a pending acquisition from a complete empty list', async () => {
    const release = portFixture.holdReading();
    await whenTheReadingStarts();

    const pending = await whenTheReadingCompletes(release);

    expect(pending).toEqual({ loading: true, empty: false });
    expect(present('conflits-chargement')).toBe(false);
    expect(textOf('conflits-vide')).toContain('Aucun conflit');
  });

  const whenTheReadingStarts = async (): Promise<void> => {
    const entered = portFixture.nextReading();
    componentFixture = TestBed.createComponent(ListeConflits);
    componentFixture.detectChanges();
    await entered;
  };

  const whenTheReadingCompletes = async (release: () => void): Promise<{ loading: boolean; empty: boolean }> => {
    const pending = { loading: present('conflits-chargement'), empty: present('conflits-vide') };
    release();
    await componentFixture.whenStable();
    return pending;
  };

  const whenTheDemonstrationIsReset = async (): Promise<void> => {
    portFixture.page = { lignes: [], total: 0, complete: true };
    const reading = portFixture.nextReading();
    requiredElement('conflits-reset').click();
    await reading;
    await componentFixture.whenStable();
  };

  const whenTheReadingRecovers = async (): Promise<void> => {
    portFixture.failure = undefined;
    requiredElement('conflits-reessayer').click();
    await componentFixture.whenStable();
  };

  const whenFiltering = async (operateur: string, element: string): Promise<void> => {
    input('conflits-filtre-operateur').value = operateur;
    input('conflits-filtre-element').value = element;
    requiredElement('conflits-filtres').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await componentFixture.whenStable();
  };

  const givenNoDemonstration = (): void => {
    TestBed.overrideProvider(DemonstrationConflitsPort, { useValue: null });
  };

  const whenTheListIsRendered = async (): Promise<void> => {
    componentFixture = TestBed.createComponent(ListeConflits);
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const root = (): HTMLElement => componentFixture.nativeElement as HTMLElement;
  const requiredElement = (selector: string): HTMLElement => {
    const element = root().querySelector<HTMLElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Missing ${selector}`);
    }
    return element;
  };
  const input = (selector: string): HTMLInputElement => {
    const element = root().querySelector<HTMLInputElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Missing input ${selector}`);
    }
    return element;
  };
  const button = (selector: string): HTMLButtonElement => {
    const element = root().querySelector<HTMLButtonElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Missing button ${selector}`);
    }
    return element;
  };
  const inputValue = (selector: string): string => root().querySelector<HTMLInputElement>(dataSelector(selector))?.value ?? '';
  const present = (selector: string): boolean => root().querySelector(dataSelector(selector)) !== null;
  const textOf = (selector: string): string => root().querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
