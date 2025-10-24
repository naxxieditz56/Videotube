// Get video ID from URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let currentVideo = null;
let displayedRecommendations = 8;

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
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '<div class="recommendations-loading"><div class="recommendations-spinner"></div></div>';
    
    const videosRef = database.ref('videos');
    videosRef.once('value').then((snapshot) => {
        const videos = snapshot.val();
        let recommendedVideos = [];
        
        if (videos) {
            Object.keys(videos).forEach(key => {
                if (key !== videoId) {
                    recommendedVideos.push({
                        id: key,
                        ...videos[key]
                    });
                }
            });
            
            // Shuffle recommendations for variety
            recommendedVideos = shuffleArray(recommendedVideos);
            
            if (recommendedVideos.length === 0) {
                container.innerHTML = '<div class="no-recommendations"><p>No other videos available</p></div>';
                document.getElementById('load-more-btn').style.display = 'none';
                return;
            }
            
            displayedRecommendations = 8;
            window.recommendedVideos = recommendedVideos;
            displayRecommendations();
        } else {
            container.innerHTML = '<div class="no-recommendations"><p>No recommendations available</p></div>';
            document.getElementById('load-more-btn').style.display = 'none';
        }
    }).catch((error) => {
        console.error('Error loading recommendations:', error);
        container.innerHTML = '<div class="no-recommendations"><p>Error loading recommendations</p></div>';
        document.getElementById('load-more-btn').style.display = 'none';
    });
}

// Display recommendations with 4-per-row layout
function displayRecommendations() {
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '';
    
    const videosToShow = window.recommendedVideos.slice(0, displayedRecommendations);
    
    if (videosToShow.length === 0) {
        container.innerHTML = '<div class="no-recommendations"><p>No recommendations available</p></div>';
        document.getElementById('load-more-btn').style.display = 'none';
        return;
    }
    
    videosToShow.forEach(video => {
        const videoElement = createRecommendationCard(video);
        container.appendChild(videoElement);
    });
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (displayedRecommendations >= window.recommendedVideos.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.textContent = `Load More (${window.recommendedVideos.length - displayedRecommendations} remaining)`;
    }
}

// Create recommendation card element
function createRecommendationCard(video) {
    const videoElement = document.createElement('div');
    videoElement.className = 'recommended-video';
    videoElement.setAttribute('data-video-id', video.id);
    
    const duration = calculateVideoDuration(video.duration);
    
    videoElement.innerHTML = `
        <div class="recommended-thumbnail-container">
            <img src="${video.thumbnail || 'assets/default-thumbnail.jpg'}" 
                 alt="${video.title}" 
                 class="recommended-thumbnail"
                 onerror="this.src='assets/default-thumbnail.jpg'">
            ${duration ? `<span class="recommended-duration">${duration}</span>` : ''}
        </div>
        <div class="recommended-info">
            <h3 class="recommended-title">${video.title || 'Untitled Video'}</h3>
            <div class="recommended-meta">
                <span class="recommended-views">${formatViewCount(video.views || 0)} views</span>
                <span>•</span>
                <span class="recommended-year">${video.uploadDate ? new Date(video.uploadDate).getFullYear() : '2024'}</span>
            </div>
        </div>
    `;
    
    videoElement.addEventListener('click', () => {
        window.location.href = `videoplayer.html?id=${video.id}`;
    });
    
    return videoElement;
}

// Load more recommendations
document.getElementById('load-more-btn').addEventListener('click', () => {
    displayedRecommendations += 8;
    displayRecommendations();
});

// Play button functionality
document.getElementById('play-btn').addEventListener('click', () => {
    const videoPlayer = document.getElementById('video-player');
    
    // Show ad before playing video
    showAd().then(() => {
        // Increment view count
        incrementViewCount();
        
        // Play video
        videoPlayer.play();
        document.getElementById('play-btn').textContent = 'Pause';
    });
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

// Fullscreen functionality
document.getElementById('fullscreen-btn').addEventListener('click', () => {
    const videoPlayer = document.getElementById('video-player');
    
    if (videoPlayer.requestFullscreen) {
        videoPlayer.requestFullscreen();
    } else if (videoPlayer.mozRequestFullScreen) {
        videoPlayer.mozRequestFullScreen();
    } else if (videoPlayer.webkitRequestFullscreen) {
        videoPlayer.webkitRequestFullscreen();
    } else if (videoPlayer.msRequestFullscreen) {
        videoPlayer.msRequestFullscreen();
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
        
        // Simulate ad
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

// Utility functions
function calculateVideoDuration(duration) {
    if (duration) return duration;
    
    const durations = ['2:18', '1:45', '15:32', '8:15', '24:28', '3:03', '45:12', '1:58', '32:45', '5:20'];
    return durations[Math.floor(Math.random() * durations.length)];
}

function formatViewCount(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Load video on page load
document.addEventListener('DOMContentLoaded', loadVideo);
