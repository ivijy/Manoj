# Manoj Rathour Pipe Traders

Full-stack website for Manoj Rathour Pipe Traders (Sitapur, UP) with enquiry form, MongoDB storage, and email notifications via Brevo API.

## Features

- Responsive business website (Home, About, Products, Contact)
- Enquiry form with validation
- Enquiry data saved in MongoDB
- Email notification on new enquiry (Brevo API)
- Render deployment ready (`render.yaml` included)

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- HTML/CSS/JS frontend
- Brevo Transactional Email API

## Project Structure

- `server.js` - backend API + static serving
- `public/` - frontend files
- `render.yaml` - Render deploy config
- `.env.example` - required environment variables

## Required Environment Variables

Use these in local `.env` and Render Environment:

- `NODE_ENV=production`
- `MONGO_URI=your_mongo_connection_string`
- `OWNER_EMAIL=your_receiver_email`
- `BREVO_API_KEY=your_brevo_api_key`
- `BREVO_SENDER_EMAIL=your_verified_brevo_sender_email`
- `FRONTEND_ORIGIN=https: https://mk-pipe.onrender.com
- `PORT=10000` (local only; Render sets PORT automatically)

## Local Run

```bash
npm install
npm start
