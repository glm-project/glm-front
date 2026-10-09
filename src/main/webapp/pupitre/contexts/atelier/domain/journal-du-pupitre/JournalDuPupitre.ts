import { CodeDeRefusDAtelier, MotifDeRefus } from '../refus/MotifDeRefus';
import { RefusDePublication } from '../refus/RefusDePublication';
import { LogoDuPupitre } from './LogoDuPupitre';

export type EtatDAtelier = 'EN_ATTENTE' | 'EN_COURS' | 'INTERROMPU';
export type TypeDePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';

export interface OperateurDuPupitre {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly identifiant?: string;
  readonly postes: readonly { readonly id: string; readonly libelle: string }[];
}

export interface ActiviteDuPupitre {
  readonly operateurId: string;
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly depuis: string;
  readonly ouverture: string;
  readonly echeance: string;
  readonly posteId?: string;
}

export interface SuiviDuPupitre {
  readonly id: string;
  readonly nom: string;
  readonly reference?: string;
  readonly etat: EtatDAtelier;
  readonly categorie: string;
  readonly activites: readonly ActiviteDuPupitre[];
  readonly evenements: readonly string[];
}

export interface ReferentielDuPupitre {
  readonly operateurs: readonly OperateurDuPupitre[];
  readonly suivis: readonly SuiviDuPupitre[];
  readonly categories: readonly string[];
  readonly dureeMaximaleDActiviteEnMs: number;
  readonly logo?: LogoDuPupitre;
}

export interface IdentiteDuGeste {
  readonly id: string;
  readonly dateDeSurvenue: string;
}

export type TypeDOuverture = Exclude<TypeDePointage, 'FIN'>;

export interface Suspension {
  readonly pause: string;
  readonly reouverture: TypeDOuverture;
}

interface IdentiteDuPointage extends IdentiteDuGeste {
  readonly nature: 'POINTAGE';
  readonly operateurId: string;
  readonly suiviId: string;
  readonly posteId?: string;
  readonly suspension?: Suspension;
}

export type GesteDePointage = IdentiteDuPointage & { readonly type: TypeDePointage };

export const toReouverture = (activite: ActiviteDuPupitre): TypeDOuverture =>
  activite.categorie === 'NON_CONFORMITE' ? 'NON_CONFORMITE' : 'DEBUT';

export type EvenementDuJournal = EvenementEnAttente | EvenementAccepte | EvenementRefuse;

export interface EvenementEnAttente {
  readonly geste: GesteDePointage;
  readonly etat: 'EN_ATTENTE';
  readonly refus?: never;
}

export interface EvenementAccepte {
  readonly geste: GesteDePointage;
  readonly etat: 'ACCEPTE';
  readonly refus?: never;
}

export interface EvenementRefuse {
  readonly geste: GesteDePointage;
  readonly etat: 'REFUSE';
  readonly refus: { readonly code: string; readonly message: string; readonly motif?: CodeDeRefusDAtelier };
}

export interface JournalDuPupitre {
  readonly pausesArretees?: readonly string[];
  readonly referentiel?: ReferentielDuPupitre;
  readonly evenements: readonly EvenementDuJournal[];
  readonly connecte: boolean;
}

export const EMPTY_JOURNAL_DU_PUPITRE: JournalDuPupitre = { evenements: [], connecte: true };

const snapshotEvenement = (evenement: EvenementDuJournal): EvenementDuJournal => {
  const geste =
    evenement.geste.suspension !== undefined
      ? { ...evenement.geste, suspension: { ...evenement.geste.suspension } }
      : { ...evenement.geste };
  if (evenement.etat === 'REFUSE') return { geste, etat: 'REFUSE', refus: { ...evenement.refus } };
  if (evenement.etat === 'ACCEPTE') return { geste, etat: 'ACCEPTE' };
  return { geste, etat: 'EN_ATTENTE' };
};

export const snapshotDuJournal = (journal: JournalDuPupitre): JournalDuPupitre => ({
  connecte: journal.connecte,
  ...(journal.pausesArretees === undefined ? {} : { pausesArretees: [...journal.pausesArretees] }),
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
          categories: [...journal.referentiel.categories],
          dureeMaximaleDActiviteEnMs: journal.referentiel.dureeMaximaleDActiviteEnMs,
          ...(journal.referentiel.logo === undefined ? {} : { logo: { ...journal.referentiel.logo } }),
        },
      }),
});

const isShownRefusalAmong =
  (gesteIds: ReadonlySet<string>) =>
  (evenement: EvenementDuJournal): evenement is EvenementRefuse =>
    evenement.etat === 'REFUSE' && gesteIds.has(evenement.geste.id) && MotifDeRefus.from(evenement.refus.motif).isShownToTheOperator();

export class EvenementsDuJournal {
  private readonly evenements: readonly EvenementDuJournal[];

  constructor(evenements: readonly EvenementDuJournal[]) {
    this.evenements = evenements.map(snapshotEvenement);
  }

  nextPending(): EvenementEnAttente | undefined {
    return this.evenements.find(evenement => evenement.etat === 'EN_ATTENTE');
  }

  pendingCount(): number {
    return this.evenements.filter(evenement => evenement.etat === 'EN_ATTENTE').length;
  }

  records(gesteId: string): boolean {
    return this.evenements.some(evenement => evenement.geste.id === gesteId);
  }

  latestShownRefusalAmong(gesteIds: ReadonlySet<string>): EvenementRefuse | undefined {
    return [...this.evenements].reverse().find(isShownRefusalAmong(gesteIds));
  }
}

export const acceptPublication = (geste: GesteDePointage): EvenementAccepte => ({ geste, etat: 'ACCEPTE' });

export const refusePublication = (geste: GesteDePointage, refus: RefusDePublication): EvenementRefuse => {
  const motif = refus.motif.code();
  return {
    geste,
    etat: 'REFUSE',
    refus: { code: refus.code, message: refus.message, ...(motif === undefined ? {} : { motif }) },
  };
};

const suspensionOf = (geste: GesteDePointage, operateurId: string): geste is GesteDePointage & { readonly suspension: Suspension } =>
  geste.operateurId === operateurId && geste.suspension !== undefined;

const pausesOf = (journal: JournalDuPupitre, operateurId: string): readonly string[] =>
  journal.evenements.reduce<readonly string[]>(
    (pauses, { geste }) => (suspensionOf(geste, operateurId) ? [...pauses, geste.suspension.pause] : pauses),
    [],
  );

export const afterLocalCapture = (
  journal: JournalDuPupitre,
  gestes: readonly GesteDePointage[],
  repriseAEffacer?: string,
): JournalDuPupitre => ({
  ...journal,
  evenements: [...journal.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
  ...(repriseAEffacer === undefined
    ? {}
    : {
        pausesArretees: [...new Set([...(journal.pausesArretees ?? []), ...pausesOf(journal, repriseAEffacer)])],
      }),
});
