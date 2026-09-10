import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { FraicheurDuReferentiel } from '@/pupitre/contexts/atelier/application/FraicheurDuReferentiel';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import {
  DesignationExpiration,
  DesignationExpirationSchedulerPort,
} from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierExchangeFixture } from '@test/unit/fixtures/pupitre/atelier/AtelierExchangeFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { setTimeout as roundTrip } from 'node:timers';
import { Designation } from './designation';

interface KeyFixture {
  key: string;
  repeat?: boolean;
}

const referentielFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
  suivis: [],
};

const referenceFixture: JournalDuPupitre = { ...EMPTY_JOURNAL_DU_PUPITRE, referentiel: referentielFixture };

class DesignationJournalFixture extends JournauxDuPupitreFixture {
  readCompleted = Promise.resolve();
  failure: Error | undefined;
  private notifyReadCompleted: (() => void) | undefined;

  constructor() {
    super();
    this.prepareNextRead();
  }

  nextRead(): Promise<void> {
    this.prepareNextRead();
    return this.readCompleted;
  }

  private prepareNextRead(): void {
    this.readCompleted = new Promise(resolve => {
      this.notifyReadCompleted = resolve;
    });
  }

  override async read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    const notify = this.notifyReadCompleted;
    if (notify === undefined) throw new Error('Read completion is not prepared.');
    try {
      const state = await super.read(entreprise);
      if (this.failure !== undefined) throw this.failure;
      return state;
    } finally {
      roundTrip(notify);
    }
  }
}

class DesignationExpirationSchedulerFixture extends DesignationExpirationSchedulerPort {
  private timer: ReturnType<typeof setTimeout> | undefined;

  override schedule(deadline: number | undefined, expiration: DesignationExpiration): void {
    clearTimeout(this.timer);
    if (deadline !== undefined)
      this.timer = setTimeout(() => {
        expiration.expire();
      }, deadline - Date.now());
  }
}

