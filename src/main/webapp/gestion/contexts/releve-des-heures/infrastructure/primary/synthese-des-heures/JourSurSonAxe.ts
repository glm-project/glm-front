import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { AxeDuJour, minutesDeDebut, minutesDeFin } from './AxeDuJour';

export interface JourSurSonAxe {
  readonly jour: JourDeReleve;
  readonly axe: AxeDuJour;
  readonly ouvert: boolean;
  readonly pointageChoisi: PointageDeReleve | undefined;
}

const bornesDe = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): readonly number[] =>
  fin === undefined ? [minutesDeDebut(debut)] : [minutesDeDebut(debut), minutesDeFin(debut, fin)];

const bornesDuJour = (jour: JourDeReleve, ouvert: boolean): readonly number[] => [
  ...jour.plages.flatMap(plage => bornesDe(plage.debut, plage.fin)),
  ...jour.intervalles.flatMap(intervalle => bornesDe(intervalle.debut, intervalle.fin)),
  ...(ouvert ? jour.pointages.map(pointage => minutesDeDebut(pointage.instant)) : []),
];

const estOuvert = (jour: JourCalendaire, ouvert: JourCalendaire | undefined): boolean => ouvert !== undefined && jour.estLeMeme(ouvert);

export const jourSurSonAxe = (jour: JourDeReleve, ouvert: JourCalendaire | undefined, choix: number | undefined): JourSurSonAxe => {
  const estLeJourOuvert = estOuvert(jour.jour, ouvert);
  return {
    jour,
    axe: AxeDuJour.de(bornesDuJour(jour, estLeJourOuvert)),
    ouvert: estLeJourOuvert,
    pointageChoisi: estLeJourOuvert && choix !== undefined ? jour.pointages[choix] : undefined,
  };
};
