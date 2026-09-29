import { ElementReleveId } from '../element/ElementReleveId';
import { PosteReleveId } from '../element/PosteReleveId';
import { CibleDePointage } from './CibleDePointage';
import { EffetDePointage } from './EffetDePointage';

const cibleFixture = (element: string, poste?: string): CibleDePointage =>
  new CibleDePointage(new ElementReleveId(element), poste === undefined ? undefined : new PosteReleveId(poste));

const elementsClos = (cibles: readonly CibleDePointage[]): string[] =>
  new EffetDePointage(cibles).elementsClos().map(element => element.value);

describe('EffetDePointage', () => {
  it('should close no element when it closes no target', () => {
    expect(elementsClos([])).toEqual([]);
  });

  it('should close an element once when it closes it from two workstations', () => {
    expect(elementsClos([cibleFixture('carter', 'dmu'), cibleFixture('carter', 'mazak')])).toEqual(['carter']);
  });

  it('should close each element it closes targets of, in the order it closes them', () => {
    expect(elementsClos([cibleFixture('carter', 'dmu'), cibleFixture('bride', 'dmu'), cibleFixture('carter')])).toEqual([
      'carter',
      'bride',
    ]);
  });
});
