<!--
    "It felt like" ruler. The whole ruler moves under a fixed orange marker (like the iOS timer / alarm wheels):
    drag it with a mouse or a finger, flick it, scroll it with a trackpad, tap a tick, or use the arrow keys.
    It is slightly magnetic: while dragging, each tick pulls the ruler towards it, and it always settles on a whole value.
-->
<div
    class="felt"
    class:dragging
    bind:clientWidth={ width }
    role="slider"
    tabindex="0"
    aria-label="It felt like"
    aria-valuemin={ min }
    aria-valuemax={ max }
    aria-valuenow={ value }
    aria-valuetext={ value === null ? 'not set' : `${value} ${unit}` }
    on:pointerdown={ down }
    on:pointermove={ move }
    on:pointerup={ up }
    on:pointercancel={ up }
    on:wheel|nonpassive={ wheel }
    on:keydown={ key }
>
    <div class="strip" class:anim={ animating } style="transform: translateX({ offset }px)">
        {#each ticks as t, i}
            <i class="tk" class:major={ i % 5 === 0 } class:fc={ forecastTick === t } style="left: { i * PX }px"></i>
            {#if i % 5 === 0}
                <small class="lb" class:fc={ forecastTick === t } style="left: { i * PX }px">{ t }</small>
            {/if}
        {/each}
    </div>
    <span class="marker" class:unset={ value === null }><span class="knob"></span></span>
</div>

<script lang="ts">
    import { onDestroy } from 'svelte';

    export let value: number | null = null;
    export let min = 0;
    export let max = 20;
    export let step = 1;
    export let forecast: number | null = null;
    export let unit = 'm/s';

    /** pixels between two ticks */
    const PX = 16;
    /** 0 = no pull, 1 = hard steps. Gentle pull so dragging still feels continuous */
    const MAGNET = 0.45;

    let width = 0;
    let dragging = false;
    let animating = false;
    let moved = false;
    let startX = 0;
    let startPos = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // steps per ms
    let raw: number | null = null; // position in steps while dragging (not snapped)
    let wheelAcc = 0;
    let animTimer: ReturnType<typeof setTimeout> | undefined;

    $: count = Math.floor((max - min) / step) + 1;
    $: ticks = Array.from({ length: count }, (_, i) => +(min + i * step).toFixed(3));
    $: forecastTick = forecast === null ? null : clampV(Math.round((forecast - min) / step) * step + min);
    $: restPos = toPos(value ?? forecastTick ?? min + Math.round(count / 2) * step);
    $: shown = raw === null ? restPos : raw + (Math.round(raw) - raw) * MAGNET;
    $: offset = width / 2 - shown * PX;

    function clampV(v: number) {
        return Math.max(min, Math.min(max, v));
    }
    function toPos(v: number) {
        return (clampV(v) - min) / step;
    }
    function fromPos(p: number) {
        return +(min + Math.max(0, Math.min(count - 1, Math.round(p))) * step).toFixed(3);
    }
    function tickHaptic() {
        try {
            navigator.vibrate?.(4);
        } catch {
            /* no haptics here */
        }
    }
    function set(v: number, animate = true) {
        const nv = fromPos(toPos(v));
        if (animate) settleAnim();
        if (nv !== value) {
            value = nv;
            tickHaptic();
        }
    }
    function settleAnim() {
        animating = true;
        clearTimeout(animTimer);
        animTimer = setTimeout(() => (animating = false), 420);
    }

    function down(e: PointerEvent) {
        if (e.button !== undefined && e.button > 0) return;
        dragging = true;
        moved = false;
        animating = false;
        startX = lastX = e.clientX;
        lastT = e.timeStamp;
        velocity = 0;
        startPos = restPos;
        raw = null;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    function move(e: PointerEvent) {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) < 4) return;
        moved = true;
        e.preventDefault();
        const p = Math.max(-0.4, Math.min(count - 0.6, startPos - dx / PX));
        raw = p;
        const dt = Math.max(1, e.timeStamp - lastT);
        velocity = 0.7 * velocity + 0.3 * (-(e.clientX - lastX) / PX / dt);
        lastX = e.clientX;
        lastT = e.timeStamp;
        const v = fromPos(p);
        if (v !== value) {
            value = v;
            tickHaptic();
        }
    }
    function up(e: PointerEvent) {
        if (!dragging) return;
        dragging = false;
        if (!moved) {
            // a tap: jump to the tapped tick
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const p = restPos + (e.clientX - r.left - width / 2) / PX;
            raw = null;
            set(fromPos(p));
            return;
        }
        // flick: carry on a little in the direction of travel, then settle on a whole tick.
        // If the finger/mouse rested before letting go, there is no flick.
        const v = e.timeStamp - lastT > 80 ? 0 : velocity;
        const p = (raw ?? restPos) + Math.max(-4, Math.min(4, v * 140));
        raw = null;
        set(fromPos(p));
        settleAnim();
    }
    function wheel(e: WheelEvent) {
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!d) return;
        e.preventDefault();
        wheelAcc += d;
        const stepPx = e.deltaMode === 1 ? 1 : 24;
        while (Math.abs(wheelAcc) >= stepPx) {
            const dir = Math.sign(wheelAcc);
            wheelAcc -= dir * stepPx;
            set((value ?? forecastTick ?? min) + dir * step);
        }
    }
    function key(e: KeyboardEvent) {
        const base = value ?? forecastTick ?? min;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(base + step); e.preventDefault(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(base - step); e.preventDefault(); }
        if (e.key === 'Home') { set(min); e.preventDefault(); }
        if (e.key === 'End') { set(max); e.preventDefault(); }
    }
    onDestroy(() => clearTimeout(animTimer));
</script>

<style lang="less">
    .felt { position: relative; height: 72px; overflow: hidden; touch-action: pan-y; cursor: grab; outline: none; user-select: none; -webkit-user-select: none;
        mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
        -webkit-mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); }
    .felt.dragging { cursor: grabbing; }
    .felt:focus-visible { box-shadow: inset 0 0 0 2px #d49500; border-radius: 10px; mask-image: none; -webkit-mask-image: none; }
    .strip { position: absolute; left: 0; top: 0; bottom: 0; width: 0; will-change: transform; }
    .strip.anim { transition: transform 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.18); }
    .tk { position: absolute; bottom: 24px; width: 2px; height: 12px; margin-left: -1px; border-radius: 1px; background: #6b6b6b; }
    .tk.major { height: 20px; background: #9a9a9a; }
    .tk.fc { height: 30px; background: #f8f8f8; }
    .lb { position: absolute; bottom: 4px; transform: translateX(-50%); font-size: 11px; color: #b0b0b0; font-variant-numeric: tabular-nums; }
    .lb.fc { color: #f8f8f8; font-weight: 600; }
    .marker { position: absolute; left: 50%; bottom: 20px; width: 4px; height: 42px; margin-left: -2px; border-radius: 2px; background: #d49500; pointer-events: none; }
    .marker.unset { opacity: 0.45; }
    .knob { position: absolute; left: 50%; top: -8px; width: 14px; height: 14px; margin-left: -7px; border-radius: 7px; background: #d49500; box-shadow: 0 0 0 4px rgba(212, 149, 0, 0.25); }
    @media (prefers-reduced-motion: reduce) { .strip.anim { transition: none; } }
</style>
