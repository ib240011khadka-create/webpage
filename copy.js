(function () {
  var translationsCache = null;

  function resolveKey(obj, key) {
    var parts = key.split(".");
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
      if (current == null || typeof current !== "object") return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  function fetchTranslations() {
    if (translationsCache) return Promise.resolve(translationsCache);
    return fetch("data/translations.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        translationsCache = data;
        return data;
      })
      .catch(function () { return null; });
  }

  function applyTranslations(lang) {
    if (!lang || lang === "ja") return; // Japanese is the page default
    fetchTranslations().then(function (t) {
      if (!t) return;

      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var entry = resolveKey(t, el.getAttribute("data-i18n"));
        if (entry && entry[lang]) {
          el.textContent = entry[lang];
        }
      });

      document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        var entry = resolveKey(t, el.getAttribute("data-i18n-placeholder"));
        if (entry && entry[lang]) {
          el.setAttribute("placeholder", entry[lang]);
        }
      });
    });
  }

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

    const initialSrc = (heroImage.getAttribute("src") || "").trim();
    const slides = Array.from(
      new Set(
        [initialSrc, ...(heroImage.dataset.slides || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)]
      )
    );

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
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: new FormData(form),
        });

        const data = await response.json();

        if (data.success) {
          localStorage.removeItem(draftKey);
          form.reset();
          if (startedAt) startedAt.value = String(Date.now());
          setStatus("Inquiry sent successfully. Thank you.", "is-success");
          window.setTimeout(() => {
            window.location.href = "thank-you.html?from=contact";
          }, 900);
        } else {
          setStatus(data.message || "Could not send inquiry. Please try again.", "is-error");
        }
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

  function initHeroVideoTextToggle() {
    var video = document.getElementById("heroVideo");
    var overlay = document.getElementById("heroOverlay");
    var scrollHint = document.querySelector(".hero-scroll-indicator");
    if (!video || !overlay) return;

    var SHOW_PERCENT = 20; // show text during first & last 20% of video
    var isHidden = false;
    var lastCheck = 0;

    video.addEventListener("timeupdate", function () {
      var now = Date.now();
      if (now - lastCheck < 250) return; // throttle to ~4 checks/sec
      lastCheck = now;

      var t = video.currentTime;
      var dur = video.duration;
      if (!dur || !isFinite(dur) || dur < 1) return;

      var pct = (t / dur) * 100;
      var shouldShow = pct <= SHOW_PERCENT || pct >= (100 - SHOW_PERCENT);

      if (!shouldShow && !isHidden) {
        overlay.classList.add("text-hidden");
        if (scrollHint) scrollHint.classList.add("text-hidden");
        isHidden = true;
      } else if (shouldShow && isHidden) {
        overlay.classList.remove("text-hidden");
        if (scrollHint) scrollHint.classList.remove("text-hidden");
        isHidden = false;
      }
    });

    // Loop manually so text resets at the start of each loop
    video.addEventListener("ended", function () {
      overlay.classList.remove("text-hidden");
      if (scrollHint) scrollHint.classList.remove("text-hidden");
      isHidden = false;
      video.currentTime = 0;
      video.play();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Initialize slideshow first so it is not blocked by optional features.
    initKagoshimaSlideshow();
    initHeroVideoTextToggle();

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

        applyTranslations(lang);

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
      applyTranslations(saved);
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

// ===== SCROLL ANIMATIONS =====
(function() {
  // Find all elements with scroll-animate class
  const animatedElements = document.querySelectorAll('.scroll-animate');
  
  if (animatedElements.length === 0) return;

  // Intersection Observer for triggering animations
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

  // Observe all animated elements
  animatedElements.forEach(el => {
    observer.observe(el);
  });
})();

// ===== NAVBAR SCROLL EFFECT =====
(function() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  
  let ticking = false;
  window.addEventListener('scroll', function() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      ticking = false;
    });
  });
})();

// ===== ACTIVE SECTION HIGHLIGHT =====
(function() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.menu a[href^="#"]');
  
  if (!sections.length || !navLinks.length) return;

  let ticking = false;
  
  function highlightActiveSection() {
    const scrollY = window.scrollY;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');
      
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + sectionId) {
            link.classList.add('active');
          }
        });
      }
    });
  }
  
  window.addEventListener('scroll', function() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
      highlightActiveSection();
      ticking = false;
    });
  });
  highlightActiveSection(); // Run on page load
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
  let topTicking = false;
  window.addEventListener('scroll', function() {
    if (topTicking) return;
    topTicking = true;
    requestAnimationFrame(function() {
      if (window.scrollY > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
      topTicking = false;
    });
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

// ===== FAQ ACCORDION =====
(function() {
  const accordions = document.querySelectorAll('.accordion');
  
  accordions.forEach(function(accordion) {
    const singleOpen = accordion.dataset.singleOpen === 'true';
    const headers = accordion.querySelectorAll('.accordion-header');
    
    headers.forEach(function(header) {
      header.addEventListener('click', function() {
        const item = header.closest('.accordion-item');
        const content = item.querySelector('.accordion-content');
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        
        // If single-open mode, close all other items first
        if (singleOpen && !isExpanded) {
          accordion.querySelectorAll('.accordion-item').forEach(function(otherItem) {
            if (otherItem !== item) {
              const otherHeader = otherItem.querySelector('.accordion-header');
              const otherContent = otherItem.querySelector('.accordion-content');
              otherHeader.setAttribute('aria-expanded', 'false');
              otherContent.style.maxHeight = null;
            }
          });
        }
        
        // Toggle current item
        if (isExpanded) {
          header.setAttribute('aria-expanded', 'false');
          content.style.maxHeight = null;
        } else {
          header.setAttribute('aria-expanded', 'true');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
      
      // Handle keyboard navigation
      header.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });
  });
})();
