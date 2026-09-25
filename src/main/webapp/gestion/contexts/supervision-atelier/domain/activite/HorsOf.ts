export class HorsOf {
  // Un champ privé rend la classe nominale : sans lui, tout ElementTravaille serait structurellement un HorsOf.
  readonly #horsOf = true;

  isHorsOf(): this is HorsOf {
    return this.#horsOf;
  }
}
