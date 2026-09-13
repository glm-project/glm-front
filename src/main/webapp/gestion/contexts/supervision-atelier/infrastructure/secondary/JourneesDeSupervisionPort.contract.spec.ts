import { Page } from '@/app/shared/pagination/domain/Page';
import { describe, expect, it } from 'vitest';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { JourneesDeSupervisionPort } from '../../domain/JourneesDeSupervisionPort';
import { InMemoryJourneesDeSupervision } from './InMemoryJourneesDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (page: Page<JourneeDeTravail> | Error): JourneesDeSupervisionPort => new InMemoryJourneesDeSupervision(page),
  },
])('$name working visit read contract', ({ create }) => {
  it('should read the open working visits with its completeness', async () => {
    const journeeFixture = JourneeDeTravail.open(new IdentifiantOperateur('alice'), 'EN_PAUSE');
    const port = create(new Page([journeeFixture], 1));

    const page = await port.read();

    expect(page.elements).toEqual([journeeFixture]);
    expect(page.isComplete()).toBe(true);
  });

  it('should reject a failed working visit read', async () => {
    const failureFixture = new Error('Visit source unavailable');
    const port = create(failureFixture);

    await expect(port.read()).rejects.toThrow('Visit source unavailable');
  });
  it('should expose the source total without treating a truncated visit collection as complete', async () => {
    const port = create(new Page([], 12));

    const page = await port.read();

    expect(page.elements).toEqual([]);
    expect(page.totalCount).toBe(12);
    expect(page.isComplete()).toBe(false);
  });
});
