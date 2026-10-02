import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { CoutDeRevientFixture } from '@test/unit/fixtures/gestion/cout-de-revient/CoutDeRevientFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ElementChiffre } from '../../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../../domain/element/ElementChiffreId';
import { TypeDElementChiffre } from '../../../domain/element/TypeDElementChiffre';
import { Cout } from '../../../domain/montant/Cout';
import { Montant } from '../../../domain/montant/Montant';
import { TotalDeMontant } from '../../../domain/montant/TotalDeMontant';
import { ActiviteCitee } from '../../../domain/pointage/ActiviteCitee';
import { ElementCite } from '../../../domain/pointage/ElementCite';
import { OperateurCite } from '../../../domain/pointage/OperateurCite';
import { PartDePointage } from '../../../domain/pointage/PartDePointage';
import { FicheDePointage, PointageDeCout } from '../../../domain/pointage/PointageDeCout';
import { PosteCite } from '../../../domain/pointage/PosteCite';
import { ActivitesEnCoursExclues } from '../../../domain/rapport/ActivitesEnCoursExclues';
import { CoutDeRevient, FicheDuRapport } from '../../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../../domain/rapport/CoutDeRevientPort';
import { FicheDeLigne, LigneDeCout } from '../../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../../domain/rapport/NatureDOperation';
import { SequenceEnConflit } from '../../../domain/rapport/SequenceEnConflit';
import { DureePassee } from '../../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../../domain/temps/TempsPasse';
import { TotalDeTemps } from '../../../domain/temps/TotalDeTemps';
import { CoutDeRevientDeLElement } from './CoutDeRevientDeLElement';

const ELEMENT = '4f8d1e0a-1111-2222-3333-444455556666';

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ element: ELEMENT }));
}

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
}

const ligneFixture = (fixture: Partial<LigneFixture> = {}, fiche: Partial<FicheDeLigne> = {}): LigneDeCout => {
  const ligne: LigneFixture = {
    nature: 'Fraisage',
    travail: 'PT2H',
    nonConformite: 'PT0S',
    total: 'PT2H',
    machine: 90,
    mainDOeuvre: 40,
    ...fixture,
  };
  return new LigneDeCout({
    nature: ligne.nature === undefined ? undefined : new NatureDOperation(ligne.nature),
    temps: new TempsPasse(
      TotalDeTemps.complet(new DureePassee(ligne.travail)),
      TotalDeTemps.complet(new DureePassee(ligne.nonConformite)),
      TotalDeTemps.complet(new DureePassee(ligne.total)),
    ),
    cout: new Cout(
      TotalDeMontant.complet(new Montant(ligne.machine)),
      TotalDeMontant.complet(new Montant(ligne.mainDOeuvre)),
      TotalDeMontant.complet(new Montant(ligne.machine + ligne.mainDOeuvre)),
    ),
    finsAutomatiques: [],
    pointages: [],
    ...fiche,
  });
};

const rapportFixture = (
  lignes: readonly LigneDeCout[],
  type: TypeDElementChiffre = 'ORDRE_DE_FABRICATION',
  fiche: Partial<FicheDuRapport> = {},
): CoutDeRevient =>
  new CoutDeRevient(new ElementChiffre('OF-2026-000001', type), {
    lignes,
    evaluation: new InstantDeTravail('2026-05-11T12:00:00Z'),
    activitesEnCours: new ActivitesEnCoursExclues(0),
    conflits: [],
    temps: new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT3H')),
      TotalDeTemps.complet(new DureePassee('PT30M')),
      TotalDeTemps.complet(new DureePassee('PT3H30M')),
    ),
    cout: new Cout(
      TotalDeMontant.complet(new Montant(150)),
      TotalDeMontant.complet(new Montant(50)),
      TotalDeMontant.complet(new Montant(200)),
    ),
    ...fiche,
  });

const montantFixture = (euros: number | undefined): TotalDeMontant =>
  euros === undefined ? TotalDeMontant.incomplet() : TotalDeMontant.complet(new Montant(euros));

const haasFixture = new ActiviteCitee(
  new ElementCite(new ElementChiffreId('element-192'), 'OF-2026-000192', 'ORDRE_DE_FABRICATION'),
  new PosteCite('poste-haas', 'Haas VF-2'),
  new NatureDOperation('Fraisage'),
);

