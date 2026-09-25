import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { CoutDeRevientFixture } from '@test/unit/fixtures/gestion/cout-de-revient/CoutDeRevientFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ElementChiffre } from '../../../domain/element/ElementChiffre';
import { TypeDElementChiffre } from '../../../domain/element/TypeDElementChiffre';
import { Cout } from '../../../domain/montant/Cout';
import { Montant } from '../../../domain/montant/Montant';
import { CoutDeRevient } from '../../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../../domain/rapport/NatureDOperation';
import { DureePassee } from '../../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../../domain/temps/TempsPasse';
import { CoutDeRevientDeLElement } from './CoutDeRevientDeLElement';

const ELEMENT = '4f8d1e0a-1111-2222-3333-444455556666';

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ element: ELEMENT }));
}

/**
 * Les périodes s'affichent dans le fuseau du navigateur. Partir d'une heure locale garde le scénario vrai
 * sur un runner en UTC comme sur une machine à Paris, sans cesser de prouver que l'écran formate l'instant reçu.
 */
const instantFixture = (heure: number, minute: number): InstantDeTravail =>
  new InstantDeTravail(new Date(2026, 4, 11, heure, minute).toISOString());

const periodeFixture = (debut: number, fin: number): PeriodeDeTravail =>
  new PeriodeDeTravail(instantFixture(debut, 0), instantFixture(fin, 0));

interface LigneFixture {
  readonly nature: string | undefined;
  readonly travail: string;
  readonly nonConformite: string;
  readonly total: string;
  readonly machine: number;
  readonly mainDOeuvre: number;
  readonly reprises: readonly PeriodeDeTravail[];
}

const ligneFixture = (fixture: Partial<LigneFixture> = {}): LigneDeCout => {
  const ligne: LigneFixture = {
    nature: 'Fraisage',
    travail: 'PT2H',
    nonConformite: 'PT0S',
    total: 'PT2H',
    machine: 90,
    mainDOeuvre: 40,
    reprises: [],
    ...fixture,
  };
  return new LigneDeCout({
    nature: ligne.nature === undefined ? undefined : new NatureDOperation(ligne.nature),
    periode: periodeFixture(9, 11),
    temps: new TempsPasse(new DureePassee(ligne.travail), new DureePassee(ligne.nonConformite), new DureePassee(ligne.total)),
    cout: new Cout(new Montant(ligne.machine), new Montant(ligne.mainDOeuvre), new Montant(ligne.machine + ligne.mainDOeuvre)),
    nonConformites: ligne.reprises,
  });
};

const rapportFixture = (lignes: readonly LigneDeCout[], type: TypeDElementChiffre = 'ORDRE_DE_FABRICATION'): CoutDeRevient =>
  new CoutDeRevient(new ElementChiffre('OF-2026-000001', type), {
    lignes,
    temps: new TempsPasse(new DureePassee('PT3H'), new DureePassee('PT30M'), new DureePassee('PT3H30M')),
    cout: new Cout(new Montant(150), new Montant(50), new Montant(200)),
  });

