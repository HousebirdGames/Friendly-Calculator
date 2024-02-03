navigator.serviceWorker.register('/calculator/service-worker.js', { scope: '/calculator/' }).then(function (registration) {
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (registration.waiting) {
                    registration.waiting.postMessage({ action: 'skipWaiting' });
                }
                updateApp();
            }
        });
    });

    registration.update();

    console.log('ServiceWorker registration successful with scope: ', registration.scope);
}, function (err) {
    console.log('ServiceWorker registration failed: ', err);
});

function updateApp() {
    window.location.reload();
}