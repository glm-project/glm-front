import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { EtatDePresence } from './EtatDePresence';
import { Instant } from './Instant';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
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
  return new OperateurSupervise(operateur, presence, {
    activites: activitesOperateur,
    anomalies,
    heureDOuverture: journeeOuverte?.openingInstant(),
  });
};

export class SupervisionDeLAtelier {
  private constructor(readonly operateurs: readonly OperateurSupervise[]) {}

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
