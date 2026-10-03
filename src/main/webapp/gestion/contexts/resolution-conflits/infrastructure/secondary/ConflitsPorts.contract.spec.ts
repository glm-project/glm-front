import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ApercuConflit, ApplicationActePort, PrevisualisationConflitPort, ResultatApercu } from '../../domain/acte/ConflitsActesPorts';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ConflitsReadPort } from '../../domain/dossier/ConflitsReadPort';
import { DemonstrationConflitsPort } from '../../domain/dossier/DemonstrationConflitsPort';
import { DossierConflit, LectureDossier } from '../../domain/dossier/DossierConflit';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { InMemoryConflits } from './InMemoryConflits';

const dossierFixture = (lecture: LectureDossier): DossierConflit => {
  if (lecture.kind !== 'DOSSIER') throw new Error('Le dossier fixture doit être lisible');
  return lecture.dossier;
};

const acteFixture = (saisie: SaisieActe) => {
  const acte = saisie.afterChange({ motif: 'Cible vérifiée avec l’opérateur' }).command();
  if (acte === undefined) throw new Error('La décision fixture doit être valide');
  return acte;
};

const apercuFixture = (resultat: ResultatApercu): ApercuConflit => {
  if (resultat.kind !== 'APERCU') throw new Error('Aperçu fixture absent');
  return resultat.apercu;
};

const choixFixture = (dossier: DossierConflit, rang = 0): SaisieActe => {
  const choix = dossier.choix[rang];
  if (choix === undefined) throw new Error('Choix fixture absent');
  return choix.saisie;
};

const adresseFixture = { suivi: new SuiviConflitId('demo-remplacement'), pointage: new PointageConflitId('fin-17') };

const whenGuidedActIsApplied = async (adapter: InMemoryConflits, suivi: string, pointage: string): Promise<DossierConflit> => {
  const adresse = { suivi: new SuiviConflitId(suivi), pointage: new PointageConflitId(pointage) };
  const dossier = dossierFixture(await adapter.read(adresse));
  const apercu = apercuFixture(await adapter.preview(adresse, dossier.version, acteFixture(choixFixture(dossier))));
  const resultat = await adapter.apply(apercu);
  if (resultat.kind !== 'APPLIQUE') throw new Error('Acte fixture non appliqué');
  return resultat.dossier;
};

