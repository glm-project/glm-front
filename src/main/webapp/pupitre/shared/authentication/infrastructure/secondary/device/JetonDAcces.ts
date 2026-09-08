const hasTenantClaim = (claims: unknown): claims is { tenant: string } =>
  typeof claims === 'object' && claims !== null && 'tenant' in claims && typeof claims.tenant === 'string' && claims.tenant.length > 0;

export class JetonDAcces {
  private constructor(private readonly valeur: string) {}

  static of(valeur: string): JetonDAcces {
    return new JetonDAcces(valeur);
  }

  tenant(): string | undefined {
    const claims = this.claims();
    return hasTenantClaim(claims) ? claims.tenant : undefined;
  }

  private claims(): unknown {
    try {
      const payload = this.valeur.split('.')[1];
      if (payload === undefined) {
        return undefined;
      }
      return JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
    } catch {
      return undefined;
    }
  }
}
