<div class="set">
    <div class="grp">
        <span class="lbl">{ $words.setWind }</span>
        <div class="seg">
            {#each WIND_UNITS as w}<button type="button" class:on={ settings.wind === w.id } on:click={ () => set({ wind: w.id }) }>{ w.label }</button>{/each}
        </div>
    </div>
    <div class="two">
        <div class="grp">
            <span class="lbl">{ $words.setWaves }</span>
            <div class="seg">
                {#each HEIGHT_UNITS as h}<button type="button" class:on={ settings.height === h.id } on:click={ () => set({ height: h.id }) }>{ h.label }</button>{/each}
            </div>
        </div>
        <div class="grp">
            <span class="lbl">{ $words.setTemp }</span>
            <div class="seg">
                {#each TEMP_UNITS as t}<button type="button" class:on={ settings.temp === t.id } on:click={ () => set({ temp: t.id }) }>{ t.label }</button>{/each}
            </div>
        </div>
    </div>

    <div class="grp">
        <span class="lbl">{ $words.setSaved }</span>
        <div class="chips">
            {#each [$words.fcWind, $words.fcGusts, $words.setDirection] as a}<span class="chip fixed">{ a }</span>{/each}
            {#each LAYERS as l}
                <button type="button" class="chip" class:on={ settings.layers.includes(l.id) } aria-pressed={ settings.layers.includes(l.id) } on:click={ () => toggleLayer(l.id) }>{ $words[l.key] || l.label }</button>
            {/each}
        </div>
    </div>
    <button type="button" class="toggle" aria-pressed={ settings.allModels } on:click={ () => set({ allModels: !settings.allModels }) }>
        <span class="grow"><b>{ $words.setAll }</b><small>{@html rich($words.setAllSub)}</small></span>
        <span class="sw" class:on={ settings.allModels }><i></i></span>
    </button>
    {#if !settings.allModels}
        <div class="grp">
            <span class="lbl">{ $words.setModels }</span>
            <div class="chips">
                {#each SNAPSHOT_MODELS as m}
                    <button type="button" class="chip" class:on={ settings.models.includes(m) } aria-pressed={ settings.models.includes(m) } on:click={ () => toggleModel(m) }>{ modelLabel(m) }</button>
                {/each}
            </div>
            <small class="hint">{ $words.setRegional }</small>
        </div>
    {/if}
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Settings } from '../lib/types';
    import { WIND_UNITS, HEIGHT_UNITS, TEMP_UNITS } from '../lib/units';
    import { SNAPSHOT_MODELS } from '../lib/forecast';
    import { words, rich } from '../lib/copy';
    import { modelLabel } from '../lib/wind';

    export let settings: Settings;
    const dispatch = createEventDispatcher();

    const LAYERS = [
        { id: 'temp', label: 'Temperature', key: 'layerTemp' },
        { id: 'waves', label: 'Waves', key: 'layerWaves' },
        { id: 'swell1', label: 'Swell 1', key: 'layerSwell' },
        { id: 'wavesPeriod', label: 'Wave period', key: 'layerPeriod' },
        { id: 'wavesPower', label: 'Wave power', key: 'layerPower' },
    ];

    function set(patch: Partial<Settings>) {
        settings = { ...settings, ...patch };
        dispatch('change', settings);
    }
    function toggleModel(m: string) {
        const has = settings.models.includes(m);
        if (has && settings.models.length === 1) return; // keep at least one
        set({ models: has ? settings.models.filter(x => x !== m) : [...settings.models, m] });
    }
    function toggleLayer(id: string) {
        set({ layers: settings.layers.includes(id) ? settings.layers.filter(x => x !== id) : [...settings.layers, id] });
    }
</script>

<style lang="less">
    .set { display: flex; flex-direction: column; gap: 14px; padding-top: 12px; border-top: 1px solid var(--sl-uLine, #4d4d4d); }
    .grp { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lbl { font-size: 12px; color: var(--sl-uSub, #b0b0b0); }
    .seg { display: flex; gap: 2px; padding: 3px; border-radius: var(--sl-radiusButton, 12px); background: var(--sl-uGround, #2e2e2e);
        button { flex: 1; height: 32px; border: 0; border-radius: var(--sl-radiusSmall, 9px); background: transparent; color: var(--sl-tabText, #d0d0d0); font: inherit; font-size: 13px; cursor: pointer; }
        button.on { background: var(--sl-selBg, #f8f8f8); color: var(--sl-selText, #1c1c1c); font-weight: 600; } }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { height: 30px; padding: 0 12px; border-radius: 15px; border: 1px solid var(--sl-chipLine, #5a5a5a); background: transparent; color: var(--sl-chipText, #f8f8f8); font: inherit; font-size: 12px; display: inline-flex; align-items: center; cursor: pointer; box-sizing: border-box;
        &.on { background: var(--sl-chipOnBg, #f8f8f8); color: var(--sl-chipOnText, #1c1c1c); border-color: var(--sl-chipOnBg, #f8f8f8); }
        &.fixed { background: var(--sl-uLine, #4d4d4d); border-color: var(--sl-uLine, #4d4d4d); cursor: default; }
    }
    .hint { color: var(--sl-uQuiet, #7a7a7a); font-size: 11px; line-height: 1.4; }
    .toggle { display: flex; align-items: center; gap: 12px; border: 0; background: none; padding: 0; color: var(--sl-uText, #f8f8f8); font: inherit; text-align: left; cursor: pointer;
        small { display: block; color: var(--sl-uSub, #b0b0b0); font-size: 12px; margin-top: 2px; } }
    .grow { flex: 1; }
    .sw { width: 40px; height: 24px; border-radius: 12px; background: var(--sl-switchOff, #5a5a5a); position: relative; flex-shrink: 0; transition: background 0.15s;
        i { position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: var(--sl-switchKnob, #f8f8f8); transition: transform 0.18s; }
        &.on { background: var(--sl-switch, #d49500); i { transform: translateX(16px); } } }
</style>
