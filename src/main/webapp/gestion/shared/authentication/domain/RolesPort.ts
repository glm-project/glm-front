export abstract class RolesPort {
  abstract realmRoles(): Promise<readonly string[]>;
}
