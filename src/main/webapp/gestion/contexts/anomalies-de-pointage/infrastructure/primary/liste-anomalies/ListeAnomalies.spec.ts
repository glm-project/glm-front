import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { FiltreAnomalies, LectureDossier, LigneConflit, LigneFinAutomatique, PageAnomalies } from '../../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../../domain/dossier/SuiviAnomalieId';
import { ListeAnomalies } from './ListeAnomalies';

class AnomaliesReadFixture extends AnomaliesReadPort {
  page: PageAnomalies = { nature: 'CONFLIT', lignes: [], total: 0, complete: true };
  failure: Error | undefined;
  readonly demandes: FiltreAnomalies[] = [];
  private notifyArrival = (): void => undefined;
  private heldReading: Promise<PageAnomalies> | undefined;

  override async list(filtre: FiltreAnomalies): Promise<PageAnomalies> {
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

class RouterFixture {
  readonly events = EMPTY;
  readonly navigations: FiltreAnomalies[] = [];
  navigationResult = true;
  navigationFailure: Error | undefined;

  createUrlTree(): object {
    return {};
  }

  serializeUrl(): string {
    return '/';
  }

  navigate(_commands: unknown[], extras: { queryParams: FiltreAnomalies }): Promise<boolean> {
    this.navigations.push(extras.queryParams);
    return this.navigationFailure === undefined ? Promise.resolve(this.navigationResult) : Promise.reject(this.navigationFailure);
  }
}

const ligneFixture = (): LigneConflit => ({
  adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-camille') },
  element: new ElementAnomalieId('moule-42'),
  designation: 'M-042',
  operateur: 'Camille Martin',
  poste: 'Fraiseuse',
  date: '2 octobre 2026',
  explication: 'La fin vise une activité déjà terminée.',
  nombrePointages: 3,
});

const finAutomatiqueFixture = (): LigneFinAutomatique => ({
  adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-camille') },
  element: new ElementAnomalieId('of-m24-0655'),
  designation: 'OF M24-0655',
  operateur: 'Camille Martin',
  operateurId: 'op-camille',
  poste: 'Fraiseuse 1',
  debut: new Date(2026, 0, 1, 9, 26).toISOString(),
  echeance: new Date(2026, 0, 1, 22, 26).toISOString(),
});

describe('Anomalies list', () => {
  let componentFixture: ComponentFixture<ListeAnomalies>;
  let portFixture: AnomaliesReadFixture;
  let routeFixture: RouteFixture;
  let routerFixture: RouterFixture;
  let errorFixture: ErrorHandlerFixture;

  beforeEach(() => {
    portFixture = new AnomaliesReadFixture();
    routeFixture = new RouteFixture();
    routerFixture = new RouterFixture();
    errorFixture = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AnomaliesReadPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
        { provide: Router, useValue: routerFixture },
        { provide: ErrorHandlerPort, useValue: errorFixture },
      ],
    });
  });

  it('should title the page as the anomalies of pointage', async () => {
    await whenTheListIsRendered();

    expect(headingText()).toBe('Anomalies de pointage');
  });

  it('should explain that the complete global list has no conflicts', async () => {
    await whenTheListIsRendered();

    expect(textOf('anomalies-vide')).toBe('Aucun conflit à résoudre.');
    expect(present('anomalies-table')).toBe(false);
  });

  it('should display only conflict consultation controls', async () => {
    await whenTheListIsRendered();

    expect(present('anomalies-demo')).toBe(false);
    expect(textOf('anomalies-vide')).toContain('Aucun conflit');
  });

