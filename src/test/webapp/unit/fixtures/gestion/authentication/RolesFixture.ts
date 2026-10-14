import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { DeferredFixture } from '@test/unit/fixtures/DeferredFixture';

export class RolesFixture extends RolesPort {
  private readonly roles = new DeferredFixture<readonly string[]>();

  override realmRoles(): Promise<readonly string[]> {
    return this.roles.promise;
  }

  grant(roles: readonly string[]): void {
    this.roles.resolve(roles);
  }
}
