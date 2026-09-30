<div class="set">
    <div class="grp">
        <span class="lbl">Wind</span>
        <div class="seg">
            {#each WIND_UNITS as w}<button type="button" class:on={ settings.wind === w.id } on:click={ () => set({ wind: w.id }) }>{ w.label }</button>{/each}
        </div>
    </div>
    <div class="two">
        <div class="grp">
            <span class="lbl">Waves</span>
            <div class="seg">
                {#each HEIGHT_UNITS as h}<button type="button" class:on={ settings.height === h.id } on:click={ () => set({ height: h.id }) }>{ h.label }</button>{/each}
            </div>
        </div>
        <div class="grp">
            <span class="lbl">Temperature</span>
            <div class="seg">
                {#each TEMP_UNITS as t}<button type="button" class:on={ settings.temp === t.id } on:click={ () => set({ temp: t.id }) }>{ t.label }</button>{/each}
            </div>
        </div>
    </div>

    <div class="grp">
        <span class="lbl">Saved in every forecast</span>
        <div class="chips">
            {#each ['Wind', 'Gusts', 'Direction'] as a}<span class="chip fixed">{ a }</span>{/each}
            {#each LAYERS as l}
                <button type="button" class="chip" class:on={ settings.layers.includes(l.id) } aria-pressed={ settings.layers.includes(l.id) } on:click={ () => toggleLayer(l.id) }>{ l.label }</button>
            {/each}
            {#each ['Tides', 'Water temp'] as a}<span class="chip soon" title="Windy's plugin API doesn't give these yet">{ a } · soon</span>{/each}
        </div>
    </div>
    <button type="button" class="toggle" aria-pressed={ settings.allModels } on:click={ () => set({ allModels: !settings.allModels }) }>
        <span class="grow"><b>Save every model</b><small>ECMWF, GFS, ICON… so Spotlog can tell you which one to trust</small></span>
        <span class="sw" class:on={ settings.allModels }><i></i></span>
    </button>
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Settings } from '../lib/types';
    import { WIND_UNITS, HEIGHT_UNITS, TEMP_UNITS } from '../lib/units';

    export let settings: Settings;
    const dispatch = createEventDispatcher();

    const LAYERS = [
        { id: 'temp', label: 'Temperature' },
        { id: 'waves', label: 'Waves' },
        { id: 'swell1', label: 'Swell 1' },
        { id: 'wavesPeriod', label: 'Wave period' },
        { id: 'wavesPower', label: 'Wave power' },
    ];

    function set(patch: Partial<Settings>) {
        settings = { ...settings, ...patch };
        dispatch('change', settings);
    }
    function toggleLayer(id: string) {
        set({ layers: settings.layers.includes(id) ? settings.layers.filter(x => x !== id) : [...settings.layers, id] });
    }
</script>

<style lang="less">
    .set { display: flex; flex-direction: column; gap: 14px; padding-top: 12px; border-top: 1px solid #4d4d4d; }
    .grp { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lbl { font-size: 12px; color: #b0b0b0; }
    .seg { display: flex; gap: 2px; padding: 3px; border-radius: 11px; background: #2e2e2e;
        button { flex: 1; height: 32px; border: 0; border-radius: 8px; background: transparent; color: #d0d0d0; font: inherit; font-size: 13px; cursor: pointer; }
        button.on { background: #f8f8f8; color: #1c1c1c; font-weight: 600; } }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { height: 30px; padding: 0 12px; border-radius: 15px; border: 1px solid #5a5a5a; background: transparent; color: #f8f8f8; font: inherit; font-size: 12px; display: inline-flex; align-items: center; cursor: pointer; box-sizing: border-box;
        &.on { background: #f8f8f8; color: #1c1c1c; border-color: #f8f8f8; }
        &.fixed { background: #4d4d4d; border-color: #4d4d4d; cursor: default; }
        &.soon { border-style: dashed; color: #8a8a8a; cursor: default; } }
    .toggle { display: flex; align-items: center; gap: 12px; border: 0; background: none; padding: 0; color: #f8f8f8; font: inherit; text-align: left; cursor: pointer;
        small { display: block; color: #b0b0b0; font-size: 12px; margin-top: 2px; } }
    .grow { flex: 1; }
    .sw { width: 40px; height: 24px; border-radius: 12px; background: #5a5a5a; position: relative; flex-shrink: 0; transition: background 0.15s;
        i { position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: #f8f8f8; transition: transform 0.18s; }
        &.on { background: #d49500; i { transform: translateX(16px); } } }
</style>
