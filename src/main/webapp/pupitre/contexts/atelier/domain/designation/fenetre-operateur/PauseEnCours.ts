import {
  EvenementDuJournal,
  GesteDAtelier,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
  Suspension,
  TypeDOuverture,
} from '../../journal-du-pupitre/JournalDuPupitre';
import { projectReferentiel } from '../../journal-du-pupitre/JournalDuPupitreProjection';

export interface ActiviteSuspendue {
  readonly suiviId: string;
  readonly posteId?: string;
  readonly reouverture: TypeDOuverture;
}

interface Emplacement {
  readonly suiviId: string;
  readonly posteId?: string | undefined;
}

type GesteSuspendu = GesteDePointage & { readonly suspension: Suspension };

interface SuspensionJournalisee {
  readonly geste: GesteSuspendu;
  readonly refusee: boolean;
}

const isSuspension = (geste: GesteDAtelier): geste is GesteSuspendu => geste.nature === 'POINTAGE' && geste.suspension !== undefined;

const toActiviteSuspendue = ({ geste: { suiviId, posteId, suspension } }: SuspensionJournalisee): ActiviteSuspendue =>
  posteId === undefined ? { suiviId, reouverture: suspension.reouverture } : { suiviId, posteId, reouverture: suspension.reouverture };

const suspensionsOf = (evenements: readonly EvenementDuJournal[]): readonly SuspensionJournalisee[] =>
  evenements.flatMap(({ geste, etat }) => (isSuspension(geste) ? [{ geste, refusee: etat === 'REFUSE' }] : []));

const pauseOf = (geste: GesteDAtelier | undefined): string | undefined =>
  geste?.nature === 'POINTAGE' ? geste.suspension?.pause : undefined;

const lastGestureOf = (evenements: readonly EvenementDuJournal[], operateurId: string): GesteDAtelier | undefined =>
  evenements.filter(({ geste }) => geste.operateurId === operateurId).at(-1)?.geste;

const suspensionsOfTheLastPause = (evenements: readonly EvenementDuJournal[], operateurId: string): readonly SuspensionJournalisee[] => {
  const derniere = pauseOf(lastGestureOf(evenements, operateurId));
  return suspensionsOf(evenements).filter(({ geste }) => geste.suspension.pause === derniere);
};

const occupiesTheSamePlace = (emplacement: Emplacement, autre: Emplacement): boolean =>
  emplacement.suiviId === autre.suiviId && emplacement.posteId === autre.posteId;

const openActivitiesOf = (referentiel: ReferentielDuPupitre, operateurId: string): readonly Emplacement[] =>
  referentiel.suivis.flatMap(suivi =>
    suivi.activites.filter(activite => activite.operateurId === operateurId).map(activite => ({ ...activite, suiviId: suivi.id })),
  );

const wasRefusedAt = (suspensions: readonly SuspensionJournalisee[], emplacement: Emplacement): boolean =>
  suspensions.some(({ geste, refusee }) => refusee && occupiesTheSamePlace(geste, emplacement));

const holdsWorkstation = (referentiel: ReferentielDuPupitre, operateurId: string, posteId: string | undefined): boolean =>
  posteId === undefined
  || referentiel.operateurs
    .filter(operateur => operateur.id === operateurId)
    .flatMap(operateur => operateur.postes)
    .some(poste => poste.id === posteId);

const reopenableIn =
  (referentiel: ReferentielDuPupitre, operateurId: string, ouvertes: readonly Emplacement[]) =>
  ({ geste, refusee }: SuspensionJournalisee): boolean =>
    !refusee
    && referentiel.suivis.some(suivi => suivi.id === geste.suiviId)
    && holdsWorkstation(referentiel, operateurId, geste.posteId)
    && !ouvertes.some(ouverte => occupiesTheSamePlace(ouverte, geste));

export class PauseEnCours {
  private constructor(private readonly activites: readonly ActiviteSuspendue[]) {}

  static of(journal: JournalDuPupitre, operateurId: string, instant?: number): PauseEnCours | undefined {
    const referentiel = projectReferentiel(journal, instant);
    if (referentiel === undefined) return undefined;
    const suspensions = suspensionsOfTheLastPause(journal.evenements, operateurId);
    const ouvertes = openActivitiesOf(referentiel, operateurId);
    if (ouvertes.some(ouverte => !wasRefusedAt(suspensions, ouverte))) return undefined;
    const activites = suspensions.filter(reopenableIn(referentiel, operateurId, ouvertes)).map(toActiviteSuspendue);
    return activites.length === 0 ? undefined : new PauseEnCours(activites);
  }

  activitesARouvrir(): readonly ActiviteSuspendue[] {
    return this.activites;
  }
}
