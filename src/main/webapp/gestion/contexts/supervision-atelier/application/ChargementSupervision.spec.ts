import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { beforeEach, describe, expect, it } from 'vitest';
import { DonneesDeSupervisionPort, LectureDeSupervision } from '../domain/DonneesDeSupervisionPort';
import { Instant } from '../domain/Instant';
import { ChargementSupervision } from './ChargementSupervision';

class DonneesFixture extends DonneesDeSupervisionPort {
  readCount = 0;
  private release: (lecture: LectureDeSupervision) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  private reject: (error: Error) => void = () => {
    throw new Error('Uninitialized fixture');
  };
  private announce: () => void = () => {
    throw new Error('Uninitialized fixture');
  };
  readonly arrived = new Promise<void>(resolve => {
    this.announce = resolve;
  });
  private readonly response = new Promise<LectureDeSupervision>((resolve, reject) => {
    this.release = resolve;
    this.reject = reject;
  });

  read(): Promise<LectureDeSupervision> {
    this.readCount += 1;
    this.announce();
    return this.response;
  }

  complete(): void {
    this.release({ status: 'complete', donnees: { operateurs: [], journees: [], activites: [] } });
  }

  fail(): void {
    this.reject(new Error('Source unavailable'));
  }
}

const maintenantFixture = new Instant('2026-09-13T10:00:00Z');

class ChargementFixture {
  readonly donnees = new DonneesFixture();
  readonly errorHandler = new ErrorHandlerFixture();
  readonly chargement: ChargementSupervision;

  constructor() {
    TestBed.configureTestingModule({
      providers: [
        ChargementSupervision,
        { provide: DonneesDeSupervisionPort, useValue: this.donnees },
        { provide: ErrorHandlerPort, useValue: this.errorHandler },
      ],
    });
    this.chargement = TestBed.inject(ChargementSupervision);
  }

  destroy(): void {
    TestBed.resetTestingModule();
  }
}

describe('ChargementSupervision', () => {
  let chargementFixture: ChargementFixture;
  beforeEach(() => {
    chargementFixture = new ChargementFixture();
  });

  it('should expose an initial source failure without a grid', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
  });

  it('should share the in-flight read when refresh is requested concurrently', async () => {
    const first = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    const second = chargementFixture.chargement.refresh(maintenantFixture);
    chargementFixture.donnees.complete();

    await Promise.all([first, second]);

    expect(chargementFixture.donnees.readCount).toBe(1);
    expect(chargementFixture.chargement.state().status).toBe('ready');
  });

  it('should discard a late successful response after the mounting injector is destroyed', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    const previous = chargementFixture.chargement.state();
    chargementFixture.destroy();
    chargementFixture.donnees.complete();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual(previous);
  });

  it('should discard a late failed response after the mounting injector is destroyed', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    const previous = chargementFixture.chargement.state();
    chargementFixture.destroy();
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual(previous);
  });

  it('should not start reads when refresh is requested after destruction', async () => {
    chargementFixture.destroy();

    await chargementFixture.chargement.refresh(maintenantFixture);

    expect(chargementFixture.donnees.readCount).toBe(0);
  });

  it('should route read failures to the error handler', async () => {
    const loading = chargementFixture.chargement.refresh(maintenantFixture);
    await chargementFixture.donnees.arrived;
    chargementFixture.donnees.fail();

    await loading;

    expect(chargementFixture.chargement.state()).toEqual({ status: 'failed', supervision: undefined });
    expect(chargementFixture.errorHandler.errors).toEqual([new Error('Source unavailable')]);
  });
});
