import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ok, Result } from '@/app/shared/result/domain/Result';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CategoriesDeProduitFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/CategoriesDeProduitFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { CategorieDejaExistante } from '../../../domain/CategorieDejaExistante';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import { CategoriesDeProduitDialog } from './CategoriesDeProduitDialog';

@Component({ template: '' })
class DialogHostFixture {}

describe('CategoriesDeProduitDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: CategoriesDeProduitFixture;
  let errors: ErrorHandlerFixture;
  let fermeture: Promise<unknown>;
  beforeEach(() => {
    port = new CategoriesDeProduitFixture();
    errors = new ErrorHandlerFixture();
    fermeture = Promise.resolve(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: CategoriesDeProduitPort, useValue: port },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
    fixture = TestBed.createComponent(DialogHostFixture);
  });
  afterEach(async () => {
    TestBed.inject(MatDialog).closeAll();
    await fermeture;
    await fixture.whenStable();
  });

  it('should list the categories in the order the company chose', async () => {
    givenCategories(['OF', 'MOULE']);

    await whenOpening();

    expect(texts('categorie-item')).toEqual(['OF', 'MOULE']);
  });

  it('should say that no category is declared yet', async () => {
    await whenOpening();

    expect(text('categories-empty')).toBe('Aucune catégorie déclarée.');
  });

  it('should offer the declaration at the bottom of the list, without showing the field yet', async () => {
    givenCategories(['MOULE']);

    await whenOpening();

    expect(text('categorie-new')).toContain('Nouvelle catégorie');
    expect(text('categorie-form')).toBe('');
  });

  it('should open the field with the focus, reminding that the code can no longer be changed', async () => {
    await whenOpening();

    await whenOpeningDeclaration();

    expect(focused()).toBe('categorie-code');
    expect(text('categorie-form')).toContain('Le code ne pourra plus être modifié');
  });

  it('should close the field and forget the typing when the declaration is cancelled', async () => {
    await whenOpening();
    await whenOpeningDeclaration();
    await whenEntering('categorie-code', 'piece');

    await whenClicking('categorie-cancel');
    await whenOpeningDeclaration();

    expect(input('categorie-code').value).toBe('');
    expect(port.declarations).toEqual([]);
  });

  it('should close the field on Escape without closing the category management', async () => {
    await whenOpening();
    await whenOpeningDeclaration();

    await whenPressingEscape('categorie-code');

    expect(text('categorie-form')).toBe('');
    expect(openDialogs()).toBe(1);
  });

  it('should declare the typed code in capital letters and list it last', async () => {
    givenCategories(['MOULE']);
    await whenOpening();

    await whenOpeningDeclaration();
    await whenEntering('categorie-code', 'piece');
    await whenSubmitting();

    expect(port.declarations).toEqual([new CategorieDeProduit('PIECE')]);
    expect(texts('categorie-item')).toEqual(['MOULE', 'PIECE']);
    expect(text('categorie-form')).toBe('');
  });

  it('should refuse a code outside the pattern on the field, without declaring it', async () => {
    await whenOpening();

    await whenOpeningDeclaration();
    await whenEntering('categorie-code', 'pièce');
    await whenSubmitting();

    expect(text('categorie-code-error')).toBe('Le code tient en 1 à 10 lettres majuscules, sans accent ni espace.');
    expect(port.declarations).toEqual([]);
  });

  it('should show an existing category refusal on the field', async () => {
    givenCategories(['MOULE']);
    await whenOpening();

    await whenOpeningDeclaration();
    await whenEntering('categorie-code', 'moule');
    await whenSubmitting();

    expect(text('categorie-code-error')).toBe('Cette catégorie existe déjà.');
  });

  it('should declare once while a declaration is pending', async () => {
    const pending = new DeferredFixture<Result<void, CategorieDejaExistante>>();
    givenDeclarationIsPending(pending);
    await whenOpening();
    await whenOpeningDeclaration();
    await whenEntering('categorie-code', 'piece');

    await whenSubmitting();
    await whenSubmitting();
    pending.resolve(ok(undefined));

    expect(port.declarations).toHaveLength(1);
  });

  it('should report a technical declaration failure and keep the typed code', async () => {
    givenWritingFails();
    await whenOpening();

    await whenOpeningDeclaration();
    await whenEntering('categorie-code', 'piece');
    await whenSubmitting();

    expect(text('categorie-technical-error')).toContain('La déclaration a échoué');
    expect(input('categorie-code').value).toBe('piece');
    expect(errors.errors).toHaveLength(1);
  });

  it('should move a category one place up and keep that order', async () => {
    givenCategories(['MOULE', 'OF', 'PIECE']);
    await whenOpening();

    await whenClicking('categorie-monter-PIECE');

    expect(texts('categorie-item')).toEqual(['MOULE', 'PIECE', 'OF']);
    expect(port.liste.map(categorie => categorie.value)).toEqual(['MOULE', 'PIECE', 'OF']);
  });

  it('should move a category one place down', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();

    await whenClicking('categorie-descendre-MOULE');

    expect(texts('categorie-item')).toEqual(['OF', 'MOULE']);
  });

  it('should offer no move beyond the first and the last place', async () => {
    givenCategories(['MOULE', 'OF']);

    await whenOpening();

    expect([button('categorie-monter-MOULE').disabled, button('categorie-descendre-MOULE').disabled]).toEqual([true, false]);
    expect([button('categorie-monter-OF').disabled, button('categorie-descendre-OF').disabled]).toEqual([false, true]);
  });

  it('should explain a refused order and show the categories as they now are', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();
    givenAnotherManagerDeclared('PIECE');

    await whenClicking('categorie-descendre-MOULE');

    expect(text('categories-refus')).toContain('Les catégories ont changé entre-temps');
    expect(texts('categorie-item')).toEqual(['MOULE', 'OF', 'PIECE']);
  });

  it('should report a technical move failure and keep the order', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();
    givenWritingFails();

    await whenClicking('categorie-descendre-MOULE');

    expect(text('categories-technical-error')).toContain('Le déplacement a échoué');
    expect(texts('categorie-item')).toEqual(['MOULE', 'OF']);
    expect(errors.errors).toHaveLength(1);
  });

  it('should offer to remove only a category no product uses', async () => {
    givenCategories(['MOULE', 'OF']);
    givenProductsUse('MOULE');

    await whenOpening();

    expect(removals()).toEqual(['categorie-supprimer-OF']);
  });

  it('should ask for the removal in the row, without opening another dialog', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();

    await whenClicking('categorie-supprimer-MOULE');

    expect(text('categorie-delete-question')).toBe('Supprimer MOULE ?');
    expect(texts('categorie-item')).toEqual(['OF']);
    expect(openDialogs()).toBe(1);
  });

  it('should move the focus to the cancellation of the removal', async () => {
    givenCategories(['MOULE']);
    await whenOpening();

    await whenClicking('categorie-supprimer-MOULE');

    expect(focused()).toBe('categorie-delete-cancel');
  });

  it('should list the categories again once one is removed', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();
    await whenClicking('categorie-supprimer-MOULE');

    await whenClicking('categorie-delete-confirm');

    expect(port.suppressions).toEqual([new CategorieDeProduit('MOULE')]);
    expect(texts('categorie-item')).toEqual(['OF']);
    expect(text('categorie-delete')).toBe('');
  });

  it('should restore the row when the removal is cancelled', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();
    await whenClicking('categorie-supprimer-MOULE');

    await whenClicking('categorie-delete-cancel');

    expect(port.suppressions).toEqual([]);
    expect(texts('categorie-item')).toEqual(['MOULE', 'OF']);
    expect(removals()).toEqual(['categorie-supprimer-MOULE', 'categorie-supprimer-OF']);
  });

  it('should explain under the row a removal refused because a product arrived meanwhile, then hide the trash', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();
    await whenClicking('categorie-supprimer-MOULE');
    givenProductsUse('MOULE');

    await whenClicking('categorie-delete-confirm');

    expect(text('categorie-delete-refusal')).toBe('Des produits sont rangés dans cette catégorie : elle ne peut pas être supprimée.');
    expect(texts('categorie-item')).toEqual(['MOULE', 'OF']);
    expect(removals()).toEqual(['categorie-supprimer-OF']);
  });

  it('should forget a removal refusal when another removal is asked', async () => {
    givenCategories(['MOULE', 'OF']);
    await whenOpening();
    await whenClicking('categorie-supprimer-MOULE');
    givenProductsUse('MOULE');
    await whenClicking('categorie-delete-confirm');

    await whenClicking('categorie-supprimer-OF');

    expect(text('categorie-delete-refusal')).toBe('');
  });

  it('should report a technical removal failure and keep the question open', async () => {
    givenCategories(['MOULE']);
    await whenOpening();
    await whenClicking('categorie-supprimer-MOULE');
    givenWritingFails();

    await whenClicking('categorie-delete-confirm');

    expect(text('categorie-delete-technical-error')).toContain('La suppression a échoué');
    expect(text('categorie-delete-question')).toBe('Supprimer MOULE ?');
    expect(errors.errors).toHaveLength(1);
  });

  it('should offer a retry after a failed read', async () => {
    givenReadingFails();
    await whenOpening();
    const erreur = text('categories-error');
    givenReadingSucceeds(['OF']);

    await whenClicking('categories-retry');

    expect(erreur).toContain('Impossible de charger les catégories');
    expect(texts('categorie-item')).toEqual(['OF']);
  });

  const givenCategories = (codes: readonly string[]): void => {
    port.liste = codes.map(code => new CategorieDeProduit(code));
  };
  const givenProductsUse = (code: string): void => {
    port.utilisees = [code];
  };
  const givenAnotherManagerDeclared = (code: string): void => {
    port.liste = [...port.liste, new CategorieDeProduit(code)];
  };
  const givenDeclarationIsPending = (pending: DeferredFixture<Result<void, CategorieDejaExistante>>): void => {
    port.declarationDifferee = pending.promise;
  };
  const givenWritingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenReadingFails = (): void => {
    port.lectureFailure = new Error('Network down');
  };
  const givenReadingSucceeds = (codes: readonly string[]): void => {
    port.lectureFailure = undefined;
    givenCategories(codes);
  };

  const whenOpening = async (): Promise<void> => {
    const dialog: MatDialogRef<CategoriesDeProduitDialog> = TestBed.inject(MatDialog).open(CategoriesDeProduitDialog);
    fermeture = firstValueFrom(dialog.afterClosed());
    await fixture.whenStable();
  };
  const whenOpeningDeclaration = async (): Promise<void> => {
    await whenClicking('categorie-new');
  };
  const whenPressingEscape = async (selector: string): Promise<void> => {
    input(selector).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };
  const whenEntering = async (selector: string, value: string): Promise<void> => {
    const field = input(selector);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const whenSubmitting = async (): Promise<void> => {
    requiredFixture(document.querySelector(dataSelector('categorie-form')), 'form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const input = (selector: string): HTMLInputElement =>
    requiredFixture(document.querySelector<HTMLInputElement>(dataSelector(selector)), selector);
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const openDialogs = (): number => TestBed.inject(MatDialog).openDialogs.length;
  const focused = (): string | null | undefined => document.activeElement?.getAttribute('data-selector');
  const removals = (): string[] =>
    Array.from(
      document.querySelectorAll('[data-selector^="categorie-supprimer-"]'),
      element => element.getAttribute('data-selector') ?? '',
    );
  const texts = (selector: string): string[] =>
    Array.from(document.querySelectorAll(dataSelector(selector)), element => element.textContent.trim());
});