  it('should keep unresolved operator and workstation identities visible in the conflict list', async () => {
    portFixture.page = {
      nature: 'CONFLIT',
      lignes: [{ ...ligneFixture(), operateur: '', operateurId: 'op-absent', poste: '', posteId: 'poste-supprime' }],
      total: 1,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Opérateur non résolu · op-absent');
    expect(textOf('conflit-ligne')).toContain('Poste non résolu · poste-supprime');
  });

  it('should distinguish work clocked without a workstation from an unresolved workstation reference', async () => {
    portFixture.page = { nature: 'CONFLIT', lignes: [{ ...ligneFixture(), poste: '' }], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Sans poste');
    expect(textOf('conflit-ligne')).not.toContain('Poste non résolu');
  });

  it('should identify a conflicting sequence when the API supplies no presentation explanation', async () => {
    portFixture.page = { nature: 'CONFLIT', lignes: [{ ...ligneFixture(), explication: '' }], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Séquence en conflit');
  });

  it('should distinguish no matching conflicts from an empty global list', async () => {
    givenAnAddress({ operateur: 'Camille', element: 'M-042', page: '2' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-vide-filtre')).toContain('Aucun conflit ne correspond');
    expect(present('anomalies-vide')).toBe(false);
    expect(portFixture.demandes).toEqual([{ nature: 'CONFLIT', operateur: 'Camille', element: 'M-042', page: 2 }]);
    expect(inputValue('anomalies-filtre-operateur')).toBe('Camille');
    expect(inputValue('anomalies-filtre-element')).toBe('M-042');
  });

  const givenAnAddress = (params: Record<string, string>): void => {
    routeFixture.queryParamMap.next(convertToParamMap(params));
  };

  it('should request the submitted filters on the first page', async () => {
    givenAnAddress({ page: '2' });
    await whenTheListIsRendered();

    await whenFiltering(' Camille ', ' M-042 ');

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: 'Camille', element: 'M-042', page: 1 }]);
  });

  it('should explain an acquisition failure without showing an empty list', async () => {
    portFixture.failure = new Error('Acquisition indisponible');

    await whenTheListIsRendered();

    expect(textOf('anomalies-erreur')).toContain('Impossible de charger');
    expect(present('anomalies-vide')).toBe(false);
    expect(present('anomalies-table')).toBe(false);
  });

  it('should reacquire the current filters when the operator retries a failed read', async () => {
    givenAnAddress({ operateur: 'Camille', page: '2' });
    portFixture.failure = new Error('Acquisition indisponible');
    await whenTheListIsRendered();

    await whenTheReadingRecovers();

    expect(present('anomalies-erreur')).toBe(false);
    expect(textOf('anomalies-vide-filtre')).toContain('Aucun conflit ne correspond');
    expect(portFixture.demandes).toEqual([
      { nature: 'CONFLIT', operateur: 'Camille', element: '', page: 2 },
      { nature: 'CONFLIT', operateur: 'Camille', element: '', page: 2 },
    ]);
  });

  it('should never describe an empty partial acquisition as a complete global list', async () => {
    portFixture.page = { nature: 'CONFLIT', lignes: [], total: 0, complete: false };

    await whenTheListIsRendered();

    expect(textOf('anomalies-partiel')).toContain('Liste partielle');
    expect(present('anomalies-vide')).toBe(false);
    expect(present('anomalies-vide-filtre')).toBe(false);
  });

  it('should show the second and last acquired page with only the previous page enabled', async () => {
    givenAnAddress({ operateur: 'Camille', page: '2' });
    portFixture.page = { nature: 'CONFLIT', lignes: [ligneFixture()], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('anomalies-pagination')).toContain('Page 2 sur 2');
    expect(button('anomalies-page-precedente').disabled).toBe(false);
    expect(button('anomalies-page-suivante').disabled).toBe(true);
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
  });

  it('should refuse page zero without acquiring a misleading list', async () => {
    givenAnAddress({ page: '0' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-adresse-invalide')).toContain('Numéro de page invalide');
    expect(portFixture.demandes).toEqual([]);
    expect(present('anomalies-vide')).toBe(false);
  });

  it('should refuse a fractional page without acquiring a misleading list', async () => {
    givenAnAddress({ page: '1.5' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-adresse-invalide')).toContain('Numéro de page invalide');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should distinguish a page emptied by resolutions from a list with no remaining conflicts', async () => {
    givenAnAddress({ page: '3' });
    portFixture.page = { nature: 'CONFLIT', lignes: [], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('anomalies-page-vide')).toContain('Cette page ne contient plus de dossier');
    expect(present('anomalies-vide')).toBe(false);
    expect(button('anomalies-premiere-page').disabled).toBe(false);
  });

  it('should retain the acquired list when filter navigation is cancelled', async () => {
    portFixture.page = { nature: 'CONFLIT', lignes: [ligneFixture()], total: 1, complete: true };
    routerFixture.navigationResult = false;
    await whenTheListIsRendered();

    await whenFiltering('Autre opérateur', 'M-042');

    expect(textOf('anomalies-navigation-erreur')).toContain('Impossible d’appliquer les filtres');
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should report a failed filter navigation once and retain the acquired list', async () => {
    const failure = new Error('Navigation indisponible');
    portFixture.page = { nature: 'CONFLIT', lignes: [ligneFixture()], total: 1, complete: true };
    routerFixture.navigationFailure = failure;
    await whenTheListIsRendered();

    await whenFiltering('Autre opérateur', 'M-042');

    expect(textOf('anomalies-navigation-erreur')).toContain('Impossible d’appliquer les filtres');
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(errorFixture.errors).toEqual([failure]);
  });

  it('should distinguish a pending acquisition from a complete empty list', async () => {
    const release = portFixture.holdReading();
    await whenTheReadingStarts();

    const pending = await whenTheReadingCompletes(release);

    expect(pending).toEqual({ loading: true, empty: false });
    expect(present('anomalies-chargement')).toBe(false);
    expect(textOf('anomalies-vide')).toContain('Aucun conflit');
  });

  it('should acquire the conflicts and mark their tab as the current one when the address names no nature', async () => {
    await whenTheListIsRendered();

    expect(portFixture.demandes).toEqual([{ nature: 'CONFLIT', operateur: '', element: '', page: 1 }]);
    expect(currentTab()).toBe('anomalies-onglet-conflits');
  });

  it('should acquire the automatic ends and mark their tab as the current one when the address names them', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });

    await whenTheListIsRendered();

    expect(portFixture.demandes).toEqual([{ nature: 'FIN_AUTOMATIQUE', operateur: '', element: '', page: 1 }]);
    expect(currentTab()).toBe('anomalies-onglet-fins-automatiques');
  });

  it('should refuse an unknown nature without acquiring a list and keep both tabs reachable', async () => {
    givenAnAddress({ nature: 'CONFLITS' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-adresse-invalide')).toContain('Nature d’anomalie inconnue');
    expect(portFixture.demandes).toEqual([]);
    expect(currentTab()).toBe('');
    expect(tabs()).toHaveLength(2);
  });

  it('should keep the nature when the filters are submitted from the automatic ends tab', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', page: '2' });
    await whenTheListIsRendered();

    await whenFiltering('Camille', 'OF');

    expect(routerFixture.navigations).toEqual([{ nature: 'FIN_AUTOMATIQUE', operateur: 'Camille', element: 'OF', page: 1 }]);
  });

  it('should show an automatic end with its element, operator, workstation and the received start and automatic end', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    portFixture.page = { nature: 'FIN_AUTOMATIQUE', lignes: [finAutomatiqueFixture()], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('fin-automatique-ouvrir')).toBe('OF M24-0655');
    expect(textOf('fin-automatique-ligne')).toContain('Camille Martin');
    expect(textOf('fin-automatique-ligne')).toContain('Fraiseuse 1');
    expect(textOf('fin-automatique-ligne')).toContain('Début jeu. 1 à 09:26 · fin automatique à 22:26');
    expect(present('conflit-ligne')).toBe(false);
  });

  it('should name the day of an automatic end that falls after the start day', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    portFixture.page = {
      nature: 'FIN_AUTOMATIQUE',
      lignes: [
        {
          ...finAutomatiqueFixture(),
          debut: new Date(2026, 0, 1, 15, 0).toISOString(),
          echeance: new Date(2026, 0, 2, 4, 0).toISOString(),
        },
      ],
      total: 1,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(textOf('fin-automatique-ligne')).toContain('Début jeu. 1 à 15:00 · fin automatique ven. 2 à 04:00');
  });

  it('should keep unresolved identities and work without workstation visible in the automatic ends', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    portFixture.page = {
      nature: 'FIN_AUTOMATIQUE',
      lignes: [
        { ...finAutomatiqueFixture(), operateur: '', poste: '', posteId: 'poste-supprime' },
        { ...finAutomatiqueFixture(), poste: '' },
      ],
      total: 2,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(texts('fin-automatique-ligne')[0]).toContain('Opérateur non résolu · op-camille');
    expect(texts('fin-automatique-ligne')[0]).toContain('Poste non résolu · poste-supprime');
    expect(texts('fin-automatique-ligne')[1]).toContain('Sans poste');
  });

  it('should explain that no automatic end remains', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-vide')).toBe('Aucune fin automatique à traiter.');
  });

  it('should explain that no automatic end matches the filters', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', operateur: 'Camille' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-vide-filtre')).toBe('Aucune fin automatique ne correspond à ces filtres.');
  });

