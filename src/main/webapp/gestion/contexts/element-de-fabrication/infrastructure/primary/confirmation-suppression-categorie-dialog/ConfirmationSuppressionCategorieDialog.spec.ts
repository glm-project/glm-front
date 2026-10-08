import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CategoriesDeProduitFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/CategoriesDeProduitFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { CategorieDeProduit } from '../../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../../domain/CategoriesDeProduitPort';
import {
  ConfirmationSuppressionCategorieDialog,
  ConfirmationSuppressionCategorieDialogData,
} from './ConfirmationSuppressionCategorieDialog';

@Component({ template: '' })
class DialogHostFixture {}

const MOULE = new CategorieDeProduit('MOULE');

describe('ConfirmationSuppressionCategorieDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: CategoriesDeProduitFixture;
  let errors: ErrorHandlerFixture;
  let closed: (boolean | undefined)[];
  let fermeture: Promise<boolean | undefined>;
  beforeEach(() => {
    port = new CategoriesDeProduitFixture();
    port.liste = [MOULE];
    errors = new ErrorHandlerFixture();
    closed = [];
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

  it('should name the category it is about to remove', async () => {
    await whenOpening();

    expect(text('categorie-delete-description')).toContain('La catégorie MOULE sera retirée');
  });

  it('should remove the confirmed category and close after success', async () => {
    await whenOpening();

    await whenClicking('categorie-delete-confirm');
    await fermeture;

    expect(port.suppressions).toEqual([MOULE]);
    expect(closed).toEqual([true]);
  });

  it('should keep the dialog open with the refusal while products use the category', async () => {
    givenProductsUse('MOULE');
    await whenOpening();

    await whenClicking('categorie-delete-confirm');

    expect(text('categorie-delete-refusal')).toBe('Des produits sont rangés dans cette catégorie : elle ne peut pas être supprimée.');
    expect(closed).toEqual([]);
  });

  it('should report a technical failure and leave the dialog open', async () => {
    givenRemovalFails();
    await whenOpening();

    await whenClicking('categorie-delete-confirm');

    expect(text('categorie-delete-technical-error')).toContain('La suppression a échoué');
    expect(errors.errors).toHaveLength(1);
    expect(closed).toEqual([]);
  });

  it('should close without removing when cancelled', async () => {
    await whenOpening();

    await whenClicking('categorie-delete-cancel');
    await fermeture;

    expect(port.suppressions).toEqual([]);
    expect(closed).toEqual([false]);
  });

  const givenProductsUse = (code: string): void => {
    port.utilisees = [code];
  };
  const givenRemovalFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const whenOpening = async (): Promise<void> => {
    const dialog = TestBed.inject(MatDialog).open<
      ConfirmationSuppressionCategorieDialog,
      ConfirmationSuppressionCategorieDialogData,
      boolean
    >(ConfirmationSuppressionCategorieDialog, { data: { categorie: MOULE } });
    fermeture = firstValueFrom(dialog.afterClosed());
    dialog.afterClosed().subscribe(result => closed.push(result));
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLElement>(dataSelector(selector)), selector).click();
    await fixture.whenStable();
  };
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
