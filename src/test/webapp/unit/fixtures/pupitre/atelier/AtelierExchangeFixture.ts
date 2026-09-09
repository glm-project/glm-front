import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';

const emptyReferentiel = (): ReferentielDuPupitre => ({ operateurs: [], suivis: [] });

export class AtelierExchangeFixture extends AtelierExchangePort {
  private readonly suspended: ((referentiel: ReferentielDuPupitre) => void)[] = [];
  private suspends = false;
  reference: ReferentielDuPupitre = emptyReferentiel();

  override referentiel(): Promise<ReferentielDuPupitre> {
    if (!this.suspends) return Promise.resolve(structuredClone(this.reference));
    return new Promise<ReferentielDuPupitre>(resolve => {
      this.suspended.push(resolve);
    });
  }

  override send(): Promise<void> {
    return Promise.resolve();
  }

  override reread(): Promise<void> {
    return Promise.resolve();
  }

  suspendReferentiel(): void {
    this.suspends = true;
  }

  settle(): void {
    for (const resolve of this.suspended.splice(0)) resolve(emptyReferentiel());
  }
}