describe.each([{ nom: 'InMemory', adapterFixture: () => new InMemoryConflits({ canApply: () => true }, new ErrorHandlerFixture()) }])(
  '$nom resolution ports',
  ({ adapterFixture }) => {
    it('should keep the independent work unresolved before choosing between its simultaneous finishes', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-retroactif'), pointage: new PointageConflitId('fin-tour-10-bis') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.activites).toMatchObject([
        { id: { activite: 'travail-tour' }, libelle: 'Travail indépendant commencé à 9 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
      ]);
    });
    it('should describe activity origins before deciding which work the late transition targeted', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-cible-echue'), pointage: new PointageConflitId('nc-23') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.activites).toMatchObject([
        { id: { activite: 'travail-8' }, libelle: 'Travail A commencé à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
        { id: { activite: 'travail-22' }, libelle: 'Travail B commencé à 22 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
        { id: { activite: 'nc-23' }, libelle: 'NC commencée à 23 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
      ]);
    });
    it('should leave the work finish undecided while both finish presses remain active', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-deux-fins'), pointage: new PointageConflitId('fin-17-02') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.activites).toMatchObject([
        { id: { activite: 'travail-8' }, libelle: 'Travail commencé à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
      ]);
    });
    it('should describe the existing openings without anticipating a corrected restart target', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-transition'), pointage: new PointageConflitId('transition-14') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.activites).toMatchObject([
        { id: { activite: 'travail-8' }, libelle: 'Travail commencé à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
        { id: { activite: 'nc-12' }, libelle: 'NC commencée à 12 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
        { id: { activite: 'reprise-14' }, libelle: 'Reprise commencée à 14 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
      ]);
    });
    it('should leave the existing non-conformity unresolved before deciding to cancel its transition', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-regularisation'), pointage: new PointageConflitId('nc-22') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.activites).toMatchObject([
        { id: { activite: 'travail-8' }, libelle: 'Travail commencé à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
        { id: { activite: 'nc-22' }, libelle: 'NC commencée à 22 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
      ]);
      expect(dossier.journal[1]?.annulation).toBeUndefined();
    });
    it('should describe both existing work openings before deciding to correct a same-category transition', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-meme-categorie'), pointage: new PointageConflitId('transition-12') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.activites).toMatchObject([
        { id: { activite: 'travail-8' }, libelle: 'Travail commencé à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
        { id: { activite: 'activite-12' }, libelle: 'Travail commencé à 12 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
      ]);
      expect(dossier.journal[1]).toMatchObject({ fait: { type: 'DEBUT' } });
      expect(dossier.journal[1]?.annulation).toBeUndefined();
    });
    it('should enforce the gestionnaire role on preview and confirmation at their port boundaries', async () => {
      const adapter = new InMemoryConflits({ canApply: () => false }, new ErrorHandlerFixture());
      const initial = dossierFixture(await adapter.read(adresseFixture));

      const apercu = await adapter.preview(adresseFixture, initial.version, acteFixture(choixFixture(initial)));
      const application = await adapter.apply({ version: 1, reference: 'aucun-apercu-autorise' });
      const lecture = await adapter.read(adresseFixture);

      expect(apercu).toEqual({ kind: 'REFUS', raison: 'Rôle GESTIONNAIRE requis' });
      expect(application).toEqual({ kind: 'REFUS', raison: 'Rôle GESTIONNAIRE requis' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should refuse confirmation when the session loses its gestionnaire role while application is pending', async () => {
      let gestionnaire = true;
      const adapter = new InMemoryConflits({ canApply: () => gestionnaire }, new ErrorHandlerFixture());
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, initial.version, acteFixture(choixFixture(initial))));

      const application = adapter.apply(apercu);
      gestionnaire = false;
      const resultat = await application;
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'REFUS', raison: 'Rôle GESTIONNAIRE requis' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should recognise the exact guided fact independently of object property ordering', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));

      const resultat = await adapter.preview(adresseFixture, initial.version, {
        kind: 'CORRECTION',
        pointage: 'fin-17',
        motif: 'Cible vérifiée',
        fait: {
          instant: '2026-09-14T17:00:00+02:00',
          poste: 'poste-dmu',
          operateur: 'op-camille',
          activiteVisee: 'nc-12',
          intention: 'FIN',
          type: 'FIN',
        },
      });

      expect(resultat.kind).toBe('APERCU');
    });
    it.each([
      { fait: { operateur: 'op-inconnu' }, raison: 'Opérateur inconnu du référentiel de démonstration.' },
      { fait: { poste: 'poste-inconnu' }, raison: 'Poste inconnu du référentiel de démonstration.' },
    ])('should preserve the journal when a regularisation uses an unknown reference: $raison', async ({ fait, raison }) => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const saisie = SaisieActe.regularise({
        type: 'DEBUT',
        intention: 'OUVERTURE',
        activiteVisee: '',
        operateur: 'op-camille',
        poste: 'poste-dmu',
        instant: '2026-09-14T14:00:00+02:00',
      }).afterChange({ fait });

      const resultat = await adapter.preview(adresseFixture, initial.version, acteFixture(saisie));
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'REFUS', raison });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should refuse a cancellation without a valid reason even when its guided trajectory exists', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));

      const resultat = await adapter.preview(adresseFixture, initial.version, { kind: 'ANNULATION', pointage: 'nc-12', motif: '' });
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'REFUS', raison: 'Un motif de 1 à 255 caractères est requis.' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should refuse moving an opening to another key while active gestures still target it', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(
        SaisieActe.correct('debut-8', {
          type: 'DEBUT',
          intention: 'OUVERTURE',
          activiteVisee: '',
          operateur: 'op-jean',
          poste: 'poste-dmu',
          instant: '2026-09-14T08:00:00+02:00',
        }),
      );

      const resultat = await adapter.preview(adresseFixture, initial.version, acte);
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'REFUS', raison: 'L’ouverture est encore visée sur son opérateur/poste d’origine.' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it.each([
      { suivi: 'demo-remplacement', ancre: 'fin-17', pointage: 'pointage-absent', raison: 'Pointage à modifier introuvable.' },
      { suivi: 'demo-ouverture-annulee', ancre: 'fin-orpheline', pointage: 'debut-annule', raison: 'Le pointage est déjà annulé.' },
    ])('should refuse to cancel $pointage without changing the journal', async ({ suivi, ancre, pointage, raison }) => {
      const adapter = adapterFixture();
      const adresse = { suivi: new SuiviConflitId(suivi), pointage: new PointageConflitId(ancre) };
      const initial = dossierFixture(await adapter.read(adresse));
      const acte = acteFixture(SaisieActe.cancel(pointage));

      const resultat = await adapter.preview(adresse, initial.version, acte);
      const lecture = await adapter.read(adresse);

      expect(resultat).toEqual({ kind: 'REFUS', raison });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it.each([
      { cle: 'workstation', fait: { poste: 'poste-tour' } },
      { cle: 'operator', fait: { operateur: 'op-jean' } },
    ])('should refuse a target on another $cle', async ({ fait }) => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(choixFixture(initial).afterChange({ fait }));

      const resultat = await adapter.preview(adresseFixture, initial.version, acte);
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'REFUS', raison: 'La cible appartient à un autre opérateur ou poste.' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it.each([
      { suivi: 'demo-remplacement', instant: '2026-09-14T06:00:00+02:00', raison: 'L’heure métier précède l’engagement.' },
      { suivi: 'demo-retroactif', instant: '2026-09-14T18:01:00+02:00', raison: 'L’heure métier dépasse la clôture.' },
      { suivi: 'demo-retroactif', instant: '2026-09-14T18:00:00.000000001+02:00', raison: 'L’heure métier dépasse la clôture.' },
      { suivi: 'demo-remplacement', instant: '2026-10-04T17:00:00+02:00', raison: 'L’heure métier est future dans cette démonstration.' },
    ])('should refuse $instant outside the permitted facts of $suivi', async ({ suivi, instant, raison }) => {
      const adapter = adapterFixture();
      const adresse = { ...adresseFixture, suivi: new SuiviConflitId(suivi) };
      const initial = dossierFixture(await adapter.read(adresse));
      const acte = acteFixture(choixFixture(initial).afterChange({ fait: { instant } }));

      const resultat = await adapter.preview(adresse, initial.version, acte);
      const lecture = await adapter.read(adresse);

      expect(resultat).toEqual({ kind: 'REFUS', raison });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should refuse an unknown target instead of treating it as a supported contradiction', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(choixFixture(initial).afterChange({ fait: { activiteVisee: 'activite-absente' } }));

      const resultat = await adapter.preview(adresseFixture, initial.version, acte);
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'REFUS', raison: 'Activité visée introuvable dans ce suivi.' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should refuse another preview at the cancelled anchor rather than silently switching sequences', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(choixFixture(initial));
      await whenGuidedActIsApplied(adapter, 'demo-remplacement', 'fin-17');

      const resultat = await adapter.preview(adresseFixture, 2, acte);

      expect(resultat).toEqual({ kind: 'REFUS', raison: 'Ce pointage est annulé ou ne relève plus d’un conflit.' });
    });
    it('should preserve a valid but unsimulated detailed correction as a limitation without writing', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(choixFixture(initial).afterChange({ fait: { instant: '2026-09-14T17:01:00+02:00' } }));

      const resultat = await adapter.preview(adresseFixture, initial.version, acte);
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'LIMITATION', raison: 'Trajectoire non simulée' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should preserve a valid opening outside the scripted trajectories as a limitation without writing', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(
        SaisieActe.regularise({
          type: 'DEBUT',
          intention: 'OUVERTURE',
          activiteVisee: '',
          operateur: 'op-camille',
          poste: 'poste-dmu',
          instant: '2026-09-14T14:00:00+02:00',
        }),
      );

      const resultat = await adapter.preview(adresseFixture, initial.version, acte);
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toEqual({ kind: 'LIMITATION', raison: 'Trajectoire non simulée' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should retain an addressable active restart after the intermediate retroactive regularisation', async () => {
      const adapter = adapterFixture();
      await whenGuidedActIsApplied(adapter, 'demo-retroactif', 'fin-17');
      const adresse = { suivi: new SuiviConflitId('demo-retroactif'), pointage: new PointageConflitId('regularisation-fin-17') };

      const resultat = dossierFixture(await adapter.read(adresse));

      expect(resultat).toMatchObject({ version: 2, enConflit: true, choix: [{ id: 'rattacher-fin-reprise' }] });
    });
    it('should open the same conflict from an active opening without redirecting to a different sequence', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { ...adresseFixture, pointage: new PointageConflitId('debut-8') };

      const dossier = dossierFixture(await lecture.read(adresse));

      expect(dossier.ligne.adresse).toEqual(adresseFixture);
      expect(dossier.choix.map(choix => choix.id)).toEqual(['rattacher-fin', 'annuler-transition']);
    });
    it.each([
      { suivi: 'temoin-fin-ciblee', pointage: 'fin-17' },
      { suivi: 'temoin-fin-differee', pointage: 'fin-17' },
      { suivi: 'temoin-transition-echue', pointage: 'nc-23' },
      { suivi: 'temoin-fin-automatique', pointage: 'debut-8' },
    ])('should keep $suivi outside the conflict list while retaining its actual journal', async ({ suivi, pointage }) => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { suivi: new SuiviConflitId(suivi), pointage: new PointageConflitId(pointage) };

      const resultat = await lecture.read(adresse);
      const liste = await lecture.list({ operateur: '', element: 'Témoin', page: 1 });

      expect(resultat.kind).toBe('HORS_CONFLIT');
      expect(liste).toEqual({ lignes: [], total: 0, complete: true });
    });
    it('should return an active but resolved anchor as outside the conflicts', async () => {
      const adapter = adapterFixture();
      const dossier = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, dossier.version, acteFixture(choixFixture(dossier, 1))));
      await adapter.apply(apercu);

      const lecture = await adapter.read(adresseFixture);

      expect(lecture.kind).toBe('HORS_CONFLIT');
    });
    it('should expose a partial acquisition as incomplete until its next full retry', async () => {
      const adapter = adapterFixture();
      const demonstration: DemonstrationConflitsPort = adapter;
      demonstration.arm('LECTURE_PARTIELLE');

      const partielle = await adapter.list({ operateur: '', element: '', page: 1 });
      const complete = await adapter.list({ operateur: '', element: '', page: 1 });

      expect(partielle).toMatchObject({ total: 10, complete: false });
      expect(partielle.lignes).toHaveLength(2);
      expect(complete).toMatchObject({ total: 10, complete: true });
      expect(complete.lignes).toHaveLength(5);
    });
    it('should stale all previews of the same follow-up when a concurrent change is replayed', async () => {
      const adapter = adapterFixture();
      const adresse = { suivi: new SuiviConflitId('demo-retroactif'), pointage: new PointageConflitId('fin-17') };
      const secondeAdresse = { ...adresse, pointage: new PointageConflitId('fin-tour-10-bis') };
      const initial = dossierFixture(await adapter.read(adresse));
      const apercu = apercuFixture(await adapter.preview(adresse, initial.version, acteFixture(choixFixture(initial))));
      const demonstration: DemonstrationConflitsPort = adapter;
      demonstration.arm('CONCURRENCE');

      const resultat = await adapter.apply(apercu);
      const seconde = dossierFixture(await adapter.read(secondeAdresse));

      expect(resultat).toEqual({ kind: 'CONCURRENCE' });
      expect(seconde.version).toBe(2);
      expect(seconde.journal).toEqual(initial.journal);
    });
    it('should require canonical reading after an unknown confirmation outcome and prevent applying the same act again', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, initial.version, acteFixture(choixFixture(initial))));
      const demonstration: DemonstrationConflitsPort = adapter;
      demonstration.arm('ISSUE_INCONNUE');

      const resultat = await adapter.apply(apercu);
      const lecture = await adapter.read(adresseFixture);
      const repetition = await adapter.apply(apercu);

      expect(resultat).toEqual({ kind: 'ISSUE_INCONNUE' });
      expect(lecture).toMatchObject({
        kind: 'ANCRE_ANNULEE',
        journal: [
          { id: { pointage: 'debut-8' } },
          { id: { pointage: 'nc-12' } },
          { id: { pointage: 'fin-17' }, annulation: { motif: 'Cible vérifiée avec l’opérateur' } },
          { remplace: { pointage: 'fin-17' } },
        ],
      });
      expect(repetition.kind).toBe('REFUS');
    });
    it('should make a certain confirmation failure retryable without writing the journal', async () => {
      const adapter = adapterFixture();
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, initial.version, acteFixture(choixFixture(initial))));
      const demonstration: DemonstrationConflitsPort = adapter;
      demonstration.arm('PANNE_CONFIRMATION');

      const echec = await adapter.apply(apercu);
      const avantReprise = await adapter.read(adresseFixture);
      const reprise = await adapter.apply(apercu);

      expect(echec).toEqual({ kind: 'ECHEC_CERTAIN' });
      expect(avantReprise).toEqual({ kind: 'DOSSIER', dossier: initial });
      expect(reprise.kind).toBe('APPLIQUE');
    });
    it('should fail a preview without mutating its follow-up or reporting the same failure twice', async () => {
      const erreurs = new ErrorHandlerFixture();
      const adapter = new InMemoryConflits({ canApply: () => true }, erreurs);
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const demonstration: DemonstrationConflitsPort = adapter;
      demonstration.arm('PANNE_APERCU');

      const echec: unknown = await adapter
        .preview(adresseFixture, initial.version, acteFixture(choixFixture(initial)))
        .catch((failure: unknown) => failure);
      const lecture = await adapter.read(adresseFixture);

      expect(echec).toBeInstanceOf(Error);
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
      expect(erreurs.errors).toEqual([]);
    });
    it('should report a read outage once and let the next acquisition retry asynchronously', async () => {
      const erreurs = new ErrorHandlerFixture();
      const adapter = new InMemoryConflits({ canApply: () => true }, erreurs);
      const demonstration: DemonstrationConflitsPort = adapter;
      demonstration.arm('PANNE_LECTURE');

      const echec: unknown = await adapter.list({ operateur: '', element: '', page: 1 }).catch((failure: unknown) => failure);
      const reprise = await adapter.list({ operateur: '', element: '', page: 1 });

      expect(echec).toBeInstanceOf(Error);
      expect(erreurs.errors).toEqual([echec]);
      expect(reprise.total).toBe(10);
    });
    it('should paginate the ten conflict sequences without including coherent or automatic-end witnesses', async () => {
      const lecture: ConflitsReadPort = adapterFixture();

      const premiere = await lecture.list({ operateur: '', element: '', page: 1 });
      const seconde = await lecture.list({ operateur: '', element: '', page: 2 });

      expect(premiere).toMatchObject({ total: 10, complete: true });
      expect(premiere.lignes).toHaveLength(5);
      expect(seconde.lignes).toHaveLength(5);
      expect(premiere.lignes.map(ligne => ligne.adresse)).not.toEqual(seconde.lignes.map(ligne => ligne.adresse));
    });
    it('should restore the initial journal on reset after an applied act', async () => {
      const adapter = adapterFixture();
      const demonstration: DemonstrationConflitsPort = adapter;
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const ancien = apercuFixture(await adapter.preview(adresseFixture, initial.version, acteFixture(choixFixture(initial))));
      await adapter.apply(ancien);

      await demonstration.reset();
      const lecture = await adapter.read(adresseFixture);

      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should invalidate an unconsumed preview on reset even when a fresh preview contains the same act', async () => {
      const adapter = adapterFixture();
      const demonstration: DemonstrationConflitsPort = adapter;
      const initial = dossierFixture(await adapter.read(adresseFixture));
      const acte = acteFixture(choixFixture(initial));
      const ancien = apercuFixture(await adapter.preview(adresseFixture, initial.version, acte));

      await demonstration.reset();
      const nouveau = apercuFixture(await adapter.preview(adresseFixture, initial.version, acte));
      const application = await adapter.apply(ancien);
      const lecture = await adapter.read(adresseFixture);

      expect(nouveau.reference).not.toBe(ancien.reference);
      expect(application).toEqual({ kind: 'REFUS', raison: 'Aperçu inconnu' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier: initial });
    });
    it('should keep a corrected anchor explicitly cancelled when its old address is opened again', async () => {
      const adapter = adapterFixture();
      await whenGuidedActIsApplied(adapter, 'demo-remplacement', 'fin-17');

      const lecture = await adapter.read(adresseFixture);

      expect(lecture).toMatchObject({
        kind: 'ANCRE_ANNULEE',
        journal: [
          { id: { pointage: 'debut-8' } },
          { id: { pointage: 'nc-12' } },
          { id: { pointage: 'fin-17' }, annulation: { motif: 'Cible vérifiée avec l’opérateur' } },
          { remplace: { pointage: 'fin-17' } },
        ],
      });
    });
    it('should resolve the retroactive sequence with two chosen acts and offer the independent conflict as an explicit continuation', async () => {
      const adapter = adapterFixture();
      await whenGuidedActIsApplied(adapter, 'demo-retroactif', 'fin-17');

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-retroactif', 'fin-17');
      const liste = await adapter.list({ operateur: '', element: 'demo-element-50', page: 1 });

      expect(dossier).toMatchObject({ enConflit: false, cloture: true, version: 3 });
      expect(dossier.journal).toHaveLength(8);
      expect(dossier.journal[2]).toMatchObject({ id: { pointage: 'fin-17' }, annulation: { motif: 'Cible vérifiée avec l’opérateur' } });
      expect(dossier.journal.at(-1)).toMatchObject({ remplace: { pointage: 'fin-17' }, fait: { activiteVisee: 'regularisation-fin-17' } });
      expect(dossier.continuations[0]?.adresse).toEqual({
        suivi: new SuiviConflitId('demo-retroactif'),
        pointage: new PointageConflitId('fin-tour-10-bis'),
      });
      expect(liste.total).toBe(1);
    });
    it('should expose the same journal and version in the second sequence after a regularisation', async () => {
      const adapter = adapterFixture();
      const secondeAdresse = { suivi: new SuiviConflitId('demo-retroactif'), pointage: new PointageConflitId('fin-tour-10-bis') };

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-retroactif', 'fin-17');
      const seconde = dossierFixture(await adapter.read(secondeAdresse));

      expect(seconde.version).toBe(2);
      expect(seconde.journal).toEqual(dossier.journal);
      expect(seconde.enConflit).toBe(true);
      expect(seconde.ligne.poste).toBe('Tournage · Haas');
    });
    it('should accept the regularised restart while leaving the retroactive conflict and workshop closure in place', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-retroactif', 'fin-17');

      expect(dossier).toMatchObject({ enConflit: true, cloture: true, version: 2, choix: [{ id: 'rattacher-fin-reprise' }] });
      expect(dossier.journal.at(-1)).toMatchObject({
        id: { pointage: 'regularisation-fin-17' },
        activiteCreee: { activite: 'regularisation-fin-17' },
        regularisation: true,
        fait: { instant: '2026-09-14T14:00:00+02:00', activiteVisee: 'nc-12' },
      });
    });
    it('should preserve the managers regularised finish when explicitly cancelling the contradictory transition', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-regularisation', 'nc-22');

      expect(dossier).toMatchObject({
        enConflit: false,
        consequences: ['Travail de 8 h à 23 h : 15 h.', 'La fin régularisée reste conservée ; la transition en NC est annulée.'],
      });
      expect(dossier.journal[2]).toMatchObject({ id: { pointage: 'fin-regularisee-23' }, regularisation: true });
      expect(dossier.journal[1]).toMatchObject({ annulation: { motif: 'Cible vérifiée avec l’opérateur' } });
    });
    it('should retain the expired activity and its gap when the transition is attached to the current restart', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-cible-echue', 'nc-23');

      expect(dossier).toMatchObject({
        enConflit: false,
        consequences: [
          'Travail A de 8 h à 21 h : 13 h, fin automatique.',
          'Aucune activité de 21 h à 22 h.',
          'Travail B de 22 h à 23 h : 1 h.',
        ],
      });
      expect(dossier.activites[0]).toMatchObject({ etat: 'ECHUE', temps: '13 h' });
      expect(dossier.journal.at(-1)).toMatchObject({ fait: { activiteVisee: 'travail-22' } });
    });
    it('should correct a same-category transition while keeping the identity of the activity it opened', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-meme-categorie', 'transition-12');

      expect(dossier).toMatchObject({ enConflit: false, consequences: ['Travail de 8 h à 12 h : 4 h.', 'NC de 12 h à 17 h : 5 h.'] });
      expect(dossier.journal.at(-1)).toMatchObject({ activiteCreee: { activite: 'activite-12' }, fait: { type: 'NON_CONFORMITE' } });
      expect(dossier.journal[2]).toMatchObject({ fait: { activiteVisee: 'activite-12' } });
    });
    it('should cancel an orphan finish without inventing an activity or resolving the unknown operator identity', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-ouverture-annulee', 'fin-orpheline');

      expect(dossier).toMatchObject({ enConflit: false, activites: [], ligne: { operateur: 'Opérateur non résolu · op-absent' } });
      expect(dossier.journal).toMatchObject([
        { id: { pointage: 'debut-annule' }, annulation: { motif: 'Ouverture saisie par erreur' } },
        { id: { pointage: 'fin-orpheline' }, annulation: { motif: 'Cible vérifiée avec l’opérateur' } },
      ]);
    });
    it('should correct a finish before its opening while preserving nanoseconds and the absent workstation', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-avant-ouverture', 'fin-avant');

      expect(dossier).toMatchObject({ enConflit: false, ligne: { poste: '' } });
      expect(dossier.journal[0]).toMatchObject({ fait: { instant: '2026-09-14T08:00:00.123456789+02:00', poste: '' } });
      expect(dossier.journal.at(-1)).toMatchObject({ fait: { instant: '2026-09-14T17:00:00+02:00', poste: '' } });
    });
    it('should keep the first finish when the human cancels the second press two seconds later', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-deux-fins', 'fin-17-02');

      expect(dossier).toMatchObject({
        enConflit: false,
        consequences: ['Travail de 8 h à 17 h : 9 h.', 'La seconde fin à 17 h 00 min 02 s est annulée.'],
      });
      expect(dossier.journal.at(-1)).toMatchObject({
        id: { pointage: 'fin-17-02' },
        annulation: { motif: 'Cible vérifiée avec l’opérateur' },
      });
    });
    it('should resolve a transition targeting the replaced activity by explicitly targeting the non-conformity', async () => {
      const adapter = adapterFixture();

      const dossier = await whenGuidedActIsApplied(adapter, 'demo-transition', 'transition-14');

      expect(dossier).toMatchObject({
        enConflit: false,
        consequences: ['Travail de 8 h à 12 h : 4 h.', 'NC de 12 h à 14 h : 2 h.', 'Reprise de 14 h à 17 h : 3 h.'],
      });
      expect(dossier.journal.at(-1)).toMatchObject({ remplace: { pointage: 'transition-14' }, fait: { activiteVisee: 'nc-12' } });
    });
    it('should find the conflict by its element identity', async () => {
      const lecture: ConflitsReadPort = adapterFixture();

      const page = await lecture.list({ operateur: '', element: 'demo-moule-42', page: 1 });

      expect(page.total).toBe(1);
      expect(page.lignes[0]?.adresse).toEqual(adresseFixture);
    });
    it('should reject the second concurrent confirmation after the first changes the follow-up version', async () => {
      const adapter = adapterFixture();
      const dossier = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, dossier.version, acteFixture(choixFixture(dossier))));
      const autre = apercuFixture(await adapter.preview(adresseFixture, dossier.version, acteFixture(choixFixture(dossier, 1))));

      const premier = await adapter.apply(apercu);
      const second = await adapter.apply(autre);

      expect(premier.kind).toBe('APPLIQUE');
      expect(second).toEqual({ kind: 'CONCURRENCE' });
    });
    it('should refuse to apply a preview when its confirmation version was altered', async () => {
      const adapter = adapterFixture();
      const dossier = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, dossier.version, acteFixture(choixFixture(dossier))));

      const resultat = await adapter.apply({ ...apercu, version: 9 });
      const lecture = await adapter.read(adresseFixture);

      expect(resultat).toMatchObject({ kind: 'REFUS' });
      expect(lecture).toEqual({ kind: 'DOSSIER', dossier });
    });
    it('should reject a preview based on an obsolete version', async () => {
      const adapter = adapterFixture();
      const dossier = dossierFixture(await adapter.read(adresseFixture));

      const resultat = await adapter.preview(adresseFixture, 0, acteFixture(choixFixture(dossier)));

      expect(resultat).toEqual({ kind: 'CONCURRENCE' });
    });
    it('should return an unknown anchor explicitly instead of opening another sequence', async () => {
      const lecture: ConflitsReadPort = adapterFixture();
      const adresse = { ...adresseFixture, pointage: new PointageConflitId('pointage-absent') };

      const resultat = await lecture.read(adresse);

      expect(resultat.kind).toBe('INTROUVABLE');
    });
    it('should distinguish no matching conflict from the unfiltered list', async () => {
      const lecture: ConflitsReadPort = adapterFixture();

      const resultat = await lecture.list({ operateur: 'Opérateur absent', element: '', page: 1 });

      expect(resultat).toEqual({ lignes: [], total: 0, complete: true });
    });
    it('should preserve the finish when the human instead cancels the transition', async () => {
      const adapter = adapterFixture();
      const avant = dossierFixture(await adapter.read(adresseFixture));

      const apercu = await adapter.preview(adresseFixture, avant.version, acteFixture(choixFixture(avant, 1)));

      expect(apercu).toMatchObject({
        kind: 'APERCU',
        apercu: {
          apres: {
            enConflit: false,
            journal: [
              { id: { pointage: 'debut-8' } },
              { id: { pointage: 'nc-12' }, annulation: { motif: 'Cible vérifiée avec l’opérateur' } },
              { id: { pointage: 'fin-17' } },
            ],
            consequences: ['Travail de 8 h à 17 h : 9 h.', 'Le passage en NC est annulé.'],
          },
        },
      });
    });
    it('should apply one previewed correction and retain the original finish in history', async () => {
      const adapter = adapterFixture();
      const application: ApplicationActePort = adapter;
      const avant = dossierFixture(await adapter.read(adresseFixture));
      const apercu = apercuFixture(await adapter.preview(adresseFixture, avant.version, acteFixture(choixFixture(avant))));

      const resultat = await application.apply(apercu);
      const liste = await adapter.list({ operateur: '', element: 'M-042', page: 1 });

      expect(resultat).toMatchObject({
        kind: 'APPLIQUE',
        dossier: {
          version: 2,
          enConflit: false,
          journal: [
            { id: { pointage: 'debut-8' } },
            { id: { pointage: 'nc-12' } },
            { id: { pointage: 'fin-17' }, annulation: { motif: 'Cible vérifiée avec l’opérateur' } },
            { remplace: { pointage: 'fin-17' }, fait: { activiteVisee: 'nc-12' } },
          ],
        },
      });
      expect(liste.total).toBe(0);
    });
    it('should preview a target correction without changing the journal or its version', async () => {
      const adapter = adapterFixture();
      const lecture: ConflitsReadPort = adapter;
      const previsualisation: PrevisualisationConflitPort = adapter;
      const avant = dossierFixture(await lecture.read(adresseFixture));

      const apercu = await previsualisation.preview(adresseFixture, avant.version, acteFixture(choixFixture(avant)));
      const apres = await lecture.read(adresseFixture);

      expect(apercu).toMatchObject({ kind: 'APERCU', apercu: { avant: { enConflit: true }, apres: { enConflit: false } } });
      expect(apres).toEqual({ kind: 'DOSSIER', dossier: avant });
    });
    it('should explain the erroneous target while offering both human alternatives without selecting one', async () => {
      const lecture: ConflitsReadPort = adapterFixture();

      const resultat = await lecture.read(adresseFixture);

      expect(resultat).toMatchObject({
        kind: 'DOSSIER',
        dossier: {
          version: 1,
          enConflit: true,
          activites: [{ temps: 'À résoudre' }, { temps: 'À résoudre' }],
          choix: [{ id: 'rattacher-fin' }, { id: 'annuler-transition' }],
          journal: [
            { fait: { instant: '2026-09-14T08:00:00+02:00' } },
            { fait: { activiteVisee: 'travail-8' } },
            { fait: { activiteVisee: 'travail-8' } },
          ],
        },
      });
    });
    it('should list the sequence whose finish still targets the replaced travail', async () => {
      const lecture: ConflitsReadPort = adapterFixture();

      const page = await lecture.list({ operateur: '', element: 'M-042', page: 1 });

      expect(page.total).toBe(1);
      expect(page.complete).toBe(true);
      expect(page.lignes[0]?.explication).toBe('Fin à 17 h — vise le travail commencé à 8 h, terminé par le passage en NC à 12 h.');
    });
  },
);
