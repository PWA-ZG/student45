import * as idbKeyval from "./idb-keyval.js";

document.addEventListener('DOMContentLoaded', function () {
    const storedUsername = localStorage.getItem('username');
    console.log(storedUsername);
    if (!storedUsername || storedUsername === 'null') {

      window.location.href = '/login';
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const storedUsername = localStorage.getItem('username');
    const usernameElement = document.getElementById('username');

    if (storedUsername) {
        usernameElement.textContent = storedUsername;
    } else {
        usernameElement.textContent = 'Nepoznato korisničko ime';
    }

    document.getElementById("addImageButton").addEventListener("click", function () {
        createImageCaptureElements();
    });

});

let videoStream;

function createImageCaptureElements() {
    document.getElementById("addImageButton").disabled = true;

    const video = document.createElement("video");
    video.id = "video";
    document.getElementById("profileSection").appendChild(video);

    const div = document.createElement('div');
    div.id = 'imageCaptureButtons';

    const captureButton = document.createElement("button");
    captureButton.textContent = "Slikaj";
    captureButton.addEventListener("click", function () {
        takePicture();
    });
    captureButton.id = 'slikaj';
    div.appendChild(captureButton);

    const galleryButton = document.createElement("button");
    galleryButton.textContent = "Dodaj sliku iz galerije";
    galleryButton.addEventListener("click", function () {
        document.getElementById("fileInput").click();
    });
    galleryButton.id ='addFromGallery';
    div.appendChild(galleryButton);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Odustani";
    cancelButton.addEventListener("click", function () {
        cancelCapture();
    });
    cancelButton.id = 'cancel';
    div.appendChild(cancelButton);

    const repeatButton = document.createElement("button");
    repeatButton.textContent = "Ponovi";
    repeatButton.addEventListener("click", function () {
        repeatCapture();
    });
    repeatButton.id = 'ponovi';
    div.appendChild(repeatButton);

    const saveButton = document.createElement("button");
    saveButton.textContent = "Spremi";
    saveButton.addEventListener("click", function () {
        saveAndClear();
    });
    saveButton.id = 'spremi';
    div.appendChild(saveButton);

    document.getElementById("profileSection").appendChild(div);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.id = "fileInput";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", function () {
        handleFileUpload(this.files);
    });
    document.getElementById("profileSection").appendChild(fileInput);

    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const hasCamera = devices.some(device => device.kind === 'videoinput');
            if (hasCamera) {

                navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    .then((stream) => {
                        video.srcObject = stream;
                        video.play();
                        videoStream = stream;
                        repeatButton.disabled = false;
                    })
                    .catch((err) => {
                        console.log('Kamera blokirana');
                        video.remove();
                        captureButton.disabled = true;
                        repeatButton.disabled = true;
                    });
            } else {
                captureButton.disabled = true;
                repeatButton.disabled = true;
                video.remove();
                cancelButton.remove();
            }
        });
}

function handleFileUpload(files) {
    if (files.length > 0) {
        const file = files[0];

        let canvas = document.getElementById("canvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "selectedImage";
            document.getElementById("profileSection").appendChild(canvas);
        }

        const context = canvas.getContext("2d");
        const img = new Image();

        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };

        const blobUrl = URL.createObjectURL(file);
        img.src = blobUrl;
        console.log("File selected:", file);
        console.log("Canvas created and image drawn on it.");
    }
}

function clearCanvas() {
    const canvas = document.getElementById("canvas");
    if (canvas) {
        canvas.remove();
    }
}

function removeImageCaptureElements() {
    const profileSection = document.getElementById("profileSection");

    const existingVideo = document.getElementById("video");
    if (existingVideo) {
        existingVideo.remove();
        if (videoStream) {
            const tracks = videoStream.getTracks();
            tracks.forEach(track => track.stop());
        }
    }

    const existingCanvas = document.getElementById("canvas");
    if (existingCanvas) {
        existingCanvas.remove();
        canvasCreated = false;
    }
}

