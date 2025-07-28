const firebaseConfig = {
  apiKey: "AIzaSyBhfQ1Wf5JEy6sOU4ExXboRI4Ir4y_aKZw",
  authDomain: "easy-chatroom.firebaseapp.com",
  databaseURL: "https://easy-chatroom-default-rtdb.firebaseio.com",
  projectId: "easy-chatroom",
  storageBucket: "easy-chatroom.firebasestorage.app",
  messagingSenderId: "985049198428",
  appId: "1:985049198428:web:0cad8f285943b9f10c9b99",
  measurementId: "G-Q0YZGZLEMM"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const profilePicContainer = document.getElementById('profile-pic-container');
const usernameDisplay = document.getElementById('username-display');
const profileSidebar = document.getElementById('profile-sidebar');
const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
const sidebarUsername = document.getElementById('sidebar-username');
const joinDate = document.getElementById('join-date');
const profileDescription = document.getElementById('profile-description');
const editDescriptionBtn = document.getElementById('edit-description-btn');
const editUsernameBtn = document.getElementById('edit-username-btn');
const editProfilePicBtn = document.getElementById('edit-profile-pic-btn');
const profilePicUpload = document.getElementById('profile-pic-upload');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const chatroomSection = document.getElementById('chatroom-section');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const roomCodeDisplay = document.getElementById('room-code-display');
const joinRoomModal = document.getElementById('join-room-modal');
const roomCodeInput = document.getElementById('room-code-input');
const confirmJoinBtn = document.getElementById('confirm-join-btn');
const closeModal = document.querySelector('.close-modal');

// Global Variables
let currentUser = null;
let deviceId = null;
let currentRoom = null;
let currentRoomRef = null;
let messagesRef = null;
let lastUsernameChange = null;
const defaultProfilePic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

// Initialize the app
async function init() {
    try {
        // Get device fingerprint
        deviceId = await getDeviceId();
        
        // Check if user is already logged in for this device
        checkExistingUser();
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

// Get device fingerprint
function getDeviceId() {
    return new Promise((resolve) => {
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                Fingerprint2.get((components) => {
                    const values = components.map(component => component.value);
                    const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
                    resolve(fingerprint);
                });
            });
        } else {
            setTimeout(() => {
                Fingerprint2.get((components) => {
                    const values = components.map(component => component.value);
                    const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
                    resolve(fingerprint);
                });
            }, 500);
        }
    });
}

// Check if user is already logged in for this device
function checkExistingUser() {
    const userRef = database.ref('users').orderByChild('devices/' + deviceId).equalTo(true);
    
    userRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            // User exists for this device
            const userData = Object.values(snapshot.val())[0];
            const userId = Object.keys(snapshot.val())[0];
            loginUser(userId, userData);
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Login button
    loginBtn.addEventListener('click', handleLogin);
    
    // Profile picture click to open sidebar
    profilePicContainer.addEventListener('click', toggleProfileSidebar);
    
    // Profile sidebar buttons
    editDescriptionBtn.addEventListener('click', editProfileDescription);
    editUsernameBtn.addEventListener('click', editUsername);
    editProfilePicBtn.addEventListener('click', () => profilePicUpload.click());
    profilePicUpload.addEventListener('change', uploadProfilePicture);
    
    // Chatroom buttons
    createRoomBtn.addEventListener('click', createChatroom);
    joinRoomBtn.addEventListener('click', () => joinRoomModal.classList.remove('hidden'));
    leaveRoomBtn.addEventListener('click', leaveChatroom);
    
    // Join room modal
    confirmJoinBtn.addEventListener('click', joinChatroom);
    closeModal.addEventListener('click', () => joinRoomModal.classList.add('hidden'));
    
    // Send message
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === joinRoomModal) {
            joinRoomModal.classList.add('hidden');
        }
    });
}
// Add password input to DOM elements
const passwordInput = document.getElementById('password-input');

// Modify handleLogin function
function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }
    
    // Check if username is already taken
    const usernameRef = database.ref('usernames').child(username);
    
    usernameRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            // Username exists, verify password
            const userId = snapshot.val();
            const userRef = database.ref('users').child(userId);
            
            userRef.once('value', (userSnapshot) => {
                const userData = userSnapshot.val();
                
                // Verify password
                if (userData.password !== hashPassword(password, userId)) {
                    alert("Incorrect password");
                    return;
                }
                
                // Check if this device is allowed
                if (userData.devices && userData.devices[deviceId]) {
                    // This device is already registered for this user
                    loginUser(userId, userData);
                } else {
                    // Add this device to allowed devices
                    const updates = {};
                    updates[`users/${userId}/devices/${deviceId}`] = true;
                    
                    database.ref().update(updates)
                        .then(() => {
                            loginUser(userId, userData);
                        })
                        .catch((error) => {
                            console.error("Error adding device:", error);
                            alert("Error logging in. Please try again.");
                        });
                }
            });
        } else {
            // Username is available, create new user
            createNewUser(username, password);
        }
    });
}

// Add password hashing function (simple example - consider using a proper library)
function hashPassword(password, salt) {
    // In a real app, use a proper hashing algorithm like bcrypt
    return btoa(password + salt);
}

