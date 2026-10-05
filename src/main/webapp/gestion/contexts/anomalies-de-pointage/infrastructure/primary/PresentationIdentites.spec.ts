import { describe, expect, it } from 'vitest';
import { operateurOuIdentifiant } from './PresentationIdentites';

describe('Operator and workstation presentation', () => {
  it('should present the resolved operator name', () => {
    expect(operateurOuIdentifiant({ operateur: 'Ada Lovelace', operateurId: 'op-1' })).toBe('Ada Lovelace');
  });

  it('should fall back to the operator identity when the name is not resolved', () => {
    expect(operateurOuIdentifiant({ operateur: '', operateurId: 'op-1' })).toBe('op-1');
  });

  it('should present nothing when neither the name nor the identity is known', () => {
    expect(operateurOuIdentifiant({ operateur: '' })).toBe('');
  });
});
