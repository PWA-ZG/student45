import * as idbKeyval from "./idb-keyval.js";

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const messageSpan = document.getElementById('messageSpan');
    const imageGallery = document.getElementById('imageGallery');
  
    searchButton.addEventListener('click', function () {
      const searchTerm = searchInput.value;
      messageSpan.textContent = '';
      imageGallery.innerHTML = '';
  
      fetch('/searchUsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: searchTerm }),
      })
        .then(response => {
          if (!response.ok) {
            window.location.href="/404.html";
          }
          return response.json();
        })
        .then(async data => {
          if (data && data.length > 0) {
            const foundUsername = data[0].username;
  
            try {
                const response = await fetch(`/userImages?username=${foundUsername}`);
                if (!response.ok) {
                
                    if (response.status === 404) {
                        window.location.href="/404.html";
                    } else if (response.status === 500) {
                        window.location.href="/500.html";
                    } else {
                        window.location.href="/error.html";
                    }
                    }
                const images = await response.json();
  
                images.forEach(async image => {
                    try {
                        const imageUrl = image.bytes;
        
                        const imageContainer = document.createElement('div');
                        imageContainer.className = 'image-container';
                        imageContainer.id = image.id;
        
                        const imageElement = document.createElement('img');
                        imageElement.src = imageUrl;
        
                        const likeButton = document.createElement('button');
                        const likeIcon = document.createElement('img');
                        likeIcon.src = '/thumbs-up.png';
                        likeIcon.alt = 'Like';
                        likeIcon.id = 'like';
                        likeButton.appendChild(likeIcon);
                        likeButton.className = 'likeButton';
        
                        likeButton.addEventListener('click', async function () {
                            const imageId = image.id;
                            try {
                            const slikeZaLajkanje = await idbKeyval.get('slikeZaLajkanje') || [];
                            slikeZaLajkanje.push(imageId);
                            await idbKeyval.set('slikeZaLajkanje', slikeZaLajkanje);
                            console.log('Podaci su spremljeni u IndexedDB.');
                            } catch (error) {
                            console.error('Greška prilikom spremanja podataka u IndexedDB:', error);
                            }
                            navigator.serviceWorker.ready.then(async (registration) => {
                            await registration.sync.register('lajk-sync');
                            });
        
                        });
        
                        const likesCount = document.createElement('span');
                        likesCount.textContent = `Broj lajkova: ${image.likes || 0}`;
                        likesCount.id = 'likes_' + image.id;
        
                        imageContainer.appendChild(imageElement);
                        imageContainer.appendChild(likeButton);
                        imageContainer.appendChild(likesCount);
        
                        imageGallery.appendChild(imageContainer);
                    } catch (error) {
                        console.error('Error creating image URL:', error, image);
                    }
                });
            } catch (error) {
              messageSpan.textContent = 'Greška prilikom dohvaćanja fotografija.';
            }
  
          } else {
            messageSpan.textContent = 'Nema pronađenih korisnika.';
          }
        })
        .catch(error => {
          messageSpan.textContent = 'Došlo je do pogreške prilikom dohvaćanja korisnika. Upisali ste nepostojeće korisničko ime ili ste offline';
          return;
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const profileLink = document.getElementById('profileLink');

    profileLink.addEventListener('click', function (event) {
        event.preventDefault(); 
        const storedUsername = localStorage.getItem('username');

        if (storedUsername) {
            window.location.href = '/profile';
        } else {
            window.location.href = '/login';
        }
    });
});

navigator.serviceWorker.addEventListener('message', event => {
    const message = event.data;

    if (message.type === 'update') {
        const data = message.data;
        const imageId = data.imageId;
        
        if (data.action === 'likeImage') {
            const likes = data.likes; 
            const likesElement = document.getElementById('likes_'+ imageId);
            likesElement.textContent = `Broj lajkova: ${likes || 0}`;
        }
    }
});

window.addEventListener('beforeinstallprompt', (event) => {
    document.getElementById('installButton').style.display = 'inline';
    document.getElementById('downloadText').style.display = 'inline';
    document.getElementById('download').style.display = 'inline';
    event.preventDefault();
    window.deferredPrompt = event;
});
  
document.getElementById('installButton').addEventListener('click', () => {
    const deferredPrompt = window.deferredPrompt;

    if (deferredPrompt) {
        deferredPrompt.prompt();

        deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Korisnik je prihvatio instalaciju');
        } else {
            console.log('Korisnik je odbio instalaciju');
        }

            
        window.deferredPrompt = null;
    });
    }
});