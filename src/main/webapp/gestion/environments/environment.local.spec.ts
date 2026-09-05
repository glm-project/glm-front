import { environment } from './environment.local';

describe('Environment Configuration (development)', () => {
  it('should have production mode disabled', () => {
    thenProductionModeIsDisabled();
  });

  const thenProductionModeIsDisabled = (): void => expect(environment.production).toBeFalsy();
});
