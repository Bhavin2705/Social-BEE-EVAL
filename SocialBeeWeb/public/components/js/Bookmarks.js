const store = {
    data: JSON.parse(localStorage.getItem('bookmarks')) || [],
    save() {
        localStorage.setItem('bookmarks', JSON.stringify(this.data));
    },
    remove(id) {
        this.data = this.data.filter(item => item.id !== id);
        this.save();
    },
    update(post) {
        const idx = this.data.findIndex(p => p.id === post.id);
        if (idx !== -1) {
            this.data[idx] = post;
            this.save();
        }
    }
};

// User service
const userService = {
    async getRandomIndianUser() {
        try {
            const response = await fetch('https://randomuser.me/api/?nat=in');
            if (!response.ok) throw new Error('Failed to fetch user');

            const { results } = await response.json();
            const user = results[0];

            return {
                name: `${user.name.first} ${user.name.last}`,
                picture: user.picture.medium
            };
        } catch (err) {
            console.error('Error fetching random user:', err);
            return {
                name: 'Anonymous User',
                picture: 'https://via.placeholder.com/40'
            };
        }
    }
};

// UI helpers
const ui = {
    modal: document.getElementById('modal'),
    showModal(content) {
        this.modal.querySelector('#modal-content').innerHTML = content;
        this.modal.classList.remove('hidden');
    },
    hideModal() {
        this.modal.classList.add('hidden');
    },
    timeAgo(date) {
        const diff = (new Date() - new Date(date)) / 1000;
        const times = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, sec] of Object.entries(times)) {
            const count = Math.floor(diff / sec);
            if (count >= 1) {
                return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
            }
        }
        return 'just now';
    }
};

// Comment handling
class CommentManager {
    constructor(post) {
        this.post = post;
        this.comments = post.data.comments || [];
    }

    renderComment(comment) {
        return `
        <div class="flex gap-3 p-3 bg-gray-50 rounded-lg">
            <img src="${comment.picture}" alt="${comment.username}" class="w-10 h-10 rounded-full">
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <span class="font-medium">${comment.username}</span>
                    <time class="text-sm text-gray-500">${ui.timeAgo(comment.timestamp)}</time>
                </div>
                <p class="mt-1 text-gray-700">${comment.text}</p>
            </div>
        </div>
    `;
    }

    async addComment(text) {
        const user = await userService.getRandomIndianUser();
        const comment = {
            username: user.name,
            picture: user.picture,
            text: text,
            timestamp: new Date().toISOString()
        };

        this.comments.push(comment);
        this.post.data.comments = this.comments;
        store.update(this.post.data);

        return this.renderComment(comment);
    }

    render() {
        return `
        <div class="comments-list max-h-96 overflow-y-auto">
            ${this.comments.length ?
                this.comments.map(c => this.renderComment(c)).join('') :
                '<p class="text-center text-gray-500 py-4">No comments yet. Be the first to comment!</p>'
            }
        </div>
        <form class="comment-form mt-4 pt-4 border-t">
            <textarea 
                class="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" 
                rows="3" 
                placeholder="Write a comment..."
                required
            ></textarea>
            <button type="submit" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Post Comment
            </button>
        </form>
    `;
    }
}

// Post handling
class Post {
    constructor(data) {
        this.data = data;
        this.element = this.createPost();
        this.bindEvents();
    }

    createPost() {
        const post = document.createElement('article');
        post.className = 'post bg-white p-4 rounded-lg shadow-sm';
        post.innerHTML = `
    <div class="flex gap-4 items-center">
        <div class="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div>
            <p class="font-medium">${this.data.username}</p>
            <time class="text-sm text-gray-500">${ui.timeAgo(this.data.date)}</time>
        </div>
    </div>
    <p class="mt-4">${this.data.content}</p>
    ${this.data.media ? `
        <div class="relative mt-4 cursor-pointer group">
            <img src="${this.data.media}" class="w-full rounded-lg">
            <div class="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                View Post
            </div>
        </div>
    ` : ''}
    <div class="flex justify-between mt-4 text-gray-600">
        <button class="like flex items-center gap-1 hover:text-red-500 transition-colors">
            <i class="fas fa-heart"></i> <span>${this.data.likes || 0}</span>
        </button>
        <button class="comments flex items-center gap-1 hover:text-blue-500 transition-colors">
            <i class="fas fa-comments"></i> <span>${this.data.comments?.length || 0}</span>
        </button>
        <button class="share hover:text-blue-500 transition-colors">
            <i class="fas fa-share"></i> Share
        </button>
        <button class="remove hover:text-red-500 transition-colors">Remove</button>
    </div>
`;
        return post;
    }

    bindEvents() {
        this.element.querySelector('.like').onclick = () => this.handleLike();
        this.element.querySelector('.comments').onclick = () => this.showComments();
        this.element.querySelector('.share').onclick = () => this.handleShare();
        this.element.querySelector('.remove').onclick = () => this.handleRemove();

        const img = this.element.querySelector('img');
        if (img) {
            img.onclick = () => window.open(this.data.media, '_blank');
        }
    }

    handleLike() {
        this.data.likes = (this.data.likes || 0) + 1;
        this.element.querySelector('.like span').textContent = this.data.likes;
        store.update(this.data);
    }

    showComments() {
        const commentManager = new CommentManager(this);
        ui.showModal(commentManager.render());

        // Bind form submission
        const form = document.querySelector('.comment-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const textarea = form.querySelector('textarea');
            const text = textarea.value.trim();

            if (text) {
                const commentHTML = await commentManager.addComment(text);
                const commentsList = document.querySelector('.comments-list');

                if (commentsList.querySelector('p')) {
                    commentsList.innerHTML = '';
                }

                commentsList.insertAdjacentHTML('beforeend', commentHTML);
                textarea.value = '';

                // Update comment count in post
                this.element.querySelector('.comments span').textContent =
                    this.data.comments.length;
            }
        };
    }

    handleShare() {
        navigator.share?.({
            title: this.data.content,
            url: this.data.media
        }).catch(console.error);
    }

    handleRemove() {
        if (confirm('Remove this bookmark?')) {
            this.element.style.opacity = '0';
            setTimeout(() => {
                this.element.remove();
                store.remove(this.data.id);

                // Check if there are no bookmarks left
                const container = document.getElementById('bookmarks');
                if (!store.data.length) {
                    container.innerHTML = `
                        <div class="text-center py-12 text-gray-500">
                            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z">
                                </path>
                            </svg>
                            <h3 class="text-lg font-medium">No bookmarks yet</h3>
                            <p>Your saved posts will appear here</p>
                        </div>
                    `;
                }
            }, 200);
        }
    }
}

// Init
function init() {
    const container = document.getElementById('bookmarks');

    if (!store.data.length) {
        container.innerHTML = `
        <div class="text-center py-12 text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z">
                </path>
            </svg>
            <h3 class="text-lg font-medium">No bookmarks yet</h3>
            <p>Your saved posts will appear here</p>
        </div>
    `;
        return;
    }

    store.data.forEach(post => {
        container.appendChild(new Post(post).element);
    });
}

// Event listeners
document.querySelector('.modal-close').onclick = () => ui.hideModal();
document.addEventListener('DOMContentLoaded', init);