import { TypeDOuverture } from '../../journal-du-pupitre/JournalDuPupitre';
import { PointageDemande } from './PointageDemande';

export interface PosteAChoisir {
  readonly id: string;
  readonly libelle: string;
}

export type DecisionDOuverture =
  | { readonly kind: 'CHOIX_POSTE_REQUIS'; readonly postes: readonly PosteAChoisir[] }
  | { readonly kind: 'OUVERTURE'; readonly pointage: PointageDemande };

export class HabilitationsDePoste {
  private constructor(private readonly postes: readonly PosteAChoisir[]) {}

  static from(source: readonly { readonly id: string; readonly libelle: string }[]): HabilitationsDePoste {
    return new HabilitationsDePoste(source.map(({ id, libelle }) => ({ id, libelle })));
  }

  decideOuverture(type: TypeDOuverture): DecisionDOuverture {
    if (this.postes.length > 1) return { kind: 'CHOIX_POSTE_REQUIS', postes: this.postes };
    const posteId = this.postes[0]?.id;
    return {
      kind: 'OUVERTURE',
      pointage: posteId === undefined ? { type } : { type, posteId },
    };
  }

  require(posteId: string): void {
    if (this.postes.every(poste => poste.id !== posteId)) throw new Error('Poste absent des habilitations locales.');
  }
}
