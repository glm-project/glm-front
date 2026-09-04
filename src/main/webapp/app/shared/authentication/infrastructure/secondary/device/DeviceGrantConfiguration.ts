export class DeviceGrantConfiguration {
  constructor(
    private readonly url: string,
    private readonly realm: string,
    readonly clientId: string,
  ) {}

  deviceAuthorizationEndpoint(): string {
    return `${this.openidConnect()}/auth/device`;
  }

  tokenEndpoint(): string {
    return `${this.openidConnect()}/token`;
  }

  logoutEndpoint(): string {
    return `${this.openidConnect()}/logout`;
  }

  private openidConnect(): string {
    return `${this.url}/realms/${this.realm}/protocol/openid-connect`;
  }
}
