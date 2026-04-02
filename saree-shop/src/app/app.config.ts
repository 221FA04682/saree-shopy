import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes, withHashLocation()),
  ],
};
