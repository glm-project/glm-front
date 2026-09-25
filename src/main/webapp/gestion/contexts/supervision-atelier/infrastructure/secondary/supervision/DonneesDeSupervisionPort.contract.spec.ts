import { describe, expect, it } from 'vitest';
import { DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { InMemoryDonneesDeSupervision } from './InMemoryDonneesDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (): DonneesDeSupervisionPort => new InMemoryDonneesDeSupervision(),
  },
])('$name supervision data read contract', ({ create }) => {
  it('should read supervision data in which every activity belongs to a declared operator', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.filter(activite => !activite.hasOperateurIdentifiable(donnees.operateurs))).toEqual([]);
  });
});
