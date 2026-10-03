<div class="plugin__mobile-header">
    { title }
</div>
<!-- the key handlers only keep your typing inside Spotlog (away from Windy's search); the swipe handlers keep scrolling inside the panel -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<section aria-label="Spotlog" class="plugin__content spotlog" class:m={ isMobile } class:bar={ barMode } class:gatebar={ barMode && !!gate } bind:this={ root } on:touchstart={ touchStart } on:touchmove={ touchMove } on:touchend={ fieldTouchEnd } on:keydown={ keepKeys } on:keyup={ keepKeys } on:keypress={ keepKeys }>

{#if barMode}
<!-- ================= PHONE: a compact bar in Windy's pane; pages open in a panel that rises over the map (like The Buoy's list) ================= -->
    <div class="mbar">
        <div class="mrow">
            <span class="brand"><span class="wordmark">SPOTLOG</span><PixelStar size={ 12 } /><span class="beta">{ W.betaTag }</span></span>
            {#if waitingForMap}
                <span class="mhint">{ pickFor === 'snap' ? W.hintSnap : pickFor === 'log' ? W.hintLog : W.hintSpot }</span>
                <button class="mlink" on:click={ () => { waitingForMap = false; openModal(); } }>{ W.cancel }</button>
            {:else if capturing}
                <span class="mhint">{ W.hintLoading }</span>
            {:else if gate}
                <span class="mhint">{ W.hintPremium }</span>
            {:else}
                <span class="grow-b"></span>
                <button class="units" aria-label="Units and saved data" on:click={ () => openUnits(true) }>{ unitsLabel } <span class="chev">▾</span></button>
            {/if}
        </div>
        {#if !gate}
            <div class="macts">
                <button class="mact" disabled={ capturing } on:click={ () => { startPick('snap'); } }><Icon name="weather" size={ 18 } /><span>{ W.actSaveForecast }</span></button>
                <button class="mact" on:click={ () => { startPick('spot'); } }><Icon name="pin" size={ 18 } /><span>{ W.actAddSpot }</span></button>
                <button class="mact" on:click={ () => { startPick('log'); } }><Icon name="pen" size={ 18 } /><span>{ W.actLogSession }</span></button>
            </div>
            <div class="mtabs">
                {#each [['spots', W.tabSpots], ['sessions', W.tabSessions], ['gear', W.tabGear], ['about', W.tabAbout]] as [k, label]}
                    <button class:on={ modalOpen && view === 'home' && tab === k } on:click={ () => toggleTab(asTab(k)) }>{ label }{#if k === 'spots'}<small class="cnt">{ data.spots.length }</small>{:else if k === 'sessions'}<small class="cnt">{ realSessions.length }</small>{/if}</button>
                {/each}
            </div>
        {:else}
            <button class="btn primary wide" on:click={ openModal }>{ gate === 'login' ? W.gateBarLogin : W.gateBarPremium }</button>
        {/if}
    </div>
{/if}
<div class="mwrap" class:on={ barMode } class:open={ modalOpen } class:unitspage={ barMode && unitsOpen } class:kb={ kbRoom }>
<div class="body" bind:this={ bodyEl } on:focusin={ fieldFocus } on:focusout={ fieldBlur }>

{#if gate}
<!-- ================= LOGIN / PREMIUM GATE ================= -->
    {#if barMode}<div class="topbar"><span class="grow"><b class="title"><Brand cap /></b></span><button class="mclose" aria-label="Close" on:click={ closeModal }>✕</button></div>{/if}
    <div class="card head">
        <div class="row"><span class="brand"><span class="wordmark">SPOTLOG</span><PixelStar size={ 15 } /></span></div>
        <p class="p">{@html rich(W.gateIntro)}</p>
    </div>
    <div class="card">
        {#if gate === 'login'}
            <b>{@html rich(W.gateLoginTitle)}</b>
            <p class="p muted">{@html rich(W.gateLoginText)}</p>
            <button class="btn primary wide" on:click={ () => bcast.emit('rqstOpen', 'login') }>{ W.gateLoginBtn }</button>
        {:else}
            <b>{@html rich(W.gatePremiumTitle)}</b>
            <p class="p muted">{@html rich(W.gatePremiumText, { user: wUser?.username || wUser?.email || 'a Windy user' })}</p>
            <button class="btn primary wide" on:click={ () => bcast.emit('rqstOpen', 'subscription') }>{ W.gatePremiumBtn }</button>
        {/if}
    </div>
{:else if welcome}
<!-- ================= WELCOME (once, for someone new) ================= -->
    <div class="welcome">
        {#if barMode}<div class="topbar"><span class="grow"></span><button class="mclose" aria-label="Close" on:click={ closeModal }>✕</button></div>{/if}
        <span class="brand"><span class="wordmark">SPOTLOG</span><PixelStar size={ 15 } /><span class="beta">{ W.betaTag }</span></span>
        <b class="h2">{@html rich(W.welcomeTitle)}</b>
        <p class="p">{@html rich(W.welcomeText)}</p>
        <button class="btn primary wide" on:click={ finishWelcome }>{ W.welcomeStart }</button>
        <button class="link" on:click={ () => { finishWelcome(); openHowItWorks(); } }>{ W.welcomeHow }</button>
        <label class="link">{ W.welcomeUpload }<input type="file" accept=".json,application/json" on:change={ e => { finishWelcome(); onUpload(e); } } hidden /></label>
    </div>
{:else}

<!-- ================= HEADER ================= -->
<!-- phones: units and saved data open as their own page in the panel -->
{#if barMode && unitsOpen}
    <div class="topbar upage">
        <button class="round" aria-label="Back" on:click={ unitsBack }>←</button>
        <span class="grow"><b class="title">{ W.unitsTitle }</b></span>
        <button class="mclose" aria-label="Close" on:click={ closeModal }>✕</button>
    </div>
    <div class="card upage"><Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } /></div>
{/if}
{#if view === 'home'}
    {#if barMode}
        <div class="topbar">
            <span class="grow"><b class="title">{ W[TAB_TITLE[tab]] }</b></span>
            <button class="units" aria-label="Units and saved data" on:click={ () => openUnits() }>{ unitsLabel } <span class="chev">▾</span></button>
            <button class="mclose" aria-label="Close" on:click={ closeModal }>✕</button>
        </div>
    {/if}
    <div class="card head home-head">
        <div class="row">
            {#if !isMobile}
                <button class="back-menu" aria-label="Back to the Windy menu" title="Back to the Windy menu" on:click={ toWindyMenu }>
                    <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true"><polyline points="11,3 3,11 11,19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
            {/if}
            <span class="brand grow-b"><span class="wordmark">SPOTLOG</span><PixelStar size={ 15 } /><span class="beta">{ W.betaTag }</span></span>
            <button class="units" aria-expanded={ showUnits } aria-label="Units and saved data" on:click={ () => (showUnits = !showUnits) }>{ unitsLabel } <span class="chev" class:up={ showUnits }>▾</span></button>
        </div>
        {#if showUnits}<Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } />{/if}
        <div class="stats">
            <div><span class="lbl">{ W.statSpots }</span><span class="big">{ data.spots.length }</span></div>
            <div><span class="lbl">{ W.statSessions }</span><span class="big">{ realSessions.length }</span></div>
            <div><span class="lbl">{ W.statWater }</span><span class="big">{ hoursOnWater } <small>h</small></span></div>
        </div>
        {#if synced}
            <small class="sync" class:err={ syncState === 'error' } title={ syncState === 'error' ? syncError : '' }>{ syncLabel }</small>
        {/if}
    </div>
{:else}
    <div class="topbar">
        <button class="round" aria-label="Back" on:click={ back }>←</button>
        <span class="grow"><b class="title">{ hdr.title }</b>{#if hdr.sub}<small>{ hdr.sub }</small>{/if}</span>
        {#if barMode}
            <button class="units" aria-label="Units and saved data" on:click={ () => openUnits() }>{ unitsLabel } <span class="chev">▾</span></button>
            <button class="mclose" aria-label="Close" on:click={ closeModal }>✕</button>
        {:else}
            <button class="units" aria-expanded={ showUnits } aria-label="Units and saved data" on:click={ () => (showUnits = !showUnits) }>{ unitsLabel } <span class="chev" class:up={ showUnits }>▾</span></button>
        {/if}
    </div>
    {#if showUnits && !barMode}<div class="card"><Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } /></div>{/if}
{/if}

<!-- ================= HOME ================= -->
{#if view === 'home'}
    <div class="actions home-acts">
        <button class="act" disabled={ capturing } on:click={ () => startPick('snap') }><Icon name="weather" /><b>{ capturing ? W.actLoading : W.actSaveForecast }</b><small>{ W.actSaveForecastSub }</small></button>
        <button class="act" on:click={ () => startPick('spot') }><Icon name="pin" /><b>{ W.actAddSpot }</b><small>{ W.actAddSpotSub }</small></button>
        <button class="act" on:click={ () => startPick('log') }><Icon name="pen" /><b>{ W.actLogSession }</b><small>{ W.actLogSessionSub }</small></button>
    </div>

    <div class="tabs home-tabs">
        <button class:on={ tab === 'spots' } on:click={ () => (tab = 'spots') }>{ W.tabSpots }</button>
        <button class:on={ tab === 'sessions' } on:click={ () => (tab = 'sessions') }>{ W.tabSessions }</button>
        <button class:on={ tab === 'gear' } on:click={ () => (tab = 'gear') }>{ W.tabGear }</button>
        <button class:on={ tab === 'about' } on:click={ () => (tab = 'about') }>{ W.tabAbout }</button>
    </div>

    {#if tab === 'spots'}
        {#if data.spots.length === 0}
            <div class="empty">{@html rich(W.spotsEmpty)}</div>
        {:else}
            <div class="viewtog" role="group" aria-label="How to show your spots">
                <button class:on={ S.spotView === 'list' } aria-pressed={ S.spotView === 'list' } aria-label={ W.viewList } title={ W.viewList } on:click={ () => setSettings({ ...S, spotView: 'list' }) }>−</button>
                <button class:on={ S.spotView !== 'list' } aria-pressed={ S.spotView !== 'list' } aria-label={ W.viewTiles } title={ W.viewTiles } on:click={ () => setSettings({ ...S, spotView: 'tiles' }) }>+</button>
            </div>
            <div class="tiles" class:list={ S.spotView === 'list' }>
                {#each data.spots as s (s.id)}
                    <button class="tile" on:click={ () => (barMode ? spotOnMap(s) : openSpot(s, true)) }>
                        <span class="t-name">{ s.name }</span>
                        {#if nowOf(s.id, nowBySpot)}
                            <span class="now">
                                <span class="sw" style="background: { windColor(nowOf(s.id, nowBySpot)?.wind?.wind ?? null) }">{ fmtWind0(nowOf(s.id, nowBySpot)?.wind?.wind ?? null, S.wind) }</span>
                                <span class="now-t"><b>{ windLabel(S.wind) }</b><small>{ fill(W.tileGusts, { v: fmtWind0(nowOf(s.id, nowBySpot)?.wind?.gust ?? null, S.wind) }) }</small>{#if nowOf(s.id, nowBySpot)?.waves}<small>{ fill(W.tileWaves, { v: fmtHeight(nowOf(s.id, nowBySpot)?.waves?.waves ?? null, S.height, true) }) }</small>{/if}</span>
                                {#if nowOf(s.id, nowBySpot)?.wind?.dir != null}
                                    <!-- the arrow points where the wind blows to, like Windy's; the letters say where it comes from -->
                                    <span class="wdir" title="Wind from { dirName(nowOf(s.id, nowBySpot)?.wind?.dir ?? null) }">
                                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="transform: rotate({ (nowOf(s.id, nowBySpot)?.wind?.dir ?? 0) + 180 }deg)"><path d="M9 2 L14 10 L10.2 9 L10.2 16 L7.8 16 L7.8 9 L4 10 Z" fill="currentColor" /></svg>
                                        <small>{ dirName(nowOf(s.id, nowBySpot)?.wind?.dir ?? null) }</small>
                                    </span>
                                {/if}
                            </span>
                        {:else}
                            <span class="now"><small>{ W.tileLoading }</small></span>
                        {/if}
                        <span class="t-tag">
                            {#if bestOf(s)}
                                <span class="tag" style="background: { guessCol(bestOf(s)?.rating ?? null)[0] }; color: { guessCol(bestOf(s)?.rating ?? null)[1] }" title={ guessNote(bestOf(s), s) }>{ bestTag(bestOf(s) ?? NO_BEST) }</span>
                            {:else}
                                <span class="tag ghost" title={ guessNote(guessOf(s), s) || ratingHint(s) }>{ W.guessUnsure }</span>
                            {/if}
                        </span>
                    </button>
                {/each}
            </div>
            <small class="muted">{@html rich(W.spotsNote)}</small>
        {/if}
        <div class="card map-toggles">
            <button class="maptog" role="switch" aria-checked={ S.mapSpots } on:click={ () => setSettings({ ...S, mapSpots: !S.mapSpots }) }>
                <span class="grow"><b>{ W.mapSpotsTitle }</b><small>{ W.mapSpotsSub }</small></span>
                <span class="switch" class:on={ S.mapSpots }><i></i></span>
            </button>
            <button class="maptog" role="switch" aria-checked={ S.mapSessions } on:click={ () => setSettings({ ...S, mapSessions: !S.mapSessions }) }>
                <span class="grow"><b>{ W.mapSessTitle }</b><small>{ W.mapSessSub }</small></span>
                <span class="switch" class:on={ S.mapSessions }><i></i></span>
            </button>
        </div>
    {:else if tab === 'sessions'}
        {#if data.sessions.length === 0}
            <div class="empty">{@html rich(W.sessEmpty)}</div>
        {:else}
            <div class="seg">
                <button class:on={ sessView === 'list' } on:click={ () => (sessView = 'list') }>{ W.sessList }</button>
                <button class:on={ sessView === 'cal' } on:click={ () => (sessView = 'cal') }>{ W.sessCal }</button>
            </div>
            {#if sessView === 'list'}
                <div class="list">
                    {#each allSessions as se (se.id)}
                        <SwipeRow on:open={ () => openSession(se) } on:delete={ () => deleteSession(se) }>
                            <span class="dot" style="background: { ratingBg(se.rating) }; color: { ratingFg(se.rating) }">{ se.rating }</span>
                            <span class="grow"><span>{ spotById(se.spotId)?.name || W.noSpotYet }{ se.track ? ' · ' + W.gps : '' }</span><small>{ fmtDay(se.date) } · { se.checked ? W.checkedLabel : se.notes ? se.notes.slice(0, 38) : RATE[se.rating - 1] }</small></span>
                            <small>{ feltLine(se) }</small>
                        </SwipeRow>
                    {/each}
                </div>
                <small class="muted">{ W.swipeHint }</small>
            {:else}
                <Calendar sessions={ realSessions } colors={ RATING_BG } labels={ RATE } spotName={ se => spotById(se.spotId)?.name || W.noSpotYet } on:open={ e => openSession(e.detail) } />
            {/if}
        {/if}
    {:else if tab === 'gear'}
        <div class="card">
            <b>{ W.gearAddTitle }</b>
            <small class="muted">{ W.gearAddSub }</small>
            <div class="seg">
                {#each GEAR_SPORTS as sp}<button class:on={ gearSport === sp } on:click={ () => { gearSport = sp; gearKind = GEAR_BY_SPORT[sp][0].kind; } }>{ sportLbl(sp) }</button>{/each}
            </div>
            <div class="chips">
                {#each GEAR_BY_SPORT[gearSport] as k}<button class="chip" class:on={ gearKind === k.kind } on:click={ () => (gearKind = k.kind) }>{ k.kind }</button>{/each}
            </div>
            <div class="row">
                <input bind:value={ gearName } placeholder={ gearHint(gearSport, gearKind) } on:keydown={ e => e.key === 'Enter' && addGear() } />
                <button class="btn primary small" disabled={ !gearName.trim() } on:click={ addGear }>{ W.gearAddBtn }</button>
            </div>
        </div>
        {#if data.gear.length === 0}
            <div class="empty">{@html rich(W.gearEmpty)}</div>
        {:else}
            {#each gearGroups as grp (grp.sport)}
                <div class="section">
                    <div class="row"><b class="grow">{ sportLbl(grp.sport) }</b><small>{ fill(W.gearSaved, { n: grp.items.length }) }</small></div>
                    <div class="list">
                        {#each grp.items as g (g.id)}
                            <div class="item static">
                                <span class="kind">{ g.kind }</span>
                                <span class="grow"><span>{ g.name }</span><small>{ fill(W.gearUsed, { n: gearUse(g.id) }) }</small></span>
                                <button class="link danger" on:click={ () => deleteGear(g.id) }>{ W.gearRemove }</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        {/if}
    {:else}
        <div class="about">
            <div class="card beta-card">
                <b class="h3">{@html rich(W.betaTitle)}</b>
                <p class="p muted">{@html rich(W.betaText)}</p>
                <div class="btns">
                    <button class="btn ghost" on:click={ () => exportJson(data) }>{ W.download }</button>
                    <label class="btn ghost">{ W.upload }<input type="file" accept=".json,application/json" on:change={ onUpload } hidden /></label>
                </div>
                <small class="muted">{ W.uploadHint }</small>
            </div>
            <div class="card">
                <b class="h3">{@html rich(W.aboutTitle)}</b>
                <p class="p">{@html rich(W.aboutText)}</p>
            </div>
            <div class="card steps">
                <b class="h3">{@html rich(W.howTitle)}</b>
                {#each [1, 2, 3, 4] as n}
                    <div class="step"><span class="n">{ n }</span><span class="grow"><b>{@html rich(W['step' + n + 'Title'])}</b><small>{@html rich(W['step' + n + 'Text'])}</small></span></div>
                {/each}
            </div>
            <div class="card">
                <b class="h3">{@html rich(W.goodTitle)}</b>
                {#each [1, 2, 3] as n}{#if W['good' + n]}<p class="p muted">{@html rich(W['good' + n])}</p>{/if}{/each}
                <div class="row data-links">
                    <button class="link danger" on:click={ clearAll }>{ armed === 'all' ? W.deleteAllArmed : W.deleteAll }</button>
                </div>
            </div>
            <div class="sig">
                <PixelStar size={ 14 } />
                <small class="ver">{ fill(W.version, { v: version }) }</small>
                <a class="coffee" href={ FEEDBACK_URL } target="_blank" rel="noopener noreferrer">{ W.feedback }</a>
            </div>
        </div>
    {/if}
    {#if tab !== 'about'}<small class="beta-note">{@html rich(W.betaNote)}</small>{/if}


<!-- ================= PICK A PLACE ================= -->
{:else if view === 'pick'}
    {#if pickFor === 'snap'}
        <p class="p muted">{@html rich(W.pickSnapNote, { time: fmtTime(Date.now() + 864e5) })}</p>
    {/if}
    <div class="opts">
        {#if pickFor === 'log' && lastSnap}
            <button class="opt" on:click={ () => lastSnap && startLog({ snap: lastSnap }) }>
                <span class="ico"><Icon name="weather" /></span>
                <span class="grow"><span>{ W.pickLast }</span><small>{ spotById(lastSnap.spotId)?.name || W.pickSavedPlace } · { fmtDayTime(lastSnap.ts) }</small></span>
                <span class="chev-r" aria-hidden="true">›</span>
            </button>
        {/if}
        <button class="opt" class:on={ waitingForMap } on:click={ () => { waitingForMap = true; locError = ''; if (barMode) {modalOpen = false;} } }>
            <span class="ico" class:live={ waitingForMap }><Icon name="pointer" /></span>
            <span class="grow"><span>{ isMobile ? W.pickTap : W.pickClick }</span><small>{ waitingForMap ? (isMobile ? W.pickTapWaiting : W.pickClickWaiting) : W.pickMapSub }</small></span>
        </button>
        <button class="opt" disabled={ locating } on:click={ useMyLocation }>
            <span class="ico" class:live={ locating }><Icon name="crosshair" /></span>
            <span class="grow"><span>{ W.pickMe }</span><small class:err={ !!locError }>{ locating ? W.pickMeFinding : locError || W.pickMeSub }</small></span>
            <span class="chev-r" aria-hidden="true">›</span>
        </button>
        {#if pickFor === 'log'}
            <button class="opt" on:click={ () => startLog({}) }>
                <span class="ico"><Icon name="plus" /></span>
                <span class="grow"><span>{ W.pickNoPlace }</span><small>{ W.pickNoPlaceSub }</small></span>
                <span class="chev-r" aria-hidden="true">›</span>
            </button>
        {/if}
    </div>
    {#if pickFor !== 'spot' && spotsByCentre.length}
        <div class="section">
            <small class="lbl">{ W.pickNearest }</small>
            <div class="opts">
                {#each spotsByCentre as s (s.id)}
                    <button class="opt" on:click={ () => actOn(pickFor, { lat: s.lat, lon: s.lon, name: s.name }, s) }>
                        <span class="ico"><i class="dot-s"></i></span>
                        <span class="grow"><span>{ s.name }</span><small>{ s.place || W.yourSpot }</small></span>
                        <span class="chev-r" aria-hidden="true">›</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}
    {#if pickFor === 'snap'}
        <small class="muted sl-note">{@html rich(W.pickTip)}</small>
    {/if}

<!-- ================= PLACE (clicked on map) ================= -->
{:else if view === 'place' && place}
    <SnapCard title={ pinName(place.name) } sub={ fill(W.placeSub, { time: timelineLabelFull }) } model={ modelLabel(currentModel()) } wind={ placeNow } waves={ placeWaves } loading={ placeLoading } u={ S } empty={ W.placeEmpty } />
    {#if nearSpot}
        <button class="card row link-card" on:click={ () => nearSpot && openSpot(nearSpot.s) }>
            <span class="ico"><i class="dot-s"></i></span><span class="grow"><small>{ W.nearSpot }</small><b>{ nearSpot.s.name } · { fmtDistance(nearSpot.d, S.height) }</b></span><span>›</span>
        </button>
    {/if}
    <div class="actions">
        <button class="act" disabled={ capturing } on:click={ () => place && actOn('snap', place) }><Icon name="weather" /><b>{ capturing ? W.actLoading : W.actSaveForecast }</b><small>{ W.actSaveForecastSub }</small></button>
        <button class="act" on:click={ () => place && actOn('spot', place) }><Icon name="pin" /><b>{ W.actAddSpot }</b><small>{ W.here }</small></button>
        <button class="act" on:click={ () => place && actOn('log', place) }><Icon name="pen" /><b>{ W.actLogSession }</b><small>{ W.here }</small></button>
    </div>

<!-- ================= NEW / EDIT SPOT ================= -->
{:else if view === 'spotForm' && sf}
    <label class="field"><span class="lbl">{ W.formName }</span><input bind:value={ sf.name } placeholder={ W.formNamePh } /></label>
    <div class="card row">
        <span class="ico"><i class="dot-s"></i></span>
        <span class="grow"><small>{ W.formLocation }</small><b>{ sf.place || sf.lat.toFixed(3) + ', ' + sf.lon.toFixed(3) }</b></span>
        <small class="r">{ isMobile ? '' : W.formMove }</small>
    </div>

    <div class="field"><span class="lbl">{ W.formSport }</span>
        <div class="chips">
            {#each SPORTS as sp}
                <button class="chip" class:on={ sf.sports.includes(sp) } on:click={ () => sf && (sf = { ...sf, sports: toggle(sf.sports, sp) }) }>{ sportLbl(sp) }</button>
            {/each}
        </div>
    </div>

    <div class="card">
        <div class="row"><b class="grow">{ W.formWindQ }</b></div>
        <div class="seg">
            <button class:on={ !sf.windUnknown } on:click={ () => sf && (sf = { ...sf, windUnknown: false }) }>{ W.formKnow }</button>
            <button class:on={ sf.windUnknown } on:click={ () => sf && (sf = { ...sf, windUnknown: true }) }>{ W.formDontKnow }</button>
        </div>
        {#if sf.windUnknown}
            <p class="p muted">{@html rich(W.formUnknownText)}</p>
        {:else}
            <small class="muted">{ W.formWindFrom }</small>
            <div class="dirs">
                {#each DIRS as d, i}
                    <button class="dir" class:on={ sf.dirs.includes(d) } aria-pressed={ sf.dirs.includes(d) } on:click={ () => sf && (sf = { ...sf, dirs: toggle(sf.dirs, d) }) }>
                        <span class="arrow" style="transform: rotate({ i * 45 + 180 }deg)">▲</span>{ d }
                    </button>
                {/each}
            </div>
            <div class="row sep">
                <span class="grow"><small>{ W.formStrength }</small><b class="big2">{ sf.dMin }–{ sf.dMax } <small>{ windLabel(S.wind) }</small></b></span>
                <div class="stepper"><small>{ W.formMin }</small>
                    <button class="round" aria-label="Lower minimum" on:click={ () => stepRange('dMin', -1) }>−</button>
                    <button class="round" aria-label="Raise minimum" on:click={ () => stepRange('dMin', 1) }>+</button>
                </div>
                <div class="stepper"><small>{ W.formMax }</small>
                    <button class="round" aria-label="Lower maximum" on:click={ () => stepRange('dMax', -1) }>−</button>
                    <button class="round" aria-label="Raise maximum" on:click={ () => stepRange('dMax', 1) }>+</button>
                </div>
            </div>
            <small class="muted">{ W.formGuessNote }</small>
        {/if}
    </div>

    <button class="btn primary wide" disabled={ !sf.name.trim() } on:click={ saveSpotForm }>{ sf.id ? W.formSaveEdit : W.formSaveNew }</button>

<!-- ================= SPOT ================= -->
{:else if view === 'spot' && spot}
    <SnapCard
        title={ spot.name }
        sub={ W.rightNow + ' · ' + (spot.place ? spot.place + ' · ' : '') + spot.sports.map(sportLbl).join(', ') }
        model={ modelLabel(spotModel) }
        wind={ spotNow?.wind ?? null }
        waves={ spotNow?.waves ?? null }
        loading={ !spotNow }
        u={ S }
        badge={ spotGuess ? guessLbl(spotPred) : '' }
        badgeNote={ guessNote(spotGuess, spot) }
        badgeBg={ guessCol(spotPred)[0] }
        badgeFg={ guessCol(spotPred)[1] }
    />

    {#if spotModels.length > 1}
        <div class="models-pick" role="radiogroup" aria-label="Forecast model">
            {#each spotModels as m}
                <button class:on={ spotModel === m } role="radio" aria-checked={ spotModel === m } on:click={ () => spot && setSpotModel(spot, m) }>{ modelLabel(m) }</button>
            {/each}
        </div>
    {/if}
    <div class="actions">
        <button class="act" disabled={ capturing } on:click={ () => spot && saveForecastAt({ lat: spot.lat, lon: spot.lon, spot }) }><Icon name="weather" /><b>{ capturing ? W.actLoading : W.actSaveForecast }</b><small>{ W.actSaveForecastSub }</small></button>
        <button class="act" on:click={ () => spot && startLog({ spot }) }><Icon name="pen" /><b>{ W.actLogSession }</b><small>{ W.spotLogSub }</small></button>
        <button class="act" class:on={ mapShown === spot.id } aria-pressed={ mapShown === spot.id } on:click={ () => spot && toggleShowOnMap(spot) }><Icon name="map" /><b>{ W.showOnMap }</b>{#if mapShown === spot.id}<small>{ W.showOnMapHide }</small>{/if}</button>
    </div>

    {#if !savedToday}
        <small class="muted nudge">{ W.saveNudge }</small>
    {/if}

    <!-- what works in general: your wind window -->
    <div class="card">
        {#if spot.windUnknown}
            <div class="row start">
                <span class="grow"><b>{ W.windUnknownTitle }</b><small>{@html rich(W.windUnknownText)}</small></span>
                <button class="link" on:click={ () => spot && editSpot(spot) }>{ W.edit }</button>
            </div>
            {#if suggestion}
                <div class="suggest">
                    <span class="grow"><small>{ W.bestDays }</small><b>{ dirsLabel(suggestion.dirs) }, { fmtWind0(suggestion.min, S.wind) }–{ fmtWind0(suggestion.max, S.wind) } { windLabel(S.wind) }</b><small>{ fill(W.bestDaysFrom, { n: suggestion.basedOn }) }</small></span>
                    <button class="btn primary small" on:click={ applySuggestion }>{ W.useThis }</button>
                </div>
            {:else}
                <small class="muted">{ fill(W.moreNeeded, { n: Math.max(0, 2 - goodCount) }) }</small>
            {/if}
        {:else}
            <div class="row start">
                <span class="arrows">
                    {#each spot.dirs as d}<span class="arrow o" style="transform: rotate({ DIRS.indexOf(d) * 45 + 180 }deg)">▲</span>{/each}
                </span>
                <span class="grow"><b>{ fill(W.works, { dirs: dirsLabel(spot.dirs), min: fmtWind0(spot.min, S.wind), max: fmtWind0(spot.max, S.wind), unit: windLabel(S.wind) }) }</b></span>
                <button class="link" on:click={ () => spot && editSpot(spot) }>{ W.edit }</button>
            </div>
            {#if spotLearnedWindow}
                <div class="suggest">
                    <span class="grow"><small>{ W.learnedWindowTitle }</small><b>{ dirsLabel(spotLearnedWindow.dirs) }, { fmtWind0(spotLearnedWindow.min, S.wind) }–{ fmtWind0(spotLearnedWindow.max, S.wind) } { windLabel(S.wind) }</b></span>
                    <button class="btn primary small" on:click={ useLearnedWindow }>{ W.useLearned }</button>
                </div>
            {/if}
        {/if}
        {#if spotOutlook?.tide}
            <!-- today's tides, and when today matches the tide your best sessions had -->
            <div class="sep tide-today">
                <div class="row"><span class="lbl grow">{ W.tideToday }</span><span>{ tideList(spotOutlook.tide) }</span></div>
                {#if spotTide}
                    <small class="tide-best">{ fill(W.tideBestToday, { tide: tideText(spotTide), n: spotTide.of, total: spotTide.total, when: tideWhen(spotOutlook.tide, spotTide) || '–' }) }</small>
                {/if}
            </div>
        {:else if spotTide}
            <small class="muted tidehint">{ fill(W.tideHint, { tide: tideText(spotTide), n: spotTide.of, total: spotTide.total }) }</small>
        {/if}
        <div class="stats sep">
            <div><span class="lbl">{ W.statSessions }</span><span class="big">{ spotReal.length }</span></div>
            <div><span class="lbl">{ W.statAvg }</span><span class="big">{ avgRating }</span></div>
            <div><span class="lbl">{ W.statBias }</span><span class="big">{ bias === null ? '–' : (bias > 0 ? '+' : bias < 0 ? '−' : '') + fmtWind(Math.abs(bias), S.wind) } <small>{ windLabel(S.wind) }</small></span></div>
        </div>
    </div>

    <!-- the recommendation: today and the next days -->
    <div class="section">
        <b>{ W.recoTitle }</b>
        <div class="card reco">
            {#if spotBest}
                <div class="reco-row">
                    <span class="r-day">{ W.today }</span>
                    <span class="tag" style="background: { guessCol(spotBest.rating)[0] }; color: { guessCol(spotBest.rating)[1] }">{ guessLbl(spotBest.rating) }</span>
                    <b class="r-time">{ bestRange(spotBest) }</b>
                </div>
            {/if}
            {#each spotDays.filter(d => d.best) as d (d.day)}
                <div class="reco-row">
                    <span class="r-day">{ fmtDay(d.day) }{#if predOfDay(d.day, spotOutlook) !== null}<small class="r-pred" title={ W.predTitle }>{ fill(W.predShort, { p: Math.round(predOfDay(d.day, spotOutlook) ?? 0) }) }</small>{/if}</span>
                    {#if d.best}
                        <span class="tag" style="background: { guessCol(d.best.rating)[0] }; color: { guessCol(d.best.rating)[1] }">{ guessLbl(d.best.rating) }</span>
                        <b class="r-time"><span>{ fmtTime(d.best.start) }–</span><span>{ fmtTime(d.best.end) }</span></b>
                    {/if}
                </div>
            {/each}
            {#if !spotOutlook || !dayBySpot[spot.id]}<small class="muted r-later">{ W.checking }</small>{:else if !spotBest && !spotDays.some(d => d.best)}<small class="muted r-later">{ W.daysNone }</small>{/if}
            <small class="muted reco-note">{ spotBest ? guessNote(spotBest, spot) : guessNote(spotGuess, spot) }</small>
        </div>
    </div>

    <!-- what works here for you: folded to one line, open for the details (it stays as you leave it) -->
    <div class="section works-sec">
        <button class="works-head" aria-expanded={ S.worksOpen } on:click={ () => setWorksOpen(!S.worksOpen) }>
            <b>{ W.worksTitle }</b><span class="chev" class:open={ S.worksOpen } aria-hidden="true">›</span>
        </button>
        {#if !S.worksOpen}
            <button class="card works-sum" on:click={ () => setWorksOpen(true) }>
                {#each spotLearned.filter(m => m.params.length) as m (m.sport)}
                    <span class="ws-line"><b>{ sportLbl(m.sport) }</b><span>{ worksLine(m) || '–' }</span></span>
                {:else}
                    <span class="muted">{ W.fromWindowOnly }</span>
                {/each}
                <small class="muted">{ W.worksOpenHint }</small>
            </button>
        {:else}
            <div class="card works">
                {#each spotLearned as m (m.sport)}
                    <div class="w-sport">
                        <div class="w-head">
                            <b>{ sportLbl(m.sport) }</b>
                            <small class="muted grow">{ m.params.some(p => p.from === 'sessions') ? fill(W.learnedFromShort, { n: m.sessions, g: m.great }) : W.fromWindowShort }</small>
                            {#if editSport !== m.sport}<button class="link" on:click={ () => startEdit(m) }>{ W.adjust }</button>{/if}
                        </div>
                        {#if editSport === m.sport}
                            <div class="w-grid edit">
                                {#each paramsOf(m.sport) as key (key)}
                                    <span class="w-name">{ paramName(key) }</span>
                                    {#if isCircular(key)}
                                        <div class="w-dirs">
                                            {#each DIRS as d}<button class="dchip" class:on={ editRows[key]?.dirs.includes(d) } aria-pressed={ editRows[key]?.dirs.includes(d) } on:click={ () => toggleEditDir(key, d) }>{ d }</button>{/each}
                                        </div>
                                    {:else if editRows[key]}
                                        <div class="w-inputs">
                                            <input inputmode="decimal" bind:value={ editRows[key].lo } placeholder="–" aria-label={ paramName(key) + ' ' + W.formMin } />
                                            <span>–</span>
                                            <input inputmode="decimal" bind:value={ editRows[key].hi } placeholder="–" aria-label={ paramName(key) + ' ' + W.formMax } />
                                            <small>{ key === 'wind' || key === 'gust' ? windLabel(S.wind) : key === 'waves' || key === 'swell' ? S.height : key === 'period' ? 's' : key === 'temp' ? '°' + S.temp : key === 'rain' ? 'mm' : key === 'power' ? 'kW/m' : '' }</small>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                            <small class="muted">{ W.adjustNote }</small>
                            <div class="btns">
                                <button class="btn primary small" on:click={ saveEdit }>{ W.save }</button>
                                <button class="btn ghost small" on:click={ () => (editSport = null) }>{ W.cancel }</button>
                                {#if spot.ranges?.[m.sport]}<button class="link" on:click={ () => resetEdit(m.sport) }>{ W.backToLearned }</button>{/if}
                            </div>
                        {:else if m.params.length}
                            <!-- what decides the day here first (ranges from your great days, today next to it); the rest in one quiet line -->
                            <span class="w-group">{ W.decidesTitle }</span>
                            <div class="w-list">
                                {#each spotGroups(m).decides as row (row.p.key)}
                                    <div class="w-row">
                                        <span class="w-mark" class:ok={ row.part && row.part.fit >= 0.99 } class:near={ row.part && row.part.fit > 0 && row.part.fit < 0.99 } class:off={ row.part && row.part.fit === 0 } title={ W.whyTitle }>{ !row.part ? '·' : row.part.fit >= 0.99 ? '✓' : row.part.fit > 0 ? '~' : '✕' }</span>
                                        <span class="w-name">{ paramName(row.p.key) }{#if row.p.from === 'you'}<i class="w-you" title={ W.setByYou }></i>{/if}</span>
                                        <b class="w-range">{ rangeText(row.p) }</b>
                                        <span class="w-now">{ row.part ? fill(W.todayVal, { v: nowText(row.p.key, row.part.value) }) : '' }</span>
                                    </div>
                                {/each}
                            </div>
                            {#if spotGroups(m).also.length}
                                <small class="w-also"><span>{ W.alsoChecked }</span> { spotGroups(m).also.map(row => `${row.part ? (row.part.fit >= 0.99 ? '✓' : row.part.fit > 0 ? '~' : '✕') + ' ' : ''}${paramName(row.p.key)} ${rangeText(row.p)}`).join(' · ') }</small>
                            {/if}
                        {:else}
                            <small class="muted">{ W.fromWindowOnly }</small>
                        {/if}
                    </div>
                {/each}
                {#each spotGear as gh (gh.gearId)}
                    <small class="gear-hint">{ fill(W.gearHint, { gear: data.gear.find(g => g.id === gh.gearId)?.name || W.gear, range: `${fmtWind0(gh.lo, S.wind)}–${fmtWind0(gh.hi, S.wind)} ${windLabel(S.wind)}`, n: gh.sessions }) }</small>
                {/each}
                <small class="muted">{ W.worksLegend }</small>
            </div>
        {/if}
    </div>

    <div class="section">
        <b>{ W.trustTitle }</b>
        <div class="card">
            {#if scores.length === 0}
                <span class="muted">{@html rich(W.trustEmpty)}</span>
            {:else}
                {#each scores as sc, i}
                    <div class="score"><span class="m" class:best={ i === 0 && sc.count >= 3 }>{ modelLabel(sc.model) }</span><span class="missbar"><i style="width: { Math.min(100, sc.miss * 25) }%" class:best={ i === 0 && sc.count >= 3 }></i></span><span>±{ fmtWind(sc.miss, S.wind) } { windLabel(S.wind) }</span></div>
                {/each}
                <small class="muted">{ fill(W.trustNote, { n: scores[0].count }) }</small>
            {/if}
        </div>
    </div>

    <div class="section">
        <b>{ W.savedTitle }</b>
        {#if spotSnapshots.length === 0}
            <span class="muted">{@html rich(W.savedEmpty)}</span>
        {:else}
            <div class="list">
                {#each spotSnapshots.slice(0, 8) as sn (sn.id)}
                    <div class="item static">
                        <span class="sw" style="background: { windColor(primaryOf(sn)?.wind ?? null) }">{ fmtWind0(primaryOf(sn)?.wind ?? null, S.wind) }</span>
                        <button class="grow plain" on:click={ () => openSnap(sn) }><span>{ fmtDayTime(sn.ts) }</span><small>{ fill(W.modelsN, { n: sn.models.length }) }{ sn.note ? ' · ' + sn.note.slice(0, 24) : '' }</small></button>
                        <button class="mini" on:click={ () => openSnap(sn) }>{ W.edit }</button>
                        <button class="mini danger" on:click={ () => deleteSnap(sn) }>{ W.delete }</button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="section">
        <b>{ W.sessHere }</b>
        {#if spotSessions.length === 0}
            <span class="muted">{ W.sessHereEmpty }</span>
        {:else}
            <div class="list">
                {#each spotSessions as se (se.id)}
                    <SwipeRow on:open={ () => openSession(se) } on:delete={ () => deleteSession(se) }>
                        <span class="dot" style="background: { ratingBg(se.rating) }; color: { ratingFg(se.rating) }">{ se.rating }</span>
                        <span class="grow"><span>{ fmtDay(se.date) }{ se.track ? ' · ' + W.gps : '' }</span><small>{ se.checked ? W.checkedLabel : se.notes ? se.notes.slice(0, 40) : RATE[se.rating - 1] }</small></span>
                        <small>{ feltLine(se) }</small>
                    </SwipeRow>
                {/each}
            </div>
            <small class="muted">{ W.swipeHint }</small>
        {/if}
    </div>

    <button class="link danger" on:click={ () => spot && deleteSpot(spot) }>{ armed === 'spot' ? W.deleteSpotArmed : W.deleteSpot }</button>

<!-- ================= SNAPSHOT ================= -->
{:else if view === 'snap' && snap}
    <SnapCard title={ snapDraft ? fill(W.snapNow, { time: fmtTime(snap.ts) }) : fmtDayTime(snap.ts) } sub={ snapDraft ? W.snapDraftSub : fill(W.snapSavedSub, { time: fmtDayTime(snap.savedAt) }) } model={ modelLabel(snap.primary) } wind={ primaryOf(snap) } waves={ snap.waves } models={ snap.models } u={ S } />
    <small class="muted sl-note">{ snap.series ? fill(W.snapSeries, { time: fmtTime(snap.series.ts[0]), n: Object.keys(snap.series.models).length }) : W.snapOld } { W.snapUses }</small>
    <div class="card">
        <div class="row">
            <span class="ico"><i class="dot-s" class:off={ !snap.spotId }></i></span>
            <span class="grow"><small>{ W.spotLabel }</small><b>{ spotById(snap.spotId)?.name || W.snapNoSpot }</b></span>
            <button class="btn ghost small" on:click={ () => (linkOpen = !linkOpen) }>{ linkOpen ? W.done : snap.spotId ? W.editLinked : W.linkSpot }</button>
        </div>
        {#if linkOpen}
            <div class="chips">
                {#each nearestSpots(snap.lat, snap.lon).slice(0, 5) as s (s.id)}
                    <button class="chip" class:on={ snap.spotId === s.id } on:click={ () => { linkSnap(s.id); linkOpen = false; } }>{ s.name }</button>
                {/each}
                <button class="chip dash" on:click={ () => snap && startSpotForm({ lat: snap.lat, lon: snap.lon }, 'snap') }>{ W.newSpotHere }</button>
                {#if snap.spotId}<button class="chip" on:click={ () => { linkSnap(null); linkOpen = false; } }>{ W.noSpot }</button>{/if}
            </div>
        {/if}
    </div>
    <label class="field"><span class="lbl">{ W.note }</span><textarea rows="3" bind:value={ snapNote } on:change={ saveSnapNote } placeholder={ W.notePh }></textarea></label>
    <div class="btns">
        {#if snapDraft && replaceOf}
            <div class="replace">
                <b>{ fill(W.replaceTitle, { spot: spotById(replaceOf.spotId)?.name || '' }) }</b>
                <small>{ fill(W.replaceText, { time: fmtDayTime(replaceOf.savedAt) }) }</small>
                <div class="btns">
                    <button class="btn primary" on:click={ () => confirmSnap(true) }>{ W.replace }</button>
                    <button class="btn ghost" on:click={ () => (replaceOf = null) }>{ W.keepOld }</button>
                </div>
            </div>
        {:else if snapDraft}
            <button class="btn primary" on:click={ () => confirmSnap(false) }>{ W.actSaveForecast }</button>
            <button class="btn ghost" on:click={ back }>{ W.cancel }</button>
        {:else}
            <button class="btn primary" on:click={ back }>{ W.done }</button>
            <button class="btn ghost" on:click={ () => snap && deleteSnap(snap) }>{ W.delete }</button>
        {/if}
    </div>

<!-- ================= LOG / EDIT SESSION ================= -->
{:else if view === 'log' && f}
    {#if logSnap && logView}
        <SnapCard
            title={ fmtDayTime(logView.ts) }
            sub={ logView.matches ? W.logFcSession : fill(W.logFcSaved, { time: fmtDayTime(logSnap.savedAt) }) }
            model={ modelLabel(logSnap.primary) }
            wind={ logPrimary }
            waves={ logView.waves }
            models={ logView.models }
            best={ closest?.model || null }
            u={ S }
        />
        {#if logView.note}<small class="muted sl-note">{ logView.note }</small>{/if}
        {#if logView.otherDay && f.lat !== undefined && !capturing}
            <button class="btn ghost" on:click={ () => captureForLog() }>{ f.dateStr === dateStrOf(Date.now()) ? W.logUseHours : fill(W.logSaveFor, { day: fmtDay(sessionFocus(f) ?? Date.now()) }) }</button>
        {/if}
    {:else}
        <div class="snapless">
            {#if capturing}
                <span>{ W.logSaving }</span>
            {:else if f.lat !== undefined}
                <span class="grow">{ captureError || W.logNoFc }</span>
                <button class="btn primary small" on:click={ () => f && captureForLog() }>{ W.logSaveNow }</button>
            {:else}
                <span class="grow">{ W.logNoPlace }</span>
            {/if}
        </div>
    {/if}

    <div class="field"><span class="lbl">{ W.when }</span>
        <div class="when" class:one={ isMobile }>
            <input type="date" bind:value={ f.dateStr } aria-label="Date" />
            <div class="row start times">
                <TimeWheel bind:value={ f.start } placeholder={ W.start } />
                <span class="to">→</span>
                <TimeWheel bind:value={ f.end } placeholder={ W.end } align={ isMobile ? 'end' : 'center' } />
            </div>
        </div>
        {#if f.start && f.end && f.end < f.start}<small class="muted">{ W.nextDay }</small>{/if}
    </div>

    <div class="card">
        <div class="row">
            <span class="ico"><i class="dot-s"></i></span>
            <span class="grow"><small>{ W.spotLabel }</small><b>{ spotById(f.spotId)?.name || W.noSpotYet }</b></span>
            {#if f.spotId}<button class="link" on:click={ () => f && (f = { ...f, spotId: null }) }>{ W.change }</button>{/if}
        </div>
        {#if (spotById(f.spotId)?.sports.length ?? 0) > 1}
            <!-- spots with several sports learn per sport -->
            <div class="chips sep" role="radiogroup" aria-label={ W.sessionSport }>
                {#each spotById(f.spotId)?.sports || [] as sp}
                    <button class="chip" class:on={ (f.sport || spotById(f.spotId)?.sports[0]) === sp } role="radio" aria-checked={ (f.sport || spotById(f.spotId)?.sports[0]) === sp } on:click={ () => f && (f = { ...f, sport: sp }) }>{ sportLbl(sp) }</button>
                {/each}
            </div>
        {/if}
        {#if !f.spotId}
            <div class="chips">
                {#each (f.lat !== undefined ? nearestSpots(f.lat, f.lon ?? 0) : data.spots).slice(0, 5) as s (s.id)}
                    <button class="chip" on:click={ () => assignSpot(s) }>{ s.name }</button>
                {/each}
                <button class="chip dash" on:click={ newSpotFromLog }>{ W.newSpot }</button>
            </div>
            <small class="muted">{ W.noSpotNote }</small>
        {/if}
    </div>

    <div class="section">
        <b class="h2">{ W.howWas }</b>
        <div class="ratings">
            {#each RATE as r, i}
                <button class="rate" class:on={ !f.checked && f.rating === i + 1 } style={ !f.checked && f.rating === i + 1 ? `background: ${ RATING_BG[i] }; border-color: ${ RATING_BG[i] }; color: ${ RATING_FG[i] }` : '' } on:click={ () => f && (f = { ...f, rating: i + 1, checked: false }) }><b>{ i + 1 }</b><span>{ r }</span></button>
            {/each}
        </div>
        <!-- a day you checked and didn't go: it teaches spotlog what doesn't work, but isn't a session on the water -->
        <button class="chip notworth" class:on={ f.checked } aria-pressed={ !!f.checked } on:click={ () => f && (f = { ...f, checked: !f.checked }) }>{ W.notWorth }</button>
        {#if f.checked}<small class="muted">{ W.notWorthNote }</small>{/if}
    </div>

    <div class="card felt-card">
        <div class="row start">
            <span class="grow"><small>{ W.feltTitle }</small><b class="big2">{ f.felt === null ? '–' : f.felt } <small>{ windLabel(S.wind) }</small></b></span>
            {#if logFc !== null && f.felt !== null}
                <span class="tag ghost">{ f.felt < logFc ? W.lighter : f.felt > logFc ? W.stronger : W.asForecast }</span>
            {/if}
        </div>
        <FeltSlider bind:value={ f.felt } min={ 0 } max={ feltMax } step={ feltStep } forecast={ logFc } unit={ windLabel(S.wind) } />
        <div class="row sep">
            <small class="grow muted">{ logFc !== null ? fill(W.whiteLine, { v: logFc, unit: windLabel(S.wind) }) : W.dragHint }</small>
            {#if closest}<small>{ W.closest } <b>{ modelLabel(closest.model) }</b></small>{/if}
        </div>
    </div>

    <div class="field"><span class="lbl">{ W.gusts }</span>
        <div class="chips">{#each ['Steady', 'Gusty', 'Very gusty'] as g, i}<button class="chip" class:on={ f.gusts === g } on:click={ () => f && (f = { ...f, gusts: f.gusts === g ? null : g }) }>{ W['gust' + (i + 1)] }</button>{/each}</div>
    </div>
    <div class="field"><span class="lbl">{ W.water }</span>
        <div class="chips">{#each ['Flat', 'Chop', 'Swell', 'Waves'] as wv, i}<button class="chip" class:on={ f.water === wv } on:click={ () => f && (f = { ...f, water: f.water === wv ? null : wv }) }>{ W['water' + (i + 1)] }</button>{/each}</div>
    </div>
    <div class="field"><span class="lbl">{ W.gear }</span>
        {#each logGearGroups as grp (grp.sport)}
            {#if logGearGroups.length > 1}<small class="muted">{ sportLbl(grp.sport) }</small>{/if}
            <div class="chips">
                {#each grp.items as g (g.id)}
                    <button class="chip" class:on={ f.gearIds.includes(g.id) } on:click={ () => f && (f = { ...f, gearIds: toggle(f.gearIds, g.id) }) }><span class="k">{ g.kind }</span>{ g.name }</button>
                {/each}
            </div>
        {/each}
        <div class="row">
            <input bind:value={ f.gear } placeholder={ data.gear.length ? W.gearPhAny : W.gearPhFirst } />
            {#if f.gear.trim()}<button class="btn ghost small" on:click={ saveTypedGear }>{ W.saveToGear }</button>{/if}
        </div>
    </div>

    <div class="card">
        <div class="row">
            <span class="grow"><b>{ W.gpsTitle }</b><small>{ f.track ? f.track.source : W.gpsSub }</small></span>
            {#if f.track}
                <button class="link" on:click={ () => f?.track && drawTrack(f.track, true) }>{ W.gpsShow }</button>
            {:else}
                <label class="btn ghost small">{ W.gpsAdd }<input type="file" accept=".gpx,.tcx,.fit,application/gpx+xml" on:change={ onTrackFile } hidden /></label>
            {/if}
        </div>
        {#if trackError}<small class="err">{ trackError }</small>{/if}
        {#if f.track}
            <div class="stats sep">
                <div><span class="lbl">{ W.distance }</span><span class="big">{ fmtDistance(f.track.distanceKm, S.height) }</span></div>
                <div><span class="lbl">{ W.time }</span><span class="big">{ Math.floor(f.track.durationMin / 60) }:{ String(Math.round(f.track.durationMin % 60)).padStart(2, '0') } <small>h</small></span></div>
                <div><span class="lbl">{ W.topSpeed }</span><span class="big">{ fmtWind(f.track.maxSpeed, S.wind) } <small>{ windLabel(S.wind) }</small></span></div>
            </div>
            <button class="link danger" on:click={ removeTrack }>{ W.removeTrack }</button>
        {/if}
    </div>

    <label class="field"><span class="lbl">{ W.notes }</span><textarea rows="4" bind:value={ f.notes } placeholder={ W.notesPh }></textarea></label>

    <button class="btn primary wide" on:click={ saveSession }>{ f.id ? W.saveChanges : W.saveSession }</button>
    {#if f.id}
        <button class="link danger" on:click={ () => { const se = data.sessions.find(x => x.id === f?.id); if (se) {deleteSession(se, true);} } }>{ W.deleteSession }</button>
    {/if}
{/if}

{/if}

{#if toast}
    <div class="toast" role="status">
        <span class="grow">{ toast.msg }</span>
        {#if toast.undo}<button class="undo" on:click={ runUndo }>{ toast.label || W.undo }</button>{/if}
    </div>
{/if}

</div>
</div>
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map, markers, centerMap } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import * as reverse from '@windy/reverseName';
    import * as rootScope from '@windy/rootScope';
    import * as geo from '@windy/geolocation';
    import { onDestroy, onMount, tick } from 'svelte';
    import { hapticCleanup } from './lib/haptic';

    import config from './pluginConfig';
    import { load, save, exportJson, importJson, uid, emptyData, normalise, mergeData, storageKey, useWindyUser } from './lib/storage';
    import { waveValueAt, modelValueAt, conditionsNow, hoursToday, hoursBetween, predictability, tideToday, trimWaves, captureDay, seriesAt, covers, availableModels, ALL_MODELS } from './lib/forecast';
    import { cloudAvailable, pull, push } from './lib/cloud';
    import { FEEDBACK_URL } from './lib/links';
    import { FONT_CSS } from './lib/fonts';
    import { THEME, THEME_CSS, themeCss, guessColours, lightsUp, sessionMarkStyle } from './lib/theme';
    import {
        DIRS, SPORTS, RATING_BG, RATING_FG, GEAR_SPORTS, GEAR_BY_SPORT, ratingBg, ratingFg, dirName, dirsLabel, windColor, modelLabel,
        distanceKm, modelScores, forecastBias, trustedModel, fmtDay, fmtDayTime, fmtTime,
    } from './lib/wind';
    import { fmtWind, fmtWind0, fmtHeight, fmtTemp, fmtDistance, windLabel, fromWind, toWind, windStep, feltTo, feltFrom } from './lib/units';
    import {
        guess, conditionsOf, samplesFor, suggestWindow, shownLevel, bestToday, bestTide, sessionTide, learnSpot, dirsOfParam, guessSport,
        nextDays, learnedWindow, gearHints, ownAverage, nearbySpots, isCircular, paramsOf, MIN_SAMPLES,
    } from './lib/predict';
    import { words, w, t as tr, fill, rich, setWords } from './lib/copy';
    import { readTrack } from './lib/gpx';

    import SnapCard from './ui/SnapCard.svelte';
    import FeltSlider from './ui/FeltSlider.svelte';
    import TimeWheel from './ui/TimeWheel.svelte';
    import SwipeRow from './ui/SwipeRow.svelte';
    import Calendar from './ui/Calendar.svelte';
    import Settings from './ui/Settings.svelte';
    import Icon from './ui/Icon.svelte';
    import PixelStar from './ui/PixelStar.svelte';
    import Brand from './ui/Brand.svelte';
    import type { TideDay } from './lib/forecast';
    import type { Guess, DayBest, Hour, SportModel, ParamModel, ParamKey, OwnRange } from './lib/predict';
    import type { WindyAuth } from './lib/cloud';

    import type { Spot, Snapshot, Session, ModelValue, WaveValue, Dir8, Settings as SettingsT, Track, SpotlogData, Gear } from './lib/types';

    type View = 'home' | 'pick' | 'place' | 'spotForm' | 'spot' | 'snap' | 'log';
    type PickFor = 'snap' | 'log' | 'spot';
    interface Loc { lat: number; lon: number; name?: string }
    interface Now { wind: ModelValue | null; waves: WaveValue | null }
    interface SpotForm {
        id?: string; name: string; place: string; lat: number; lon: number; sports: string[];
        dirs: Dir8[]; dMin: number; dMax: number; windUnknown: boolean; created?: number; startOwn?: boolean;
    }
    interface LogForm {
        id?: string; spotId: string | null; lat?: number; lon?: number; snapshotId: string | null;
        dateStr: string; rating: number; felt: number | null; gusts: string | null; water: string | null;
        sport: string | null; checked?: boolean;
        gearIds: string[]; gear: string; start: string; end: string; notes: string; track: Track | null;
        /** snapshot this log created by itself (may be replaced when the date changes) */
        autoSnap?: string | null;
    }
    interface Frame { view: View; spotId: string | null; snapId: string | null }

    const { name, title, version } = config;
    const isMobile = !!rootScope?.isMobileOrTablet;

    let root: HTMLElement;
    let bodyEl: HTMLElement;

    /* ---------- phones: compact bar + a panel that rises over the map ---------- */
    let modalOpen = false;
    /** set when this phone clips the panel (it would be invisible): then the classic half-screen panel is used */
    let modalFallback = false;
    $: barMode = isMobile && !modalFallback;
    const asTab = (k: string) => k as typeof tab;
    function openModal() {
        if (!barMode) {return;}
        modalOpen = true;
        tick().then(() => setTimeout(checkModalVisible, 80));
    }
    /** Windy's pane could cut off anything above it: check the panel really shows, else fall back */
    function checkModalVisible() {
        if (!modalOpen || !bodyEl) {return;}
        try {
            const r = bodyEl.getBoundingClientRect();
            // a few points across the panel: one of them may sit under a card or a Windy button, not all
            const pts = [[0.5, 30], [0.2, r.height / 2], [0.8, r.height - 30]];
            const seen = pts.some(([fx, dy]) => {
                const hit = document.elementFromPoint(r.left + r.width * fx, Math.max(r.top + dy, 2));
                return !!hit && root.contains(hit);
            });
            if (r.height < 60 || !seen) {
                modalFallback = true;
                modalOpen = false;
                showPhoneError('the panel over the map is cut off on this phone, using the panel under the timeline instead');
            }
        } catch {
            /* keep going */
        }
    }
    function openTab(t: typeof tab) {
        tab = t;
        if (view !== 'home') {goHome();}
        openModal();
        tick().then(scrollTop);
    }
    function toggleTab(t: typeof tab) {
        if (welcome) {finishWelcome();}
        if (modalOpen && !unitsOpen && view === 'home' && tab === t) {closeModal();}
        else {
            unitsOpen = false;
            openTab(t);
        }
    }
    const TAB_TITLE: Record<string, string> = { spots: 'titleSpots', sessions: 'titleSessions', gear: 'titleGear', about: 'titleAbout' };
    /** thrown when Windy has no forecast for a day (shown with the chosen wording) */
    const NO_DAY = 'spotlog:no-forecast-for-day';
    /* ---------- wording (src/lib/copy.ts; the Style Lab can change any phrase) ---------- */
    $: W = $words;
    $: RATE = [W.rate1, W.rate2, W.rate3, W.rate4, W.rate5];
    /** only good news gets a word (good, great, epic); anything else is "not sure yet" */
    $: guessLbl = (r: number | null): string => (shownLevel(r) ? W['guess' + shownLevel(r)] : W.guessUnsure);
    const UNSURE: [string, string] = ['var(--sl-dirTile, #e9e8e3)', 'var(--sl-lightSub, #6b6b6b)'];
    const guessCol = (r: number | null): [string, string] => (shownLevel(r) ? guessColours(r as number) : UNSURE);
    const NO_BEST: DayBest = { start: 0, end: 0, rating: 0, level: 0, sport: '', sessions: 0, learned: false, now: true };
    $: sportLbl = (sp: string): string => W['sport' + sp] || sp;
    /** a place without a name is stored as 'Dropped pin'; it shows in the chosen wording */
    $: pinName = (n: string | undefined): string => (!n || n === 'Dropped pin' ? W.droppedPin : n);
    /** phones: units and saved data are a page of their own in the panel, with back and ✕ */
    let unitsOpen = false;
    /** opened from the bar while the panel was closed: back closes the panel again */
    let unitsAlone = false;
    function openUnits(fromBar = false) {
        if (fromBar && unitsOpen && modalOpen) {return closeModal();}
        unitsAlone = fromBar && !modalOpen;
        unitsOpen = true;
        openModal();
        tick().then(() => { if (bodyEl) {bodyEl.scrollTop = 0;} });
    }
    function unitsBack() {
        if (unitsAlone) {closeModal();}
        else {unitsOpen = false;}
    }
    function closeModal() {
        if (welcome) {finishWelcome();}
        modalOpen = false;
        // the units page stays until the panel has faded out
        setTimeout(() => { if (!modalOpen) {unitsOpen = false;} }, 200);
    }

    /**
     * Phones: the keyboard opens over the panel instead of pushing the whole app up.
     * The browser only shifts the page when a field would end up under the keyboard, so just before
     * the keyboard comes, the field scrolls up near the top of the panel (with room added below to allow it).
     */
    let kbRoom = false;
    let kbTimer: ReturnType<typeof setTimeout> | undefined;
    const typesText = (el: EventTarget | null): el is HTMLElement =>
        el instanceof HTMLElement && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(date|time|checkbox|radio|range|button|file)$/i.test((el as HTMLInputElement).type)));
    /** the field would end up under the keyboard (roughly the lower half of the screen) */
    function underKeyboard(el: HTMLElement): boolean {
        if (!bodyEl) {return false;}
        const box = bodyEl.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return r.bottom > Math.min(window.innerHeight * 0.4, box.top + 180) || r.top < box.top + 40;
    }
    /**
     * A tap on a field that the keyboard would cover: the tap is finished first (the finger is up), then the field
     * moves up and gets the cursor. Nothing moves while the finger is down, so the tap can't land on something else
     * (moving it at touchstart sent the tap to the notes, a chip or a tab).
     */
    let fieldDown: { x: number; y: number; el: HTMLElement } | null = null;
    function fieldTouchStart(e: TouchEvent) {
        const el = e.target;
        const t = e.touches[0];
        fieldDown = barMode && typesText(el) && document.activeElement !== el && t ? { x: t.clientX, y: t.clientY, el } : null;
    }
    function fieldTouchEnd(e: TouchEvent) {
        const d = fieldDown;
        fieldDown = null;
        const t = e.changedTouches[0];
        if (!d || !t || e.target !== d.el || document.activeElement === d.el) {return;}
        if (Math.hypot(t.clientX - d.x, t.clientY - d.y) > 10) {return;} // that was a scroll
        if (!bodyEl || !underKeyboard(d.el)) {return;} // the phone handles it as usual
        e.preventDefault(); // no second, late tap on whatever is under the finger after the move
        clearTimeout(kbTimer);
        kbRoom = true;
        bodyEl.style.paddingBottom = '55vh';
        bodyEl.scrollTop += d.el.getBoundingClientRect().top - (bodyEl.getBoundingClientRect().top + 64);
        d.el.focus({ preventScroll: true });
        try {
            const n = (d.el as HTMLInputElement).value.length;
            (d.el as HTMLInputElement).setSelectionRange(n, n);
        } catch {
            /* not a text field with a cursor */
        }
    }
    function fieldFocus(e: FocusEvent) {
        if (!typesText(e.target) || !barMode) {return;}
        clearTimeout(kbTimer);
        kbRoom = true;
        // if the browser shifted the page anyway, put it back
        setTimeout(() => { if (window.scrollY > 0) {window.scrollTo(0, 0);} }, 350);
    }
    function fieldBlur() {
        clearTimeout(kbTimer);
        kbTimer = setTimeout(() => {
            if (typesText(document.activeElement)) {return;}
            kbRoom = false;
            if (bodyEl) {bodyEl.style.paddingBottom = '';}
        }, 250);
    }
    /** Phones: a spot from the list goes to the map (its card), the panel steps aside */
    function spotOnMap(s: Spot) {
        openSpot(s, false, false);
        modalOpen = false;
        showSpotCard(s);
    }

    /**
     * Windy listens to the keyboard on the whole page (typing jumps to its search, space plays the timeline).
     * While you type in one of Spotlog's fields, the keys stay with that field.
     */
    function keepKeys(e: KeyboardEvent) {
        const t = e.target as HTMLElement | null;
        if (!t) {return;}
        const editable = t.isContentEditable || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'range', 'file'].includes((t as HTMLInputElement).type));
        if (editable && e.key !== 'Escape') {e.stopPropagation();}
    }

    /*
     * Phones: errors are invisible there (no console), so while we test on real phones Spotlog shows its own
     * errors in a small box at the top of the screen. Only errors from Spotlog's code, not Windy's.
     */
    let errBox: HTMLElement | null = null;
    function showPhoneError(msg: string) {
        if (!isMobile) {return;}
        try {
            if (!errBox) {
                errBox = document.createElement('div');
                errBox.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top,0px));z-index:3000;padding:10px 12px;border-radius:12px;background:#5a1f24;color:#fff;font:12px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)';
                errBox.addEventListener('click', () => { errBox?.remove(); errBox = null; });
                document.body.appendChild(errBox);
            }
            errBox.textContent = `Spotlog ${version} problem (tap to hide): ${msg}`;
        } catch {
            /* nothing more we can do */
        }
    }
    const fromSpotlog = (stack: string, file: string) => /plugin(\.min)?\.js|spotlog/i.test(file + ' ' + stack);
    const onWinError = (e: ErrorEvent) => {
        if (fromSpotlog(String(e.error?.stack || ''), e.filename || '')) {showPhoneError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`);}
    };
    const onRejection = (e: PromiseRejectionEvent) => {
        const r = e.reason as Error | undefined;
        if (r && fromSpotlog(String(r.stack || ''), '')) {showPhoneError(String(r.message || r));}
    };
    if (isMobile) {
        window.addEventListener('error', onWinError);
        window.addEventListener('unhandledrejection', onRejection);
    }


    /* ---------- Windy account: Spotlog is for logged-in Premium users ---------- */
    interface WindyUser { id: number; username?: string; email?: string }
    const readWindyUser = (): WindyUser | null => {
        try {
            const u = store.get('user') as WindyUser | null;
            return u && u.id ? u : null;
        } catch {
            return null;
        }
    };
    const readPremium = (): boolean => {
        try {
            return store.get('subscription') === 'premium';
        } catch {
            return false;
        }
    };
    let wUser = readWindyUser();
    let premium = readPremium();
    $: gate = !wUser ? 'login' : !premium ? 'premium' : null;
    useWindyUser(wUser?.id);

    let data: SpotlogData = load();
    /** ids present at the last save: anything missing now was deleted (-> tombstone, so sync won't bring it back) */
    const allIds = (d: SpotlogData) => new Set([...d.spots, ...d.snapshots, ...d.sessions, ...d.gear].map(x => x.id));
    let knownIds = allIds(data);
    let storageWarned = false;
    let view: View = 'home';
    let hist: Frame[] = [];
    let tab: 'spots' | 'sessions' | 'gear' | 'about' = 'spots';
    let sessView: 'list' | 'cal' = 'list';
    let showUnits = false;
    let spot: Spot | null = null;
    let snap: Snapshot | null = null;
    let snapNote = '';
    let snapDraft = false;
    /** the spot chooser on a forecast is open */
    let linkOpen = false;
    /** saving this forecast would replace this older one for the same spot (asks first) */
    let replaceOf: Snapshot | null = null;
    /** model shown on the spot page: ECMWF by default, any model available there */
    let spotModel = 'ecmwf';
    let modelsBySpot: Record<string, string[]> = {};
    let compactMarkers = false;
    let mapReady = false;
    let place: Loc | null = null;
    let placeNow: ModelValue | null = null;
    let placeWaves: WaveValue | null = null;
    let placeLoading = false;
    let pickFor: PickFor = 'snap';
    let waitingForMap = false;
    let sf: SpotForm | null = null;
    let sfReturn: 'log' | 'snap' | null = null;
    let f: LogForm | null = null;
    let trackError = '';
    /** the next days per spot (the spot's model, hour by hour), Windy's predictability per day and today's tides */
    type Outlook = { hours: Hour[]; pred: Record<string, number>; tide: TideDay | null };
    let outlookBySpot: Record<string, Outlook | 'loading'> = {};
    /** adjusting "What works here" for one sport: the inputs, in your units */
    let editSport: string | null = null;
    let editRows: Record<string, { lo: string; hi: string; dirs: Dir8[] }> = {};
    /** the rest of today per spot (ECMWF, hour by hour) for the best window */
    let dayBySpot: Record<string, Hour[]> = {};
    let nowBySpot: Record<string, Now | 'loading'> = {};
    let capturing = false;
    let armed: '' | 'spot' | 'all' = '';
    let armTimer: ReturnType<typeof setTimeout> | undefined;
    let gearSport = 'Windsurf';
    let gearKind = 'Board';
    let captureError = '';
    let captureErrorDay = '';
    // account sync
    const cloudOn = cloudAvailable();
    let syncState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
    let syncAt = 0;
    let syncError = '';
    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    let recaptureTimer: ReturnType<typeof setTimeout> | undefined;
    let gearName = '';
    let toast: { msg: string; undo?: () => void; label?: string } | null = null;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let spotMarkers: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tempMarker: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let trackLayers: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let popup: any = null;
    /** spot whose popup is shown on the map ("Show on map" switched on) */
    let mapShown: string | null = null;

    /* ---------- derived ---------- */
    $: S = data.settings;
    $: unitsLabel = `${windLabel(S.wind)} · ${S.height} · °${S.temp}`;
    $: allSessions = [...data.sessions].sort((a, b) => b.date - a.date);
    $: lastSnap = [...data.snapshots].sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    $: spotSessions = spot ? data.sessions.filter(s => s.spotId === spot?.id).sort((a, b) => b.date - a.date) : [];
    /** "checked, not worth it" days teach the learning but aren't sessions on the water */
    $: realSessions = data.sessions.filter(s => !s.checked);
    $: spotReal = spotSessions.filter(s => !s.checked);
    $: spotSnapshots = spot ? data.snapshots.filter(s => s.spotId === spot?.id).sort((a, b) => b.ts - a.ts) : [];
    $: avgRating = spotReal.length ? (spotReal.reduce((a, s) => a + s.rating, 0) / spotReal.length).toFixed(1) : '–';
    $: bias = spot ? forecastBias(spot, data.sessions, data.snapshots) : null;
    $: scores = spot ? modelScores(spot, data.sessions, data.snapshots) : [];
    $: spotNow = spot ? nowOf(nowKey(spot.id, spotModel), nowBySpot) : null;
    $: spotModels = spot ? modelsBySpot[spot.id] || [] : [];
    // another spot opens with ECMWF again; which models cover it is checked once
    let modelSpotId: string | null = null;
    $: if ((spot?.id ?? null) !== modelSpotId) {
        modelSpotId = spot?.id ?? null;
        spotModel = spot ? modelFor(spot, trustMap) : 'ecmwf';
    }
    $: if (view === 'spot' && spot) {loadModels(spot);}
    $: spotGuess = spot && spotNow ? guess(modelsOf(spot, modelMap), conditionsOf(spotNow.wind, spotNow.waves)) : null;
    $: spotLearned = spot ? modelsOf(spot, modelMap) : [];
    $: spotPred = spotGuess?.rating ?? null;
    $: spotBest = spot ? bestOf(spot) : null;
    $: spotTide = spot ? bestTide(spotReal.map(x => ({ rating: x.rating, ...sessionTide(x, data.snapshots) }))) : null;
    $: spotLearnedWindow = spot && !spot.windUnknown ? learnedWindow(spot, spotLearned[0]) : null;
    $: spotGear = spot ? gearHints(samplesFor(spot, data.sessions, data.snapshots, modelFor(spot, trustMap))) : [];
    $: spotOutlook = spot ? outlookOf(spot.id, outlookBySpot) : null;
    $: spotDays = spot && spotOutlook ? nextDays(spotLearned, spotOutlook.hours) : [];
    /** no forecast saved here today: today's session couldn't teach spotlog */
    $: savedToday = spot ? spotSnapshots.some(sn => new Date(sn.savedAt).toDateString() === new Date().toDateString()) : true;
    $: suggestion = spot && spot.windUnknown ? suggestWindow(spot, data.sessions, data.snapshots) : null;
    $: goodCount = spot ? samplesFor(spot, data.sessions, data.snapshots).filter(x => x.rating >= 4).length : 0;
    $: hoursOnWater = Math.round(realSessions.reduce((a, s) => a + sessionHours(s), 0));
    $: logSnap = f?.snapshotId ? data.snapshots.find(x => x.id === f?.snapshotId) || null : null;
    // what the snapshot card shows while logging: the saved day read at the session time
    $: logView = logSnap && f ? viewFor(logSnap, sessionFocus(f)) : null;
    $: logPrimary = logView ? logView.models.find(m => m.model === logSnap?.primary) || logView.models[0] || null : null;
    $: if (view === 'log' && f) {scheduleRecapture(f.dateStr, f.start, f.end);}
    $: gearGroups = groupGear(data.gear, GEAR_SPORTS);
    $: logGearGroups = f ? groupGear(data.gear, [...(spotById(f.spotId)?.sports || []), ...GEAR_SPORTS]) : [];
    $: synced = cloudOn && !!wUser;
    $: syncLabel = syncState === 'saving' ? W.syncSaving : syncState === 'error' ? W.syncError : syncAt ? fill(W.syncAt, { time: fmtTime(syncAt) }) : W.syncLinked;
    $: logFc = logPrimary?.wind != null ? roundToStep(feltTo(logPrimary.wind, S.wind)) : null;
    $: feltStep = S.wind === 'bft' ? 0.5 : windStep(S.wind);
    $: feltMax = Math.max(baseMax(S.wind), logFc !== null ? Math.ceil((logFc * 1.4) / (feltStep * 5)) * feltStep * 5 : 0);
    $: closest = logView && f && f.felt !== null ? closestModel({ models: logView.models } as Snapshot, feltFrom(f.felt, S.wind)) : null;
    $: nearSpot = place ? nearestWithin(place.lat, place.lon, 5) : null;
    $: spotsByCentre = view === 'pick' ? nearestSpots(centre().lat, centre().lon) : [];
    let mapTs = currentTs();
    $: timelineLabelFull = fmtDayTime(mapTs);
    $: hdr = headerFor(view, spot, snap, f, sf, place, pickFor, snapDraft, W);
    let tsListener: number | null = null;
    let userListener: number | null = null;
    let subsListener: number | null = null;

    /* ---------- helpers ---------- */
    const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
    const spotById = (id: string | null) => (id ? data.spots.find(s => s.id === id) : undefined);
        const baseMax = (u: string) => ({ ms: 20, kt: 40, kmh: 70, mph: 45, bft: 10 } as Record<string, number>)[u] || 20;
    const roundToStep = (v: number) => Math.round(v / windStep(S.wind)) * windStep(S.wind);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStrOf = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const hhmmOf = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes() - (d.getMinutes() % 5))}`; };
    const escapeHtml = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
    const gearUse = (id: string) => data.sessions.filter(s => s.gearIds?.includes(id)).length;

    /**
     * Phones: Windy's bottom panel listens for swipes (to close or resize it). While Spotlog's content can still
     * scroll in the swipe direction, keep the swipe for scrolling and don't let it bubble up to Windy.
     */
    let touchY = 0;
    let touchX = 0;
    function touchStart(e: TouchEvent) {
        touchY = e.touches[0]?.clientY ?? 0;
        touchX = e.touches[0]?.clientX ?? 0;
        fieldTouchStart(e);
    }
    function touchMove(e: TouchEvent) {
        const y = e.touches[0]?.clientY ?? 0;
        const dy = touchY - y; // > 0: finger moves up = scroll down
        // sideways moves (the felt ruler, a wobbly finger) stay inside Spotlog: the panel doesn't slide around
        if (Math.abs((e.touches[0]?.clientX ?? 0) - touchX) > Math.abs(dy)) {
            e.stopPropagation();
            return;
        }
        let el = e.target as HTMLElement | null;
        // the nearest scrollable box between the finger and the panel (usually the panel itself)
        while (el && el !== root && !(el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))) {el = el.parentElement;}
        const box = el || root;
        const canScroll = dy > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : box.scrollTop > 0;
        if (canScroll) {e.stopPropagation();}
    }
    const deviceTz = (): string | undefined => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return undefined;
        }
    };
    /** another Windy account logged in (or out): switch to that account's diary */
    function onWindyUser(u: WindyUser | null) {
        const changed = (u?.id || null) !== (wUser?.id || null);
        wUser = u && u.id ? u : null;
        if (!changed) {return;}
        useWindyUser(wUser?.id);
        data = load();
        knownIds = allIds(data);
        syncAt = 0;
        goHome();
        if (wUser) {syncNow();}
    }
    const gearHint = (sport: string, kind: string) => GEAR_BY_SPORT[sport]?.find(k => k.kind === kind)?.hint || 'Name';
    function groupGear(list: Gear[], order: string[]): { sport: string; items: Gear[] }[] {
        const sports = Array.from(new Set([...order.filter(x => GEAR_SPORTS.includes(x)), ...GEAR_SPORTS, 'Other']));
        return sports
            .map(sp => ({ sport: sp, items: list.filter(g => (g.sport || 'Other') === sp) }))
            .filter(g => g.items.length);
    }
    /** The moment a session is about: middle of start–end, or the start, on the chosen date */
    function sessionFocus(lf: LogForm): number | null {
        if (!lf.start) {return null;}
        const a = new Date(`${lf.dateStr}T${lf.start}`).getTime();
        if (!isFinite(a)) {return null;}
        if (lf.end) {
            let b = new Date(`${lf.dateStr}T${lf.end}`).getTime();
            if (b < a) {b += 864e5;}
            return a + (b - a) / 2;
        }
        return a;
    }
    function viewFor(sn: Snapshot, focus: number | null) {
        if (focus !== null && covers(sn.series, focus) && sn.series) {
            const at = seriesAt(sn.series, focus);
            return { ts: at.models[0]?.ts ?? focus, models: at.models, waves: at.waves, matches: true, otherDay: false, note: '' };
        }
        const otherDay = focus !== null && dateStrOf(focus) !== dateStrOf(sn.ts);
        const outside = focus !== null && !otherDay && !!sn.series;
        const note = focus === null
            ? (sn.series ? w('logFollow') : '')
            : otherDay ? tr('logOtherDay', { day: fmtDay(sn.ts) })
            : outside ? (focus < sn.series!.ts[0] ? tr('logSavedAfter', { time: fmtTime(sn.series!.ts[0]) }) : w('logAfter24'))
            : w('logOld');
        return { ts: sn.ts, models: sn.models, waves: sn.waves, matches: false, otherDay: otherDay || outside, note };
    }
    /** the model each spot uses: the most accurate one there (3+ sessions with "felt like"), else ECMWF */
    $: trustMap = new Map<string, string>(data.spots.map(s => [s.id, trustedModel(s, data.sessions, data.snapshots)]));
    const modelFor = (s: Spot, _dep = trustMap): string => _dep.get(s.id) || 'ecmwf';
    /** conditions-now cache: the spot's own model under the spot id (tiles, map), other models as id:model (spot page) */
    const nowKey = (id: string, model: string) => (model === (trustMap.get(id) || 'ecmwf') ? id : `${id}:${model}`);
    const outlookOf = (id: string, _dep = outlookBySpot): Outlook | null => { const o = _dep[id]; return o && o !== 'loading' ? o : null; };
    function nowOf(id: string, _dep = nowBySpot): Now | null {
        const n = _dep[id];
        return n && n !== 'loading' ? n : null;
    }
    /** each spot's sessions with their forecast, worked out once per change of the diary */
    /** what spotlog has learned per spot and sport, worked out once per change of the diary */
    $: ownAvg = ownAverage(data.sessions);
    $: modelMap = new Map<string, SportModel[]>(data.spots.map(s => {
        const m = modelFor(s, trustMap);
        // sessions here, plus those at spots next door (half weight, same sports)
        const near = nearbySpots(s, data.spots).flatMap(o => samplesFor(o, data.sessions, data.snapshots, m, 0.5)).filter(x => s.sports.includes(x.sport));
        const samples = [...samplesFor(s, data.sessions, data.snapshots, m), ...near];
        return [s.id, learnSpot(s, samples, { bias: forecastBias(s, data.sessions, data.snapshots), startRating: s.startOwn && ownAvg !== null ? ownAvg : undefined })];
    }));
    const modelsOf = (s: Spot, _dep = modelMap): SportModel[] => _dep.get(s.id) || [];
    const sessionsOf = (s: Spot, _dep = modelMap): number => modelsOf(s, _dep).reduce((a, m) => a + m.sessions, 0);
    $: guessOf = (s: Spot): Guess | null => {
        const n = nowBySpot[s.id];
        return n && n !== 'loading' ? guess(modelsOf(s, modelMap), conditionsOf(n.wind, n.waves)) : null;
    };
    /** the best stretch of the rest of today (ECMWF), so a good evening shows up in the afternoon already */
    $: bestOf = (s: Spot): DayBest | null => {
        const h = dayBySpot[s.id];
        return h ? bestToday(modelsOf(s, modelMap), h) : null;
    };
    $: ratingHint = (s: Spot): string => {
        const n = Math.max(1, MIN_SAMPLES - sessionsOf(s, modelMap));
        return n === 1 ? W.ratingAfterOne : fill(W.ratingAfterMany, { n });
    };
    /** what a guess is based on: "from 4 sessions here", "from your wind window" (+ the sport at multi-sport spots) */
    $: guessNote = (g: { sessions: number; learned: boolean; sport: string; rating?: number | null } | null, s: Spot | null): string => {
        if (!g || !s) {return '';}
        const sp = s.sports.length > 1 ? sportLbl(g.sport) + ' · ' : '';
        if (g.rating === null) {return sessionsOf(s, modelMap) < MIN_SAMPLES ? ratingHint(s) : W.badgeNone;}
        return sp + (g.learned ? (g.sessions === 1 ? W.badgeFromOne : fill(W.badgeFrom, { n: g.sessions })) : W.badgeWindow);
    };
    /** "great · 18:00" for a window later today; just the word when it's on now */
    $: bestTag = (b: DayBest): string => guessLbl(b.rating) + (b.now ? '' : ' · ' + fmtTime(b.start));
    /* ---------- what works here: one row per condition ---------- */
    $: paramName = (k: ParamKey): string => W['param' + k[0].toUpperCase() + k.slice(1)];
    $: rangeText = (p: ParamModel): string => {
        if (p.centres) {return p.from === 'window' && spot ? dirsLabel(spot.dirs) : dirsLabel(dirsOfParam(p));}
        const lo = p.lo ?? 0;
        const hi = p.hi ?? 0;
        if (p.key === 'wind' || p.key === 'gust') {
            if (p.lo === undefined && p.hi !== undefined) {return fill(W.upTo, { v: `${fmtWind0(hi, S.wind)} ${windLabel(S.wind)}` });}
            if (p.hi === undefined && p.lo !== undefined) {return fill(W.from, { v: `${fmtWind0(lo, S.wind)} ${windLabel(S.wind)}` });}
            return `${fmtWind0(lo, S.wind)}–${fmtWind0(hi, S.wind)} ${windLabel(S.wind)}`;
        }
        const fmt = (k: ParamKey, v: number) => (k === 'period' ? `${Math.round(v)}` : k === 'temp' ? fmtTemp(v, S.temp).replace(/\s*°.*/, '') : k === 'rain' || k === 'power' ? `${Math.round(v * 10) / 10}` : fmtHeight(v, S.height));
        const unit = p.key === 'period' ? 's' : p.key === 'temp' ? `°${S.temp}` : p.key === 'rain' ? 'mm' : p.key === 'power' ? 'kW/m' : S.height;
        if (p.lo === undefined && p.hi !== undefined) {return fill(W.upTo, { v: `${fmt(p.key, hi)} ${unit}` });}
        if (p.hi === undefined && p.lo !== undefined) {return fill(W.from, { v: `${fmt(p.key, lo)} ${unit}` });}
        return `${fmt(p.key, lo)}–${fmt(p.key, hi)} ${unit}`;
    };
    $: nowText = (k: ParamKey, v: number): string =>
        k === 'dir' || k === 'swellDir' ? dirName(v) : k === 'wind' || k === 'gust' ? `${fmtWind0(v, S.wind)} ${windLabel(S.wind)}`
            : k === 'period' ? `${Math.round(v)} s` : k === 'temp' ? fmtTemp(v, S.temp) : k === 'rain' ? `${Math.round(v * 10) / 10} mm`
                : k === 'power' ? `${Math.round(v * 10) / 10} kW/m` : fmtHeight(v, S.height, true);
    /** one line per sport for the folded "What works here": "8–13 m/s · W–SW" */
    $: worksLine = (m: SportModel): string => {
        const wnd = m.params.find(p => p.key === (m.sport === 'Surf' ? 'swell' : 'wind'));
        const dir = m.params.find(p => p.key === (m.sport === 'Surf' ? 'swellDir' : 'dir'));
        return [wnd && rangeText(wnd), dir && rangeText(dir)].filter(Boolean).join(' · ');
    };
    /** "✓ wind ✓ wind from ✕ waves" for the map card */
    $: whyLine = (g: Guess | null): string =>
        g ? g.parts.slice(0, 4).map(x => `${x.fit >= 0.99 ? '✓' : x.fit > 0 ? '~' : '✕'} ${paramName(x.key).toLowerCase()}`).join('  ') : '';
    $: spotParts = (m: SportModel) => {
        const g = spotNow ? guessSport(m, conditionsOf(spotNow.wind, spotNow.waves)) : null;
        return m.params.map(p => ({ p, part: g?.parts.find(x => x.key === p.key) || null }));
    };
    /** what decides the day here (matters or more, most first; at least two) and what is only checked too */
    $: spotGroups = (m: SportModel) => {
        const rows = [...spotParts(m)].sort((a, b) => b.p.importance - a.p.importance);
        let n = rows.filter(r => r.p.importance >= 0.35).length;
        if (n < Math.min(2, rows.length)) {n = Math.min(2, rows.length);}
        return { decides: rows.slice(0, n), also: rows.slice(n) };
    };
    $: bestRange = (b: DayBest): string => (b.now ? fill(W.todayUntil, { time: fmtTime(b.end) }) : fmtTime(b.start) + '–' + fmtTime(b.end));
    $: tideText = (t: { tide: string | null; move: string | null }): string =>
        [t.tide ? W['tide' + t.tide].toLowerCase() : '', t.move ? W['tide' + t.move].toLowerCase() : ''].filter(Boolean).join(', ');
    function primaryOf(sn: Snapshot): ModelValue | null {
        return sn.models.find(m => m.model === sn.primary) || sn.models[0] || null;
    }
    function closestModel(sn: Snapshot, ms: number): ModelValue | null {
        let best: ModelValue | null = null;
        for (const m of sn.models) {
            if (m.wind === null) {continue;}
            if (!best || Math.abs(m.wind - ms) < Math.abs((best.wind as number) - ms)) {best = m;}
        }
        return best;
    }
    function durationH(a: string, b: string): number {
        if (!a || !b) {return 0;}
        const [ah, am] = a.split(':').map(Number);
        const [bh, bm] = b.split(':').map(Number);
        const d = (bh * 60 + bm - (ah * 60 + am)) / 60;
        return d > 0 ? d : 0;
    }
    const sessionHours = (s: Session) => durationH(s.start, s.end) || (s.track ? s.track.durationMin / 60 : 0);
    const feltLine = (se: Session): string => {
        if (se.felt === null) {return '';}
        const sn = data.snapshots.find(x => x.id === se.snapshotId);
        const p = sn ? primaryOf(sn) : null;
        const felt = fmtWind0(se.felt, S.wind);
        return p && p.wind !== null ? `${fmtWind0(p.wind, S.wind)} → ${felt} ${windLabel(S.wind)}` : `${felt} ${windLabel(S.wind)}`;
    };
    function nearestSpots(lat: number, lon: number): Spot[] {
        return [...data.spots].sort((a, b) => distanceKm(a, { lat, lon }) - distanceKm(b, { lat, lon }));
    }
    function nearestWithin(lat: number, lon: number, km: number): { s: Spot; d: number } | null {
        const n = data.spots.map(s => ({ s, d: distanceKm(s, { lat, lon }) })).sort((a, b) => a.d - b.d)[0];
        return n && n.d < km ? n : null;
    }
    function currentTs(): number {
        try {
            return (store.get('timestamp') as number) || Date.now();
        } catch {
            return Date.now();
        }
    }
    function currentModel(): string {
        try {
            const p = store.get('product') as string;
            return ALL_MODELS.includes(p) ? p : 'ecmwf';
        } catch {
            return 'ecmwf';
        }
    }
    function centre(): { lat: number; lon: number } {
        try {
            const c = map?.getCenter?.();
            if (c && typeof c.lat === 'number') {return { lat: c.lat, lon: c.lng };}
        } catch {
            /* no map */
        }
        return data.spots[0] ? { lat: data.spots[0].lat, lon: data.spots[0].lon } : { lat: 0, lon: 0 };
    }
    async function placeName(lat: number, lon: number): Promise<string> {
        try {
            const r = await reverse?.get?.({ lat, lon });
            return r?.name || '';
        } catch {
            return '';
        }
    }
    function headerFor(v: View, sp: Spot | null, sn: Snapshot | null, lf: LogForm | null, sform: SpotForm | null, pl: Loc | null, pf: PickFor, draft = false, _words = W) {
        switch (v) {
            case 'pick': return { title: w(pf === 'snap' ? 'hdrPickSnap' : pf === 'log' ? 'hdrPickLog' : 'hdrPickSpot'), sub: w(pf === 'spot' ? 'hdrPickSubSpot' : 'hdrPickSub') };
            case 'place': return { title: pl?.name === 'Dropped pin' ? w('droppedPin') : pl?.name || w('hdrPlace'), sub: pl ? `${pl.lat.toFixed(3)}, ${pl.lon.toFixed(3)}` : '' };
            case 'spotForm': return { title: w(sform?.id ? 'hdrSpotEdit' : 'hdrSpotNew'), sub: sform?.place || w('droppedPin') };
            case 'spot': return { title: w('hdrSpot'), sub: `${tr('hdrSpotSub', { n: spotSessions.length })}${sp?.place ? ' · ' + sp.place : ''}` };
            case 'snap': return { title: w(draft ? 'hdrSnapNew' : 'hdrSnapSaved'), sub: spotById(sn?.spotId ?? null)?.name || w('noSpot') };
            case 'log': return { title: w(lf?.id ? 'hdrLogEdit' : 'hdrLogNew'), sub: spotById(lf?.spotId ?? null)?.name || w('noSpotYet') };
            default: return { title: '', sub: '' };
        }
    }
    /**
     * Desktop: back to Windy's own menu. Only asks for the menu: Windy shows one right-hand pane at a time,
     * so the menu takes Spotlog's place directly (closing Spotlog first made it slide out and the menu slide in).
     */
    function toWindyMenu() {
        try {
            bcast.emit('rqstOpen', 'menu');
        } catch (e) {
            console.info('[spotlog] could not open the Windy menu', e);
        }
    }
    function showToast(msg: string, undo?: () => void, label?: string) {
        toast = { msg, undo, label };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (toast = null), undo ? 6000 : 2600);
    }
    function runUndo() {
        const u = toast?.undo;
        toast = null;
        clearTimeout(toastTimer);
        u?.();
    }
    function arm(what: 'spot' | 'all'): boolean {
        if (armed === what) {
            armed = '';
            return true;
        }
        armed = what;
        clearTimeout(armTimer);
        armTimer = setTimeout(() => (armed = ''), 3500);
        return false;
    }
    function persist() {
        const now = Date.now();
        const cur = allIds(data);
        const deleted = { ...(data.deleted || {}) };
        const revived = { ...(data.revived || {}) };
        knownIds.forEach(id => { if (!cur.has(id)) {deleted[id] = now;} });
        // undo brings an item back: remembered, so another open tab doesn't delete it again
        cur.forEach(id => { if (deleted[id]) { delete deleted[id]; revived[id] = now; } });
        knownIds = cur;
        data.deleted = deleted;
        data.revived = revived;
        data.updatedAt = now;
        if (!save(data) && !storageWarned) {
            storageWarned = true;
            showToast(w(synced ? 'toastFullSynced' : 'toastFull'));
        }
        data = data;
        drawSpotMarkers();
        schedulePush();
    }

    /* ---------- sync with the Windy account (no separate login) ---------- */
    const windyAuth = (): WindyAuth | null => {
        if (!wUser) {return null;}
        let token: string | null = null;
        try {
            token = (store.get('userToken') as string | null) || null;
        } catch {
            /* no token */
        }
        return { id: wUser.id, token };
    };
    function schedulePush() {
        if (!synced) {return;}
        clearTimeout(pushTimer);
        pushTimer = setTimeout(async () => {
            const a = windyAuth();
            if (!a) {return;}
            syncState = 'saving';
            try {
                await push(a, data);
                syncState = 'saved';
                syncAt = Date.now();
            } catch (e) {
                syncState = 'error';
                syncError = (e as Error).message;
                pushTimer = setTimeout(schedulePush, 30e3);
            }
        }, 1200);
    }
    /** Merges this browser's diary with the one stored for this Windy user (by id, newer wins, deletions stay deleted) */
    async function syncNow() {
        const a = windyAuth();
        if (!cloudOn || !a) {return;}
        syncState = 'saving';
        try {
            const remote = await pull(a);
            if (remote) {
                const r = normalise(remote.data);
                r.updatedAt = Math.max(r.updatedAt || 0, remote.updatedAt || 0);
                data = mergeData(r, data);
            }
            data.updatedAt = Date.now();
            knownIds = allIds(data);
            save(data);
            await push(a, data);
            data = data;
            drawSpotMarkers();
            loadAllNow();
            syncState = 'saved';
            syncAt = Date.now();
        } catch (e) {
            syncState = 'error';
            syncError = (e as Error).message;
        }
    }
    /** Another Windy tab saved the diary: merge it in, so two open tabs never overwrite each other */
    const sig = (d: SpotlogData) => JSON.stringify([[...allIds(d)].sort(), Object.keys(d.deleted || {}).sort(), Object.keys(d.revived || {}).sort(), d.settings]);
    function onStorage(e: StorageEvent) {
        if (e.key !== storageKey() || !e.newValue) {return;}
        try {
            const other = normalise(JSON.parse(e.newValue));
            const merged = mergeData(other, data);
            data = merged;
            knownIds = allIds(data);
            if (sig(merged) !== sig(other)) {save(merged);}
            drawSpotMarkers();
        } catch (err) {
            console.info('[spotlog] could not read the other tab\'s data', err);
        }
    }
    function setSettings(s: SettingsT) {
        data.settings = s;
        persist();
    }

    /* ---------- beta: the diary lives in this browser; a downloaded copy can be uploaded again ---------- */
    async function onUpload(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) {return;}
        try {
            data = await importJson(file, data);
            persist();
            drawSpotMarkers();
            loadAllNow();
            showToast(tr('toastImported', { spots: data.spots.length, sessions: data.sessions.length }));
        } catch {
            showToast(w('toastImportFail'));
        }
    }

    /* ---------- welcome: once, the first time someone new opens spotlog ---------- */
    let previewWelcome = false; // the Style Lab can show it
    $: welcome = !gate && (previewWelcome || (!data.settings.welcomed && !data.spots.length && !data.sessions.length && !data.snapshots.length && !data.gear.length));
    let welcomeOpened = false;
    $: if (welcome && barMode && mapReady && !welcomeOpened) {
        welcomeOpened = true;
        setTimeout(openModal, 250);
    }
    function finishWelcome() {
        previewWelcome = false;
        if (!data.settings.welcomed) {setSettings({ ...data.settings, welcomed: true });}
    }
    function openHowItWorks() {
        tab = 'about';
        if (barMode) {openTab('about');}
    }

    /* ---------- map ---------- */
    function clearTemp() {
        tempMarker?.remove();
        tempMarker = null;
    }
    function clearPopup() {
        const p = popup;
        popup = null; // first, so its 'remove' handler knows this was on purpose
        mapShown = null;
        if (!p) {return;}
        // fade it out, then take it off the map
        const el: HTMLElement | null = p.getElement?.() || null;
        if (el && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            el.classList.add('sl-closing');
            setTimeout(() => p.remove(), 170);
        } else {
            p.remove();
        }
    }
    function setTemp(lat: number, lon: number) {
        clearTemp();
        if (typeof L !== 'undefined' && map) {tempMarker = new L.Marker({ lat, lng: lon }, { icon: markers?.pulsatingIcon }).addTo(map);}
    }
    /** Zoomed out, spots and sessions become plain dots: a map of everywhere you've been */
    const compactBelow = () => THEME.compactBelow;
    function onMapZoom() {
        let z = 10;
        try {
            z = map?.getZoom?.() ?? 10;
        } catch {
            /* no zoom */
        }
        const c = z < compactBelow();
        if (isMobile && c && mapShown) {clearPopup();}
        if (c !== compactMarkers) {
            compactMarkers = c;
            drawSpotMarkers();
        }
    }
    /** Sessions grouped by place (about 100 m), every session counts: the heat layer on the map */
    function sessionPlaces(): { lat: number; lon: number; list: Session[] }[] {
        const groups = new Map<string, { lat: number; lon: number; list: Session[] }>();
        for (const se of data.sessions.filter(x => !x.checked).sort((a, b) => b.date - a.date)) {
            const sp = spotById(se.spotId);
            const lat = se.lat ?? se.track?.points[0]?.[0] ?? sp?.lat;
            const lon = se.lon ?? se.track?.points[0]?.[1] ?? sp?.lon;
            if (lat === undefined || lon === undefined) {continue;}
            const k = `${lat.toFixed(3)},${lon.toFixed(3)}`;
            const g = groups.get(k);
            if (g) {g.list.push(se);}
            else {groups.set(k, { lat, lon, list: [se] });}
        }
        return [...groups.values()];
    }
    function sessionTip(list: Session[]): string {
        const sp = spotById(list[0].spotId);
        const head = `<b>${escapeHtml(sp?.name || w('tipYour'))}</b>${list.length > 1 ? ` · ${escapeHtml(tr('tipSessions', { n: list.length }))}` : ''}`;
        const rows = list.slice(0, 5).map(se => `<span><i style="background:${ratingBg(se.rating)}"></i>${escapeHtml(fmtDay(se.date))} · ${escapeHtml(w('rate' + se.rating))}</span>`).join('');
        return head + rows + (list.length > 5 ? `<small>${escapeHtml(tr('tipMore', { n: list.length - 5 }))}</small>` : '');
    }
    /** many changes in one go (conditions arriving for 10 spots) redraw the pins once */
    let drawQueued = false;
    let destroyed = false;
    function drawSpotMarkers() {
        if (drawQueued) {return;}
        drawQueued = true;
        queueMicrotask(() => {
            drawQueued = false;
            if (!destroyed) {drawSpotMarkersNow();}
        });
    }
    function drawSpotMarkersNow() {
        spotMarkers.forEach(m => m.remove());
        spotMarkers = [];
        if (typeof L === 'undefined' || !map) {return;}
        const st = data.settings;
        const activeId = view === 'spot' ? spot?.id : view === 'log' ? f?.spotId : view === 'snap' ? snap?.spotId : null;
        if (st.mapSessions) {
            // just a glow, no click: many sessions at one place overlap and get brighter (heat map feel); hover for dates
            for (const p of sessionPlaces()) {
                const mark = sessionMarkStyle(p.list.length);
                if (!mark) {break;}
                const core = THEME.sessCore && THEME.sessStyle !== 'dot' ? ' core' : '';
                const icon = L.divIcon({
                    className: 'spotlog-marker',
                    html: `<div class="spotlog-heat${core}" style="${mark.css}"><div class="spotlog-tip">${sessionTip(p.list)}</div></div>`,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0],
                });
                spotMarkers.push(new L.Marker({ lat: p.lat, lng: p.lon }, { icon, keyboard: false, zIndexOffset: -1000 }).addTo(map));
            }
        }
        for (const s of data.spots) {
            const on = activeId === s.id;
            if (!st.mapSpots && !on) {continue;}
            // the pin sits on top of its own glow, so hovering the pin shows that spot's sessions
            const here = st.mapSessions ? data.sessions.filter(x => x.spotId === s.id && !x.checked).sort((a, b) => b.date - a.date) : [];
            const tip = here.length ? `<div class="spotlog-tip">${sessionTip(here)}</div>` : '';
            // a spot whose guess reaches the chosen level lights up in the guess colour; otherwise it stays grey
            // lights up when the rest of today has a good stretch; "great 18:00" when it's later on
            const best = bestOf(s);
            const pred = best?.rating ?? null;
            const good = lightsUp(pred) && shownLevel(pred) > 0;
            const [gb, gf] = good ? guessColours(pred as number) : ['', ''];
            const word = good && THEME.goodWord ? `<em>${escapeHtml(w('rate' + shownLevel(pred)))}${best && !best.now ? ' ' + escapeHtml(fmtTime(best.start)) : ''}</em>` : '';
            let html: string;
            if (compactMarkers) {
                // zoomed out: a plain dot, guess colour or grey (outline only if the theme turns it on)
                html = `<div class="spotlog-cdot" style="background:${good ? gb : 'var(--sl-compact-dot)'}">${tip || `<div class="spotlog-tip"><b>${escapeHtml(s.name)}</b></div>`}</div>`;
            } else if (on) {
                // selected: its own label colour; the dot shows the conditions
                html = `<div class="spotlog-pin active"><i style="background:${good ? gb : 'var(--sl-active-dot)'}"></i>${escapeHtml(s.name)}${word}${tip}</div>`;
            } else {
                let style = '';
                let dot = '';
                if (good && THEME.goodStyle === 'pin') { style = `background:${gb};color:${gf};`; dot = gf; }
                if (good && THEME.goodStyle === 'dot') {dot = gb;}
                if (good && THEME.goodStyle === 'outline') { style = `box-shadow:0 0 0 2px ${gb}, 0 2px 8px rgba(0,0,0,.35);`; dot = gb; }
                html = `<div class="spotlog-pin${good ? ' good' : ''}" style="${style}"><i${dot ? ` style="background:${dot}"` : ''}></i>${escapeHtml(s.name)}${word}${tip}</div>`;
            }
            const icon = L.divIcon({ className: 'spotlog-marker', html, iconSize: [0, 0], iconAnchor: [0, 0] });
            const m = new L.Marker({ lat: s.lat, lng: s.lon }, { icon }).addTo(map);
            m.on('click', () => onMapPick({ lat: s.lat, lon: s.lon }, s));
            spotMarkers.push(m);
        }
    }
    // conditions arrive one spot at a time: redraw so good spots light up
    $: if (nowBySpot && dayBySpot && modelMap && mapReady) {drawSpotMarkers();}
    function drawTrack(t: Track | null, fit = false) {
        trackLayers.forEach(l => l.remove());
        trackLayers = [];
        if (!t || !t.points.length || typeof L === 'undefined' || !map) {return;}
        try {
            // route colours and widths come from the theme (a thin line with a faint edge)
            const casing = L.polyline(t.points, { color: THEME.casingColor, weight: THEME.routeWidth + THEME.casingWidth * 2, opacity: THEME.casingWidth > 0 ? THEME.casingAlpha : 0, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
            const line = L.polyline(t.points, { color: THEME.routeColor, weight: THEME.routeWidth, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
            const first = t.points[0];
            const last = t.points[t.points.length - 1];
            const dot = (cls: string) => L.divIcon({ className: 'spotlog-marker', html: `<div class="spotlog-dot ${cls}"></div>`, iconSize: [0, 0], iconAnchor: [0, 0] });
            const start = new L.Marker({ lat: first[0], lng: first[1] }, { icon: dot('start'), interactive: false }).addTo(map);
            const end = new L.Marker({ lat: last[0], lng: last[1] }, { icon: dot('end'), interactive: false }).addTo(map);
            // label next to the point furthest from the start, so it sits at the outer end of the route
            let far = first;
            let farD = -1;
            for (const pt of t.points) {
                const d = (pt[0] - first[0]) ** 2 + (pt[1] - first[1]) ** 2;
                if (d > farD) { farD = d; far = pt; }
            }
            const h = Math.floor(t.durationMin / 60);
            const m = String(Math.round(t.durationMin % 60)).padStart(2, '0');
            const label = L.divIcon({
                className: 'spotlog-marker',
                html: `<div class="spotlog-route-label">${fmtDistance(t.distanceKm, S.height)} · ${h}:${m} h</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
            });
            const lab = new L.Marker({ lat: far[0], lng: far[1] }, { icon: label, interactive: false }).addTo(map);
            trackLayers = [casing, line, start, end, lab];
            if (fit) {map.fitBounds?.(line.getBounds(), { padding: [60, 60], maxZoom: 15 });}
        } catch (e) {
            console.info('[spotlog] could not draw the track', e);
        }
    }
    function popupHtml(sp: Spot, n: Now | null, loading = false): string {
        const wv = n?.wind;
        const g = n ? guess(modelsOf(sp, modelMap), conditionsOf(n.wind, n.waves)) : null;
        const best = bestOf(sp);
        const tile = (label: string, val: string, bg: string, unit = '') =>
            `<div class="sl-t" style="background:${bg}"><span>${label}</span><b>${val}</b><small>${unit || '&nbsp;'}</small></div>`;
        const many = isMobile && data.spots.length > 1;
        const nav = isMobile
            ? `<span class="sl-nav">${many ? '<button data-act="prev" aria-label="Previous spot">‹</button><button data-act="next" aria-label="Next spot">›</button>' : ''}<button class="sl-x" data-act="close" aria-label="Close">✕</button></span>`
            : '';
        const L = (k: string) => escapeHtml(w(k));
        return `<div class="sl-pop"><div class="sl-h"><span><b>${escapeHtml(sp.name)}</b><small>${L('cardNow')}</small></span>${nav}</div>` +
            (wv ? `<div class="sl-tiles">${tile(L('fcWind'), fmtWind0(wv.wind, S.wind), windColor(wv.wind), windLabel(S.wind))}${tile(L('fcGusts'), fmtWind0(wv.gust, S.wind), windColor(wv.gust), windLabel(S.wind))}${tile(L('fcFrom'), dirName(wv.dir), 'var(--sl-dirTile, #e9e8e3)')}${n?.waves ? tile(L('fcWaves'), fmtHeight(n.waves.waves, S.height), 'var(--sl-wavesTile, #dbe6f2)', S.height) : ''}</div>` : loading ? `<small>${L('cardLoading')}</small>` : `<small>${L('fcEmpty')}</small>`) +
            (wv ? `<small>${fmtTemp(wv.temp, S.temp)}</small>` : '') +
            (g ? `<span class="sl-b" style="background:${guessCol(g.rating)[0]};color:${guessCol(g.rating)[1]}">${escapeHtml(guessLbl(g.rating))}</span>` : '') +
            (g && g.parts.length ? `<small class="sl-why" title="${escapeHtml(w('whyTitle'))}">${escapeHtml(whyLine(g))}</small>` : '') +
            (best && !best.now ? `<small class="sl-best">${L('bestToday')}: <b>${escapeHtml(guessLbl(best.rating))}</b> ${escapeHtml(bestRange(best))}</small>` : '') +
            (isMobile ? `<div class="sl-acts"><button data-act="snap">${L('cardSave')}</button><button data-act="log">${L('cardLog')}</button><button data-act="open">${L('cardDetails')}</button></div>` : '') +
            '</div>';
    }
    /** "Show on map" is a switch: the popup stays at the spot until you switch it off or leave the spot */
    async function toggleShowOnMap(sp: Spot) {
        if (mapShown === sp.id) {
            clearPopup();
            return;
        }
        clearPopup();
        mapShown = sp.id;
        centerMap({ lat: sp.lat, lon: sp.lon, zoom: cardZoom() });
        if (typeof L === 'undefined' || !map || !L.popup) {return;}
        // open right away (it follows the map while Windy moves it); conditions fill in when they arrive
        const cached = nowOf(sp.id);
        openSpotPopup(sp, cached, !cached);
        if (!cached) {
            const n = await loadNow(sp);
            if (mapShown === sp.id && popup) {popup.setContent(popupHtml(sp, n));}
        }
    }
    /**
     * Phones keep the zoom you're at, so going from spot to spot doesn't land you in the middle of the sea.
     * From far out, zoom in a little (9: the coast and the towns around). Desktop: as before.
     */
    function cardZoom(): number {
        if (!isMobile) {return 11;}
        let z = 0;
        try {
            z = map?.getZoom?.() ?? 0;
        } catch {
            /* no zoom */
        }
        return z >= compactBelow() ? z : 9;
    }
    function openSpotPopup(sp: Spot, n: Now | null, loading = false) {
        try {
            // not closed by map clicks or other popups; if Windy still closes it, it comes straight back
            const p = L.popup({ className: 'spotlog-popup', closeButton: false, autoClose: false, closeOnClick: false, autoPan: isMobile, autoPanPadding: [12, 70], offset: [0, -8] })
                .setLatLng([sp.lat, sp.lon])
                .setContent(popupHtml(sp, n, loading));
            popup = p;
            let reopened = 0;
            p.on?.('remove', () => {
                if (popup !== p || mapShown !== sp.id || reopened > 20) {return;}
                reopened++;
                setTimeout(() => { if (popup === p && mapShown === sp.id) {p.openOn(map);} }, 60);
            });
            p.openOn(map);
            const el: HTMLElement | null = p.getElement?.() || null;
            if (el && !el.dataset.slWired) {
                el.dataset.slWired = '1';
                el.addEventListener('click', (e: MouseEvent) => {
                    const b = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
                    if (!b) {return;}
                    e.stopPropagation();
                    cardAction(b.dataset.act || '', sp);
                });
            }
        } catch (e) {
            console.info('[spotlog] popup not available', e);
        }
    }
    /** Phones: the buttons on a spot card */
    function cardAction(act: string, sp: Spot) {
        if (act === 'snap') {saveForecastAt({ lat: sp.lat, lon: sp.lon, spot: sp });}
        else if (act === 'log') {startLog({ spot: sp });}
        else if (act === 'open') {openSpot(sp);}
        else if (act === 'close') {
            clearPopup();
            drawSpotMarkers();
        }
        else if (act === 'prev' || act === 'next') {
            const i = data.spots.findIndex(x => x.id === sp.id);
            const n = data.spots[(i + (act === 'next' ? 1 : data.spots.length - 1)) % data.spots.length];
            if (n) {
                openSpot(n, false, !barMode);
                showSpotCard(n);
            }
        }
    }
    /** Phones: open a spot's card on the map (not a switch: tapping a spot always shows it) */
    function showSpotCard(sp: Spot) {
        if (mapShown === sp.id && popup) {return;}
        mapShown = null;
        toggleShowOnMap(sp);
    }

    async function onMapPick(ev: { lat: number; lon: number }, known?: Spot) {
        const { lat, lon } = ev;
        const near = known ? { s: known, d: 0 } : nearestWithin(lat, lon, 1);
        if (!(known && mapShown === known.id)) {clearPopup();}
        if (view === 'spotForm' && sf) {
            // move the new spot's pin
            setTemp(lat, lon);
            const old = sf;
            sf = { ...sf, lat, lon };
            const pn = await placeName(lat, lon);
            if (sf && sf.lat === lat) {sf = { ...sf, place: pn, name: old.name && old.name !== old.place ? old.name : pn };}
            return;
        }
        if (view === 'pick') {
            const loc: Loc = near ? { lat: near.s.lat, lon: near.s.lon, name: near.s.name } : { lat, lon };
            if (!near || pickFor === 'spot') {loc.name = await placeName(lat, lon);}
            actOn(pickFor, loc, pickFor === 'spot' ? undefined : near?.s);
            return;
        }
        if (near) {
            if (barMode) {
                openSpot(near.s, false, false);
                showSpotCard(near.s);
            } else {
                openSpot(near.s);
                if (isMobile) {showSpotCard(near.s);}
            }
            return;
        }
        setTemp(lat, lon);
        place = { lat, lon, name: 'Dropped pin' };
        placeNow = null;
        placeWaves = null;
        placeLoading = true;
        go('place');
        const n = await placeName(lat, lon);
        if (n && place && place.lat === lat) {place = { ...place, name: n };}
        const ts = currentTs();
        const [mv, wv] = await Promise.all([modelValueAt(currentModel(), lat, lon, ts), waveValueAt(lat, lon, ts)]);
        if (place && place.lat === lat) {
            placeNow = mv;
            placeWaves = trimWaves(wv, data.settings.layers);
            placeLoading = false;
        }
    }

    /* ---------- navigation ---------- */
    function go(v: View, remember = true, phonePanel = true) {
        if (remember && view !== v) {hist = [...hist, { view, spotId: spot?.id ?? null, snapId: snap?.id ?? null }];}
        view = v;
        showUnits = false;
        unitsOpen = false;
        armed = '';
        if (v !== 'log') {drawTrack(null);}
        if (v !== 'place' && v !== 'spotForm') {clearTemp();}
        if (v !== 'spot') {clearPopup();}
        drawSpotMarkers();
        // phones: a page opens the panel over the map (not while waiting for a tap on the map)
        if (barMode && phonePanel && !waitingForMap && v !== 'home') {openModal();}
        tick().then(scrollTop);
    }
    function scrollTop() {
        if (bodyEl && bodyEl.scrollTop > 0) {bodyEl.scrollTop = 0;}
        let el: HTMLElement | null = root;
        while (el) {
            if (el.scrollTop > 0) {el.scrollTop = 0;}
            el = el.parentElement;
        }
    }
    function back() {
        const fr = hist.pop();
        hist = hist;
        if (!fr || fr.view === 'home') {
            goHome();
            return;
        }
        spot = spotById(fr.spotId) || null;
        snap = data.snapshots.find(x => x.id === fr.snapId) || (snap && snap.id === fr.snapId ? snap : null);
        if (fr.view === 'spot' && !spot) {return goHome();}
        if (fr.view === 'snap' && !snap) {return back();}
        if (fr.view === 'place' && place) {setTemp(place.lat, place.lon);}
        go(fr.view, false);
        if (fr.view === 'log' && f?.track) {drawTrack(f.track);}
    }
    function goHome() {
        hist = [];
        spot = null;
        snap = null;
        go('home', false);
        loadAllNow();
    }
    function openSpot(s: Spot, center = false, phonePanel = true) {
        if (mapShown && mapShown !== s.id) {clearPopup();}
        spot = s;
        go('spot', true, phonePanel);
        if (center) {centerMap({ lat: s.lat, lon: s.lon, zoom: 10 });}
        loadOutlook(s);
        loadNow(s);
    }
    const modelsLoading = new Set<string>();
    async function loadModels(s: Spot) {
        if (modelsBySpot[s.id] || modelsLoading.has(s.id)) {return;}
        modelsLoading.add(s.id);
        const list = await availableModels(s.lat, s.lon);
        modelsBySpot = { ...modelsBySpot, [s.id]: list };
    }
    function setSpotModel(s: Spot, m: string) {
        spotModel = m;
        loadNow(s, m);
    }
    function startPick(what: PickFor) {
        if (welcome) {finishWelcome();}
        pickFor = what;
        waitingForMap = false;
        locError = '';
        go('pick');
    }
    /** "Your current location": the phone's GPS (through Windy, which asks for permission), else the browser's */
    let locating = false;
    let locError = '';
    async function myPosition(): Promise<{ lat: number; lon: number } | null> {
        try {
            if (typeof geo?.getGPSlocation === 'function') {
                // a phone's quick fix (wifi/cell, a few tens of metres) is plenty to find a spot, and comes in a second or two
                // Windy passes these on to the phone; its type only lists its own two (the rest come from a package plugins don't get)
                const opts = { doNotShowFailureMessage: true, getMeFallbackGps: false, enableHighAccuracy: false, timeout: 7000, maximumAge: 120000 };
                const p = await Promise.race([
                    geo.getGPSlocation(opts as Parameters<typeof geo.getGPSlocation>[0]),
                    new Promise<null>(res => setTimeout(() => res(null), 7500)),
                ]);
                if (p && typeof p.lat === 'number' && (p.source === 'gps' || p.source === 'last')) {return { lat: p.lat, lon: p.lon };}
            }
        } catch {
            /* try the browser below */
        }
        if (!navigator.geolocation) {return null;}
        return new Promise(res =>
            navigator.geolocation.getCurrentPosition(
                p => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
                () => res(null),
                { enableHighAccuracy: false, timeout: 7000, maximumAge: 120000 },
            ),
        );
    }
    async function useMyLocation() {
        if (locating) {return;}
        const what = pickFor;
        locating = true;
        locError = '';
        const c = await myPosition();
        locating = false;
        if (view !== 'pick' || pickFor !== what) {return;}
        if (!c) {
            locError = w('pickMeError');
            return;
        }
        const near = what === 'spot' ? null : nearestWithin(c.lat, c.lon, 1);
        const loc: Loc = { ...c, name: near?.s.name || (await placeName(c.lat, c.lon)) };
        actOn(what, loc, near?.s);
    }
    function actOn(what: PickFor, loc: Loc, s?: Spot) {
        waitingForMap = false;
        if (what === 'snap') {saveForecastAt({ lat: loc.lat, lon: loc.lon, spot: s || nearestWithin(loc.lat, loc.lon, 1)?.s });}
        else if (what === 'log') {startLog(s ? { spot: s } : { lat: loc.lat, lon: loc.lon });}
        else {startSpotForm(loc, null);}
    }

    /* ---------- spots ---------- */
    async function startSpotForm(loc: Loc, ret: 'log' | 'snap' | null) {
        sfReturn = ret;
        const isPin = !loc.name || loc.name === 'Dropped pin';
        sf = {
            name: isPin ? '' : loc.name || '', place: isPin ? '' : loc.name || '', lat: loc.lat, lon: loc.lon,
            sports: ['Windsurf'], dirs: [], dMin: Math.round(toWind(7, S.wind)), dMax: Math.round(toWind(12, S.wind)), windUnknown: false, startOwn: false,
        };
        go('spotForm');
        setTemp(loc.lat, loc.lon);
        if (isPin) {
            const n = await placeName(loc.lat, loc.lon);
            if (sf && !sf.id && sf.lat === loc.lat && n) {sf = { ...sf, place: n, name: sf.name || n };}
        }
    }
    function editSpot(s: Spot) {
        sfReturn = null;
        sf = {
            id: s.id, name: s.name, place: s.place || '', lat: s.lat, lon: s.lon, sports: [...s.sports], dirs: [...s.dirs],
            dMin: Math.round(toWind(s.min, S.wind)), dMax: Math.round(toWind(s.max, S.wind)), windUnknown: !!s.windUnknown, created: s.created, startOwn: !!s.startOwn,
        };
        go('spotForm');
    }
    function stepRange(k: 'dMin' | 'dMax', dir: number) {
        if (!sf) {return;}
        const st = windStep(S.wind);
        if (k === 'dMin') {sf = { ...sf, dMin: Math.max(0, Math.min(sf.dMax - st, sf.dMin + dir * st)) };}
        else {sf = { ...sf, dMax: Math.max(sf.dMin + st, sf.dMax + dir * st) };}
    }
    function saveSpotForm() {
        if (!sf || !sf.name.trim()) {return;}
        const s: Spot = {
            id: sf.id || uid(), name: sf.name.trim(), place: sf.place, lat: sf.lat, lon: sf.lon, sports: sf.sports,
            dirs: sf.windUnknown ? [] : sf.dirs, min: Math.round(fromWind(sf.dMin, S.wind) * 10) / 10, max: Math.round(fromWind(sf.dMax, S.wind) * 10) / 10,
            windUnknown: sf.windUnknown, created: sf.created || Date.now(),
            ...(sf.startOwn ? { startOwn: true } : {}),
        };
        const isNew = !sf.id;
        const old = data.spots.find(x => x.id === s.id);
        if (old?.ranges) {s.ranges = old.ranges;} // your own ranges stay
        data.spots = isNew ? [...data.spots, s] : data.spots.map(x => (x.id === s.id ? s : x));
        delete outlookBySpot[s.id];
        persist();
        loadNow(s);
        showToast(w(isNew ? 'toastSpotSaved' : 'toastSpotUpdated'));
        if (isNew && sfReturn === 'log' && f) {
            f = { ...f, spotId: s.id, lat: f.lat ?? s.lat, lon: f.lon ?? s.lon };
            back();
            if (!f.snapshotId) {captureForLog();}
            return;
        }
        if (isNew && sfReturn === 'snap' && snap) {
            back();
            linkSnap(s.id);
            return;
        }
        // replace the form in history with the spot page
        if (!isNew) {
            spot = s;
            back();
            return;
        }
        spot = s;
        hist = [{ view: 'home', spotId: null, snapId: null }];
        go('spot', false);
        loadOutlook(s);
        offerLink(s);
    }
    function deleteSpot(s: Spot) {
        if (!arm('spot')) {return;}
        const before = { spots: data.spots, sessions: data.sessions, snapshots: data.snapshots };
        data.spots = data.spots.filter(x => x.id !== s.id);
        data.sessions = data.sessions.filter(x => x.spotId !== s.id);
        data.snapshots = data.snapshots.filter(x => x.spotId !== s.id);
        persist();
        goHome();
        showToast(tr('toastDeleted', { name: s.name }), () => {
            Object.assign(data, before);
            persist();
        });
    }
    function applySuggestion() {
        if (!spot || !suggestion) {return;}
        const s: Spot = { ...spot, dirs: suggestion.dirs, min: suggestion.min, max: suggestion.max, windUnknown: false };
        data.spots = data.spots.map(x => (x.id === s.id ? s : x));
        spot = s;
        delete outlookBySpot[s.id];
        persist();
        loadOutlook(s);
        showToast(w('toastWindow'));
    }

    /* ---------- forecast snapshots ---------- */
    /** Models a forecast keeps: all of them, or the ones picked in the settings */
    const modelsToSave = (st: SettingsT): string[] => (st.allModels || !st.models?.length ? [] : st.models); // [] = every model that covers the place
    /** Saves the forecast from `from` (default: now) for the next 24 hours */
    async function capture(lat: number, lon: number, spotId: string | null, from?: number, focus?: number): Promise<Snapshot> {
        const st = data.settings;
        const list = modelsToSave(st);
        const primary = !list.length || list.includes('ecmwf') ? 'ecmwf' : list[0];
        const day = await captureDay(lat, lon, from ?? Date.now(), primary, list, st.layers);
        if (!day || !day.models.length) {throw new Error(NO_DAY);}
        let { models, waves } = day;
        if (focus !== undefined && covers(day.series, focus)) {({ models, waves } = seriesAt(day.series, focus));}
        return {
            id: uid(), spotId, lat, lon, ts: models[0]?.ts ?? day.models[0].ts, savedAt: Date.now(), primary: day.primary,
            models, waves, series: day.series,
        };
    }
    /** a forecast for this spot that no session uses yet (there is only one of those per spot) */
    function pendingFor(spotId: string | null, except?: string): Snapshot | null {
        if (!spotId) {return null;}
        const used = new Set(data.sessions.map(se => se.snapshotId));
        return data.snapshots.filter(x => x.spotId === spotId && x.id !== except && !used.has(x.id)).sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    }
    /** Loads the forecast and shows it for checking; nothing is stored until "Save forecast" */
    async function saveForecastAt(t: { lat: number; lon: number; spot?: Spot }) {
        capturing = true;
        try {
            const sn = await capture(t.lat, t.lon, t.spot?.id ?? null);
            if (view === 'pick') {view = 'home';} // don't come back to the picker
            snapDraft = true;
            snap = sn;
            snapNote = '';
            linkOpen = false;
            replaceOf = null;
            go('snap');
            markSnapPlace(sn);
        } catch (e) {
            showToast((e as Error).message === NO_DAY ? w('toastNoDay') : w('toastNoFc'));
        } finally {
            capturing = false;
        }
    }
    function removeSnap(id: string) {
        data.snapshots = data.snapshots.filter(x => x.id !== id);
        persist();
        if (view === 'snap' && snap?.id === id) {back();}
    }
    function deleteSnap(sn: Snapshot) {
        removeSnap(sn.id);
        showToast(w('toastFcDeleted'), () => {
            data.snapshots = [...data.snapshots, sn];
            persist();
        });
    }
    function confirmSnap(replace: boolean) {
        if (!snap || !snapDraft) {return;}
        const old = pendingFor(snap.spotId, snap.id);
        if (old && !replace) {
            replaceOf = old; // ask first
            return;
        }
        const sn: Snapshot = { ...snap, note: snapNote.trim() || undefined, savedAt: Date.now() };
        const removed = old && replace ? old : null;
        data.snapshots = [...data.snapshots.filter(x => x.id !== removed?.id), sn];
        snapDraft = false;
        replaceOf = null;
        persist();
        back();
        showToast(removed ? w('toastFcReplaced') : tr('toastFcSaved', { time: fmtTime(sn.series?.ts[0] ?? sn.ts) }), () => {
            data.snapshots = [...data.snapshots.filter(x => x.id !== sn.id), ...(removed ? [removed] : [])];
            persist();
        });
    }
    function openSnap(sn: Snapshot) {
        snapDraft = false;
        snap = sn;
        snapNote = sn.note || '';
        linkOpen = false;
        replaceOf = null;
        go('snap');
        markSnapPlace(sn);
    }
    function updateSnap(patch: Partial<Snapshot>) {
        if (!snap) {return;}
        const n: Snapshot = { ...snap, ...patch };
        if (snapDraft) {
            snap = n; // not stored yet
            return;
        }
        data.snapshots = data.snapshots.map(x => (x.id === n.id ? n : x));
        snap = n;
        persist();
    }
    /** A forecast at one of your spots is shown by that spot's own pin; only a forecast without a spot gets the temporary marker */
    function markSnapPlace(sn: Snapshot) {
        if (sn.spotId && spotById(sn.spotId)) {clearTemp();}
        else {setTemp(sn.lat, sn.lon);}
    }
    function linkSnap(spotId: string | null) {
        updateSnap({ spotId });
        replaceOf = null;
        if (snap) {markSnapPlace(snap);}
        if (spotId) {showToast(tr('toastLinked', { spot: spotById(spotId)?.name || '' }));}
    }
    function saveSnapNote() {
        updateSnap({ note: snapNote.trim() });
    }

    /* ---------- sessions ---------- */
    function emptyForm(): LogForm {
        return {
            spotId: null, snapshotId: null, dateStr: dateStrOf(Date.now()), rating: 4, felt: null, gusts: null, water: null, sport: null,
            gearIds: [], gear: '', start: '', end: '', notes: '', track: null,
        };
    }
    function startLog(o: { spot?: Spot; lat?: number; lon?: number; snap?: Snapshot }) {
        trackError = '';
        const nf = emptyForm();
        if (o.snap) {
            nf.snapshotId = o.snap.id;
            nf.spotId = o.snap.spotId;
            nf.lat = o.snap.lat;
            nf.lon = o.snap.lon;
            nf.dateStr = dateStrOf(o.snap.ts);
        } else if (o.spot) {
            nf.spotId = o.spot.id;
            nf.lat = o.spot.lat;
            nf.lon = o.spot.lon;
            // the forecast you saved for this spot, when it covers today
            const today = new Date().toDateString();
            const pend = pendingFor(o.spot.id);
            if (pend && (covers(pend.series, Date.now()) || new Date(pend.ts).toDateString() === today)) {nf.snapshotId = pend.id;}
        } else if (o.lat !== undefined) {
            nf.lat = o.lat;
            nf.lon = o.lon;
            nf.spotId = nearestWithin(o.lat, o.lon ?? 0, 1)?.s.id ?? null;
        }
        const sn = data.snapshots.find(x => x.id === nf.snapshotId);
        const p = sn ? primaryOf(sn) : null;
        nf.felt = p?.wind != null ? roundToStep(feltTo(p.wind, S.wind)) : null;
        f = nf;
        if (view === 'pick') {view = 'home';}
        go('log');
        if (nf.lat !== undefined && !nf.spotId) {setTemp(nf.lat, nf.lon ?? 0);}
        captureError = '';
        if (!nf.snapshotId && nf.lat !== undefined) {captureForLog();}
    }
    /**
     * Saves the forecast for the session's day (at the session time if it is set, otherwise now).
     * A snapshot this log created itself is replaced; a forecast you saved on purpose is kept and just unlinked.
     */
    async function captureForLog() {
        if (!f || f.lat === undefined) {return;}
        const focus = sessionFocus(f) ?? (f.dateStr === dateStrOf(Date.now()) ? Date.now() : new Date(`${f.dateStr}T12:00`).getTime());
        capturing = true;
        captureError = '';
        try {
            // from the start of the session (Windy still has today's earlier hours), read at the session's middle
            const from = f.start && isFinite(new Date(`${f.dateStr}T${f.start}`).getTime()) ? new Date(`${f.dateStr}T${f.start}`).getTime() : focus;
            const sn = await capture(f.lat, f.lon ?? 0, f.spotId, Math.min(from, focus), focus);
            const old = f.autoSnap;
            data.snapshots = [...data.snapshots.filter(x => !(old && x.id === old)), sn];
            persist();
            if (f) {
                const p = sn.models.find(m => m.model === sn.primary) || sn.models[0];
                f = { ...f, snapshotId: sn.id, autoSnap: sn.id, felt: f.felt ?? (p?.wind != null ? roundToStep(feltTo(p.wind, S.wind)) : null) };
            }
        } catch (e) {
            captureError = (e as Error).message;
            captureErrorDay = f?.dateStr || '';
            if (f && f.autoSnap) {
                // the old auto forecast was for another day: drop it rather than show the wrong day
                const old = f.autoSnap;
                data.snapshots = data.snapshots.filter(x => x.id !== old);
                f = { ...f, snapshotId: f.snapshotId === old ? null : f.snapshotId, autoSnap: null };
                persist();
            }
        } finally {
            capturing = false;
        }
    }
    /** When the session moves to another day, a forecast Spotlog saved by itself follows it */
    function scheduleRecapture(..._deps: unknown[]) {
        clearTimeout(recaptureTimer);
        recaptureTimer = setTimeout(() => {
            if (view !== 'log' || !f || f.lat === undefined || capturing) {return;}
            const sn = data.snapshots.find(x => x.id === f?.snapshotId);
            const focus = sessionFocus(f);
            const day = focus ?? new Date(`${f.dateStr}T12:00`).getTime();
            const auto = !!f.autoSnap && f.autoSnap === f.snapshotId;
            if (captureError && captureErrorDay !== f.dateStr) {captureError = '';}
            if (!sn && !f.id && !captureError) {captureForLog();}
            else if (sn && auto && (dateStrOf(sn.ts) !== dateStrOf(day) || (focus !== null && !!sn.series && !covers(sn.series, focus)))) {captureForLog();}
        }, 500);
    }
    function openSession(se: Session) {
        trackError = '';
        const sp = spotById(se.spotId);
        f = {
            id: se.id, spotId: se.spotId, lat: se.lat ?? sp?.lat, lon: se.lon ?? sp?.lon, snapshotId: se.snapshotId,
            dateStr: dateStrOf(se.date), rating: se.rating,
            felt: se.felt === null ? null : roundToStep(feltTo(se.felt, S.wind)),
            gusts: se.gusts, water: se.water, sport: se.sport ?? null, checked: !!se.checked, gearIds: [...(se.gearIds || [])], gear: se.gear || '',
            start: se.start, end: se.end, notes: se.notes, track: se.track || null,
        };
        go('log');
        if (f.track) {drawTrack(f.track, true);}
        else if (sp) {centerMap({ lat: sp.lat, lon: sp.lon, zoom: 10 });}
    }
    function assignSpot(s: Spot) {
        if (!f) {return;}
        f = { ...f, spotId: s.id, lat: f.lat ?? s.lat, lon: f.lon ?? s.lon };
        clearTemp();
        drawSpotMarkers();
        if (!f.snapshotId) {captureForLog();}
    }
    function newSpotFromLog() {
        if (!f) {return;}
        const loc = f.lat !== undefined ? { lat: f.lat, lon: f.lon ?? 0 } : f.track?.points[0] ? { lat: f.track.points[0][0], lon: f.track.points[0][1] } : centre();
        startSpotForm(loc, 'log');
    }
    function saveSession() {
        if (!f) {return;}
        const sn = data.snapshots.find(x => x.id === f?.snapshotId);
        let date: number;
        if (f.start) {date = new Date(`${f.dateStr}T${f.start}`).getTime();}
        else if (sn && dateStrOf(sn.ts) === f.dateStr) {date = sn.ts;}
        else if (f.track?.start && dateStrOf(f.track.start) === f.dateStr) {date = f.track.start;}
        else {date = new Date(`${f.dateStr}T12:00`).getTime();}
        if (!isFinite(date)) {date = Date.now();}
        const se: Session = {
            id: f.id || uid(), spotId: f.spotId, lat: f.lat, lon: f.lon, snapshotId: f.snapshotId, date, rating: f.checked ? 2 : f.rating,
            ...(f.checked ? { checked: true } : {}),
            felt: f.felt === null ? null : Math.round(feltFrom(f.felt, S.wind) * 10) / 10,
            gusts: f.gusts, water: f.water,
            // a tide logged by hand in older diaries stays (new tides come from the saved forecast)
            tide: data.sessions.find(x => x.id === f?.id)?.tide ?? null, tideMove: data.sessions.find(x => x.id === f?.id)?.tideMove ?? null,
            sport: (spotById(f.spotId)?.sports.includes(f.sport || '') ? f.sport : spotById(f.spotId)?.sports[0]) || null, gearIds: f.gearIds, gear: f.gear.trim(), start: f.start, end: f.end, notes: f.notes, track: f.track,
            tz: deviceTz(),
        };
        data.sessions = f.id ? data.sessions.map(x => (x.id === se.id ? se : x)) : [...data.sessions, se];
        if (sn) {
            // the forecast follows the session: its main time becomes the session time (when that day was saved),
            // and a forecast used for a session belongs to that spot
            const focus = sessionFocus(f);
            let upd: Snapshot = { ...sn, spotId: sn.spotId || se.spotId };
            if (focus !== null && sn.series && covers(sn.series, focus)) {
                const at = seriesAt(sn.series, focus);
                upd = { ...upd, ts: at.models[0]?.ts ?? focus, models: at.models, waves: at.waves };
            }
            data.snapshots = data.snapshots.map(x => (x.id === sn.id ? upd : x));
        }
        persist();
        // L1: a session without a forecast can't teach spotlog; say so at the moment it matters
        showToast(w(f.id ? 'toastSessUpdated' : se.snapshotId ? 'toastSessSaved' : 'toastSessNoFc'));
        const sp = spotById(se.spotId);
        if (!f.id && sp) {
            // land on the spot page, with home underneath
            hist = [{ view: 'home', spotId: null, snapId: null }];
            spot = sp;
            go('spot', false);
            loadNow(sp);
            loadOutlook(sp);
        } else if (!f.id) {
            tab = 'sessions';
            goHome();
        } else {
            back();
        }
    }
    function deleteSession(se: Session, leave = false) {
        data.sessions = data.sessions.filter(x => x.id !== se.id);
        persist();
        if (leave) {back();}
        showToast(w('toastSessDeleted'), () => {
            data.sessions = [...data.sessions, se];
            persist();
        });
    }
    async function onTrackFile(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || !f) {return;}
        trackError = '';
        try {
            const t = await readTrack(file);
            if (!f) {return;}
            const nf: LogForm = { ...f, track: t };
            if (t.start) {
                nf.dateStr = dateStrOf(t.start);
                if (!nf.start) {nf.start = hhmmOf(t.start);}
            }
            if (t.end && !nf.end) {nf.end = hhmmOf(t.end + 4 * 60e3);}
            if (nf.lat === undefined && t.points[0]) {
                nf.lat = t.points[0][0];
                nf.lon = t.points[0][1];
                nf.spotId = nf.spotId || nearestWithin(nf.lat, nf.lon, 3)?.s.id || null;
            }
            f = nf;
            drawTrack(t, true);
            showToast(fill(w('toastTrack'), { dist: fmtDistance(t.distanceKm, S.height) }));
        } catch (err) {
            trackError = (err as Error).message || w('trackError');
        }
    }
    function removeTrack() {
        if (!f) {return;}
        f = { ...f, track: null };
        drawTrack(null);
    }

    /* ---------- gear ---------- */
    function addGear() {
        if (!gearName.trim()) {return;}
        data.gear = [...data.gear, { id: uid(), name: gearName.trim(), kind: gearKind, sport: gearSport }];
        gearName = '';
        persist();
    }
    function saveTypedGear() {
        if (!f || !f.gear.trim()) {return;}
        const sport = (spotById(f.spotId)?.sports || []).find(x => GEAR_SPORTS.includes(x));
        const g: Gear = { id: uid(), name: f.gear.trim(), kind: 'Other', sport };
        data.gear = [...data.gear, g];
        f = { ...f, gear: '', gearIds: [...f.gearIds, g.id] };
        persist();
        showToast(w('toastGearSaved'));
    }
    function deleteGear(id: string) {
        const g = data.gear.find(x => x.id === id);
        data.gear = data.gear.filter(x => x.id !== id);
        persist();
        if (g) {showToast(tr('toastGearRemoved', { name: g.name }), () => { data.gear = [...data.gear, g]; persist(); });}
    }

    /* ---------- conditions + matches ---------- */
    async function loadNow(s: Spot, model = modelFor(s, trustMap)): Promise<Now | null> {
        const k = nowKey(s.id, model);
        const cur = nowBySpot[k];
        // the spot's model can change (a more accurate one here): then load again
        if (cur && cur !== 'loading' && (cur.wind?.model ?? model) === model) {return cur;}
        nowBySpot = { ...nowBySpot, [k]: 'loading' };
        const own = model === modelFor(s, trustMap);
        const [n, hours] = await Promise.all([conditionsNow(s.lat, s.lon, model), own ? hoursToday(s.lat, s.lon, model) : Promise.resolve(null)]);
        if (hours) {dayBySpot = { ...dayBySpot, [s.id]: hours };}
        nowBySpot = { ...nowBySpot, [k]: n };
        return n;
    }
    /** conditions are kept for 20 minutes; after that (Windy left open, the phone back from the pocket) they load again */
    let nowAt = 0;
    function loadAllNow() {
        if (Date.now() - nowAt > 20 * 60e3) {
            if (nowAt) {
                nowBySpot = {};
                outlookBySpot = {};
                if (view === 'spot' && spot) {loadOutlook(spot);}
            }
            nowAt = Date.now();
        }
        data.spots.forEach(s => loadNow(s));
    }
    function onVisible() {
        if (document.visibilityState === 'visible') {loadAllNow();}
    }
    /** the next 6 days for a spot: hours (the spot's model), Windy's predictability per day, today's tides */
    async function loadOutlook(s: Spot) {
        if (outlookBySpot[s.id] !== undefined) {return;}
        outlookBySpot = { ...outlookBySpot, [s.id]: 'loading' };
        const m = modelFor(s, trustMap);
        const from = Date.now();
        const [hours, pred, tide] = await Promise.all([hoursBetween(s.lat, s.lon, from, from + 6 * 864e5, m), predictability(s.lat, s.lon, m), tideToday(s.lat, s.lon)]);
        outlookBySpot = { ...outlookBySpot, [s.id]: { hours, pred, tide } };
    }
    const predOfDay = (day: number, o: Outlook | null): number | null => o?.pred[new Date(day).toDateString()] ?? null;
    /** "High 2:18 · Low 8:30 · High 14:42" */
    $: tideList = (t: TideDay): string =>
        [...t.highs.map(x => ({ x, k: W.tideHigh })), ...t.lows.map(x => ({ x, k: W.tideLow }))].sort((a, b) => a.x - b.x).map(e => `${e.k} ${fmtTime(e.x)}`).join(' · ');
    /** when today has the tide your best sessions had: around a high or low, or between them for rising/falling/mid */
    $: tideWhen = (t: TideDay, h: { tide: string | null; move: string | null }): string => {
        const ev = [...t.highs.map(x => ({ x, hi: true })), ...t.lows.map(x => ({ x, hi: false }))].sort((a, b) => a.x - b.x);
        const around = (list: number[]) => list.map(x => fill(W.tideAround, { time: fmtTime(x) })).join(', ');
        const between = (fromHigh: boolean, mid: boolean) => {
            const out: string[] = [];
            for (let i = 0; i < ev.length - 1; i++) {
                if (ev[i].hi !== fromHigh || ev[i + 1].hi === fromHigh) {continue;}
                out.push(mid ? fill(W.tideAround, { time: fmtTime((ev[i].x + ev[i + 1].x) / 2) }) : `${fmtTime(ev[i].x)}–${fmtTime(ev[i + 1].x)}`);
            }
            return out.join(', ');
        };
        if (h.tide === 'High') {return around(t.highs);}
        if (h.tide === 'Low') {return around(t.lows);}
        if (h.move === 'Rising') {return between(false, h.tide === 'Mid');}
        if (h.move === 'Falling') {return between(true, h.tide === 'Mid');}
        if (h.tide === 'Mid') {return [between(false, true), between(true, true)].filter(Boolean).join(', ');}
        return '';
    };

    /* ---------- what works here: "Use what spotlog learned", your own ranges, checked days ---------- */
    function useLearnedWindow() {
        if (!spot || !spotLearnedWindow) {return;}
        const before = spot;
        const after: Spot = { ...spot, dirs: spotLearnedWindow.dirs, min: spotLearnedWindow.min, max: spotLearnedWindow.max };
        data.spots = data.spots.map(x => (x.id === after.id ? after : x));
        spot = after;
        persist();
        showToast(w('toastWindowUsed'), () => {
            data.spots = data.spots.map(x => (x.id === before.id ? before : x));
            if (spot?.id === before.id) {spot = before;}
            persist();
        });
    }
    /** inputs are in your units; ranges are stored in m/s, m, °C */
    const toUnit = (k: ParamKey, v: number): number =>
        k === 'wind' || k === 'gust' ? Math.round(toWind(v, S.wind) * 10) / 10 : (k === 'waves' || k === 'swell') && S.height === 'ft' ? Math.round(v * 3.28084 * 10) / 10
            : k === 'temp' && S.temp === 'F' ? Math.round(v * 1.8 + 32) : Math.round(v * 100) / 100;
    const fromUnit = (k: ParamKey, v: number): number =>
        k === 'wind' || k === 'gust' ? fromWind(v, S.wind) : (k === 'waves' || k === 'swell') && S.height === 'ft' ? v / 3.28084 : k === 'temp' && S.temp === 'F' ? (v - 32) / 1.8 : v;
    function startEdit(m: SportModel) {
        editSport = m.sport;
        editRows = {};
        for (const key of paramsOf(m.sport)) {
            const p = m.params.find(x => x.key === key);
            editRows[key] = {
                lo: p?.lo !== undefined && !isCircular(key) ? String(toUnit(key, p.lo)) : '',
                hi: p?.hi !== undefined && !isCircular(key) ? String(toUnit(key, p.hi)) : '',
                dirs: p?.centres ? (p.from === 'window' && spot ? [...spot.dirs] : dirsOfParam(p)) : [],
            };
        }
    }
    function saveEdit() {
        if (!spot || !editSport) {return;}
        const learned = spotLearned.find(m => m.sport === editSport);
        const own: Record<string, OwnRange> = {};
        for (const [key, row] of Object.entries(editRows) as [ParamKey, { lo: string; hi: string; dirs: Dir8[] }][]) {
            const p = learned?.params.find(x => x.key === key);
            if (isCircular(key)) {
                const was = p?.centres ? (p.from === 'window' ? spot.dirs : dirsOfParam(p)) : [];
                const same = row.dirs.length === was.length && row.dirs.every(d => was.includes(d));
                if (row.dirs.length && (!same || p?.from === 'you')) {own[key] = { dirs: row.dirs };}
                continue;
            }
            const num = (x: string) => (x.trim() === '' ? undefined : Number(x.replace(',', '.')));
            const lo = num(row.lo);
            const hi = num(row.hi);
            const r: OwnRange = {};
            if (lo !== undefined && isFinite(lo)) {r.lo = fromUnit(key, lo);}
            if (hi !== undefined && isFinite(hi)) {r.hi = fromUnit(key, hi);}
            const differs = (v: number | undefined, ref: number | undefined) =>
                (v === undefined) !== (ref === undefined) || (v !== undefined && ref !== undefined && Math.abs(toUnit(key, v) - toUnit(key, ref)) > 0.01);
            if ((r.lo !== undefined || r.hi !== undefined) && (p?.from === 'you' || differs(r.lo, p?.lo) || differs(r.hi, p?.hi))) {own[key] = r;}
        }
        const ranges = { ...(spot.ranges || {}) };
        if (Object.keys(own).length) {ranges[editSport] = own;} else {delete ranges[editSport];}
        const after: Spot = { ...spot, ranges };
        data.spots = data.spots.map(x => (x.id === after.id ? after : x));
        spot = after;
        editSport = null;
        persist();
        showToast(w('toastRangesSaved'));
    }
    function resetEdit(sport: string) {
        editSport = null;
        if (!spot?.ranges?.[sport]) {return;}
        const ranges = { ...spot.ranges };
        delete ranges[sport];
        const after: Spot = { ...spot, ranges };
        data.spots = data.spots.map(x => (x.id === after.id ? after : x));
        spot = after;
        persist();
        showToast(w('toastRangesReset'));
    }
    function toggleEditDir(key: string, d: Dir8) {
        const row = editRows[key];
        row.dirs = row.dirs.includes(d) ? row.dirs.filter(x => x !== d) : [...row.dirs, d];
        editRows = editRows;
    }
    function setWorksOpen(open: boolean) {
        if (data.settings.worksOpen !== open) {setSettings({ ...data.settings, worksOpen: open });}
    }
    /** a new spot: offer to link earlier sessions saved without a spot within 1 km */
    function offerLink(s: Spot): boolean {
        const loose = data.sessions.filter(se => !se.spotId && typeof se.lat === 'number' && typeof se.lon === 'number' && distanceKm(s, { lat: se.lat, lon: se.lon }) <= 1);
        if (!loose.length) {return false;}
        showToast(fill(W.toastLinkSessions, { n: loose.length }), () => {
            const ids = new Set(loose.map(x => x.id));
            const snaps = new Set(loose.map(x => x.snapshotId));
            data.sessions = data.sessions.map(x => (ids.has(x.id) ? { ...x, spotId: s.id } : x));
            data.snapshots = data.snapshots.map(x => (snaps.has(x.id) && !x.spotId ? { ...x, spotId: s.id } : x));
            persist();
            showToast(fill(W.toastSessLinked, { n: loose.length }));
        }, W.linkThem);
        return true;
    }

    /* ---------- data ---------- */
    function clearAll() {
        if (!arm('all')) {return;}
        const before = data;
        data = { ...emptyData(), settings: { ...data.settings, welcomed: true } }; // not new: the upload stays right here
        persist();
        showToast(w('toastAllDeleted'), () => { data = before; persist(); });
    }

    /* ---------- lifecycle ---------- */
    export const onopen = (params?: { lat?: number; lon?: number }) => {
        if (params && typeof params.lat === 'number' && typeof params.lon === 'number') {
            onMapPick({ lat: params.lat, lon: params.lon });
        }
    };

    /**
     * Phones: Windy's pane around Spotlog has its own lighter grey (a thin frame above and beside the bar).
     * Paint those boxes in Spotlog's background while Spotlog is open; their old look comes back on close.
     * Only colours change, nothing moves.
     */
    const painted: { el: HTMLElement; bg: string }[] = [];
    function paintPane() {
        if (!isMobile || !root) {return;}
        try {
            const r = root.getBoundingClientRect();
            let el = root.parentElement;
            for (let i = 0; el && i < 4 && el !== document.body && el !== document.documentElement; i++, el = el.parentElement) {
                const b = el.getBoundingClientRect();
                // stop at anything much bigger than the pane (the whole app)
                if (b.height > r.height + 120 || b.top < r.top - 80) {break;}
                painted.push({ el, bg: el.style.background });
                el.style.background = 'var(--sl-ground, #2e2e2e)';
            }
        } catch {
            /* leave Windy's look */
        }
    }
    function unpaintPane() {
        painted.forEach(({ el, bg }) => (el.style.background = bg));
        painted.length = 0;
    }

    /**
     * The Style Lab's live preview only (its page sets __spotlogDesignHost before Spotlog starts; Windy never does):
     * the lab can change colours, shapes and wording while you edit, and jump to any screen.
     */
    function designHook() {
        const win = window as unknown as { __spotlogDesignHost?: { ready?: () => void }; __spotlogDesign?: unknown };
        if (!win.__spotlogDesignHost) {return;}
        const T = THEME as unknown as Record<string, unknown>;
        win.__spotlogDesign = {
            apply(d: { tokens?: Record<string, unknown>; words?: Record<string, string> }) {
                if (d.tokens) {
                    for (const [k, v] of Object.entries(d.tokens)) {if (k in T && typeof v === typeof T[k]) {T[k] = v;}}
                    const st = document.getElementById('spotlog-theme');
                    if (st) {st.textContent = themeCss();}
                    onMapZoom();
                    drawSpotMarkers();
                    if (view === 'log' && f?.track) {drawTrack(f.track);}
                }
                if (d.words) {setWords(d.words);}
                if (popup && mapShown) {
                    const sp = spotById(mapShown);
                    if (sp) {popup.setContent(popupHtml(sp, nowOf(sp.id)));}
                }
                data = data;
            },
            goto(where: string) {
                const s0 = data.spots[0];
                if (where !== 'welcome') {previewWelcome = false;}
                waitingForMap = false;
                if (where !== 'card') {clearPopup();}
                if (['spots', 'sessions', 'gear', 'about'].includes(where)) {
                    goHome();
                    tab = asTab(where);
                    if (barMode) {openTab(tab);}
                } else if (where === 'welcome') {
                    goHome();
                    previewWelcome = true;
                    if (barMode) {openModal();}
                } else if (where === 'home') {
                    goHome();
                    tab = 'spots';
                    modalOpen = false;
                } else if (where === 'units') {
                    goHome();
                    if (barMode) {openUnits(true);}
                    else {showUnits = true;}
                } else if (where === 'pick') {startPick('snap');}
                else if (where === 'spot' && s0) {openSpot(s0, true);}
                else if (where === 'spotForm' && s0) {editSpot(s0);}
                else if (where === 'snap' && data.snapshots[0]) {openSnap(data.snapshots[0]);}
                else if (where === 'log' && s0) {startLog({ spot: s0 });}
                else if (where === 'session') {
                    const se = data.sessions.find(x => x.track) || data.sessions[0];
                    if (se) {openSession(se);}
                } else if (where === 'card' && s0) {
                    if (barMode) {spotOnMap(s0);}
                    else {
                        openSpot(s0, false);
                        if (mapShown !== s0.id) {toggleShowOnMap(s0);}
                    }
                }
            },
        };
        win.__spotlogDesignHost.ready?.();
    }

    onMount(() => {
        setTimeout(paintPane, 120);
        setTimeout(designHook, 0);
        // fonts are bundled in the plugin: no requests to Google Fonts (privacy, works offline)
        if (!document.getElementById('spotlog-theme')) {
            const th = document.createElement('style');
            th.id = 'spotlog-theme';
            th.textContent = THEME_CSS;
            document.head.appendChild(th);
        }
        if (!document.getElementById('spotlog-fonts')) {
            const st = document.createElement('style');
            st.id = 'spotlog-fonts';
            st.textContent = FONT_CSS;
            document.head.appendChild(st);
        }
        try {
            userListener = store.on('user', (v: WindyUser | null) => onWindyUser(v));
            subsListener = store.on('subscription', (v: string | null) => (premium = v === 'premium'));
        } catch (e) {
            console.info('[spotlog] Windy account not observable', e);
        }
        try {
            tsListener = store.on('timestamp', (v: number) => (mapTs = v));
        } catch (e) {
            console.info('[spotlog] timeline not observable', e);
        }
        singleclick.on(name, onMapPick);
        try {
            map?.on?.('zoomend', onMapZoom);
            onMapZoom();
        } catch {
            /* no map events */
        }
        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisible);
        mapReady = true;
        drawSpotMarkers();
        loadAllNow();
        if (wUser) {syncNow();}
    });

    onDestroy(() => {
        destroyed = true;
        document.removeEventListener('visibilitychange', onVisible);
        delete (window as unknown as { __spotlogDesign?: unknown }).__spotlogDesign;
        unpaintPane();
        hapticCleanup();
        clearTimeout(kbTimer);
        window.removeEventListener('error', onWinError);
        window.removeEventListener('unhandledrejection', onRejection);
        errBox?.remove();
        singleclick.off(name, onMapPick);
        try {
            map?.off?.('zoomend', onMapZoom);
        } catch {
            /* no map events */
        }
        window.removeEventListener('storage', onStorage);
        if (tsListener !== null) {store.off(tsListener);}
        if (userListener !== null) {store.off(userListener);}
        if (subsListener !== null) {store.off(subsListener);}
        spotMarkers.forEach(m => m.remove());
        clearTemp();
        clearPopup();
        drawTrack(null);
        clearTimeout(toastTimer);
        clearTimeout(armTimer);
        clearTimeout(recaptureTimer);
        clearTimeout(pushTimer);
    });
</script>

<style lang="less">
    /* colours come from the theme (src/lib/theme.ts → CSS variables --sl-*) */
    @ground: var(--sl-ground, #2e2e2e);
    @card: var(--sl-card, #3c3c3c);
    @line: var(--sl-line, #4d4d4d);
    @outline: var(--sl-uOutline, #5a5a5a);
    @text: var(--sl-text, #f8f8f8);
    @sub: var(--sl-sub, #b0b0b0);
    @ink: var(--sl-uInk, #1c1c1c);
    @orange: var(--sl-accent, #d49500);

    .spotlog {
        background: @ground;
        color: @text;
        font-family: 'Instrument Sans', system-ui, sans-serif;
        font-size: var(--sl-textSize, 14px);
        padding: 14px 16px 20px;
        display: flex;
        flex-direction: column;
        gap: var(--sl-panelGap, 16px);
        /* the panel scrolls itself: Windy's pane doesn't scroll plugin content for us */
        height: 100%;
        max-height: 100vh;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        box-sizing: border-box;
        position: relative;

        button { font: inherit; color: inherit; cursor: pointer; }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid @orange; outline-offset: 1px; }
        small { color: @sub; font-size: 12px; }
        b { font-weight: 600; }
        input, textarea {
            box-sizing: border-box; width: 100%; font: inherit; color: var(--sl-inputText, #f8f8f8); background: var(--sl-inputBg, #3c3c3c);
            border: 1px solid var(--sl-inputLine, #5a5a5a); border-radius: var(--sl-radiusButton, 12px); padding: 11px 14px; outline: none; min-width: 0;
        }
        input[type='date'] { color-scheme: dark; }
        textarea { resize: vertical; line-height: 1.45; }
    }
    .spotlog > :global(*) { flex-shrink: 0; }
    /* desktop: the scrollbar's room is always kept (thin), so every tab is equally wide and nothing gets cut off
       when a long tab shows the scrollbar; the right padding gives back what the scrollbar takes */
    .spotlog:not(.m) { scrollbar-gutter: stable; scrollbar-width: thin; padding-right: 8px; }
    /* phones: the panel sits in Windy's small pane under the timeline, half the screen high, and scrolls
       (the layout that works on real phones, 0.5.2–0.6; 0.7.0's bar + sheet showed an empty pane) */
    /* desktop (and the phone fallback): the wrappers don't exist for layout, the pages flow in the panel as before */
    .mwrap, .body { display: contents; }
    .body > :global(*) { flex-shrink: 0; }
    /* phones: a compact bar sits in Windy's pane under the timeline (explicit height: Windy's pane needs one) */
    .spotlog.m.bar { height: 150px; max-height: none; min-height: 150px; padding: 0; gap: 0; display: block; overflow: visible; position: relative; }
    .spotlog.m.bar.gatebar { height: 108px; min-height: 108px; }
    .mbar { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 9px; }
    .mrow { display: flex; align-items: center; gap: 10px; min-height: 30px; .wordmark { font-size: 18px; } .units { height: 28px; } }
    .mhint { flex: 1; min-width: 0; text-align: right; font-size: 12px; color: @sub; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mlink { border: 0; background: none; padding: 4px 0; color: @orange !important; font-weight: 600; font-size: 13px; }
    .macts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
    .mact { height: 42px; padding: 0 6px; border-radius: var(--sl-radiusButton, 12px); border: 1px solid var(--sl-actLine, #5a5a5a); background: var(--sl-actBg, #3c3c3c); color: var(--sl-actText, #f8f8f8) !important; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px !important; font-weight: 600;
        span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } &:disabled { opacity: 0.6; } }
    /* very narrow phones (iPhone SE 1st gen, 320 px): the words fit without the icons */
    @media (max-width: 359px) { .mact { padding: 0 4px; :global(svg) { display: none; } } }
    .mtabs { display: flex; gap: 3px; padding: 3px; border-radius: var(--sl-radiusButton, 12px); background: var(--sl-tabsBg, #3c3c3c);
        button { flex: 1 1 auto; height: 30px; border: 0; border-radius: var(--sl-radiusSmall, 9px); background: transparent; color: var(--sl-tabText, #d0d0d0) !important; font-size: 12px !important; padding: 0 5px; white-space: nowrap; }
        button.on { background: var(--sl-sel-bg, #f8f8f8); color: var(--sl-sel-text, #1c1c1c) !important; font-weight: 600; }
        .cnt { display: inline-block; margin-left: 6px; min-width: 16px; padding: 1px 5px; box-sizing: border-box; border-radius: 8px; background: rgba(248, 248, 248, 0.14); color: inherit; font-size: 10.5px; line-height: 14px; font-weight: 600; font-variant-numeric: tabular-nums; vertical-align: 1px; }
        button.on .cnt { background: rgba(28, 28, 28, 0.12); } }
    /* the panel rises from the bar over the timeline and the map, like The Buoy's list; it scrolls inside */
    .mwrap.on { display: flex; flex-direction: column; position: absolute; left: 8px; right: 8px; bottom: calc(100% + 8px); z-index: 30;
        /* the top stays clear of Windy's own bar (it shows up when you touch the map) */
        height: calc(100vh - 340px); height: calc(100dvh - 340px - env(safe-area-inset-top, 0px)); min-height: 260px;
        touch-action: pan-y; overscroll-behavior: contain;
        background: @ground; border-radius: 18px; box-shadow: 0 10px 34px rgba(0, 0, 0, 0.5); overflow: hidden;
        transform-origin: 50% 100%; transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.18s ease; }
    .mwrap.on:not(.open) { opacity: 0; transform: translateY(14px) scale(0.98); pointer-events: none; visibility: hidden; transition: transform 0.18s ease, opacity 0.15s ease, visibility 0s 0.18s; }
    /* it scrolls up and down only: nothing in it can push it sideways */
    .mwrap.on .body { display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 0 12px 16px; touch-action: pan-y; }
    /* the page header (back, title, units, ✕) stays put while the page scrolls under it */
    .mwrap.on .topbar { position: sticky; top: 0; z-index: 8; margin: 0 -12px -4px; padding: 10px 8px 8px 12px; background: @ground; }
    .mwrap.on .topbar .title { font-size: 16px; }
    .mclose { flex-shrink: 0; width: 34px; height: 34px; margin-left: -4px; border: 0; border-radius: 17px; background: none; color: @sub !important; font-size: 16px; line-height: 1; padding: 0; }
    /* the units page covers the page you were on (which stays as it was underneath) */
    .mwrap.on.unitspage .body > :global(:not(.upage)) { display: none !important; }
    /* room below the last field, so it can scroll up above the keyboard */
    .mwrap.on.kb .body { padding-bottom: 55vh; }
    .when { display: contents; }
    .when.one { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 2fr); gap: 6px;
        input[type='date'] { height: 44px; padding: 0 8px; font-size: 14px; text-align: center; -webkit-appearance: none; appearance: none; }
        .times { gap: 6px; .to { display: none; } } }
    .spotlog.m .felt-card { padding: 10px 14px; gap: 6px;
        .big2 { font-size: 20px; } .tag { font-size: 11px; } .sep { padding-top: 8px; } }
    /* inside the phone panel the bar already shows the logo, the actions and the tabs */
    .mwrap.on :global(.home-head), .mwrap.on :global(.home-acts), .mwrap.on :global(.home-tabs) { display: none !important; }
    @media (prefers-reduced-motion: reduce) { .mwrap.on, .mwrap.on:not(.open) { transition: none; } }
    .spotlog.m { padding: 8px 10px 16px; gap: 10px; height: 50vh; height: 50dvh; max-height: 50dvh; touch-action: pan-y;
        .head { padding: 10px 14px; gap: 8px; }
        .head .stats, .head .sync { display: none; }
        .act { min-height: 0; padding: 8px 10px; small { display: none; } }
        .wordmark { font-size: 20px; }
        .stats .big { font-size: 18px; }
        .act b { font-size: 13px; }
        .act :global(svg) { margin-bottom: 2px; }
        .tile { min-height: 110px; padding: 12px; }
        .topbar .round { width: 34px; height: 34px; }
        .title { font-size: 16px; } }
    /* beta: a small tag by the wordmark, a quiet line under the tabs, a card on How it works */
    .beta { padding: 2px 6px 1px; border-radius: 7px; border: 1px solid @outline; color: @sub; font: 600 9.5px 'Instrument Sans', system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.2; align-self: center; }
    .beta-note { display: block; margin-top: 2px; color: var(--sl-uQuiet, #7a7a7a); font-size: 11.5px; line-height: 1.45; text-align: center; text-wrap: balance; }
    .beta-card .btns { flex-wrap: wrap; }
    .beta-card .btn { min-width: 0; }
    /* welcome: once, for someone new */
    .welcome { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 6px 2px 4px;
        .brand { margin-bottom: 6px; } .h2 { font-size: 20px; text-wrap: balance; } .p { color: @sub; line-height: 1.5; max-width: 34em; }
        .btn { margin-top: 4px; } .link { align-self: center; } }
    .mwrap.on .welcome { padding-top: 0; }
    .wordmark { font-family: 'Doto', monospace; font-weight: 900; font-size: var(--sl-wordmarkSize, 24px); letter-spacing: 0.06em; }
    .card { background: @card; border: 1px solid @line; border-radius: var(--sl-radiusCard, 18px); padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
    .row { display: flex; align-items: center; gap: 10px; &.start { align-items: flex-start; } }
    .card.row { flex-direction: row; }
    .sep { padding-top: 12px; border-top: 1px solid @line; }
    .grow { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .title { font-size: var(--sl-titleSize, 17px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lbl { font-size: 12px; color: @sub; }
    .big { font-size: 22px; font-weight: 500; line-height: 1; small { font-size: 12px; } }
    .big2 { font-size: 26px; font-weight: 600; line-height: 1.1; small { font-size: 13px; } }
    .muted { color: @sub; font-size: 13px; }
    .p { margin: 0; line-height: 1.45; }
    .small { margin: 0; font-size: 12px; color: @sub; }
    .r { text-align: right; }
    .err { color: var(--sl-danger, #ff9a9a) !important; line-height: 1.4; }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); > div { display: flex; flex-direction: column; gap: 4px; } }
    .units { height: 30px; padding: 0 10px; border-radius: 15px; border: 1px solid @outline; background: @ground; font-size: 12px !important; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
    .chev { display: inline-block; transition: transform 0.2s; &.up { transform: rotate(180deg); } }
    .round { width: 38px; height: 38px; flex-shrink: 0; border-radius: 19px; background: @card; border: 1px solid @line; font-size: 16px; }
    /* Windy's own closing ✕ sits outside the pane (desktop) or in the sheet's header (phones): the units pill takes the top-right corner */
    .topbar { display: flex; align-items: center; gap: 10px; }
    .brand { display: inline-flex; align-items: center; gap: 8px; }
    .grow-b { flex: 1; min-width: 0; }
    /* desktop: a plain chevron before the wordmark goes back to Windy's menu (like other plugins) */
    .back-menu { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 30px; margin: 0 -2px 0 -6px; padding: 0; border: 0; background: none; color: @text; opacity: 0.85;
        &:hover { opacity: 1; } }
    /* map switches under the spot tiles */
    .map-toggles { gap: 14px; }
    .maptog { display: flex; align-items: center; gap: 12px; border: 0; background: none; padding: 0; text-align: left;
        small { display: block; margin-top: 2px; } }
    .switch { width: 40px; height: 24px; border-radius: 12px; background: var(--sl-switchOff, #5a5a5a); position: relative; flex-shrink: 0; transition: background 0.15s;
        i { position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: var(--sl-switchKnob, #f8f8f8); transition: transform 0.18s; }
        &.on { background: var(--sl-switch, #d49500); i { transform: translateX(16px); } } }
    .sync { display: block; margin-top: -4px; color: @sub; &.err { color: var(--sl-danger, #ff9a9a); } }
    .coffee { align-self: center; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; border-radius: var(--sl-radiusChip, 18px); border: 1px solid var(--sl-ghostLine, #5a5a5a); color: var(--sl-ghostText, #f8f8f8); text-decoration: none; font-weight: 600; font-size: 13px;
        &:hover { border-color: @orange; } }
    .ver { font-size: 11px; color: var(--sl-uQuiet, #7a7a7a); }
    /* About: friendly how-to, and the low-key signature */
    .about { display: flex; flex-direction: column; gap: 12px; }
    .h3 { font-size: 15px; }
    .steps { gap: 14px; }
    .step { display: flex; gap: 12px; align-items: flex-start; b { font-size: 14px; } small { line-height: 1.45; font-size: 12.5px; } }
    .n { width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; border: 1px solid @outline; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: @sub; }
    .data-links { gap: 18px; .link { font-size: 13px; padding: 2px 0; } }
    .sig { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 0 4px; .coffee { margin-top: 6px; } }
    .data-links { flex-wrap: wrap; }
    /* one forecast per spot: saving another asks before replacing */
    .replace { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 14px; border: 1px solid @orange; background: @card;
        .btns { margin-top: 8px; } }
    .models-pick { display: flex; flex-wrap: wrap; gap: 4px; margin-top: -6px;
        button { height: 28px; padding: 0 11px; border-radius: var(--sl-radiusChip, 18px); border: 1px solid var(--sl-chipLine, #5a5a5a); background: transparent; font-size: 12px !important; color: @sub !important; }
        button.on { background: var(--sl-sel-bg, #f8f8f8); border-color: var(--sl-sel-bg, #f8f8f8); color: var(--sl-sel-text, #1c1c1c) !important; font-weight: 600; } }
    .sl-note { margin-top: -8px; padding: 0 4px; line-height: 1.4; }

    /* the three actions are equals: same grey tile, an icon, a name and a short line */
    .actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .act { min-height: 78px; padding: 10px 9px 10px 10px; min-width: 0; border-radius: calc(var(--sl-radiusButton, 12px) + 2px); border: 1px solid var(--sl-actLine, #5a5a5a); background: var(--sl-actBg, #3c3c3c); color: var(--sl-actText, #f8f8f8) !important; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 3px; text-align: left;
        :global(svg) { color: var(--sl-actIcon, #f8f8f8); margin-bottom: 4px; }
        b { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } small { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: var(--sl-actSub, #b0b0b0); }
        &:hover { border-color: var(--sl-uHoverLine, #777777); background: var(--sl-uHoverBg, #424242); }
        &.on { border-color: var(--sl-accent, #d49500); :global(svg) { color: var(--sl-accent, #d49500); } }
        &:disabled { opacity: 0.6; cursor: default; } }

    .tabs, .seg { display: flex; gap: 4px; padding: 3px; background: var(--sl-tabsBg, #3c3c3c); border-radius: var(--sl-radiusButton, 12px);
        button { flex: 1 1 auto; height: 34px; padding: 0 6px; border: 0; border-radius: var(--sl-radiusSmall, 9px); background: transparent; color: var(--sl-tabText, #d0d0d0); white-space: nowrap; }
        button.on { background: var(--sl-sel-bg, #f8f8f8); color: var(--sl-sel-text, #1c1c1c) !important; font-weight: 600; } }
    .seg { background: @ground; button { height: 30px; } }
    .card .seg { background: @ground; }

    .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tile { text-align: left; min-height: 128px; padding: 14px; border-radius: var(--sl-radiusCard, 18px); background: var(--sl-tileBg, #3c3c3c); border: 1px solid var(--sl-tileLine, #4d4d4d); display: flex; flex-direction: column; gap: 10px; justify-content: space-between; }
    .t-name { font-size: 15px; font-weight: 600; }
    /* − / + above the spots: compact list or tiles */
    .viewtog { align-self: flex-end; display: flex; gap: 2px; padding: 2px; margin-bottom: -8px; border-radius: var(--sl-radiusSmall, 9px); background: var(--sl-tabsBg, #3c3c3c);
        button { width: 30px; height: 24px; border: 0; border-radius: 7px; background: transparent; color: @sub !important; font-size: 17px !important; line-height: 1; padding: 0; }
        button.on { background: var(--sl-sel-bg, #f8f8f8); color: var(--sl-sel-text, #1c1c1c) !important; font-weight: 600; } }
    .tiles.list { grid-template-columns: minmax(0, 1fr); gap: 6px;
        .tile { min-height: 0; flex-direction: row; align-items: center; gap: 10px; padding: 8px 10px 8px 14px; border-radius: 14px; }
        .t-name { flex: 1; min-width: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .now { flex: 0 0 auto; }
        .now-t { display: none; }
        .sw { width: 30px; height: 30px; border-radius: 9px; font-size: 13px; }
        .t-tag { flex: 0 0 auto; }
        .tag { font-size: 11px; padding: 3px 9px; } }
    .now { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .now-t { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; b { font-size: 13px; } small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } }
    .wdir { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; min-width: 28px; color: @text;
        svg { display: block; } small { font-size: 11px; font-weight: 600; color: @sub; } }
    .tag { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
        &.ghost { border: 1px solid var(--sl-ghostTagLine, #5a5a5a); color: @sub; font-weight: 400; font-size: 11px; } }
    .empty { padding: 20px; border: 1px dashed @outline; border-radius: 14px; color: @sub; text-align: center; line-height: 1.45; }
    .list { display: flex; flex-direction: column; }
    .item { display: flex; align-items: center; gap: 12px; min-height: 54px; padding: 6px 2px; border: 0; border-bottom: 1px solid @line; background: transparent; text-align: left;
        &:last-child { border-bottom: 0; } }
    .plain { border: 0; background: none; padding: 0; text-align: left; }
    /* row icons: simple line icons and plain dots, no filled circle behind them */
    .ico { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: @sub;
        &.live { color: @orange; } }
    .dot-s { display: block; width: 8px; height: 8px; border-radius: 4px; background: @orange; &.off { background: transparent; border: 1.5px solid @outline; box-sizing: border-box; } }
    .kind { min-width: 58px; height: 26px; padding: 0 8px; border-radius: 8px; background: @ground; font-size: 11px; color: @sub; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .dot { width: 30px; height: 30px; flex-shrink: 0; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
    .sw { width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--sl-windText, #1c1c1c); font-weight: 600; }
    .mini { height: 30px; padding: 0 10px; border-radius: var(--sl-radiusSmall, 9px); border: 1px solid var(--sl-ghostLine, #5a5a5a); color: var(--sl-ghostText, #f8f8f8) !important; background: transparent; font-size: 12px !important;
        &.danger { color: var(--sl-danger, #ff9a9a) !important; border-color: var(--sl-dangerLine, #6a4444); } }
    .btns { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .btn { height: 46px; padding: 0 16px; border-radius: var(--sl-radiusButton, 12px); font-weight: 600; display: inline-flex; align-items: center; justify-content: center; flex: 1; box-sizing: border-box; white-space: nowrap;
        &.primary { background: var(--sl-primary-bg, #d49500); color: var(--sl-primary-text, #fff) !important; border: 0; }
        &.ghost { background: transparent; border: 1px solid var(--sl-ghostLine, #5a5a5a); color: var(--sl-ghostText, #f8f8f8) !important; }
        &.wide { width: 100%; flex: none; }
        &.small { height: 36px; flex: none; padding: 0 14px; font-size: 13px; }
        &:disabled { opacity: 0.5; cursor: default; } }
    label.btn { cursor: pointer; }
    .link { background: none; border: 0; color: var(--sl-linkText, #d49500) !important; font-weight: 600; padding: 6px 0; align-self: flex-start; flex-shrink: 0;
        &.danger { color: var(--sl-danger, #ff9a9a) !important; } }
    .link-card { text-align: left; align-items: center; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    /* spot page: save nudge, "checked, not worth it", today's tides */
    .nudge { display: block; margin: -2px 2px 0; font-size: 12px; line-height: 1.45; }
    .tide-today { font-size: 13px; display: flex; flex-direction: column; gap: 6px; .lbl { margin: 0; } .tide-best { color: var(--sl-text, #f8f8f8); line-height: 1.45; } }
    .tidehint { display: block; margin-top: -4px; }
    /* spot page: the recommendation, today and the next days */
    .reco { gap: 0; padding-top: 4px; padding-bottom: 12px; }
    /* one row per day with a match: the day (and how sure Windy is) · the guess · the hours */
    .reco-row { display: grid; grid-template-columns: 104px auto minmax(0, 1fr); align-items: center; column-gap: 12px; padding: 9px 0; border-bottom: 1px solid @line;
        &:last-of-type { border-bottom: 0; }
        .r-day { display: flex; flex-direction: column; gap: 1px; color: @sub; font-size: 13px; white-space: nowrap; line-height: 1.25; }
        .tag { justify-self: start; }
        .r-time { font-weight: 600; font-size: 13.5px; line-height: 1.3; span { white-space: nowrap; } }
        .r-pred { color: var(--sl-uQuiet, #8a8a8a); font-size: 11px; } }
    .r-later { padding-top: 8px; }
    .chip.notworth { align-self: flex-start; height: 32px; font-size: 13px; }
    .reco-note { margin-top: 8px; }
    /* spot page: what works here for you, folded to one line or open */
    .works-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; border: 0; background: none; padding: 0; color: inherit !important; text-align: left; cursor: pointer;
        .chev { display: inline-block; font-size: 22px; line-height: 1; font-weight: 600; color: @sub; transition: transform 0.2s; } .chev.open { transform: rotate(90deg); } }
    .works-sum { text-align: left; gap: 6px; cursor: pointer; color: inherit !important;
        .ws-line { display: flex; gap: 10px; align-items: baseline; font-size: 13.5px; b { font-weight: 600; min-width: 74px; } span { color: @sub; } } }
    .works { gap: 14px;
        .w-sport { display: flex; flex-direction: column; gap: 10px; }
        .w-sport + .w-sport { border-top: 1px solid @line; padding-top: 14px; }
        .w-head { display: flex; align-items: baseline; gap: 10px; b { font-size: 14px; } .link { padding: 0; } }
        .w-grid { display: grid; column-gap: 14px; align-items: center; font-size: 13.5px; }
        .w-group { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sl-uQuiet, #8a8a8a); margin-bottom: -4px; }
        .w-list { display: flex; flex-direction: column; }
        .w-row { display: grid; grid-template-columns: 16px 116px minmax(0, 1fr) auto; column-gap: 10px; align-items: baseline; padding: 7px 0; font-size: 13.5px; border-bottom: 1px solid @line;
            &:last-child { border-bottom: 0; } }
        .w-mark { font-weight: 700; color: @sub; text-align: center; &.ok { color: var(--sl-r4bg, #50b450); } &.near { color: var(--sl-linkText, #d49500); } &.off { color: var(--sl-danger, #ff9a9a); } }
        .w-also { color: @sub; font-size: 12.5px; line-height: 1.5; span { color: var(--sl-uQuiet, #8a8a8a); } }
        .w-now { text-align: right; justify-self: end; }
        .w-name { color: @sub; white-space: nowrap; }
        .w-you { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--sl-linkText, #d49500); margin-left: 6px; vertical-align: 2px; }
        .w-range { font-weight: 600; justify-self: start; line-height: 1.3; }
        .w-now { color: @sub; white-space: nowrap; font-size: 12.5px; }
        .w-grid.edit { grid-template-columns: minmax(0, 96px) minmax(0, 1fr); row-gap: 8px; }
        .w-inputs { display: flex; align-items: center; gap: 6px; color: @sub;
            input { width: 64px; height: 34px; padding: 0 8px; border-radius: var(--sl-radiusSmall, 9px); border: 1px solid var(--sl-inputLine, #5a5a5a); background: var(--sl-inputBg, #2e2e2e); color: var(--sl-inputText, #f8f8f8); font: inherit; }
            small { font-size: 12px; } }
        .w-dirs { display: flex; flex-wrap: wrap; gap: 4px; }
        .dchip { height: 30px; min-width: 36px; padding: 0 8px; border-radius: var(--sl-radiusChip, 18px); border: 1px solid var(--sl-chipLine, #5a5a5a); background: transparent; color: var(--sl-chipText, #f8f8f8) !important; font-size: 12px;
            &.on { background: var(--sl-chipOnBg, #f8f8f8); color: var(--sl-chipOnText, #1c1c1c) !important; border-color: var(--sl-chipOnBg, #f8f8f8); } }
        .gear-hint { font-size: 12.5px; color: @sub; }
        .btns { margin-top: 0; } }
    @media (max-width: 480px) { .reco-row { grid-template-columns: 86px auto minmax(0, 1fr); column-gap: 10px; .r-time { font-size: 13px; } } }
    @media (max-width: 380px) { .works .w-row { grid-template-columns: 14px 104px minmax(0, 1fr) auto; column-gap: 7px; font-size: 12.5px; } .reco-row { grid-template-columns: 78px auto minmax(0, 1fr); column-gap: 8px; } }
    label.link { cursor: pointer; }
    .chip { height: 36px; padding: 0 15px; border-radius: var(--sl-radiusChip, 18px); border: 1px solid var(--sl-chipLine, #5a5a5a); background: transparent; color: var(--sl-chipText, #f8f8f8) !important; display: inline-flex; align-items: center; gap: 6px;
        .k { font-size: 11px; opacity: 0.65; }
        &.on { background: var(--sl-chipOnBg, #f8f8f8); color: var(--sl-chipOnText, #1c1c1c) !important; border-color: var(--sl-chipOnBg, #f8f8f8); }
        &.dash { border-style: dashed; color: @orange !important; } }
    .dirs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .dir { height: 50px; border-radius: var(--sl-radiusButton, 12px); border: 1px solid var(--sl-chipLine, #5a5a5a); color: var(--sl-chipText, #f8f8f8) !important; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px;
        &.on { background: var(--sl-chipOnBg, #f8f8f8); color: var(--sl-chipOnText, #1c1c1c) !important; border-color: var(--sl-chipOnBg, #f8f8f8); } }
    .stepper { display: flex; align-items: center; gap: 4px; small { margin-right: 2px; } .round { width: 34px; height: 34px; } }
    .arrow { display: inline-block; font-size: 11px; line-height: 1; &.o { color: @orange; font-size: 16px; margin-right: 2px; } }
    .arrows { display: flex; }
    .suggest { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: calc(var(--sl-radiusButton, 12px) + 2px); background: var(--sl-lightBg, #f8f8f8); color: var(--sl-lightText, #1c1c1c); small { color: var(--sl-lightSub, #6b6b6b); } }
    .section { display: flex; flex-direction: column; gap: 8px; }
    .h2 { font-size: 20px; }
    .score { display: flex; align-items: center; gap: 10px; font-size: 13px;
        .m { width: 64px; &.best { color: @orange; font-weight: 600; } }
        .missbar { flex: 1; height: 6px; border-radius: 3px; background: @line; display: flex; i { display: block; border-radius: 3px; background: @sub; &.best { background: @orange; } } } }
    .ratings { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
    .rate { height: 62px; border-radius: calc(var(--sl-radiusButton, 12px) + 2px); border: 1px solid @line; background: @card; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
        b { font-size: 19px; } span { font-size: 11px; } }
    .times { gap: 8px; .to { height: 44px; display: flex; align-items: center; color: @sub; } }
    .snapless { display: flex; align-items: center; gap: 10px; min-height: 60px; padding: 12px 14px; border-radius: var(--sl-radiusCard, 18px); background: var(--sl-lightBg, #f8f8f8); color: var(--sl-lightText, #1c1c1c); box-sizing: border-box; }
    /* every way of choosing a place looks the same: one rectangular row each */
    .opts { display: flex; flex-direction: column; gap: 6px; }
    .opt { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 14px 8px 10px; border-radius: calc(var(--sl-radiusButton, 12px) + 2px); border: 1px solid @line; background: @card; text-align: left; width: 100%; box-sizing: border-box;
        &:hover { border-color: @outline; }
        &.on { border-color: @orange; } }
    .chev-r { color: @sub; font-size: 18px; }
    /* the spot popup: grows in from its tip, fades out when switched off */
    :global(.spotlog-popup .leaflet-popup-content-wrapper), :global(.spotlog-popup .leaflet-popup-tip-container) { transform-origin: 50% 100%; animation: sl-pop-in 0.22s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
    :global(.spotlog-popup.sl-closing .leaflet-popup-content-wrapper), :global(.spotlog-popup.sl-closing .leaflet-popup-tip-container) { animation: sl-pop-out 0.17s ease-in both; }
    @keyframes -global-sl-pop-in { from { opacity: 0; transform: translateY(8px) scale(0.94); } to { opacity: 1; transform: none; } }
    @keyframes -global-sl-pop-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(6px) scale(0.96); } }
    @media (prefers-reduced-motion: reduce) { :global(.spotlog-popup .leaflet-popup-content-wrapper), :global(.spotlog-popup .leaflet-popup-tip-container) { animation: none; } }
    .toast { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 16px; border-radius: 14px; background: var(--sl-toast-bg, #f8f8f8); color: var(--sl-toast-text, #1c1c1c); font-weight: 600; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45); }
    .undo { height: 32px; padding: 0 14px; border-radius: 10px; border: 0; background: var(--sl-undo, #1c1c1c); color: var(--sl-toast-bg, #f8f8f8) !important; font-weight: 600; }

    :global(.spotlog-marker) { background: none; border: 0; }
    :global(.spotlog-pin) {
        position: absolute; transform: translate(-10px, -50%); display: flex; align-items: center; gap: 6px; white-space: nowrap;
        height: 26px; padding: 0 10px 0 6px; border-radius: 13px; background: var(--sl-pin-bg, #2e2e2e); color: var(--sl-pin-text, #f8f8f8);
        font: 600 12px 'Instrument Sans', system-ui, sans-serif; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35); cursor: pointer;
    }
    :global(.spotlog-pin i) { width: 10px; height: 10px; border-radius: 5px; background: var(--sl-pin-dot, #5a5a5a); display: block; flex-shrink: 0; }
    :global(.spotlog-pin.active) { background: var(--sl-active-bg, #f8f8f8); color: var(--sl-active-text, #1c1c1c); }
    :global(.spotlog-pin em) { font-style: normal; font-weight: 600; font-size: 11px; opacity: 0.9; margin-left: 2px; }
    /* zoomed out: a plain dot */
    :global(.spotlog-cdot) { position: absolute; left: calc(var(--sl-compact-size, 10px) / -2); top: calc(var(--sl-compact-size, 10px) / -2); width: var(--sl-compact-size, 10px); height: var(--sl-compact-size, 10px);
        border-radius: 50%; box-shadow: var(--sl-compact-ring, none); cursor: pointer; }
    /* sessions: one mark per place (style, colour and growth from the theme); hover for dates */
    :global(.spotlog-heat) { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); cursor: default; }
    :global(.spotlog-heat.core::after) { content: ''; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 3px; background: var(--sl-sess-color, #ff3d8b); box-shadow: 0 0 0 1.5px var(--sl-sess-core-ring, #ffffff); }
    :global(.spotlog-tip) { display: none; position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); z-index: 5; flex-direction: column; gap: 3px; min-width: 130px; padding: 8px 10px; border-radius: 10px;
        background: var(--sl-tip-bg, #2e2e2e); color: var(--sl-tip-text, #f8f8f8); font: 12px 'Instrument Sans', system-ui, sans-serif; white-space: nowrap; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45); pointer-events: none; }
    :global(.spotlog-tip span) { display: flex; align-items: center; gap: 6px; opacity: 0.85; }
    :global(.spotlog-tip i) { width: 8px; height: 8px; border-radius: 4px; display: block; }
    :global(.spotlog-tip small) { opacity: 0.6; font-size: 11px; }
    :global(.spotlog-heat:hover .spotlog-tip), :global(.spotlog-pin:hover .spotlog-tip), :global(.spotlog-cdot:hover .spotlog-tip) { display: flex; }
    :global(.spotlog-pin .spotlog-tip) { left: 10px; transform: translateX(-50%); bottom: calc(100% + 6px); font-weight: 400; }
    :global(.spotlog-pin .spotlog-tip b) { font-weight: 600; }
    :global(.spotlog-dot) { position: absolute; left: -8px; top: -8px; width: 16px; height: 16px; border-radius: 8px; box-sizing: border-box; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45); }
    :global(.spotlog-dot.start) { left: -6px; top: -6px; width: 12px; height: 12px; background: var(--sl-start-fill, #ff3d8b); border: 2.5px solid var(--sl-start-border, #f8f8f8); }
    :global(.spotlog-dot.end) { left: -5px; top: -5px; width: 10px; height: 10px; background: var(--sl-end-fill, #1c1c1c); border: 2.5px solid var(--sl-end-border, #ff3d8b); }
    :global(.spotlog-route-label) { position: absolute; transform: translate(12px, -50%); white-space: nowrap; font: 600 13px 'Instrument Sans', system-ui, sans-serif; color: var(--sl-route-label, #f8f8f8); text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.35); }
    :global(.spotlog-popup .leaflet-popup-content-wrapper) { background: var(--sl-popup-bg, #f8f8f8); color: var(--sl-popup-text, #1c1c1c); border-radius: 16px; }
    :global(.spotlog-popup .leaflet-popup-content) { margin: 12px; }
    :global(.sl-pop) { display: flex; flex-direction: column; gap: 8px; min-width: 220px; font: 13px 'Instrument Sans', system-ui, sans-serif; color: var(--sl-popup-text, #1c1c1c); }
    :global(.sl-pop small) { color: var(--sl-popupSub, #6b6b6b); font-size: 12px; }
    :global(.sl-h) { display: flex; align-items: flex-start; gap: 8px; }
    :global(.sl-h > span:first-child) { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    :global(.sl-nav) { display: flex; gap: 4px; flex-shrink: 0; }
    :global(.sl-pop:has(.sl-acts)) { min-width: 264px; }
    :global(.sl-nav button), :global(.sl-acts button) { font: 600 13px 'Instrument Sans', system-ui, sans-serif; color: var(--sl-popupBtnText, #1c1c1c); background: var(--sl-popupBtnBg, #ececea); border: 0; border-radius: 10px; cursor: pointer; }
    :global(.sl-nav button) { width: 30px; height: 30px; font-size: 18px; line-height: 1; padding: 0; }
    /* the name inside a phrase (copy.ts {spotlog}): normal text font, with the pixel star */
    :global(.sl-brand) { display: inline-flex; align-items: center; gap: 0.22em; white-space: nowrap; vertical-align: -0.06em; line-height: 1; }
    :global(.sl-star) { display: inline-block; flex-shrink: 0; color: var(--sl-star, #d49500); }
    :global(.sl-nav .sl-x) { background: transparent; color: var(--sl-popupSub, #6b6b6b); font-size: 15px; margin-left: 2px; }
    :global(.sl-acts) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-top: 2px; }
    :global(.sl-acts) { grid-template-columns: 1.3fr 1.1fr 0.9fr !important; }
    :global(.sl-acts button) { height: 36px; padding: 0 4px; white-space: nowrap; font-size: 12.5px !important; overflow: hidden; text-overflow: ellipsis; }
    :global(.sl-acts button:first-child) { background: var(--sl-primary-bg, #d49500); color: var(--sl-primary-text, #fff); }
    :global(.sl-h b) { font-size: 14px; }
    :global(.sl-tiles) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
    :global(.sl-t) { display: flex; flex-direction: column; justify-content: space-between; gap: 6px; min-height: 58px; padding: 7px 8px; border-radius: 9px; font-size: 11px; color: var(--sl-windText, #1c1c1c); box-sizing: border-box; }
    :global(.sl-t span) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :global(.sl-t b) { display: block; font: 900 20px 'Doto', ui-monospace, monospace; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: clip; }
    :global(.sl-pop .sl-t small) { display: block; font: 600 10px 'Instrument Sans', system-ui, sans-serif; color: inherit; opacity: 0.7; line-height: 1; white-space: nowrap; }
    :global(.sl-pop .sl-best b) { font-weight: 600; color: inherit; }
    :global(.sl-pop .sl-why) { display: block; font-size: 11.5px; letter-spacing: 0.01em; }
    :global(.sl-b) { align-self: flex-start; padding: 3px 9px; border-radius: 10px; font-size: 12px; font-weight: 600; }
</style>
