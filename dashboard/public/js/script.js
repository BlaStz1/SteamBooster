const gamesSimultaneous = 30;
let secondsOpen = 0;
let selectedTimeframe = 'realtime';

const timeframes = {
  realtime: () => secondsOpen,
  '24h': () => 24 * 60 * 60,
  '1w': () => 7 * 24 * 60 * 60,
  '31d': () => 31 * 24 * 60 * 60,
  '1y': () => 365 * 24 * 60 * 60
};

function updateHourDisplay() {
  const seconds = timeframes[selectedTimeframe]();
  const hoursGained = (seconds / 3600) * gamesSimultaneous;
  const perGame = hoursGained / gamesSimultaneous;

  const formattedSeconds = seconds.toLocaleString();
  const formattedHours = selectedTimeframe === 'realtime'
    ? hoursGained.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : Math.floor(hoursGained).toLocaleString();

  const formattedPerGame = selectedTimeframe === 'realtime'
    ? perGame.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })
    : Math.floor(perGame).toLocaleString();

  const rangeLabel = selectedTimeframe === 'realtime'
    ? `This website has been open for <span class="highlight" id="range-text">${formattedSeconds} seconds</span><br />you could have gained <span class="highlight" id="hours-detail">${formattedHours}</span> hours`
    : `In <span class="highlight" id="range-text">${formatLabel(selectedTimeframe)}</span><br />you could have gained <span class="highlight" id="hours-detail">${formattedHours}</span> hours`;

  document.getElementById("timeframe-label").textContent =
    selectedTimeframe === "realtime"
      ? `${formattedSeconds} seconds passed`
      : `in ${formatLabel(selectedTimeframe)}`;

  document.querySelector("#range-text").parentElement.innerHTML = rangeLabel;

  document.getElementById("total-hours").textContent = formattedHours;
  document.getElementById("per-game").textContent = `${formattedPerGame} hours`;
  document.getElementById("games-count").textContent = gamesSimultaneous.toLocaleString();
}

function setTimeframe(frame, button) {
  selectedTimeframe = frame;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("text-white", "border-red-500");
    btn.classList.add("text-white/60");
  });
  button.classList.add("text-white", "border-red-500");
  button.classList.remove("text-white/60");
  updateHourDisplay();
}

function formatLabel(key) {
  switch (key) {
    case '24h': return '24 hours';
    case '1w': return '1 week';
    case '31d': return '31 days';
    case '1y': return '1 year';
    default: return `${secondsOpen} seconds`;
  }
}

setInterval(() => {
  if (selectedTimeframe === 'realtime') secondsOpen++;
  updateHourDisplay();
}, 1000);

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn")[0].click();
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 500);
    }
  }, 1000);
});

gsap.registerPlugin(ScrollTrigger);
gsap.from("#hero-heading", {
  opacity: 0,
  y: 50,
  duration: 1.5,
  delay: 0.5,
  ease: "power4.out",
});

gsap.from("#hero-subheading", {
  opacity: 0,
  y: 30,
  duration: 1.2,
  delay: 0.7,
  ease: "power4.out",
});

gsap.from("#hero-button1", {
  opacity: 0,
  y: 20,
  duration: 1,
  delay: 1,
  ease: "power4.out",
});

gsap.from("#hero-button2", {
  opacity: 0,
  y: 20,
  duration: 1,
  delay: 1.2,
  ease: "power4.out",
});

gsap.from("#hero-logo", {
  opacity: 0,
  scale: 0.8,
  duration: 1.5,
  delay: 0.5,
  ease: "power4.out",
});

function initHeroAnimations() {
  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  timeline
    .from("#hero h1", {
      opacity: 0,
      y: 100,
      duration: 1,
    })
    .from(
      "#hero p",
      {
        opacity: 0,
        y: 50,
        duration: 0.8,
      },
      "-=0.5",
    )
    .from(
      "#hero button",
      {
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
      },
      "-=0.5",
    )
    .from(
      "#hero img",
      {
        opacity: 0,
        x: 100,
        duration: 1,
      },
      "-=0.5",
    );
}

function initFeaturesAnimations() {
  const cards = gsap.utils.toArray(".feature-card");

  cards.forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 50,
      rotation: 5,
      duration: 0.8,
      scrollTrigger: {
        trigger: card,
        start: "top bottom-=100",
        toggleActions: "play none none reverse",
      },
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      const navHeight = document.querySelector("nav").offsetHeight;

      if (target) {
        const targetPosition =
          target.getBoundingClientRect().top + window.pageYOffset - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
      }
    });
  });
}

function initScrollAnimations() {
  gsap.to("nav", {
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "+=100",
      toggleClass: { targets: "nav", className: "nav-blur" },
      scrub: true,
    },
  });

  gsap.from("#commands .bg-white\\/5", {
    opacity: 0,
    y: 50,
    stagger: 0.2,
    duration: 0.8,
    scrollTrigger: {
      trigger: "#commands",
      start: "top center+=100",
      toggleActions: "play none none reverse",
    },
  });
}

function initializeWebsite() {
  initHeroAnimations();
  initScrollAnimations();
  initSmoothScroll();

  const ctaButtons = document.querySelectorAll(".gradient-bg");
  ctaButtons.forEach((button) => button.classList.add("pulse-on-hover"));

  const featureCards = document.querySelectorAll(".feature-card");
  featureCards.forEach((card) => card.classList.add("shine-effect"));
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

window.onscroll = function () {
  const button = document.querySelector('[onclick="scrollToTop()"]');
  if (
    document.body.scrollTop > 500 ||
    document.documentElement.scrollTop > 500
  ) {
    button.style.opacity = "1";
    button.style.pointerEvents = "auto";
  } else {
    button.style.opacity = "0";
    button.style.pointerEvents = "none";
  }
};

document.addEventListener("DOMContentLoaded", initializeWebsite);

function toggleMobileMenu() {
  const mobileMenu = document.getElementById("mobileMenu");
  const menuIcon = document.querySelector(".menu-icon");
  const menuButton = document.querySelector(".md\\:hidden button");

  if (mobileMenu.classList.contains("hidden")) {
    mobileMenu.classList.remove("hidden");
    mobileMenu.classList.add("animate-fade-in");
    menuIcon.setAttribute("d", "M6 18L18 6M6 6l12 12");
  } else {
    mobileMenu.classList.add("hidden");
    mobileMenu.classList.remove("animate-fade-in");
    menuIcon.setAttribute("d", "M4 6h16M4 12h16M4 18h16");
  }

  event.stopPropagation();
}

document.addEventListener("click", (e) => {
  const mobileMenu = document.getElementById("mobileMenu");
  const menuButton = document.querySelector(".md\\:hidden button");

  if (
    !mobileMenu.classList.contains("hidden") &&
    !mobileMenu.contains(e.target) &&
    !menuButton.contains(e.target)
  ) {
    mobileMenu.classList.add("hidden");
    mobileMenu.classList.remove("animate-fade-in");
    document
      .querySelector(".menu-icon")
      .setAttribute("d", "M4 6h16M4 12h16M4 18h16");
  }
});

document.getElementById("mobileMenu")?.addEventListener("click", (e) => {
  e.stopPropagation();
});
