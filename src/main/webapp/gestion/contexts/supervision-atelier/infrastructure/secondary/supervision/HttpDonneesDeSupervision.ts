import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { inject, Injectable } from '@angular/core';
import { ActiviteDeSupervision, DescriptionActivite } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
import { ElementTravaille } from '../../../domain/activite/ElementTravaille';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { IdentifiantSequence } from '../../../domain/activite/IdentifiantSequence';
import { ReferenceDElement } from '../../../domain/activite/ReferenceDElement';
import { SequenceEnConflit } from '../../../domain/activite/SequenceEnConflit';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { IdentifiantPoste } from '../../../domain/poste/IdentifiantPoste';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { PosteDeSupervision } from '../../../domain/poste/PosteDeSupervision';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';

type RestOperateur = components['schemas']['RestOperateurDeSupervision'];
type RestElement = components['schemas']['RestElementDeSupervision'];
type RestPoste = components['schemas']['RestPosteDeSupervision'];
type RestActivite = components['schemas']['RestActiviteDeSupervision'];
type RestDescription = components['schemas']['RestDescriptionDActiviteDeSupervision'];

const toOperateur = (operateur: RestOperateur): OperateurDeclare =>
  new OperateurDeclare({
    id: new IdentifiantOperateur(operateur.id),
    nom: operateur.nom,
    prenom: operateur.prenom,
    metiers: operateur.metiers.map(metier => new NatureDeTravail(metier)),
  });

const toElement = (element: RestElement): ElementTravaille =>
  new ElementTravaille({
    type: element.type,
    nom: element.nom,
    ...(element.reference === undefined ? {} : { reference: new ReferenceDElement(element.reference) }),
  });

const toPoste = (poste: RestPoste): PosteDeSupervision =>
  new PosteDeSupervision({
    id: new IdentifiantPoste(poste.id),
    libelle: poste.libelle,
    ...(poste.nature === undefined ? {} : { nature: new NatureDeTravail(poste.nature) }),
  });

const toDescription = (activite: RestDescription): DescriptionActivite => ({
  id: new IdentifiantActivite(activite.id),
  operateurId: new IdentifiantOperateur(activite.operateurId),
  objet: toElement(activite.element),
  categorie: new CategorieActivite(activite.categorie),
  debut: new Instant(activite.debut),
  echeance: new Instant(activite.echeance),
  ...(activite.poste === undefined ? {} : { poste: toPoste(activite.poste) }),
});

const toActivite = (activite: RestActivite): ActiviteDeSupervision =>
  new ActiviteDeSupervision({
    ...toDescription(activite),
    etat: activite.etat,
    ...(activite.finRetenue === undefined ? {} : { finRetenue: new Instant(activite.finRetenue) }),
  });

@Injectable()
export class HttpDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly api = inject(ApiClient);

  override async read(): Promise<DonneesDeSupervision> {
    const response = await this.api.read('/api/atelier/supervision', {});
    return {
      evaluation: new Instant(response.evaluation),
      operateurs: response.operateurs.map(toOperateur),
      activites: response.activites.map(toActivite),
      sequencesEnConflit: response.sequencesEnConflit.map(
        sequence =>
          new SequenceEnConflit({
            id: new IdentifiantSequence(sequence.id),
            operateurId: new IdentifiantOperateur(sequence.operateurId),
            activites: sequence.activites.map(activite => new ActiviteDeSupervision({ ...toDescription(activite), etat: 'A_RESOUDRE' })),
            ...(sequence.poste === undefined ? {} : { poste: toPoste(sequence.poste) }),
          }),
      ),
    };
  }
}
