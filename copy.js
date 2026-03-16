(function () {
  function loadGoogleTranslateScript() {
    if (document.getElementById("google-translate-script")) return;

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }

  window.googleTranslateElementInit = function () {
    const host = document.getElementById("google_translate_element");
    if (!host) return;

    // eslint-disable-next-line no-undef
    new google.translate.TranslateElement(
      {
        pageLanguage: "ja",
        includedLanguages: "ja,en,ne,hi,vi",
        autoDisplay: false,
      },
      "google_translate_element"
    );
  };

  function applySavedLanguage() {
    const saved = localStorage.getItem("site_lang");
    if (!saved) return;

    const tryApply = () => {
      const combo = document.querySelector(".goog-te-combo");
      if (!combo) return false;
      combo.value = saved;
      combo.dispatchEvent(new Event("change"));
      return true;
    };

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (tryApply() || attempts > 15) clearInterval(timer);
    }, 300);
  }

  function initKagoshimaSlideshow() {
    const heroImage = document.querySelector(".kagoshima-hero-image");
    if (!heroImage) return;

    const slides = (heroImage.dataset.slides || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (slides.length < 2) return;

    let index = slides.indexOf(heroImage.getAttribute("src") || "");
    if (index < 0) index = 0;

    const rotate = () => {
      index = (index + 1) % slides.length;
      heroImage.classList.add("is-swapping");

      setTimeout(() => {
        heroImage.src = slides[index];
        heroImage.classList.remove("is-swapping");
      }, 260);
    };

    // Kick off sooner so users can confirm it's working, then keep rotating.
    setTimeout(rotate, 3000);
    setInterval(rotate, 10000);
  }

  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const nameInput = form.querySelector("#name");
    const emailInput = form.querySelector("#email");
    const messageInput = form.querySelector("#message");
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById("contactFormStatus");
    const nextInput = document.getElementById("contactNext");
    const startedAt = document.getElementById("contactFormStartedAt");
    const honeyInput = form.querySelector('input[name="_honey"]');

    if (!nameInput || !emailInput || !messageInput || !submitButton || !status) {
      return;
    }

    const draftKey = "contact_form_draft_v1";

    const setStatus = (message, type) => {
      status.textContent = message;
      status.classList.remove("is-error", "is-success");
      if (type) status.classList.add(type);
    };

    const saveDraft = () => {
      const draft = {
        name: nameInput.value,
        email: emailInput.value,
        message: messageInput.value,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    };

    const validate = () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const message = messageInput.value.trim();
      const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (name.length < 2) return "Please enter a name with at least 2 characters.";
      if (!simpleEmail.test(email)) return "Please enter a valid email address.";
      if (message.length < 10) return "Please write at least 10 characters in your inquiry.";
      return "";
    };

    if (nextInput) {
      nextInput.value = "thank-you.html?from=contact";
    }

    if (startedAt) {
      startedAt.value = String(Date.now());
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      localStorage.removeItem(draftKey);
      setStatus("Inquiry sent successfully. Thank you.", "is-success");
      const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
      window.history.replaceState({}, "", cleanUrl);
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (saved) {
          if (!nameInput.value) nameInput.value = saved.name || "";
          if (!emailInput.value) emailInput.value = saved.email || "";
          if (!messageInput.value) messageInput.value = saved.message || "";
        }
      } catch (_error) {
        localStorage.removeItem(draftKey);
      }
    }

    [nameInput, emailInput, messageInput].forEach((field) => {
      field.addEventListener("input", saveDraft);
    });

    form.addEventListener("submit", async (event) => {
      if (honeyInput && honeyInput.value.trim() !== "") {
        event.preventDefault();
        setStatus("Submission blocked. Please try again.", "is-error");
        return;
      }

      if (startedAt) {
        const elapsed = Date.now() - Number(startedAt.value || 0);
        if (!Number.isFinite(elapsed) || elapsed < 3000) {
          event.preventDefault();
          setStatus("Please wait a moment, then submit again.", "is-error");
          return;
        }
      }

      const validationMessage = validate();
      if (validationMessage) {
        event.preventDefault();
        setStatus(validationMessage, "is-error");
        return;
      }

      saveDraft();
      event.preventDefault();
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
      setStatus("Submitting your inquiry...", "");

      try {
        await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          mode: "no-cors",
        });

        localStorage.removeItem(draftKey);
        form.reset();
        if (startedAt) startedAt.value = String(Date.now());
        setStatus("Inquiry sent successfully. Thank you.", "is-success");
        window.setTimeout(() => {
          window.location.href = "thank-you.html?from=contact";
        }, 900);
      } catch (_error) {
        setStatus("Could not send inquiry. Please try again.", "is-error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send Inquiry";
      }
    });
  }

  function initTableSwipeHints() {
    const tables = document.querySelectorAll("table");
    if (!tables.length) return;

    tables.forEach((table) => {
      const host = table.closest(".table-wrap") || table;
      if (host.dataset.swipeHint === "1") return;
      if (
        host.previousElementSibling &&
        host.previousElementSibling.classList &&
        host.previousElementSibling.classList.contains("table-swipe-hint")
      ) {
        host.dataset.swipeHint = "1";
        return;
      }

      const hint = document.createElement("p");
      hint.className = "table-swipe-hint";
      hint.textContent = "\u2190 横にスワイプできます \u2192";

      if (host.parentNode) {
        host.parentNode.insertBefore(hint, host);
        host.dataset.swipeHint = "1";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Initialize slideshow first so it is not blocked by optional features.
    initKagoshimaSlideshow();

    // --- Welcome Splash ---
    const splash = document.getElementById("welcomeSplash");
    if (splash) {
      const dismiss = () => splash.classList.add("splash-hidden");
      splash.addEventListener("click", dismiss);
      setTimeout(dismiss, 3000);
    }

    loadGoogleTranslateScript();

    const langSelect = document.getElementById("langSelect");
    if (langSelect) {
      langSelect.addEventListener("change", () => {
        const lang = langSelect.value;
        try {
          localStorage.setItem("site_lang", lang);
        } catch (_error) {
          // Ignore storage failures and continue core page behavior.
        }

        const combo = document.querySelector(".goog-te-combo");
        if (combo) {
          combo.value = lang;
          combo.dispatchEvent(new Event("change"));
        }
      });

      let saved = null;
      try {
        saved = localStorage.getItem("site_lang");
      } catch (_error) {
        saved = null;
      }
      if (saved) langSelect.value = saved;
    }

    try {
      applySavedLanguage();
    } catch (_error) {
      // Translation restore is optional.
    }
    initContactForm();
    initTableSwipeHints();
  });
})();