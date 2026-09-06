import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { SuiviDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { Designation } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation';
import { Pointage } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/pointage/pointage';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { PupitreHeader } from '@/pupitre/header/header';
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';

@Component({
  selector: 'glm-root',
  imports: [Designation, Pointage, PupitreHeader],
  host: { class: 'flex h-screen flex-col' },
  template: `
    <glm-pupitre-header
      heading="glmfront"
      [connected]="designation.connected()"
      [operateur]="designation.operateur()"
      [refus]="designation.refusAtelier()"
      [erreur]="designation.erreurAtelier()"
      (finRequested)="designation.finish()"
    />
    @if (designation.operateur(); as operateur) {
      <div class="hidden" data-selector="designated-identity">{{ operateur.prenom }} {{ operateur.nom }}</div>
      @if (designation.pointage(); as vue) {
        <glm-pointage [vue]="vue" [commander]="designation" />
      }
    } @else {
      <glm-designation />
    }
  `,
})
class DesignationFixture {
  readonly designation = inject(OfflinePupitre);
}

const journalFixture = new JournauxDuPupitreFixture();
const authenticationFixture: Pick<AuthenticationPort, 'currentTenant' | 'synchronizeSession'> = {
  currentTenant: () => 'atelier',
  synchronizeSession: () => new Promise(resolve => setTimeout(resolve)),
};
const unexpectedNetworkFixture = (): Promise<never> => Promise.reject(new Error('Designation must not contact the server'));
const serveurFixture: AtelierExchangePort = {
  referentiel: unexpectedNetworkFixture,
  send: unexpectedNetworkFixture,
  reread: unexpectedNetworkFixture,
};

const baseSuivis: SuiviDuPupitre[] = [
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `moule-${index + 1}`,
    nom: `PR-2026-${String(index + 1).padStart(6, '0')}`,
    reference: String(1015 + index),
    etat: 'EN_ATTENTE' as const,
    type: 'PRODUIT' as const,
    activites: [],
    evenements: [],
  })),
  ...Array.from({ length: new URLSearchParams(location.search).has('many') ? 72 : 21 }, (_, index) => ({
    id: `of-${index + 1}`,
    nom: `OF-2026-${String(index + 1).padStart(6, '0')}`,
    reference: String(204 + index),
    etat: 'EN_ATTENTE' as const,
    type: 'ORDRE_DE_FABRICATION' as const,
    activites: [],
    evenements: [],
  })),
];

void journalFixture
  .saveReferentiel('atelier', {
    operateurs: [
      {
        id: 'jean',
        nom: 'Dupont',
        prenom: 'Jean',
        matricule: '049',
        postes: [
          { id: 'tour', libelle: 'Tour' },
          { id: 'fraiseuse', libelle: 'Fraiseuse' },
        ],
      },
    ],
    suivis: baseSuivis,
  })
  .then(() =>
    bootstrapApplication(DesignationFixture, {
      providers: [
        OfflinePupitre,
        PupitreSynchronization,
        { provide: JournauxDuPupitrePort, useValue: journalFixture },
        { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
        { provide: AuthenticationPort, useValue: authenticationFixture },
        { provide: AtelierExchangePort, useValue: serveurFixture },
      ],
    }),
  );
