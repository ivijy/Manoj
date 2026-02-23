// ============================================================
// Manoj Rathour Pipe Traders — server.js
// Full-Stack Express + MongoDB + Nodemailer Server
// ============================================================

require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ─────────────────────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pipe-traders')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// ─────────────────────────────────────────────
// MONGOOSE SCHEMA — Enquiry
// ─────────────────────────────────────────────
const enquirySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, required: true, trim: true },
  city:        { type: String, required: true, trim: true },
  requirement: { type: String, required: true, trim: true },
  createdAt:   { type: Date, default: Date.now },
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);

// ─────────────────────────────────────────────
// NODEMAILER TRANSPORTER
// ─────────────────────────────────────────────
//const transporter = nodemailer.createTransport({
//  service: 'gmail',
//  auth: {
//    user: process.env.GMAIL_USER,
 //   pass: process.env.GMAIL_PASS,   // App Password (NOT real Gmail password)
//  },
//});
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


// Helper: Build HTML email body
function buildEmailHTML(data) {
  const time = new Date(data.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #0B3D91; padding: 24px 32px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🔧 New Enquiry Received</h1>
        <p style="color: #a0b8e8; margin: 6px 0 0; font-size: 13px;">Manoj Rathour Pipe Traders — Website Enquiry</p>
      </div>
      <div style="padding: 32px; background: #f9f9f9;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 140px;">👤 Name</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #111; font-size: 15px;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">📞 Phone</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #0B3D91; font-size: 15px;">
              <a href="tel:${data.phone}" style="color: #0B3D91;">${data.phone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">📍 City</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #111; font-size: 15px;">${data.city}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #666; font-size: 13px; vertical-align: top;">📦 Requirement</td>
            <td style="padding: 12px 0; color: #111; font-size: 15px; line-height: 1.6;">${data.requirement}</td>
          </tr>
        </table>
      </div>
      <div style="padding: 16px 32px; background: #FF6B00; text-align: center;">
        <p style="color: #fff; margin: 0; font-size: 13px;">⏰ Received: ${time} (IST)</p>
      </div>
      <div style="padding: 16px 32px; background: #fff; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #999; margin: 0; font-size: 12px;">
          Manoj Rathour Pipe Traders | Munshiganj, Sitapur, UP | 📞 9956413300
        </p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────

// POST /enquiry — Save enquiry + send email
app.post('/enquiry', async (req, res) => {
  try {
    const { name, phone, city, requirement } = req.body;

    // --- Basic validation ---
    if (!name || !phone || !city || !requirement) {
      return res.status(400).json({
        success: false,
        message: 'Sabhi fields zaroori hain. Please sab bharo.',
      });
    }
    if (!/^[0-9]{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Phone number 10 digit ka hona chahiye.',
      });
    }

    // --- Save to MongoDB ---
    const enquiry = await Enquiry.create({ name, phone, city, requirement });
    console.log(`📥 New enquiry saved: ${name} — ${phone} — ${city}`);

    // --- Send email (non-blocking, don't fail if email fails) ---
    const mailOptions = {
      from:    `"Pipe Traders Website" <${process.env.GMAIL_USER}>`,
      to:      process.env.OWNER_EMAIL || process.env.GMAIL_USER,
      subject: `🔧 New Enquiry: ${name} (${city}) — Pipe Traders Website`,
      html:    buildEmailHTML(enquiry),
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('⚠️  Email send failed (enquiry still saved):', err.message);
      } else {
        console.log('📧 Email sent:', info.messageId);
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Aapki enquiry submit ho gayi! Hum 24 ghante mein sampark karenge.',
    });

  } catch (error) {
    console.error('❌ Enquiry error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Kripya dobara try karein ya call karein.',
    });
  }
});

// GET /enquiries — View all enquiries (admin, protect in production)
app.get('/enquiries', async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: enquiries.length, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// CATCH-ALL — Serve index.html for unknown routes
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
 // res.sendFile(path.join(__dirname, 'public', 'index.html'));
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Manoj Rathour Pipe Traders server running!`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
