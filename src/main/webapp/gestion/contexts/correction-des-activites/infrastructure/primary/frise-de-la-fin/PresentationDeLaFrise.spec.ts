import { heureDe } from './PresentationDeLaFrise';

describe('Presentation of the frise of the end', () => {
  it('should keep as received an instant it cannot read rather than invent an hour', () => {
    const heure = heureDe('illisible');

    expect(heure).toBe('illisible');
  });
});
