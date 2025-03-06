document.addEventListener('DOMContentLoaded', () => {
    const createPostBtn = document.getElementById('create-post-button');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const submitPostBtn = document.getElementById('submit-post');
    const postContent = document.getElementById('post-content');
    const postFeed = document.getElementById('post-feed');
    const uploadMediaButton = document.getElementById('upload-media-button');
    const uploadMediaButtonModal = document.getElementById('upload-media-button-modal');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImage = document.getElementById('media-preview-image');
    const storyContainer = document.getElementById('story-container');
    const addStoryButton = document.getElementById('add-story-button');

    let mediaFile = null;

    // Hardcoded fallback Indian user data for instant load
    const fallbackUsers = [
        { media: 'https://randomuser.me/api/portraits/women/1.jpg', username: 'Priya' },
        { media: 'https://randomuser.me/api/portraits/men/2.jpg', username: 'Rahul' },
        { media: 'https://randomuser.me/api/portraits/women/3.jpg', username: 'Aisha' }
    ];

    function getCurrentUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    function toggleModal(show = true) {
        createPostModal.classList.toggle('hidden', !show);
        if (show) {
            postContent.focus();
        } else {
            postContent.value = '';
            mediaPreview.classList.add('hidden');
            mediaFile = null;
        }
    }

    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            const user = getCurrentUser();
            if (!user) {
                alert("You must be logged in to create a post.");
                return;
            }
            toggleModal(true);
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => toggleModal(false));
    }

    function handleMediaUpload() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*, video/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve({ file, url: e.target.result });
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    }

    if (uploadMediaButton) {
        uploadMediaButton.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    if (uploadMediaButtonModal) {
        uploadMediaButtonModal.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', () => {
            const user = getCurrentUser();
            if (!user) {
                alert("You must be logged in to post.");
                return;
            }

            const content = postContent.value.trim();
            if (!content && !mediaFile) {
                alert('Please write something or upload media!');
                return;
            }

            const newPost = {
                id: Date.now().toString(),
                content: content,
                media: mediaFile ? URL.createObjectURL(mediaFile) : null,
                date: new Date().toISOString(),
                username: user.username
            };

            const posts = JSON.parse(localStorage.getItem('posts')) || [];
            posts.push(newPost);
            localStorage.setItem('posts', JSON.stringify(posts));

            toggleModal(false);

            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.classList.add('fixed', 'bottom-5', 'right-5', 'z-50');
            toastContainer.innerHTML = `
                <style>
                    .toast {
                        display: block;
                        padding: 12px;
                        background-color: #38a169;
                        color: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        font-size: 14px;
                        font-weight: 600;
                        animation: fadeInRight 0.5s forwards;
                    }
                    @keyframes fadeInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                <div class="toast">Post saved successfully!</div>
            `;
            document.body.appendChild(toastContainer);
            setTimeout(() => toastContainer.remove(), 4000);
        });
    }

    async function fetchIndianUsers() {
        try {
            const response = await fetch('https://randomuser.me/api/?nat=in&results=3&inc=name,picture');
            const data = await response.json();
            const indianUsers = data.results.map(user => ({
                media: user.picture.large,
                username: user.name.first
            }));
            localStorage.setItem('indianUsersCache', JSON.stringify({
                data: indianUsers,
                timestamp: Date.now()
            }));
            return indianUsers;
        } catch (error) {
            console.error('Error fetching Indian users:', error);
            return null;
        }
    }

    function getCachedUsers() {
        const cached = localStorage.getItem('indianUsersCache');
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        const isCacheValid = (Date.now() - timestamp) < 86400000; // 24-hour cache
        return isCacheValid ? data : null;
    }

    function renderStories(users) {
        if (!storyContainer) return;

        storyContainer.classList.add('flex', 'items-center', 'space-x-4', 'overflow-x-auto', 'pb-4');
        const addStoryHTML = addStoryButton.outerHTML;

        storyContainer.innerHTML = addStoryHTML + users.map(story => `
            <div class="story flex-shrink-0 text-center">
                <a href="${story.media}" target="_blank">
                    <img src="${story.media}" alt="Story" class="w-16 h-16 rounded-full object-cover cursor-pointer">
                </a>
                <p class="text-sm text-gray-700 mt-2">${story.username}</p>
            </div>
        `).join('');

        const newAddStoryButton = storyContainer.querySelector('#add-story-button');
        if (newAddStoryButton) {
            newAddStoryButton.addEventListener('click', handleAddStory);
        }
    }

    async function updateStories() {
        const cachedUsers = getCachedUsers();
        const initialUsers = cachedUsers || fallbackUsers;

        // Render immediately with cached or fallback data
        renderStories(initialUsers);

        // Fetch fresh data in the background
        const freshUsers = await fetchIndianUsers();
        if (freshUsers && JSON.stringify(freshUsers) !== JSON.stringify(initialUsers)) {
            renderStories(freshUsers);
        }
    }

    async function handleAddStory() {
        const user = getCurrentUser();
        if (!user) {
            alert("You must be logged in to add a story.");
            return;
        }

        const { file, url } = await handleMediaUpload();
        if (!file) return;

        const newStory = {
            id: Date.now().toString(),
            media: url,
            username: user.username
        };

        const stories = JSON.parse(localStorage.getItem('stories')) || [];
        stories.push(newStory);
        localStorage.setItem('stories', JSON.stringify(stories));

        updateStories();
    }

    if (addStoryButton) {
        addStoryButton.addEventListener('click', handleAddStory);
    }

    function init() {
        updateStories();
    }

    init();
});