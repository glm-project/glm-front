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

  findActiviteFor(operateurId: string): ActiviteEnCours | undefined {
    return this.activites.find(activite => activite.isFor(operateurId));
  }

  computeDureeFor(operateurId: string, maintenant: Date): number | undefined {
    return this.findActiviteFor(operateurId)?.computeDureeAt(maintenant);
  }
}
