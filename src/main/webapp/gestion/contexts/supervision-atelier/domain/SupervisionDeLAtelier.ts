import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { EtatDePresence } from './EtatDePresence';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';
import { OperateurSupervise } from './OperateurSupervise';
import { ResultatSupervision, resultatSupervisionExploitable, resultatSupervisionInexploitable } from './ResultatSupervision';

export const SEUIL_DUREE_JOURNEE_OUVERTE_MAXIMALE_MS = 16 * 60 * 60 * 1000;

const estActiviteDUnAbsent = (presence: EtatDePresence, activites: readonly ActiviteDeSupervision[]): boolean =>
  presence === 'ABSENT' && activites.length > 0;

const detecterAnomaliesJournee = (journeeOuverte: JourneeDeTravail | undefined, maintenant?: string): AnomalieDeSupervision[] => {
  if (!journeeOuverte) {
    return [];
  }
  const debut = journeeOuverte.heureDOuverture();
  if (debut === undefined) {
    return ['JOURNEE_OUVERTE_SANS_FENETRES'];
  }
  if (maintenant !== undefined) {
    if (Date.parse(maintenant) - Date.parse(debut) > SEUIL_DUREE_JOURNEE_OUVERTE_MAXIMALE_MS) {
      return ['JOURNEE_OUVERTE_PLUS_DE_16_HEURES'];
    }
  }
  return [];
};

const detecterAnomalies = (
  journeeOuverte: JourneeDeTravail | undefined,
  presence: EtatDePresence,
  activitesOperateur: readonly ActiviteDeSupervision[],
  maintenant?: string,
): AnomalieDeSupervision[] => {
  const anomalies = detecterAnomaliesJournee(journeeOuverte, maintenant);
  if (estActiviteDUnAbsent(presence, activitesOperateur)) {
    anomalies.push('ACTIVITE_D_UN_ABSENT');
  }
  return anomalies;
};

const superviserOperateur = (
  operateur: OperateurDeclare,
  journees: readonly JourneeDeTravail[],
  activites: readonly ActiviteDeSupervision[],
  maintenant?: string,
): OperateurSupervise => {
  const journeeOuverte = journees.find(journee => journee.isOpenFor(operateur.id));
  const presence: EtatDePresence = journeeOuverte?.session ?? 'ABSENT';
  const activitesOperateur = activites.filter(activite => activite.isFor(operateur.id));
  const anomalies = detecterAnomalies(journeeOuverte, presence, activitesOperateur, maintenant);
  return new OperateurSupervise(operateur, presence, activitesOperateur, anomalies);
};

export class SupervisionDeLAtelier {
  private constructor(readonly operateurs: readonly OperateurSupervise[]) {}

  static determine(
    operateursDeclares: readonly OperateurDeclare[],
    journees: readonly JourneeDeTravail[],
    activites: readonly ActiviteDeSupervision[] = [],
    maintenant?: string,
  ): ResultatSupervision {
    const aUneActiviteSansOperateurIdentifiable = activites.some(activite => !activite.aUnOperateurIdentifiable(operateursDeclares));
    if (aUneActiviteSansOperateurIdentifiable) {
      return resultatSupervisionInexploitable('ACTIVITE_SANS_OPERATEUR_IDENTIFIABLE');
    }

    const operateurs = operateursDeclares
      .map(operateur => superviserOperateur(operateur, journees, activites, maintenant))
      .sort((left, right) => left.compareAlphabetically(right));

    return resultatSupervisionExploitable(new SupervisionDeLAtelier(operateurs));
  }
}
