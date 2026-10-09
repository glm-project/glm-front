import { DureeTravaillee } from './duree/DureeTravaillee';

export type CategorieDePointage = 'TRAVAIL' | 'NON_CONFORMITE';

export type EtatDeLigne = { readonly etat: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT'; readonly fin: Date } | { readonly etat: 'EN_COURS' };

export interface ActiviteDeLaLigne {
  readonly element: string;
  readonly poste: string | undefined;
  readonly categorie: CategorieDePointage;
  readonly debut: Date;
}

const finAvantDebut = (activite: ActiviteDeLaLigne, etat: EtatDeLigne): boolean =>
  'fin' in etat && etat.fin.getTime() < activite.debut.getTime();

export class LigneDePointage {
  constructor(
    readonly activite: ActiviteDeLaLigne,
    readonly etat: EtatDeLigne,
  ) {
    if (finAvantDebut(activite, etat)) {
      throw new Error(`Le pointage de ${activite.element} finit avant de commencer.`);
    }
  }

  duree(): DureeTravaillee | undefined {
    return 'fin' in this.etat ? DureeTravaillee.entre(this.activite.debut, this.etat.fin) : undefined;
  }
}
