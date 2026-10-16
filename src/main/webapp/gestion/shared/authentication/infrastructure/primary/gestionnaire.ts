export const ROLE_GESTIONNAIRE = 'ROLE_GESTIONNAIRE';

export const isGestionnaire = (roles: readonly string[]): boolean => roles.includes(ROLE_GESTIONNAIRE);
