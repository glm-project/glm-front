import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { AwaitedRealmRoles } from '@/gestion/shared/authentication/domain/AwaitedRealmRoles';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';

export class InMemoryGestionAuthentication extends AuthenticationPort implements RolesPort {
  private readonly awaitedRoles = new AwaitedRealmRoles();

  constructor(
    private readonly roles: readonly string[],
    private readonly authentication: AuthenticationPort = new InMemoryAuthentication(),
  ) {
    super();
  }

  override authenticate(): Promise<void> {
    return this.authentication.authenticate().then(() => {
      this.awaitedRoles.grant(this.roles);
    });
  }

  override currentToken(): string | undefined {
    return this.authentication.currentToken();
  }

  override synchronizeSession(): Promise<void> {
    return this.authentication.synchronizeSession();
  }

  override logout(): void {
    this.authentication.logout();
  }

  realmRoles(): Promise<readonly string[]> {
    return this.awaitedRoles.promise;
  }
}
