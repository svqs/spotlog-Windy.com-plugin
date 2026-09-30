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
    {:else if name === 'pin'}
        <path d="M12 21s-6-5.6-6-10.2A6 6 0 0 1 18 10.8C18 15.4 12 21 12 21z" />
        <circle cx="12" cy="10.5" r="2.2" />
    {:else if name === 'pen'}
        <path d="M4.5 19.5l1-4 10-10a2.1 2.1 0 0 1 3 3l-10 10z" />
        <path d="M13.5 7.5l3 3" />
    {:else if name === 'map'}
        <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
        <path d="M9 4.5v13M15 6.5v13" />
    {:else if name === 'plus'}
        <path d="M12 5.5v13M5.5 12h13" />
    {/if}
</svg>

<script lang="ts">
    export let name: 'crosshair' | 'pointer' | 'weather' | 'plus' | 'pin' | 'pen' | 'map';
    export let size = 20;
</script>

<style>
    .icon { display: block; flex-shrink: 0; }
</style>
