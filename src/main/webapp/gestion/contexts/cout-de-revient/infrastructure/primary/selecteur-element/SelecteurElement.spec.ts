import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CategorieDElementChiffre } from '../../../domain/element/CategorieDElementChiffre';
import { ElementChiffre } from '../../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../../domain/element/ElementChiffreId';
import { ElementDisponible } from '../../../domain/element/ElementDisponible';
import { SelecteurElement } from './SelecteurElement';

const elementsFixture: readonly ElementDisponible[] = [
  { id: new ElementChiffreId('of'), identite: new ElementChiffre('Ébauche', new CategorieDElementChiffre('OF')) },
  { id: new ElementChiffreId('z'), identite: new ElementChiffre('Zulu', new CategorieDElementChiffre('MOULE')) },
  { id: new ElementChiffreId('moule'), identite: new ElementChiffre('Ébauche', new CategorieDElementChiffre('MOULE')) },
  { id: new ElementChiffreId('a'), identite: new ElementChiffre('Alpha', new CategorieDElementChiffre('MOULE')) },
];

describe('Element selector projection and output', () => {
  let fixture: ComponentFixture<SelecteurElement>;
  let selections: ElementDisponible[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }] });
    fixture = TestBed.createComponent(SelecteurElement);
    fixture.componentRef.setInput('elements', elementsFixture);
    fixture.componentRef.setInput('elementCourant', 'moule');
    selections = [];
    fixture.componentInstance.selection.subscribe(element => {
      selections.push(element);
    });
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should show a neutral label when no identity is supplied', async () => {
    await whenRendered();

    expect(textOf('cout-identite')).toBe('Choisir un élément');
  });

  it('should render a supplied identity independently of the offered names', async () => {
    givenReportIdentity();

    await whenRendered();

    expect(textOf('cout-identite')).toBe('MOULE · Nouveau nom');
  });

  it('should sort matching names by their displayed category without mutating the collection', async () => {
    await whenRendered();

    await whenSearching('  EBAUCHE ');

    expect(offeredIdentities()).toEqual(['moule', 'of']);
    expect(elementsFixture.map(element => element.id.value)).toEqual(['of', 'z', 'moule', 'a']);
  });

  it('should emit the chosen identity through its public output', async () => {
    await whenRendered();

    await whenChoosing('of');

    expect(selections).toEqual([elementsFixture[0]]);
    expect(isPanelPresent()).toBe(false);
  });

  it('should close a current choice without emitting a new consultation', async () => {
    await whenRendered();

    await whenChoosing('moule');

    expect(selections).toEqual([]);
    expect(isPanelPresent()).toBe(false);
  });

  it('should keep ordinary keys inside an open choice without treating them as Escape', async () => {
    await whenRendered();

    await whenPressing('Tab');

    expect(isPanelPresent()).toBe(true);
  });

  it('should close the choice for Escape without emitting a selection', async () => {
    await whenRendered();

    await whenPressing('Escape');

    expect(isPanelPresent()).toBe(false);
    expect(selections).toEqual([]);
  });

  const givenReportIdentity = (): void => {
    fixture.componentRef.setInput('identite', new ElementChiffre('Nouveau nom', new CategorieDElementChiffre('MOULE')));
  };
  const whenRendered = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const whenOpening = async (): Promise<void> => {
    requiredElement('cout-element-trigger').click();
    await fixture.whenStable();
  };
  const whenSearching = async (value: string): Promise<void> => {
    await whenOpening();
    const input = requiredElement('cout-element-search');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Search fixture is not an input');
    }
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const whenChoosing = async (id: string): Promise<void> => {
    await whenOpening();
    const option = [...document.querySelectorAll<HTMLElement>(dataSelector('cout-element-option'))].find(
      element => element.dataset['element'] === id,
    );
    if (option === undefined) {
      throw new Error('Choice fixture is missing');
    }
    option.click();
    await fixture.whenStable();
  };
  const whenPressing = async (key: string): Promise<void> => {
    await whenOpening();
    requiredElement('cout-element-search').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
  };
  const requiredElement = (selector: string): HTMLElement => {
    const element = document.querySelector<HTMLElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Selector fixture ${selector} is missing`);
    }
    return element;
  };
  const textOf = (selector: string): string => requiredElement(selector).textContent.trim();
  const offeredIdentities = (): (string | undefined)[] =>
    [...document.querySelectorAll<HTMLElement>(dataSelector('cout-element-option'))].map(element => element.dataset['element']);
  const isPanelPresent = (): boolean => document.querySelector(dataSelector('cout-element-panel')) !== null;
});
