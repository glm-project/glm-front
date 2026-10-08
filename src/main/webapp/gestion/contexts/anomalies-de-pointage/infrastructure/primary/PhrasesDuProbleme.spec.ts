import {
  activiteEchueFixture,
  ARRET_FIXTURE as ARRET,
  correctionTardiveFixture,
  dossierDeFinAutomatiqueFixture,
  faitFixture,
  instantDuJourFixture,
  PASSAGE_EN_NC_FIXTURE as PASSAGE_EN_NC,
  pointageFixture,
  regularisationFixture,
} from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { describe, expect, it } from 'vitest';
import { FaitPropose } from '../../domain/acte/ActeResolution';
import { ActiviteAnomalie, ChoixGuide } from '../../domain/dossier/DossierAnomalie';
import { phrasesDuProbleme } from './PhrasesDuProbleme';

type Categorie = 'TRAVAIL' | 'NON_CONFORMITE';
type CodeTardif = 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE';

const tardifFixture = (code: CodeTardif, geste: Pick<FaitPropose, 'type' | 'intention'>, categorie: Categorie = 'TRAVAIL') => {
  const fait = faitFixture(geste, instantDuJourFixture('19:30'));
  return dossierDeFinAutomatiqueFixture({
    activites: [activiteEchueFixture('travail-8', categorie, '08:00', '18:00')],
    journal: [pointageFixture('tardif-30', fait)],
    choix: [correctionTardiveFixture(code, 'tardif-30', fait)],
  });
};

const sansPeriode = ({ id, libelle, etat, temps, ouvrant }: ActiviteAnomalie): ActiviteAnomalie => ({ id, libelle, etat, temps, ouvrant });

