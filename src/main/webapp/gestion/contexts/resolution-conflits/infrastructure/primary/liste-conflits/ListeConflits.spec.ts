import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { FiltreConflits, LectureDossier, LigneConflit, PageConflits } from '../../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../../domain/dossier/SuiviConflitId';
import { ListeConflits } from './ListeConflits';

class ConflitsReadFixture extends ConflitsReadPort {
  page: PageConflits = { lignes: [], total: 0, complete: true };
  failure: Error | undefined;
  readonly demandes: FiltreConflits[] = [];

  override async list(filtre: FiltreConflits): Promise<PageConflits> {
    this.demandes.push(filtre);
    await new Promise(resolve => setTimeout(resolve));
    if (this.failure !== undefined) {
      throw this.failure;
    }
    return this.page;
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

  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string> }): UrlTreeFixture {
    return { queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(tree: UrlTreeFixture): string {
    return `/?${new URLSearchParams(tree.queryParams).toString()}`;
  }

  navigate(_commands: unknown[], extras: { queryParams: FiltreConflits }): Promise<boolean> {
    this.navigations.push(extras.queryParams);
    return Promise.resolve(true);
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

  beforeEach(() => {
    portFixture = new ConflitsReadFixture();
    routeFixture = new RouteFixture();
    routerFixture = new RouterFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ConflitsReadPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
        { provide: Router, useValue: routerFixture },
      ],
    });
  });

  it('should explain that the complete global list has no conflicts', async () => {
    await whenTheListIsRendered();

    expect(textOf('conflits-vide')).toContain('Aucun conflit');
    expect(present('conflits-table')).toBe(false);
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
