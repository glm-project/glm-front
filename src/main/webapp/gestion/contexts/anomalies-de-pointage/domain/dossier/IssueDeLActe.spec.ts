import { ActiviteAnomalieId } from './ActiviteAnomalieId';
import { ActiviteAnomalie, DossierAnomalie } from './DossierAnomalie';
import { ElementAnomalieId } from './ElementAnomalieId';
import { IssueDeLActe } from './IssueDeLActe';
import { PointageAnomalieId } from './PointageAnomalieId';
import { SuiviAnomalieId } from './SuiviAnomalieId';

describe('Outcome of an act', () => {
  it('should be processed when a conflict leaves neither a conflict nor an automatic end', () => {
    const issue = IssueDeLActe.depuis(unConflit(), unDossierApres({ enConflit: false, finAutomatique: false }));

    expect(issue.kind).toBe('TRAITEE');
  });

  it.each([
    { cas: 'a conflict alone', apres: { enConflit: true, finAutomatique: false } },
    { cas: 'a conflict beside an automatic end', apres: { enConflit: true, finAutomatique: true } },
  ])('should leave the conflict when the act on a conflict leaves $cas', ({ apres }) => {
    const issue = IssueDeLActe.depuis(unConflit(), unDossierApres(apres));

    expect(issue.kind).toBe('CONFLIT_RESTANT');
  });

  it('should lift the conflict but keep the automatic end when only the automatic end remains', () => {
    const issue = IssueDeLActe.depuis(unConflit(), unDossierApres({ enConflit: false, finAutomatique: true }));

    expect(issue.kind).toBe('CONFLIT_LEVE_FIN_AUTOMATIQUE_RESTANTE');
  });

  it('should be processed when an automatic end leaves neither a conflict nor an automatic end', () => {
    const issue = IssueDeLActe.depuis(uneFinAutomatique(), unDossierApres({ enConflit: false, finAutomatique: false }));

    expect(issue.kind).toBe('TRAITEE');
  });

  it.each([
    { cas: 'the automatic end', apres: { enConflit: false, finAutomatique: true } },
    { cas: 'a conflict', apres: { enConflit: true, finAutomatique: false } },
    { cas: 'a conflict beside the automatic end', apres: { enConflit: true, finAutomatique: true } },
  ])('should leave the anomaly, never as a conflict, when the act on an automatic end leaves $cas', ({ apres }) => {
    const issue = IssueDeLActe.depuis(uneFinAutomatique(), unDossierApres(apres));

    expect(issue.kind).toBe('ANOMALIE_RESTANTE');
  });

  it.each([
    {
      cas: 'a cancelled anchor still in conflict as a conflict',
      origine: { etat: 'ANCRE_ANNULEE' as const, enConflit: true },
      attendue: 'CONFLIT_RESTANT',
    },
    {
      cas: 'an automatic end whose perimeter is in conflict as an automatic end',
      origine: { etat: 'FIN_AUTOMATIQUE' as const, enConflit: true },
      attendue: 'ANOMALIE_RESTANTE',
    },
    {
      cas: 'a conflict address no longer in conflict as an automatic end',
      origine: { etat: 'EN_CONFLIT' as const, enConflit: false },
      attendue: 'ANOMALIE_RESTANTE',
    },
  ])('should read the origin of $cas', ({ origine, attendue }) => {
    const issue = IssueDeLActe.depuis(
      { ...origine, ligne: uneLigneAdressee('fin-17') },
      unDossierApres({ enConflit: true, finAutomatique: true }),
    );

    expect(issue.kind).toBe(attendue);
  });

  it('should address the remaining automatic end by the opening pointage of its expired activity', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: true }),
      activites: [uneActivite('travail-8', 'ECHUE', 'debut-8')],
    };

    const issue = IssueDeLActe.depuis(unConflit(), apres);

    expect(issue.finsAutomatiquesRestantes).toEqual([
      { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('debut-8') },
    ]);
  });

  it('should address one automatic end per expired activity and ignore the others', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: true }),
      activites: [
        uneActivite('travail-8', 'ECHUE', 'debut-8'),
        uneActivite('nc-9', 'TERMINEE', 'debut-9'),
        uneActivite('travail-10', 'ECHUE', 'debut-10'),
        uneActivite('travail-11', 'EN_COURS', 'debut-11'),
      ],
    };

    const issue = IssueDeLActe.depuis(unConflit(), apres);

    expect(issue.finsAutomatiquesRestantes.map(adresse => adresse.pointage.pointage)).toEqual(['debut-8', 'debut-10']);
  });

  it('should not address the automatic end of the dossier the manager is on, only the ones elsewhere', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: true }),
      activites: [uneActivite('travail-8', 'ECHUE', 'debut-8'), uneActivite('travail-10', 'ECHUE', 'debut-10')],
    };

    const issue = IssueDeLActe.depuis(uneFinAutomatiqueAdressee('debut-8'), apres);

    expect(issue.finsAutomatiquesRestantes.map(adresse => adresse.pointage.pointage)).toEqual(['debut-10']);
  });

  it('should address no automatic end when the only one remaining is the one of the dossier the manager is on', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: true }),
      activites: [uneActivite('travail-8', 'ECHUE', 'debut-8')],
    };

    const issue = IssueDeLActe.depuis(uneFinAutomatiqueAdressee('debut-8'), apres);

    expect(issue.finsAutomatiquesRestantes).toEqual([]);
  });

  it('should address the automatic end of another follow-up even when its opening pointage bears the same name', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: true }),
      activites: [uneActivite('travail-8', 'ECHUE', 'debut-8')],
    };

    const issue = IssueDeLActe.depuis(uneFinAutomatiqueAdressee('debut-8', 'suivi-autre'), apres);

    expect(issue.finsAutomatiquesRestantes.map(adresse => adresse.pointage.pointage)).toEqual(['debut-8']);
  });

  it('should address no automatic end when no activity is expired', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: false }),
      activites: [uneActivite('travail-8', 'TERMINEE', 'debut-8')],
    };

    const issue = IssueDeLActe.depuis(unConflit(), apres);

    expect(issue.finsAutomatiquesRestantes).toEqual([]);
  });

  it('should address no automatic end when the dossier after the act carries none, even beside an expired activity', () => {
    const apres = {
      ...unDossierApres({ enConflit: false, finAutomatique: false }),
      activites: [uneActivite('travail-8', 'ECHUE', 'debut-8')],
    };

    const issue = IssueDeLActe.depuis(unConflit(), apres);

    expect(issue).toMatchObject({ kind: 'TRAITEE', finsAutomatiquesRestantes: [] });
  });

  const unConflit = (): Pick<DossierAnomalie, 'etat' | 'enConflit' | 'ligne'> => ({
    etat: 'EN_CONFLIT',
    enConflit: true,
    ligne: uneLigneAdressee('fin-17'),
  });

  const uneFinAutomatique = (): Pick<DossierAnomalie, 'etat' | 'enConflit' | 'ligne'> => ({
    etat: 'FIN_AUTOMATIQUE',
    enConflit: false,
    ligne: uneLigneAdressee('debut-1'),
  });

  const uneFinAutomatiqueAdressee = (pointage: string, suivi?: string): ReturnType<typeof uneFinAutomatique> => ({
    ...uneFinAutomatique(),
    ligne: uneLigneAdressee(pointage, suivi),
  });

  const uneLigneAdressee = (pointage: string, suivi = 'suivi-1'): DossierAnomalie['ligne'] => ({
    ...unDossierApres({ enConflit: false, finAutomatique: false }).ligne,
    adresse: { suivi: new SuiviAnomalieId(suivi), pointage: new PointageAnomalieId(pointage) },
  });

  const uneActivite = (id: string, etat: ActiviteAnomalie['etat'], ouvrant: string): ActiviteAnomalie => ({
    id: new ActiviteAnomalieId(id),
    libelle: '',
    etat,
    temps: '',
    ouvrant: new PointageAnomalieId(ouvrant),
  });

  const unDossierApres = (
    etat: Pick<DossierAnomalie, 'enConflit' | 'finAutomatique'>,
  ): Pick<DossierAnomalie, 'enConflit' | 'finAutomatique' | 'ligne' | 'activites'> => ({
    ...etat,
    ligne: {
      adresse: { suivi: new SuiviAnomalieId('suivi-1'), pointage: new PointageAnomalieId('debut-1') },
      element: new ElementAnomalieId('element-1'),
      designation: 'Pièce',
      operateur: 'Luc',
      poste: 'Scie',
      date: '2026-09-14',
      explication: '',
      nombrePointages: 1,
    },
    activites: [],
  });
});
