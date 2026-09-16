import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { OperateursFixture } from '@test/unit/fixtures/gestion/operateur/OperateursFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { Matricule } from '../../../domain/Matricule';
import { NomOperateur } from '../../../domain/NomOperateur';
import { Operateur } from '../../../domain/Operateur';
import { OperateurId } from '../../../domain/OperateurId';
import { OperateursPort } from '../../../domain/OperateursPort';
import { PosteHabilitable } from '../../../domain/PosteHabilitable';
import { PosteHabilitableId } from '../../../domain/PosteHabilitableId';
import { PrenomOperateur } from '../../../domain/PrenomOperateur';
import { TauxHoraire } from '../../../domain/TauxHoraire';
import { Operateurs } from './Operateurs';

const tourFixture = new PosteHabilitable(new PosteHabilitableId('tour-1'), { libelle: 'Tour 1', nature: 'tournage' });
const scieFixture = new PosteHabilitable(new PosteHabilitableId('scie-1'), { libelle: 'Scie 1', nature: 'sciage' });

const jeanFixture = new Operateur(new OperateurId('jean'), {
  nom: new NomOperateur('Dupont'),
  prenom: new PrenomOperateur('Jean'),
  matricule: new Matricule('049'),
  tauxHoraire: new TauxHoraire(22),
  postes: [tourFixture],
  natures: ['tournage'],
});
const leaFixture = new Operateur(new OperateurId('lea'), {
  nom: new NomOperateur('Martin'),
  prenom: new PrenomOperateur('Léa'),
  matricule: undefined,
  tauxHoraire: undefined,
  postes: [],
  natures: [],
});

