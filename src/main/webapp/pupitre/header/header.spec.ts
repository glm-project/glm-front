import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { PupitreHeader } from './header';

describe('Pupitre header', () => {
  let fixture: ComponentFixture<PupitreHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();

    fixture = TestBed.createComponent(PupitreHeader);
    fixture.componentRef.setInput('heading', 'glmfront');
  });

  it('should sign that the pupitre is connected', async () => {
    await givenAConnectedPupitre();

    expect(showsSign('pupitre-connected')).toBe(true);
    expect(showsSign('pupitre-disconnected')).toBe(false);
  });

  it('should sign that the pupitre is disconnected', async () => {
    await givenADisconnectedPupitre();

    expect(showsSign('pupitre-disconnected')).toBe(true);
    expect(showsSign('pupitre-connected')).toBe(false);
  });

  const givenAConnectedPupitre = (): Promise<void> => renderTheSignFor(true);

  const givenADisconnectedPupitre = (): Promise<void> => renderTheSignFor(false);

  const renderTheSignFor = async (connected: boolean): Promise<void> => {
    fixture.componentRef.setInput('connected', connected);
    await fixture.whenStable();
  };

  const showsSign = (selector: string): boolean => {
    const header = fixture.nativeElement as HTMLElement;

    return header.querySelector(`[data-selector="${selector}"]`) !== null;
  };
});
