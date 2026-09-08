import { ElementDePointage } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { NumeroDElement } from '@/pupitre/contexts/atelier/domain/designation/NumeroDElement';
import { LIBELLES_ENTETE_PUPITRE, LIBELLES_POINTAGE, toLibelleContexteAtelier } from './LibellesAtelier';

describe('LibellesAtelier', () => {
  it('should format duration label in hours and zero-padded minutes', () => {
    expect(LIBELLES_POINTAGE.duree(5 * 60_000)).toBe('depuis 0 h 05');
    expect(LIBELLES_POINTAGE.duree(65 * 60_000)).toBe('depuis 1 h 05');
    expect(LIBELLES_POINTAGE.duree(120 * 60_000)).toBe('depuis 2 h 00');
  });

  it('should map workshop zone labels to natural shop-floor names', () => {
    expect(LIBELLES_POINTAGE.zones.PRODUIT).toBe('Moules');
    expect(LIBELLES_POINTAGE.zones.ORDRE_DE_FABRICATION).toBe('OF');
  });

  it('should resolve gesture context labels for elements and global commands', () => {
    expect(toLibelleContexteAtelier({ kind: 'ELEMENT', numero: NumeroDElement.attribue('OF-42') })).toBe('OF-42');
    expect(toLibelleContexteAtelier({ kind: 'COMMANDE_GLOBALE', intention: 'PAUSE' })).toBe('PAUSE');
    expect(toLibelleContexteAtelier({ kind: 'COMMANDE_GLOBALE', intention: 'REPRENDRE' })).toBe('REPRENDRE');
    expect(toLibelleContexteAtelier({ kind: 'COMMANDE_GLOBALE', intention: 'TOUT_ARRETER' })).toBe('TOUT ARRÊTER');
  });

  it('should expose primary action labels depending on element activity', () => {
    const activeElement = new ElementDePointage('e1', NumeroDElement.attribue('OF-1'), { categorie: 'TRAVAIL', dureeMs: 10_000 });
    const inactiveElement = new ElementDePointage('e2', NumeroDElement.attribue('OF-2'), undefined);

    expect(LIBELLES_POINTAGE.actionPrincipale(activeElement)).toBe('ARRÊTER');
    expect(LIBELLES_POINTAGE.actionPrincipale(inactiveElement)).toBe('DÉMARRER');
  });

  it('should expose secondary action labels depending on non-conformity status', () => {
    const conformingElement = new ElementDePointage('e1', NumeroDElement.attribue('OF-1'), { categorie: 'TRAVAIL', dureeMs: 10_000 });
    const nonConformingElement = new ElementDePointage('e2', NumeroDElement.attribue('OF-2'), {
      categorie: 'NON_CONFORMITE',
      dureeMs: 10_000,
    });

    expect(LIBELLES_POINTAGE.actionSecondaire(conformingElement)).toBe('NC');
    expect(LIBELLES_POINTAGE.actionSecondaire(nonConformingElement)).toBe('BON');
  });

  it('should format header operator code and presence labels', () => {
    expect(LIBELLES_ENTETE_PUPITRE.code('049')).toBe('Code 049');
    expect(LIBELLES_ENTETE_PUPITRE.enLigne).toBe('En ligne');
    expect(LIBELLES_ENTETE_PUPITRE.horsLigne).toBe('Hors ligne');
    expect(LIBELLES_ENTETE_PUPITRE.fin).toBe("J'ai fini");
  });
});
