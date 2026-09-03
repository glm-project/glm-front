import type { HttpResponseInterceptor, RouteMatcher, StaticResponse } from 'cypress/types/net-stubbing';

type ResponseSender = {
  send: () => void;
};

const createDeferredPromise = (): [Promise<void>, () => void] => {
  let resolvePromise: () => void = () => {};

  const promise = new Promise<void>(resolve => {
    resolvePromise = resolve;
  });

  return [promise, resolvePromise];
};

export const interceptForever = (
  requestMatcher: RouteMatcher,
  response?: StaticResponse | HttpResponseInterceptor,
  alias?: string,
): ResponseSender => {
  const [deferredPromise, resolveDeferredPromise] = createDeferredPromise();

  cy.intercept(requestMatcher, request =>
    deferredPromise.then(() => {
      request.reply(response);
    }),
  ).as(alias ?? 'request');

  return { send: resolveDeferredPromise };
};
