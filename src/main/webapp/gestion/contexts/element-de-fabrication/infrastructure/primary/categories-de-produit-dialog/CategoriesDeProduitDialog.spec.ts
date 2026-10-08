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

  it('should remind that the code can no longer be changed', async () => {
    await whenOpening();

    expect(text('categorie-form')).toContain('Le code ne pourra plus être modifié');
  });

  it('should declare the typed code in capital letters and list it last', async () => {
    givenCategories(['MOULE']);
    await whenOpening();

    await whenEntering('categorie-code', 'piece');
    await whenSubmitting();

    expect(port.declarations).toEqual([new CategorieDeProduit('PIECE')]);
    expect(texts('categorie-item')).toEqual(['MOULE', 'PIECE']);
    expect(input('categorie-code').value).toBe('');
  });

  it('should refuse a code outside the pattern on the field, without declaring it', async () => {
    await whenOpening();

    await whenEntering('categorie-code', 'pièce');
    await whenSubmitting();

    expect(text('categorie-code-error')).toBe('Le code tient en 1 à 10 lettres majuscules, sans accent ni espace.');
    expect(port.declarations).toEqual([]);
  });

  it('should show an existing category refusal on the field', async () => {
    givenCategories(['MOULE']);
    await whenOpening();

    await whenEntering('categorie-code', 'moule');
    await whenSubmitting();

    expect(text('categorie-code-error')).toBe('Cette catégorie existe déjà.');
  });

  it('should declare once while a declaration is pending', async () => {
    const pending = new DeferredFixture<Result<void, CategorieDejaExistante>>();
    givenDeclarationIsPending(pending);
    await whenOpening();
    await whenEntering('categorie-code', 'piece');

    await whenSubmitting();
    await whenSubmitting();
    pending.resolve(ok(undefined));

    expect(port.declarations).toHaveLength(1);
  });

  it('should report a technical declaration failure and keep the typed code', async () => {
    givenDeclarationFails();
    await whenOpening();

    await whenEntering('categorie-code', 'piece');
    await whenSubmitting();

    expect(text('categorie-technical-error')).toContain('La déclaration a échoué');
    expect(input('categorie-code').value).toBe('piece');
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
  const givenDeclarationIsPending = (pending: DeferredFixture<Result<void, CategorieDejaExistante>>): void => {
    port.declarationDifferee = pending.promise;
  };
  const givenDeclarationFails = (): void => {
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
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
  const texts = (selector: string): string[] =>
    Array.from(document.querySelectorAll(dataSelector(selector)), element => element.textContent.trim());
});
