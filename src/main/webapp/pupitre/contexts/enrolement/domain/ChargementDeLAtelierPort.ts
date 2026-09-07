export interface ChargementDeLAtelier {
  readonly referentielDisponible: boolean;
  readonly connecte: boolean;
}

export abstract class ChargementDeLAtelierPort {
  abstract etat(): ChargementDeLAtelier;

  abstract charger(): Promise<void>;
}
