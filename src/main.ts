import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

if (navigator.serviceWorker) {
  const url = window.location.href;
  let swLocation = '/PortafolioPWA/portafolio/sw.js';

  if (url.includes('localhost')) {
    swLocation = '/sw.js';
  }
  navigator.serviceWorker.register(swLocation);
}
