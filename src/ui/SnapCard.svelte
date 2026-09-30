<div class="snap">
    <div class="head">
        <span class="col"><b>{ title }</b>{#if sub}<small>{ sub }</small>{/if}</span>
        {#if model}<span class="model">{ model }</span>{/if}
    </div>
    {#if loading}
        <div class="loading">Loading the forecast…</div>
    {:else if !wind}
        <div class="loading">{ empty }</div>
    {:else}
        <div class="cells">
            <div class="cell" style="background: { windColor(wind.wind) }"><span>Wind</span><b class="px">{ fmtWind0(wind.wind, u.wind) }</b><span>{ windLabel(u.wind) }</span></div>
            <div class="cell" style="background: { windColor(wind.gust) }"><span>Gusts</span><b class="px">{ fmtWind0(wind.gust, u.wind) }</b><span>{ windLabel(u.wind) }</span></div>
            <div class="cell light"><span>From</span><b class="dirv"><span class="arrow" style="transform: rotate({ (wind.dir ?? 0) + 180 }deg)">↑</span></b><span>{ dirName(wind.dir) }</span></div>
            <div class="cell blue"><span>Waves</span><b class="px">{ fmtHeight(waves?.waves ?? null, u.height) }</b><span>{ u.height }</span></div>
        </div>
        {#if badge}
            <div class="badge-row"><span class="badge" style="background: { badgeBg }; color: { badgeFg }">{ badge }</span>{#if badgeNote}<small>{ badgeNote }</small>{/if}</div>
        {/if}
        {#if full}
            <div class="rows">
                <div><span>Temperature</span><b>{ fmtTemp(wind.temp, u.temp) }</b></div>
                {#if waves}
                    <div><span>Swell 1</span><b>{ fmtHeight(waves.swell1, u.height, true) } · { waves.swell1Period === null ? '–' : Math.round(waves.swell1Period) + ' s' }</b></div>
                    <div><span>Wave period · power</span><b>{ waves.wavesPeriod === null ? '–' : Math.round(waves.wavesPeriod) + ' s' } · { waves.wavesPower === null ? '–' : waves.wavesPower.toFixed(1) + ' kW/m' }</b></div>
                {/if}
                <div><span>Water temp · tide</span><b class="soon">not in Windy's API yet</b></div>
            </div>
            {#if models && models.length > 1}
                <div class="models-t">Wind at this time in every model</div>
                <div class="models">
                    {#each models as m}
                        <div class:best={ best === m.model }><span>{ modelLabel(m.model) }</span><b>{ fmtWind(m.wind, u.wind) }</b></div>
                    {/each}
                </div>
            {/if}
        {/if}
        <button type="button" class="more" on:click={ () => (full = !full) }>{ full ? 'Show less' : 'Full snapshot' } <span class="chev" class:up={ full }>↓</span></button>
    {/if}
</div>

<script lang="ts">
    import type { ModelValue, WaveValue, Settings } from '../lib/types';
    import { windColor, dirName, modelLabel } from '../lib/wind';
    import { fmtWind, fmtWind0, fmtHeight, fmtTemp, windLabel } from '../lib/units';

    export let title = '';
    export let sub = '';
    export let model = '';
    export let wind: ModelValue | null = null;
    export let waves: WaveValue | null = null;
    export let models: ModelValue[] = [];
    export let best: string | null = null;
    export let loading = false;
    export let empty = 'No forecast here';
    export let full = false;
    export let badge = '';
    export let badgeNote = '';
    export let badgeBg = '#e9e8e3';
    export let badgeFg = '#1c1c1c';
    export let u: Settings;
</script>

<style lang="less">
    .snap { background: #f8f8f8; color: #1c1c1c; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3); }
    small { color: #6b6b6b; font-size: 12px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 14px 12px; }
    .col { display: flex; flex-direction: column; gap: 2px; min-width: 0; b { font-size: 15px; } }
    .model { padding: 4px 10px; border-radius: 6px; background: #d49500; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .loading { padding: 0 14px 16px; color: #6b6b6b; }
    .cells { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 0 12px 12px; }
    .cell { display: flex; flex-direction: column; gap: 6px; padding: 10px 10px 8px; border-radius: 12px; color: #1c1c1c; font-size: 11px; min-width: 0;
        &.light { background: #e9e8e3; } &.blue { background: #dbe6f2; } }
    .px { font-family: 'Doto', ui-monospace, monospace; font-weight: 900; font-size: 26px; line-height: 1; }
    .dirv { height: 26px; display: flex; align-items: center; .arrow { display: inline-block; font-size: 20px; font-weight: 700; line-height: 1; } }
    .badge-row { display: flex; align-items: center; gap: 8px; padding: 0 14px 12px; flex-wrap: wrap; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .rows { padding: 0 14px 6px; > div { display: flex; justify-content: space-between; gap: 10px; height: 34px; align-items: center; border-top: 1px solid #e5e5e5; span { color: #6b6b6b; } } }
    .soon { color: #9b9b9b; font-weight: 400; font-size: 12px; }
    .models-t { padding: 10px 14px 8px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #6b6b6b; }
    .models { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 0 14px 12px;
        > div { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 0; border-radius: 10px; background: #e9e8e3; font-size: 11px; b { font-size: 15px; } }
        > div.best { background: #1c1c1c; color: #f8f8f8; } }
    .more { width: 100%; height: 42px; border: 0; border-top: 1px solid #e5e5e5; background: transparent; color: #1c1c1c; font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
    .chev { display: inline-block; transition: transform 0.2s; &.up { transform: rotate(180deg); } }
</style>
