import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDeReleve } from './PointageDeReleve';
import { TypeDePointage } from './TypeDePointage';

/** Ce qu'un pointage ouvre : une présence après une arrivée ou une reprise, une pause après une pause. */
const OUVRE: Partial<Record<TypeDePointage, boolean>> = { ARRIVEE: false, REPRISE: false, PAUSE: true };

interface Assemblage {
  readonly plages: readonly PlageDeReleve[];
  readonly ouverte: PlageDeReleve | undefined;
}

const referme = (assemblage: Assemblage, fin: PointageDeReleve): readonly PlageDeReleve[] => {
  const ouverte = assemblage.ouverte;
  if (ouverte === undefined) {
    return assemblage.plages;
  }
  return [...assemblage.plages, new PlageDeReleve(ouverte.debut, fin.instant, ouverte.pause)];
};

/**
 * Tout pointage referme l'intervalle ouvert, puis en ouvre un s'il en ouvre un. Un journal incohérent — une
 * reprise sans pause — produit donc un dessin approximatif plutôt que rien, et le journal du jour, lui, reste
 * affiché tel quel : c'est lui la vérité. Le back valide tout le journal à chaque écriture, ce cas n'est pas
 * censé arriver.
 */
const empile = (assemblage: Assemblage, pointage: PointageDeReleve): Assemblage => {
  const ouvre = OUVRE[pointage.type];
  const plages = referme(assemblage, pointage);
  if (ouvre === undefined) {
    return { plages, ouverte: undefined };
  }
  return { plages, ouverte: new PlageDeReleve(pointage.instant, undefined, ouvre) };
};

export class JourDeReleve {
  readonly pointages: readonly PointageDeReleve[];

  constructor(
    readonly jour: JourCalendaire,
    readonly duree: DureeTravaillee,
    pointages: readonly PointageDeReleve[],
  ) {
    this.pointages = [...pointages];
  }

  /**
   * Un jour vide et un jour à durée nulle sont deux faits différents : quelqu'un qui pointe son arrivée et son
   * départ dans la même minute ne doit pas avoir l'air absent.
   */
  estSansPointage(): boolean {
    return this.pointages.length === 0;
  }

  /** Les intervalles que le journal dessine, présences et pauses mêlées, dans l'ordre des heures. */
  plages(): readonly PlageDeReleve[] {
    const assemblage = this.pointages.reduce<Assemblage>(empile, { plages: [], ouverte: undefined });
    return assemblage.ouverte === undefined ? assemblage.plages : [...assemblage.plages, assemblage.ouverte];
  }
}
