// No Keycloak block yet: the pupitre authenticates through a device grant, against a realm client that
// does not exist. Its client id lands here when an adapter reads it.
export const environment = {
  production: false,
};
