import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { Instant } from '../instant/Instant';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { EtatDePresence } from '../presence/EtatDePresence';
import { JourneeDeTravail } from '../presence/JourneeDeTravail';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { COULOIRS_DE_SUPERVISION, CouloirDeSupervision } from './CouloirDeSupervision';
import { OperateurSupervise } from './OperateurSupervise';
import { ResultatSupervision, resultatSupervisionExploitable, resultatSupervisionInexploitable } from './ResultatSupervision';

export const SEUIL_DUREE_JOURNEE_OUVERTE_MAXIMALE_MS = 16 * 60 * 60 * 1000;

const isActiviteDUnAbsent = (presence: EtatDePresence, activites: readonly ActiviteDeSupervision[]): boolean =>
  presence === 'ABSENT' && activites.length > 0;

const detectAnomaliesJournee = (journeeOuverte: JourneeDeTravail | undefined, maintenant: Instant): AnomalieDeSupervision[] => {
  if (!journeeOuverte) {
    return [];
  }
  const debut = journeeOuverte.openingInstant();
  if (debut === undefined) {
    return ['JOURNEE_OUVERTE_SANS_FENETRES'];
  }
  if (maintenant.compare(debut) > SEUIL_DUREE_JOURNEE_OUVERTE_MAXIMALE_MS) {
    return ['JOURNEE_OUVERTE_PLUS_DE_16_HEURES'];
  }
  return [];
};

const detectAnomalies = (
  journeeOuverte: JourneeDeTravail | undefined,
  presence: EtatDePresence,
  activitesOperateur: readonly ActiviteDeSupervision[],
  maintenant: Instant,
): AnomalieDeSupervision[] => {
  const anomalies = detectAnomaliesJournee(journeeOuverte, maintenant);
  if (isActiviteDUnAbsent(presence, activitesOperateur)) {
    anomalies.push('ACTIVITE_D_UN_ABSENT');
  }
  return anomalies;
};

const superviseOperateur = (
  operateur: OperateurDeclare,
  journees: readonly JourneeDeTravail[],
  activites: readonly ActiviteDeSupervision[],
  maintenant: Instant,
): OperateurSupervise => {
  const journeeOuverte = journees.find(journee => journee.isOpenFor(operateur.id));
  const presence: EtatDePresence = journeeOuverte?.session ?? 'ABSENT';
  const activitesOperateur = activites.filter(activite => activite.isFor(operateur.id));
  const anomalies = detectAnomalies(journeeOuverte, presence, activitesOperateur, maintenant);
  const journeesOperateur = journees.filter(journee => journee.isFor(operateur.id));
  const segments = journeesOperateur
    .flatMap(journee => journee.segments(maintenant))
    .sort((left, right) => left.debut.compare(right.debut));

  return new OperateurSupervise(operateur, presence, {
    activites: activitesOperateur,
    anomalies,
    heureDOuverture: journeeOuverte?.openingInstant(),
    segments,
  });
};

export interface CouloirSupervise {
  readonly couloir: CouloirDeSupervision;
  readonly operateurs: readonly OperateurSupervise[];
}

export class SupervisionDeLAtelier {
  private constructor(
    readonly operateurs: readonly OperateurSupervise[],
    readonly instantDEvaluation: Instant,
  ) {}

  couloirs(): readonly CouloirSupervise[] {
    return COULOIRS_DE_SUPERVISION.map(couloir => ({
      couloir,
      operateurs: this.operateurs.filter(supervise => supervise.couloir() === couloir),
    }));
  }

  operateursEnNonConformite(): readonly OperateurSupervise[] {
    return this.operateurs.filter(supervise => supervise.isEnNonConformite());
  }

  operateursAVerifier(): readonly OperateurSupervise[] {
    return this.operateurs.filter(supervise => supervise.anomalies.length > 0);
  }

  countPresents(): number {
    return this.operateurs.filter(supervise => supervise.presence === 'PRESENT').length;
  }

  static determine(
    operateursDeclares: readonly OperateurDeclare[],
    journees: readonly JourneeDeTravail[],
    activites: readonly ActiviteDeSupervision[],
    maintenant: Instant,
  ): ResultatSupervision {
    const hasActiviteSansOperateurIdentifiable = activites.some(activite => !activite.hasOperateurIdentifiable(operateursDeclares));
    if (hasActiviteSansOperateurIdentifiable) {
      return resultatSupervisionInexploitable('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    }

    const operateurs = operateursDeclares
      .map(operateur => superviseOperateur(operateur, journees, activites, maintenant))
      .sort((left, right) => left.compareAlphabetically(right));

    return resultatSupervisionExploitable(new SupervisionDeLAtelier(operateurs, maintenant));
  }
}
