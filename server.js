const express = require('express');
const path = require('path');
const Datastore = require('@seald-io/nedb');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const postsDB = new Datastore({ filename: 'posts.db', autoload: true });
const usersDB = new Datastore({ filename: 'social_users.db', autoload: true });
const followersDB = new Datastore({ filename: 'followers.db', autoload: true });

// 1. Get All Feed Posts
app.get('/api/posts', (req, res) => {
    postsDB.find({}).sort({ createdAt: -1 }).exec((err, posts) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(posts);
    });
});

// 2. Create Post
app.post('/api/posts', (req, res) => {
    const { username, content } = req.body;
    const newPost = { username, content, likes: 0, likedBy: [], comments: [], createdAt: new Date() };
    postsDB.insert(newPost, (err, doc) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(doc);
    });
});

// 3. Get User Specific Posts
app.get('/api/social/posts/:username', (req, res) => {
    const user = req.params.username;
    postsDB.find({ username: user }).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) return res.status(500).json([]);
        res.json(docs || []);
    });
});

// 4. Sign Up
app.post('/api/social/signup', (req, res) => {
    const { username, email, password } = req.body;
    usersDB.findOne({ email: email }, (err, user) => {
        if (user) return res.status(400).json({ error: "Email already exists!" });
        usersDB.insert({ username, email, password }, (err, doc) => {
            if (err) return res.status(500).json({ error: "Database error!" });
            res.json({ success: true, message: "Account created successfully! 🎉" });
        });
    });
});

// 5. Login
app.post('/api/social/login', (req, res) => {
    const { email, password } = req.body;
    usersDB.findOne({ email: email, password: password }, (err, user) => {
        if (err || !user) return res.status(400).json({ error: "Invalid Email or Password! ❌" });
        res.json({ success: true, username: user.username });
    });
});

// 6. Like Post
app.post('/api/posts/:id/like', (req, res) => {
    const postId = req.params.id;
    const { username } = req.body;
    postsDB.findOne({ _id: postId }, (err, post) => {
        if (!post) return res.status(404).json({ error: "Post not found" });
        let likedBy = post.likedBy || [];
        let likes = post.likes || 0;
        if (likedBy.includes(username)) {
            likedBy = likedBy.filter(user => user !== username);
            likes--;
        } else {
            likedBy.push(username);
            likes++;
        }
        postsDB.update({ _id: postId }, { $set: { likes, likedBy } }, {}, () => {
            res.json({ success: true, likes, likedBy });
        });
    });
});

// 7. Add Comment
app.post('/api/posts/:id/comment', (req, res) => {
    const postId = req.params.id;
    const { username, text } = req.body;
    postsDB.update({ _id: postId }, { $push: { comments: { username, text, createdAt: new Date() } } }, {}, (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ success: true });
    });
});

// 8. Dynamic Profile Statistics Route
app.get('/api/social/profile/:username', (req, res) => {
    const user = req.params.username ? req.params.username.trim() : "";
    if (!user) return res.json({ username: "Unknown", posts: 0, followers: 0, following: 0 });

    postsDB.count({ username: user }, (err, postCount) => {
        const pCount = err ? 0 : (postCount || 0);
        followersDB.count({ following: user }, (err, followerCount) => {
            const ferCount = err ? 0 : (followerCount || 0);
            followersDB.count({ follower: user }, (err, followingCount) => {
                const fingCount = err ? 0 : (followingCount || 0);
                res.json({ username: user, posts: pCount, followers: ferCount, following: fingCount });
            });
        });
    });
});

// 9. Follow / Unfollow
app.post('/api/social/follow', (req, res) => {
    const { follower, following } = req.body;
    if (follower === following) return res.status(400).json({ error: "You cannot follow yourself!" });
    followersDB.findOne({ follower, following }, (err, record) => {
        if (record) {
            followersDB.remove({ follower, following }, {}, () => res.json({ success: true }));
        } else {
            followersDB.insert({ follower, following, createdAt: new Date() }, () => res.json({ success: true }));
        }
    });
});

// 10. Followers list raw fetch
app.get('/api/followers', (req, res) => {
    followersDB.find({}, (err, docs) => {
        if (err) return res.status(500).json({ followers: [] });
        res.json({ followers: docs || [] });
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));