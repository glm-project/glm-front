import { AtelierPort } from '@/gestion/contexts/atelier/domain/AtelierPort';
import { ElementEngageId } from '@/gestion/contexts/atelier/domain/ElementEngageId';
import { ActesDAtelierPort } from '@/gestion/contexts/element-de-fabrication/domain/ActesDAtelierPort';
import { ElementDeFabricationId } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '@/gestion/contexts/element-de-fabrication/domain/ElementDeFabricationIntrouvable';
import { ProduitDejaALAtelier } from '@/gestion/contexts/element-de-fabrication/domain/ProduitDejaALAtelier';
import { actesDAtelierProviders } from '@/gestion/contexts/element-de-fabrication/infrastructure/secondary/actes-d-atelier.providers';
import { TestBed } from '@angular/core/testing';
import { AtelierFixture } from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { ActesDAtelierFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ActesDAtelierFixture';

interface ActesHarness {
  readonly port: ActesDAtelierPort;
  exists(element: string): void;
  engaged(element: string): void;
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
    engaged: element => {
      void atelier.mettreALAtelier(new ElementEngageId(element));
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
    harness.engaged('moule-1');

    const resultat = await harness.port.mettreALAtelier(new ElementDeFabricationId('moule-1'));

    expect(resultat).toEqual({ ok: false, error: new ProduitDejaALAtelier() });
  });

  it('should refuse to put into the workshop a product that no longer exists', async () => {
    const resultat = await harness.port.mettreALAtelier(new ElementDeFabricationId('disparu'));

    expect(resultat).toEqual({ ok: false, error: new ElementDeFabricationIntrouvable() });
  });
});
