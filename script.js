// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const newUsernameInput = document.getElementById('new-username-input');
const newPasswordInput = document.getElementById('new-password-input');
const confirmPasswordInput = document.getElementById('confirm-password-input');

const userProfileBtn = document.getElementById('user-profile-btn');
const profileSidebar = document.getElementById('profile-sidebar');
const profilePic = document.getElementById('profile-pic');
const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
const headerUsername = document.getElementById('header-username');
const sidebarUsername = document.getElementById('sidebar-username');
const joinDateSpan = document.getElementById('join-date-span');
const profileDescription = document.getElementById('profile-description');
const editDescBtn = document.getElementById('edit-desc-btn');
const editUsernameBtn = document.getElementById('edit-username-btn');
const changePicBtn = document.getElementById('change-pic-btn');
const profilePicUpload = document.getElementById('profile-pic-upload');

const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomModal = document.getElementById('create-room-modal');
const joinRoomModal = document.getElementById('join-room-modal');
const confirmCreateRoom = document.getElementById('confirm-create-room');
const confirmJoinRoom = document.getElementById('confirm-join-room');
const roomCodeInput = document.getElementById('room-code-input');
const closeModals = document.querySelectorAll('.close-modal');

const chatRoom = document.getElementById('chat-room');
const roomCodeDisplay = document.getElementById('room-code-display');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');

// App State
let currentUser = null;
let currentRoom = null;
let deviceId = null;
let lastUsernameChange = null;
let usernameChangeTimeout = null;

// Initialize FingerprintJS
FingerprintJS.load()
    .then(fp => fp.get())
    .then(result => {
        deviceId = result.visitorId;
        checkExistingAccount();
    })
    .catch(err => {
        console.error('Error getting device ID:', err);
        // Fallback to a random ID if fingerprint fails
        deviceId = 'fallback-' + Math.random().toString(36).substring(2, 15);
        checkExistingAccount();
    });

// Check if device already has an account
function checkExistingAccount() {
    database.ref('deviceAccounts/' + deviceId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const userId = snapshot.val();
                database.ref('users/' + userId).once('value')
                    .then(userSnapshot => {
                        if (userSnapshot.exists()) {
                            // Auto-fill login form
                            usernameInput.value = userSnapshot.val().username;
                        }
                    });
            }
        });
}

// Toggle between login and register forms
showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Register new account
registerBtn.addEventListener('click', registerUser);

function registerUser() {
    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!username || !password) {
        alert('Please enter a username and password');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Check if username is already taken
    database.ref('usernames').once('value')
        .then(snapshot => {
            if (snapshot.hasChild(username)) {
                alert('Username already taken');
                return;
            }

            // Create new user
            const newUserRef = database.ref('users').push();
            const userId = newUserRef.key;
            const joinDate = new Date().toISOString();

            const userData = {
                username: username,
                password: password, // Note: In a real app, you should hash passwords
                deviceIds: { [deviceId]: true },
                joinDate: joinDate,
                lastUsernameChange: joinDate,
                description: "Hello! I'm new here.",
                title: "User"
            };

            // Save user data
            newUserRef.set(userData)
                .then(() => {
                    // Save username reference
                    database.ref('usernames/' + username).set(userId);
                    
                    // Save device reference
                    database.ref('deviceAccounts/' + deviceId).set(userId);
                    
                    // Login the new user
                    loginSuccess(userId, userData);
                })
                .catch(error => {
                    console.error('Error creating user:', error);
                    alert('Error creating account. Please try again.');
                });
        });
}

// Login existing user
loginBtn.addEventListener('click', loginUser);

function loginUser() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }

    // Check if username exists
    database.ref('usernames/' + username).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('Username not found');
                return;
            }

            const userId = snapshot.val();
            
            // Get user data
            database.ref('users/' + userId).once('value')
                .then(userSnapshot => {
                    const userData = userSnapshot.val();
                    
                    // Check password
                    if (userData.password !== password) {
                        alert('Incorrect password');
                        return;
                    }
                    
                    // Add device ID if not already associated
                    if (!userData.deviceIds || !userData.deviceIds[deviceId]) {
                        database.ref('users/' + userId + '/deviceIds/' + deviceId).set(true);
                        database.ref('deviceAccounts/' + deviceId).set(userId);
                    }
                    
                    // Login successful
                    loginSuccess(userId, userData);
                });
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Error logging in. Please try again.');
        });
}

