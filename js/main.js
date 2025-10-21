// Load videos from Firebase in random order
function loadVideos(searchQuery = '') {
    const videosContainer = document.getElementById('videos-container');
    videosContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    const videosRef = database.ref('videos');
    videosRef.on('value', (snapshot) => {
        const videos = snapshot.val();
        videosContainer.innerHTML = '';
        
        if (videos) {
            // Convert object to array and shuffle
            let videoArray = Object.keys(videos).map(key => {
                return {
                    id: key,
                    ...videos[key]
                };
            });
            
            // Filter by search query if provided
            if (searchQuery) {
                videoArray = videoArray.filter(video => 
                    video.title.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            
            // Shuffle the array for random order
            videoArray = shuffleArray(videoArray);
            
            if (videoArray.length === 0) {
                videosContainer.innerHTML = '<div class="no-videos">No videos found matching your search.</div>';
                return;
            }
            
            // Display videos
            videoArray.forEach(video => {
                const videoCard = createVideoCard(video);
                videosContainer.appendChild(videoCard);
            });
        } else {
            videosContainer.innerHTML = '<div class="no-videos">No videos available yet. Check back later!</div>';
        }
    }, (error) => {
        console.error('Error loading videos:', error);
        videosContainer.innerHTML = '<div class="no-videos">Error loading videos. Please try again later.</div>';
    });
}

// Create video card element
function createVideoCard(video) {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.setAttribute('data-video-id', video.id);
    
    videoCard.innerHTML = `
        <div class="thumbnail-container">
            <img src="${video.thumbnail || 'assets/default-thumbnail.jpg'}" 
                 alt="${video.title}" 
                 class="thumbnail"
                 onerror="this.src='assets/default-thumbnail.jpg'">
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title || 'Untitled Video'}</h3>
            <p class="video-views">${formatViewCount(video.views || 0)} views</p>
        </div>
    `;
    
    videoCard.addEventListener('click', () => {
        window.location.href = `videoplayer.html?id=${video.id}`;
    });
    
    return videoCard;
}

// Shuffle array function (Fisher-Yates algorithm)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Format view count (e.g., 1000 -> 1K, 1000000 -> 1M)
function formatViewCount(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}

// Search functionality
document.getElementById('search-btn').addEventListener('click', () => {
    const searchInput = document.getElementById('search-input');
    loadVideos(searchInput.value.trim());
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadVideos(e.target.value.trim());
    }
});

// Clear search when input is cleared
document.getElementById('search-input').addEventListener('input', (e) => {
    if (e.target.value.trim() === '') {
        loadVideos();
    }
});

// Load videos on page load
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    
    // Check for search parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        document.getElementById('search-input').value = searchParam;
        loadVideos(searchParam);
    }
});

// Refresh videos when page gains focus (optional)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Small delay to ensure smooth user experience
        setTimeout(loadVideos, 100);
    }
});
