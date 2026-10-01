<div class="tw" bind:this={ rootEl } bind:clientWidth={ fw } style="--fw: { fw }px">
    <button class="field-btn" type="button" aria-expanded={ open } on:click={ toggle }>
        { value ? fmtClock(value) : placeholder }
    </button>
    {#if open}
        <div class="tw-pop" class:below class:end={ align === 'end' } role="dialog" aria-label="Choose time">
            <div class="wheels" class:three={ h12 }>
                <div class="band"></div>
                <div class="col" bind:this={ hEl } on:scroll={ () => scrolled('h') } aria-label="Hour">
                    {#each hours as h, i}<button type="button" class="it" class:sel={ i === hi } on:click={ () => jump('h', i) }>{ h12 ? h : String(h).padStart(2, '0') }</button>{/each}
                </div>
                <div class="col" bind:this={ mEl } on:scroll={ () => scrolled('m') } aria-label="Minutes">
                    {#each minutes as m, i}<button type="button" class="it" class:sel={ i === mi } on:click={ () => jump('m', i) }>{ String(m).padStart(2, '0') }</button>{/each}
                </div>
                {#if h12}
                    <div class="col" bind:this={ aEl } on:scroll={ () => scrolled('a') } aria-label="AM or PM">
                        {#each ['AM', 'PM'] as a, i}<button type="button" class="it" class:sel={ i === ai } on:click={ () => jump('a', i) }>{ a }</button>{/each}
                    </div>
                {/if}
            </div>
            <div class="tw-actions">
                {#if value}<button type="button" class="clear" on:click={ clear }>{ $words.wheelClear }</button>{/if}
                <button type="button" class="done" on:click={ () => (open = false) }>{ $words.wheelDone }</button>
            </div>
        </div>
    {/if}
</div>

<script lang="ts">
    import { tick, onDestroy } from 'svelte';
    import { uses12h, fmtClock } from '../lib/units';
    import { haptic } from '../lib/haptic';
    import { words } from '../lib/copy';

    export let value = '';
    export let placeholder = 'Set time';
    /** where the picker sits: centred over the field, or lined up with its right edge (last field in a row) */
    export let align: 'center' | 'end' = 'center';
    let fw = 0;

    const ITEM = 34;
    let rootEl: HTMLDivElement;
    let below = false;
    /** open under the field when there isn't room above it inside the scrolling panel */
    function roomAbove(): number {
        let el: HTMLElement | null = rootEl?.parentElement || null;
        while (el && el !== document.body) {
            const o = getComputedStyle(el).overflowY;
            if (o === 'auto' || o === 'scroll') break;
            el = el.parentElement;
        }
        const top = el && el !== document.body ? el.getBoundingClientRect().top : 0;
        return rootEl.getBoundingClientRect().top - top;
    }
    // close when clicking/tapping anywhere else, or on Escape
    const outside = (e: Event) => { if (open && rootEl && !rootEl.contains(e.target as Node)) open = false; };
    const esc = (e: KeyboardEvent) => { if (open && e.key === 'Escape') open = false; };
    $: if (typeof window !== 'undefined') {
        if (open) { window.addEventListener('pointerdown', outside, true); window.addEventListener('keydown', esc); }
        else { window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', esc); }
    }
    onDestroy(() => { window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', esc); });
    const h12 = uses12h();
    const hours = h12 ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    let open = false;
    let hEl: HTMLDivElement;
    let mEl: HTMLDivElement;
    let aEl: HTMLDivElement;
    let hi = 0;
    let mi = 0;
    let ai = 0;
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};

    function fromValue() {
        let h: number;
        let m: number;
        if (value) {
            [h, m] = value.split(':').map(Number);
        } else {
            const d = new Date();
            h = d.getHours();
            m = Math.round(d.getMinutes() / 5) * 5 % 60;
        }
        mi = Math.round(m / 5) % 12;
        if (h12) {
            ai = h >= 12 ? 1 : 0;
            hi = h % 12;
        } else {
            hi = h;
        }
    }
    function commit() {
        const h = h12 ? (hi % 12) + (ai === 1 ? 12 : 0) : hi;
        value = `${String(h).padStart(2, '0')}:${String(minutes[mi]).padStart(2, '0')}`;
    }
    async function toggle() {
        if (!open) below = roomAbove() < 190;
        open = !open;
        if (!open) return;
        fromValue();
        commit();
        await tick();
        hEl?.scrollTo({ top: hi * ITEM });
        mEl?.scrollTo({ top: mi * ITEM });
        aEl?.scrollTo({ top: ai * ITEM });
    }
    /** while the wheel turns: the number under the band lights up, with a tick at each step */
    function scrolled(col: 'h' | 'm' | 'a') {
        const el = col === 'h' ? hEl : col === 'm' ? mEl : aEl;
        if (el) {
            const i = Math.round(el.scrollTop / ITEM);
            if (col === 'h' && i !== hi && i < hours.length) { hi = i; haptic(); }
            if (col === 'm' && i !== mi && i < minutes.length) { mi = i; haptic(); }
            if (col === 'a' && i !== ai && i < 2) { ai = i; haptic(); }
        }
        settle(col);
    }
    function settle(col: 'h' | 'm' | 'a') {
        clearTimeout(timers[col]);
        timers[col] = setTimeout(() => {
            const el = col === 'h' ? hEl : col === 'm' ? mEl : aEl;
            if (!el) return;
            const i = Math.round(el.scrollTop / ITEM);
            if (col === 'h') hi = Math.min(i, hours.length - 1);
            if (col === 'm') mi = Math.min(i, minutes.length - 1);
            if (col === 'a') ai = Math.min(i, 1);
            commit();
        }, 90);
    }
    function jump(col: 'h' | 'm' | 'a', i: number) {
        const el = col === 'h' ? hEl : col === 'm' ? mEl : aEl;
        el?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
    }
    function clear() {
        value = '';
        open = false;
    }
</script>

<style lang="less">
    .tw { position: relative; flex: 1; min-width: 0; }
    .field-btn { width: 100%; height: 44px; border-radius: var(--sl-radiusButton, 12px); border: 1px solid var(--sl-inputLine, #5a5a5a); background: var(--sl-inputBg, #3c3c3c); color: var(--sl-inputText, #f8f8f8); font: inherit; font-size: 15px; font-variant-numeric: tabular-nums; cursor: pointer; }
    .field-btn[aria-expanded='true'] { border-color: var(--sl-accent, #d49500); }
    .tw-pop { position: absolute; z-index: 30; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); width: max(100%, 196px); box-sizing: border-box;
        padding: 8px; border-radius: 14px; background: var(--sl-wheelBg, #3c3c3c); border: 1px solid var(--sl-wheelLine, #5a5a5a); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
        display: flex; flex-direction: column; gap: 6px; animation: pop 0.16s ease-out; }
    .tw-pop.below { bottom: auto; top: calc(100% + 10px); }
    .tw-pop.below::after { bottom: auto; top: -7px; transform: rotate(225deg); }
    .tw-pop::after { content: ''; position: absolute; left: 50%; bottom: -7px; width: 12px; height: 12px; margin-left: -6px; background: var(--sl-wheelBg, #3c3c3c); border-right: 1px solid var(--sl-wheelLine, #5a5a5a); border-bottom: 1px solid var(--sl-wheelLine, #5a5a5a); transform: rotate(45deg); }
    .tw-pop.end { left: auto; right: 0; transform: none; animation-name: popEnd; }
    .tw-pop.end::after { left: auto; right: calc(var(--fw, 100px) / 2 - 6px); margin-left: 0; }
    @keyframes popEnd { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }
    @keyframes pop { from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.97); } to { opacity: 1; transform: translateX(-50%); } }
    .wheels { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 2px; height: 102px; }
    .wheels.three { grid-template-columns: 1fr 1fr 1fr; }
    .band { position: absolute; left: 0; right: 0; top: 34px; height: 34px; border-radius: 9px; background: rgba(248, 248, 248, 0.1); pointer-events: none; }
    .col { overflow-y: scroll; scroll-snap-type: y mandatory; padding: 34px 0; scrollbar-width: none; overscroll-behavior: contain;
        mask-image: linear-gradient(transparent, #000 35%, #000 65%, transparent); -webkit-mask-image: linear-gradient(transparent, #000 35%, #000 65%, transparent); }
    .col::-webkit-scrollbar { display: none; }
    .it { display: block; width: 100%; height: 34px; scroll-snap-align: center; border: 0; background: none; color: var(--sl-wheelQuiet, #b0b0b0); font: inherit; font-size: 17px; font-variant-numeric: tabular-nums; cursor: pointer; }
    .it.sel { color: var(--sl-wheelText, #f8f8f8); font-weight: 600; }
    .tw-actions { display: flex; justify-content: flex-end; gap: 6px; }
    .done, .clear { height: 30px; padding: 0 12px; border-radius: 9px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .done { border: 0; background: var(--sl-primary-bg, #d49500); color: var(--sl-primary-text, #ffffff); }
    .clear { border: 1px solid var(--sl-wheelLine, #5a5a5a); background: transparent; color: var(--sl-wheelText, #f8f8f8); }
    @media (prefers-reduced-motion: reduce) { .tw-pop { animation: none; } }
</style>
