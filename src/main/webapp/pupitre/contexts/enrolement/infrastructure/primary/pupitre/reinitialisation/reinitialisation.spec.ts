import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { ComptageDesGestesEnAttente, Reinitialisation } from './reinitialisation';

describe('Reinitialisation dialog', () => {
  let fixture: ComponentFixture<Reinitialisation>;
  let intentions: string[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Reinitialisation] });
    fixture = TestBed.createComponent(Reinitialisation);
    intentions = [];
    fixture.componentInstance.annule.subscribe(() => intentions.push('ANNULE'));
    fixture.componentInstance.confirme.subscribe(() => intentions.push('CONFIRME'));
    fixture.componentRef.setInput('gestesEnAttente', 0);
    fixture.detectChanges();
  });

  it('should say what a reset costs before anyone confirms it', () => {
    whenRendering();

    thenItAsks("Réinitialiser l'enrôlement ?");
    thenItWarns("L'enrôlement de cet appareil sera révoqué sur le serveur et le pupitre devra être ré-enrôlé.");
    thenItIsAModalDialogNamedByItsQuestion();
  });

  it.each([
    ['reset-cancel', 'ANNULE'],
    ['reset-confirm', 'CONFIRME'],
  ])('should report the %s intention as %s', (target, intention) => {
    whenRendering();

    whenPressing(target);

    thenTheIntentionsAre([intention]);
  });

  it('should not warn nor rename the confirmation when no gesture is waiting', () => {
    givenTheCount(0);

    whenRendering();

    thenNoPendingWarning();
    thenTheConfirmationReads('Réinitialiser');
    thenTheConfirmationIsAvailable(true);
  });

  it.each([
    [1, "1 geste n'a pas encore été envoyé au serveur. Il sera définitivement perdu."],
    [12, "12 gestes n'ont pas encore été envoyés au serveur. Ils seront définitivement perdus."],
  ])('should announce %s waiting gesture(s) and ask to confirm anyway', (count, warning) => {
    givenTheCount(count);

    whenRendering();

    thenItWarnsAboutPendingGestures(warning);
    thenTheConfirmationReads('Réinitialiser quand même');
    thenTheConfirmationIsAvailable(true);
  });

  it('should hold the confirmation back while the number of waiting gestures is unknown', () => {
    givenTheCount('EN_COURS');

    whenRendering();

    thenNoPendingWarning();
    thenTheConfirmationIsAvailable(false);
  });

  it('should warn generically and keep the confirmation available when the gestures could not be counted', () => {
    givenTheCount('ECHEC');

    whenRendering();

    thenItWarnsAboutPendingGestures("Des gestes n'ont peut-être pas été envoyés au serveur. Ils seront définitivement perdus.");
    thenTheConfirmationIsAvailable(true);
  });

  const givenTheCount = (comptage: ComptageDesGestesEnAttente): void => {
    fixture.componentRef.setInput('gestesEnAttente', comptage);
  };

  const whenRendering = (): void => {
    fixture.detectChanges();
  };

  const whenPressing = (selector: string): void => {
    element(selector).click();
  };

  const thenItAsks = (question: string): void => {
    expect(element('reset-title').textContent.trim()).toBe(question);
  };

  const thenItWarns = (message: string): void => {
    expect(element('reset-message').textContent.trim()).toBe(message);
  };

  const thenItIsAModalDialogNamedByItsQuestion = (): void => {
    const dialog = root().querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe(element('reset-title').id);
  };

  const thenItWarnsAboutPendingGestures = (message: string): void => {
    expect(element('reset-pending-warning').textContent.trim()).toBe(message);
  };

  const thenNoPendingWarning = (): void => {
    expect(root().querySelector(dataSelector('reset-pending-warning'))).toBeNull();
  };

  const thenTheConfirmationReads = (label: string): void => {
    expect(element('reset-confirm').textContent.trim()).toBe(label);
  };

  const thenTheConfirmationIsAvailable = (available: boolean): void => {
    expect((element('reset-confirm') as HTMLButtonElement).disabled).toBe(!available);
  };

  const thenTheIntentionsAre = (expected: string[]): void => {
    expect(intentions).toEqual(expected);
  };

  const element = (selector: string): HTMLElement => {
    const selected = root().querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Missing ${selector} fixture.`);
    return selected;
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});
