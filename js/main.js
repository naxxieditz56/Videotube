// Load videos from Firebase
function loadVideos(searchQuery = '') {
    const videosRef = database.ref('videos');
    videosRef.on('value', (snapshot) => {
        const videos = snapshot.val();
        const videosContainer = document.getElementById('videos-container');
        videosContainer.innerHTML = '';
        
        if (videos) {
            Object.keys(videos).forEach(key => {
                const video = videos[key];
                
                // Filter by search query if provided
                if (searchQuery && !video.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return;
                }
                
                const videoCard = document.createElement('div');
                videoCard.className = 'video-card';
                videoCard.setAttribute('data-video-id', key);
                
                videoCard.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-views">${video.views || 0} views</p>
                    </div>
                `;
                
                videoCard.addEventListener('click', () => {
                    window.location.href = `videoplayer.html?id=${key}`;
                });
                
                videosContainer.appendChild(videoCard);
            });
        } else {
            videosContainer.innerHTML = '<p>No videos available</p>';
        }
    });
}

// Search functionality
document.getElementById('search-btn').addEventListener('click', () => {
    const searchInput = document.getElementById('search-input');
    loadVideos(searchInput.value);
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadVideos(e.target.value);
    }
});

// Load videos on page load
document.addEventListener('DOMContentLoaded', loadVideos);
