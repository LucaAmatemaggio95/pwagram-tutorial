var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

var videoPlayer = document.querySelector('#player');
var canvas = document.querySelector('#canvas');
var captureButton = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var picture = null;

var locationButton = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');
var fetchedLocation = null;

// GEOLOCATION
locationButton.addEventListener('click', event => {

  if (!('geolocation' in navigator)) {
    return;
  }

  locationButton.style.display = 'none';
  locationLoader.style.display = 'block';

  navigator.geolocation.getCurrentPosition(
  (position) => {
    locationButton.style.display = 'inline';
    locationLoader.style.display = 'none';
    console.log(position);

    fetchedLocation = {lat: position.coords.latitude, lon: position.coords.longitude};

    // get the location name from google location APIs

    locationInput.value = 'In Italy';
    document.querySelector('#manual-location').classList.add('is-focused');

  },
  (err) => {
    console.log(err);
    locationButton.style.display = 'inline';
    locationLoader.style.display = 'none';
    alert('Couldn\'t get location');
    fetchedLocation = {lat: 0, lon: 0};
  },
  {
    timeout: 7000// wait for 7 seconds to find the position
  });

});

function initializeLocation() {

  if (!('geolocation' in navigator)) {
    locationButton.style.display = 'none';
  }

}

function initializeMedia () {

  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }

  // Polyfill for older browser
  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia failed'));
      }

      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      })

    }
  }

  // get access to video and audio
  navigator.mediaDevices.getUserMedia({video: true, audio: true})
  .then(stream => {
    videoPlayer.srcObject = stream;
    videoPlayer.style.display = 'block';
  })
  .catch(err => {
    imagePickerArea.style.display = 'block';
  });

}

captureButton.addEventListener('click', event => {

  canvas.style.display = 'block';
  videoPlayer.style.display = 'none';
  captureButton.style.display = 'none';

  var context = canvas.getContext('2d');// canvas context for 2d image
  // element, top-left-corner, width
  context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
  // get all the active tracks and stop them one by one
  videoPlayer.srcObject.getVideoTracks().forEach(track => {
    track.stop();
  });

  picture = dataURItoBlob(canvas.toDataURL());

});

imagePicker.addEventListener('change', event => {

  picture = event.target.files[0];

});

function openCreatePostModal() {

  createPostArea.style.display = 'block';

  initializeMedia();
  initializeLocation();
  
  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function(choiceResult) {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to home screen');
      }
    });

    deferredPrompt = null;
  }

  /*
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
    .then(registrations => {
      // loop all the registrations and then registration.unregister()
    })
  }
  */

}

function closeCreatePostModal() {
  createPostArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  imagePickerArea.style.display = 'none';
  canvas.style.display = 'none';
  locationButton.style.display = 'inline';
  locationLoader.style.display = 'none';

  if (videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach(track => {
      track.stop();
    });
  }

}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

// cache assets on demand
function onSaveButttonClicked() {
  console.log('clicked');

  if ('caches' in window) {

    caches.open('user-requested')
    .then((cache) => {
      cache.add('https://httpbin.org/get');
      cache.add('/src/images/sf-boat.jpg');
    });

  }

}

function clearCard () {
  while(sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(data) {


  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = `url(${data.image})`;
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  // var button = document.createElement('button');
  // button.textContent = 'Save';
  // button.addEventListener('click', onSaveButttonClicked);
  // cardSupportingText.appendChild(button);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);


}

function updateUI(data) {

  clearCard();

  data.forEach(item => {

    createCard(item);

  });

}

var networkDataReceived = false;

fetch('https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/posts.json')
  .then(function(res) {
    return res.json();
  })
  .then(function(data) {
    console.log('From web', data);
    networkDataReceived = true;
    
    var keyData = [];
    for (var key in data) {
      keyData.push(data[key]);
    }

    updateUI(keyData);
  });

  if ('indexedDB' in window) {

    readAllData('posts')
      .then(data => {// array of all the values
        if (!networkDataReceived) {
          console.log('From cache IDB', data);
          updateUI(data);
        }
      })
  
  }

  function sendData () {

    var id = new Date().toISOString();

    var postData = new FormData();
    postData.append('id', id);
    postData.append('title', titleInput.value)
    postData.append('location', locationInput.value);
    postData.append('file', picture, id + '.png');
    postData.append('rawLocationLat', fetchedLocation.lat);
    postData.append('rawLocationLon', fetchedLocation.lon);

    fetch('https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/posts.json', {
      method: 'POST',
      body: postData
    })
    .then((res) => {
      console.log('Send data', res);
      updateUI();
    })
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
      return;
    }

    closeCreatePostModal();

    if ('serviceWorker' in navigator && 'SyncManager' in window) {

      navigator.serviceWorker.ready// when the serviceworker is ready
      .then((sw) => {

        var post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value,
          picture: picture,
          rawLocation: fetchedLocation
        };

        // write the data inside the indexedDB
        writeData('sync-posts', post)
          .then(() => {
            return sw.sync.register('sync-new-posts');// register a sync tag -> return a promise so as soon as I register the sync task I can show the snackbar
          })
          .then(() => {
            var snackbar = document.querySelector('#confirmation-toast');
            var data = {message: 'Post saved for syncing'};
            snackbar.MaterialSnackbar.showSnackbar(data);
          })
          .catch((err) => {
            console.log(err);
          })
        
      })

    } else {



    }

  });

// if ('caches' in window) {

//   caches.match('https://pwagram-9885e-default-rtdb.europe-west1.firebasedatabase.app/posts.json')// check if I have the response of this fetch inside the cache
//     .then((res) => {
//       if (res) {
//         return res.json();
//       }
//     })
//     .then(data => {
//       console.log('From cache', data);
//       if (!networkDataReceived) {
//         var keyData = [];
//         for (var key in data) {
//           keyData.push(data[key]);
//         }
//         updateUI(keyData);
//       }
//     })

// }
