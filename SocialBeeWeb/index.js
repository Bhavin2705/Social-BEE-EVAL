const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper functions
const ensureFileExists = async (filePath, defaultData = []) => {
    try {
        await fs.access(filePath);
    } catch (error) {
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
};

const readData = async (filePath) => {
    try {
        await ensureFileExists(filePath);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
};

const writeData = async (filePath, data) => {
    try {
        await ensureFileExists(filePath);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        throw error;
    }
};

// ====================== ROUTES ======================

// Route 1: Static Homepage
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'homePage.html')));

// Route 2: Static Messages Page
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));

// Route 3: Static Explore Page
app.get('/explore', (req, res) => res.sendFile(path.join(__dirname, 'public', 'explore.html')));

// Route 4: Static Register Page
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));

// Route 5: Static Login Page
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Route 6: Register User
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const users = await readData(path.join(__dirname, 'users.json'));
        const userExists = users.some(user => user.email === email);
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const newUser = { id: uuidv4(), name, email, password };
        users.push(newUser);
        await writeData(path.join(__dirname, 'users.json'), users);

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Failed to register user' });
    }
});

// Route 7: Login User
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const users = await readData(path.join(__dirname, 'users.json'));
        const user = users.find(user => user.email === email);

        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Failed to login' });
    }
});

// Route 8: Get All Posts (Read)
app.get('/api/posts', async (req, res) => {
    try {
        const messages = await readData(path.join(__dirname, 'messages.json'));
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
});

// Route 9: Create Post (Create)
app.post('/api/posts', async (req, res) => {
    try {
        const { message, userId } = req.body;
        if (!message || !userId) return res.status(400).json({ message: 'Message and userId are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const newMessage = { id: uuidv4(), message, userId, timestamp: new Date().toISOString(), likes: [], comments: [], bookmarks: [] };
        messages.push(newMessage);
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(201).json({ message: 'Post created successfully', data: newMessage });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

// Route 10: Update Post (Update)
app.put('/api/posts', async (req, res) => {
    try {
        const { messageId, message } = req.body;
        if (!messageId || !message) return res.status(400).json({ message: 'Message ID and message are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        messages[messageIndex].message = message;
        messages[messageIndex].timestamp = new Date().toISOString();
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(200).json({ message: 'Post updated successfully', data: messages[messageIndex] });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post' });
    }
});

// Route 11: Delete Post (Delete)
app.delete('/api/posts', async (req, res) => {
    try {
        const { messageId } = req.body;
        if (!messageId) return res.status(400).json({ message: 'Message ID is required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const filteredMessages = messages.filter(msg => msg.id !== messageId);

        if (messages.length === filteredMessages.length) return res.status(404).json({ message: 'Post not found' });

        await writeData(path.join(__dirname, 'messages.json'), filteredMessages);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post' });
    }
});

// Route 12: Like a Post
app.post('/api/like', async (req, res) => {
    try {
        const { messageId, userId } = req.body;
        if (!messageId || !userId) return res.status(400).json({ message: 'Message ID and user ID are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        if (!messages[messageIndex].likes.includes(userId)) {
            messages[messageIndex].likes.push(userId);
            await writeData(path.join(__dirname, 'messages.json'), messages);
        }

        res.status(200).json({ message: 'Post liked successfully', data: messages[messageIndex] });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: 'Failed to like post' });
    }
});

// Route 13: Unlike a Post
app.post('/api/unlike', async (req, res) => {
    try {
        const { messageId, userId } = req.body;
        if (!messageId || !userId) return res.status(400).json({ message: 'Message ID and user ID are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        messages[messageIndex].likes = messages[messageIndex].likes.filter(id => id !== userId);
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(200).json({ message: 'Post unliked successfully', data: messages[messageIndex] });
    } catch (error) {
        console.error('Error unliking post:', error);
        res.status(500).json({ message: 'Failed to unlike post' });
    }
});

// Route 14: Add Comment to Post
app.post('/api/comment', async (req, res) => {
    try {
        const { messageId, userId, comment } = req.body;
        if (!messageId || !userId || !comment) return res.status(400).json({ message: 'Message ID, user ID, and comment are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        const newComment = { id: uuidv4(), userId, comment, timestamp: new Date().toISOString() };
        messages[messageIndex].comments.push(newComment);
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(201).json({ message: 'Comment added successfully', data: newComment });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// Route 15: Get All Comments for Posts
app.get('/api/comments', async (req, res) => {
    try {
        const messages = await readData(path.join(__dirname, 'messages.json'));
        const allComments = messages.flatMap(msg => msg.comments);
        res.status(200).json(allComments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Failed to fetch comments' });
    }
});

// Route 16: Delete Comment from Post
app.delete('/api/comment', async (req, res) => {
    try {
        const { messageId, commentId } = req.body;
        if (!messageId || !commentId) return res.status(400).json({ message: 'Message ID and comment ID are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        messages[messageIndex].comments = messages[messageIndex].comments.filter(comment => comment.id !== commentId);
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Failed to delete comment' });
    }
});

// Route 17: Bookmark a Post
app.post('/api/bookmark', async (req, res) => {
    try {
        const { messageId, userId } = req.body;
        if (!messageId || !userId) return res.status(400).json({ message: 'Message ID and user ID are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        if (!messages[messageIndex].bookmarks.includes(userId)) {
            messages[messageIndex].bookmarks.push(userId);
            await writeData(path.join(__dirname, 'messages.json'), messages);
        }

        res.status(200).json({ message: 'Post bookmarked successfully', data: messages[messageIndex] });
    } catch (error) {
        console.error('Error bookmarking post:', error);
        res.status(500).json({ message: 'Failed to bookmark post' });
    }
});

// Route 18: Remove Bookmark from Post
app.post('/api/unbookmark', async (req, res) => {
    try {
        const { messageId, userId } = req.body;
        if (!messageId || !userId) return res.status(400).json({ message: 'Message ID and user ID are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return res.status(404).json({ message: 'Post not found' });

        messages[messageIndex].bookmarks = messages[messageIndex].bookmarks.filter(id => id !== userId);
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(200).json({ message: 'Bookmark removed successfully', data: messages[messageIndex] });
    } catch (error) {
        console.error('Error removing bookmark:', error);
        res.status(500).json({ message: 'Failed to remove bookmark' });
    }
});

// Route 19: Share a Post
app.post('/api/share', async (req, res) => {
    try {
        const { messageId, userId } = req.body;
        if (!messageId || !userId) return res.status(400).json({ message: 'Message ID and user ID are required' });

        // In a real app, this might send a notification or create a shared post; here, we'll just log it
        res.status(200).json({ message: 'Post shared successfully', data: { messageId, userId } });
    } catch (error) {
        console.error('Error sharing post:', error);
        res.status(500).json({ message: 'Failed to share post' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));