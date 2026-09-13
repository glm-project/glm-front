import { Page } from '@/app/shared/pagination/domain/Page';
import { describe, expect, it } from 'vitest';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { OperateursDeSupervisionPort } from '../../domain/OperateursDeSupervisionPort';
import { InMemoryOperateursDeSupervision } from './InMemoryOperateursDeSupervision';

describe.each([
  {
    name: 'InMemory',
    create: (page: Page<OperateurDeclare> | Error): OperateursDeSupervisionPort => new InMemoryOperateursDeSupervision(page),
  },
])('$name operator read contract', ({ create }) => {
  it('should read the declared operator reference with its completeness', async () => {
    const operateurFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
    const port = create(new Page([operateurFixture], 1));

    const page = await port.read();

    expect(page.elements).toEqual([operateurFixture]);
    expect(page.isComplete()).toBe(true);
  });
  it('should retain a reference independent of subsequent scenario array changes', async () => {
    const operateurFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
    const elementsFixture = [operateurFixture];
    const port = create(new Page(elementsFixture, 1));
    elementsFixture.length = 0;

    const page = await port.read();

    expect(page.elements).toEqual([operateurFixture]);
    expect(page.isComplete()).toBe(true);
  });

  it('should reject a failed operator read', async () => {
    const failureFixture = new Error('Operator source unavailable');
    const port = create(failureFixture);

    await expect(port.read()).rejects.toThrow('Operator source unavailable');
  });
  it('should expose the source total without treating a truncated reference as complete', async () => {
    const port = create(new Page([], 12));

    const page = await port.read();

    expect(page.elements).toEqual([]);
    expect(page.totalCount).toBe(12);
    expect(page.isComplete()).toBe(false);
  });
});
