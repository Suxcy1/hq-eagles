<script type="module">
// === Facebook CAPI + Pixel Integration ===
// Make sure your Pixel is initialized in your page:
// fbq('init', 'YOUR_PIXEL_ID');

function generateUUID() {
  // Creates unique event_id for each action
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Send event to both Facebook Pixel (browser) and your server (CAPI)
async function trackEvent(eventName, userData = {}) {
  const eventId = generateUUID();
  const endpoint = 'https://localhost:4000/api/fb-events'; // <== change to your backend endpoint

  // 1️⃣ Fire browser event
  fbq('track', eventName, {
    event_id: eventId,
    ...userData
  });

  // 2️⃣ Send same event_id + user info to server
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        user_data: userData,
        client_user_agent: navigator.userAgent,
        client_ip_address: '', // leave empty; server will extract IP
        event_time: Math.floor(Date.now() / 1000),
      })
    });

    if (!response.ok) throw new Error('Server failed');
    console.log(`[Facebook CAPI] Sent ${eventName} event successfully ✅`);
  } catch (err) {
    console.error('Error sending event to server:', err);
  }
}

// 🧩 Track your events
// Example: Register
document.querySelector('#register-btn')?.addEventListener('click', () => {
  const userEmail = document.querySelector('#email').value;
  trackEvent('CompleteRegistration', {
    email: userEmail,
    action_type: 'register'
  });
});

// Example: Complete Profile
document.querySelector('#complete-profile-btn')?.addEventListener('click', () => {
  trackEvent('CompleteProfile', {
    action_type: 'complete_profile'
  });
});

// Example: Subscribe
document.querySelector('#subscribe-btn')?.addEventListener('click', () => {
  const userEmail = document.querySelector('#sub-email').value;
  trackEvent('Subscribe', {
    email: userEmail,
    action_type: 'subscribe'
  });
});
</script>
