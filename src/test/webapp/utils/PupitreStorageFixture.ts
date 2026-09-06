interface DurablePupitreFixture {
  entreprise: string;
  geste: { id: string; dateDeSurvenue: string; operateurId: string };
}

export const pupitreTokenFixture = (entreprise: string): string => `header.${btoa(JSON.stringify({ tenant: entreprise }))}.signature`;

const persistDurablePupitreFixture = (window: Cypress.AUTWindow, fixture: DurablePupitreFixture): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.open('glm-pupitre', 1);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('documents', 'readwrite');
      const token = pupitreTokenFixture(fixture.entreprise);
      transaction.objectStore('documents').put(
        {
          tenant: fixture.entreprise,
          session: {
            tenant: fixture.entreprise,
            accessToken: token,
            refreshToken: 'refresh-fixture',
            expiresAt: Date.now() + 300_000,
          },
        },
        'enrolement',
      );
      transaction.objectStore('documents').put(
        {
          connecte: true,
          referentiel: { operateurs: [], suivis: [] },
          evenements: [
            {
              etat: 'EN_ATTENTE',
              geste: {
                id: fixture.geste.id,
                dateDeSurvenue: fixture.geste.dateDeSurvenue,
                operateurId: fixture.geste.operateurId,
                nature: 'ARRIVEE',
              },
            },
          ],
        },
        `atelier:${fixture.entreprise}`,
      );
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error('Fixture non conservee'));
      };
    };
    request.onerror = () => reject(new Error('Stockage fixture inaccessible'));
  });

export const givenDurablePupitreFixture = (fixture: DurablePupitreFixture): void => {
  cy.window().then(window => persistDurablePupitreFixture(window, fixture));
};

export const clearPupitreStorageFixture = (): void => {
  cy.window().then(
    window =>
      new Cypress.Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase('glm-pupitre');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Impossible de nettoyer le stockage fixture'));
      }),
  );
};
