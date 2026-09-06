import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { AcceptationLocaleDesGestes } from '@/pupitre/contexts/atelier/application/AcceptationLocaleDesGestes';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { SuiviDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { PupitrePage } from '@/pupitre/page';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';

@Component({
  selector: 'glm-root',
  imports: [PupitrePage],
  template: '<glm-pupitre-page />',
})
class PupitrePageFixture {}

const journalFixture = new JournauxDuPupitreFixture();
journalFixture.answerReadsImmediately();
const authenticationFixture: Pick<AuthenticationPort, 'currentTenant' | 'synchronizeSession'> = {
  currentTenant: () => 'atelier',
  synchronizeSession: () => Promise.resolve(),
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

const referentielFixture = {
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
};

const parameters = new URLSearchParams(location.search);

const bootstrapFixture = async (): Promise<void> => {
  if (!parameters.has('reference-delay')) journalFixture.seedReferentiel('atelier', referentielFixture);
  const application = await bootstrapApplication(PupitrePageFixture, {
    providers: [
      AcceptationLocaleDesGestes,
      EtatHorsLigneDuPupitre,
      OfflinePupitre,
      PupitreSynchronization,
      { provide: JournauxDuPupitrePort, useValue: journalFixture },
      { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
      { provide: AuthenticationPort, useValue: authenticationFixture },
      { provide: AtelierExchangePort, useValue: serveurFixture },
    ],
  });
  const pupitre = application.injector.get(OfflinePupitre);
  if (parameters.has('reference-delay')) {
    window.addEventListener('pupitre-fixture-reference-ready', () => {
      journalFixture.seedReferentiel('atelier', referentielFixture);
      void pupitre.restore();
    });
  } else {
    await pupitre.restore();
  }
  if (parameters.has('delayed-append')) {
    const barrier = journalFixture.delayNextAppend();
    void barrier.started.then(() => {
      setTimeout(barrier.release, 2_000);
    });
  }
};

void bootstrapFixture();
