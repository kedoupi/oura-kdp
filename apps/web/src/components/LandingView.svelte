<script lang="ts">
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
      title: "用自己的 Oura 账号授权",
      text: "跳到 Oura 官方授权页。每人登自己的账号，看自己的看板。",
    },
    {
      title: "令牌只在服务端",
      text: "登录令牌在服务器加密存放。浏览器和前端代码都拿不到。",
    },
    {
      title: "数据只属于你",
      text: "你的账号对应你的数据。我们不出售，也不做公开无登录皮肤。",
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
  </header>

  <main id="landing-main" class="landing-main">
    <section class="landing-hero" aria-labelledby="landing-title">
      <div class="landing-hero-copy">
        <p class="landing-kicker">oura.kdp.cool</p>
        <h1 id="landing-title">Oura 健康看板</h1>
        <p class="landing-lead">
          睡眠 · 准备度 · 活动，一目了然。用自己的账号登录，看板只属于你。
        </p>
        <p class="landing-tool">免费 · 多人可用 · Oura 授权</p>
        <div class="landing-actions">
          <button class="landing-btn primary" type="button" onclick={loginOura}>
            用 Oura 登录
          </button>
        </div>
        {#if error}
          <p class="status err landing-error" role="alert">{error}</p>
        {/if}
        <p class="landing-hint">适配 Oura 授权。登录后进入睡眠 · 准备度 · 活动看板。</p>
      </div>

      <LandingSlot
        slotName="01-hero.png"
        src="/marketing/01-hero.png"
        fallback="/board-preview.svg"
        alt="看板示意：睡眠、准备度、活动。示意纸面，不是真实个人数据。"
        width={720}
        height={540}
        caption="纸面示意，不是任何人的实时数据。"
      />
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
      <div class="landing-strip" aria-label="功能配图">
        <LandingSlot
          slotName="02-feature-readiness.png"
          src="/marketing/02-feature-readiness.png"
          alt="准备度示意，待换运营图。"
          width={1200}
          height={675}
        />
      </div>
    </section>

    <section class="landing-section landing-share" aria-labelledby="landing-how">
      <div>
        <h2 id="landing-how">怎么用</h2>
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
      <LandingSlot
        slotName="03-share-concept.png"
        src="/marketing/03-share-concept.png"
        alt="多人各登各的、数据只属于你。待换运营图。"
        width={800}
        height={600}
      />
    </section>

    <section class="landing-note" aria-labelledby="landing-privacy">
      <h2 id="landing-privacy">隐私与说明</h2>
      <p>
        本工具用于观察自己的 Oura 日数据，属于教育与自我记录，<strong>不是医疗建议</strong>。
      </p>
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
