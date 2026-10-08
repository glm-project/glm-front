import { CategorieDElement } from './CategorieDElement';
import { ElementTravaille } from './ElementTravaille';

describe('ElementTravaille', () => {
  it('should keep a worked element without inventing the reference it lacks', () => {
    const element = new ElementTravaille({ categorie: new CategorieDElement('OF'), nom: 'OF-2026-000048' });

    expect([element.categorie.value, element.nom, element.reference]).toEqual(['OF', 'OF-2026-000048', undefined]);
  });
});
