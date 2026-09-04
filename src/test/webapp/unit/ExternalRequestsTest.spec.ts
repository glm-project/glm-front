import { readFileSync } from 'node:fs';

const DOCUMENTS_THE_FRONTS_BOOT_FROM = ['src/main/webapp/gestion/index.html', 'src/main/webapp/pupitre/index.html'];

const URL_WITH_A_HOST = /(?:https?:)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;

const whenReadingTheHostsNamedBy = (document: string): string[] =>
  [...readFileSync(document, 'utf8').matchAll(URL_WITH_A_HOST)].map(([url]) => url);

const thenItAsksNoThirdParty = (hosts: string[]): void => {
  expect(hosts).toEqual([]);
};

describe('ExternalRequestsTest', () => {
  it.each(DOCUMENTS_THE_FRONTS_BOOT_FROM)('should let %s boot without asking a third party for anything', document => {
    const hosts = whenReadingTheHostsNamedBy(document);

    thenItAsksNoThirdParty(hosts);
  });
});
