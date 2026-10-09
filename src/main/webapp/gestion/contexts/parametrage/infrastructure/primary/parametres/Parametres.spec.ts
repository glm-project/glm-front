import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { pngFixture } from '@test/unit/fixtures/gestion/parametrage/ImagesFixture';
import { ParametrageFixture } from '@test/unit/fixtures/gestion/parametrage/ParametrageFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { DureeMaxDActivite } from '../../../domain/DureeMaxDActivite';
import { ImageDuLogo } from '../../../domain/ImageDuLogo';
import { ParametragePort } from '../../../domain/ParametragePort';
import { VersionDuLogo } from '../../../domain/VersionDuLogo';
import { Parametres } from './Parametres';

const LOGO_FIXTURE = { version: new VersionDuLogo('0123456789abcdef'), image: new ImageDuLogo('data:image/png;base64,iVBORw0K') };

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

  it('should show the GLM logo while the company has none', async () => {
    await whenOpening();

    thenTheGlmLogoIsShown();
    expect(text('logo-legende')).toBe('Logo GLM');
  });

  it('should show the company logo at its real size', async () => {
    givenTheLogo();

    await whenOpening();

    thenTheLogoIsShownAtRealSize('data:image/png;base64,iVBORw0K');
    expect(text('logo-legende')).toBe('Taille réelle');
  });

  it('should say that the logo could not be shown, keeping the settings usable', async () => {
    givenTheLogo();
    givenTheImageFails();

    await whenOpening();

    expect(text('logo-indisponible')).toBe('Le logo n’a pas pu être affiché. Rechargez la page pour réessayer.');
    expect(field().value).toBe('13');
  });

  it('should send a PNG of 50 × 50 pixels as soon as it is chosen, then show it', async () => {
    await whenOpening();

    await whenChoosing(pngFixture(50, 50));

    expect(port.depots).toHaveLength(1);
    expect(text('logo-enregistre')).toBe('Logo enregistré.');
    thenTheLogoIsShownAtRealSize(requiredFixture(port.logo, 'logo déposé').image.adresse);
  });

  it('should refuse an image of the wrong size without sending it, saying what it measures', async () => {
    await whenOpening();

    await whenChoosing(pngFixture(300, 80));

    expect(text('logo-refus')).toBe('Le logo doit tenir dans 256 × 256 pixels (reçu : 300 × 80).');
    expect(port.depots).toEqual([]);
  });

  it('should show the reason the server refused the logo', async () => {
    givenTheServerRefusesLogos('format inattendu');
    await whenOpening();

    await whenChoosing(pngFixture(50, 50));

    expect(text('logo-refus')).toBe('Le logo a été refusé : format inattendu');
    expect(text('logo-enregistre')).toBe('');
  });

  it('should say the logo was not sent after a technical failure, and report it', async () => {
    givenTheDepositFails();
    await whenOpening();

    await whenChoosing(pngFixture(50, 50));

    expect(text('logo-erreur-technique')).toBe('Le logo n’a pas pu être envoyé. Vérifiez la connexion puis réessayez.');
    expect(errors.errors).toEqual([new Error('panne')]);
  });

  it('should send nothing when the choice of a file is cancelled', async () => {
    await whenOpening();

    await whenCancellingTheChoice();

    expect(port.depots).toEqual([]);
  });

  it('should open the file picker from the button', async () => {
    await whenOpening();
    const ouverture = givenThePickerIsWatched();

    await whenClicking('logo-choisir');

    expect(ouverture).toHaveBeenCalledTimes(1);
  });

  it('should not offer to remove a logo the company does not have', async () => {
    await whenOpening();

    thenTheRemovalIsNotOffered();
  });

  it('should ask to confirm the removal within the card, without removing yet', async () => {
    givenTheLogo();
    await whenOpening();

    await whenClicking('logo-retirer');

    expect(text('logo-retrait-confirmer')).toBe('Confirmer le retrait');
    expect(port.retraits).toBe(0);
  });

  it('should keep the logo when the removal is cancelled', async () => {
    givenTheLogo();
    await whenOpening();
    await whenClicking('logo-retirer');

    await whenClicking('logo-retrait-annuler');

    expect(text('logo-retirer')).toBe('Retirer le logo');
    expect(port.retraits).toBe(0);
  });

  it('should go back to the GLM logo once the removal is confirmed', async () => {
    givenTheLogo();
    await whenOpening();
    await whenClicking('logo-retirer');

    await whenClicking('logo-retrait-confirmer');

    thenTheGlmLogoIsShown();
    expect(text('logo-retire')).toBe('Logo retiré. Les en-têtes affichent le logo GLM.');
    thenTheRemovalIsNotOffered();
  });

  it('should say the logo was not removed after a technical failure, and report it', async () => {
    givenTheLogo();
    givenTheRemovalFails();
    await whenOpening();
    await whenClicking('logo-retirer');

    await whenClicking('logo-retrait-confirmer');

    expect(text('logo-erreur-retrait')).toBe('Le logo n’a pas pu être retiré. Vérifiez la connexion puis réessayez.');
    expect(errors.errors).toEqual([new Error('panne')]);
  });

  const thenTheRemovalIsNotOffered = (): void => {
    expect(document.querySelector(dataSelector('logo-retirer'))).toBeNull();
  };
  const givenTheRemovalFails = (): void => {
    port.retraitFailure = new Error('panne');
  };
  const givenTheServerRefusesLogos = (message: string): void => {
    port.refusDuServeur = message;
  };
  const givenTheDepositFails = (): void => {
    port.depotFailure = new Error('panne');
  };
  const givenThePickerIsWatched = (): ReturnType<typeof vi.fn> => {
    const ouverture = vi.fn();
    selecteur().click = ouverture;
    return ouverture;
  };
  const whenChoosing = async (octets: Uint8Array<ArrayBuffer>): Promise<void> => {
    await whenSelecting([new File([octets], 'logo.png', { type: 'image/png' })]);
  };
  const whenCancellingTheChoice = async (): Promise<void> => {
    await whenSelecting(null);
  };
  const whenSelecting = async (fichiers: readonly File[] | null): Promise<void> => {
    const input = selecteur();
    const liste = fichiers === null ? null : Object.assign([...fichiers], { item: (rang: number): File | null => fichiers[rang] ?? null });
    Object.defineProperty(input, 'files', { configurable: true, value: liste });
    input.dispatchEvent(new Event('change'));
    await whenViewSettles();
    await whenViewSettles();
  };
  const selecteur = (): HTMLInputElement =>
    requiredFixture(document.querySelector<HTMLInputElement>(dataSelector('logo-fichier')), 'logo-fichier');
  const thenTheGlmLogoIsShown = (): void => {
    expect(document.querySelector(dataSelector('logo-glm'))).not.toBeNull();
  };
  const thenTheLogoIsShownAtRealSize = (adresse: string): void => {
    const apercu = requiredFixture(document.querySelector<HTMLImageElement>(dataSelector('logo-apercu')), 'logo-apercu');
    expect(apercu.getAttribute('src')).toBe(adresse);
    expect(apercu.hasAttribute('width')).toBe(false);
  };
  const givenTheLogo = (): void => {
    port.logo = LOGO_FIXTURE;
  };
  const givenTheImageFails = (): void => {
    port.imageFailure = new Error('panne');
  };
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
