# ClosetFlow 👗

A beautiful, full-featured wardrobe organization app built with Node.js + Express + JSON files.

## Features
- 🔐 User registration & login (JWT auth, bcrypt passwords)
- 🏠 Dashboard with visual cupboards per clothing section
- ➕ Add clothes with section, name, fiber, type, color, price
- 👗 Closet Organization with drag-and-drop laundry
- 🧺 Laundry page with animated washing machine
- 📋 All Clothes table with update & delete per section
- 💾 JSON file storage (no database needed)

## Local Setup

```bash
npm install
node server.js
# Visit http://localhost:3000
```

## Deploy on Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Add environment variable:
   - `JWT_SECRET` = any long random string
6. Click Deploy!

> ⚠️ **Note:** Render free tier may reset the filesystem, losing JSON data. For persistent storage, consider upgrading or using Render Disks.

## File Structure

```
closetflow/
├── server.js          # Express API server
├── package.json
├── render.yaml        # Render deploy config
├── data/
│   ├── users.json     # User accounts
│   └── clothes.json   # All clothing items
└── public/
    ├── index.html     # Landing page (login/register)
    ├── dashboard.html # Main dashboard
    ├── add-cloth.html # Add clothing form
    ├── closet.html    # Closet + drag to laundry
    ├── laundry.html   # Laundry management
    └── all-clothes.html # Table view with edit/delete
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/register | Register new user |
| POST | /api/login | Login |
| POST | /api/logout | Logout |
| GET | /api/me | Get current user |
| GET | /api/clothes | Get user's clothes |
| POST | /api/clothes | Add clothing item |
| PUT | /api/clothes/:id | Update item |
| DELETE | /api/clothes/:id | Delete item |
| POST | /api/clothes/:id/use | Mark as used |
| POST | /api/clothes/wash | Wash laundry items |
