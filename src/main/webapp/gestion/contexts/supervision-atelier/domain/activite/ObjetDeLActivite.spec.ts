import { ElementTravaille } from './ElementTravaille';
import { HorsOf } from './HorsOf';
import { ObjetDeLActivite } from './ObjetDeLActivite';
import { ReferenceDElement } from './ReferenceDElement';

describe('ObjetDeLActivite', () => {
  it('should tell non-billable work apart from a worked element', () => {
    const objets: ObjetDeLActivite[] = [
      new HorsOf(),
      new ElementTravaille({ type: 'PRODUIT', nom: 'PRD-2026-000001', reference: new ReferenceDElement('1015') }),
    ];

    expect(objets.map(objet => objet.isHorsOf())).toEqual([true, false]);
  });

  it('should keep a worked element without inventing the reference it lacks', () => {
    const element = new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000048' });

    expect(element).toMatchObject({ type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000048', reference: undefined });
  });
});
