import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ActeResolution, FaitPropose } from '../../domain/acte/ActeResolution';
import {
  ApercuConflit,
  ApplicationActePort,
  PrevisualisationConflitPort,
  ResultatApercu,
  ResultatApplication,
  ResultatVerification,
} from '../../domain/acte/ConflitsActesPorts';
import { PropositionResolution } from '../../domain/acte/ResolutionDuConflit';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ActiviteConflitId } from '../../domain/dossier/ActiviteConflitId';
import { ConflitsReadPort } from '../../domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '../../domain/dossier/ConflitsRightsPort';
import { DemonstrationConflitsPort, IncidentDemo } from '../../domain/dossier/DemonstrationConflitsPort';
import {
  AdresseDossier,
  DossierConflit,
  FiltreConflits,
  LectureDossier,
  PAGE_SIZE_CONFLITS,
  PageConflits,
  PointageConflit,
} from '../../domain/dossier/DossierConflit';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { matriceConflits } from './MatriceConflits';
import { refusDemonstrationConflits } from './RefusDemonstrationConflits';
import { ScenarioConflits } from './ScenarioConflits';
import { scenariosRetroactifs } from './ScenarioRetroactif';
import { scenariosConflits } from './ScenariosConflits';
import { temoinsConflits } from './TemoinsConflits';

const adresseKey = (adresse: AdresseDossier): string => `${adresse.suivi.suivi}/${adresse.pointage.pointage}`;

interface RecuSimule extends PropositionResolution {
  readonly dossier: DossierConflit;
}

