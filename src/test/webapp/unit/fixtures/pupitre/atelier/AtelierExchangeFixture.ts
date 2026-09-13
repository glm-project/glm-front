import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { ok, Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';

const scheduleOnTheRealClock = globalThis.setTimeout.bind(globalThis);

const emptyReferentiel = (): ReferentielDuPupitre => ({ operateurs: [], suivis: [] });

export class AtelierExchangeFixture extends AtelierExchangePort {
  private readonly suspended: (() => void)[] = [];
  private suspends = false;
  attempts = 0;
  reference: ReferentielDuPupitre = emptyReferentiel();

  override referentiel(): Promise<ReferentielDuPupitre> {
    return this.answer(() => structuredClone(this.reference));
  }

  override send(): Promise<Result<void, RefusDePublication>> {
    return this.answer(() => ok(undefined));
  }

  override reread(): Promise<void> {
    return this.answer(() => undefined);
  }

  suspendExchanges(): void {
    this.suspends = true;
  }

  settle(): void {
    this.suspends = false;
    for (const resume of this.suspended.splice(0)) resume();
  }

  private answer<T>(answer: () => T): Promise<T> {
    this.attempts += 1;
    return new Promise<T>(resolve => {
      const respond = (): void => {
        resolve(answer());
      };
      if (this.suspends) this.suspended.push(respond);
      else scheduleOnTheRealClock(respond);
    });
  }
}
