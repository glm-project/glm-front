import { JournauxDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/JournauxDeLAtelierPort';
import { DeferredFixture } from '../../DeferredFixture';

const scheduleOnTheRealClock = globalThis.setTimeout.bind(globalThis);

const answerOnNextTask = <T>(value: T): Promise<T> => new Promise(resolve => scheduleOnTheRealClock(() => resolve(value)));

export class JournauxDeLAtelierFixture extends JournauxDeLAtelierPort {
  pending = 0;
  erasures = 0;
  private nextCount: DeferredFixture<number> | undefined;
  private nextErasure: DeferredFixture<void> | undefined;

  override pendingGestures(): Promise<number> {
    const nextCount = this.nextCount;
    this.nextCount = undefined;
    return nextCount?.promise ?? answerOnNextTask(this.pending);
  }

  override discardAll(): Promise<void> {
    this.erasures += 1;
    const nextErasure = this.nextErasure;
    this.nextErasure = undefined;
    return nextErasure?.promise ?? answerOnNextTask(undefined);
  }

  holdNextCount(): DeferredFixture<number> {
    this.nextCount = new DeferredFixture<number>();
    return this.nextCount;
  }

  holdNextErasure(): DeferredFixture<void> {
    this.nextErasure = new DeferredFixture<void>();
    return this.nextErasure;
  }
}
