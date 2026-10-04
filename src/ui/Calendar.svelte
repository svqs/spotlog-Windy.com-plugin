<div class="cal">
    <div class="head">
        <button type="button" class="nav" aria-label={ $words.previousMonth } on:click={ () => shift(-1) }>‹</button>
        <b>{ monthLabel }</b>
        <button type="button" class="nav" aria-label={ $words.nextMonth } on:click={ () => shift(1) }>›</button>
    </div>
    <div class="grid">
        {#each weekdays as w}<span class="wd">{ w }</span>{/each}
        {#each cells as c}
            {#if c}
                <button type="button" class="day" class:today={ c.today } class:sel={ c.key === selected } class:has={ c.items.length } on:click={ () => (selected = c.key) }>
                    <span>{ c.d }</span>
                    <span class="dots">{#each c.items.slice(0, 3) as s}<i style="background: { colors[s.rating - 1] }"></i>{/each}</span>
                </button>
            {:else}
                <span></span>
            {/if}
        {/each}
    </div>
    {#if selectedItems.length}
        <div class="picked">
            {#each selectedItems as s (s.id)}
                <button type="button" class="it" on:click={ () => dispatch('open', s) }>
                    <i class="r" style="background: { colors[s.rating - 1] }"></i>
                    <span class="grow">{ spotName(s) }</span>
                    <small>{ labels[s.rating - 1] } ›</small>
                </button>
            {/each}
        </div>
    {:else if selected}
        <small class="none">{ $words.calNone }</small>
    {/if}
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { words } from '../lib/copy';
    import type { Session } from '../lib/types';

    export let sessions: Session[] = [];
    export let colors: string[] = [];
    export let labels: string[] = [];
    export let spotName: (s: Session) => string = () => '';

    const dispatch = createEventDispatcher();
    const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    let month = new Date();
    month.setDate(1);
    let selected = '';

    // Start from the month of the most recent session
    $: if (sessions.length && !selected) {
        const last = new Date(Math.max(...sessions.map(s => s.date)));
        month = new Date(last.getFullYear(), last.getMonth(), 1);
    }

    const weekdays = Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }),
    );
    $: monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    $: byDay = sessions.reduce((acc: Record<string, Session[]>, s) => {
        const k = keyOf(new Date(s.date));
        (acc[k] = acc[k] || []).push(s);
        return acc;
    }, {});
    $: cells = (() => {
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const offset = (first.getDay() + 6) % 7; // Monday first
        const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const todayKey = keyOf(new Date());
        const out: ({ d: number; key: string; items: Session[]; today: boolean } | null)[] = Array(offset).fill(null);
        for (let d = 1; d <= days; d++) {
            const key = keyOf(new Date(month.getFullYear(), month.getMonth(), d));
            out.push({ d, key, items: byDay[key] || [], today: key === todayKey });
        }
        return out;
    })();
    $: selectedItems = selected ? byDay[selected] || [] : [];

    function shift(n: number) {
        month = new Date(month.getFullYear(), month.getMonth() + n, 1);
        selected = selected || ' ';
    }
</script>

<style lang="less">
    .cal { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: var(--sl-radiusCard, 18px); background: var(--sl-uCard, #3c3c3c); border: 1px solid var(--sl-uLine, #4d4d4d); }
    .head { display: flex; align-items: center; justify-content: space-between; text-transform: capitalize; }
    .nav { width: 34px; height: 34px; border-radius: 17px; border: 1px solid var(--sl-uOutline, #5a5a5a); background: transparent; color: var(--sl-uText, #f8f8f8); font-size: 18px; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
    .wd { text-align: center; font-size: 11px; color: var(--sl-uSub, #b0b0b0); padding-bottom: 2px; }
    .day { height: 42px; border: 0; border-radius: 10px; background: transparent; color: var(--sl-tabText, #d0d0d0); font: inherit; font-size: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; font-variant-numeric: tabular-nums; }
    .day.has { color: var(--sl-uText, #f8f8f8); font-weight: 600; }
    .day.today { box-shadow: inset 0 0 0 1px var(--sl-calToday, #d49500); }
    .day.sel { background: var(--sl-selBg, #f8f8f8); color: var(--sl-selText, #1c1c1c); }
    .dots { display: flex; gap: 2px; height: 6px; i { width: 6px; height: 6px; border-radius: 3px; display: block; } }
    .picked { display: flex; flex-direction: column; border-top: 1px solid var(--sl-uLine, #4d4d4d); }
    .it { display: flex; align-items: center; gap: 10px; height: 44px; border: 0; border-bottom: 1px solid var(--sl-uLine, #4d4d4d); background: none; color: var(--sl-uText, #f8f8f8); font: inherit; text-align: left; cursor: pointer; }
    .it:last-child { border-bottom: 0; }
    .r { width: 10px; height: 10px; border-radius: 5px; display: block; }
    .grow { flex: 1; }
    small { color: var(--sl-uSub, #b0b0b0); font-size: 12px; }
    .none { padding-top: 4px; }
</style>
