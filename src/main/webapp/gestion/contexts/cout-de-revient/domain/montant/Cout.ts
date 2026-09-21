import { Montant } from './Montant';

/**
 * Un coût, séparé en ce que coûte la machine et en ce que coûte la personne.
 *
 * Les deux ne s'agrègent pas de la même façon : le coût horaire de chaque poste actif court en entier,
 * alors que le taux horaire de l'opérateur est divisé par le nombre de postes qu'il occupait
 * simultanément, tous éléments confondus. Les afficher séparément est ce qui rend la règle lisible.
 *
 * Le total est lu du serveur, jamais recalculé : lui seul connaît l'arrondi qu'il a appliqué.
 */
export class Cout {
  constructor(
    readonly machine: Montant,
    readonly mainDOeuvre: Montant,
    readonly total: Montant,
  ) {}
}
