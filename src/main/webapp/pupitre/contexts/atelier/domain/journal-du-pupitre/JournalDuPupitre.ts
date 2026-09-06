export type EtatDAtelier = 'EN_ATTENTE' | 'EN_COURS' | 'INTERROMPU' | 'CLOTURE';
export const ETATS_DU_REFERENTIEL_DU_PUPITRE: readonly EtatDAtelier[] = ['EN_ATTENTE', 'EN_COURS', 'INTERROMPU'];
export type TypeDElement = 'ORDRE_DE_FABRICATION' | 'PRODUIT';
export type TypeDePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';
export type TypeDePresence = 'PAUSE' | 'REPRISE' | 'DEPART';

export interface OperateurDuPupitre {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly matricule?: string;
  readonly postes: readonly { readonly id: string; readonly libelle: string }[];
}

export interface ActiviteDuPupitre {
  readonly operateurId: string;
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly depuis: string;
  readonly posteId?: string;
}

export interface SuiviDuPupitre {
  readonly id: string;
  readonly nom: string;
  readonly reference?: string;
  readonly etat: EtatDAtelier;
  readonly type: TypeDElement;
  readonly activites: readonly ActiviteDuPupitre[];
  readonly evenements: readonly string[];
}

export interface ReferentielDuPupitre {
  readonly operateurs: readonly OperateurDuPupitre[];
  readonly suivis: readonly SuiviDuPupitre[];
}

export interface IdentiteDuGeste {
  readonly id: string;
  readonly dateDeSurvenue: string;
}

export interface GesteDArrivee extends IdentiteDuGeste {
  readonly nature: 'ARRIVEE';
  readonly operateurId: string;
}

interface PresenceCommune extends IdentiteDuGeste {
  readonly nature: 'PRESENCE';
  readonly operateurId: string;
}

export type GesteDePresence =
  | (PresenceCommune & { readonly type: TypeDePresence; readonly implicite: false; readonly assuranceArriveeId?: never })
  | (PresenceCommune & { readonly type: 'REPRISE'; readonly implicite: false; readonly assuranceArriveeId: string })
  | (PresenceCommune & { readonly type: 'REPRISE'; readonly implicite: true; readonly assuranceArriveeId?: never });

export interface GesteDePointage extends IdentiteDuGeste {
  readonly nature: 'POINTAGE';
  readonly operateurId: string;
  readonly suiviId: string;
  readonly type: TypeDePointage;
  readonly posteId?: string;
}

export type GesteDAtelier = GesteDArrivee | GesteDePresence | GesteDePointage;

export type EvenementDuJournal = EvenementEnAttente | EvenementAccepte | EvenementRefuse;

export interface EvenementEnAttente {
  readonly geste: GesteDAtelier;
  readonly etat: 'EN_ATTENTE';
  readonly refus?: never;
}

export interface ArriveeAcceptee {
  readonly geste: GesteDArrivee;
  readonly etat: 'ACCEPTE';
  readonly journeeOuverte: boolean;
  readonly refus?: never;
}

export interface AutreGesteAccepte {
  readonly geste: GesteDePresence | GesteDePointage;
  readonly etat: 'ACCEPTE';
  readonly journeeOuverte?: never;
  readonly refus?: never;
}

export type EvenementAccepte = ArriveeAcceptee | AutreGesteAccepte;

export interface EvenementRefuse {
  readonly geste: GesteDAtelier;
  readonly etat: 'REFUSE';
  readonly refus: { readonly code: string; readonly message: string };
}

export interface JournalDuPupitre {
  readonly referentiel?: ReferentielDuPupitre;
  readonly evenements: readonly EvenementDuJournal[];
  readonly connecte: boolean;
}

export const EMPTY_JOURNAL_DU_PUPITRE: JournalDuPupitre = { evenements: [], connecte: true };

const isArriveeAcceptee = (evenement: EvenementAccepte): evenement is ArriveeAcceptee => evenement.geste.nature === 'ARRIVEE';

const snapshotEvenement = (evenement: EvenementDuJournal): EvenementDuJournal => {
  const geste = { ...evenement.geste };
  if (evenement.etat === 'REFUSE') return { geste, etat: 'REFUSE', refus: { ...evenement.refus } };
  if (evenement.etat === 'ACCEPTE') {
    return isArriveeAcceptee(evenement)
      ? { geste: { ...evenement.geste }, etat: 'ACCEPTE', journeeOuverte: evenement.journeeOuverte }
      : { geste: { ...evenement.geste }, etat: 'ACCEPTE' };
  }
  return { geste, etat: 'EN_ATTENTE' };
};

export const snapshotDuJournal = (journal: JournalDuPupitre): JournalDuPupitre => ({
  connecte: journal.connecte,
  evenements: journal.evenements.map(snapshotEvenement),
  ...(journal.referentiel === undefined
    ? {}
    : {
        referentiel: {
          operateurs: journal.referentiel.operateurs.map(operateur => ({
            ...operateur,
            postes: operateur.postes.map(poste => ({ ...poste })),
          })),
          suivis: journal.referentiel.suivis.map(suivi => ({
            ...suivi,
            activites: suivi.activites.map(activite => ({ ...activite })),
            evenements: [...suivi.evenements],
          })),
        },
      }),
});
