import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/DesignationExpirationSchedulerPort';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/PupitreServerPort';
import { Designation } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { PupitreJournalFixture } from '@test/unit/fixtures/PupitreJournalFixture';

@Component({
  selector: 'glm-root',
  imports: [Designation],
  template: `
    @if (designation.operateur(); as operateur) {
      <div data-selector="designated-identity">{{ operateur.prenom }} {{ operateur.nom }}</div>
    } @else {
      <glm-designation />
    }
  `,
})
class DesignationFixture {
  readonly designation = inject(OfflinePupitre);
}

const journalFixture = new PupitreJournalFixture();
const authenticationFixture: Pick<AuthenticationPort, 'currentTenant' | 'synchronizeSession'> = {
  currentTenant: () => 'atelier',
  synchronizeSession: () => new Promise(resolve => setTimeout(resolve)),
};
const unexpectedNetworkFixture = (): Promise<never> => Promise.reject(new Error('Designation must not contact the server'));
const serveurFixture: PupitreServerPort = {
  referentiel: unexpectedNetworkFixture,
  send: unexpectedNetworkFixture,
  reread: unexpectedNetworkFixture,
};

void journalFixture
  .saveReferentiel('atelier', {
    operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
    suivis: [],
  })
  .then(() =>
    bootstrapApplication(DesignationFixture, {
      providers: [
        OfflinePupitre,
        PupitreSynchronization,
        { provide: PupitreJournalPort, useValue: journalFixture },
        { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
        { provide: AuthenticationPort, useValue: authenticationFixture },
        { provide: PupitreServerPort, useValue: serveurFixture },
      ],
    }),
  );
