import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { OperateurDuReleve } from '../../../domain/releve/OperateurDuReleve';
import { OperateurReleveId } from '../../../domain/releve/OperateurReleveId';
import { SelecteurOperateur } from './SelecteurOperateur';

const identitesFixture: readonly OperateurDuReleve[] = [
  { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
  { id: new OperateurReleveId('op-1'), identite: new IdentiteOperateur('Dupont', 'Jean') },
  { id: new OperateurReleveId('op-3'), identite: new IdentiteOperateur('Évrard', 'Alice') },
];

interface SelectorInputsFixture {
  readonly identite?: IdentiteOperateur;
  readonly operateurs?: readonly OperateurDuReleve[];
  readonly chargement?: boolean;
  readonly indisponible?: boolean;
}

describe('Operator selector rendering contract', () => {
  let fixture: ComponentFixture<SelecteurOperateur>;
  let choisi: OperateurReleveId | undefined;
  let retries: number;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] });
    fixture = TestBed.createComponent(SelecteurOperateur);
    choisi = undefined;
    retries = 0;
    fixture.componentInstance.choisi.subscribe(id => {
      choisi = id;
    });
    fixture.componentInstance.reessayer.subscribe(() => {
      retries += 1;
    });
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should emit the report identity of an operator selected through normalized search', async () => {
    await whenRendering({ identite: new IdentiteOperateur('Dupont', 'Jean'), operateurs: identitesFixture });

    await whenChoosingAnOperatorThroughSearch('  zOE  ');

    expect(choisi).toEqual(new OperateurReleveId('op-2'));
    expect(panelIsPresent()).toBe(false);
    expect(triggerIsFocused()).toBe(true);
  });

  it('should emit a retry request when the collection is unavailable', async () => {
    await whenRendering({ indisponible: true });

    await whenRetrying();

    expect(retries).toBe(1);
    expect(textOf('selecteur-operateur-erreur')).toContain('Impossible de charger les opérateurs');
  });

  it('should close the rendered search with Escape and return focus to its trigger', async () => {
    await whenRendering({ operateurs: identitesFixture });
    await whenOpening();

    await whenEscaping();

    expect(panelIsPresent()).toBe(false);
    expect(triggerIsFocused()).toBe(true);
  });

  it('should close the rendered search after a click outside the panel', async () => {
    await whenRendering({ operateurs: identitesFixture });
    await whenOpening();

    await whenClickingOutside();

    expect(panelIsPresent()).toBe(false);
  });

  const whenRendering = async (inputs: SelectorInputsFixture): Promise<void> => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.componentRef.setInput('courant', 'op-1');
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const whenOpening = async (): Promise<void> => {
    element('selecteur-operateur').click();
    await fixture.whenStable();
  };

  const whenChoosingAnOperatorThroughSearch = async (query: string): Promise<void> => {
    await whenOpening();
    const input = searchField();
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    element('selecteur-operateur-proposition').click();
    await fixture.whenStable();
  };

  const whenRetrying = async (): Promise<void> => {
    element('selecteur-operateur-reessayer').click();
    await fixture.whenStable();
  };

  const whenEscaping = async (): Promise<void> => {
    element('selecteur-operateur-recherche').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
  };

  const whenClickingOutside = async (): Promise<void> => {
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
  };

  const element = (selector: string): HTMLElement => {
    const root = fixture.nativeElement as HTMLElement;
    const found = root.querySelector<HTMLElement>(dataSelector(selector)) ?? document.querySelector<HTMLElement>(dataSelector(selector));
    if (found === null) {
      throw new Error(`Missing rendered control ${selector}`);
    }
    return found;
  };

  const searchField = (): HTMLInputElement => {
    const input = document.querySelector<HTMLInputElement>(dataSelector('selecteur-operateur-recherche'));
    if (input === null) {
      throw new Error('Missing search field');
    }
    return input;
  };

  const textOf = (selector: string): string => element(selector).textContent;
  const panelIsPresent = (): boolean => document.querySelector(dataSelector('selecteur-operateur-panneau')) !== null;
  const triggerIsFocused = (): boolean => document.activeElement === element('selecteur-operateur');
});
