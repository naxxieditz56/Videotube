// Get video ID from URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let currentVideo = null;
let recommendedVideos = [];
let displayedRecommendations = 6;

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
        
        // Load recommendations
        loadRecommendations();
    });
}

// Load recommended videos
function loadRecommendations() {
    const videosRef = database.ref('videos');
    videosRef.once('value').then((snapshot) => {
        const videos = snapshot.val();
        recommendedVideos = [];
        
        if (videos) {
            Object.keys(videos).forEach(key => {
                if (key !== videoId) {
                    recommendedVideos.push({
                        id: key,
                        ...videos[key]
                    });
                }
            });
            
            // Shuffle recommendations
            recommendedVideos = shuffleArray(recommendedVideos);
            displayRecommendations();
        }
    });
}

// Display recommendations
function displayRecommendations() {
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '';
    
    const videosToShow = recommendedVideos.slice(0, displayedRecommendations);
    
    videosToShow.forEach(video => {
        const videoElement = document.createElement('div');
        videoElement.className = 'recommended-video';
        videoElement.setAttribute('data-video-id', video.id);
        
        videoElement.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="recommended-thumbnail">
            <div class="recommended-info">
                <h3>${video.title}</h3>
                <p class="recommended-views">${video.views || 0} views</p>
            </div>
        `;
        
        videoElement.addEventListener('click', () => {
            window.location.href = `videoplayer.html?id=${video.id}`;
        });
        
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

// Load more recommendations
document.getElementById('load-more-btn').addEventListener('click', () => {
    displayedRecommendations += 6;
    displayRecommendations();
});



// Video player play/pause toggle
document.getElementById('video-player').addEventListener('click', () => {
    const videoPlayer = document.getElementById('video-player');
    const playBtn = document.getElementById('play-btn');
    
    if (videoPlayer.paused) {
        videoPlayer.play();
        playBtn.textContent = 'Pause';
    } else {
        videoPlayer.pause();
        playBtn.textContent = 'Play';
    }
});



// Like functionality
document.getElementById('like-btn').addEventListener('click', () => {
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.transaction(video => {
        if (video) {
            video.likes = (video.likes || 0) + 1;
        }
        return video;
    });
});

// Share functionality
document.getElementById('share-btn').addEventListener('click', () => {
    document.getElementById('share-modal').style.display = 'block';
});

// Close modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('share-modal').style.display = 'none';
});

// Copy link functionality
document.getElementById('copy-link-btn').addEventListener('click', () => {
    const shareLink = document.getElementById('share-link');
    shareLink.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
});

// Increment view count
function incrementViewCount() {
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.transaction(video => {
        if (video) {
            video.views = (video.views || 0) + 1;
        }
        return video;
    });
}

// Show ad (simulated)
function showAd() {
    return new Promise((resolve) => {
        const adContainer = document.getElementById('ad-container');
        const videoPlayer = document.getElementById('video-player');
        
        // Show ad container
        adContainer.style.display = 'block';
        videoPlayer.style.display = 'none';
        
        // Simulate ad (in a real implementation, you would use Adsterra)
        adContainer.innerHTML = `
            <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; background:#000; color:#fff; flex-direction:column;">
                <h2>Advertisement</h2>
                <p>Video will play in 3 seconds...</p>
            </div>
        `;
        
        // After 3 seconds, hide ad and resolve promise
        setTimeout(() => {
            adContainer.style.display = 'none';
            videoPlayer.style.display = 'block';
            resolve();
        }, 3000);
    });
}

// Double tap to forward/rewind
let lastTap = 0;
document.getElementById('video-player').addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        const videoPlayer = document.getElementById('video-player');
        const rect = videoPlayer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // If tap on right side, forward 10 seconds
        if (x > rect.width / 2) {
            videoPlayer.currentTime += 10;
        } 
        // If tap on left side, rewind 10 seconds
        else {
            videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
        }
    }
    
    lastTap = currentTime;
});

// Utility function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Search functionality
document.getElementById('search-btn').addEventListener('click', () => {
    const searchInput = document.getElementById('search-input');
    window.location.href = `index.html?search=${encodeURIComponent(searchInput.value)}`;
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        window.location.href = `index.html?search=${encodeURIComponent(e.target.value)}`;
    }
});

// Load video on page load
document.addEventListener('DOMContentLoaded', loadVideo);