describe('Cout de revient component', () => {
  let componentFixture: ComponentFixture<CoutDeRevientDeLElement>;
  let portFixture: CoutDeRevientFixture;
  let routeFixture: RouteFixture;

  beforeEach(() => {
    portFixture = new CoutDeRevientFixture();
    routeFixture = new RouteFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: CoutDeRevientPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
      ],
    });
  });

  afterEach(() => {
    componentFixture.destroy();
  });

  it('should ask the server for the element the URL names', async () => {
    givenRapport([ligneFixture()]);

    await whenEcranAffiche();

    expect(portFixture.demandes.map(demande => demande.value)).toEqual([ELEMENT]);
  });

  it.each([
    ['cout-identite', 'OF · OF-2026-000001'],
    ['cout-total', '200,00 €'],
    ['cout-repartition', 'Machine 150,00 € · Main d’œuvre 50,00 €'],
    ['cout-temps-total', '3 h 30'],
    ['cout-temps-non-conformite', 'dont non-conformité 0 h 30'],
  ])('should display %s as %s', async (selector, attendu) => {
    givenRapport([ligneFixture()]);

    await whenEcranAffiche();

    expect(texte(selector)).toBe(attendu);
  });

  it('should mark the nonconformity time of the element with its NC label', async () => {
    givenRapport([ligneFixture()]);

    await whenEcranAffiche();

    expect(marquesNcDans('cout-indicateur-temps')).toEqual(['NC']);
  });

  it('should name a mould by the word the company uses', async () => {
    givenRapportDe([ligneFixture()], 'PRODUIT');

    await whenEcranAffiche();

    expect(texte('cout-identite')).toBe('Moule · OF-2026-000001');
  });

  it('should display one row per operation nature, in the order the server sent them', async () => {
    givenRapport([ligneFixture(), ligneFixture({ nature: 'Tournage' })]);

    await whenEcranAffiche();

    expect(textes('cout-nature-cell')).toEqual(['Fraisage', 'Tournage']);
  });

  it('should name the line clocked without a work station', async () => {
    givenRapport([ligneFixture({ nature: undefined })]);

    await whenEcranAffiche();

    expect(textes('cout-nature-cell')).toEqual(['Sans poste']);
  });

  it('should display the time and the cost of a line, machine and labour apart', async () => {
    givenRapport([ligneFixture({ nonConformite: 'PT1H', total: 'PT3H' })]);

    await whenEcranAffiche();

    expect([
      texte('cout-travail-cell'),
      texte('cout-non-conformite-duree'),
      texte('cout-temps-cell'),
      texte('cout-machine-cell'),
      texte('cout-main-d-oeuvre-cell'),
      texte('cout-ligne-total-cell'),
    ]).toEqual(['2 h 00', '1 h 00', '3 h 00', '90,00 €', '40,00 €', '130,00 €']);
  });

  it('should mark only the rows carrying nonconformity time with the NC label', async () => {
    givenRapport([ligneFixture({ nonConformite: 'PT1H', total: 'PT3H' }), ligneFixture({ nature: 'Tournage' })]);

    await whenEcranAffiche();

    expect(marquesNcParLigne()).toEqual([['NC'], []]);
  });

  it('should display the totals the server computed, never the sum of the rows', async () => {
    givenRapport([ligneFixture(), ligneFixture({ nature: 'Tournage' })]);

    await whenEcranAffiche();

    expect([texte('cout-total-temps'), texte('cout-total-cout')]).toEqual(['3 h 30', '200,00 €']);
  });

  it('should keep the dated detail of a row closed until it is asked for', async () => {
    givenRapport([ligneFixture()]);

    await whenEcranAffiche();

    expect(present('cout-detail')).toBe(false);
  });

  it('should date the period of a row once its detail is opened', async () => {
    givenRapport([ligneFixture()]);
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect(texte('cout-periode')).toBe('Période : 11 mai 2026, 09:00 – 11:00');
  });

  it('should date each rework of a row once its detail is opened', async () => {
    givenRapport([ligneFixture({ nonConformite: 'PT1H', reprises: [periodeFixture(10, 11)] })]);
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect(textes('cout-non-conformite')).toEqual(['11 mai 2026, 10:00 – 11:00']);
  });

  it('should mark the reworks of a row with the NC label once its detail is opened', async () => {
    givenRapport([ligneFixture({ nonConformite: 'PT1H', reprises: [periodeFixture(10, 11)] })]);
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect(marquesNcDans('cout-detail')).toEqual(['NC']);
  });

  it('should say that a row carries no rework', async () => {
    givenRapport([ligneFixture()]);
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect(texte('cout-sans-non-conformite')).toBe('Aucune reprise');
  });

  it('should close the detail a second click dismisses', async () => {
    givenRapport([ligneFixture()]);
    await whenEcranAffiche();
    await whenDetailDeplie();

    await whenDetailDeplie();

    expect(present('cout-detail')).toBe(false);
  });

  it('should explain that nobody has clocked on this element yet', async () => {
    givenRapport([]);

    await whenEcranAffiche();

    expect(texte('cout-sans-travail')).toContain('Aucun temps pointé');
  });

  it('should show no table for an element nobody has clocked on yet', async () => {
    givenRapport([]);

    await whenEcranAffiche();

    expect(present('cout-ligne-row')).toBe(false);
  });

  it('should display the loading status until the report arrives', () => {
    givenLectureSuspendue();

    whenEcranMonte();

    expect(texte('cout-loading')).toBe('Chargement du coût de revient…');
  });

  it('should explain that the referential does not know this element', async () => {
    givenElementInconnu();

    await whenEcranAffiche();

    expect(texte('cout-element-introuvable')).toContain('n’existe plus au référentiel');
  });

  it('should refuse an address naming no element and ask the server for nothing', async () => {
    givenAdresseSansElement();

    await whenEcranAffiche();

    expect(texte('cout-element-introuvable')).toContain('n’existe plus au référentiel');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should display an error when the report cannot be read', async () => {
    givenLectureEnEchec();

    await whenEcranAffiche();

    expect(texte('cout-error')).toContain('Impossible de charger le coût de revient.');
  });

  it('should read the report again when the retry is used', async () => {
    givenLectureEnEchec();
    await whenEcranAffiche();

    await whenRepriseDemandee();

    expect(portFixture.demandes).toHaveLength(2);
  });

  const givenRapport = (lignes: readonly LigneDeCout[]): void => {
    portFixture.rapports.set(ELEMENT, rapportFixture(lignes));
  };

  const givenRapportDe = (lignes: readonly LigneDeCout[], type: TypeDElementChiffre): void => {
    portFixture.rapports.set(ELEMENT, rapportFixture(lignes, type));
  };

  const givenElementInconnu = (): void => {
    portFixture.elementsInconnus.add(ELEMENT);
  };

  const givenAdresseSansElement = (): void => {
    routeFixture.paramMap.next(convertToParamMap({}));
  };

  const givenLectureEnEchec = (): void => {
    portFixture.lectureFailure = new Error('panne');
  };

  const givenLectureSuspendue = (): void => {
    portFixture.lectureDifferee = new Promise(() => undefined);
  };

  const whenEcranMonte = (): void => {
    componentFixture = TestBed.createComponent(CoutDeRevientDeLElement);
    componentFixture.detectChanges();
  };

  const whenEcranAffiche = async (): Promise<void> => {
    whenEcranMonte();
    await componentFixture.whenStable();
  };

  const whenDetailDeplie = async (): Promise<void> => {
    requis('cout-detail-toggle').click();
    await componentFixture.whenStable();
  };

  const whenRepriseDemandee = async (): Promise<void> => {
    requis('cout-retry').click();
    await componentFixture.whenStable();
  };

  const racine = (): HTMLElement => componentFixture.nativeElement as HTMLElement;

  const requis = (selector: string): HTMLElement => {
    const element = racine().querySelector<HTMLElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Aucun élément ${selector} à l’écran`);
    }
    return element;
  };

  /** `Intl.formatRange` emploie des espaces fines insécables : les normaliser garde les attentes lisibles. */
  const normalise = (valeur: string): string => valeur.replace(/[\u00a0\u2009\u202f]/g, ' ').trim();

  const texte = (selector: string): string => normalise(requis(selector).textContent);

  const textes = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => normalise(element.textContent));

  const marquesNcDans = (selector: string): string[] =>
    [...requis(selector).querySelectorAll<HTMLElement>(dataSelector('cout-marque-nc'))].map(element => normalise(element.textContent));

  const marquesNcParLigne = (): string[][] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('cout-ligne-row'))].map(ligne =>
      [...ligne.querySelectorAll<HTMLElement>(dataSelector('cout-marque-nc'))].map(element => normalise(element.textContent)),
    );

  const present = (selector: string): boolean => racine().querySelector(dataSelector(selector)) !== null;
});
