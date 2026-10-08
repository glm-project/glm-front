export class AwaitedRealmRoles {
  readonly promise: Promise<readonly string[]>;
  private readonly grantToEveryone: (roles: readonly string[]) => void;

  constructor() {
    const resolvers: ((roles: readonly string[]) => void)[] = [];
    this.promise = new Promise(resolve => resolvers.push(resolve));
    this.grantToEveryone = roles => {
      resolvers.forEach(resolve => {
        resolve(roles);
      });
    };
  }

  grant(roles: readonly string[]): void {
    this.grantToEveryone(roles);
  }
}
