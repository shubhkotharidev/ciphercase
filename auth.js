// ---- tab switching ----
const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabSignupBtn = document.getElementById("tabSignupBtn");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

tabLoginBtn.addEventListener("click", () => {
  tabLoginBtn.classList.add("active");
  tabSignupBtn.classList.remove("active");
  loginForm.style.display = "block";
  signupForm.style.display = "none";
});

tabSignupBtn.addEventListener("click", () => {
  tabSignupBtn.classList.add("active");
  tabLoginBtn.classList.remove("active");
  signupForm.style.display = "block";
  loginForm.style.display = "none";
});

// ---- password show/hide ----
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    const showing = target.type === "text";
    target.type = showing ? "password" : "text";
    btn.textContent = showing ? "SHOW" : "HIDE";
  });
});

function setStatus(el, message, kind) {
  el.textContent = message;
  el.className = "status show" + (kind ? " " + kind : "");
}

// ---- redirect if already logged in ----
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) window.location.href = "case.html";
})();

// ---- countdown helper for lockouts ----
let cooldownTimer = null;
function runCooldownDisplay(el, seconds, btn) {
  clearInterval(cooldownTimer);
  btn.disabled = true;
  let remaining = seconds;
  const tick = () => {
    setStatus(
      el,
      `Too many failed attempts. Try again in ${formatSeconds(remaining)}.`,
      "warn"
    );
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      btn.disabled = false;
      setStatus(el, "You can try logging in again now.", "");
    }
    remaining--;
  };
  tick();
  cooldownTimer = setInterval(tick, 1000);
}

// ---- LOGIN ----
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const statusEl = document.getElementById("loginStatus");
  const btn = document.getElementById("loginBtn");

  if (!isValidEmail(email)) {
    setStatus(statusEl, "Please enter a valid email address.", "warn");
    return;
  }

  btn.disabled = true;
  setStatus(statusEl, "Checking access…", "");

  // Check server-side lock before even attempting sign in
  const { data: lockData, error: lockErr } = await supabaseClient.rpc("check_login_lock", {
    p_email: email,
  });

  if (!lockErr && lockData && lockData[0] && lockData[0].is_locked) {
    runCooldownDisplay(statusEl, lockData[0].seconds_remaining, btn);
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    const { data: failData } = await supabaseClient.rpc("register_failed_attempt", {
      p_email: email,
    });
    btn.disabled = false;

    if (failData && failData[0] && failData[0].is_locked) {
      runCooldownDisplay(statusEl, failData[0].seconds_remaining, btn);
    } else {
      const left = failData && failData[0] ? failData[0].attempts_left : null;
      setStatus(
        statusEl,
        `Incorrect email or password.${left !== null ? ` ${left} attempt(s) left before cooldown.` : ""}`,
        "warn"
      );
    }
    return;
  }

  await supabaseClient.rpc("register_successful_login", { p_email: email });
  setStatus(statusEl, "Access granted. Redirecting…", "ok");
  window.location.href = "case.html";
});

// ---- SIGNUP ----
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const statusEl = document.getElementById("signupStatus");
  const btn = document.getElementById("signupBtn");

  if (!isValidEmail(email)) {
    setStatus(statusEl, "Please enter a valid email address.", "warn");
    return;
  }
  if (password.length < 8) {
    setStatus(statusEl, "Password must be at least 8 characters.", "warn");
    return;
  }

  btn.disabled = true;
  setStatus(statusEl, "Registering…", "");

  const { error } = await supabaseClient.auth.signUp({ email, password });

  btn.disabled = false;

  if (error) {
    setStatus(statusEl, error.message || "Registration failed. Try again.", "warn");
    return;
  }

  setStatus(
    statusEl,
    "Check your inbox for a verification link, then log in from the LOG IN tab.",
    "ok"
  );
  signupForm.reset();
});
