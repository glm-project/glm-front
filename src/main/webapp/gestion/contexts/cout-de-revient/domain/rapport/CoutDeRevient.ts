import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { TempsPasse } from '../temps/TempsPasse';
import { LigneDeCout } from './LigneDeCout';

export interface FicheDuRapport {
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;
}

/**
 * Le rapport d'un élément de fabrication : une ligne par nature d'opération, et le total.
 *
 * Rien n'est stocké côté serveur : le rapport est recalculé à chaque lecture depuis les journaux de
 * l'atelier. Rien n'est recalculé côté client : le temps total et le coût total sont ceux que le serveur a
 * arrêtés, et les lignes ne sont ni sommées ni réordonnées.
 */
export class CoutDeRevient {
  readonly lignes: readonly LigneDeCout[];
  readonly temps: TempsPasse;
  readonly cout: Cout;

  constructor(
    readonly element: ElementChiffre,
    fiche: FicheDuRapport,
  ) {
    this.lignes = [...fiche.lignes];
    this.temps = fiche.temps;
    this.cout = fiche.cout;
  }

  /** Un élément engagé sur lequel personne n'a encore pointé : une réponse, pas une absence de réponse. */
  estSansTravail(): boolean {
    return this.lignes.length === 0;
  }
}
