import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { IntentionGlobale } from '@/pupitre/contexts/atelier/application/CommandeGlobale';
import { DesignationCoordinator } from '@/pupitre/contexts/atelier/application/DesignationCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { ExecutionDePointage, IntentionDePointage } from '@/pupitre/contexts/atelier/application/PointageCommand';
import { ElementDePointage, IdentiteOperateurDesigne, VueDePointage } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';
import { computed, ErrorHandler, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { PupitrePage } from './page';

const referentielFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
  suivis: [],
};
const operateurFixture: IdentiteOperateurDesigne = { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049' };
const pointageFixture: VueDePointage = {
  moules: [],
  ordresDeFabrication: [new ElementDePointage('of-1', '204', false, undefined)],
  glmActif: false,
};

class AtelierCoordinatorFixture {
  readonly connected = signal(true);
  readonly operateur = signal<IdentiteOperateurDesigne | undefined>(undefined);
  readonly echecCaptureLocale = signal(false);
  readonly refusAtelier = signal<ReturnType<DesignationCoordinator['refusAtelier']>>(undefined);
  readonly pointage = signal<VueDePointage | undefined>(undefined);
  readonly gestesDisponibles = signal(true);
  readonly code = signal('');
  readonly unknownCode = signal(false);
  readonly canValidate = signal(true);
  readonly globales: IntentionGlobale[] = [];
  readonly pointages: IntentionDePointage[] = [];
  registerPress = vi.fn(() => true);
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

class PageErrorHandlerFixture extends ErrorHandler {
  failure: unknown;

  override handleError(failure: unknown): void {
    this.failure = failure;
  }
}

describe('Pupitre page', () => {
  let fixture: ComponentFixture<PupitrePage>;
  let pupitre: AtelierCoordinatorFixture;
  let enrolement: EnrolementDuPupitreFixture;
  let errorHandler: PageErrorHandlerFixture;

  beforeEach(() => {
    vi.useFakeTimers();
    pupitre = new AtelierCoordinatorFixture();
    enrolement = new EnrolementDuPupitreFixture(pupitre);
    errorHandler = new PageErrorHandlerFixture();
    TestBed.configureTestingModule({
      imports: [PupitrePage],
      providers: [
        { provide: AtelierCoordinator, useValue: pupitre },
        { provide: EtatHorsLigneDuPupitre, useValue: pupitre },
        { provide: DesignationCoordinator, useValue: pupitre },
        { provide: EnrolementDuPupitre, useValue: enrolement },
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    });
    fixture = TestBed.createComponent(PupitrePage);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep the enrolment screen under the header until a reference makes the keypad available', () => {
    thenVisible('pupitre-header', true);
    thenVisible('enrolement', true);
    thenVisible('designation', false);

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

    whenPressing('primary-target');
    whenPressing('pause');
    whenPressing('resume');
    whenPressing('stop-all');
    whenPressing('finish');

    expect(pupitre.registerPress).toHaveBeenCalledTimes(5);
    expect(pupitre.pointages).toEqual([{ suiviId: 'of-1', cible: 'PRINCIPALE' }]);
    expect(pupitre.globales).toEqual(['PAUSE', 'REPRENDRE', 'TOUT_ARRETER']);
    expect(pupitre.finish).toHaveBeenCalledOnce();
  });

  it('should consume the click following a refused page press and accept the next complete press', () => {
    givenPointage();
    givenTheNextPagePressIsRefused();

    whenPressing('pause');
    whenPressing('resume');

    expect(pupitre.globales).toEqual(['REPRENDRE']);
  });

  it('should remove an open workstation choice with the pointage view', () => {
    givenPointage({
      kind: 'CHOIX_POSTE_REQUIS',
      numero: '204',
      postes: [{ id: 'tour', libelle: 'Tour' }],
      choose: () => Promise.resolve(),
    });
    whenPressing('primary-target');
    thenVisible('workstation-dialog', true);

    whenPointageCloses();

    thenVisible('workstation-dialog', false);
  });

  it.each([
    [{ contexte: { kind: 'ELEMENT' as const, numero: '204' }, message: 'Pointage refusé' }, '204 Pointage refusé'],
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
    givenWorkshopMessage({ contexte: { kind: 'ELEMENT', numero: '204' }, message: 'Pointage refusé' });
    givenLocalCaptureFailure();

    whenRenderingThePage();

    thenHeaderMessageIs('Action non enregistrée — recommencez');
  });

  it('should confirm an administration reset before revoking the enrolment', () => {
    givenReference();

    whenTheAdministrationGestureIsHeld();
    thenVisible('reinitialisation', true);

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
    expect(errorHandler.failure).toEqual(new Error('closure unavailable'));
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
  const givenTheNextPagePressIsRefused = (): void => {
    pupitre.registerPress.mockReturnValueOnce(false);
  };
  const givenClosureWillFail = (): void => {
    pupitre.finish.mockRejectedValueOnce(new Error('closure unavailable'));
  };
  const givenLocalCaptureFailure = (): void => {
    pupitre.echecCaptureLocale.set(true);
  };

  const givenWorkshopMessage = (message: ReturnType<DesignationCoordinator['refusAtelier']>): void => {
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
