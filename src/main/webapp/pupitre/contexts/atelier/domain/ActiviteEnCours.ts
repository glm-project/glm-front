import { CategorieDActivite } from './CategorieDActivite';

export class ActiviteEnCours {
  constructor(
    private readonly operateurId: string,
    readonly categorie: CategorieDActivite,
    readonly depuis: Date,
    readonly posteId?: string,
  ) {}

  isFor(operateurId: string): boolean {
    return this.operateurId === operateurId;
  }

  computeDureeAt(maintenant: Date): number {
    return maintenant.getTime() - this.depuis.getTime();
  }
}
