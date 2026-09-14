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
import { PostesCoordinator } from '../../../application/PostesCoordinator';
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
        PostesCoordinator,
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

  it('should show workstation labels, natures, optional costs and accessible row actions', async () => {
    givenWorkstations();
    await whenOpening();

    expect(texts('poste-row')).toEqual([expect.stringContaining('Tour 1'), expect.stringContaining('Scie 1')]);
    expect(texts('poste-nature-cell')).toEqual(['tournage', 'sciage']);
    expect(texts('poste-cout-cell')).toEqual(['45,50 €', 'Non renseigné']);
    expect(labels('poste-edit')).toEqual(['Modifier Tour 1', 'Modifier Scie 1']);
    expect(labels('poste-delete')).toEqual(['Supprimer Tour 1', 'Supprimer Scie 1']);
    expect(text('postes-pagination')).toContain('1–2 sur 2');
  });

  it('should offer creation when the referential is empty', async () => {
    await whenOpening();

    expect(text('postes-empty')).toContain('Aucun poste de travail');
    expect(text('postes-pagination')).toContain('0 poste');
    expect(texts('poste-row')).toEqual([]);
  });

  it('should show loading without displaying the empty state prematurely', async () => {
    const deferred = new DeferredFixture<Page<PosteDeTravail>>();
    port.lectureDifferee = deferred.promise;
    await whenOpening();
    const loading = text('postes-loading');
    const empty = text('postes-empty');
    deferred.resolve(new Page([], 0));
    await whenViewSettles();

    expect(loading).toContain('Chargement');
    expect(empty).toBe('');
  });

  it('should allow retry after an acquisition failure', async () => {
    port.lectureFailure = new Error('Network down');
    await whenOpening();
    const failure = text('postes-error');
    port.lectureFailure = undefined;
    givenWorkstations();

    await whenClicking('postes-retry');

    expect(failure).toContain('Impossible de charger les postes');
    expect(texts('poste-row')).toHaveLength(2);
  });

  it('should request the page and size chosen with the paginator', async () => {
    givenWorkstations();
    port.total = 41;
    await whenOpening();
    await whenPageSelected();

    expect(port.lectures).toEqual([
      { page: 0, taille: 20 },
      { page: 1, taille: 10 },
    ]);
    expect(text('postes-pagination')).toContain('11–20 sur 41');
  });

  it.each(['postes-new', 'postes-empty-create'])('should open creation from %s', async selector => {
    await whenOpening();
    await whenClicking(selector);

    expect(text('poste-form-title')).toBe('Nouveau poste');
  });

  it('should open the selected workstation for editing', async () => {
    givenWorkstations();
    await whenOpening();
    await whenClicking('poste-edit');

    expect(inputValue('poste-libelle')).toBe('Tour 1');
    expect(text('poste-form-title')).toBe('Modifier le poste');
  });

  it('should ask for confirmation before deleting the selected workstation', async () => {
    givenWorkstations();
    await whenOpening();
    await whenClicking('poste-delete');

    expect(text('poste-delete-description')).toContain('Tour 1');
    expect(port.suppressions).toEqual([]);
  });

  const givenWorkstations = (): void => {
    port.liste = [tourFixture, scieFixture];
    port.total = 2;
  };
  const whenViewSettles = (): Promise<void> => fixture.whenStable();
  const whenOpening = async (): Promise<void> => {
    fixture = TestBed.createComponent(PostesDeTravail);
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const whenPageSelected = async (): Promise<void> => {
    fixture.debugElement.query(By.css(dataSelector('postes-pagination'))).triggerEventHandler('page', { pageIndex: 1, pageSize: 10 });
    await fixture.whenStable();
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.textContent.trim());
  const labels = (selector: string): (string | null)[] =>
    [...document.querySelectorAll(dataSelector(selector))].map(element => element.getAttribute('aria-label'));
  const inputValue = (selector: string): string =>
    requiredFixture(document.querySelector<HTMLInputElement>(dataSelector(selector)), selector).value;
});
