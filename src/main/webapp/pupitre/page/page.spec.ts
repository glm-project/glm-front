import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { IntentionGlobale } from '@/pupitre/contexts/atelier/application/CommandeGlobale';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { FraicheurDuReferentiel } from '@/pupitre/contexts/atelier/application/FraicheurDuReferentiel';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
import { ExecutionDePointage, IntentionDePointage } from '@/pupitre/contexts/atelier/application/PointageCommand';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { ActiviteExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/ActiviteExpirationSchedulerPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { CommandesGlobales } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/CommandesGlobales';
import { IdentiteOperateurDesigne } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/OperateurDesigne';
import { ElementDePointage, VueDePointage } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/VueDePointage';
import { NumeroDElement } from '@/pupitre/contexts/atelier/domain/designation/NumeroDElement';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { EMPTY_JOURNAL_DU_PUPITRE, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { RetardDePublication } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/RetardDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';
import { DeviceEnrolmentPort } from '@/pupitre/shared/authentication/domain/DeviceEnrolmentPort';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierExchangeFixture } from '@test/unit/fixtures/pupitre/atelier/AtelierExchangeFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { DeviceSessionFixture } from '@test/unit/fixtures/pupitre/DeviceSessionFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { setTimeout as roundTrip } from 'node:timers';
import { PupitrePage } from './page';

const referentielFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
  suivis: [],
};
const operateurFixture: IdentiteOperateurDesigne = { id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049' };
const pointageFixture: VueDePointage = {
  conflits: [],
  moules: [],
  ordresDeFabrication: [new ElementDePointage('of-1', NumeroDElement.assigned('204'), undefined)],
};

class AtelierCoordinatorFixture {
  readonly connected = signal(true);
  readonly operateur = signal<IdentiteOperateurDesigne | undefined>(undefined);
  readonly echecCaptureLocale = signal(false);
  readonly refusAtelier = signal<ReturnType<CurrentOperateurLifecycle['refusAtelier']>>(undefined);
  readonly pointage = signal<VueDePointage | undefined>(undefined);
  readonly gestesDisponibles = signal(true);
  readonly commandesGlobales = signal(new CommandesGlobales({ activiteEnCours: true, pauseEnCours: true }));
  readonly code = signal('');
  readonly unknownCode = signal(false);
  readonly canValidate = signal(true);
  readonly retardDePublication = signal<RetardDePublication | undefined>(undefined);
  readonly globales: IntentionGlobale[] = [];
  readonly pointages: IntentionDePointage[] = [];
  registerPress = vi.fn(() => true);
  updateClock = vi.fn();
  finish = vi.fn<() => Promise<void>>(() => Promise.resolve());
  private readonly reference = signal<ReferentielDuPupitre | undefined>(undefined);

  referentiel(): ReferentielDuPupitre | undefined {
    return this.reference();
  }

  publishReference(): void {
    this.reference.set(referentielFixture);
  }

  enterDigit(digit: string): void {
    this.code.set(`${this.code()}${digit}`);
  }

  erase(): void {
    this.code.set('');
  }

  validate(): Promise<void> {
    return Promise.resolve();
  }

  execute(intention: IntentionDePointage): ExecutionDePointage {
    this.pointages.push(intention);
    return { kind: 'CAPTURE', completion: Promise.resolve() };
  }

  executeGlobale(intention: IntentionGlobale): Promise<void> {
    this.globales.push(intention);
    return Promise.resolve();
  }
}

class EnrolementDuPupitreFixture {
  readonly vue = computed<VueDEnrolement>(() =>
    this.pupitre.referentiel() === undefined ? { kind: 'VALIDE_CHARGEMENT_ATELIER' } : { kind: 'ENROLE_ET_PRET' },
  );

  constructor(private readonly pupitre: AtelierCoordinatorFixture) {}

  resets = 0;

  rafraichir(): void {
    return undefined;
  }

  enroler(): Promise<void> {
    return Promise.resolve();
  }

  chargerLAtelier(): Promise<void> {
    return Promise.resolve();
  }

  reinitialiser(): Promise<void> {
    this.resets += 1;
    return Promise.resolve();
  }
}

describe('Pupitre page', () => {
  let fixture: ComponentFixture<PupitrePage>;
  let pupitre: AtelierCoordinatorFixture;
  let enrolement: EnrolementDuPupitreFixture;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(() => {
    vi.useFakeTimers();
    pupitre = new AtelierCoordinatorFixture();
    enrolement = new EnrolementDuPupitreFixture(pupitre);
    errorHandler = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      imports: [PupitrePage],
      providers: [
        { provide: AtelierCoordinator, useValue: pupitre },
        { provide: EtatHorsLigneDuPupitre, useValue: pupitre },
        { provide: CurrentOperateurLifecycle, useValue: pupitre },
        { provide: EnrolementDuPupitre, useValue: enrolement },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    });
    fixture = TestBed.createComponent(PupitrePage);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep the enrolment screen under the header before a reference arrives', () => {
    thenVisible('pupitre-header', true);
    thenVisible('enrolement', true);
    thenVisible('designation', false);
  });

  it('should show the keypad when a reference arrives', () => {
    givenReference();

    thenVisible('enrolement', false);
    thenVisible('designation', true);
  });

  it('should count a keypad press once while the keypad owns its command', () => {
    givenReference();

    whenPressing('digit-4');

    expect(pupitre.registerPress).toHaveBeenCalledOnce();
    expect(pupitre.code()).toBe('4');
  });

  it('should route tile and global intentions after guarding their page press', () => {
    givenPointage();

    whenHolding('primary-target');
    whenHolding('pause');
    whenHolding('resume');
    whenHolding('stop-all');
    whenPressing('finish');

    expect(pupitre.registerPress).toHaveBeenCalledTimes(5);
    expect(pupitre.pointages).toEqual([{ suiviId: 'of-1', cible: 'PRINCIPALE' }]);
    expect(pupitre.globales).toEqual(['PAUSE', 'REPRENDRE', 'TOUT_ARRETER']);
    expect(pupitre.finish).toHaveBeenCalledOnce();
  });

  it('should relay the activity command availability to the pointage screen', () => {
    givenPointage();

    givenPause(false);
    whenRenderingThePage();

    expect((element('resume') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show the local pause while offering REPRENDRE', () => {
    givenPointage();
    givenPause(true);

    whenRenderingThePage();

    thenHeaderPauseIs('En pause');
    expect((element('resume') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should consume the click following a refused page press and accept the next complete press', () => {
    givenPointage();
    givenTheNextPagePressIsRefused();

    whenPressing('finish');
    whenPressing('finish');

    expect(pupitre.finish).toHaveBeenCalledOnce();
  });

  it('should display the requested workstation choice', () => {
    givenPointage({
      kind: 'CHOIX_POSTE_REQUIS',
      numero: NumeroDElement.assigned('204'),
      postes: [{ id: 'tour', libelle: 'Tour' }],
      choose: () => Promise.resolve(),
    });
    whenHolding('primary-target');

    thenVisible('workstation-dialog', true);
  });

  it('should remove the workstation choice when pointage closes', () => {
    givenPointage({
      kind: 'CHOIX_POSTE_REQUIS',
      numero: NumeroDElement.assigned('204'),
      postes: [{ id: 'tour', libelle: 'Tour' }],
      choose: () => Promise.resolve(),
    });
    whenHolding('primary-target');
    whenPointageCloses();

    thenVisible('workstation-dialog', false);
  });

  it.each([
    [{ contexte: { kind: 'ELEMENT' as const, numero: NumeroDElement.assigned('204') }, message: 'Pointage refusé' }, '204 Pointage refusé'],
    [
      { contexte: { kind: 'COMMANDE_GLOBALE' as const, intention: 'TOUT_ARRETER' as const }, message: 'Commande refusée' },
      'TOUT ARRÊTER Commande refusée',
    ],
  ])('should render the workshop message in presentation vocabulary', (message, expected) => {
    givenWorkshopMessage(message);

    whenRenderingThePage();

    thenHeaderMessageIs(expected);
  });

  it('should display a local capture failure ahead of a workshop refusal', () => {
    givenWorkshopMessage({ contexte: { kind: 'ELEMENT', numero: NumeroDElement.assigned('204') }, message: 'Pointage refusé' });
    givenLocalCaptureFailure();

    whenRenderingThePage();

    thenHeaderMessageIs('Action non enregistrée — recommencez');
  });

  it('should request confirmation before an administration reset', () => {
    givenReference();
    whenTheAdministrationGestureIsHeld();

    thenVisible('reinitialisation', true);
  });

  it('should revoke enrolment after reset confirmation', () => {
    givenReference();
    whenTheAdministrationGestureIsHeld();
    whenPressing('reset-confirm');

    thenVisible('reinitialisation', false);
    expect(enrolement.resets).toBe(1);
  });

  it('should revoke nothing when the administration reset is cancelled', () => {
    givenReference();

    whenTheAdministrationGestureIsHeld();
    whenPressing('reset-cancel');

    thenVisible('reinitialisation', false);
    expect(enrolement.resets).toBe(0);
  });

  it('should finish on page destruction and report a closure failure', async () => {
    givenClosureWillFail();

    whenDestroyingThePage();
    await Promise.resolve();

    expect(pupitre.finish).toHaveBeenCalledOnce();
    expect(errorHandler.errors).toEqual([new Error('closure unavailable')]);
  });

  const givenPointage = (execution?: ExecutionDePointage): void => {
    pupitre.publishReference();
    pupitre.operateur.set(operateurFixture);
    pupitre.pointage.set(pointageFixture);
    if (execution !== undefined) {
      vi.spyOn(pupitre, 'execute').mockImplementation(intention => {
        pupitre.pointages.push(intention);
        return execution;
      });
    }
    fixture.detectChanges();
  };
  const givenReference = (): void => {
    pupitre.publishReference();
    fixture.detectChanges();
  };
  const givenPause = (pauseEnCours: boolean): void => {
    pupitre.commandesGlobales.set(new CommandesGlobales({ activiteEnCours: true, pauseEnCours }));
  };
  const givenTheNextPagePressIsRefused = (): void => {
    pupitre.registerPress.mockReturnValueOnce(false);
  };
  const givenClosureWillFail = (): void => {
    pupitre.finish.mockRejectedValueOnce(new Error('closure unavailable'));
  };
  const givenLocalCaptureFailure = (): void => {
    pupitre.echecCaptureLocale.set(true);
  };

  const givenWorkshopMessage = (message: ReturnType<CurrentOperateurLifecycle['refusAtelier']>): void => {
    pupitre.refusAtelier.set(message);
  };

  const whenRenderingThePage = (): void => {
    fixture.detectChanges();
  };
  const whenPressing = (selector: string): void => {
    const pressed = element(selector);
    pressed.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    pressed.click();
    fixture.detectChanges();
  };
  const whenHolding = (selector: string): void => {
    const held = element(selector);
    held.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(1_000);
    held.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const whenTheAdministrationGestureIsHeld = (): void => {
    element('header-heading').dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(3_000);
    fixture.detectChanges();
  };
  const whenPointageCloses = (): void => {
    pupitre.operateur.set(undefined);
    pupitre.pointage.set(undefined);
    fixture.detectChanges();
  };
  const whenDestroyingThePage = (): void => {
    fixture.destroy();
  };

  const thenHeaderMessageIs = (expected: string): void => {
    expect(element('header-message').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenHeaderPauseIs = (expected: string): void => {
    expect(element('header-pause').textContent.trim()).toBe(expected);
  };
  const thenVisible = (selector: string, visible: boolean): void => {
    expect(root().querySelector(dataSelector(selector)) !== null).toBe(visible);
  };

  const element = (selector: string): HTMLElement => {
    const selected = root().querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Missing ${selector} fixture.`);
    return selected;
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});

describe('Pupitre page with its designation keypad', () => {
  let fixture: ComponentFixture<PupitrePage>;
  let journalFixture: JournauxDuPupitreFixture;
  let serveurFixture: AtelierExchangeFixture;

  beforeEach(async () => {
    vi.useFakeTimers();
    journalFixture = new JournauxDuPupitreFixture();
    journalFixture.answerReadsImmediately();
    journalFixture.seedJournal(Entreprise.of('atelier'), { ...EMPTY_JOURNAL_DU_PUPITRE, referentiel: referentielFixture });
    serveurFixture = new AtelierExchangeFixture();
    serveurFixture.reference = referentielFixture;
    TestBed.configureTestingModule({
      imports: [PupitrePage],
      providers: [
        GestesRecordingQueue,
        EtatHorsLigneDuPupitre,
        FraicheurDuReferentiel,
        AtelierCoordinator,
        CurrentOperateurLifecycle,
        PupitreSynchronization,
        EnrolementDuPupitre,
        { provide: JournauxDuPupitrePort, useValue: journalFixture },
        { provide: AtelierExchangePort, useValue: serveurFixture },
        { provide: DesignationExpirationSchedulerPort, useValue: { schedule: () => undefined } },
        { provide: ActiviteExpirationSchedulerPort, useValue: { schedule: () => undefined } },
        { provide: DeviceSessionPort, useClass: DeviceSessionFixture },
        {
          provide: AuthenticationPort,
          useValue: {
            currentTenant: () => 'atelier',
            synchronizeSession: () => Promise.resolve(),
            logout: () => undefined,
          },
        },
        { provide: DeviceEnrolmentPort, useValue: { enrol: () => Promise.resolve('ENROLLED') } },
        {
          provide: ChargementDeLAtelierPort,
          useValue: {
            etat: () => ({ referentielDisponible: true, connecte: true }),
            charger: () => Promise.resolve('CHARGE'),
          },
        },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    await TestBed.inject(EnrolementDuPupitre).enroler();
    fixture = TestBed.createComponent(PupitrePage);
    fixture.detectChanges();
  });

  afterEach(async () => {
    fixture.destroy();
    serveurFixture.settle();
    await journalFixture.synchronizationsSettled();
    await new Promise(resolve => roundTrip(resolve));
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('should suspend operator designation while the administration reset awaits confirmation', async () => {
    givenTheReadyKeypad();
    whenTheResetConfirmationIsOpen();

    await whenTypingAValidIdentifiantOnThePhysicalKeyboard();

    thenNoOperatorIsDesignated();
    thenDesignationCommandsAreUnavailable();
    thenTheResetActionsRemainAvailable();
  });

  it('should move focus into the administration reset confirmation', async () => {
    givenTheReadyKeypad();
    givenTheLogoHasFocus();

    whenTheResetConfirmationIsOpen();
    await whenRenderingSettles();

    thenFocused('reset-cancel');
  });

  it('should retain an operator designation completed during reset confirmation', async () => {
    givenTheReadyKeypad();
    whenStartingAValidDesignationOnThePhysicalKeyboard();
    whenTheResetConfirmationIsOpen();
    await whenRenderingSettles();

    thenTheOperatorIsDesignatedBehindTheConfirmation();
  });

  it('should prevent reset after designation completes during confirmation', async () => {
    givenTheReadyKeypad();
    whenStartingAValidDesignationOnThePhysicalKeyboard();
    whenTheResetConfirmationIsOpen();
    await whenRenderingSettles();
    whenConfirmingTheReset();

    thenTheResetConfirmationRemainsOpenAndUnavailable();
  });

  it('should restore operator designation after the administration reset is cancelled', async () => {
    givenTheReadyKeypad();
    whenTheResetConfirmationIsOpen();

    whenCancellingTheReset();
    await whenTypingAValidIdentifiantOnThePhysicalKeyboard();

    thenTheOperatorIsDesignated();
  });

  const givenTheReadyKeypad = (): void => {
    thenVisible('designation');
  };

  const givenTheLogoHasFocus = (): void => {
    element('header-heading').focus();
  };

  const whenTheResetConfirmationIsOpen = (): void => {
    element('header-heading').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(3_000);
    fixture.detectChanges();
    thenVisible('reinitialisation');
  };

  const whenTypingAValidIdentifiantOnThePhysicalKeyboard = async (): Promise<void> => {
    whenStartingAValidDesignationOnThePhysicalKeyboard();
    await whenRenderingSettles();
  };

  const whenStartingAValidDesignationOnThePhysicalKeyboard = (): void => {
    for (const key of ['0', '4', '9', 'Enter']) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
  };

  const whenConfirmingTheReset = (): void => {
    element('reset-confirm').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  const whenCancellingTheReset = (): void => {
    element('reset-cancel').click();
    fixture.detectChanges();
  };

  const whenRenderingSettles = async (): Promise<void> => {
    fixture.detectChanges();
    await new Promise(resolve => roundTrip(resolve));
    fixture.detectChanges();
  };

  const thenNoOperatorIsDesignated = (): void => {
    expect(root().querySelector(dataSelector('header-operator'))).toBeNull();
    expect(root().querySelector(dataSelector('pointage'))).toBeNull();
  };

  const thenTheResetActionsRemainAvailable = (): void => {
    expect(button('reset-cancel').disabled).toBe(false);
    expect(button('reset-confirm').disabled).toBe(false);
  };

  const thenDesignationCommandsAreUnavailable = (): void => {
    expect(button('digit-0').disabled).toBe(true);
    expect(button('validate').disabled).toBe(true);
  };

  const thenFocused = (selector: string): void => {
    expect(document.activeElement).toBe(element(selector));
  };

  const thenTheOperatorIsDesignatedBehindTheConfirmation = (): void => {
    thenVisible('header-operator');
    thenVisible('pointage');
  };

  const thenTheOperatorIsDesignated = (): void => {
    thenVisible('header-operator');
    thenVisible('pointage');
    expect(root().querySelector(dataSelector('reinitialisation'))).toBeNull();
  };

  const thenTheResetConfirmationRemainsOpenAndUnavailable = (): void => {
    thenVisible('reinitialisation');
    expect(button('reset-confirm').disabled).toBe(true);
    expect(root().querySelector(dataSelector('enrolement'))).toBeNull();
  };

  const thenVisible = (selector: string): void => {
    expect(root().querySelector(dataSelector(selector))).not.toBeNull();
  };

  const button = (selector: string): HTMLButtonElement => {
    const selected = element(selector);
    if (!(selected instanceof HTMLButtonElement)) throw new Error(`${selector} is not a button fixture.`);
    return selected;
  };

  const element = (selector: string): HTMLElement =>
    requiredFixture(root().querySelector<HTMLElement>(dataSelector(selector)), `${selector} element`);

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
});