// Update createNewUser function
function createNewUser(username, password) {
    const newUserRef = database.ref('users').push();
    const userId = newUserRef.key;
    const joinDate = new Date().toISOString();
    
    const userData = {
        username: username,
        password: hashPassword(password, userId), // Store hashed password
        devices: {
            [deviceId]: true
        },
        profile: {
            description: "Hey there! I'm new here.",
            title: "User",
            joinDate: joinDate,
            lastUsernameChange: joinDate
        }
    };
    
    // Set username in usernames index
    database.ref('usernames').child(username).set(userId)
        .then(() => {
            // Create user
            return newUserRef.set(userData);
        })
        .then(() => {
            // Login the new user
            loginUser(userId, userData);
            passwordInput.value = ''; // Clear password field
        })
        .catch((error) => {
            console.error("Error creating user:", error);
            alert("Error creating account. Please try again.");
        });
}
function loginUser(userId, userData) {
    currentUser = {
        id: userId,
        ...userData
    };
    
    // Clear password field
    passwordInput.value = '';
    // Update UI
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    // Load profile picture
    loadProfilePicture();
    
    // Display username
    usernameDisplay.textContent = currentUser.username;
    sidebarUsername.textContent = currentUser.username;
    
    // Display join date
    const joinDateObj = new Date(currentUser.profile.joinDate);
    joinDate.textContent = `Joined ${joinDateObj.toLocaleDateString()}`;
    
    // Display profile description
    profileDescription.textContent = currentUser.profile.description;
    
    // Store last username change date
    lastUsernameChange = currentUser.profile.lastUsernameChange;
    
    // Check for inactive chatrooms
    checkInactiveChatrooms();
}

// Toggle profile sidebar
function toggleProfileSidebar() {
    profileSidebar.classList.toggle('hidden');
}

// Edit profile description
function editProfileDescription() {
    const newDescription = prompt("Enter your profile description:", currentUser.profile.description);
    
    if (newDescription !== null) {
        database.ref(`users/${currentUser.id}/profile/description`).set(newDescription)
            .then(() => {
                currentUser.profile.description = newDescription;
                profileDescription.textContent = newDescription;
            })
            .catch((error) => {
                console.error("Error updating description:", error);
                alert("Failed to update description. Please try again.");
            });
    }
}

// Edit username
function editUsername() {
    // Check if 2 days have passed since last change
    const lastChangeDate = new Date(lastUsernameChange);
    const now = new Date();
    const daysSinceChange = (now - lastChangeDate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceChange < 2) {
        const hoursLeft = Math.ceil((2 * 24) - (daysSinceChange * 24));
        alert(`You can change your username again in ${hoursLeft} hours.`);
        return;
    }
    
    const newUsername = prompt("Enter new username:", currentUser.username);
    
    if (newUsername !== null && newUsername.trim() !== "") {
        // Check if username is available
        const usernameRef = database.ref('usernames').child(newUsername);
        
        usernameRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                alert("Username already taken");
            } else {
                // Update username
                const updates = {};
                updates[`users/${currentUser.id}/username`] = newUsername;
                updates[`users/${currentUser.id}/profile/lastUsernameChange`] = new Date().toISOString();
                updates[`usernames/${currentUser.username}`] = null;
                updates[`usernames/${newUsername}`] = currentUser.id;
                
                database.ref().update(updates)
                    .then(() => {
                        currentUser.username = newUsername;
                        usernameDisplay.textContent = newUsername;
                        sidebarUsername.textContent = newUsername;
                        lastUsernameChange = new Date().toISOString();
                    })
                    .catch((error) => {
                        console.error("Error updating username:", error);
                        alert("Failed to update username. Please try again.");
                    });
            }
        });
    }
}

// Upload profile picture
function uploadProfilePicture(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert("Please select an image file");
        return;
    }
    
    const storageRef = storage.ref(`profile_pictures/${currentUser.id}`);
    const uploadTask = storageRef.put(file);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress monitoring can be added here
        },
        (error) => {
            console.error("Upload error:", error);
            alert("Error uploading image. Please try again.");
        },
        () => {
            // Upload complete
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Save URL to user profile
                database.ref(`users/${currentUser.id}/profile/photoURL`).set(downloadURL)
                    .then(() => {
                        currentUser.profile.photoURL = downloadURL;
                        loadProfilePicture();
                    })
                    .catch((error) => {
                        console.error("Error saving photo URL:", error);
                    });
            });
        }
    );
}

// Load profile picture
function loadProfilePicture() {
    const photoURL = currentUser.profile?.photoURL || defaultProfilePic;
    
    document.getElementById('profile-pic').src = photoURL;
    sidebarProfilePic.src = photoURL;
}

