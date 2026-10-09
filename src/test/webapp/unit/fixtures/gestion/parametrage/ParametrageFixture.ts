import { err, ok, Result } from '@/app/shared/result/domain/Result';
import { DureeMaxDActivite } from '@/gestion/contexts/parametrage/domain/DureeMaxDActivite';
import { FichierDeLogo } from '@/gestion/contexts/parametrage/domain/FichierDeLogo';
import { ImageDuLogo } from '@/gestion/contexts/parametrage/domain/ImageDuLogo';
import { LogoRefuse } from '@/gestion/contexts/parametrage/domain/LogoRefuse';
import { Parametrage } from '@/gestion/contexts/parametrage/domain/Parametrage';
import { ParametragePort } from '@/gestion/contexts/parametrage/domain/ParametragePort';
import { VersionDuLogo } from '@/gestion/contexts/parametrage/domain/VersionDuLogo';

export class ParametrageFixture extends ParametragePort {
  duree = new DureeMaxDActivite(13);
  logo: { readonly version: VersionDuLogo; readonly image: ImageDuLogo } | undefined;
  readonly durees: DureeMaxDActivite[] = [];
  lectureFailure: Error | undefined;
  imageFailure: Error | undefined;
  ecritureFailure: Error | undefined;
  ecritureDifferee: Promise<void> | undefined;
  readonly depots: FichierDeLogo[] = [];
  refusDuServeur: string | undefined;
  depotFailure: Error | undefined;
  versionDeposee = new VersionDuLogo('fedcba9876543210');

  override parametrage(): Promise<Parametrage> {
    if (this.lectureFailure !== undefined) return Promise.reject(this.lectureFailure);
    return Promise.resolve(new Parametrage(this.duree, this.logo?.version));
  }

  override async fixerDureeMaxDActivite(duree: DureeMaxDActivite): Promise<void> {
    this.durees.push(duree);
    if (this.ecritureFailure !== undefined) return Promise.reject(this.ecritureFailure);
    if (this.ecritureDifferee !== undefined) await this.ecritureDifferee;
    this.duree = duree;
  }

  override imageDuLogo(version: VersionDuLogo): Promise<ImageDuLogo> {
    if (this.imageFailure !== undefined) return Promise.reject(this.imageFailure);
    if (this.logo?.version.value !== version.value) return Promise.reject(new Error(`Logo introuvable : ${version.value}`));
    return Promise.resolve(this.logo.image);
  }

  override async deposerLogo(fichier: FichierDeLogo): Promise<Result<VersionDuLogo, LogoRefuse>> {
    this.depots.push(fichier);
    if (this.depotFailure !== undefined) return Promise.reject(this.depotFailure);
    if (this.refusDuServeur !== undefined) return err(new LogoRefuse(this.refusDuServeur));
    let binaire = '';
    for (const octet of fichier.octets) binaire += String.fromCodePoint(octet);
    this.logo = { version: this.versionDeposee, image: new ImageDuLogo(`data:image/png;base64,${btoa(binaire)}`) };
    return ok(this.versionDeposee);
  }
}
