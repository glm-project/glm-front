import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { inject, Injectable } from '@angular/core';
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
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';

@Injectable()
export class HttpDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly api = inject(ApiClient);

  override async read(): Promise<DonneesDeSupervision> {
    const response = await this.api.read('/api/atelier/supervision', {});
    return {
      evaluation: new Instant(response.evaluation),
      operateurs: response.operateurs.map(
        operateur =>
          new OperateurDeclare({
            id: new IdentifiantOperateur(operateur.id),
            nom: operateur.nom,
            prenom: operateur.prenom,
            metiers: operateur.metiers.map(metier => new NatureDeTravail(metier)),
          }),
      ),
      activites: response.activites.map(
        activite =>
          new ActiviteDeSupervision({
            id: new IdentifiantActivite(activite.id),
            operateurId: new IdentifiantOperateur(activite.operateurId),
            objet: new ElementTravaille({
              type: activite.element.type,
              nom: activite.element.nom,
              ...(activite.element.reference === undefined ? {} : { reference: new ReferenceDElement(activite.element.reference) }),
            }),
            categorie: new CategorieActivite(activite.categorie),
            debut: new Instant(activite.debut),
            echeance: new Instant(activite.echeance),
            ...(activite.poste === undefined
              ? {}
              : {
                  poste: new PosteDeSupervision({
                    id: new IdentifiantPoste(activite.poste.id),
                    libelle: activite.poste.libelle,
                    ...(activite.poste.nature === undefined ? {} : { nature: new NatureDeTravail(activite.poste.nature) }),
                  }),
                }),
          }),
      ),
      sequencesEnConflit: [],
    };
  }
}
