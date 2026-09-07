import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { Reinitialisation } from './reinitialisation';

describe('Reinitialisation dialog', () => {
  let fixture: ComponentFixture<Reinitialisation>;
  let intentions: string[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Reinitialisation] });
    fixture = TestBed.createComponent(Reinitialisation);
    intentions = [];
    fixture.componentInstance.annule.subscribe(() => intentions.push('ANNULE'));
    fixture.componentInstance.confirme.subscribe(() => intentions.push('CONFIRME'));
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
