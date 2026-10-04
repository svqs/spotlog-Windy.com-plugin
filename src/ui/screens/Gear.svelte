
        <div data-spotlog class="card">
            <b data-spotlog>{ W.gearAddTitle }</b>
            <small data-spotlog class="muted">{ W.gearAddSub }</small>
            <div data-spotlog class="seg">
                {#each GEAR_SPORTS as sp}<button data-spotlog class:on={ gearSport === sp } on:click={ () => { gearSport = sp; gearKind = GEAR_BY_SPORT[sp][0].kind; } }>{ sportLbl(sp) }</button>{/each}
            </div>
            <div data-spotlog class="chips">
                {#each GEAR_BY_SPORT[gearSport] as k}<button data-spotlog class="chip" class:on={ gearKind === k.kind } on:click={ () => (gearKind = k.kind) }>{ gearLbl(k.kind) }</button>{/each}
            </div>
            <div data-spotlog class="row">
                <input data-spotlog bind:value={ gearName } placeholder={ gearHint(gearSport, gearKind) } on:keydown={ e => e.key === 'Enter' && add() } />
                <button data-spotlog class="btn primary small" disabled={ !gearName.trim() } on:click={ add }>{ W.gearAddBtn }</button>
            </div>
        </div>
        {#if count === 0}
            <div data-spotlog class="empty">{@html rich(W.gearEmpty)}</div>
        {:else}
            {#each groups as grp (grp.sport)}
                <div data-spotlog class="section">
                    <div data-spotlog class="row"><b data-spotlog class="grow">{ sportLbl(grp.sport) }</b><small data-spotlog>{ fill(W.gearSaved, { n: grp.items.length }) }</small></div>
                    <div data-spotlog class="list">
                        {#each grp.items as g (g.id)}
                            <div data-spotlog class="item static">
                                <span data-spotlog class="kind">{ gearLbl(g.kind) }</span>
                                <span data-spotlog class="grow"><span data-spotlog>{ g.name }</span><small data-spotlog>{ fill(W.gearUsed, { n: gearUse(g.id) }) }</small></span>
                                <button data-spotlog class="link danger" on:click={ () => dispatch('remove', g.id) }>{ W.gearRemove }</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        {/if}

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { words, rich, fill } from '../../lib/copy';
    import { GEAR_SPORTS, GEAR_BY_SPORT } from '../../lib/wind';
    import type { Gear } from '../../lib/types';
    export let groups: { sport: string; items: Gear[] }[];
    export let count: number;
    export let gearUse: (id: string) => number;
    let gearSport = 'Windsurf';
    let gearKind = 'Board';
    let gearName = '';
    const dispatch = createEventDispatcher<{ add: { name: string; kind: string; sport: string }; remove: string }>();
    $: W = $words;
    $: sportLbl = (sport: string) => W['sport' + sport] || sport;
    $: gearLbl = (kind: string) => W['gearKind' + kind] || kind;
    $: gearHint = (sport: string, kind: string) => W[GEAR_BY_SPORT[sport]?.find(item => item.kind === kind)?.hintKey || ''] || W.nameHint;
    function add() {
        if (!gearName.trim()) {return;}
        dispatch('add', { name: gearName.trim(), kind: gearKind, sport: gearSport });
        gearName = '';
    }
</script>
