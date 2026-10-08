export const ROLE_GESTIONNAIRE = 'ROLE_GESTIONNAIRE';

export const isReservedToGestionnaire = (roles: readonly string[]): boolean => roles.includes(ROLE_GESTIONNAIRE);
