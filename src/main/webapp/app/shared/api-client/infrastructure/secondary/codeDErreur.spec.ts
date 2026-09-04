import { HttpErrorResponse } from '@angular/common/http';
import { CodeDErreur, codeDErreur } from './codeDErreur';

const URN = 'urn:glm:erreur:atelier:transition-d-atelier-interdite';
const MESSAGE = 'une REPRISE suppose une PAUSE en cours';
const TITRE = "transition d'atelier interdite";

describe('codeDErreur', () => {
  it('should read the stable code and the message the domain wrote', () => {
    const code = codeDErreur(unRefusFixture({ type: URN, title: TITRE, status: 409, message: MESSAGE }));

    thenItRead(code, URN, MESSAGE);
  });

  it('should read the code of a refusal the back sent no message with', () => {
    const code = codeDErreur(unRefusFixture({ type: URN, title: TITRE, status: 409 }));

    thenItRead(code, URN, '');
  });

  it('should read no code from a failure that never reached the server', () => {
    const code = codeDErreur(new Error('the client is offline'));

    thenItReadNothing(code);
  });

  it('should read no code from a response the server sent without a body', () => {
    const code = codeDErreur(new HttpErrorResponse({ status: 0, error: null }));

    thenItReadNothing(code);
  });

  it('should read no code from a bean validation failure, which names no business refusal', () => {
    const code = codeDErreur(unRefusFixture({ status: 400, errors: { operateur: 'ne doit pas être nul' } }));

    thenItReadNothing(code);
  });

  it('should read no code from a problem detail no business context published', () => {
    const code = codeDErreur(unRefusFixture({ type: 'about:blank', status: 500 }));

    thenItReadNothing(code);
  });

  const unRefusFixture = (corps: unknown): HttpErrorResponse => new HttpErrorResponse({ status: 409, error: corps });

  const thenItRead = (code: CodeDErreur | undefined, urn: string, message: string): void => {
    expect(code).toEqual({ urn, message });
  };

  const thenItReadNothing = (code: CodeDErreur | undefined): void => {
    expect(code).toBeUndefined();
  };
});
