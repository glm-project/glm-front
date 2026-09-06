import {
  GesteDAtelier,
  IdentiteDuGeste,
  JournalDuPupitre,
  OperateurDuPupitre,
  TypeDePointage,
  TypeDePresence,
} from '../journal-du-pupitre/JournalDuPupitre';

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
    private vue: JournalDuPupitre,
    code: string,
  ) {
    const operateur = vue.referentiel?.operateurs.find(candidat => candidat.matricule === code);
    if (operateur === undefined) {
      throw new Error('Matricule absent du referentiel local.');
    }
    this.operateur = operateur;
  }

  snapshot(): JournalDuPupitre {
    return this.vue;
  }

  preparePointage(pointage: PointageDuPupitre, identify: () => IdentiteDuGeste): () => GesteDAtelier[] {
    if (pointage.posteId !== undefined && this.operateur.postes.every(poste => poste.id !== pointage.posteId)) {
      throw new Error('Poste absent des habilitations locales.');
    }
    const geste: GesteDAtelier = { ...identify(), ...pointage, operateurId: this.operateur.id, nature: 'POINTAGE' };
    const arrivee: GesteDAtelier = {
      ...identify(),
      dateDeSurvenue: geste.dateDeSurvenue,
      operateurId: this.operateur.id,
      nature: 'ARRIVEE',
    };
    const reprise: GesteDAtelier = {
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

  preparePresence(type: TypeDePresence, identite: IdentiteDuGeste): GesteDAtelier[] {
    return [{ ...identite, operateurId: this.operateur.id, nature: 'PRESENCE', type, implicite: false }];
  }

  accept(gestes: GesteDAtelier[]): void {
    this.arriveeAssuree ||= gestes.some(geste => geste.nature === 'POINTAGE');
    this.vue = { ...this.vue, evenements: [...this.vue.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))] };
  }
}
