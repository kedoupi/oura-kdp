<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import LandingReveal from "./LandingReveal.svelte";
  import LandingSlot from "./LandingSlot.svelte";

  let {
    allowDevLogin,
    error,
  }: {
    allowDevLogin: boolean;
    error: string;
  } = $props();

  const features = [
    {
      title: "睡眠",
      text: "周 / 30 / 90 天分数与趋势。",
      slot: "vis-sleep.svg",
      src: "/marketing/vis-sleep.svg",
      alt: "睡眠示意：夜色与曲线，不是实时个人数据。",
    },
    {
      title: "准备度",
      text: "早晨状态，一眼看见起伏。",
      slot: "02-feature-readiness.png",
      src: "/marketing/02-feature-readiness.png",
      alt: "准备度示意：晨光与圆环仪表，不是实时个人数据。",
    },
    {
      title: "活动",
      text: "步数、热量、档位分布。",
      slot: "vis-activity.svg",
      src: "/marketing/vis-activity.svg",
      alt: "活动示意：橙色柱形，不是实时个人数据。",
    },
  ] as const;

  const chips = [
    { title: "Oura 授权", text: "用自己的账号，看自己的看板。" },
    { title: "令牌在服务端", text: "加密存放，浏览器拿不到。" },
    { title: "数据只属于你", text: "不出售，也不做公开皮肤。" },
  ] as const;

  function reduceMotion() {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function introFly(node: Element, params: { y?: number; delay?: number }) {
    if (reduceMotion()) return { duration: 0 };
    return fly(node, {
      y: params.y ?? 16,
      duration: 520,
      delay: params.delay ?? 0,
      easing: quintOut,
    });
  }

  function introFade(node: Element, params: { delay?: number }) {
    if (reduceMotion()) return { duration: 0 };
    return fade(node, { duration: 420, delay: params.delay ?? 0 });
  }

  function loginOura() {
    window.location.href = "/api/auth/oura/start";
  }

  function loginDev() {
    window.location.href = "/api/auth/dev/session";
  }
</script>

<div id="landing-view">
  <a class="landing-skip" href="#landing-main">跳到内容</a>

  <header class="landing-top">
    <a class="landing-brand" href="/">oura.kdp.cool</a>
  </header>

  <main id="landing-main" class="landing-main">
    <section class="landing-hero" aria-labelledby="landing-title">
      <div class="landing-hero-copy">
        <h1 id="landing-title" in:introFly={{ y: 14, delay: 40 }}>Oura 健康看板</h1>
        <p class="landing-lead" in:introFade={{ delay: 120 }}>
          睡眠 · 准备度 · 活动，一目了然。
        </p>
        <div class="landing-actions" in:introFly={{ y: 10, delay: 180 }}>
          <button class="landing-btn primary" type="button" onclick={loginOura}>
            用 Oura 登录
          </button>
        </div>
        {#if error}
          <p class="status err landing-error" role="alert">{error}</p>
        {/if}
      </div>

      <div class="landing-hero-art" in:introFly={{ y: 20, delay: 140 }}>
        <LandingSlot
          slotName="01-hero.png"
          src="/marketing/01-hero.png"
          fallback="/board-preview.svg"
          alt="示意看板出现在书桌笔记本上。不是你的实时数据。"
          width={1440}
          height={960}
        />
      </div>
    </section>

    <section class="landing-section" aria-labelledby="landing-get">
      <LandingReveal>
        <p class="landing-kicker">登录之后</p>
        <h2 id="landing-get">三块，就这些。</h2>
      </LandingReveal>
      <ul class="landing-features">
        {#each features as item, i (item.title)}
          <li>
            <LandingReveal delay={i * 80}>
              <article class="landing-card">
                <LandingSlot
                  slotName={item.slot}
                  src={item.src}
                  alt={item.alt}
                  width={1200}
                  height={800}
                />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </LandingReveal>
          </li>
        {/each}
      </ul>
    </section>

    <section class="landing-section landing-story" aria-labelledby="landing-how">
      <LandingReveal>
        <p class="landing-kicker">多人可用</p>
        <h2 id="landing-how">每人登录，看自己的。</h2>
      </LandingReveal>
      <LandingReveal delay={60}>
        <LandingSlot
          slotName="03-share-concept.png"
          src="/marketing/03-share-concept.png"
          alt="多人各自看自己的看板。示意画面。"
          width={1400}
          height={933}
        />
      </LandingReveal>
      <ul class="landing-chips">
        {#each chips as item, i (item.title)}
          <li>
            <LandingReveal delay={80 + i * 60}>
              <article class="landing-chip">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </LandingReveal>
          </li>
        {/each}
      </ul>
    </section>

    <p class="landing-disclaimer">
      本工具用于观察自己的 Oura 日数据，属于教育与自我记录，不是医疗建议。
    </p>
  </main>

  <footer class="landing-foot">
    <p>
      oura.kdp.cool · 纸面工作室
      <a
        class="landing-gh-foot"
        href="https://github.com/kedoupi/oura-kdp"
        target="_blank"
        rel="noreferrer"
      >GitHub</a>
    </p>
    {#if allowDevLogin}
      <button class="landing-dev" type="button" onclick={loginDev}>DEV 演示登录</button>
    {/if}
  </footer>
</div>
