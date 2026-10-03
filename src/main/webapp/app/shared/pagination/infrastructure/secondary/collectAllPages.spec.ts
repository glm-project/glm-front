import { Page } from '../../domain/Page';
import { collectAllPages } from './collectAllPages';

class CatalogueFixture {
  readonly requests: number[] = [];
  constructor(readonly pages: readonly Page<string>[]) {}
  async read(page: number): Promise<Page<string>> {
    this.requests.push(page);
    await new Promise(resolve => setTimeout(resolve));
    const response = this.pages[page];
    if (response === undefined) throw new Error('Page indisponible');
    return response;
  }
}

const entriesFixture = Array.from({ length: 101 }, (_, index) => String(index));

describe('Complete catalogue acquisition', () => {
  it('should retain the entries beyond the first server page', async () => {
    const fixture = new CatalogueFixture([new Page(entriesFixture.slice(0, 100), 101), new Page(entriesFixture.slice(100), 101)]);

    const entries = await whenCatalogueRead(fixture);

    expect(entries).toEqual(entriesFixture);
  });

  it('should accept a completely empty catalogue', async () => {
    const fixture = new CatalogueFixture([new Page([], 0)]);

    const entries = await whenCatalogueRead(fixture);

    expect(entries).toEqual([]);
    expect(fixture.requests).toEqual([0]);
  });

  it.each([-1, 1.5])('should reject an invalid total %s', async total => {
    const fixture = new CatalogueFixture([new Page([], total)]);

    const result = whenCatalogueRead(fixture);

    await expect(result).rejects.toThrow('Le nombre des entrées est incohérent');
  });

  it('should reject a total that changes while subsequent pages arrive', async () => {
    const fixture = new CatalogueFixture([new Page(entriesFixture.slice(0, 100), 101), new Page(['100'], 102)]);

    const result = whenCatalogueRead(fixture);

    await expect(result).rejects.toThrow('Le nombre des entrées est incohérent');
  });

  it('should refuse a truncated page instead of exposing a partial search catalogue', async () => {
    const fixture = new CatalogueFixture([new Page(['0'], 101)]);

    const result = whenCatalogueRead(fixture);

    await expect(result).rejects.toThrow('Le référentiel reçu est tronqué');
  });

  it('should reject a duplicate identity across pages', async () => {
    const fixture = new CatalogueFixture([new Page(entriesFixture.slice(0, 100), 101), new Page(['0'], 101)]);

    const result = whenCatalogueRead(fixture);

    await expect(result).rejects.toThrow('Le référentiel contient une identité dupliquée');
  });

  it('should reject a failed later page without returning the previously acquired entries', async () => {
    const fixture = new CatalogueFixture([new Page(entriesFixture.slice(0, 100), 101)]);

    const result = whenCatalogueRead(fixture);

    await expect(result).rejects.toThrow('Page indisponible');
  });
});

const whenCatalogueRead = (fixture: CatalogueFixture): Promise<readonly string[]> =>
  collectAllPages(
    page => fixture.read(page),
    entry => entry,
  );
