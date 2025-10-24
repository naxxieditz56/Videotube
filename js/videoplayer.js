// Get video ID from URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let currentVideo = null;
let recommendedVideos = [];
let displayedRecommendations = 6;
let adTimerInterval;
let adDuration = 30; // Default ad duration in seconds
let skipAdTime = 5; // Time after which skip button appears

// Adsterra configuration
const ADSTERRA_CONFIG = {
    videoAdUnit: '27818603', // Replace with your Adsterra video ad unit ID
    bannerAdUnit: '27818639' // Replace with your Adsterra banner ad unit ID
};

// Initialize Adsterra ads
function initializeAds() {
    // Initialize Google Publisher Tag (GPT) for Adsterra
    window.googletag = window.googletag || {cmd: []};
    
    googletag.cmd.push(function() {
        // Define video ad slot
        const videoAdSlot = googletag.defineSlot(ADSTERRA_CONFIG.videoAdUnit, [640, 480], 'adsterra-video-ad');
        if (videoAdSlot) {
            videoAdSlot.addService(googletag.companionAds());
            videoAdSlot.addService(googletag.pubads());
        }
        
        googletag.pubads().enableSingleRequest();
        googletag.enableServices();
    });
}

// Load video data
function loadVideo() {
    if (!videoId) {
        window.location.href = 'index.html';
        return;
    }
    
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.once('value').then((snapshot) => {
        currentVideo = snapshot.val();
        if (!currentVideo) {
            window.location.href = 'index.html';
            return;
        }
        
        // Update page with video data
        document.getElementById('video-title').textContent = currentVideo.title;
        document.getElementById('views-count').textContent = `${currentVideo.views || 0} views`;
        document.getElementById('like-count').textContent = currentVideo.likes || 0;
        
        const videoPlayer = document.getElementById('video-player');
        videoPlayer.src = currentVideo.videoUrl;
        videoPlayer.poster = currentVideo.thumbnail;
        
        // Set share link
        document.getElementById('share-link').value = window.location.href;
        
        // Initialize ads
        initializeAds();
        
        // Load recommendations
        loadRecommendations();
        
        // Set up video event listeners for ads
        setupVideoAdListeners();
    });
}

// Setup video ad listeners
function setupVideoAdListeners() {
    const videoPlayer = document.getElementById('video-player');
    
    // When user tries to play video, show ad first
    videoPlayer.addEventListener('play', (e) => {
        if (!videoPlayer.adPlayed) {
            e.preventDefault();
            videoPlayer.pause();
            showAdsterraAd().then(() => {
                videoPlayer.adPlayed = true;
                videoPlayer.play();
                incrementViewCount();
            });
        }
    });
    
    // Also handle click events for ad display
    videoPlayer.addEventListener('click', (e) => {
        if (videoPlayer.paused && !videoPlayer.adPlayed) {
            e.preventDefault();
            showAdsterraAd().then(() => {
                videoPlayer.adPlayed = true;
                videoPlayer.play();
                incrementViewCount();
            });
        }
    });
}

// Show social bar ad when video starts playing
function showSocialBarAd() {
    const socialBarAd = document.getElementById('social-bar-ad');
    socialBarAd.style.display = 'block';
    
    // Hide after 30 seconds
    setTimeout(() => {
        socialBarAd.style.display = 'none';
    }, 30000);
}

// Update the video event listener to show social bar ad
videoPlayer.addEventListener('play', (e) => {
    if (!videoPlayer.adPlayed) {
        e.preventDefault();
        videoPlayer.pause();
        showAdsterraAd().then(() => {
            videoPlayer.adPlayed = true;
            videoPlayer.play();
            incrementViewCount();
            showSocialBarAd(); // Show social bar ad after ad completes
        });
    } else {
        showSocialBarAd(); // Show social bar ad on subsequent plays
    }
});

