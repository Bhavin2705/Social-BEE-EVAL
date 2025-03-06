const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios'); // Replaced node-fetch with axios

const app = express();
const PORT = process.env.PORT || 7000;

// Enable CORS for all routes
app.use(cors());

// File paths
const FILES = {
    users: path.join(__dirname, 'users.json'),
    messages: path.join(__dirname, 'messages.json'),
    friendRequests: path.join(__dirname, 'friendRequests.json')
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure file exists and read data
async function readFileData(filePath) {
    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, JSON.stringify([]));
    }
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data || '[]');
}

// Write data to file
async function writeFileData(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Generate a random ID between 1 and 1000
function generateRandomId() {
    return Math.floor(Math.random() * 1000) + 1;
}

// ====================== ROUTES ======================

// Static Routes
app.get(['/', '/messages', '/explore', '/register', '/login'], (req, res) => {
    const page = req.path === '/' ? 'homePage' : req.path.slice(1);
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
});

// User/Auth Routes
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const data = await readFileData(FILES.users);
        const newUser = { id: generateRandomId(), name, email, password };
        data.push(newUser);
        await writeFileData(FILES.users, data);
        res.json({ message: 'User registered', user: newUser });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const data = await readFileData(FILES.users);
        const user = data.find(u => u.email === email && u.password === password);
        if (user) {
            res.json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ message: 'Login failed' });
        }
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
});

app.get('/profile', async (req, res) => {
    try {
        const data = await readFileData(FILES.users);
        res.render('profile.ejs', { user: data[0] || {} });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Error fetching profile', error: err.message });
    }
});

app.post('/api/profile/update', async (req, res) => {
    try {
        const { name, email } = req.body;
        const data = await readFileData(FILES.users);
        if (data[0]) {
            data[0] = { ...data[0], name, email };
            await writeFileData(FILES.users, data);
            res.json({ message: 'Profile updated', user: data[0] });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Error updating profile', error: err.message });
    }
});

app.post('/api/profile/password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        const data = await readFileData(FILES.users);
        if (data[0]) {
            data[0].password = newPassword;
            await writeFileData(FILES.users, data);
            res.json({ message: 'Password updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ message: 'Error updating password', error: err.message });
    }
});

// Messages Routes
app.post('/api/messages', async (req, res) => {
    try {
        const { message, userId } = req.body;
        const data = await readFileData(FILES.messages);
        const newMessage = {
            id: generateRandomId(),
            userId: userId || 'test-user',
            message,
            timestamp: new Date().toISOString(),
            likes: [],
            shares: [],
            comments: [],
            bookmarks: []
        };
        data.push(newMessage);
        await writeFileData(FILES.messages, data);
        res.json({ message: 'Message posted', post: newMessage });
    } catch (err) {
        console.error('Error posting message:', err);
        res.status(500).json({ message: 'Error posting message', error: err.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const data = await readFileData(FILES.messages);
        res.json(data);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Error fetching messages', error: err.message });
    }
});

app.put('/api/messages', async (req, res) => {
    try {
        const { id, message } = req.body;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            data[msgIndex].message = message;
            await writeFileData(FILES.messages, data);
            res.json({ message: 'Message updated', post: data[msgIndex] });
        } else {
            res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        console.error('Error updating message:', err);
        res.status(500).json({ message: 'Error updating message', error: err.message });
    }
});

app.delete('/api/messages', async (req, res) => {
    try {
        const { id } = req.query;
        console.log('Deleting message with id:', id); // Log the id
        let data = await readFileData(FILES.messages);
        console.log('Initial data:', data); // Log initial data
        data = data.filter(m => m.id !== Number(id));
        console.log('Updated data:', data); // Log updated data
        await writeFileData(FILES.messages, data);
        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ message: 'Error deleting message', error: err.message });
    }
});

// Likes
app.post('/api/messages/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1 && !data[msgIndex].likes.includes('test-user')) {
            data[msgIndex].likes.push('test-user');
            await writeFileData(FILES.messages, data);
        }
        res.json({ message: 'Liked', likes: data[msgIndex]?.likes });
    } catch (err) {
        console.error('Error liking message:', err);
        res.status(500).json({ message: 'Error liking message', error: err.message });
    }
});

app.post('/api/messages/:id/unlike', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            data[msgIndex].likes = data[msgIndex].likes.filter(user => user !== 'test-user');
            await writeFileData(FILES.messages, data);
        }
        res.json({ message: 'Unliked', likes: data[msgIndex]?.likes });
    } catch (err) {
        console.error('Error unliking message:', err);
        res.status(500).json({ message: 'Error unliking message', error: err.message });
    }
});

// Shares
app.post('/api/messages/:id/share', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            data[msgIndex].shares.push({ userId: 'test-user', timestamp: new Date().toISOString() });
            await writeFileData(FILES.messages, data);
        }
        res.json({ message: 'Shared', shares: data[msgIndex]?.shares });
    } catch (err) {
        console.error('Error sharing message:', err);
        res.status(500).json({ message: 'Error sharing message', error: err.message });
    }
});

