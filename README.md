# 🎉 Birthday Celebration Website

A modern, elegant, and interactive birthday website where friends, family, and well-wishers can celebrate with heartfelt messages and thoughtful gifts.

Designed with a premium user experience, beautiful animations, and a responsive interface, the website provides a seamless way to share birthday wishes and send gifts securely via M-Pesa.

---

# Features

- 🎂 Modern and responsive design
- ✨ Beautiful animations and smooth transitions
- 💝 Send birthday wishes
- 📱 Mobile-friendly interface
- 🎁 Send birthday gifts via M-Pesa
- 🔒 Secure API communication
- ⚡ Fast loading and optimized performance
- 🌍 Works on all modern browsers
- 🎉 Celebration-themed user experience

---

# Technology Stack

- HTML5
- CSS3
- JavaScript (ES6)
- Vercel
- Render Backend API
- Pay Hero STK Push API

---

# Project Structure

```
birthday-frontend/
│
├── index.html
├── style.css
├── script.js
├── assets/
│   ├── images/
│   ├── icons/
│   └── audio/
│
├── README.md
└── vercel.json
```

---

# Website Sections

## Hero

A welcoming introduction celebrating another amazing year with elegant typography and engaging visuals.

---

## Birthday Wishes

Visitors can submit:

- Name
- Phone Number
- Birthday Message

Messages are securely sent to the backend and delivered via email.

---

## Birthday Gifts

Visitors can send birthday gifts using M-Pesa.

The website securely communicates with the backend, which initiates a Pay Hero STK Push request.

---

## Recent Wishes

Displays the latest birthday wishes submitted by visitors.

---

## Responsive Design

Optimized for:

- Mobile
- Tablet
- Desktop

---

# API Integration

The frontend communicates with the backend using REST APIs.

Example endpoints:

```
POST /api/wish
POST /api/payment
GET /api/payment-status/<transaction_id>
GET /api/health
```

---

# Deployment

The frontend is deployed on **Vercel**.

The backend is deployed separately on **Render**.

---

# Local Development

Clone the repository.

```bash
git clone <repository-url>
```

Navigate into the project.

```bash
cd birthday-frontend
```

Open the project using your preferred editor.

Launch the website by opening:

```
index.html
```

or use a local development server.

---

# Connecting to the Backend

Update the API base URL inside `script.js`.

Example:

```javascript
const API_BASE_URL = "https://birthday-backend-xqh2.onrender.com";
```

All API requests should use this base URL.

---

# User Journey

```
Visitor
     │
     ▼
Open Website
     │
     ▼
Read Birthday Message
     │
     ├──────────────┐
     ▼              ▼
Send Wish      Send Gift
     │              │
     ▼              ▼
Backend API    Pay Hero STK Push
     │              │
     ▼              ▼
Email Sent     M-Pesa Prompt
     │              │
     └──────┬───────┘
            ▼
      Celebration Complete 🎉
```

---

# Security

- No sensitive credentials are stored in the frontend.
- Payment processing is handled securely by the backend.
- API communication uses HTTPS.
- User input is validated by the backend.
- Personal information is handled securely.

---

# Browser Support

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari
- Opera

---

# Performance

- Optimized assets
- Responsive layout
- Fast loading
- Smooth animations
- Lightweight JavaScript

---

# Future Enhancements

- Birthday countdown timer
- Interactive photo gallery
- Guestbook timeline
- Music player
- Digital birthday card
- Gift progress tracker
- Celebration statistics
- Social media sharing
- Dark and light themes

---

# Deployment

Frontend

- Vercel

Backend

- Render

Payments

- Pay Hero API

Email Notifications

- SMTP

---

# License

This project is licensed under the MIT License.

---

## Author

**Victor Kipruto Rop**

Data Engineer • Data Science Student • FinTech Infrastructure Builder

Built with ❤️ to celebrate a special birthday and create memorable experiences for family, friends, and well-wishers.
