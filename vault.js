/**
 * Manu Romantic Memory Vault — Core Engine
 * Manages PIN authentication, particle effects, image lightbox, session guard, and audio/transitions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  initVaultSecurity();
  initLightbox();
  initHeaderNav();
});

/* ==========================================================================
   1. AMBIENT DUST & GLOW PARTICLES
   ========================================================================== */
function initParticleCanvas() {
  if (typeof VAULT_CONFIG !== 'undefined' && !VAULT_CONFIG.enableParticles) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let canvas = document.getElementById('particle-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    document.body.prepend(canvas);
  }

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = [];
  const particleCount = Math.min(Math.floor((width * height) / 18000), 50);

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3 - 0.1;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.pulseSpeed = Math.random() * 0.01 + 0.005;
      this.pulseDir = Math.random() > 0.5 ? 1 : -1;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      this.alpha += this.pulseSpeed * this.pulseDir;
      if (this.alpha > 0.6 || this.alpha < 0.1) {
        this.pulseDir *= -1;
      }

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235, 175, 190, ${this.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(225, 112, 133, 0.4)';
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
}

/* ==========================================================================
   2. PIN LOCK & ENTRANCE SCREEN CONTROLLER
   ========================================================================== */
let currentPin = "";

function initVaultSecurity() {
  const isIndex = !!document.getElementById('screen-landing');
  const unlocked = sessionStorage.getItem(VAULT_CONFIG?.sessionKey || 'manu_vault_unlocked') === 'true';

  if (isIndex) {
    if (unlocked) {
      revealMainContent(true);
    } else {
      setupLandingAndPinEvents();
    }
  } else {
    // Secondary page check
    if (!unlocked) {
      window.location.href = 'index.html?lock=1';
    }
  }
}

function setupLandingAndPinEvents() {
  const landingScreen = document.getElementById('screen-landing');
  const pinScreen = document.getElementById('screen-pin');
  const enterBtn = document.getElementById('enter-world-btn');
  const bfCard = document.getElementById('bf-card');
  const pinDisplay = document.getElementById('pin-display-dots');
  const pinStatus = document.getElementById('pin-status-msg');
  const keypad = document.getElementById('pin-keypad');

  const secretPin = VAULT_CONFIG?.secretPin || "1610";

  function goToPinScreen() {
    if (!landingScreen || !pinScreen) return;
    landingScreen.classList.add('fade-out');
    setTimeout(() => {
      landingScreen.style.display = 'none';
      pinScreen.style.display = 'flex';
      pinScreen.classList.add('fade-in');
    }, 400);
  }

  if (enterBtn) enterBtn.addEventListener('click', goToPinScreen);
  if (bfCard) bfCard.addEventListener('click', goToPinScreen);

  // Keypad click handlers
  if (keypad) {
    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.key-btn');
      if (!btn) return;
      const key = btn.dataset.key;
      handlePinInput(key);
    });
  }

  // Physical keyboard support
  window.addEventListener('keydown', (e) => {
    if (!pinScreen || pinScreen.style.display === 'none') return;
    if (e.key >= '0' && e.key <= '9') {
      handlePinInput(e.key);
    } else if (e.key === 'Backspace') {
      handlePinInput('del');
    } else if (e.key === 'Enter') {
      if (currentPin.length === secretPin.length) {
        verifyPin();
      }
    }
  });

  function handlePinInput(key) {
    if (key === 'del') {
      currentPin = currentPin.slice(0, -1);
    } else if (key === 'clear') {
      currentPin = "";
    } else if (typeof key === 'string' && key.length === 1 && currentPin.length < secretPin.length) {
      currentPin += key;
    }

    updatePinDisplay();

    if (currentPin.length === secretPin.length) {
      setTimeout(verifyPin, 150);
    }
  }

  function updatePinDisplay() {
    if (!pinDisplay) return;
    const dots = pinDisplay.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < currentPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function verifyPin() {
    if (currentPin === secretPin) {
      if (pinStatus) {
        pinStatus.textContent = VAULT_CONFIG?.successMessage || "Welcome back ❤️";
        pinStatus.className = "pin-status success";
      }
      sessionStorage.setItem(VAULT_CONFIG?.sessionKey || 'manu_vault_unlocked', 'true');
      
      setTimeout(() => {
        if (pinScreen) pinScreen.classList.add('fade-out');
        setTimeout(() => {
          if (pinScreen) pinScreen.style.display = 'none';
          revealMainContent(false);
        }, 500);
      }, 600);

    } else {
      if (pinStatus) {
        pinStatus.textContent = VAULT_CONFIG?.errorMessage || "That's not our secret 🤍";
        pinStatus.className = "pin-status error";
      }

      if (pinDisplay) {
        pinDisplay.classList.add('shake');
        setTimeout(() => pinDisplay.classList.remove('shake'), 500);
      }

      setTimeout(() => {
        currentPin = "";
        updatePinDisplay();
      }, 800);
    }
  }
}

function revealMainContent(instant = false) {
  const landingScreen = document.getElementById('screen-landing');
  const pinScreen = document.getElementById('screen-pin');
  const mainVault = document.getElementById('screen-vault');

  if (landingScreen) landingScreen.style.display = 'none';
  if (pinScreen) pinScreen.style.display = 'none';

  if (mainVault) {
    mainVault.style.display = 'block';
    if (!instant) {
      mainVault.classList.add('fade-in');
    }
  }
}

/* ==========================================================================
   3. FLOATING HEADER & NAVIGATION
   ========================================================================== */
function initHeaderNav() {
  const navContainer = document.querySelector('.vault-nav-wrapper');
  if (!navContainer) return;

  const lockBtn = document.getElementById('nav-lock-btn');
  if (lockBtn) {
    lockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem(VAULT_CONFIG?.sessionKey || 'manu_vault_unlocked');
      window.location.href = 'index.html';
    });
  }
}

/* ==========================================================================
   4. LIGHTBOX IMAGE PREVIEW MODAL
   ========================================================================== */
function initLightbox() {
  // Create modal markup dynamically
  let lightbox = document.getElementById('vault-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'vault-lightbox';
    lightbox.className = 'vault-lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-overlay"></div>
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Close image">&times;</button>
        <img class="lightbox-img" src="" alt="Memory photo preview">
        <p class="lightbox-caption"></p>
      </div>
    `;
    document.body.appendChild(lightbox);
  }

  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const overlay = lightbox.querySelector('.lightbox-overlay');

  function openLightbox(src, alt = '') {
    lightboxImg.src = src;
    lightboxCaption.textContent = alt || 'Our Special Memory';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', closeLightbox);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Attach click events to gallery images
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.track img, .card img, .couple-img, .story-container img:not(.no-lightbox)');
    if (img && !img.closest('#bf-card') && !img.classList.contains('no-lightbox')) {
      openLightbox(img.src, img.alt || img.getAttribute('title') || 'Memory Photo');
    }
  });
}
