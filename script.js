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

// --- ROUTING & AD INJECTION LOGIC ---
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('v');

if (videoId) {
    // === USER MODE ===
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('ad-flow-container').classList.remove('hidden');
    
    // Inject GLOBAL ADS (Popunder & Social Bar) ONLY for users
    injectGlobalAds();
} else {
    // === ADMIN MODE ===
    auth.onAuthStateChanged((user) => {
        if (user) {
            showDashboard();
        } else {
            document.getElementById('login-container').classList.remove('hidden');
        }
    });
}

function injectGlobalAds() {
    // 1. Popunder Ad
    const popunderScript = document.createElement('script');
    popunderScript.src = "https://avouchlawsrethink.com/84/eb/8d/84eb8d070d994205359151034f4c5e6e.js";
    document.body.appendChild(popunderScript);

    // 2. Social Bar Ad
    const socialBarScript = document.createElement('script');
    socialBarScript.src = "https://avouchlawsrethink.com/ce/53/c8/ce53c831cc48f76015779081c3f40e32.js";
    document.body.appendChild(socialBarScript);
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
    auth.signOut().then(() => location.reload());
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
        function error(err) { alert("Upload Error: " + err.message); },
        function complete() {
            task.snapshot.ref.getDownloadURL().then((url) => {
                saveVideoToDB(title, url);
            });
        }
    );
}

function saveVideoToDB(title, url) {
    const newVidRef = db.ref('videos').push();
    newVidRef.set({ title: title, url: url, timestamp: Date.now() })
        .then(() => {
            alert("Video Uploaded Successfully!");
            document.getElementById('video-title').value = "";
            document.getElementById('uploader').style.display = "none";
            loadVideos();
        });
}

function loadVideos() {
    const list = document.getElementById('video-list');
    list.innerHTML = ""; 
    db.ref('videos').on('value', (snapshot) => {
        list.innerHTML = ""; 
        snapshot.forEach((childSnapshot) => {
            const vid = childSnapshot.val();
            const key = childSnapshot.key;
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
    if(confirm("Delete this video?")) db.ref('videos/' + key).remove();
}

function copyLink(link) {
    navigator.clipboard.writeText(link);
    alert("Link Copied!");
}

// --- PLAYER & TIMER LOGIC ---

function startTimer() {
    // Hide the initial button
    document.getElementById('btn-step-1').style.display = 'none';
    // Show timer box
    document.getElementById('timer-box').classList.remove('hidden');

    let timeLeft = 15;
    const countdownEl = document.getElementById('countdown');
    
    const timerId = setInterval(() => {
        timeLeft--;
        countdownEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            // Hide timer box
            document.getElementById('timer-box').classList.add('hidden');
            // Show "Next Step" button
            document.getElementById('btn-after-timer').classList.remove('hidden');
        }
    }, 1000);
}

function nextStep(stepNumber) {
    document.querySelectorAll('.ad-step').forEach(el => el.classList.add('hidden'));
    document.getElementById('step-' + stepNumber).classList.remove('hidden');
}

function showPlayer() {
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
            alert("Video not found.");
            window.location.href = window.location.pathname;
        }
    });
            }
              
