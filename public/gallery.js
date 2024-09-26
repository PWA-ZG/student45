import * as idbKeyval from "./idb-keyval.js";

document.addEventListener('DOMContentLoaded', async function () {
    const imageGallery = document.getElementById('imageGallery');

    async function fetchUserImages(username) {
        try {
            const response = await fetch(`/userImages?username=${username}`);
            if (response.status === 404) window.location.href = '/login';
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

                    const likesCount = document.createElement('span');
                    likesCount.textContent = `Broj lajkova: ${image.likes || 0}`;
                    likesCount.className = 'likesCount';
                    likesCount.id = 'likes_' + image.id;

                    const deleteButton = document.createElement('button');
                    const deleteIcon = document.createElement('img');
                    deleteIcon.src = '/recycle-bin.png'; 
                    deleteIcon.alt = 'Delete';
                    deleteIcon.id = 'delete';
                    deleteButton.appendChild(deleteIcon);
                    deleteButton.className = 'deleteButton';
                    deleteButton.addEventListener('click', async function () {
                        const imageId = image.id;
                        try {
                            const slikeZaBrisanje = await idbKeyval.get('slikeZaBrisanje') || [];
                            slikeZaBrisanje.push(imageId);
                            await idbKeyval.set('slikeZaBrisanje', slikeZaBrisanje);
                            console.log('Podaci su spremljeni u IndexedDB.');
                        } catch (error) {
                            console.error('Greška prilikom spremanja podataka u IndexedDB:', error);
                        }
                        navigator.serviceWorker.ready.then(async (registration) => {
                            await registration.sync.register('brisanje-sync');
                        });
                        
                    });

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

                    imageContainer.appendChild(imageElement);
                    imageContainer.appendChild(deleteButton);
                    imageContainer.appendChild(likeButton);
                    imageContainer.appendChild(likesCount);
                    imageGallery.appendChild(imageContainer);
                } catch (error) {
                    console.error('Greška prilikom kreiranja elementa:', error);
                }
            });
        } catch (error) {
            console.error('Error fetching user images:', error);
        }
    }

    const storedUsername = localStorage.getItem('username');

    if (storedUsername) {
        fetchUserImages(storedUsername);
    } else {
        console.error('Korisničko ime nije pronađeno.');
    }
});

navigator.serviceWorker.addEventListener('message', event => {
    const message = event.data;

    if (message.type === 'update') {
        const data = message.data;
        const imageId = data.imageId;
        
        if (data.action === 'deleteImage') {
            const imageDivElement = document.getElementById(imageId);
            imageDivElement.remove();
        } else if (data.action === 'likeImage') {
            const likes = data.likes; 
            const likesElement = document.getElementById('likes_'+ imageId);
            likesElement.textContent = `Broj lajkova: ${likes || 0}`;
        }
    }
});
