import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ParametrageFixture } from '@test/unit/fixtures/gestion/parametrage/ParametrageFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { DureeMaxDActivite } from '../../../domain/DureeMaxDActivite';
import { ParametragePort } from '../../../domain/ParametragePort';
import { Parametres } from './Parametres';

describe('Parametres page', () => {
  let fixture: ComponentFixture<Parametres>;
  let port: ParametrageFixture;
  let errors: ErrorHandlerFixture;
  beforeEach(() => {
    port = new ParametrageFixture();
    errors = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ParametragePort, useValue: port },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
  });

  it('should show the duration the company set, with the time an activity started at 08:00 stops', async () => {
    givenTheDuration(13);

    await whenOpening();

    expect(field().value).toBe('13');
    expect(text('duree-exemple')).toBe('Exemple : une activité commencée à 08:00 et jamais terminée s’arrête à 21:00.');
  });

  it('should tell that an activity stops the next day', async () => {
    await whenOpening();

    await whenTyping('16');

    expect(text('duree-exemple')).toBe('Exemple : une activité commencée à 08:00 et jamais terminée s’arrête à 00:00 le lendemain.');
  });

  it('should refuse a duration beyond 24 hours without sending it', async () => {
    await whenOpening();
    await whenTyping('25');

    await whenSubmitting();

    expect(text('duree-max-error')).toBe('La durée ne peut pas dépasser 24 h.');
    expect(button('duree-save').disabled).toBe(true);
    expect(text('duree-exemple')).toBe('');
    expect(port.durees).toEqual([]);
  });

  it('should save the typed duration and confirm it', async () => {
    await whenOpening();
    await whenTyping('10');

    await whenClicking('duree-save');

    expect(port.durees).toEqual([new DureeMaxDActivite(10)]);
    expect(text('duree-saved')).toBe('Durée enregistrée.');
  });

  it('should stop confirming the saved duration as soon as it is typed again', async () => {
    await whenOpening();
    await whenTyping('10');
    await whenClicking('duree-save');

    await whenTyping('11');

    expect(text('duree-saved')).toBe('');
  });

  it('should send the duration once while it is being saved', async () => {
    givenTheWriteIsPending();
    await whenOpening();
    await whenTyping('10');
    await whenClicking('duree-save');

    await whenSubmitting();

    expect(text('duree-save')).toBe('Enregistrement…');
    expect(port.durees).toHaveLength(1);
  });

  it('should say the duration was not saved after a technical failure, and report it', async () => {
    givenTheWriteFails();
    await whenOpening();
    await whenTyping('10');

    await whenClicking('duree-save');

    expect(text('duree-technical-error')).toBe('La durée n’a pas pu être enregistrée. Vérifiez la connexion puis réessayez.');
    expect(text('duree-saved')).toBe('');
    expect(errors.errors).toEqual([new Error('panne')]);
  });

  it('should offer to read the settings again after a failed read', async () => {
    givenTheReadFails();
    await whenOpening();
    givenTheReadSucceeds();

    await whenClicking('parametres-retry');

    expect(field().value).toBe('13');
  });

  it('should explain that the settings could not be read', async () => {
    givenTheReadFails();

    await whenOpening();

    expect(text('parametres-error')).toContain('Impossible de charger les paramètres.');
  });

  const givenTheDuration = (heures: number): void => {
    port.duree = new DureeMaxDActivite(heures);
  };
  const givenTheWriteIsPending = (): void => {
    port.ecritureDifferee = new DeferredFixture<void>().promise;
  };
  const givenTheWriteFails = (): void => {
    port.ecritureFailure = new Error('panne');
  };
  const givenTheReadFails = (): void => {
    port.lectureFailure = new Error('panne');
  };
  const givenTheReadSucceeds = (): void => {
    port.lectureFailure = undefined;
  };
  const whenOpening = async (): Promise<void> => {
    fixture = TestBed.createComponent(Parametres);
    await whenViewSettles();
  };
  const whenViewSettles = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
  };
  const whenTyping = async (saisie: string): Promise<void> => {
    const input = field();
    input.value = saisie;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const whenClicking = async (selector: string): Promise<void> => {
    button(selector).click();
    await whenViewSettles();
  };
  const whenSubmitting = async (): Promise<void> => {
    requiredFixture(document.querySelector<HTMLFormElement>(dataSelector('duree-form')), 'duree-form').requestSubmit();
    await whenViewSettles();
  };
  const field = (): HTMLInputElement => requiredFixture(document.querySelector<HTMLInputElement>(dataSelector('duree-max')), 'duree-max');
  const button = (selector: string): HTMLButtonElement =>
    requiredFixture(document.querySelector<HTMLButtonElement>(dataSelector(selector)), selector);
  const text = (selector: string): string => document.querySelector(dataSelector(selector))?.textContent.trim() ?? '';
});
