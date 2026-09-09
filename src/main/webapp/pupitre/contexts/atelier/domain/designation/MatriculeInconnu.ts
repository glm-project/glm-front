export class MatriculeInconnu extends Error {
  constructor() {
    super('Matricule absent du referentiel local.');
  }
}
