() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const safeGet = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };
  const safeSet = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const toast = (message) => {
    const el = $(".toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
  };

  // Logo-only loader:
  function initSundropsLoader() {
    if (document.querySelector(".sd-loader")) return;
    const loader = document.createElement("div");
    loader.className = "sd-loader";
    loader.setAttribute("aria-label", "Loading");
    loader.innerHTML =
      '<div class="sd-loader-logo" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="loader-sun-halo" cx="60" cy="60" r="39"/><path class="loader-sun-path" d="M60 12 L67 42 L96 25 L78 52 L108 60 L78 67 L96 95 L67 78 L60 108 L52 78 L24 95 L42 67 L12 60 L42 52 L24 25 L52 42Z"/><circle class="loader-sun-core" cx="60" cy="60" r="13"/></svg></div><div class="sd-loader-progress"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="loader-track" cx="50" cy="50" r="43"/><circle class="loader-value" cx="50" cy="50" r="43"/></svg><span class="sd-loader-percent">0%</span></div>';
    document.body.prepend(loader);
    const value = loader.querySelector(".sd-loader-percent"),
      ring = loader.querySelector(".loader-value");
    const circumference = 2 * Math.PI * 43;
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference);
    const started = performance.now();
    let loaded = document.readyState === "complete",
      done = false,
      raf = 0;
    const paint = (n) => {
      const progress = Math.max(0, Math.min(100, n));
      value.textContent = Math.round(progress) + "%";
      ring.style.strokeDashoffset = String(
        circumference * (1 - progress / 100),
      );
    };
    const onLoad = () => {
      loaded = true;
    };
    window.addEventListener("load", onLoad, { once: true });
    if (window.gsap) {
      gsap.to(loader.querySelector(".sd-loader-logo"), {
        rotation: 360,
        duration: 5.5,
        repeat: -1,
        ease: "none",
      });
      gsap.to(loader.querySelector(".loader-sun-core"), {
        scale: 0.72,
        transformOrigin: "50% 50%",
        duration: 0.8,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.fromTo(
        loader.querySelector(".sd-loader-progress"),
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.65,
          ease: "back.out(1.8)",
          delay: 0.12,
        },
      );
    }
    const tick = (now) => {
      if (done) return;
      const elapsed = now - started;
      // Keep progress believable while assets load, then finish between 3 and 5 seconds.
      const canFinish = elapsed >= 3000 && loaded;
      const timedOut = elapsed >= 5000;
      const progress =
        canFinish || timedOut
          ? 100
          : Math.min(96, (elapsed / 5000) * 94 + (loaded ? 2 : 0));
      paint(progress);
      if (canFinish || timedOut) {
        done = true;
        window.removeEventListener("load", onLoad);
        setTimeout(() => {
          loader.classList.add("is-leaving");
          setTimeout(() => loader.remove(), 760);
        }, 160);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener(
      "pagehide",
      () => {
        cancelAnimationFrame(raf);
      },
      { once: true },
    );
  }
  initSundropsLoader();
  // Lenis smooth scrolling with GSAP ticker synchronization and a safe fallback.
  if (
    window.Lenis &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.__sundropsLenis
  ) {
    try {
      const lenis = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.2,
        smoothWheel: true,
        anchors: true,
      });
      window.__sundropsLenis = lenis;
      if (window.gsap) {
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (time) => {
          lenis.raf(time);
          requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
      }
      if (window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        lenis.on("scroll", ScrollTrigger.update);
      }
      window.addEventListener("load", () => window.ScrollTrigger?.refresh());
    } catch (e) {
      console.warn("Lenis unavailable; native scrolling is active.", e);
    }
  }

  // Small, accessible mobile navigation.
  const menuButton = $(".menu-toggle");
  const nav = $(".main-nav");
  if (menuButton && nav)
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  $$(".main-nav a").forEach((link) =>
    link.addEventListener("click", () => {
      nav?.classList.remove("open");
      document.body.classList.remove("menu-open");
      menuButton?.setAttribute("aria-expanded", "false");
    }),
  );
};
