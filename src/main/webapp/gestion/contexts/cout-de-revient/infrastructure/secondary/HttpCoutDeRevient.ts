import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { required } from '@/app/shared/api-client/infrastructure/secondary/required';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ElementChiffre } from '../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../domain/element/ElementChiffreId';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { TotalDeMontant } from '../../domain/montant/TotalDeMontant';
import { ActiviteCitee } from '../../domain/pointage/ActiviteCitee';
import { ElementCite } from '../../domain/pointage/ElementCite';
import { OperateurCite } from '../../domain/pointage/OperateurCite';
import { PartDePointage } from '../../domain/pointage/PartDePointage';
import { PointageDeCout } from '../../domain/pointage/PointageDeCout';
import { PosteCite } from '../../domain/pointage/PosteCite';
import { ActivitesEnCoursExclues } from '../../domain/rapport/ActivitesEnCoursExclues';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../domain/rapport/NatureDOperation';
import { SequenceEnConflit } from '../../domain/rapport/SequenceEnConflit';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';
import { TotalDeTemps } from '../../domain/temps/TotalDeTemps';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];
type RestTemps = components['schemas']['RestTempsPasse'];
type RestCout = components['schemas']['RestCout'];
type RestPeriode = components['schemas']['RestPeriodeDuCout'];
type RestPointage = components['schemas']['RestPointageDuCout'];
type RestPart = components['schemas']['RestPartDuPointageDuCout'];
type RestActiviteCitee = components['schemas']['RestActiviteCiteeDuCout'];
type RestPoste = components['schemas']['RestPosteDuCout'];

const ROUTE = '/api/couts-de-revient/{elementId}';
const ELEMENT_INCONNU = 404;

const toDuree = (total: components['schemas']['RestDureeDuCout'] | undefined, chemin: string): TotalDeTemps => {
  const lu = required(total, chemin);
  return lu.complete ? TotalDeTemps.complet(new DureePassee(required(lu.valeur, `${chemin}.valeur`))) : TotalDeTemps.incomplet();
};

const toMontant = (total: components['schemas']['RestMontantDuCout'] | undefined, chemin: string): TotalDeMontant => {
  const lu = required(total, chemin);
  return lu.complete ? TotalDeMontant.complet(new Montant(required(lu.valeur, `${chemin}.valeur`))) : TotalDeMontant.incomplet();
};

const toTemps = (temps: RestTemps | undefined, chemin: string): TempsPasse => {
  const lu = required(temps, chemin);
  return new TempsPasse(
    toDuree(lu.travail, `${chemin}.travail`),
    toDuree(lu.nonConformite, `${chemin}.nonConformite`),
    toDuree(lu.total, `${chemin}.total`),
  );
};

const toCout = (cout: RestCout | undefined, chemin: string): Cout => {
  const lu = required(cout, chemin);
  return new Cout(
    toMontant(lu.machine, `${chemin}.machine`),
    toMontant(lu.mainDOeuvre, `${chemin}.mainDOeuvre`),
    toMontant(lu.total, `${chemin}.total`),
  );
};

const toPeriode = (periode: RestPeriode | undefined, chemin: string): PeriodeDeTravail => {
  const lue = required(periode, chemin);
  return new PeriodeDeTravail(new InstantDeTravail(required(lue.debut, `${chemin}.debut`)), toInstant(lue.fin));
};

const toNature = (nature: string | undefined): NatureDOperation | undefined =>
  nature === undefined ? undefined : new NatureDOperation(nature);

const toInstant = (instant: string | undefined): InstantDeTravail | undefined =>
  instant === undefined ? undefined : new InstantDeTravail(instant);

const toTarif = (tarif: number | undefined): Montant | undefined => (tarif === undefined ? undefined : new Montant(tarif));

const toPoste = (poste: RestPoste | undefined): PosteCite | undefined =>
  poste === undefined ? undefined : new PosteCite(required(poste.id, 'poste.id'), poste.libelle);

