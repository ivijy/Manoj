require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  let isRenderOrigin = false;

  try {
    isRenderOrigin = /\.onrender\.com$/.test(new URL(origin).hostname);
  } catch (_err) {
    isRenderOrigin = false;
  }

  const isAllowedOrigin = Boolean(origin) && (isLocalOrigin || isRenderOrigin || origin === FRONTEND_ORIGIN);

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, service: 'pipe-traders-api' });
});

const hasPublicDir = fs.existsSync(path.join(__dirname, 'public'));
const staticRoot = hasPublicDir ? path.join(__dirname, 'public') : __dirname;
app.use(express.static(staticRoot));

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pipe-traders')
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  requirement: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);

function buildEmailHTML(data) {
  const time = new Date(data.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #0B3D91; padding: 24px 32px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">New Enquiry Received</h1>
        <p style="color: #a0b8e8; margin: 6px 0 0; font-size: 13px;">Manoj Rathour Pipe Traders - Website Enquiry</p>
      </div>
      <div style="padding: 32px; background: #f9f9f9;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px; width: 140px;">Name</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #111; font-size: 15px;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">Phone</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #0B3D91; font-size: 15px;">
              <a href="tel:${data.phone}" style="color: #0B3D91;">${data.phone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #666; font-size: 13px;">City</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #111; font-size: 15px;">${data.city}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #666; font-size: 13px; vertical-align: top;">Requirement</td>
            <td style="padding: 12px 0; color: #111; font-size: 15px; line-height: 1.6;">${data.requirement}</td>
          </tr>
        </table>
      </div>
      <div style="padding: 16px 32px; background: #FF6B00; text-align: center;">
        <p style="color: #fff; margin: 0; font-size: 13px;">Received: ${time} (IST)</p>
      </div>
    </div>
  `;
}

async function sendViaBrevoApi(enquiry) {
  const apiKey = process.env.BREVO_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;
  const fromEmail = process.env.BREVO_SENDER_EMAIL || ownerEmail;

  if (!apiKey || !ownerEmail || !fromEmail) {
    throw new Error('Missing BREVO_API_KEY / OWNER_EMAIL / BREVO_SENDER_EMAIL');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: 'Pipe Traders Website',
      },
      to: [{ email: ownerEmail }],
      subject: `New Enquiry: ${enquiry.name} (${enquiry.city}) - Pipe Traders Website`,
      htmlContent: buildEmailHTML(enquiry),
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Brevo API failed (${response.status}): ${txt}`);
  }

  const json = await response.json();
  return json.messageId || 'sent';
}

app.post('/enquiry', async (req, res) => {
  try {
    const { name, phone, city, requirement } = req.body;

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

    const enquiry = await Enquiry.create({ name, phone, city, requirement });
    console.log(`New enquiry saved: ${name} - ${phone} - ${city}`);

    sendViaBrevoApi(enquiry)
      .then((id) => console.log('Email sent via Brevo API:', id))
      .catch((err) => console.error('Email send failed (enquiry still saved):', err.message));

    return res.status(201).json({
      success: true,
      message: 'Aapki enquiry submit ho gayi! Hum 24 ghante mein sampark karenge.',
    });
  } catch (error) {
    console.error('Enquiry error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Kripya dobara try karein ya call karein.',
    });
  }
});

app.get('/enquiries', async (_req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: enquiries.length, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('*', (_req, res) => {
  const indexPath = hasPublicDir
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, 'index.html');

  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log('Pipe Traders server running');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
