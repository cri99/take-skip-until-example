import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { merge, Observable, OperatorFunction, Subject } from 'rxjs';
import { delay, map, share, skipUntil, takeUntil, tap } from 'rxjs/operators';

/**
 * Tutte le pietanze possibili
 */
export type DishTypeOptions = '๐' | '๐' | '๐' | '๐ณ' | '๐ญ' | '๐' | '๐ฃ' | '๐ฅ' | '๐' | '๐ฎ';

/**
 * Insieme contenente tutti i tipi di cibo possibili
 */
export const DISH_TYPES: DishTypeOptions[] = ['๐', '๐', '๐', '๐ณ', '๐ญ', '๐', '๐ฃ', '๐ฅ', '๐', '๐ฎ'];

export class Dish {

  /**
   * Emoji della pietanza
   */
  dishType: DishTypeOptions;
  
  /**
   * Distanza percentuale dal punto estremo sinistro del piatto rispetto al quale 
   * verrร  posizionata la pietanza
   */
  distanceFromLeft: number;
  
  /**
   * Distanza percentuale dal punto estremo superiore del piatto rispetto al quale 
   * verrร  posizionata la pietanza
   */
  distanceFromTop: number;

  constructor(dishType: DishTypeOptions) {
    this.dishType = dishType;

    // La pietanza viene posizionata casualmente all'interno dell'area del cerchio piรน interno del piatto
    const randomAngle = Math.random() * Math.PI * 2;
    const randomRadius =  Math.random() * 40;
    this.distanceFromLeft = Math.cos(randomAngle) * randomRadius;
    this.distanceFromTop = Math.sin(randomAngle) * randomRadius;
  }
}



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  
  /**
   *  Evento emesso quando l'utente non vuole che vengano emesse piรน pietanze.
   * 
   *  Questo Subject si completa immediatamente dopo aver emesso un valore.
   */
  private readonly stopFoodDispencerEvent$ = new Subject<void>();

  /**
   *  Evento emesso quando l'utente vuole cambiare piatto di assegnazione delle pietanze
   * 
   *  Questo Subject si completa immediatamente dopo aver emesso un valore.
   */
  private readonly switchPlateEvent$ = new Subject<void>();

  /**
   *  Un Subject che emetterร  un valore quando il componente sta per essere distrutto.
   * 
   *  Questo Subject si completa immediatamente dopo aver emesso un valore.
   */
  private readonly onDestroyEvent$ = new Subject<void>(); 
  
  /*
    Curiositร : 
      Hai notato che il valore emesso dai Subject precedenti รจ di tipo "void"?  

      Per il funzionamento dell'applicativo in questi casi non รจ importante il valore emesso dai precedenti observable, perchรฉ essi fungono 
      solo da "Notifier". Detto in altre parole, il loro compito รจ solo quello di avvertire quando succede qualcosa.  
  */



  /**
   *  Il tipo di pietanza che sta per arrivare ai piatti
   */
  public currentDishType!: DishTypeOptions; 

  /**
   *  Tutte le pietanze che si trovano dentro il piatto sinistro
   */
  public leftPlateDishes: Dish [] = [];

  /**
   *  Tutte le pietanze che si trovano dentro il piatto destro
   */
  public rightPlateDishes: Dish [] = [];

  /**
   * Observable sorgente che genera ed emette le pietanze alle sue subscriptions  
   */
  private foodDispencer$!: Observable<DishTypeOptions>;

  /**
   * Observable che rimane in ascolto di eventuali pietanze in arrivo sul piatto sinitro
   */
  private leftPlateListener$!: Observable<Dish>;

  /**
   * Observable che rimane in ascolto di eventuali pietanze in arrivo sul piatto destro
   */
  private rightPlateListener$!: Observable<Dish>; 

  /**
   * Indica se l'observable che riceve le pietanze in arrivo sul piatto sinistro รจ in stato "completato"
   */
  public isLeftPlateListenerCompleted = false;
  
  
  /**
   * Indica se l'observable che riceve le pietanze in arrivo sul piatto destro sta ignorando le pietanze 
   * in arrivo (sia per l skipUntil, che per il relativo l'observable in stato "completato")
   */
  public isRightPlateIgnoringDishes = true;
  
  /**
   * Indica se l'observable relativo al distributore di cibo รจ in stato "completato" e quindi ha smesso di emettere valori
   */
  public isFoodDispencerStopped = false;


  ngOnInit(): void {
    
    this.foodDispencer$ = this.initializeFoodDispencer$();
    this.leftPlateListener$ = this.initializeLeftPlate$();
    this.rightPlateListener$ = this.initializeRightPlate$();

    this.initializeSubscriptions();
  }

  /**
   * Metodo in cui vengono attivate tutte le subscriptions
   */
  private initializeSubscriptions() {
    this.foodDispencer$.subscribe({
      complete: () => { this.isFoodDispencerStopped = true; }
    });

    this.leftPlateListener$.subscribe({
      complete: () => { this.isLeftPlateListenerCompleted = true; }
    });

    this.rightPlateListener$.subscribe({
      complete: () => { this.isRightPlateIgnoringDishes = true; }
    });


    /* In questo caso non c'รจ bisogno di gestire l'unsubscription in alcun modo perchรฉ sappiamo che switchPlateEvent$ รจ un evento 
       che emette un solo valore e poi si completa immediatamente. Questo concetto vale anche per tutte le chiamate di HttpClient ;-) 
       
       ...Sรฌ, in questo caso particolare si sarebbe potuto cambiare il valore di "isRightPlateIgnoringDishes" direttamente nel metodo "switchPlate()".  */
      this.switchPlateEvent$.subscribe(() => {
        this.isRightPlateIgnoringDishes = false;
      });
  }

  /**
   * Inizializza observable che emetterร  la stessa pietanza a tutte le sue subscriptions ogni tot millisecondi
   * @param emissionDelay millisecondi da aspettare prima dell'invio di una nuova pietanza
   * @returns 
   */
  private initializeFoodDispencer$(emissionDelay: number = 800): Observable<DishTypeOptions> {
    // Si crea un observable che emette valori ogni tot millisecondi, di default 800
    return interval(emissionDelay).pipe(
      // interval emette valori numerici progressivi, ma a noi non ci interessano, abbiamo fame e vogliamo 
      // trasformare i valori con delle pietanze casuali
      map(this.getRandomDishType),
      // A questo punto abbiamo un tipo di pietanza, il valore appena creato finisce in currentDishType per poterla rappresentare nell'animazione
      tap((dishType: DishTypeOptions) => this.currentDishType = dishType),
      // Il delay sottostante รจ necessario per dare il tempo all'animazione della pietanza di raggiungere i piatti
      delay(emissionDelay),
      // L'operatore "share" รจ necessario per rendere questo observable multicast, ovvero per assicurarsi che ogni nuova subscription condivida la stessa sorgente dati.
      // In parole povere, non vogliamo creare un distributore di cibo per ogni piatto... Vogliamo un unico distributore di cibo a prescindere dal numero di piatti!
      // Se non ti รจ chiaro il concetto non ti preoccupare, non รจ banale e merita un esempio a sรฉ per essere compreso a fondo (continua a seguirmi per rimanere aggiornato...),
      // per il momento abbi fiducia e concentrati sul focus dell'esercizio ๐
      share(),
      // Se viene emesso un valore dall'observable stopFoodDispencerEvent$ oppure viene distrutto il componente, l'observable entra in stato "completato" e smette di emettere valori
      this.takeUntilAny(this.stopFoodDispencerEvent$, this.onDestroyEvent$)
    );
  }

  /**
   * Restituisce un observable che emette le pietanze in arrivo sul piatto sinistro
   * @returns 
   */
  private initializeLeftPlate$(): Observable<Dish> {
    return this.foodDispencer$.pipe(
      // Viene creata una pietanza effettiva (Dish) a partire dal tipo emesso dal distributore (DishTypeOptions)
      this.createDishFromDishType(),
      // Le pietanze create vengono aggiunte all'insieme di pietanze presenti nel piatto sinistro, cosรฌ che l'utente le possa vedere nel piatto
      tap((newDish: Dish) => this.leftPlateDishes.push(newDish)),
      // Se viene emesso un valore dall'observable switchPlateEvent$ oppure viene distrutto il componente, l'observable entra in stato "completato" e smette di emettere valori
      this.takeUntilAny(this.switchPlateEvent$, this.onDestroyEvent$)
    );
  }

   /**
   * Restituisce un observable che emette le pietanze in arrivo sul piatto destro
   * @returns 
   */
  private initializeRightPlate$(): Observable<Dish> {
    return this.foodDispencer$.pipe(
      // Con l'operatore skipUntil si scarta tutti i valori emessi dall'observable sorgente foodDispencer$ finchรจ non viene emesso un valore dall'observable switchPlateEvent$
      skipUntil(this.switchPlateEvent$),
      
      // Una volta superato il blocco iniziale dello skipUntil, le pietanze sono pronte per essere posizionate nel piatto ed 
      // il comportamento รจ analogo all'observable relativo al piatto sinistro 
      this.createDishFromDishType(), 
      tap((newDish: Dish) => this.rightPlateDishes.push(newDish)),
      // Se viene distrutto il componente, l'observable entra in stato "completato" e smette di emettere valori
      takeUntil(this.onDestroyEvent$)
    );
  }

  /**
   * Operatore custom che dato un tipo di pietanza (DishTypeOptions) restituisce una pietanza effettiva 
   * con anche le sue coordinate generate casualmente
   * @returns una nuova pietanza effettiva (Dish)
   */
  private createDishFromDishType() {
    return (sourceObservable: Observable<DishTypeOptions>) => {
      return sourceObservable.pipe(
        map((dishType: DishTypeOptions) => new Dish(dishType))
      );
    }
  }

  /**
   * Operatore custom che funziona esattamente come l'operatore "takeUntil", con l'unica differenza che รจ possibile
   * specificare piรน di un notifier su cui rimanere in ascolto per generare il completamento dell'observable sorgente
   * @param notifiers$ 
   * @returns 
   */
  private takeUntilAny(...notifiers$: Observable<any>[]): OperatorFunction<any, any> {
    return (sourceObservable: Observable<any>) => {
      return sourceObservable.pipe(
        takeUntil( merge(...notifiers$) )
      )
    }
  }

  /**
   * Metodo chiamato quando l'utente desidera cambiare piatto di destinazione
   */
  public switchPlate(): void {
    this.switchPlateEvent$.next();
    this.switchPlateEvent$.complete();
  }

  /**
   * Metodo chiamato quando l'utente desidera fermare il distributore di cibo
   */
  public stopFoodDispencer(): void {
    this.stopFoodDispencerEvent$.next();
    this.stopFoodDispencerEvent$.complete();
  }


  ngOnDestroy() {
    this.onDestroyEvent$.next();
    this.onDestroyEvent$.complete();
  }


  /**
   * Restituisce un tipo di pietanza scelto casualmente dall'insieme contenente tutti i tipi di alimenti
   * @returns 
   */
  private getRandomDishType(): DishTypeOptions {
    return DISH_TYPES[Math.floor( Math.random() * DISH_TYPES.length) ];
  }
}
