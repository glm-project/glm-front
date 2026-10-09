const VERSION_DEPOSEE = 'fedcba9876543210';

const sur32 = (valeur: number): number[] => [(valeur >>> 24) & 0xff, (valeur >>> 16) & 0xff, (valeur >>> 8) & 0xff, valeur & 0xff];

export const pngFixture = (largeur: number, hauteur: number): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0,
    0,
    0,
    13,
    0x49,
    0x48,
    0x44,
    0x52,
    ...sur32(largeur),
    ...sur32(hauteur),
    8,
    2,
    0,
    0,
    0,
  ]);

export class ParametrageApiFixture {
  duree = 'PT13H';
  logo: string | undefined;
  readonly durees: string[] = [];
  depots = 0;
  retraits = 0;

  install(): void {
    cy.intercept('GET', '/api/parametrage', request => {
      request.reply(
        this.logo === undefined ? { dureeMaxDActivite: this.duree } : { dureeMaxDActivite: this.duree, logo: { version: this.logo } },
      );
    }).as('parametrageRead');
    cy.intercept('PUT', '/api/parametrage/duree-max-d-activite', request => {
      const { dureeMaxDActivite } = request.body as { dureeMaxDActivite: string };
      this.durees.push(dureeMaxDActivite);
      this.duree = dureeMaxDActivite;
      request.reply({ dureeMaxDActivite });
    }).as('dureeUpdate');
    cy.intercept('PUT', '/api/parametrage/logo', request => {
      this.depots += 1;
      this.logo = VERSION_DEPOSEE;
      request.reply({ version: VERSION_DEPOSEE });
    }).as('logoDepot');
    cy.intercept('DELETE', '/api/parametrage/logo', request => {
      this.retraits += 1;
      this.logo = undefined;
      request.reply({ statusCode: 204 });
    }).as('logoRetrait');
    cy.intercept('GET', '/api/parametrage/logo/*', request => {
      request.reply({ statusCode: 200, headers: { 'content-type': 'image/png' }, body: Cypress.Buffer.from(pngFixture(50, 50)) });
    }).as('logoImage');
  }
}
