import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dataSelector } from '@test/utils/DataSelector';
import { MesPointages } from './mes-pointages';

describe('Mes pointages screen', () => {
  let fixture: ComponentFixture<MesPointages>;
  let retours: number;

  beforeEach(() => {
    fixture = TestBed.createComponent(MesPointages);
    retours = 0;
    fixture.componentInstance.retourRequested.subscribe(() => (retours += 1));
    fixture.detectChanges();
  });

  it('should ask to return to the pointage screen', () => {
    whenReturningToPointage();

    thenTheReturnIsRequestedOnce();
  });

  const whenReturningToPointage = (): void => {
    const retour = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(dataSelector('retour-au-pointage'));
    if (retour === null) throw new Error('Missing retour-au-pointage fixture.');
    retour.click();
  };
  const thenTheReturnIsRequestedOnce = (): void => {
    expect(retours).toBe(1);
  };
});
