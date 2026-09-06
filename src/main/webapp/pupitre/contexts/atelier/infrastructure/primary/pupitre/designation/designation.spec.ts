import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { AcceptationLocaleDesGestes } from '@/pupitre/contexts/atelier/application/AcceptationLocaleDesGestes';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import {
  DesignationExpiration,
  DesignationExpirationSchedulerPort,
} from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { EMPTY_JOURNAL_DU_PUPITRE, JournalDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { setTimeout as roundTrip } from 'node:timers';
import { Designation } from './designation';

interface KeyFixture {
  key: string;
  repeat?: boolean;
}

const referenceFixture: JournalDuPupitre = {
  ...EMPTY_JOURNAL_DU_PUPITRE,
  referentiel: { operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }], suivis: [] },
};

class DesignationJournalFixture {
  readCompleted = Promise.resolve();
  private notifyReadCompleted: (() => void) | undefined;

  constructor() {
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

  read(): Promise<JournalDuPupitre> {
    const notify = this.notifyReadCompleted;
    if (notify === undefined) throw new Error('Read completion is not prepared.');
    return new Promise(resolve =>
      roundTrip(() => {
        resolve(structuredClone(referenceFixture));
        roundTrip(notify);
      }),
    );
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
  let designation: OfflinePupitre;
  let journalFixture: DesignationJournalFixture;
  const serveurFixture = { referentiel: vi.fn(), send: vi.fn(), reread: vi.fn() };
  beforeEach(() => {
    journalFixture = new DesignationJournalFixture();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        AcceptationLocaleDesGestes,
        EtatHorsLigneDuPupitre,
        OfflinePupitre,
        PupitreSynchronization,
        {
          provide: AuthenticationPort,
          useValue: { currentTenant: () => 'atelier', synchronizeSession: () => new Promise<void>(resolve => roundTrip(resolve)) },
        },
        { provide: JournauxDuPupitrePort, useValue: journalFixture },
        { provide: AtelierExchangePort, useValue: serveurFixture },
        { provide: DesignationExpirationSchedulerPort, useClass: DesignationExpirationSchedulerFixture },
      ],
    });
    fixture = TestBed.createComponent(Designation);
    designation = TestBed.inject(OfflinePupitre);
    fixture.detectChanges();
  });
  afterEach(() => {
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

  it('should produce one touch action and not renew inactivity when a held touch is released', () => {
    whenHolding('digit-0');
    thenDisplayedCodeIs('0');
    whenTimePasses(30_000);
    whenClicking('digit-0');
    thenDisplayedCodeIs('');
  });

  const whenHolding = (selector: string): void => {
    element(selector).dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const whenResolutionSettles = async (): Promise<void> => {
    await journalFixture.readCompleted;
    void journalFixture.nextRead();
    fixture.detectChanges();
  };
  const thenUnknownCodeIsDisplayed = (): void => {
    expect(element('code').textContent.trim()).toBe('Code inconnu');
  };
  const thenOperatorIsDesignated = (): void => {
    expect(designation.operateur()?.id).toBe('jean');
    expect(serveurFixture.referentiel).not.toHaveBeenCalled();
    expect(serveurFixture.send).not.toHaveBeenCalled();
    expect(serveurFixture.reread).not.toHaveBeenCalled();
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
    element(selector).dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
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
