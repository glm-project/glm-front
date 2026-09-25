import { ElementTravaille } from './ElementTravaille';

describe('ElementTravaille', () => {
  it('should keep a worked element without inventing the reference it lacks', () => {
    const element = new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000048' });

    expect(element).toMatchObject({ type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000048', reference: undefined });
  });
});
