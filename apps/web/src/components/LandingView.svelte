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
      slot: "",
      src: "",
      alt: "",
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
      slot: "",
      src: "",
      alt: "",
    },
  ] as const;

  const steps = [
    { title: "Oura 授权", text: "用自己的账号同意，看自己的看板。" },
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
        <p class="landing-kicker" in:introFade={{ delay: 40 }}>oura.kdp.cool</p>
        <h1 id="landing-title" in:introFly={{ y: 14, delay: 60 }}>Oura 健康看板</h1>
        <p class="landing-lead" in:introFade={{ delay: 140 }}>
          睡眠 · 准备度 · 活动，一目了然。
        </p>
        <p class="landing-tool" in:introFade={{ delay: 180 }}>免费 · 多人可用 · Oura 授权</p>
        <div class="landing-actions" in:introFly={{ y: 10, delay: 220 }}>
          <button class="landing-btn primary" type="button" onclick={loginOura}>
            用 Oura 登录
          </button>
        </div>
        {#if error}
          <p class="status err landing-error" role="alert">{error}</p>
        {/if}
      </div>

      <div class="landing-hero-art" in:introFly={{ y: 18, delay: 120 }}>
        <LandingSlot
          slotName="01-hero.png"
          src="/marketing/01-hero.png"
          fallback="/board-preview.svg"
          alt="示意看板：睡眠、准备度、活动。不是你的实时数据。"
          width={1440}
          height={960}
          caption="示意画面，不是你的实时数据。"
        />
      </div>
    </section>

    <section class="landing-section" aria-labelledby="landing-get">
      <LandingReveal>
        <h2 id="landing-get">登录后看到什么</h2>
      </LandingReveal>
      <ul class="landing-features">
        {#each features as item, i (item.title)}
          <li>
            <LandingReveal delay={i * 70}>
              <article class="landing-card">
                {#if item.src}
                  <LandingSlot
                    slotName={item.slot}
                    src={item.src}
                    alt={item.alt}
                    width={1200}
                    height={800}
                  />
                {/if}
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </LandingReveal>
          </li>
        {/each}
      </ul>
    </section>

    <section class="landing-section landing-share" aria-labelledby="landing-how">
      <LandingReveal>
        <LandingSlot
          slotName="03-share-concept.png"
          src="/marketing/03-share-concept.png"
          alt="多人各用各的账号，数据只属于登录者。示意画面。"
          width={1400}
          height={933}
        />
      </LandingReveal>
      <LandingReveal delay={80}>
        <div>
          <h2 id="landing-how">每人登录，看自己的</h2>
          <ol class="landing-steps">
            {#each steps as item, i (item.title)}
              <li>
                <span class="landing-step-n">{i + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            {/each}
          </ol>
        </div>
      </LandingReveal>
    </section>

    <section class="landing-note" aria-labelledby="landing-privacy">
      <LandingReveal>
        <h2 id="landing-privacy">说明</h2>
        <p>
          本工具用于观察自己的 Oura 日数据，属于教育与自我记录，<strong>不是医疗建议</strong>。
        </p>
      </LandingReveal>
    </section>
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
