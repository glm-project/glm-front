import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ElementsDeFabricationFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ElementsDeFabricationFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { firstValueFrom } from 'rxjs';
import { ElementDeFabrication } from '../../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../../domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '../../../domain/ElementDeFabricationIntrouvable';
import { ElementsDeFabricationPort } from '../../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../../domain/LibelleDElement';
import { NomDElement } from '../../../domain/NomDElement';
import { ReferenceDElement } from '../../../domain/ReferenceDElement';
import { ReferenceDejaUtilisee } from '../../../domain/ReferenceDejaUtilisee';
import { TypeDElementDeFabrication } from '../../../domain/TypeDElementDeFabrication';
import { ElementFormDialog, ElementFormDialogData } from './ElementFormDialog';

@Component({ template: '' })
class DialogHostFixture {}

const mouleFixture = new ElementDeFabrication(new ElementDeFabricationId('moule-1'), {
  type: 'PRODUIT',
  nom: new NomDElement('PRD-2026-000001'),
  reference: new ReferenceDElement('1015'),
  libelle: new LibelleDElement('Moule de capot'),
});

describe('ElementFormDialog', () => {
  let fixture: ComponentFixture<DialogHostFixture>;
  let port: ElementsDeFabricationFixture;
  let errors: ErrorHandlerFixture;
  let dialog: MatDialogRef<ElementFormDialog, boolean>;
  let closed: (boolean | undefined)[];
  let fermeture: Promise<boolean | undefined>;
  beforeEach(() => {
    port = new ElementsDeFabricationFixture();
    errors = new ErrorHandlerFixture();
    closed = [];
    fermeture = Promise.resolve(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ElementsDeFabricationPort, useValue: port },
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

  it('should never propose the produced number, only the company number and the label', async () => {
    await whenOpeningCreation('PRODUIT');

    expect(fields()).toEqual(['element-reference', 'element-libelle']);
  });

  it('should create an element reduced to its produced number', async () => {
    await whenOpeningCreation('PRODUIT');
    await whenSubmitting();
    await whenClosed();

    expect(port.enregistrements).toEqual([{ kind: 'CREATION', type: 'PRODUIT', reference: undefined, libelle: undefined }]);
    expect(closed).toEqual([true]);
  });

  it('should create an ordre de fabrication from the entered company number and label', async () => {
    await whenOpeningCreation('ORDRE_DE_FABRICATION');
    await whenEntering('element-reference', '1016');
    await whenEntering('element-libelle', 'Reprise du capot');
    await whenSubmitting();
    await whenClosed();

    expect(port.enregistrements).toEqual([
      {
        kind: 'CREATION',
        type: 'ORDRE_DE_FABRICATION',
        reference: new ReferenceDElement('1016'),
        libelle: new LibelleDElement('Reprise du capot'),
      },
    ]);
    expect(closed).toEqual([true]);
  });

  it('should display an oversized company number and keep the dialog open', async () => {
    await whenOpeningCreation('PRODUIT');
    await whenEntering('element-reference', 'a'.repeat(101));
    await whenSubmitting();

    expect(text('element-reference-error')).toBe('La référence est limitée à 100 caractères.');
    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([]);
  });

  it('should display a label beyond one line and keep the dialog open', async () => {
    await whenOpeningCreation('PRODUIT');
    await whenEntering('element-libelle', 'a'.repeat(101));
    await whenSubmitting();

    expect(text('element-libelle-error')).toBe('Le libellé tient sur une ligne : 100 caractères au plus.');
    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([]);
  });

  it('should show a duplicate reference refusal until the manager changes the reference', async () => {
    givenDuplicateReferenceIsRefused();
    await whenOpeningCreation('PRODUIT');
    await whenEntering('element-reference', '1015');
    await whenSubmitting();
    const duplicate = text('element-reference-error');
    const remainedOpen = closed.length;
    await whenEntering('element-reference', '1016');

    expect(duplicate).toBe('Un autre moule ou OF porte déjà cette référence.');
    expect(remainedOpen).toBe(0);
    expect(text('element-reference-error')).toBe('');
  });

  it('should prefill an existing element and modify it', async () => {
    await whenOpeningModification(mouleFixture);
    const titre = text('element-form-title');
    const reference = input('element-reference').value;
    const libelle = input('element-libelle').value;
    await whenEntering('element-reference', '1016');
    await whenEntering('element-libelle', '');
    await whenSubmitting();
    await whenClosed();

    expect(titre).toBe('Modifier le moule 1015');
    expect(reference).toBe('1015');
    expect(libelle).toBe('Moule de capot');
    expect(port.enregistrements).toEqual([
      { kind: 'MODIFICATION', id: new ElementDeFabricationId('moule-1'), reference: new ReferenceDElement('1016'), libelle: undefined },
    ]);
    expect(closed).toEqual([true]);
  });

  it('should display a vanished element refusal without closing', async () => {
    givenElementIsMissing();
    await whenOpeningModification(mouleFixture);
    await whenSubmitting();

    expect(text('element-enregistrement-error')).toBe('Cet élément n’existe plus. Actualisez la liste.');
    expect(closed).toEqual([]);
  });

  it('should display a technical failure and report it through the error boundary', async () => {
    givenSavingFails();
    await whenOpeningCreation('PRODUIT');
    await whenSubmitting();

    expect(text('element-technical-error')).toContain('L’enregistrement a échoué');
    expect(errors.errors).toEqual([new Error('Network down')]);
    expect(closed).toEqual([]);
  });

  it('should prevent duplicate submission while saving', async () => {
    const deferred = new DeferredFixture<Result<void, ReferenceDejaUtilisee>>();
    givenSavingIsPending(deferred);
    await whenOpeningCreation('PRODUIT');
    await whenSubmitting();
    const busy = button('element-save').disabled;
    await whenSubmitting();
    deferred.resolve(ok(undefined));
    await whenClosed();

    expect(busy).toBe(true);
    expect(port.enregistrements).toHaveLength(1);
    expect(closed).toEqual([true]);
  });

  it('should cancel without writing', async () => {
    await whenOpeningCreation('PRODUIT');
    await whenClicking('element-cancel');
    await whenClosed();

    expect(port.enregistrements).toEqual([]);
    expect(closed).toEqual([false]);
  });

  const givenDuplicateReferenceIsRefused = (): void => {
    port.creation = err(new ReferenceDejaUtilisee());
  };
  const givenElementIsMissing = (): void => {
    port.modification = err(new ElementDeFabricationIntrouvable());
  };
  const givenSavingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenSavingIsPending = (deferred: DeferredFixture<Result<void, ReferenceDejaUtilisee>>): void => {
    port.creationDifferee = deferred.promise;
  };

  const whenOpeningCreation = (type: TypeDElementDeFabrication): Promise<void> => whenOpening({ type, element: null });
  const whenOpeningModification = (element: ElementDeFabrication): Promise<void> => whenOpening({ type: element.type, element });
  const whenOpening = async (data: ElementFormDialogData): Promise<void> => {
    dialog = TestBed.inject(MatDialog).open<ElementFormDialog, ElementFormDialogData, boolean>(ElementFormDialog, { data });
    fermeture = firstValueFrom(dialog.afterClosed());
    dialog.afterClosed().subscribe(result => closed.push(result));
    await fixture.whenStable();
  };
  const whenClosed = async (): Promise<void> => {
    await fermeture;
    await fixture.whenStable();
  };
  const whenEntering = async (selector: string, value: string): Promise<void> => {
    const field = input(selector);
    field.focus();
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const whenSubmitting = async (): Promise<void> => {
    requiredFixture(document.querySelector(dataSelector('element-form')), 'form').dispatchEvent(
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
  const fields = (): (string | null)[] =>
    [...document.querySelectorAll('[data-selector] input')].map(field => field.getAttribute('data-selector'));
});
