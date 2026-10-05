import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { FiltreAnomalies, LectureDossier, LigneConflit, LigneFinAutomatique, PageAnomalies } from '../../../domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '../../../domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '../../../domain/dossier/ElementAnomalieId';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { OperateurAnomalie, ReferentielAnomalies } from '../../../domain/dossier/ReferentielAnomalies';
import { SuiviAnomalieId } from '../../../domain/dossier/SuiviAnomalieId';
import { ListeAnomalies } from './ListeAnomalies';

class AnomaliesReadFixture extends AnomaliesReadPort {
  page: PageAnomalies = { nature: 'CONFLIT', lignes: [], total: 0, complete: true };
  failure: Error | undefined;
  operateursLus: readonly OperateurAnomalie[] = [
    { id: new OperateurAnomalieId('op-camille'), nom: 'Camille Martin', code: '007', postesHabilites: [] },
    { id: new OperateurAnomalieId('op-jean'), nom: 'Jean Dupont', postesHabilites: [] },
  ];
  operateursFailure: Error | undefined;
  operateursLectures = 0;
  referentielLectures = 0;
  elementsLus: readonly ElementAnomalie[] = [
    { id: new ElementAnomalieId('moule-42'), nom: 'Moule M-042', reference: 'M-042' },
    { id: new ElementAnomalieId('of-m24-0655'), nom: 'OF M24-0655' },
  ];
  elementsFailure: Error | undefined;
  elementsLectures = 0;
  readonly demandes: FiltreAnomalies[] = [];
  private notifyArrival = (): void => undefined;
  private heldReading: Promise<PageAnomalies> | undefined;
  private heldOperateurs: Promise<readonly OperateurAnomalie[]> | undefined;
  private heldElements: Promise<readonly ElementAnomalie[]> | undefined;

  holdOperateurs(): () => void {
    let release = (): void => undefined;
    this.heldOperateurs = new Promise(resolve => {
      release = () => {
        resolve(this.operateursLus);
        this.heldOperateurs = undefined;
      };
    });
    return release;
  }

  holdElements(): () => void {
    let release = (): void => undefined;
    this.heldElements = new Promise(resolve => {
      release = () => {
        resolve(this.elementsLus);
        this.heldElements = undefined;
      };
    });
    return release;
  }

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

  override operateurs(): Promise<readonly OperateurAnomalie[]> {
    this.operateursLectures += 1;
    if (this.heldOperateurs !== undefined) return this.heldOperateurs;
    return this.operateursFailure === undefined ? Promise.resolve(this.operateursLus) : Promise.reject(this.operateursFailure);
  }

  override referentiel(): Promise<ReferentielAnomalies> {
    this.referentielLectures += 1;
    return Promise.reject(new Error('Postes indisponibles'));
  }

  override elements(): Promise<readonly ElementAnomalie[]> {
    this.elementsLectures += 1;
    if (this.heldElements !== undefined) return this.heldElements;
    return this.elementsFailure === undefined ? Promise.resolve(this.elementsLus) : Promise.reject(this.elementsFailure);
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
  date: new Date(2026, 9, 2, 9, 41).toISOString(),
  explication: 'La fin vise une activité déjà terminée.',
  nombrePointages: 3,
});

