/* add-property.js
   Full JS file for the Add Property page with AI endpoint integration.
   - Expects firebase.js to already initialize firebase (compat)
   - AI endpoint: window.AI_ENDPOINT || 'http://localhost:3000/ai/generate'
*/

document.addEventListener('DOMContentLoaded', () => {
  // Firebase compat objects (assumes firebase.js initializes config)
  const database = firebase.database();
  const storage = firebase.storage();
  const auth = firebase.auth();

  (async () => {
      const base = '/component/loader'; // <-- set this to your actual folder (note leading slash)
      // add CSS once
      if (!document.querySelector('link[data-eh-loader-css]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = base + '/loader.css';
        l.setAttribute('data-eh-loader-css', 'true');
        document.head.appendChild(l);
      }

      // optional: preload fragment to warm fetch
      try { await fetch(base + '/loader.html', { cache: 'no-store' }); } catch (e) { }

      // add loader.js and wait for it to load
      const s = document.createElement('script');
      s.src = base + '/loader.js';
      s.defer = true;
      s.setAttribute('data-eh-loader-js', 'true');

      s.onload = () => {
        if (window.Loader) {
          // NOW it's safe to call Loader
          Loader.show({ mode: 'fullscreen' });
          // const section = document.getElementById('card'); // ensure position:relative
          // Loader.show({ mode: 'inline', target: section });
          // example hide after 1.8s (remove or call hide when work finishes)
          // setTimeout(() => Loader.hide(), 1800);
        } else {
          console.error('loader.js loaded but window.Loader not found.');
        }
      };

      s.onerror = () => console.error('Failed to load loader.js — check path:', s.src);
      document.body.appendChild(s);
    })();

  // Form & UI elements
  const mainCategory = document.getElementById('mainCategory');
  const subCategory = document.getElementById('subCategory');
  const condition = document.getElementById('condition');
  const availibility = document.getElementById('availability');
  const propertyType = document.getElementById('propertyType');
  const subGroup = document.querySelector('.subcategory-group');
  const typeGroup = document.querySelector('.property-type-group');
  const progressDialog = document.getElementById('progressDialog');

  // AI controls elements
  const aiToggle = document.getElementById('aiToggle');               // visible toggle
  const aiToggleLabel = document.getElementById('aiToggleLabel');     // toggle label
  const aiControls = document.querySelector('.ai-controls');         // wrapper for improve button + hint

  // File inputs and form
  const mainImagesInput = document.getElementById('mainImages');
  const descImagesInput = document.getElementById('descImages');
  const propertyForm = document.getElementById('propertyForm');
  let PROPERTY_TITLE
  let pushkey;
  
  const propertySubmitt = `
<section class="engles-notif" role="article" aria-label="Property submission acknowledged">
  <div class="header">
    <div class="logo-badge" aria-hidden="true">EH</div>
    <div>
      <h2>Dear Valued EaglesHub User,</h2>
      <p class="lead">Property Successfully Submitted</p>
    </div>
  </div>

  <div class="body">
    <p>
      Thank you — your property has been successfully submitted to EaglesHub and is now pending property verification.
      To complete verification you may be asked to provide <strong>images, documents</strong>, or a short <strong>video walkthrough</strong> of the property.
    </p>

    <p>
      <strong>What to expect:</strong>
      <ul>
        <li>Your property documents are securely stored and will only be used for verification purposes.</li>
        <li>Verification helps protect buyers and ensures the authenticity of listings.</li>
        <li>Once verification completes, your listing will go live and be visible to customers.</li>
      </ul>
    </p>

    <p>
      When you’re ready, proceed to verify the property now.
    </p>

    <a class="btn btn-primary" href="propertyVerificatio.html" role="button" aria-label="Verify property">Verify Property</a>

    <p class="small">If you have concerns about document privacy, please contact support; we adhere to data protection and only use documents for verification.</p>
  </div>
</section>`
  
  const propertySubmitted = `
<section class="engles-notif" role="article" aria-label="Property submission acknowledged">
  <div class="header">
    <div class="logo-badge" aria-hidden="true">EH</div>
    <div>
      <h2>Dear Valued EaglesHub User,</h2>
      <p class="lead">Property Successfully Submitted</p>
    </div>
  </div>

  <div class="body">
    <p>
      Thank you — your property has been successfully submitted to EaglesHub and is now pending property verification.
      To complete verification you may be asked to provide <strong>images, documents</strong>, or a short <strong>video walkthrough</strong> of the property.
    </p>

    <p>
      <strong>What to expect:</strong>
      <ul>
        <li>Your property documents are securely stored and will only be used for verification purposes.</li>
        <li>Verification helps protect buyers and ensures the authenticity of listings.</li>
        <li>Once verification completes, your listing will go live and be visible to customers.</li>
      </ul>
    </p>

    <p>
      When you’re ready, proceed to verify the property now.
    </p>

    <p>Thank you for adding property titled <strong>{{PROPERTY_TITLE}}</strong> to the Engles Hub.</p>

    <a class="btn btn-primary" href="propertyVerificatio.html?key=${pushkey}" role="button" aria-label="Verify property">Verify Property</a>

    <p class="small">If you have concerns about document privacy, please contact support; we adhere to data protection and only use documents for verification.</p>
  </div>
</section>`

  
  // Limits
  const MAX_MAIN_IMAGES = 5;
  const MAX_DESC_IMAGES = 15;

  // Utility: generate id
  function generateId(prefix, length) {
    return prefix + Math.random().toString().substr(2, length);
  }
  let propertyId = generateId("sku", 5);

  // Small ephemeral message helper (bottom-right) - used across the file
  function showTempMessage(msg) {
    let el = document.getElementById('tempMsg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tempMsg';
      el.style.position = 'fixed';
      el.style.right = '18px';
      el.style.bottom = '18px';
      el.style.background = 'rgba(17,24,39,0.95)';
      el.style.color = '#fff';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '10px';
      el.style.fontSize = '13px';
      el.style.zIndex = 99999;
      el.style.opacity = '0';
      el.style.transition = 'opacity .18s ease, transform .18s ease';
      document.body.appendChild(el);
    }
    el.innerText = msg;
    el.classList.add('show');
    el.style.opacity = '1';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.classList.remove('show');
    }, 1600);
  }

  // Progress dialog helpers (use existing overlay if present)
  function showProgressDialogLocal() {
    if (progressDialog) progressDialog.style.display = 'block';
  }
  function hideProgressDialogLocal() {
    if (progressDialog) progressDialog.style.display = 'none';
  }

  // Debug UI: visible debug panel + helper (no console usage)
  function debugUI(message) {
    // create panel if not present
    let panel = document.getElementById('aiDebugPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'aiDebugPanel';
      panel.style.position = 'fixed';
      panel.style.left = '12px';
      panel.style.bottom = '12px';
      panel.style.maxWidth = '45%';
      panel.style.maxHeight = '40%';
      panel.style.overflow = 'auto';
      panel.style.background = 'rgba(0,0,0,0.82)';
      panel.style.color = '#e6e6e6';
      panel.style.padding = '10px';
      panel.style.fontSize = '12px';
      panel.style.borderRadius = '8px';
      panel.style.zIndex = 100000;
      panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)';
      panel.style.lineHeight = '1.3';
      panel.style.whiteSpace = 'pre-wrap';
      panel.style.fontFamily = 'monospace';
      document.body.appendChild(panel);
    }
    const ts = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.textContent = `[${ts}] ${message}`;
    panel.appendChild(line);
    // keep at most 80 lines
    while (panel.childElementCount > 80) {
      panel.removeChild(panel.firstChild);
    }
  }

  // Ensure aiControls hidden by default and toggle OFF by default
  if (aiControls) aiControls.classList.remove('show');
  if (aiToggle) {
    aiToggle.checked = false;
    if (aiToggleLabel) aiToggleLabel.innerText = 'Use AI to improve description.';
    // show/hide aiControls on toggle change
    aiToggle.addEventListener('change', () => {
      if (!aiControls) return;
      if (aiToggle.checked) aiControls.classList.add('show');
      else aiControls.classList.remove('show');
    });
  }

  /* =========================
     AUTH & plan logic
     ========================= */

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userId = user.uid;
      const userRef = database.ref(`Users/${userId}`);
      try {
        await userRef.once('value');
      } catch (err) {
        console.warn('Could not read Users/ snapshot:', err);
      }

      const plan = (sessionStorage.getItem('plan') || 'free').toLowerCase();

      const planLimits = {
        starter: 1,
        profession: 7,
        business: 15,
        enterprise: Infinity
      };

      const allowedUploads = planLimits[plan];
      const planMessageEl = document.getElementById('plan-message');
      const publishBtn = document.getElementById('submit-btn');

      try {
        const snapshot = await database.ref(`Properties/${userId}`).once('value');
        const properties = snapshot.val() || {};

        let activeCount = 0;
        for (const key in properties) {
          if (properties[key].meta && properties[key].meta.status &&
              typeof properties[key].meta.status === 'string' &&
              properties[key].meta.status.toLowerCase() === 'active') {
            activeCount++;
          }
        }

        if (activeCount >= allowedUploads) {
          if (planMessageEl) {
            planMessageEl.innerText = `You have reached your ${plan.toUpperCase()} plan limit of ${allowedUploads} active properties. Upgrade your plan to publish more.`;
            planMessageEl.style.color = '#d9534f';
          }
          if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.style.opacity = 0.6;
            publishBtn.style.cursor = 'not-allowed';
          }
        } else {
          if (planMessageEl) {
            planMessageEl.innerText = `You can upload up to ${allowedUploads} properties on your ${plan.toUpperCase()} plan.`;
            planMessageEl.style.color = '#5cb85c';
          }
          if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.style.opacity = 1;
            publishBtn.style.cursor = 'pointer';
          }
        }
      } catch (error) {
        console.error("Error checking property limits:", error);
        if (planMessageEl) {
          planMessageEl.innerText = "Error loading plan details. Please try again.";
          planMessageEl.style.color = '#d9534f';
        }
        if (publishBtn) publishBtn.disabled = true;
      }
    }
  });

  /* =========================
     Nigeria states & categories
     ========================= */

  const nigeriaLocations = {
    "Abia": ["Umuahia", "Aba", "Ohafia", "Arochukwu"],
    "Adamawa": ["Yola", "Mubi", "Jimeta", "Numan"],
    "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron"],
    "Anambra": ["Awka", "Onitsha", "Nnewi", "Aguata"],
    "Bauchi": ["Bauchi", "Azare", "Jama'are", "Katagum"],
    "Bayelsa": ["Yenagoa", "Brass", "Sagbama", "Nembe"],
    "Benue": ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala"],
    "Borno": ["Maiduguri", "Bama", "Dikwa", "Biue"],
    "Cross River": ["Calabar", "Ugep", "Ogoja", "Ikom"],
    "Delta": ["Asaba", "Warri", "Sapele", "Koko"],
    "Ebonyi": ["Abakaliki", "Afikpo", "Onueke", "Edda"],
    "Edo": ["Benin City", "Auchi", "Ekpoma", "Igueben"],
    "Ekiti": ["Ado Ekiti", "Ikere", "Ise", "Emure"],
    "Enugu": ["Enugu", "Nsukka", "Agbani", "Awgu"],
    "Gombe": ["Gombe", "Bajoga", "Kumo", "Dukku"],
    "Imo": ["Owerri", "Okigwe", "Orlu", "Mbaise"],
    "Jigawa": ["Dutse", "Hadejia", "Birnin Kudu", "Gumel"],
    "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Sabon Gari"],
    "Kano": ["Kano", "Daura", "Wudil", "Gaya"],
    "Katsina": ["Katsina", "Daura", "Funtua", "Malumfashi"],
    "Kebbi": ["Birnin Kebbi", "Argungu", "Yelwa", "Zuru"],
    "Kogi": ["Lokoja", "Okene", "Idah", "Kabba"],
    "Kwara": ["Ilorin", "Offa", "Jebba", "Patigi"],
    "Lagos": ["Lagos Island", "Lagos Mainland", "Ikeja", "Lekki"],
    "Nasarawa": ["Lafia", "Keffi", "Akwanga", "Nasarawa"],
    "Niger": ["Minna", "Bida", "Suleja", "Kontagora"],
    "Ogun": ["Abeokuta", "Sagamu", "Ijebu Ode", "Ilaro"],
    "Ondo": ["Akure", "Ondo", "Owo", "Okitipupa"],
    "Osun": ["Osogbo", "Ilesa", "Ede", "Ikirun"],
    "Oyo": ["Ibadan", "Ogbomoso", "Oyo", "Iseyin"],
    "Plateau": ["Jos", "Bukuru", "Shendam", "Pankshin"],
    "Rivers": ["Port Harcourt", "Bonny", "Okrika", "Eleme"],
    "Sokoto": ["Sokoto", "Tambuwal", "Wurno", "Gwadabawa"],
    "Taraba": ["Jalingo", "Bali", "Wukari", "Ibi"],
    "Yobe": ["Damaturu", "Potiskum", "Gashua", "Nguru"],
    "Zamfara": ["Gusau", "Kaura Namoda", "Anka", "Talata Mafara"],
    "FCT": ["Abuja", "Gwagwalada", "Kuje", "Bwari"]
  };

  const propertyCategories = {
    "Residential": {
      "Houses": ["Bungalow", "Duplex", "Terrace", "Detached", "Semi-detached", "Townhouse", "Maisonette"],
      "Apartments": ["Studio", "1-Bedroom", "2-Bedroom", "3-Bedroom", "4-Bedroom", "Penthouse", "Serviced Apartment"],
      "Estates": ["Gated Community", "Luxury Estate", "Mid-Income Estate", "Retirement Village", "Government Housing Scheme"],
      "Special": ["Beach Houses", "Island Properties", "Historic Homes", "Vacation Homes", "Heritage Properties"]
    },
    "Commercial": {
      "Office": ["Corporate Office", "Co-working Space", "Shop Office", "Medical Complex", "Banking Hall"],
      "Retail": ["Shopping Mall", "High Street Shop", "Kiosk", "Supermarket", "Open Market Stall"],
      "Industrial": ["Warehouse", "Factory", "Logistics Hub", "Manufacturing Plant", "Storage Facility"],
      "Hospitality": ["Hotel", "Event Center", "Restaurant", "Resort", "Bar/Club", "Guest House"]
    },
    "Land": {
      "Residential": ["Plot", "Acreage", "Waterfront", "Residential Layout", "Family Compound"],
      "Commercial": ["Commercial Plot", "Development Land", "Filling Station Plot", "Advertising Space"],
      "Agricultural": ["Farmland", "Ranch", "Plantation", "Poultry Farm", "Fish Farm", "Orchard"],
      "Industrial": ["Industrial Park", "Free Zone", "Mining Site", "Quarry Site"]
    },
    "Special Purpose": {
      "Religious": ["Church", "Mosque", "Shrine", "Cathedral", "Prayer Camp"],
      "Institutional": ["School", "University", "Hospital", "Government Building", "Military Base", "Prison"],
      "Recreational": ["Sports Complex", "Golf Course", "Resort", "Amusement Park", "Theme Park"],
      "Infrastructure": ["Power Plant", "Dam Site", "Telecom Mast", "Water Treatment Plant"]
    }
  };

  // Populate states select
  const stateSelect = document.getElementById('stateSelect');
  if (stateSelect) {
    Object.keys(nigeriaLocations).forEach(state => {
      const opt = document.createElement('option');
      opt.value = state;
      opt.innerText = state;
      stateSelect.appendChild(opt);
    });

    stateSelect.addEventListener('change', function () {
      const citySelect = document.getElementById('citySelect');
      if (!citySelect) return;
      citySelect.innerHTML = '<option value="">Select City</option>';
      const cities = nigeriaLocations[this.value] || [];
      cities.forEach(city => {
        const co = document.createElement('option');
        co.value = city;
        co.innerText = city;
        citySelect.appendChild(co);
      });
    });
  }

  // Main category change
  if (mainCategory) {
    mainCategory.addEventListener('change', function () {
      if (!this.value) {
        if (subGroup) subGroup.style.display = 'none';
        if (typeGroup) typeGroup.style.display = 'none';
        return;
      }
      // Populate subCategory
      if (subCategory) {
        subCategory.innerHTML = '<option value="">Select Sub-category</option>';
        const cats = Object.keys(propertyCategories[this.value] || {});
        cats.forEach(cat => {
          const o = document.createElement('option');
          o.value = cat;
          o.innerText = cat;
          subCategory.appendChild(o);
        });
        if (subGroup) subGroup.style.display = 'block';
      }
      if (typeGroup) typeGroup.style.display = 'none';
    });
  }

  // Subcategory -> property types
  if (subCategory) {
    subCategory.addEventListener('change', function () {
      if (!this.value) {
        if (typeGroup) typeGroup.style.display = 'none';
        return;
      }
      if (propertyType) {
        propertyType.innerHTML = '<option value="">Select Property Type</option>';
        const mainCat = mainCategory.value;
        const types = (propertyCategories[mainCat] && propertyCategories[mainCat][this.value]) || [];
        types.forEach(t => {
          const o = document.createElement('option');
          o.value = t;
          o.innerText = t;
          propertyType.appendChild(o);
        });
        if (typeGroup) typeGroup.style.display = 'block';
      }
    });
  }

  /* ============================
     File limit enforcement helpers
     ============================ */

  // Trim selected files to a maxAllowed (keep first N)
  function enforceFileLimit(inputEl, maxAllowed, label) {
    if (!inputEl || !inputEl.files) return;
    const files = inputEl.files;
    if (files.length <= maxAllowed) return;

    const dt = new DataTransfer();
    for (let i = 0; i < Math.min(files.length, maxAllowed); i++) {
      dt.items.add(files[i]);
    }
    inputEl.files = dt.files;
    showTempMessage(`${label}: only first ${maxAllowed} files were kept.`);
  }

  if (mainImagesInput) {
    mainImagesInput.addEventListener('change', () => {
      enforceFileLimit(mainImagesInput, MAX_MAIN_IMAGES, 'Main images');
    });
  }
  if (descImagesInput) {
    descImagesInput.addEventListener('change', () => {
      enforceFileLimit(descImagesInput, MAX_DESC_IMAGES, 'Description images');
    });
  }

  /* ============================
     Upload helper
     Note: using compat storage.put then .then(...) as in your original code
     ============================ */
  async function uploadImages(files, path) {
    const uploadPromises = [];
    for (const file of files) {
      const storageRef = storage.ref(`${path}/${Date.now()}_${file.name}`);
      const uploadTask = storageRef.put(file);
      uploadPromises.push(uploadTask.then(snapshot => snapshot.ref.getDownloadURL()));
    }
    return Promise.all(uploadPromises);
  }

  /* ============================
     Main form submit handler (uploads & DB save)
     ============================ */
  if (propertyForm) {
    propertyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate file counts again (guard)
      const mainCount = mainImagesInput ? mainImagesInput.files.length : 0;
      const descCount = descImagesInput ? descImagesInput.files.length : 0;
      if (mainCount < 1 || mainCount > MAX_MAIN_IMAGES) {
        showTempMessage(`Please select between 1 and ${MAX_MAIN_IMAGES} main images.`);
        return;
      }
      if (descCount < 1 || descCount > MAX_DESC_IMAGES) {
        showTempMessage(`Please select between 1 and ${MAX_DESC_IMAGES} description images.`);
        return;
      }

      const selectedCategory = {
        mainCategory: mainCategory ? mainCategory.value : '',
        subCategory: subCategory ? subCategory.value : '',
        CategoryType: propertyType ? propertyType.value : '',
        condition: condition ? condition.value :'',
        availibility: availibility ? availibility.value : ''
      };

      const user = auth.currentUser;
      if (!user) {
        alert('Please login first!');
        return;
      }

      try {
        const pushKey = database.ref().child('Properties').push().key;
        showProgressDialogLocal();

        const mainFiles = mainImagesInput ? Array.from(mainImagesInput.files) : [];
        const descFiles = descImagesInput ? Array.from(descImagesInput.files) : [];

        // upload
        const mainImagesUrls = await uploadImages(mainFiles, `Properties/${user.uid}/${pushKey}/mainImages`);
        const descImagesUrls = await uploadImages(descFiles, `Properties/${user.uid}/${pushKey}/descImages`);

        const propertyData = {
          meta: {
            userId: user.uid,
            pushKey: pushKey,
            propertyId: propertyId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: "review"
          },
          details: {
            title: document.getElementById('propertyTitle') ? document.getElementById('propertyTitle').value : '',
            description: document.getElementById('propertyDescription') ? document.getElementById('propertyDescription').value : '',
            price: parseFloat(document.getElementById('price') ? document.getElementById('price').value : 0),
            currency: "NGN"
          },
          location: {
            street: document.getElementById('streetAddress') ? document.getElementById('streetAddress').value : '',
            city: document.getElementById('citySelect') ? document.getElementById('citySelect').value : '',
            state: document.getElementById('stateSelect') ? document.getElementById('stateSelect').value : '',
            country: "Nigeria"
          },
          media: {
            mainImageUrl: mainImagesUrls,
            decImage: descImagesUrls
          },
          classification: selectedCategory
        };
        PROPERTY_TITLE = document.getElementById('propertyTitle') ? document.getElementById('propertyTitle').value : '',

        pushkey = propertyData.meta.pushKey;
        await database.ref(`Properties/${user.uid}/${propertyData.meta.pushKey}`).set(propertyData);
        hideProgressDialogLocal();
        const notifRef = database.ref(`Users/${userId}/notifications`).push();
      await notifRef.set({
        content: propertySubmitted,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'new'
      });
        alert('Property published successfully!');
      } catch (error) {
        console.error('Error:', error);
        hideProgressDialogLocal();
        alert('Error publishing property. Please try again.');
      }
    });
  }

  /* ============================
     AI Improve description handler (updated to POST only { description })
     - longer timeout (3 minutes), abort, safe parsing, undo toast, visible debug & alerts
     ============================ */

  (async () => {
    // Config: AI endpoint (change for production)
    // <-- CHANGED PATH AFTER engleshub.onrender.com AS REQUESTED -->
    const AI_ENDPOINT = (window.AI_ENDPOINT || 'https://engleshub.onrender.com') + '/api/generate-description';
    const REQUEST_TIMEOUT_MS = 180000; // 180s = 3 minutes (change to 120000 for 2 minutes)
    const MAX_DESCRIPTION_CHARS = 6000;

    // find the improve button (compatible with multiple possible IDs)
    const aiButton = document.getElementById('aiButton')
                   || document.getElementById('aiCheckBtn')
                   || document.getElementById('aiPrimaryBtn');

    if (!aiButton) {
      debugUI('AI button not found. Expected id \"aiButton\" or \"aiCheckBtn\" or \"aiPrimaryBtn\".');
      return;
    }

    // Undo toast (created only when needed) - NOW PERSISTENT until user clicks Undo
    function showUndoToast(originalTitle, originalText) {
      let toast = document.getElementById('aiUndoToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'aiUndoToast';
        toast.style.position = 'fixed';
        toast.style.right = '18px';
        toast.style.bottom = '18px';
        toast.style.background = 'rgba(17,24,39,0.95)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 12px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = 99999;
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.style.fontSize = '13px';
        document.body.appendChild(toast);
      }
      toast.innerHTML = ''; // clear
      const msg = document.createElement('span');
      msg.innerText = 'AI result applied.';
      const undoBtn = document.createElement('button');
      undoBtn.innerText = 'Undo';
      undoBtn.style.background = '#fff';
      undoBtn.style.color = '#111';
      undoBtn.style.border = 'none';
      undoBtn.style.padding = '6px 8px';
      undoBtn.style.borderRadius = '6px';
      undoBtn.style.cursor = 'pointer';
      undoBtn.addEventListener('click', () => {
        const descEl = document.getElementById('propertyDescription');
        const titleEl = document.getElementById('propertyTitle');
        if (descEl) descEl.value = originalText;
        if (titleEl) titleEl.value = originalTitle;
        // remove toast after undo
        try { toast.remove(); } catch (e) {}
        showTempMessage('Original title & description restored.');
      });
      toast.appendChild(msg);
      toast.appendChild(undoBtn);

      // persistent: do NOT auto-hide; user must click Undo to restore original content
    }

    // Abort controller holder so we can cancel if user re-clicks
    let activeController = null;

    async function checkOpenAI() {
      const resp = await fetch('https://yourserver.com/api/check-openai');
      const data = await resp.json();
      console.log('Check OpenAI result:', data);
      alert(JSON.stringify(data, null, 2));
    }

    // === REPLACED aiButton click handler (only this block was changed) ===
    aiButton.addEventListener('click', async () => {
      checkOpenAI();
      const descriptionEl = document.getElementById('propertyDescription');
      const titleEl = document.getElementById('propertyTitle');
      if (!descriptionEl) {
        showTempMessage('Description field not found.');
        debugUI('Description field with id \"propertyDescription\" not found in DOM.');
        alert('Description field not found on this page.');
        return;
      }

      let description = (descriptionEl.value || '').trim();
      if (!description) {
        showTempMessage('Please enter the property description first.');
        debugUI('User attempted AI improve with empty description.');
        alert('Please enter the property description first before using AI.');
        return;
      }

      // enforce max length
      if (description.length > MAX_DESCRIPTION_CHARS) {
        description = description.slice(0, MAX_DESCRIPTION_CHARS);
        descriptionEl.value = description;
        showTempMessage(`Description truncated to ${MAX_DESCRIPTION_CHARS} characters.`);
        debugUI(`Description exceeded ${MAX_DESCRIPTION_CHARS}, truncated.`);
      }

      const backupDesc = description; // for Undo (description)
      const backupTitle = titleEl ? (titleEl.value || '') : ''; // for Undo (title)

      // abort previous
      if (activeController) {
        try { activeController.abort(); } catch (e) {}
        activeController = null;
        debugUI('Previous AI request aborted due to new request.');
      }

      const controller = new AbortController();
      activeController = controller;
      let timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (e) {}
      }, REQUEST_TIMEOUT_MS);

      const originalBtnText = aiButton.textContent;
      try {
        showProgressDialogLocal();
        aiButton.disabled = true;
        aiButton.setAttribute('aria-busy', 'true');
        aiButton.textContent = 'Working...';

        debugUI(`Starting AI request to ${AI_ENDPOINT} with timeout ${REQUEST_TIMEOUT_MS}ms`);
        // Inform user briefly (keeps your existing UX)
        alert('AI request started. Please wait up to a few minutes for the result.');

        const resp = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        activeController = null;

        // If non-OK: try to read body and put it into description so user can see what happened
        if (!resp.ok) {
          let bodyText = '';
          try {
            const ct = (resp.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('application/json')) {
              const jsonErr = await resp.json().catch(() => null);
              if (jsonErr) {
                bodyText = jsonErr.error || jsonErr.message || JSON.stringify(jsonErr);
              } else {
                bodyText = `Server returned ${resp.status} ${resp.statusText}`;
              }
            } else {
              bodyText = await resp.text().catch(() => `Server returned ${resp.status} ${resp.statusText}`);
            }
          } catch (e) {
            bodyText = `Server returned ${resp.status} ${resp.statusText}`;
          }
          debugUI(`Non-OK response: ${bodyText}`);
          // Directly apply raw server response into description (as you requested)
          descriptionEl.value = bodyText;
          showTempMessage('AI server returned an error — raw response applied to description.');
          showUndoToast(backupTitle, backupDesc);
          alert('AI request failed. Raw server response has been placed into the description for inspection.');
          return;
        }

        // OK response: extract useful text robustly
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        let aiResult = '';

        if (contentType.includes('application/json')) {
          const data = await resp.json().catch(() => null);
          if (data !== null && typeof data === 'object') {
            // Common field names
            aiResult = data.result ?? data.output ?? data.text ?? data.message ?? '';
            if (!aiResult) {
              // try to find the first string property
              for (const k of Object.keys(data)) {
                if (typeof data[k] === 'string' && data[k].trim()) {
                  aiResult = data[k];
                  break;
                }
              }
            }
            // if still not found, fall back to JSON string so user sees everything
            if (!aiResult) aiResult = JSON.stringify(data);
          } else if (typeof data === 'string') {
            aiResult = data;
          }
        } else {
          aiResult = await resp.text().catch(() => '');
        }

        // Final safety: if aiResult is empty or not a string, apply raw and inform user
        if (!aiResult || typeof aiResult !== 'string') {
          const raw = (typeof aiResult === 'object') ? JSON.stringify(aiResult) : String(aiResult || '');
          debugUI('AI returned empty/unexpected response. Applying raw to description.');
          descriptionEl.value = raw;
          showTempMessage('Unexpected AI response — raw response applied.');
          showUndoToast(backupTitle, backupDesc);
          alert('AI returned an unexpected response. Raw content was placed into the description for you to review.');
          return;
        }

        // === NEW: parse title=(...) and description=(...) if present ===
        function stripParens(s) {
          return s.replace(/^\(+/, '').replace(/\)+$/, '').trim();
        }

        let parsedTitle = '';
        let parsedDesc = '';

        const lower = aiResult.toLowerCase();
        const idxTitle = lower.indexOf('title=');
        const idxDesc = lower.indexOf('description=');

        if (idxTitle !== -1 && idxDesc !== -1 && idxDesc > idxTitle) {
          // title between title= and description=
          parsedTitle = aiResult.substring(idxTitle + 6, idxDesc).trim();
          parsedDesc = aiResult.substring(idxDesc + 12).trim();
          parsedTitle = stripParens(parsedTitle);
          parsedDesc = stripParens(parsedDesc);
        } else if (idxTitle !== -1 && idxDesc === -1) {
          parsedTitle = aiResult.substring(idxTitle + 6).trim();
          parsedTitle = stripParens(parsedTitle);
        } else if (idxDesc !== -1 && idxTitle === -1) {
          parsedDesc = aiResult.substring(idxDesc + 12).trim();
          parsedDesc = stripParens(parsedDesc);
        } else {
          // no explicit format found — attempt basic split: first non-empty line as title, rest as desc
          const lines = aiResult.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length === 1) {
            // single line -> treat as description
            parsedDesc = lines[0];
          } else if (lines.length > 1) {
            parsedTitle = lines[0];
            parsedDesc = lines.slice(1).join('\n\n');
          }
        }

        // Apply results: set title and description if parsed; otherwise put full aiResult into description
        if (parsedTitle) {
          if (titleEl) {
            titleEl.value = parsedTitle;
          }
        }
        if (parsedDesc) {
          descriptionEl.value = parsedDesc;
        } else if (!parsedTitle) {
          // neither parsed -> put raw result into description (preserve any existing structure)
          descriptionEl.value = aiResult;
        }

        descriptionEl.focus();
        showUndoToast(backupTitle, backupDesc);
        showTempMessage('AI result applied.');
        debugUI('AI result applied to title and/or description.');
        alert('AI result applied. Use the Undo button (bottom-right) to restore original title & description if needed.');

      } catch (err) {
        // Abort/timeouts
        if (err && err.name === 'AbortError') {
          debugUI('AI request aborted or timed out.');
          showTempMessage('AI request timed out or was cancelled.');
          alert('AI request timed out or was cancelled. Try again or check your server.');
        } else {
          const em = (err && err.message) ? err.message : String(err || 'Unknown error');
          debugUI('AI request failed: ' + em);
          // Place the raw error in the description so user can see it
          try { descriptionEl.value = em; } catch (e) { /* ignore */ }
          showTempMessage('AI Helper failed: ' + em);
          showUndoToast(backupTitle, backupDesc);
          alert('AI Helper failed: ' + em + '\nRaw error applied to description.');
        }
      } finally {
        clearTimeout(timeoutId);
        activeController = null;
        hideProgressDialogLocal();
        aiButton.disabled = false;
        aiButton.removeAttribute('aria-busy');
        aiButton.textContent = originalBtnText || 'Improve description';
      }
    });
    // === end replaced block ===

  })();

  /* end of DOMContentLoaded */
});