const partFixture = (
  [heureDebut, minuteDebut]: [number, number],
  [heureFin, minuteFin]: [number, number],
  duree: string,
  diviseur: number | undefined,
  mainDOeuvre: number | undefined,
  autour: Partial<Pick<PartDePointage, 'paralleles' | 'bloquants'>> = {},
): PartDePointage =>
  new PartDePointage({
    debut: instantFixture(heureDebut, minuteDebut),
    fin: instantFixture(heureFin, minuteFin),
    duree: new DureePassee(duree),
    diviseur,
    mainDOeuvre: montantFixture(mainDOeuvre),
    paralleles: autour.paralleles ?? [],
    bloquants: autour.bloquants ?? [],
  });

const pointageFixture = (fiche: Partial<FicheDePointage> = {}): PointageDeCout =>
  new PointageDeCout({
    operateur: new OperateurCite('operateur-julien', 'Julien', 'Martin'),
    poste: new PosteCite('poste-dmg', 'DMG DMU 50'),
    categorie: 'TRAVAIL',
    periode: new PeriodeDeTravail(instantFixture(7, 30), instantFixture(11, 30)),
    duree: TotalDeTemps.complet(new DureePassee('PT4H')),
    coutHoraire: new Montant(48),
    tauxHoraire: new Montant(35),
    cout: new Cout(montantFixture(192), montantFixture(113.75), montantFixture(305.75)),
    parts: [
      partFixture([7, 30], [9, 0], 'PT1H30M', 1, 52.5),
      partFixture([9, 0], [10, 30], 'PT1H30M', 2, 26.25, { paralleles: [haasFixture] }),
      partFixture([10, 30], [11, 30], 'PT1H', 1, 35),
    ],
    ...fiche,
  });

