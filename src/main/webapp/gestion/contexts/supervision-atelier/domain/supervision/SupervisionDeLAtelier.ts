import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { Instant } from '../instant/Instant';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { EtatDePresence } from '../presence/EtatDePresence';
import { JourneeDeTravail } from '../presence/JourneeDeTravail';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { OperateurSupervise } from './OperateurSupervise';
import { ResultatSupervision, resultatSupervisionExploitable, resultatSupervisionInexploitable } from './ResultatSupervision';
import { StatistiquesSupervision } from './StatistiquesSupervision';

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

export class SupervisionDeLAtelier {
  readonly statistiques: StatistiquesSupervision;

  private constructor(readonly operateurs: readonly OperateurSupervise[]) {
    this.statistiques = {
      total: operateurs.length,
      presents: operateurs.filter(op => op.presence === 'PRESENT').length,
      enPause: operateurs.filter(op => op.presence === 'EN_PAUSE').length,
      absents: operateurs.filter(op => op.presence === 'ABSENT').length,
      sansAffectation: operateurs.filter(op => op.isSansAffectation()).length,
      anomalies: operateurs.filter(op => op.anomalies.length > 0).length,
    };
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

    return resultatSupervisionExploitable(new SupervisionDeLAtelier(operateurs));
  }
}
