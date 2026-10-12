import { AtelierPort } from '@/gestion/contexts/atelier/domain/AtelierPort';
import { ElementEngageId } from '@/gestion/contexts/atelier/domain/ElementEngageId';
import { ActesDAtelierPort } from '@/gestion/contexts/element-de-fabrication/domain/ActesDAtelierPort';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { PassageIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/PassageIntrouvable';
import { ProduitDejaALAtelier } from '@/gestion/contexts/element-de-fabrication/domain/ProduitDejaALAtelier';
import { ProduitIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/ProduitIntrouvable';
import { SuiviDuProduitId } from '@/gestion/contexts/element-de-fabrication/domain/SuiviDuProduitId';
import { actesDAtelierProviders } from '@/gestion/contexts/element-de-fabrication/infrastructure/secondary/actes-d-atelier.providers';
import { TestBed } from '@angular/core/testing';
import { AtelierFixture } from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { ActesDAtelierFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ActesDAtelierFixture';

interface ActesHarness {
  readonly port: ActesDAtelierPort;
  exists(element: string): void;
  engaged(element: string): Promise<string>;
}

const createAtelierHarness = (): ActesHarness => {
  const atelier = new AtelierFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: AtelierPort, useValue: atelier }, ...actesDAtelierProviders],
  });
  return {
    port: TestBed.inject(ActesDAtelierPort),
    exists: element => {
      atelier.photographies.set(element, { nom: 'MOULE-2026-000001', categorie: 'MOULE' });
    },
    engaged: async element => {
      await atelier.mettreALAtelier(new ElementEngageId(element));
      return atelier.liste.at(-1)?.suivi.value ?? '';
    },
  };
};

const createFixtureHarness = (): ActesHarness => {
  const fixture = new ActesDAtelierFixture();
  return {
    port: fixture,
    exists: element => {
      fixture.existants = [...fixture.existants, element];
    },
    engaged: element => {
      fixture.engages = [...fixture.engages, element];
      fixture.suivisOuverts = [...fixture.suivisOuverts, `suivi-${element}`];
      return Promise.resolve(`suivi-${element}`);
    },
  };
};

const adapters: [string, () => ActesHarness][] = [
  ['ActesParLAtelier', createAtelierHarness],
  ['ActesDAtelierFixture', createFixtureHarness],
];

describe.each(adapters)('ActesDAtelierPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: ActesHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should put a product in preparation into the workshop', async () => {
    harness.exists('moule-1');

    const resultat = await harness.port.mettreALAtelier(new ElementDeFabricationId('moule-1'));

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it('should refuse to put into the workshop a product already there', async () => {
    harness.exists('moule-1');
    await harness.engaged('moule-1');

    const resultat = await harness.port.mettreALAtelier(new ElementDeFabricationId('moule-1'));

    expect(resultat).toEqual({ ok: false, error: new ProduitDejaALAtelier() });
  });

  it('should refuse to put into the workshop a product that no longer exists', async () => {
    const resultat = await harness.port.mettreALAtelier(new ElementDeFabricationId('disparu'));

    expect(resultat).toEqual({ ok: false, error: new ProduitIntrouvable() });
  });

  it('should close the passage of a product in the workshop', async () => {
    harness.exists('moule-1');
    const suivi = await harness.engaged('moule-1');

    const resultat = await harness.port.cloturer(new SuiviDuProduitId(suivi));

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it('should refuse to close a passage that no longer exists', async () => {
    const resultat = await harness.port.cloturer(new SuiviDuProduitId('disparu'));

    expect(resultat).toEqual({ ok: false, error: new PassageIntrouvable() });
  });

  it('should reopen the closed passage of a product', async () => {
    harness.exists('moule-1');
    const suivi = new SuiviDuProduitId(await harness.engaged('moule-1'));
    await harness.port.cloturer(suivi);

    const resultat = await harness.port.rouvrir(suivi);

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it('should refuse to reopen a passage that no longer exists', async () => {
    const resultat = await harness.port.rouvrir(new SuiviDuProduitId('disparu'));

    expect(resultat).toEqual({ ok: false, error: new PassageIntrouvable() });
  });
});
