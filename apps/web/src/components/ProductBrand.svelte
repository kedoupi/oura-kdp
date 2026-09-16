<script lang="ts">
  import BrandMark from "./BrandMark.svelte";

  let { class: className = "brand" }: { class?: string } = $props();
</script>

<a class={className} href="/">
  <BrandMark class="{className}-mark" />
  <span class="{className}-name">健康看板</span>
</a>
