import { Page } from '@/app/shared/pagination/domain/Page';
import { inject, Injectable } from '@angular/core';
import { ActivitesDeSupervisionPort } from '../../domain/ActivitesDeSupervisionPort';
import { DonneesDeSupervisionPort, LectureDeSupervision } from '../../domain/DonneesDeSupervisionPort';
import { JourneesDeSupervisionPort } from '../../domain/JourneesDeSupervisionPort';
import { OperateurDeclare } from '../../domain/OperateurDeclare';
import { OperateursDeSupervisionPort } from '../../domain/OperateursDeSupervisionPort';

@Injectable()
export class CompositeDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly operateurs = inject(OperateursDeSupervisionPort);
  private readonly journees = inject(JourneesDeSupervisionPort);
  private readonly activites = inject(ActivitesDeSupervisionPort);
  private reference: Page<OperateurDeclare> | undefined;

  async read(): Promise<LectureDeSupervision> {
    const reads = [
      this.readReference(),
      Promise.resolve().then(() => this.journees.read()),
      Promise.resolve().then(() => this.activites.read()),
    ] as const;
    try {
      const [operateurs, journees, activites] = await Promise.all(reads);
      if (![operateurs, journees, activites].every(page => page.isComplete())) {
        return { status: 'incomplete' };
      }
      return {
        status: 'complete',
        donnees: { operateurs: [...operateurs.elements], journees: [...journees.elements], activites: [...activites.elements] },
      };
    } finally {
      await Promise.allSettled(reads);
    }
  }

  private async readReference(): Promise<Page<OperateurDeclare>> {
    if (this.reference) {
      return this.reference;
    }
    const page = await this.operateurs.read();
    if (page.isComplete()) {
      this.reference = new Page([...page.elements], page.totalCount);
      return this.reference;
    }
    return page;
  }
}
