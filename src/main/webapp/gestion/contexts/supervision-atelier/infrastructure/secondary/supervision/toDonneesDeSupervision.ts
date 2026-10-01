import { components } from '@/app/generated/schema';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
import { ElementTravaille } from '../../../domain/activite/ElementTravaille';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { ReferenceDElement } from '../../../domain/activite/ReferenceDElement';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { IdentifiantPoste } from '../../../domain/poste/IdentifiantPoste';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { PosteDeSupervision } from '../../../domain/poste/PosteDeSupervision';
import { FenetreDePresence } from '../../../domain/presence/FenetreDePresence';
import { JourneeDeTravail } from '../../../domain/presence/JourneeDeTravail';
import { ConflitDeSupervision } from '../../../domain/supervision/ConflitDeSupervision';
import { DonneesDeSupervision } from '../../../domain/supervision/DonneesDeSupervisionPort';

const toPoste = (
  poste: components['schemas']['RestPosteDAtelier'],
  postes: readonly components['schemas']['RestPosteDeTravail'][],
): PosteDeSupervision => {
  const reference = postes.find(candidat => candidat.id === poste.id);
  return new PosteDeSupervision({
    id: new IdentifiantPoste(poste.id),
    libelle: poste.libelle,
    ...(reference === undefined ? {} : { nature: new NatureDeTravail(reference.nature) }),
  });
};

const toOperateur = (operateur: components['schemas']['RestOperateur']): OperateurDeclare =>
  new OperateurDeclare({
    id: new IdentifiantOperateur(operateur.id),
    nom: operateur.nom,
    prenom: operateur.prenom,
    metiers: operateur.natures.map(nature => new NatureDeTravail(nature)),
  });

const toJournee = (journee: components['schemas']['RestJourneeDeTravail']): JourneeDeTravail =>
  JourneeDeTravail.open(
    new IdentifiantOperateur(required(journee.operateur, 'journee.operateur').id),
    journee.fenetres.map(fenetre => new FenetreDePresence(new Instant(fenetre.debut))),
  );

const toActivite = (
  activite: components['schemas']['RestActiviteEnCours'],
  suivi: components['schemas']['RestSuiviDAtelierEnGrille'],
  postes: readonly components['schemas']['RestPosteDeTravail'][],
): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    id: new IdentifiantActivite(activite.ouverture),
    operateurId: activite.operateur === undefined ? undefined : new IdentifiantOperateur(activite.operateur.id),
    categorie: new CategorieActivite(activite.categorie),
    debut: new Instant(activite.depuis),
    objet: new ElementTravaille({
      type: suivi.type,
      nom: suivi.nom,
      ...(suivi.reference === undefined ? {} : { reference: new ReferenceDElement(suivi.reference) }),
    }),
    ...(activite.poste === undefined ? {} : { poste: toPoste(activite.poste, postes) }),
  });

interface DonneesRest {
  readonly operateurs: readonly components['schemas']['RestOperateur'][];
  readonly journees: readonly components['schemas']['RestJourneeDeTravail'][];
  readonly suivis: readonly components['schemas']['RestSuiviDAtelierEnGrille'][];
  readonly postes: readonly components['schemas']['RestPosteDeTravail'][];
}

export const toDonneesDeSupervision = ({ operateurs, journees, suivis, postes }: DonneesRest): DonneesDeSupervision => ({
  operateurs: operateurs.map(toOperateur),
  journees: journees.map(toJournee),
  activites: suivis.flatMap(suivi => suivi.activitesEnCours.map(activite => toActivite(activite, suivi, postes))),
  conflits: suivis.flatMap(suivi =>
    suivi.conflits.map(
      conflit => new ConflitDeSupervision(conflit.operateur === undefined ? undefined : new IdentifiantOperateur(conflit.operateur.id)),
    ),
  ),
});
