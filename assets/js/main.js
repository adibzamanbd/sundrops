(() => {
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

  // Secondary procedural GLSL shader: living, sunlit ripples behind the feature artwork.
  function initFeatureShader() {
    const host = $(".feature-art");
    if (!host || host.querySelector(".feature-shader-canvas") || !window.THREE)
      return;
    const canvas = document.createElement("canvas");
    canvas.className = "feature-shader-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.prepend(canvas);
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      const scene = new THREE.Scene(),
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const uniforms = {
        uTime: { value: 0 },
        uSize: { value: new THREE.Vector2(1, 1) },
      };
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader:
          "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}",
        fragmentShader: `uniform float uTime; uniform vec2 uSize; varying vec2 vUv; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){vec2 uv=vUv;uv.x*=uSize.x/max(1.,uSize.y);vec2 p=uv-.5;float r=length(p);float a=atan(p.y,p.x);float wave=sin(r*29.-uTime*1.5+sin(a*5.+uTime*.6)*1.4);float wave2=sin((p.x*2.2+p.y*1.6)*19.+uTime*.9+sin(p.y*8.-uTime)*.8);float glow=exp(-r*3.2);vec3 deep=vec3(.025,.07,.38);vec3 blue=vec3(.035,.22,.95);vec3 mint=vec3(.54,1.,.75);vec3 col=mix(deep,blue,smoothstep(-.8,.9,wave*.55+wave2*.35));col=mix(col,mint,smoothstep(.72,1.,wave+wave2*.3)*.34);col+=glow*.08;float grain=(hash(gl_FragCoord.xy+uTime)-.5)*.025;col+=grain;gl_FragColor=vec4(col,1.);}`,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(mesh);
      const resize = () => {
        const r = host.getBoundingClientRect();
        renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
        uniforms.uSize.value.set(r.width, r.height);
      };
      new ResizeObserver(resize).observe(host);
      resize();
      const clock = new THREE.Clock();
      let raf = 0;
      const render = () => {
        raf = requestAnimationFrame(render);
        uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
      };
      render();
      if (window.gsap && window.ScrollTrigger) {
        gsap.to(material.uniforms.uTime, {
          value: 12,
          ease: "none",
          scrollTrigger: {
            trigger: host,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      }
      window.addEventListener(
        "pagehide",
        () => {
          cancelAnimationFrame(raf);
          renderer.dispose();
          material.dispose();
        },
        { once: true },
      );
    } catch (e) {
      console.warn("Feature shader unavailable; keeping CSS art direction.", e);
      canvas.remove();
    }
  }
  initFeatureShader();

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

  // Restrained pointer glow and magnetic button micro-interactions.
  const glow = $(".cursor-glow");
  if (glow && matchMedia("(pointer:fine)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
      },
      { passive: true },
    );
  }
  if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.from(".hero-copy > *", {
      y: 24,
      opacity: 0,
      duration: 0.8,
      stagger: 0.09,
      ease: "power3.out",
      delay: 0.12,
    });
    gsap.utils
      .toArray(
        ".product-card, .team-card, .journal-card, .shop-product, .blog-row",
      )
      .forEach((el, i) =>
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 0.7,
          delay: (i % 3) * 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }),
      );
    gsap.utils
      .toArray(
        ".manifesto-title, .product-heading, .team-heading, .journal-heading, .feature-copy, .contact-info, .faq-section > div:first-child",
      )
      .forEach((el) =>
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }),
      );
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - r.left - r.width / 2) * 0.12,
          y: (e.clientY - r.top - r.height / 2) * 0.12,
          duration: 0.25,
          ease: "power2.out",
        });
      });
      el.addEventListener("pointerleave", () =>
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,.4)" }),
      );
    });
  }

  // High-visibility Three.js + custom GLSL hero sculpture.
  // The scene intentionally uses several real 3D meshes, animated deformation,
  // orbiting objects, lighting, and pointer-driven parallax—not a flat CSS mockup.
  function initHeroShader() {
    const canvas = $("#hero-canvas");
    if (!canvas || !window.THREE) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer,
      scene,
      camera,
      sculpture,
      satellite,
      satellite2,
      haloA,
      haloB,
      raf = 0;
    const pointer = new THREE.Vector2(0, 0);
    const smoothPointer = new THREE.Vector2(0, 0);
    const vertexShader = `
      uniform float uTime;
      uniform vec2 uPointer;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      varying vec3 vObjectPosition;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float waveA = sin(p.x * 3.2 + uTime * 0.8) * cos(p.y * 2.7 - uTime * 0.55);
        float waveB = sin(p.z * 4.0 - uTime * 0.65 + p.x * 1.8);
        float waveC = cos((p.x + p.y) * 3.1 + uTime * 0.45);
        float mouseField = exp(-length(uv - vec2(0.5) - uPointer * 0.17) * 5.0);
        p += normal * (waveA * 0.105 + waveB * 0.045 + waveC * 0.025 + mouseField * 0.11);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldNormal = normalize(normalMatrix * normal);
        vObjectPosition = p;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uPointer;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      varying vec3 vObjectPosition;
      varying vec2 vUv;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x) {
        vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.x),f.z);
      }
      float fbm(vec3 p) { float v=0.0; float a=0.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(7.1,2.4,1.7);a*=0.5;} return v; }
      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDir = normalize(vViewPosition);
        vec3 keyDir = normalize(vec3(-0.55, 0.8, 0.95));
        vec3 rimDir = normalize(vec3(0.9, -0.2, 0.7));
        float diffuse = max(dot(n,keyDir),0.0);
        float fresnel = pow(1.0-max(dot(n,viewDir),0.0),2.35);
        float grain = fbm(vObjectPosition*3.7 + vec3(uTime*.12, -uTime*.09, uTime*.06));
        float flow = sin((vObjectPosition.x*2.7 + vObjectPosition.y*3.2 + fbm(vObjectPosition*2.2)*2.8)*3.1-uTime*.9);
        flow = smoothstep(-0.2,0.92,flow);
        vec3 navy = vec3(0.012,0.035,0.22);
        vec3 blue = vec3(0.025,0.15,0.78);
        vec3 cobalt = vec3(0.10,0.32,1.0);
        vec3 ice = vec3(0.72,0.86,1.0);
        vec3 mint = vec3(0.52,1.0,0.72);
        vec3 color = mix(navy,blue,smoothstep(0.05,0.92,grain));
        color = mix(color,cobalt,smoothstep(0.12,0.9,diffuse)*0.65);
        color = mix(color,ice,flow*0.46);
        color = mix(color,mint,pow(max(dot(n,rimDir),0.0),3.0)*0.72 + fresnel*0.44);
        color *= 0.48 + diffuse*0.82;
        color += fresnel*vec3(0.22,0.45,1.0)*0.9;
        float micro = step(0.992,hash(vec3(floor(vUv*180.0),floor(uTime*5.0))));
        color += micro*0.12;
        gl_FragColor = vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x1239e8, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 5.1);
      const uniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
      };
      const geo = new THREE.IcosahedronGeometry(1.28, 72);
      const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        roughness: 0.24,
      });
      sculpture = new THREE.Mesh(geo, mat);
      sculpture.position.set(-0.03, 0.02, 0);
      scene.add(sculpture);

      // Two real 3D orbit rings at different depths make the sculpture read in perspective.
      haloA = new THREE.Mesh(
        new THREE.TorusGeometry(1.68, 0.012, 12, 240),
        new THREE.MeshBasicMaterial({
          color: 0x8bffbc,
          transparent: true,
          opacity: 0.88,
        }),
      );
      haloA.rotation.set(1.05, 0.28, -0.42);
      scene.add(haloA);
      haloB = new THREE.Mesh(
        new THREE.TorusGeometry(1.87, 0.006, 8, 240),
        new THREE.MeshBasicMaterial({
          color: 0xdbe8ff,
          transparent: true,
          opacity: 0.68,
        }),
      );
      haloB.rotation.set(0.45, -0.72, 0.18);
      scene.add(haloB);

      const pearlMat = new THREE.MeshPhysicalMaterial({
        color: 0x8bffbc,
        metalness: 0.22,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: 0x1239e8,
        emissiveIntensity: 0.25,
      });
      satellite = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 40, 40),
        pearlMat,
      );
      scene.add(satellite);
      satellite2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 28, 28),
        new THREE.MeshPhysicalMaterial({
          color: 0xdbe8ff,
          metalness: 0.35,
          roughness: 0.14,
          clearcoat: 1,
        }),
      );
      scene.add(satellite2);

      const starsGeo = new THREE.BufferGeometry();
      const starPositions = [];
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2,
          r = 1.95 + Math.random() * 0.72;
        starPositions.push(
          Math.cos(a) * r,
          (Math.random() - 0.5) * 3.7,
          Math.sin(a) * r * 0.42,
        );
      }
      starsGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(starPositions, 3),
      );
      const stars = new THREE.Points(
        starsGeo,
        new THREE.PointsMaterial({
          color: 0xdbe8ff,
          size: 0.022,
          transparent: true,
          opacity: 0.85,
          sizeAttenuation: true,
        }),
      );
      scene.add(stars);
      scene.add(new THREE.AmbientLight(0x8baaff, 1.35));
      const key = new THREE.PointLight(0x8bffbc, 5.2, 12);
      key.position.set(-2.5, 2.6, 3.2);
      scene.add(key);
      const fill = new THREE.PointLight(0x4b72ff, 4.5, 10);
      fill.position.set(2.8, -1.7, 2.5);
      scene.add(fill);

      const onPointer = (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        pointer.y = -(((e.clientY - r.top) / r.height - 0.5) * 2);
      };
      canvas.addEventListener("pointermove", onPointer, { passive: true });
      canvas.addEventListener(
        "pointerleave",
        () => {
          pointer.set(0, 0);
        },
        { passive: true },
      );
      const resize = () => {
        if (!canvas.isConnected) return;
        const w = Math.max(1, canvas.clientWidth),
          h = Math.max(1, canvas.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      window.addEventListener("resize", resize);
      resize();
      const clock = new THREE.Clock();
      const animate = () => {
        raf = requestAnimationFrame(animate);
        const t = reduced ? 0.6 : clock.getElapsedTime();
        smoothPointer.lerp(pointer, 0.055);
        uniforms.uTime.value = t;
        uniforms.uPointer.value.copy(smoothPointer);
        sculpture.rotation.y = t * 0.22 + smoothPointer.x * 0.24;
        sculpture.rotation.x =
          Math.sin(t * 0.31) * 0.13 + smoothPointer.y * 0.19;
        sculpture.rotation.z = Math.sin(t * 0.2) * 0.08;
        sculpture.position.y =
          Math.sin(t * 0.7) * 0.055 - smoothPointer.y * 0.08;
        haloA.rotation.z = -0.42 + t * 0.13;
        haloA.rotation.y = 0.28 + smoothPointer.x * 0.12;
        haloB.rotation.x = 0.45 + Math.sin(t * 0.28) * 0.12;
        haloB.rotation.z = 0.18 - t * 0.09;
        satellite.position.set(
          Math.cos(t * 0.7) * 1.62,
          Math.sin(t * 0.95) * 0.82,
          Math.sin(t * 0.7) * 0.42,
        );
        satellite2.position.set(
          Math.cos(t * 0.48 + 2.1) * 1.88,
          Math.sin(t * 0.6 + 1.4) * 1.1,
          Math.cos(t * 0.48) * 0.4,
        );
        stars.rotation.y = t * 0.025;
        stars.rotation.z = Math.sin(t * 0.18) * 0.035;
        camera.position.x +=
          (smoothPointer.x * 0.17 - camera.position.x) * 0.025;
        camera.position.y +=
          (smoothPointer.y * 0.12 - camera.position.y) * 0.025;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      animate();
      window.addEventListener(
        "pagehide",
        () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
          renderer.dispose();
          geo.dispose();
          mat.dispose();
        },
        { once: true },
      );
    } catch (error) {
      console.warn("Sundrops 3D scene could not initialize:", error);
      canvas.dataset.webglError = "true";
    }
  }
  initHeroShader();

  // Second, food-inspired 3D scene: a floating cobalt snack-orb with mint rings.
  // Pointer movement tilts the object; ScrollTrigger drives its rotation and scale.
  function initRitualScene() {
    const canvas = $("#ritual-canvas");
    if (!canvas || !window.THREE) return;
    let renderer, scene, camera, orb, ringA, ringB, raf;
    const pointer = new THREE.Vector2();
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 7);
      const uniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
      };
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `uniform float uTime; uniform vec2 uPointer; varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){vUv=uv; vec3 p=position; float w=sin(p.x*4.0+uTime)*cos(p.y*3.2-uTime*.7)+sin(p.z*5.0-uTime*.8); p+=normal*(w*.075+exp(-length(uv-.5-uPointer*.16)*6.)*.12); vN=normalize(normalMatrix*normal); vP=p; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){float bands=sin(vP.y*13.+sin(vP.x*7.+uTime)*1.6+uTime*1.3); vec3 a=vec3(.04,.12,.72); vec3 b=vec3(.55,1.,.74); vec3 col=mix(a,b,smoothstep(-.25,.8,bands)*.48); float fres=pow(1.-abs(dot(normalize(vN),vec3(0.,0.,1.))),2.); col=mix(col,vec3(.78,1.,.88),fres*.9); gl_FragColor=vec4(col,1.);}`,
      });
      orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 6), material);
      scene.add(orb);
      ringA = new THREE.Mesh(
        new THREE.TorusGeometry(2.02, 0.018, 12, 180),
        new THREE.MeshBasicMaterial({ color: 0x8bffbc }),
      );
      ringA.rotation.set(0.8, 0.3, 0.2);
      scene.add(ringA);
      ringB = new THREE.Mesh(
        new THREE.TorusGeometry(2.28, 0.009, 8, 180),
        new THREE.MeshBasicMaterial({
          color: 0xdbe8ff,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ringB.rotation.set(1.2, -0.4, 0.9);
      scene.add(ringB);
      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const light = new THREE.PointLight(0x8bffbc, 18, 20);
      light.position.set(-3, 3, 4);
      scene.add(light);
      const resize = () => {
        if (!canvas.isConnected) return;
        const w = Math.max(1, canvas.clientWidth),
          h = Math.max(1, canvas.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      new ResizeObserver(resize).observe(canvas);
      resize();
      canvas.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.set(
          (e.clientX - r.left) / r.width - 0.5,
          (e.clientY - r.top) / r.height - 0.5,
        );
      });
      canvas.addEventListener("pointerleave", () => pointer.set(0, 0));
      let scrollProgress = 0;
      if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.to(
          { p: 0 },
          {
            p: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".ritual-section",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5,
            },
            onUpdate: function () {
              scrollProgress = this.targets()[0].p;
            },
          },
        );
      }
      const clock = new THREE.Clock();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();
        uniforms.uTime.value = t;
        uniforms.uPointer.value.lerp(pointer, 0.055);
        orb.rotation.y = t * 0.22 + pointer.x * 0.7 + scrollProgress * 2.4;
        orb.rotation.x =
          Math.sin(t * 0.3) * 0.12 + pointer.y * 0.55 + scrollProgress * 0.6;
        orb.position.y = Math.sin(t * 0.7) * 0.09;
        ringA.rotation.z = t * 0.12 - scrollProgress * 1.7;
        ringB.rotation.y = -t * 0.1 + scrollProgress * 1.2;
        const scale = 1 + Math.sin(t * 0.6) * 0.025 + scrollProgress * 0.12;
        orb.scale.setScalar(scale);
        renderer.render(scene, camera);
      };
      tick();
      window.addEventListener(
        "pagehide",
        () => {
          cancelAnimationFrame(raf);
          renderer.dispose();
          material.dispose();
        },
        { once: true },
      );
    } catch (err) {
      console.warn("Sundrops ritual scene unavailable:", err);
    }
  }
  initRitualScene();

  // Newsletter demo: validates the email and gives feedback, but does not send data to a server.
  const newsletter = $("#newsletter-form");
  if (newsletter)
    newsletter.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#newsletter-email")?.value.trim();
      const message = $(".form-message", newsletter);
      if (!email) return;
      message.textContent =
        "You’re on the list (demo mode)! Connect an email platform to collect real subscriptions.";
      newsletter.reset();
    });

  // Shop filters and persistent demo bag.
  const cart = safeGet("sundrops-demo-cart", []);
  const updateCartCount = () => {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    $$(".cart-count").forEach((el) => (el.textContent = String(count)));
  };
  updateCartCount();
  $$(".add-cart").forEach((btn) =>
    btn.addEventListener("click", () => {
      const product = btn.dataset.product;
      const price = Number(btn.dataset.price || 0);
      const existing = cart.find((item) => item.product === product);
      if (existing) existing.qty++;
      else cart.push({ product, price, qty: 1 });
      safeSet("sundrops-demo-cart", cart);
      updateCartCount();
      toast(`${product} added to your demo bag.`);
      btn.textContent = "ADDED ✓";
      setTimeout(() => (btn.textContent = "ADD +"), 1200);
    }),
  );
  $$(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
      const filter = btn.dataset.filter;
      $$(".shop-product").forEach((product) => {
        const visible = filter === "all" || product.dataset.category === filter;
        product.style.display = visible ? "" : "none";
      });
    }),
  );

  // Contact form demo confirmation; no network request is made.
  const contactForm = $("#contact-form");
  if (contactForm)
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = $(".form-message", contactForm);
      msg.textContent =
        "Thanks for reaching out! Your message is ready for the team in this demo. Connect a backend to deliver it for real.";
      contactForm.reset();
    });

  // Browser-only sample authentication. Never use this for production or a real password.
  const authTabs = $$(".auth-tab");
  const loginForm = $("#login-form");
  const signupForm = $("#signup-form");
  authTabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      const signup = tab.dataset.authTab === "signup";
      authTabs.forEach((t) => t.classList.toggle("active", t === tab));
      loginForm?.classList.toggle("hidden", signup);
      signupForm?.classList.toggle("hidden", !signup);
    }),
  );
  if (signupForm)
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#signup-name").value.trim();
      const email = $("#signup-email").value.trim().toLowerCase();
      const password = $("#signup-password").value;
      const msg = $(".form-message", signupForm);
      if (password.length < 8) {
        msg.textContent = "Choose a password with at least 8 characters.";
        return;
      }
      const accounts = safeGet("sundrops-demo-accounts", []);
      if (accounts.some((a) => a.email === email)) {
        msg.textContent =
          "An account for this email already exists in this browser. Try signing in.";
        return;
      }
      accounts.push({
        name,
        email,
        password,
        createdAt: new Date().toISOString(),
      });
      if (!safeSet("sundrops-demo-accounts", accounts)) {
        msg.textContent =
          "Browser storage is unavailable. This demo cannot create an account.";
        return;
      }
      safeSet("sundrops-demo-session", { name, email });
      msg.textContent = `Welcome to the club, ${name}! Demo account created in this browser.`;
      signupForm.reset();
    });
  if (loginForm)
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#login-email").value.trim().toLowerCase();
      const password = $("#login-password").value;
      const msg = $(".form-message", loginForm);
      const accounts = safeGet("sundrops-demo-accounts", []);
      const account = accounts.find(
        (a) => a.email === email && a.password === password,
      );
      if (!account) {
        msg.textContent =
          "No matching demo account found. Create one first, or check your details.";
        return;
      }
      safeSet("sundrops-demo-session", {
        name: account.name,
        email: account.email,
      });
      msg.textContent = `You're signed in as ${account.name}. This is a local-only demo session.`;
    });

  // Field-note links open their inline reader panels instead of navigating to empty anchors.
  $$('a[href^="#read-"]').forEach((link) =>
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      const target = $(id);
      if (target) {
        e.preventDefault();
        target.classList.add("open");
        target.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      }
    }),
  );

  // Interaction repair: force the first view to start at the actual top, even when
  // the browser restores a stale scroll position from a previous session.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash)
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
    );

  // Global pointer feedback for links, buttons and product surfaces.
  $$("a, button, .product-card, .team-card, .journal-card, summary").forEach(
    (el) => {
      el.addEventListener("pointerenter", () => {
        document.body.classList.add("interactive-hover");
      });
      el.addEventListener("pointerleave", () => {
        document.body.classList.remove("interactive-hover");
      });
    },
  );
  // Animate the custom SVG orbit with GSAP; CSS remains a graceful fallback.
  if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const orbitPaths = $$(".svg-orbit-path");
    if (orbitPaths.length) {
      gsap.to(orbitPaths[0], {
        rotation: 360,
        transformOrigin: "50% 50%",
        duration: 24,
        repeat: -1,
        ease: "none",
      });
      gsap.to(orbitPaths[1], {
        rotation: -360,
        transformOrigin: "50% 50%",
        duration: 31,
        repeat: -1,
        ease: "none",
      });
      gsap.to(".svg-orbit-dot", {
        x: 390,
        y: 90,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".svg-orbit-dot-two", {
        x: -260,
        y: -280,
        duration: 6.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      const progress = $(".hero-scroll-progress span");
      if (progress)
        gsap.to(progress, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "max",
            scrub: 0.25,
          },
        });
      const art = $(".hero-art");
      if (art)
        gsap.to(art, {
          yPercent: 22,
          rotateZ: -5,
          scale: 0.88,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 0.7,
          },
        });
      if (window.Lenis) ScrollTrigger.refresh();
    }
  }

  // The Good Field: robust Three.js + GLSL scene, with a visible 2D fallback if WebGL is blocked.
  function initGoodField() {
    const canvas = $("#field-canvas");
    if (!canvas || canvas.dataset.initialized === "true") return;
    canvas.dataset.initialized = "true";
    const stage = canvas.parentElement;
    const startFallback = () => {
      canvas.dataset.webglError = "true";
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let w = 1,
        h = 1,
        t = 0,
        px = 0.5,
        py = 0.5,
        raf;
      const resize = () => {
        const r = stage.getBoundingClientRect();
        w = Math.max(1, r.width);
        h = Math.max(1, r.height);
        const d = Math.min(devicePixelRatio || 1, 1.5);
        canvas.width = w * d;
        canvas.height = h * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
      };
      new ResizeObserver(resize).observe(stage);
      resize();
      canvas.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width;
        py = (e.clientY - r.top) / r.height;
      });
      const draw = () => {
        raf = requestAnimationFrame(draw);
        t += 0.012;
        ctx.clearRect(0, 0, w, h);
        const cx = w * (0.5 + (px - 0.5) * 0.22),
          cy = h * (0.5 + (py - 0.5) * 0.22);
        for (let i = 0; i < 22; i++) {
          const a = t * (0.35 + (i % 4) * 0.07) + (i * Math.PI * 2) / 22;
          const x =
            cx + Math.cos(a) * (Math.min(w, h) * (0.13 + (i % 5) * 0.045));
          const y =
            cy + Math.sin(a * 1.1) * (Math.min(w, h) * (0.12 + (i % 4) * 0.04));
          const r = 7 + (i % 4) * 5;
          ctx.beginPath();
          ctx.fillStyle =
            i % 3 === 0 ? "rgba(139,255,188,.92)" : "rgba(219,232,255,.88)";
          ctx.shadowColor = "#8bffbc";
          ctx.shadowBlur = 18;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.strokeStyle = "rgba(139,255,188,.6)";
        ctx.lineWidth = 1;
        ctx.ellipse(
          cx,
          cy,
          Math.min(w, h) * 0.3,
          Math.min(w, h) * 0.13,
          t * 0.2,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      };
      draw();
    };
    if (!window.THREE) {
      startFallback();
      return;
    }
    try {
      const THREE = window.THREE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, 7.4);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setClearColor(0x1239e8, 0);
      if ("outputColorSpace" in renderer)
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      const root = new THREE.Group();
      scene.add(root);
      const uniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
        uScroll: { value: 0 },
      };
      const vertexShader = `uniform float uTime; uniform vec2 uPointer; uniform float uScroll; varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;float wave=sin(p.x*3.6+uTime*.8)*cos(p.y*4.1-uTime*.6)+sin(p.z*4.8+uTime*.45);float d=exp(-length(uv-vec2(.5)-uPointer*.23)*7.0);p+=normal*(wave*.13+d*.32+sin(uScroll*6.283+p.y*3.)*.045);vNormal=normalize(normalMatrix*normal);vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
      const fragmentShader = `uniform float uTime;varying vec3 vNormal;varying vec3 vPos;varying vec2 vUv;void main(){float wave=sin(vPos.x*8.+sin(vPos.y*5.+uTime)*1.7+uTime*1.2);float grain=sin(vUv.x*44.+uTime)*cos(vUv.y*39.-uTime*.7);vec3 deep=vec3(.018,.045,.28);vec3 blue=vec3(.025,.19,.98);vec3 mint=vec3(.48,1.,.72);float p=smoothstep(-.7,.8,wave+grain*.12);vec3 c=mix(deep,blue,p);c=mix(c,mint,smoothstep(.4,1.,wave)*.68);float fres=pow(1.-max(0.,dot(normalize(vNormal),vec3(0.,0.,1.))),2.);c=mix(c,vec3(.86,1.,.93),fres*.9);gl_FragColor=vec4(c,1.);}`;
      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
      });
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 7), mat);
      root.add(blob);
      const ringA = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.012, 10, 180),
        new THREE.MeshBasicMaterial({
          color: 0x8bffbc,
          transparent: true,
          opacity: 0.95,
        }),
      );
      ringA.rotation.set(0.85, 0.25, -0.35);
      root.add(ringA);
      const ringB = new THREE.Mesh(
        new THREE.TorusGeometry(2.15, 0.007, 8, 180),
        new THREE.MeshBasicMaterial({
          color: 0xdbe8ff,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ringB.rotation.set(0.25, 1.05, 0.2);
      root.add(ringB);
      const satellites = [];
      for (let i = 0; i < 18; i++) {
        const radius = i % 4 === 0 ? 0.13 : i % 3 === 0 ? 0.095 : 0.055;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 20, 16),
          new THREE.MeshStandardMaterial({
            color: i % 3 === 0 ? 0x8bffbc : 0xdbe8ff,
            metalness: 0.28,
            roughness: 0.18,
            emissive: 0x1239e8,
            emissiveIntensity: 0.22,
          }),
        );
        root.add(m);
        satellites.push({
          m,
          a: (i / 18) * Math.PI * 2,
          speed: 0.18 + (i % 5) * 0.045,
          r: 1.65 + (i % 4) * 0.13,
        });
      }
      scene.add(new THREE.AmbientLight(0xffffff, 1.7));
      const light = new THREE.PointLight(0x8bffbc, 4, 14);
      light.position.set(2, 3, 4);
      scene.add(light);
      const light2 = new THREE.PointLight(0x4b6cff, 3, 12);
      light2.position.set(-3, -2, 3);
      scene.add(light2);
      const pointer = new THREE.Vector2(),
        target = new THREE.Vector2();
      let scrollT = 0;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      canvas.addEventListener(
        "pointermove",
        (e) => {
          const r = canvas.getBoundingClientRect();
          target.set(
            ((e.clientX - r.left) / r.width - 0.5) * 2,
            -((e.clientY - r.top) / r.height - 0.5) * 2,
          );
        },
        { passive: true },
      );
      canvas.addEventListener("pointerleave", () => target.set(0, 0));
      const resize = () => {
        const r = stage.getBoundingClientRect();
        const w = Math.max(1, r.width),
          h = Math.max(1, r.height);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      new ResizeObserver(resize).observe(stage);
      window.addEventListener("resize", resize);
      resize();
      if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.to(
          { p: 0 },
          {
            p: 1,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.4,
            },
            onUpdate: function () {
              scrollT = this.targets()[0].p;
              uniforms.uScroll.value = scrollT;
            },
          },
        );
        gsap.from(".field-intro h2", {
          y: 50,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".field-intro",
            start: "top 85%",
            once: true,
          },
        });
        const path = $(".field-doodle path");
        if (path) {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1.8,
            ease: "power2.out",
            scrollTrigger: { trigger: stage, start: "top 80%", once: true },
          });
        }
      }
      const clock = new THREE.Clock();
      function render() {
        requestAnimationFrame(render);
        const t = reduced ? 0 : clock.getElapsedTime();
        pointer.lerp(target, 0.07);
        uniforms.uTime.value = t;
        uniforms.uPointer.value.copy(pointer);
        root.rotation.y +=
          (pointer.x * 0.32 + scrollT * 0.85 - root.rotation.y) * 0.045;
        root.rotation.x += (pointer.y * 0.24 - root.rotation.x) * 0.045;
        root.position.y = Math.sin(t * 0.6) * 0.07 + scrollT * 0.18;
        blob.rotation.y = t * 0.18;
        blob.rotation.x = Math.sin(t * 0.38) * 0.15;
        ringA.rotation.z = -0.35 + t * 0.12 + scrollT * 0.4;
        ringB.rotation.x = 0.25 + Math.sin(t * 0.2) * 0.14;
        for (const o of satellites) {
          const a = o.a + t * o.speed + pointer.x * 0.12;
          o.m.position.set(
            Math.cos(a) * o.r,
            Math.sin(a * 1.08) * (o.r * 0.55) + Math.sin(t + o.a) * 0.08,
            Math.sin(a * 2 + t * 0.35) * 0.42,
          );
          o.m.rotation.x = t * 0.3;
          o.m.rotation.y = t * 0.25;
        }
        camera.position.x += (pointer.x * 0.2 - camera.position.x) * 0.035;
        camera.position.y += (pointer.y * 0.14 - camera.position.y) * 0.035;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      }
      render();
    } catch (err) {
      console.warn(
        "Sundrops field WebGL failed; using animated fallback.",
        err,
      );
      startFallback();
    }
  }
  initGoodField();

  // Transparent outline cursor: one controller only, enlarged over interactive targets.
  const cursor = $(".custom-cursor");
  if (cursor && matchMedia("(pointer:fine)").matches) {
    let tx = -100,
      ty = -100,
      x = tx,
      y = ty,
      raf = 0;
    const move = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add("is-visible");
    };
    const over = (e) => {
      const target =
        e.target instanceof Element
          ? e.target.closest(
              'a,button,[role="button"],.product-card,.journal-card,.shop-product,.round-arrow',
            )
          : null;
      if (target) cursor.classList.add("is-hover");
    };
    const out = (e) => {
      const from =
        e.target instanceof Element
          ? e.target.closest(
              'a,button,[role="button"],.product-card,.journal-card,.shop-product,.round-arrow',
            )
          : null;
      const to =
        e.relatedTarget instanceof Element
          ? e.relatedTarget.closest(
              'a,button,[role="button"],.product-card,.journal-card,.shop-product,.round-arrow',
            )
          : null;
      if (from && !to) cursor.classList.remove("is-hover");
    };
    window.addEventListener("pointermove", move, { passive: true });
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
      raf = requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-visible", "is-hover");
    });
    window.addEventListener("pagehide", () => cancelAnimationFrame(raf), {
      once: true,
    });
  }

  // GSAP page transition curtain. Works with ordinary multi-page navigation too.
  if (!document.querySelector(".page-transition-curtain")) {
    const curtain = document.createElement("div");
    curtain.className = "page-transition-curtain";
    document.body.appendChild(curtain);
  }
  const curtain = $(".page-transition-curtain");
  if (
    curtain &&
    window.gsap &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    gsap.set(curtain, { scaleY: 0, transformOrigin: "bottom", autoAlpha: 1 });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (
        !a ||
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        a.target === "_blank" ||
        a.hasAttribute("download")
      )
        return;
      const url = new URL(a.href, location.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.hash)
      )
        return;
      e.preventDefault();
      document.body.classList.add("is-transitioning");
      gsap
        .timeline({ onComplete: () => (location.href = url.href) })
        .to(curtain, { scaleY: 1, duration: 0.36, ease: "power3.inOut" });
    });
    window.addEventListener("pageshow", () => {
      gsap.set(curtain, { scaleY: 0, transformOrigin: "top" });
      document.body.classList.remove("is-transitioning");
    });
  }

  // Hidden scratch-card easter egg: click the Sundrops wordmark seven times, then scratch.
  function initScratchEgg() {
    const logos = $$(".wordmark");
    if (!logos.length || $(".scratch-egg")) return;
    let clicks = 0,
      timer;
    const egg = document.createElement("div");
    egg.className = "scratch-egg";
    egg.innerHTML =
      '<div class="scratch-underlay"><div><p>YOU FOUND THE LITTLE EXTRA</p><h2>GOOD THINGS<br><em>ARE EVERYWHERE.</em></h2><p>THANKS FOR TAKING A MOMENT WITH SUNDROPS · SD®</p><svg width="220" height="90" viewBox="0 0 220 90" aria-hidden="true"><path d="M8 45 C35 2 65 88 100 45 S165 2 212 45" fill="none" stroke="#8bffbc" stroke-width="2"/><circle cx="100" cy="45" r="8" fill="#8bffbc"/></svg></div></div><canvas aria-label="Scratch to reveal the hidden Sundrops message"></canvas><button class="scratch-close" type="button">CLOSE ×</button><div class="scratch-hint">CLICK + DRAG TO SCRATCH AWAY THE BLUE · A LITTLE HIDDEN THANK-YOU</div>';
    document.body.appendChild(egg);
    const c = $("canvas", egg);
    let ctx,
      down = false,
      cleared = 0,
      lastX = null,
      lastY = null;
    const setup = () => {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      c.width = innerWidth * d;
      c.height = innerHeight * d;
      c.style.width = "100%";
      c.style.height = "100%";
      ctx = c.getContext("2d");
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#1239e8";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#8bffbc";
      ctx.font = "700 13px DM Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "A LITTLE EXTRA GOOD",
        innerWidth / 2,
        innerHeight / 2 - 100,
      );
      ctx.globalCompositeOperation = "destination-out";
    };
    const scratch = (e) => {
      if (!down) return;
      const r = c.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 66;
      ctx.beginPath();
      if (lastX === null) {
        ctx.arc(x, y, 33, 0, Math.PI * 2);
      } else {
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      lastX = x;
      lastY = y;
      cleared++;
      if (cleared > 90) {
        c.style.opacity = ".25";
        setTimeout(() => {
          if (egg.classList.contains("is-open")) c.style.opacity = "0";
        }, 220);
      }
    };
    logos.forEach((l) =>
      l.addEventListener("click", (e) => {
        if (egg.classList.contains("is-open")) return;
        clicks++;
        clearTimeout(timer);
        timer = setTimeout(() => (clicks = 0), 1800);
        if (clicks >= 7) {
          e.preventDefault();
          clicks = 0;
          egg.classList.add("is-open");
          setup();
          if (window.gsap)
            gsap.fromTo(
              egg,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.35 },
            );
        }
      }),
    );
    c.addEventListener("pointerdown", (e) => {
      down = true;
      lastX = lastY = null;
      c.setPointerCapture?.(e.pointerId);
      scratch(e);
    });
    c.addEventListener("pointermove", scratch);
    const end = () => {
      down = false;
      lastX = lastY = null;
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    egg.querySelector(".scratch-close").addEventListener("click", () => {
      egg.classList.remove("is-open");
      c.style.opacity = "1";
    });
    window.addEventListener("resize", () => {
      if (egg.classList.contains("is-open")) setup();
    });
  }
  initScratchEgg();

  // Barba CDN is kept available for future routing, while the GSAP curtain above provides reliable transitions for these static pages.
})();
