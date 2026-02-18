
const database = firebase.database();
const storage = firebase.storage();
const auth = firebase.auth();

// Initialize Chat
let chatId, messageId, userId, sellerId, propertyId;
let isLoggedIn = false;

document.addEventListener('DOMContentLoaded', async () => {

    // document.body.classList.add('transferring');
    // await checkAuthState();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            userId = user.uid;
            isLoggedIn = true
        } else {
            alert("Please Login To Continue")
            window.location.href = `index.html`;
        }
    });
    initializeChatSession();
    setupEventListeners();
});

// function checkAuthState() {
//     // Implement your authentication check here
//     // For example, using Firebase Auth
//     isLoggedIn = localStorage.getItem('userId') !== null;
//     userId = isLoggedIn ? localStorage.getItem('userId') : null;
// }

async function checkAuthState() {

    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in

                // User just logged in
                const previousChatId = localStorage.getItem('chatId');
                const isNewLogin = !isLoggedIn;

                isLoggedIn = true;
                userId = user.uid;
                chatId = userId; // Use user ID as chat ID for logged-in users
                if (isNewLogin && previousChatId) {
                    await transferChatData(previousChatId, userId);
                    localStorage.removeItem('chatId');
                    localStorage.removeItem('chatExpiration');
                }
                // localStorage.removeItem('chatId'); // Remove temporary chat ID if exists
                // localStorage.removeItem('chatExpiration');
            } else {
                // User is signed out
                isLoggedIn = false;
                userId = null;
                // Check for existing temporary chat ID
                chatId = localStorage.getItem('chatId');

                // Check expiration if exists
                const expiration = localStorage.getItem('chatExpiration');
                if (expiration && Date.now() > parseInt(expiration)) {
                    localStorage.removeItem('chatId');
                    localStorage.removeItem('chatExpiration');
                    chatId = null;
                }
            }
            resolve();
        });
    });
}



async function transferChatData(oldChatId, newChatId) {
    try {
        const oldRef = database.ref(`Service/Messages/${oldChatId}`);
        const newRef = database.ref(`Service/Messages/${newChatId}`);

        const snapshot = await oldRef.once('value');
        if (snapshot.exists()) {
            // Transfer all chat data
            await newRef.set(snapshot.val());

            // Delete old data
            await oldRef.remove();

            // Update message references
            const messagesRef = database.ref(`Service/Messages/${newChatId}`);
            const messagesSnapshot = await messagesRef.once('value');

            messagesSnapshot.forEach(messageChild => {
                messageChild.ref.update({
                    chatId: newChatId,
                    userId: userId
                });
            });
        }
    } catch (error) {
        console.error('Chat transfer failed:', error);
        alert('Chat history transfer failed. Please contact support.');
    }
}


// function initializeChatSession() {
//     const urlParams = new URLSearchParams(window.location.search);
//     sellerId = urlParams.get('sellerId');
//     propertyId = urlParams.get('propertyId');

//     // Check existing chat ID
//     chatId = localStorage.getItem('chatId');
//     if (!chatId && !isLoggedIn) {
//         const alertResponse = confirm('Please login for permanent chat storage. Click OK to login or Cancel to continue temporarily.');
//         if (alertResponse) {
//             window.location.href = '/login';
//         } else {
//             alert('Chat will be stored in this browser only and deleted after 30 days.');
//             chatId = generateId('chatId', 4);
//             localStorage.setItem('chatId', chatId);
//             const expirationDate = new Date();
//             expirationDate.setDate(expirationDate.getDate() + 30);
//             localStorage.setItem('chatExpiration', expirationDate.getTime());
//         }
//     }

//     // Generate message ID
//     messageId = urlParams.get('messageId') || generateId('messageId', 4);

//     if (propertyId && sellerId) {

//         loadPropertyPreview();
//     }


//     initializeChatDatabase();
// }



