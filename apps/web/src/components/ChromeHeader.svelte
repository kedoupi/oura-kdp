<script lang="ts">
  import ProductBrand from "./ProductBrand.svelte";

  let {
    isDev = false,
    aiBusy,
    onAi,
    onLogout,
  }: {
    isDev?: boolean;
    aiBusy: boolean;
    onAi: () => void;
    onLogout: () => void;
  } = $props();
</script>

<header class="chrome">
  <div class="chrome-inner">
    <ProductBrand class="brand" />
    <nav class="nav">
      <a class="active" href="/">健康</a>
      <button type="button" class="ai-btn" disabled={aiBusy} onclick={onAi}>AI 分析</button>
      {#if isDev}
        <span class="ver-chip">DEV 演示</span>
      {/if}
      <button type="button" class="ai-btn" onclick={onLogout}>退出</button>
    </nav>
  </div>
</header>
