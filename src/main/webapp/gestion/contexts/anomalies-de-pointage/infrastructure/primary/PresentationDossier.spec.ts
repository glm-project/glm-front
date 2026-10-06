import { describe, expect, it } from 'vitest';
import { selectionInitiale } from './PresentationDossier';

describe('Initial selection of a dossier', () => {
  it('should select nothing while no dossier is read', () => {
    expect(selectionInitiale(undefined)).toBeUndefined();
  });
});