// Create chatroom
function createChatroom() {
    // Generate room code (format: 0A00AA0A)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let roomCode = '';
    
    // First character: number
    roomCode += chars.charAt(Math.floor(Math.random() * 10));
    // Second character: letter
    roomCode += chars.charAt(10 + Math.floor(Math.random() * 26));
    // Third and fourth: numbers
    roomCode += chars.charAt(Math.floor(Math.random() * 10));
    roomCode += chars.charAt(Math.floor(Math.random() * 10));
    // Fifth and sixth: letters
    roomCode += chars.charAt(10 + Math.floor(Math.random() * 26));
    roomCode += chars.charAt(10 + Math.floor(Math.random() * 26));
    // Seventh: number
    roomCode += chars.charAt(Math.floor(Math.random() * 10));
    // Eighth: letter
    roomCode += chars.charAt(10 + Math.floor(Math.random() * 26));
    
    const roomRef = database.ref('chatrooms').child(roomCode);
    
    // Check if room already exists (unlikely but possible)
    roomRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            // Try again if room exists
            createChatroom();
        } else {
            // Create room
            const roomData = {
                createdAt: new Date().toISOString(),
                createdBy: currentUser.id,
                lastActivity: new Date().toISOString(),
                participants: {
                    [currentUser.id]: true
                }
            };
            
            roomRef.set(roomData)
                .then(() => {
                    // Create first message (room code)
                    const message = {
                        sender: "system",
                        text: `Room created. Code: ${roomCode}`,
                        timestamp: new Date().toISOString()
                    };
                    
                    return roomRef.child('messages').push().set(message);
                })
                .then(() => {
                    // Join the room
                    joinRoom(roomCode, roomRef);
                })
                .catch((error) => {
                    console.error("Error creating room:", error);
                    alert("Error creating chatroom. Please try again.");
                });
        }
    });
}

// Join chatroom (from modal)
function joinChatroom() {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    
    if (!roomCode || !/^[0-9A-Z]{8}$/.test(roomCode)) {
        alert("Please enter a valid room code (format: 0A00AA0A)");
        return;
    }
    
    const roomRef = database.ref('chatrooms').child(roomCode);
    
    roomRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            joinRoom(roomCode, roomRef);
            joinRoomModal.classList.add('hidden');
            roomCodeInput.value = '';
        } else {
            alert("Chatroom not found. Please check the code and try again.");
        }
    });
}

// Join room (internal)
function joinRoom(roomCode, roomRef) {
    // Leave current room if any
    if (currentRoom) leaveChatroom();
    
    currentRoom = roomCode;
    currentRoomRef = roomRef;
    
    // Update room activity
    roomRef.child('lastActivity').set(new Date().toISOString());
    
    // Add user to participants if not already there
    roomRef.child('participants').child(currentUser.id).set(true);
    
    // Show chatroom UI
    chatroomSection.classList.remove('hidden');
    roomCodeDisplay.textContent = `Room: ${roomCode}`;
    
    // Set up messages listener
    messagesRef = roomRef.child('messages');
    messagesContainer.innerHTML = '';
    
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        addMessageToUI(message, snapshot.key);
    });
    
    // Scroll to bottom
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Leave chatroom
function leaveChatroom() {
    if (!currentRoom) return;
    
    // Remove messages listener
    if (messagesRef) messagesRef.off();
    
    // Remove user from participants
    if (currentRoomRef) {
        currentRoomRef.child('participants').child(currentUser.id).remove();
    }
    
    // Reset room variables
    currentRoom = null;
    currentRoomRef = null;
    messagesRef = null;
    
    // Hide chatroom UI
    chatroomSection.classList.add('hidden');
}

// Send message
function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text || !currentRoom) return;
    
    const message = {
        sender: currentUser.id,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    // Add message to database
    messagesRef.push(message)
        .then(() => {
            // Update last activity
            currentRoomRef.child('lastActivity').set(new Date().toISOString());
            
            // Clear input
            messageInput.value = '';
        })
        .catch((error) => {
            console.error("Error sending message:", error);
            alert("Error sending message. Please try again.");
        });
}

// Add message to UI
function addMessageToUI(message, messageId) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.id = `message-${messageId}`;
    
    if (message.sender === "system") {
        // System message
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text" style="color: #7f8c8d; font-style: italic;">${message.text}</div>
            </div>
        `;
    } else {
        // User message - we need to get user info
        database.ref(`users/${message.sender}`).once('value', (userSnapshot) => {
            const userData = userSnapshot.val();
            const photoURL = userData.profile?.photoURL || defaultProfilePic;
            const username = userData.username || "Unknown";
            const title = userData.profile?.title || "User";
            
            const messageTime = new Date(message.timestamp);
            const timeString = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageElement.innerHTML = `
                <img src="${photoURL}" alt="Profile" class="message-avatar">
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-username">${username}</span>
                        <span class="message-title">${title}</span>
                        <span class="message-time">${timeString}</span>
                    </div>
                    <div class="message-text">${message.text}</div>
                </div>
            `;
        });
    }
    
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Check for inactive chatrooms
function checkInactiveChatrooms() {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    
    const inactiveRoomsRef = database.ref('chatrooms').orderByChild('lastActivity').endAt(tenMinutesAgo);
    
    inactiveRoomsRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((roomSnapshot) => {
                updates[`chatrooms/${roomSnapshot.key}`] = null;
            });
            
            database.ref().update(updates)
                .catch((error) => {
                    console.error("Error deleting inactive rooms:", error);
                });
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);