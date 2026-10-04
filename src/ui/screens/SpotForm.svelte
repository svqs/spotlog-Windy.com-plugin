{#if form}
<label data-spotlog class="field"><span data-spotlog class="lbl">{ W.formName }</span><input data-spotlog bind:value={ form.name } placeholder={ W.formNamePh } /></label>
    <div data-spotlog class="card row">
        <span data-spotlog class="ico"><i data-spotlog class="dot-s"></i></span>
        <span data-spotlog class="grow"><small data-spotlog>{ W.formLocation }</small><b data-spotlog>{ form.place || form.lat.toFixed(3) + ', ' + form.lon.toFixed(3) }</b></span>
        <small data-spotlog class="r">{ isMobile ? '' : W.formMove }</small>
    </div>

    <div data-spotlog class="field"><span data-spotlog class="lbl">{ W.formSport }</span>
        <div data-spotlog class="chips">
            {#each sportChoices(form.sports) as sp}
                <button data-spotlog class="chip" class:on={ form.sports.includes(sp) } on:click={ () => form && (form = { ...form, sports: toggle(form.sports, sp) }) }>{ sportLbl(sp) }</button>
            {/each}
            <button data-spotlog class="chip" class:on={ otherOpen } aria-expanded={ otherOpen } on:click={ () => dispatch('openOther') }>{ W.sportAddOther }</button>
        </div>
        {#if otherOpen}
            <div data-spotlog class="other-sport">
                <input data-spotlog bind:value={ otherName } maxlength="20" placeholder={ W.sportNameHint } aria-label={ W.sportNameHint } on:keydown={ e => e.key === 'Enter' && dispatch('addOther') } />
                <button data-spotlog class="btn primary small" disabled={ !otherName.trim() } on:click={ () => dispatch('addOther') }>{ W.sportAdd }</button>
            </div>
        {/if}
    </div>

    <div data-spotlog class="card">
        <div data-spotlog class="row"><b data-spotlog class="grow">{ W.formWindQ }</b></div>
        <div data-spotlog class="seg">
            <button data-spotlog class:on={ !form.windUnknown } on:click={ () => form && (form = { ...form, windUnknown: false }) }>{ W.formKnow }</button>
            <button data-spotlog class:on={ form.windUnknown } on:click={ () => form && (form = { ...form, windUnknown: true }) }>{ W.formDontKnow }</button>
        </div>
        {#if form.windUnknown}
            <p data-spotlog class="p muted">{@html rich(W.formUnknownText)}</p>
        {:else}
            <small data-spotlog class="muted">{ W.formWindFrom }</small>
            <div data-spotlog class="dirs">
                {#each DIRS as d, i}
                    <button data-spotlog class="dir" class:on={ form.dirs.includes(d) } aria-pressed={ form.dirs.includes(d) } on:click={ () => form && (form = { ...form, dirs: toggle(form.dirs, d) }) }>
                        <span data-spotlog class="arrow" style="transform: rotate({ i * 45 + 180 }deg)">▲</span>{ d }
                    </button>
                {/each}
            </div>
            <div data-spotlog class="row sep">
                <span data-spotlog class="grow"><small data-spotlog>{ W.formStrength }</small><b data-spotlog class="big2">{ form.dMin }–{ form.dMax } <small data-spotlog>{ windLabel(settings.wind) }</small></b></span>
                <div data-spotlog class="stepper"><small data-spotlog>{ W.formMin }</small>
                    <button data-spotlog class="round" aria-label={ W.lowerMinimum } on:click={ () => step('dMin', -1) }>−</button>
                    <button data-spotlog class="round" aria-label={ W.raiseMinimum } on:click={ () => step('dMin', 1) }>+</button>
                </div>
                <div data-spotlog class="stepper"><small data-spotlog>{ W.formMax }</small>
                    <button data-spotlog class="round" aria-label={ W.lowerMaximum } on:click={ () => step('dMax', -1) }>−</button>
                    <button data-spotlog class="round" aria-label={ W.raiseMaximum } on:click={ () => step('dMax', 1) }>+</button>
                </div>
            </div>
            <small data-spotlog class="muted">{ W.formGuessNote }</small>
        {/if}
    </div>

    <button data-spotlog class="btn primary wide" disabled={ !form.name.trim() } on:click={ () => dispatch('save') }>{ form.id ? W.formSaveEdit : W.formSaveNew }</button>
{/if}

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { words, rich } from '../../lib/copy';
    import { DIRS } from '../../lib/directions';
    import { windLabel } from '../../lib/units';
    import type { SpotForm } from '../forms';
    import type { Settings } from '../../lib/types';
    export let form: SpotForm | null;
    export let settings: Settings;
    export let isMobile: boolean;
    export let otherOpen: boolean;
    export let otherName: string;
    export let sportChoices: (first: string[], extra?: string | null) => string[];
    export let sportLbl: (sport: string) => string;
    const dispatch = createEventDispatcher<{ openOther: void; addOther: void; save: void; step: { range: 'dMin' | 'dMax'; delta: number } }>();
    $: W = $words;
    function toggle<T>(items: T[], value: T): T[] {return items.includes(value) ? items.filter(item => item !== value) : [...items, value];}
    function step(range: 'dMin' | 'dMax', delta: number) {dispatch('step', { range, delta });}
</script>
