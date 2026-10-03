import { Page } from '../../domain/Page';
import { PAGE_SIZE } from './buildPageFrom';

const inconsistentTotal = (received: number, expected: number | undefined): boolean =>
  !Number.isSafeInteger(received) || received < 0 || (expected !== undefined && received !== expected);

const verifyPage = <Wire>(response: Page<Wire>, total: number | undefined, acquired: number): void => {
  if (inconsistentTotal(response.totalCount, total)) {
    throw new Error('Le nombre des entrées est incohérent pendant la lecture.');
  }
  if (response.elements.length !== Math.min(PAGE_SIZE, response.totalCount - acquired)) {
    throw new Error('Le référentiel reçu est tronqué.');
  }
};

export const collectAllPages = async <Wire>(
  read: (page: number, size: number) => Promise<Page<Wire>>,
  identity: (wire: Wire) => string,
): Promise<readonly Wire[]> => {
  const entries: Wire[] = [];
  let page = 0;
  let total: number | undefined;
  do {
    const response = await read(page, PAGE_SIZE);
    verifyPage(response, total, entries.length);
    total = response.totalCount;
    entries.push(...response.elements);
    page += 1;
  } while (entries.length < total);
  if (new Set(entries.map(identity)).size !== entries.length) {
    throw new Error('Le référentiel contient une identité dupliquée.');
  }
  return entries;
};
