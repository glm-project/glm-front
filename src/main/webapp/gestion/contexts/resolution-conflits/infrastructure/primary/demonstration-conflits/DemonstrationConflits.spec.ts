import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { vi } from 'vitest';
import { DemonstrationConflitsPort, IncidentDemo } from '../../../domain/dossier/DemonstrationConflitsPort';
import { DemonstrationConflits } from './DemonstrationConflits';

class DemonstrationFixture extends DemonstrationConflitsPort {
  resolved = true;
  incident: IncidentDemo | undefined;
  failReset = false;

  async reset(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.failReset) throw new Error('Démonstration indisponible');
    this.resolved = false;
  }

  arm(incident: IncidentDemo): void {
    this.incident = incident;
  }
}

describe('Conflict demonstration controls', () => {
  let fixture: ComponentFixture<DemonstrationConflits>;
  let demonstration: DemonstrationFixture;
  let changeObserved: boolean;
  let changed: Promise<void> = Promise.resolve();

  beforeEach(async () => {
    demonstration = new DemonstrationFixture();
    changeObserved = false;
    await TestBed.configureTestingModule({
      providers: [
        { provide: DemonstrationConflitsPort, useValue: demonstration },
        { provide: ErrorHandlerPort, useValue: { handleError: () => undefined } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DemonstrationConflits);
    changed = new Promise(resolve => {
      fixture.componentInstance.changed.subscribe(() => {
        changeObserved = !demonstration.resolved;
        resolve();
      });
    });
    await fixture.whenStable();
  });

  it('should restore the initial scenarios and notify the containing page', async () => {
    await whenResettingTheDemonstration();

    expect(changeObserved).toBe(true);
    expect(demonstration.resolved).toBe(false);
  });

  it('should arm a read failure without resetting the current decisions', async () => {
    await whenArmingTheReadFailure();

    expect(demonstration.incident).toBe('PANNE_LECTURE');
    expect(demonstration.resolved).toBe(true);
    expect(changeObserved).toBe(false);
  });

  it('should explain a failed reset while preserving the current decisions', async () => {
    demonstration.failReset = true;

    await whenResettingTheFailingDemonstration();

    expect(changeObserved).toBe(false);
    expect(demonstration.resolved).toBe(true);
    thenTheResetFailureIsVisible();
  });

  it('should make reset unavailable while the containing page is writing an act', async () => {
    await whenThePageIsWriting();

    expect(button('conflits-reset').disabled).toBe(true);
  });

  it('should clear the armed incident when restoring the initial demonstration', async () => {
    await whenArmingTheReadFailure();
    await whenResettingTheDemonstration();

    thenNoIncidentIsAdvertisedAsReady();
  });

  const thenNoIncidentIsAdvertisedAsReady = (): void => {
    const demo = (fixture.nativeElement as HTMLElement).querySelector(dataSelector('conflits-demo'));
    expect(demo?.textContent).not.toContain('Incident prêt');
  };

  const whenThePageIsWriting = async (): Promise<void> => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
  };

  const button = (selector: string): HTMLButtonElement => {
    const found = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(dataSelector(selector));
    if (found === null) throw new Error(`Missing button ${selector}`);
    return found;
  };

  const whenResettingTheFailingDemonstration = async (): Promise<void> => {
    button('conflits-reset').click();
    await vi.waitFor(() => {
      expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('conflits-reset-erreur'))).not.toBeNull();
    });
  };

  const thenTheResetFailureIsVisible = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('conflits-reset-erreur'))?.textContent).toContain(
      'réinitialiser',
    );
  };

  const whenArmingTheReadFailure = async (): Promise<void> => {
    button('conflits-incident-PANNE_LECTURE').click();
    await fixture.whenStable();
  };

  const whenResettingTheDemonstration = async (): Promise<void> => {
    button('conflits-reset').click();
    await changed;
    await fixture.whenStable();
  };
});
