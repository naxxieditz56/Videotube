// 1. Firebase Configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// --- ROUTING LOGIC ---
// Check if URL has ?v=ID. If yes, show Ad Flow. If no, show Admin Login.
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('v');

if (videoId) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('ad-flow-container').classList.remove('hidden');
} else {
    // Check if admin is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            showDashboard();
        } else {
            document.getElementById('login-container').classList.remove('hidden');
        }
    });
}

// --- ADMIN FUNCTIONS ---

function loginAdmin() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => showDashboard())
        .catch((error) => alert("Login Failed: " + error.message));
}

function logoutAdmin() {
    auth.signOut().then(() => {
        location.reload();
    });
}

function showDashboard() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');
    document.getElementById('admin-controls').style.display = "block";
    loadVideos();
}

function uploadVideo() {
    const file = document.getElementById('video-file').files[0];
    const title = document.getElementById('video-title').value;

    if (!file || !title) return alert("Please select a file and enter a title.");

    const storageRef = storage.ref('videos/' + Date.now() + '_' + file.name);
    const task = storageRef.put(file);

    document.getElementById('uploader').style.display = "block";

    task.on('state_changed', 
        function progress(snapshot) {
            let percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            document.getElementById('uploader').value = percentage;
        },
        function error(err) {
            alert("Upload Error: " + err.message);
        },
        function complete() {
            task.snapshot.ref.getDownloadURL().then((url) => {
                saveVideoToDB(title, url);
            });
        }
    );
}

function saveVideoToDB(title, url) {
    const newVidRef = db.ref('videos').push();
    newVidRef.set({
        title: title,
        url: url,
        timestamp: Date.now()
    }).then(() => {
        alert("Video Uploaded Successfully!");
        document.getElementById('video-title').value = "";
        document.getElementById('uploader').style.display = "none";
        loadVideos();
    });
}

function loadVideos() {
    const list = document.getElementById('video-list');
    list.innerHTML = ""; // Clear list

    db.ref('videos').on('value', (snapshot) => {
        list.innerHTML = ""; 
        snapshot.forEach((childSnapshot) => {
            const vid = childSnapshot.val();
            const key = childSnapshot.key;
            
            // Create sharable link (Current URL + ?v=KEY)
            const shareLink = window.location.origin + window.location.pathname + "?v=" + key;

            const div = document.createElement('div');
            div.className = "video-item";
            div.innerHTML = `
                <div><strong>${vid.title}</strong></div>
                <div>
                    <button class="btn-share" onclick="copyLink('${shareLink}')">Copy Link</button>
                    <button class="btn-delete" onclick="deleteVideo('${key}')">Delete</button>
                </div>
            `;
            list.appendChild(div);
        });
    });
}

function deleteVideo(key) {
    if(confirm("Are you sure you want to delete this video?")) {
        db.ref('videos/' + key).remove();
    }
}

function copyLink(link) {
    navigator.clipboard.writeText(link);
    alert("Link Copied to Clipboard! Share this link.");
}

// --- PLAYER & AD FLOW FUNCTIONS ---

function nextStep(stepNumber) {
    // Hide all steps
    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.add('hidden');

    // Show requested step
    document.getElementById('step-' + stepNumber).classList.remove('hidden');
}

function showPlayer() {
    // Fetch video details from DB using the ID in URL
    db.ref('videos/' + videoId).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const vidData = snapshot.val();
            
            document.getElementById('ad-flow-container').classList.add('hidden');
            document.getElementById('player-container').classList.remove('hidden');
            
            document.getElementById('player-title').innerText = vidData.title;
            const videoElement = document.getElementById('main-video');
            videoElement.src = vidData.url;
            videoElement.play();
        } else {
            alert("Video not found or deleted.");
            window.location.href = window.location.pathname; // Go home
        }
    });
              }
