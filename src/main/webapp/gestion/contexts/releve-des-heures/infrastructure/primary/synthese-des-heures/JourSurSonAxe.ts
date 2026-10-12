import { AxeDuJour, minutesDeDebut, minutesDeFin } from '@/gestion/shared/design-system/infrastructure/primary/axe-du-jour/AxeDuJour';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';

export interface JourSurSonAxe {
  readonly jour: JourDeReleve;
  readonly axe: AxeDuJour;
  readonly ouvert: boolean;
  readonly pointageChoisi: PointageDeReleve | undefined;
}

interface Borne {
  readonly debut: InstantDeReleve;
  estEnCours(): boolean;
  finOuDebut(): InstantDeReleve;
}

const bornesDe = (borne: Borne): readonly number[] =>
  borne.estEnCours()
    ? [minutesDeDebut(borne.debut.value)]
    : [minutesDeDebut(borne.debut.value), minutesDeFin(borne.debut.value, borne.finOuDebut().value)];

const bornesDuJour = (jour: JourDeReleve, ouvert: boolean): readonly number[] => [
  ...jour.intervalles.flatMap(bornesDe),
  ...(ouvert ? jour.pointages.map(pointage => minutesDeDebut(pointage.instant.value)) : []),
];

const estOuvert = (jour: JourCalendaire, ouvert: JourCalendaire | undefined): boolean => ouvert !== undefined && jour.estLeMeme(ouvert);

export const jourSurSonAxe = (
  jour: JourDeReleve,
  ouvert: JourCalendaire | undefined,
  choix: number | undefined,
  axe?: AxeDuJour,
): JourSurSonAxe => {
  const estLeJourOuvert = estOuvert(jour.jour, ouvert);
  return {
    jour,
    axe: axe ?? AxeDuJour.de(bornesDuJour(jour, estLeJourOuvert)),
    ouvert: estLeJourOuvert,
    pointageChoisi: estLeJourOuvert && choix !== undefined ? jour.pointages[choix] : undefined,
  };
};
