// ==========================================
// 1. GLOBAL VARIABLES & INITIALIZATION
// ==========================================
const currentUser = localStorage.getItem('socialUser');

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser && currentUser.trim() !== "") {
        if (document.getElementById('authSection')) document.getElementById('authSection').style.display = 'none';
        const mainApp = document.getElementById('mainPlatform');
        if (mainApp) mainApp.style.display = 'block';
        
        // Own Profile Card details load
        updateMyProfileCard();
        loadPosts();
    } else {
        const mainApp = document.getElementById('mainPlatform');
        if (mainApp) mainApp.style.display = 'none';
        if (document.getElementById('authSection')) document.getElementById('authSection').style.display = 'block';
    }
});

// Sidebar profile card update function 
function updateMyProfileCard() {
    if (!currentUser) return;
    
    const nameEl = document.getElementById('myCardUsername');
    if (nameEl) nameEl.innerText = `@${currentUser}`;

    fetch(`http://localhost:5000/api/social/profile/${currentUser}`)
        .then(res => res.json())
        .then(profile => {
            if (document.getElementById('myCardPosts')) document.getElementById('myCardPosts').innerText = profile.posts || 0;
            if (document.getElementById('myCardFollowers')) document.getElementById('myCardFollowers').innerText = profile.followers || 0;
            if (document.getElementById('myCardFollowing')) document.getElementById('myCardFollowing').innerText = profile.following || 0;
        })
        .catch(e => console.error("Error loading widget profile", e));
}

function showView(viewId) {
    if (!currentUser && viewId !== 'authSection') return;
    const views = ['authSection', 'mainPlatform', 'followersView'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = (v === viewId) ? 'block' : 'none';
    });
    const otherView = document.getElementById('otherUserProfileView');
    if (otherView && viewId !== 'otherUserProfileView') otherView.style.display = 'none';
}

// ==========================================
// 2. AUTHENTICATION (LOGIN, SIGNUP, LOGOUT)
// ==========================================
function handleLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    fetch('http://localhost:5000/api/social/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) alert(data.error);
        else {
            localStorage.setItem('socialUser', data.username);
            window.location.reload();
        }
    });
}

function handleSignup(event) {
    if (event) event.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    fetch('http://localhost:5000/api/social/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) alert(data.error);
        else {
            alert(data.message);
            window.location.reload();
        }
    });
}

function handleLogout() {
    localStorage.removeItem('socialUser');
    window.location.reload();
} 

