// Get video ID from URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('id');

let currentVideo = null;
let recommendedVideos = [];
let displayedRecommendations = 6;
let adTimerInterval;
let adDuration = 5; // Reduced for better UX
let skipAdTime = 3; // Time after which skip button appears
let lastTap = 0;
let adPlayed = false;

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, videoId:', videoId);
    
    if (!videoId) {
        console.error('No video ID found in URL');
        window.location.href = 'index.html';
        return;
    }
    
    // Load video data first
    loadVideo();
    
    // Set up load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreRecommendations);
    }
    
    // Set up search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
});

// Load video data
function loadVideo() {
    console.log('Loading video with ID:', videoId);
    
    if (!videoId) {
        window.location.href = 'index.html';
        return;
    }
    
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.once('value').then((snapshot) => {
        currentVideo = snapshot.val();
        console.log('Video data loaded:', currentVideo);
        
        if (!currentVideo) {
            console.error('No video found with ID:', videoId);
            window.location.href = 'index.html';
            return;
        }
        
        // Update page with video data
        document.getElementById('video-title').textContent = currentVideo.title || 'Untitled Video';
        document.getElementById('views-count').textContent = `${currentVideo.views || 0} views`;
        document.getElementById('like-count').textContent = currentVideo.likes || 0;
        
        const videoPlayer = document.getElementById('video-player');
        if (currentVideo.videoUrl) {
            videoPlayer.src = currentVideo.videoUrl;
        }
        if (currentVideo.thumbnail) {
            videoPlayer.poster = currentVideo.thumbnail;
        }
        
        // Set share link
        document.getElementById('share-link').value = window.location.href;
        
        // Load recommendations
        loadRecommendations();
        
        // Set up video event listeners
        setupVideoPlayer();
        
        // Set up interaction buttons
        setupInteractionButtons();
        
        // Set up modal functionality
        setupModal();
        
    }).catch((error) => {
        console.error('Error loading video:', error);
        document.getElementById('video-title').textContent = 'Error loading video';
    });
}

// Setup video player functionality
function setupVideoPlayer() {
    const videoPlayer = document.getElementById('video-player');
    const adContainer = document.getElementById('ad-container');
    
    if (!videoPlayer) {
        console.error('Video player element not found');
        return;
    }
    
    // Reset ad state
    adPlayed = false;
    
    // Single click handler for video player
    videoPlayer.addEventListener('click', function(e) {
        console.log('Video player clicked, adPlayed:', adPlayed);
        
        if (!adPlayed) {
            e.preventDefault();
            e.stopPropagation();
            
            // Show ad before playing video
            showSimpleAd().then(() => {
                console.log('Ad completed, playing video');
                adPlayed = true;
                videoPlayer.play().catch(err => {
                    console.error('Error playing video:', err);
                });
                incrementViewCount();
                showSocialBarAd();
            });
        }
    });
    
    // Also handle play event
    videoPlayer.addEventListener('play', function(e) {
        console.log('Play event triggered, adPlayed:', adPlayed);
        
        if (!adPlayed) {
            e.preventDefault();
            videoPlayer.pause();
            
            showSimpleAd().then(() => {
                adPlayed = true;
                videoPlayer.play().catch(err => {
                    console.error('Error playing video:', err);
                });
                incrementViewCount();
                showSocialBarAd();
            });
        }
    });
    
    // Double tap for seeking (separate from ad logic)
    let lastTap = 0;
    videoPlayer.addEventListener('click', function(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0 && adPlayed) {
            // Only allow seeking if ad has been played
            const rect = videoPlayer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            if (x > rect.width / 2) {
                videoPlayer.currentTime += 10;
                showSeekFeedback('+10s');
            } else {
                videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
                showSeekFeedback('-10s');
            }
            
            e.preventDefault();
            e.stopPropagation();
        }
        
        lastTap = currentTime;
    });
}

