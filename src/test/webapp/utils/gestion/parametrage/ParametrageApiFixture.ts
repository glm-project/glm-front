export class ParametrageApiFixture {
  duree = 'PT13H';
  readonly durees: string[] = [];

  install(): void {
    cy.intercept('GET', '/api/parametrage', request => {
      request.reply({ dureeMaxDActivite: this.duree });
    }).as('parametrageRead');
    cy.intercept('PUT', '/api/parametrage/duree-max-d-activite', request => {
      const { dureeMaxDActivite } = request.body as { dureeMaxDActivite: string };
      this.durees.push(dureeMaxDActivite);
      this.duree = dureeMaxDActivite;
      request.reply({ dureeMaxDActivite });
    }).as('dureeUpdate');
  }
}
