import * as idbKeyval from "./idb-keyval.js";

const CACHE_NAME = 'cache-v1';
const urlsToCache = [
    '/',
    '/login',
    '/profile',
    '/home.js',  
    '/profil.js',
    '/login.js',
    '/gallery.js',
    '/home.css',
    '/login.css',
    '/profil.css',
    '/flickr.png',
    '/gallery.png',
    '/instagram.png',
    '/people.png',
    '/recycle-bin.png',
    '/thumbs-up.png',
    '/vsco.png',
    '/download.png',
    '/favicon.ico',
    '/404.html',
    '/500.html',
    '/manifest.json',
    '/alarm.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener("activate", (event) => {
    console.log("Aktiviranje novog swa");
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


self.addEventListener('fetch', async event => {
  const requestURL = new URL(event.request.url);

  if (requestURL.pathname === '/userImages') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);

          if (!response || response.status !== 200 || response.type !== 'basic') {
            return new Response('Not Found', { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'text/plain' } });
          }

          return response;
        } catch (error) {
            return new Response('Not Found', { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
  } else {
    event.respondWith(
      (async () => {
        try {
          const response = await caches.match(event.request);

          if (response) {
            return response;
          }

          const networkResponse = await fetch(event.request);

          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            let errorResponse;
        
            if (networkResponse && networkResponse.status === 404) {
                errorResponse = await caches.match('/404.html');
            } else if (networkResponse && networkResponse.status === 500) {
                errorResponse = await caches.match('/500.html');
            } else {
                errorResponse = await caches.match('/error.html');
            }
        
            return errorResponse || new Response('Not Found', { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'text/plain' } });
        }

          return networkResponse;
        } catch (error) {
          return caches.match('/error.html');
        }
      })()
    );
  }
});




self.addEventListener('sync', function(event) {
    if (event.tag === 'lajk-sync') {
      event.waitUntil(lajkSlike());
    }
});
  
async function lajkSlike() {
    console.log('Pozvan je sync event za lajkanje slika.');
    const slikeZaLajkanje = await idbKeyval.get('slikeZaLajkanje') || [];

    if (slikeZaLajkanje.length > 0) {
        for (const imageId of slikeZaLajkanje) {
            try {
                const response = await fetch('/like-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imageId }),
                });

                const data = await response.json();

                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'update', data: { action: 'likeImage', imageId, likes: data.likes || 0 } });
                    });
                });

                const index = slikeZaLajkanje.indexOf(imageId);
                if (index !== -1) {
                    slikeZaLajkanje.splice(index, 1);
                    await idbKeyval.set('slikeZaLajkanje', slikeZaLajkanje);
                }

            } catch (error) {
                console.error('Greška prilikom lajkanja slike:', error);
                const pendingLajk = await idbKeyval.get('pendingLajk') || [];
                pendingLajk.push(imageId);
                await idbKeyval.set('pendingLajk', pendingLajk);
            }

        }
    }
}

self.addEventListener('sync', function(event) {
    if (event.tag === 'brisanje-sync') {
        event.waitUntil(brisanjeSlike());
    }
});

async function brisanjeSlike() {
    console.log('Pozvan je sync event za brisanje slika.');
    const slikeZaBrisanje = await idbKeyval.get('slikeZaBrisanje');

    if (slikeZaBrisanje && slikeZaBrisanje.length > 0) {
        for (const imageId of slikeZaBrisanje) {
            try {
                const response = await fetch('/delete-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imageId }),
                });

                const data = await response.json();

                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                            client.postMessage({ type: 'update', data: { action: 'deleteImage', imageId: imageId} });
                    });
                });

                const index = slikeZaBrisanje.indexOf(imageId);
                if (index !== -1) {
                    slikeZaBrisanje.splice(index, 1);
                    await idbKeyval.set('slikeZaBrisanje', slikeZaBrisanje);
                }
            } catch (error) {
                console.error('Greška prilikom brisanja slike:', error);
                const pendingDelete = await idbKeyval.get('pendingDelete') || [];
                pendingDelete.push(imageId);
                await idbKeyval.set('pendingDelete', pendingDelete);
            }
        }
    }
}

self.addEventListener('sync', function(event) {
    if (event.tag === 'spremanje-sync') {
        event.waitUntil(spremanjeSlike());
    }
});

async function spremanjeSlike() {
    console.log('Pozvan je sync event za spremanje slika.');
    const slikeZaSpremanje = await idbKeyval.get('slikeZaSpremanje') || [];

    if (slikeZaSpremanje && slikeZaSpremanje.length > 0) {
        for (const formData of slikeZaSpremanje) {
            try {
                const imageTitle = formData.imageTitle;
                const username = formData.username;
                const base64Image = formData.base64Image;

                const formDataToUpload = new FormData();
                formDataToUpload.append('imageTitle', imageTitle);
                formDataToUpload.append('username', username);
                formDataToUpload.append('base64Image', base64Image);

                const response = await fetch('/upload-image', {
                    method: 'POST',
                    body: formDataToUpload,
                });

                const data = await response.json();

                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'update', data: 'ok' });
                    });
                });

                const index = slikeZaSpremanje.findIndex(item => {
                    return (
                      item.imageTitle === formData.imageTitle &&
                      item.username === formData.username &&
                      item.base64Image === formData.base64Image
                    );
                });

                if (index !== -1) {
                    slikeZaSpremanje.splice(index, 1);
                    await idbKeyval.set('slikeZaSpremanje', slikeZaSpremanje);
                }
            } catch (error) {
                console.error('Greška prilikom spremanja slike:', error);
                const pendingSave = await idbKeyval.get('pendingSave') || [];
                pendingSave.push(formData);
                await idbKeyval.set('pendingSave', pendingSave);
            }
        }
    }
}

self.addEventListener("notificationclick", (event) => {
    let notification = event.notification;
    notification.close();
    console.log("notificationclick", notification);
    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clis) {
                if (clis && clis.length > 0) {
                    clis.forEach(async (client) => {
                        await client.navigate(notification.data.redirectUrl);
                    });
                } else if (clients.openWindow) {
                    return clients.openWindow(notification.data.redirectUrl);
                }
            })
    );
});

self.addEventListener("notificationclose", function (event) {
    console.log("notificationclose", event);
});

self.addEventListener("push", function (event) {
    console.log("push event", event);

    var data = { title: "title", body: "body", redirectUrl: "/" };

    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.body,
        icon: "/alarm.png",
        badge: "/alarm.png",
        data: {
            redirectUrl: "/profile",
        },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});