const toActivite = (activite: RestActiviteCitee): ActiviteCitee => {
  const element = required(activite.element, 'activite.element');
  return new ActiviteCitee(
    new ElementCite(new ElementChiffreId(required(element.id, 'activite.element.id')), element.nom, element.type),
    toPoste(activite.poste),
    toNature(activite.nature),
  );
};

const toPart = (part: RestPart): PartDePointage =>
  new PartDePointage({
    debut: new InstantDeTravail(required(part.debut, 'part.debut')),
    fin: new InstantDeTravail(required(part.fin, 'part.fin')),
    duree: new DureePassee(required(part.duree, 'part.duree')),
    diviseur: part.diviseur,
    mainDOeuvre: toMontant(part.mainDOeuvre, 'part.mainDOeuvre'),
    paralleles: required(part.paralleles, 'part.paralleles').map(toActivite),
    bloquants: required(part.bloquants, 'part.bloquants').map(toActivite),
  });

const toPointage = (pointage: RestPointage): PointageDeCout => {
  const operateur = required(pointage.operateur, 'pointage.operateur');
  return new PointageDeCout({
    operateur: new OperateurCite(required(operateur.id, 'pointage.operateur.id'), operateur.prenom, operateur.nom),
    poste: toPoste(pointage.poste),
    categorie: required(pointage.categorie, 'pointage.categorie'),
    periode: new PeriodeDeTravail(new InstantDeTravail(required(pointage.debut, 'pointage.debut')), toInstant(pointage.fin)),
    duree: toDuree(pointage.duree, 'pointage.duree'),
    coutHoraire: toTarif(pointage.coutHoraire),
    tauxHoraire: toTarif(pointage.tauxHoraire),
    cout: toCout(pointage.cout, 'pointage.cout'),
    parts: required(pointage.parts, 'pointage.parts').map(toPart),
  });
};

const toLigne = (ligne: RestLigne): LigneDeCout =>
  new LigneDeCout({
    nature: toNature(ligne.nature),
    temps: toTemps(ligne.temps, 'ligne.temps'),
    cout: toCout(ligne.cout, 'ligne.cout'),
    finsAutomatiques: required(ligne.finsAutomatiques, 'ligne.finsAutomatiques').map(periode => toPeriode(periode, 'ligne.finAutomatique')),
    pointages: required(ligne.pointages, 'ligne.pointages').map(toPointage),
  });

const toElement = (rapport: RestRapport): ElementChiffre => {
  const element = required(rapport.element, 'rapport.element');
  return new ElementChiffre(required(element.nom, 'rapport.element.nom'), required(element.type, 'rapport.element.type'));
};

const toRapport = (rapport: RestRapport): CoutDeRevient =>
  new CoutDeRevient(toElement(rapport), {
    evaluation: new InstantDeTravail(rapport.evaluation),
    activitesEnCours: new ActivitesEnCoursExclues(rapport.activitesEnCours),
    conflits: required(rapport.conflits, 'rapport.conflits').map(
      conflit => new SequenceEnConflit({ ...conflit, element: new ElementChiffreId(conflit.element), poste: conflit.poste }),
    ),
    lignes: required(rapport.lignes, 'rapport.lignes').map(toLigne),
    temps: toTemps(rapport.temps, 'rapport.temps'),
    cout: toCout(rapport.cout, 'rapport.cout'),
  });

const estElementInconnu = (failure: unknown): boolean => {
  if (!(failure instanceof HttpErrorResponse)) {
    return false;
  }
  return failure.status === ELEMENT_INCONNU;
};

@Injectable()
export class HttpCoutDeRevient extends CoutDeRevientPort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async rapport(element: ElementChiffreId): Promise<CoutDeRevient | undefined> {
    try {
      const response = await this.api.read(ROUTE, { pathParams: { elementId: element.value } });
      return toRapport(response);
    } catch (failure) {
      if (estElementInconnu(failure)) {
        return undefined;
      }
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
