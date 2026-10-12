import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { Component } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { RolesFixture } from '@test/unit/fixtures/gestion/authentication/RolesFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { ROLE_GESTIONNAIRE } from './gestionnaire';
import { ReservedToGestionnaire } from './reserved-to-gestionnaire.directive';

@Component({
  selector: 'glm-reserved-host',
  imports: [ReservedToGestionnaire],
  template: `<button *glmReservedToGestionnaire type="button" data-selector="reserved">Réservé</button>`,
})
class ReservedHost {}

describe('Directive reserving an element to the gestionnaire', () => {
  let roles: RolesFixture;
  let shown: ComponentFixture<ReservedHost>;

  beforeEach(() => {
    roles = new RolesFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: RolesPort, useValue: roles },
      ],
    });
  });

  it('should hide the element while the realm roles are not resolved', async () => {
    await whenShowingTheHost();

    thenTheElementIsHidden();
  });

  it('should show the element to the gestionnaire once the realm roles are resolved', async () => {
    await whenShowingTheHost();
    await whenTheRolesResolveTo([ROLE_GESTIONNAIRE]);

    thenTheElementIsShown();
  });

  it('should keep the element hidden from a consultant', async () => {
    await whenShowingTheHost();
    await whenTheRolesResolveTo(['ROLE_CONSULTANT']);

    thenTheElementIsHidden();
  });

  const whenShowingTheHost = async (): Promise<void> => {
    shown = TestBed.createComponent(ReservedHost);
    await shown.whenStable();
  };

  const whenTheRolesResolveTo = async (granted: readonly string[]): Promise<void> => {
    roles.grant(granted);
    await shown.whenStable();
  };

  const reservedElement = (): Element | null => (shown.nativeElement as HTMLElement).querySelector(dataSelector('reserved'));

  const thenTheElementIsShown = (): void => {
    expect(reservedElement()).not.toBeNull();
  };

  const thenTheElementIsHidden = (): void => {
    expect(reservedElement()).toBeNull();
  };
});
