console.log("<<<<<<<<< Background.js file started >>>>>>>>")

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes('youtube.com/watch')) {
        chrome.tabs.sendMessage(tabId, {
            type: 'NEW_VIDEO',
            videoId: new URL(changeInfo.url).searchParams.get('v')
        });
    }
});

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open popup for initial age input
        chrome.action.openPopup();
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'NEW_VIDEO') {
        // Reinitialize the rating system for the new video
        new VideoAgeRating();
    }
});