// Show Adsterra ad before video playback
function showAdsterraAd() {
    return new Promise((resolve) => {
        const adContainer = document.getElementById('ad-container');
        const videoPlayer = document.getElementById('video-player');
        const adTimer = document.getElementById('ad-timer');
        const skipAdBtn = document.getElementById('skip-ad-btn');
        
        // Show ad container
        adContainer.style.display = 'flex';
        videoPlayer.style.display = 'none';
        
        let timeLeft = adDuration;
        adTimer.textContent = timeLeft;
        
        // Display ad overlay initially
        adContainer.innerHTML = `
            <div class="ad-overlay">
                <h3>Advertisement</h3>
                <p>Video will play after ad</p>
                <div class="ad-countdown">
                    <span id="ad-countdown-text">Ad: </span>
                    <span id="ad-timer">${timeLeft}</span>
                    <button id="skip-ad-btn" style="display:none;">Skip Ad</button>
                </div>
            </div>
            <div id="adsterra-video-ad" style="width:100%; height:100%;"></div>
        `;
        
        // Load Adsterra ad
        loadAdsterraVideoAd();
        
        // Start countdown timer
        adTimerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('ad-timer').textContent = timeLeft;
            
            // Show skip button after specified time
            if (timeLeft <= (adDuration - skipAdTime)) {
                document.getElementById('skip-ad-btn').style.display = 'inline-block';
            }
            
            // End ad when timer reaches 0
            if (timeLeft <= 0) {
                clearInterval(adTimerInterval);
                finishAd(resolve);
            }
        }, 1000);
        
        // Skip ad button event
        document.getElementById('skip-ad-btn').addEventListener('click', () => {
            clearInterval(adTimerInterval);
            finishAd(resolve);
        });
    });
}

// Load Adsterra video ad
function loadAdsterraVideoAd() {
    googletag.cmd.push(function() {
        googletag.display('adsterra-video-ad');
    });
}

// Finish ad and resume video
function finishAd(resolve) {
    const adContainer = document.getElementById('ad-container');
    const videoPlayer = document.getElementById('video-player');
    
    // Destroy ad
    googletag.cmd.push(function() {
        googletag.destroySlots();
    });
    
    // Hide ad container and show video
    adContainer.style.display = 'none';
    videoPlayer.style.display = 'block';
    
    // Resolve promise to continue video playback
    resolve();
}

// Alternative simple ad implementation (fallback)
function showSimpleAd() {
    return new Promise((resolve) => {
        const adContainer = document.getElementById('ad-container');
        const videoPlayer = document.getElementById('video-player');
        
        adContainer.style.display = 'flex';
        videoPlayer.style.display = 'none';
        
        adContainer.innerHTML = `
            <div class="ad-overlay">
                <h3>Advertisement</h3>
                <p>Your video will play in <span id="ad-timer">5</span> seconds</p>
                <button id="skip-ad-btn" style="display:none;">Skip Ad</button>
            </div>
        `;
        
        let timeLeft = 5;
        const adTimer = document.getElementById('ad-timer');
        const skipAdBtn = document.getElementById('skip-ad-btn');
        
        const timer = setInterval(() => {
            timeLeft--;
            adTimer.textContent = timeLeft;
            
            if (timeLeft <= 2) {
                skipAdBtn.style.display = 'inline-block';
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                adContainer.style.display = 'none';
                videoPlayer.style.display = 'block';
                resolve();
            }
        }, 1000);
        
        skipAdBtn.addEventListener('click', () => {
            clearInterval(timer);
            adContainer.style.display = 'none';
            videoPlayer.style.display = 'block';
            resolve();
        });
    });
}

// The rest of your existing JavaScript code remains the same...
// [Keep all your existing functions like loadRecommendations, displayRecommendations, etc.]

// Update the video click event listener to handle ads
document.getElementById('video-player').addEventListener('click', (e) => {
    const videoPlayer = document.getElementById('video-player');
    
    // Double tap detection for seeking
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 300 && tapLength > 0) {
        const rect = videoPlayer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        if (x > rect.width / 2) {
            videoPlayer.currentTime += 10;
        } else {
            videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
        }
    }
    
    lastTap = currentTime;
});

// Initialize ads on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeAds();
    loadVideo();
});
