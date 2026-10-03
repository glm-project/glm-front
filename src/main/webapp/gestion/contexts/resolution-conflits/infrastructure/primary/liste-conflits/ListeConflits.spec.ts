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

  const whenTheListIsRendered = async (): Promise<void> => {
    componentFixture = TestBed.createComponent(ListeConflits);
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const root = (): HTMLElement => componentFixture.nativeElement as HTMLElement;
  const present = (selector: string): boolean => root().querySelector(dataSelector(selector)) !== null;
  const textOf = (selector: string): string => root().querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
