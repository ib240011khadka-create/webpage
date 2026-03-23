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

  function applyLanguage(lang) {
    if (!lang) return;

    const tryApply = () => {
      const combo = document.querySelector(".goog-te-combo");
      if (!combo) return false;
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));
      return true;
    };

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (tryApply() || attempts > 15) clearInterval(timer);
    }, 300);
  }

  function applySavedLanguage() {
    const saved = localStorage.getItem("site_lang");
    if (!saved) return;
    applyLanguage(saved);
  }

  function initRequestForm() {
    const form = document.getElementById("requestForm");
    if (!form) return;

    const status = document.getElementById("requestFormStatus");
    const startedAt = document.getElementById("requestFormStartedAt");
    const nextInput = document.getElementById("requestFormNext");
    const honeyInput = form.querySelector('input[name="_honey"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const emailInput = form.querySelector('#req-email');
    const courseInputs = Array.from(form.querySelectorAll('input[name="course[]"]'));

    if (!status || !submitButton) return;

    const draftKey = "request_form_draft_v1";

    const setStatus = function (message, type) {
      status.textContent = message;
      status.classList.remove("is-error", "is-success");
      if (type) status.classList.add(type);
    };

    const formFields = Array.from(form.querySelectorAll("input, select, textarea")).filter(
      function (field) {
        return (
          field.name &&
          field.type !== "hidden" &&
          field.type !== "submit" &&
          !field.name.startsWith("_")
        );
      }
    );

    const saveDraft = function () {
      const draft = {};
      formFields.forEach(function (field) {
        if (field.type === "checkbox" || field.type === "radio") {
          if (!draft[field.name]) draft[field.name] = [];
          if (field.checked) draft[field.name].push(field.value);
          return;
        }
        draft[field.name] = field.value;
      });
      localStorage.setItem(draftKey, JSON.stringify(draft));
    };

    const restoreDraft = function () {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (!draft) return;

        formFields.forEach(function (field) {
          if (!(field.name in draft)) return;
          if (field.type === "checkbox" || field.type === "radio") {
            field.checked = Array.isArray(draft[field.name]) && draft[field.name].includes(field.value);
            return;
          }
          if (!field.value) field.value = draft[field.name] || "";
        });
      } catch (_error) {
        localStorage.removeItem(draftKey);
      }
    };

    if (startedAt) startedAt.value = String(Date.now());

    if (nextInput) {
      nextInput.value = "thank-you.html?from=request";
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      localStorage.removeItem(draftKey);
      setStatus("送信が完了しました。ありがとうございます。", "is-success");
      const cleanUrl = window.location.pathname + (window.location.hash || "");
      window.history.replaceState({}, "", cleanUrl);
    } else {
      restoreDraft();
    }

    formFields.forEach(function (field) {
      field.addEventListener("input", saveDraft);
      field.addEventListener("change", saveDraft);
    });

    form.addEventListener("submit", async function (event) {
      if (honeyInput && honeyInput.value.trim() !== "") {
        event.preventDefault();
        setStatus("送信できませんでした。もう一度お試しください。", "is-error");
        return;
      }

      if (startedAt) {
        const elapsed = Date.now() - Number(startedAt.value || 0);
        if (!Number.isFinite(elapsed) || elapsed < 1200) {
          event.preventDefault();
          setStatus("少し待ってから送信してください。", "is-error");
          return;
        }
      }

      if (courseInputs.length > 0 && !courseInputs.some(function (input) { return input.checked; })) {
        event.preventDefault();
        setStatus("希望科を1つ以上選択してください。", "is-error");
        return;
      }

      if (emailInput) {
        const email = emailInput.value.trim();
        const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!simpleEmail.test(email)) {
          event.preventDefault();
          setStatus("有効なメールアドレスを入力してください。", "is-error");
          return;
        }
      }

      saveDraft();
      event.preventDefault();
      submitButton.disabled = true;
      submitButton.textContent = "送信中...";
      setStatus("送信しています...", "");

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: new FormData(form),
        });

        const data = await response.json();

        if (data.success) {
          localStorage.removeItem(draftKey);
          form.reset();
          if (startedAt) startedAt.value = String(Date.now());
          setStatus("送信が完了しました。ありがとうございます。", "is-success");
          window.setTimeout(function () {
            window.location.href = "thank-you.html?from=request";
          }, 900);
        } else {
          setStatus(data.message || "送信に失敗しました。時間をおいて再度お試しください。", "is-error");
        }
      } catch (_error) {
        setStatus("送信に失敗しました。時間をおいて再度お試しください。", "is-error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "📨 請求を送信する";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadGoogleTranslateScript();

    const langSelect = document.getElementById("langSelect");
    if (langSelect) {
      langSelect.addEventListener("change", function () {
        const lang = langSelect.value;
        localStorage.setItem("site_lang", lang);
        applyLanguage(lang);
      });

      const saved = localStorage.getItem("site_lang");
      if (saved) langSelect.value = saved;
    }

    applySavedLanguage();
    initRequestForm();
  });
})();

// ===== SCROLL ANIMATIONS =====
(function() {
  const animatedElements = document.querySelectorAll('.scroll-animate');
  if (animatedElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  });

  animatedElements.forEach(el => observer.observe(el));
})();

// ===== NAVBAR SCROLL EFFECT =====
(function() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
})();

// ===== BACK TO TOP BUTTON =====
(function() {
  // Create button dynamically
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', 'ページトップへ戻る');
  btn.setAttribute('title', 'ページトップへ戻る');
  document.body.appendChild(btn);

  // Show/hide based on scroll position
  window.addEventListener('scroll', function() {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  // Scroll to top on click
  btn.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
})();

// ===== ENHANCED FORM VALIDATION =====
(function() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(function(form) {
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!submitBtn) return;

    // Add loading class handling
    form.addEventListener('submit', function() {
      if (form.checkValidity()) {
        submitBtn.classList.add('loading');
      }
    });

    // Real-time validation feedback
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function(input) {
      input.addEventListener('blur', function() {
        if (input.validity.valid) {
          input.style.borderColor = '#6ee7b7';
        } else if (input.value) {
          input.style.borderColor = '#fca5a5';
        }
      });

      input.addEventListener('input', function() {
        if (input.validity.valid) {
          input.style.borderColor = '#6ee7b7';
        } else {
          input.style.borderColor = '';
        }
      });
    });
  });
})();

// ===== LAZY LOAD IMAGES =====
(function() {
  // Add lazy loading to images that don't have it
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(function(img) {
    // Don't lazy load hero/above-fold images
    if (img.closest('.hero') || img.closest('nav')) return;
    img.setAttribute('loading', 'lazy');
  });
})();
