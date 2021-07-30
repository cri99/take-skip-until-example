import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { interval } from 'rxjs';
import { merge, Observable, OperatorFunction, Subject } from 'rxjs';
import { delay, map, share, skipUntil, takeUntil, tap } from 'rxjs/operators';

export const PRODUCT_TYPES: ['🍪', '🍿', '🧁', '🥓', '🥞', '🍗'] = ['🍪' , '🍿' , '🧁', '🥓', '🥞', '🍗'];
 
export type ProductTypeOptions = '🍪' | '🍿' | '🧁' | '🥓' | '🥞' | '🍗';

export class Product {
  value: ProductTypeOptions;
  distanceFromLeft: number;
  distanceFromTop: number;

  constructor(productType: ProductTypeOptions) {
    this.value = productType;
    this.distanceFromLeft = Math.random() * 100 ;
    this.distanceFromTop = Math.random() * 100;
 
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  
  /**
   * Evento emesso quando l'utente non vuole che vengano prodotti più biscotti
   */
  private readonly stopFoodFactoryEvent$ = new Subject<void>();

  private readonly switchPantryEvent$ = new Subject<void>();

  /**
   * Un Subject che emetterà un valore e si completerà solamente quando 
   * il componente sta per essere distrutto.
   */
  private readonly onDestroyEvent$ = new Subject<void>();
  

  public currentProductType!: ProductTypeOptions; 
  public leftPantryProducts: Product [] = [];
  public rightPantryProducts: Product [] = [];

  private foodFactory$!: Observable<ProductTypeOptions>;
  private leftPantryListener$!: Observable<Product>;
  private rightPantryListener$!: Observable<Product>; 

  public isLeftPantrySubCompleted = false;
  public isRightPantrySubListening = false;
  public isFoodFactoryStopped = false;

  ngOnInit() {
 
    this.foodFactory$ = this.initializeFoodFactory$();
    this.leftPantryListener$ = this.initializeLeftPantry$();
    this.rightPantryListener$ = this.initializeRightPantry$();


    /* In questo caso non c'è bisogno di gestire l'unsubscription perché sappiamo che switchPantryEvent$ è un evento 
       che emette un solo valore e poi si completa immediatamente. Questo concetto vale anche per tutte le chiamate di httpClient ;-) */
    this.switchPantryEvent$.subscribe(() => {
      this.isRightPantrySubListening = true;
    });


    this.foodFactory$.subscribe(
      () => {},
      () => {},
      () => { this.isFoodFactoryStopped = true; }
    );
    
    this.leftPantryListener$.subscribe(
      () => {}, 
      () => {}, 
      () => { this.isLeftPantrySubCompleted = true } // On Complete callback
    );

    this.rightPantryListener$.subscribe(
      () => {}, 
      () => {}, 
      () => { this.isRightPantrySubListening = false } // On Complete callback
    );
  }

  private initializeFoodFactory$(): Observable<ProductTypeOptions> {
    return interval(1000).pipe(
      map(this.getRandomProductType),
      tap(productType => this.currentProductType = productType),
      delay(1000),
      share(),
      this.takeUntilAnyEmits(this.stopFoodFactoryEvent$, this.onDestroyEvent$)
    );
  }

  private initializeLeftPantry$(): Observable<Product> {
    return this.foodFactory$.pipe(
      this.createProductFromProductType(),
      tap((newProduct: Product) => this.leftPantryProducts.push(newProduct)),
      this.takeUntilAnyEmits(this.switchPantryEvent$, this.onDestroyEvent$)
    );
  }

  private initializeRightPantry$(): Observable<Product> {
    return this.foodFactory$.pipe(
      skipUntil(this.switchPantryEvent$),
      this.createProductFromProductType(),
      tap((newProduct: Product) => this.rightPantryProducts.push(newProduct)),

      takeUntil(this.onDestroyEvent$)
    );
  }

  private createProductFromProductType() {
    return (sourceObservable: Observable<ProductTypeOptions>) => {
      return sourceObservable.pipe(
        map((productType: ProductTypeOptions) => new Product(productType))
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

  public switchPantry(): void {
    this.switchPantryEvent$.next();
    this.switchPantryEvent$.complete();
  }

  public stopFoodFactory(): void {
    this.stopFoodFactoryEvent$.next();
    this.stopFoodFactoryEvent$.complete();
  }

  ngOnDestroy() {
    this.onDestroyEvent$.next();
    this.onDestroyEvent$.complete();
  }


  private getRandomProductType(): ProductTypeOptions {
    return PRODUCT_TYPES[Math.floor( Math.random() * PRODUCT_TYPES.length) ];
  }
}
