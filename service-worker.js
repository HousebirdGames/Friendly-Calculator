var CACHE_VERSION = 'v=1.7.8';

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(function (cache) {
            cache.addAll([
                '/calculator/manifest.json?v=1.7.8',
                '/calculator/index.html?v=1.7.8',
                '/calculator/js/script.js?v=1.7.8',
                '/calculator/fonts/Oxygen/Oxygen-Regular.ttf',
                '/calculator/fonts/Oxygen/Oxygen-Bold.ttf',
                '/calculator/fonts/Oxygen/Oxygen-Light.ttf',
                '/calculator/fonts/Quicksand/quicksand-v30-latin-ext_latin-regular.ttf',
                '/calculator/fonts/Quicksand/quicksand-v30-latin-ext_latin-700.ttf',
                '/calculator/fonts/ShareTechMono/ShareTechMono-Regular.ttf',
                '/calculator/fonts/MaterialIcons-Regular.ttf',
                '/calculator/fonts/PoiretOne/PoiretOne-Regular.ttf',
                '/calculator/fonts/VT323/VT323-Regular.ttf',
                '/calculator/fonts/Staatliches/Staatliches-Regular.ttf',
                '/calculator/img/CalculatorLogo.png',
                '/calculator/img/CalculatorLogo192.png',
                '/calculator/style.css?v=1.7.8',
                '/calculator/friendship-style.css?v=1.7.8',
                '/calculator/minimalistic-style.css?v=1.7.8',
                '/calculator/housebird-style.css?v=1.7.8',
                '/calculator/chillout-style.css?v=1.7.8',
                '/calculator/retro-style.css?v=1.7.8',
                '/calculator/void-style.css?v=1.7.8',
                '/calculator/nothing-style.css?v=1.7.8',
                '/calculator/offline.html?v=1.7.8',
            ]);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (CACHE_VERSION !== cacheName) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', function (event) {
    var request = event.request;
    var urlWithoutQuery = request.url; //.split('?')[0];

    if (urlWithoutQuery.endsWith('/')) {
        urlWithoutQuery += 'index.html';
    }

    var updatedRequest = new Request(urlWithoutQuery, {
        method: request.method,
        headers: request.headers,
        mode: 'cors',
        credentials: request.credentials,
        redirect: request.redirect,
        referrer: request.referrer,
        integrity: request.integrity
    });

    event.respondWith(
        caches.match(updatedRequest, { ignoreSearch: true })
            .then(function (response) {
                if (response) {
                    return response;
                }

                if (request.url.includes('manifest.json')) {
                    return fetch(request)
                        .then(response => {
                            if (!response || response.status !== 200) {
                                console.error('Failed to fetch manifest.json');
                                throw new Error('Failed to fetch manifest.json');
                            }
                            return response;
                        })
                        .catch(error => {
                            console.error('Fetch failed for manifest.json', error);
                            throw error;
                        });
                }

                var fetchRequest = request.clone();

                return fetch(fetchRequest).then(
                    function (response) {
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        var responseToCache = response.clone();

                        caches.open(CACHE_VERSION)
                            .then(function (cache) {
                                cache.put(updatedRequest, responseToCache);
                            });

                        return response;
                    }
                ).catch(function () {
                    return caches.match('/calculator/offline.html?v=1.7.8')
                        .catch(() => new Response('Offline and the offline page is not available'));
                });
            })
    );
});