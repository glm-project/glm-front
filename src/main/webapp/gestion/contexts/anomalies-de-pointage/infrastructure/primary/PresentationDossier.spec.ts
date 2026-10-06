import { describe, expect, it } from 'vitest';
import { faitDuGeste, libelleDuGeste, selectionInitiale } from './PresentationDossier';

describe('Initial selection of a dossier', () => {
  it('should select nothing while no dossier is read', () => {
    expect(selectionInitiale(undefined)).toBeUndefined();
  });
});

describe('Name of a fact outside the five gestures', () => {
  it.each([
    { type: 'FIN', intention: 'OUVERTURE', libelle: 'Fin · Ouverture' },
    { type: 'DEBUT', intention: '', libelle: 'Travail' },
    { type: '', intention: 'OUVERTURE', libelle: 'Ouverture' },
    { type: '', intention: '', libelle: '' },
  ] as const)('should name the type "$type" with the intention "$intention" as "$libelle"', ({ type, intention, libelle }) => {
    expect(libelleDuGeste({ type, intention })).toBe(libelle);
  });
});

describe('Gesture read from a choice', () => {
  it('should read no type and no intention from a choice that names none of the five gestures', () => {
    expect(faitDuGeste('')).toEqual({ type: '', intention: '' });
  });
});
