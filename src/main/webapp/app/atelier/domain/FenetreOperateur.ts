import { GesteLocal, IdentiteDuGeste, OperateurDuPupitre, PupitreLocal } from './PupitreLocal';
import { TypeDePointage } from './TypeDePointage';
import { TypeDePresence } from './TypeDePresence';

export interface PointageDuPupitre {
  suiviId: string;
  type: TypeDePointage;
  posteId?: string;
}

export class FenetreOperateur {
  readonly operateur: OperateurDuPupitre;
  private arriveeAssuree = false;

  constructor(
    readonly entreprise: string,
    private vue: PupitreLocal,
    code: string,
  ) {
    const operateur = vue.referentiel?.operateurs.find(candidat => candidat.matricule === code);
    if (operateur === undefined) {
      throw new Error('Matricule absent du referentiel local.');
    }
    this.operateur = operateur;
  }

  snapshot(): PupitreLocal {
    return this.vue;
  }

  preparePointage(pointage: PointageDuPupitre, identify: () => IdentiteDuGeste): () => GesteLocal[] {
    if (pointage.posteId !== undefined && this.operateur.postes.every(poste => poste.id !== pointage.posteId)) {
      throw new Error('Poste absent des habilitations locales.');
    }
    const geste: GesteLocal = { ...identify(), ...pointage, operateurId: this.operateur.id, nature: 'POINTAGE' };
    const arrivee: GesteLocal = { ...identify(), dateDeSurvenue: geste.dateDeSurvenue, operateurId: this.operateur.id, nature: 'ARRIVEE' };
    const reprise: GesteLocal = {
      ...identify(),
      dateDeSurvenue: geste.dateDeSurvenue,
      operateurId: this.operateur.id,
      nature: 'PRESENCE',
      type: 'REPRISE',
      implicite: true,
    };
    return () => {
      if (this.arriveeAssuree) {
        return [geste];
      }
      return [arrivee, reprise, geste];
    };
  }

  preparePresence(type: TypeDePresence, identite: IdentiteDuGeste): GesteLocal[] {
    return [{ ...identite, operateurId: this.operateur.id, nature: 'PRESENCE', type, implicite: false }];
  }

  accept(gestes: GesteLocal[]): void {
    this.arriveeAssuree ||= gestes.some(geste => geste.nature === 'POINTAGE');
    this.vue = { ...this.vue, evenements: [...this.vue.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))] };
  }
}