// ==========================================
// 3. POSTS MANAGEMENT (LOAD, CREATE, LIKE, COMMENT) - UPDATED WITH FOLLOW BUTTON
// ==========================================
async function loadPosts() {
    const feed = document.getElementById('feed');
    if (!feed) return;

    try {
        const resPosts = await fetch('http://localhost:5000/api/posts');
        const posts = await resPosts.json();

        const resFollowers = await fetch('http://localhost:5000/api/followers');
        const followersData = await resFollowers.json();
        const rawFollowers = followersData.followers || [];

        const myFollowingSet = new Set();
        rawFollowers.forEach(r => {
            if (r.follower && r.follower.trim() === currentUser.trim()) {
                myFollowingSet.add(r.following.trim());
            }
        });

        feed.innerHTML = ''; 
        if (!posts || posts.length === 0) {
            feed.innerHTML = '<p style="text-align:center; color:#777; padding: 20px; background: white; border-radius: 8px;">No posts available yet.</p>';
            return;
        }

        posts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'card';
            
            const postUser = post.username ? post.username.trim() : '';
            const isMe = currentUser && postUser === currentUser.trim();
            const isFollowing = myFollowingSet.has(postUser);

            let followBtnHTML = '';
            if (!isMe && currentUser) {
                if (isFollowing) {
                    followBtnHTML = `
                        <button onclick="toggleFollowFromFeed('${postUser}')" style="background:#6c757d; color:white; border:none; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer;">
                            Unfollow
                        </button>`;
                } else {
                    followBtnHTML = `
                        <button onclick="toggleFollowFromFeed('${postUser}')" style="background:#007bff; color:white; border:none; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer;">
                            + Follow
                        </button>`;
                }
            }

            let commentsHTML = '';
            if (post.comments && post.comments.length > 0) {
                post.comments.forEach(c => {
                    commentsHTML += `<div style="background:#f8f9fa; padding:5px 10px; border-radius:4px; margin-top:5px; font-size:13px; border-left: 2px solid #007bff;"><strong>@${c.username}:</strong> ${c.text}</div>`;
                });
            }

            postCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h4 onclick="showUserProfile('${post.username}')" style="color: #007bff; cursor: pointer; margin: 0; font-size: 15px;">
                            👤 @${post.username}
                        </h4>
                        ${followBtnHTML} </div>
                    <small style="color:#999;">${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</small>
                </div>
                <p style="margin: 15px 0; line-height: 1.4; font-size:14px; color:#222;">${post.content}</p>
                <button onclick="likePost('${post._id}')" style="background:#e7f3ff; color:#007bff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">❤️ Like (${post.likes || 0})</button>
                <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                    <div id="comments-list-${post._id}">${commentsHTML}</div>
                    <div style="display: flex; margin-top: 10px; gap: 5px;">
                        <input type="text" id="commentInput-${post._id}" placeholder="Write a comment..." style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size:13px;">
                        <button onclick="submitComment('${post._id}')" style="background:#007bff; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px;">Send</button>
                    </div>
                </div>
            `;
            feed.appendChild(postCard);
        });
    } catch (err) {
        console.error("Error loading feed with follow state:", err);
    }
}

function toggleFollowFromFeed(targetUser) {
    if (!currentUser) return;
    
    fetch('http://localhost:5000/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUser, following: targetUser })
    })
    .then(() => {
        updateMyProfileCard(); 
                loadPosts();          
    })
    .catch(err => console.error("Error toggling follow from feed:", err));
}


function createPost() {
    const contentInput = document.getElementById('postContent');
    if (!contentInput || !contentInput.value.trim()) return;

    fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser || 'Anonymous', content: contentInput.value.trim() })
    })
    .then(() => { 
        contentInput.value = ''; 
        updateMyProfileCard(); 
        loadPosts(); 
    });
}

function likePost(postId) {
    fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
    }).then(() => loadPosts());
}

// Custom submit comment logic 
function submitComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    if (!input || !input.value.trim()) return;

    fetch(`http://localhost:5000/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, text: input.value.trim() })
    })
    .then(() => { input.value = ''; loadPosts(); });
}

