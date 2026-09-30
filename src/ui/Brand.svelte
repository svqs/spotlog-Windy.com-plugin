<!-- the name in a sentence: normal text font, lowercase (capital S only to start a sentence), followed by the little pixel star -->
<span class="sl-brand">{ cap ? 'Spotlog' : 'spotlog' }<PixelStar size="0.72em" /></span>

<script lang="ts">
    import PixelStar from './PixelStar.svelte';
    /** capital S only at the start of a sentence; otherwise always lowercase */
    export let cap = false;
</script>

<style>
    .sl-brand { display: inline-flex; align-items: center; gap: 0.22em; white-space: nowrap; vertical-align: -0.06em; line-height: 1; }
</style>
