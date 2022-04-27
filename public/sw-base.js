importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

importScripts('workbox-543be79b.js');

const workboxSW = new self.WorkboxSW();

// staleWhileRevalidate -> load from cache, then update load from web

workboxSW.router
    .registerRoute(/.*(?:goolgeapis|gstatic)|.com.*$/, workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'google-fonts',
        cacheExpiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 30
        }
    }));// register all the url routes that contains googleapis or gstatic

workboxSW.router
    .registerRoute('https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css', workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'material-css'
    }));

workboxSW.router
    .registerRoute(/.*(?:firebasestorage\.goolgeapis)|.com.*$/, workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'post-images'
    }));

workboxSW.router
    .registerRoute('https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/posts.json', function(args) {
        return fetch(args.event.request)// intercept every fetch request
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
    });

workboxSW.router
    .registerRoute(
    function (routeData) {
        return (routeData.event.request.headers.get('accept').includes('text/html'))// check if the incoming request have html accept header
    }, 
    function(args) {
        return caches.match(args.event.request)// cycle throug the caches to see is there is a match with the current fetch event
        .then((response) => {// if there is no match return null, otherwise return the response
            if (response) {
                return response;
            } else {
                return fetch(args.event.request)
                    .then((res) => {// when the fetch is done
                        return caches.open('dynamic')// open / create cache
                            .then((cache) => {// when cache is opened / created
                                cache.put(args.event.request.url, res.clone())// manually insert the key:value pair -> create a clone for the response because the original object get consumed
                                return res;// return the response
                            })
                    })
                    .catch((err) => {// if page is not working -> return the fallback page
                        return caches.match('/offline.html')
                            .then((res) => {
                                return res;
                            })
                    });
            }
        })
    });

workboxSW.precache([]);

// Background sync
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