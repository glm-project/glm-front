import { BornesDuJour } from '../journee/BornesDuJour';
import { CategorieDElement } from '../journee/CategorieDElement';
import { ChoixDAjout } from '../journee/ChoixDAjout';
import { Duree } from '../journee/Duree';
import { ElementDeLaJournee } from '../journee/ElementDeLaJournee';
import { ElementDeLaJourneeId } from '../journee/ElementDeLaJourneeId';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { JourACorriger } from '../journee/JourACorriger';
import { JourneeACorriger } from '../journee/JourneeACorriger';
import { OperateurDeLaJournee } from '../journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../journee/OperateurDeLaJourneeId';
import { PosteDeLaJournee } from '../journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SuiviPresent } from '../journee/SuiviPresent';
import { SuivisPresents } from '../journee/SuivisPresents';
import { AjoutEnPreparation } from './AjoutEnPreparation';
import { CalendrierLocal } from './CalendrierLocal';

const instant = (recu: string): InstantDeLaJournee => new InstantDeLaJournee(recu);

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

const CALENDRIER: CalendrierLocal = {
  instantA: (jour, heures, minutes) => instant(`${jour.value}T${deuxChiffres(heures)}:${deuxChiffres(minutes)}:00-03:00`),
};

const APRES_LE_LUNDI = instant('2026-10-06T10:00:00-03:00');

const tour = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-tour'), 'Tour CN 1', 'Tournage');
const fraiseuse = new PosteDeLaJournee(new PosteDeLaJourneeId('poste-fraise'), 'Fraiseuse 1', 'Fraisage');

const element = (suffixe: string, categorie = 'OF'): ElementDeLaJournee =>
  new ElementDeLaJournee({
    id: new ElementDeLaJourneeId(`element-${suffixe}`),
    categorie: new CategorieDElement(categorie),
    nom: `PRD-2026-0000${suffixe}`,
    reference: `24-13${suffixe}`,
    description: `Pièce ${suffixe}`,
  });

const suiviPresent = (suivi: string, contenu: ElementDeLaJournee, clotureLe?: string): SuiviPresent =>
  new SuiviPresent({
    suivi: new SuiviDAtelierId(suivi),
    element: contenu,
    engageLe: instant('2026-10-01T08:00:00-03:00'),
    clotureLe: clotureLe === undefined ? undefined : instant(clotureLe),
  });

const journeeAvec = (suivis: readonly SuiviPresent[], postes: readonly PosteDeLaJournee[]): JourneeACorriger =>
  new JourneeACorriger({
    operateur: new OperateurDeLaJournee(new OperateurDeLaJourneeId('op-1'), 'Leroy', 'Hugo'),
    jour: new JourACorriger('2026-10-05'),
    bornes: new BornesDuJour({
      debut: instant('2026-10-05T00:00:00-03:00'),
      fin: instant('2026-10-06T00:00:00-03:00'),
      finDuLendemain: instant('2026-10-07T00:00:00-03:00'),
    }),
    dureeOperationnelle: new Duree('PT4H45M'),
    activites: [],
    choix: new ChoixDAjout({ suivis: new SuivisPresents(suivis), postes }),
  });

const lundi = (postes: readonly PosteDeLaJournee[] = [tour, fraiseuse]): JourneeACorriger =>
  journeeAvec([suiviPresent('suivi-1', element('1')), suiviPresent('suivi-2', element('2', 'MOULE'), '2026-10-05T11:00:00-03:00')], postes);

const ouvert = (journee: JourneeACorriger = lundi(), maintenant: InstantDeLaJournee = APRES_LE_LUNDI): AjoutEnPreparation =>
  AjoutEnPreparation.ouvrir(journee, maintenant, CALENDRIER);

const completeSurLeSuivi = (suivi: string, journee: JourneeACorriger = lundi()): AjoutEnPreparation =>
  ouvert(journee).avecSuivi(new SuiviDAtelierId(suivi)).avecDebut('08:00').avecFin('10:30');

