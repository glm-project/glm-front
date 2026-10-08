import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { isReservedToGestionnaire } from './gestionnaire';

export const reservedToGestionnaire = async (): Promise<boolean | UrlTree> => {
  const roles = inject(RolesPort);
  const router = inject(Router);
  return isReservedToGestionnaire(await roles.realmRoles()) || router.parseUrl('/');
};