async function initializeChatSession() {
    const urlParams = new URLSearchParams(window.location.search);
    // messageId = urlParams.get('messageId') || generateId('messageId', 4);
    messageId = urlParams.get('messageId');
    chatId = urlParams.get('chatId');
    console.log(chatId);




    // if (!chatId && !isLoggedIn) {
    //     const alertResponse = confirm('Please login for permanent chat storage. Click OK to login or Cancel to continue temporarily.');
    //     if (alertResponse) {
    //         window.location.href = '/login';
    //     } else {
    //         alert('Chat will be stored in this browser only and deleted after 30 days.');
    //         chatId = generateId('chatId', 4);
    //         localStorage.setItem('chatId', chatId);
    //         const expirationDate = new Date();
    //         expirationDate.setDate(expirationDate.getDate() + 30);
    //         localStorage.setItem('chatExpiration', expirationDate.getTime());
    //     }
    // }




    // Save property/seller IDs to database if they exist in URL
    if (urlParams.has('propertyId') && urlParams.has('sellerId')) {
        sellerId = urlParams.get('sellerId');
        propertyId = urlParams.get('propertyId');

        // Save to database under messageId
        // await database.ref(`Services/Messages/${chatId}/${messageId}`).update({
        //     sellerId,
        //     propertyId,
        //     createdAt: Date.now()
        // });
    } else {
        // Retrieve from database if messageId exists
        const messageRef = database.ref(`Services/Messages/${chatId}/${messageId}`);
        const snapshot = await messageRef.once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            sellerId = data.sellerId;
            propertyId = data.propertyId;
        }
    }

    if (propertyId && sellerId) {
        // initializeChatDatabase();
        loadPropertyPreview();
    }
    console.log(chatId);
    console.log(messageId);


    initializeChatDatabase();


}

function generateId(prefix, length) {
    return prefix + Math.random().toString().substr(2, length);
}

async function loadPropertyPreview() {
    const propertyRef = database.ref(`Properties/${sellerId}/${propertyId}`);
    const snapshot = await propertyRef.once('value');
    const property = snapshot.val();
    console.log(property);



    const previewHTML = `
        <img src="${property.media.mainImageUrl[0]}">
        <div>
            <h4>${property.details.title}</h4>
            <p>$${property.details.price}</p>
        </div>
    `;
    document.getElementById('propertyPreview').innerHTML = previewHTML;
}

// function initializeChatDatabase() {
//     const chatRef = database.ref(`Service/Messages/${chatId}/${messageId}/messages`);
//     console.log(chatId);
//     console.log(messageId);


//     chatRef.on('child_added', snapshot => {
//         const message = snapshot.val();
//         console.log(message);

//         displayMessage(message);
//     });
// }

// function displayMessage(message) {
//     const messagesDiv = document.getElementById('chatMessages');
//     const messageDiv = document.createElement('div');
//     messageDiv.className = `message ${message.senderId === chatId ? 'sent' : 'received'}`;

//     const content = message.type === 'image' ?
//         `<img src="${message.content}" style="max-width: 200px; border-radius: 10px;">` :
//         message.content;

//     messageDiv.innerHTML = `
//         ${content}
//         <div class="message-info">
//             <span>${formatTimestamp(message.timestamp)}</span>
//             ${message.senderId === chatId ? `<span>${message.status || 'sent'}</span>` : ''}
//         </div>
//     `;
//     messagesDiv.appendChild(messageDiv);
//     messagesDiv.scrollTop = messagesDiv.scrollHeight;
// }


// Update message structure in sendMessage function
// async function sendMessage() {
//     const input = document.getElementById('messageInput');
//     const content = input.value.trim();
//     if (!content) return;

//     const message = {
//         content,
//         senderId: userId || 'anonymous',
//         timestamp: Date.now(),
//         type: 'text',
//         status: 'sent' // Default status for user's own messages
//     };

//     await database.ref(`Service/Messages/${chatId}/${messageId}/messages`).push(message);
//     input.value = '';
// }

// Modified message listener with status updates
function initializeChatDatabase() {
    const messagesRef = database.ref(`Services/Messages/${chatId}/${messageId}/messages`);

    // Process existing messages
    messagesRef.once('value').then(snapshot => {
        const updates = {};
        snapshot.forEach(child => {
            const msg = child.val();
            console.log(msg);

            if (msg.senderId !== userId && msg.status === 'sent') {
                updates[child.key] = { status: 'seen' };
            }
        });
        if (Object.keys(updates).length > 0) {
            messagesRef.update(updates);
        }
    });

    // Real-time listener with status handling
    messagesRef.on('child_added', async (snapshot) => {
        const message = snapshot.val();

        // For new seller messages, update to seen
        if (message.senderId !== chatId && message.status === 'Processing') {
            await snapshot.ref.update({ status: 'seen' });
            displayMessage({ ...message, status: 'seen' });
        } else {
            displayMessage(message);
        }
    });

    // Update messages when status changes
    messagesRef.on('child_changed', (snapshot) => {
        const message = snapshot.val();
        updateMessageDisplay(snapshot.key, message);
    });
}

