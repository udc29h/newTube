console.log('Content script loaded');

class VideoAgeRating {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.videoId = this.getVideoId();
        this.isUIInserted = false;
        this.debounceTimeout = null;
        this.init();
    }

    getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    async init() {
        console.log('Initializing VideoAgeRating for video ID:', this.videoId);
        if (!this.videoId) {
            console.log('No video ID found, skipping initialization');
            return;
        }
        
        // Clean up existing UI before initializing new one
        this.cleanupUI();
        
        // Wait for YouTube to load its UI
        await this.waitForYouTubeUI();
        await this.insertRatingUI();
        await this.checkAgeRestriction();
        this.addVoteListeners();
        this.observeVideoChanges();
    }

    cleanupUI() {
        // Remove age rating container
        const existingContainer = document.querySelector('#age-rating-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Remove age warning if exists
        const existingWarning = document.querySelector('.age-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        // Remove video blur if exists
        const video = document.querySelector('video');
        if (video) {
            video.classList.remove('blurred-video');
            // Remove any existing play event listeners
            const newVideo = video.cloneNode(true);
            video.parentNode.replaceChild(newVideo, video);
        }

        this.isUIInserted = false;
    }

    async waitForYouTubeUI() {
        console.log('Waiting for YouTube UI elements...');
        for (let i = 0; i < 10; i++) {
            // Look for the subscribe button container
            const subscribeButton = document.querySelector('#subscribe-button');
            const videoTitle = document.querySelector('#title h1');
            
            if (subscribeButton && videoTitle) {
                console.log('Found subscribe button and title');
                return {
                    subscribe: subscribeButton,
                    title: videoTitle
                };
            }
            console.log('Subscribe button or title not found, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('Failed to find required elements after 10 seconds');
        return null;
    }

    async insertRatingUI() {
        console.log('Attempting to insert rating UI');
        
        if (this.isUIInserted) {
            console.log('UI already inserted, skipping');
            return;
        }

        const container = document.createElement('div');
        container.className = 'age-rating-container';
        container.id = 'age-rating-container';
        container.style.marginTop = '16px';
        container.style.marginBottom = '16px';
        
        const ratingData = await this.fetchRatingData();
        console.log('Fetched rating data:', ratingData);
        
        const stats = this.calculateRatingStats(ratingData);
        console.log('Calculated stats:', stats);
        
        container.innerHTML = `
            <div class="age-rating-header">
                <h3>Age Rating</h3>
                <div class="current-rating">
                    <span>Current Rating: ${stats.average}+</span>
                </div>
            </div>
            <div class="rating-stats">
                <div class="vote-stat">
                    <span>7+</span>
                    <div class="vote-count">${stats.voteCounts[7]} votes</div>
                </div>
                <div class="vote-stat">
                    <span>12+</span>
                    <div class="vote-count">${stats.voteCounts[12]} votes</div>
                </div>
                <div class="vote-stat">
                    <span>16+</span>
                    <div class="vote-count">${stats.voteCounts[16]} votes</div>
                </div>
                <div class="vote-stat">
                    <span>18+</span>
                    <div class="vote-count">${stats.voteCounts[18]} votes</div>
                </div>
            </div>
            <div class="vote-buttons">
                <button class="vote-button" data-age="7">7+</button>
                <button class="vote-button" data-age="12">12+</button>
                <button class="vote-button" data-age="16">16+</button>
                <button class="vote-button" data-age="18">18+</button>
            </div>
        `;

        const elements = await this.waitForYouTubeUI();
        if (!elements) {
            console.error('Could not find required elements');
            return;
        }

        // Find the owner-container (contains subscribe button and other elements)
        const ownerContainer = document.querySelector('#top-row');
        
        if (ownerContainer) {
            console.log('Found owner container, inserting UI after it');
            ownerContainer.parentNode.insertBefore(container, ownerContainer.nextSibling);
            this.isUIInserted = true;
        } else {
            // Fallback: insert after subscribe button
            console.log('Owner container not found, inserting after subscribe button');
            elements.subscribe.parentNode.insertBefore(container, elements.subscribe.nextSibling);
            this.isUIInserted = true;
        }

        console.log('UI insertion successful');
        
        // Verify insertion
        setTimeout(() => {
            const insertedUI = document.querySelector('#age-rating-container');
            if (insertedUI) {
                console.log('UI verified as inserted');
                console.log('UI position:', {
                    offsetTop: insertedUI.offsetTop,
                    parentElement: insertedUI.parentElement.id,
                    previousSibling: insertedUI.previousElementSibling?.id || 'none'
                });
            } else {
                console.error('UI verification failed - container not found after insertion');
            }
        }, 100);
    }

    async fetchRatingData() {
        try {
            const response = await fetch(`${this.apiUrl}/ratings/${this.videoId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch ratings');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching ratings:', error);
            return [];
        }
    }

    async submitVote(age) {
        try {
            // Generate or get user ID from storage
            const { userId } = await chrome.storage.sync.get('userId');
            let currentUserId = userId;
            
            if (!currentUserId) {
                currentUserId = 'user_' + Date.now() + Math.random().toString(36).substr(2, 9);
                await chrome.storage.sync.set({ userId: currentUserId });
            }

            const response = await fetch(`${this.apiUrl}/ratings/${this.videoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    age: parseInt(age),
                    userId: currentUserId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.error === 'User has already voted for this video') {
                    this.showNotification('You have already voted for this video!');
                    return;
                }
                throw new Error('Failed to submit vote');
            }

            const result = await response.json();
            this.updateRatingStats(result);
            this.highlightSelectedVote(age);
            this.showNotification('Your vote has been recorded!');

        } catch (error) {
            console.error('Error submitting vote:', error);
            this.showNotification('Failed to submit vote. Please try again.');
        }
    }

    calculateRatingStats(ratingData) {
        if (!ratingData || !ratingData.votes || !ratingData.votes.length) {
            return { average: 18, totalVotes: 0, voteCounts: { 7: 0, 12: 0, 16: 0, 18: 0 } };
        }
        
        const voteCounts = ratingData.voteCounts || {
            7: 0,
            12: 0,
            16: 0,
            18: 0
        };
        
        // Find the age category with maximum votes
        let maxVotes = 0;
        let maxAge = 18;
        
        Object.entries(voteCounts).forEach(([age, count]) => {
            if (count > maxVotes || (count === maxVotes && parseInt(age) > maxAge)) {
                maxVotes = count;
                maxAge = parseInt(age);
            }
        });

        return {
            average: maxAge,
            totalVotes: ratingData.votes.length,
            voteCounts: voteCounts
        };
    }

    updateRatingStats(ratings) {
        const stats = this.calculateRatingStats(ratings);
        const statsElement = document.querySelector('.rating-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="vote-stat">
                    <span>7+</span>
                    <div class="vote-count">${stats.voteCounts[7]} votes</div>
                </div>
                <div class="vote-stat">
                    <span>12+</span>
                    <div class="vote-count">${stats.voteCounts[12]} votes</div>
                </div>
                <div class="vote-stat">
                    <span>16+</span>
                    <div class="vote-count">${stats.voteCounts[16]} votes</div>
                </div>
                <div class="vote-stat">
                    <span>18+</span>
                    <div class="vote-count">${stats.voteCounts[18]} votes</div>
                </div>
            `;
        }
        const currentRatingElement = document.querySelector('.current-rating');
        if (currentRatingElement) {
            currentRatingElement.innerHTML = `<span>Current Rating: ${stats.average}+</span>`;
        }
    }

    highlightSelectedVote(age) {
        document.querySelectorAll('.vote-button').forEach(button => {
            button.classList.remove('selected');
            if (button.dataset.age === age.toString()) {
                button.classList.add('selected');
            }
        });
    }

    addVoteListeners() {
        document.querySelectorAll('.vote-button').forEach(button => {
            button.addEventListener('click', () => {
                const age = button.dataset.age;
                this.submitVote(age);
            });
        });
    }

    observeVideoChanges() {
        const observer = new MutationObserver((mutations) => {
            const hasRelevantChanges = mutations.some(mutation => 
                mutation.target.id === 'content' || 
                mutation.target.id === 'description' ||
                mutation.target.id === 'above-the-fold'
            );

            if (hasRelevantChanges) {
                const newVideoId = this.getVideoId();
                if (newVideoId !== this.videoId) {
                    console.log('Video changed, reinitializing...');
                    this.videoId = newVideoId;
                    this.init();
                } else {
                    this.debounce(() => this.checkAgeRestriction(), 1000);
                }
            }
        });
        
        const targetNode = document.querySelector('#content, #above-the-fold');
        if (targetNode) {
            observer.observe(targetNode, {
                childList: true,
                subtree: true,
                attributes: false
            });
        }

        // Also observe URL changes for SPA navigation
        const urlObserver = new MutationObserver(() => {
            const newVideoId = this.getVideoId();
            if (newVideoId !== this.videoId) {
                console.log('URL changed, reinitializing...');
                this.videoId = newVideoId;
                this.init();
            }
        });

        const bodyObserver = document.querySelector('body');
        if (bodyObserver) {
            urlObserver.observe(bodyObserver, {
                childList: true,
                subtree: true
            });
        }
    }

    async checkAgeRestriction() {
        try {
            if (!chrome.runtime?.id) {
                console.log('Extension context invalidated, reloading page...');
                window.location.reload();
                return;
            }

            const { userAge } = await chrome.storage.sync.get('userAge');
            if (!userAge) return;

            const ratingData = await this.fetchRatingData();
            const { average: requiredAge } = this.calculateRatingStats(ratingData);

            const video = document.querySelector('video');
            if (!video) return;

            if (userAge < requiredAge) {
                video.classList.add('blurred-video');
                video.pause();
                video.addEventListener('play', function preventPlay(e) {
                    e.preventDefault();
                    video.pause();
                });

                let warning = document.querySelector('.age-warning');
                if (!warning) {
                    warning = document.createElement('div');
                    warning.className = 'age-warning';
                    video.parentNode.insertBefore(warning, video.nextSibling);
                }
                warning.textContent = `This video requires age ${requiredAge}+. You are ${userAge} years old.`;
            } else {
                video.classList.remove('blurred-video');
                video.removeEventListener('play', function preventPlay(e) {
                    e.preventDefault();
                    video.pause();
                });
                const warning = document.querySelector('.age-warning');
                if (warning) warning.remove();
            }
        } catch (error) {
            console.error('Error checking age restriction:', error);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // Debounce utility
    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }
}

// Initialize on page load
new VideoAgeRating();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'NEW_VIDEO') {
        console.log('New video detected, reinitializing');
        new VideoAgeRating();
    } else if (request.type === 'AGE_UPDATED') {
        const ageRating = new VideoAgeRating();
        ageRating.checkAgeRestriction();
    }
});