const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
const webpush = require('webpush');
var formidable = require('formidable');
var fs = require('fs');
var UUID = require('uuid-v4');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

var serviceAccount = require("./pwagram-9885e-firebase-adminsdk-899bs-20dfc34b49.json");

var gc_config = {
    projectId: 'pwagram-9885e',
    keyFilename: 'pwagram-9885e-firebase-adminsdk-899bs-20dfc34b49.json'
};

var gcs = require('@google-cloud/storage') (gc_config)

admin.initializeApp({
    databaseURL: 'https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/',
    credential: admin.credential.cert(serviceAccount)
});

exports.storePostData = functions.https.onRequest((request, response) => {
  
    cors(request, response, () => {

        var uuid = UUID();// create a unique identifier for the file image
        var formData = new formidable.IncomingForm();

        formData.parse(request, function (err, fields, files) {
            fs.rename(files.file.path, '/tmp/' + files.file.name);// rename the image file incoming from the request data
            var bucket = gcs.bucket('pwagram-9885e.appspot.com');// bucket with my images on firestorage

            bucket.upload('/tmp/' + files.file.name, {
                uploadType: 'media',
                metadata: {
                    metadata: {
                        contentType: files.file.type,
                        firebaseStorageDownloadTokens: uuid
                    }
                }
            }, function (err, file) {
                if (!err) {// if there are no errors

                    // admin.database().ref('posts').push({
                    //     id: request.body.id,
                    //     title: request.body.title,
                    //     location: request.body.location,
                    //     image: request.body.image
                    // })
                    // fields is the object coming from formidable
                    admin.database().ref('posts').push({
                        id: fields.id,
                        title: fields.title,
                        location: fields.location,
                        rawLocation: {
                            lat: rawLocation.lat,
                            lon: rawLocation.lon
                        },
                        image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid
                    })
                    .then(() => {
            
                        // email, public, private
                        webpush.setVapidDetails('mailto:logh88@gmail.com','BOQRUWsZxL5GTkKWd9W_VJLSYihh1G-El6jyWEoYeg78jYS23USRiSrODV3PPfjiZSUJvsIo7Du86mum7JRpD30','xzDK5YLXKxF8pHckSV0-qxKEux14T32GxKz7qwQmyV8');
            
                        return amdin.database().ref('subscriptions').once('value');
            
                    })
                    .then(subscriptions => {
            
                        subscriptions.forEach(sub => {
                            var pushConfig = {
                                endpoint: sub.val().endpoint,
                                keys: {
                                    auth: sub.val().keys.auth,
                                    p256dh: sub.val().keys.p256dh
                                }
                            }
                            // config, payload
                            webpush.sendNotification(pushConfig, JSON.stringify({
                                title: 'New post',
                                content: 'New post added',
                                openUrl: '/help'
                            }))
                            .catch(err => console.log(err));
                        });
            
                        return response.status(201).json({message: 'Data stored', id: fields.id})
                    })
                    .catch(err => {
                        response.status(500).json({message: err})
                    })

                } else {

                }
            });

        });

        
    });

});
