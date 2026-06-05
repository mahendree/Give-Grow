/**
 * BANANO — index.js
 * Full application logic: navigation, wizard, proof, jobs, admin, tracking
 */

// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
const WIZ = {
  type: null,         // 'food' | 'clothes'
  category: null,     // e.g. 'Restaurant', 'Used'
  foodType: null,     // 'fresh' | 'surplus' (food only)
  quantity: 10,
  containerChoice: 'none',
  ngoPreference: 'nearest',
  currentStep: 1,
  proofFiles: [],
};

const STEP_LABELS_FOOD    = ['Type','Source','Quantity','Proof','Address','Confirm'];
const STEP_LABELS_CLOTHES = ['Type','Clothes','Count','Photos','Address','Confirm'];

// ══════════════════════════════════════════════════════════
//  PAGE NAVIGATION
// ══════════════════════════════════════════════════════════
function showPage(name) {
  const user = BananoDB.getCurrentUser();
  
  // Guard Clauses
  if (name === 'donate') {
    if (!user) {
      toast('🔒', 'Login Required', 'Please log in to start donating.');
      showPage('auth');
      return;
    }
    if (user.role !== 'user') {
      toast('⚠️', 'Restricted Access', 'Only donors can access the donation wizard.');
      showPage('dashboard');
      return;
    }
  }
  
  if (name === 'admin') {
    if (!user) {
      toast('🔒', 'Login Required', 'NGO Coordinator credentials are required to view the panel.');
      showPage('auth');
      return;
    }
    if (user.role !== 'ngo') {
      toast('⚠️', 'Restricted Access', 'Only NGO Coordinators can access this panel.');
      showPage('dashboard');
      return;
    }
  }
  
  if (name === 'delivery') {
    if (!user) {
      toast('🔒', 'Login Required', 'Delivery Partners must sign in to view active tasks.');
      showPage('auth');
      return;
    }
    if (user.role !== 'delivery') {
      toast('⚠️', 'Restricted Access', 'Only Delivery Partners can access this dashboard.');
      showPage('dashboard');
      return;
    }
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a, #mobile-menu a').forEach(a => a.classList.remove('active'));

  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  const nl = document.getElementById('nav-' + name);
  if (nl) nl.classList.add('active');

  closeNotifPanel();

  if (name === 'dashboard') renderDashboard();
  if (name === 'proof')     renderProofs('all');
  if (name === 'jobs')      renderJobs('all');
  if (name === 'admin')     renderAdmin('incoming');
  if (name === 'track')     renderTrackList();
  if (name === 'delivery')  renderDeliveryPanel();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  document.getElementById('mobile-menu').classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
function renderDashboard() {
  const stats = BananoDB.getStats();

  // Animated counters
  BananoAnimate.counter('stat-meals',    stats.meals);
  BananoAnimate.counter('stat-clothes',  stats.clothes);
  BananoAnimate.counter('stat-ngos',     stats.ngos);
  BananoAnimate.counter('stat-donors',   stats.donors);
  BananoAnimate.counter('stat-partners', stats.partners);
  BananoAnimate.counter('stat-cities',   stats.cities);
  setEl('nav-meals',   stats.meals);
  setEl('nav-clothes', stats.clothes);

  renderDonationHistory();
  updateNotifDot();
  drawCharts(stats);
}

function drawCharts(stats) {
  // Bar chart — monthly donations (simulated data)
  setTimeout(() => {
    BananoCharts.bar('chart-monthly',
      ['Jan','Feb','Mar','Apr','May','Jun'],
      [18, 32, 25, 41, 52, stats.meals + stats.clothes],
      { color: '#22a16a', textColor: '#5f8f72' }
    );

    // Doughnut — food vs clothes
    BananoCharts.doughnut('chart-types',
      ['Food', 'Clothes'],
      [stats.meals || 142, stats.clothes || 38],
      { colors: ['#22a16a', '#4db8ff'] }
    );
    setHtml('donut-legend', [
      { label: 'Food donations', color: '#22a16a', val: stats.meals || 142 },
      { label: 'Clothes donations', color: '#4db8ff', val: stats.clothes || 38 },
    ].map(i => `<div class="dl-item"><div class="dl-dot" style="background:${i.color}"></div><span>${i.label}</span><strong style="margin-left:auto">${i.val}</strong></div>`).join(''));

    // Line chart — deliveries over time
    BananoCharts.line('chart-line',
      ['Jan','Feb','Mar','Apr','May','Jun'],
      [5, 12, 9, 18, 24, 31],
      {}
    );
  }, 200);
}

function renderDonationHistory() {
  const donations = BananoDB.getAll('donations').slice().reverse();
  const el = document.getElementById('donation-history');
  if (!el) return;
  if (!donations.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:14px;padding:1rem 0">No donations yet. Start your first donation!</p>';
    return;
  }
  el.innerHTML = donations.map(d => `
    <div class="history-item">
      <div class="hi-left">
        <div class="hi-icon">${d.donationType === 'food' ? '🍱' : '👕'}</div>
        <div class="hi-info">
          <h4>${d.category} — ${d.quantity} ${d.donationType === 'food' ? 'people' : 'pcs'}</h4>
          <p>${d.ngoName} · ${BananoFormat.relative(d.createdAt)}</p>
        </div>
      </div>
      <div class="hi-right">
        ${d.partnerName ? `<span style="font-size:12px;color:var(--text3)">🚴 ${d.partnerName}</span>` : ''}
        <span class="status-badge ${statusCls(d.status)}">${statusLabel(d.status)}</span>
        <button class="btn btn-outline btn-sm" onclick="printDonationReceipt(${d.id})" title="Print receipt">🖨️</button>
        <button class="btn btn-outline btn-sm" onclick="shareDonation(${d.id})" title="Share">↗</button>
      </div>
    </div>`).join('');
  BananoAnimate.staggerIn('.history-item', 60);
}

// ══════════════════════════════════════════════════════════
//  DONATION WIZARD
// ══════════════════════════════════════════════════════════
function startDonation(type) {
  // reset state
  WIZ.type = type;
  WIZ.category = null; WIZ.foodType = null;
  WIZ.quantity = type === 'food' ? 30 : 5;
  WIZ.containerChoice = 'none'; WIZ.ngoPreference = 'nearest';
  WIZ.proofFiles = [];
  WIZ.aiVerified = false;
  WIZ.aiScanning = false;

  showPage('donate');
  wStep(1);
}

function wStep(n) {
  // hide all panels
  document.querySelectorAll('.step-panel').forEach(p => p.classList.add('hidden'));

  const el = document.getElementById('sp-' + n) || document.getElementById('sp-success');
  if (el) el.classList.remove('hidden');

  WIZ.currentStep = n;
  renderStepRow(n);
  updateProgress(n);

  // Dynamic panel content
  if (n === 1) setupS1();
  if (n === 2) setupS2();
  if (n === 3) setupS3();
  if (n === 4) setupS4();
  if (n === 5) setupS5();
  if (n === 6) setupS6();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStepRow(current) {
  const labels = WIZ.type === 'clothes' ? STEP_LABELS_CLOTHES : STEP_LABELS_FOOD;
  let html = '';
  labels.forEach((lbl, i) => {
    const n = i + 1;
    const cls = n < current ? 'done' : n === current ? 'active' : '';
    html += `<div class="sr-step ${cls}">
      <div class="sr-num">${n < current ? '✓' : n}</div>
      <span class="sr-label">${lbl}</span>
    </div>`;
    if (i < labels.length - 1) {
      html += `<div class="sr-line ${n < current ? 'done' : ''}"></div>`;
    }
  });
  setHtml('step-row', html);
}

function updateProgress(n) {
  const pct = Math.round(((n - 1) / 5) * 100);
  const el = document.getElementById('prog-fill');
  if (el) el.style.width = pct + '%';
}

// ── Step 1: Type ──────────────────────────────────────────
function setupS1() {
  if (WIZ.type) {
    const oc = document.getElementById('oc-' + WIZ.type);
    if (oc) { oc.classList.add('selected'); enableS1Next(); }
  }
}

function pickType(type, el) {
  WIZ.type = type;
  document.querySelectorAll('#sp-1 .opt-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  enableS1Next();
}

function enableS1Next() {
  const btn = document.getElementById('s1-next');
  if (btn) btn.disabled = false;
}

// ── Step 2: Source / Category ─────────────────────────────
function setupS2() {
  if (WIZ.type === 'food') {
    setEl('s2-title', 'Food source');
    setEl('s2-sub', 'Where is the food coming from?');
    setHtml('s2-opts', `
      <div class="opt-grid two-col">
        <div class="opt-card ${WIZ.category==='Restaurant'?'selected':''}" onclick="pickCategory('Restaurant',this)">
          <div class="oc-icon">🍽️</div><h4>Restaurant</h4><p>Surplus or prepared meals</p>
        </div>
        <div class="opt-card ${WIZ.category==='Catering'?'selected':''}" onclick="pickCategory('Catering',this)">
          <div class="oc-icon">🎪</div><h4>Catering service</h4><p>Event or bulk catering</p>
        </div>
        <div class="opt-card ${WIZ.category==='Home extra food'?'selected':''}" onclick="pickCategory('Home extra food',this)">
          <div class="oc-icon">🏠</div><h4>Home extra food</h4><p>Leftover home-cooked</p>
        </div>
      </div>`);
  } else {
    setEl('s2-title', 'Type of clothes');
    setEl('s2-sub', 'Are they new or used?');
    setHtml('s2-opts', `
      <div class="opt-grid two-col">
        <div class="opt-card ${WIZ.category==='New'?'selected':''}" onclick="pickCategory('New',this)">
          <div class="oc-icon">✨</div><h4>New clothes</h4><p>Brand new, with tags</p>
        </div>
        <div class="opt-card ${WIZ.category==='Used'?'selected':''}" onclick="pickCategory('Used',this)">
          <div class="oc-icon">🔄</div><h4>Used clothes</h4><p>Gently used, clean</p>
        </div>
      </div>`);
  }
}

function pickCategory(cat, el) {
  WIZ.category = cat;
  el.closest('.opt-grid').querySelectorAll('.opt-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Step 3: Quantity ──────────────────────────────────────
function setupS3() {
  if (WIZ.type === 'food') {
    setEl('s3-title', 'Food type & quantity');
    setHtml('s3-body', `
      <div style="margin-bottom:1.25rem">
        <div class="section-label">Type of food</div>
        <div class="opt-grid two-col">
          <div class="opt-card ${WIZ.foodType==='fresh'?'selected':''}" onclick="pickFoodType('fresh',this)">
            <div class="oc-icon">🌿</div><h4>Fresh prepared</h4><p>Ready to eat now</p>
          </div>
          <div class="opt-card ${WIZ.foodType==='surplus'?'selected':''}" onclick="pickFoodType('surplus',this)">
            <div class="oc-icon">📦</div><h4>Surplus / leftover</h4><p>Extra food, still good</p>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>How many people can this feed?</label>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty(-10)">−</button>
          <div class="qty-display"><span id="qty-num">${WIZ.quantity}</span></div>
          <button class="qty-btn" onclick="changeQty(10)">+</button>
          <span class="qty-unit">people</span>
        </div>
      </div>
      <div class="info-box" id="partner-hint">
        ${getPartnerHint()}
      </div>`);
  } else {
    setEl('s3-title', 'Number of pieces');
    setHtml('s3-body', `
      <div class="form-group">
        <label>How many pieces of clothing?</label>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty(-1)">−</button>
          <div class="qty-display"><span id="qty-num">${WIZ.quantity}</span></div>
          <button class="qty-btn" onclick="changeQty(1)">+</button>
          <span class="qty-unit">pcs</span>
        </div>
      </div>
      <div class="form-group">
        <label>Clothing types (optional)</label>
        <input type="text" placeholder="e.g. shirts, sarees, trousers, shoes..." id="clothes-types">
      </div>
      <div class="form-group">
        <label>Size range (optional)</label>
        <select id="clothes-size">
          <option value="">— Select —</option>
          <option>Kids (0–12 yrs)</option>
          <option>Adult S–M</option>
          <option>Adult L–XL</option>
          <option>Mixed sizes</option>
          <option>All ages</option>
        </select>
      </div>`);
  }
}

function pickFoodType(t, el) {
  WIZ.foodType = t;
  el.closest('.opt-grid').querySelectorAll('.opt-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function changeQty(delta) {
  const min = WIZ.type === 'food' ? 1 : 1;
  WIZ.quantity = Math.max(min, WIZ.quantity + delta);
  const el = document.getElementById('qty-num');
  if (el) el.textContent = WIZ.quantity;
  const hint = document.getElementById('partner-hint');
  if (hint) hint.innerHTML = getPartnerHint();
}

function getPartnerHint() {
  if (WIZ.type !== 'food') return '';
  const partners = WIZ.quantity >= 100 ? 2 : 1;
  const container = WIZ.quantity >= 80 ? 'Container may be required.' : 'No container needed.';
  return `<span>🚴</span><span><strong>${partners} delivery partner${partners > 1 ? 's' : ''}</strong> needed. ${container}</span>`;
}

// ── Step 4: Proof ─────────────────────────────────────────
function setupS4() {
  const isFood = WIZ.type === 'food';
  setEl('s4-title', isFood ? 'Upload proof' : 'Upload photos');
  setEl('s4-sub', isFood ? 'Photo or video of the food (required)' : 'Photos of the clothing items (required)');

  const cb = document.getElementById('container-block');
  if (cb) cb.classList.toggle('hidden', !isFood);

  // Disable next button until proof is uploaded and verified
  const btnNext = document.getElementById('s4-next');
  if (btnNext) {
    btnNext.disabled = !WIZ.aiVerified;
  }

  // Reset or set panel display
  const panel = document.getElementById('ai-verify-panel');
  if (panel) {
    if (WIZ.proofFiles.length > 0) {
      panel.classList.add('ai-active');
      if (WIZ.aiVerified) {
        // Keep verified state
      } else {
        if (WIZ.aiScanning) {
          setAiScanningState();
        } else {
          runAiVerification(WIZ.proofFiles[0]);
        }
      }
    } else {
      panel.classList.remove('ai-active');
      panel.className = 'ai-verify-box';
      setEl('ai-status-title', 'AI Authenticity Checker');
      setHtml('ai-status-badge', 'Ready');
      const badge = document.getElementById('ai-status-badge');
      if (badge) badge.className = 'ai-badge badge-scan';
      setEl('ai-status-desc', 'Please upload a photo of the items to verify authenticity.');
      setHtml('ai-details-list', '');
    }
  }
}

function handleUpload(evt, previewId) {
  const files = Array.from(evt.target.files);
  if (!files.length) return;
  
  WIZ.proofFiles = files; // Use current uploaded files
  const preview = document.getElementById(previewId);
  if (!preview) return;
  
  preview.innerHTML = '';
  
  WIZ.proofFiles.forEach((f, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'prev-thumb-wrapper';
    
    if (f.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      wrapper.appendChild(img);
    } else {
      const videoThumb = document.createElement('div');
      videoThumb.className = 'prev-thumb';
      videoThumb.textContent = '🎥';
      videoThumb.style.cssText = 'width:72px;height:72px;display:flex;align-items:center;justify-content:center;font-size:24px;border:1px solid var(--border);border-radius:8px;';
      wrapper.appendChild(videoThumb);
    }
    
    if (idx === 0) {
      const scanline = document.createElement('div');
      scanline.className = 'ai-scanline';
      scanline.id = 'active-scanline';
      wrapper.appendChild(scanline);
    }
    
    preview.appendChild(wrapper);
  });

  WIZ.aiVerified = false;
  const btnNext = document.getElementById('s4-next');
  if (btnNext) btnNext.disabled = true;

  runAiVerification(files[0]);
}

function pickContainer(val, el) {
  WIZ.containerChoice = val;
  el.closest('.opt-grid').querySelectorAll('.opt-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Gemini AI Verification ─────────────────────────────────
async function runAiVerification(file) {
  const panel = document.getElementById('ai-verify-panel');
  if (panel) panel.classList.add('ai-active');

  const apiKey = localStorage.getItem('gemini_api_key');

  WIZ.aiScanning = true;
  setAiScanningState();

  if (apiKey) {
    try {
      const base64Data = await fileToBase64(file);
      const base64String = base64Data.split(',')[1];
      const mimeType = file.type;

      const category = WIZ.type;
      const prompt = `You are the Give & Grow AI Donation Verifier. Analyze this uploaded image for a community donation of type: "${category}".
CRITICAL TASKS:
1. Identify what is in the image.
2. If the category is "food" and the image does NOT show clear edible food, meals, cooked food, fresh produce, or ingredients, you MUST set "verified" to false.
3. If the category is "clothes" and the image does NOT show clear wearable clothing, shirts, pants, jackets, shoes, or fabrics, you MUST set "verified" to false.
4. If the image is a screenshot, meme, logo, text document, stock photo, internet template, or has low visual quality (unclear, blurry, dark), you MUST set "verified" to false.
5. Provide a JSON response only. Do not wrap in markdown tags or include any introductory/trailing text.

Respond in this exact JSON schema:
{
  "verified": true or false,
  "confidence": number from 0 to 100,
  "detectedItems": "short description of the items seen",
  "qualityScore": "High" or "Medium" or "Low",
  "reason": "a concise explanation for the decision"
}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64String
                }
              }
            ]
          }
        ]
      };

      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const resData = await response.json();
      const rawText = resData.candidates[0].content.parts[0].text;
      
      // Robust JSON extraction using regex
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in Gemini response");
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      WIZ.aiScanning = false;
      applyVerificationResult(result);

    } catch (err) {
      console.error('Gemini API Error:', err);
      WIZ.aiScanning = false;
      WIZ.aiVerified = false;
      
      const title = document.getElementById('ai-status-title');
      const badge = document.getElementById('ai-status-badge');
      const desc = document.getElementById('ai-status-desc');
      const list = document.getElementById('ai-details-list');
      const btnNext = document.getElementById('s4-next');
      const scanline = document.getElementById('active-scanline');

      if (scanline) scanline.remove();
      
      if (panel) {
        panel.className = 'ai-verify-box ai-active ai-failed';
        if (badge) { badge.className = 'ai-badge badge-fail'; badge.textContent = 'API ERROR'; }
        if (title) title.textContent = '❌ AI Connection Failed';
        if (desc) desc.innerHTML = `Failed to connect to Gemini API. Error: ${err.message}. Please check your internet connection or API Key.`;
        if (list) list.innerHTML = '';
      }
      if (btnNext) btnNext.disabled = true;
      toast('❌', 'Gemini API Error', err.message);
    }
  } else {
    WIZ.aiScanning = false;
    WIZ.aiVerified = false;
    
    const title = document.getElementById('ai-status-title');
    const badge = document.getElementById('ai-status-badge');
    const desc = document.getElementById('ai-status-desc');
    const list = document.getElementById('ai-details-list');
    const btnNext = document.getElementById('s4-next');
    const scanline = document.getElementById('active-scanline');

    if (scanline) scanline.remove();
    
    if (panel) {
      panel.className = 'ai-verify-box ai-active ai-failed';
      if (badge) { badge.className = 'ai-badge badge-fail'; badge.textContent = 'ERROR'; }
      if (title) title.textContent = '🤖 API Key Required';
      if (desc) desc.innerHTML = 'AI verification is disabled because no Gemini API Key was found. Please click the robot icon 🤖 in the navbar to configure it.';
      if (list) list.innerHTML = '';
    }
    if (btnNext) btnNext.disabled = true;
    toast('⚠️', 'API Key Required', 'Please configure your Gemini API Key in settings.');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

function applyVerificationResult(result) {
  const panel = document.getElementById('ai-verify-panel');
  const title = document.getElementById('ai-status-title');
  const badge = document.getElementById('ai-status-badge');
  const desc = document.getElementById('ai-status-desc');
  const list = document.getElementById('ai-details-list');
  const btnNext = document.getElementById('s4-next');
  const scanline = document.getElementById('active-scanline');

  if (scanline) scanline.remove();

  if (!panel || !badge || !desc || !list || !btnNext) return;

  panel.className = 'ai-verify-box ai-active';

  if (result.verified) {
    WIZ.aiVerified = true;
    btnNext.disabled = false;

    panel.classList.add('ai-passed');
    badge.className = 'ai-badge badge-pass';
    badge.textContent = 'VERIFIED';
    title.textContent = '✓ AI Verification Passed';
    
    desc.innerHTML = `<strong>Items Detected:</strong> ${result.detectedItems}<br><strong>Result:</strong> ${result.reason}`;

    list.innerHTML = `
      <div class="ai-detail-item ok"><span>✅</span> Category Match: Yes</div>
      <div class="ai-detail-item ok"><span>✅</span> Quality Level: ${result.qualityScore}</div>
      <div class="ai-detail-item ok"><span>✅</span> Authenticity: ${result.confidence}% Match</div>
    `;
    toast('✅', 'Verification Passed', 'AI confirmed items are valid.');
  } else {
    WIZ.aiVerified = false;
    btnNext.disabled = true;

    panel.classList.add('ai-failed');
    badge.className = 'ai-badge badge-fail';
    badge.textContent = 'REJECTED';
    title.textContent = '❌ AI Verification Failed';
    
    desc.innerHTML = `<strong>Scan Result:</strong> ${result.reason}<br><span style="color:var(--red); font-weight: 600;">Please upload a valid, original photo of the items to proceed.</span>`;

    const isPoor = result.qualityScore === 'Low';
    list.innerHTML = `
      <div class="ai-detail-item ${result.detectedItems.toLowerCase().includes('unrelated') ? 'err' : 'ok'}">
        <span>${result.detectedItems.toLowerCase().includes('unrelated') ? '❌' : '✅'}</span> Category Match
      </div>
      <div class="ai-detail-item ${isPoor ? 'err' : 'ok'}">
        <span>${isPoor ? '❌' : '✅'}</span> Quality Level: ${result.qualityScore}
      </div>
      <div class="ai-detail-item err">
        <span>❌</span> Authenticity: ${result.confidence}% Confidence
      </div>
    `;
    toast('❌', 'Verification Failed', 'AI rejected the uploaded photo.');
  }
}

function setAiScanningState() {
  const panel = document.getElementById('ai-verify-panel');
  const title = document.getElementById('ai-status-title');
  const badge = document.getElementById('ai-status-badge');
  const desc = document.getElementById('ai-status-desc');
  const list = document.getElementById('ai-details-list');

  if (!panel || !badge || !desc || !list) return;

  panel.className = 'ai-verify-box ai-active ai-scanning';
  badge.className = 'ai-badge badge-scan';
  badge.textContent = 'SCANNING';
  title.textContent = '⏳ AI Checking Image...';
  desc.textContent = 'Running multi-point visual scan check for safety, originality, and category matching...';
  list.innerHTML = `
    <div class="ai-detail-item"><span>⏳</span> Category checking...</div>
    <div class="ai-detail-item"><span>⏳</span> Quality checking...</div>
    <div class="ai-detail-item"><span>⏳</span> Checking duplicate stock metadata...</div>
  `;
}

function saveGeminiSettings() {
  const keyInput = document.getElementById('gemini-api-key');
  if (!keyInput) return;
  const key = keyInput.value.trim();
  
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    toast('💾', 'Settings Saved', 'Gemini API key stored successfully.');
  } else {
    localStorage.removeItem('gemini_api_key');
    toast('🗑️', 'Settings Cleared', 'Gemini API key removed.');
  }
  closeModal('modal-ai-settings');
}

async function testGeminiConnection() {
  const keyInput = document.getElementById('gemini-api-key');
  const statusEl = document.getElementById('ai-settings-test-status');
  if (!keyInput || !statusEl) return;
  
  const key = keyInput.value.trim();
  if (!key) {
    statusEl.style.color = 'var(--red)';
    statusEl.textContent = '❌ Please enter an API key first.';
    return;
  }

  statusEl.style.color = 'var(--blue)';
  statusEl.textContent = '⏳ Connecting to Gemini...';

  try {
    const payload = {
      contents: [{ parts: [{ text: 'Respond with exactly the word "Success" if you read this.' }] }]
    };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates[0].content.parts[0].text.trim();
    
    if (reply.toLowerCase().includes('success')) {
      statusEl.style.color = '#22a16a';
      statusEl.textContent = '✅ API Connection Successful!';
    } else {
      statusEl.style.color = 'var(--amber)';
      statusEl.textContent = `⚠️ Connected but got unexpected response: "${reply}"`;
    }
  } catch (err) {
    statusEl.style.color = 'var(--red)';
    statusEl.textContent = `❌ Connection failed: ${err.message}`;
  }
}

function initAiSettings() {
  let apiKey = localStorage.getItem('gemini_api_key');
  const fallbackKey = 'AQ.Ab8RN6KRBUaHmYVibQT7EMQWX6Jv3chLk_0I7QPPCabHz4f7_Q';
  
  // Overwrite if it is empty, or if it is the old deprecated key
  if (!apiKey || apiKey === 'AIzaSyCDWs4nmNMy7LdkjLgCAabpjZ2ojgFjoYA') {
    apiKey = fallbackKey;
    localStorage.setItem('gemini_api_key', apiKey);
  }
  
  const input = document.getElementById('gemini-api-key');
  if (input && apiKey) {
    input.value = apiKey;
  }
}

// ── Step 5: Address & NGO ─────────────────────────────────
function setupS5() {
  const sn = document.getElementById('specific-ngo-select');
  if (sn) sn.classList.toggle('hidden', WIZ.ngoPreference !== 'specific');
}

function pickNGO(pref, el) {
  WIZ.ngoPreference = pref;
  document.querySelectorAll('.ngo-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  const sn = document.getElementById('specific-ngo-select');
  if (sn) sn.classList.toggle('hidden', pref !== 'specific');
}

function useMyLocation() {
  const s = document.getElementById('f-street');
  const c = document.getElementById('f-city');
  const p = document.getElementById('f-pin');
  if (s) s.value = '12 Park Street, Durgapur';
  if (c) c.value = 'Durgapur, West Bengal';
  if (p) p.value = '713201';
  toast('📍', 'Location captured', 'Durgapur, West Bengal');
}

function findDeliveryPartner() {
  const street = val('f-street');
  const city = val('f-city');
  if (!street && !city) {
    toast('⚠️', 'Address required', 'Please enter your address first.');
    return;
  }
  toast('🔍', 'Finding partner…', 'Searching nearby delivery partners.');
  setTimeout(() => {
    wStep(6);
    setTimeout(() => {
      const pb = document.getElementById('partner-box');
      if (pb) pb.style.display = 'flex';
    }, 600);
  }, 1200);
}

// ── Step 6: Confirm ───────────────────────────────────────
function setupS6() {
  const street = val('f-street') || '12 Park Street, Durgapur';
  const city = val('f-city') || 'Durgapur, WB';
  const ngoName = WIZ.ngoPreference === 'specific'
    ? (val('ngo-select') || 'Suchana Foundation')
    : 'Nearest NGO (auto)';
  const partners = WIZ.quantity >= 80 ? '2 partners' : '1 partner';
  const container = { none: 'Not needed', partner: 'Partner brings', donor: 'Donor provides' }[WIZ.containerChoice];
  const qty = WIZ.type === 'food' ? WIZ.quantity + ' people' : WIZ.quantity + ' pcs';

  const items = [
    { k: 'Type',      v: WIZ.type === 'food' ? `Food (${WIZ.category || 'Restaurant'})` : `Clothes (${WIZ.category || 'Used'})` },
    { k: 'Food type', v: WIZ.type === 'food' ? (WIZ.foodType || 'Not specified') : '—' },
    { k: 'Quantity',  v: qty },
    { k: 'Partners',  v: partners },
    { k: 'Container', v: container },
    { k: 'Address',   v: street + ', ' + city },
    { k: 'NGO',       v: ngoName },
    { k: 'Proof',     v: WIZ.proofFiles.length ? `${WIZ.proofFiles.length} file(s)` : 'No files uploaded' },
  ];

  setHtml('confirm-grid', items.map(i => `
    <div class="cg-item"><div class="cg-key">${i.k}</div><div class="cg-val">${i.v}</div></div>`).join(''));

  // Set partner info
  const partners_list = BananoDB.query('delivery_partners', p => p.available);
  const partner = partners_list[0];
  if (partner) {
    setEl('pa-name', partner.name);
    setEl('pa-info', `${partner.area} · ★ ${partner.rating} · ${partner.totalDeliveries} deliveries`);
  }
}

// ── Submit ────────────────────────────────────────────────
function submitDonation() {
  const street = val('f-street') || '12 Park Street, Durgapur';
  const city = val('f-city') || 'Durgapur, WB';
  const ngoName = WIZ.ngoPreference === 'specific'
    ? (val('ngo-select') || 'Suchana Foundation')
    : 'Suchana Foundation';

  // Assign partner
  const partnersList = BananoDB.query('delivery_partners', p => p.available);
  const partner = partnersList[0];

  const donation = BananoDB.insert('donations', {
    donationType: WIZ.type,
    category: WIZ.category || (WIZ.type === 'food' ? 'Restaurant' : 'Used'),
    foodType: WIZ.foodType || '',
    quantity: WIZ.quantity,
    containerChoice: WIZ.containerChoice,
    partnersNeeded: WIZ.quantity >= 80 ? 2 : 1,
    address: street,
    city: city,
    ngoPreference: WIZ.ngoPreference,
    ngoName: ngoName,
    status: 'pending',
    partnerName: partner ? partner.name : '',
    partnerPhone: partner ? partner.phone : '',
    proofPath: '',
    createdAt: new Date().toISOString(),
    deliveredAt: '',
  });

  // Mark partner as unavailable
  if (partner) {
    BananoDB.update('delivery_partners', partner.id, { available: false, currentDonationId: donation.id });
  }

  // Add notification
  BananoDB.insert('notifications', {
    donationId: donation.id,
    message: `Your donation (ID #${donation.id}) has been submitted! ${partner ? partner.name + ' will collect it.' : 'A partner will be assigned soon.'}`,
    type: 'submitted',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // Show success
  document.querySelectorAll('.step-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('sp-success').classList.remove('hidden');
  updateProgress(6);

  const qty = WIZ.type === 'food' ? WIZ.quantity + ' people' : WIZ.quantity + ' pcs';
  setHtml('success-box-info', `
    <div class="sbi-row"><span>Donation ID</span><strong>#${donation.id}</strong></div>
    <div class="sbi-row"><span>Type</span><strong>${donation.category} (${donation.donationType})</strong></div>
    <div class="sbi-row"><span>Quantity</span><strong>${qty}</strong></div>
    <div class="sbi-row"><span>NGO</span><strong>${ngoName}</strong></div>
    <div class="sbi-row"><span>Partner</span><strong>${partner ? partner.name : 'Being assigned…'}</strong></div>
    <div class="sbi-row"><span>Status</span><strong style="color:var(--amber)">⏳ Pending collection</strong></div>`);

  toast('✅', 'Donation submitted!', `ID #${donation.id} — partner will be in touch.`);
  updateNotifDot();

  // Simulate partner contact notification
  setTimeout(() => {
    if (partner) {
      toast('🔔', 'Partner assigned!', `${partner.name} will collect your donation today.`);
    }
  }, 4000);
}

// ══════════════════════════════════════════════════════════
//  PROOF PAGE
// ══════════════════════════════════════════════════════════
const PROOF_DATA = [
  { id:1, type:'food', emoji:'🍛', title:'50 meals — Suchana Foundation', partner:'Rahul Das', date:'May 25, 2025', ngo:'Suchana Foundation', qty:'50 meals', city:'Durgapur', note:'Hot rice and dal served to 50 people in Bidhan Nagar area.', verified:true },
  { id:2, type:'clothes', emoji:'👗', title:'30 clothes — Asha NGO', partner:'Priya Sen', date:'May 22, 2025', ngo:'Asha NGO', qty:'30 pieces', city:'Durgapur', note:'Mixed clothing for adults and children. All freshly washed.', verified:true },
  { id:3, type:'food', emoji:'🍲', title:'100 meals — HelpLine Trust', partner:'Arjun Khan', date:'May 18, 2025', ngo:'HelpLine Trust', qty:'100 meals', city:'Durgapur', note:'Catering surplus from a wedding. Packaged and distributed same day.', verified:true },
  { id:4, type:'clothes', emoji:'🧥', title:'20 jackets — Durgapur Care', partner:'Sunita Roy', date:'May 15, 2025', ngo:'Durgapur Care Center', qty:'20 jackets', city:'Durgapur', note:'Winter jackets donated for the homeless shelter.', verified:true },
  { id:5, type:'food', emoji:'🥘', title:'75 meals — Suchana Foundation', partner:'Rahul Das', date:'May 10, 2025', ngo:'Suchana Foundation', qty:'75 meals', city:'Durgapur', note:'Restaurant surplus from City Centre food court.', verified:true },
  { id:6, type:'clothes', emoji:'👔', title:'45 shirts — Asha NGO', partner:'Priya Sen', date:'May 5, 2025', ngo:'Asha NGO', qty:'45 pieces', city:'Asansol', note:'Corporate clothing donation — office shirts and trousers.', verified:true },
  { id:7, type:'food', emoji:'🍱', title:'60 meals — Asha NGO', partner:'Arjun Khan', date:'Apr 28, 2025', ngo:'Asha NGO', qty:'60 meals', city:'Durgapur', note:'Home-cooked food from a community kitchen.', verified:true },
  { id:8, type:'food', emoji:'🫕', title:'40 meals — HelpLine Trust', partner:'Sunita Roy', date:'Apr 22, 2025', ngo:'HelpLine Trust', qty:'40 meals', city:'Durgapur', note:'Freshly prepared food donated by a local caterer.', verified:true },
];

function renderProofs(filter) {
  let data = filter === 'all' ? PROOF_DATA
           : filter === 'recent' ? PROOF_DATA.slice(0, 3)
           : PROOF_DATA.filter(p => p.type === filter);

  const pb = { total: PROOF_DATA.length, food: PROOF_DATA.filter(p=>p.type==='food').length, clothes: PROOF_DATA.filter(p=>p.type==='clothes').length };
  setEl('pb-total', pb.total); setEl('pb-food', pb.food); setEl('pb-clothes', pb.clothes);

  setHtml('proof-grid', data.map(p => `
    <div class="proof-card" onclick="openProofDetail(${p.id})">
      <div class="proof-thumb">
        <span style="font-size:4.5rem">${p.emoji}</span>
        ${p.verified ? '<div class="proof-verified">✓ Verified</div>' : ''}
      </div>
      <div class="proof-body">
        <h4>${p.title}</h4>
        <p>Delivered by ${p.partner} · ${p.date}</p>
        <div class="proof-tags">
          <span class="ptag">📍 ${p.ngo}</span>
          <span class="ptag">📦 ${p.qty}</span>
          <span class="ptag">🏙️ ${p.city}</span>
        </div>
      </div>
    </div>`).join(''));
}

function filterProof(f, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProofs(f);
}

function openProofDetail(id) {
  const p = PROOF_DATA.find(x => x.id === id);
  if (!p) return;
  setHtml('proof-detail-content', `
    <div style="text-align:center;margin-bottom:1.5rem">
      <div style="font-size:6rem;margin-bottom:8px">${p.emoji}</div>
      <div class="proof-verified" style="position:static;display:inline-flex;margin-bottom:8px">✓ Verified Delivery</div>
      <h2>${p.title}</h2>
    </div>
    <div class="confirm-grid">
      <div class="cg-item"><div class="cg-key">Partner</div><div class="cg-val">🚴 ${p.partner}</div></div>
      <div class="cg-item"><div class="cg-key">NGO</div><div class="cg-val">🏠 ${p.ngo}</div></div>
      <div class="cg-item"><div class="cg-key">Quantity</div><div class="cg-val">📦 ${p.qty}</div></div>
      <div class="cg-item"><div class="cg-key">Date</div><div class="cg-val">📅 ${p.date}</div></div>
      <div class="cg-item"><div class="cg-key">City</div><div class="cg-val">🏙️ ${p.city}</div></div>
      <div class="cg-item"><div class="cg-key">Type</div><div class="cg-val">${p.type === 'food' ? '🍱 Food' : '👕 Clothes'}</div></div>
    </div>
    <div class="info-box" style="margin-top:1.25rem">
      <span>📝</span><span>${p.note}</span>
    </div>
    <div class="info-box success-box" style="margin-top:0.75rem">
      <span>💾</span><span>Record stored in SQLite database. Proof photo/video saved locally on delivery partner's device.</span>
    </div>`);
  openModal('modal-proof-detail');
}

// ══════════════════════════════════════════════════════════
//  JOBS PAGE
// ══════════════════════════════════════════════════════════
let currentJobTab = 'all';
function renderJobs(filter) {
  currentJobTab = filter;
  const jobs = BananoDB.getAll('jobs');
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.type === filter);
  setHtml('jobs-grid', filtered.map(j => `
    <div class="job-card">
      <div class="jc-header">
        <div class="jc-icon">${jobIcon(j.title)}</div>
        <div class="jc-badges">
          <div class="pay-badge">${j.pay}</div>
          <div class="slot-badge">${j.slots} openings</div>
        </div>
      </div>
      <h3>${j.title}</h3>
      <p>${j.description}</p>
      <div class="jc-actions">
        <button class="btn btn-primary btn-sm" onclick="applyForJob(${j.id},'${j.title}')">Apply now</button>
        <button class="btn btn-outline btn-sm" onclick="openModal('modal-refer')">Refer someone</button>
      </div>
    </div>`).join(''));
}

function switchJobTab(filter, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderJobs(filter);
}

function jobIcon(title) {
  const map = { 'Delivery Partner':'🚴', 'NGO Coordinator':'🏢', 'App Volunteer':'💻', 'Food Sorter':'🍱', 'Social Media Ambassador':'📢', 'Data Entry Operator':'📋' };
  return map[title] || '💼';
}

function applyForJob(id, title) {
  document.getElementById('apply-job-title').textContent = 'Apply for ' + title;
  document.getElementById('apply-job-title').dataset.jobId = id;
  openModal('modal-apply');
}

function submitApplication() {
  const name = val('apply-name');
  const phone = val('apply-phone');
  const area = val('apply-area');
  if (!name || !phone) { toast('⚠️', 'Required fields missing', 'Please enter name and phone.'); return; }

  const jobId = parseInt(document.getElementById('apply-job-title').dataset.jobId) || 1;
  const title = document.getElementById('apply-job-title').textContent.replace('Apply for ','');
  BananoDB.insert('job_applications', {
    jobId, title, applicantName: name, phone, email: val('apply-email'),
    area, reason: val('apply-reason'),
    status: 'pending', appliedAt: new Date().toISOString(),
  });

  closeModal('modal-apply');
  ['apply-name','apply-phone','apply-email','apply-area','apply-reason'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  toast('🎉', 'Application submitted!', `Thanks ${name}! We'll call within 24 hours.`);
}

function submitRefer() {
  const name = val('refer-name');
  const phone = val('refer-phone');
  if (!name) { toast('⚠️', 'Name required', "Please enter your friend's name."); return; }

  const code = 'BAN-' + Math.floor(1000+Math.random()*9000);
  BananoDB.insert('referrals', {
    referrerCode: code, friendName: name, friendPhone: phone,
    jobTitle: val('refer-job') || 'Delivery Partner',
    status: 'sent', createdAt: new Date().toISOString(),
  });
  closeModal('modal-refer');
  ['refer-name','refer-phone'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  toast('👥', 'Referral sent!', `${name} will receive an invitation.`);
}

// ══════════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════════
function renderAdmin(tab) {
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.admin-nav-btn[onclick="adminTab('${tab}',this)"]`);
  if (btn) btn.classList.add('active');

  const el = document.getElementById('admin-content');
  if (!el) return;

  if (tab === 'incoming') {
    const donations = BananoDB.getAll('donations');
    el.innerHTML = `
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem">Incoming Donations</h3>
      <table class="admin-table">
        <thead><tr>
          <th>ID</th><th>Type</th><th>Category</th><th>Qty</th>
          <th>NGO</th><th>Partner</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
        ${donations.map(d => `
          <tr>
            <td><strong>#${d.id}</strong></td>
            <td>${d.donationType === 'food' ? '🍱 Food' : '👕 Clothes'}</td>
            <td>${d.category}</td>
            <td>${d.quantity} ${d.donationType === 'food' ? 'ppl' : 'pcs'}</td>
            <td>${d.ngoName}</td>
            <td>${d.partnerName || '<span style="color:var(--text3)">—</span>'}</td>
            <td><span class="status-badge ${statusCls(d.status)}">${statusLabel(d.status)}</span></td>
            <td>
              ${d.status !== 'delivered' ? `<button class="btn btn-sm btn-green" onclick="adminMarkDelivered(${d.id})">✓ Mark delivered</button>` : '<span style="color:var(--text3);font-size:12px">Done</span>'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  else if (tab === 'partners') {
    const partners = BananoDB.getAll('delivery_partners');
    el.innerHTML = `
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem">Delivery Partners</h3>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Deliveries</th><th>Rating</th><th>Status</th></tr></thead>
        <tbody>
        ${partners.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.phone}</td>
            <td>${p.area}</td>
            <td>${p.totalDeliveries}</td>
            <td>★ ${p.rating}</td>
            <td><span class="status-badge ${p.available ? 'status-delivered' : 'status-transit'}">${p.available ? 'Available' : 'On delivery'}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <button class="btn btn-outline btn-sm" style="margin-top:1rem" onclick="showPage('jobs')">+ Add new partner</button>`;
  }

  else if (tab === 'ngos') {
    const ngos = BananoDB.getAll('ngos');
    el.innerHTML = `
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem">Registered NGOs</h3>
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Area</th><th>Phone</th><th>Coordinator</th><th>Capacity</th></tr></thead>
        <tbody>
        ${ngos.map(n => `
          <tr>
            <td><strong>${n.name}</strong></td>
            <td>${n.area}</td>
            <td>${n.phone}</td>
            <td>${n.coordinator}</td>
            <td>${n.capacity} ppl</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  else if (tab === 'database') {
    const schema = BananoDB.SCHEMA;
    const tableIcons = { donations:'📦', delivery_partners:'🚴', ngos:'🏠', notifications:'🔔', jobs:'💼', job_applications:'📋', referrals:'👥' };
    el.innerHTML = `
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:1rem">SQLite Database Schema</h3>
      <p class="muted" style="margin-bottom:1.25rem">banano.db · Stored on device (localStorage in web, SQLite file in native)</p>
      <div class="db-schema">
        ${Object.entries(schema).map(([tbl, cols]) => `
          <div class="db-table">
            <div class="db-table-name">${tableIcons[tbl] || '🗄️'} ${tbl}</div>
            ${cols.map((c,i) => `<div class="db-field">  ${c}${i===0?'<span class="f-pk">PK</span>':''}${c.endsWith('Id')||c==='id'?'<span class="f-type">INTEGER</span>':c.includes('At')||c.includes('Date')?'<span class="f-type">TEXT</span>':c==='available'||c.startsWith('is')?'<span class="f-type">BOOLEAN</span>':'<span class="f-type">TEXT</span>'}</div>`).join('')}
          </div>`).join('')}
      </div>
      <div style="margin-top:1.25rem;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="exportDB()">⬇ Export JSON</button>
        <button class="btn btn-outline btn-sm" onclick="if(confirm('Reset all data?')) { BananoDB.resetDB(); location.reload(); }">🔄 Reset DB</button>
      </div>`;
  }
}

function adminTab(tab, btn) {
  renderAdmin(tab);
}

function adminMarkDelivered(id) {
  BananoDB.markDelivered(id, 'Marked delivered by admin');
  toast('✅', 'Marked as delivered', `Donation #${id} delivered successfully.`);
  renderAdmin('incoming');
  renderDashboard();
  updateNotifDot();
}

function exportDB() {
  const data = BananoDB.exportDB();
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'banano_db.json';
  a.click();
  toast('⬇', 'Database exported', 'banano_db.json downloaded.');
}

// ══════════════════════════════════════════════════════════
//  TRACKING PAGE
// ══════════════════════════════════════════════════════════
function renderTrackList() {
  const donations = BananoDB.getAll('donations').filter(d => d.status !== 'delivered');
  const el = document.getElementById('track-list');
  if (!el) return;
  if (!donations.length) {
    el.innerHTML = '<p class="muted" style="padding:1rem 0">No active donations.</p>';
    return;
  }
  el.innerHTML = donations.map(d => renderTrackCard(d)).join('');
}

function renderTrackCard(d) {
  const steps = [
    { label: 'Donation submitted', detail: 'Saved to database', done: true },
    { label: 'Partner assigned', detail: d.partnerName || 'Pending', done: !!d.partnerName },
    { label: 'Partner en route', detail: d.status === 'transit' ? 'Currently collecting' : 'Waiting', done: d.status === 'transit' },
    { label: 'Delivered to NGO', detail: d.deliveredAt ? fmtDate(d.deliveredAt) : 'Pending delivery', done: d.status === 'delivered' },
    { label: 'NGO proof submitted', detail: 'Photo/video verified', done: d.status === 'delivered' },
  ];

  const activeIdx = steps.findIndex(s => !s.done);

  return `
    <div class="track-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <div>
          <strong style="font-size:15px">#${d.id} — ${d.donationType === 'food' ? '🍱' : '👕'} ${d.category}</strong>
          <p style="margin:0;font-size:13px;color:var(--text3)">${d.city} → ${d.ngoName}</p>
        </div>
        <span class="status-badge ${statusCls(d.status)}">${statusLabel(d.status)}</span>
      </div>
      <div class="track-timeline">
        ${steps.map((s, i) => `
          <div class="tl-item">
            <div class="tl-dot ${s.done ? 'done' : i === activeIdx ? 'active' : ''}"></div>
            <div class="tl-text">
              <h4>${s.label}</h4>
              <p>${s.detail}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function trackDonation() {
  const input = val('track-input').replace(/[^0-9]/g, '');
  const el = document.getElementById('track-result');
  if (!input) { toast('⚠️', 'Enter donation ID', 'e.g. BAN-001 or just 1'); return; }

  const donation = BananoDB.getById('donations', parseInt(input));
  if (!donation) {
    el.innerHTML = '<div class="info-box warn-box"><span>⚠️</span><span>No donation found with that ID.</span></div>';
    el.classList.remove('hidden');
    return;
  }
  el.innerHTML = renderTrackCard(donation);
  el.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════════
function toggleNotifs() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    renderNotifPanel();
  }
}

function closeNotifPanel() {
  document.getElementById('notif-panel')?.classList.remove('open');
}

function renderNotifPanel() {
  const notifs = BananoDB.getAll('notifications').slice().reverse();
  setHtml('notif-list', notifs.map(n => `
    <div class="notif-item">
      <div class="ni-dot ${n.isRead ? 'read' : ''}"></div>
      <div class="ni-text">
        <p>${n.message}</p>
        <span>${fmtDate(n.createdAt)}</span>
      </div>
    </div>`).join('') || '<p style="color:var(--text3);font-size:13px;padding:1rem">No notifications yet.</p>');
}

function markAllRead() {
  const notifs = BananoDB.getAll('notifications');
  notifs.forEach(n => BananoDB.update('notifications', n.id, { isRead: true }));
  renderNotifPanel();
  updateNotifDot();
}

function updateNotifDot() {
  const count = BananoDB.getUnreadCount();
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}

// Close notif panel on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-btn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
});

// ══════════════════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
document.addEventListener('click', e => {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    if (e.target === m) m.classList.remove('open');
  });
});

// ══════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════
function toast(icon, title, text) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-icon">${icon}</span><div class="toast-body"><h4>${title}</h4><p>${text}</p></div>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('exit'); setTimeout(() => t.remove(), 300); }, 4000);
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
function statusCls(s) {
  return { delivered: 'status-delivered', pending: 'status-pending', transit: 'status-transit', cancelled: 'status-cancelled' }[s] || 'status-pending';
}
function statusLabel(s) {
  return { delivered: '✓ Delivered', pending: '⏳ Pending', transit: '🚚 In transit', cancelled: '✕ Cancelled' }[s] || s;
}

// ══════════════════════════════════════════════════════════
//  AUTHENTICATION & DELEGATED DASHBOARDS
// ══════════════════════════════════════════════════════════

let currentAuthRole = { login: 'user', reg: 'user' };

function switchAuthTab(tab, el) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  if (tab === 'login') {
    document.getElementById('auth-login-view').classList.remove('hidden');
    document.getElementById('auth-register-view').classList.add('hidden');
  } else {
    document.getElementById('auth-login-view').classList.add('hidden');
    document.getElementById('auth-register-view').classList.remove('hidden');
  }
}

function switchToTab(tab) {
  const loginTab = document.getElementById('btn-login-tab');
  const regTab = document.getElementById('btn-register-tab');
  if (tab === 'login') {
    switchAuthTab('login', loginTab);
  } else {
    switchAuthTab('register', regTab);
  }
}

function pickAuthRole(role, el, form) {
  el.closest('.role-cards-grid').querySelectorAll('.role-select-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  currentAuthRole[form] = role;
}

function renderNavbar() {
  const user = BananoDB.getCurrentUser();
  const authSectionNav = document.getElementById('nav-auth-section');
  const authSectionMobile = document.getElementById('mobile-auth-section');
  
  if (user) {
    const roleLabels = { user: 'Donor', ngo: 'NGO', delivery: 'Partner' };
    const htmlNav = `
      <div class="profile-pill">
        👤 <span>${user.name}</span>
        <span class="profile-role-badge">${roleLabels[user.role] || user.role}</span>
      </div>
      <button class="logout-btn-nav" onclick="handleAuthLogout()" title="Log Out">🔌</button>
    `;
    if (authSectionNav) authSectionNav.innerHTML = htmlNav;
    if (authSectionMobile) authSectionMobile.innerHTML = `
      <div style="padding: 10px 16px; display:flex; align-items:center; justify-content:space-between;">
        <span style="color:var(--text2); font-weight:600;">👤 ${user.name} (${roleLabels[user.role]})</span>
        <button class="btn btn-outline btn-sm" onclick="handleAuthLogout()" style="padding: 4px 8px;">Log Out</button>
      </div>
    `;
    
    // Manage dynamic link visibilities
    document.getElementById('nav-donate')?.classList.toggle('hidden', user.role !== 'user');
    document.getElementById('mob-donate')?.classList.toggle('hidden', user.role !== 'user');
    
    document.getElementById('nav-admin')?.classList.toggle('hidden', user.role !== 'ngo');
    document.getElementById('mob-admin')?.classList.toggle('hidden', user.role !== 'ngo');
    
    document.getElementById('nav-delivery')?.classList.toggle('hidden', user.role !== 'delivery');
    document.getElementById('mob-delivery')?.classList.toggle('hidden', user.role !== 'delivery');
  } else {
    const htmlGuest = `<button class="btn btn-outline btn-sm" onclick="showPage('auth')">🔑 Log In</button>`;
    if (authSectionNav) authSectionNav.innerHTML = htmlGuest;
    if (authSectionMobile) authSectionMobile.innerHTML = `<a onclick="showPage('auth');closeMobileMenu()">🔑 Log In</a>`;
    
    // Guests can see everything but get redirected on actions, or we can hide donate/admin/delivery
    document.getElementById('nav-donate')?.classList.remove('hidden');
    document.getElementById('mob-donate')?.classList.remove('hidden');
    document.getElementById('nav-admin')?.classList.remove('hidden');
    document.getElementById('mob-admin')?.classList.remove('hidden');
    document.getElementById('nav-delivery')?.classList.add('hidden');
    document.getElementById('mob-delivery')?.classList.add('hidden');
  }
}

function handleAuthLogin() {
  const identifier = val('login-identifier');
  const password = val('login-password');
  const role = currentAuthRole.login;
  
  if (!identifier || !password) {
    toast('⚠️', 'Required fields missing', 'Please enter email/phone and password.');
    return;
  }
  
  const user = BananoDB.login(identifier, password, role);
  if (user) {
    renderNavbar();
    toast('🎉', `Welcome, ${user.name}!`, 'Logged in successfully.');
    
    if (user.role === 'delivery') {
      showPage('delivery');
    } else if (user.role === 'ngo') {
      showPage('admin');
    } else {
      showPage('dashboard');
    }
    
    // Clear inputs
    document.getElementById('login-identifier').value = '';
    document.getElementById('login-password').value = '';
  } else {
    toast('❌', 'Login Failed', 'Invalid credentials or incorrect role selected.');
  }
}

function handleAuthRegister() {
  const name = val('reg-name');
  const email = val('reg-email');
  const phone = val('reg-phone');
  const password = val('reg-password');
  const role = currentAuthRole.reg;
  
  if (!name || !email || !phone || !password) {
    toast('⚠️', 'Required fields missing', 'Please fill in all registration fields.');
    return;
  }
  
  if (!BananoValidate.email(email)) {
    toast('⚠️', 'Invalid Email', 'Please enter a valid email address.');
    return;
  }
  
  if (!BananoValidate.phone(phone)) {
    toast('⚠️', 'Invalid Phone', 'Please enter a valid 10-digit phone number.');
    return;
  }
  
  const res = BananoDB.register(name, password, phone, email, role);
  if (res.error) {
    toast('❌', 'Registration Failed', res.error);
  } else {
    toast('🎉', 'Registration Complete!', 'Your account has been created. Please log in.');
    switchToTab('login');
    
    // Pre-fill login identifier
    document.getElementById('login-identifier').value = email;
    
    // Clear register inputs
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-phone').value = '';
    document.getElementById('reg-password').value = '';
  }
}

function handleAuthLogout() {
  BananoDB.logout();
  renderNavbar();
  toast('🔌', 'Logged Out', 'You have been logged out successfully.');
  showPage('dashboard');
}

// Delivery Partner Dashboard Logic (Zomato/Swiggy Simulator)
function renderDeliveryPanel() {
  const user = BananoDB.getCurrentUser();
  if (!user || user.role !== 'delivery') return;
  
  // Set Profile details
  setEl('dp-profile-name', user.name);
  
  // Find partner in database for ratings/deliveries count
  const partner = BananoDB.query('delivery_partners', p => p.phone === user.phone)[0];
  if (partner) {
    setEl('dp-stat-deliveries', partner.totalDeliveries);
    setEl('dp-stat-rating', `★ ${partner.rating}`);
  }
  
  const tasks = BananoDB.query('donations', d => 
    d.partnerName === user.name && 
    (d.status === 'pending' || d.status === 'transit')
  );
  
  const container = document.getElementById('phone-screen-container');
  if (!container) return;
  
  // App Time
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  if (!tasks.length) {
    container.innerHTML = `
      <div class="zomato-header">
        <span class="z-time">${timeStr}</span>
        <span class="z-icons">📶 🔋 98%</span>
      </div>
      <div class="radar-container">
        <div class="radar-circle">
          <div class="radar-ring"></div>
          <div class="radar-ring d1"></div>
          <div class="radar-ring d2"></div>
        </div>
        <div class="radar-text">Searching for active donations...</div>
        <div class="radar-subtext">You are marked as available. Incoming pickups will show up here.</div>
      </div>
    `;
    return;
  }
  
  const t = tasks[0]; // Render the primary task
  
  // Payout calculation (mocked based on quantity)
  const payout = 45.00 + (t.quantity * 0.25);
  
  // Render Zomato APP screens
  let tripStatusTitle = '';
  let checklistItems = '';
  let swipeActionText = '';
  let swipeCallback = '';
  
  if (t.status === 'pending') {
    tripStatusTitle = 'Head to Pickup Point';
    checklistItems = `
      <label class="checklist-item">
        <input type="checkbox" onchange="onChecklistChange()">
        <span>Freshness & temperature of food is checked</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" onchange="onChecklistChange()">
        <span>Quantity matches matches request (${t.quantity} ${t.donationType === 'food' ? 'meals' : 'pcs'})</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" onchange="onChecklistChange()">
        <span>Containers are properly packed & sealed</span>
      </label>
    `;
    swipeActionText = 'Slide to start pickup';
    swipeCallback = 'partnerSwipePickup';
  } else if (t.status === 'transit') {
    tripStatusTitle = 'Deliver to NGO Center';
    checklistItems = `
      <label class="checklist-item">
        <input type="checkbox" onchange="onChecklistChange()">
        <span>Arrived safely at NGO location</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" onchange="onChecklistChange()">
        <span>NGO Coordinator verified presence</span>
      </label>
      <label class="checklist-item">
        <input type="checkbox" onchange="onChecklistChange()">
        <span>Handover completed and photo proof captured</span>
      </label>
    `;
    swipeActionText = 'Slide to complete delivery';
    swipeCallback = 'partnerSwipeComplete';
  }
  
  container.innerHTML = `
    <!-- HEADER -->
    <div class="zomato-header">
      <span class="z-time">${timeStr}</span>
      <span class="z-icons">📶 🔋 95%</span>
    </div>
    
    <!-- BRAND & ACTION HUD -->
    <div class="trip-hud-banner">
      <div>
        <div class="trip-hud-lbl">Current Task</div>
        <strong style="font-size:12px;color:#fff;">${tripStatusTitle}</strong>
      </div>
      <div style="text-align:right;">
        <div class="trip-hud-lbl">Estimated Payout</div>
        <div class="trip-hud-val">₹${payout.toFixed(2)}</div>
      </div>
    </div>
    
    <!-- SVG ROUTE MAP -->
    <div class="delivery-map-box">
      <svg viewBox="0 0 300 160" width="100%" height="100%" style="display:block;">
        <!-- Dotted path -->
        <path id="svg-route" class="svg-route-path" d="M 40 110 Q 150 20 260 80" />
        <!-- Completed path -->
        <path id="svg-route-completed" class="svg-route-completed" d="M 40 110 Q 150 20 260 80" />
        
        <!-- Nodes -->
        <circle cx="40" cy="110" r="5" fill="#f5a623" />
        <text x="40" y="130" fill="#f5a623" font-size="10" text-anchor="middle" font-weight="bold">📍 Pickup</text>
        
        <circle cx="260" cy="80" r="5" fill="#22a16a" />
        <text x="260" y="100" fill="#22a16a" font-size="10" text-anchor="middle" font-weight="bold">🏥 NGO</text>
        
        <!-- Animated Bike -->
        <text id="svg-bike-text" font-size="20" x="40" y="106" text-anchor="middle">🚴</text>
      </svg>
    </div>
    
    <!-- CONTACT CARDS -->
    <div class="phone-contact-card" style="margin-top:10px;">
      <div class="pcc-left">
        <div class="dtc-lbl">Pickup Contact</div>
        <strong class="pcc-title">${t.category} Donor</strong>
        <span class="muted" style="font-size:10px;">Address: ${t.address}</span>
      </div>
      <button class="pcc-btn-call" onclick="triggerMockCall('${t.category} Donor', 'Donor')">📞</button>
    </div>
    
    <div class="phone-contact-card">
      <div class="pcc-left">
        <div class="dtc-lbl">Dropoff NGO</div>
        <strong class="pcc-title">${t.ngoName}</strong>
        <span class="muted" style="font-size:10px;">Coordinator capacity check OK</span>
      </div>
      <button class="pcc-btn-call" onclick="triggerMockCall('${t.ngoName} Coordinator', 'NGO Coordinator')">📞</button>
    </div>
    
    <!-- CHECKLIST -->
    <div class="safety-checklist">
      <div class="checklist-title">Safety Checklists</div>
      <div id="safety-checklist-items">
        ${checklistItems}
      </div>
    </div>
    
    <!-- SWIPE CONFIRM SLIDER -->
    <div class="swipe-track disabled" id="swipe-track-el" data-callback="${swipeCallback}" data-donation-id="${t.id}" style="--swipe-fill: 0%">
      <div class="swipe-thumb" id="swipe-thumb-el">${t.status === 'pending' ? '🚴' : '✓'}</div>
      <span class="swipe-text">${swipeActionText}</span>
    </div>
  `;
  
  // Set initial completed path if en route
  if (t.status === 'transit') {
    const completedPath = document.getElementById('svg-route-completed');
    if (completedPath) {
      completedPath.style.transition = 'none';
      completedPath.style.strokeDashoffset = '0';
      const bikeText = document.getElementById('svg-bike-text');
      if (bikeText) {
        bikeText.setAttribute('x', '260');
        bikeText.setAttribute('y', '76');
      }
    }
  }
  
  // Initialize slider mechanics
  setTimeout(() => initSwipeSlider(), 100);
}

// Checklist Check Gating
function onChecklistChange() {
  const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
  const track = document.getElementById('swipe-track-el');
  if (!track) return;
  
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  track.classList.toggle('disabled', !allChecked);
}

// Drag Gesture Controller
function initSwipeSlider() {
  const track = document.getElementById('swipe-track-el');
  const thumb = document.getElementById('swipe-thumb-el');
  if (!track || !thumb) return;

  let isDragging = false;
  let startX = 0;
  
  const getDragLimits = () => {
    return track.clientWidth - thumb.clientWidth - 8; // accounts for 4px padding on both sides
  };

  const onDragStart = (e) => {
    if (track.classList.contains('disabled') || track.classList.contains('completed')) return;
    isDragging = true;
    startX = (e.clientX || e.touches[0].clientX) - thumb.offsetLeft;
    thumb.style.transition = 'none';
  };

  const onDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches[0].clientX;
    let distance = clientX - startX;
    const maxDistance = getDragLimits();
    
    if (distance < 4) distance = 4;
    if (distance > maxDistance) distance = maxDistance;

    thumb.style.transform = `translateX(${distance - 4}px)`;
    
    const percent = Math.round((distance / maxDistance) * 100);
    track.style.setProperty('--swipe-fill', `${percent}%`);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    thumb.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    const maxDistance = getDragLimits();
    const matrix = window.getComputedStyle(thumb).transform;
    let currentX = 0;
    
    if (matrix !== 'none') {
      const parts = matrix.split(',');
      currentX = parseInt(parts[4] || 0);
    }

    if (currentX >= maxDistance * 0.90) {
      track.classList.add('completed');
      track.style.setProperty('--swipe-fill', '100%');
      thumb.style.transform = `translateX(${maxDistance}px)`;
      
      const callbackName = track.dataset.callback;
      const donationId = parseInt(track.dataset.donationId);
      
      if (typeof window[callbackName] === 'function') {
        // Haptic feedback beep on complete
        playMockVoiceTone(880, 150);
        setTimeout(() => window[callbackName](donationId), 300);
      }
    } else {
      // snap back
      thumb.style.transform = 'translateX(0)';
      track.style.setProperty('--swipe-fill', '0%');
      playMockVoiceTone(220, 80); // error/warning beep
    }
  };

  // Bind mouse events
  thumb.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  // Bind touch events for mobile testing
  thumb.addEventListener('touchstart', onDragStart, { passive: true });
  document.addEventListener('touchmove', onDragMove, { passive: true });
  document.addEventListener('touchend', onDragEnd);
}

// Action Trigger - Swipe Pickup Completed (Bike Ride GPS Animation)
function partnerSwipePickup(donationId) {
  toast('🚴', 'Pickup Verified', 'Simulating delivery route tracking...');
  
  animateBikeOnRoute(() => {
    BananoDB.update('donations', donationId, { status: 'transit' });
    
    // Add Notification
    BananoDB.insert('notifications', {
      donationId,
      message: `Your donation #${donationId} is now en route with your delivery partner!`,
      type: 'assigned', isRead: false, createdAt: new Date().toISOString()
    });
    
    toast('🚚', 'En Route', 'You have arrived at the NGO location.');
    renderDeliveryPanel();
    updateNotifDot();
  });
}

// Action Trigger - Swipe Delivery Completed
function partnerSwipeComplete(donationId) {
  BananoDB.markDelivered(donationId, 'Delivered directly by partner');
  toast('✅', 'Delivery Completed', 'Thank you for delivering this surplus safely!');
  
  // Refresh views
  renderDeliveryPanel();
  updateNotifDot();
  renderDashboard();
}

// SVG GPS bike animation pathing
function animateBikeOnRoute(callback) {
  const path = document.getElementById('svg-route-completed');
  const bikeText = document.getElementById('svg-bike-text');
  if (!path || !bikeText) {
    if (callback) callback();
    return;
  }
  
  path.classList.add('animating');
  
  const totalLength = path.getTotalLength();
  let startTime = null;
  const duration = 2800; // 2.8 seconds drive animation
  
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = (timestamp - startTime) / duration;
    
    if (progress < 1) {
      const currentLength = progress * totalLength;
      const point = path.getPointAtLength(currentLength);
      
      bikeText.setAttribute('x', point.x);
      bikeText.setAttribute('y', point.y - 4); // slightly offset above stroke
      
      requestAnimationFrame(step);
    } else {
      bikeText.setAttribute('x', '260');
      bikeText.setAttribute('y', '76');
      path.classList.remove('animating');
      if (callback) callback();
    }
  };
  
  requestAnimationFrame(step);
}

// Mock Caller Simulator
function triggerMockCall(name, role) {
  setEl('caller-name', name);
  setEl('call-subtitle', role + ' Calling...');
  setEl('call-avatar-emoji', role === 'Donor' ? '🤲' : '🏥');
  
  const acceptBtn = document.getElementById('btn-call-accept');
  if (acceptBtn) acceptBtn.style.display = 'flex';
  
  openModal('modal-mock-call');
  playMockRingTone(3, 400);
}

function answerMockCall() {
  setEl('call-subtitle', '📞 Active Call · 00:01');
  const acceptBtn = document.getElementById('btn-call-accept');
  if (acceptBtn) acceptBtn.style.display = 'none';
  
  let sec = 1;
  window.mockCallInterval = setInterval(() => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    setEl('call-subtitle', `📞 Active Call · ${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`);
    sec++;
  }, 1000);
  
  playMockVoiceTone(660, 200);
}

function endMockCall() {
  clearInterval(window.mockCallInterval);
  closeModal('modal-mock-call');
  toast('📞', 'Call Ended', 'Communication logged.');
}

// Tone Synthesis Audio API
function playMockRingTone(times, interval) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let count = 0;
    const ring = () => {
      if (count >= times) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      
      count++;
      setTimeout(ring, interval);
    };
    ring();
  } catch {}
}

function playMockVoiceTone(freq, dur) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    
    osc.start();
    osc.stop(ctx.currentTime + dur / 1000);
  } catch {}
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
(function init() {
  renderNavbar();
  renderDashboard();
  renderStepRow(1);
  initAiSettings();

  // Welcome toast
  setTimeout(() => toast('🌿', 'Welcome to Give & Grow', 'Donate food or clothes to those in need.'), 800);

  // Simulate incoming notification
  setTimeout(() => {
    BananoDB.insert('notifications', {
      donationId: 1,
      message: 'New delivery: 30 meals delivered to Asha NGO by Rahul Das.',
      type: 'delivered', isRead: false, createdAt: new Date().toISOString(),
    });
    updateNotifDot();
  }, 5000);
})();
