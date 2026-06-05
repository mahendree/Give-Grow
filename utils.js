/**
 * BANANO — utils.js
 * Utility helpers: charts, animations, formatters, validators
 */

// ══════════════════════════════════════════════════════════
//  MINI CHART ENGINE (Canvas-based, no dependencies)
// ══════════════════════════════════════════════════════════

const BananoCharts = {

  /** Draw a simple bar chart on a canvas element */
  bar(canvasId, labels, values, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = options.pad || 40;
    const barColor = options.color || '#22a16a';
    const textColor = options.textColor || '#6a9e84';
    const max = Math.max(...values, 1);

    ctx.clearRect(0, 0, W, H);

    const barW = (W - pad * 2) / labels.length;
    const chartH = H - pad * 2;

    values.forEach((v, i) => {
      const barH = (v / max) * chartH;
      const x = pad + i * barW + barW * 0.15;
      const y = pad + chartH - barH;
      const w = barW * 0.7;

      // Bar
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(x, y, w, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = textColor;
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + w / 2, H - 8);

      // Value
      if (v > 0) {
        ctx.fillStyle = '#e2f5ea';
        ctx.font = '10px DM Sans, sans-serif';
        ctx.fillText(v, x + w / 2, y - 5);
      }
    });

    // Baseline
    ctx.strokeStyle = 'rgba(34,161,106,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.stroke();
  },

  /** Draw a doughnut / pie chart */
  doughnut(canvasId, labels, values, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) / 2 - 20;
    const ir = r * 0.55; // inner radius for doughnut
    const colors = options.colors || ['#22a16a','#4db8ff','#f5a623','#e85454','#2ecc88'];
    const total = values.reduce((a, b) => a + b, 0) || 1;

    ctx.clearRect(0, 0, W, H);

    let startAngle = -Math.PI / 2;
    values.forEach((v, i) => {
      const slice = (v / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      startAngle += slice;
    });

    // Cut out center
    ctx.beginPath();
    ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a3d2a';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#e2f5ea';
    ctx.font = `bold 18px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.font = '10px DM Sans, sans-serif';
    ctx.fillStyle = '#6a9e84';
    ctx.fillText('total', cx, cy + 18);
  },

  /** Draw a line chart */
  line(canvasId, labels, values, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 36, left: 36 };
    const max = Math.max(...values, 1);
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const stepX = chartW / (labels.length - 1 || 1);

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(34,161,106,0.1)';
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.top + chartH * t;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, 'rgba(34,161,106,0.3)');
    grad.addColorStop(1, 'rgba(34,161,106,0)');

    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + chartH - (v / max) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    // Close fill
    ctx.lineTo(pad.left + (values.length - 1) * stepX, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#22a16a';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    values.forEach((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + chartH - (v / max) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    values.forEach((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + chartH - (v / max) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#22a16a';
      ctx.fill();
      ctx.strokeStyle = '#0d1f17';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#6a9e84';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((lbl, i) => {
      const x = pad.left + i * stepX;
      ctx.fillText(lbl, x, H - 6);
    });
  }
};

// ══════════════════════════════════════════════════════════
//  FORM VALIDATION
// ══════════════════════════════════════════════════════════

const BananoValidate = {
  phone(val) {
    return /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''));
  },
  email(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  },
  notEmpty(val) {
    return val && val.trim().length > 0;
  },
  pincode(val) {
    return /^\d{6}$/.test(val.trim());
  }
};

// ══════════════════════════════════════════════════════════
//  FORMATTERS
// ══════════════════════════════════════════════════════════

const BananoFormat = {
  /** Format ISO date to readable string */
  date(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch { return iso; }
  },

  /** Format ISO date to relative time (e.g. "2h ago") */
  relative(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return BananoFormat.date(iso);
  },

  /** Format number with Indian comma notation */
  number(n) {
    return n.toLocaleString('en-IN');
  },

  /** Truncate string */
  truncate(str, len = 60) {
    return str.length > len ? str.slice(0, len) + '…' : str;
  }
};

// ══════════════════════════════════════════════════════════
//  ANIMATIONS
// ══════════════════════════════════════════════════════════

const BananoAnimate = {
  /** Animate counter from 0 to target */
  counter(elId, target, duration = 1200) {
    const el = document.getElementById(elId);
    if (!el) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  /** Stagger-animate a list of elements */
  staggerIn(selector, delay = 80) {
    const els = document.querySelectorAll(selector);
    els.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * delay);
    });
  }
};

// ══════════════════════════════════════════════════════════
//  PRINT / RECEIPT HELPER
// ══════════════════════════════════════════════════════════

function printDonationReceipt(donationId) {
  const d = BananoDB.getById('donations', donationId);
  if (!d) return;
  const win = window.open('', '_blank', 'width=480,height=600');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Give & Grow Receipt #${d.id}</title>
    <style>
      body { font-family: 'DM Sans', Arial, sans-serif; padding: 2rem; color: #111; }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      .sub { color: #666; font-size: 13px; margin-bottom: 2rem; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
      td:first-child { color: #666; width: 40%; }
      .footer { margin-top: 2rem; font-size: 12px; color: #999; text-align: center; }
      .logo { font-size: 2rem; margin-bottom: 8px; }
    </style>
  </head><body>
    <div class="logo">🍃</div>
    <h1>Give & Grow</h1>
    <p class="sub">Donation Receipt</p>
    <table>
      <tr><td>Receipt No.</td><td><strong>#${d.id}</strong></td></tr>
      <tr><td>Date</td><td>${BananoFormat.date(d.createdAt)}</td></tr>
      <tr><td>Type</td><td>${d.donationType === 'food' ? '🍱 Food' : '👕 Clothes'} — ${d.category}</td></tr>
      <tr><td>Quantity</td><td>${d.quantity} ${d.donationType === 'food' ? 'people' : 'pieces'}</td></tr>
      <tr><td>NGO</td><td>${d.ngoName}</td></tr>
      <tr><td>Address</td><td>${d.address}, ${d.city}</td></tr>
      <tr><td>Partner</td><td>${d.partnerName || 'Being assigned'}</td></tr>
      <tr><td>Status</td><td>${d.status.toUpperCase()}</td></tr>
      ${d.deliveredAt ? `<tr><td>Delivered</td><td>${BananoFormat.date(d.deliveredAt)}</td></tr>` : ''}
    </table>
    <div class="footer">Thank you for your donation! Give & Grow — Free food &amp; clothes for everyone.</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ══════════════════════════════════════════════════════════
//  SHARE HELPER
// ══════════════════════════════════════════════════════════

function shareDonation(donationId) {
  const d = BananoDB.getById('donations', donationId);
  if (!d) return;
  const text = `I just donated ${d.quantity} ${d.donationType === 'food' ? 'meals' : 'pieces of clothing'} to ${d.ngoName} via Give & Grow! 🍃 Help your community too.`;
  if (navigator.share) {
    navigator.share({ title: 'Give & Grow Donation', text, url: window.location.href });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof toast === 'function') toast('📋', 'Copied!', 'Share text copied to clipboard.');
    });
  }
}

// expose
window.BananoCharts   = BananoCharts;
window.BananoValidate = BananoValidate;
window.BananoFormat   = BananoFormat;
window.BananoAnimate  = BananoAnimate;
window.printDonationReceipt = printDonationReceipt;
window.shareDonation  = shareDonation;
