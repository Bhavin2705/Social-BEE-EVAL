document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // State Management
    let mediaFile = null;

    // Authentication Check
    function getCurrentUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    // Modal Management
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

    createPostBtn.addEventListener('click', () => {
        const user = getCurrentUser();
        if (!user) {
            alert("You must be logged in to create a post.");
            return;
        }
        toggleModal(true);
    });

    closeModalBtn.addEventListener('click', () => toggleModal(false));

    // Media Upload Handling
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

    // Add Media Upload Event Listeners
    uploadMediaButton.addEventListener('click', async () => {
        const { file, url } = await handleMediaUpload();
        mediaFile = file;
        mediaPreviewImage.src = url;
        mediaPreview.classList.remove('hidden');
    });

    uploadMediaButtonModal.addEventListener('click', async () => {
        const { file, url } = await handleMediaUpload();
        mediaFile = file;
        mediaPreviewImage.src = url;
        mediaPreview.classList.remove('hidden');
    });

    // Post Creation
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

        // Get posts from localStorage or initialize an empty array if none exist
        const posts = JSON.parse(localStorage.getItem('posts')) || [];

        // Add the new post to the array
        posts.push(newPost);

        // Save the updated posts array back to localStorage
        localStorage.setItem('posts', JSON.stringify(posts));

        toggleModal(false);

        // Create the toast message
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
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            </style>
            <div class="toast">
                Post created successfully!
            </div>
        `;

        document.body.appendChild(toastContainer);

        setTimeout(() => {
            toastContainer.remove();
        }, 4000);
    });

    // Render Post
    function renderPost(post) {
        const user = getCurrentUser();
        const postElement = document.createElement('div');
        postElement.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6';
        postElement.setAttribute('data-id', post.id);
        postElement.innerHTML = `
            <div class="flex items-center space-x-4">
                <img class="w-10 h-10 rounded-full" src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?crop=faces&fit=crop&w=200&h=200&q=80" alt="Profile Image">
                <div>
                    <p class="font-semibold text-gray-900 dark:text-white">${post.username}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(post.date).toLocaleString()}</p>
                </div>
            </div>
            <p class="mt-4 text-gray-700 dark:text-gray-300">${post.content}</p>
            ${post.media ? `<img src="${post.media}" alt="Post Media" class="mt-4 max-h-96 w-full object-cover rounded-lg">` : ''}
            <div class="mt-4 flex justify-between">
                ${user && user.username === post.username ? `
                    <button class="edit-post text-gray-500 hover:text-blue-500 transition-colors" data-id="${post.id}">Edit</button>
                    <button class="delete-post text-gray-500 hover:text-red-500 transition-colors" data-id="${post.id}">Delete</button>
                ` : ''}
            </div>
        `;
        postFeed.prepend(postElement);
    }

    // Story Management
    async function renderStories() {
        // Predefined stories with Unsplash images
        const predefinedStories = [
            { media: 'https://images.unsplash.com/photo-1521747116042-5e5f1460c53d', username: 'User One' },
            { media: 'https://images.unsplash.com/photo-1544179894-857a44036f32', username: 'User Two' },
            { media: 'https://images.unsplash.com/photo-1519891212291-f444f76e99d3', username: 'User Three' }
        ];

        // Fetch 3 random Indian users
        const response = await fetch('https://randomuser.me/api/?nat=in&results=3');
        const data = await response.json();
        const randomUsers = data.results.map(user => ({
            username: `${user.name.first} ${user.name.last}`,
            media: user.picture.large
        }));

        const stories = JSON.parse(localStorage.getItem('stories')) || [];
        const allStories = [...predefinedStories, ...randomUsers, ...stories];

        if (allStories.length === 0) {
            storyContainer.innerHTML = `<p class="text-gray-500">No stories yet.</p>`;
            return;
        }

        // Render stories with clickable images
        storyContainer.innerHTML = allStories.map(story => `
            <div class="story bg-gray-100 rounded-lg p-3 text-center">
                <a href="${story.media}" target="_blank">
                    <img src="${story.media}" alt="Story" class="w-16 h-16 rounded-full object-cover mx-auto cursor-pointer">
                </a>
                <p class="text-sm text-gray-700 mt-2">${story.username}</p>
            </div>
        `).join('');
    }

    // Add Story Button Click
    addStoryButton.addEventListener('click', async () => {
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

        renderStories();
    });

    // Edit and Delete Post
    postFeed.addEventListener('click', (e) => {
        const user = getCurrentUser();
        if (!user) return;

        if (e.target.classList.contains('edit-post')) {
            const postId = e.target.getAttribute('data-id');
            const posts = JSON.parse(localStorage.getItem('posts')) || [];
            const post = posts.find(p => p.id === postId);

            if (post && post.username === user.username) {
                postContent.value = post.content;
                toggleModal(true);
                submitPostBtn.onclick = () => updatePost(postId);
            }
        }

        if (e.target.classList.contains('delete-post')) {
            const postId = e.target.getAttribute('data-id');
            const posts = JSON.parse(localStorage.getItem('posts')) || [];
            const updatedPosts = posts.filter(p => p.id !== postId);

            localStorage.setItem('posts', JSON.stringify(updatedPosts));
            document.querySelector(`[data-id="${postId}"]`).remove();
        }
    });

    // Update Post
    function updatePost(postId) {
        const content = postContent.value.trim();
        if (!content && !mediaFile) {
            alert('Please write something or upload media!');
            return;
        }

        const posts = JSON.parse(localStorage.getItem('posts')) || [];
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        posts[postIndex] = {
            ...posts[postIndex],
            content,
            media: mediaFile ? URL.createObjectURL(mediaFile) : posts[postIndex].media
        };

        localStorage.setItem('posts', JSON.stringify(posts));
        toggleModal(false);

        // Re-render the post feed
        postFeed.innerHTML = '';
        posts.forEach(post => renderPost(post));
    }

    // Initial Load
    function init() {
        const posts = JSON.parse(localStorage.getItem('posts')) || [];
        posts.forEach(post => renderPost(post));
        renderStories();
    }

    init();
});