// ==========================================
// 4. FOLLOWERS LIST VIEW (UPDATED TO SHOW INSIDE FEED AREA)
// ==========================================
async function showFollowersList() {
    const feed = document.getElementById('feed');
    if (!feed) return;

    feed.innerHTML = '<p style="text-align:center; padding:20px;">⏳ Loading followers list...</p>';

    try {
        const res = await fetch(`http://localhost:5000/api/followers`);
        const data = await res.json();
        
        feed.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; color:#333;">👥 Your Followers</h3>
                <button onclick="loadPosts()" style="background:#6c757d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px;">⬅ Back to Feed</button>
            </div>
        `;

        let rawList = data.followers || [];
        let myFollowers = rawList.filter(r => r.following && r.following.trim() === currentUser.trim());

        if (myFollowers.length === 0) {
            feed.innerHTML += '<p style="text-align:center; color:#777; padding:20px; background:white; border-radius:8px;">No followers yet.</p>';
            return;
        }

        myFollowers.forEach(r => {
            const row = document.createElement('div');
            row.className = 'card';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '12px 20px';
            row.style.marginBottom = '10px';

            row.innerHTML = `
                <span onclick="showUserProfile('${r.follower}')" style="color:#007bff; cursor:pointer; font-weight:bold;">👤 @${r.follower}</span>
                <button onclick="followUser('${r.follower}')" style="background:#007bff; color:white; border:none; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer;">
                    Follow Back
                </button>
            `;
            feed.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading followers list:", err);
        feed.innerHTML = '<p style="color:red; text-align:center;">Error loading followers list.</p>';
    }
}

function followUser(targetUser) {
    fetch('http://localhost:5000/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUser, following: targetUser })
    })
    .then(() => {
        updateMyProfileCard();
        showFollowersList();
    });
}

// ==========================================
// 5. OTHER USER PROFILE VIEW (VISITING PAGE) - UPDATED WITH DYNAMIC FOLLOW BUTTON
// ==========================================
async function showUserProfile(targetUser) {
    if (!targetUser) return;
    if (currentUser && targetUser.trim() === currentUser.trim()) return;

    const mainAppBox = document.getElementById('mainPlatform');
    if (mainAppBox) mainAppBox.style.display = 'none';

    let otherView = document.getElementById('otherUserProfileView');
    if (!otherView) {
        otherView = document.createElement('div');
        otherView.id = 'otherUserProfileView';
        otherView.className = 'container';
        document.body.appendChild(otherView);
    }
    
    otherView.style.display = 'block';
    otherView.innerHTML = `<p style="text-align:center; padding: 40px;">⏳ Loading @${targetUser}'s profile...</p>`;

    try {
        const resProfile = await fetch(`http://localhost:5000/api/social/profile/${targetUser}`);
        const profile = await resProfile.json();

        const resPosts = await fetch(`http://localhost:5000/api/social/posts/${targetUser}`);
        const posts = await resPosts.json();

        const resFollowers = await fetch('http://localhost:5000/api/followers');
        const followersData = await resFollowers.json();
        const rawFollowers = followersData.followers || [];

        let isFollowing = false;
        rawFollowers.forEach(r => {
            if (r.follower && r.follower.trim() === currentUser.trim() && 
                r.following && r.following.trim() === targetUser.trim()) {
                isFollowing = true;
            }
        });

        let followBtnHTML = '';
        if (isFollowing) {
            followBtnHTML = `
                <button onclick="followFromProfile('${targetUser}')" style="background:#6c757d; color:white; border:none; padding:8px 20px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:13px; transition: 0.2s;">
                    Unfollow
                </button>`;
        } else {
            followBtnHTML = `
                <button onclick="followFromProfile('${targetUser}')" style="background:#007bff; color:white; border:none; padding:8px 20px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:13px; transition: 0.2s;">
                    + Follow
                </button>`;
        }

        let postsHTML = '';
        posts.forEach(post => {
            postsHTML += `
                <div class="card" style="border-left: 4px solid #007bff;">
                    <p style="margin: 0 0 10px 0; font-weight: 500;">${post.content}</p>
                    <small style="color: #777;">❤️ ${post.likes || 0} Likes</small>
                </div>`;
        });

        otherView.innerHTML = `
            <button onclick="closeUserProfileView()" class="back-btn">⬅ Back to Feed</button>
            <div class="profile-card" style="margin-bottom: 25px;">
                <div class="profile-header-bg" style="background: linear-gradient(135deg, #6c757d, #adb5bd);"></div>
                <div class="profile-avatar">👤</div>
                <h3>@${profile.username || targetUser}</h3>
                <div style="margin-bottom: 20px;">
                    ${followBtnHTML} </div>
                <div class="profile-stats">
                    <div><strong class="stat-val">${profile.posts || 0}</strong><span class="stat-lbl">Posts</span></div>
                    <div><strong class="stat-val">${profile.followers || 0}</strong><span class="stat-lbl">Followers</span></div>
                    <div><strong class="stat-val">${profile.following || 0}</strong><span class="stat-lbl">Following</span></div>
                </div>
            </div>
            <h3 style="margin-top: 30px; color:#444;">📝 Recent Posts</h3>
            <div>${postsHTML || '<p style="text-align:center; color:#888;">No posts yet.</p>'}</div>
        `;
    } catch (e) {
        console.error("Error loading profile:", e);
        otherView.innerHTML = '<p style="color:red; text-align:center;">Error loading profile.</p>';
    }
}


// ==========================================
// FOLLOWING LIST VIEW
// ==========================================
async function showFollowingList() {
    const feed = document.getElementById('feed');
    if (!feed) return;

    feed.innerHTML = '<p style="text-align:center; padding:20px;">⏳ Loading following list...</p>';

    try {
        const res = await fetch('http://localhost:5000/api/followers');
        const data = await res.json();
        const rawFollowers = data.followers || [];

        const myFollowing = rawFollowers.filter(r => r.follower && r.follower.trim() === currentUser.trim());

        feed.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; color:#333;">👥 People You Follow</h3>
                <button onclick="loadPosts()" style="background:#6c757d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px;">⬅ Back to Feed</button>
            </div>
        `;

        if (myFollowing.length === 0) {
            feed.innerHTML += '<p style="text-align:center; color:#777; padding:20px; background:white; border-radius:8px;">You are not following anyone yet.</p>';
            return;
        }

        myFollowing.forEach(f => {
            const row = document.createElement('div');
            row.className = 'card';
            row.style.display = 'flex';
            row.style.justify = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '12px 20px';
            row.style.marginBottom = '10px';

            row.innerHTML = `
                <span onclick="showUserProfile('${f.following}')" style="color:#007bff; font-weight:bold; cursor:pointer;">👤 @${f.following}</span>
                <button onclick="toggleFollowFromFeed('${f.following}')" style="background:#6c757d; color:white; border:none; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer;">
                    Unfollow
                </button>
            `;
            feed.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading following list:", err);
        feed.innerHTML = '<p style="color:red; text-align:center;">Error loading following list.</p>';
    }
}

// ==========================================
// MY POSTS ONLY VIEW
// ==========================================
async function showMyPosts() {
    const feed = document.getElementById('feed');
    if (!feed) return;

    feed.innerHTML = '<p style="text-align:center; padding:20px;">⏳ Loading your posts...</p>';

    try {
        const res = await fetch('http://localhost:5000/api/posts');
        const posts = await res.json();

        const myPosts = posts.filter(post => post.username && post.username.trim() === currentUser.trim());

        feed.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; color:#333;">📝 My Published Posts</h3>
                <button onclick="loadPosts()" style="background:#6c757d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:13px;">⬅ Back to Feed</button>
            </div>
        `;

        if (myPosts.length === 0) {
            feed.innerHTML += '<p style="text-align:center; color:#777; padding:20px; background:white; border-radius:8px;">You haven\'t posted anything yet.</p>';
            return;
        }

        myPosts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'card';

            let commentsHTML = '';
            if (post.comments && post.comments.length > 0) {
                post.comments.forEach(c => {
                    commentsHTML += `<div style="background:#f8f9fa; padding:5px 10px; border-radius:4px; margin-top:5px; font-size:13px; border-left: 2px solid #007bff;"><strong>@${c.username}:</strong> ${c.text}</div>`;
                });
            }

            postCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: #222; margin: 0; font-size: 15px;">👤 @${post.username} (You)</h4>
                    <small style="color:#999;">${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</small>
                </div>
                <p style="margin: 15px 0; line-height: 1.4; font-size:14px; color:#222;">${post.content}</p>
                <div style="font-size: 13px; color: #007bff; font-weight: bold; margin-bottom: 10px;">❤️ Likes: ${post.likes || 0}</div>
                <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                    <div id="comments-list-${post._id}">${commentsHTML}</div>
                </div>
            `;
            feed.appendChild(postCard);
        });
    } catch (err) {
        console.error("Error loading my posts:", err);
        feed.innerHTML = '<p style="color:red; text-align:center;">Error loading posts.</p>';
    }
}

function showHomeFeed() {
    loadPosts();
}



function followFromProfile(targetUser) {
    fetch('http://localhost:5000/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUser, following: targetUser })
    })
    .then(() => {
        updateMyProfileCard();
        showUserProfile(targetUser);
    });
}

function closeUserProfileView() {
    const otherView = document.getElementById('otherUserProfileView');
    if (otherView) otherView.style.display = 'none';
    const mainAppBox = document.getElementById('mainPlatform');
    if (mainAppBox) mainAppBox.style.display = 'block';
    updateMyProfileCard();
    loadPosts();
}