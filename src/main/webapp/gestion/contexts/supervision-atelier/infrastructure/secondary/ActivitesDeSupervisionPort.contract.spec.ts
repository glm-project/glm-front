import { Page } from '@/app/shared/pagination/domain/Page';
import { describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { ActivitesDeSupervisionPort } from '../../domain/ActivitesDeSupervisionPort';
import { CategorieActivite } from '../../domain/CategorieActivite';
import { IdentifiantActivite } from '../../domain/IdentifiantActivite';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { Instant } from '../../domain/Instant';
import { InMemoryActivitesDeSupervision } from './InMemoryActivitesDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (page: Page<ActiviteDeSupervision> | Error): ActivitesDeSupervisionPort => new InMemoryActivitesDeSupervision(page),
  },
])('$name activity read contract', ({ create }) => {
  it('should read the ongoing activities with its completeness', async () => {
    const activiteFixture = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: new IdentifiantOperateur('alice'),
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });
    const port = create(new Page([activiteFixture], 1));

    const page = await port.read();

    expect(page.elements).toEqual([activiteFixture]);
    expect(page.isComplete()).toBe(true);
  });

  it('should retain activities independent of subsequent scenario array changes', async () => {
    const activiteFixture = new ActiviteDeSupervision({
      id: new IdentifiantActivite('act-1'),
      operateurId: new IdentifiantOperateur('alice'),
      nom: 'OF-42',
      categorie: new CategorieActivite('NC'),
      debut: new Instant('2026-09-13T08:00:00Z'),
    });
    const elementsFixture = [activiteFixture];
    const port = create(new Page(elementsFixture, 1));
    elementsFixture.length = 0;

    const page = await port.read();

    expect(page.elements).toEqual([activiteFixture]);
    expect(page.isComplete()).toBe(true);
  });

  it('should reject a failed activity read', async () => {
    const failureFixture = new Error('Activity source unavailable');
    const port = create(failureFixture);

    await expect(port.read()).rejects.toThrow('Activity source unavailable');
  });
  it('should expose the source total without treating a truncated activity collection as complete', async () => {
    const port = create(new Page([], 12));

    const page = await port.read();

    expect(page.elements).toEqual([]);
    expect(page.totalCount).toBe(12);
    expect(page.isComplete()).toBe(false);
  });
});
