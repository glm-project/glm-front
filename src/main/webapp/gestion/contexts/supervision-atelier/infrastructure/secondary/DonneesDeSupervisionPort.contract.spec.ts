import { Page } from '@/app/shared/pagination/domain/Page';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActiviteDeSupervision } from '../../domain/ActiviteDeSupervision';
import { ActivitesDeSupervisionPort } from '../../domain/ActivitesDeSupervisionPort';
import { DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { IdentifiantOperateur } from '../../domain/IdentifiantOperateur';
import { JourneeDeTravail } from '../../domain/JourneeDeTravail';
import { JourneesDeSupervisionPort } from '../../domain/JourneesDeSupervisionPort';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { OperateursDeSupervisionPort } from '../../domain/OperateursDeSupervisionPort';
import { CompositeDonneesDeSupervision } from './CompositeDonneesDeSupervision';

class LectureFixture<T> {
  private announce: () => void = () => {
    throw new Error('Uninitialized fixture');
  };
  private complete: (page: Page<T>) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  readonly arrived = new Promise<void>(resolve => {
    this.announce = resolve;
  });
  private readonly response = new Promise<Page<T>>(resolve => {
    this.complete = resolve;
  });

  read(): Promise<Page<T>> {
    this.announce();
    return this.response;
  }

  async release(page: Page<T>): Promise<void> {
    this.complete(page);
    await this.response;
  }
}

const aliceFixture = new OperateurDeclare(new IdentifiantOperateur('alice'), 'Martin', 'Alice');
const journeeFixture = JourneeDeTravail.open(aliceFixture.id, 'EN_PAUSE');

class DonneesFixture {
  readonly operateurs = new LectureFixture<OperateurDeclare>();
  readonly journees = new LectureFixture<JourneeDeTravail>();
  readonly activites = new LectureFixture<ActiviteDeSupervision>();
  readonly port: DonneesDeSupervisionPort;

  constructor(adapter: typeof CompositeDonneesDeSupervision) {
    TestBed.configureTestingModule({
      providers: [
        { provide: DonneesDeSupervisionPort, useClass: adapter },
        { provide: OperateursDeSupervisionPort, useValue: this.operateurs },
        { provide: JourneesDeSupervisionPort, useValue: this.journees },
        { provide: ActivitesDeSupervisionPort, useValue: this.activites },
      ],
    });
    this.port = TestBed.inject(DonneesDeSupervisionPort);
  }

  async arrived(): Promise<void> {
    await Promise.all([this.operateurs.arrived, this.journees.arrived, this.activites.arrived]);
  }

  async releaseSource(source: 'operateurs' | 'journees' | 'activites'): Promise<void> {
    switch (source) {
      case 'operateurs':
        return this.operateurs.release(new Page([aliceFixture], 1));
      case 'journees':
        return this.journees.release(new Page([journeeFixture], 1));
      case 'activites':
        return this.activites.release(new Page([], 0));
    }
  }
}

describe.each([{ name: 'Composite', adapter: CompositeDonneesDeSupervision }])('$name supervision data read contract', ({ adapter }) => {
  let donneesFixture: DonneesFixture;
  beforeEach(() => {
    donneesFixture = new DonneesFixture(adapter);
  });

  it.each([
    ['activites', 'journees', 'operateurs'],
    ['journees', 'activites', 'operateurs'],
    ['operateurs', 'journees', 'activites'],
    ['journees', 'operateurs', 'activites'],
    ['operateurs', 'activites', 'journees'],
    ['activites', 'operateurs', 'journees'],
  ] as const)('should return complete data only after %s, %s and %s resolve', async (first, second, last) => {
    let settled = false;
    const reading = donneesFixture.port.read().then(result => {
      settled = true;
      return result;
    });
    await donneesFixture.arrived();

    await donneesFixture.releaseSource(first);
    await donneesFixture.releaseSource(second);

    expect(settled).toBe(false);

    await donneesFixture.releaseSource(last);
    const result = await reading;

    expect(result).toEqual({ status: 'complete', donnees: { operateurs: [aliceFixture], journees: [journeeFixture], activites: [] } });
  });

  it.each([
    { source: 'operator reference', operateursTotal: 2, journeesTotal: 0, activitesTotal: 0 },
    { source: 'working visits', operateursTotal: 1, journeesTotal: 1, activitesTotal: 0 },
    { source: 'activities', operateursTotal: 1, journeesTotal: 0, activitesTotal: 1 },
  ])('should expose incomplete $source without returning partial data', async ({ operateursTotal, journeesTotal, activitesTotal }) => {
    const reading = donneesFixture.port.read();
    await donneesFixture.arrived();
    await donneesFixture.operateurs.release(new Page([aliceFixture], operateursTotal));
    await donneesFixture.journees.release(new Page([], journeesTotal));
    await donneesFixture.activites.release(new Page([], activitesTotal));

    const result = await reading;

    expect(result).toEqual({ status: 'incomplete' });
  });
});