// New display functions with status styling
function displayMessage(message) {

    if (message.type === 'call') {
        const messagesDiv = document.getElementById('chatMessages');
        const callDiv = document.createElement('div');
        callDiv.className = `call-message ${message.direction === 'outgoing' ? 'received' : 'sent'}`;

        const icon = message.type === 'video' ? 'fa-video' : 'fa-phone';
        const directionText = message.direction === 'outgoing' ? 'Incoming' : 'Outgoing';
        const duration = message.duration ? ` (${Math.floor(message.duration / 60)}m ${message.duration % 60}s)` : '';

        callDiv.innerHTML = `
          <i class="fas ${icon}"></i>
          <span>${directionText} ${message.type} call${duration}</span>
          <div class="message-info">
            ${formatTimestamp(message.timestamp)}
          </div>
        `;

        messagesDiv.appendChild(callDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return;
    }


    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.id = `msg-${message.timestamp}`;
    messageDiv.className = `message ${message.senderId === userId ? 'sent' : 'received'}`;

    const content = message.type === 'image' ?
        `<img src="${message.content}" class="message-image">` :
        `<div class="message-text">${message.content}</div>`;

    messageDiv.innerHTML = `
        ${content}
        <div class="message-footer">
            <span class="message-time">${formatTimestamp(message.timestamp)}</span>
            ${message.senderId === userId ?
            `<span class="message-status ${message.status}">${message.status}</span>` : ''}
        </div>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateMessageDisplay(key, message) {
    const messageDiv = document.getElementById(`msg-${message.timestamp}`);
    if (messageDiv) {
        const statusElement = messageDiv.querySelector('.message-status');
        if (statusElement) {
            statusElement.textContent = message.status;
            statusElement.className = `message-status ${message.status}`;
        }
    }
}


// Improved timestamp formatting
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    })} ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    })}`;
}

// function setupEventListeners() {
//     document.getElementById('sendBtn').addEventListener('click', sendMessage);
//     document.getElementById('messageInput').addEventListener('keypress', e => {
//         if (e.key === 'Enter') sendMessage();
//     });
//     document.getElementById('mediaToggle').addEventListener('click', toggleMediaOptions);
//     document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
//     document.getElementById('scheduleBtn').addEventListener('click', showScheduleModal);
// }


// Updated event listeners for media buttons
function setupEventListeners() {

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('mediaToggle').addEventListener('click', toggleMediaOptions);
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('scheduleBtn').addEventListener('click', showScheduleModal);
    // Image upload trigger
    document.querySelector('[data-type="image"]').addEventListener('click', () => {
        document.getElementById('imageUpload').click();
    });

    // Schedule modal close
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('scheduleModal').style.display = 'none';
    });

    // Confirm schedule
    document.getElementById('confirmSchedule').addEventListener('click', async () => {
        const scheduleTime = document.getElementById('scheduleTime').value;
        if (!scheduleTime) return;

        await database.ref(`Services/Messages/${chatId}/${messageId}/schedule`).set({
            time: new Date(scheduleTime).getTime(),
            status: 'pending'
        });
        document.getElementById('scheduleModal').style.display = 'none';
    });
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    const message = {
        content,
        senderId: userId || 'anonymous',
        timestamp: Date.now(),
        type: 'text',
        status: 'sent'
    };

    await database.ref(`Services/Messages/${chatId}/${messageId}/messages`).push(message);
    input.value = '';
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = storage.ref(`chat_images/${chatId}/${Date.now()}_${file.name}`);
    const snapshot = await storageRef.put(file);
    const url = await snapshot.ref.getDownloadURL();

    const message = {
        content: url,
        senderId: userId || 'anonymous',
        timestamp: Date.now(),
        type: 'image',
        status: 'sent'
    };

    await database.ref(`Services/Messages/${chatId}/${messageId}/messages`).push(message);
}

function toggleMediaOptions() {
    const options = document.getElementById('mediaOptions');
    options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
}

function showScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'block';
}





class WebRTCHandler {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = new MediaStream();
        this.currentCallRef = null;

        this.callTimer = null;
        this.callStartTime = null;
        this.isMuted = false;
        this.isVideoOn = true;
        // ... existing properties
        this.initialize = this.initialize.bind(this);
        this.handleMediaError = this.handleMediaError.bind(this);
        this.showCallInterface = this.showCallInterface.bind(this);
        this.validateCallPrerequisites = this.validateCallPrerequisites.bind(this);