// Show seek feedback
function showSeekFeedback(text) {
    const feedback = document.createElement('div');
    feedback.textContent = text;
    feedback.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 18px;
        font-weight: bold;
        z-index: 1000;
        pointer-events: none;
    `;
    
    document.querySelector('.video-player-container').appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 1000);
}

// Simple ad implementation (fallback)
function showSimpleAd() {
    return new Promise((resolve) => {
        console.log('Showing ad');
        
        const adContainer = document.getElementById('ad-container');
        const videoPlayer = document.getElementById('video-player');
        
        if (!adContainer || !videoPlayer) {
            console.error('Ad container or video player not found');
            resolve();
            return;
        }
        
        adContainer.style.display = 'flex';
        videoPlayer.style.display = 'none';
        
        adContainer.innerHTML = `
            <div class="ad-overlay">
                <h3>Advertisement</h3>
                <p>Your video will play in <span id="ad-timer">${adDuration}</span> seconds</p>
                <button id="skip-ad-btn" style="display:none;">Skip Ad</button>
            </div>
        `;
        
        let timeLeft = adDuration;
        const adTimer = document.getElementById('ad-timer');
        const skipAdBtn = document.getElementById('skip-ad-btn');
        
        const timer = setInterval(() => {
            timeLeft--;
            if (adTimer) adTimer.textContent = timeLeft;
            
            if (timeLeft <= (adDuration - skipAdTime) && skipAdBtn) {
                skipAdBtn.style.display = 'inline-block';
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                finishAd(resolve);
            }
        }, 1000);
        
        if (skipAdBtn) {
            skipAdBtn.addEventListener('click', () => {
                clearInterval(timer);
                finishAd(resolve);
            });
        }
    });
}

// Finish ad and resume video
function finishAd(resolve) {
    console.log('Finishing ad');
    
    const adContainer = document.getElementById('ad-container');
    const videoPlayer = document.getElementById('video-player');
    
    if (adContainer) adContainer.style.display = 'none';
    if (videoPlayer) videoPlayer.style.display = 'block';
    
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
    if (!currentVideo || !videoId) return;
    
    console.log('Incrementing view count');
    
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.transaction((video) => {
        if (video) {
            video.views = (video.views || 0) + 1;
        }
        return video;
    }).then(() => {
        console.log('View count updated');
        // Update the display
        document.getElementById('views-count').textContent = `${(currentVideo.views || 0) + 1} views`;
    }).catch((error) => {
        console.error('Error updating view count:', error);
    });
}

// Load recommended videos
function loadRecommendations() {
    console.log('Loading recommendations');
    
    const videosRef = database.ref('videos');
    videosRef.once('value').then((snapshot) => {
        const videos = snapshot.val();
        if (videos) {
            // Convert to array and filter out current video
            recommendedVideos = Object.keys(videos)
                .map(key => ({ 
                    id: key, 
                    title: videos[key].title || 'Untitled Video',
                    thumbnail: videos[key].thumbnail,
                    views: videos[key].views || 0
                }))
                .filter(video => video.id !== videoId);
            
            console.log('Recommended videos:', recommendedVideos);
            
            // Shuffle recommendations
            recommendedVideos = shuffleArray(recommendedVideos);
            
            // Display initial recommendations
            displayRecommendations();
        } else {
            console.log('No videos found for recommendations');
        }
    }).catch((error) => {
        console.error('Error loading recommendations:', error);
    });
}

// Display recommended videos
function displayRecommendations() {
    const container = document.getElementById('recommendations-container');
    if (!container) {
        console.error('Recommendations container not found');
        return;
    }
    
    container.innerHTML = '';
    
    const videosToShow = recommendedVideos.slice(0, displayedRecommendations);
    
    if (videosToShow.length === 0) {
        container.innerHTML = '<p>No recommendations available</p>';
        return;
    }
    
    videosToShow.forEach(video => {
        const videoElement = createRecommendedVideoElement(video);
        container.appendChild(videoElement);
    });
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        if (displayedRecommendations >= recommendedVideos.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
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
            <h3>${video.title}</h3>
            <p class="recommended-views">${formatViewCount(video.views)} views</p>
        </div>
    `;
    
    div.addEventListener('click', () => {
        console.log('Recommended video clicked:', video.id);
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
    
    if (likeBtn) {
        likeBtn.addEventListener('click', handleLike);
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }
}

// Handle like button click
function handleLike() {
    if (!currentVideo || !videoId) return;
    
    console.log('Like button clicked');
    
    const videoRef = database.ref(`videos/${videoId}`);
    videoRef.transaction((video) => {
        if (video) {
            video.likes = (video.likes || 0) + 1;
        }
        return video;
    }).then(() => {
        // Update like count display
        const likeCount = document.getElementById('like-count');
        if (likeCount) {
            likeCount.textContent = parseInt(likeCount.textContent) + 1;
        }
        
        // Visual feedback
        const likeBtn = document.getElementById('like-btn');
        if (likeBtn) {
            likeBtn.style.backgroundColor = '#ff4444';
            setTimeout(() => {
                likeBtn.style.backgroundColor = '#272727';
            }, 1000);
        }
    }).catch((error) => {
        console.error('Error updating likes:', error);
    });
}

// Handle share button click
function handleShare() {
    console.log('Share button clicked');
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Setup modal functionality
function setupModal() {
    const modal = document.getElementById('share-modal');
    const closeBtn = document.querySelector('.close');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyShareLink);
    }
}

// Copy share link to clipboard
function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    if (!shareLink) return;
    
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);
    
    try {
        navigator.clipboard.writeText(shareLink.value).then(() => {
            showCopyFeedback();
        }).catch(() => {
            // Fallback
            document.execCommand('copy');
            showCopyFeedback();
        });
    } catch (err) {
        // Fallback for older browsers
        document.execCommand('copy');
        showCopyFeedback();
    }
}

// Show copy feedback
function showCopyFeedback() {
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.backgroundColor = '#00aa00';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '#ff0000';
        }, 2000);
    }
}

// Handle search functionality
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    
    if (query) {
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
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
