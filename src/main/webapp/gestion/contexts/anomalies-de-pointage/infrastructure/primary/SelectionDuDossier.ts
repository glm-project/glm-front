export type SelectionDuDossier = { readonly kind: 'POINTAGE'; readonly id: string } | { readonly kind: 'ACTIVITE'; readonly id: string };

export const memeSelection = (gauche: SelectionDuDossier, droite: SelectionDuDossier | undefined): boolean =>
  droite !== undefined && gauche.kind === droite.kind && gauche.id === droite.id;
