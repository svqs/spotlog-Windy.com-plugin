<div data-spotlog class="plugin__mobile-header">
    { title }
</div>
<!-- the key handlers only keep your typing inside Spotlog (away from Windy's search); the swipe handlers keep scrolling inside the panel -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<section data-spotlog aria-label={ W.appName } class="plugin__content spotlog" class:m={ isMobile } class:bar={ barMode } class:gatebar={ barMode && !!gate } bind:this={ root } on:touchstart={ touchStart } on:touchmove={ touchMove } on:touchend={ fieldTouchEnd } on:keydown={ keepKeys } on:keyup={ keepKeys } on:keypress={ keepKeys }>

{#if barMode}
<!-- ================= PHONE: a compact bar in Windy's pane; pages open in a panel that rises over the map (like The Buoy's list) ================= -->
    <div data-spotlog class="mbar">
        <div data-spotlog class="mrow">
            <span data-spotlog class="brand"><span data-spotlog class="wordmark">{ W.wordmark }</span><PixelStar size={ 12 } /><span data-spotlog class="beta">{ W.betaTag }</span></span>
            {#if waitingForMap}
                <span data-spotlog class="mhint">{ pickFor === 'snap' ? W.hintSnap : pickFor === 'log' ? W.hintLog : W.hintSpot }</span>
                <button data-spotlog class="mlink" on:click={ () => { waitingForMap = false; openModal(); } }>{ W.cancel }</button>
            {:else if capturing}
                <span data-spotlog class="mhint">{ W.hintLoading }</span>
            {:else if gate}
                <span data-spotlog class="mhint">{ W.hintPremium }</span>
            {:else}
                <span data-spotlog class="grow-b"></span>
                <button data-spotlog class="units" aria-label={ W.unitsLabel } on:click={ () => openUnits(true) }>{ unitsLabel } <span data-spotlog class="chev">▾</span></button>
            {/if}
        </div>
        {#if !gate}
            <div data-spotlog class="macts">
                <button data-spotlog class="mact" disabled={ capturing } on:click={ () => { startPick('snap'); } }><Icon name="weather" size={ 18 } /><span data-spotlog>{ W.actSaveForecast }</span></button>
                <button data-spotlog class="mact" on:click={ () => { startPick('spot'); } }><Icon name="pin" size={ 18 } /><span data-spotlog>{ W.actAddSpot }</span></button>
                <button data-spotlog class="mact" on:click={ () => { startPick('log'); } }><Icon name="pen" size={ 18 } /><span data-spotlog>{ W.actLogSession }</span></button>
            </div>
            <div data-spotlog class="mtabs">
                {#each [['spots', W.tabSpots], ['sessions', W.tabSessions], ['gear', W.tabGear], ['about', W.tabAbout]] as [k, label]}
                    <button data-spotlog class:on={ modalOpen && view === 'home' && tab === k } on:click={ () => toggleTab(asTab(k)) }>{ label }{#if k === 'spots'}<small data-spotlog class="cnt">{ data.spots.length }</small>{:else if k === 'sessions'}<small data-spotlog class="cnt">{ realSessions.length }</small>{/if}</button>
                {/each}
            </div>
        {:else}
            <button data-spotlog class="btn primary wide" on:click={ openModal }>{ gate === 'login' ? W.gateBarLogin : W.gateBarPremium }</button>
        {/if}
    </div>
{/if}
<div data-spotlog class="mwrap" class:on={ barMode } class:open={ modalOpen } class:unitspage={ barMode && unitsOpen } class:kb={ kbRoom }>
<div data-spotlog class="body" bind:this={ bodyEl } on:focusin={ fieldFocus } on:focusout={ fieldBlur }>

{#if gate}
<!-- ================= LOGIN / PREMIUM GATE ================= -->
    {#if barMode}<div data-spotlog class="topbar"><span data-spotlog class="grow"><b data-spotlog class="title"><Brand cap /></b></span><button data-spotlog class="mclose" aria-label={ W.close } on:click={ closeModal }>✕</button></div>{/if}
    <div data-spotlog class="card head">
        <div data-spotlog class="row"><span data-spotlog class="brand"><span data-spotlog class="wordmark">{ W.wordmark }</span><PixelStar size={ 15 } /></span></div>
        <p data-spotlog class="p">{@html rich(W.gateIntro)}</p>
    </div>
    <div data-spotlog class="card">
        {#if gate === 'login'}
            <b data-spotlog>{@html rich(W.gateLoginTitle)}</b>
            <p data-spotlog class="p muted">{@html rich(W.gateLoginText)}</p>
            <button data-spotlog class="btn primary wide" on:click={ () => bcast.emit('rqstOpen', 'login') }>{ W.gateLoginBtn }</button>
        {:else}
            <b data-spotlog>{@html rich(W.gatePremiumTitle)}</b>
            <p data-spotlog class="p muted">{@html rich(W.gatePremiumText, { user: wUser?.username || wUser?.email || W.windyUser })}</p>
            <button data-spotlog class="btn primary wide" on:click={ () => bcast.emit('rqstOpen', 'subscription') }>{ W.gatePremiumBtn }</button>
        {/if}
    </div>
{:else if welcome}
<!-- ================= WELCOME (once, for someone new) ================= -->
    <div data-spotlog class="welcome">
        {#if barMode}<div data-spotlog class="topbar"><span data-spotlog class="grow"></span><button data-spotlog class="mclose" aria-label={ W.close } on:click={ closeModal }>✕</button></div>{/if}
        <span data-spotlog class="brand"><span data-spotlog class="wordmark">{ W.wordmark }</span><PixelStar size={ 15 } /><span data-spotlog class="beta">{ W.betaTag }</span></span>
        <b data-spotlog class="h2">{@html rich(W.welcomeTitle)}</b>
        <p data-spotlog class="p">{@html rich(W.welcomeText)}</p>
        <button data-spotlog class="btn primary wide" on:click={ finishWelcome }>{ W.welcomeStart }</button>
        <button data-spotlog class="link" on:click={ () => { finishWelcome(); openHowItWorks(); } }>{ W.welcomeHow }</button>
        <label data-spotlog class="link">{ W.welcomeUpload }<input data-spotlog type="file" accept=".json,application/json" on:change={ e => { finishWelcome(); onUpload(e); } } hidden /></label>
    </div>
{:else}

<!-- ================= HEADER ================= -->
<!-- phones: units and saved data open as their own page in the panel -->
{#if barMode && unitsOpen}
    <div data-spotlog class="topbar upage">
        <button data-spotlog class="round" aria-label={ W.back } on:click={ unitsBack }>←</button>
        <span data-spotlog class="grow"><b data-spotlog class="title">{ W.unitsTitle }</b></span>
        <button data-spotlog class="mclose" aria-label={ W.close } on:click={ closeModal }>✕</button>
    </div>
    <div data-spotlog class="card upage"><Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } /></div>
{/if}
{#if view === 'home'}
    {#if barMode}
        <div data-spotlog class="topbar">
            <span data-spotlog class="grow"><b data-spotlog class="title">{ W[TAB_TITLE[tab]] }</b></span>
            <button data-spotlog class="units" aria-label={ W.unitsLabel } on:click={ () => openUnits() }>{ unitsLabel } <span data-spotlog class="chev">▾</span></button>
            <button data-spotlog class="mclose" aria-label={ W.close } on:click={ closeModal }>✕</button>
        </div>
    {/if}
    <div data-spotlog class="card head home-head">
        <div data-spotlog class="row">
            {#if !isMobile}
                <button data-spotlog class="back-menu" aria-label={ W.windyMenu } title={ W.windyMenu } on:click={ toWindyMenu }>
                    <svg data-spotlog width="14" height="22" viewBox="0 0 14 22" aria-hidden="true"><polyline data-spotlog points="11,3 3,11 11,19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
            {/if}
            <span data-spotlog class="brand grow-b"><span data-spotlog class="wordmark">{ W.wordmark }</span><PixelStar size={ 15 } /><span data-spotlog class="beta">{ W.betaTag }</span></span>
            <button data-spotlog class="units" aria-expanded={ showUnits } aria-label={ W.unitsLabel } on:click={ () => (showUnits = !showUnits) }>{ unitsLabel } <span data-spotlog class="chev" class:up={ showUnits }>▾</span></button>
        </div>
        {#if showUnits}<Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } />{/if}
        <div data-spotlog class="stats">
            <div data-spotlog><span data-spotlog class="lbl">{ W.statSpots }</span><span data-spotlog class="big">{ data.spots.length }</span></div>
            <div data-spotlog><span data-spotlog class="lbl">{ W.statSessions }</span><span data-spotlog class="big">{ realSessions.length }</span></div>
            <div data-spotlog><span data-spotlog class="lbl">{ W.statWater }</span><span data-spotlog class="big">{ hoursOnWater } <small data-spotlog>h</small></span></div>
        </div>
        {#if synced}
            <small data-spotlog class="sync" class:err={ syncState === 'error' } title={ syncState === 'error' ? syncError : '' }>{ syncLabel }</small>
        {/if}
    </div>
{:else}
    <div data-spotlog class="topbar">
        <button data-spotlog class="round" aria-label={ W.back } on:click={ back }>←</button>
        <span data-spotlog class="grow"><b data-spotlog class="title">{ hdr.title }</b>{#if hdr.sub}<small data-spotlog>{ hdr.sub }</small>{/if}</span>
        {#if barMode}
            <button data-spotlog class="units" aria-label={ W.unitsLabel } on:click={ () => openUnits() }>{ unitsLabel } <span data-spotlog class="chev">▾</span></button>
            <button data-spotlog class="mclose" aria-label={ W.close } on:click={ closeModal }>✕</button>
        {:else}
            <button data-spotlog class="units" aria-expanded={ showUnits } aria-label={ W.unitsLabel } on:click={ () => (showUnits = !showUnits) }>{ unitsLabel } <span data-spotlog class="chev" class:up={ showUnits }>▾</span></button>
        {/if}
    </div>
    {#if showUnits && !barMode}<div data-spotlog class="card"><Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } /></div>{/if}
{/if}

<!-- ================= HOME ================= -->
{#if view === 'home'}
    <div data-spotlog class="actions home-acts">
        <button data-spotlog class="act" disabled={ capturing } on:click={ () => startPick('snap') }><Icon name="weather" /><b data-spotlog>{ capturing ? W.actLoading : W.actSaveForecast }</b><small data-spotlog>{ W.actSaveForecastSub }</small></button>
        <button data-spotlog class="act" on:click={ () => startPick('spot') }><Icon name="pin" /><b data-spotlog>{ W.actAddSpot }</b><small data-spotlog>{ W.actAddSpotSub }</small></button>
        <button data-spotlog class="act" on:click={ () => startPick('log') }><Icon name="pen" /><b data-spotlog>{ W.actLogSession }</b><small data-spotlog>{ W.actLogSessionSub }</small></button>
    </div>

    <div data-spotlog class="tabs home-tabs">
        <button data-spotlog class:on={ tab === 'spots' } on:click={ () => (tab = 'spots') }>{ W.tabSpots }</button>
        <button data-spotlog class:on={ tab === 'sessions' } on:click={ () => (tab = 'sessions') }>{ W.tabSessions }</button>
        <button data-spotlog class:on={ tab === 'gear' } on:click={ () => (tab = 'gear') }>{ W.tabGear }</button>
        <button data-spotlog class:on={ tab === 'about' } on:click={ () => (tab = 'about') }>{ W.tabAbout }</button>
    </div>

    {#if tab === 'spots'}
        {#if data.spots.length === 0}
            <div data-spotlog class="empty">{@html rich(W.spotsEmpty)}</div>
        {:else}
            <div data-spotlog class="viewtog" role="group" aria-label={ W.spotDisplay }>
                <button data-spotlog class:on={ S.spotView === 'list' } aria-pressed={ S.spotView === 'list' } aria-label={ W.viewList } title={ W.viewList } on:click={ () => setSettings({ ...S, spotView: 'list' }) }>−</button>
                <button data-spotlog class:on={ S.spotView !== 'list' } aria-pressed={ S.spotView !== 'list' } aria-label={ W.viewTiles } title={ W.viewTiles } on:click={ () => setSettings({ ...S, spotView: 'tiles' }) }>+</button>
            </div>
            <!-- drag a spot to move it (mouse: press and move; phones: press and hold, then move) -->
            <div data-spotlog class="tiles" class:list={ S.spotView === 'list' } use:dragSort={ sortSpots }>
                {#each homeSpots as s (s.id)}
                    <button data-spotlog class="tile" data-drag-id={ s.id } animate:flip={ { duration: s.id === dragId ? 0 : 180 } } on:click={ () => (barMode ? spotOnMap(s) : openSpotOnMap(s)) }>
                        <span data-spotlog class="t-name">{ s.name }</span>
                        {#if nowOf(s.id, nowBySpot)}
                            <span data-spotlog class="now">
                                <span data-spotlog class="sw" style="background: { windColor(nowOf(s.id, nowBySpot)?.wind?.wind ?? null) }">{ fmtWind0(nowOf(s.id, nowBySpot)?.wind?.wind ?? null, S.wind) }</span>
                                <span data-spotlog class="now-t"><b data-spotlog>{ windLabel(S.wind) }</b></span>
                                {#if nowOf(s.id, nowBySpot)?.wind?.dir != null}
                                    <!-- the arrow points where the wind blows to, like Windy's; the letters say where it comes from -->
                                    <span data-spotlog class="wdir" title={ fill(W.windFrom, { direction: dirName(nowOf(s.id, nowBySpot)?.wind?.dir ?? null) }) }>
                                        <svg data-spotlog width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="transform: rotate({ (nowOf(s.id, nowBySpot)?.wind?.dir ?? 0) + 180 }deg)"><path data-spotlog d="M9 2 L14 10 L10.2 9 L10.2 16 L7.8 16 L7.8 9 L4 10 Z" fill="currentColor" /></svg>
                                        <small data-spotlog>{ dirName(nowOf(s.id, nowBySpot)?.wind?.dir ?? null) }</small>
                                    </span>
                                {/if}
                            </span>
                            <!-- gusts and waves under the wind: each stays whole, they wrap onto two lines when the tile is narrow -->
                            <span data-spotlog class="now-sub"><small data-spotlog>{ fill(W.tileGusts, { v: fmtWind0(nowOf(s.id, nowBySpot)?.wind?.gust ?? null, S.wind) }) }</small>{#if nowOf(s.id, nowBySpot)?.waves}<small data-spotlog>{ fill(W.tileWaves, { v: fmtHeight(nowOf(s.id, nowBySpot)?.waves?.waves ?? null, S.height, true) }) }</small>{/if}</span>
                        {:else}
                            <span data-spotlog class="now"><small data-spotlog>{ W.tileLoading }</small></span>
                        {/if}
                        <span data-spotlog class="t-tag">
                            {#if bestOf(s)}
                                <span data-spotlog class="tag" style="background: { guessCol(bestOf(s)?.level ?? 0)[0] }; color: { guessCol(bestOf(s)?.level ?? 0)[1] }" title={ guessNote(bestOf(s)) }>{ guessLbl(bestOf(s)?.level ?? 0, bestOf(s)?.sport) }</span>
                                {#if !bestOf(s)?.now}<small data-spotlog class="t-when">{ fill(W.from, { v: fmtTime(bestOf(s)?.start ?? 0) }) }</small>{/if}
                            {:else}
                                <span data-spotlog class="tag ghost" title={ guessNote(guessOf(s)) }>{ W.guessUnsure }</span>
                            {/if}
                        </span>
                    </button>
                {/each}
            </div>
            <small data-spotlog class="muted">{@html rich(W.spotsNote)}</small>
        {/if}
        <div data-spotlog class="card map-toggles">
            <button data-spotlog class="maptog" role="switch" aria-checked={ S.mapSpots } on:click={ () => setSettings({ ...S, mapSpots: !S.mapSpots }) }>
                <span data-spotlog class="grow"><b data-spotlog>{ W.mapSpotsTitle }</b><small data-spotlog>{ W.mapSpotsSub }</small></span>
                <span data-spotlog class="switch" class:on={ S.mapSpots }><i data-spotlog></i></span>
            </button>
            <button data-spotlog class="maptog" role="switch" aria-checked={ S.mapSessions } on:click={ () => setSettings({ ...S, mapSessions: !S.mapSessions }) }>
                <span data-spotlog class="grow"><b data-spotlog>{ W.mapSessTitle }</b><small data-spotlog>{ W.mapSessSub }</small></span>
                <span data-spotlog class="switch" class:on={ S.mapSessions }><i data-spotlog></i></span>
            </button>
        </div>
    {:else if tab === 'sessions'}
        {#if data.sessions.length === 0}
            <div data-spotlog class="empty">{@html rich(W.sessEmpty)}</div>
        {:else}
            <div data-spotlog class="seg">
                <button data-spotlog class:on={ sessView === 'list' } on:click={ () => (sessView = 'list') }>{ W.sessList }</button>
                <button data-spotlog class:on={ sessView === 'cal' } on:click={ () => (sessView = 'cal') }>{ W.sessCal }</button>
            </div>
            {#if sessView === 'list'}
                <div data-spotlog class="list">
                    {#each allSessions as se (se.id)}
                        <SwipeRow on:open={ () => openSession(se) } on:delete={ () => deleteSession(se) }>
                            <span data-spotlog class="dot" style="background: { ratingBg(se.rating) }; color: { ratingFg(se.rating) }">{ se.rating }</span>
                            <span data-spotlog class="grow"><span data-spotlog>{ spotById(se.spotId)?.name || W.noSpotYet }{ se.track ? ' · ' + W.gps : '' }</span><small data-spotlog>{ fmtDay(se.date) } · { se.checked ? W.checkedLabel : se.notes ? se.notes.slice(0, 38) : RATE[se.rating - 1] }</small></span>
                        </SwipeRow>
                    {/each}
                </div>
                <small data-spotlog class="muted">{ W.swipeHint }</small>
            {:else}
                <Calendar sessions={ realSessions } colors={ RATING_BG } labels={ RATE } spotName={ se => spotById(se.spotId)?.name || W.noSpotYet } on:open={ e => openSession(e.detail) } />
            {/if}
        {/if}
    {:else if tab === 'gear'}
        <GearScreen groups={gearGroups} count={data.gear.length} {gearUse} on:add={ e => addGear(e.detail) } on:remove={ e => deleteGear(e.detail) } />
    {:else}
        <About {version} feedbackUrl={ FEEDBACK_URL } deleteArmed={ armed === 'all' } on:download={ () => exportJson(data) } on:upload={ e => onUpload(e.detail) } on:clear={ clearAll } />
    {/if}
    {#if tab !== 'about'}<small data-spotlog class="beta-note">{@html rich(W.betaNote)}</small>{/if}


<!-- ================= PICK A PLACE ================= -->
{:else if view === 'pick'}
    {#if pickFor === 'snap'}
        <p data-spotlog class="p muted">{@html rich(W.pickSnapNote, { time: fmtTime(Date.now() + 864e5) })}</p>
    {/if}
    <div data-spotlog class="opts">
        {#if pickFor === 'log' && lastSnap}
            <button data-spotlog class="opt" on:click={ () => lastSnap && startLog({ snap: lastSnap }) }>
                <span data-spotlog class="ico"><Icon name="weather" /></span>
                <span data-spotlog class="grow"><span data-spotlog>{ W.pickLast }</span><small data-spotlog>{ spotById(lastSnap.spotId)?.name || W.pickSavedPlace } · { fmtDayTime(lastSnap.ts) }</small></span>
                <span data-spotlog class="chev-r" aria-hidden="true">›</span>
            </button>
        {/if}
        <button data-spotlog class="opt" class:on={ waitingForMap } on:click={ () => { waitingForMap = true; locError = ''; if (barMode) {modalOpen = false;} } }>
            <span data-spotlog class="ico" class:live={ waitingForMap }><Icon name="pointer" /></span>
            <span data-spotlog class="grow"><span data-spotlog>{ isMobile ? W.pickTap : W.pickClick }</span><small data-spotlog>{ waitingForMap ? (isMobile ? W.pickTapWaiting : W.pickClickWaiting) : W.pickMapSub }</small></span>
        </button>
        <button data-spotlog class="opt" disabled={ locating } on:click={ useMyLocation }>
            <span data-spotlog class="ico" class:live={ locating }><Icon name="crosshair" /></span>
            <span data-spotlog class="grow"><span data-spotlog>{ W.pickMe }</span><small data-spotlog class:err={ !!locError }>{ locating ? W.pickMeFinding : locError || W.pickMeSub }</small></span>
            <span data-spotlog class="chev-r" aria-hidden="true">›</span>
        </button>
        {#if pickFor === 'log'}
            <button data-spotlog class="opt" on:click={ () => startLog({}) }>
                <span data-spotlog class="ico"><Icon name="plus" /></span>
                <span data-spotlog class="grow"><span data-spotlog>{ W.pickNoPlace }</span><small data-spotlog>{ W.pickNoPlaceSub }</small></span>
                <span data-spotlog class="chev-r" aria-hidden="true">›</span>
            </button>
        {/if}
    </div>
    {#if pickFor !== 'spot' && spotsByCentre.length}
        <div data-spotlog class="section">
            <small data-spotlog class="lbl">{ W.pickNearest }</small>
            <div data-spotlog class="opts">
                {#each spotsByCentre as s (s.id)}
                    <button data-spotlog class="opt" on:click={ () => actOn(pickFor, { lat: s.lat, lon: s.lon, name: s.name }, s) }>
                        <span data-spotlog class="ico"><i data-spotlog class="dot-s"></i></span>
                        <span data-spotlog class="grow"><span data-spotlog>{ s.name }</span><small data-spotlog>{ s.place || W.yourSpot }</small></span>
                        <span data-spotlog class="chev-r" aria-hidden="true">›</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}
    {#if pickFor === 'snap'}
        <small data-spotlog class="muted sl-note">{@html rich(W.pickTip)}</small>
    {/if}

<!-- ================= PLACE (clicked on map) ================= -->
{:else if view === 'place' && place}
    <SnapCard title={ pinName(place.name) } sub={ fill(W.placeSub, { time: timelineLabelFull }) } model={ modelLabel(currentModel()) } wind={ placeNow } waves={ placeWaves } loading={ placeLoading } u={ S } empty={ W.placeEmpty } />
    {#if nearSpot}
        <button data-spotlog class="card row link-card" on:click={ () => nearSpot && openSpot(nearSpot.s) }>
            <span data-spotlog class="ico"><i data-spotlog class="dot-s"></i></span><span data-spotlog class="grow"><small data-spotlog>{ W.nearSpot }</small><b data-spotlog>{ nearSpot.s.name } · { fmtDistance(nearSpot.d, S.height) }</b></span><span data-spotlog>›</span>
        </button>
    {/if}
    <div data-spotlog class="actions">
        <button data-spotlog class="act" disabled={ capturing } on:click={ () => place && actOn('snap', place) }><Icon name="weather" /><b data-spotlog>{ capturing ? W.actLoading : W.actSaveForecast }</b><small data-spotlog>{ W.actSaveForecastSub }</small></button>
        <button data-spotlog class="act" on:click={ () => place && actOn('spot', place) }><Icon name="pin" /><b data-spotlog>{ W.actAddSpot }</b><small data-spotlog>{ W.here }</small></button>
        <button data-spotlog class="act" on:click={ () => place && actOn('log', place) }><Icon name="pen" /><b data-spotlog>{ W.actLogSession }</b><small data-spotlog>{ W.here }</small></button>
    </div>

<!-- ================= NEW / EDIT SPOT ================= -->
{:else if view === 'spotForm' && sf}
    <SpotFormScreen bind:form={sf} settings={S} {isMobile} otherOpen={otherFor === 'spot'} bind:otherName {sportChoices} {sportLbl} on:openOther={ () => openOther('spot') } on:addOther={ addOther } on:save={saveSpotForm} on:step={ e => stepRange(e.detail.range, e.detail.delta) } />

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
        badge={ spotGuess ? guessLbl(spotGuess.level, spotGuess.sport) : '' }
        badgeNote={ guessNote(spotGuess) }
        badgeBg={ guessCol(spotGuess?.level ?? 0)[0] }
        badgeFg={ guessCol(spotGuess?.level ?? 0)[1] }
        tide={ spotOutlook?.tide?.day && (spotOutlook.tide.day.highs.length || spotOutlook.tide.day.lows.length) ? tideList(spotOutlook.tide.day) : '' }
        tidePremium={ spotOutlook?.tide?.needsPremium ? fill(W.tidePremium) : '' }
    />

    {#if spotModels.length > 1}
        <div data-spotlog class="models-pick" role="radiogroup" aria-label={ W.forecastModel }>
            {#each spotModels as m}
                <button data-spotlog class:on={ spotModel === m } role="radio" aria-checked={ spotModel === m } on:click={ () => spot && setSpotModel(spot, m) }>{ modelLabel(m) }</button>
            {/each}
        </div>
    {/if}
    <div data-spotlog class="actions">
        <button data-spotlog class="act" disabled={ capturing } on:click={ () => spot && saveForecastAt({ lat: spot.lat, lon: spot.lon, spot }) }><Icon name="weather" /><b data-spotlog>{ capturing ? W.actLoading : W.actSaveForecast }</b><small data-spotlog>{ W.actSaveForecastSub }</small></button>
        <button data-spotlog class="act" on:click={ () => spot && startLog({ spot }) }><Icon name="pen" /><b data-spotlog>{ W.actLogSession }</b><small data-spotlog>{ W.spotLogSub }</small></button>
        <!-- desktop: a switch (on when you open a spot); phones: shows the spot's card on the map and the panel steps aside (Details brings it back) -->
        <button data-spotlog class="act" class:on={ !barMode && mapShown === spot.id } aria-pressed={ !barMode && mapShown === spot.id } on:click={ () => spot && (barMode ? spotOnMap(spot) : toggleShowOnMap(spot)) }><Icon name="map" /><b data-spotlog>{ W.showOnMap }</b>{#if !barMode && mapShown === spot.id}<small data-spotlog>{ W.showOnMapHide }</small>{/if}</button>
    </div>

    {#if !savedToday}
        <small data-spotlog class="muted nudge">{ W.saveNudge }</small>
    {/if}

    <!-- what works in general: your wind window -->
    <div data-spotlog class="card">
        {#if spot.windUnknown}
            <div data-spotlog class="row start">
                <span data-spotlog class="grow"><b data-spotlog>{ W.windUnknownTitle }</b><small data-spotlog>{@html rich(W.windUnknownText)}</small></span>
                <button data-spotlog class="link" on:click={ () => spot && editSpot(spot) }>{ W.edit }</button>
            </div>
            {#if suggestion}
                <div data-spotlog class="suggest">
                    <span data-spotlog class="grow"><small data-spotlog>{ W.bestDays }</small><b data-spotlog>{ directionText(suggestion.dirs) }, { fmtWind0(suggestion.min, S.wind) }–{ fmtWind0(suggestion.max, S.wind) } { windLabel(S.wind) }</b><small data-spotlog>{ fill(W.bestDaysFrom, { n: suggestion.basedOn }) }</small></span>
                    <button data-spotlog class="btn primary small" on:click={ applySuggestion }>{ W.useThis }</button>
                </div>
            {:else}
                <small data-spotlog class="muted">{ fill(W.moreNeeded, { n: Math.max(0, 2 - goodCount) }) }</small>
            {/if}
        {:else}
            <div data-spotlog class="row start">
                <span data-spotlog class="arrows">
                    {#each spot.dirs as d}<span data-spotlog class="arrow o"><WindArrow from={ DIRS.indexOf(d) * 45 } size={ 18 } /></span>{/each}
                </span>
                <span data-spotlog class="grow"><b data-spotlog>{ fill(W.works, { dirs: directionText(spot.dirs), min: fmtWind0(spot.min, S.wind), max: fmtWind0(spot.max, S.wind), unit: windLabel(S.wind) }) }</b></span>
                <button data-spotlog class="link" on:click={ () => spot && editSpot(spot) }>{ W.edit }</button>
            </div>

            {#if spotLearnedWindow}
                <div data-spotlog class="suggest">
                    <span data-spotlog class="grow"><small data-spotlog>{ W.learnedWindowTitle }</small><b data-spotlog>{ directionText(spotLearnedWindow.dirs) }, { fmtWind0(spotLearnedWindow.min, S.wind) }–{ fmtWind0(spotLearnedWindow.max, S.wind) } { windLabel(S.wind) }</b></span>
                    <button data-spotlog class="btn primary small" on:click={ useLearnedWindow }>{ W.useLearned }</button>
                </div>
            {/if}
        {/if}
        <div data-spotlog class="stats sep">
            <div data-spotlog><span data-spotlog class="lbl">{ W.statSessions }</span><span data-spotlog class="big">{ spotReal.length }</span></div>
            <div data-spotlog><span data-spotlog class="lbl">{ W.statAvg }</span><span data-spotlog class="big">{ avgRating }</span></div>
        </div>
    </div>

    <!-- the recommendation: today and the next days -->
    <div data-spotlog class="section">
        <b data-spotlog>{ W.recoTitle }</b>
        <div data-spotlog class="card reco">
            {#if spotBest}
                <div data-spotlog class="reco-row">
                    <span data-spotlog class="r-day">{ W.today }</span>
                    <span data-spotlog class="tag" style="background: { guessCol(spotBest.level)[0] }; color: { guessCol(spotBest.level)[1] }" title={ guessNote(spotBest) }>{ guessLbl(spotBest.level, spotBest.sport) }</span>
                    <b data-spotlog class="r-time">{#if spotBest.now}<span data-spotlog>{ bestRange(spotBest) }</span>{:else}<span data-spotlog>{ fmtTime(spotBest.start) }–</span><span data-spotlog>{ fmtTime(spotBest.end) }</span>{/if}</b>
                </div>
            {/if}
            {#each spotDays.filter(d => d.best) as d (d.day)}
                <div data-spotlog class="reco-row">
                    <span data-spotlog class="r-day">{ fmtDay(d.day) }{#if predOfDay(d.day, spotOutlook) !== null}<small data-spotlog class="r-pred" title={ W.predTitle }>{ fill(W.predShort, { p: Math.round(predOfDay(d.day, spotOutlook) ?? 0) }) }</small>{/if}</span>
                    {#if d.best}
                        <span data-spotlog class="tag" style="background: { guessCol(d.best.level)[0] }; color: { guessCol(d.best.level)[1] }" title={ guessNote(d.best) }>{ guessLbl(d.best.level, d.best.sport) }</span>
                        <b data-spotlog class="r-time"><span data-spotlog>{ fmtTime(d.best.start) }–</span><span data-spotlog>{ fmtTime(d.best.end) }</span></b>
                    {/if}
                </div>
            {/each}
            {#if !spotOutlook || !dayBySpot[spot.id]}<small data-spotlog class="muted r-later">{ W.checking }</small>{:else if !spotBest && !spotDays.some(d => d.best)}<small data-spotlog class="muted r-later">{ W.daysNone }</small>{/if}
        </div>
    </div>

    <!-- what works here for you: folded to one line, open for the details (it stays as you leave it) -->
    <div data-spotlog class="section works-sec">
        <button data-spotlog class="works-head" aria-expanded={ S.worksOpen } on:click={ () => setWorksOpen(!S.worksOpen) }>
            <b data-spotlog>{ W.worksTitle }</b><span data-spotlog class="chev" class:open={ S.worksOpen } aria-hidden="true">›</span>
        </button>
        {#if !S.worksOpen}
            <button data-spotlog class="card works-sum" on:click={ () => setWorksOpen(true) }>
                {#each spotLearned as m (m.sport)}
                    <span data-spotlog class="ws-line"><b data-spotlog>{ sportLbl(m.sport) }</b><span data-spotlog class:muted={ !worksLine(m) }>{ worksLine(m) || W.worksUnknown }</span></span>
                {/each}
                <small data-spotlog class="muted">{ W.worksOpenHint }</small>
            </button>
        {:else}
            <div data-spotlog class="card works">
                {#each spotLearned as m (m.sport)}
                    <div data-spotlog class="w-sport">
                        <div data-spotlog class="w-head">
                            <b data-spotlog>{ sportLbl(m.sport) }</b>
                            <!-- where the ranges come from: your sessions, else your wind window or your own ranges; nothing when nothing is known yet -->
                            <small data-spotlog class="muted grow">{ m.outings ? W.learnedFromShort : m.rows.some(r => r.from === 'window') ? W.fromWindowShort : m.rows.some(r => r.from === 'you') ? W.setByYou : '' }</small>
                            {#if editSport !== m.sport}<button data-spotlog class="link" on:click={ () => startEdit(m) }>{ W.adjust }</button>{/if}
                        </div>
                        {#if editSport === m.sport}
                            <div data-spotlog class="w-grid edit">
                                {#each allFeatures(m.sport) as key (key)}
                                    <span data-spotlog class="w-name">{ paramName(key) }</span>
                                    {#if isCircular(key)}
                                        <div data-spotlog class="w-dirs">
                                            {#each DIRS as d}<button data-spotlog class="dchip" class:on={ editRows[key]?.dirs.includes(d) } aria-pressed={ editRows[key]?.dirs.includes(d) } on:click={ () => toggleEditDir(key, d) }>{ d }</button>{/each}
                                        </div>
                                    {:else if editRows[key]}
                                        <div data-spotlog class="w-inputs">
                                            <input data-spotlog inputmode="decimal" bind:value={ editRows[key].lo } placeholder="–" aria-label={ paramName(key) + ' ' + W.formMin } />
                                            <span data-spotlog>–</span>
                                            <input data-spotlog inputmode="decimal" bind:value={ editRows[key].hi } placeholder="–" aria-label={ paramName(key) + ' ' + W.formMax } />
                                            <small data-spotlog>{ key === 'wind' || key === 'gust' ? windLabel(S.wind) : key === 'waves' || key === 'swell' ? S.height : key === 'period' ? 's' : key === 'temp' ? '°' + S.temp : key === 'rain' ? 'mm' : key === 'power' ? 'kW/m' : '' }</small>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                            <small data-spotlog class="muted">{ W.adjustNote }</small>
                            <div data-spotlog class="btns">
                                <button data-spotlog class="btn primary small" on:click={ saveEdit }>{ W.save }</button>
                                <button data-spotlog class="btn ghost small" on:click={ () => (editSport = null) }>{ W.cancel }</button>
                                {#if spot.ranges?.[m.sport]}<button data-spotlog class="link" on:click={ () => resetEdit(m.sport) }>{ W.backToLearned }</button>{/if}
                            </div>
                        {:else if m.rows.length}
                            <div data-spotlog class="w-grid">
                                <span data-spotlog class="w-h"></span><span data-spotlog class="w-h">{ W.colWorks }</span><span data-spotlog class="w-h">{ W.colMatters }</span><span data-spotlog class="w-h w-r">{ W.colNow }</span>
                                {#each spotParts(m) as row (row.r.key)}
                                    <span data-spotlog class="w-name">{ paramName(row.r.key) }{#if row.r.from === 'you'}<i data-spotlog class="w-you" title={ W.setByYou }></i>{/if}</span>
                                    <b data-spotlog class="w-range">{ rangeText(row.r) }</b>
                                    <span data-spotlog class="w-imp imp{ mattersLevel(row.r.matters) }">{ W['matter' + mattersLevel(row.r.matters)] }</span>
                                    {#if row.value !== null && row.fit !== null}
                                        <span data-spotlog class="w-now" class:ok={ row.fit >= 0.99 } class:near={ row.fit > 0 && row.fit < 0.99 }>{ nowText(row.r.key, row.value) }</span>
                                    {:else}
                                        <span data-spotlog class="w-now">–</span>
                                    {/if}
                                {/each}
                            </div>
                        {:else}
                            <small data-spotlog class="muted">{ W.worksUnknownLong }</small>
                        {/if}
                    </div>
                {/each}
                {#each spotGear as gh (gh.gearId)}
                    <small data-spotlog class="gear-hint">{ fill(W.gearHint, { gear: data.gear.find(g => g.id === gh.gearId)?.name || W.gear, range: `${fmtWind0(gh.lo, S.wind)}–${fmtWind0(gh.hi, S.wind)} ${windLabel(S.wind)}`, n: gh.sessions }) }</small>
                {/each}
                <small data-spotlog class="muted">{ W.worksLegend }</small>
            </div>
        {/if}
    </div>

    <!-- Which model foretold your outings best; a clearly better model can become the learning model. -->
    <div data-spotlog class="section">
        <b data-spotlog>{ W.trustTitle }</b>
        <div data-spotlog class="card">
            {#if trust.length === 0}
                <span data-spotlog class="muted">{@html rich(W.trustEmpty)}</span>
            {:else}
                {#each trust as sc, i}
                    <div data-spotlog class="score"><span data-spotlog class="m" class:best={ i === 0 }>{ modelLabel(sc.model) }</span><span data-spotlog class="missbar"><i data-spotlog style="width: { closeness(sc.miss, trust) }%" class:best={ i === 0 }></i></span><span data-spotlog>{ fill(W.trustMiss, { v: sc.miss.toFixed(1) }) }</span></div>
                {/each}
                <small data-spotlog class="muted">{ fill(W.trustNote, { n: trust[0].count, model: modelLabel(modelFor(spot)) }) }</small>
            {/if}
        </div>
    </div>

    <div data-spotlog class="section">
        <b data-spotlog>{ W.savedTitle }</b>
        {#if spotSnapshots.length === 0}
            <span data-spotlog class="muted">{@html rich(W.savedEmpty)}</span>
        {:else}
            <div data-spotlog class="list">
                {#each spotSnapshots.slice(0, 8) as sn (sn.id)}
                    <div data-spotlog class="item static">
                        <span data-spotlog class="sw" style="background: { windColor(primaryOf(sn)?.wind ?? null) }">{ fmtWind0(primaryOf(sn)?.wind ?? null, S.wind) }</span>
                        <button data-spotlog class="grow plain" on:click={ () => openSnap(sn) }><span data-spotlog>{ fmtDayTime(sn.ts) }</span><small data-spotlog>{ fill(W.modelsN, { n: sn.models.length }) }{ sn.note ? ' · ' + sn.note.slice(0, 24) : '' }</small></button>
                        <button data-spotlog class="mini" on:click={ () => openSnap(sn) }>{ W.edit }</button>
                        <button data-spotlog class="mini danger" on:click={ () => deleteSnap(sn) }>{ W.delete }</button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div data-spotlog class="section">
        <b data-spotlog>{ W.sessHere }</b>
        {#if spotSessions.length === 0}
            <span data-spotlog class="muted">{ W.sessHereEmpty }</span>
        {:else}
            <div data-spotlog class="list">
                {#each spotSessions as se (se.id)}
                    <SwipeRow on:open={ () => openSession(se) } on:delete={ () => deleteSession(se) }>
                        <span data-spotlog class="dot" style="background: { ratingBg(se.rating) }; color: { ratingFg(se.rating) }">{ se.rating }</span>
                        <span data-spotlog class="grow"><span data-spotlog>{ fmtDay(se.date) }{ se.track ? ' · ' + W.gps : '' }</span><small data-spotlog>{ se.checked ? W.checkedLabel : se.notes ? se.notes.slice(0, 40) : RATE[se.rating - 1] }</small></span>
                    </SwipeRow>
                {/each}
            </div>
            <small data-spotlog class="muted">{ W.swipeHint }</small>
        {/if}
    </div>

    <button data-spotlog class="link danger" on:click={ () => spot && deleteSpot(spot) }>{ armed === 'spot' ? W.deleteSpotArmed : W.deleteSpot }</button>

<!-- ================= SNAPSHOT ================= -->
{:else if view === 'snap' && snap}
    <SnapCard title={ snapDraft ? fill(W.snapNow, { time: fmtTime(snap.ts) }) : fmtDayTime(snap.ts) } sub={ snapDraft ? W.snapDraftSub : fill(W.snapSavedSub, { time: fmtDayTime(snap.savedAt) }) } model={ modelLabel(snap.primary) } wind={ primaryOf(snap) } waves={ snap.waves } models={ snap.models } u={ S } />
    <small data-spotlog class="muted sl-note">{ snap.series ? fill(W.snapSeries, { time: fmtTime(snap.series.ts[0]), n: Object.keys(snap.series.models).length }) : W.snapOld } { W.snapUses }</small>
    <div data-spotlog class="card">
        <div data-spotlog class="row">
            <span data-spotlog class="ico"><i data-spotlog class="dot-s" class:off={ !snap.spotId }></i></span>
            <span data-spotlog class="grow"><small data-spotlog>{ W.spotLabel }</small><b data-spotlog>{ spotById(snap.spotId)?.name || W.snapNoSpot }</b></span>
            <button data-spotlog class="btn ghost small" on:click={ () => (linkOpen = !linkOpen) }>{ linkOpen ? W.done : snap.spotId ? W.editLinked : W.linkSpot }</button>
        </div>
        {#if linkOpen}
            <div data-spotlog class="chips">
                {#each nearestSpots(snap.lat, snap.lon).slice(0, 5) as s (s.id)}
                    <button data-spotlog class="chip" class:on={ snap.spotId === s.id } on:click={ () => { linkSnap(s.id); linkOpen = false; } }>{ s.name }</button>
                {/each}
                <button data-spotlog class="chip dash" on:click={ () => snap && startSpotForm({ lat: snap.lat, lon: snap.lon }, 'snap') }>{ W.newSpotHere }</button>
                {#if snap.spotId}<button data-spotlog class="chip" on:click={ () => { linkSnap(null); linkOpen = false; } }>{ W.noSpot }</button>{/if}
            </div>
        {/if}
    </div>
    <label data-spotlog class="field"><span data-spotlog class="lbl">{ W.note }</span><textarea data-spotlog rows="3" bind:value={ snapNote } on:change={ saveSnapNote } placeholder={ W.notePh }></textarea></label>
    <div data-spotlog class="btns">
        {#if snapDraft && replaceOf}
            <div data-spotlog class="replace">
                <b data-spotlog>{ fill(W.replaceTitle, { spot: spotById(replaceOf.spotId)?.name || '' }) }</b>
                <small data-spotlog>{ fill(W.replaceText, { time: fmtDayTime(replaceOf.savedAt) }) }</small>
                <div data-spotlog class="btns">
                    <button data-spotlog class="btn primary" on:click={ () => confirmSnap(true) }>{ W.replace }</button>
                    <button data-spotlog class="btn ghost" on:click={ () => (replaceOf = null) }>{ W.keepOld }</button>
                </div>
            </div>
        {:else if snapDraft}
            <button data-spotlog class="btn primary" on:click={ () => confirmSnap(false) }>{ W.actSaveForecast }</button>
            <button data-spotlog class="btn ghost" on:click={ back }>{ W.cancel }</button>
        {:else}
            <button data-spotlog class="btn primary" on:click={ back }>{ W.done }</button>
            <button data-spotlog class="btn ghost" on:click={ () => snap && deleteSnap(snap) }>{ W.delete }</button>
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
            u={ S }
        />
        {#if logView.note}<small data-spotlog class="muted sl-note">{ logView.note }</small>{/if}
        {#if logView.otherDay && f.lat !== undefined && !capturing}
            <button data-spotlog class="btn ghost" on:click={ () => captureForLog() }>{ f.dateStr === dateStrOf(Date.now()) ? W.logUseHours : fill(W.logSaveFor, { day: fmtDay(sessionFocus(f) ?? Date.now()) }) }</button>
        {/if}
    {:else}
        <div data-spotlog class="snapless">
            {#if capturing}
                <span data-spotlog>{ W.logSaving }</span>
            {:else if f.lat !== undefined}
                <span data-spotlog class="grow">{ captureError || W.logNoFc }</span>
                <button data-spotlog class="btn primary small" on:click={ () => f && captureForLog() }>{ W.logSaveNow }</button>
            {:else}
                <span data-spotlog class="grow">{ W.logNoPlace }</span>
            {/if}
        </div>
    {/if}

    <div data-spotlog class="field"><span data-spotlog class="lbl">{ W.when }</span>
        <div data-spotlog class="when" class:one={ isMobile }>
            <input data-spotlog type="date" bind:value={ f.dateStr } aria-label={ W.dateLabel } />
            <div data-spotlog class="row start times">
                <TimeWheel bind:value={ f.start } placeholder={ W.start } />
                <span data-spotlog class="to">→</span>
                <TimeWheel bind:value={ f.end } placeholder={ W.end } align={ isMobile ? 'end' : 'center' } />
            </div>
        </div>
        {#if f.start && f.end && f.end < f.start}<small data-spotlog class="muted">{ W.nextDay }</small>{/if}
        {#if !f.start && !f.checked}<small data-spotlog class="muted">{ W.startNeeded }</small>{:else if f.start && !f.end}<small data-spotlog class="muted">{ W.endHelps }</small>{/if}
        {#if logLate}<small data-spotlog class="muted">{ W.logLateFc }</small>{/if}
    </div>

    <div data-spotlog class="card">
        <div data-spotlog class="row">
            <span data-spotlog class="ico"><i data-spotlog class="dot-s"></i></span>
            <span data-spotlog class="grow"><small data-spotlog>{ W.spotLabel }</small><b data-spotlog>{ spotById(f.spotId)?.name || W.noSpotYet }</b></span>
            {#if f.spotId}<button data-spotlog class="link" on:click={ () => f && (f = { ...f, spotId: null }) }>{ W.change }</button>{/if}
        </div>
        {#if f.spotId}
            <!-- the sport of this session (any sport: a new one is added to the spot); spots learn per sport -->
            <div data-spotlog class="chips sep" role="radiogroup" aria-label={ W.sessionSport }>
                {#each sportChoices(spotById(f.spotId)?.sports || [], f.sport) as sp}
                    <button data-spotlog class="chip" class:on={ otherFor !== 'log' && logSport(f) === sp } role="radio" aria-checked={ otherFor !== 'log' && logSport(f) === sp } on:click={ () => { otherFor = null; if (f) {f = { ...f, sport: sp };} } }>{ sportLbl(sp) }</button>
                {/each}
                <button data-spotlog class="chip" class:on={ otherFor === 'log' } aria-expanded={ otherFor === 'log' } on:click={ () => openOther('log') }>{ W.sportAddOther }</button>
            </div>
            {#if otherFor === 'log'}
                <div data-spotlog class="other-sport">
                    <input data-spotlog bind:value={ otherName } maxlength="20" placeholder={ W.sportNameHint } aria-label={ W.sportNameHint } on:keydown={ e => e.key === 'Enter' && addOther() } />
                    <button data-spotlog class="btn primary small" disabled={ !otherName.trim() } on:click={ addOther }>{ W.sportAdd }</button>
                </div>
            {/if}
        {/if}
        {#if !f.spotId}
            <div data-spotlog class="chips">
                {#each (f.lat !== undefined ? nearestSpots(f.lat, f.lon ?? 0) : data.spots).slice(0, 5) as s (s.id)}
                    <button data-spotlog class="chip" on:click={ () => assignSpot(s) }>{ s.name }</button>
                {/each}
                <button data-spotlog class="chip dash" on:click={ newSpotFromLog }>{ W.newSpot }</button>
            </div>
            <small data-spotlog class="muted">{ W.noSpotNote }</small>
        {/if}
    </div>

    <div data-spotlog class="section">
        <b data-spotlog class="h2">{ W.howWas }</b>
        <div data-spotlog class="ratings">
            {#each RATE as r, i}
                <button data-spotlog class="rate" class:on={ !f.checked && f.rating === i + 1 } style={ !f.checked && f.rating === i + 1 ? `background: ${ RATING_BG[i] }; border-color: ${ RATING_BG[i] }; color: ${ RATING_FG[i] }` : '' } on:click={ () => f && (f = { ...f, rating: i + 1, checked: false }) }><b data-spotlog>{ i + 1 }</b><span data-spotlog>{ r }</span></button>
            {/each}
        </div>
        <!-- a day you checked and didn't go: it teaches spotlog what doesn't work, but isn't a session on the water -->
        <button data-spotlog class="chip notworth" class:on={ f.checked } aria-pressed={ !!f.checked } on:click={ () => f && (f = { ...f, checked: !f.checked }) }>{ W.notWorth }</button>
        {#if f.checked}<small data-spotlog class="muted">{ W.notWorthNote }</small>{/if}
    </div>

    <div data-spotlog class="field"><span data-spotlog class="lbl">{ W.gear }</span>
        {#each logGearGroups as grp (grp.sport)}
            {#if logGearGroups.length > 1}<small data-spotlog class="muted">{ sportLbl(grp.sport) }</small>{/if}
            <div data-spotlog class="chips">
                {#each grp.items as g (g.id)}
                    <button data-spotlog class="chip" class:on={ f.gearIds.includes(g.id) } on:click={ () => f && (f = { ...f, gearIds: toggle(f.gearIds, g.id) }) }><span data-spotlog class="k">{ gearLbl(g.kind) }</span>{ g.name }</button>
                {/each}
            </div>
        {/each}
        <div data-spotlog class="row">
            <input data-spotlog bind:value={ f.gear } placeholder={ data.gear.length ? W.gearPhAny : W.gearPhFirst } />
            {#if f.gear.trim()}<button data-spotlog class="btn ghost small" on:click={ saveTypedGear }>{ W.saveToGear }</button>{/if}
        </div>
    </div>

    <div data-spotlog class="card">
        <div data-spotlog class="row">
            <span data-spotlog class="grow"><b data-spotlog>{ W.gpsTitle }</b><small data-spotlog>{ f.track ? f.track.source : W.gpsSub }</small></span>
            {#if f.track}
                <button data-spotlog class="link" on:click={ () => f?.track && drawTrack(f.track, true) }>{ W.gpsShow }</button>
            {:else}
                <label data-spotlog class="btn ghost small">{ W.gpsAdd }<input data-spotlog type="file" accept=".gpx,.tcx,.fit,application/gpx+xml" on:change={ onTrackFile } hidden /></label>
            {/if}
        </div>
        {#if trackError}<small data-spotlog class="err">{ trackError }</small>{/if}
        {#if f.track}
            <div data-spotlog class="stats sep">
                <div data-spotlog><span data-spotlog class="lbl">{ W.distance }</span><span data-spotlog class="big">{ fmtDistance(f.track.distanceKm, S.height) }</span></div>
                <div data-spotlog><span data-spotlog class="lbl">{ W.time }</span><span data-spotlog class="big">{ Math.floor(f.track.durationMin / 60) }:{ String(Math.round(f.track.durationMin % 60)).padStart(2, '0') } <small data-spotlog>h</small></span></div>
                <div data-spotlog><span data-spotlog class="lbl">{ W.topSpeed }</span><span data-spotlog class="big">{ fmtWind(f.track.maxSpeed, S.wind) } <small data-spotlog>{ windLabel(S.wind) }</small></span></div>
            </div>
            <button data-spotlog class="link danger" on:click={ removeTrack }>{ W.removeTrack }</button>
        {/if}
    </div>

    <label data-spotlog class="field"><span data-spotlog class="lbl">{ W.notes }</span><textarea data-spotlog rows="4" bind:value={ f.notes } placeholder={ W.notesPh }></textarea></label>

    <!-- a new session needs its start time: that's how the forecast from before it is found ("didn't go" days don't) -->
    <button data-spotlog class="btn primary wide" disabled={ !f.id && !f.start && !f.checked } on:click={ saveSession }>{ f.id ? W.saveChanges : W.saveSession }</button>
    {#if f.id}
        <button data-spotlog class="link danger" on:click={ () => { const se = data.sessions.find(x => x.id === f?.id); if (se) {deleteSession(se, true);} } }>{ W.deleteSession }</button>
    {/if}
{/if}

{/if}

{#if toast}
    <div data-spotlog class="toast" role="status">
        <span data-spotlog class="grow">{ toast.msg }</span>
        {#if toast.action}<button data-spotlog class="undo" on:click={ runToastAction }>{ toast.label }</button>{/if}
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
    import { flip } from 'svelte/animate';
    import { haptic, hapticCleanup } from './lib/haptic';
    import { orderSpots, moveId } from './lib/spot-order';
    import { dragSort } from './ui/dragSort';

    import { installPreviewBridge } from './lib/preview/bridge';
    import APPLICATION_CSS from './ui/application.less';
    import config from './pluginConfig';
    import { load, save, exportJson, importJson, uid, emptyData, normalise, mergeData, storageKey, useWindyUser } from './lib/storage';
    import { waveValueAt, modelValueAt, conditionsNow, hoursToday, hoursBetween, predictability, tideToday, trimWaves, captureDay, seriesAt, covers, availableModels, ALL_MODELS } from './lib/forecast';
    import { cloudAvailable, pull, push } from './lib/cloud';
    import { createLearningController } from './lib/controllers/learning';
    import { createLifetime } from './lib/controllers/lifetime';
    import { createSyncController } from './lib/controllers/sync';
    import { createForecastController } from './lib/controllers/forecasts';
    import { baseline, commitChanges, commitSettings, settingsBaseline, canonical } from './lib/diary/revisions';
    import { editSpot as editSpotEntity, replaceEntity } from './lib/diary/commands';
    import { popupHtml as renderPopup } from './lib/map/popup';
    import { sessionTip as renderSessionTip, spotPin, heatPin } from './lib/map/pins';
    import { createTrackLayer } from './lib/map/tracks';
    import { createMarkerLayer } from './lib/map/markers';
    import { indexDiary } from './lib/diary/selectors';
    import { outingTimes, clockInstant, dayKey } from './lib/time';
    import { FEEDBACK_URL, TIDE_REPORT_URL } from './lib/links';
    import { configureTides } from './lib/tides/tides';
    import { FONT_CSS } from './lib/fonts';
    import { THEME, THEME_CSS, themeCss, guessColours, sessionMarkStyle } from './lib/theme';
    import {
        DIRS, SPORTS, RATING_BG, RATING_FG, GEAR_SPORTS, ratingBg, ratingFg, dirName, dirsLabel, windColor, modelLabel,
        distanceKm, fmtDay, fmtDayTime, fmtTime,
    } from './lib/wind';
    import { fmtWind, fmtWind0, fmtHeight, fmtTemp, fmtDistance, windLabel, fromWind, toWind, windStep, toHeight, fromHeight, toTemperature, fromTemperature } from './lib/units';
    import {
        rateBest, conditionsOf, toFeatures, suggestWindow, trainTreesInBackground, learningModel,
        nextDays, learnedWindow, gearHints, isCircular, allFeatures, fitRange, mattersLevel,
    } from './lib/predict';
    import { words, w, t as tr, fill, rich, setWords } from './lib/copy';
    import { readTrack, TrackError } from './lib/gpx';

    import SpotFormScreen from './ui/screens/SpotForm.svelte';
    import About from './ui/screens/About.svelte';
    import GearScreen from './ui/screens/Gear.svelte';
    import SnapCard from './ui/SnapCard.svelte';
    import TimeWheel from './ui/TimeWheel.svelte';
    import SwipeRow from './ui/SwipeRow.svelte';
    import Calendar from './ui/Calendar.svelte';
    import Settings from './ui/Settings.svelte';
    import Icon from './ui/Icon.svelte';
    import PixelStar from './ui/PixelStar.svelte';
    import Brand from './ui/Brand.svelte';
    import WindArrow from './ui/WindArrow.svelte';

    // tide errors from Windy are reported (no coordinates, no user) once the endpoint in links.ts is set
    configureTides({ reportUrl: TIDE_REPORT_URL, pluginVersion: config.version });
    import type { SpotForm } from './ui/forms';
    import type { TideDay, TideResult } from './lib/forecast';
    import type { Result, DayBest, Hour, SportModel, RangeRow, Feature } from './lib/predict';
    import type { WindyAuth } from './lib/cloud';

    import type { Spot, Snapshot, Session, ModelValue, WaveValue, Dir8, Settings as SettingsT, Track, SpotlogData, Gear } from './lib/types';

    type View = 'home' | 'pick' | 'place' | 'spotForm' | 'spot' | 'snap' | 'log';
    type PickFor = 'snap' | 'log' | 'spot';
    interface Loc { lat: number; lon: number; name?: string }
    interface Now { wind: ModelValue | null; waves: WaveValue | null }
    interface LogForm {
        id?: string; spotId: string | null; lat?: number; lon?: number; snapshotId: string | null;
        dateStr: string; rating: number;
        sport: string | null; checked?: boolean;
        gearIds: string[]; gear: string; start: string; end: string; notes: string; track: Track | null;
        /** snapshot this log created by itself (may be replaced when the date changes) */
        autoSnap?: string | null;
        tz?: string;
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
    /** a tag's words from its level (3 good, 4 great, 5 epic, 0 not sure yet): "Great for windsurf" (ratings are per sport) */
    $: guessLbl = (level: number, sport?: string | null): string =>
        (!level ? W.guessUnsure : sport ? fill(W['guessFor' + level], { sport: sportLbl(sport).toLowerCase() }) : W['guess' + level]);
    const UNSURE: [string, string] = ['var(--sl-dirTile, #e9e8e3)', 'var(--sl-lightSub, #6b6b6b)'];
    const guessCol = (level: number): [string, string] => (level ? guessColours(level) : UNSURE);
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
    /** Desktop: open a spot with "Show on map" on (its card on the map; switch it off on the spot page) */
    function openSpotOnMap(s: Spot) {
        openSpot(s);
        showSpotCard(s);
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
            errBox.textContent = tr('phoneProblem', { version, message: msg });
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


    /* ---------- Windy account: spotlog is for logged-in Windy users (Premium only when NEEDS_PREMIUM) ---------- */
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
    /** for now spotlog is open to everyone logged in to Windy; true brings the Premium gate back */
    const NEEDS_PREMIUM = false;
    $: gate = !wUser ? 'login' : NEEDS_PREMIUM && !premium ? 'premium' : null;
    useWindyUser(wUser?.id);

    let data: SpotlogData = load();
    /** ids present at the last save: anything missing now was deleted (-> tombstone, so sync won't bring it back) */
    let savedBaseline = baseline(data);
    const lifetime = createLifetime();
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
    type Outlook = { hours: Hour[]; pred: Record<string, number>; tide: TideResult };
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
    let captureError = '';
    let captureErrorDay = '';
    // account sync
    const cloudOn = cloudAvailable();
    let syncState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
    let syncAt = 0;
    let syncError = '';

    let recaptureTimer: ReturnType<typeof setTimeout> | undefined;
    /** a short message; `action` is an offer like "Link them" (no undo: things can be deleted later instead) */
    let toast: { msg: string; action?: () => void; label?: string } | null = null;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tempMarker: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let popup: any = null;
    /** spot whose popup is shown on the map ("Show on map" switched on) */
    let mapShown: string | null = null;

    /* ---------- derived ---------- */
    $: diaryIndex = indexDiary(data);
    $: S = data.settings;
    /** the spots on the home screen in the order you dragged them into (while dragging: the order under your finger) */
    let dragOrder: string[] | null = null;
    let dragId = '';
    $: homeSpots = orderSpots(data.spots, dragOrder || S.spotOrder);
    const sortSpots = {
        start: () => haptic(),
        move: (id: string, index: number) => {
            dragId = id;
            const next = moveId(homeSpots.map(x => x.id), id, index);
            if (next.join() !== homeSpots.map(x => x.id).join()) {
                dragOrder = next;
                haptic();
            }
        },
        done: () => {
            if (dragOrder) {setSettings({ ...S, spotOrder: dragOrder });}
            dragOrder = null;
            dragId = '';
        },
    };
    $: unitsLabel = `${windLabel(S.wind)} · ${S.height} · °${S.temp}`;
    $: allSessions = [...data.sessions].sort((a, b) => b.date - a.date);
    $: lastSnap = [...data.snapshots].sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    $: spotSessions = spot ? data.sessions.filter(s => s.spotId === spot?.id).sort((a, b) => b.date - a.date) : [];
    /** "checked, not worth it" days teach the learning but aren't sessions on the water */
    $: realSessions = data.sessions.filter(s => !s.checked);
    $: spotReal = spotSessions.filter(s => !s.checked);
    $: spotSnapshots = spot ? data.snapshots.filter(s => s.spotId === spot?.id).sort((a, b) => b.ts - a.ts) : [];
    $: avgRating = spotReal.length ? (spotReal.reduce((a, s) => a + s.rating, 0) / spotReal.length).toFixed(1) : '–';
    $: spotNow = spot ? nowOf(nowKey(spot.id, spotModel), nowBySpot) : null;
    $: spotModels = spot ? modelsBySpot[spot.id] || [] : [];
    // another spot opens with ECMWF again; which models cover it is checked once
    let modelSpotId: string | null = null;
    $: if ((spot?.id ?? null) !== modelSpotId) {
        modelSpotId = spot?.id ?? null;
        spotModel = spot ? modelFor(spot) : 'ecmwf';
    }
    $: if (view === 'spot' && spot) {loadModels(spot);}
    $: spotGuess = spot && spotNow ? rateBest(modelsOf(spot, modelMap), conditionsOf(spotNow.wind, spotNow.waves)) : null;
    $: spotLearned = spot ? modelsOf(spot, modelMap) : [];
    $: spotBest = spot ? bestOf(spot) : null;
    $: spotLearnedWindow = spot && !spot.windUnknown ? learnedWindow(spot, spotLearned[0]) : null;
    $: spotGear = gearHints(spotLearned);
    $: trust = spot ? learningState.skills.get(spot.id) || [] : [];
    $: spotOutlook = spot ? outlookOf(spot.id, outlookBySpot) : null;
    $: spotDays = spot && spotOutlook ? nextDays(spotLearned, spotOutlook.hours) : [];
    /** no forecast saved here today: today's session couldn't teach spotlog */
    $: savedToday = spot ? spotSnapshots.some(sn => new Date(sn.savedAt).toDateString() === new Date().toDateString()) : true;
    $: suggestion = spot && spot.windUnknown ? suggestWindow(spotLearned) : null;
    $: goodCount = spotLearned.reduce((a, m) => a + m.great, 0);
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
    /** the forecast attached to this log was saved after the session started: it stays, but can't teach */
    $: logLate = !!(logSnap && f?.start && logSnap.savedAt > clockInstant(f.dateStr, f.start, f.tz));
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

    /* ---------- sports: the usual ones, plus your own (typed in under "Other…") ---------- */
    /** your own sports: every sport used on a spot or session that isn't one of the usual ones */
    $: ownSports = Array.from(new Set([...data.spots.flatMap(x => x.sports), ...data.sessions.map(x => x.sport || '')]))
        .filter(x => x && !SPORTS.includes(x));
    /** the sport chips: the ones given first, then the usual ones, then your own */
    $: sportChoices = (first: string[], extra?: string | null): string[] =>
        Array.from(new Set([...first, ...(extra ? [extra] : []), ...SPORTS, ...ownSports]));
    /** the sport a log is for: the one picked, else the spot's first */
    $: logSport = (lf: LogForm): string | null => lf.sport || spotById(lf.spotId)?.sports[0] || null;
    let otherFor: 'spot' | 'log' | null = null;
    let otherName = '';
    function openOther(where: 'spot' | 'log') {
        otherFor = otherFor === where ? null : where;
        otherName = '';
    }
    /** adds the typed sport (one you already have, or a usual one, when it's the same name) */
    function addOther() {
        const typed = otherName.trim().replace(/\s+/g, ' ').slice(0, 20);
        if (!typed) {return;}
        const sp = [...SPORTS, ...ownSports].find(x => x.toLowerCase() === typed.toLowerCase() || sportLbl(x).toLowerCase() === typed.toLowerCase()) || typed;
        if (otherFor === 'spot' && sf) {sf = { ...sf, sports: sf.sports.includes(sp) ? sf.sports : [...sf.sports, sp] };}
        if (otherFor === 'log' && f) {f = { ...f, sport: sp };}
        otherFor = null;
        otherName = '';
    }
    const spotById = (id: string | null) => (id ? indexDiary(data).spots.get(id) : undefined);
        const pad = (n: number) => String(n).padStart(2, '0');
    const dateStrOf = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const hhmmOf = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes() - (d.getMinutes() % 5))}`; };
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
        // sideways moves (a wobbly finger, a time wheel) stay inside Spotlog: the panel doesn't slide around
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
        lifetime.invalidate();
        syncController.reset();
        learningController.clear();
        resetForecasts();
        capturing = false;
        clearTimeout(recaptureTimer);
        useWindyUser(wUser?.id);
        data = load();
        savedBaseline = baseline(data);
        syncAt = 0;
        goHome();
        if (wUser) {syncNow();}
    }
    $: gearLbl = (kind: string) => W['gearKind' + kind] || kind;
    function groupGear(list: Gear[], order: string[]): { sport: string; items: Gear[] }[] {
        const sports = Array.from(new Set([...order.filter(x => GEAR_SPORTS.includes(x)), ...GEAR_SPORTS, 'Other']));
        return sports
            .map(sp => ({ sport: sp, items: list.filter(g => (g.sport || 'Other') === sp) }))
            .filter(g => g.items.length);
    }
    /** The moment a session is about: middle of start–end, or the start, on the chosen date */
    function sessionFocus(form: LogForm): number | null {
        if (!form.start) {return null;}
        const start = clockInstant(form.dateStr, form.start, form.tz);
        if (!Number.isFinite(start)) {return null;}
        const times = outingTimes({ date: start, start: form.start, end: form.end, tz: form.tz } as Session);
        return times.end === null ? start : (start + times.end) / 2;
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
    /** the model each spot learns and recommends from: ECMWF (or a fallback), until another one foretold your sessions there better */
    const learningController = createLearningController();
    let learningState = learningController.update(emptyData(), 0);
    $: {
        const nextLearning = learningController.update(data, treesReady);
        if (nextLearning !== learningState) {learningState = nextLearning;}
    }
    $: learnModels = learningState.models;
    const modelFor = (s: Spot, _dep = learnModels): string => _dep?.get(s.id) || learningModel(s, data.sessions, data.snapshots);
    // a spot whose learning model changed (another one foretold your sessions better) loads its conditions again
    $: reloadFor(learnModels);
    let lastModels = new Map<string, string>();
    function reloadFor(models: Map<string, string>) {
        const changed = data.spots.filter(s => lastModels.has(s.id) && lastModels.get(s.id) !== models.get(s.id));
        lastModels = models;
        changed.forEach(s => {
            invalidateSpot(s.id);
            loadNow(s);
            if (view === 'spot' && spot?.id === s.id) {loadOutlook(s);}
        });
    }
    /** conditions-now cache: the spot's own model under the spot id (tiles, map), other models as id:model (spot page) */
    function nowKey(id: string, model: string) {
        const current = data.spots.find(item => item.id === id);
        return current && model === modelFor(current) ? id : `${id}:${model}`;
    }
    const outlookOf = (id: string, _dep = outlookBySpot): Outlook | null => { const o = _dep[id]; return o && o !== 'loading' ? o : null; };
    function nowOf(id: string, _dep = nowBySpot): Now | null {
        const n = _dep[id];
        return n && n !== 'loading' ? n : null;
    }
    /** what spotlog has learned per spot and sport, worked out once per change of the diary (and when trees are ready) */
    let treesReady = 0;
    $: modelMap = learningState.learned;
    // boosted trees train in the background where a spot has lots of outings; the spots are learned again when they're ready
    $: trainLater(modelMap);
    function trainLater(learned: Map<string, SportModel[]>) {
        const valid = lifetime.capture();
        trainTreesInBackground([...learned.values()].flat()).then(changed => { if (valid() && changed) {treesReady++;} });
    }
    const modelsOf = (s: Spot, _dep = modelMap): SportModel[] => _dep.get(s.id) || [];
    $: guessOf = (s: Spot): Result | null => {
        const n = nowBySpot[s.id];
        return n && n !== 'loading' ? rateBest(modelsOf(s, modelMap), conditionsOf(n.wind, n.waves)) : null;
    };
    /** the best stretch of the rest of today (ECMWF), so a good evening shows up in the afternoon already */
    $: bestOf = (s: Spot): DayBest | null => {
        const h = dayBySpot[s.id];
        return h ? learningController.best(s.id, modelsOf(s, modelMap), h) : null;
    };
    /** what a tag is based on, or why it's "Not sure yet" (shown as the tag's tooltip and under the forecast card's tag) */
    $: guessNote = (g: Result | DayBest | null): string => {
        if (!g) {return '';}
        if (!('reasons' in g) || g.level) {
            return g.source === 'user range' ? W.basedRange : fill(g.source === 'boosted trees' ? W.basedTrees : W.basedSimilar, { n: g.support });
        }
        return W[{ 'missing forecast': 'whyMissing', 'no evidence': 'whyFew', 'few sessions': 'whyFew', 'only poor sessions': 'whyPoor', 'below good': 'whyBelow', 'outside coverage': 'whyOutside' }[g.reasons[0]] || 'whyBelow'];
    };
    /* ---------- what works here: one row per condition ---------- */
    $: paramName = (k: Feature): string => W['param' + k[0].toUpperCase() + k.slice(1)];
    /** a range in your units: "8–13 kn", "up to 1.2 m", "W–SW"; separate spans joined with " · " */
    $: rangeText = (r: RangeRow): string => {
        if (r.dirs) {return !r.dirs.length || r.dirs.length === 8 ? W.anyDirection : dirsLabel(r.dirs);}
        const isWind = r.key === 'wind' || r.key === 'gust';
        const fmt = (v: number) => (isWind ? fmtWind0(v, S.wind) : r.key === 'period' ? `${Math.round(v)}` : r.key === 'temp' ? fmtTemp(v, S.temp).replace(/\s*°.*/, '') : r.key === 'rain' || r.key === 'power' ? `${Math.round(v * 10) / 10}` : fmtHeight(v, S.height));
        const unit = isWind ? windLabel(S.wind) : r.key === 'period' ? 's' : r.key === 'temp' ? `°${S.temp}` : r.key === 'rain' ? 'mm' : r.key === 'power' ? 'kW/m' : S.height;
        const span = ({ lo, hi }: { lo?: number; hi?: number }) =>
            (lo === undefined ? fill(W.upTo, { v: fmt(hi ?? 0) }) : hi === undefined ? fill(W.from, { v: fmt(lo) }) : fmt(lo) === fmt(hi) ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`);
        return `${(r.spans || []).map(span).join(' · ')} ${unit}`;
    };
    $: nowText = (k: Feature, v: number): string =>
        k === 'dir' || k === 'swellDir' ? dirName(v) : k === 'wind' || k === 'gust' ? `${fmtWind0(v, S.wind)} ${windLabel(S.wind)}`
            : k === 'period' ? `${Math.round(v)} s` : k === 'temp' ? fmtTemp(v, S.temp) : k === 'rain' ? `${Math.round(v * 10) / 10} mm`
                : k === 'power' ? `${Math.round(v * 10) / 10} kW/m` : fmtHeight(v, S.height, true);
    /** one line per sport for the folded "What works here": "8–13 m/s · W–SW" */
    $: worksLine = (m: SportModel): string => {
        const wnd = m.rows.find(r => r.key === (m.sport === 'Surf' ? 'swell' : 'wind'));
        const dir = m.rows.find(r => r.key === (m.sport === 'Surf' ? 'swellDir' : 'dir'));
        return [wnd && rangeText(wnd), dir && rangeText(dir)].filter(Boolean).join(' · ');
    };
    /** each row with today's value and how it fits (1 inside, 0 off) */
    $: spotParts = (m: SportModel) => {
        const now = spotNow && conditionsOf(spotNow.wind, spotNow.waves);
        const x = now ? toFeatures(now) : {};
        return m.rows.map(r => ({ r, value: x[r.key] ?? null, fit: typeof x[r.key] === 'number' ? fitRange(r, x[r.key] as number) : null }));
    };
    /** a model's bar: the one that foretold best is full, one twice as far off is half */
    const closeness = (miss: number, list: { miss: number }[]): number =>
        Math.round((100 * Math.max(0.05, Math.min(...list.map(x => x.miss)))) / Math.max(0.05, miss));
    $: bestRange = (b: DayBest): string => (b.now ? fill(W.todayUntil, { time: fmtTime(b.end) }) : fmtTime(b.start) + '–' + fmtTime(b.end));
    function primaryOf(sn: Snapshot): ModelValue | null {
        return sn.models.find(m => m.model === sn.primary) || sn.models[0] || null;
    }
    const sessionHours = (session: Session) => {
        const times = outingTimes(session);
        return times.end === null ? (session.track?.durationMin || 0) / 60 : (times.end - times.start) / 3600e3;
    };
    function nearestSpots(lat: number, lon: number): Spot[] {
        return [...data.spots].sort((a, b) => distanceKm(a, { lat, lon }) - distanceKm(b, { lat, lon }));
    }
    function directionText(dirs: Dir8[]) {return dirsLabel(dirs) || W.anyDirection;}
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
    function showToast(msg: string, action?: () => void, label?: string) {
        toast = { msg, action, label };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => (toast = null), action ? 6000 : 2600);
    }
    function runToastAction() {
        const u = toast?.action;
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
    function saveLocal(preferencesOnly = false) {
        if (!save(data) && !storageWarned) {
            storageWarned = true;
            showToast(w(synced ? 'toastFullSynced' : 'toastFull'));
        }
        savedBaseline = preferencesOnly ? settingsBaseline(data, savedBaseline) : baseline(data);
    }
    function persist(preferencesOnly = false) {
        data = preferencesOnly ? commitSettings(data, savedBaseline) : commitChanges(data, savedBaseline);
        saveLocal(preferencesOnly);
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
    const syncController = createSyncController({
        auth: windyAuth, read: () => data, pull, push,
        accept: acceptDiary,
        state: (nextState, error) => {
            syncState = nextState;
            syncError = error || '';
            if (nextState === 'saved') {syncAt = Date.now();}
        },
    });
    function schedulePush() {if (synced) {syncController.schedule();}}
    function syncNow() {return cloudOn ? syncController.sync() : Promise.resolve();}

    function acceptDiary(merged: SpotlogData, write = true) {
        const previousSpots = data.spots;
        data = merged;
        for (const previousSpot of previousSpots) {
            const current = spotById(previousSpot.id);
            if (!current || current.lat !== previousSpot.lat || current.lon !== previousSpot.lon || current.recommendationModel !== previousSpot.recommendationModel) {invalidateSpot(previousSpot.id);}
        }
        if (spot) {
            spot = spotById(spot.id) || null;
            if (!spot && view === 'spot') {goHome();}
        }
        if (snap && !snapDraft) {snap = data.snapshots.find(item => item.id === snap?.id) || null;}
        if (write) {saveLocal();} else {savedBaseline = baseline(data);}
        drawSpotMarkers(); loadAllNow();
        if (view === 'spot' && spot) {void loadOutlook(spot);}
    }

    /** Another Windy tab saved the diary: merge it in, so two open tabs never overwrite each other */
    const sig = (d: SpotlogData) => canonical(d);
    function onStorage(e: StorageEvent) {
        if (e.key !== storageKey() || !e.newValue) {return;}
        try {
            const other = normalise(JSON.parse(e.newValue));
            const merged = mergeData(other, data);
            acceptDiary(merged, sig(merged) !== sig(other));
        } catch (err) {
            console.info('[spotlog] could not read the other tab\'s data', err);
        }
    }
    function setSettings(s: SettingsT) {
        data.settings = s;
        persist(true);
    }

    /* ---------- beta: the diary lives in this browser; a downloaded copy can be uploaded again ---------- */
    async function onUpload(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) {return;}
        const valid = lifetime.capture('upload');
        try {
            const incoming = await importJson(file, data);
            if (!valid()) {return;}
            data = mergeData(incoming, data);
            persist();
            drawSpotMarkers();
            loadAllNow();
        } catch {
            if (valid()) {showToast(w('toastImportFail'));}
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
        namesOnTop(true);
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
        return renderSessionTip(list, spotById(list[0].spotId)?.name || w('tipYour'));
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
    /**
     * Desktop: spot names sit in their own map layer above the cards, so a name near the open spot is never hidden
     * under its card (it can still be hovered and clicked). Phones keep the cards on top (their buttons need the taps).
     */
    let pinPane: string | null = null;
    let pinPaneEl: HTMLElement | null = null;
    /** while the mouse is on a card, the card comes to the front (its link stays clickable); then the names again */
    function namesOnTop(on: boolean) {
        if (pinPaneEl) {pinPaneEl.style.zIndex = on ? '710' : '650';}
    }
    function namesPane(): string {
        if (pinPane !== null) {return pinPane;}
        pinPane = '';
        if (isMobile) {return pinPane;}
        try {
            const m = map as unknown as { getPane?: (n: string) => HTMLElement | undefined; createPane?: (n: string) => HTMLElement };
            const el = m.getPane?.('spotlogNames') || m.createPane?.('spotlogNames');
            if (el) {
                el.style.zIndex = '710'; // Leaflet's cards (popupPane) are at 700
                pinPaneEl = el;
                pinPane = 'spotlogNames';
            }
        } catch {
            /* no panes: names stay with the other markers */
        }
        return pinPane;
    }
    const markerLayer = createMarkerLayer((descriptor, click, hover) => {
        const icon = L.divIcon({ className: 'spotlog-marker', html: descriptor.html, iconSize: [0, 0], iconAnchor: [0, 0] });
        const pane = descriptor.glow ? '' : namesPane();
        const marker = new L.Marker({ lat: descriptor.lat, lng: descriptor.lon },
            { icon, ...(descriptor.glow ? { keyboard: false, zIndexOffset: -1000 } : {}), ...(pane ? { pane } : {}) } as L.MarkerOptions).addTo(map);
        if (descriptor.click) {marker.on('click', click);}
        if (descriptor.hover) {
            // the name's own element when there is one (Windy's map may not pass hover on to markers), else the marker's events
            const el: HTMLElement | null = (marker as unknown as { getElement?: () => HTMLElement | null }).getElement?.() || null;
            if (el) {
                el.addEventListener('mouseenter', () => hover(true));
                el.addEventListener('mouseleave', () => hover(false));
            } else {
                marker.on('mouseover', () => hover(true));
                marker.on('mouseout', () => hover(false));
            }
        }
        return marker;
    });
    /** Desktop: hovering a spot's name on the map shows its card for as long as the mouse is there */
    let hoverCard: any = null;
    let hoverId: string | null = null;
    function clearHoverCard() {
        hoverId = null;
        hoverCard?.remove();
        hoverCard = null;
    }
    async function hoverSpot(sp: Spot, on: boolean) {
        if (!on) {
            if (hoverId === sp.id) {clearHoverCard();}
            return;
        }
        if (isMobile || compactMarkers || mapShown === sp.id || typeof L === 'undefined' || !map || !L.popup) {return;}
        clearHoverCard();
        hoverId = sp.id;
        const cached = nowOf(sp.id);
        try {
            hoverCard = L.popup({ className: 'spotlog-popup sl-hover', closeButton: false, autoClose: false, closeOnClick: false, autoPan: false, offset: [0, -8] })
                .setLatLng([sp.lat, sp.lon])
                .setContent(popupHtml(sp, cached, !cached, true));
            hoverCard.openOn(map);
        } catch (e) {
            console.info('[spotlog] hover card not available', e);
            return;
        }
        if (!cached) {
            const n = await loadNow(sp);
            if (hoverId === sp.id && hoverCard) {hoverCard.setContent(popupHtml(sp, n, false, true));}
        }
    }
    function drawSpotMarkersNow() {
        if (typeof L === 'undefined' || !map) {return;}
        const settings = data.settings;
        const activeId = view === 'spot' ? spot?.id : view === 'log' ? f?.spotId : view === 'snap' ? snap?.spotId : null;
        const descriptors: import('./lib/map/markers').MarkerDescriptor[] = [];
        if (settings.mapSessions) {
            for (const location of sessionPlaces()) {
                const mark = sessionMarkStyle(location.list.length);
                if (!mark) {break;}
                const core = THEME.sessCore && THEME.sessStyle !== 'dot' ? ' core' : '';
                descriptors.push({ id: `glow:${location.lat}:${location.lon}`, lat: location.lat, lon: location.lon, glow: true,
                    html: heatPin(mark.css, core, sessionTip(location.list)) });
            }
        }
        for (const item of data.spots) {
            const active = activeId === item.id;
            if (!settings.mapSpots && !active) {continue;}
            const sessions = settings.mapSessions ? (diaryIndex.sessionsBySpot.get(item.id) || []).filter(session => !session.checked).sort((a, b) => b.date - a.date) : [];
            // desktop: hovering a name shows the spot's card, so the name doesn't get its own little tip box
            const tip = sessions.length && (isMobile || compactMarkers) ? sessionTip(sessions) : '';
            descriptors.push({ id: `spot:${item.id}`, lat: item.lat, lon: item.lon,
                html: spotPin(item, bestOf(item), active, compactMarkers, tip),
                click: () => onMapPick({ lat: item.lat, lon: item.lon }, item),
                ...(isMobile ? {} : { hover: (on: boolean) => hoverSpot(item, on) }) });
        }
        markerLayer.reconcile(descriptors);
    }
    // conditions arrive one spot at a time: redraw so good spots light up
    $: if (nowBySpot && dayBySpot && modelMap && mapReady) {drawSpotMarkers();}
    const trackLayer = createTrackLayer({
        line: (points, options) => L.polyline(points, { ...options, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map),
        point: (lat, lon, html) => new L.Marker({ lat, lng: lon }, { icon: L.divIcon({ className: 'spotlog-marker', html, iconSize: [0, 0], iconAnchor: [0, 0] }), interactive: false }).addTo(map),
        fit: bounds => map.fitBounds?.(bounds as L.LatLngBounds, { padding: [60, 60], maxZoom: 15 }),
    });
    function drawTrack(track: Track | null, fit = false) {
        if (typeof L !== 'undefined' && map) {trackLayer.draw(track, S, fit);}
    }
    function popupHtml(sp: Spot, n: Now | null, loading = false, hover = false): string {
        const guess = n ? rateBest(modelsOf(sp, modelMap), conditionsOf(n.wind, n.waves)) : null;
        const best = bestOf(sp);
        return renderPopup({ spot: sp, now: n, loading, mobile: isMobile, hover, many: data.spots.length > 1, settings: S,
            badge: guess ? guessLbl(guess.level, guess.sport) : '', colours: guessCol(guess?.level || 0),
            best: best && !best.now ? { label: guessLbl(best.level, best.sport), range: bestRange(best) } : null });
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
        clearHoverCard();
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
                el.addEventListener('mouseenter', () => namesOnTop(false));
                el.addEventListener('mouseleave', () => namesOnTop(true));
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
        else if (act === 'open') {
            // phones: Details opens the spot's page and the card leaves the map ("Show on map" brings it back)
            clearPopup();
            openSpot(sp);
        }
        else if (act === 'detail') {bcast.emit('rqstOpen', 'detail', { lat: sp.lat, lon: sp.lon, name: sp.name, display: 'wind' });}
        else if (act === 'close') {
            clearPopup();
            drawSpotMarkers();
        }
        else if (act === 'prev' || act === 'next') {
            const i = homeSpots.findIndex(x => x.id === sp.id);
            const n = homeSpots[(i + (act === 'next' ? 1 : homeSpots.length - 1)) % homeSpots.length];
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
        const valid = lifetime.capture('mapPick');
        const { lat, lon } = ev;
        const near = known ? { s: known, d: 0 } : nearestWithin(lat, lon, 1);
        if (!(known && mapShown === known.id)) {clearPopup();}
        if (view === 'spotForm' && sf) {
            // move the new spot's pin
            setTemp(lat, lon);
            const old = sf;
            sf = { ...sf, lat, lon };
            const pn = await placeName(lat, lon);
            if (valid() && view === 'spotForm' && sf && sf.lat === lat && sf.lon === lon) {sf = { ...sf, place: pn, name: old.name && old.name !== old.place ? old.name : pn };}
            return;
        }
        if (view === 'pick') {
            const loc: Loc = near ? { lat: near.s.lat, lon: near.s.lon, name: near.s.name } : { lat, lon };
            if (!near || pickFor === 'spot') {loc.name = await placeName(lat, lon);}
            if (valid() && view === 'pick') {actOn(pickFor, loc, pickFor === 'spot' ? undefined : near?.s);}
            return;
        }
        if (near) {
            if (barMode) {
                openSpot(near.s, false, false);
                showSpotCard(near.s);
            } else {
                openSpotOnMap(near.s);
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
        if (valid() && view === 'place' && n && place && place.lat === lat && place.lon === lon) {place = { ...place, name: n };}
        const ts = currentTs();
        const [mv, wv] = await Promise.all([modelValueAt(currentModel(), lat, lon, ts), waveValueAt(lat, lon, ts)]);
        if (valid() && view === 'place' && place && place.lat === lat && place.lon === lon) {
            placeNow = mv;
            placeWaves = trimWaves(wv, data.settings.layers);
            placeLoading = false;
        }
    }

    /* ---------- navigation ---------- */
    function go(v: View, remember = true, phonePanel = true) {
        if (remember && view !== v) {hist = [...hist, { view, spotId: spot?.id ?? null, snapId: snap?.id ?? null }];}
        if (view === 'log' && v !== 'log' && v !== 'spotForm') {formGeneration++; capturing = false; clearTimeout(recaptureTimer);}
        view = v;
        showUnits = false;
        unitsOpen = false;
        armed = '';
        if (v !== 'log') {drawTrack(null);}
        if (v !== 'place' && v !== 'spotForm') {clearTemp();}
        if (v !== 'spot') {clearPopup();}
        clearHoverCard();
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
    const forecastController = createForecastController({ conditionsNow, hoursToday, hoursBetween, predictability, tideToday, availableModels });
    async function loadModels(s: Spot) {
        const valid = lifetime.capture();
        const list = await forecastController.models(s.lat, s.lon);
        if (valid() && sameSpot(s)) {modelsBySpot = { ...modelsBySpot, [s.id]: list };}
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
        const valid = lifetime.capture('location');
        locating = true;
        locError = '';
        const c = await myPosition();
        if (!valid()) {return;}
        locating = false;
        if (view !== 'pick' || pickFor !== what) {return;}
        if (!c) {
            locError = w('pickMeError');
            return;
        }
        const near = what === 'spot' ? null : nearestWithin(c.lat, c.lon, 1);
        const loc: Loc = { ...c, name: near?.s.name || (await placeName(c.lat, c.lon)) };
        if (valid() && view === 'pick' && pickFor === what) {actOn(what, loc, near?.s);}
    }
    function actOn(what: PickFor, loc: Loc, s?: Spot) {
        waitingForMap = false;
        if (what === 'snap') {saveForecastAt({ lat: loc.lat, lon: loc.lon, spot: s || nearestWithin(loc.lat, loc.lon, 1)?.s });}
        else if (what === 'log') {startLog(s ? { spot: s } : { lat: loc.lat, lon: loc.lon });}
        else {startSpotForm(loc, null);}
    }

    /* ---------- spots ---------- */
    async function startSpotForm(loc: Loc, ret: 'log' | 'snap' | null) {
        const valid = lifetime.capture('spotForm');
        sfReturn = ret;
        const isPin = !loc.name || loc.name === 'Dropped pin';
        sf = {
            name: isPin ? '' : loc.name || '', place: isPin ? '' : loc.name || '', lat: loc.lat, lon: loc.lon,
            sports: ['Windsurf'], dirs: [], dMin: Math.round(toWind(7, S.wind)), dMax: Math.round(toWind(12, S.wind)), windUnknown: false,
        };
        go('spotForm');
        setTemp(loc.lat, loc.lon);
        if (isPin) {
            const n = await placeName(loc.lat, loc.lon);
            if (valid() && sf && !sf.id && sf.lat === loc.lat && sf.lon === loc.lon && n) {sf = { ...sf, place: n, name: sf.name || n };}
        }
    }
    function editSpot(s: Spot) {
        sfReturn = null;
        sf = {
            id: s.id, name: s.name, place: s.place || '', lat: s.lat, lon: s.lon, sports: [...s.sports], dirs: [...s.dirs],
            dMin: Math.round(toWind(s.min, S.wind)), dMax: Math.round(toWind(s.max, S.wind)), windUnknown: !!s.windUnknown, created: s.created,
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
        const editable: Spot = {
            id: sf.id || uid(), name: sf.name.trim(), place: sf.place, lat: sf.lat, lon: sf.lon, sports: sf.sports,
            dirs: sf.windUnknown ? [] : sf.dirs, min: Math.round(fromWind(sf.dMin, S.wind) * 10) / 10, max: Math.round(fromWind(sf.dMax, S.wind) * 10) / 10,
            windUnknown: sf.windUnknown, created: sf.created || Date.now(),
        };
        const isNew = !sf.id;
        const old = data.spots.find(x => x.id === editable.id);
        const s = editSpotEntity(old, editable);
        invalidateSpot(s.id);
        data.spots = replaceEntity(data.spots, s);
        delete outlookBySpot[s.id];
        persist();
        loadNow(s);
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
        data.spots = data.spots.filter(x => x.id !== s.id);
        data.sessions = data.sessions.filter(x => x.spotId !== s.id);
        data.snapshots = data.snapshots.filter(x => x.spotId !== s.id);
        persist();
        goHome();
    }
    function applySuggestion() {
        if (!spot || !suggestion) {return;}
        const s: Spot = { ...spot, dirs: suggestion.dirs, min: suggestion.min, max: suggestion.max, windUnknown: false };
        data.spots = data.spots.map(x => (x.id === s.id ? s : x));
        spot = s;
        delete outlookBySpot[s.id];
        persist();
        loadOutlook(s);
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
        const valid = lifetime.capture('forecastCapture');
        capturing = true;
        try {
            const sn = await capture(t.lat, t.lon, t.spot?.id ?? null);
            if (!valid()) {return;}
            if (view === 'pick') {view = 'home';} // don't come back to the picker
            snapDraft = true;
            snap = sn;
            snapNote = '';
            linkOpen = false;
            replaceOf = null;
            go('snap');
            markSnapPlace(sn);
        } catch (e) {
            if (valid()) {showToast((e as Error).message === NO_DAY ? w('toastNoDay') : w('toastNoFc'));}
        } finally {
            if (valid()) {capturing = false;}
        }
    }
    function removeSnap(id: string) {
        data.snapshots = data.snapshots.filter(x => x.id !== id);
        persist();
        if (view === 'snap' && snap?.id === id) {back();}
    }
    function deleteSnap(sn: Snapshot) {
        removeSnap(sn.id);
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
    }
    function saveSnapNote() {
        updateSnap({ note: snapNote.trim() });
    }

    /* ---------- sessions ---------- */
    function emptyForm(): LogForm {
        return {
            spotId: null, snapshotId: null, dateStr: dateStrOf(Date.now()), rating: 4, sport: null,
            gearIds: [], gear: '', start: '', end: '', notes: '', track: null, tz: deviceTz(),
        };
    }
    let formGeneration = 0;
    function startLog(o: { spot?: Spot; lat?: number; lon?: number; snap?: Snapshot }) {
        formGeneration++;
        capturing = false;
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
        const active = lifetime.capture('logCapture');
        const capturedForm = formGeneration;
        const capturedInput = canonical([f.dateStr, f.start, f.end, f.lat, f.lon, f.spotId]);
        const valid = () => active() && !!f && capturedForm === formGeneration && capturedInput === canonical([f.dateStr, f.start, f.end, f.lat, f.lon, f.spotId]);
        const focus = sessionFocus(f) ?? (f.dateStr === dateStrOf(Date.now()) ? Date.now() : new Date(`${f.dateStr}T12:00`).getTime());
        capturing = true;
        captureError = '';
        try {
            // from the start of the session (Windy still has today's earlier hours), read at the session's middle
            const from = f.start && isFinite(new Date(`${f.dateStr}T${f.start}`).getTime()) ? new Date(`${f.dateStr}T${f.start}`).getTime() : focus;
            const sn = await capture(f.lat, f.lon ?? 0, f.spotId, Math.min(from, focus), focus);
            if (!valid() || !f) {return;}
            const old = f.autoSnap;
            data.snapshots = [...data.snapshots.filter(x => !(old && x.id === old)), sn];
            persist();
            if (f) {f = { ...f, snapshotId: sn.id, autoSnap: sn.id };}
        } catch (e) {
            if (!valid()) {return;}
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
            if (active() && capturedForm === formGeneration) {capturing = false;}
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
        formGeneration++;
        capturing = false;
        trackError = '';
        const sp = spotById(se.spotId);
        f = {
            id: se.id, spotId: se.spotId, lat: se.lat ?? sp?.lat, lon: se.lon ?? sp?.lon, snapshotId: se.snapshotId,
            dateStr: dayKey(se.date, se.tz), tz: se.tz, rating: se.rating, sport: se.sport ?? null, checked: !!se.checked, gearIds: [...(se.gearIds || [])], gear: se.gear || '',
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
        if (f.start) {date = clockInstant(f.dateStr, f.start, f.tz);}
        else if (sn && dateStrOf(sn.ts) === f.dateStr) {date = sn.ts;}
        else if (f.track?.start && dateStrOf(f.track.start) === f.dateStr) {date = f.track.start;}
        else {date = new Date(`${f.dateStr}T12:00`).getTime();}
        if (!isFinite(date)) {date = Date.now();}
        const se: Session = {
            id: f.id || uid(), spotId: f.spotId, lat: f.lat, lon: f.lon, snapshotId: f.snapshotId, date, rating: f.checked ? 2 : f.rating,
            ...(f.checked ? { checked: true } : {}),
            sport: logSport(f) || null, gearIds: f.gearIds, gear: f.gear.trim(), start: f.start, end: f.end, notes: f.notes, track: f.track,
            tz: f.tz || deviceTz(),
        };
        data.sessions = replaceEntity(data.sessions, se);
        // a sport the spot didn't have yet: the spot gets it (and learns it from now on)
        const ofSpot = spotById(se.spotId);
        if (ofSpot && se.sport && !ofSpot.sports.includes(se.sport)) {
            data.spots = data.spots.map(x => (x.id === ofSpot.id ? { ...x, sports: [...x.sports, se.sport as string].slice(0, 8) } : x));
        }
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
        // L1: a session without a forecast can't teach spotlog; say so at the moment it matters (no "saved" messages otherwise)
        if (!f.id && !se.snapshotId) {showToast(tr('toastSessNoFc'));}
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
    }
    async function onTrackFile(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || !f) {return;}
        trackError = '';
        const active = lifetime.capture('track');
        const capturedForm = formGeneration;
        const valid = () => active() && capturedForm === formGeneration;
        try {
            const t = await readTrack(file);
            if (!f || !valid()) {return;}
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
        } catch (err) {
            if (valid()) {trackError = err instanceof TrackError ? w(err.code) : w('trackError');}
        }
    }
    function removeTrack() {
        if (!f) {return;}
        f = { ...f, track: null };
        drawTrack(null);
    }

    /* ---------- gear ---------- */
    function addGear(gear: { name: string; kind: string; sport: string }) {
        data.gear = [...data.gear, { id: uid(), ...gear }];
        persist();
    }
    function saveTypedGear() {
        if (!f || !f.gear.trim()) {return;}
        const sport = (spotById(f.spotId)?.sports || []).find(x => GEAR_SPORTS.includes(x));
        const g: Gear = { id: uid(), name: f.gear.trim(), kind: 'Other', sport };
        data.gear = [...data.gear, g];
        f = { ...f, gear: '', gearIds: [...f.gearIds, g.id] };
        persist();
    }
    function deleteGear(id: string) {
        data.gear = data.gear.filter(x => x.id !== id);
        persist();
    }

    /* ---------- conditions + matches ---------- */
    function sameSpot(s: Spot): boolean {
        const current = spotById(s.id);
        return !!current && current.lat === s.lat && current.lon === s.lon;
    }
    function invalidateSpot(id: string) {
        delete nowBySpot[id];
        Object.keys(nowBySpot).filter(key => key.startsWith(id + ':')).forEach(key => {delete nowBySpot[key];});
        delete dayBySpot[id];
        delete outlookBySpot[id];
        delete modelsBySpot[id];
        nowBySpot = { ...nowBySpot }; dayBySpot = { ...dayBySpot };
        outlookBySpot = { ...outlookBySpot }; modelsBySpot = { ...modelsBySpot };
    }
    function resetForecasts() {
        nowBySpot = {}; dayBySpot = {}; outlookBySpot = {}; modelsBySpot = {};
        forecastController.clear();
        nowAt = 0;
    }
    async function loadNow(s: Spot, model = modelFor(s)): Promise<Now | null> {
        const valid = lifetime.capture();
        const own = model === modelFor(s);
        const key = nowKey(s.id, model);
        if (!nowBySpot[key]) {nowBySpot = { ...nowBySpot, [key]: 'loading' };}
        try {
            const result = await forecastController.now(s.lat, s.lon, model, own);
            if (!valid() || !sameSpot(s) || (own && modelFor(s) !== model)) {return null;}
            if (result.hours) {dayBySpot = { ...dayBySpot, [s.id]: result.hours };}
            nowBySpot = { ...nowBySpot, [key]: result.now };
            if (own && !result.now.wind && !s.recommendationModel) {void chooseFallbackModel(s);}
            return result.now;
        } catch (error) {
            if (valid() && sameSpot(s)) {delete nowBySpot[key]; nowBySpot = { ...nowBySpot };}
            console.info('[spotlog] conditions unavailable', error);
            return null;
        }
    }
    async function chooseFallbackModel(s: Spot) {
        const valid = lifetime.capture();
        const models = await forecastController.models(s.lat, s.lon);
        const fallback = models.find(item => item !== 'ecmwf');
        if (!valid() || !sameSpot(s) || !fallback || spotById(s.id)?.recommendationModel) {return;}
        data.spots = data.spots.map(item => item.id === s.id ? { ...item, recommendationModel: fallback } : item);
        if (spot?.id === s.id) {spot = data.spots.find(item => item.id === s.id) || spot;}
        invalidateSpot(s.id);
        persist();
        void loadNow(data.spots.find(item => item.id === s.id) as Spot, fallback);
    }
    let nowAt = 0;
    function loadAllNow() {
        if (Date.now() - nowAt > 20 * 60e3) {
            if (nowAt) {
                nowBySpot = {}; dayBySpot = {}; outlookBySpot = {}; modelsBySpot = {};
                if (view === 'spot' && spot) {void loadOutlook(spot);}
            }
            nowAt = Date.now();
        }
        data.spots.forEach(s => {void loadNow(s);});
    }
    function onVisible() {
        if (document.visibilityState === 'visible') {loadAllNow();}
    }
    async function loadOutlook(s: Spot) {
        const valid = lifetime.capture();
        const model = modelFor(s);
        const capturedPremium = premium;
        if (!outlookBySpot[s.id]) {outlookBySpot = { ...outlookBySpot, [s.id]: 'loading' };}
        try {
            const result = await forecastController.outlook(s.lat, s.lon, model, premium);
            if (valid() && sameSpot(s) && modelFor(s) === model && premium === capturedPremium) {outlookBySpot = { ...outlookBySpot, [s.id]: result };}
        } catch (error) {
            if (valid() && sameSpot(s)) {delete outlookBySpot[s.id]; outlookBySpot = { ...outlookBySpot };}
            console.info('[spotlog] outlook unavailable', error);
        }
    }
    const predOfDay = (day: number, o: Outlook | null): number | null => o?.pred[new Date(day).toDateString()] ?? null;
    /** "High 2:18 · Low 8:30 · High 14:42" */
    $: tideList = (t: TideDay): string =>
        [...t.highs.map(x => ({ x, k: W.tideHigh })), ...t.lows.map(x => ({ x, k: W.tideLow }))].sort((a, b) => a.x - b.x).map(e => `${e.k} ${fmtTime(e.x)}`).join(' · ');

    /* ---------- what works here: "Use what spotlog learned", your own ranges, checked days ---------- */
    function useLearnedWindow() {
        if (!spot || !spotLearnedWindow) {return;}
        const after: Spot = { ...spot, dirs: spotLearnedWindow.dirs, min: spotLearnedWindow.min, max: spotLearnedWindow.max };
        data.spots = data.spots.map(x => (x.id === after.id ? after : x));
        spot = after;
        persist();
    }
    type OwnRange = { lo?: number; hi?: number; dirs?: Dir8[] };
    /** inputs are in your units; ranges are stored in m/s, m, °C */
    const toUnit = (k: Feature, v: number): number =>
        k === 'wind' || k === 'gust' ? Math.round(toWind(v, S.wind) * 10) / 10 : (k === 'waves' || k === 'swell') && S.height === 'ft' ? Math.round(toHeight(v, S.height) * 10) / 10
            : k === 'temp' && S.temp === 'F' ? Math.round(toTemperature(v, S.temp)) : Math.round(v * 100) / 100;
    const fromUnit = (k: Feature, v: number): number =>
        k === 'wind' || k === 'gust' ? fromWind(v, S.wind) : (k === 'waves' || k === 'swell') && S.height === 'ft' ? fromHeight(v, S.height) : k === 'temp' && S.temp === 'F' ? fromTemperature(v, S.temp) : v;
    /** a row's outer edges (all its spans together) */
    const outer = (r: RangeRow | undefined): { lo?: number; hi?: number } => {
        const spans = r?.spans || [];
        return spans.length ? { lo: spans.some(x => x.lo === undefined) ? undefined : Math.min(...spans.map(x => x.lo as number)), hi: spans.some(x => x.hi === undefined) ? undefined : Math.max(...spans.map(x => x.hi as number)) } : {};
    };
    function startEdit(m: SportModel) {
        editSport = m.sport;
        editRows = {};
        for (const key of allFeatures(m.sport)) {
            const { lo, hi } = outer(m.rows.find(x => x.key === key));
            editRows[key] = {
                lo: lo !== undefined && !isCircular(key) ? String(toUnit(key, lo)) : '',
                hi: hi !== undefined && !isCircular(key) ? String(toUnit(key, hi)) : '',
                dirs: [...(m.rows.find(x => x.key === key)?.dirs || [])],
            };
        }
    }
    function saveEdit() {
        if (!spot || !editSport) {return;}
        const learned = spotLearned.find(m => m.sport === editSport);
        const own: Record<string, OwnRange> = {};
        for (const [key, row] of Object.entries(editRows) as [Feature, { lo: string; hi: string; dirs: Dir8[] }][]) {
            const p = learned?.rows.find(x => x.key === key);
            if (isCircular(key)) {
                const was = p?.dirs || [];
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
            if ((r.lo !== undefined || r.hi !== undefined) && (p?.from === 'you' || differs(r.lo, outer(p).lo) || differs(r.hi, outer(p).hi))) {own[key] = r;}
        }
        const ranges = { ...(spot.ranges || {}) };
        if (Object.keys(own).length) {ranges[editSport] = own;} else {delete ranges[editSport];}
        const after: Spot = { ...spot, ranges };
        data.spots = data.spots.map(x => (x.id === after.id ? after : x));
        spot = after;
        editSport = null;
        persist();
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
        }, W.linkThem);
        return true;
    }

    /* ---------- data ---------- */
    function clearAll() {
        if (!arm('all')) {return;}
        data = { ...emptyData(), settings: { ...data.settings, welcomed: true } }; // not new: the upload stays right here
        persist();
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
    let removePreview = () => {};
    function designHook() {
        const T = THEME as unknown as Record<string, unknown>;
        removePreview = installPreviewBridge({
            inspect: () => ({ learning: { ...learningController.stats }, forecasts: forecastController.sizes }),
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
        });
    }

    onMount(() => {
        const mounted = lifetime.capture();
        setTimeout(() => {if (mounted()) {paintPane();}}, 120);
        setTimeout(() => {if (mounted()) {designHook();}}, 0);
        if (!document.getElementById('spotlog-ui')) {
            const stylesheet = document.createElement('style');
            stylesheet.id = 'spotlog-ui';
            stylesheet.textContent = APPLICATION_CSS;
            document.head.appendChild(stylesheet);
        }
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
            subsListener = store.on('subscription', (v: string | null) => {
                premium = v === 'premium';
                outlookBySpot = {}; forecastController.clearOutlook();
                if (view === 'spot' && spot) {void loadOutlook(spot);}
            });
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
        removePreview();
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
        markerLayer.clear();
        clearTemp();
        clearPopup();
        drawTrack(null);
        clearTimeout(toastTimer);
        clearTimeout(armTimer);
        clearTimeout(recaptureTimer);
        syncController.dispose();
        learningController.clear();
        void trainTreesInBackground([]);
        lifetime.dispose();
        forecastController.clear();
    });
</script>