  it('should word the emptied page of the automatic ends', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', page: '3' });
    portFixture.page = { nature: 'FIN_AUTOMATIQUE', lignes: [], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('anomalies-page-vide')).toContain('D’autres fins automatiques restent dans la sélection.');
  });

  it('should word the partial acquisition of the automatic ends', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    portFixture.page = { nature: 'FIN_AUTOMATIQUE', lignes: [], total: 0, complete: false };

    await whenTheListIsRendered();

    expect(textOf('anomalies-partiel')).toContain('toutes les fins automatiques');
  });

  it('should word the acquisition failure of the automatic ends', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    portFixture.failure = new Error('Acquisition indisponible');

    await whenTheListIsRendered();

    expect(textOf('anomalies-erreur')).toContain('Impossible de charger les fins automatiques');
  });

  it('should paginate the automatic ends with their own wording', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', page: '2' });
    portFixture.page = { nature: 'FIN_AUTOMATIQUE', lignes: [finAutomatiqueFixture()], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('anomalies-pagination')).toContain('Page 2 sur 2');
    expect(labelOf('anomalies-pagination')).toBe('Pages des fins automatiques');
  });

  const whenTheReadingStarts = async (): Promise<void> => {
    const entered = portFixture.nextReading();
    componentFixture = TestBed.createComponent(ListeAnomalies);
    componentFixture.detectChanges();
    await entered;
  };

  const whenTheReadingCompletes = async (release: () => void): Promise<{ loading: boolean; empty: boolean }> => {
    const pending = { loading: present('anomalies-chargement'), empty: present('anomalies-vide') };
    release();
    await componentFixture.whenStable();
    return pending;
  };

  const whenTheReadingRecovers = async (): Promise<void> => {
    portFixture.failure = undefined;
    requiredElement('anomalies-reessayer').click();
    await componentFixture.whenStable();
  };

  const whenFiltering = async (operateur: string, element: string): Promise<void> => {
    input('anomalies-filtre-operateur').value = operateur;
    input('anomalies-filtre-element').value = element;
    requiredElement('anomalies-filtres').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await componentFixture.whenStable();
  };

  const whenTheListIsRendered = async (): Promise<void> => {
    componentFixture = TestBed.createComponent(ListeAnomalies);
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
  const headingText = (): string => root().querySelector('h1')?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    Array.from(root().querySelectorAll(dataSelector(selector)), element => element.textContent.trim());
  const labelOf = (selector: string): string | null => requiredElement(selector).getAttribute('aria-label');
  const tabs = (): HTMLElement[] => Array.from(requiredElement('anomalies-onglets').querySelectorAll<HTMLElement>('a'));
  const currentTab = (): string =>
    tabs()
      .find(tab => tab.getAttribute('aria-current') === 'page')
      ?.getAttribute('data-selector') ?? '';
  const present = (selector: string): boolean => root().querySelector(dataSelector(selector)) !== null;
  const textOf = (selector: string): string => root().querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
