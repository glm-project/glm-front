import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { NaturesDeTravailFixture } from '@test/unit/fixtures/gestion/poste/NaturesDeTravailFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { NatureDejaExistante } from '../../../domain/NatureDejaExistante';
import { NatureDeTravail } from '../../../domain/NatureDeTravail';
import { NatureDeTravailId } from '../../../domain/NatureDeTravailId';
import { NatureGeree } from '../../../domain/NatureGeree';
import { NaturesDeTravailPort } from '../../../domain/NaturesDeTravailPort';
import { RefusRenommageNature } from '../../../domain/RefusRenommageNature';
import { EnTeteDesPostes } from './EnTeteDesPostes';

const soudureFixture = new NatureGeree(new NatureDeTravailId('nature-soudure'), new NatureDeTravail('Soudure'), 2);
const tournageFixture = new NatureGeree(new NatureDeTravailId('nature-tournage'), new NatureDeTravail('Tournage'), 1);

describe('EnTeteDesPostes', () => {
  let fixture: ComponentFixture<EnTeteDesPostes>;
  let port: NaturesDeTravailFixture;
  let modifications: number;

  beforeEach(() => {
    port = new NaturesDeTravailFixture();
    port.liste = [soudureFixture, tournageFixture];
    modifications = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: NaturesDeTravailPort, useValue: port },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
  });

  it('should title every poste without offering to rename', async () => {
    await whenShowing(undefined);

    expect(text('postes-selection-title')).toBe('Tous les postes');
    expect(text('postes-selection-count')).toBe('3 postes');
    expect(isShown('nature-rename')).toBe(false);
  });

  it('should open the renaming on the current name', async () => {
    await whenShowing(soudureFixture);

    await whenClicking('nature-rename');

    expect(fieldValue()).toBe('Soudure');
    expect(text('nature-rename-form')).toContain("Le nouveau nom s'affichera partout, y compris dans les rapports déjà produits.");
  });

  it('should rename the chosen nature and announce it', async () => {
    await whenShowing(soudureFixture);

    await whenRenaming('Soudage');

    expect(port.renommages).toEqual([[soudureFixture.id, new NatureDeTravail('Soudage')]]);
    expect(text('nature-rename-success')).toBe("« Soudure » s'appelle désormais « Soudage ».");
    expect(modifications).toBe(1);
    expect(isShown('nature-rename-form')).toBe(false);
  });

  it('should let a nature change only the case of its name', async () => {
    await whenShowing(soudureFixture);

    await whenRenaming('SOUDURE');

    expect(port.renommages).toEqual([[soudureFixture.id, new NatureDeTravail('SOUDURE')]]);
  });

  it('should refuse the name of another nature before writing', async () => {
    await whenShowing(soudureFixture);

    await whenRenaming('tournage');

    expect(port.renommages).toEqual([]);
    expect(text('nature-rename-form')).toContain('« Tournage » existe déjà');
  });

  it('should warn about a name close to another nature', async () => {
    await whenShowing(soudureFixture);

    await whenRenaming('Tournag');

    expect(port.renommages).toEqual([]);
    expect(text('nature-rename-ressemblance')).toBe("« Tournag » ressemble à « Tournage ». L'enregistrer quand même ?");
    expect(text('nature-rename-save')).toBe('Enregistrer quand même');
  });

  it('should rename to a close name once the warning is confirmed', async () => {
    await whenShowing(soudureFixture);
    await whenRenaming('Tournag');

    await whenClicking('nature-rename-save');

    expect(port.renommages).toEqual([[soudureFixture.id, new NatureDeTravail('Tournag')]]);
  });

  it('should forget the warning once the name changes', async () => {
    await whenShowing(soudureFixture);
    await whenRenaming('Tournag');

    await whenTyping('Soudage');

    expect(isShown('nature-rename-ressemblance')).toBe(false);
  });

  it('should show the refusal of a name taken meanwhile on the field', async () => {
    givenAnotherNatureTookTheName('Soudage');
    await whenShowing(soudureFixture);

    await whenRenaming('Soudage');

    expect(text('nature-rename-form')).toContain(new NatureDejaExistante().message);
    expect(modifications).toBe(0);
  });

  it('should explain that the nature disappeared and ask for a fresh read', async () => {
    givenTheNatureDisappeared();
    await whenShowing(soudureFixture);

    await whenRenaming('Soudage');

    expect(text('nature-rename-refusal')).toBe("Cette nature n'existe plus : la liste a été relue.");
    expect(modifications).toBe(1);
  });

  it('should keep the renaming open after a technical failure', async () => {
    givenWritingFails();
    await whenShowing(soudureFixture);

    await whenRenaming('Soudage');

    expect(text('nature-rename-technical-error')).toContain('Le renommage a échoué');
    expect(isShown('nature-rename-form')).toBe(true);
  });

  it('should show the renaming in progress', async () => {
    givenRenamingIsPending();
    await whenShowing(soudureFixture);

    await whenRenaming('Soudage');

    expect(text('nature-rename-save')).toBe('Enregistrement…');
  });

  it('should close the renaming with Escape without writing', async () => {
    await whenShowing(soudureFixture);
    await whenClicking('nature-rename');

    await whenPressingEscape();

    expect(isShown('nature-rename-form')).toBe(false);
    expect(port.renommages).toEqual([]);
  });

  it('should close the renaming with Annuler without writing', async () => {
    await whenShowing(soudureFixture);
    await whenClicking('nature-rename');

    await whenClicking('nature-rename-cancel');

    expect(isShown('nature-rename-form')).toBe(false);
  });

  const givenAnotherNatureTookTheName = (libelle: string): void => {
    port.liste = [...port.liste, new NatureGeree(new NatureDeTravailId('nature-cachee'), new NatureDeTravail(libelle), 0)];
  };
  const givenTheNatureDisappeared = (): void => {
    port.liste = [tournageFixture];
  };
  const givenWritingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenRenamingIsPending = (): void => {
    port.renommageDiffere = new DeferredFixture<Result<void, RefusRenommageNature>>().promise;
  };
  const whenShowing = async (nature: NatureGeree | undefined): Promise<void> => {
    fixture = TestBed.createComponent(EnTeteDesPostes);
    fixture.componentRef.setInput('nature', nature);
    fixture.componentRef.setInput('natures', [soudureFixture, tournageFixture]);
    fixture.componentRef.setInput('total', 3);
    fixture.componentInstance.modifiee.subscribe(() => (modifications += 1));
    await fixture.whenStable();
  };
  const whenRenaming = async (libelle: string): Promise<void> => {
    await whenClicking('nature-rename');
    await whenTyping(libelle);
    await whenClicking('nature-rename-save');
  };
  const whenTyping = async (libelle: string): Promise<void> => {
    const champ = requiredFixture(document.querySelector<HTMLInputElement>('#nature-nouveau-libelle'), 'nature-nouveau-libelle');
    champ.value = libelle;
    champ.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).click();
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const whenPressingEscape = async (): Promise<void> => {
    requiredFixture(document.querySelector('#nature-nouveau-libelle'), 'nature-nouveau-libelle').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
  };
  const fieldValue = (): string => requiredFixture(document.querySelector<HTMLInputElement>('#nature-nouveau-libelle'), 'champ').value;
  const isShown = (selector: string): boolean => document.querySelector(dataSelector(selector)) !== null;
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
