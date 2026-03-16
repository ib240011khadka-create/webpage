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
        await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          mode: "no-cors",
        });

        localStorage.removeItem(draftKey);
        form.reset();
        if (startedAt) startedAt.value = String(Date.now());
        setStatus("送信が完了しました。ありがとうございます。", "is-success");
        window.setTimeout(function () {
          window.location.href = "thank-you.html?from=request";
        }, 900);
      } catch (_error) {
        setStatus("送信に失敗しました。時間をおいて再度お試しください。", "is-error");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "上記の内容で送信する";
      }
    });
  }

  function initTableSwipeHints() {
    const tables = document.querySelectorAll("table");
    if (!tables.length) return;

    tables.forEach(function (table) {
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
      hint.textContent = "\u2190 Swipe table \u2192";

      if (host.parentNode) {
        host.parentNode.insertBefore(hint, host);
        host.dataset.swipeHint = "1";
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
    initTableSwipeHints();
  });
})();
