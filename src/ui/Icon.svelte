<!-- Minimal line icons (24×24, stroke = currentColor) -->
<svg class="icon" width={ size } height={ size } viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {#if name === 'crosshair'}
        <circle cx="12" cy="12" r="6.5" />
        <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    {:else if name === 'pointer'}
        <path d="M6 3.5l12 7.2-5.3 1.3-2.4 5.1z" />
    {:else if name === 'weather'}
        <path d="M8 4.5v1.2M3.9 8.6h-1.2M5.1 5.6l.8.8M10.9 5.6l-.8.8" />
        <path d="M5.4 11.2A3 3 0 0 1 10.9 9" />
        <path d="M8.5 19.5h8.2a3.3 3.3 0 0 0 .3-6.6 4.6 4.6 0 0 0-8.9 1.3 2.7 2.7 0 0 0 .4 5.3z" />
    {:else if name === 'plus'}
        <path d="M12 5.5v13M5.5 12h13" />
    {/if}
</svg>

<script lang="ts">
    export let name: 'crosshair' | 'pointer' | 'weather' | 'plus';
    export let size = 20;
</script>

<style>
    .icon { display: block; flex-shrink: 0; }
</style>
