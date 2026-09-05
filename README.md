# Elaris Gate – Interactive Website

A calm, real-time website where visitors submit their details, receive letters in 9 bubbles from you (the admin) in real time, and then read a short story.

## Features implemented

- Working website with beautiful relaxing colors (soft sage, cream, teal – no red)
- Backend (Node.js + Express + Socket.io)
- Real-time bidirectional communication (WebSockets)
- Visitors fill: Surname, First Name, Email, Phone → Next
- “Link your phone with the website” message
- 9 letter bubbles that update live when you send letters from admin
- “Complete” button reveals the full knight & princess story
- Admin dashboard where **you** see every submission and can push letters to any active user in real time

---

## How to run locally (for testing)

1. Make sure you have **Node.js 18+** installed.
2. Open a terminal in this folder and run:

```bash
npm install
npm start
```

3. Open in browser:
   - User site: http://localhost:3000
   - Admin panel: http://localhost:3000/admin.html

**Default admin password:** `changeme123`  
**Change it** before going public (see below).

---

## Best & Easiest FREE way to deploy publicly

### Recommended: Railway (best for real-time + free tier)

1. Go to [https://railway.app](https://railway.app) and sign up with GitHub (free).
2. Click **“New Project”** → **“Deploy from GitHub repo”**  
   (or use the CLI / drag & drop this folder).
3. Railway will detect the Node.js app automatically.
4. After it deploys, go to **Variables** and add these two:

   ```
   ADMIN_PASSWORD=YourStrongPasswordHere
   ADMIN_TOKEN=some-long-random-string-you-make-up
   ```

5. Generate a public domain (Railway → Settings → Generate Domain).

Your site will be live at something like:  
`https://your-app-name.up.railway.app`

Admin panel: `https://your-app-name.up.railway.app/admin.html`

### Alternative easy options
- **Render.com** – also free tier, very similar steps
- **Fly.io** – slightly more setup but excellent free allowance

> Note: Free tiers may sleep after inactivity. For a always-on site you can upgrade later for a few dollars/month.

---

## How you (the creator) use it

1. Open the **admin page** and log in with the password.
2. When a visitor fills the form and reaches the bubbles, they appear in your dashboard as “Online”.
3. Type letters into the 9 small boxes (or leave some empty).
4. Click **“Send Letters to User”** → the letters appear instantly on their screen.
5. You can see their full name, email and phone number in the history section.

---

## Changing the admin password

Before deploying, either:

- Set the environment variables `ADMIN_PASSWORD` and `ADMIN_TOKEN` on the hosting platform, **or**
- Edit `server.js` and change the default values near the top.

---

## Project structure

```
mystic-site/
├── server.js          ← Backend + real-time logic
├── package.json
├── public/
│   ├── index.html     ← User experience
│   ├── admin.html     ← Your control panel
│   ├── style.css
│   ├── app.js
│   └── admin.js
└── README.md
```

Enjoy your interactive site!
