export class InstantDAtelier {
  readonly value: Date;

  constructor(instant: string) {
    const date = new Date(instant);
    if (Number.isNaN(date.getTime())) {
      throw new Error('L’instant reçu du serveur n’est pas une date valide.');
    }
    this.value = date;
  }
}