function loginSuccess(userId, userData) {
    currentUser = {
        id: userId,
        ...userData
    };
    
    // Update UI
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    // Load user profile
    loadUserProfile();
    
    // Check for username change availability
    checkUsernameChangeAvailability();
    
    // Start inactive room checker
    setInterval(checkInactiveRooms, 60000); // Check every minute
}

function loadUserProfile() {
    headerUsername.textContent = currentUser.username;
    sidebarUsername.textContent = currentUser.username;
    
    const joinDate = new Date(currentUser.joinDate);
    joinDateSpan.textContent = joinDate.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
    
    if (currentUser.description) {
        profileDescription.textContent = currentUser.description;
    }
    
    // Load profile picture
    if (currentUser.profilePic) {
        storage.ref(currentUser.profilePic).getDownloadURL()
            .then(url => {
                profilePic.src = url;
                sidebarProfilePic.src = url;
            })
            .catch(error => {
                console.error('Error loading profile picture:', error);
            });
    }
}

function checkUsernameChangeAvailability() {
    const now = new Date();
    const lastChange = new Date(currentUser.lastUsernameChange);
    const daysSinceChange = (now - lastChange) / (1000 * 60 * 60 * 24);
    
    if (daysSinceChange >= 2) {
        editUsernameBtn.disabled = false;
        editUsernameBtn.textContent = "Edit Username";
        if (usernameChangeTimeout) {
            clearTimeout(usernameChangeTimeout);
        }
    } else {
        editUsernameBtn.disabled = true;
        const hoursLeft = Math.ceil((2 * 24) - (daysSinceChange * 24));
        editUsernameBtn.textContent = `Edit Username (available in ${hoursLeft} hours)`;
        
        // Update the button when time is up
        const timeUntilAvailable = (2 * 24 * 60 * 60 * 1000) - (now - lastChange);
        if (timeUntilAvailable > 0) {
            usernameChangeTimeout = setTimeout(() => {
                editUsernameBtn.disabled = false;
                editUsernameBtn.textContent = "Edit Username";
            }, timeUntilAvailable);
        }
    }
}

// Profile sidebar toggle
userProfileBtn.addEventListener('click', () => {
    profileSidebar.classList.toggle('hidden');
});

// Edit description
editDescBtn.addEventListener('click', () => {
    const currentDesc = profileDescription.textContent;
    const newDesc = prompt("Edit your profile description:", currentDesc);
    
    if (newDesc !== null && newDesc !== currentDesc) {
        database.ref('users/' + currentUser.id + '/description').set(newDesc)
            .then(() => {
                currentUser.description = newDesc;
                profileDescription.textContent = newDesc;
            })
            .catch(error => {
                console.error('Error updating description:', error);
                alert('Error updating description. Please try again.');
            });
    }
});

// Edit username
editUsernameBtn.addEventListener('click', () => {
    const newUsername = prompt("Enter new username (can only change every 2 days):", currentUser.username);
    
    if (!newUsername || newUsername.trim() === currentUser.username) {
        return;
    }
    
    // Check if username is available
    database.ref('usernames').once('value')
        .then(snapshot => {
            if (snapshot.hasChild(newUsername)) {
                alert('Username already taken');
                return;
            }
            
            // Update username
            const updates = {};
            updates['users/' + currentUser.id + '/username'] = newUsername;
            updates['users/' + currentUser.id + '/lastUsernameChange'] = new Date().toISOString();
            updates['usernames/' + currentUser.username] = null;
            updates['usernames/' + newUsername] = currentUser.id;
            
            database.ref().update(updates)
                .then(() => {
                    currentUser.username = newUsername;
                    currentUser.lastUsernameChange = new Date().toISOString();
                    headerUsername.textContent = newUsername;
                    sidebarUsername.textContent = newUsername;
                    editUsernameBtn.disabled = true;
                    checkUsernameChangeAvailability();
                })
                .catch(error => {
                    console.error('Error updating username:', error);
                    alert('Error updating username. Please try again.');
                });
        });
});