describe('Operateurs page', () => {
  let fixture: ComponentFixture<Operateurs>;
  let port: OperateursFixture;

  beforeEach(() => {
    port = new OperateursFixture();
    port.catalogue = [tourFixture, scieFixture];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: OperateursPort, useValue: port },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
  });

  afterEach(async () => {
    const dialogs = TestBed.inject(MatDialog);
    const closed = firstValueFrom(dialogs.afterAllClosed);
    dialogs.closeAll();
    await closed;
  });

  it('should show loading without displaying the empty state prematurely', async () => {
    const deferred = new DeferredFixture<Page<Operateur>>();
    givenReadingIsPending(deferred);
    await whenOpening();
    const loading = text('operateurs-loading');
    const empty = text('operateurs-empty');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement');
    expect(empty).toBe('');
  });

  it('should display the identity, the payroll number, the trades, the habilitations and the rate', async () => {
    givenOperateurs();
    await whenOpening();

    expect(texts('operateur-row')).toEqual([expect.stringContaining('Dupont'), expect.stringContaining('Martin')]);
    expect(texts('operateur-matricule-cell')).toEqual(['049', 'Non renseigné']);
    expect(texts('operateur-natures-cell')).toEqual(['tournage', 'Aucun']);
    expect(texts('operateur-postes-cell')).toEqual(['Tour 1', 'Aucune habilitation']);
    expect(texts('operateur-taux-cell')).toEqual([expect.stringContaining('22,00'), 'Non renseigné']);
  });

  it('should invite the manager to configure workstations first in a workshop without any', async () => {
    givenWorkshopWithoutWorkstation();
    await whenOpening();

    expect(text('operateurs-empty-sans-poste')).toContain('Configurez d’abord vos postes');
    expect(text('operateurs-empty')).toBe('');
  });

  it('should invite the manager to declare the first operator once workstations exist', async () => {
    await whenOpening();

    expect(text('operateurs-empty')).toContain('Aucun opérateur');
    expect(text('operateurs-empty-sans-poste')).toBe('');
  });

  it('should allow retry after an acquisition failure', async () => {
    givenReadingFails('Network down');
    await whenOpening();
    const failure = text('operateurs-error');
    givenReadingSucceeds();
    givenOperateurs();

    await whenClicking('operateurs-retry');

    expect(failure).toContain('Impossible de charger les opérateurs');
    expect(texts('operateur-row')).toHaveLength(2);
  });

  it.each(['operateurs-new', 'operateurs-empty-create'])('should reload the list after a declaration succeeds from %s', async selector => {
    await whenOpening();
    givenOperateurs();
    await whenClicking(selector);
    await whenClosingDialog(true);

    expect(texts('operateur-row')).toEqual([expect.stringContaining('Dupont'), expect.stringContaining('Martin')]);
  });

  it('should keep the list unchanged when a declaration is cancelled', async () => {
    givenOperateurs();
    await whenOpening();
    await whenClicking('operateurs-new');
    await whenClosingDialog(false);

    expect(texts('operateur-row')).toEqual([expect.stringContaining('Dupont'), expect.stringContaining('Martin')]);
  });

  it('should reload the list after revising the selected operator', async () => {
    givenOperateurs();
    await whenOpening();
    port.liste = [
      new Operateur(jeanFixture.id, {
        nom: new NomOperateur('Durand'),
        prenom: jeanFixture.prenom,
        matricule: jeanFixture.matricule,
        tauxHoraire: jeanFixture.tauxHoraire,
        postes: jeanFixture.postes,
        natures: jeanFixture.natures,
      }),
    ];
    await whenClicking('operateur-edit');
    await whenClosingDialog(true);

    expect(texts('operateur-row')).toEqual([expect.stringContaining('Durand')]);
  });

  it('should keep the operator when deletion is cancelled', async () => {
    givenOperateurs();
    await whenOpening();
    await whenClicking('operateur-delete');
    await whenClosingDialog(false);

    expect(texts('operateur-row')).toHaveLength(2);
    expect(port.suppressions).toEqual([]);
  });

  it('should reload the current page after deleting one of its operators', async () => {
    givenOperateurs();
    await whenOpening();
    port.liste = [leaFixture];
    await whenClicking('operateur-delete');
    await whenClosingDialog(true);

    expect(texts('operateur-row')).toEqual([expect.stringContaining('Martin')]);
    expect(text('operateurs-pagination')).toContain('1–1 sur 1');
  });

  it('should return to the previous page after deleting its last operator', async () => {
    givenManyOperateurs(21);
    await whenOpening();
    await whenPageSelected(1, 20);
    port.liste = port.liste.slice(0, 20);
    await whenClicking('operateur-delete');
    await whenClosingDialog(true);

    expect(texts('operateur-row')).toHaveLength(20);
    expect(text('operateurs-pagination')).toContain('1–20 sur 20');
  });

  it('should keep a successful write acknowledged when refreshing the list fails', async () => {
    await whenOpening();
    await whenClicking('operateurs-new');
    givenReadingFails('Read failed');
    await whenClosingDialog(true);
    const failure = text('operateurs-error');
    givenReadingSucceeds();
    port.liste = [jeanFixture];
    await whenClicking('operateurs-retry');

    expect(failure).toContain('Impossible de charger les opérateurs');
    expect(texts('operateur-row')).toEqual([expect.stringContaining('Dupont')]);
  });

  it('should keep the most recently requested page when an older response arrives last', async () => {
    givenManyOperateurs(21);
    await whenOpening();
    const old = new DeferredFixture<Page<Operateur>>();
    givenReadingIsPending(old);
    const arrival = port.signalLecture();
    whenSelectingPage(0, 20);
    await arrival;
    givenReadingSucceeds();
    await whenPageSelected(1, 20);
    old.resolve(new Page([jeanFixture], 1));
    await whenViewSettles();

    expect(texts('operateur-row')).toEqual([expect.stringContaining('Nom 21')]);
    expect(text('operateurs-pagination')).toContain('21–21 sur 21');
  });

  it('should keep loading the current page when an obsolete read fails', async () => {
    givenManyOperateurs(21);
    await whenOpening();
    const old = new DeferredFixture<Page<Operateur>>();
    givenReadingIsPending(old);
    const firstArrival = port.signalLecture();
    whenSelectingPage(0, 20);
    await firstArrival;
    const current = new DeferredFixture<Page<Operateur>>();
    givenReadingIsPending(current);
    const secondArrival = port.signalLecture();
    whenSelectingPage(1, 20);
    await secondArrival;
    old.reject(new Error('Obsolete read failed'));
    await whenViewSettles();
    const loading = text('operateurs-loading');
    const failure = text('operateurs-error');
    current.resolve(new Page([leaFixture], 21));
    await whenLoaded();

    expect(loading).toContain('Chargement');
    expect(failure).toBe('');
    expect(texts('operateur-row')).toEqual([expect.stringContaining('Martin')]);
    expect(text('operateurs-pagination')).toContain('21–21 sur 21');
  });

  const givenOperateurs = (): void => {
    port.liste = [jeanFixture, leaFixture];
  };
  const givenWorkshopWithoutWorkstation = (): void => {
    port.catalogue = [];
  };
  const givenManyOperateurs = (count: number): void => {
    port.liste = Array.from(
      { length: count },
      (_, index) =>
        new Operateur(new OperateurId(String(index)), {
          nom: new NomOperateur('Nom ' + String(index + 1)),
          prenom: new PrenomOperateur('Prenom ' + String(index + 1)),
          matricule: undefined,
          tauxHoraire: undefined,
          postes: [],
          natures: [],
        }),
    );
  };
  const givenReadingIsPending = (deferred: DeferredFixture<Page<Operateur>>): void => {
    port.lectureDifferee = deferred.promise;
  };
  const givenReadingFails = (message: string): void => {
    port.lectureFailure = new Error(message);
  };
  const givenReadingSucceeds = (): void => {
    port.lectureFailure = undefined;
    port.lectureDifferee = undefined;
  };
  const whenLoaded = async (): Promise<void> => {
    await vi.waitUntil(() => text('operateurs-loading') === '');
    await fixture.whenStable();
  };
  const whenClosingDialog = async (result: boolean): Promise<void> => {
    const dialogs = TestBed.inject(MatDialog);
    const closed = firstValueFrom(dialogs.afterAllClosed);
    dialogs.openDialogs[dialogs.openDialogs.length - 1]?.close(result);
    await closed;
    await fixture.whenStable();
  };
  const whenViewSettles = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const whenOpening = async (): Promise<void> => {
    fixture = TestBed.createComponent(Operateurs);
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const whenSelectingPage = (pageIndex: number, pageSize: number): void => {
    fixture.debugElement.query(By.css(dataSelector('operateurs-pagination'))).triggerEventHandler('page', { pageIndex, pageSize });
  };
  const whenPageSelected = async (pageIndex = 1, pageSize = 10): Promise<void> => {
    whenSelectingPage(pageIndex, pageSize);
    await fixture.whenStable();
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
});