        // Add error handler
        this.handleError = this.handleError.bind(this);
        // Bind new methods
        this.addLocalTracks = this.addLocalTracks.bind(this);
        this.createPeerConnection = this.createPeerConnection.bind(this);
        this.setupAnswerListener = this.setupAnswerListener.bind(this);
        this.startCallTimer = this.startCallTimer.bind(this);

        // Add this line to store active listener reference
        this.activeCallListener = null;

        this.endingCall = false;
        this.isInCall = false;
    }



    async initialize() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });
            this.setupLocalVideo();
            this.setupConnectionListeners();
        } catch (error) {
            this.handleMediaError(error);
        }
    }

    // Add this method
    handleError(error) {
        console.error('WebRTC Error:', error);
        alert(`Call Error: ${error.message}`);
        this.endCall();
    }

    setupAnswerListener() {
        this.currentCallRef.child('answer').on('value', async (snapshot) => {
            if (snapshot.exists()) {
                const answer = snapshot.val();
                await this.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            }
        });
    }

    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
            const seconds = (duration % 60).toString().padStart(2, '0');
            document.getElementById('callTimer').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }
    // Add the missing methods
    addLocalTracks() {
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });
    }

    // Add this method inside the class
    validateCallPrerequisites() {
        if (!isLoggedIn) {
            alert('Please login to start a video call');
            return false;
        }

        if (!sellerId || !propertyId) {
            alert('No active conversation partner selected');
            return false;
        }

        if (!this.localStream) {
            alert('Failed to access media devices');
            return false;
        }

        return true;
    }

    showCallInterface() {
        const callContainer = document.getElementById('videoCallContainer');
        callContainer.style.display = 'block';
        setTimeout(() => {
            callContainer.classList.add('active');
            document.querySelector('.chat-container').style.display = 'none';
        }, 50);
    }

    handleMediaError(error) {
        console.error('Media Error:', error);
        alert(`Media Error: ${error.message}`);
        document.querySelectorAll('.btn-control').forEach(btn => btn.disabled = true);
    }

    setupConnectionListeners() {
        const remoteVideo = document.getElementById('remoteVideo');

        remoteVideo.onloadedmetadata = () => {
            remoteVideo.play().catch(error => {
                console.error('Error playing remote video:', error);
            });
        };

        remoteVideo.onerror = (error) => {
            console.error('Remote video error:', error);
        };
    }

    setupLocalVideo() {
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = this.localStream;
        localVideo.classList.add('active');
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    hideCallInterface() {
        const callContainer = document.getElementById('videoCallContainer');
        callContainer.classList.remove('active');
        setTimeout(() => {
            callContainer.style.display = 'none';
            document.querySelector('.chat-container').style.display = 'block';
        }, 300);
    }

    async startCall() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        if (!this.validateCallPrerequisites()) return;

        this.showCallInterface();
        this.peerConnection = this.createPeerConnection();
        this.addLocalTracks();

        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.currentCallRef = database.ref(`Services/Messages/${chatId}/${messageId}/calls`);
            await this.currentCallRef.set({
                type: 'video',
                callerId: userId,
                calleeId: chatId,
                offer: offer,
                timestamp: Date.now(),
                status: 'ringing'
            });

            // Save to messages node
            const callMessageRef = database.ref(`Services/Messages/${chatId}/${messageId}/messages`).push();
            await callMessageRef.set({
                type: 'call',
                direction: 'outgoing',
                timestamp: Date.now(),
                status: 'initiated',
                duration: 0
            });

            this.setupAnswerListener();
            this.startCallTimer();

            // Rest of call initialization
            this.showCallInterface();
            this.peerConnection = this.createPeerConnection();
            this.addLocalTracks();
        } catch (error) {
            this.handleCallError(error);
        }
    }

    createPeerConnection() {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:your-turn-server.com',
                    username: 'your-username',
                    credential: 'your-credential'
                }
            ]
        };

        const pc = new RTCPeerConnection(config);
        this.currentCallRef = database.ref(
            `Services/Messages/${chatId}/${this.messageId}/calls`
        );

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                this.currentCallRef.child('iceCandidates').push({
                    candidate: candidate.toJSON(),
                    senderId: userId
                });
            }
        };

        pc.ontrack = (event) => {
            this.remoteStream.addTrack(event.track);
            document.getElementById('remoteVideo').srcObject = this.remoteStream;
        };

        pc.onconnectionstatechange = () => {
            this.handleConnectionStateChange(pc.connectionState);
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            switch (pc.connectionState) {
                case 'disconnected':
                case 'failed':
                case 'closed':
                    this.endCall();
                    break;
            }
        };

        return pc;
    }

    async handleIncomingCall(callData) { // this is not working
        // const acceptCall = await this.showIncomingCallUI();
        // if (!acceptCall) return this.rejectCall();

        if (!this.validateCallPrerequisites()) {
            alert("video call unable to open")
            return
        }

        this.peerConnection = this.createPeerConnection();
        this.addLocalTracks();

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        await this.currentCallRef.update({
            answer: answer,
            status: 'ongoing'
        });

        // await this.callMessageRef.update({
        //     answer: answer,
        //     status: 'ongoing'
        // });

        this.setupICECandidateListener();
        this.startCallTimer();
        this.showCallInterface();
    }


    toggleMute() {
        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track => track.enabled = !this.isMuted);
        document.getElementById('toggleMute').classList.toggle('active', this.isMuted);
    }

    toggleVideo() {
        this.isVideoOn = !this.isVideoOn;
        this.localStream.getVideoTracks().forEach(track => track.enabled = this.isVideoOn);
        document.getElementById('toggleCamera').classList.toggle('active', !this.isVideoOn);
    }

    // async endCall() {
    //     if (this.peerConnection) {
    //         this.peerConnection.close();
    //         this.peerConnection = null;
    //     }

    //     this.localStream.getTracks().forEach(track => track.stop());
    //     this.stopCallTimer();

    //     if (this.currentCallRef) {
    //         await this.currentCallRef.update({
    //             status: 'ended',
    //             duration: Date.now() - this.callStartTime
    //         });
    //         this.currentCallRef.off();
    //     }
    //     // if (this.callMessageRef) {
    //     //     await this.callMessageRef.update({
    //     //         status: 'ended',
    //     //         duration: Date.now() - this.callStartTime
    //     //     });
    //     //     this.callMessageRef.off();
    //     // }

    //     if (this.localStream) {
    //         this.localStream.getTracks().forEach(track => track.stop());
    //         this.localStream = null;
    //     }
    //     this.isInitialized = false;
    //     document.body.classList.remove('in-call');

    //     this.hideCallInterface();
    // }

    async endCall() {
        try {

            if (this.endingCall) return;
            this.endingCall = true;
            // Cleanup PeerConnection first
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            // Stop local media safely
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            // Clear timers
            this.stopCallTimer();

            // Update call status in database
            if (this.currentCallRef) {
                await this.currentCallRef.update({
                    status: 'ended',
                    duration: Date.now() - this.callStartTime
                });
                this.currentCallRef.off(); // Remove Firebase listener
            }

            // UI cleanup
            document.body.classList.remove('in-call');
            this.hideCallInterface();

        } catch (error) {
            console.error('Error ending call:', error);
        } finally {
            this.isInitialized = false;
        }
    }

    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
            const seconds = (duration % 60).toString().padStart(2, '0');
            document.getElementById('callTimer').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    // Additional helper methods
    // ... (setupAnswerListener, handleConnectionStateChange, etc.)

    // Initialize call listener for incoming calls
    // setupIncomingCallListener() {
    //     // Path: receiverUserId is current user's ID for incoming calls
    //     const callRef = database.ref(
    //         `Services/Messages/${chatId}/${messageId}/calls`
    //     );

    //     callRef.on('value', snapshot => {
    //         const call = snapshot.val();

    //         if (call.status === 'ended') webRtcHandler.endCall();
    //         return
    //     });

    //     callRef.on('value', async (snapshot) => {
    //         const callData = snapshot.val();
    //         if (!callData) return;

    //         // Check if call is for current user
    //         if (callData.calleeId === userId && callData.status === 'ringing') {
    //             this.showIncomingCallAlert(callData);
    //         }
    //     });
    // }

    setupIncomingCallListener() {
        const callRef = database.ref(
            `Services/Messages/${chatId}/${messageId}/calls`
        );

        if (this.activeCallListener) {
            this.activeCallListener(); // Proper way to detach listener
        }

        // Single listener with proper cleanup
        this.activeCallListener = callRef.on('value', snapshot => {
            const callData = snapshot.val();
            if (!callData) return;
            console.log("loading");


            // Handle incoming call
            if (callData.status === 'ringing' && callData.calleeId === userId) {
                this.showIncomingCallAlert(callData);
            }
            // Handle call termination
            else if (callData.status === 'ended' && this.isInCall) {
                this.isInCall = false; // Add this flag to your class
                this.endCall();
            }
        });
    }

    // Show incoming call UI
    showIncomingCallAlert(callData) {
        const alertDiv = document.getElementById('incomingCallAlert');
        alertDiv.style.display = 'flex';

        // Set caller information
        document.querySelector('#incomingCallAlert .alert-text h4').textContent =
            `Incoming Video Call from ${callData.callerId}`;

        // Answer button handler
        document.getElementById('answerCallBtn').onclick = async () => {
            alertDiv.style.display = 'none';
            console.log("loading");

            await this.handleAnswerCall(callData);
        };
    }


    setupICECandidateListener() {
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.currentCallRef) {
                this.currentCallRef.child('iceCandidates').push({
                    candidate: event.candidate.toJSON(),
                    senderId: this.userId
                });
            }
        };
    }
    // Handle call answer
    async handleAnswerCall(callData) {
        try {

            if (!callData || !callData.offer) {
                throw new Error('Invalid call data received');
            }
            // Initialize WebRTC
            await this.initialize();

            // 2. Create NEW peer connection
            this.peerConnection = this.createPeerConnection(); // 👈 This was missing

            // 3. Add local tracks
            this.addLocalTracks();

            // Set remote offer
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(callData.offer)
            );

            // Create and set local answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Update call status
            const callRef = database.ref(
                `Services/Messages/${chatId}/${messageId}/calls`
            );

            await callRef.update({
                answer: answer,
                status: 'ongoing',
                startTime: Date.now()
            });

            // Start call timer
            this.startCallTimer();
            this.showCallInterface();

            // 10. Setup ICE candidate exchange
            this.setupICECandidateListener();

        } catch (error) {
            console.error('Error answering call:', error);
            this.handleError(error);
        }
    }
}