// Change profile picture
changePicBtn.addEventListener('click', () => {
    profilePicUpload.click();
});

profilePicUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if image
    if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2MB');
        return;
    }
    
    // Upload to Firebase Storage
    const storageRef = storage.ref('profile_pics/' + currentUser.id + '/' + file.name);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress monitoring can be added here
        },
        (error) => {
            console.error('Upload error:', error);
            alert('Error uploading image. Please try again.');
        },
        () => {
            // Upload complete
            uploadTask.snapshot.ref.getDownloadURL()
                .then(downloadURL => {
                    // Save URL to user profile
                    database.ref('users/' + currentUser.id + '/profilePic').set(downloadURL)
                        .then(() => {
                            currentUser.profilePic = downloadURL;
                            profilePic.src = downloadURL;
                            sidebarProfilePic.src = downloadURL;
                        });
                });
        }
    );
});

// Room creation
createRoomBtn.addEventListener('click', () => {
    createRoomModal.classList.remove('hidden');
});

confirmCreateRoom.addEventListener('click', () => {
    createRoomModal.classList.add('hidden');
    createNewRoom();
});

function createNewRoom() {
    const roomCode = generateRoomCode();
    const roomRef = database.ref('rooms/' + roomCode);
    const timestamp = new Date().getTime();
    
    const roomData = {
        createdAt: timestamp,
        lastActivity: timestamp,
        createdBy: currentUser.id,
        users: {
            [currentUser.id]: true
        }
    };
    
    roomRef.set(roomData)
        .then(() => {
            // Create welcome message
            const messageData = {
                sender: 'system',
                text: `Room created with code: ${roomCode}`,
                timestamp: timestamp,
                roomCode: roomCode
            };
            
            database.ref('messages/' + roomCode).push().set(messageData)
                .then(() => {
                    // Join the room
                    joinRoom(roomCode);
                });
        })
        .catch(error => {
            console.error('Error creating room:', error);
            alert('Error creating room. Please try again.');
        });
}

function generateRoomCode() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    // Format: 0A00AA0A
    const pattern = [0, 1, 0, 0, 1, 1, 0, 1];
    
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === 0) {
            // Number
            result += chars.charAt(Math.floor(Math.random() * 10));
        } else {
            // Letter
            result += chars.charAt(10 + Math.floor(Math.random() * 26));
        }
    }
    
    return result;
}

// Room joining
joinRoomBtn.addEventListener('click', () => {
    joinRoomModal.classList.remove('hidden');
});

confirmJoinRoom.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    joinRoomModal.classList.add('hidden');
    
    if (!roomCode || !/^[0-9A-Z]{8}$/.test(roomCode)) {
        alert('Please enter a valid room code (format: 0A00AA0A)');
        return;
    }
    
    joinRoom(roomCode);
});

function joinRoom(roomCode) {
    // Check if room exists
    database.ref('rooms/' + roomCode).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('Room not found');
                return;
            }
            
            const roomData = snapshot.val();
            
            // Check if room is inactive
            const now = new Date().getTime();
            const lastActivity = roomData.lastActivity || roomData.createdAt;
            const inactiveTime = (now - lastActivity) / (1000 * 60); // in minutes
            
            if (inactiveTime > 10) {
                // Delete inactive room
                deleteRoom(roomCode);
                alert('This room has been inactive for too long and has been deleted');
                return;
            }
            
            // Update room activity
            database.ref('rooms/' + roomCode + '/lastActivity').set(now);
            
            // Add user to room if not already there
            if (!roomData.users || !roomData.users[currentUser.id]) {
                database.ref('rooms/' + roomCode + '/users/' + currentUser.id).set(true);
            }
            
            // Set current room
            currentRoom = roomCode;
            roomCodeDisplay.textContent = roomCode;
            
            // Show chat room
            chatRoom.classList.remove('hidden');
            
            // Load messages
            loadMessages();
            
            // Set up message listener
            setupMessageListener();
        })
        .catch(error => {
            console.error('Error joining room:', error);
            alert('Error joining room. Please try again.');
        });
}

