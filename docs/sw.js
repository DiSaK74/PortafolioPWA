importScripts('sw-db.js');

console.log('Service Worker registrado correctamente');

const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const INMUTABLE_CACHE = 'inmutable-v1';


const APP_SHELL = [
    '/',
    'index.html',
    'styles.css',
    'favicon.ico',
    'sw-db.js'
];

const APP_SHELL_INMUTABLE = [
    'assets/css/aurora-pack.min.css',
    'assets/css/aurora-theme-base.min.css',
    'assets/css/urku.css',
    'assets/js/svg4everybody.min.js',
    'https://cdn.jsdelivr.net/npm/pouchdb@7.0.0/dist/pouchdb.min.js'
];


self.addEventListener('install', event => {
    // Almacenamos el shell estatico en cache
    const cacheStatic = caches.open(STATIC_CACHE).then(cache =>
        cache.addAll(APP_SHELL));
    // Almacenamos el shell inmutable en cache
    const cacheInmutable = caches.open(INMUTABLE_CACHE).then(cache =>
        cache.addAll(APP_SHELL_INMUTABLE));
    //No continua el siguiente ciclo de vida hasta no finalizar el almacenamiento
    event.waitUntil(Promise.all([cacheStatic, cacheInmutable]));

});


self.addEventListener('activate', event => {
    //Aqui miraremos si existen nuevas versiones de cache para eliminarlas
    const respuesta = caches.keys().then(keys => {
        // Recorremos todas las caches almacenadas
        keys.forEach(key => {
            // Si es una nueva version del cache estatico Ej static-v2 eliminamos la instalada anteriormente
            if (key !== STATIC_CACHE && key.includes('static')) {
                return caches.delete(key);
            }
            // Si es una nueva version del cache dinamico Ej dynamic-v2 eliminamos la instalada anteriormente
            if (key !== DYNAMIC_CACHE && key.includes('dynamic')) {
                return caches.delete(key);
            }
        });
    });
    event.waitUntil(respuesta);
});


self.addEventListener('fetch', event => {
    let respuesta;
    // Si la peticion va hacia nuestro backend y es un endpoint nuestro
    if (event.request.url.includes('/api')) {
        // Almacenamos en cache dinamico
        respuesta = manejoApiMensajes(DYNAMIC_CACHE, event.request);
    } else {
        // Si es una peticio hacia otra url que no contenga /api
        respuesta = caches.match(event.request).then(res => {
            if (res) {
                // console.log('DMB existe en cache', event.request.url);
                // Esta peticion esta almacenada en cache y la actualizamos
                actualizaCacheStatico(STATIC_CACHE, event.request, APP_SHELL_INMUTABLE);
                return res;
            } else {
                // console.log('DMB no existe en cache', event.request.url);
                // Sino la tenemos en cache la guardamos en nuestro cache dinamico
                return fetch(event.request).then(newRes => {
                    return actualizaCacheDinamico(DYNAMIC_CACHE, event.request, newRes);
                });
            }
        });
    }
    // Respondemos con alguna de las opciones anteriores
    event.respondWith(respuesta);
});

// Guardar  en el cache dinamico
function actualizaCacheDinamico(dynamicCache, req, res) {
    // Analizamos la respuesta del fetch
    if (res.ok) {
        // console.log('DMB dinamico si', null);
        // Si la respuesta es satisfactoria, abrimos y almacenamos en cache dinamico
        return caches.open(dynamicCache).then(cache => {
            cache.put(req, res.clone());
            return res.clone();
        });
    } else {
        // console.log('DMB dinamico error', );
        // Si la respuesta no es satisfactoria, la devolvemos tal cual
        return res;
    }
}

// Metodo: Cache with network update
function actualizaCacheStatico(staticCache, req, APP_SHELL_INMUTABLE) {
    // Al guardar chace estatico diferenciamos si es inmutable o no
    if (APP_SHELL_INMUTABLE.includes(req.url)) {
        // No hace falta actualizar el inmutable
        console.log('existe en inmutable', req.url);
    } else {
        return fetch(req)
            .then(res => {
                return actualizaCacheDinamico(staticCache, req, res);
            });
    }
}

