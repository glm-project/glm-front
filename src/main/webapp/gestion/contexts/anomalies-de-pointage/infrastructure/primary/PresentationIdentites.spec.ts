import { describe, expect, it } from 'vitest';
import { operateurPresente, postePresente } from './PresentationIdentites';

describe('Operator and workstation presentation', () => {
  it('should present the resolved operator name', () => {
    expect(operateurPresente('Ada Lovelace')).toBe('Ada Lovelace');
  });

  it('should present an unresolved operator without any identity', () => {
    expect(operateurPresente('')).toBe('Opérateur non résolu');
  });

  it('should present the resolved workstation label', () => {
    expect(postePresente('Fraiseuse 1', 'poste-1')).toBe('Fraiseuse 1');
  });

  it('should present an unresolved workstation without any identity', () => {
    expect(postePresente('', 'poste-supprime')).toBe('Poste non résolu');
  });

  it.each([undefined, ''])('should present work clocked without a workstation as having none when the reference is %j', posteId => {
    expect(postePresente('', posteId)).toBe('Sans poste');
  });
});
