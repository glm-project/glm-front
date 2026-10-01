import {
  ActiviteDuPupitre,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
  SuiviDuPupitre,
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
  readonly posteId?: string;
}

type GesteSuspendu = GesteDePointage & { readonly suspension: Suspension };

interface SuspensionJournalisee {
  readonly geste: GesteSuspendu;
  readonly refusee: boolean;
}

const isSuspension = (geste: GesteDePointage): geste is GesteSuspendu => geste.suspension !== undefined;

const toActiviteSuspendue = ({ geste: { suiviId, posteId, suspension } }: SuspensionJournalisee): ActiviteSuspendue =>
  posteId === undefined ? { suiviId, reouverture: suspension.reouverture } : { suiviId, posteId, reouverture: suspension.reouverture };

const suspensionsOf = (evenements: readonly EvenementDuJournal[]): readonly SuspensionJournalisee[] =>
  evenements.flatMap(({ geste, etat }) => (isSuspension(geste) ? [{ geste, refusee: etat === 'REFUSE' }] : []));

const pauseOf = (geste: GesteDePointage | undefined): string | undefined =>
  geste?.nature === 'POINTAGE' ? geste.suspension?.pause : undefined;

const lastGestureOf = (evenements: readonly EvenementDuJournal[], operateurId: string): GesteDePointage | undefined =>
  evenements.filter(({ geste }) => geste.operateurId === operateurId).at(-1)?.geste;

const suspensionsOfTheLastPause = (evenements: readonly EvenementDuJournal[], operateurId: string): readonly SuspensionJournalisee[] => {
  const derniere = pauseOf(lastGestureOf(evenements, operateurId));
  return suspensionsOf(evenements).filter(({ geste }) => geste.suspension.pause === derniere);
};

const occupiesTheSamePlace = (emplacement: Emplacement, autre: Emplacement): boolean =>
  emplacement.suiviId === autre.suiviId && emplacement.posteId === autre.posteId;

const isActionnable = (activite: ActiviteDuPupitre, suivi: SuiviDuPupitre, operateurId: string, instant: number): boolean =>
  activite.operateurId === operateurId
  && instant < Date.parse(activite.echeance)
  && !suivi.conflits.some(conflit => conflit.activites.includes(activite.ouverture));

const suspensionInterpretable = (referentiel: ReferentielDuPupitre, geste: GesteSuspendu): boolean =>
  !referentiel.suivis.some(suivi => suivi.conflits.some(conflit => conflit.pointages.includes(geste.id)));

const openActivitiesOf = (referentiel: ReferentielDuPupitre, operateurId: string, instant: number): readonly Emplacement[] =>
  referentiel.suivis.flatMap(suivi =>
    suivi.activites
      .filter(activite => isActionnable(activite, suivi, operateurId, instant))
      .map(activite => ({ ...activite, suiviId: suivi.id })),
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
    && suspensionInterpretable(referentiel, geste)
    && holdsWorkstation(referentiel, operateurId, geste.posteId)
    && !ouvertes.some(ouverte => occupiesTheSamePlace(ouverte, geste));

export class PauseEnCours {
  private constructor(private readonly activites: readonly ActiviteSuspendue[]) {}

  static of(journal: JournalDuPupitre, operateurId: string, instant: number): PauseEnCours | undefined {
    const referentiel = projectReferentiel(journal);
    if (referentiel === undefined) return undefined;
    const suspensions = suspensionsOfTheLastPause(journal.evenements, operateurId).filter(
      ({ geste }) => !journal.pausesArretees?.includes(geste.suspension.pause),
    );
    const ouvertes = openActivitiesOf(referentiel, operateurId, instant);
    if (ouvertes.some(ouverte => !wasRefusedAt(suspensions, ouverte))) return undefined;
    const activites = suspensions.filter(reopenableIn(referentiel, operateurId, ouvertes)).map(toActiviteSuspendue);
    return activites.length === 0 ? undefined : new PauseEnCours(activites);
  }

  activitesARouvrir(): readonly ActiviteSuspendue[] {
    return this.activites;
  }
}
