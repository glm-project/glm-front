import { ElementDePointage } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { formatDuree, libelleContexteAtelier, LIBELLES_ENTETE_PUPITRE, LIBELLES_POINTAGE } from './LibellesAtelier';

describe('LibellesAtelier', () => {
  it('should format duration in hours and zero-padded minutes', () => {
    expect(formatDuree(5 * 60_000)).toBe('0 h 05');
    expect(formatDuree(65 * 60_000)).toBe('1 h 05');
    expect(formatDuree(120 * 60_000)).toBe('2 h 00');
  });

  it('should map workshop zone labels to natural shop-floor names', () => {
    expect(LIBELLES_POINTAGE.zones.PRODUIT).toBe('Moules');
    expect(LIBELLES_POINTAGE.zones.ORDRE_DE_FABRICATION).toBe('OF');
  });

  it('should resolve gesture context labels for elements and global commands', () => {
    expect(libelleContexteAtelier({ kind: 'ELEMENT', numero: 'OF-42' })).toBe('OF-42');
    expect(libelleContexteAtelier({ kind: 'COMMANDE_GLOBALE', intention: 'PAUSE' })).toBe('PAUSE');
    expect(libelleContexteAtelier({ kind: 'COMMANDE_GLOBALE', intention: 'REPRENDRE' })).toBe('REPRENDRE');
    expect(libelleContexteAtelier({ kind: 'COMMANDE_GLOBALE', intention: 'TOUT_ARRETER' })).toBe('TOUT ARRÊTER');
  });

  it('should expose primary action labels depending on element activity', () => {
    const activeElement = new ElementDePointage('e1', 'OF-1', false, { categorie: 'TRAVAIL', dureeMs: 10_000 });
    const inactiveElement = new ElementDePointage('e2', 'OF-2', false, undefined);

    expect(LIBELLES_POINTAGE.actionPrincipale(activeElement)).toBe('ARRÊTER');
    expect(LIBELLES_POINTAGE.actionPrincipale(inactiveElement)).toBe('DÉMARRER');
  });

  it('should expose secondary action labels depending on non-conformity status', () => {
    const conformingElement = new ElementDePointage('e1', 'OF-1', false, { categorie: 'TRAVAIL', dureeMs: 10_000 });
    const nonConformingElement = new ElementDePointage('e2', 'OF-2', false, { categorie: 'NON_CONFORMITE', dureeMs: 10_000 });

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
