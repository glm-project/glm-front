import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { err, ok } from '@/app/shared/result/domain/Result';
import { TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { PostesFixture } from '@test/unit/fixtures/gestion/poste/PostesFixture';
import { LibellePoste } from '../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../domain/NatureDeTravail';
import { PosteDeTravail } from '../domain/PosteDeTravail';
import { PosteDeTravailId } from '../domain/PosteDeTravailId';
import { PosteNonSupprimable } from '../domain/PosteNonSupprimable';
import { PostesPort } from '../domain/PostesPort';
import { PostesCoordinator } from './PostesCoordinator';

const tourFixture = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
  libelle: new LibellePoste('Tour 1'),
  nature: new NatureDeTravail('tournage'),
  coutHoraire: undefined,
});

describe('PostesCoordinator', () => {
  let port: PostesFixture;
  let coordinator: PostesCoordinator;
  let errors: ErrorHandlerFixture;
  beforeEach(() => {
    port = new PostesFixture();
    errors = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [PostesCoordinator, { provide: PostesPort, useValue: port }, { provide: ErrorHandlerPort, useValue: errors }],
    });
    coordinator = TestBed.inject(PostesCoordinator);
  });

  it.each(['creer', 'modifier'] as const)('should refresh the list after %s succeeds', async action => {
    const result = await whenSaving(action);

    expect(result).toEqual(ok(undefined));
    expect(port.enregistrements).toHaveLength(1);
    expect(port.enregistrements[0]?.commande.libelle.value).toBe('Tour 1');
    expect(port.lectures).toEqual([{ page: 0, taille: 20 }]);
  });

  it('should address the edited workstation by its identity', async () => {
    await whenSaving('modifier');

    expect(port.enregistrements[0]?.id).toEqual(tourFixture.id);
  });

  it.each(['creer', 'modifier'] as const)('should return a refused %s without reloading', async action => {
    port.enregistrement = err(new LibellePosteDejaUtilise());
    const result = await whenSaving(action);

    expect(result).toEqual(err(new LibellePosteDejaUtilise()));
    expect(port.lectures).toEqual([]);
  });

  it('should reload the current page after deleting a workstation', async () => {
    const result = await coordinator.supprimer(tourFixture.id);

    expect(result).toEqual(ok(undefined));
    expect(port.suppressions).toEqual([tourFixture.id]);
    expect(port.lectures).toEqual([{ page: 0, taille: 20 }]);
  });

  it('should return a protected deletion refusal without reloading', async () => {
    port.suppression = err(new PosteNonSupprimable());
    const result = await coordinator.supprimer(tourFixture.id);

    expect(result).toEqual(err(new PosteNonSupprimable()));
    expect(port.lectures).toEqual([]);
  });

  it('should move back when deleting the last workstation on a later page', async () => {
    port.liste = [tourFixture];
    port.total = 21;
    await coordinator.changerPage(1, 20);

    await coordinator.supprimer(tourFixture.id);

    expect(coordinator.page()).toBe(0);
    expect(port.lectures).toEqual([
      { page: 1, taille: 20 },
      { page: 0, taille: 20 },
    ]);
  });

  it.each(['creer', 'modifier', 'supprimer'] as const)('should propagate a technical %s failure without reloading', async action => {
    port.ecritureFailure = new Error('Network down');
    const result = whenCommandStarts(action);

    await expect(result).rejects.toThrow('Network down');
    expect(port.lectures).toEqual([]);
  });

  it('should keep a successful write acknowledged when refreshing the list fails', async () => {
    port.lectureFailure = new Error('Read failed');
    const result = await whenSaving('creer');

    expect(result).toEqual(ok(undefined));
    expect(coordinator.echec()).toBe(true);
  });
  it('should initially expose an idle first page of twenty workstations', () => {
    expect(coordinator.postes()).toEqual([]);
    expect(coordinator.totalElementsCount()).toBe(0);
    expect(coordinator.page()).toBe(0);
    expect(coordinator.taille()).toBe(20);
    expect(coordinator.chargement()).toBe(false);
    expect(coordinator.natures()).toEqual([]);
    expect(coordinator.echec()).toBe(false);
  });

  it('should keep the most recently requested page when an older response arrives last', async () => {
    const old = new DeferredFixture<Page<PosteDeTravail>>();
    port.lectureDifferee = old.promise;
    const first = coordinator.charger();
    port.lectureDifferee = undefined;
    port.liste = [tourFixture];
    port.total = 21;

    await coordinator.changerPage(1, 20);
    old.resolve(new Page([], 0));
    await first;

    expect(coordinator.postes()).toEqual([tourFixture]);
    expect(coordinator.totalElementsCount()).toBe(21);
    expect(coordinator.page()).toBe(1);
  });

  it('should keep loading the current page when an obsolete read fails', async () => {
    const old = new DeferredFixture<Page<PosteDeTravail>>();
    port.lectureDifferee = old.promise;
    const first = coordinator.charger();
    const current = new DeferredFixture<Page<PosteDeTravail>>();
    port.lectureDifferee = current.promise;
    const second = coordinator.changerPage(1, 20);

    old.reject(new Error('Obsolete read failed'));
    await first;
    const pending = coordinator.chargement();
    const failed = coordinator.echec();
    current.resolve(new Page([tourFixture], 21));
    await second;

    expect(pending).toBe(true);
    expect(failed).toBe(false);
    expect(coordinator.postes()).toEqual([tourFixture]);
  });

  it('should expose loading until the requested page and nature suggestions arrive', async () => {
    const deferred = new DeferredFixture<Page<PosteDeTravail>>();
    port.lectureDifferee = deferred.promise;
    port.suggestions = [new NatureDeTravail('tournage')];

    const loading = coordinator.charger();
    const pending = coordinator.chargement();
    deferred.resolve(new Page([tourFixture], 41));
    await loading;

    expect(pending).toBe(true);
    expect(coordinator.postes()).toEqual([tourFixture]);
    expect(coordinator.totalElementsCount()).toBe(41);
    expect(coordinator.natures()).toEqual([new NatureDeTravail('tournage')]);
    expect(coordinator.chargement()).toBe(false);
  });

  it('should read the page and size selected by the manager', async () => {
    await coordinator.changerPage(2, 10);

    expect(port.lectures).toEqual([{ page: 2, taille: 10 }]);
    expect(coordinator.page()).toBe(2);
    expect(coordinator.taille()).toBe(10);
  });

  it('should report a failed acquisition and release loading', async () => {
    port.lectureFailure = new Error('Network down');
    await coordinator.charger();

    expect(coordinator.echec()).toBe(true);
    expect(coordinator.chargement()).toBe(false);
    expect(errors.errors).toEqual([new Error('Network down')]);
  });

  it('should clear a previous acquisition failure on retry', async () => {
    port.lectureFailure = new Error('Network down');
    await coordinator.charger();
    port.lectureFailure = undefined;
    port.liste = [tourFixture];
    port.total = 1;

    await coordinator.charger();

    expect(coordinator.echec()).toBe(false);
    expect(coordinator.postes()).toEqual([tourFixture]);
  });

  const whenSaving = (action: 'creer' | 'modifier') => {
    const commande = { libelle: tourFixture.libelle, nature: tourFixture.nature, coutHoraire: undefined };
    return action === 'creer' ? coordinator.creer(commande) : coordinator.modifier(tourFixture.id, commande);
  };

  const whenCommandStarts = (action: 'creer' | 'modifier' | 'supprimer') =>
    action === 'supprimer' ? coordinator.supprimer(tourFixture.id) : whenSaving(action);
});
