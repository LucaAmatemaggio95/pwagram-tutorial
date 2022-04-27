# Progressive Web Apps - Complete Guide
This source code is part of Maximilian Schwarzmüller's "Progressive Web Apps - Complete Guide" course on udemy.com.

# How to Use
You need [Node.js](https://nodejs.org) installed on your machine. Simply download the installer from [nodejs.org](https://nodejs.org) and go through the installation steps.

Once Node.js is installed, open your command prompt or terminal and **navigate into this project folder**. There, run `npm install` to install all required dependencies.

Finally, run `npm start` to start the development server and visit [localhost:8080](http://localhost:8080) to see the running application.

## Web App Manifest
- Makes our app installable
- Directly launch Web App

We can add multiple properties:
 - name
 - shortname
 - start_url
 - scope -> define the relevant pages (default "." -> all pages)
 - display -> show app as native app or browser (default is "standalone")
 - background_color
 - theme_color -> control the color of the toolbar
 - description -> description name to save as favorite in browser
 - dir -> direction read (default ltr)
 - lang
 - orientation
 - icons -> configure set of icons to be used for the screen size -> array of object containing same icon with multiple sizes
 - related_applications -> related native app es. play store -> array of object
 - and so on...

 per fare in modo che l'app sia installabile serve:
  - short_name
  - name
  - 144x144
  - start_url
  - service worker
  - HTTPS

  per Apple e Windows devo aggiungere dei meta tag in index.html

## Service Worker
run on separate single thread, run in background, lives even after the browser is closed -> background process
listen to specific events:
 - fetch: http request (only js fetch, no axios)
 - push notification
 - notification interaction
 - background sync
 - service worker lifecycle

**Service worker lifecycle**
app.js -> register sw.js -> install event -> activation (as soon as it can be activated - no old sw instance running)
once the sw is activated can control all pages of Scope
once actived enter Idle mode -> terminate (sleep) until an event occurres

must be created inside the root folder

posso creare più service workers -> lo scope più specifico sovrascrive la sua parte di scope generale

**!! you need to close all the tabs in use by the old service worker in order to update and activate it !!**
questo perchè il nuovo serviceworker potrebbe portare cambiamenti che rompono l'app
quando  chiudo le tab e le riapro il serviceworker viene ricontrollato e attivato

## Promise & Fetch API

Promise -> resolve a value or reject the call
promise.then() => use the value of the resolve
promise.catch() => use the value of the reject

promise.then() can be chained

**fetch**
send http request -> alternative to ajax
by default GET

for POST requests I need to set additional params
mode: 'cors' is set by default

## Caching with service workers
Separate caache storage different from the browser cache
key:value pairs -> request:response
**Store only assets**

## IndexedDB
dynamic caching -> always happens when files and resources are passed through fetch calls
caching dynamic contents -> NO CACHE API -> use IndexedDB -> store JSON structure from backend
**Store only data**

Transactional key:value database -> use transaction by default
Can also be used to store files or BLOB data
**can be accessed aync**
all the transactions are Promises

## Background sync
The browser stores the sync task with all the data inside the indexed db
as soon as there is internet connection -> the fecth call is sent

SyncManager -> sync event inside the service worker

**Periodic sync**
getting data periodically from the server -> the user does not have to wait to fetch the data
register a periodic sync task with a schedule -> sync data with cloud functions
npm install firebase-tools -> firebase init
cd functions -> npm install firebase-admin cors

in functions/index.js I can write my endpoint API

firebase deploy -> I get the web url for the api -> I can replace it everywhere inside the app
**! only with billing address!**

to initialize the app -> I need to generate a new SDK Admin Key -> put it inside /functions and get the credentials

finally firebase deploy

## Web Push Notifications
Show up even if App / Browser is closed

the app check for existing push subscription -> 1 subscription = browser device combination

Browser vendor push server -> fetch API endpoint for the subscription

store subscription on server side -> the server side then will send push messages

the backend send the the push notificatio to the vendor server -> then the vendor sends the push notification to our device -> 'push event' on the serviceworker

Notification API -> it is possible to create notification directly from JS

if I confirm for notification permission I also confirm automatically the push permission

**put core content into title and body of the notification**

when using notificationclose event we can log why the user did not want to interact with the application

to secure the push notification subscription in order to not allow other people to trigger and span notification we use **VAPID**

- 2 keys -> public and private

cd functions
npm install --save web-push

edit package.json -> add new script -> "web-push":"web-push"
npm run web-push generate-vapid-keys

to send push messages with auth I need to create the publick vapid key and pass it to the push manager subscription as a Uint8Array

the subscription key is store inside the DB as a JSON Web Token
**Important**
when unregistering a service worker keep in mind to clear also all the subs saved on the DB
every time the site data is cleared along with the SW the APP does not have a current sub activated so it will always create a new one

## Sending push notifications -> directly from Firebase Functions

when i post data to firebase I fetch all the subscriptions
for each subscriptions saved inside the DB I create a webpush sendNotification event by passing the JWT extracted from the DB

then -> firebase deploy

## Native Device Features - Camera & Geolocation
mediaDevices API
we ask to grant access to video and / or audio
to post data to the DB we have to change the body of fetch to new FormData object
cd functions
npm install --save formidable @google-cloud/storage

in order to have the online image bucket we have to assign a unique ID to the images
cd functions
npm install --save uuid-v4

firebase always generate this URL to store metadata inside the image buckets
'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid

firebase deploy

**important**
formidable replaced with busboy because of breaking changes inside firebase cloud functions code

## Workbox - automatic service worker management

npm install --save-dev workbox-cli -> check the version number if commands don't work -> !workbox v6 is completely different!

inside the package.json I create a custom script -> generate-sw and create-sw

create a base sw file -> I can inject the automatic SW inside the base sw by using swSrc: filepath inside the SW-config

to precache icons and fonts I can create a registerRoute with a regular expression inside the base sw

staleWhileRevalidate -> cache then network strategy set up dynamically

cacheExpiration -> set up the expiration date for cache refresh and max number of items

to cache the indexDB I can just create a custom handler inside the base-sw

## Enhancing build workflow

npm install --save-dev uglify-js

add new script inside packge.json

"minify": "uglifyjs public/src/js/app.js -o public/src/js/app.min.js --compress --mangle"

"build": "npm run minify && npm run create-sw"

then I need to use the min version inside index.html

## Deploy to the web

firebase deploy -> from the public folder

## PWA in React

npx create-react-app my-app

registerServiceWorker.js is already created but we cannot see the code -> automatically generate service-worker.js
! npm run eject ! -> one way command
npm run build already crate and precache the files with the automatic service-worker

If I want to write my own SW I can do it by just creating the file as a normal Vanilla JS project
Also accessing camera, indexedDB and so on is exactly the same as Vanilla JS
!!NEED TO CHECK HOW TO INTEGRATE WORKBOX WITHOUT RUNNING EJECT!!

## PWA in Angular

create new angular project with angular@cli

inside angular-cli.json -> add new key "serviceWorker": true

npm install --save @angular/service-worker

when we build the app then the serviceWorker is applied automatically
to precache external url -> create new file ngsw-manifest.json
external key -> urls -> array of objects containing all the urls to precache
same with static.ignore -> map all the items I don't want to precache
every setting related to routing and dynamic cache needs to be manually written inside the json


Important: If you DON'T want to replace sw-precache with Workbox but still want to add your own Service Worker logic, you have to use the importScripts[]  option on the sw-precache config to import your own Service Worker file into the generated one. This allows you to add your own logic.