const pointageSeulFixture = (fiche: Partial<FicheDePointage> = {}): PointageDeCout =>
  pointageFixture({ parts: [partFixture([7, 30], [11, 30], 'PT4H', 1, 140)], ...fiche });

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

  it.each([
    ['cout-travail-cell', '5 h 00'],
    ['cout-non-conformite-duree', 'Incomplet'],
    ['cout-temps-cell', 'Incomplet'],
    ['cout-machine-cell', '300,00 €'],
    ['cout-main-d-oeuvre-cell', 'Incomplet'],
    ['cout-ligne-total-cell', 'Incomplet'],
    ['cout-total-travail', '5 h 00'],
    ['cout-total-non-conformite', 'Incomplet'],
    ['cout-total-temps', 'Incomplet'],
    ['cout-total-machine', '300,00 €'],
    ['cout-total-main-d-oeuvre', 'Incomplet'],
    ['cout-total-cout', 'Incomplet'],
    ['cout-total', 'Incomplet'],
    ['cout-temps-total', 'Incomplet'],
    ['cout-temps-non-conformite', 'dont non-conformité Incomplet'],
    ['cout-repartition', 'Machine 300,00 € · Main d’œuvre Incomplet'],
  ])('should independently display the received completeness of %s', async (selector, attendu) => {
    givenRapportIncomplet();

    await whenEcranAffiche();

    expect(texte(selector)).toBe(attendu);
  });

  it.each([
    'cout-main-d-oeuvre-cell',
    'cout-ligne-total-cell',
    'cout-total-cout',
    'cout-total',
    'cout-temps-total',
    'cout-non-conformite-duree',
  ])('should expose no partial figure in the text or accessible labels of %s', async selector => {
    givenRapportIncomplet();

    await whenEcranAffiche();

    expect(contenuAccessible(selector)).not.toMatch(/\d/);
  });

  it('should make an automatic finish visible before opening any row detail', async () => {
    givenFinAutomatique();

    await whenEcranAffiche();

    expect(textes('cout-fin-automatique-marque')).toEqual(['Fin automatique']);
    expect(present('cout-detail')).toBe(false);
  });

  it('should immediately show the thirteen hours and labour amount received for an automatic finish', async () => {
    givenFinAutomatique();
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect(texte('cout-temps-total')).toBe('13 h 00');
    expect(texte('cout-total')).toBe('260,00 €');
    expect(textes('cout-fin-automatique-periode')).toEqual(['11 mai 2026, 08:00 – 21:00']);
    expect(texte('cout-fins-automatiques-detail')).toContain('anomalie active');
  });

  it.each([
    [9, 180],
    [15, 300],
  ])('should replace an automatic finish with the received %s hour regularised report', async (heures, euros) => {
    givenFinAutomatique();
    await whenEcranAffiche();
    givenNouveauRapport(rapportTermineFixture(heures, euros, false));

    await whenEcranRelu();

    expect(texte('cout-temps-total')).toBe(`${String(heures)} h 00`);
    expect(texte('cout-total')).toBe(`${String(euros)},00 €`);
    expect(present('cout-fin-automatique-marque')).toBe(false);
  });

  it('should remove the counted cost and anomaly when the new report reopens the activity', async () => {
    givenFinAutomatique();
    await whenEcranAffiche();
    givenSeulementActivitesEnCours(1);

    await whenEcranRelu();

    expect(texte('cout-temps-total')).toBe('0 h 00');
    expect(texte('cout-total')).toBe('0,00 €');
    expect(present('cout-fin-automatique-marque')).toBe(false);
    expect(present('cout-sans-travail')).toBe(false);
  });

  it('should display the received forty euros while a simultaneous activity remains excluded', async () => {
    givenNouveauRapport(rapportTermineFixture(2, 40, false));

    await whenEcranAffiche();

    expect(texte('cout-main-d-oeuvre-cell')).toBe('40,00 €');
    expect(texte('cout-total')).toBe('40,00 €');
  });

  it('should display the received lower labour amount after the simultaneous activity finishes', async () => {
    givenNouveauRapport(rapportTermineFixture(2, 40, false));
    await whenEcranAffiche();
    givenNouveauRapport(rapportTermineFixture(2, 30, false));

    await whenEcranRelu();

    expect(texte('cout-main-d-oeuvre-cell')).toBe('30,00 €');
    expect(texte('cout-total')).toBe('30,00 €');
  });

  it('should explicitly explain current activity exclusion while displaying complete zero totals', async () => {
    givenSeulementActivitesEnCours(1);

    await whenEcranAffiche();

    expect(textes('cout-activites-exclues')).toEqual(['1 activité en cours exclue du temps, du coût et du partage humain.']);
    expect(texte('cout-temps-total')).toBe('0 h 00');
    expect(texte('cout-total')).toBe('0,00 €');
    expect(present('cout-sans-travail')).toBe(false);
  });

  it('should display every responsible conflict with guaranteed identities including another element', async () => {
    givenConflitsResponsables();

    await whenEcranAffiche();

    expect(textes('cout-conflit-element')).toEqual([ELEMENT, 'autre-element']);
    expect(textes('cout-conflit-operateur')).toEqual(['operateur-a', 'operateur-b']);
    expect(textes('cout-conflit-poste')).toEqual(['poste-a', 'Sans poste']);
    expect(textes('cout-conflit-activite')).toEqual(['activite-a', 'activite-b']);
    expect(textes('cout-conflit-pointage')).toEqual(['pointage-a', 'pointage-b', 'pointage-c']);
    expect(texte('cout-total')).toBe('Incomplet');
  });

  it('should keep a conflict without unresolved activities visible alongside received complete totals', async () => {
    givenSeulementActivitesEnCours(0);
    givenConflitSansActivite();

    await whenEcranAffiche();

    expect(textes('cout-conflit-pointage')).toEqual(['pointage-c']);
    expect(texte('cout-conflits')).toContain('Aucune activité dans cette séquence');
    expect(texte('cout-total')).toBe('0,00 €');
    expect(texte('cout-temps-total')).toBe('0 h 00');
    expect(present('cout-sans-travail')).toBe(false);
    expect(present('cout-activites-exclues')).toBe(false);
  });

  it('should remove resolved sequences and display the received complete totals on a later read', async () => {
    givenConflitsResponsables();
    await whenEcranAffiche();
    givenNouveauRapport(rapportTermineFixture(2, 30, false));

    await whenEcranRelu();

    expect(present('cout-conflits')).toBe(false);
    expect(texte('cout-total')).toBe('30,00 €');
    expect(texte('cout-temps-total')).toBe('2 h 00');
  });

  it('should explain several excluded activities without calling the report empty', async () => {
    givenSeulementActivitesEnCours(2);

    await whenEcranAffiche();

    expect(texte('cout-activites-exclues')).toBe('2 activités en cours exclues du temps, du coût et du partage humain.');
    expect(present('cout-sans-travail')).toBe(false);
  });

  it('should show the server evaluation in the browser time zone', async () => {
    givenNouveauRapport(rapportFixture([ligneFixture()], 'ORDRE_DE_FABRICATION', { evaluation: instantFixture(22, 15) }));

    await whenEcranAffiche();

    expect(texte('cout-evaluation')).toBe('Rapport évalué le 11 mai 2026, 22:15');
  });

  it('should show the simultaneous current element with zero counted cost and its exclusion notice', async () => {
    givenNouveauRapport(rapportTermineFixture(2, 40, false));
    givenAutreElementEnCours();
    await whenEcranAffiche();

    await whenAutreElementLu();

    expect(texte('cout-identite')).toBe('OF · OF-B');
    expect(texte('cout-total')).toBe('0,00 €');
    expect(texte('cout-temps-total')).toBe('0 h 00');
    expect(texte('cout-activites-exclues')).toBe('1 activité en cours exclue du temps, du coût et du partage humain.');
    expect(present('cout-sans-travail')).toBe(false);
  });

  it('should show the other finished element with its own received thirty euros', async () => {
    givenNouveauRapport(rapportTermineFixture(2, 40, false));
    givenAutreElementTermine();
    await whenEcranAffiche();

    await whenAutreElementLu();
    await whenDetailDeplie();

    expect(texte('cout-identite')).toBe('OF · OF-B');
    expect(texte('cout-main-d-oeuvre-cell')).toBe('30,00 €');
    expect(texte('cout-total')).toBe('30,00 €');
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

  it('should never invent the finish of an automatic period the server left open', async () => {
    givenRapport([ligneFixture({}, { finsAutomatiques: [new PeriodeDeTravail(instantFixture(8, 0), undefined)] })]);
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect(textes('cout-fin-automatique-periode')).toEqual(['11 mai 2026, 08:00 · Fin à résoudre']);
  });

  it('should list each clocking of an opened row with its work station, operator, time and costs', async () => {
    await givenDetailDe([pointageFixture()]);

    expect([
      texte('cout-pointage-poste'),
      texte('cout-pointage-operateur'),
      texte('cout-pointage-plage'),
      texte('cout-pointage-duree'),
      texte('cout-pointage-calcul-machine'),
      texte('cout-pointage-machine'),
      texte('cout-pointage-taux'),
      texte('cout-pointage-main-d-oeuvre'),
      texte('cout-pointage-total'),
    ]).toEqual([
      'DMG DMU 50',
      'Julien Martin',
      '11 mai · 07:30 → 11:30',
      '4 h 00',
      '48,00 €/h × 4 h 00',
      '192,00 €',
      '35,00 €/h',
      '113,75 €',
      '305,75 €',
    ]);
  });

  it('should show the divisor of each share of a clocking, the shared ones apart', async () => {
    await givenDetailDe([pointageFixture()]);

    expect(textes('cout-pointage-diviseur')).toEqual(['÷1', '÷2', '÷1']);
    expect(diviseursPartages()).toEqual(['÷2']);
  });

  it('should justify each share with what else the operator ran and its calculation', async () => {
    await givenDetailDe([pointageFixture()]);

    expect(textesCompacts('cout-part-contexte')).toEqual([
      '↳ 07:30 → 09:00 · seul poste occupé',
      '↳ 09:00 → 10:30 · aussi sur Haas VF-2 · OF-2026-000192 (Fraisage)',
      '↳ 10:30 → 11:30 · seul poste occupé',
    ]);
    expect(textes('cout-part-duree')).toEqual(['1 h 30', '1 h 30', '1 h 00']);
    expect(textes('cout-part-calcul')).toEqual(['35,00 × 1,50 ÷ 1 = 52,50 €', '35,00 × 1,50 ÷ 2 = 26,25 €', '35,00 × 1,00 ÷ 1 = 35,00 €']);
  });

  it('should not detail the shares of a clocking run alone from start to finish', async () => {
    await givenDetailDe([pointageSeulFixture()]);

    expect(present('cout-part')).toBe(false);
  });

  it('should total the clockings of a row with the figures the server computed for it', async () => {
    await givenDetailDe([pointageFixture()]);

    expect(cellulesDe('cout-pointages-total')).toEqual(['Total Fraisage', '2 h 00', '90,00 €', '40,00 €', '130,00 €']);
    expect(texte('cout-legende')).toContain('Le coût machine n’est jamais divisé.');
  });

  it('should mark a rework clocking with the NC label', async () => {
    await givenDetailDe([pointageSeulFixture({ categorie: 'NON_CONFORMITE' })]);

    expect(marquesNcDans('cout-pointages')).toEqual(['NC']);
  });

  it.each([
    [undefined, 'Sans poste', 'Sans poste'],
    [new PosteCite('poste-supprime', undefined), 'Poste inconnu', '48,00 €/h × 4 h 00'],
  ])('should name a clocking work station %s as the referential knows it', async (poste, nom, calcul) => {
    await givenDetailDe([pointageSeulFixture({ poste })]);

    expect([texte('cout-pointage-poste'), texte('cout-pointage-calcul-machine')]).toEqual([nom, calcul]);
  });

  it('should say a work station carries no hourly cost', async () => {
    await givenDetailDe([pointageSeulFixture({ coutHoraire: undefined })]);

    expect(texte('cout-pointage-calcul-machine')).toBe('Poste non valorisé');
  });

  it.each([
    [new OperateurCite('operateur-supprime', undefined, undefined), 'Opérateur inconnu'],
    [new OperateurCite('operateur-sans-prenom', undefined, 'Martin'), 'Martin'],
  ])('should name the operator %s as the referential knows them', async (operateur, nom) => {
    await givenDetailDe([pointageSeulFixture({ operateur })]);

    expect(texte('cout-pointage-operateur')).toBe(nom);
  });

  it('should say an operator carries no hourly rate, in the clocking and in each share', async () => {
    await givenDetailDe([pointageFixture({ tauxHoraire: undefined })]);

    expect(texte('cout-pointage-taux')).toBe('Opérateur non valorisé');
    expect(textes('cout-part-calcul')).toEqual(['Opérateur non valorisé', 'Opérateur non valorisé', 'Opérateur non valorisé']);
  });

  it('should date a clocking across midnight with both of its days', async () => {
    await givenDetailDe([
      pointageSeulFixture({
        periode: new PeriodeDeTravail(instantFixture(14, 0), new InstantDeTravail(new Date(2026, 4, 12, 3, 0).toISOString())),
        parts: [
          new PartDePointage({
            debut: instantFixture(14, 0),
            fin: new InstantDeTravail(new Date(2026, 4, 12, 3, 0).toISOString()),
            duree: new DureePassee('PT13H'),
            diviseur: 2,
            mainDOeuvre: montantFixture(227.5),
            paralleles: [haasFixture],
            bloquants: [],
          }),
        ],
      }),
    ]);

    expect(texte('cout-pointage-plage')).toBe('11 mai 14:00 → 12 mai 03:00');
    expect(textesCompacts('cout-part-contexte')).toEqual([
      '↳ 11 mai 14:00 → 12 mai 03:00 · aussi sur Haas VF-2 · OF-2026-000192 (Fraisage)',
    ]);
  });

  it('should show a clocking to resolve without finish nor figures', async () => {
    await givenDetailDe([
      pointageSeulFixture({
        periode: new PeriodeDeTravail(instantFixture(8, 0), undefined),
        duree: TotalDeTemps.incomplet(),
        cout: new Cout(montantFixture(undefined), montantFixture(undefined), montantFixture(undefined)),
        parts: [],
      }),
    ]);

    expect([texte('cout-pointage-plage'), texte('cout-pointage-duree'), texte('cout-pointage-total')]).toEqual([
      '11 mai · 08:00 → fin à résoudre',
      'Incomplet',
      'Incomplet',
    ]);
  });

  it('should show a share whose divisor is unknown and the clocking that blocks it', async () => {
    const inconnu = new ActiviteCitee(new ElementCite(new ElementChiffreId('element-inconnu'), undefined, undefined), undefined, undefined);
    await givenDetailDe([
      pointageSeulFixture({
        cout: new Cout(montantFixture(192), montantFixture(undefined), montantFixture(undefined)),
        parts: [partFixture([7, 30], [11, 30], 'PT4H', undefined, undefined, { bloquants: [inconnu] })],
      }),
    ]);

    expect(textes('cout-pointage-diviseur')).toEqual(['÷?']);
    expect(textesCompacts('cout-part-contexte')).toEqual([
      '↳ 07:30 → 11:30 · partage inconnu : pointage à résoudre sur Sans poste · élément inconnu',
    ]);
    expect(textes('cout-part-calcul')).toEqual(['35,00 × 4,00 ÷ ? = inconnu']);
  });

  it('should say an opened row carries no finished clocking', async () => {
    await givenDetailDe([]);

    expect(texte('cout-aucun-pointage')).toBe('Aucun pointage terminé sur cette nature.');
    expect(present('cout-pointages')).toBe(false);
  });

  it('should name the clockings of the line without a work station', async () => {
    givenRapport([ligneFixture({ nature: undefined }, { pointages: [pointageSeulFixture({ poste: undefined })] })]);
    await whenEcranAffiche();

    await whenDetailDeplie();

    expect([cellulesDe('cout-pointages-total')[0], thenLibelleAccessibleDe('cout-pointages')]).toEqual([
      'Total Sans poste',
      'Pointages de Sans poste',
    ]);
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

  const rapportTermineFixture = (heures: number, montant: number, automatique: boolean): CoutDeRevient => {
    const temps = new TempsPasse(
      TotalDeTemps.complet(new DureePassee(`PT${String(heures)}H`)),
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee(`PT${String(heures)}H`)),
    );
    const cout = new Cout(
      TotalDeMontant.complet(new Montant(0)),
      TotalDeMontant.complet(new Montant(montant)),
      TotalDeMontant.complet(new Montant(montant)),
    );
    const periode = periodeFixture(8, 8 + heures);
    const ligne = ligneFixture({}, { temps, cout, finsAutomatiques: automatique ? [periode] : [] });
    return rapportFixture([ligne], 'ORDRE_DE_FABRICATION', { temps, cout });
  };

  const conflitsFixture = (): readonly SequenceEnConflit[] => [
    new SequenceEnConflit({
      element: new ElementChiffreId(ELEMENT),
      operateur: 'operateur-a',
      poste: 'poste-a',
      activites: ['activite-a', 'activite-b'],
      pointages: ['pointage-a', 'pointage-b'],
    }),
    new SequenceEnConflit({
      element: new ElementChiffreId('autre-element'),
      operateur: 'operateur-b',
      poste: undefined,
      activites: [],
      pointages: ['pointage-c'],
    }),
  ];

  const givenConflitsResponsables = (): void => {
    givenRapportIncomplet();
    const rapport = portFixture.rapports.get(ELEMENT);
    if (rapport === undefined) {
      throw new Error('Le rapport du scénario manque');
    }
    givenNouveauRapport(
      new CoutDeRevient(rapport.element, {
        lignes: rapport.lignes,
        temps: rapport.temps,
        cout: rapport.cout,
        evaluation: rapport.evaluation,
        activitesEnCours: rapport.activitesEnCours,
        conflits: conflitsFixture(),
      }),
    );
  };

  const givenConflitSansActivite = (): void => {
    const rapport = portFixture.rapports.get(ELEMENT);
    if (rapport === undefined) {
      throw new Error('Le rapport du scénario manque');
    }
    givenNouveauRapport(
      new CoutDeRevient(rapport.element, {
        lignes: rapport.lignes,
        temps: rapport.temps,
        cout: rapport.cout,
        evaluation: rapport.evaluation,
        activitesEnCours: rapport.activitesEnCours,
        conflits: conflitsFixture().slice(1),
      }),
    );
  };

  const givenAutreElementTermine = (): void => {
    const rapport = rapportTermineFixture(2, 30, false);
    const ligne = ligneFixture({}, { temps: rapport.temps, cout: rapport.cout });
    portFixture.rapports.set(
      'element-b',
      new CoutDeRevient(new ElementChiffre('OF-B', 'ORDRE_DE_FABRICATION'), {
        lignes: [ligne],
        temps: rapport.temps,
        cout: rapport.cout,
        evaluation: instantFixture(11, 0),
        activitesEnCours: new ActivitesEnCoursExclues(0),
        conflits: [],
      }),
    );
  };

  const givenAutreElementEnCours = (): void => {
    const temps = new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
    );
    const cout = new Cout(
      TotalDeMontant.complet(new Montant(0)),
      TotalDeMontant.complet(new Montant(0)),
      TotalDeMontant.complet(new Montant(0)),
    );
    portFixture.rapports.set(
      'element-b',
      new CoutDeRevient(new ElementChiffre('OF-B', 'ORDRE_DE_FABRICATION'), {
        lignes: [],
        temps,
        cout,
        evaluation: instantFixture(10, 0),
        activitesEnCours: new ActivitesEnCoursExclues(1),
        conflits: [],
      }),
    );
  };

  const givenNouveauRapport = (rapport: CoutDeRevient): void => {
    portFixture.rapports.set(ELEMENT, rapport);
  };

  const givenSeulementActivitesEnCours = (nombre: number): void => {
    const temps = new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
    );
    const cout = new Cout(
      TotalDeMontant.complet(new Montant(0)),
      TotalDeMontant.complet(new Montant(0)),
      TotalDeMontant.complet(new Montant(0)),
    );
    givenNouveauRapport(rapportFixture([], 'ORDRE_DE_FABRICATION', { temps, cout, activitesEnCours: new ActivitesEnCoursExclues(nombre) }));
  };

  const givenFinAutomatique = (): void => {
    portFixture.rapports.set(ELEMENT, rapportTermineFixture(13, 260, true));
  };

  const givenRapportIncomplet = (): void => {
    const temps = new TempsPasse(TotalDeTemps.complet(new DureePassee('PT5H')), TotalDeTemps.incomplet(), TotalDeTemps.incomplet());
    const cout = new Cout(TotalDeMontant.complet(new Montant(300)), TotalDeMontant.incomplet(), TotalDeMontant.incomplet());
    const ligne = ligneFixture({}, { temps, cout });
    portFixture.rapports.set(ELEMENT, rapportFixture([ligne], 'ORDRE_DE_FABRICATION', { temps, cout }));
  };

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

  const whenAutreElementLu = async (): Promise<void> => {
    routeFixture.paramMap.next(convertToParamMap({ element: 'element-b' }));
    await componentFixture.whenStable();
  };

  const whenEcranRelu = async (): Promise<void> => {
    routeFixture.paramMap.next(convertToParamMap({ element: ELEMENT }));
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

  const contenuAccessible = (selector: string): string => {
    const element = requis(selector);
    const labels = [element, ...element.querySelectorAll<HTMLElement>('[aria-label], [title]')].flatMap(value => [
      value.getAttribute('aria-label'),
      value.getAttribute('title'),
    ]);
    return [element.textContent, ...labels].join(' ');
  };

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

  const thenLibelleAccessibleDe = (selector: string): string | null => requis(selector).getAttribute('aria-label');

  const givenDetailDe = async (pointages: readonly PointageDeCout[]): Promise<void> => {
    givenRapport([ligneFixture({}, { pointages })]);
    await whenEcranAffiche();
    await whenDetailDeplie();
  };

  const compacte = (valeur: string): string => normalise(valeur).replace(/\s+/g, ' ');

  const cellulesDe = (selector: string): string[] =>
    [...requis(selector).querySelectorAll<HTMLElement>('th, td')].map(cellule => compacte(cellule.textContent));

  const textesCompacts = (selector: string): string[] => textes(selector).map(compacte);

  const diviseursPartages = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('cout-pointage-diviseur'))]
      .filter(element => element.classList.contains('diviseur-partage'))
      .map(element => normalise(element.textContent));
});
