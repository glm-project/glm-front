import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';
import { ROLE_GESTIONNAIRE } from './gestionnaire';
import { reservedToGestionnaire } from './reserved-to-gestionnaire.guard';

class RolesFixture extends RolesPort {
  private readonly roles = new DeferredFixture<readonly string[]>();

  override realmRoles(): Promise<readonly string[]> {
    return this.roles.promise;
  }

  grant(roles: readonly string[]): void {
    this.roles.resolve(roles);
  }
}

describe('Route reserved to the gestionnaire', () => {
  let roles: RolesFixture;

  beforeEach(() => {
    roles = new RolesFixture();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RolesPort, useValue: roles }],
    });
  });

  it('should match for a gestionnaire', async () => {
    givenTheSessionRoles([ROLE_GESTIONNAIRE]);

    const decision = await whenMatchingTheReservedRoute();

    expect(decision).toBe(true);
  });

  it('should send a consultant to the supervision', async () => {
    givenTheSessionRoles(['ROLE_CONSULTANT']);

    const decision = await whenMatchingTheReservedRoute();

    thenTheDecisionIsARedirectionTo(decision, '/');
  });

  it('should send a session without any role to the supervision', async () => {
    givenTheSessionRoles([]);

    const decision = await whenMatchingTheReservedRoute();

    thenTheDecisionIsARedirectionTo(decision, '/');
  });

  it('should wait while the session roles are unknown', async () => {
    const decision = whenMatchingTheReservedRoute();

    await thenTheDecisionIsStillPending(decision);
  });

  const givenTheSessionRoles = (sessionRoles: readonly string[]): void => {
    roles.grant(sessionRoles);
  };

  const whenMatchingTheReservedRoute = (): Promise<boolean | UrlTree> => TestBed.runInInjectionContext(reservedToGestionnaire);

  const thenTheDecisionIsARedirectionTo = (decision: boolean | UrlTree, url: string): void => {
    expect(decision).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(decision as UrlTree)).toBe(url);
  };

  const thenTheDecisionIsStillPending = async (decision: Promise<boolean | UrlTree>): Promise<void> => {
    const pending = Symbol('pending');
    const outcome = await Promise.race([
      decision,
      new Promise<symbol>(resolve => {
        setTimeout(() => {
          resolve(pending);
        }, 20);
      }),
    ]);
    expect(outcome).toBe(pending);
  };
});
