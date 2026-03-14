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
