import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { inject, Injectable } from '@angular/core';
import { ConflitsRightsPort } from '../../domain/dossier/ConflitsRightsPort';

@Injectable()
export class TokenConflitsRights extends ConflitsRightsPort {
  private readonly authentication = inject(AuthenticationPort);

  canApply(): boolean {
    const token = this.authentication.currentToken();
    if (token === undefined) return false;
    const payload = token.split('.')[1];
    if (payload === undefined) return false;
    try {
      const contenu: unknown = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
      return this.hasRealmRole(contenu);
    } catch {
      return false;
    }
  }

  private hasRealmRole(contenu: unknown): boolean {
    if (!this.isRecord(contenu)) return false;
    const acces = contenu['realm_access'];
    if (!this.isRecord(acces)) return false;
    const roles = acces['roles'];
    return Array.isArray(roles) && roles.includes('ROLE_GESTIONNAIRE');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
