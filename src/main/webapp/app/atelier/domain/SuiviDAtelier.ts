import { ActiviteEnCours } from './ActiviteEnCours';
import { EtatDAtelier } from './EtatDAtelier';
import { TypeDElement } from './TypeDElement';

export class SuiviDAtelier {
  constructor(
    readonly id: string,
    private readonly nom: string,
    readonly etat: EtatDAtelier,
    readonly type: TypeDElement,
    private readonly activites: readonly ActiviteEnCours[],
  ) {}

  numero(): string {
    return this.nom;
  }

  activiteDe(operateurId: string): ActiviteEnCours | undefined {
    return this.activites.find(activite => activite.estDe(operateurId));
  }

  dureeDe(operateurId: string, maintenant: Date): number | undefined {
    return this.activiteDe(operateurId)?.dureeA(maintenant);
  }
}
