import { Injector } from '@angular/core';
import { IN_MEMORY_TOKEN, InMemoryAuthentication } from './InMemoryAuthentication';

describe('In Memory Authentication', () => {
  let authentication: InMemoryAuthentication;

  beforeEach(() => {
    authentication = Injector.create({ providers: [InMemoryAuthentication] }).get(InMemoryAuthentication);
  });

  it('should hold no token before the session is opened', () => {
    expect(authentication.currentToken()).toBeUndefined();
  });

  it('should hand over a bearer token once the session is opened', async () => {
    await authentication.authenticate();

    expect(authentication.currentToken()).toEqual(IN_MEMORY_TOKEN);
  });

  it('should hand over nothing again once the session is ended', async () => {
    await authentication.authenticate();

    authentication.logout();

    expect(authentication.currentToken()).toBeUndefined();
  });
});
