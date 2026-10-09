export interface LogoDuPupitre {
  readonly version: string;
  readonly image?: string;
}

export type SuiteDuLogo =
  { readonly kind: 'GARDER'; readonly logo?: LogoDuPupitre } | { readonly kind: 'TELECHARGER'; readonly version: string };

export const suiteDuLogo = (recu: LogoDuPupitre | undefined, garde: LogoDuPupitre | undefined): SuiteDuLogo => {
  if (recu === undefined) return { kind: 'GARDER' };
  if (recu.version === garde?.version) return { kind: 'GARDER', logo: garde };
  return { kind: 'TELECHARGER', version: recu.version };
};
