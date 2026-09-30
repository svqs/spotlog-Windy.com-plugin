<div class="sw">
    <button class="del" type="button" tabindex={ revealed ? 0 : -1 } on:click={ () => { revealed = false; dispatch('delete'); } }>Delete</button>
    <div
        class="front"
        class:anim={ !dragging }
        style="transform: translateX({ dx }px)"
        role="button"
        tabindex="0"
        on:pointerdown={ down }
        on:pointermove={ move }
        on:pointerup={ up }
        on:pointercancel={ cancel }
        on:keydown={ e => (e.key === 'Enter' || e.key === ' ') && dispatch('open') }
    >
        <slot />
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    const OPEN = -88;
    let dx = 0;
    let startX = 0;
    let startDx = 0;
    let dragging = false;
    let moved = false;
    let revealed = false;

    function down(e: PointerEvent) {
        dragging = true;
        moved = false;
        startX = e.clientX;
        startDx = dx;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    function move(e: PointerEvent) {
        if (!dragging) return;
        const d = e.clientX - startX;
        if (Math.abs(d) > 6) moved = true;
        dx = Math.max(OPEN - 20, Math.min(0, startDx + d));
    }
    function up() {
        if (!dragging) return;
        dragging = false;
        if (!moved) {
            if (revealed) { dx = 0; revealed = false; } else dispatch('open');
            return;
        }
        revealed = dx < OPEN / 2;
        dx = revealed ? OPEN : 0;
    }
    function cancel() {
        dragging = false;
        dx = revealed ? OPEN : 0;
    }
</script>

<style lang="less">
    .sw { position: relative; overflow: hidden; border-bottom: 1px solid #4d4d4d; }
    .del { position: absolute; right: 0; top: 0; bottom: 0; width: 88px; border: 0; background: #c9474f; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    .front { position: relative; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 6px 2px; background: #2e2e2e; touch-action: pan-y; cursor: pointer; user-select: none; }
    .front.anim { transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.1); }
    .front:focus-visible { outline: 2px solid #d49500; outline-offset: -2px; }
</style>