const finAutomatiqueFixture = (): LigneFinAutomatique => ({
  adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-camille') },
  element: new ElementAnomalieId('of-m24-0655'),
  designation: 'OF M24-0655',
  operateur: 'Camille Martin',
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
  let releaseOperateurs: () => void;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should title the page as the anomalies of pointage', async () => {
    await whenTheListIsRendered();

    expect(headingText()).toBe('Anomalies de pointage');
  });

  it('should explain that the complete global list has no conflicts', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    expect(textOf('anomalies-vide')).toBe('Aucun conflit à résoudre.');
    expect(present('anomalies-table')).toBe(false);
  });

  it('should display only conflict consultation controls', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    expect(present('anomalies-demo')).toBe(false);
    expect(textOf('anomalies-vide')).toContain('Aucun conflit');
  });

  it('should present an unresolved operator and workstation without any identity in the conflict list', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = {
      nature: 'CONFLIT',
      lignes: [{ ...ligneFixture(), operateur: '', poste: '', posteId: 'poste-supprime' }],
      total: 1,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Opérateur non résolu');
    expect(textOf('conflit-ligne')).toContain('Poste non résolu');
    expect(textOf('conflit-ligne')).not.toContain('poste-supprime');
  });

  it('should distinguish work clocked without a workstation from an unresolved workstation reference', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = { nature: 'CONFLIT', lignes: [{ ...ligneFixture(), poste: '' }], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Sans poste');
    expect(textOf('conflit-ligne')).not.toContain('Poste non résolu');
  });

  it('should identify a conflicting sequence when the API supplies no presentation explanation', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = { nature: 'CONFLIT', lignes: [{ ...ligneFixture(), explication: '' }], total: 1, complete: true };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Séquence en conflit');
  });

  it('should show the date of a conflict as its long day and local time without the current year', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = {
      nature: 'CONFLIT',
      lignes: [{ ...ligneFixture(), date: new Date(2026, 9, 2, 9, 41, 22).toISOString() }],
      total: 1,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('vendredi 2 octobre à 09:41');
    expect(textOf('conflit-ligne')).not.toContain('09:41:22');
  });

  it('should add the year to the date of a conflict that did not start during the current year', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = {
      nature: 'CONFLIT',
      lignes: [{ ...ligneFixture(), date: new Date(2025, 9, 2, 9, 41).toISOString() }],
      total: 1,
      complete: true,
    };

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('jeudi 2 octobre 2025 à 09:41');
  });

  it('should distinguish no matching conflicts from an empty global list', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille', element: 'moule-42', page: '2' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-vide-filtre')).toContain('Aucun conflit ne correspond');
    expect(present('anomalies-vide')).toBe(false);
    expect(portFixture.demandes).toEqual([{ nature: 'CONFLIT', operateur: 'op-camille', element: 'moule-42', page: 2 }]);
    expect(textOf('anomalies-filtre-operateur')).toBe('Camille Martin · 007');
    expect(textOf('anomalies-filtre-element')).toBe('Moule M-042 · M-042');
  });

  it('should read the operators alone for any reader to name the operator filter, without the workstations the list does not use', async () => {
    await whenTheListIsRendered();

    expect(portFixture.operateursLectures).toBe(1);
    expect(portFixture.referentielLectures).toBe(0);
  });

  it('should keep the operator filter usable while the workstations are unavailable', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    expect(button('anomalies-filtre-operateur').disabled).toBe(false);
    expect(present('anomalies-referentiel-erreur')).toBe(false);
  });

  it('should offer every operator by name, after an entry for all of them', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    await whenOpeningTheOperatorFilter();

    expect(propositionTexts()).toEqual(['Tous les opérateurs', 'Camille Martin · 007', 'Jean Dupont']);
    expect(textOf('anomalies-filtre-operateur')).toBe('Tous les opérateurs');
  });

  it('should never show the identifier of an operator among the proposals', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    await whenOpeningTheOperatorFilter();

    thenNoIdentifierIsShown('op-camille');
  });

  it('should name the operator held by the address and never show its identifier', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-filtre-operateur')).toBe('Camille Martin · 007');
    thenNoIdentifierIsShown('op-camille');
  });

  it('should hold the identifier of the chosen operator in the address once the filters are applied', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', page: '3' });
    await whenTheListIsRendered();

    await whenChoosingTheOperator('Jean Dupont');
    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'FIN_AUTOMATIQUE', operateur: 'op-jean', element: '', page: 1 }]);
  });

  it('should name the chosen operator before the filters are applied', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    await whenTheListIsRendered();

    await whenChoosingTheOperator('Jean Dupont');

    expect(textOf('anomalies-filtre-operateur')).toBe('Jean Dupont');
    expect(routerFixture.navigations).toEqual([]);
  });

  it('should drop the operator from the address when the manager chooses all the operators', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille', page: '2' });
    await whenTheListIsRendered();

    await whenChoosingTheOperator('Tous les opérateurs');
    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: '', element: '', page: 1 }]);
  });

  it('should keep the operator held by the address when the filters are applied without choosing another', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });
    await whenTheListIsRendered();

    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: 'op-camille', element: '', page: 1 }]);
  });

  it('should name an operator of the address that the operators do not contain as unresolved, without its identifier', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-supprime' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-filtre-operateur')).toBe('Opérateur non résolu (référence actuelle)');
    thenNoIdentifierIsShown('op-supprime');
  });

  it('should still list with an operator of the address that the operators do not contain', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-supprime' });

    await whenTheListIsRendered();

    expect(portFixture.demandes).toEqual([{ nature: 'CONFLIT', operateur: 'op-supprime', element: '', page: 1 }]);
  });

  it('should keep an operator of the address that the operators do not contain when the filters are applied', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-supprime' });
    await whenTheListIsRendered();

    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: 'op-supprime', element: '', page: 1 }]);
  });

  it('should follow the address when the operator it holds changes', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });
    await whenTheListIsRendered();

    await whenTheAddressBecomes({ nature: 'CONFLIT', operateur: 'op-jean' });

    expect(textOf('anomalies-filtre-operateur')).toBe('Jean Dupont');
  });

  it('should say that the operators are loading instead of offering a filter that could not name them', async () => {
    givenTheOperatorsArePending();

    await whenTheOperatorsAreRequested();

    expect(textOf('anomalies-referentiel-chargement')).toBe('Chargement des opérateurs…');
    expect(present('anomalies-filtre-operateur')).toBe(false);
  });

  it('should offer the operator filter once the operators are read', async () => {
    givenTheOperatorsArePending();
    await whenTheOperatorsAreRequested();

    await whenTheOperatorsArrive();

    expect(present('anomalies-referentiel-chargement')).toBe(false);
    expect(present('anomalies-filtre-operateur')).toBe(true);
  });

  it('should tell the manager that the operators are unavailable, keeping the operator filter disabled', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });
    givenTheOperatorsAreUnavailable();

    await whenTheListIsRendered();

    expect(textOf('anomalies-referentiel-erreur')).toContain('Liste des opérateurs indisponible');
    expect(button('anomalies-filtre-operateur').disabled).toBe(true);
  });

  it('should keep the operator held by the address without calling it unresolved while the operators are unavailable', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });
    givenTheOperatorsAreUnavailable();

    await whenTheListIsRendered();

    expect(textOf('anomalies-filtre-operateur')).toBe('Opérateur actuel conservé');
    thenNoIdentifierIsShown('op-camille');
  });

  it('should keep the list usable when the operators are unavailable', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });
    givenTheOperatorsAreUnavailable();
    givenAConflict();

    await whenTheListIsRendered();

    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(present('anomalies-erreur')).toBe(false);
    expect(button('anomalies-filtrer').disabled).toBe(false);
  });

  it('should keep the operator held by the address when the filters are applied while the operators are unavailable', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille' });
    givenTheOperatorsAreUnavailable();
    await whenTheListIsRendered();

    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: 'op-camille', element: '', page: 1 }]);
  });

  it('should read the operators again and enable the operator filter when the manager retries', async () => {
    givenTheOperatorsAreUnavailable();
    await whenTheListIsRendered();

    await whenTheOperatorsRecover();

    expect(present('anomalies-referentiel-erreur')).toBe(false);
    expect(button('anomalies-filtre-operateur').disabled).toBe(false);
    expect(portFixture.operateursLectures).toBe(2);
  });

  it('should not read the list again when the operators are retried', async () => {
    givenTheOperatorsAreUnavailable();
    await whenTheListIsRendered();

    await whenTheOperatorsRecover();

    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should keep the focus on the retry button while the operators are read again', async () => {
    givenTheOperatorsAreUnavailable();
    await whenTheListIsRendered();

    await whenRetryingTheOperatorsWhileTheyAreRead();

    expect(document.activeElement).toBe(button('anomalies-referentiel-reessayer'));
  });

  it('should mark the retry of the operators as busy while they are read again', async () => {
    givenTheOperatorsAreUnavailable();
    await whenTheListIsRendered();

    await whenRetryingTheOperatorsWhileTheyAreRead();

    thenTheRetryIsBusy('anomalies-referentiel-reessayer');
  });

  it('should not point the operator label at a filter that is not rendered while the operators load', async () => {
    givenTheOperatorsArePending();

    await whenTheOperatorsAreRequested();

    expect(labelElement('anomalies-operateur-label').hasAttribute('for')).toBe(false);
  });

  it('should point the operator label at the filter once the operators are read', async () => {
    await whenTheListIsRendered();

    thenTheLabelPointsAt('anomalies-operateur-label', 'anomalies-operateur');
  });

  it('should read the elements for any reader to name the element filter', async () => {
    await whenTheListIsRendered();

    expect(portFixture.elementsLectures).toBe(1);
  });

  it('should offer every element by its designation, after an entry for all of them', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    await whenOpeningTheElementFilter();

    expect(elementPropositionTexts()).toEqual(['Tous les éléments', 'Moule M-042 · M-042', 'OF M24-0655']);
    expect(textOf('anomalies-filtre-element')).toBe('Tous les éléments');
  });

  it('should never show the identifier of an element among the proposals', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    await whenTheListIsRendered();

    await whenOpeningTheElementFilter();

    thenNoIdentifierIsShown('moule-42');
  });

  it('should name the element held by the address and never show its identifier', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'of-m24-0655' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-filtre-element')).toBe('OF M24-0655');
    thenNoIdentifierIsShown('of-m24-0655');
  });

  it('should hold the identifier of the chosen element in the address once the filters are applied', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', page: '3' });
    await whenTheListIsRendered();

    await whenChoosingTheElement('Moule M-042 · M-042');
    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'FIN_AUTOMATIQUE', operateur: '', element: 'moule-42', page: 1 }]);
  });

  it('should name the chosen element before the filters are applied', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });
    await whenTheListIsRendered();

    await whenChoosingTheElement('OF M24-0655');

    expect(textOf('anomalies-filtre-element')).toBe('OF M24-0655');
    expect(routerFixture.navigations).toEqual([]);
  });

  it('should drop the element from the address when the manager chooses all the elements', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'moule-42', page: '2' });
    await whenTheListIsRendered();

    await whenChoosingTheElement('Tous les éléments');
    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: '', element: '', page: 1 }]);
  });

  it('should keep the element held by the address when the filters are applied without choosing another', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'moule-42' });
    await whenTheListIsRendered();

    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: '', element: 'moule-42', page: 1 }]);
  });

  it('should name an element of the address that the elements do not contain as unresolved, without its identifier', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'element-supprime' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-filtre-element')).toBe('Élément non résolu (référence actuelle)');
    thenNoIdentifierIsShown('element-supprime');
  });

  it('should still list with an element of the address that the elements do not contain', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'element-supprime' });

    await whenTheListIsRendered();

    expect(portFixture.demandes).toEqual([{ nature: 'CONFLIT', operateur: '', element: 'element-supprime', page: 1 }]);
  });

  it('should keep an element of the address that the elements do not contain when the filters are applied', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'element-supprime' });
    await whenTheListIsRendered();

    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: '', element: 'element-supprime', page: 1 }]);
  });

  it('should follow the address when the element it holds changes', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'moule-42' });
    await whenTheListIsRendered();

    await whenTheAddressBecomes({ nature: 'CONFLIT', element: 'of-m24-0655' });

    expect(textOf('anomalies-filtre-element')).toBe('OF M24-0655');
  });

  it('should say that the elements are loading, while the operator filter is already offered', async () => {
    portFixture.holdElements();

    await whenTheOperatorsAreRequested();
    await new Promise(resolve => setTimeout(resolve));
    componentFixture.detectChanges();

    expect(textOf('anomalies-elements-chargement')).toBe('Chargement des éléments…');
    expect(present('anomalies-filtre-element')).toBe(false);
    expect(present('anomalies-filtre-operateur')).toBe(true);
  });

  it('should offer the element filter once the elements are read', async () => {
    const release = portFixture.holdElements();
    await whenTheOperatorsAreRequested();

    release();
    await componentFixture.whenStable();

    expect(present('anomalies-elements-chargement')).toBe(false);
    expect(present('anomalies-filtre-element')).toBe(true);
  });

  it('should tell the manager that the elements are unavailable, keeping the element filter disabled and the operator filter usable', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'moule-42' });
    portFixture.elementsFailure = new Error('Éléments indisponibles');

    await whenTheListIsRendered();

    expect(textOf('anomalies-elements-erreur')).toContain('Liste des éléments indisponible');
    expect(button('anomalies-filtre-element').disabled).toBe(true);
    expect(button('anomalies-filtre-operateur').disabled).toBe(false);
    expect(present('anomalies-referentiel-erreur')).toBe(false);
  });

  it('should keep the list usable and the element held by the address when the elements are unavailable', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'moule-42' });
    portFixture.elementsFailure = new Error('Éléments indisponibles');
    givenAConflict();
    await whenTheListIsRendered();

    await whenFiltering();

    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(present('anomalies-erreur')).toBe(false);
    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: '', element: 'moule-42', page: 1 }]);
  });

  it('should leave the element filter usable when only the operators are unavailable', async () => {
    givenTheOperatorsAreUnavailable();

    await whenTheListIsRendered();

    expect(button('anomalies-filtre-element').disabled).toBe(false);
    expect(present('anomalies-elements-erreur')).toBe(false);
  });

  it('should read only the elements again and enable the element filter when the manager retries', async () => {
    portFixture.elementsFailure = new Error('Éléments indisponibles');
    await whenTheListIsRendered();

    portFixture.elementsFailure = undefined;
    requiredElement('anomalies-elements-reessayer').click();
    await componentFixture.whenStable();

    expect(present('anomalies-elements-erreur')).toBe(false);
    expect(button('anomalies-filtre-element').disabled).toBe(false);
    expect(portFixture.elementsLectures).toBe(2);
    expect(portFixture.operateursLectures).toBe(1);
    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should keep the element held by the address without calling it unresolved while the elements are unavailable', async () => {
    givenAnAddress({ nature: 'CONFLIT', element: 'moule-42' });
    portFixture.elementsFailure = new Error('Éléments indisponibles');

    await whenTheListIsRendered();

    expect(textOf('anomalies-filtre-element')).toBe('Élément actuel conservé');
    thenNoIdentifierIsShown('moule-42');
  });

  it('should keep the focus on the retry button while the elements are read again', async () => {
    portFixture.elementsFailure = new Error('Éléments indisponibles');
    await whenTheListIsRendered();

    await whenRetryingTheElementsWhileTheyAreRead();

    expect(document.activeElement).toBe(button('anomalies-elements-reessayer'));
  });

  it('should mark the retry of the elements as busy while they are read again', async () => {
    portFixture.elementsFailure = new Error('Éléments indisponibles');
    await whenTheListIsRendered();

    await whenRetryingTheElementsWhileTheyAreRead();

    thenTheRetryIsBusy('anomalies-elements-reessayer');
  });

  it('should not point the element label at a filter that is not rendered while the elements load', async () => {
    portFixture.holdElements();

    await whenTheOperatorsAreRequested();

    expect(labelElement('anomalies-element-label').hasAttribute('for')).toBe(false);
  });

  const givenTheOperatorsAreUnavailable = (): void => {
    portFixture.operateursFailure = new Error('Opérateurs indisponibles');
  };

  const givenTheOperatorsArePending = (): void => {
    releaseOperateurs = portFixture.holdOperateurs();
  };

  const givenAConflict = (): void => {
    portFixture.page = { nature: 'CONFLIT', lignes: [ligneFixture()], total: 1, complete: true };
  };

  const whenTheOperatorsAreRequested = async (): Promise<void> => {
    componentFixture = TestBed.createComponent(ListeAnomalies);
    componentFixture.detectChanges();
    await Promise.resolve();
  };

  const whenRetryingTheOperatorsWhileTheyAreRead = async (): Promise<void> => {
    releaseOperateurs = portFixture.holdOperateurs();
    await whenRetrying('anomalies-referentiel-reessayer');
  };

  const whenRetryingTheElementsWhileTheyAreRead = async (): Promise<void> => {
    portFixture.holdElements();
    await whenRetrying('anomalies-elements-reessayer');
  };

  const whenRetrying = async (selector: string): Promise<void> => {
    const retry = button(selector);
    retry.focus();
    retry.click();
    componentFixture.detectChanges();
    await Promise.resolve();
  };

  const thenTheRetryIsBusy = (selector: string): void => {
    expect(button(selector).getAttribute('aria-busy')).toBe('true');
  };

  const thenTheLabelPointsAt = (label: string, target: string): void => {
    expect(labelElement(label).getAttribute('for')).toBe(target);
  };

  const labelElement = (id: string): HTMLLabelElement => {
    const label = root().querySelector<HTMLLabelElement>(`#${id}`);
    if (label === null) {
      throw new Error(`Missing label ${id}`);
    }
    return label;
  };

  const whenTheOperatorsArrive = async (): Promise<void> => {
    releaseOperateurs();
    await componentFixture.whenStable();
  };

  const whenTheOperatorsRecover = async (): Promise<void> => {
    portFixture.operateursFailure = undefined;
    requiredElement('anomalies-referentiel-reessayer').click();
    await componentFixture.whenStable();
  };

  const whenTheAddressBecomes = async (params: Record<string, string>): Promise<void> => {
    givenAnAddress(params);
    await componentFixture.whenStable();
  };

  const thenNoIdentifierIsShown = (identifier: string): void => {
    expect(document.body.textContent).not.toContain(identifier);
  };

  const givenAnAddress = (params: Record<string, string>): void => {
    routeFixture.queryParamMap.next(convertToParamMap(params));
  };

  it('should request the submitted filters on the first page', async () => {
    givenAnAddress({ nature: 'CONFLIT', page: '2' });
    await whenTheListIsRendered();

    await whenChoosingTheOperator('Camille Martin · 007');
    await whenChoosingTheElement('Moule M-042 · M-042');
    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'CONFLIT', operateur: 'op-camille', element: 'moule-42', page: 1 }]);
  });

  it('should explain an acquisition failure without showing an empty list', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.failure = new Error('Acquisition indisponible');

    await whenTheListIsRendered();

    expect(textOf('anomalies-erreur')).toContain('Impossible de charger');
    expect(present('anomalies-vide')).toBe(false);
    expect(present('anomalies-table')).toBe(false);
  });

  it('should reacquire the current filters when the operator retries a failed read', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille', page: '2' });
    portFixture.failure = new Error('Acquisition indisponible');
    await whenTheListIsRendered();

    await whenTheReadingRecovers();

    expect(present('anomalies-erreur')).toBe(false);
    expect(textOf('anomalies-vide-filtre')).toContain('Aucun conflit ne correspond');
    expect(portFixture.demandes).toEqual([
      { nature: 'CONFLIT', operateur: 'op-camille', element: '', page: 2 },
      { nature: 'CONFLIT', operateur: 'op-camille', element: '', page: 2 },
    ]);
  });

  it('should never describe an empty partial acquisition as a complete global list', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = { nature: 'CONFLIT', lignes: [], total: 0, complete: false };

    await whenTheListIsRendered();

    expect(textOf('anomalies-partiel')).toContain('Liste partielle');
    expect(present('anomalies-vide')).toBe(false);
    expect(present('anomalies-vide-filtre')).toBe(false);
  });

  it('should show the second and last acquired page with only the previous page enabled', async () => {
    givenAnAddress({ nature: 'CONFLIT', operateur: 'op-camille', page: '2' });
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
    givenAnAddress({ nature: 'CONFLIT', page: '3' });
    portFixture.page = { nature: 'CONFLIT', lignes: [], total: 6, complete: true };

    await whenTheListIsRendered();

    expect(textOf('anomalies-page-vide')).toContain('Cette page ne contient plus de dossier');
    expect(present('anomalies-vide')).toBe(false);
    expect(button('anomalies-premiere-page').disabled).toBe(false);
  });

  it('should retain the acquired list when filter navigation is cancelled', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    portFixture.page = { nature: 'CONFLIT', lignes: [ligneFixture()], total: 1, complete: true };
    routerFixture.navigationResult = false;
    await whenTheListIsRendered();

    await whenFiltering();

    expect(textOf('anomalies-navigation-erreur')).toContain('Impossible d’appliquer les filtres');
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should report a failed filter navigation once and retain the acquired list', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    const failure = new Error('Navigation indisponible');
    portFixture.page = { nature: 'CONFLIT', lignes: [ligneFixture()], total: 1, complete: true };
    routerFixture.navigationFailure = failure;
    await whenTheListIsRendered();

    await whenFiltering();

    expect(textOf('anomalies-navigation-erreur')).toContain('Impossible d’appliquer les filtres');
    expect(textOf('conflit-ligne')).toContain('Camille Martin');
    expect(errorFixture.errors).toEqual([failure]);
  });

  it('should distinguish a pending acquisition from a complete empty list', async () => {
    givenAnAddress({ nature: 'CONFLIT' });
    const release = portFixture.holdReading();
    await whenTheReadingStarts();

    const pending = await whenTheReadingCompletes(release);

    expect(pending).toEqual({ loading: true, empty: false });
    expect(present('anomalies-chargement')).toBe(false);
    expect(textOf('anomalies-vide')).toContain('Aucun conflit');
  });

  it.each([
    { nature: undefined, attendu: 'Chargement des fins automatiques…' },
    { nature: 'CONFLIT', attendu: 'Chargement des conflits…' },
    { nature: 'FIN_AUTOMATIQUE', attendu: 'Chargement des fins automatiques…' },
  ])('should word the pending acquisition of the nature $nature as "$attendu"', async ({ nature, attendu }) => {
    givenAnAddress(nature === undefined ? {} : { nature });
    const release = portFixture.holdReading();
    await whenTheReadingStarts();

    const loading = textOf('anomalies-chargement');
    await whenTheReadingCompletes(release);

    expect(loading).toBe(attendu);
  });

  it('should acquire the automatic ends and mark their tab as the current one when the address names no nature', async () => {
    await whenTheListIsRendered();

    expect(portFixture.demandes).toEqual([{ nature: 'FIN_AUTOMATIQUE', operateur: '', element: '', page: 1 }]);
    expect(currentTab()).toBe('anomalies-onglet-fins-automatiques');
  });

  it('should acquire the conflicts and mark their tab as the current one when the address names them', async () => {
    givenAnAddress({ nature: 'CONFLIT' });

    await whenTheListIsRendered();

    expect(portFixture.demandes).toEqual([{ nature: 'CONFLIT', operateur: '', element: '', page: 1 }]);
    expect(currentTab()).toBe('anomalies-onglet-conflits');
  });

  it('should offer the automatic ends tab before the conflicts tab', async () => {
    await whenTheListIsRendered();

    expect(tabOrder()).toEqual(['anomalies-onglet-fins-automatiques', 'anomalies-onglet-conflits']);
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

    await whenChoosingTheOperator('Jean Dupont');
    await whenChoosingTheElement('OF M24-0655');
    await whenFiltering();

    expect(routerFixture.navigations).toEqual([{ nature: 'FIN_AUTOMATIQUE', operateur: 'op-jean', element: 'of-m24-0655', page: 1 }]);
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

  it('should present unresolved identities without any identifier and work without workstation in the automatic ends', async () => {
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

    expect(texts('fin-automatique-ligne')[0]).toContain('Opérateur non résolu');
    expect(texts('fin-automatique-ligne')[0]).toContain('Poste non résolu');
    expect(texts('fin-automatique-ligne')[0]).not.toContain('poste-supprime');
    expect(texts('fin-automatique-ligne')[1]).toContain('Sans poste');
  });

  it('should explain that no automatic end remains', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE' });

    await whenTheListIsRendered();

    expect(textOf('anomalies-vide')).toBe('Aucune fin automatique à traiter.');
  });

  it('should explain that no automatic end matches the filters', async () => {
    givenAnAddress({ nature: 'FIN_AUTOMATIQUE', operateur: 'op-camille' });

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

  const whenChoosingTheOperator = async (libelle: string): Promise<void> => {
    requiredElement('anomalies-filtre-operateur').click();
    await componentFixture.whenStable();
    const proposition = propositions().find(candidate => candidate.textContent.trim() === libelle);
    if (proposition === undefined) throw new Error(`Missing operator proposition ${libelle}`);
    proposition.click();
    await componentFixture.whenStable();
  };

  const whenOpeningTheOperatorFilter = async (): Promise<void> => {
    requiredElement('anomalies-filtre-operateur').click();
    await componentFixture.whenStable();
  };

  const whenChoosingTheElement = async (libelle: string): Promise<void> => {
    requiredElement('anomalies-filtre-element').click();
    await componentFixture.whenStable();
    const proposition = elementPropositions().find(candidate => candidate.textContent.trim() === libelle);
    if (proposition === undefined) throw new Error(`Missing element proposition ${libelle}`);
    proposition.click();
    await componentFixture.whenStable();
  };

  const whenOpeningTheElementFilter = async (): Promise<void> => {
    requiredElement('anomalies-filtre-element').click();
    await componentFixture.whenStable();
  };

  const whenFiltering = async (): Promise<void> => {
    requiredElement('anomalies-filtres').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await componentFixture.whenStable();
  };

  const whenTheListIsRendered = async (): Promise<void> => {
    componentFixture = TestBed.createComponent(ListeAnomalies);
    componentFixture.detectChanges();
    await componentFixture.whenStable();
  };

  const propositions = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>(dataSelector('anomalies-filtre-operateur-proposition')),
  ];
  const elementPropositions = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>(dataSelector('anomalies-filtre-element-proposition')),
  ];
  const elementPropositionTexts = (): string[] => elementPropositions().map(proposition => proposition.textContent.trim());
  const propositionTexts = (): string[] => propositions().map(proposition => proposition.textContent.trim());
  const root = (): HTMLElement => componentFixture.nativeElement as HTMLElement;
  const requiredElement = (selector: string): HTMLElement => {
    const element = root().querySelector<HTMLElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Missing ${selector}`);
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
  const headingText = (): string => root().querySelector('h1')?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    Array.from(root().querySelectorAll(dataSelector(selector)), element => element.textContent.trim());
  const labelOf = (selector: string): string | null => requiredElement(selector).getAttribute('aria-label');
  const tabs = (): HTMLElement[] => Array.from(requiredElement('anomalies-onglets').querySelectorAll<HTMLElement>('a'));
  const tabOrder = (): string[] => tabs().map(tab => tab.getAttribute('data-selector') ?? '');
  const currentTab = (): string =>
    tabs()
      .find(tab => tab.getAttribute('aria-current') === 'page')
      ?.getAttribute('data-selector') ?? '';
  const present = (selector: string): boolean => root().querySelector(dataSelector(selector)) !== null;
  const textOf = (selector: string): string => root().querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
