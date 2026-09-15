import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { PostesFixture } from '@test/unit/fixtures/gestion/poste/PostesFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { CoutHoraire } from '../../../domain/CoutHoraire';
import { LibellePoste } from '../../../domain/LibellePoste';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../../domain/PosteDeTravailId';
import { PostesPort } from '../../../domain/PostesPort';
import { PostesDeTravail } from './PostesDeTravail';

const tourFixture = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
  libelle: new LibellePoste('Tour 1'),
  nature: new NatureDeTravail('tournage'),
  coutHoraire: new CoutHoraire(45.5),
});
const scieFixture = new PosteDeTravail(new PosteDeTravailId('scie-1'), {
  libelle: new LibellePoste('Scie 1'),
  nature: new NatureDeTravail('sciage'),
  coutHoraire: undefined,
});

describe('PostesDeTravail page', () => {
  let fixture: ComponentFixture<PostesDeTravail>;
  let port: PostesFixture;
  beforeEach(() => {
    port = new PostesFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: PostesPort, useValue: port },
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
    const deferred = new DeferredFixture<Page<PosteDeTravail>>();
    givenReadingIsPending(deferred);
    await whenOpening();
    const loading = text('postes-loading');
    const empty = text('postes-empty');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement');
    expect(empty).toBe('');
  });

  it('should allow retry after an acquisition failure', async () => {
    givenReadingFails('Network down');
    await whenOpening();
    const failure = text('postes-error');
    givenReadingSucceeds();
    givenWorkstations();

    await whenClicking('postes-retry');

    expect(failure).toContain('Impossible de charger les postes');
    expect(texts('poste-row')).toHaveLength(2);
  });

  it.each(['postes-new', 'postes-empty-create'])('should reload the list after creation succeeds from %s', async selector => {
    await whenOpening();
    givenWorkstations();
    await whenClicking(selector);
    await whenClosingDialog(true);

    expect(texts('poste-row')).toEqual([expect.stringContaining('Tour 1'), expect.stringContaining('Scie 1')]);
    expect(texts('poste-nature-cell')).toEqual(['tournage', 'sciage']);
  });

  it('should keep the list unchanged when creation is cancelled', async () => {
    givenWorkstations();
    await whenOpening();
    await whenClicking('postes-new');
    await whenClosingDialog(false);

    expect(texts('poste-row')).toEqual([expect.stringContaining('Tour 1'), expect.stringContaining('Scie 1')]);
  });

  it('should reload the list after modifying the selected workstation', async () => {
    givenWorkstations();
    await whenOpening();
    port.liste = [
      new PosteDeTravail(tourFixture.id, {
        libelle: new LibellePoste('Tour Modifié'),
        nature: tourFixture.nature,
        coutHoraire: tourFixture.coutHoraire,
      }),
    ];
    await whenClicking('poste-edit');
    await whenClosingDialog(true);

    expect(texts('poste-row')).toEqual([expect.stringContaining('Tour Modifié')]);
  });

  it('should keep the workstation when deletion is cancelled', async () => {
    givenWorkstations();
    await whenOpening();
    await whenClicking('poste-delete');
    await whenClosingDialog(false);

    expect(texts('poste-row')).toEqual([expect.stringContaining('Tour 1'), expect.stringContaining('Scie 1')]);
    expect(port.suppressions).toEqual([]);
  });

  it('should keep a successful write acknowledged when refreshing the list fails', async () => {
    await whenOpening();
    await whenClicking('postes-new');
    givenReadingFails('Read failed');
    await whenClosingDialog(true);
    const failure = text('postes-error');
    givenReadingSucceeds();
    port.liste = [tourFixture];
    await whenClicking('postes-retry');

    expect(failure).toContain('Impossible de charger les postes');
    expect(texts('poste-row')).toEqual([expect.stringContaining('Tour 1')]);
  });

  it('should return to the previous page after deleting its last workstation', async () => {
    givenManyWorkstations(21);
    await whenOpening();
    await whenPageSelected(1, 20);
    port.liste = port.liste.slice(0, 20);
    await whenClicking('poste-delete');
    await whenClosingDialog(true);

    expect(texts('poste-row')).toHaveLength(20);
    expect(texts('poste-row')[0]).toContain('Poste 1');
    expect(text('postes-pagination')).toContain('1–20 sur 20');
  });

  it('should reload the current page after deleting one of its workstations', async () => {
    givenWorkstations();
    await whenOpening();
    port.liste = [scieFixture];
    await whenClicking('poste-delete');
    await whenClosingDialog(true);

    expect(texts('poste-row')).toEqual([expect.stringContaining('Scie 1')]);
    expect(text('postes-pagination')).toContain('1–1 sur 1');
  });

  it('should keep the most recently requested page when an older response arrives last', async () => {
    givenManyWorkstations(21);
    await whenOpening();
    const old = new DeferredFixture<Page<PosteDeTravail>>();
    givenReadingIsPending(old);
    const arrival = port.signalLecture();
    whenSelectingPage(0, 20);
    await arrival;
    givenReadingSucceeds();
    await whenPageSelected(1, 20);
    old.resolve(new Page([tourFixture], 1));
    await whenViewSettles();

    expect(texts('poste-row')).toEqual([expect.stringContaining('Poste 21')]);
    expect(text('postes-pagination')).toContain('21–21 sur 21');
  });

  it('should keep loading the current page when an obsolete read fails', async () => {
    givenManyWorkstations(21);
    await whenOpening();
    const old = new DeferredFixture<Page<PosteDeTravail>>();
    givenReadingIsPending(old);
    const firstArrival = port.signalLecture();
    whenSelectingPage(0, 20);
    await firstArrival;
    const current = new DeferredFixture<Page<PosteDeTravail>>();
    givenReadingIsPending(current);
    const secondArrival = port.signalLecture();
    whenSelectingPage(1, 20);
    await secondArrival;
    old.reject(new Error('Obsolete read failed'));
    await whenViewSettles();
    const loading = text('postes-loading');
    const failure = text('postes-error');
    current.resolve(new Page([scieFixture], 21));
    await whenLoaded();

    expect(loading).toContain('Chargement');
    expect(failure).toBe('');
    expect(texts('poste-row')).toEqual([expect.stringContaining('Scie 1')]);
    expect(text('postes-pagination')).toContain('21–21 sur 21');
  });

  const givenManyWorkstations = (count: number): void => {
    port.liste = Array.from(
      { length: count },
      (_, index) =>
        new PosteDeTravail(new PosteDeTravailId(String(index)), {
          libelle: new LibellePoste('Poste ' + String(index + 1)),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: undefined,
        }),
    );
  };
  const givenWorkstations = (): void => {
    port.liste = [tourFixture, scieFixture];
  };
  const givenReadingIsPending = (deferred: DeferredFixture<Page<PosteDeTravail>>): void => {
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
    await vi.waitUntil(() => text('postes-loading') === '');
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
    fixture = TestBed.createComponent(PostesDeTravail);
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const whenSelectingPage = (pageIndex: number, pageSize: number): void => {
    fixture.debugElement.query(By.css(dataSelector('postes-pagination'))).triggerEventHandler('page', { pageIndex, pageSize });
  };
  const whenPageSelected = async (pageIndex = 1, pageSize = 10): Promise<void> => {
    whenSelectingPage(pageIndex, pageSize);
    await fixture.whenStable();
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
});