describe('Addition of an activity being prepared', () => {
  it('should be opened on the first workstation allowed, as work, with no element chosen and nothing to complain about', () => {
    const ajout = ouvert();

    expect([
      ajout.suivi(lundi()),
      ajout.poste(lundi())?.id.value,
      ajout.categorie,
      ajout.plage(lundi()).erreur(),
      ajout.elementManquant(lundi()),
    ]).toEqual([undefined, 'poste-tour', 'TRAVAIL', undefined, false]);
  });

  it('should be opened without workstation when the operator is allowed on none', () => {
    expect(ouvert(lundi([])).poste(lundi([]))).toBeUndefined();
  });

  it('should find the element chosen among the suivis present of the day it is read against', () => {
    const ajout = ouvert().avecSuivi(new SuiviDAtelierId('suivi-2'));

    expect(ajout.suivi(lundi())?.element.numero()).toBe('24-132');
  });

  it('should find the workstation chosen among the workstations allowed', () => {
    const ajout = ouvert().avecPoste(new PosteDeLaJourneeId('poste-fraise'));

    expect(ajout.poste(lundi())?.libelle).toBe('Fraiseuse 1');
  });

  it('should fall back on the first workstation allowed when the one chosen is no longer allowed', () => {
    const ajout = ouvert().avecPoste(new PosteDeLaJourneeId('poste-fraise'));

    expect(ajout.poste(lundi([tour]))?.libelle).toBe('Tour CN 1');
  });

  it('should keep the type chosen and leave the previous addition as it was', () => {
    const travail = ouvert();

    const nonConformite = travail.avecCategorie('NON_CONFORMITE');

    expect([nonConformite.categorie, travail.categorie]).toEqual(['NON_CONFORMITE', 'TRAVAIL']);
  });

  it('should check the hours typed against the closure of the element chosen', () => {
    const ajout = ouvert().avecSuivi(new SuiviDAtelierId('suivi-2')).avecDebut('10:00').avecFin('11:30');

    expect(ajout.plage(lundi()).erreur()).toEqual({ kind: 'FIN_APRES_CLOTURE', cloture: instant('2026-10-05T11:00:00-03:00') });
  });

  it('should check nothing against an element no longer present on the day it is read against', () => {
    const ajout = completeSurLeSuivi('suivi-2');
    const autreJournee = journeeAvec([suiviPresent('suivi-3', element('3'))], [tour, fraiseuse]);

    expect(ajout.plage(autreJournee).erreur()).toBeUndefined();
  });

  it('should check the end typed against the current time it is given', () => {
    const ajout = ouvert().avecDebut('08:00').avecFin('10:30').avecMaintenant(instant('2026-10-05T10:00:00-03:00'));

    expect(ajout.plage(lundi()).erreur()).toEqual({ kind: 'FIN_APRES_MAINTENANT' });
  });

  it('should forecast the duration of the hours typed on the day displayed', () => {
    const effet = completeSurLeSuivi('suivi-1').effet(lundi());

    expect(effet?.jourAffiche.avant).toEqual(new Duree('PT4H45M'));
    expect(effet?.jourAffiche.apres).toEqual(new Duree('PT7H15M'));
  });

  it('should forecast nothing before the hours are typed', () => {
    expect(ouvert().effet(lundi())).toBeUndefined();
  });

  it('should describe the command to send once the element, the workstation, the type and the hours are chosen', () => {
    const ajout = completeSurLeSuivi('suivi-1').avecPoste(new PosteDeLaJourneeId('poste-fraise')).avecCategorie('NON_CONFORMITE');

    const contenu = ajout.contenu(lundi());

    expect([contenu?.operateur.value, contenu?.suivi.value, contenu?.poste.value, contenu?.categorie]).toEqual([
      'op-1',
      'suivi-1',
      'poste-fraise',
      'NON_CONFORMITE',
    ]);
    expect([contenu?.intervalle.debut, contenu?.intervalle.fin]).toEqual([
      instant('2026-10-05T08:00:00-03:00'),
      instant('2026-10-05T10:30:00-03:00'),
    ]);
  });

  it.each([
    { cas: 'no element is chosen', ajout: ouvert().avecDebut('08:00').avecFin('10:30'), journee: lundi() },
    { cas: 'no workstation is allowed', ajout: completeSurLeSuivi('suivi-1', lundi([])), journee: lundi([]) },
    { cas: 'the end is missing', ajout: ouvert().avecSuivi(new SuiviDAtelierId('suivi-1')).avecDebut('08:00'), journee: lundi() },
    {
      cas: 'the hours are refused',
      ajout: ouvert().avecSuivi(new SuiviDAtelierId('suivi-1')).avecDebut('08:00').avecFin('08:00'),
      journee: lundi(),
    },
  ])('should describe no command when $cas', ({ ajout, journee }) => {
    expect(ajout.contenu(journee)).toBeUndefined();
  });

  it('should say the element is missing only once the submission was tried without one', () => {
    const sansElement = ouvert();

    expect([sansElement.elementManquant(lundi()), sansElement.apresUnEnvoi().elementManquant(lundi())]).toEqual([false, true]);
  });

  it('should not say the element is missing once it is chosen', () => {
    expect(completeSurLeSuivi('suivi-1').apresUnEnvoi().elementManquant(lundi())).toBe(false);
  });

  it('should say the element is missing once the submission was tried when the element chosen is no longer present on the day read again', () => {
    const jourSansLElement = journeeAvec([suiviPresent('suivi-3', element('3'))], [tour, fraiseuse]);

    const apresLaRelecture = completeSurLeSuivi('suivi-1').apresUnEnvoi();

    expect([apresLaRelecture.elementManquant(lundi()), apresLaRelecture.elementManquant(jourSansLElement)]).toEqual([false, true]);
  });

  it('should ask for the hours not typed once the submission was tried', () => {
    expect(ouvert().apresUnEnvoi().plage(lundi()).erreur()).toEqual({ kind: 'HEURES_MANQUANTES' });
  });

  it('should describe the command of an activity ending the next day, and forecast the day it ends on', () => {
    const ajout = ouvert().avecSuivi(new SuiviDAtelierId('suivi-1')).avecDebut('22:00').avecFin('03:30').avecFinLeLendemain();

    expect([ajout.contenu(lundi())?.intervalle.debut, ajout.contenu(lundi())?.intervalle.fin]).toEqual([
      instant('2026-10-05T22:00:00-03:00'),
      instant('2026-10-06T03:30:00-03:00'),
    ]);
    expect(ajout.effet(lundi())?.autresJoursAjoutes).toEqual([{ jour: new JourACorriger('2026-10-06'), ajoute: new Duree('PT3H30M') }]);
  });

  it('should end on the day displayed again when asked to, the hours typed being kept', () => {
    const ajout = ouvert().avecDebut('22:00').avecFin('03:30').avecFinLeLendemain().avecFinLeJourAffiche();

    expect(ajout.plage(lundi()).erreur()?.kind).toBe('FIN_AVANT_DEBUT_LE_MEME_JOUR');
  });

  it('should propose to end the next day only if the element chosen is not closed before that end', () => {
    const ferme = journeeAvec([suiviPresent('suivi-1', element('1'), '2026-10-06T02:00:00-03:00')], [tour]);
    const saisie = ouvert(ferme).avecSuivi(new SuiviDAtelierId('suivi-1')).avecDebut('22:00').avecFin('03:30');

    expect([saisie.plage(ferme).finProposee(), saisie.avecSuivi(new SuiviDAtelierId('suivi-9')).plage(ferme).finProposee()]).toEqual([
      undefined,
      instant('2026-10-06T03:30:00-03:00'),
    ]);
  });
});
