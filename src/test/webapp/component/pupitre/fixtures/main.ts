import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ConsoleErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler';
import { AcceptationLocaleDesGestes } from '@/pupitre/contexts/atelier/application/AcceptationLocaleDesGestes';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { SuiviDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { TimerDesignationExpirationScheduler } from '@/pupitre/contexts/atelier/infrastructure/secondary/TimerDesignationExpirationScheduler';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { PupitrePage } from '@/pupitre/page';
import { DeviceEnrolmentOutcome, DeviceEnrolmentPort } from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { Component, inject } from '@angular/core';
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
const authenticationFixture: Pick<AuthenticationPort, 'currentTenant' | 'synchronizeSession' | 'logout'> = {
  currentTenant: () => 'atelier',
  synchronizeSession: () => Promise.resolve(),
  logout: () => undefined,
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

const OUTCOME_BY_SCENARIO = new Map<string, DeviceEnrolmentOutcome>([
  ['denied', 'DENIED'],
  ['expired', 'EXPIRED'],
  ['unreachable', 'UNREACHABLE'],
]);
const NEVER_APPROVED = new Promise<DeviceEnrolmentOutcome>(() => undefined);
let enrolmentsRequested = 0;

const enrolmentFixture: DeviceEnrolmentPort = {
  enrol: showCode => {
    enrolmentsRequested += 1;
    const scenario = parameters.get('enrolment');
    if (scenario === null && enrolmentsRequested === 1) return Promise.resolve('ENROLLED');
    showCode({
      userCode: 'WDJB-MJHT',
      verificationUri: 'http://localhost:9080/realms/glmproject/device',
      verificationUriComplete: undefined,
      expiresIn: 125,
    });
    const outcome = OUTCOME_BY_SCENARIO.get(scenario ?? '');
    return outcome === undefined ? NEVER_APPROVED : Promise.resolve(outcome);
  },
};

const chargementProvider = {
  provide: ChargementDeLAtelierPort,
  useFactory: (): ChargementDeLAtelierPort => {
    const pupitre = inject(AtelierCoordinator);
    return {
      etat: () => ({ referentielDisponible: pupitre.referentiel() !== undefined, connecte: pupitre.connected() }),
      charger: () => pupitre.restore(),
    };
  },
};

const bootstrapFixture = async (): Promise<void> => {
  if (!parameters.has('reference-delay')) journalFixture.seedReferentiel('atelier', referentielFixture);
  const application = await bootstrapApplication(PupitrePageFixture, {
    providers: [
      AcceptationLocaleDesGestes,
      EtatHorsLigneDuPupitre,
      AtelierCoordinator,
      PupitreSynchronization,
      EnrolementDuPupitre,
      chargementProvider,
      { provide: DeviceEnrolmentPort, useValue: enrolmentFixture },
      { provide: JournauxDuPupitrePort, useValue: journalFixture },
      { provide: DesignationExpirationSchedulerPort, useClass: TimerDesignationExpirationScheduler },
      { provide: AuthenticationPort, useValue: authenticationFixture },
      { provide: AtelierExchangePort, useValue: serveurFixture },
      { provide: ErrorHandlerPort, useClass: ConsoleErrorHandler },
    ],
  });
  const enrolement = application.injector.get(EnrolementDuPupitre);
  if (parameters.has('reference-delay')) {
    window.addEventListener('pupitre-fixture-reference-ready', () => {
      journalFixture.seedReferentiel('atelier', referentielFixture);
      void enrolement.chargerLAtelier();
    });
  }
  void enrolement.enroler();
  if (parameters.has('delayed-append')) {
    const barrier = journalFixture.delayNextAppend();
    void barrier.started.then(() => {
      setTimeout(barrier.release, 2_000);
    });
  }
};

void bootstrapFixture();
