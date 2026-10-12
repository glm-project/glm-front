import { CategorieDElement } from './CategorieDElement';
import { ElementDeLaJournee } from './ElementDeLaJournee';
import { ElementDeLaJourneeId } from './ElementDeLaJourneeId';

const elementDe = (reference: string | undefined): ElementDeLaJournee =>
  new ElementDeLaJournee({
    id: new ElementDeLaJourneeId('element-1'),
    categorie: new CategorieDElement('OF'),
    nom: 'PRD-2026-000015',
    reference,
    description: 'Carter de pompe',
  });

describe('ElementDeLaJournee', () => {
  it('should be numbered by its reference', () => {
    expect(elementDe('24-131').numero()).toBe('24-131');
  });

  it('should be numbered by its name when it has no reference', () => {
    expect(elementDe(undefined).numero()).toBe('PRD-2026-000015');
  });
});
