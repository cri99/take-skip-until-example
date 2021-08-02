import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { merge, Observable, OperatorFunction, Subject } from 'rxjs';
import { delay, map, share, skipUntil, takeUntil, tap } from 'rxjs/operators';

 
export type DishTypeOptions = '🍔' | '🍜' | '🍟' | '🍳' | '🍭' | '🍋' | '🍣' | '🥟' | '🍝' | '🍮';
export const DISH_TYPES: DishTypeOptions[] = ['🍔', '🍜', '🍟', '🍳', '🍭', '🍋', '🍣', '🥟', '🍝', '🍮'];

export class Dish {
  value: DishTypeOptions;
  distanceFromLeft: number;
  distanceFromTop: number;

  constructor(dishType: DishTypeOptions) {
    this.value = dishType;

    const randomAngle = Math.random() * Math.PI * 2;
    const randomValForRadius =  Math.random() * 40;
    this.distanceFromLeft = Math.cos(randomAngle) * randomValForRadius;
    this.distanceFromTop = Math.sin(randomAngle) * randomValForRadius;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  
  /**
   * Evento emesso quando l'utente non vuole che venga.....
   */
  private readonly stopFoodDispencerEvent$ = new Subject<void>();

  private readonly switchPlateEvent$ = new Subject<void>();

  /**
   * Un Subject che emetterà un valore e si completerà solamente quando 
   * il componente sta per essere distrutto.
   */
  private readonly onDestroyEvent$ = new Subject<void>();
  

  public currentDishType!: DishTypeOptions; 
  public leftPlateDishes: Dish [] = [];
  public rightPlateDishes: Dish [] = [];

  private foodDispencer$!: Observable<DishTypeOptions>;
  private leftPlateListener$!: Observable<Dish>;
  private rightPlateListener$!: Observable<Dish>; 

  public isLeftPlateListenerCompleted = false;
  public isRightPlateIgnoringDishes = true;
  public isFoodDispencerStopped = false;

  ngOnInit() {
 
    this.foodDispencer$ = this.initializeFoodDispencer$();
    this.leftPlateListener$ = this.initializeLeftPlate$();
    this.rightPlateListener$ = this.initializeRightPlate$();


    /* In questo caso non c'è bisogno di gestire l'unsubscription perché sappiamo che switchPantryEvent$ è un evento 
       che emette un solo valore e poi si completa immediatamente. Questo concetto vale anche per tutte le chiamate di HttpClient ;-) */
    this.switchPlateEvent$.subscribe(() => {
      this.isRightPlateIgnoringDishes = false;
    });


    this.initializeSubscriptions();
  }

  private initializeSubscriptions() {
    this.foodDispencer$.subscribe(
      () => {},
      () => {},
      () => { this.isFoodDispencerStopped = true; }
    );
    
    this.leftPlateListener$.subscribe(
      () => {}, 
      () => {}, 
      () => { this.isLeftPlateListenerCompleted = true } // On Complete callback
    );

    this.rightPlateListener$.subscribe(
      () => {}, 
      () => {}, 
      () => { this.isRightPlateIgnoringDishes = true } // On Complete callback
    );
  }

  private initializeFoodDispencer$(): Observable<DishTypeOptions> {
    return interval(500).pipe(
      map(this.getRandomDishType),
      tap(productType => this.currentDishType = productType),
      delay(500),
      share(),
      this.takeUntilAnyEmits(this.stopFoodDispencerEvent$, this.onDestroyEvent$)
    );
  }

  private initializeLeftPlate$(): Observable<Dish> {
    return this.foodDispencer$.pipe(
      this.createProductFromProductType(),
      tap((newProduct: Dish) => this.leftPlateDishes.push(newProduct)),
      this.takeUntilAnyEmits(this.switchPlateEvent$, this.onDestroyEvent$)
    );
  }

  private initializeRightPlate$(): Observable<Dish> {
    return this.foodDispencer$.pipe(
      skipUntil(this.switchPlateEvent$),
      this.createProductFromProductType(),
      tap((newProduct: Dish) => this.rightPlateDishes.push(newProduct)),

      takeUntil(this.onDestroyEvent$)
    );
  }

  private createProductFromProductType() {
    return (sourceObservable: Observable<DishTypeOptions>) => {
      return sourceObservable.pipe(
        map((productType: DishTypeOptions) => new Dish(productType))
      );
    }
  }

  private takeUntilAnyEmits(...notifiers$: Observable<any>[]): OperatorFunction<any, any> {
    return (sourceObservable: Observable<any>) => {
      return sourceObservable.pipe(
        takeUntil( merge(...notifiers$) )
      )
    }
  }

  public switchPlate(): void {
    this.switchPlateEvent$.next();
    this.switchPlateEvent$.complete();
  }

  public stopFoodDispencer(): void {
    this.stopFoodDispencerEvent$.next();
    this.stopFoodDispencerEvent$.complete();
  }

  ngOnDestroy() {
    this.onDestroyEvent$.next();
    this.onDestroyEvent$.complete();
  }


  private getRandomDishType(): DishTypeOptions {
    return DISH_TYPES[Math.floor( Math.random() * DISH_TYPES.length) ];
  }
}
