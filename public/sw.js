importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const CACHE_STATIC_NAME = 'static-v32';
const CACHE_DYNAMIC_NAME = 'dynamic-v1';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/idb.js',
    '/src/js/app.js',
    '/src/js/utility.js',
    '/src/js/feed.js',
    '/src/js/material.min.js',
    '/src/css/app.css',
    '/src/css/feed.css',
    '/src/images/main-image.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// function trimCache (cacheName, maxItems) {
//     caches.open(cacheName)
//     .then(cache => {
//         return cache.keys()
//         .then(keys => {
//             if (keys.lenght > maxItems) {
//                 cache.delete(keys[0])
//                 .then(trimCache(cacheName, maxItems))
//             }
//         })
//     })
// }

self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing service worker...', event);

    // install wait until event is done
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)// name of the cache
        .then((cache) => {
            console.log('[Service Worker] Precaching appshell');
            cache.addAll(STATIC_FILES);// we are caching url requests
        })
    );

});

self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating service worker...', event);
    event.waitUntil(
        caches.keys()
            .then((keyList) => {
                return Promise.all(keyList.map(key => {// array of Promises because all the caches operation are async -> wait for all the delete to finish, then return the new list
                    if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                        console.log('[Service Worker] Removing old cache', key);
                        return caches.delete(key);
                    }
                }))
            })
    )
    return self.clients.claim();
});

/*
// Strategy: Network first, then cache
// make the network request
self.addEventListener('fetch', function(event) {
    event.respondWith(
        fetch(event.request)
        .then((res) => {
            return caches.open(CACHE_DYNAMIC_NAME)// open / create cache
            .then((cache) => {// when cache is opened / created
                cache.put(event.request.url, res.clone())// manually insert the key:value pair -> create a clone for the response because the original object get consumed
                return res;// return the response
            })
        })
        .catch((err) => {// if network fails
            return caches.match(event.request)// cycle throug the caches to see is there is a match with the current fetch event
        })
    );
});
*/

// Strategy: Cache first, then Network
self.addEventListener('fetch', function(event) {

    var url = 'https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/posts';

    if (event.request.url.indexOf(url) > -1) {// chache first, then network only for specific url
        event.respondWith(
            fetch(event.request)// intercept every fetch request
            .then(res => {
                var clonedRes = res.clone();// clone the res

                clearAllData('posts')
                .then(() => {
                    return clonedRes.json()
                })
                .then(data => {
                    for (var key in data) {// foreach key in the key:value response
                        writeData('posts', data[key])
                    }
                });
                return res;
            })
        );
    } else if (STATIC_FILES.indexOf(event.request.url) > -1) {// only for static assets
        event.respondWith(
            caches.match(event.request)// load all from cache only
        );
    } else {// for all the others url dyn cache + network fallback
        event.respondWith(
            caches.match(event.request)// cycle throug the caches to see is there is a match with the current fetch event
            .then((response) => {// if there is no match return null, otherwise return the response
                if (response) {
                    return response;
                } else {
                    return fetch(event.request)
                        .then((res) => {// when the fetch is done
                            return caches.open(CACHE_DYNAMIC_NAME)// open / create cache
                                .then((cache) => {// when cache is opened / created
                                    cache.put(event.request.url, res.clone())// manually insert the key:value pair -> create a clone for the response because the original object get consumed
                                    return res;// return the response
                                })
                        })
                        .catch((err) => {// if page is not working -> return the fallback page
                            return caches.open(CACHE_STATIC_NAME)
                                .then((cache) => {
                                    if (event.request.headers.get('accept').includes('text/html')) {// if the fetch request is a html page
                                        return cache.match('/offline.html');
                                    }
                                })
                        });
                }
            })
        )
    }
    
});

self.addEventListener('sync', (event) => {

    console.log('[Service Worker] background syncing', event);

    if (event.tag === 'sync-new-posts') {// name of the register

        event.waitUntil(// wait until I retrieve the data from the sync-store
            readAllData('sync-posts')
            .then((data) => {

                data.forEach((post) => {// foreach posts that need to be synced
                    
                    var postData = new FormData();
                    postData.append('id', post.id);
                    postData.append('title', post.title)
                    postData.append('location', post.location);
                    postData.append('file', post.picture, post.id + '.png');
                    postData.append('rawLocationLat', post.rawLocation.lat);
                    postData.append('rawLocationLon', post.rawLocation.lon);

                    fetch('https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/posts.json', {
                    method: 'POST',
                    body: postData
                    })
                    .then((res) => {
                        console.log('Send data', res);
                        if (res.ok) {// if the request was ok
                            res.json()
                            .then(data => {
                                deleteItemFromata('sync-posts', data.id);// clear the sync indexedDB
                            })

                        }
                        
                    })
                    .catch((err) => {
                        console.log('Error sending data', err)
                    })

                })

            })

        );


    }

})

// WEB PUSH NOTIFICATION
self.addEventListener('notificationclick', event => {

    var notification = event.notification;
    var action = event.action;

    console.log(notification)

    if (action === 'confirm') {
        console.log('Confirmed');
        notification.close();
    } else {
        console.log(action);
        event.waitUntil(
            clients.matchAll()// find all the windows where our app is running
            .then(clis => {
                var client = clis.find(c => {// find if there is already a tab with our application open
                    return c.visibilityState === 'visible';
                })

                if (client !== undefined) {
                    client.navigate(notification.data.openUrl);// open that tab
                    client.focus();
                } else {
                    clients.openWindow(notification.data.openUrl);// open a new tab
                }
                notification.close();
            })
        );
        notification.close();
    }

});

// close notification -> swipe away or press 'x' button
self.addEventListener('notificationclose', event => {
    consol.log('Notification was closed', event);
});

// this listen to any push notification related to only this device, on this device browser, on a specific site from that browser
self.addEventListener('push', event => {
    console.log('Push notification received', event);

    var data = {title: 'New dummy', content: 'content dummy', openUrl: '/'};
    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.content,
        icon: '/src/images/icons/app-icon-96x96.png',
        badge: '/src/images/icons/app-icon-96x96.png',
        data: {
            url: data.openUrl
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});