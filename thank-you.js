// Confetti Animation
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const confettiColors = [
  "#e8107a",
  "#ff6b9d",
  "#ffd700",
  "#4ade80",
  "#60a5fa",
  "#f472b6",
];
const confettiPieces = [];

for (let i = 0; i < 150; i++) {
  confettiPieces.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: Math.random() * 8 + 4,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    speed: Math.random() * 3 + 2,
    angle: Math.random() * Math.PI * 2,
    spin: Math.random() * 0.2 - 0.1,
  });
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiPieces.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();

    p.y += p.speed;
    p.x += Math.sin(p.angle) * 0.5;
    p.angle += p.spin;

    if (p.y > canvas.height + 20) {
      p.y = -20;
      p.x = Math.random() * canvas.width;
    }
  });

  requestAnimationFrame(animateConfetti);
}

animateConfetti();

// Stop confetti after 5 seconds
setTimeout(() => {
  confettiPieces.length = 0;
}, 5000);

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// ===== AUTO-REDIRECT WITH COUNTDOWN =====
(function () {
  const redirectNotice = document.getElementById("redirect-notice");
  if (!redirectNotice) return;

  const redirectUrl = "index.html";
  let countdown = 15; // seconds

  function updateCountdown() {
    if (countdown > 0) {
      redirectNotice.textContent = `${countdown}秒後に学校トップページへ自動的に移動します...`;
      countdown--;
      setTimeout(updateCountdown, 1000);
    } else {
      redirectNotice.textContent = "移動しています...";
      window.location.href = redirectUrl;
    }
  }

  // Start countdown after a brief delay to let user see the success message
  setTimeout(updateCountdown, 2000);

  // Cancel redirect if user interacts with the page
  const cancelRedirect = () => {
    countdown = -1;
    redirectNotice.textContent = "";
    document.removeEventListener("click", cancelRedirect);
  };

  // Only cancel on button/link clicks
  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("click", cancelRedirect);
  });
})();
