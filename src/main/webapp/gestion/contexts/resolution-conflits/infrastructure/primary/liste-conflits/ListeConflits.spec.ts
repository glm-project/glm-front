import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { FiltreConflits, LectureDossier, PageConflits } from '../../../domain/dossier/DossierConflit';
import { ListeConflits } from './ListeConflits';

class ConflitsReadFixture extends ConflitsReadPort {
  page: PageConflits = { lignes: [], total: 0, complete: true };
  readonly demandes: FiltreConflits[] = [];

  override list(filtre: FiltreConflits): Promise<PageConflits> {
    this.demandes.push(filtre);
    return Promise.resolve(this.page);
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

  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string> }): UrlTreeFixture {
    return { queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(tree: UrlTreeFixture): string {
    return `/?${new URLSearchParams(tree.queryParams).toString()}`;
  }
}

describe('Conflict list', () => {
  let componentFixture: ComponentFixture<ListeConflits>;
  let portFixture: ConflitsReadFixture;
  let routeFixture: RouteFixture;

  beforeEach(() => {
    portFixture = new ConflitsReadFixture();
    routeFixture = new RouteFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ConflitsReadPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
        { provide: Router, useClass: RouterFixture },
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

  const whenTheListIsRendered = async (): Promise<void> => {
    componentFixture = TestBed.createComponent(ListeConflits);
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const root = (): HTMLElement => componentFixture.nativeElement as HTMLElement;
  const inputValue = (selector: string): string => root().querySelector<HTMLInputElement>(dataSelector(selector))?.value ?? '';
  const present = (selector: string): boolean => root().querySelector(dataSelector(selector)) !== null;
  const textOf = (selector: string): string => root().querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
