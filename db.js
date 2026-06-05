/**
 * BANANO — db.js
 * Simulates a SQLite database using localStorage
 * In a real app this would use sql.js or a backend SQLite API
 * Schema matches the app design mockup exactly
 */

const BananoDB = (() => {

  // ─── SCHEMA DEFINITION ───────────────────────────────────
  const SCHEMA = {
    donations: ['id', 'donationType', 'category', 'foodType', 'quantity', 'proofPath',
                'containerChoice', 'partnersNeeded', 'address', 'city', 'ngoPreference',
                'ngoName', 'status', 'partnerName', 'partnerPhone', 'createdAt', 'deliveredAt'],

    delivery_partners: ['id', 'name', 'phone', 'area', 'available', 'currentDonationId',
                        'totalDeliveries', 'rating', 'joined'],

    ngos: ['id', 'name', 'area', 'phone', 'latitude', 'longitude', 'coordinator', 'capacity'],

    notifications: ['id', 'donationId', 'message', 'type', 'isRead', 'createdAt'],

    jobs: ['id', 'title', 'pay', 'slots', 'type', 'description'],

    job_applications: ['id', 'jobId', 'title', 'applicantName', 'phone', 'email',
                       'area', 'reason', 'status', 'appliedAt'],

    referrals: ['id', 'referrerCode', 'friendName', 'friendPhone', 'jobTitle', 'status', 'createdAt'],

    users: ['id', 'name', 'password', 'phone', 'email', 'role', 'createdAt'],
  };

  // ─── SEED DATA ───────────────────────────────────────────
  const SEED = {
    donations: [
      { id: 1, donationType: 'food', category: 'Restaurant', foodType: 'fresh', quantity: 50,
        containerChoice: 'none', partnersNeeded: 1, address: '14 Bidhan Nagar, Durgapur',
        city: 'Durgapur, WB', ngoPreference: 'specific', ngoName: 'Suchana Foundation',
        status: 'delivered', partnerName: 'Rahul Das', partnerPhone: '9876543210',
        createdAt: '2025-05-25T10:00:00', deliveredAt: '2025-05-25T14:30:00', proofPath: '' },

      { id: 2, donationType: 'clothes', category: 'Used', foodType: '', quantity: 15,
        containerChoice: 'none', partnersNeeded: 1, address: '5 Civic Centre, Durgapur',
        city: 'Durgapur, WB', ngoPreference: 'nearest', ngoName: 'Nearest NGO',
        status: 'pending', partnerName: '', partnerPhone: '',
        createdAt: '2025-05-28T09:00:00', deliveredAt: '', proofPath: '' },

      { id: 3, donationType: 'food', category: 'Catering', foodType: 'surplus', quantity: 80,
        containerChoice: 'partner', partnersNeeded: 1, address: 'City Centre Mall',
        city: 'Durgapur, WB', ngoPreference: 'specific', ngoName: 'Asha NGO',
        status: 'transit', partnerName: 'Priya Sen', partnerPhone: '9123456780',
        createdAt: '2025-05-29T08:00:00', deliveredAt: '', proofPath: '' },

      { id: 4, donationType: 'food', category: 'Home extra food', foodType: 'surplus', quantity: 20,
        containerChoice: 'donor', partnersNeeded: 1, address: '22 Benachity, Durgapur',
        city: 'Durgapur, WB', ngoPreference: 'nearest', ngoName: 'HelpLine Trust',
        status: 'delivered', partnerName: 'Arjun Khan', partnerPhone: '9012345678',
        createdAt: '2025-05-18T11:00:00', deliveredAt: '2025-05-18T16:00:00', proofPath: '' },
    ],

    delivery_partners: [
      { id: 1, name: 'Rahul Das', phone: '9876543210', area: 'Durgapur', available: true, currentDonationId: null, totalDeliveries: 50, rating: 4.8, joined: '2024-01-15' },
      { id: 2, name: 'Priya Sen', phone: '9123456780', area: 'Durgapur', available: false, currentDonationId: 3, totalDeliveries: 32, rating: 4.7, joined: '2024-03-10' },
      { id: 3, name: 'Arjun Khan', phone: '9012345678', area: 'Asansol', available: true, currentDonationId: null, totalDeliveries: 27, rating: 4.5, joined: '2024-05-20' },
      { id: 4, name: 'Sunita Roy', phone: '9988776655', area: 'Durgapur', available: true, currentDonationId: null, totalDeliveries: 18, rating: 4.6, joined: '2024-07-01' },
    ],

    ngos: [
      { id: 1, name: 'Suchana Foundation', area: 'Durgapur Steel Township', phone: '0343-1234567', latitude: 23.49, longitude: 87.31, coordinator: 'Meera Chatterjee', capacity: 200 },
      { id: 2, name: 'Asha NGO', area: 'City Centre, Durgapur', phone: '0343-2345678', latitude: 23.50, longitude: 87.32, coordinator: 'Rahul Banerjee', capacity: 150 },
      { id: 3, name: 'HelpLine Trust', area: 'Benachity, Durgapur', phone: '0343-3456789', latitude: 23.48, longitude: 87.30, coordinator: 'Anjali Das', capacity: 100 },
      { id: 4, name: 'Durgapur Care Center', area: 'Andal, Durgapur', phone: '0343-4567890', latitude: 23.47, longitude: 87.29, coordinator: 'Suresh Kumar', capacity: 80 },
    ],

    notifications: [
      { id: 1, donationId: 1, message: 'Donation #1 delivered to Suchana Foundation by Rahul Das.', type: 'delivered', isRead: false, createdAt: '2025-05-25T14:30:00' },
      { id: 2, donationId: 3, message: 'Delivery partner Priya Sen assigned to your donation.', type: 'assigned', isRead: false, createdAt: '2025-05-29T08:30:00' },
      { id: 3, donationId: 4, message: 'Donation #4 (100 meals) delivered to HelpLine Trust.', type: 'delivered', isRead: true, createdAt: '2025-05-18T16:00:00' },
    ],

    jobs: [
      { id: 1, title: 'Delivery Partner', pay: '₹200–500/day', slots: 10, type: 'part-time', description: 'Pick up food or clothes and deliver to nearby NGOs. Flexible hours. Bike/cycle required. Earn while helping your community.' },
      { id: 2, title: 'NGO Coordinator', pay: '₹8,000/month', slots: 3, type: 'full-time', description: 'Manage incoming donations at an NGO center. Coordinate with donors and delivery partners. Full-time, fixed salary role.' },
      { id: 3, title: 'App Volunteer', pay: 'Volunteer', slots: 20, type: 'volunteer', description: 'Verify donation proofs remotely. Help manage the app database and flag issues. Work from home, fully remote.' },
      { id: 4, title: 'Food Sorter', pay: '₹150–300/day', slots: 8, type: 'part-time', description: 'Sort and categorize donated food at collection centers. Part-time morning shifts, 3–4 hours/day.' },
      { id: 5, title: 'Social Media Ambassador', pay: 'Volunteer', slots: 15, type: 'volunteer', description: 'Spread awareness about Banano on social media. Create content, run campaigns, and help onboard donors.' },
      { id: 6, title: 'Data Entry Operator', pay: '₹5,000/month', slots: 2, type: 'full-time', description: 'Maintain donation and delivery records in the database. Basic computer skills required. Work from NGO office.' },
    ],

    job_applications: [],
    referrals: [],
    users: [
      { id: 1, name: 'Tathagata', password: 'password', phone: '9876543210', email: 'donor@banano.com', role: 'user', createdAt: '2025-05-01T10:00:00' },
      { id: 2, name: 'Suchana Coordinator', password: 'password', phone: '9123456789', email: 'ngo@banano.com', role: 'ngo', createdAt: '2025-05-01T10:00:00' },
      { id: 3, name: 'Rahul Das', password: 'password', phone: '9876543210', email: 'partner@banano.com', role: 'delivery', createdAt: '2025-05-01T10:00:00' },
    ],
  };

  // ─── STORAGE KEY ─────────────────────────────────────────
  const KEY = 'banano_db_v1';

  // ─── INIT DB ─────────────────────────────────────────────
  function init() {
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
    }
    // ensure all tables exist (upgrade)
    const db = getDB();
    let changed = false;
    Object.keys(SEED).forEach(tbl => {
      if (!db[tbl]) { db[tbl] = SEED[tbl]; changed = true; }
    });
    if (changed) saveDB(db);
    return db;
  }

  function getDB() {
    try { return JSON.parse(localStorage.getItem(KEY)) || SEED; }
    catch { return SEED; }
  }

  function saveDB(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  // ─── GENERIC CRUD ────────────────────────────────────────
  function getAll(table) {
    return getDB()[table] || [];
  }

  function getById(table, id) {
    return getAll(table).find(r => r.id === id) || null;
  }

  function insert(table, record) {
    const db = getDB();
    const rows = db[table] || [];
    const maxId = rows.length ? Math.max(...rows.map(r => r.id)) : 0;
    record.id = maxId + 1;
    rows.push(record);
    db[table] = rows;
    saveDB(db);
    return record;
  }

  function update(table, id, changes) {
    const db = getDB();
    const rows = db[table] || [];
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...changes };
    db[table] = rows;
    saveDB(db);
    return rows[idx];
  }

  function remove(table, id) {
    const db = getDB();
    const rows = db[table] || [];
    db[table] = rows.filter(r => r.id !== id);
    saveDB(db);
  }

  function query(table, filterFn) {
    return getAll(table).filter(filterFn);
  }

  // ─── BUSINESS LOGIC ──────────────────────────────────────
  function getStats() {
    const donations = getAll('donations');
    const delivered = donations.filter(d => d.status === 'delivered');
    const meals = delivered.filter(d => d.donationType === 'food').reduce((s, d) => s + (d.quantity || 0), 0);
    const clothes = delivered.filter(d => d.donationType === 'clothes').reduce((s, d) => s + (d.quantity || 0), 0);
    const ngos = [...new Set(delivered.map(d => d.ngoName))].length;
    const donors = [...new Set(donations.map(d => d.address))].length;
    const partners = getAll('delivery_partners').length;
    const cities = [...new Set(donations.map(d => d.city))].length;
    return { meals, clothes, ngos, donors, partners, cities };
  }

  function assignPartner(donationId) {
    const partners = query('delivery_partners', p => p.available);
    if (!partners.length) return null;
    const partner = partners[0];
    update('delivery_partners', partner.id, { available: false, currentDonationId: donationId });
    return partner;
  }

  function markDelivered(donationId, proofNote) {
    const donation = update('donations', donationId, {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    });
    if (donation && donation.partnerName) {
      const partner = query('delivery_partners', p => p.name === donation.partnerName)[0];
      if (partner) {
        update('delivery_partners', partner.id, {
          available: true,
          currentDonationId: null,
          totalDeliveries: partner.totalDeliveries + 1,
        });
      }
    }
    insert('notifications', {
      donationId,
      message: `Your donation has been delivered to ${donation.ngoName || 'the NGO'}! Thank you for helping.`,
      type: 'delivered', isRead: false, createdAt: new Date().toISOString(),
    });
    return donation;
  }

  function getUnreadCount() {
    return query('notifications', n => !n.isRead).length;
  }

  function resetDB() {
    localStorage.setItem(KEY, JSON.stringify(SEED));
    localStorage.removeItem('banano_current_user');
    return SEED;
  }

  function exportDB() {
    return JSON.stringify(getDB(), null, 2);
  }

  // ─── AUTHENTICATION HELPERS ──────────────────────────────
  function register(name, password, phone, email, role) {
    const users = getAll('users');
    const duplicate = users.find(u => u.email === email || u.phone === phone);
    if (duplicate) return { error: 'Email or phone already registered' };

    const newUser = insert('users', {
      name,
      password,
      phone,
      email,
      role,
      createdAt: new Date().toISOString()
    });

    // If delivery partner was registered, also register them in delivery_partners
    if (role === 'delivery') {
      const partners = getAll('delivery_partners');
      const alreadyPartner = partners.find(p => p.phone === phone);
      if (!alreadyPartner) {
        insert('delivery_partners', {
          name,
          phone,
          area: 'Durgapur',
          available: true,
          currentDonationId: null,
          totalDeliveries: 0,
          rating: 5.0,
          joined: new Date().toISOString().split('T')[0]
        });
      }
    }

    return { user: newUser };
  }

  function login(emailOrPhone, password, role) {
    const users = getAll('users');
    const user = users.find(u => 
      (u.email === emailOrPhone || u.phone === emailOrPhone) && 
      u.password === password && 
      u.role === role
    );
    if (!user) return null;
    
    setCurrentUser(user);
    return user;
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('banano_current_user')) || null;
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem('banano_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('banano_current_user');
    }
  }

  function logout() {
    setCurrentUser(null);
  }

  // ─── PUBLIC API ───────────────────────────────────────────
  init();

  return {
    SCHEMA,
    getAll, getById, insert, update, remove, query,
    getStats, assignPartner, markDelivered, getUnreadCount,
    resetDB, exportDB, init,
    register, login, getCurrentUser, setCurrentUser, logout,
  };

})();

// expose globally
window.BananoDB = BananoDB;
