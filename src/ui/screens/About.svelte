        <div data-spotlog class="about">
            <div data-spotlog class="card beta-card">
                <b data-spotlog class="h3">{@html rich(W.betaTitle)}</b>
                <p data-spotlog class="p muted">{@html rich(W.betaText)}</p>
                <div data-spotlog class="btns">
                    <button data-spotlog class="btn ghost" on:click={ () => dispatch('download') }>{ W.download }</button>
                    <label data-spotlog class="btn ghost">{ W.upload }<input data-spotlog type="file" accept=".json,application/json" on:change={ e => dispatch('upload', e) } hidden /></label>
                </div>
                {#if W.uploadHint}<small data-spotlog class="muted">{ W.uploadHint }</small>{/if}
            </div>
            <div data-spotlog class="card">
                <b data-spotlog class="h3">{@html rich(W.aboutTitle)}</b>
                <p data-spotlog class="p">{@html rich(W.aboutText)}</p>
            </div>
            <div data-spotlog class="card steps">
                <b data-spotlog class="h3">{@html rich(W.howTitle)}</b>
                {#each [1, 2, 3, 4] as n}
                    <div data-spotlog class="step"><span data-spotlog class="n">{ n }</span><span data-spotlog class="grow"><b data-spotlog>{@html rich(W['step' + n + 'Title'])}</b><small data-spotlog>{@html rich(W['step' + n + 'Text'])}</small></span></div>
                {/each}
            </div>
            <div data-spotlog class="card">
                <b data-spotlog class="h3">{@html rich(W.goodTitle)}</b>
                {#each [1, 2, 3] as n}{#if W['good' + n]}<p data-spotlog class="p muted">{@html rich(W['good' + n])}</p>{/if}{/each}
                <div data-spotlog class="row data-links">
                    <button data-spotlog class="link danger" on:click={ () => dispatch('clear') }>{ deleteArmed ? W.deleteAllArmed : W.deleteAll }</button>
                </div>
            </div>
            <small data-spotlog class="muted credits">{ W.tideCredits }</small>
            <div data-spotlog class="sig">
                <PixelStar size={ 14 } />
                <small data-spotlog class="ver">{ fill(W.version, { v: version }) }</small>
                <a data-spotlog class="coffee" href={ feedbackUrl } target="_blank" rel="noopener noreferrer">{ W.feedback }</a>
            </div>
        </div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { words, rich, fill } from '../../lib/copy';
    import PixelStar from '../PixelStar.svelte';
    export let version: string;
    export let feedbackUrl: string;
    export let deleteArmed = false;
    const dispatch = createEventDispatcher<{ download: void; upload: Event; clear: void }>();
    $: W = $words;
</script>
