// LocalBoost Zentralschweiz — shared site behaviour

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initReveal();
  initFaq();
  initForms();
  initCompareSlider();
  initVisibilityCalculator();
  initPackageQuiz();
  initPackagePillToggle();
});

/* Mobile navigation toggle */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
}

/* Fade-in / slide-up on scroll */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/* FAQ accordion + tabs */
function initFaq() {
  const tabs = document.querySelectorAll(".faq-tab");
  const panels = document.querySelectorAll(".faq-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      panels.forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add("is-active");
    });
  });

  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const isOpen = item.classList.contains("is-open");

      item.parentElement.querySelectorAll(".faq-item").forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".faq-answer").style.maxHeight = null;
        other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("is-open");
        answer.style.maxHeight = answer.scrollHeight + "px";
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* Vorher/Nachher-Vergleichsregler (Google-Unternehmensprofil) */
function initCompareSlider() {
  const frame = document.getElementById("compareFrame");
  const range = document.getElementById("compareRange");
  if (!frame || !range) return;

  const setPos = (value) => {
    frame.style.setProperty("--pos", value + "%");
  };

  setPos(range.value);

  // Halten die Position bei Tastatur-/Screenreader-Änderungen synchron.
  range.addEventListener("input", () => setPos(range.value));

  // Eigene Pointer-Logik auf dem FRAME (nicht auf dem Range-Element
  // selbst): der native Range-Thumb ist bei 100% Breite/Höhe nicht
  // zuverlässig ziehbar und seine eigene interne Drag-Berechnung
  // kollidiert mit unserer, sobald er die Pointer-Events tatsächlich
  // empfängt. Das Range-Element ist daher pointer-events:none (siehe
  // CSS) und dient nur noch Tastatur/Screenreader. Das Ziehen mit
  // Maus/Stift/Touch läuft komplett über das Frame, das die Pointer-
  // Events zuverlässig selbst erhält und per Pointer Capture auch dann
  // weiter folgt, wenn der Zeiger das Frame verlässt.
  const valueFromPointer = (clientX) => {
    const rect = frame.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  };

  const applyValue = (value) => {
    if (String(value) === range.value) return;
    range.value = String(value);
    setPos(value);
  };

  let dragging = false;

  frame.addEventListener("pointerdown", (e) => {
    dragging = true;
    frame.setPointerCapture(e.pointerId);
    applyValue(valueFromPointer(e.clientX));
    e.preventDefault();
    range.focus();
  });

  frame.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    applyValue(valueFromPointer(e.clientX));
    e.preventDefault();
  });

  const stopDragging = (e) => {
    if (!dragging) return;
    dragging = false;
    if (frame.hasPointerCapture(e.pointerId)) {
      frame.releasePointerCapture(e.pointerId);
    }
  };

  frame.addEventListener("pointerup", stopDragging);
  frame.addEventListener("pointercancel", stopDragging);
}

