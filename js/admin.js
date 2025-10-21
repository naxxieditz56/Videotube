// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4nik_P57h9Ks8ryj0pG2xYNX-ePXKXtY",
  authDomain: "shoes-shopping-app-6a1d3.firebaseapp.com",
  databaseURL: "https://shoes-shopping-app-6a1d3-default-rtdb.firebaseio.com",
  projectId: "shoes-shopping-app-6a1d3",
  storageBucket: "shoes-shopping-app-6a1d3.appspot.com",
  messagingSenderId: "816065792865",
  appId: "1:816065792865:web:b1d58fab547f98e4961320",
  measurementId: "G-7BVQVYSMDF"
};

// Admin password (in a real application, this should be stored securely)
const ADMIN_PASSWORD = "admin123";

// DOM elements
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminPasswordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const uploadForm = document.getElementById('upload-form');
const adminVideosContainer = document.getElementById('admin-videos-container');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    }
});

// Login functionality
loginBtn.addEventListener('click', () => {
    const password = adminPasswordInput.value;
    
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        loginError.textContent = 'Invalid password';
    }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    hideAdminPanel();
});

// Show admin panel
function showAdminPanel() {
    loginContainer.style.display = 'none';
    adminPanel.style.display = 'block';
    loadAdminVideos();
}

// Hide admin panel
function hideAdminPanel() {
    loginContainer.style.display = 'flex';
    adminPanel.style.display = 'none';
    adminPasswordInput.value = '';
    loginError.textContent = '';
}

// Upload video functionality
uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('video-title').value;
    const videoFile = document.getElementById('video-file').files[0];
    const thumbnailFile = document.getElementById('thumbnail-file').files[0];
    const uploadBtn = document.getElementById('upload-btn');
    const uploadStatus = document.getElementById('upload-status');
    
    if (!title || !videoFile || !thumbnailFile) {
        uploadStatus.textContent = 'Please fill all fields';
        uploadStatus.className = 'status-message error';
        return;
    }
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    uploadStatus.textContent = '';
    
    // Upload files to Firebase Storage
    const storage = firebase.storage();
    const videoRef = storage.ref().child(`videos/${Date.now()}_${videoFile.name}`);
    const thumbnailRef = storage.ref().child(`thumbnails/${Date.now()}_${thumbnailFile.name}`);
    
    Promise.all([
        videoRef.put(videoFile),
        thumbnailRef.put(thumbnailFile)
    ]).then((snapshots) => {
        // Get download URLs
        return Promise.all([
            snapshots[0].ref.getDownloadURL(),
            snapshots[1].ref.getDownloadURL()
        ]);
    }).then((urls) => {
        const [videoUrl, thumbnailUrl] = urls;
        
        // Save video data to Firebase Database
        const videoData = {
            title: title,
            videoUrl: videoUrl,
            thumbnail: thumbnailUrl,
            views: 0,
            likes: 0,
            uploadDate: new Date().toISOString()
        };
        
        return database.ref('videos').push(videoData);
    }).then(() => {
        uploadStatus.textContent = 'Video uploaded successfully!';
        uploadStatus.className = 'status-message success';
        uploadForm.reset();
        loadAdminVideos();
    }).catch((error) => {
        console.error('Upload error:', error);
        uploadStatus.textContent = 'Error uploading video. Please try again.';
        uploadStatus.className = 'status-message error';
    }).finally(() => {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Video';
    });
});

// Load videos for admin panel
function loadAdminVideos() {
    const videosRef = database.ref('videos');
    videosRef.on('value', (snapshot) => {
        const videos = snapshot.val();
        adminVideosContainer.innerHTML = '';
        
        if (videos) {
            Object.keys(videos).forEach(key => {
                const video = videos[key];
                const videoCard = document.createElement('div');
                videoCard.className = 'admin-video-card';
                
                videoCard.innerHTML = `
                    <img src="${video.thumbnail}" alt="${video.title}" class="admin-video-thumbnail">
                    <div class="admin-video-info">
                        <h3 class="admin-video-title">${video.title}</h3>
                        <div class="admin-video-stats">
                            <span>${video.views || 0} views</span> • 
                            <span>${video.likes || 0} likes</span> • 
                            <span>${new Date(video.uploadDate).toLocaleDateString()}</span>
                        </div>
                        <div class="admin-video-actions">
                            <button class="edit-btn" data-video-id="${key}">Edit</button>
                            <button class="delete-btn" data-video-id="${key}">Delete</button>
                        </div>
                    </div>
                `;
                
                adminVideosContainer.appendChild(videoCard);
            });
            
            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const videoId = e.target.getAttribute('data-video-id');
                    openEditModal(videoId);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const videoId = e.target.getAttribute('data-video-id');
                    deleteVideo(videoId);
                });
            });
        } else {
            adminVideosContainer.innerHTML = '<p>No videos uploaded yet.</p>';
        }
    });
}

// Open edit modal
function openEditModal(videoId) {
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.once('value').then((snapshot) => {
        const video = snapshot.val();
        document.getElementById('edit-title').value = video.title;
        document.getElementById('edit-video-id').value = videoId;
        editModal.style.display = 'block';
    });
}

// Close edit modal
document.querySelector('#edit-modal .close').addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Edit video functionality
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const videoId = document.getElementById('edit-video-id').value;
    const newTitle = document.getElementById('edit-title').value;
    const newThumbnailFile = document.getElementById('edit-thumbnail').files[0];
    
    if (!newTitle) {
        alert('Please enter a title');
        return;
    }
    
    if (newThumbnailFile) {
        // Upload new thumbnail
        const storage = firebase.storage();
        const thumbnailRef = storage.ref().child(`thumbnails/${Date.now()}_${newThumbnailFile.name}`);
        
        thumbnailRef.put(newThumbnailFile).then((snapshot) => {
            return snapshot.ref.getDownloadURL();
        }).then((thumbnailUrl) => {
            // Update video with new thumbnail
            return database.ref(`videos/${videoId}`).update({
                title: newTitle,
                thumbnail: thumbnailUrl
            });
        }).then(() => {
            editModal.style.display = 'none';
            loadAdminVideos();
        }).catch((error) => {
            console.error('Error updating video:', error);
            alert('Error updating video. Please try again.');
        });
    } else {
        // Update only title
        database.ref(`videos/${videoId}`).update({
            title: newTitle
        }).then(() => {
            editModal.style.display = 'none';
            loadAdminVideos();
        }).catch((error) => {
            console.error('Error updating video:', error);
            alert('Error updating video. Please try again.');
        });
    }
});

// Delete video functionality
function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        database.ref(`videos/${videoId}`).remove()
            .then(() => {
                loadAdminVideos();
            })
            .catch((error) => {
                console.error('Error deleting video:', error);
                alert('Error deleting video. Please try again.');
            });
    }
  }
