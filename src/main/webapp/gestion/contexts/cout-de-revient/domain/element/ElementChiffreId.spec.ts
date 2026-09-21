import { ElementChiffreId } from './ElementChiffreId';

describe('ElementChiffreId', () => {
  it('should carry the identifier as the address bar gave it', () => {
    expect(new ElementChiffreId('4f8d1e0a').value).toBe('4f8d1e0a');
  });
});
