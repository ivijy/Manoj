// ============================================================
// Manoj Rathour Pipe Traders - script.js
// ============================================================

// Scroll Reveal Animations
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach((el) => revealObserver.observe(el));

// Hamburger / Mobile Nav
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.querySelector('.mobile-nav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  mobileNav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });
}

// Active Nav Link
const page = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((a) => {
  if (a.getAttribute('href') === page) a.classList.add('active');
});

// Enquiry Form (Contact Page)
const enquiryForm = document.getElementById('enquiryForm');
if (enquiryForm) {
  const isFileProtocol = window.location.protocol === 'file:';
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isApiPort = window.location.port === '3000';
  const apiHost = window.location.hostname || '127.0.0.1';
  const apiBase = (isFileProtocol || (isLocalHost && !isApiPort)) ? ('http://' + apiHost + ':3000') : '';

  enquiryForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn = this.querySelector('.form-submit');
    const msgBox = document.getElementById('formMsg');
    const formData = {
      name: this.name.value.trim(),
      phone: this.phone.value.trim(),
      city: this.city.value.trim(),
      requirement: this.requirement.value.trim(),
    };

    if (!formData.name || !formData.phone || !formData.city || !formData.requirement) {
      showMsg('error', 'Sab fields zaroori hain. Please poora form bharo.');
      return;
    }
    if (!/^[0-9]{10}$/.test(formData.phone)) {
      showMsg('error', 'Phone number 10 digit ka hona chahiye.');
      return;
    }

    btn.classList.add('btn-loading');
    btn.textContent = 'Bheja ja raha hai...';
    msgBox.className = 'form-msg';
    msgBox.style.display = 'none';

    try {
      const res = await fetch(apiBase + '/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : { success: false, message: 'Server response invalid (' + res.status + ').' };

      if (res.ok && data.success) {
        showMsg('success', 'Enquiry submit ho gayi.');
        enquiryForm.reset();
      } else {
        showMsg('error', data.message || ('Request failed (' + res.status + ').'));
      }
    } catch (err) {
      const baseHint = isFileProtocol
        ? 'Form ko http://localhost:3000/contact.html se kholo.'
        : 'Please dobara try karein.';
      showMsg('error', 'Network error. ' + baseHint + ' Ya call karein: 9956413300');
    } finally {
      btn.classList.remove('btn-loading');
      btn.textContent = 'Enquiry Submit Karein';
    }

    function showMsg(type, text) {
      msgBox.className = 'form-msg ' + type;
      msgBox.textContent = text;
      msgBox.style.display = 'flex';
      setTimeout(() => {
        if (type === 'success') msgBox.style.display = 'none';
      }, 8000);
    }
  });
}

// Smooth number counter for hero stats
function animateCounter(el, target, duration = 1800) {
  const start = Date.now();
  const isPlus = target.toString().includes('+');
  const num = parseInt(target, 10);
  const timer = setInterval(() => {
    const progress = Math.min((Date.now() - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(num * ease);
    el.textContent = current + (isPlus ? '+' : '');
    if (progress === 1) clearInterval(timer);
  }, 16);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      const nums = e.target.querySelectorAll('.stat-num[data-target]');
      nums.forEach((n) => animateCounter(n, n.dataset.target));
      statsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

const statsContainer = document.querySelector('.hero-stats');
if (statsContainer) statsObserver.observe(statsContainer);
