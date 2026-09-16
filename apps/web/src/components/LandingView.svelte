<script lang="ts">
  let {
    allowDevLogin,
    error,
  }: {
    allowDevLogin: boolean;
    error: string;
  } = $props();

  const features = [
    {
      title: "周分数与趋势",
      text: "睡眠、准备度、活动的 7 / 30 / 90 天分数、区间均值，以及三条趋势。",
    },
    {
      title: "步数与热量",
      text: "每日步数柱、档位分布，以及活动热量。",
    },
    {
      title: "准备度热力",
      text: "日历热力一眼看出起伏，旁边是贡献雷达。",
    },
    {
      title: "简要洞察",
      text: "短评、睡眠 / 准备度贡献项。登录后就是完整看板。",
    },
  ] as const;

  const steps = [
    {
      title: "Oura 官方授权",
      text: "按钮会跳到 cloud.ouraring.com，用你自己的 Oura 账号同意。",
    },
    {
      title: "令牌只在服务端",
      text: "登录令牌在服务器加密存放。浏览器和前端代码都拿不到。",
    },
    {
      title: "数据只属于你",
      text: "每人一份自己的看板。我们不出售数据，也不做公开无登录皮肤。",
    },
  ] as const;

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
    <a
      class="landing-gh"
      href="https://github.com/kedoupi/oura-kdp"
      target="_blank"
      rel="noreferrer"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 7.07c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.38-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.05 10.05 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
        />
      </svg>
      GitHub
    </a>
  </header>

  <main id="landing-main" class="landing-main">
    <section class="landing-hero" aria-labelledby="landing-title">
      <div class="landing-hero-copy">
        <p class="landing-kicker">免费 · 开源 · 多人 OAuth</p>
        <h1 id="landing-title">oura.kdp.cool</h1>
        <p class="landing-lead">
          可分享的 Oura 睡眠 · 准备度 · 活动看板。用自己的账号登录，看自己的数据。
        </p>
        <div class="landing-actions">
          <button class="landing-btn primary" type="button" onclick={loginOura}>
            用 Oura 登录
          </button>
          <a
            class="landing-btn ghost"
            href="https://github.com/kedoupi/oura-kdp"
            target="_blank"
            rel="noreferrer"
          >
            查看源码
          </a>
        </div>
        {#if error}
          <p class="status err landing-error" role="alert">{error}</p>
        {/if}
        <p class="landing-hint">
          登录会跳转到 <code>cloud.ouraring.com/oauth/authorize</code>。
        </p>
      </div>

      <figure class="landing-mock" aria-label="看板示意：摘要卡、趋势线与热力格，不含真实个人数据">
        <div class="landing-mock-sheet" aria-hidden="true">
          <div class="landing-mock-kicker">OURA · HEALTH</div>
          <div class="landing-mock-cards">
            <div class="landing-mock-card">
              <span>睡眠</span>
              <svg viewBox="0 0 64 20" preserveAspectRatio="none">
                <path d="M0 14 C10 12 14 8 22 9 C32 10 36 5 46 6 C54 7 58 4 64 5" />
              </svg>
            </div>
            <div class="landing-mock-card">
              <span>准备度</span>
              <svg viewBox="0 0 64 20" preserveAspectRatio="none">
                <path d="M0 10 C8 11 16 7 24 8 C34 9 40 14 50 12 C56 11 60 8 64 9" />
              </svg>
            </div>
            <div class="landing-mock-card">
              <span>活动</span>
              <svg viewBox="0 0 64 20" preserveAspectRatio="none">
                <path d="M0 12 C12 13 18 6 28 7 C38 8 42 15 52 13 C58 12 62 9 64 10" />
              </svg>
            </div>
          </div>
          <div class="landing-mock-chart">
            <svg viewBox="0 0 240 72" preserveAspectRatio="none">
              <path
                class="landing-mock-area"
                d="M0 48 C28 44 40 28 70 32 C100 36 118 18 150 22 C180 26 200 14 240 16 L240 72 L0 72 Z"
              />
              <path
                class="landing-mock-line"
                d="M0 48 C28 44 40 28 70 32 C100 36 118 18 150 22 C180 26 200 14 240 16"
              />
            </svg>
          </div>
          <div class="landing-mock-heat">
            {#each [1, 2, 3, 2, 4, 3, 5, 2, 3, 4, 5, 3, 2, 4] as tone, i (`hm-${i}`)}
              <i data-tone={tone}></i>
            {/each}
          </div>
        </div>
        <figcaption>示意纸面，不是任何人的实时数据。</figcaption>
      </figure>
    </section>

    <section class="landing-section" aria-labelledby="landing-get">
      <h2 id="landing-get">登录后能看到什么</h2>
      <ul class="landing-features">
        {#each features as item (item.title)}
          <li>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        {/each}
      </ul>
    </section>

    <section class="landing-section" aria-labelledby="landing-how">
      <h2 id="landing-how">登录怎么工作</h2>
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
    </section>

    <section class="landing-note" aria-labelledby="landing-privacy">
      <h2 id="landing-privacy">隐私与说明</h2>
      <p>
        本站用于观察自己的 Oura 日数据，属于教育与自我记录，<strong>不是医疗建议</strong>。
        源码在
        <a href="https://github.com/kedoupi/oura-kdp" target="_blank" rel="noreferrer">kedoupi/oura-kdp</a>
        ，MIT 许可。
      </p>
    </section>
  </main>

  <footer class="landing-foot">
    <p>oura.kdp.cool · 纸面工作室</p>
    {#if allowDevLogin}
      <button class="landing-dev" type="button" onclick={loginDev}>DEV 演示登录</button>
    {/if}
  </footer>
</div>