export class InMemoryConflits
  extends ConflitsReadPort
  implements PrevisualisationConflitPort, ApplicationActePort, DemonstrationConflitsPort
{
  private readonly scenarios = new Map<string, ScenarioConflits>();
  private readonly dossiers = new Map<string, DossierConflit>();
  private readonly recus = new Map<string, RecuSimule>();
  private readonly adresses = new Map<string, string>();
  private readonly incidents = new Set<IncidentDemo>();
  private commande = 0;

  constructor(
    private readonly droits: ConflitsRightsPort,
    private readonly errors: ErrorHandlerPort,
  ) {
    super();
    this.restore();
  }

  async reset(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve));
    this.dossiers.clear();
    this.scenarios.clear();
    this.recus.clear();
    this.adresses.clear();
    this.incidents.clear();
    this.restore();
  }

  arm(incident: IncidentDemo): void {
    this.incidents.add(incident);
  }

  private restore(): void {
    for (const scenario of [...scenariosConflits(), ...matriceConflits(), ...scenariosRetroactifs()]) {
      const key = adresseKey(scenario.dossier.ligne.adresse);
      this.scenarios.set(key, scenario);
      this.dossiers.set(key, scenario.dossier);
      for (const pointage of scenario.pointages) {
        this.adresses.set(adresseKey({ suivi: scenario.dossier.ligne.adresse.suivi, pointage: new PointageConflitId(pointage) }), key);
      }
    }
    for (const temoin of temoinsConflits()) this.dossiers.set(adresseKey(temoin.ligne.adresse), temoin);
  }

  async preview(adresse: AdresseDossier, version: number, acte: ActeResolution): Promise<ResultatApercu> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.incidents.delete('PANNE_APERCU')) throw new Error('Aperçu de démonstration indisponible');
    if (!this.droits.canApply()) return { kind: 'REFUS', raison: 'Rôle GESTIONNAIRE requis' };
    const lecture = this.readSnapshot(adresse);
    if (lecture.kind !== 'DOSSIER') return { kind: 'REFUS', raison: 'Ce pointage est annulé ou ne relève plus d’un conflit.' };
    const avant = lecture.dossier;
    if (version !== avant.version) return { kind: 'CONCURRENCE' };
    const refus = refusDemonstrationConflits(avant, acte);
    if (refus !== undefined) return { kind: 'REFUS', raison: refus };
    return this.previewScenario(adresse, avant, acte, `demo-commande-${++this.commande}`, this.prospectiveEvent(avant, acte));
  }

  private previewScenario(
    adresse: AdresseDossier,
    avant: DossierConflit,
    acte: ActeResolution,
    commande: string,
    evenement: string | undefined,
  ): ResultatApercu {
    const key = adresseKey(avant.ligne.adresse);
    const choix = avant.choix.find(choix => {
      const motif = acte.kind === 'REGULARISATION' ? '' : acte.motif;
      return choix.saisie.afterChange({ motif }).matches(acte);
    });
    const suite = choix === undefined ? undefined : this.scenarios.get(key)?.resultats.get(choix.id);
    if (suite === undefined) return { kind: 'LIMITATION', raison: 'Trajectoire non simulée' };
    const journal = this.afterActe(avant, acte, evenement ?? '');
    const continuations = this.changesAnchor(avant.ligne.adresse, acte) ? this.remainingLines(avant.ligne.adresse) : suite.continuations;
    const apres = { ...avant, ...suite, continuations, version: avant.version + 1, journal };
    const apercu = {
      adresse,
      commande,
      version: avant.version,
      acte,
      empreinteConsequences: JSON.stringify(apres),
      evaluation: '2026-10-03T10:00:00Z',
      ...(evenement === undefined ? {} : { evenement }),
      avant,
      apres,
    };
    return { kind: 'APERCU', apercu };
  }

  private prospectiveEvent(avant: DossierConflit, acte: ActeResolution): string | undefined {
    if (acte.kind === 'ANNULATION') return undefined;
    return acte.kind === 'REGULARISATION'
      ? `regularisation-${avant.ligne.adresse.pointage.pointage}`
      : `${acte.pointage}-correction-${avant.version + 1}`;
  }

  private changesAnchor(adresse: AdresseDossier, acte: ActeResolution): boolean {
    return acte.kind !== 'REGULARISATION' && acte.pointage === adresse.pointage.pointage;
  }

  private remainingLines(adresse: AdresseDossier): DossierConflit['continuations'] {
    return [...this.dossiers.entries()]
      .filter(
        ([key, dossier]) => key !== adresseKey(adresse) && dossier.enConflit && dossier.ligne.adresse.suivi.suivi === adresse.suivi.suivi,
      )
      .map(([, dossier]) => dossier.ligne);
  }

  private afterActe(avant: DossierConflit, acte: ActeResolution, evenement: string): readonly PointageConflit[] {
    if (acte.kind === 'REGULARISATION') {
      return [
        ...avant.journal,
        {
          id: new PointageConflitId(evenement),
          activiteCreee: new ActiviteConflitId(evenement),
          fait: this.toJournalFact(acte.fait),
          auteur: 'Gestionnaire de démonstration',
          enregistre: '2026-10-03T10:00:00Z',
          regularisation: true,
        },
      ];
    }
    const annulation = { motif: acte.motif, auteur: 'Gestionnaire de démonstration', instant: '2026-10-03T10:00:00Z' };
    const journal = avant.journal.map(pointage => (pointage.id.pointage === acte.pointage ? { ...pointage, annulation } : pointage));
    if (acte.kind === 'ANNULATION') return journal;
    const remplacements = avant.journal
      .filter(pointage => pointage.id.pointage === acte.pointage)
      .map(original => ({
        ...original,
        id: new PointageConflitId(evenement),
        fait: this.toJournalFact(acte.fait),
        remplace: original.id,
        auteur: annulation.auteur,
        enregistre: annulation.instant,
      }));
    return [...journal, ...remplacements];
  }

  private toJournalFact(fait: FaitPropose): FaitPropose {
    return {
      type: fait.type,
      intention: fait.intention,
      activiteVisee: fait.activiteVisee,
      operateur: fait.operateur,
      poste: fait.poste,
      instant: fait.instant,
    };
  }

  async apply(proposition: PropositionResolution): Promise<ResultatApplication> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.incidents.delete('PANNE_CONFIRMATION')) return { kind: 'ECHEC_CERTAIN' };
    if (!this.droits.canApply()) return { kind: 'REFUS', raison: 'Rôle GESTIONNAIRE requis' };
    const recu = this.recus.get(proposition.commande);
    if (recu !== undefined) return this.replay(proposition, recu);
    const resultat = this.prepareConfirmation(proposition);
    if (resultat.kind !== 'APERCU') return resultat.kind === 'CONCURRENCE' ? resultat : { kind: 'REFUS', raison: resultat.raison };
    const apercu = resultat.apercu;
    const refus = this.confirmationFailure(proposition, apercu);
    if (refus !== undefined) return refus;
    return this.record(apercu);
  }

  private prepareConfirmation(proposition: PropositionResolution): ResultatApercu {
    const avant = this.lookupDossier(proposition.adresse);
    if (avant === undefined) return { kind: 'REFUS', raison: 'Proposition de confirmation incohérente' };
    if (proposition.version !== avant.version) return { kind: 'CONCURRENCE' };
    if ((proposition.acte.kind === 'ANNULATION') !== (proposition.evenement === undefined)) {
      return { kind: 'REFUS', raison: 'Proposition de confirmation incohérente' };
    }
    return this.previewScenario(proposition.adresse, avant, proposition.acte, proposition.commande, proposition.evenement);
  }

  private record(apercu: ApercuConflit): ResultatApplication {
    this.install(apercu.apres);
    this.recus.set(apercu.commande, {
      adresse: apercu.adresse,
      commande: apercu.commande,
      acte: apercu.acte,
      empreinteConsequences: apercu.empreinteConsequences,
      ...(apercu.evenement === undefined ? {} : { evenement: apercu.evenement }),
      version: apercu.version,
      dossier: apercu.apres,
    });
    for (const pointage of apercu.apres.journal.slice(apercu.avant.journal.length)) {
      this.adresses.set(adresseKey({ suivi: apercu.adresse.suivi, pointage: pointage.id }), adresseKey(apercu.apres.ligne.adresse));
    }
    if (this.incidents.delete('ISSUE_INCONNUE')) return { kind: 'ISSUE_INCONNUE' };
    return { kind: 'APPLIQUE', dossier: apercu.apres };
  }

  private replay(proposition: PropositionResolution, recu: RecuSimule): ResultatApplication {
    if (!this.sameProposition(proposition, recu)) return { kind: 'REFUS', raison: 'Proposition de confirmation incohérente' };
    return { kind: 'APPLIQUE', dossier: recu.dossier };
  }

  async verify(proposition: PropositionResolution): Promise<ResultatVerification> {
    await new Promise(resolve => setTimeout(resolve));
    if (!this.droits.canApply()) return { kind: 'REFUS', raison: 'Rôle GESTIONNAIRE requis' };
    const recu = this.recus.get(proposition.commande);
    if (recu === undefined) return { kind: 'NON_ATTESTE' };
    if (!this.sameProposition(proposition, recu)) return { kind: 'REFUS', raison: 'Proposition de confirmation incohérente' };
    return { kind: 'ATTESTE', dossier: recu.dossier };
  }

  private confirmationFailure(proposition: PropositionResolution, apercu: ApercuConflit): ResultatApplication | undefined {
    if (proposition.empreinteConsequences !== apercu.empreinteConsequences) return { kind: 'CONCURRENCE' };
    if (!this.sameProposition(proposition, apercu)) return { kind: 'REFUS', raison: 'Proposition de confirmation incohérente' };
    const versions = [...this.dossiers.values()]
      .filter(dossier => dossier.ligne.adresse.suivi.suivi === apercu.adresse.suivi.suivi)
      .map(dossier => dossier.version);
    if (Math.max(...versions) !== apercu.version) return { kind: 'CONCURRENCE' };
    if (this.incidents.delete('CONCURRENCE')) {
      this.install({ ...apercu.avant, version: apercu.version + 1 });
      return { kind: 'CONCURRENCE' };
    }
    return undefined;
  }

  private sameProposition(proposition: PropositionResolution, attendu: PropositionResolution): boolean {
    return (
      this.sameActe(proposition.acte, attendu.acte)
      && proposition.empreinteConsequences === attendu.empreinteConsequences
      && proposition.evenement === attendu.evenement
      && proposition.version === attendu.version
      && adresseKey(proposition.adresse) === adresseKey(attendu.adresse)
    );
  }

  private sameActe(acte: ActeResolution, attendu: ActeResolution): boolean {
    if (acte.kind === 'REGULARISATION') return SaisieActe.regularise(acte.fait).matches(attendu);
    const saisie = acte.kind === 'ANNULATION' ? SaisieActe.cancel(acte.pointage) : SaisieActe.correct(acte.pointage, acte.fait);
    return saisie.afterChange({ motif: acte.motif }).matches(attendu);
  }

  private install(dossier: DossierConflit): void {
    for (const [key, courant] of this.dossiers) {
      if (courant.ligne.adresse.suivi.suivi !== dossier.ligne.adresse.suivi.suivi) continue;
      const apres =
        key === adresseKey(dossier.ligne.adresse) ? dossier : { ...courant, journal: dossier.journal, version: dossier.version };
      this.dossiers.set(key, apres);
      this.refreshReceipts(key, apres);
    }
  }

  private refreshReceipts(key: string, dossier: DossierConflit): void {
    for (const [commande, recu] of this.recus) {
      if (adresseKey(recu.dossier.ligne.adresse) === key) this.recus.set(commande, { ...recu, dossier });
    }
  }

  async list(filtre: FiltreConflits): Promise<PageConflits> {
    await new Promise(resolve => setTimeout(resolve));
    this.failReadIfArmed();
    const lignes = [...this.dossiers.values()]
      .filter(dossier => dossier.enConflit)
      .map(dossier => dossier.ligne)
      .filter(
        ligne =>
          ligne.operateur.toLowerCase().includes(filtre.operateur.toLowerCase())
          && `${ligne.element.element} ${ligne.designation}`.toLowerCase().includes(filtre.element.toLowerCase()),
      );
    const complete = !this.incidents.delete('LECTURE_PARTIELLE');
    const page = lignes.slice((filtre.page - 1) * PAGE_SIZE_CONFLITS, filtre.page * PAGE_SIZE_CONFLITS);
    return { lignes: complete ? page : page.slice(0, 2), total: lignes.length, complete };
  }

  async read(adresse: AdresseDossier): Promise<LectureDossier> {
    await new Promise(resolve => setTimeout(resolve));
    this.failReadIfArmed();
    return this.readSnapshot(adresse);
  }

  private readSnapshot(adresse: AdresseDossier): LectureDossier {
    const dossier = this.lookupDossier(adresse);
    if (dossier === undefined) return { kind: 'INTROUVABLE', journal: [] };
    const pointage = dossier.journal.find(pointage => pointage.id.pointage === adresse.pointage.pointage);
    if (pointage?.annulation !== undefined) return { kind: 'ANCRE_ANNULEE', journal: dossier.journal };
    if (!dossier.enConflit) return { kind: 'HORS_CONFLIT', journal: dossier.journal };
    return { kind: 'DOSSIER', dossier };
  }

  private lookupDossier(adresse: AdresseDossier): DossierConflit | undefined {
    return this.dossiers.get(this.adresses.get(adresseKey(adresse)) ?? adresseKey(adresse));
  }

  private failReadIfArmed(): void {
    if (!this.incidents.delete('PANNE_LECTURE')) return;
    const failure = new Error('Lecture de démonstration indisponible');
    this.errors.handleError(failure);
    throw failure;
  }
}
