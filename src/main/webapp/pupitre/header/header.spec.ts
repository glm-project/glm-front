import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { dataSelector } from '@test/utils/DataSelector';
import { PupitreHeader } from './header';

describe('Pupitre header', () => {
  let fixture: ComponentFixture<PupitreHeader>;
  let finishRequested: boolean;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();

    fixture = TestBed.createComponent(PupitreHeader);
    fixture.componentRef.setInput('heading', 'glmfront');
    finishRequested = false;
    fixture.componentInstance.finRequested.subscribe(() => {
      finishRequested = true;
    });
  });

  it('should sign that the pupitre is connected', async () => {
    givenAConnectedPupitre();

    await whenRenderingTheHeader();

    thenItSignsThePupitreIsOnline();
    thenItShowsTheHeading('glmfront');
  });

  it('should sign that the pupitre is disconnected', async () => {
    givenADisconnectedPupitre();

    await whenRenderingTheHeader();

    thenItSignsThePupitreIsOffline();
  });

  it('should show the designated identity, current workshop message and finish intention', async () => {
    givenAConnectedPupitre();
    givenADesignatedOperator();
    givenACurrentRefusal();

    await whenRenderingTheHeader();
    whenFinishing();

    thenItShowsTheDesignatedOperator();
    thenItShowsTheRefusal();
    thenFinishWasRequested();
  });

  it('should render a local recording message without inventing a business context', async () => {
    givenAConnectedPupitre();
    givenADesignatedOperator();
    givenARecordingError();

    await whenRenderingTheHeader();

    thenItShowsTheRecordingError();
  });

  const givenAConnectedPupitre = (): void => {
    fixture.componentRef.setInput('connected', true);
  };

  const givenADisconnectedPupitre = (): void => {
    fixture.componentRef.setInput('connected', false);
  };
  const givenADesignatedOperator = (): void => {
    fixture.componentRef.setInput('operateur', { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049' });
  };
  const givenACurrentRefusal = (): void => {
    fixture.componentRef.setInput('message', { contexte: '1015', message: "L'élément a été clôturé." });
  };
  const givenARecordingError = (): void => {
    fixture.componentRef.setInput('message', { message: 'Action non enregistrée — recommencez' });
  };

  const whenRenderingTheHeader = (): Promise<void> => fixture.whenStable();
  const whenFinishing = (): void => {
    const header = fixture.nativeElement as HTMLElement;
    header.querySelector<HTMLButtonElement>(dataSelector('finish'))?.click();
  };

  const thenItSignsThePupitreIsOnline = (): void => {
    expect(showsSign('pupitre-connected')).toBe(true);
    expect(showsSign('pupitre-disconnected')).toBe(false);
    thenItDescribesConnectivity('pupitre-connected', 'En ligne');
  };

  const thenItSignsThePupitreIsOffline = (): void => {
    expect(showsSign('pupitre-disconnected')).toBe(true);
    expect(showsSign('pupitre-connected')).toBe(false);
    thenItDescribesConnectivity('pupitre-disconnected', 'Hors ligne');
  };

  const thenItShowsTheHeading = (heading: string): void => {
    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector(dataSelector('header-heading'))?.textContent.trim()).toBe(heading);
  };
  const thenItShowsTheDesignatedOperator = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('header-operator'))?.textContent.trim()).toBe('Dupont Jean');
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('header-code'))?.textContent.trim()).toBe('Code 049');
  };
  const thenItShowsTheRefusal = (): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector(dataSelector('header-message'))?.textContent).toContain(
      "1015 L'élément a été clôturé.",
    );
  };
  const thenItShowsTheRecordingError = (): void => {
    const message = (fixture.nativeElement as HTMLElement).querySelector(dataSelector('header-message'));
    expect(message?.textContent).toContain('Action non enregistrée — recommencez');
    expect(message?.querySelector('strong')).toBeNull();
  };
  const thenFinishWasRequested = (): void => {
    expect(finishRequested).toBe(true);
  };

  const thenItDescribesConnectivity = (sign: string, description: string): void => {
    const header = fixture.nativeElement as HTMLElement;
    const connectivity = header.querySelector(dataSelector(sign));

    expect(connectivity?.textContent.trim()).toBe(description);
    expect(connectivity?.querySelector(dataSelector('connectivity-indicator'))?.getAttribute('aria-hidden')).toBe('true');
    expect(header.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  };

  const showsSign = (sign: string): boolean => {
    const header = fixture.nativeElement as HTMLElement;

    return header.querySelector(dataSelector(sign)) !== null;
  };
});