function loadMessages() {
    messagesContainer.innerHTML = '';
    
    database.ref('messages/' + currentRoom).once('value')
        .then(snapshot => {
            const messages = [];
            
            snapshot.forEach(childSnapshot => {
                messages.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Display messages
            messages.forEach(message => {
                displayMessage(message);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

function setupMessageListener() {
    database.ref('messages/' + currentRoom).on('child_added', snapshot => {
        const message = {
            id: snapshot.key,
            ...snapshot.val()
        };
        
        // Only add if not already displayed
        if (!document.getElementById('msg-' + message.id)) {
            displayMessage(message);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });
}

function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.id = 'msg-' + message.id;
    
    if (message.sender === 'system') {
        // System message
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text system-message">${message.text}</div>
            </div>
        `;
    } else {
        // User message
        // Get user data
        database.ref('users/' + message.sender).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                const messageDate = new Date(message.timestamp);
                const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                let profilePicUrl = 'https://via.placeholder.com/40';
                if (userData.profilePic) {
                    profilePicUrl = userData.profilePic;
                }
                
                messageElement.innerHTML = `
                    <img class="message-avatar" src="${profilePicUrl}" alt="${userData.username}">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-username">${userData.username}</span>
                            <span class="message-title">${userData.title || 'User'}</span>
                            <span class="message-time">${timeString}</span>
                        </div>
                        <div class="message-text">${message.text}</div>
                    </div>
                `;
            });
    }
    
    messagesContainer.appendChild(messageElement);
}

// Send message
sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text || !currentRoom) return;
    
    const timestamp = new Date().getTime();
    const messageData = {
        sender: currentUser.id,
        text: text,
        timestamp: timestamp,
        roomCode: currentRoom
    };
    
    // Add message to database
    database.ref('messages/' + currentRoom).push().set(messageData)
        .then(() => {
            // Update room activity
            database.ref('rooms/' + currentRoom + '/lastActivity').set(timestamp);
            
            // Clear input
            messageInput.value = '';
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Error sending message. Please try again.');
        });
}

// Leave room
leaveRoomBtn.addEventListener('click', () => {
    chatRoom.classList.add('hidden');
    currentRoom = null;
    
    // Remove message listener to prevent memory leaks
    if (currentRoom) {
        database.ref('messages/' + currentRoom).off('child_added');
    }
});

// Close modals
closeModals.forEach(btn => {
    btn.addEventListener('click', () => {
        createRoomModal.classList.add('hidden');
        joinRoomModal.classList.add('hidden');
    });
});

// Check for inactive rooms
function checkInactiveRooms() {
    if (!currentUser) return;
    
    const now = new Date().getTime();
    const cutoff = now - (10 * 60 * 1000); // 10 minutes ago
    
    database.ref('rooms').once('value')
        .then(snapshot => {
            const rooms = [];
            
            snapshot.forEach(childSnapshot => {
                const roomData = childSnapshot.val();
                const lastActivity = roomData.lastActivity || roomData.createdAt;
                
                if (lastActivity < cutoff) {
                    rooms.push(childSnapshot.key);
                }
            });
            
            // Delete inactive rooms
            rooms.forEach(roomCode => {
                deleteRoom(roomCode);
            });
        });
}

function deleteRoom(roomCode) {
    // Delete room and its messages
    const updates = {};
    updates['rooms/' + roomCode] = null;
    updates['messages/' + roomCode] = null;
    
    database.ref().update(updates)
        .catch(error => {
            console.error('Error deleting room:', error);
        });
    
    // If we're currently in this room, leave it
    if (currentRoom === roomCode) {
        chatRoom.classList.add('hidden');
        currentRoom = null;
    }
}