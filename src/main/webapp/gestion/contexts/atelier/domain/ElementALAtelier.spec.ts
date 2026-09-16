import { ActeDAtelier } from './ActeDAtelier';
import { ElementALAtelier } from './ElementALAtelier';
import { EtatALAtelier } from './EtatALAtelier';
import { InstantDAtelier } from './InstantDAtelier';
import { NomDElementEngage } from './NomDElementEngage';
import { SuiviId } from './SuiviId';

describe('ElementALAtelier', () => {
  it.each(['EN_ATTENTE', 'EN_COURS', 'INTERROMPU'] as const)('should still be pointable while it is %s', etat => {
    const element = elementFixture(etat, undefined);

    expect(element.estCloture()).toBe(false);
  });

  it('should no longer be pointable once it is closed', () => {
    const element = elementFixture('CLOTURE', clotureFixture);

    expect(element.estCloture()).toBe(true);
  });

  it('should be addressed by the tracking identifier, the only one the workshop URLs carry', () => {
    const element = elementFixture('EN_COURS', undefined);

    expect(element.suivi.value).toBe('suivi-1');
  });

  it('should keep the name and type photographed at engagement', () => {
    const element = elementFixture('EN_COURS', undefined);

    expect(element.nom.value).toBe('PRD-2026-000001');
    expect(element.type).toBe('PRODUIT');
    expect(element.engagement.auteur).toBe('gestionnaire.impeccmold');
    expect(element.cloture).toBeUndefined();
  });

  const clotureFixture = new ActeDAtelier(new InstantDAtelier('2026-09-15T16:00:00Z'), 'dupont');

  const elementFixture = (etat: EtatALAtelier, cloture: ActeDAtelier | undefined): ElementALAtelier =>
    new ElementALAtelier(new SuiviId('suivi-1'), {
      nom: new NomDElementEngage('PRD-2026-000001'),
      type: 'PRODUIT',
      etat,
      engagement: new ActeDAtelier(new InstantDAtelier('2026-09-14T08:30:00Z'), 'gestionnaire.impeccmold'),
      cloture,
    });
});
