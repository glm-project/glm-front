import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { PupitreHorsLigne } from '@/pupitre/contexts/atelier/application/PupitreHorsLigne';
import { SynchronisationDuPupitre } from '@/pupitre/contexts/atelier/application/SynchronisationDuPupitre';
import { JournalDuPupitrePort } from '@/pupitre/contexts/atelier/domain/JournalDuPupitrePort';
import { PlanificationExpirationDesignationPort } from '@/pupitre/contexts/atelier/domain/PlanificationExpirationDesignationPort';
import { ServeurDuPupitrePort } from '@/pupitre/contexts/atelier/domain/ServeurDuPupitrePort';
import { Designation } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation';
import { DesignationRuntime } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/DesignationRuntime';
import { TimerPlanificationExpirationDesignation } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerPlanificationExpirationDesignation';
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { JournalDuPupitreFixture } from '@test/unit/fixtures/JournalDuPupitreFixture';

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
  readonly designation = inject(PupitreHorsLigne);
}

const journalFixture = new JournalDuPupitreFixture();
const authenticationFixture: Pick<AuthenticationPort, 'currentTenant' | 'synchronizeSession'> = {
  currentTenant: () => 'atelier',
  synchronizeSession: () => new Promise(resolve => setTimeout(resolve)),
};
const unexpectedNetworkFixture = (): Promise<never> => Promise.reject(new Error('Designation must not contact the server'));
const serveurFixture: ServeurDuPupitrePort = {
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
        DesignationRuntime,
        PupitreHorsLigne,
        SynchronisationDuPupitre,
        { provide: JournalDuPupitrePort, useValue: journalFixture },
        { provide: PlanificationExpirationDesignationPort, useClass: TimerPlanificationExpirationDesignation },
        { provide: AuthenticationPort, useValue: authenticationFixture },
        { provide: ServeurDuPupitrePort, useValue: serveurFixture },
      ],
    }),
  );
