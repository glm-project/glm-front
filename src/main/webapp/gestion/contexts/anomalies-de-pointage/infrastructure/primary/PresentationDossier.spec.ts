import { describe, expect, it } from 'vitest';
import { pointageInitial } from './PresentationDossier';

describe('Initial selection of a dossier', () => {
  it('should select no pointage while no dossier is read', () => {
    expect(pointageInitial(undefined)).toBeUndefined();
  });
});
