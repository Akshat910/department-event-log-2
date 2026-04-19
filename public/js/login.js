// ═══════════════════════════════════════════════════════════
// Academic Architect — Login Page
// ═══════════════════════════════════════════════════════════

const LoginPage = {
  render() {
    // Replace entire body content for login
    document.body.innerHTML = `
      <div class="login-page" id="login-page">
        <div class="login-card fade-in">
          <div class="login-logo">
            <span class="logo-icon material-icons-outlined">school</span>
            <div class="logo-text">
              <span class="logo-title">Academic Architect</span>
              <span class="logo-subtitle">Dept. Database</span>
            </div>
          </div>

          <div class="login-error" id="login-error"></div>

          <form id="login-form" autocomplete="on">
            <div class="form-group">
              <label for="login-username">Username</label>
              <input type="text" class="form-input" id="login-username" placeholder="Enter your username" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" class="form-input" id="login-password" placeholder="Enter your password" autocomplete="current-password" required>
            </div>
            <button type="submit" class="login-btn" id="login-submit">
              Sign In
            </button>
          </form>

          <div class="login-hint">
            Demo credentials: <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
      <div id="toast-container" class="toast-container"></div>
    `;

    this.setupForm();
  },

  setupForm() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-submit');

      if (!username || !password) {
        errorEl.textContent = 'Please enter both username and password.';
        errorEl.style.display = 'block';
        return;
      }

      submitBtn.textContent = 'Signing in...';
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (res.ok) {
          const data = await res.json();
          // Reload page to reinitialize the app
          window.location.reload();
        } else {
          errorEl.textContent = 'Invalid username or password. Please try again.';
          errorEl.style.display = 'block';
          submitBtn.textContent = 'Sign In';
          submitBtn.disabled = false;

          // Shake animation
          const card = document.querySelector('.login-card');
          card.style.animation = 'none';
          requestAnimationFrame(() => {
            card.style.animation = 'shake 0.5s ease-in-out';
          });
        }
      } catch {
        errorEl.textContent = 'Network error. Please check your connection.';
        errorEl.style.display = 'block';
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
      }
    });
  }
};

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);