// Initialize WebRTC handler
const webRtcHandler = new WebRTCHandler();


// UI Event Listeners
document.getElementById('toggleMute').addEventListener('click', () => webRtcHandler.toggleMute());
document.getElementById('toggleCamera').addEventListener('click', () => webRtcHandler.toggleVideo());
document.getElementById('hangUpBtn').addEventListener('click', () => webRtcHandler.endCall());

// Auth State Listener
auth.onAuthStateChanged(user => {
    const callBanner = document.getElementById('callNotification');
    const callButtons = document.querySelectorAll('[data-type="video-call"], [data-type="voice-call"]');

    if (user) {
        callBanner.style.display = 'none';
        callButtons.forEach(btn => btn.disabled = false);
        webRtcHandler.setupIncomingCallListener();
        // webRtcHandler.initialize();
    } else {
        callBanner.style.display = 'block';
        callButtons.forEach(btn => btn.disabled = true);
    }
});

// Firebase Call Listener
// function setupCallListener() {
//     const callsRef = database.ref(`Services/Messages/${chatId}/${messageId}/calls`);

//     callsRef.orderByChild('status').on('child_changed', snapshot => {
//         const call = snapshot.val();
//         if (call.status === 'ended') webRtcHandler.endCall();
//     });

//     callsRef.orderByChild('status').equalTo('ringing').on('child_added', snapshot => {
//         const call = snapshot.val();
//         if (call.calleeId === chatId) {
//             // Show incoming call alert
//             const alertDiv = document.getElementById('incomingCallAlert');
//             alertDiv.style.display = 'flex';
//             webRtcHandler.handleIncomingCall(call);
//         }
//     });
// }

// Update call listener
function setupCallListener() { // this is not workig
    const callsRef = database.ref(`Services/Messages/${chatId}/${messageId}/calls`);

    callsRef.orderByChild('status').on('child_changed', snapshot => {
        const call = snapshot.val();
        if (call.status === 'ended') webRtcHandler.endCall();
    });

    callsRef.on('value', snapshot => {
        const callData = snapshot.val();
        if (!callData) return;

        if (callData.calleeId === userId && callData.status === 'ringing') {
            webRtcHandler.handleIncomingCall(callData);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // webRtcHandler.initialize();
    // setupCallListener(); // this not working

    // Add proper click handler for video call
    document.querySelector('[data-type="video-call"]').addEventListener('click', async () => {
        try {
            await webRtcHandler.startCall();
        } catch (error) {
            console.error('Call failed to start:', error);
        }
    });
});

