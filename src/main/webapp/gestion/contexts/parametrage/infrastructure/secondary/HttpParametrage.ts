import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { inject, Injectable } from '@angular/core';
import { DureeMaxDActivite } from '../../domain/DureeMaxDActivite';
import { ImageDuLogo } from '../../domain/ImageDuLogo';
import { Parametrage } from '../../domain/Parametrage';
import { ParametragePort } from '../../domain/ParametragePort';
import { VersionDuLogo } from '../../domain/VersionDuLogo';

const EN_HEURES = /^PT(\d+)H$/;

const enLigne = async (image: Blob): Promise<ImageDuLogo> => {
  const octets = new Uint8Array(await image.arrayBuffer());
  let binaire = '';
  for (const octet of octets) {
    binaire += String.fromCodePoint(octet);
  }
  return new ImageDuLogo(`data:${image.type};base64,${btoa(binaire)}`);
};

const dureeLue = (iso: string): DureeMaxDActivite => {
  const heures = EN_HEURES.exec(iso);
  if (heures === null) {
    throw new Error(`Durée max d’activité illisible en heures entières : ${iso}`);
  }
  return new DureeMaxDActivite(Number(heures[1]));
};

@Injectable()
export class HttpParametrage extends ParametragePort {
  private readonly api = inject(ApiClient);
  private readonly errors = inject(ErrorHandlerPort);

  override async parametrage(): Promise<Parametrage> {
    try {
      const response = await this.api.read('/api/parametrage', {});
      return new Parametrage(
        dureeLue(response.dureeMaxDActivite),
        response.logo === undefined ? undefined : new VersionDuLogo(response.logo.version),
      );
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }

  override async fixerDureeMaxDActivite(duree: DureeMaxDActivite): Promise<void> {
    await this.api.update('/api/parametrage/duree-max-d-activite', { body: { dureeMaxDActivite: `PT${duree.heures}H` } });
  }

  override async imageDuLogo(version: VersionDuLogo): Promise<ImageDuLogo> {
    try {
      return await enLigne(await this.api.readImage('/api/parametrage/logo/{version}', { pathParams: { version: version.value } }));
    } catch (failure) {
      this.errors.handleError(failure);
      throw failure;
    }
  }
}