/* Sichtbarkeits-Rechner (Startseite) */
function initVisibilityCalculator() {
  const submitBtn = document.getElementById("calcSubmit");
  const branchSelect = document.getElementById("calcBranche");
  const reviewsInput = document.getElementById("calcBewertungen");
  const result = document.getElementById("calcResult");
  if (!submitBtn || !branchSelect || !reviewsInput || !result) return;

  const barBefore = document.getElementById("calcBarBefore");
  const barAfter = document.getElementById("calcBarAfter");
  const valueBefore = document.getElementById("calcValueBefore");
  const valueAfter = document.getElementById("calcValueAfter");
  const explainer = document.getElementById("calcExplainer");

  // Grobe, transparent kommunizierte Einschätzung anhand der Bewertungsanzahl.
  // Keine echten Rankingdaten — dient nur der Veranschaulichung.
  function estimate(reviewCount) {
    if (reviewCount === null) return { current: 7, potentialLow: 2, potentialHigh: 3 };
    if (reviewCount <= 3) return { current: 9, potentialLow: 3, potentialHigh: 4 };
    if (reviewCount <= 10) return { current: 7, potentialLow: 2, potentialHigh: 3 };
    if (reviewCount <= 25) return { current: 6, potentialLow: 2, potentialHigh: 3 };
    if (reviewCount <= 50) return { current: 5, potentialLow: 1, potentialHigh: 2 };
    return { current: 4, potentialLow: 1, potentialHigh: 2 };
  }

  function fillPercent(position) {
    return Math.max(8, Math.min(100, ((11 - position) / 10) * 100));
  }

  submitBtn.addEventListener("click", () => {
    const branche = branchSelect.value || "dein Unternehmen";
    const rawReviews = reviewsInput.value.trim();
    const reviewCount = rawReviews === "" ? null : Math.max(0, parseInt(rawReviews, 10) || 0);

    const { current, potentialLow, potentialHigh } = estimate(reviewCount);
    const potentialMid = (potentialLow + potentialHigh) / 2;

    valueBefore.textContent = `Platz ${current} von 10`;
    valueAfter.textContent = `Platz ${potentialLow}–${potentialHigh} von 10`;

    result.style.setProperty("--calc-before", fillPercent(current) + "%");
    result.style.setProperty("--calc-after", fillPercent(potentialMid) + "%");

    explainer.textContent = `Für Betriebe wie ${branche} entscheidet ein vollständiges, aktiv gepflegtes Google-Profil oft darüber, ob potenzielle Kunden dich überhaupt finden. Mit vollständigen Angaben, aktuellen Fotos und mehr Bewertungen lässt sich die Sichtbarkeit häufig spürbar verbessern.`;

    result.hidden = false;
    result.classList.remove("is-animated");
    // Reflow erzwingen, damit die Breiten-Transition bei jedem Klick neu startet.
    void result.offsetWidth;
    result.classList.add("is-animated");
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/* Bedarfs-Quiz (Pakete-Seite) */
function initPackageQuiz() {
  const card = document.querySelector(".quiz-card");
  if (!card) return;

  const steps = card.querySelectorAll("[data-quiz-step]");
  const dots = card.querySelectorAll("[data-quiz-dot]");
  const options = card.querySelectorAll(".quiz-option");
  const restartBtn = document.getElementById("quizRestart");
  const resultTitle = document.getElementById("quizResultTitle");
  const resultPrice = document.getElementById("quizResultPrice");
  const resultReason = document.getElementById("quizResultReason");

  const answers = { website: null, reviews: null, goal: null };

  const PACKAGES = {
    google: { title: "Google Boost", price: "Ab CHF 490" },
    web: { title: "Web Boost", price: "Auf Anfrage" },
    full: { title: "Full Boost", price: "Auf Anfrage" },
  };

  function recommendPackage(website, reviews, goal) {
    if (website === "nein") {
      return goal === "vertrauen" ? "web" : "full";
    }
    if (reviews !== "ja") return "google";
    return goal === "anfragen" ? "full" : "google";
  }

  function buildReason(pkgKey, website, reviews, goal) {
    const goalPhrase =
      {
        sichtbarkeit: "mehr Sichtbarkeit bei Google",
        anfragen: "mehr Anfragen",
        vertrauen: "mehr Vertrauen bei neuen Kunden",
      }[goal] || "mehr Sichtbarkeit";

    if (pkgKey === "web") {
      return `Du hast noch keine Website und möchtest ${goalPhrase} erreichen. Web Boost gibt dir eine professionelle Website und ein optimiertes Google-Profil als solide Basis.`;
    }
    if (pkgKey === "full") {
      if (website === "nein") {
        return `Du hast noch keine Website und möchtest ${goalPhrase} erreichen. Full Boost deckt Website, Google-Profil, Bewertungen und Social Media in einem ab.`;
      }
      return `Du hast bereits eine Website und Bewertungen – um daraus ${goalPhrase} zu machen, lohnt sich zusätzlich der Aufbau von Social Media und Automatisierung aus dem Full-Boost-Paket.`;
    }
    // google
    if (reviews !== "ja") {
      return `Du hast bereits eine Website, aber noch wenige oder keine Google-Bewertungen. Google Boost holt hier das schnellste Potenzial für ${goalPhrase} heraus.`;
    }
    return `Du bist bei Website und Bewertungen schon gut aufgestellt. Google Boost optimiert dein Profil gezielt weiter für ${goalPhrase}.`;
  }

  function showStep(stepKey) {
    steps.forEach((step) => {
      step.classList.toggle("is-active", step.dataset.quizStep === stepKey);
    });
    dots.forEach((dot) => {
      const dotStep = dot.dataset.quizDot;
      dot.classList.toggle("is-active", dotStep === stepKey);
      dot.classList.toggle("is-done", stepKey === "result" || Number(dotStep) < Number(stepKey));
    });
  }

  function showResult() {
    const pkgKey = recommendPackage(answers.website, answers.reviews, answers.goal);
    const pkg = PACKAGES[pkgKey];
    resultTitle.textContent = pkg.title;
    resultPrice.textContent = pkg.price;
    resultReason.textContent = buildReason(pkgKey, answers.website, answers.reviews, answers.goal);
    showStep("result");
  }

  options.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.quizAnswer;
      const value = btn.dataset.quizValue;
      answers[key] = value;

      btn
        .closest(".quiz-step")
        .querySelectorAll(".quiz-option")
        .forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");

      if (key === "website") {
        setTimeout(() => showStep("2"), 200);
      } else if (key === "reviews") {
        setTimeout(() => showStep("3"), 200);
      } else if (key === "goal") {
        setTimeout(showResult, 200);
      }
    });
  });

  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      answers.website = null;
      answers.reviews = null;
      answers.goal = null;
      options.forEach((b) => b.classList.remove("is-selected"));
      showStep("1");
    });
  }
}

