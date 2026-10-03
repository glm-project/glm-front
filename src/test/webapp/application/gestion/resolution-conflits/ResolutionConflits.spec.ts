import { dataSelector } from '../../../utils/DataSelector';

describe('Conflict resolution demonstration in Gestion', () => {
  it('should preview then explicitly confirm one correction and refresh the global list', () => {
    whenVisitingConflicts();
    whenOpeningTheFirstDossier();
    whenChoosingTheFirstCorrection();
    whenPreviewingTheDecision();
    whenConfirmingThePreview();
    whenReturningToTheList();

    thenTheConflictListIsEmpty();
  });
  it('should open the addressed dossier and expose the contradictory target without choosing a correction', () => {
    whenVisitingConflicts();
    whenOpeningTheFirstDossier();

    thenTheContradictoryTargetIsVisible();
  });
  it('should open the global list from its shared address and identify the demonstration', () => {
    whenVisitingConflicts();

    thenTheConflictListIsVisible();
  });

  it('should resolve the retroactive dossier in two acts while retaining closure and linking the other conflict', () => {
    whenOpeningTheClosedRetroactiveDossier();
    whenRegularisingTheRestart();
    whenCorrectingTheRemainingEnd();
    whenOpeningTheExplicitContinuation();

    thenTheClosedElementRetainsItsOtherAddressedConflict();
  });

  const whenOpeningTheClosedRetroactiveDossier = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/conflits/demo-retroactif?pointage=fin-17');
  };

  const whenRegularisingTheRestart = (): void => {
    cy.get(dataSelector('conflit-choix')).first().click();
    cy.get(dataSelector('conflit-previsualiser')).click();
    cy.get(dataSelector('conflit-confirmer')).click();
    cy.get(dataSelector('conflit-resultat')).invoke('text').as('intermediate', { type: 'static' });
  };

  const whenCorrectingTheRemainingEnd = (): void => {
    cy.get(dataSelector('conflit-choix')).first().click();
    cy.get(dataSelector('conflit-motif')).type('La fin concernait la reprise de 14 h.');
    cy.get(dataSelector('conflit-previsualiser')).click();
    cy.get(dataSelector('conflit-confirmer')).click();
  };

  const whenOpeningTheExplicitContinuation = (): void => {
    cy.get(dataSelector('conflit-continuation')).click();
  };

  const thenTheClosedElementRetainsItsOtherAddressedConflict = (): void => {
    cy.get('@intermediate').should('contain', 'Acte enregistré, conflit restant');
    cy.location('search').should('contain', 'pointage=fin-tour-10-bis');
    cy.get(dataSelector('conflit-cloture')).should('contain.text', 'Clôturé');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 8);
    cy.get(dataSelector('conflit-diagnostic')).should('contain.text', 'Deux fins');
  };

  const whenVisitingConflicts = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/conflits?element=demo-moule-42');
  };

  const whenOpeningTheFirstDossier = (): void => {
    cy.get(dataSelector('conflit-ouvrir')).first().click();
  };

  const whenChoosingTheFirstCorrection = (): void => {
    cy.get(dataSelector('conflit-choix')).first().click();
    cy.get(dataSelector('conflit-motif')).type('Cible vérifiée avec l’opérateur');
  };
  const whenPreviewingTheDecision = (): void => {
    cy.get(dataSelector('conflit-previsualiser')).click();
    cy.get(dataSelector('conflit-apercu')).should('contain.text', 'Conflit résolu');
  };
  const whenConfirmingThePreview = (): void => {
    cy.get(dataSelector('conflit-confirmer')).click();
    cy.get(dataSelector('conflit-resultat')).should('contain.text', 'Conflit résolu');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 4);
  };
  const whenReturningToTheList = (): void => {
    cy.get(dataSelector('conflit-retour')).click();
  };
  const thenTheConflictListIsEmpty = (): void => {
    cy.get(dataSelector('conflits-vide-filtre')).should('contain.text', 'Aucun conflit');
    cy.get(dataSelector('conflit-ligne')).should('not.exist');
  };

  const thenTheContradictoryTargetIsVisible = (): void => {
    cy.location('pathname').should('eq', '/conflits/demo-remplacement');
    cy.location('search').should('contain', 'pointage=fin-17');
    cy.get(dataSelector('conflit-diagnostic')).should('contain.text', 'vise le travail commencé à 8 h');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
    cy.get(dataSelector('conflit-choix')).should('have.length', 2);
    cy.get(dataSelector('conflit-motif')).should('not.exist');
  };

  const thenTheConflictListIsVisible = (): void => {
    cy.get(dataSelector('conflits-demo')).should('contain.text', 'Démonstration');
    cy.get(dataSelector('conflit-ligne')).should('have.length', 1);
    cy.get(dataSelector('gestion-navigation-conflits')).should('have.attr', 'href', '/conflits');
  };
});
