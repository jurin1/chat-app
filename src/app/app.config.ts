import {
  ApplicationConfig,
  importProvidersFrom,
  PLATFORM_ID,
  Inject,
  NgZone,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import { provideAuth, getAuth, Auth } from '@angular/fire/auth';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { Injector } from '@angular/core';
import { ɵAngularFireSchedulers, ɵAppCheckInstances } from '@angular/fire';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    { provide: FIREBASE_OPTIONS, useValue: environment.firebase },
    {
      provide: AngularFireAuth,
      useFactory: (
        auth: Auth,
        platformId: string,
        zone: NgZone,
        injector: Injector
      ) => {
        const schedulers = new ɵAngularFireSchedulers(zone);
        return new AngularFireAuth(
          environment.firebase,
          null,
          platformId,
          zone,
          schedulers,
          null,
          null,
          null,
          null,
          null,
          null,
          new ɵAppCheckInstances()
        );
      },
      deps: [Auth, PLATFORM_ID, NgZone, Injector],
    },
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      RouterModule.forRoot(routes)
    ),
  ],
};
