// Get video ID from URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let currentVideo = null;
let recommendedVideos = [];
let displayedRecommendations = 6;
let adTimerInterval;
let adDuration = 30; // Default ad duration in seconds
let skipAdTime = 5; // Time after which skip button appears
let lastTap = 0;

// Adsterra configuration
const ADSTERRA_CONFIG = {
    videoAdUnit: 'your-adsterra-video-ad-unit-id', // Replace with your Adsterra video ad unit ID
    bannerAdUnit: 'your-adsterra-banner-ad-unit-id' // Replace with your Adsterra banner ad unit ID
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
        
        // Set up interaction buttons
        setupInteractionButtons();
        
        // Set up modal functionality
        setupModal();
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
                showSocialBarAd(); // Show social bar ad after ad completes
            });
        } else {
            showSocialBarAd(); // Show social bar ad on subsequent plays
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
                showSocialBarAd(); // Show social bar ad after ad completes
            });
        }
    });
    
    // Double tap for seeking
    videoPlayer.addEventListener('click', (e) => {
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
}

// Show Adsterra ad before video playback
function showAdsterraAd() {
    return new Promise((resolve) => {
        const adContainer = document.getElementById('ad-container');
        const videoPlayer = document.getElementById('video-player');
        
        // Show ad container
        adContainer.style.display = 'flex';
        videoPlayer.style.display = 'none';
        
        let timeLeft = adDuration;
        
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
        
        const adTimer = document.getElementById('ad-timer');
        const skipAdBtn = document.getElementById('skip-ad-btn');
        
        // Load Adsterra ad
        loadAdsterraVideoAd();
        
        // Start countdown timer
        adTimerInterval = setInterval(() => {
            timeLeft--;
            adTimer.textContent = timeLeft;
            
            // Show skip button after specified time
            if (timeLeft <= (adDuration - skipAdTime)) {
                skipAdBtn.style.display = 'inline-block';
            }
            
            // End ad when timer reaches 0
            if (timeLeft <= 0) {
                clearInterval(adTimerInterval);
                finishAd(resolve);
            }
        }, 1000);
        
        // Skip ad button event
        skipAdBtn.addEventListener('click', () => {
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

// Show social bar ad when video starts playing
function showSocialBarAd() {
    const socialBarAd = document.getElementById('social-bar-ad');
    if (socialBarAd) {
        socialBarAd.style.display = 'block';
        
        // Hide after 30 seconds
        setTimeout(() => {
            socialBarAd.style.display = 'none';
        }, 30000);
    }
}

// Increment view count
function incrementViewCount() {
    if (!currentVideo) return;
    
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.transaction((video) => {
        if (video) {
            video.views = (video.views || 0) + 1;
        }
        return video;
    });
}

// Load recommended videos
function loadRecommendations() {
    const videosRef = database.ref('videos');
    videosRef.once('value').then((snapshot) => {
        const videos = snapshot.val();
        if (videos) {
            // Convert to array and filter out current video
            recommendedVideos = Object.keys(videos)
                .map(key => ({ id: key, ...videos[key] }))
                .filter(video => video.id !== videoId);
            
            // Shuffle recommendations
            recommendedVideos = shuffleArray(recommendedVideos);
            
            // Display initial recommendations
            displayRecommendations();
        }
    });
}

// Display recommended videos
function displayRecommendations() {
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '';
    
    const videosToShow = recommendedVideos.slice(0, displayedRecommendations);
    
    videosToShow.forEach(video => {
        const videoElement = createRecommendedVideoElement(video);
        container.appendChild(videoElement);
    });
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (displayedRecommendations >= recommendedVideos.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

// Create recommended video element
function createRecommendedVideoElement(video) {
    const div = document.createElement('div');
    div.className = 'recommended-video';
    div.setAttribute('data-video-id', video.id);
    
    div.innerHTML = `
        <img src="${video.thumbnail || 'assets/default-thumbnail.jpg'}" 
             alt="${video.title}" 
             class="recommended-thumbnail"
             onerror="this.src='assets/default-thumbnail.jpg'">
        <div class="recommended-info">
            <h3>${video.title || 'Untitled Video'}</h3>
            <p class="recommended-views">${formatViewCount(video.views || 0)} views</p>
        </div>
    `;
    
    div.addEventListener('click', () => {
        window.location.href = `videoplayer.html?id=${video.id}`;
    });
    
    return div;
}

// Load more recommendations
function loadMoreRecommendations() {
    displayedRecommendations += 6;
    displayRecommendations();
}

// Setup interaction buttons
function setupInteractionButtons() {
    const likeBtn = document.getElementById('like-btn');
    const shareBtn = document.getElementById('share-btn');
    
    likeBtn.addEventListener('click', handleLike);
    shareBtn.addEventListener('click', handleShare);
}

// Handle like button click
function handleLike() {
    if (!currentVideo) return;
    
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.transaction((video) => {
        if (video) {
            video.likes = (video.likes || 0) + 1;
        }
        return video;
    }).then(() => {
        // Update like count display
        const likeCount = document.getElementById('like-count');
        likeCount.textContent = parseInt(likeCount.textContent) + 1;
        
        // Visual feedback
        const likeBtn = document.getElementById('like-btn');
        likeBtn.style.backgroundColor = '#ff4444';
        setTimeout(() => {
            likeBtn.style.backgroundColor = '#272727';
        }, 300);
    });
}

// Handle share button click
function handleShare() {
    const modal = document.getElementById('share-modal');
    modal.style.display = 'block';
}

// Setup modal functionality
function setupModal() {
    const modal = document.getElementById('share-modal');
    const closeBtn = document.querySelector('.close');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    copyLinkBtn.addEventListener('click', copyShareLink);
}

// Copy share link to clipboard
function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    shareLink.select();
    shareLink.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        navigator.clipboard.writeText(shareLink.value).then(() => {
            const copyBtn = document.getElementById('copy-link-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.backgroundColor = '#00aa00';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '#ff0000';
            }, 2000);
        });
    } catch (err) {
        // Fallback for older browsers
        document.execCommand('copy');
        const copyBtn = document.getElementById('copy-link-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.backgroundColor = '#00aa00';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '#ff0000';
        }, 2000);
    }
}

// Utility functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function formatViewCount(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
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

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize ads
    initializeAds();
    
    // Load video data
    loadVideo();
    
    // Set up load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.addEventListener('click', loadMoreRecommendations);
    
    // Set up search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
});

// Handle search functionality
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
    }
                       }
