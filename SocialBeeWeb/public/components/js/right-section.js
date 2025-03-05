document.addEventListener('DOMContentLoaded', () => {
    initializeFriendRequests();
    initializeTrending();
    initializeActivityFeed();
});

// Animation utility functions
const fadeIn = (element, duration = 300) => {
    element.style.opacity = 0;
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    setTimeout(() => (element.style.opacity = 1), 10);
};

const slideIn = (element, duration = 300) => {
    element.style.transform = 'translateX(20px)';
    element.style.opacity = 0;
    element.style.transition = `all ${duration}ms ease-out`;
    setTimeout(() => {
        element.style.transform = 'translateX(0)';
        element.style.opacity = 1;
    }, 10);
};

const slideOut = (element, duration = 300, callback) => {
    element.style.transform = 'translateX(-20px)';
    element.style.opacity = 0;
    element.style.transition = `all ${duration}ms ease-in`;
    setTimeout(() => {
        if (callback) callback();
    }, duration);
};

// Friend Requests Section
const initializeFriendRequests = async () => {
    const container = document.getElementById('friend-requests-container');
    const noRequests = document.getElementById('no-requests');
    const requestCount = document.getElementById('request-count');

    if (!container || !noRequests || !requestCount) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const updateFriendRequests = (requests) => {
        container.innerHTML = '';
        requestCount.textContent = requests.length;

        if (requests.length === 0) {
            noRequests.classList.remove('hidden');
            fadeIn(noRequests);
        } else {
            noRequests.classList.add('hidden');
            requests.forEach((request, index) => {
                const requestElement = createFriendRequestElement(request);
                container.appendChild(requestElement);
                setTimeout(() => slideIn(requestElement), index * 100);
            });
        }
    };

    const createFriendRequestElement = (request) => {
        const div = document.createElement('div');
        div.className =
            'flex items-center justify-between bg-white dark:bg-gray-600 p-3 rounded-lg shadow-sm';
        div.innerHTML = `
        <div class="flex items-center space-x-3">
          <img src="${request.avatar}" alt="${request.name}" class="w-10 h-10 rounded-full">
          <div>
            <p class="font-medium text-gray-800 dark:text-gray-100">${request.name}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">${request.mutualFriends} mutual friends</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="accept-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors duration-200">
            Accept
          </button>
          <button class="decline-btn bg-gray-200 hover:bg-gray-300 dark:bg-gray-500 dark:hover:bg-gray-400 text-gray-700 dark:text-gray-100 px-3 py-1 rounded-full transition-colors duration-200">
            Decline
          </button>
        </div>
      `;

        const handleResponse = () => {
            slideOut(div, 300, () => {
                div.remove();
                requests = requests.filter((r) => r.id !== request.id); // Remove request from the array
                updateFriendRequests(requests); // Update UI
            });
        };

        div.querySelector('.accept-btn').addEventListener('click', handleResponse);
        div.querySelector('.decline-btn').addEventListener('click', handleResponse);

        return div;
    };

    // Fetch friend requests from the backend
    const fetchFriendRequests = async (count) => {
        try {
            const response = await fetch(`https://randomuser.me/api/?results=${count}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('API Response:', data); // Log the response for inspection

            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Expected an array of friend requests in results');
            }

            return data.results.map((user, index) => ({
                id: index,
                name: `${user.name?.first || 'Unknown'} ${user.name?.last || ''}`,
                avatar: user.picture?.thumbnail || 'default-avatar.png',
                mutualFriends: Math.floor(Math.random() * 20) + 1,
            }));
        } catch (error) {
            console.error('Failed to fetch friend requests:', error);
            return [];
        }
    };

    let requests = await fetchFriendRequests(4); // Fetch 4 random friend requests
    updateFriendRequests(requests);
};

// Trending Section
const initializeTrending = () => {
    const container = document.getElementById('trending-container');
    const refreshBtn = document.getElementById('refresh-trends');

    if (!container || !refreshBtn) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const updateTrendingTopics = (topics) => {
        container.innerHTML = ''; // Clear existing topics
        topics.forEach((topic, index) => {
            const topicElement = createTrendingTopicElement(topic);
            container.appendChild(topicElement);
            setTimeout(() => fadeIn(topicElement), index * 100); // Add fade-in animation
        });
    };

    const createTrendingTopicElement = (topic) => {
        const div = document.createElement('div');
        div.className =
            'trending-topic bg-blue-500 text-white rounded-full px-4 py-2 text-sm hover:bg-blue-600 transition cursor-pointer';
        div.textContent = `${topic.tag}`; // Only display the topic name
        return div;
    };

    const mockTrends = [
        { tag: 'Technology' },
        { tag: 'Innovation' },
        { tag: 'Design' },
        { tag: 'Health' },
        { tag: 'Fitness' },
        { tag: 'Gaming' },
        { tag: 'Sports' },
    ];

    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('animate-spin'); // Add spin animation to refresh button
        setTimeout(() => {
            refreshBtn.classList.remove('animate-spin');
            const newTopics = mockTrends
                .sort(() => Math.random() - 0.5)
                .slice(0, 6); // Select 6 random topics
            updateTrendingTopics(newTopics);
        }, 1000);
    });

    // Initial load with 6 random topics
    updateTrendingTopics(mockTrends.slice(0, 6));
};

// Recent Activity Section
const initializeActivityFeed = () => {
    const feed = document.getElementById('activity-feed');
    const clearBtn = document.getElementById('clear-activity');

    if (!feed || !clearBtn) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const updateActivityFeed = (activities) => {
        feed.innerHTML = ''; // Clear existing feed

        activities.forEach((activity, index) => {
            const activityElement = createActivityElement(activity);
            feed.appendChild(activityElement);
            setTimeout(() => slideIn(activityElement), index * 100);
        });
    };

    const createActivityElement = ({ type, text, time }) => {
        const div = document.createElement('div');
        div.className = 'bg-white dark:bg-gray-600 p-3 rounded-lg shadow-sm';
        div.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-2 h-2 rounded-full ${type === 'like' ? 'bg-red-500' : 'bg-blue-500'}"></div>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300">${text}</p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${time}</p>`;
        return div;
    };

    clearBtn.addEventListener('click', () => {
        [...feed.children].forEach((activity, index) => {
            setTimeout(() => {
                activity.style.transition = 'all 300ms ease-out';
                activity.style.transform = 'translateX(20px)';
                activity.style.opacity = 0;
                setTimeout(() => activity.remove(), 300);
            }, index * 100);
        });
    });

    // Mock data
    const mockActivities = [
        { type: 'like', text: 'John liked your post', time: '2 minutes ago' },
        { type: 'comment', text: 'Sarah commented on your photo', time: '5 minutes ago' },
        { type: 'like', text: 'Mike liked your comment', time: '10 minutes ago' },
    ];
    updateActivityFeed(mockActivities);
};
