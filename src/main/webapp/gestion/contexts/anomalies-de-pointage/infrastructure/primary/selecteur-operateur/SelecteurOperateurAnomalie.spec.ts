import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { PosteAnomalieId } from '../../../domain/dossier/PosteAnomalieId';
import { OperateurAnomalie } from '../../../domain/dossier/ReferentielAnomalies';
import { SelecteurOperateurAnomalie } from './SelecteurOperateurAnomalie';

const operateursFixture: readonly OperateurAnomalie[] = [
  { id: new OperateurAnomalieId('op-dupont'), nom: 'Jean Dupont', code: '012', postesHabilites: [] },
  { id: new OperateurAnomalieId('op-evrard'), nom: 'Zoé Évrard', postesHabilites: [new PosteAnomalieId('poste-tour')] },
  { id: new OperateurAnomalieId('op-martin'), nom: 'Camille Martin', code: '007', postesHabilites: [] },
];

interface InputsFixture {
  readonly courant?: string;
  readonly disabled?: boolean;
  readonly describedBy?: string;
  readonly avecTous?: boolean;
  readonly operateurs?: readonly OperateurAnomalie[];
}

describe('Anomaly operator selector', () => {
  let fixture: ComponentFixture<SelecteurOperateurAnomalie>;
  let choisis: OperateurAnomalieId[];
  let tousChoisis: number;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] });
    fixture = TestBed.createComponent(SelecteurOperateurAnomalie);
    choisis = [];
    tousChoisis = 0;
    fixture.componentInstance.choisi.subscribe(id => choisis.push(id));
    fixture.componentInstance.tousChoisis.subscribe(() => (tousChoisis += 1));
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should invite the manager to choose when no operator is current', async () => {
    await whenRendering({ courant: '' });

    expect(textOf('anomalie-operateur')).toBe('Choisissez l’opérateur');
  });

  it('should name the current operator with its pupitre code', async () => {
    await whenRendering({ courant: 'op-martin' });

    expect(textOf('anomalie-operateur')).toBe('Camille Martin · 007');
  });

  it('should name the current operator without a code when the company assigns none', async () => {
    await whenRendering({ courant: 'op-evrard' });

    expect(textOf('anomalie-operateur')).toBe('Zoé Évrard');
  });

  it('should offer every operator named with its code when it has one, in the order received', async () => {
    await whenRendering({ courant: '' });

    await whenOpening();

    expect(optionTexts()).toEqual(['Jean Dupont · 012', 'Zoé Évrard', 'Camille Martin · 007']);
  });

  it.each([
    { recherche: '  zOE  ', attendu: ['Zoé Évrard'] },
    { recherche: 'evrard', attendu: ['Zoé Évrard'] },
    { recherche: 'camille', attendu: ['Camille Martin · 007'] },
    { recherche: '007', attendu: ['Camille Martin · 007'] },
    { recherche: 'jean dupont', attendu: ['Jean Dupont · 012'] },
  ])('should find $attendu when the manager searches "$recherche" without accents or case', async ({ recherche, attendu }) => {
    await whenRendering({ courant: '' });
    await whenOpening();

    await whenSearching(recherche);

    expect(optionTexts()).toEqual(attendu);
  });

  it('should say that no operator matches a search that finds none', async () => {
    await whenRendering({ courant: '' });
    await whenOpening();

    await whenSearching('inconnu');

    expect(optionTexts()).toEqual([]);
    expect(textOf('anomalie-operateur-sans-resultat')).toBe('Aucun opérateur ne correspond à cette recherche');
  });

  it('should emit the identity of the operator chosen and return focus to the trigger', async () => {
    await whenRendering({ courant: '' });
    await whenOpening();
    await whenSearching('zoe');

    await whenChoosingTheFirstOption();

    expect(choisis).toEqual([new OperateurAnomalieId('op-evrard')]);
    expect(panelIsPresent()).toBe(false);
    expect(document.activeElement).toBe(element('anomalie-operateur'));
  });

  it('should mark the current operator among the options', async () => {
    await whenRendering({ courant: 'op-martin' });

    await whenOpening();

    expect(currentOptionTexts()).toEqual(['Camille Martin · 007']);
  });

  it('should present an unresolved current reference on the trigger without any identifier', async () => {
    await whenRendering({ courant: 'op-supprime' });

    expect(textOf('anomalie-operateur')).toBe('Opérateur non résolu (référence actuelle)');
    thenNothingShowsTheIdentifier('op-supprime');
  });

  it('should keep an unresolved current reference selected as the first option', async () => {
    await whenRendering({ courant: 'op-supprime' });

    await whenOpening();

    expect(optionTexts()).toEqual(['Opérateur non résolu (référence actuelle)', 'Jean Dupont · 012', 'Zoé Évrard', 'Camille Martin · 007']);
    expect(currentOptionTexts()).toEqual(['Opérateur non résolu (référence actuelle)']);
  });

  it('should keep the unresolved reference and emit nothing when the manager selects it again', async () => {
    await whenRendering({ courant: 'op-supprime' });
    await whenOpening();

    await whenChoosingTheFirstOption();

    expect(choisis).toEqual([]);
    expect(panelIsPresent()).toBe(false);
  });

  it('should leave the unresolved reference out of a search that does not look for it', async () => {
    await whenRendering({ courant: 'op-supprime' });
    await whenOpening();

    await whenSearching('martin');

    expect(optionTexts()).toEqual(['Camille Martin · 007']);
  });

  it('should not offer an entry for every operator unless asked to', async () => {
    await whenRendering({ courant: '' });

    await whenOpening();

    expect(optionTexts()).not.toContain('Tous les opérateurs');
  });

  it('should say that every operator is concerned when asked to offer that entry and no operator is current', async () => {
    await whenRendering({ courant: '', avecTous: true });

    expect(textOf('anomalie-operateur')).toBe('Tous les opérateurs');
  });

  it('should offer the entry for every operator first and mark it as current when no operator is current', async () => {
    await whenRendering({ courant: '', avecTous: true });

    await whenOpening();

    expect(optionTexts()).toEqual(['Tous les opérateurs', 'Jean Dupont · 012', 'Zoé Évrard', 'Camille Martin · 007']);
    expect(currentOptionTexts()).toEqual(['Tous les opérateurs']);
  });

  it('should name the current operator and not mark the entry for every operator when one is current', async () => {
    await whenRendering({ courant: 'op-martin', avecTous: true });

    await whenOpening();

    expect(textOf('anomalie-operateur')).toBe('Camille Martin · 007');
    expect(currentOptionTexts()).toEqual(['Camille Martin · 007']);
  });

  it('should announce that every operator is chosen, close and return focus to the trigger when the manager picks that entry', async () => {
    await whenRendering({ courant: 'op-martin', avecTous: true });
    await whenOpening();

    await whenChoosingTheFirstOption();

    expect(tousChoisis).toBe(1);
    expect(choisis).toEqual([]);
    expect(panelIsPresent()).toBe(false);
    expect(document.activeElement).toBe(element('anomalie-operateur'));
  });

  it('should announce nothing when the manager picks the entry for every operator while it is already current', async () => {
    await whenRendering({ courant: '', avecTous: true });
    await whenOpening();

    await whenChoosingTheFirstOption();

    expect(tousChoisis).toBe(0);
    expect(panelIsPresent()).toBe(false);
  });

  it('should leave the entry for every operator out of a search', async () => {
    await whenRendering({ courant: '', avecTous: true });
    await whenOpening();

    await whenSearching('martin');

    expect(optionTexts()).toEqual(['Camille Martin · 007']);
  });

  it('should keep an unresolved current reference right after the entry for every operator', async () => {
    await whenRendering({ courant: 'op-supprime', avecTous: true });
    await whenOpening();

    expect(textOf('anomalie-operateur')).toBe('Opérateur non résolu (référence actuelle)');
    expect(optionTexts().slice(0, 2)).toEqual(['Tous les opérateurs', 'Opérateur non résolu (référence actuelle)']);
    expect(currentOptionTexts()).toEqual(['Opérateur non résolu (référence actuelle)']);
  });

  it('should not open while disabled', async () => {
    await whenRendering({ courant: '', disabled: true });

    thenTheTriggerIsDisabled();
  });

  it('should relate the trigger to its label and to the message describing it', async () => {
    await whenRendering({ courant: '', describedBy: 'operateur-acte-erreur' });

    thenTheTriggerIsRelatedTo({
      id: 'operateur-acte',
      describedBy: 'operateur-acte-erreur',
      labelledBy: 'operateur-acte-label operateur-acte-identite',
    });
  });

  it('should close the search with Escape and return focus to the trigger', async () => {
    await whenRendering({ courant: '' });
    await whenOpening();

    await whenEscaping();

    expect(panelIsPresent()).toBe(false);
    expect(document.activeElement).toBe(element('anomalie-operateur'));
  });

  const whenRendering = async (inputs: InputsFixture): Promise<void> => {
    fixture.componentRef.setInput('operateurs', inputs.operateurs ?? operateursFixture);
    fixture.componentRef.setInput('triggerId', 'operateur-acte');
    fixture.componentRef.setInput('labelId', 'operateur-acte-label');
    fixture.componentRef.setInput('selector', 'anomalie-operateur');
    for (const [name, value] of Object.entries(inputs)) {
      if (name !== 'operateurs') fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const whenOpening = async (): Promise<void> => {
    element('anomalie-operateur').click();
    await fixture.whenStable();
  };

  const whenSearching = async (recherche: string): Promise<void> => {
    const input = element('anomalie-operateur-recherche');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a search field');
    input.value = recherche;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };

  const whenEscaping = async (): Promise<void> => {
    element('anomalie-operateur-recherche').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
  };

  const whenChoosingTheFirstOption = async (): Promise<void> => {
    options()[0]?.click();
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
  const thenTheTriggerIsRelatedTo = (expected: { id: string; describedBy: string; labelledBy: string }): void => {
    const trigger = element('anomalie-operateur');
    expect(trigger.id).toBe(expected.id);
    expect(trigger.getAttribute('aria-describedby')).toBe(expected.describedBy);
    expect(trigger.getAttribute('aria-labelledby')).toBe(expected.labelledBy);
  };

  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(dataSelector('anomalie-operateur-proposition'))];
  const optionTexts = (): string[] => options().map(option => option.textContent.trim());
  const currentOptionTexts = (): string[] =>
    options()
      .filter(option => option.getAttribute('aria-current') === 'true')
      .map(option => option.textContent.trim());
  const thenTheTriggerIsDisabled = (): void => {
    const trigger = element('anomalie-operateur');
    if (!(trigger instanceof HTMLButtonElement)) throw new Error('Expected a button trigger');
    expect(trigger.disabled).toBe(true);
  };
  const textOf = (selector: string): string => element(selector).textContent.replace(/\s+/g, ' ').trim();
  const panelIsPresent = (): boolean => document.querySelector(dataSelector('anomalie-operateur-panneau')) !== null;
});
