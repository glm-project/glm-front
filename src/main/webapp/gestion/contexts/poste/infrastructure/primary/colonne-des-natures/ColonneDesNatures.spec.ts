import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { err, Result } from '@/app/shared/result/domain/Result';
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
import { ColonneDesNatures } from './ColonneDesNatures';

const soudageFixture = new NatureGeree(new NatureDeTravailId('nature-soudage'), new NatureDeTravail('Soudage'), 2);

describe('ColonneDesNatures', () => {
  let fixture: ComponentFixture<ColonneDesNatures>;
  let port: NaturesDeTravailFixture;
  let enregistrees: NatureDeTravail[];

  beforeEach(async () => {
    port = new NaturesDeTravailFixture();
    port.liste = [soudageFixture];
    enregistrees = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: NaturesDeTravailPort, useValue: port },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    fixture = TestBed.createComponent(ColonneDesNatures);
    fixture.componentRef.setInput('natures', [soudageFixture]);
    fixture.componentRef.setInput('choisie', undefined);
    fixture.componentRef.setInput('total', 2);
    fixture.componentRef.setInput('lue', true);
    fixture.componentInstance.enregistree.subscribe(libelle => enregistrees.push(libelle));
    await fixture.whenStable();
  });

  it('should save a new nature and announce it', async () => {
    await whenSaving('Rectification');

    expect(port.enregistrements).toEqual([new NatureDeTravail('Rectification')]);
    expect(enregistrees).toEqual([new NatureDeTravail('Rectification')]);
    expect(text('nature-success')).toBe('Nature « Rectification » enregistrée.');
    expect(isShown('nature-form')).toBe(false);
  });

  it('should forget the last announcement when opening a new entry', async () => {
    await whenSaving('Rectification');

    await whenClicking('nature-new');

    expect(isShown('nature-success')).toBe(false);
  });

  it.each([
    ['', 'La nature est obligatoire et limitée à 50 caractères.'],
    ['SOUDÂGE', "« Soudage » existe déjà : choisissez-la plutôt que d'en créer une autre."],
  ])('should refuse %j before writing', async (saisie, erreur) => {
    await whenSaving(saisie);

    expect(port.enregistrements).toEqual([]);
    expect(text('nature-form')).toContain(erreur);
  });

  it('should warn about a close name before saving it', async () => {
    await whenSaving('Soudure');

    expect(port.enregistrements).toEqual([]);
    expect(text('nature-ressemblance')).toBe("« Soudure » ressemble à « Soudage ». L'enregistrer quand même ?");
    expect(text('nature-save')).toBe('Enregistrer quand même');
  });

  it('should save a close name once the warning is confirmed', async () => {
    await whenSaving('Soudure');

    await whenClicking('nature-save');

    expect(port.enregistrements).toEqual([new NatureDeTravail('Soudure')]);
  });

  it('should warn again after the name changes', async () => {
    await whenSaving('Soudure');

    await whenTyping('Soudeur');

    expect(isShown('nature-ressemblance')).toBe(false);
    expect(text('nature-save')).toBe('Enregistrer');
  });

  it('should show the refusal of a name taken meanwhile on the field', async () => {
    givenServerRefusesTheName();

    await whenSaving('Rectification');

    expect(text('nature-form')).toContain(new NatureDejaExistante().message);
    expect(enregistrees).toEqual([]);
  });

  it('should keep the entry open after a technical failure', async () => {
    givenWritingFails();

    await whenSaving('Rectification');

    expect(text('nature-technical-error')).toContain("L'enregistrement a échoué");
    expect(isShown('nature-form')).toBe(true);
  });

  it('should show the saving in progress', async () => {
    givenSavingIsPending();

    await whenSaving('Rectification');

    expect(text('nature-save')).toBe('Enregistrement…');
    expect(isDisabled('nature-save')).toBe(true);
  });

  it('should let the entry be saved again once the server answered', async () => {
    const reponse = new DeferredFixture<Result<void, NatureDejaExistante>>();
    port.enregistrementDiffere = reponse.promise;
    await whenSaving('Rectification');

    await whenServerAnswers(reponse);

    expect(text('nature-save')).toBe('Enregistrer');
  });

  it('should close the entry with Escape without writing', async () => {
    await whenClicking('nature-new');
    await whenTyping('Rectification');

    await whenPressingEscape();

    expect(isShown('nature-form')).toBe(false);
    expect(port.enregistrements).toEqual([]);
  });

  it('should close the entry with Annuler without writing', async () => {
    await whenClicking('nature-new');
    await whenTyping('Rectification');

    await whenClicking('nature-cancel');

    expect(isShown('nature-form')).toBe(false);
    expect(port.enregistrements).toEqual([]);
  });

  it('should focus the name when opening the entry', async () => {
    await whenClicking('nature-new');

    expect(focusedId()).toBe('nature-libelle');
  });

  const givenWritingFails = (): void => {
    port.ecritureFailure = new Error('Network down');
  };
  const givenSavingIsPending = (): void => {
    port.enregistrementDiffere = new DeferredFixture<Result<void, NatureDejaExistante>>().promise;
  };
  const isShown = (selector: string): boolean => document.querySelector(dataSelector(selector)) !== null;
  const isDisabled = (selector: string): boolean =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector).disabled;
  const whenServerAnswers = async (reponse: DeferredFixture<Result<void, NatureDejaExistante>>): Promise<void> => {
    reponse.resolve(err(new NatureDejaExistante()));
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const givenServerRefusesTheName = (): void => {
    port.liste = [...port.liste, new NatureGeree(new NatureDeTravailId('nature-cachee'), new NatureDeTravail('Rectification'), 0)];
  };
  const whenSaving = async (libelle: string): Promise<void> => {
    await whenClicking('nature-new');
    await whenTyping(libelle);
    await whenClicking('nature-save');
  };
  const whenTyping = async (libelle: string): Promise<void> => {
    const champ = requiredFixture(document.querySelector<HTMLInputElement>('#nature-libelle'), 'nature-libelle');
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
    requiredFixture(document.querySelector('#nature-libelle'), 'nature-libelle').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
  };
  const focusedId = (): string | undefined => document.activeElement?.id;
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
