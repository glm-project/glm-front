export class OperateurId {
  constructor(readonly value: string) {
    if (value.trim() === '') {
      throw new Error('Un opérateur est désigné par un identifiant.');
    }
  }
}