function takePicture() {
    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    document.getElementById("profileSection").appendChild(canvas);

    const context = canvas.getContext("2d");
    const video = document.getElementById("video");

    const scaleFactor = 0.5; 

    if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth * scaleFactor;
        canvas.height = video.videoHeight * scaleFactor;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
        clearCanvas();
    }
}


function imageToBase64(imageData) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
}

async function sendImageToServer(base64String) {
    const imageTitle = 'slika_' + new Date().toISOString().replace(/[-:.]/g, '_');
    const username = localStorage.getItem('username');
    const formDataToSave = {
        imageTitle, username, base64Image: base64String
    }

    try {
        const slikeZaSpremanje = await idbKeyval.get('slikeZaSpremanje') || [];
        slikeZaSpremanje.push(formDataToSave);
        await idbKeyval.set('slikeZaSpremanje', slikeZaSpremanje);

        console.log('Podaci su spremljeni u IndexedDB.');
    } catch (error) {
        console.error('Greška prilikom spremanja podataka u IndexedDB:', error);
    }

    navigator.serviceWorker.ready.then(async (registration) => {
        await registration.sync.register('spremanje-sync');
    });
}

function cancelCapture() {
    document.getElementById("addImageButton").disabled = false;
    removeImageCaptureElements();
    removeButtons();
    clearSelectedImage();
}

function repeatCapture() {
    clearCanvas();
}

function saveAndClear() {
    const canvas = document.getElementById("canvas") || document.getElementById("selectedImage");

    if (canvas) {
        const context = canvas.getContext("2d");
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const base64String = imageToBase64(imageData); 
        sendImageToServer(base64String)
        canvas.remove();

    } else {
        console.log("Nema odabrane slike ili snimljene fotografije za slanje.");
    }
}

function removeButtons() {
    const profileSection = document.getElementById("profileSection");
    const buttons = profileSection.querySelectorAll("button");

    buttons.forEach(button => {
        if (button.id !== "addImageButton") {
            button.remove();
        }
    });
}

function clearSelectedImage() {
    const selectedImage = document.getElementById("selectedImage");
    if (selectedImage) {
        selectedImage.remove();
    }

    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.value = null;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const logoutLink = document.getElementById('logoutLink');

    logoutLink.addEventListener('click', function () {
        localStorage.setItem('username', null);
        window.location.href = '/';
    });
});

if ("Notification" in window && "serviceWorker" in navigator) {
    document.addEventListener('DOMContentLoaded', function () {
        const notificationButton = document.getElementById('notificationButton');
    
        notificationButton.addEventListener('click', async function () {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Korisnik je odobrio primanje push notifikacija.');
                    await setup();
                } else if (permission === 'denied') {
                    console.log('Korisnik je odbio primanje push notifikacija.');
                } else if (permission === 'default') {
                    console.log('Korisnik još nije donio odluku o push notifikacijama.');
                }
            } catch (error) {
                console.error('Greška pri traženju dozvole za push notifikacije:', error);
            }
        });
    });
} else {
    const notificationButton = document.getElementById('notificationButton');
    notificationButton.setAttribute("disabled", "");
}

async function setup() {
    const username = localStorage.getItem('username');
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
  
      if (existingSubscription) {
        alert('Već ste pretplaćeni');
      } else {
        const publicKey = "BMgWpMeZNkYyD71ojqSQBY9NWK4DAyqc-WXHIN8a9ZpQ9mR9bDRT64oWcardxo_K9QsGBzBvdd4WMh7oOk3Qj1M";
        
        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        console.log(newSubscription);
  
        const response = await fetch('/dodajPretplatu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ subscription: newSubscription, username: username }),
        });
  
        if (response.ok) {
            alert('Uspješno ste pretplaćeni');
        } else {
            alert('Pogreška prilikom spremanja pretplate na server.');
        }
      }
    } catch (error) {
      console.error('Greška prilikom postavljanja push pretplate:', error);
    }
}

function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}