describe('Phrases saying the problem of an automatic end', () => {
  it.each<{ cas: string; categorie: Categorie; phrase: string }>([
    {
      cas: 'a work never stopped',
      categorie: 'TRAVAIL',
      phrase: 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
    },
    {
      cas: 'a non-conformity never stopped',
      categorie: 'NON_CONFORMITE',
      phrase: 'La non-conformité démarrée à 08:00 n’a jamais été arrêtée : fin automatique à 18:00.',
    },
  ])('should say the problem of $cas', ({ categorie, phrase }) => {
    const dossier = dossierDeFinAutomatiqueFixture({ activites: [activiteEchueFixture('travail-8', categorie, '08:00', '18:00')] });

    expect(phrasesDuProbleme(dossier)).toEqual([phrase]);
  });

  it.each<{ cas: string; categorie: Categorie; choix: readonly ChoixGuide[]; phrase: string }>([
    {
      cas: 'a work the server offers neither to regularise nor to correct',
      categorie: 'TRAVAIL',
      choix: [],
      phrase: 'Le travail démarré à 08:00 a été terminé automatiquement à 18:00.',
    },
    {
      cas: 'a non-conformity the server offers neither to regularise nor to correct',
      categorie: 'NON_CONFORMITE',
      choix: [],
      phrase: 'La non-conformité démarrée à 08:00 a été terminée automatiquement à 18:00.',
    },
    {
      cas: 'a work whose end regularisation aims at another activity',
      categorie: 'TRAVAIL',
      choix: [regularisationFixture('travail-9')],
      phrase: 'Le travail démarré à 08:00 a été terminé automatiquement à 18:00.',
    },
  ])('should say the problem of $cas', ({ categorie, choix, phrase }) => {
    const dossier = dossierDeFinAutomatiqueFixture({ activites: [activiteEchueFixture('travail-8', categorie, '08:00', '18:00')], choix });

    expect(phrasesDuProbleme(dossier)).toEqual([phrase]);
  });

  describe('of a pointage pointed after the due time', () => {
    it.each<{ cas: string; categorie: Categorie; code: CodeTardif; geste: Pick<FaitPropose, 'type' | 'intention'>; phrase: string }>([
      {
        cas: 'a work stopped after its due time',
        categorie: 'TRAVAIL',
        code: 'CORRIGER_FIN_TARDIVE',
        geste: ARRET,
        phrase: 'L’arrêt de 19:30 vise le travail, déjà terminé automatiquement à 18:00.',
      },
      {
        cas: 'a non-conformity stopped after its due time',
        categorie: 'NON_CONFORMITE',
        code: 'CORRIGER_FIN_TARDIVE',
        geste: ARRET,
        phrase: 'L’arrêt de 19:30 vise la non-conformité, déjà terminée automatiquement à 18:00.',
      },
      {
        cas: 'a work with a passage pointed after its due time',
        categorie: 'TRAVAIL',
        code: 'CORRIGER_TRANSITION_TARDIVE',
        geste: PASSAGE_EN_NC,
        phrase: 'Le passage en NC de 19:30 vise le travail, déjà terminé automatiquement à 18:00.',
      },
    ])('should say the problem of $cas', ({ categorie, code, geste, phrase }) => {
      expect(phrasesDuProbleme(tardifFixture(code, geste, categorie))).toEqual([phrase]);
    });

    it('should say the problem of a late pointage the journal does not hold', () => {
      const dossier = { ...tardifFixture('CORRIGER_FIN_TARDIVE', ARRET), journal: [] };

      expect(phrasesDuProbleme(dossier)).toEqual(['Un pointage non résolu vise le travail, déjà terminé automatiquement à 18:00.']);
    });

    it('should regularise the end of a late choice aimed at another activity', () => {
      const fait = faitFixture(ARRET, instantDuJourFixture('19:30'), { activiteVisee: 'travail-9' });
      const dossier = dossierDeFinAutomatiqueFixture({
        journal: [pointageFixture('tardif-30', fait)],
        choix: [regularisationFixture('travail-8'), correctionTardiveFixture('CORRIGER_FIN_TARDIVE', 'tardif-30', fait)],
      });

      expect(phrasesDuProbleme(dossier)).toEqual(['Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.']);
    });

    it('should say the end was terminated when a late choice carries a regularisation but nothing regularises the end', () => {
      const lateChoice = correctionTardiveFixture('CORRIGER_FIN_TARDIVE', 'tardif-30', faitFixture(ARRET, instantDuJourFixture('19:30')));
      const dossier = dossierDeFinAutomatiqueFixture({ choix: [{ ...lateChoice, saisie: regularisationFixture('travail-8').saisie }] });

      expect(phrasesDuProbleme(dossier)).toEqual(['Le travail démarré à 08:00 a été terminé automatiquement à 18:00.']);
    });

    it('should say the end was never stopped when a late choice carries no correction beside the regularisation', () => {
      const lateChoice = correctionTardiveFixture('CORRIGER_FIN_TARDIVE', 'tardif-30', faitFixture(ARRET, instantDuJourFixture('19:30')));
      const dossier = dossierDeFinAutomatiqueFixture({
        choix: [regularisationFixture('travail-8'), { ...lateChoice, saisie: regularisationFixture('travail-8').saisie }],
      });

      expect(phrasesDuProbleme(dossier)).toEqual(['Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.']);
    });
  });

  it('should say one problem per due activity of the dossier', () => {
    const dossier = dossierDeFinAutomatiqueFixture({
      activites: [
        activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
        activiteEchueFixture('nc-9', 'NON_CONFORMITE', '09:00', '19:00'),
      ],
      choix: [regularisationFixture('travail-8'), regularisationFixture('nc-9')],
    });

    expect(phrasesDuProbleme(dossier)).toEqual([
      'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
      'La non-conformité démarrée à 09:00 n’a jamais été arrêtée : fin automatique à 19:00.',
    ]);
  });

  it.each<{ cas: string; activite: ActiviteAnomalie }>([
    {
      cas: 'an activity that is not due',
      activite: {
        ...activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '17:00'),
        etat: 'TERMINEE',
      },
    },
    { cas: 'a due activity without period', activite: sansPeriode(activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00')) },
    {
      cas: 'a due activity whose end was not received',
      activite: {
        ...sansPeriode(activiteEchueFixture('travail-8', 'TRAVAIL', '08:00', '18:00')),
        periode: { categorie: 'TRAVAIL', debut: instantDuJourFixture('08:00') },
      },
    },
  ])('should say nothing of $cas on an automatic end', ({ activite }) => {
    expect(phrasesDuProbleme(dossierDeFinAutomatiqueFixture({ activites: [activite] }))).toEqual([]);
  });
});
