// Replaced at build time by the --define of `npm run deployed:build:gestion` and
// `npm run deployed:build:pupitre`, which read the DEPLOYED_KEYCLOAK_URL of the deployment. Only the
// environment.deployed.ts of each front names it, and only the `deployed` configuration of a build
// target substitutes that file. The declaration is shared because one TypeScript program compiles both
// fronts: two ambient declarations of the same global would collide.
declare const NG_DEPLOYED_KEYCLOAK_URL: string;
