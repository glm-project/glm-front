import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { ElementAnomalie } from '../../../domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '../../../domain/dossier/ElementAnomalieId';
import { SelecteurElementAnomalie } from './SelecteurElementAnomalie';

const elementsFixture: readonly ElementAnomalie[] = [
  { id: new ElementAnomalieId('element-moule'), nom: 'Moule M-042', reference: 'M-042' },
  { id: new ElementAnomalieId('element-bielle'), nom: 'Bielle' },
  { id: new ElementAnomalieId('element-of'), nom: 'Étrier avant', reference: 'OF M24-0655' },
  { id: new ElementAnomalieId('element-axe'), nom: 'Axe', reference: 'OF M24-0001' },
];

interface InputsFixture {
  readonly courant?: string;
  readonly disabled?: boolean;
  readonly indisponible?: boolean;
  readonly elements?: readonly ElementAnomalie[];
}

describe('Anomaly element selector', () => {
  let fixture: ComponentFixture<SelecteurElementAnomalie>;
  let choisis: ElementAnomalieId[];
  let tousChoisis: number;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] });
    fixture = TestBed.createComponent(SelecteurElementAnomalie);
    choisis = [];
    tousChoisis = 0;
    fixture.componentInstance.choisi.subscribe(id => choisis.push(id));
    fixture.componentInstance.tousChoisis.subscribe(() => (tousChoisis += 1));
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should say that every element is concerned when no element is current', async () => {
    await whenRendering({ courant: '' });

    expect(textOf('anomalies-filtre-element')).toBe('Tous les éléments');
  });

  it('should name the current element with its reference when it has one', async () => {
    await whenRendering({ courant: 'element-moule' });

    expect(textOf('anomalies-filtre-element')).toBe('Moule M-042 · M-042');
  });

  it('should name the current element alone when it has no reference', async () => {
    await whenRendering({ courant: 'element-bielle' });

    expect(textOf('anomalies-filtre-element')).toBe('Bielle');
  });

  it('should offer the entry for every element first, then each element by name in alphabetical order', async () => {
    await whenRendering({ courant: '' });

    await whenOpening();

    expect(optionTexts()).toEqual([
      'Tous les éléments',
      'Axe · OF M24-0001',
      'Bielle',
      'Étrier avant · OF M24-0655',
      'Moule M-042 · M-042',
    ]);
    expect(currentOptionTexts()).toEqual(['Tous les éléments']);
  });

  it.each([
    { recherche: '  etrier  ', attendu: ['Étrier avant · OF M24-0655'] },
    { recherche: 'BIELLE', attendu: ['Bielle'] },
    { recherche: 'm24-0655', attendu: ['Étrier avant · OF M24-0655'] },
    { recherche: 'of m24', attendu: ['Axe · OF M24-0001', 'Étrier avant · OF M24-0655'] },
    { recherche: 'moule m-042', attendu: ['Moule M-042 · M-042'] },
  ])('should find $attendu when the manager searches "$recherche" without accents or case', async ({ recherche, attendu }) => {
    await whenRendering({ courant: '' });
    await whenOpening();

    await whenSearching(recherche);

    expect(optionTexts()).toEqual(attendu);
  });

  it('should say that no element matches a search that finds none', async () => {
    await whenRendering({ courant: '' });
    await whenOpening();

    await whenSearching('inconnu');

    expect(optionTexts()).toEqual([]);
    expect(textOf('anomalies-filtre-element-sans-resultat')).toBe('Aucun élément ne correspond à cette recherche');
  });

  it('should say that no element is available, not that none matches a search, when there is none and nothing is searched', async () => {
    await whenRendering({ courant: '', elements: [] });

    await whenOpening();

    expect(textOf('anomalies-filtre-element-sans-resultat')).toBe('Aucun élément disponible');
  });

  it('should emit the identity of the element chosen and return focus to the trigger', async () => {
    await whenRendering({ courant: '' });
    await whenOpening();
    await whenSearching('bielle');

    await whenChoosingTheFirstOption();

    expect(choisis).toEqual([new ElementAnomalieId('element-bielle')]);
    expect(panelIsPresent()).toBe(false);
    expect(document.activeElement).toBe(element('anomalies-filtre-element'));
  });

  it('should mark the current element among the options and not the entry for every element', async () => {
    await whenRendering({ courant: 'element-bielle' });

    await whenOpening();

    expect(currentOptionTexts()).toEqual(['Bielle']);
  });

  it('should announce that every element is chosen when the manager picks that entry while an element is current', async () => {
    await whenRendering({ courant: 'element-bielle' });
    await whenOpening();

    await whenChoosingTheFirstOption();

    expect(tousChoisis).toBe(1);
    expect(choisis).toEqual([]);
    expect(panelIsPresent()).toBe(false);
  });

  it('should announce nothing when the manager picks the entry for every element while it is already current', async () => {
    await whenRendering({ courant: '' });
    await whenOpening();

    await whenChoosingTheFirstOption();

    expect(tousChoisis).toBe(0);
    expect(panelIsPresent()).toBe(false);
  });

  it('should present an unresolved current reference without any identifier, right after the entry for every element', async () => {
    await whenRendering({ courant: 'element-supprime' });
    await whenOpening();

    expect(textOf('anomalies-filtre-element')).toBe('Élément non résolu (référence actuelle)');
    expect(optionTexts().slice(0, 2)).toEqual(['Tous les éléments', 'Élément non résolu (référence actuelle)']);
    expect(currentOptionTexts()).toEqual(['Élément non résolu (référence actuelle)']);
    thenNothingShowsTheIdentifier('element-supprime');
  });

  it('should keep the current element without calling it unresolved while the elements are unavailable', async () => {
    await whenRendering({ courant: 'moule-42', elements: [], disabled: true, indisponible: true });

    expect(textOf('anomalies-filtre-element')).toBe('Élément actuel conservé');
    thenNothingShowsTheIdentifier('moule-42');
  });

  it('should keep the unresolved reference and emit nothing when the manager selects it again', async () => {
    await whenRendering({ courant: 'element-supprime' });
    await whenOpening();

    await whenChoosingTheOptionNamed('Élément non résolu (référence actuelle)');

    expect(choisis).toEqual([]);
    expect(tousChoisis).toBe(0);
    expect(panelIsPresent()).toBe(false);
  });

  it('should not open while disabled', async () => {
    await whenRendering({ courant: '', disabled: true });

    thenTheTriggerIsDisabled();
  });

  it('should relate the trigger to its label', async () => {
    await whenRendering({ courant: '' });

    thenTheTriggerIsRelatedTo({ id: 'anomalies-element', labelledBy: 'anomalies-element-label anomalies-element-identite' });
  });

  const whenRendering = async (inputs: InputsFixture): Promise<void> => {
    fixture.componentRef.setInput('elements', inputs.elements ?? elementsFixture);
    fixture.componentRef.setInput('triggerId', 'anomalies-element');
    fixture.componentRef.setInput('labelId', 'anomalies-element-label');
    fixture.componentRef.setInput('selector', 'anomalies-filtre-element');
    for (const [name, value] of Object.entries(inputs)) {
      if (name !== 'elements') fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const whenOpening = async (): Promise<void> => {
    element('anomalies-filtre-element').click();
    await fixture.whenStable();
  };

  const whenSearching = async (recherche: string): Promise<void> => {
    const input = element('anomalies-filtre-element-recherche');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a search field');
    input.value = recherche;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };

  const whenChoosingTheFirstOption = async (): Promise<void> => {
    options()[0]?.click();
    await fixture.whenStable();
  };

  const whenChoosingTheOptionNamed = async (libelle: string): Promise<void> => {
    options()
      .find(option => option.textContent.trim() === libelle)
      ?.click();
    await fixture.whenStable();
  };

  const element = (selector: string): HTMLElement => {
    const found = document.querySelector<HTMLElement>(dataSelector(selector));
    if (found === null) throw new Error(`Missing rendered control ${selector}`);
    return found;
  };

  const thenNothingShowsTheIdentifier = (identifier: string): void => {
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(identifier);
  };

  const thenTheTriggerIsDisabled = (): void => {
    const trigger = element('anomalies-filtre-element');
    if (!(trigger instanceof HTMLButtonElement)) throw new Error('Expected a button trigger');
    expect(trigger.disabled).toBe(true);
  };

  const thenTheTriggerIsRelatedTo = (expected: { id: string; labelledBy: string }): void => {
    const trigger = element('anomalies-filtre-element');
    expect(trigger.id).toBe(expected.id);
    expect(trigger.getAttribute('aria-labelledby')).toBe(expected.labelledBy);
  };

  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(dataSelector('anomalies-filtre-element-proposition'))];
  const optionTexts = (): string[] => options().map(option => option.textContent.trim());
  const currentOptionTexts = (): string[] =>
    options()
      .filter(option => option.getAttribute('aria-current') === 'true')
      .map(option => option.textContent.trim());
  const textOf = (selector: string): string => element(selector).textContent.replace(/\s+/g, ' ').trim();
  const panelIsPresent = (): boolean => document.querySelector(dataSelector('anomalies-filtre-element-panneau')) !== null;
});
