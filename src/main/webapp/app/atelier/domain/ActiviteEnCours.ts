import { CategorieDActivite } from './CategorieDActivite';

export class ActiviteEnCours {
  constructor(
    private readonly operateurId: string,
    readonly categorie: CategorieDActivite,
    readonly depuis: Date,
    readonly posteId?: string,
  ) {}

  estDe(operateurId: string): boolean {
    return this.operateurId === operateurId;
  }

  dureeA(maintenant: Date): number {
    return maintenant.getTime() - this.depuis.getTime();
  }
}
