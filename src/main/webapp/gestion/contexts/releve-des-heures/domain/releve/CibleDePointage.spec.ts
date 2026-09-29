import { ElementReleveId } from '../element/ElementReleveId';
import { PosteReleveId } from '../element/PosteReleveId';
import { CibleDePointage } from './CibleDePointage';

const cibleFixture = (element: string, poste?: string): CibleDePointage =>
  new CibleDePointage(new ElementReleveId(element), poste === undefined ? undefined : new PosteReleveId(poste));

describe('CibleDePointage', () => {
  it('should be the same as a target of the same element and the same workstation', () => {
    expect(cibleFixture('carter', 'dmu').estLaMeme(cibleFixture('carter', 'dmu'))).toBe(true);
  });

  it('should be the same as a target of the same element that names no workstation, both naming none', () => {
    expect(cibleFixture('carter').estLaMeme(cibleFixture('carter'))).toBe(true);
  });

  it('should not be the same as a target of the same element from another workstation', () => {
    expect(cibleFixture('carter', 'dmu').estLaMeme(cibleFixture('carter', 'mazak'))).toBe(false);
  });

  it('should not be the same as a target of the same element that names no workstation', () => {
    expect(cibleFixture('carter', 'dmu').estLaMeme(cibleFixture('carter'))).toBe(false);
  });

  it('should not be the same as a target of the same element for which it names none', () => {
    expect(cibleFixture('carter').estLaMeme(cibleFixture('carter', 'dmu'))).toBe(false);
  });

  it('should not be the same as a target of another element on the same workstation', () => {
    expect(cibleFixture('carter', 'dmu').estLaMeme(cibleFixture('bride', 'dmu'))).toBe(false);
  });
});
