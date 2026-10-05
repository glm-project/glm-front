import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { JournauxDuPupitreFixture } from './JournauxDuPupitreFixture';

export class EffacementDesJournauxFixture extends EffacementDesJournauxPort {
  constructor(private readonly journaux: JournauxDuPupitreFixture) {
    super();
  }

  override discardAll(): Promise<void> {
    return this.journaux.eraseEveryJournal();
  }
}
