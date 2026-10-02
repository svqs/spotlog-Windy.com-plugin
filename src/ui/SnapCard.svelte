<div class="snap">
    <div class="head">
        <span class="col"><b>{ title }</b>{#if sub}<small>{ sub }</small>{/if}</span>
        {#if model}<span class="model">{ model }</span>{/if}
    </div>
    {#if loading}
        <div class="loading">{ $words.fcLoading }</div>
    {:else if !wind}
        <div class="loading">{ empty || $words.fcEmpty }</div>
    {:else}
        <div class="cells">
            <div class="cell" style="background: { windColor(wind.wind) }"><span>{ $words.fcWind }</span><b class="px">{ fmtWind0(wind.wind, u.wind) }</b><span>{ windLabel(u.wind) }</span></div>
            <div class="cell" style="background: { windColor(wind.gust) }"><span>{ $words.fcGusts }</span><b class="px">{ fmtWind0(wind.gust, u.wind) }</b><span>{ windLabel(u.wind) }</span></div>
            <div class="cell light"><span>{ $words.fcFrom }</span><b class="dirv"><span class="arrow" style="transform: rotate({ (wind.dir ?? 0) + 180 }deg)">↑</span></b><span>{ dirName(wind.dir) }</span></div>
            <div class="cell blue"><span>{ $words.fcWaves }</span><b class="px">{ fmtHeight(waves?.waves ?? null, u.height) }</b><span>{ u.height }</span></div>
        </div>
        {#if badge}
            <div class="badge-row"><span class="badge" style="background: { badgeBg }; color: { badgeFg }">{ badge }</span>{#if badgeNote}<small>{ badgeNote }</small>{/if}</div>
        {/if}
        {#if full}
            <div class="rows">
                <div><span>{ $words.fcTemp }</span><b>{ fmtTemp(wind.temp, u.temp) }</b></div>
                {#if waves}
                    <div><span>{ $words.fcSwell }</span><b>{ fmtHeight(waves.swell1, u.height, true) } · { waves.swell1Period === null ? '–' : Math.round(waves.swell1Period) + ' s' }</b></div>
                    <div><span>{ $words.fcPeriod }</span><b>{ waves.wavesPeriod === null ? '–' : Math.round(waves.wavesPeriod) + ' s' } · { waves.wavesPower === null ? '–' : waves.wavesPower.toFixed(1) + ' kW/m' }</b></div>
                {/if}
            </div>
            {#if models && models.length > 1}
                <div class="models-t">{ $words.fcModels }</div>
                <div class="models">
                    {#each models as m}
                        <div class:best={ best === m.model }><span>{ modelLabel(m.model) }</span><b>{ fmtWind(m.wind, u.wind) }</b></div>
                    {/each}
                </div>
            {/if}
        {/if}
        <button type="button" class="more" on:click={ () => (full = !full) }>{ full ? $words.fcLess : $words.fcMore } <span class="chev" class:up={ full }>↓</span></button>
    {/if}
</div>

<script lang="ts">
    import { windColor, dirName, modelLabel } from '../lib/wind';
    import { fmtWind, fmtWind0, fmtHeight, fmtTemp, windLabel } from '../lib/units';
    import { words } from '../lib/copy';
    import type { ModelValue, WaveValue, Settings } from '../lib/types';

    export let title = '';
    export let sub = '';
    export let model = '';
    export let wind: ModelValue | null = null;
    export let waves: WaveValue | null = null;
    export let models: ModelValue[] = [];
    export let best: string | null = null;
    export let loading = false;
    export let empty = '';
    export let full = false;
    export let badge = '';
    export let badgeNote = '';
    export let badgeBg = 'var(--sl-dirTile, #e9e8e3)';
    export let badgeFg = 'var(--sl-lightText, #1c1c1c)';
    export let u: Settings;
</script>

<style lang="less">
    .snap { background: var(--sl-lightBg, #f8f8f8); color: var(--sl-lightText, #1c1c1c); border-radius: var(--sl-radiusCard, 18px); overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3); }
    small { color: var(--sl-lightSub, #6b6b6b); font-size: 12px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 12px; }
    .col { display: flex; flex-direction: column; gap: 2px; min-width: 0; b { font-size: 15px; } }
    .model { padding: 4px 10px; border-radius: 6px; background: var(--sl-modelBg, #d49500); color: var(--sl-modelText, #ffffff); font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .loading { padding: 0 14px 16px; color: var(--sl-lightSub, #6b6b6b); }
    .cells { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 0 12px 12px; }
    .cell { display: flex; flex-direction: column; gap: 6px; padding: 10px 10px 8px; border-radius: 12px; color: var(--sl-windText, #1c1c1c); font-size: 11px; min-width: 0;
        &.light { background: var(--sl-dirTile, #e9e8e3); } &.blue { background: var(--sl-wavesTile, #dbe6f2); } }
    .px { font-family: 'Doto', ui-monospace, monospace; font-weight: 900; font-size: 26px; line-height: 1; }
    .dirv { height: 26px; display: flex; align-items: center; .arrow { display: inline-block; font-size: 20px; font-weight: 700; line-height: 1; } }
    .badge-row { display: flex; align-items: center; gap: 8px; padding: 0 14px 12px; flex-wrap: wrap; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .rows { padding: 0 14px 6px; > div { display: flex; justify-content: space-between; gap: 10px; height: 34px; align-items: center; border-top: 1px solid var(--sl-lightLine, #e5e5e5); span { color: var(--sl-lightSub, #6b6b6b); } } }
    .soon { color: var(--sl-lightSub, #6b6b6b); font-weight: 400; font-size: 12px; }
    .models-t { padding: 10px 14px 8px; border-top: 1px solid var(--sl-lightLine, #e5e5e5); font-size: 12px; color: var(--sl-lightSub, #6b6b6b); }
    .models { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 0 14px 12px;
        > div { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 0; border-radius: 10px; background: var(--sl-dirTile, #e9e8e3); font-size: 11px; b { font-size: 15px; } }
        > div.best { background: var(--sl-bestBg, #1c1c1c); color: var(--sl-bestText, #f8f8f8); } }
    .more { width: 100%; height: 42px; border: 0; border-top: 1px solid var(--sl-lightLine, #e5e5e5); background: transparent; color: var(--sl-lightText, #1c1c1c); font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
    .chev { display: inline-block; transition: transform 0.2s; &.up { transform: rotate(180deg); } }
</style>
