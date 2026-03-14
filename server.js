const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'closetflow_secret_key_2024';

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CLOTHES_FILE = path.join(DATA_DIR, 'clothes.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(CLOTHES_FILE)) fs.writeFileSync(CLOTHES_FILE, '[]');

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// AUTH ROUTES
app.post('/api/register', async (req, res) => {
  const { username, password, email, fullName } = req.body;
  if (!username || !password || !email || !fullName)
    return res.status(400).json({ error: 'All fields required' });

  const users = readJSON(USERS_FILE);
  if (users.find(u => u.username === username))
    return res.status(400).json({ error: 'Username already exists' });
  if (users.find(u => u.email === email))
    return res.status(400).json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    username,
    password: hashedPassword,
    email,
    fullName,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.json({ success: true, message: 'Registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username, fullName: user.fullName }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, token, user: { username: user.username, fullName: user.fullName, email: user.email } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// CLOTHES ROUTES
app.get('/api/clothes', authMiddleware, (req, res) => {
  const clothes = readJSON(CLOTHES_FILE);
  const userClothes = clothes.filter(c => c.username === req.user.username);
  res.json(userClothes);
});

app.post('/api/clothes', authMiddleware, (req, res) => {
  const { section, name, fiber, type, color, price, purchaseDate } = req.body;
  if (!section || !name || !fiber || !type || !color || !price)
    return res.status(400).json({ error: 'All fields required' });

  const clothes = readJSON(CLOTHES_FILE);
  const newCloth = {
    id: Date.now().toString(),
    username: req.user.username,
    section,
    name,
    fiber,
    type,
    color,
    price: parseFloat(price),
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    status: 'clean',
    washed: 0,
    used: 0,
    addedAt: new Date().toISOString()
  };
  clothes.push(newCloth);
  writeJSON(CLOTHES_FILE, clothes);
  res.json({ success: true, cloth: newCloth });
});

app.put('/api/clothes/:id', authMiddleware, (req, res) => {
  const clothes = readJSON(CLOTHES_FILE);
  const idx = clothes.findIndex(c => c.id === req.params.id && c.username === req.user.username);
  if (idx === -1) return res.status(404).json({ error: 'Cloth not found' });
  clothes[idx] = { ...clothes[idx], ...req.body, id: clothes[idx].id, username: clothes[idx].username };
  writeJSON(CLOTHES_FILE, clothes);
  res.json({ success: true, cloth: clothes[idx] });
});

app.delete('/api/clothes/:id', authMiddleware, (req, res) => {
  let clothes = readJSON(CLOTHES_FILE);
  const idx = clothes.findIndex(c => c.id === req.params.id && c.username === req.user.username);
  if (idx === -1) return res.status(404).json({ error: 'Cloth not found' });
  clothes.splice(idx, 1);
  writeJSON(CLOTHES_FILE, clothes);
  res.json({ success: true });
});

// Move to laundry (mark as used)
app.post('/api/clothes/:id/use', authMiddleware, (req, res) => {
  const clothes = readJSON(CLOTHES_FILE);
  const idx = clothes.findIndex(c => c.id === req.params.id && c.username === req.user.username);
  if (idx === -1) return res.status(404).json({ error: 'Cloth not found' });
  clothes[idx].status = 'used';
  clothes[idx].used = (clothes[idx].used || 0) + 1;
  clothes[idx].lastUsed = new Date().toISOString();
  writeJSON(CLOTHES_FILE, clothes);
  res.json({ success: true, cloth: clothes[idx] });
});

// Wash all laundry
app.post('/api/clothes/wash', authMiddleware, (req, res) => {
  const { ids } = req.body;
  const clothes = readJSON(CLOTHES_FILE);
  ids.forEach(id => {
    const idx = clothes.findIndex(c => c.id === id && c.username === req.user.username);
    if (idx !== -1) {
      clothes[idx].status = 'clean';
      clothes[idx].washed = (clothes[idx].washed || 0) + 1;
      clothes[idx].lastWashed = new Date().toISOString();
    }
  });
  writeJSON(CLOTHES_FILE, clothes);
  res.json({ success: true });
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/closet', (req, res) => res.sendFile(path.join(__dirname, 'public', 'closet.html')));
app.get('/laundry', (req, res) => res.sendFile(path.join(__dirname, 'public', 'laundry.html')));
app.get('/all-clothes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'all-clothes.html')));
app.get('/add-cloth', (req, res) => res.sendFile(path.join(__dirname, 'public', 'add-cloth.html')));

app.listen(PORT, () => console.log(`ClosetFlow running on http://localhost:${PORT}`));

// Update profile (name, email)
app.put('/api/profile', authMiddleware, async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) return res.status(400).json({ error: 'Name and email required' });
  const users = readJSON(USERS_FILE);
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const emailTaken = users.find(u => u.email === email && u.id !== req.user.id);
  if (emailTaken) return res.status(400).json({ error: 'Email already in use' });
  users[idx].fullName = fullName;
  users[idx].email = email;
  writeJSON(USERS_FILE, users);
  const token = jwt.sign({ id: users[idx].id, username: users[idx].username, fullName }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, token, user: { username: users[idx].username, fullName, email } });
});

// Change password
app.put('/api/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const users = readJSON(USERS_FILE);
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const valid = await bcrypt.compare(currentPassword, users[idx].password);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  users[idx].password = await bcrypt.hash(newPassword, 10);
  writeJSON(USERS_FILE, users);
  res.json({ success: true });
});

// Analytics
app.get('/api/analytics', authMiddleware, (req, res) => {
  const clothes = readJSON(CLOTHES_FILE);
  const userClothes = clothes.filter(c => c.username === req.user.username);
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const bySection = {};
  userClothes.forEach(c => {
    if (!bySection[c.section]) bySection[c.section] = { count: 0, totalSpend: 0, totalUsed: 0, totalWashed: 0 };
    bySection[c.section].count++;
    bySection[c.section].totalSpend += parseFloat(c.price) || 0;
    bySection[c.section].totalUsed += c.used || 0;
    bySection[c.section].totalWashed += c.washed || 0;
  });
  const neverWorn = userClothes.filter(c => !c.used || c.used === 0);
  const mostWorn = [...userClothes].sort((a, b) => (b.used || 0) - (a.used || 0)).slice(0, 5);
  const leastWorn = [...userClothes].filter(c => c.used > 0).sort((a, b) => (a.used || 0) - (b.used || 0)).slice(0, 5);
  const notWornRecently = userClothes.filter(c => {
    if (!c.lastUsed) return false;
    return new Date(c.lastUsed) < thirtyDaysAgo;
  });
  const totalSpend = userClothes.reduce((s, c) => s + (parseFloat(c.price) || 0), 0);
  const totalUsed = userClothes.reduce((s, c) => s + (c.used || 0), 0);
  res.json({ bySection, neverWorn, mostWorn, leastWorn, notWornRecently, totalSpend, totalUsed, total: userClothes.length });
});

app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, 'public', 'analytics.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
