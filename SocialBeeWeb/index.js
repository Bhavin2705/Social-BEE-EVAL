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
        await fs.access(filePath); // Check if file exists
    } catch (error) {
        // If file doesn't exist, create it with default data
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
};

const readData = async (filePath) => {
    try {
        await ensureFileExists(filePath); // Ensure file exists
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
};

const writeData = async (filePath, data) => {
    try {
        await ensureFileExists(filePath); // Ensure file exists
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        throw error;
    }
};

// ====================== ROUTES ======================

// 1. Static HTML Routes (Non-CRUD)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'homePage.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));
app.get('/explore', (req, res) => res.sendFile(path.join(__dirname, 'public', 'explore.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// 2. POST Routes for Register and Login
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

// 3. Profile Routes (CRUD)
// CREATE
app.post('/api/profile', async (req, res) => {
    try {
        const { name, email, bio, profilePicture } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

        const users = await readData(path.join(__dirname, 'users.json'));
        const userExists = users.some(user => user.email === email);
        if (userExists) return res.status(400).json({ message: 'Profile with this email already exists' });

        const newProfile = { id: uuidv4(), name, email, bio, profilePicture };
        users.push(newProfile);
        await writeData(path.join(__dirname, 'users.json'), users);

        res.status(201).json({ message: 'Profile created successfully', profile: newProfile });
    } catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({ message: 'Failed to create profile' });
    }
});

// READ
app.get('/api/profile', async (req, res) => {
    try {
        const { email } = req.query; // Use query parameter to fetch profile
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const users = await readData(path.join(__dirname, 'users.json'));
        const user = users.find(user => user.email === email);
        if (!user) return res.status(404).json({ message: 'Profile not found' });

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ message: 'Failed to load profile data' });
    }
});

// UPDATE
app.put('/api/profile', async (req, res) => {
    try {
        const { email, name, bio, profilePicture } = req.body;
        if (!email || !name) return res.status(400).json({ message: 'Email and name are required' });

        const users = await readData(path.join(__dirname, 'users.json'));
        const userIndex = users.findIndex(user => user.email === email);
        if (userIndex === -1) return res.status(404).json({ message: 'Profile not found' });

        users[userIndex].name = name;
        if (bio) users[userIndex].bio = bio;
        if (profilePicture) users[userIndex].profilePicture = profilePicture;

        await writeData(path.join(__dirname, 'users.json'), users);
        res.status(200).json({ message: 'Profile updated successfully', user: users[userIndex] });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// DELETE
app.delete('/api/profile', async (req, res) => {
    try {
        const { email } = req.query; // Use query parameter to delete profile
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const users = await readData(path.join(__dirname, 'users.json'));
        const filteredUsers = users.filter(user => user.email !== email);

        if (users.length === filteredUsers.length) return res.status(404).json({ message: 'Profile not found' });

        await writeData(path.join(__dirname, 'users.json'), filteredUsers);
        res.status(200).json({ message: 'Profile deleted successfully' });
    } catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ message: 'Failed to delete profile' });
    }
});

// 4. Messages Routes (CRUD)
// CREATE
app.post('/messages', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') return res.status(400).json({ message: 'Message cannot be empty' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        messages.push({ id: uuidv4(), message, timestamp: new Date().toISOString() });
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(200).json({ message: 'Message saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing the request' });
    }
});

// READ
app.get('/messages', async (req, res) => {
    try {
        const messages = await readData(path.join(__dirname, 'messages.json'));
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// UPDATE
app.put('/messages', async (req, res) => {
    try {
        const { id, message } = req.body; // Use body to pass ID and updated message
        if (!id || !message || message.trim() === '') return res.status(400).json({ message: 'ID and message are required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const messageIndex = messages.findIndex(msg => msg.id === id);
        if (messageIndex === -1) return res.status(404).json({ message: 'Message not found' });

        messages[messageIndex].message = message;
        await writeData(path.join(__dirname, 'messages.json'), messages);

        res.status(200).json({ message: 'Message updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating message' });
    }
});

// DELETE
app.delete('/messages', async (req, res) => {
    try {
        const { id } = req.query; // Use query parameter to delete message
        if (!id) return res.status(400).json({ message: 'ID is required' });

        const messages = await readData(path.join(__dirname, 'messages.json'));
        const filteredMessages = messages.filter(msg => msg.id !== id);

        if (messages.length === filteredMessages.length) return res.status(404).json({ message: 'Message not found' });

        await writeData(path.join(__dirname, 'messages.json'), filteredMessages);
        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting message' });
    }
});

// 5. Friend Requests Routes (CRUD)
// CREATE
app.post('/api/friend-requests', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        if (!userId || !friendId) return res.status(400).json({ message: 'User ID and Friend ID are required' });

        const friendRequests = await readData(path.join(__dirname, 'friendRequests.json'));
        const newRequest = { id: uuidv4(), userId, friendId, status: 'pending' };
        friendRequests.push(newRequest);

        await writeData(path.join(__dirname, 'friendRequests.json'), friendRequests);
        res.status(201).json({ message: 'Friend request sent successfully', request: newRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending friend request' });
    }
});

// READ
app.get('/api/friend-requests', async (req, res) => {
    try {
        const friendRequests = await readData(path.join(__dirname, 'friendRequests.json'));
        res.status(200).json(friendRequests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching friend requests' });
    }
});

// UPDATE
app.put('/api/friend-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const friendRequests = await readData(path.join(__dirname, 'friendRequests.json'));
        const requestIndex = friendRequests.findIndex(request => request.id === id);
        if (requestIndex === -1) return res.status(404).json({ message: 'Friend request not found' });

        friendRequests[requestIndex].status = status;
        await writeData(path.join(__dirname, 'friendRequests.json'), friendRequests);

        res.status(200).json({ message: 'Friend request updated successfully', request: friendRequests[requestIndex] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating friend request' });
    }
});

// DELETE
app.delete('/api/friend-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const friendRequests = await readData(path.join(__dirname, 'friendRequests.json'));
        const filteredRequests = friendRequests.filter(request => request.id !== id);

        if (friendRequests.length === filteredRequests.length) return res.status(404).json({ message: 'Friend request not found' });

        await writeData(path.join(__dirname, 'friendRequests.json'), filteredRequests);
        res.status(200).json({ message: 'Friend request deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting friend request' });
    }
});

// 6. Reddit Posts Route (Non-CRUD)
app.get('/reddit-posts', async (req, res) => {
    try {
        const subreddit = req.query.subreddit || 'technology';
        const after = req.query.after || '';

        const response = await fetch(`https://www.reddit.com/r/${subreddit}/new.json?after=${after}`);
        if (!response.ok) throw new Error(`Failed to fetch data from Reddit: ${response.statusText}`);

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch Reddit posts' });
    }
});

// 7. Profile Page Rendering Route
app.get('/profile', async (req, res) => {
    try {
        const { email } = req.query; // Fetch email from query parameters
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const users = await readData(path.join(__dirname, 'users.json'));
        const user = users.find(user => user.email === email);

        if (!user) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Render the profile page with user data
        res.render('profile', { user });
    } catch (error) {
        console.error('Error rendering profile:', error);
        res.status(500).json({ message: 'Failed to render profile' });
    }
});

// 8. My Posts Page Rendering Route
app.get('/my-posts', async (req, res) => {
    try {
        const messages = await readData(path.join(__dirname, 'messages.json'));
        res.render('my-posts', { posts: messages });
    } catch (error) {
        console.error('Error rendering my-posts:', error);
        res.status(500).json({ message: 'Failed to render my-posts' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
