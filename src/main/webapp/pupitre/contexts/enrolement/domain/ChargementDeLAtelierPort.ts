export interface ChargementDeLAtelier {
  readonly referentielDisponible: boolean;
  readonly connecte: boolean;
}

export type IssueDuChargementDeLAtelier = 'CHARGE' | 'ECHEC';

export abstract class ChargementDeLAtelierPort {
  abstract etat(): ChargementDeLAtelier;

  abstract charger(): Promise<IssueDuChargementDeLAtelier>;
}