// Metodo: Network with cache fallback / update
function manejoApiMensajes(cacheName, req) {
    // Si se trata de una peticion de token o subscripcion de notificaciones
    if ((req.url.indexOf('/api/key') >= 0) || req.url.indexOf('/api/subscribe') >= 0) {
        // No la almacenamos en cache y la devolvemos tal cual.
        return fetch(req);
    } else if (req.clone().method === 'POST') { // POSTEO de un nuevo mensaje
        // Si disponemos de deteccion de conexion a internet
        if (self.registration.sync) {
            return req.clone().text().then(body => {
                // Guardamos el mensaje en nuestra base de datos local del dispositivo PouchDB
                const bodyObj = JSON.parse(body);
                return guardarMensaje(bodyObj);
            });
        } else {
            // Si no tenemos posibilidad de guardar el mensaje y enviarlo luego lo devolvemos tal cual
            return fetch(req);
        }
    } else {
        // Al no ser un metodo POST gestionamos el metodo GET
        return fetch(req).then(res => {
            // Si la respuesta de la peticion es satisfactoria
            if (res.ok) {
                // La almacenamos en cache dinamico y la devolvemos
                actualizaCacheDinamico(cacheName, req, res.clone());
                return res.clone();
            } else {
                // Si la respuesta es erronea devolvemos la peticion desde el cache si es que la tenemos
                return caches.match(req);
            }
        }).catch(err => {
            // Si falla la peticion devolvemos la almacenada en cache, si es que existe
            return caches.match(req);
        });
    }
}

// tareas asíncronas cuando recuperamos internet
self.addEventListener('sync', e => {
    // Si tenemos pendiente tareas con el tag 'nuevo-post'
    if ( e.tag === 'nuevo-post' ) {
        // postear a BD cuando hay conexión
        const respuesta = postearMensajes();
        e.waitUntil( respuesta );
    }
});

// Escuchar Notificaciones PUSH
self.addEventListener('push', e => {
    console.log('Notificacion push interceptada, event:', e);
    
    // Parseamos la entrada a texto para ser tratado luego como un objeto
    const data = JSON.parse( e.data.text() );
    const title = data.titulo;

    const options = {
        body: data.cuerpo,
        // icon: 'img/icons/icon-72x72.png',
        icon: `img/avatars/${ data.usuario }.jpg`,
        badge: 'img/favicon.ico',
        image: 'https://vignette.wikia.nocookie.net/marvelcinematicuniverse/images/5/5b/Torre_de_los_Avengers.png/revision/latest?cb=20150626220613&path-prefix=es',
        vibrate: [125,75,125,275,200,275,125,75,125,275,200,600,200,600],
        openUrl: '/',
        data: {
            // url: 'https://google.com',
            url: '/',
            id: data.usuario
        },
        actions: [
            {
                action: 'thor-action',
                title: 'Thor',
                icon: 'img/avatar/thor.jpg'
            },
            {
                action: 'ironman-action',
                title: 'Ironman',
                icon: 'img/avatar/ironman.jpg'
            }
        ]
    };
    e.waitUntil( self.registration.showNotification( title, options) );
});

// Cierra la notificacion
self.addEventListener('notificationclose', e => {
    console.log('Notificación cerrada', e);
});

// Click en una notificacion
self.addEventListener('notificationclick', e => {
    const notificacion = e.notification;
    // Analizamos las ventanas de nuestro navegador
    const respuesta = clients.matchAll()
    .then( clientes => {
        // Buscamos si existe alguna ventan activa y visible por el usuario
        let cliente = clientes.find( c => {
            return c.visibilityState === 'visible';
        });
        // Si tenemos una ventana abierta y activa navegamos hasta la url que nos interese
        if ( cliente !== undefined ) {
            cliente.navigate( notificacion.data.url );
            cliente.focus();
        } else {
            // Si no existe ninguna ventana abierta se la abrimos con nuestra aplicacion
            clients.openWindow( notificacion.data.url );
        }
        return notificacion.close();
    });
    e.waitUntil( respuesta );
});