/* Paket-Detail-Toggle mit sliding Pill-Highlight (Pakete-Seite) */
function initPackagePillToggle() {
  const pill = document.querySelector(".pkg-pill");
  if (!pill) return;

  const indicator = pill.querySelector(".pkg-pill__indicator");
  const buttons = pill.querySelectorAll("[data-pkg-pill]");
  const panels = document.querySelectorAll("[data-pkg-detail]");
  const order = ["google", "web", "full"];

  function moveIndicator(index) {
    indicator.style.transform = `translateX(${index * 100}%)`;
  }

  function selectPackage(pkgKey) {
    const index = order.indexOf(pkgKey);
    if (index === -1) return;

    buttons.forEach((btn) => {
      const active = btn.dataset.pkgPill === pkgKey;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.dataset.pkgDetail === pkgKey;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", String(!active));
    });

    moveIndicator(index);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => selectPackage(btn.dataset.pkgPill));
  });

  // Initiale Position des Highlights auf den standardmässig aktiven Button setzen.
  const initialBtn = pill.querySelector(".pkg-pill__btn.is-active") || buttons[0];
  moveIndicator(order.indexOf(initialBtn.dataset.pkgPill));

  // Verknüpfung mit den "Details"-Links auf den Paket-Karten oben:
  // Toggle auf das passende Paket setzen und dorthin scrollen.
  document.querySelectorAll("[data-pkg-jump]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      selectPackage(link.dataset.pkgJump);
      document.getElementById("pkg-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* Dezente Konfetti-Animation bei erfolgreichem Formular-Versand */
function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["var(--color-blue)", "var(--color-blue-light)", "var(--color-blue-dark)", "var(--color-navy)"];
  const burst = document.createElement("div");
  burst.className = "confetti-burst";
  burst.setAttribute("aria-hidden", "true");

  const count = 60;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    const size = 6 + Math.random() * 6;
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.width = size + "px";
    piece.style.height = size * 0.4 + "px";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--drift", (Math.random() - 0.5) * 220 + "px");
    piece.style.setProperty("--rotate-end", 360 + Math.random() * 360 + "deg");
    piece.style.animationDuration = 2 + Math.random() * 1 + "s";
    piece.style.animationDelay = Math.random() * 0.3 + "s";
    burst.appendChild(piece);
  }

  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 3300);
}

/* Formspree AJAX handling: no redirect, inline success/error messaging */
function initForms() {
  document.querySelectorAll("form[data-ajax-form]").forEach((form) => {
    // .form-success / .form-error are siblings of the form (inside .form-card),
    // not descendants — look them up from the shared wrapper.
    const wrapper = form.closest(".form-card") || form.parentElement;
    const successEl = wrapper.querySelector(".form-success");
    const errorEl = wrapper.querySelector(".form-error");
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.textContent : "";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (successEl) successEl.style.display = "none";
      if (errorEl) errorEl.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Wird gesendet …";
      }

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          form.reset();
          if (successEl) successEl.style.display = "block";
          if (successEl) successEl.scrollIntoView({ behavior: "smooth", block: "center" });
          fireConfetti();
        } else {
          if (errorEl) errorEl.style.display = "block";
        }
      } catch (err) {
        if (errorEl) errorEl.style.display = "block";
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        }
      }
    });
  });
}
