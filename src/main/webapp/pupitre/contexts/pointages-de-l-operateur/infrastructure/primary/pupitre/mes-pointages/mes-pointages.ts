import { Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { DemandeDePointages } from '../../../../domain/DemandeDePointages';
import { JourDePointages } from '../../../../domain/JourDePointages';
import { OperateurId } from '../../../../domain/OperateurId';
import { PointagesDeLOperateurPort } from '../../../../domain/PointagesDeLOperateurPort';
import { JourCalendaire } from '../../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../../domain/semaine/SemaineISO';
import { LIBELLES_MES_POINTAGES } from '../LibellesMesPointages';

const deuxChiffres = (valeur: number): string => String(valeur).padStart(2, '0');

const jourLocal = (instant: Date): JourCalendaire =>
  new JourCalendaire(`${String(instant.getFullYear())}-${deuxChiffres(instant.getMonth() + 1)}-${deuxChiffres(instant.getDate())}`);

@Component({
  selector: 'glm-mes-pointages',
  host: { 'data-selector': 'mes-pointages', class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './mes-pointages.html',
  styleUrl: './mes-pointages.css',
})
export class MesPointages {
  readonly operateur = input.required<string>();
  readonly retourRequested = output();
  private readonly port = inject(PointagesDeLOperateurPort);
  protected readonly aujourdhui = jourLocal(new Date());
  private readonly semaine = SemaineISO.contenant(this.aujourdhui);
  private readonly demande = computed(() => new DemandeDePointages(new OperateurId(this.operateur()), this.semaine));
  protected readonly pointages = resource({ params: this.demande, loader: ({ params }) => this.port.semaine(params) });
  private readonly jourChoisi = signal<JourCalendaire | undefined>(undefined);
  protected readonly jourAffiche = computed<JourDePointages | undefined>(() => {
    if (!this.pointages.hasValue()) return undefined;
    const choisi = this.jourChoisi();
    const semaine = this.pointages.value();
    return choisi === undefined ? semaine.jourParDefaut(this.aujourdhui) : semaine.jourDu(choisi);
  });
  protected readonly labels = LIBELLES_MES_POINTAGES;

  protected choisir(jour: JourDePointages): void {
    this.jourChoisi.set(jour.jour);
  }

  protected estAffiche(jour: JourDePointages): boolean {
    return this.jourAffiche()?.jour.estLeMeme(jour.jour) === true;
  }
}