describe('Designation keypad', () => {
  let fixture: ComponentFixture<Designation>;
  let designation: CurrentOperateurLifecycle;
  let journalFixture: DesignationJournalFixture;
  let serveurFixture: AtelierExchangeFixture;
  beforeEach(() => {
    journalFixture = new DesignationJournalFixture();
    journalFixture.seedJournal(Entreprise.of('atelier'), referenceFixture);
    serveurFixture = new AtelierExchangeFixture();
    serveurFixture.reference = referentielFixture;
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        GestesRecordingQueue,
        EtatHorsLigneDuPupitre,
        FraicheurDuReferentiel,
        CurrentOperateurLifecycle,
        PupitreSynchronization,
        {
          provide: AuthenticationPort,
          useValue: {
            currentTenant: () => 'atelier',
            currentToken: () => 'jeton',
            synchronizeSession: () => new Promise<void>(resolve => roundTrip(resolve)),
          },
        },
        { provide: JournauxDuPupitrePort, useValue: journalFixture },
        { provide: AtelierExchangePort, useValue: serveurFixture },
        { provide: DesignationExpirationSchedulerPort, useClass: DesignationExpirationSchedulerFixture },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
    fixture = TestBed.createComponent(Designation);
    designation = TestBed.inject(CurrentOperateurLifecycle);
    fixture.detectChanges();
  });
  afterEach(async () => {
    serveurFixture.settle();
    await journalFixture.synchronizationsSettled();
    await new Promise(resolve => roundTrip(resolve));
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('should render twelve telephone ordered keys with explicit disabled validation', () => {
    thenKeysAre(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Effacer', '0', 'Valider']);
    thenValidationIsDisabled(true);
    whenClicking('digit-0');
    thenDisplayedCodeIs('0');
    thenValidationIsDisabled(false);
  });
  it('should support physical digits and backspace without repeating held keys', () => {
    whenPressingKey({ key: '0' });
    whenPressingKey({ key: '4' });
    whenPressingKey({ key: '4', repeat: true });
    whenPressingKey({ key: 'Backspace' });
    whenPressingKey({ key: 'a' });
    thenDisplayedCodeIs('0');
  });
  it('should ignore Enter on empty input and erase by touch', () => {
    whenPressingKey({ key: 'Enter' });
    whenClicking('digit-1');
    whenClicking('erase');
    thenDisplayedCodeIs('');
  });
  it('should consume a touch after sleep and accept the next touch', () => {
    whenClicking('digit-0');
    whenSleeping();
    whenTouching('digit-4');
    thenDisplayedCodeIs('');
    whenTouching('digit-9');
    thenDisplayedCodeIs('9');
  });
  it('should renew on a blank area press but not mouse movement or held keys', () => {
    whenClicking('digit-0');
    whenTimePasses(29_000);
    whenTouching('designation');
    whenTimePasses(29_000);
    thenDisplayedCodeIs('0');
    whenMovingMouse();
    whenPressingKey({ key: '0', repeat: true });
    whenTimePasses(1_000);
    thenDisplayedCodeIs('');
  });
  it('should show an unknown code in place then recover and validate by touch', async () => {
    whenTouching('digit-7');
    whenTouching('validate');
    await whenResolutionSettles();
    thenUnknownCodeIsDisplayed();
    whenTouching('erase');
    thenDisplayedCodeIs('');
    whenTouching('digit-0');
    whenTouching('digit-4');
    whenTouching('digit-9');
    whenTouching('validate');
    await whenResolutionSettles();
    thenOperatorIsDesignated();
  });

  it('should validate by Enter even when focus is outside the keypad', async () => {
    whenPressingKey({ key: '0' });
    whenPressingKey({ key: '4' });
    whenPressingKey({ key: '9' });
    whenPressingKey({ key: 'Enter' });
    await whenResolutionSettles();
    thenOperatorIsDesignated();
  });

  it('should keep the entered code available for retry when local storage fails', async () => {
    givenUnavailableStorage();
    whenPressingKey({ key: '0' });
    whenPressingKey({ key: '4' });
    whenPressingKey({ key: '9' });

    whenPressingKey({ key: 'Enter' });
    await whenResolutionSettles();

    thenDisplayedCodeIs('049');
    thenValidationIsDisabled(false);
  });

  it('should produce one touch action and not renew inactivity when a held touch is released', () => {
    whenHolding('digit-0');
    thenDisplayedCodeIs('0');
    whenTimePasses(30_000);
    whenClicking('digit-0');
    thenDisplayedCodeIs('');
  });

  const whenHolding = (selector: string): void => {
    element(selector).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const givenUnavailableStorage = (): void => {
    journalFixture.failure = new Error('Stockage indisponible');
  };
  const whenResolutionSettles = async (): Promise<void> => {
    await journalFixture.readCompleted;
    await journalFixture.synchronizationsSettled();
    void journalFixture.nextRead();
    fixture.detectChanges();
  };
  const thenUnknownCodeIsDisplayed = (): void => {
    expect(element('code').textContent.trim()).toBe('Code inconnu');
  };
  const thenOperatorIsDesignated = (): void => {
    expect(designation.operateur()?.id).toBe('jean');
  };

  const element = (selector: string): HTMLElement => {
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    if (selector === 'designation') return host;
    const selected = host.querySelector<HTMLElement>(dataSelector(selector));
    if (selected === null) throw new Error(`Expected element ${selector}`);
    return selected;
  };
  const whenClicking = (selector: string): void => {
    element(selector).click();
    fixture.detectChanges();
  };
  const whenTouching = (selector: string): void => {
    element(selector).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    whenClicking(selector);
  };
  const whenPressingKey = (key: KeyFixture): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', { ...key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const whenSleeping = (): void => {
    vi.setSystemTime(Date.now() + 31_000);
  };
  const whenTimePasses = (duration: number): void => {
    vi.advanceTimersByTime(duration);
    fixture.detectChanges();
  };
  const whenMovingMouse = (): void => {
    element('designation').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
  };
  const thenKeysAre = (labels: string[]): void => {
    expect(Array.from(element('designation').querySelectorAll('button')).map(button => button.textContent.trim())).toEqual(labels);
  };
  const thenValidationIsDisabled = (disabled: boolean): void => {
    expect((element('validate') as HTMLButtonElement).disabled).toBe(disabled);
  };
  const thenDisplayedCodeIs = (code: string): void => {
    expect(element('code').textContent.trim()).toBe(code);
  };
});
