let currentUser = null;
let selectedSuspect = null;
let selectedRating = 0;
const loadingPanel = document.getElementById("loadingPanel");
const closedPanel = document.getElementById("closedPanel");
const caseForm = document.getElementById("caseForm");
const lineupEl = document.getElementById("lineup");
const starsEl = document.getElementById("stars");
const ratingLabel = document.getElementById("ratingLabel");
const formStatus = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
const RATING_WORDS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Outstanding" };
function setStatus(el, message, kind) {
  el.textContent = message;
  el.className = "status show" + (kind ? " " + kind : "");
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function renderLineup() {
  lineupEl.innerHTML = "";
  (window.SUSPECTS || []).forEach((name, i) => {
    const card = document.createElement("div");
    card.className = "suspect-card";
    card.dataset.name = name;
    card.innerHTML = `<span class="tag">SUBJECT ${String(i + 1).padStart(2, "0")}</span>${escapeHtml(name)}`;
    card.addEventListener("click", () => {
      document.querySelectorAll(".suspect-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedSuspect = name;
    });
    lineupEl.appendChild(card);
  });
}
starsEl.querySelectorAll(".star").forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value, 10);
    paintStars();
    ratingLabel.textContent = `${selectedRating} / 5 — ${RATING_WORDS[selectedRating]}`;
  });
  star.addEventListener("mouseenter", () => paintStars(parseInt(star.dataset.value, 10)));
});
starsEl.addEventListener("mouseleave", () => paintStars());

function paintStars(hoverValue) {
  const value = hoverValue || selectedRating;
  starsEl.querySelectorAll(".star").forEach((s) => {
    s.classList.toggle("filled", parseInt(s.dataset.value, 10) <= value);
  });
}
(async () => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }
  currentUser = sessionData.session.user;
  document.getElementById("userEmail").textContent = currentUser.email;

  const { data: existing, error } = await supabaseClient
    .from("submissions")
    .select("suspect, reasoning, rating")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  loadingPanel.style.display = "none";
  if (existing) {
    document.getElementById("closedSuspect").textContent = existing.suspect;
    document.getElementById("closedReasoning").textContent = existing.reasoning;
    document.getElementById("closedRating").textContent = `${existing.rating} / 5`;
    closedPanel.style.display = "block";
  } else {
    renderLineup();
    caseForm.style.display = "block";
  }
})();
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});
caseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedSuspect) {
    setStatus(formStatus, "Select a suspect from the lineup.", "warn");
    return;
  }
  const reasoning = document.getElementById("reasoning").value.trim();
  if (reasoning.length < 5) {
    setStatus(formStatus, "Add a little more detail to your reasoning.", "warn");
    return;
  }
  if (!selectedRating) {
    setStatus(formStatus, "Rate your experience before submitting.", "warn");
    return;
  }
  submitBtn.disabled = true;
  setStatus(formStatus, "Filing your case…", "");

  const { error } = await supabaseClient.from("submissions").insert({
    user_id: currentUser.id,
    suspect: selectedSuspect,
    reasoning,
    rating: selectedRating,
  });
  if (error) {
    submitBtn.disabled = false;
    if (error.code === "23505") {
      setStatus(formStatus, "You've already filed an answer for this case.", "warn");
    } else {
      setStatus(formStatus, "Something went wrong. Please try again.", "warn");
    }
    return;
  }

  setStatus(formStatus, "Case filed. Thank you, agent.", "ok");
  setTimeout(() => window.location.reload(), 1200);
});