// Comments
app.post('/api/messages/:id/comment', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            const comment = { id: generateRandomId(), userId: 'test-user', content, timestamp: new Date().toISOString() };
            data[msgIndex].comments.push(comment);
            await writeFileData(FILES.messages, data);
            res.json({ message: 'Commented', comment });
        } else {
            res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        console.error('Error commenting on message:', err);
        res.status(500).json({ message: 'Error commenting on message', error: err.message });
    }
});

app.put('/api/messages/:id/comment/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { content } = req.body;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            const commentIndex = data[msgIndex].comments.findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                data[msgIndex].comments[commentIndex].content = content;
                await writeFileData(FILES.messages, data);
                res.json({ message: 'Comment updated', comment: data[msgIndex].comments[commentIndex] });
            } else {
                res.status(404).json({ message: 'Comment not found' });
            }
        } else {
            res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        console.error('Error updating comment:', err);
        res.status(500).json({ message: 'Error updating comment', error: err.message });
    }
});

app.delete('/api/messages/:id/comment/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            data[msgIndex].comments = data[msgIndex].comments.filter(c => c.id !== commentId);
            await writeFileData(FILES.messages, data);
            res.json({ message: 'Comment deleted' });
        } else {
            res.status(404).json({ message: 'Message not found' });
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ message: 'Error deleting comment', error: err.message });
    }
});

// Bookmarks
app.post('/api/messages/:id/bookmark', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1 && !data[msgIndex].bookmarks.includes('test-user')) {
            data[msgIndex].bookmarks.push('test-user');
            await writeFileData(FILES.messages, data);
        }
        res.json({ message: 'Bookmarked', bookmarks: data[msgIndex]?.bookmarks });
    } catch (err) {
        console.error('Error bookmarking message:', err);
        res.status(500).json({ message: 'Error bookmarking message', error: err.message });
    }
});

app.post('/api/messages/:id/unbookmark', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.messages);
        const msgIndex = data.findIndex(m => m.id === id);
        if (msgIndex !== -1) {
            data[msgIndex].bookmarks = data[msgIndex].bookmarks.filter(user => user !== 'test-user');
            await writeFileData(FILES.messages, data);
        }
        res.json({ message: 'Unbookmarked', bookmarks: data[msgIndex]?.bookmarks });
    } catch (err) {
        console.error('Error unbookmarking message:', err);
        res.status(500).json({ message: 'Error unbookmarking message', error: err.message });
    }
});

// Friend Requests Routes
app.post('/api/friend-requests', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        const data = await readFileData(FILES.friendRequests);
        const request = { id: generateRandomId(), userId, friendId, status: 'pending' };
        data.push(request);
        await writeFileData(FILES.friendRequests, data);
        res.json({ message: 'Friend request sent', request });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ message: 'Error sending friend request', error: err.message });
    }
});

app.get('/api/friend-requests', async (req, res) => {
    try {
        const data = await readFileData(FILES.friendRequests);
        res.json(data);
    } catch (err) {
        console.error('Error fetching friend requests:', err);
        res.status(500).json({ message: 'Error fetching friend requests', error: err.message });
    }
});

app.put('/api/friend-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const data = await readFileData(FILES.friendRequests);
        const requestIndex = data.findIndex(r => r.id === id);
        if (requestIndex !== -1) {
            data[requestIndex].status = status;
            await writeFileData(FILES.friendRequests, data);
            res.json({ message: 'Friend request updated', request: data[requestIndex] });
        } else {
            res.status(404).json({ message: 'Friend request not found' });
        }
    } catch (err) {
        console.error('Error updating friend request:', err);
        res.status(500).json({ message: 'Error updating friend request', error: err.message });
    }
});

app.delete('/api/friend-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let data = await readFileData(FILES.friendRequests);
        data = data.filter(r => r.id !== id);
        await writeFileData(FILES.friendRequests, data);
        res.json({ message: 'Friend request deleted' });
    } catch (err) {
        console.error('Error deleting friend request:', err);
        res.status(500).json({ message: 'Error deleting friend request', error: err.message });
    }
});

// External View Routes
app.get('/reddit-posts', async (req, res) => {
    const subreddit = req.query.subreddit || 'technology';
    const after = req.query.after || '';
    if (!/^[a-zA-Z0-9_]+$/.test(subreddit)) {
        return res.status(400).json({ error: 'Invalid subreddit name' });
    }
    try {
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/new.json?after=${after}`, {
            headers: {
                'User-Agent': 'SocialApp/1.0' // Add a User-Agent header
            }
        });
        if (response.status !== 200) {
            throw new Error(`Reddit API returned status: ${response.status}`);
        }
        res.json(response.data);
    } catch (err) {
        console.error('Error fetching Reddit posts:', err);
        res.status(500).json({ message: 'Error fetching Reddit posts', error: err.message });
    }
});

app.get('/my-posts', async (req, res) => {
    try {
        const data = await readFileData(FILES.messages);
        res.json(data);
    } catch (err) {
        console.error('Error fetching my posts:', err);
        res.status(500).json({ message: 'Error fetching my posts', error: err.message });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
