import { afterEach, describe, expect, it, vi } from 'vitest';
import { DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { InMemoryDonneesDeSupervision } from './InMemoryDonneesDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (): DonneesDeSupervisionPort => new InMemoryDonneesDeSupervision(),
  },
])('$name supervision data read contract', ({ create }) => {
  afterEach(() => vi.useRealTimers());

  it('should retain the evaluation of each complete acquisition', async () => {
    givenEvaluationAt('2026-09-13T10:00:00Z');
    const port = create();

    const premiere = await port.read();
    const suivante = await whenReadAt(port, '2026-09-13T10:00:30Z');

    expect(premiere.evaluation.value).toBe('2026-09-13T10:00:00.000Z');
    expect(suivante.evaluation.value).toBe('2026-09-13T10:00:30.000Z');
  });

  it('should read conflicting sequences separately from interpretable activities', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.sequencesEnConflit.length).toBeGreaterThan(0);
    expect(donnees.sequencesEnConflit.every(sequence => sequence.hasOperateurIdentifiable(donnees.operateurs))).toBe(true);
  });

  it('should represent personal work by its fabrication order in the demonstration', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.find(activite => activite.operateurId?.value === 'op-chevalier')?.objet).toMatchObject({
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF Perso',
    });
    expect(
      donnees.sequencesEnConflit.flatMap(sequence => sequence.activites).find(activite => activite.id.value === 'act-morel-a-resoudre')
        ?.objet,
    ).toMatchObject({
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF Perso',
    });
  });

  it('should read supervision data in which every activity belongs to a declared operator', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.filter(activite => !activite.hasOperateurIdentifiable(donnees.operateurs))).toEqual([]);
  });
});

const givenEvaluationAt = (instant: string): void => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
};

const whenReadAt = (port: DonneesDeSupervisionPort, instant: string) => {
  vi.setSystemTime(new Date(instant));
  return port.read();
};
