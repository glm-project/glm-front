export class NatureDOperation {
  constructor(readonly value: string) {
    if (value.trim() === '') {
      throw new Error('La nature d’opération reçue du serveur est vide.');
    }
  }
}
