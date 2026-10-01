import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { CommandeCreationOperateur } from './CommandeCreationOperateur';
import { CommandeModificationOperateur } from './CommandeModificationOperateur';
import { ErreursFormulaireOperateur } from './ErreursFormulaireOperateur';
import { Identifiant } from './Identifiant';
import { NomOperateur } from './NomOperateur';
import { Operateur } from './Operateur';
import { OperateurId } from './OperateurId';
import { PosteHabilitable } from './PosteHabilitable';
import { PosteHabilitableId } from './PosteHabilitableId';
import { PrenomOperateur } from './PrenomOperateur';
import { RefusModificationOperateur } from './RefusModificationOperateur';
import { TauxHoraire } from './TauxHoraire';

interface SaisieOperateur {
  readonly nom: string;
  readonly prenom: string;
  readonly identifiant: string;
  readonly tauxHoraire: string;
  readonly postes: readonly PosteHabilitable[];
}

export type CommandeOperateur = CommandeCreationOperateur | CommandeModificationOperateur;

const SAISIE_VIERGE: SaisieOperateur = { nom: '', prenom: '', identifiant: '', tauxHoraire: '', postes: [] };

export class FormulaireOperateur {
  private constructor(
    readonly saisie: SaisieOperateur,
    readonly id?: OperateurId,
    private readonly refus?: RefusModificationOperateur,
  ) {}

  static pourCreation(): FormulaireOperateur {
    return new FormulaireOperateur(SAISIE_VIERGE);
  }

  static pourModification(operateur: Operateur): FormulaireOperateur {
    return new FormulaireOperateur(
      {
        nom: operateur.nom.value,
        prenom: operateur.prenom.value,
        identifiant: operateur.identifiant?.value ?? '',
        tauxHoraire: operateur.tauxHoraire?.value.toString() ?? '',
        postes: operateur.postes,
      },
      operateur.id,
    );
  }

  estValide(): boolean {
    return Object.values(this.erreurs()).every(erreur => erreur === undefined);
  }

  produireCommande(): Result<CommandeOperateur, ErreursFormulaireOperateur> {
    if (!this.estValide()) {
      return err(this.erreurs());
    }
    const nom = new NomOperateur(this.saisie.nom);
    const prenom = new PrenomOperateur(this.saisie.prenom);
    const identifiant = this.identifiantEstRenseigne() ? new Identifiant(this.saisie.identifiant) : undefined;
    const tauxHoraire = this.tauxEstRenseigne() ? new TauxHoraire(this.tauxNumerique()) : undefined;
    const postes = this.saisie.postes.map(poste => poste.id);

    if (this.id === undefined) {
      return ok({ type: 'CREATION', nom, prenom, identifiant, tauxHoraire, postes });
    }
    return ok({ type: 'MODIFICATION', id: this.id, nom, prenom, identifiant, tauxHoraire, postes });
  }

  avecNom(nom: string): FormulaireOperateur {
    return new FormulaireOperateur(
      { ...this.saisie, nom },
      this.id,
      this.refusApresChangement(nom !== this.saisie.nom, 'identite-deja-utilisee'),
    );
  }

  avecPrenom(prenom: string): FormulaireOperateur {
    return new FormulaireOperateur(
      { ...this.saisie, prenom },
      this.id,
      this.refusApresChangement(prenom !== this.saisie.prenom, 'identite-deja-utilisee'),
    );
  }

  avecIdentifiant(identifiant: string): FormulaireOperateur {
    return new FormulaireOperateur(
      { ...this.saisie, identifiant },
      this.id,
      this.refusApresChangement(identifiant !== this.saisie.identifiant, 'identifiant-deja-utilise'),
    );
  }

  avecTauxHoraire(tauxHoraire: string): FormulaireOperateur {
    return new FormulaireOperateur({ ...this.saisie, tauxHoraire }, this.id, this.refus);
  }

  avecPosteAjoute(poste: PosteHabilitable): FormulaireOperateur {
    if (this.estDejaHabilite(poste.id)) {
      return this;
    }
    const postes = [...this.saisie.postes, poste].sort((left, right) => left.compare(right));
    return new FormulaireOperateur({ ...this.saisie, postes }, this.id, this.refusApresChangement(true, 'poste-habilitable-introuvable'));
  }

  avecPosteRetire(id: PosteHabilitableId): FormulaireOperateur {
    const postes = this.saisie.postes.filter(poste => poste.id.value !== id.value);
    return new FormulaireOperateur(
      { ...this.saisie, postes },
      this.id,
      this.refusApresChangement(postes.length !== this.saisie.postes.length, 'poste-habilitable-introuvable'),
    );
  }

  avecRefus(refus: RefusModificationOperateur): FormulaireOperateur {
    return new FormulaireOperateur(this.saisie, this.id, refus);
  }

  erreurNom(): string | undefined {
    return this.refus?.code === 'identite-deja-utilisee' ? this.refus.message : NomOperateur.erreur(this.saisie.nom);
  }

  erreurPrenom(): string | undefined {
    return PrenomOperateur.erreur(this.saisie.prenom);
  }

  erreurIdentifiant(): string | undefined {
    if (this.refus?.code === 'identifiant-deja-utilise') {
      return this.refus.message;
    }
    return this.identifiantEstRenseigne() ? Identifiant.erreur(this.saisie.identifiant) : undefined;
  }

  erreurTauxHoraire(): string | undefined {
    return this.tauxEstRenseigne() ? TauxHoraire.erreur(this.tauxNumerique()) : undefined;
  }

  erreurEnregistrement(): string | undefined {
    return this.refusEstGlobal() ? this.refus?.message : undefined;
  }

  estDejaHabilite(id: PosteHabilitableId): boolean {
    return this.saisie.postes.some(poste => poste.id.value === id.value);
  }

  private refusEstGlobal(): boolean {
    const introuvable = this.refus?.code === 'operateur-introuvable';
    const posteIntrouvable = this.refus?.code === 'poste-habilitable-introuvable';
    return introuvable || posteIntrouvable;
  }

  private refusApresChangement(aChange: boolean, code: RefusModificationOperateur['code']): RefusModificationOperateur | undefined {
    const efface = aChange && this.refus?.code === code;
    return efface ? undefined : this.refus;
  }

  private erreurs(): ErreursFormulaireOperateur {
    return {
      nom: this.erreurNom(),
      prenom: this.erreurPrenom(),
      identifiant: this.erreurIdentifiant(),
      tauxHoraire: this.erreurTauxHoraire(),
      enregistrement: this.erreurEnregistrement(),
    };
  }

  private identifiantEstRenseigne(): boolean {
    return this.saisie.identifiant.trim() !== '';
  }

  private tauxEstRenseigne(): boolean {
    return this.saisie.tauxHoraire.trim() !== '';
  }

  private tauxNumerique(): number {
    return Number(this.saisie.tauxHoraire.replace(',', '.'));
  }
}
