import { describe, expect, it } from 'vitest';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { erreursALire, faitDuGeste, gesteDuFait, libelleDuGeste, operateurManque, selectionInitiale } from './PresentationDossier';

describe('Initial selection of a dossier', () => {
  it('should select nothing while no dossier is read', () => {
    expect(selectionInitiale(undefined)).toBeUndefined();
  });
});

describe('Gesture a pointage signals', () => {
  it('should read back the type and the intention of the gesture it named', () => {
    const valeur = gesteDuFait({ type: 'NON_CONFORMITE', intention: 'TRANSITION' });

    expect(faitDuGeste(valeur)).toEqual({ type: 'NON_CONFORMITE', intention: 'TRANSITION' });
  });

  it('should read no type and no intention from the empty choice', () => {
    expect(faitDuGeste('')).toEqual({ type: '', intention: '' });
  });

  it('should signal nothing for a type and an intention that are not a gesture', () => {
    expect(gesteDuFait({ type: 'FIN', intention: 'OUVERTURE' })).toBe('');
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

describe('Errors of an entry to read', () => {
  it('should read the missing gesture once when neither the type nor the intention is known', () => {
    expect(erreursALire(['TYPE_REQUIS', 'INTENTION_REQUISE', 'OPERATEUR_REQUIS'])).toEqual(['TYPE_REQUIS', 'OPERATEUR_REQUIS']);
  });

  it('should keep a missing intention that the type does not already announce', () => {
    expect(erreursALire(['INTENTION_REQUISE'])).toEqual(['INTENTION_REQUISE']);
  });
});

describe('Operator missing from an entry', () => {
  const fait = { type: 'FIN', intention: 'FIN', activiteVisee: 'travail-8', operateur: 'op-camille', poste: '', instant: '' } as const;

  it.each([
    { saisie: SaisieActe.regularise(), manque: true },
    { saisie: SaisieActe.regularise({ ...fait, operateur: 'op-camille' }), manque: false },
    { saisie: SaisieActe.correct('fin-17', { ...fait, operateur: '' }), manque: true },
    { saisie: SaisieActe.cancel('fin-17'), manque: false },
    { saisie: SaisieActe.empty(), manque: false },
  ])('should say whether the operator is missing, $manque', ({ saisie, manque }) => {
    expect(operateurManque(saisie)).toBe(manque);
  });
});
