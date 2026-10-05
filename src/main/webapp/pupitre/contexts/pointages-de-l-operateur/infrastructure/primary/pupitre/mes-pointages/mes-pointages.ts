import { localCalendarDay } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { Component, computed, inject, input, linkedSignal, output, resource, signal } from '@angular/core';
import { DemandeDePointages } from '../../../../domain/DemandeDePointages';
import { JourDePointages } from '../../../../domain/JourDePointages';
import { OperateurId } from '../../../../domain/OperateurId';
import { PeriodeConsultable } from '../../../../domain/PeriodeConsultable';
import { PointagesDeLaSemaine } from '../../../../domain/PointagesDeLaSemaine';
import { PointagesDeLOperateurPort } from '../../../../domain/PointagesDeLOperateurPort';
import { JourCalendaire } from '../../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../../domain/semaine/SemaineISO';
import { ChoixDeSemaine } from '../choix-de-semaine/choix-de-semaine';
import { LIBELLES_MES_POINTAGES } from '../LibellesMesPointages';

@Component({
  selector: 'glm-mes-pointages',
  host: { 'data-selector': 'mes-pointages', class: 'relative flex min-h-0 flex-1 flex-col' },
  templateUrl: './mes-pointages.html',
  styleUrl: './mes-pointages.css',
  imports: [ChoixDeSemaine, Icon],
})
export class MesPointages {
  readonly operateur = input.required<string>();
  readonly retourRequested = output();
  private readonly port = inject(PointagesDeLOperateurPort);
  protected readonly aujourdhui = new JourCalendaire(localCalendarDay(new Date()));
  protected readonly periode = new PeriodeConsultable(this.aujourdhui);
  protected readonly semaine = signal<SemaineISO>(this.periode.semaineCourante);
  protected readonly precedente = computed(() => this.periode.precedente(this.semaine()));
  protected readonly suivante = computed(() => this.periode.suivante(this.semaine()));
  protected readonly peutReculer = computed(() => !this.precedente().estLaMeme(this.semaine()));
  protected readonly peutAvancer = computed(() => !this.suivante().estLaMeme(this.semaine()));
  protected readonly periodeCourante = this.periode.semaineCourante;
  protected readonly estLaSemaineCourante = computed(() => this.semaine().estLaMeme(this.periode.semaineCourante));
  private readonly demande = computed(() => new DemandeDePointages(new OperateurId(this.operateur()), this.semaine()));
  protected readonly pointages = resource({ params: this.demande, loader: ({ params }) => this.port.semaine(params) });
  private readonly jourChoisi = linkedSignal<SemaineISO, JourCalendaire | undefined>({
    source: this.semaine,
    computation: () => undefined,
  });
  protected readonly labels = LIBELLES_MES_POINTAGES;

  protected readonly choixOuvert = signal(false);

  protected voir(semaine: SemaineISO): void {
    this.semaine.set(semaine);
  }

  protected ouvrirLeChoix(): void {
    this.choixOuvert.set(true);
  }

  protected fermerLeChoix(): void {
    this.choixOuvert.set(false);
  }

  protected voirLaSemaineChoisie(semaine: SemaineISO): void {
    this.voir(semaine);
    this.fermerLeChoix();
  }

  protected reessayer(): void {
    this.pointages.reload();
  }

  protected choisir(jour: JourDePointages): void {
    this.jourChoisi.set(jour.jour);
  }

  protected jourAfficheDans(semaine: PointagesDeLaSemaine): JourDePointages | undefined {
    const choisi = this.jourChoisi();
    return choisi === undefined ? semaine.jourParDefaut(this.aujourdhui) : semaine.jourDu(choisi);
  }

  protected estAffiche(jour: JourDePointages, semaine: PointagesDeLaSemaine): boolean {
    return this.jourAfficheDans(semaine)?.jour.estLeMeme(jour.jour) === true;
  }
}
