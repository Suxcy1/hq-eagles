document.addEventListener('DOMContentLoaded', async () => {

    let userId;
    // if (!userId) {
    //     alert('User not authenticated!');
    //     window.location.href = '/login';
    // }

    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get('productId');
    const auth = firebase.auth();


    auth.onAuthStateChanged(async (user) => {

        if (user) {
            userId = user.uid;
            console.log("loading");
            console.log(user.uid);
            console.log(userId);
            const chatsSnapshot = await firebase.database().ref(`Users/${userId}/chats`).once('value');
            // const chats = chatsSnapshot.val() || {};

            // for (let id in chats) {
            //     const chat = chats[id];
            //     console.log(chat.chatId);
            //     console.log(chat.messageId);
            //     loadMessages(chat.chatId)
            // }
            loadMessages(userId)

        }
    });


    // function loadMessages(userId) {
    //     const dbRef = firebase.database().ref(`Services/Messages/${userId}`);



    //     dbRef.on('value', (snapshot) => {
    //         const chatsContainer = document.getElementById('chatList');
    //         chatsContainer.innerHTML = '';
    //         console.log(snapshot.val());


    //         snapshot.forEach((chatSnapshot) => {

    //             // console.log(chatSnapshot.val());

    //             const chatId = chatSnapshot.key;


    //             const messagesRef = chatSnapshot.ref;

    //             // Get last message
    //             messagesRef.limitToLast(1).once('value', (lastMessageSnapshot) => {

    //                 const lastMessage = lastMessageSnapshot.val();
    //                 const lastMessageKey = Object.keys(lastMessage)[0];

    //                 const lastMessageText = lastMessage[lastMessageKey].text || 'No messages';

    //                 // Count unread messages using Firebase query
    //                 messagesRef.orderByChild('status')
    //                     .equalTo('New')
    //                     .once('value', (unreadSnapshot) => {
    //                         const unreadCount = unreadSnapshot.exists() ? unreadSnapshot.numChildren() : 0;
    //                         createChatElement(chatId, lastMessageText, unreadCount);
    //                     });
    //             });
    //         });
    //     });
    // }


    async function loadMessages(userId) {


        // const dbRef = firebase.database().ref(`Services/Messages/${userId}`);
        const dbRef = firebase.database().ref(`Users/${userId}/chats`);



        dbRef.on('value', (snapshot) => {
            const chatsContainer = document.getElementById('chatList');
            chatsContainer.innerHTML = '';
            // console.log(snapshot.val());


            snapshot.forEach((chatSnapshot) => {

                console.log(chatSnapshot.val());
                const chatSnapshots = chatSnapshot.val()

                const chatId = chatSnapshots.chatId;
                const messageId = chatSnapshots.messageId;


                const messagesRef = chatSnapshot.ref;
                const dbRef = firebase.database().ref(`Services/Messages/${chatId}/${messageId}/messages`);

                // Get last message
                dbRef.limitToLast(1).once('value', (lastMessageSnapshot) => {

                    const lastMessage = lastMessageSnapshot.val();
                    console.log(lastMessage);

                    // // const lastMessageKey = Object.keys(lastMessage)[0];
                    // let lastMessageKey;
                    // // console.log(lastMessageKey);
                    // let lastMessageText;

                    // if (lastMessage) {
                    //     lastMessageKey = Object.keys(lastMessage)[0];
                    //     // proceed with using lastMessageKey
                    //     lastMessage[lastMessageKey].content || 'No messages';
                    // }else {
                    //     console.warn("No last message found.");
                    //     // handle the empty state appropriately
                    //     lastMessageText = 'No messages'
                    // }

                    let lastMessageText = 'No messages'; // default fallback

                    if (lastMessage && typeof lastMessage === 'object') {
                        const lastMessageKey = Object.keys(lastMessage)[0];
                        if (lastMessageKey && lastMessage[lastMessageKey]) {
                            lastMessageText = lastMessage[lastMessageKey].content || 'No messages';
                        }
                    } else {
                        console.warn("No last message found.");
                    }


                    // const lastMessageText = lastMessage[lastMessageKey].text || 'No messages';
                    

                    // Count unread messages using Firebase query
                    dbRef.orderByChild('status')
                        .equalTo('New')
                        .once('value', (unreadSnapshot) => {
                            const unreadCount = unreadSnapshot.exists() ? unreadSnapshot.numChildren() : 0;
                            createChatElement(messageId, lastMessageText, unreadCount, chatId);
                        });
                });
            });
        });
    }

    function createChatElement(messageId, lastMessage, unreadCount, chatId) {
        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';

        chatElement.innerHTML = `
        <div class="chat-info">
            <div class="chat-id">${messageId}</div>
            <div class="last-message">${lastMessage}</div>
        </div>
        ${unreadCount > 0 ? `<div class="unread-count">${unreadCount}</div>` : ''}
    `;

        chatElement.addEventListener('click', () => {
            // Implement chat opening logic
            // console.log('Opening chat:', chatId);
            window.location.href = `messages.html?messageId=${messageId}&chatId=${chatId}`;
        });

        document.getElementById('chatList').appendChild(chatElement);
    }

    // document.getElementById('newChatBtn').addEventListener('click', () => {
    //     // const newChatId = `message${Date.now()}`;
    //     // const newChatRef = dbRef.child(newChatId);
    //     // newChatRef.child('messages').push().set({
    //     //     message: 'Chat started',
    //     //     timestamp: firebase.database.ServerValue.TIMESTAMP,
    //     //     status: 'new'
    //     // });

    //     window.location.href = `messages.html?productId=${key}`;
    // });

});