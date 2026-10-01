export class IdentifiantInconnu extends Error {
  constructor() {
    super('Identifiant absent du referentiel local.');
  }
}
