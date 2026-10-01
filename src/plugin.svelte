<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content spotlog" class:m={ isMobile } bind:this={ root } on:touchstart={ touchStart } on:touchmove={ touchMove } on:keydown={ keepKeys } on:keyup={ keepKeys } on:keypress={ keepKeys }>

{#if gate}
<!-- ================= LOGIN / PREMIUM GATE ================= -->
    <div class="card head">
        <div class="row"><span class="brand"><span class="wordmark">SPOTLOG</span><PixelStar size={ 15 } /></span></div>
        <p class="p">Your session diary for Windy: save forecasts for your spots, log how it really was, and learn which forecast to trust.</p>
    </div>
    <div class="card">
        {#if gate === 'login'}
            <b>Log in to Windy to use <Brand /></b>
            <p class="p muted"><Brand cap /> is for Windy Premium members. Your diary is linked to your Windy account.</p>
            <button class="btn primary wide" on:click={ () => bcast.emit('rqstOpen', 'login') }>Log in to Windy</button>
        {:else}
            <b><Brand cap /> is part of Windy Premium</b>
            <p class="p muted">You're logged in as { wUser?.username || wUser?.email || 'a Windy user' }. Upgrade to Premium to start your diary.</p>
            <button class="btn primary wide" on:click={ () => bcast.emit('rqstOpen', 'subscription') }>Get Windy Premium</button>
        {/if}
    </div>
{:else}

<!-- ================= HEADER ================= -->
{#if view === 'home'}
    <div class="card head">
        <div class="row">
            {#if !isMobile}
                <button class="back-menu" aria-label="Back to the Windy menu" title="Back to the Windy menu" on:click={ toWindyMenu }>
                    <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true"><polyline points="11,3 3,11 11,19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
            {/if}
            <span class="brand grow-b"><span class="wordmark">SPOTLOG</span><PixelStar size={ 15 } /></span>
            <button class="units" aria-expanded={ showUnits } aria-label="Units and saved data" on:click={ () => (showUnits = !showUnits) }>{ unitsLabel } <span class="chev" class:up={ showUnits }>▾</span></button>
        </div>
        {#if showUnits}<Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } />{/if}
        <div class="stats">
            <div><span class="lbl">Spots</span><span class="big">{ data.spots.length }</span></div>
            <div><span class="lbl">Sessions</span><span class="big">{ data.sessions.length }</span></div>
            <div><span class="lbl">On the water</span><span class="big">{ hoursOnWater } <small>h</small></span></div>
        </div>
        {#if synced}
            <small class="sync" class:err={ syncState === 'error' } title={ syncState === 'error' ? syncError : '' }>{ syncLabel }</small>
        {/if}
    </div>
{:else}
    <div class="topbar">
        <button class="round" aria-label="Back" on:click={ back }>←</button>
        <span class="grow"><b class="title">{ hdr.title }</b>{#if hdr.sub}<small>{ hdr.sub }</small>{/if}</span>
        <button class="units" aria-expanded={ showUnits } aria-label="Units and saved data" on:click={ () => (showUnits = !showUnits) }>{ unitsLabel } <span class="chev" class:up={ showUnits }>▾</span></button>
    </div>
    {#if showUnits}<div class="card"><Settings settings={ data.settings } on:change={ e => setSettings(e.detail) } /></div>{/if}
{/if}

<!-- ================= HOME ================= -->
{#if view === 'home'}
    <div class="actions">
        <button class="act" disabled={ capturing } on:click={ () => startPick('snap') }><Icon name="weather" /><b>{ capturing ? 'Loading…' : 'Save forecast' }</b><small>next 24 h</small></button>
        <button class="act" on:click={ () => startPick('spot') }><Icon name="pin" /><b>Add spot</b><small>on the map</small></button>
        <button class="act" on:click={ () => startPick('log') }><Icon name="pen" /><b>Log session</b><small>after you're out</small></button>
    </div>

    <div class="tabs">
        <button class:on={ tab === 'spots' } on:click={ () => (tab = 'spots') }>Spots</button>
        <button class:on={ tab === 'sessions' } on:click={ () => (tab = 'sessions') }>Sessions</button>
        <button class:on={ tab === 'gear' } on:click={ () => (tab = 'gear') }>Gear</button>
        <button class:on={ tab === 'about' } on:click={ () => (tab = 'about') }>About</button>
    </div>

    {#if tab === 'spots'}
        {#if data.spots.length === 0}
            <div class="empty">No spots yet. Press <b>Add spot</b> and click on the map where you surf or sail.</div>
        {:else}
            <div class="viewtog" role="group" aria-label="How to show your spots">
                <button class:on={ S.spotView === 'list' } aria-pressed={ S.spotView === 'list' } aria-label="List" title="List" on:click={ () => setSettings({ ...S, spotView: 'list' }) }>−</button>
                <button class:on={ S.spotView !== 'list' } aria-pressed={ S.spotView !== 'list' } aria-label="Tiles" title="Tiles" on:click={ () => setSettings({ ...S, spotView: 'tiles' }) }>+</button>
            </div>
            <div class="tiles" class:list={ S.spotView === 'list' }>
                {#each data.spots as s (s.id)}
                    <button class="tile" on:click={ () => openSpot(s, true) }>
                        <span class="t-name">{ s.name }</span>
                        {#if nowOf(s.id, nowBySpot)}
                            <span class="now">
                                <span class="sw" style="background: { windColor(nowOf(s.id, nowBySpot)?.wind?.wind ?? null) }">{ fmtWind0(nowOf(s.id, nowBySpot)?.wind?.wind ?? null, S.wind) }</span>
                                <span class="now-t"><b>{ windLabel(S.wind) }</b><small>gusts { fmtWind0(nowOf(s.id, nowBySpot)?.wind?.gust ?? null, S.wind) }</small>{#if nowOf(s.id, nowBySpot)?.waves}<small>waves { fmtHeight(nowOf(s.id, nowBySpot)?.waves?.waves ?? null, S.height, true) }</small>{/if}</span>
                                {#if nowOf(s.id, nowBySpot)?.wind?.dir != null}
                                    <!-- the arrow points where the wind blows to, like Windy's; the letters say where it comes from -->
                                    <span class="wdir" title="Wind from { dirName(nowOf(s.id, nowBySpot)?.wind?.dir ?? null) }">
                                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style="transform: rotate({ (nowOf(s.id, nowBySpot)?.wind?.dir ?? 0) + 180 }deg)"><path d="M9 2 L14 10 L10.2 9 L10.2 16 L7.8 16 L7.8 9 L4 10 Z" fill="currentColor" /></svg>
                                        <small>{ dirName(nowOf(s.id, nowBySpot)?.wind?.dir ?? null) }</small>
                                    </span>
                                {/if}
                            </span>
                        {:else}
                            <span class="now"><small>Loading conditions…</small></span>
                        {/if}
                        <span class="t-tag">
                            {#if predOf(s) !== null}
                                <span class="tag" style="background: { guessColours(predOf(s) ?? 3)[0] }; color: { guessColours(predOf(s) ?? 3)[1] }">{ predictionLabel(predOf(s) ?? 3) }</span>
                            {:else}
                                <span class="tag ghost" title={ ratingHint(s) }>Rating soon</span>
                            {/if}
                        </span>
                    </button>
                {/each}
            </div>
            <small class="muted">Right now, ECMWF. The rating is a guess from your own sessions.</small>
        {/if}
        <div class="card map-toggles">
            <button class="maptog" role="switch" aria-checked={ S.mapSpots } on:click={ () => setSettings({ ...S, mapSpots: !S.mapSpots }) }>
                <span class="grow"><b>Spots on the map</b><small>Pins light up green when it looks good</small></span>
                <span class="switch" class:on={ S.mapSpots }><i></i></span>
            </button>
            <button class="maptog" role="switch" aria-checked={ S.mapSessions } on:click={ () => setSettings({ ...S, mapSessions: !S.mapSessions }) }>
                <span class="grow"><b>Sessions on the map</b><small>A glow where you've been out. The more often, the brighter.</small></span>
                <span class="switch" class:on={ S.mapSessions }><i></i></span>
            </button>
        </div>
    {:else if tab === 'sessions'}
        {#if data.sessions.length === 0}
            <div class="empty">No sessions yet. Press <b>Log session</b>. A spot is optional.</div>
        {:else}
            <div class="seg">
                <button class:on={ sessView === 'list' } on:click={ () => (sessView = 'list') }>List</button>
                <button class:on={ sessView === 'cal' } on:click={ () => (sessView = 'cal') }>Calendar</button>
            </div>
            {#if sessView === 'list'}
                <div class="list">
                    {#each allSessions as se (se.id)}
                        <SwipeRow on:open={ () => openSession(se) } on:delete={ () => deleteSession(se) }>
                            <span class="dot" style="background: { ratingBg(se.rating) }; color: { ratingFg(se.rating) }">{ se.rating }</span>
                            <span class="grow"><span>{ spotById(se.spotId)?.name || 'No spot yet' }{ se.track ? ' · GPS' : '' }</span><small>{ fmtDay(se.date) } · { se.notes ? se.notes.slice(0, 38) : RATINGS[se.rating - 1] }</small></span>
                            <small>{ feltLine(se) }</small>
                        </SwipeRow>
                    {/each}
                </div>
                <small class="muted">Tap to open. Swipe left to delete.</small>
            {:else}
                <Calendar sessions={ data.sessions } colors={ RATING_BG } labels={ RATINGS } spotName={ se => spotById(se.spotId)?.name || 'No spot yet' } on:open={ e => openSession(e.detail) } />
            {/if}
        {/if}
    {:else if tab === 'gear'}
        <div class="card">
            <b>Add gear</b>
            <small class="muted">First the sport, then what it is.</small>
            <div class="seg">
                {#each GEAR_SPORTS as sp}<button class:on={ gearSport === sp } on:click={ () => { gearSport = sp; gearKind = GEAR_BY_SPORT[sp][0].kind; } }>{ sp }</button>{/each}
            </div>
            <div class="chips">
                {#each GEAR_BY_SPORT[gearSport] as k}<button class="chip" class:on={ gearKind === k.kind } on:click={ () => (gearKind = k.kind) }>{ k.kind }</button>{/each}
            </div>
            <div class="row">
                <input bind:value={ gearName } placeholder={ gearHint(gearSport, gearKind) } on:keydown={ e => e.key === 'Enter' && addGear() } />
                <button class="btn primary small" disabled={ !gearName.trim() } on:click={ addGear }>Add</button>
            </div>
        </div>
        {#if data.gear.length === 0}
            <div class="empty">Save your boards, sails, kites, wings… They show up as quick picks when you log a session.</div>
        {:else}
            {#each gearGroups as grp (grp.sport)}
                <div class="section">
                    <div class="row"><b class="grow">{ grp.sport }</b><small>{ grp.items.length } saved</small></div>
                    <div class="list">
                        {#each grp.items as g (g.id)}
                            <div class="item static">
                                <span class="kind">{ g.kind }</span>
                                <span class="grow"><span>{ g.name }</span><small>used in { gearUse(g.id) } session(s)</small></span>
                                <button class="link danger" on:click={ () => deleteGear(g.id) }>Remove</button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        {/if}
    {:else}
        <div class="about">
            <div class="card">
                <b class="h3">About <Brand /></b>
                <p class="p">For the weird people who have a camera roll full of Windy screenshots. Save forecasts for your favourite spots, log sessions and feelings, and keep it all in one place.</p>
            </div>
            <div class="card steps">
                <b class="h3">How it works</b>
                <div class="step"><span class="n">1</span><span class="grow"><b>Save the forecast</b><small>Before you go out, tap Save forecast. <Brand cap /> takes a snapshot and keeps the next 24 hours of forecast data.</small></span></div>
                <div class="step"><span class="n">2</span><span class="grow"><b>Go out</b><small>Surf, windsurf, kite, wing, have fun.</small></span></div>
                <div class="step"><span class="n">3</span><span class="grow"><b>Log how it was</b><small>After your session, tap Log session: rate it, say how the wind felt, add your gear or a GPS track if you like.</small></span></div>
                <div class="step"><span class="n">4</span><span class="grow"><b>Get smarter each time</b><small>After a few sessions, <Brand /> guesses how good each spot looks for you on the given day, shows which forecast model works closest at each spot and suggests the wind that works best.</small></span></div>
            </div>
            <div class="card">
                <b class="h3">Good to know</b>
                <p class="p muted">Save your forecast before the session. Windy keeps just a few hours of forecast history, so if you try to save a session from the previous day, there might not be enough data to save it.</p>
                <p class="p muted">Your diary belongs to your Windy account. Log in to Windy on another device and it's there.</p>
                <p class="p muted">Your spots, sessions and GPS tracks are private. Nobody else sees them.</p>
                <div class="row data-links">
                    <button class="link" on:click={ () => exportJson(data) }>Download a copy</button>
                    <button class="link danger" on:click={ clearAll }>{ armed === 'all' ? 'Tap again: gone for good' : 'Delete everything, forever' }</button>
                </div>
            </div>
            <div class="sig">
                <PixelStar size={ 14 } />
                <small class="ver">version { version }</small>
                <a class="coffee" href={ COFFEE_URL } target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
            </div>
        </div>
    {/if}


<!-- ================= PICK A PLACE ================= -->
{:else if view === 'pick'}
    {#if pickFor === 'snap'}
        <p class="p muted">Saves the forecast from now for the next 24 hours: what it looks like right now, and every hour until { fmtTime(Date.now() + 864e5) } tomorrow.</p>
    {/if}
    <div class="opts">
        {#if pickFor === 'log' && lastSnap}
            <button class="opt" on:click={ () => lastSnap && startLog({ snap: lastSnap }) }>
                <span class="ico"><Icon name="weather" /></span>
                <span class="grow"><span>Your last saved forecast</span><small>{ spotById(lastSnap.spotId)?.name || 'Saved place' } · { fmtDayTime(lastSnap.ts) }</small></span>
                <span class="chev-r" aria-hidden="true">›</span>
            </button>
        {/if}
        <button class="opt" class:on={ waitingForMap } on:click={ () => (waitingForMap = true) }>
            <span class="ico" class:live={ waitingForMap }><Icon name="pointer" /></span>
            <span class="grow"><span>{ isMobile ? 'Tap on the map' : 'Click on the map' }</span><small>{ waitingForMap ? (isMobile ? 'Tap a place, a town or one of your spots…' : 'Click a place, a town or one of your spots…') : 'any place, town or one of your spots' }</small></span>
        </button>
        <button class="opt" on:click={ useCentre }>
            <span class="ico"><Icon name="crosshair" /></span>
            <span class="grow"><span>Map centre</span><small>{ centreName || 'where the map is now' }</small></span>
            <span class="chev-r" aria-hidden="true">›</span>
        </button>
        {#if pickFor === 'log'}
            <button class="opt" on:click={ () => startLog({}) }>
                <span class="ico"><Icon name="plus" /></span>
                <span class="grow"><span>Without a place</span><small>add the spot later</small></span>
                <span class="chev-r" aria-hidden="true">›</span>
            </button>
        {/if}
    </div>
    {#if pickFor !== 'spot' && spotsByCentre.length}
        <div class="section">
            <small class="lbl">Your spots · nearest first</small>
            <div class="opts">
                {#each spotsByCentre as s (s.id)}
                    <button class="opt" on:click={ () => actOn(pickFor, { lat: s.lat, lon: s.lon, name: s.name }, s) }>
                        <span class="ico"><i class="dot-s"></i></span>
                        <span class="grow"><span>{ s.name }</span><small>{ s.place || 'Your spot' }</small></span>
                        <span class="chev-r" aria-hidden="true">›</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}
    {#if pickFor === 'snap'}
        <small class="muted sl-note">Tip: save forecasts ahead of your session. Windy doesn't keep past forecasts, so a day that's over can't be saved afterwards.</small>
    {/if}

<!-- ================= PLACE (clicked on map) ================= -->
{:else if view === 'place' && place}
    <SnapCard title={ place.name } sub={ 'Forecast · ' + timelineLabelFull } model={ modelLabel(currentModel()) } wind={ placeNow } waves={ placeWaves } loading={ placeLoading } u={ S } empty="No forecast for this place" />
    {#if nearSpot}
        <button class="card row link-card" on:click={ () => nearSpot && openSpot(nearSpot.s) }>
            <span class="ico"><i class="dot-s"></i></span><span class="grow"><small>Close to your spot</small><b>{ nearSpot.s.name } · { fmtDistance(nearSpot.d, S.height) }</b></span><span>›</span>
        </button>
    {/if}
    <div class="actions">
        <button class="act" disabled={ capturing } on:click={ () => place && actOn('snap', place) }><Icon name="weather" /><b>{ capturing ? 'Loading…' : 'Save forecast' }</b><small>next 24 h</small></button>
        <button class="act" on:click={ () => place && actOn('spot', place) }><Icon name="pin" /><b>Add spot</b><small>here</small></button>
        <button class="act" on:click={ () => place && actOn('log', place) }><Icon name="pen" /><b>Log session</b><small>here</small></button>
    </div>

<!-- ================= NEW / EDIT SPOT ================= -->
{:else if view === 'spotForm' && sf}
    <label class="field"><span class="lbl">Name</span><input bind:value={ sf.name } placeholder="Spot name" /></label>
    <div class="card row">
        <span class="ico"><i class="dot-s"></i></span>
        <span class="grow"><small>Location</small><b>{ sf.place || sf.lat.toFixed(3) + ', ' + sf.lon.toFixed(3) }</b></span>
        <small class="r">{ isMobile ? '' : 'click on the map to move it' }</small>
    </div>

    <div class="field"><span class="lbl">Sport</span>
        <div class="chips">
            {#each SPORTS as sp}
                <button class="chip" class:on={ sf.sports.includes(sp) } on:click={ () => sf && (sf = { ...sf, sports: toggle(sf.sports, sp) }) }>{ sp }</button>
            {/each}
        </div>
    </div>

    <div class="card">
        <div class="row"><b class="grow">Which wind works here?</b></div>
        <div class="seg">
            <button class:on={ !sf.windUnknown } on:click={ () => sf && (sf = { ...sf, windUnknown: false }) }>I know</button>
            <button class:on={ sf.windUnknown } on:click={ () => sf && (sf = { ...sf, windUnknown: true }) }>I don't know yet</button>
        </div>
        {#if sf.windUnknown}
            <p class="p muted">No problem. Log a few sessions here. After two great ones, <Brand /> suggests the wind directions and strength from your own days.</p>
        {:else}
            <small class="muted">Wind from</small>
            <div class="dirs">
                {#each DIRS as d, i}
                    <button class="dir" class:on={ sf.dirs.includes(d) } aria-pressed={ sf.dirs.includes(d) } on:click={ () => sf && (sf = { ...sf, dirs: toggle(sf.dirs, d) }) }>
                        <span class="arrow" style="transform: rotate({ i * 45 + 180 }deg)">▲</span>{ d }
                    </button>
                {/each}
            </div>
            <div class="row sep">
                <span class="grow"><small>Strength</small><b class="big2">{ sf.dMin }–{ sf.dMax } <small>{ windLabel(S.wind) }</small></b></span>
                <div class="stepper"><small>min</small>
                    <button class="round" aria-label="Lower minimum" on:click={ () => stepRange('dMin', -1) }>−</button>
                    <button class="round" aria-label="Raise minimum" on:click={ () => stepRange('dMin', 1) }>+</button>
                </div>
                <div class="stepper"><small>max</small>
                    <button class="round" aria-label="Lower maximum" on:click={ () => stepRange('dMax', -1) }>−</button>
                    <button class="round" aria-label="Raise maximum" on:click={ () => stepRange('dMax', 1) }>+</button>
                </div>
            </div>
            <small class="muted">A rough guess is fine. You can change it any time.</small>
        {/if}
    </div>

    <button class="btn primary wide" disabled={ !sf.name.trim() } on:click={ saveSpotForm }>{ sf.id ? 'Save changes' : 'Save spot' }</button>

<!-- ================= SPOT ================= -->
{:else if view === 'spot' && spot}
    <SnapCard
        title={ spot.name }
        sub={ 'Right now · ' + (spot.place ? spot.place + ' · ' : '') + spot.sports.join(', ') }
        model={ modelLabel(spotModel) }
        wind={ spotNow?.wind ?? null }
        waves={ spotNow?.waves ?? null }
        loading={ !spotNow }
        u={ S }
        badge={ spotPred !== null ? predictionLabel(spotPred) : ratingHint(spot) }
        badgeNote={ spotPred !== null ? 'from ' + samplesFor(spot, data.sessions, data.snapshots).length + ' of your sessions' : '' }
        badgeBg={ spotPred !== null ? guessColours(spotPred)[0] : '#e9e8e3' }
        badgeFg={ spotPred !== null ? guessColours(spotPred)[1] : '#6b6b6b' }
    />

    {#if spotModels.length > 1}
        <div class="models-pick" role="radiogroup" aria-label="Forecast model">
            {#each spotModels as m}
                <button class:on={ spotModel === m } role="radio" aria-checked={ spotModel === m } on:click={ () => spot && setSpotModel(spot, m) }>{ modelLabel(m) }</button>
            {/each}
        </div>
    {/if}
    <div class="actions">
        <button class="act" disabled={ capturing } on:click={ () => spot && saveForecastAt({ lat: spot.lat, lon: spot.lon, spot }) }><Icon name="weather" /><b>{ capturing ? 'Loading…' : 'Save forecast' }</b><small>next 24 h</small></button>
        <button class="act" on:click={ () => spot && startLog({ spot }) }><Icon name="pen" /><b>Log session</b><small>how was it?</small></button>
        <button class="act" class:on={ mapShown === spot.id } aria-pressed={ mapShown === spot.id } on:click={ () => spot && toggleShowOnMap(spot) }><Icon name="map" /><b>Show on map</b>{#if mapShown === spot.id}<small>tap to hide</small>{/if}</button>
    </div>

    <div class="card">
        {#if spot.windUnknown}
            <div class="row start">
                <span class="grow"><b>Wind window: not known yet</b><small><Brand cap /> learns it from your sessions rated great or epic.</small></span>
                <button class="link" on:click={ () => spot && editSpot(spot) }>Edit</button>
            </div>
            {#if suggestion}
                <div class="suggest">
                    <span class="grow"><small>Your best days here had</small><b>{ dirsLabel(suggestion.dirs) }, { fmtWind0(suggestion.min, S.wind) }–{ fmtWind0(suggestion.max, S.wind) } { windLabel(S.wind) }</b><small>from { suggestion.basedOn } great sessions</small></span>
                    <button class="btn primary small" on:click={ applySuggestion }>Use this</button>
                </div>
            {:else}
                <small class="muted">{ Math.max(0, 2 - goodCount) } more great session(s) with a saved forecast needed.</small>
            {/if}
        {:else}
            <div class="row start">
                <span class="arrows">
                    {#each spot.dirs as d}<span class="arrow o" style="transform: rotate({ DIRS.indexOf(d) * 45 + 180 }deg)">▲</span>{/each}
                </span>
                <span class="grow"><b>Works { dirsLabel(spot.dirs) }, { fmtWind0(spot.min, S.wind) }–{ fmtWind0(spot.max, S.wind) } { windLabel(S.wind) }</b></span>
                <button class="link" on:click={ () => spot && editSpot(spot) }>Edit</button>
            </div>
        {/if}
        <div class="stats sep">
            <div><span class="lbl">Sessions</span><span class="big">{ spotSessions.length }</span></div>
            <div><span class="lbl">Avg rating</span><span class="big">{ avgRating }</span></div>
            <div><span class="lbl">Forecast bias</span><span class="big">{ bias === null ? '–' : (bias > 0 ? '+' : bias < 0 ? '−' : '') + fmtWind(Math.abs(bias), S.wind) } <small>{ windLabel(S.wind) }</small></span></div>
        </div>
    </div>

    {#if !spot.windUnknown}
        <div class="section">
            <b>Next good window</b>
            <div class="card row">
                {#if matches[spot.id] === 'loading' || matches[spot.id] === undefined}
                    <span class="muted">Checking the ECMWF forecast…</span>
                {:else if matchOf(spot.id)}
                    <span class="tag green">Match</span>
                    <span class="grow"><b>{ fmtDay(matchOf(spot.id).start) }, { fmtTime(matchOf(spot.id).start) }–{ fmtTime(matchOf(spot.id).end) }</b><small>≈ { fmtWind(matchOf(spot.id).avgWind, S.wind, true) } { dirName(matchOf(spot.id).dir) } · ECMWF</small></span>
                {:else}
                    <span class="muted">Nothing in your window for the next days.</span>
                {/if}
            </div>
        </div>
    {/if}

    <div class="section">
        <b>Which forecast to trust here</b>
        <div class="card">
            {#if scores.length === 0}
                <span class="muted">Log a few sessions with “It felt like”. <Brand cap /> then ranks the models for this spot.</span>
            {:else}
                {#each scores as sc, i}
                    <div class="score"><span class="m" class:best={ i === 0 }>{ modelLabel(sc.model) }</span><span class="mbar"><i style="width: { Math.min(100, sc.miss * 25) }%" class:best={ i === 0 }></i></span><span>±{ fmtWind(sc.miss, S.wind) } { windLabel(S.wind) }</span></div>
                {/each}
                <small class="muted">Average miss vs what you felt, { scores[0].count } session(s)</small>
            {/if}
        </div>
    </div>

    <div class="section">
        <b>Saved forecasts</b>
        {#if spotSnapshots.length === 0}
            <span class="muted">None yet. Press “Save forecast” before you go: it keeps the next 24 hours.</span>
        {:else}
            <div class="list">
                {#each spotSnapshots.slice(0, 8) as sn (sn.id)}
                    <div class="item static">
                        <span class="sw" style="background: { windColor(primaryOf(sn)?.wind ?? null) }">{ fmtWind0(primaryOf(sn)?.wind ?? null, S.wind) }</span>
                        <button class="grow plain" on:click={ () => openSnap(sn) }><span>{ fmtDayTime(sn.ts) }</span><small>{ sn.models.length } model(s){ sn.note ? ' · ' + sn.note.slice(0, 24) : '' }</small></button>
                        <button class="mini" on:click={ () => openSnap(sn) }>Edit</button>
                        <button class="mini danger" on:click={ () => deleteSnap(sn) }>Delete</button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="section">
        <b>Sessions here</b>
        {#if spotSessions.length === 0}
            <span class="muted">No sessions here yet.</span>
        {:else}
            <div class="list">
                {#each spotSessions as se (se.id)}
                    <SwipeRow on:open={ () => openSession(se) } on:delete={ () => deleteSession(se) }>
                        <span class="dot" style="background: { ratingBg(se.rating) }; color: { ratingFg(se.rating) }">{ se.rating }</span>
                        <span class="grow"><span>{ fmtDay(se.date) }{ se.track ? ' · GPS' : '' }</span><small>{ se.notes ? se.notes.slice(0, 40) : RATINGS[se.rating - 1] }</small></span>
                        <small>{ feltLine(se) }</small>
                    </SwipeRow>
                {/each}
            </div>
            <small class="muted">Tap to open. Swipe left to delete.</small>
        {/if}
    </div>

    <button class="link danger" on:click={ () => spot && deleteSpot(spot) }>{ armed === 'spot' ? 'Tap again: deletes the spot, its forecasts and sessions' : 'Delete spot' }</button>

<!-- ================= SNAPSHOT ================= -->
{:else if view === 'snap' && snap}
    <SnapCard title={ snapDraft ? 'Right now · ' + fmtTime(snap.ts) : fmtDayTime(snap.ts) } sub={ snapDraft ? 'Not saved yet · check it and save' : 'Saved ' + fmtDayTime(snap.savedAt) } model={ modelLabel(snap.primary) } wind={ primaryOf(snap) } waves={ snap.waves } models={ snap.models } u={ S } />
    <small class="muted sl-note">{ snap.series ? 'Saved with it: the forecast for the next 24 hours from ' + fmtTime(snap.series.ts[0]) + ', from ' + Object.keys(snap.series.models).length + ' model(s).' : 'Older snapshot: only this hour was saved.' } When you log a session, it uses the hours of your session.</small>
    <div class="card">
        <div class="row">
            <span class="ico"><i class="dot-s" class:off={ !snap.spotId }></i></span>
            <span class="grow"><small>Spot</small><b>{ spotById(snap.spotId)?.name || 'No spot linked yet' }</b></span>
            <button class="btn ghost small" on:click={ () => (linkOpen = !linkOpen) }>{ linkOpen ? 'Done' : snap.spotId ? 'Edit linked spot' : 'Link to a spot' }</button>
        </div>
        {#if linkOpen}
            <div class="chips">
                {#each nearestSpots(snap.lat, snap.lon).slice(0, 5) as s (s.id)}
                    <button class="chip" class:on={ snap.spotId === s.id } on:click={ () => { linkSnap(s.id); linkOpen = false; } }>{ s.name }</button>
                {/each}
                <button class="chip dash" on:click={ () => snap && startSpotForm({ lat: snap.lat, lon: snap.lon }, 'snap') }>+ New spot here</button>
                {#if snap.spotId}<button class="chip" on:click={ () => { linkSnap(null); linkOpen = false; } }>No spot</button>{/if}
            </div>
        {/if}
    </div>
    <label class="field"><span class="lbl">Note</span><textarea rows="3" bind:value={ snapNote } on:change={ saveSnapNote } placeholder="e.g. Planning to go after work"></textarea></label>
    <div class="btns">
        {#if snapDraft && replaceOf}
            <div class="replace">
                <b>You already saved a forecast for { spotById(replaceOf.spotId)?.name }</b>
                <small>From { fmtDayTime(replaceOf.savedAt) }. Replace it with this one?</small>
                <div class="btns">
                    <button class="btn primary" on:click={ () => confirmSnap(true) }>Replace</button>
                    <button class="btn ghost" on:click={ () => (replaceOf = null) }>Keep the old one</button>
                </div>
            </div>
        {:else if snapDraft}
            <button class="btn primary" on:click={ () => confirmSnap(false) }>Save forecast</button>
            <button class="btn ghost" on:click={ back }>Cancel</button>
        {:else}
            <button class="btn primary" on:click={ back }>Done</button>
            <button class="btn ghost" on:click={ () => snap && deleteSnap(snap) }>Delete</button>
        {/if}
    </div>

<!-- ================= LOG / EDIT SESSION ================= -->
{:else if view === 'log' && f}
    {#if logSnap && logView}
        <SnapCard
            title={ fmtDayTime(logView.ts) }
            sub={ logView.matches ? 'Forecast for your session time' : 'Forecast saved ' + fmtDayTime(logSnap.savedAt) }
            model={ modelLabel(logSnap.primary) }
            wind={ logPrimary }
            waves={ logView.waves }
            models={ logView.models }
            best={ closest?.model || null }
            u={ S }
        />
        {#if logView.note}<small class="muted sl-note">{ logView.note }</small>{/if}
        {#if logView.otherDay && f.lat !== undefined && !capturing}
            <button class="btn ghost" on:click={ () => captureForLog(true) }>{ f.dateStr === dateStrOf(Date.now()) ? 'Use the forecast for your session hours' : 'Save the forecast for ' + fmtDay(sessionFocus(f) ?? Date.now()) + ' instead' }</button>
        {/if}
    {:else}
        <div class="snapless">
            {#if capturing}
                <span>Saving the forecast…</span>
            {:else if f.lat !== undefined}
                <span class="grow">{ captureError || 'No forecast attached' }</span>
                <button class="btn primary small" on:click={ () => f && captureForLog(true) }>Save it now</button>
            {:else}
                <span class="grow">No place yet, so no forecast. Pick a spot below.</span>
            {/if}
        </div>
    {/if}

    <div class="field"><span class="lbl">When</span>
        <input type="date" bind:value={ f.dateStr } />
        <div class="row start times">
            <TimeWheel bind:value={ f.start } placeholder="Start" />
            <span class="to">→</span>
            <TimeWheel bind:value={ f.end } placeholder="End" />
        </div>
        {#if f.start && f.end && f.end < f.start}<small class="muted">Ends the next day</small>{/if}
    </div>

    <div class="card">
        <div class="row">
            <span class="ico"><i class="dot-s"></i></span>
            <span class="grow"><small>Spot</small><b>{ spotById(f.spotId)?.name || 'No spot yet' }</b></span>
            {#if f.spotId}<button class="link" on:click={ () => f && (f = { ...f, spotId: null }) }>Change</button>{/if}
        </div>
        {#if !f.spotId}
            <div class="chips">
                {#each (f.lat !== undefined ? nearestSpots(f.lat, f.lon ?? 0) : data.spots).slice(0, 5) as s (s.id)}
                    <button class="chip" on:click={ () => assignSpot(s) }>{ s.name }</button>
                {/each}
                <button class="chip dash" on:click={ newSpotFromLog }>+ New spot</button>
            </div>
            <small class="muted">You can also save it without a spot and add one later.</small>
        {/if}
    </div>

    <div class="section">
        <b class="h2">How was it?</b>
        <div class="ratings">
            {#each RATINGS as r, i}
                <button class="rate" class:on={ f.rating === i + 1 } style={ f.rating === i + 1 ? `background: ${ RATING_BG[i] }; border-color: ${ RATING_BG[i] }; color: ${ RATING_FG[i] }` : '' } on:click={ () => f && (f = { ...f, rating: i + 1 }) }><b>{ i + 1 }</b><span>{ r }</span></button>
            {/each}
        </div>
    </div>

    <div class="card">
        <div class="row start">
            <span class="grow"><small>It felt like</small><b class="big2">{ f.felt === null ? '–' : f.felt } <small>{ windLabel(S.wind) }</small></b></span>
            {#if logFc !== null && f.felt !== null}
                <span class="tag ghost">{ f.felt < logFc ? 'Lighter than forecast' : f.felt > logFc ? 'Stronger than forecast' : 'As forecast' }</span>
            {/if}
        </div>
        <FeltSlider bind:value={ f.felt } min={ 0 } max={ feltMax } step={ feltStep } forecast={ logFc } unit={ windLabel(S.wind) } />
        <div class="row sep">
            <small class="grow muted">{ logFc !== null ? 'White line: forecast said ' + logFc + ' ' + windLabel(S.wind) : 'Drag or tap the ruler' }</small>
            {#if closest}<small>Closest: <b>{ modelLabel(closest.model) }</b></small>{/if}
        </div>
    </div>

    <div class="field"><span class="lbl">Gusts</span>
        <div class="chips">{#each ['Steady', 'Gusty', 'Very gusty'] as g}<button class="chip" class:on={ f.gusts === g } on:click={ () => f && (f = { ...f, gusts: f.gusts === g ? null : g }) }>{ g }</button>{/each}</div>
    </div>
    <div class="field"><span class="lbl">Water</span>
        <div class="chips">{#each ['Flat', 'Chop', 'Swell', 'Waves'] as w}<button class="chip" class:on={ f.water === w } on:click={ () => f && (f = { ...f, water: f.water === w ? null : w }) }>{ w }</button>{/each}</div>
    </div>

    <div class="field"><span class="lbl">Gear</span>
        {#each logGearGroups as grp (grp.sport)}
            {#if logGearGroups.length > 1}<small class="muted">{ grp.sport }</small>{/if}
            <div class="chips">
                {#each grp.items as g (g.id)}
                    <button class="chip" class:on={ f.gearIds.includes(g.id) } on:click={ () => f && (f = { ...f, gearIds: toggle(f.gearIds, g.id) }) }><span class="k">{ g.kind }</span>{ g.name }</button>
                {/each}
            </div>
        {/each}
        <div class="row">
            <input bind:value={ f.gear } placeholder={ data.gear.length ? 'Anything else' : 'e.g. Sail 5.3, board 105 L' } />
            {#if f.gear.trim()}<button class="btn ghost small" on:click={ saveTypedGear }>Save to gear</button>{/if}
        </div>
    </div>

    <div class="card">
        <div class="row">
            <span class="grow"><b>GPS track</b><small>{ f.track ? f.track.source : 'From Garmin, Strava, Waterspeed… (.gpx or .tcx)' }</small></span>
            {#if f.track}
                <button class="link" on:click={ () => f?.track && drawTrack(f.track, true) }>Show on map</button>
            {:else}
                <label class="btn ghost small">Add file<input type="file" accept=".gpx,.tcx,.fit,application/gpx+xml" on:change={ onTrackFile } hidden /></label>
            {/if}
        </div>
        {#if trackError}<small class="err">{ trackError }</small>{/if}
        {#if f.track}
            <div class="stats sep">
                <div><span class="lbl">Distance</span><span class="big">{ fmtDistance(f.track.distanceKm, S.height) }</span></div>
                <div><span class="lbl">Time</span><span class="big">{ Math.floor(f.track.durationMin / 60) }:{ String(Math.round(f.track.durationMin % 60)).padStart(2, '0') } <small>h</small></span></div>
                <div><span class="lbl">Top speed</span><span class="big">{ fmtWind(f.track.maxSpeed, S.wind) } <small>{ windLabel(S.wind) }</small></span></div>
            </div>
            <button class="link danger" on:click={ removeTrack }>Remove track</button>
        {/if}
    </div>

    <label class="field"><span class="lbl">Notes for next time</span><textarea rows="4" bind:value={ f.notes } placeholder="What the forecast couldn't see…"></textarea></label>

    <button class="btn primary wide" on:click={ saveSession }>{ f.id ? 'Save changes' : 'Save session' }</button>
    {#if f.id}
        <button class="link danger" on:click={ () => { const se = data.sessions.find(x => x.id === f?.id); if (se) deleteSession(se, true); } }>Delete session</button>
    {/if}
{/if}

{/if}

{#if toast}
    <div class="toast" role="status">
        <span class="grow">{ toast.msg }</span>
        {#if toast.undo}<button class="undo" on:click={ runUndo }>Undo</button>{/if}
    </div>
{/if}

</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map, markers, centerMap } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import * as reverse from '@windy/reverseName';
    import * as rootScope from '@windy/rootScope';
    import { onDestroy, onMount, tick } from 'svelte';

    import config from './pluginConfig';
    import { load, save, exportJson, uid, emptyData, normalise, mergeData, storageKey, useWindyUser } from './lib/storage';
    import { waveValueAt, modelValueAt, nextMatch, conditionsNow, trimWaves, captureDay, seriesAt, covers, availableModels, SNAPSHOT_MODELS } from './lib/forecast';
    import { cloudAvailable, pull, push } from './lib/cloud';
    import type { WindyAuth } from './lib/cloud';
    import { COFFEE_URL } from './lib/links';
    import { FONT_CSS } from './lib/fonts';
    import { THEME, THEME_CSS, guessColours, lightsUp, sessionMarkStyle } from './lib/theme';
    import {
        DIRS, SPORTS, RATINGS, RATING_BG, RATING_FG, GEAR_SPORTS, GEAR_BY_SPORT, ratingBg, ratingFg, dirName, dirsLabel, windColor, modelLabel,
        distanceKm, modelScores, forecastBias, fmtDay, fmtDayTime, fmtTime,
    } from './lib/wind';
    import { fmtWind, fmtWind0, fmtHeight, fmtTemp, fmtDistance, windLabel, fromWind, toWind, windStep } from './lib/units';
    import { predictRating, predictionLabel, samplesFor, suggestWindow, MIN_SAMPLES } from './lib/predict';
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

    import type { Spot, Snapshot, Session, ModelValue, WaveValue, Dir8, Settings as SettingsT, Track, SpotlogData, Gear } from './lib/types';
    import type { MatchWindow } from './lib/forecast';

    type View = 'home' | 'pick' | 'place' | 'spotForm' | 'spot' | 'snap' | 'log';
    type PickFor = 'snap' | 'log' | 'spot';
    interface Loc { lat: number; lon: number; name?: string }
    interface Now { wind: ModelValue | null; waves: WaveValue | null }
    interface SpotForm {
        id?: string; name: string; place: string; lat: number; lon: number; sports: string[];
        dirs: Dir8[]; dMin: number; dMax: number; windUnknown: boolean; created?: number;
    }
    interface LogForm {
        id?: string; spotId: string | null; lat?: number; lon?: number; snapshotId: string | null;
        dateStr: string; rating: number; felt: number | null; gusts: string | null; water: string | null;
        gearIds: string[]; gear: string; start: string; end: string; notes: string; track: Track | null;
        /** snapshot this log created by itself (may be replaced when the date changes) */
        autoSnap?: string | null;
    }
    interface Frame { view: View; spotId: string | null; snapId: string | null }

    const { name, title, version } = config;
    const isMobile = !!rootScope?.isMobileOrTablet;

    let root: HTMLElement;

    /**
     * Windy listens to the keyboard on the whole page (typing jumps to its search, space plays the timeline).
     * While you type in one of Spotlog's fields, the keys stay with that field.
     */
    function keepKeys(e: KeyboardEvent) {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        const editable = t.isContentEditable || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'range', 'file'].includes((t as HTMLInputElement).type));
        if (editable && e.key !== 'Escape') e.stopPropagation();
    }

    /*
     * Phones: errors are invisible there (no console), so while we test on real phones Spotlog shows its own
     * errors in a small box at the top of the screen. Only errors from Spotlog's code, not Windy's.
     */
    let errBox: HTMLElement | null = null;
    function showPhoneError(msg: string) {
        if (!isMobile) return;
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
        if (fromSpotlog(String(e.error?.stack || ''), e.filename || '')) showPhoneError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
        const r = e.reason as Error | undefined;
        if (r && fromSpotlog(String(r.stack || ''), '')) showPhoneError(String(r.message || r));
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
    let centreName = '';
    let sf: SpotForm | null = null;
    let sfReturn: 'log' | 'snap' | null = null;
    let f: LogForm | null = null;
    let trackError = '';
    let matches: Record<string, MatchWindow | null | 'loading'> = {};
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
    let toast: { msg: string; undo?: () => void } | null = null;
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
    $: spotSnapshots = spot ? data.snapshots.filter(s => s.spotId === spot?.id).sort((a, b) => b.ts - a.ts) : [];
    $: avgRating = spotSessions.length ? (spotSessions.reduce((a, s) => a + s.rating, 0) / spotSessions.length).toFixed(1) : '–';
    $: bias = spot ? forecastBias(spot, data.sessions, data.snapshots) : null;
    $: scores = spot ? modelScores(spot, data.sessions, data.snapshots) : [];
    $: spotNow = spot ? nowOf(nowKey(spot.id, spotModel), nowBySpot) : null;
    $: spotModels = spot ? modelsBySpot[spot.id] || [] : [];
    // another spot opens with ECMWF again; which models cover it is checked once
    let modelSpotId: string | null = null;
    $: if ((spot?.id ?? null) !== modelSpotId) {
        modelSpotId = spot?.id ?? null;
        spotModel = 'ecmwf';
    }
    $: if (view === 'spot' && spot) loadModels(spot);
    $: spotPred = spot && spotNow ? predictRating(spot, spotNow.wind, data.sessions, data.snapshots) : null;
    $: suggestion = spot && spot.windUnknown ? suggestWindow(spot, data.sessions, data.snapshots) : null;
    $: goodCount = spot ? samplesFor(spot, data.sessions, data.snapshots).filter(x => x.rating >= 4).length : 0;
    $: hoursOnWater = Math.round(data.sessions.reduce((a, s) => a + sessionHours(s), 0));
    $: logSnap = f?.snapshotId ? data.snapshots.find(x => x.id === f?.snapshotId) || null : null;
    // what the snapshot card shows while logging: the saved day read at the session time
    $: logView = logSnap && f ? viewFor(logSnap, sessionFocus(f)) : null;
    $: logPrimary = logView ? logView.models.find(m => m.model === logSnap?.primary) || logView.models[0] || null : null;
    $: if (view === 'log' && f) scheduleRecapture(f.dateStr, f.start, f.end);
    $: gearGroups = groupGear(data.gear, GEAR_SPORTS);
    $: logGearGroups = f ? groupGear(data.gear, [...(spotById(f.spotId)?.sports || []), ...GEAR_SPORTS]) : [];
    $: synced = cloudOn && !!wUser;
    $: syncLabel = syncState === 'saving' ? 'Syncing with your Windy account…' : syncState === 'error' ? 'Not synced yet — will retry' : syncAt ? `Synced with your Windy account · ${fmtTime(syncAt)}` : 'Linked to your Windy account';
    $: logFc = logPrimary?.wind != null ? roundToStep(toWind(logPrimary.wind, S.wind)) : null;
    $: feltStep = windStep(S.wind);
    $: feltMax = Math.max(baseMax(S.wind), logFc !== null ? Math.ceil((logFc * 1.4) / (feltStep * 5)) * feltStep * 5 : 0);
    $: closest = logView && f && f.felt !== null ? closestModel({ models: logView.models } as Snapshot, fromWind(f.felt, S.wind)) : null;
    $: nearSpot = place ? nearestWithin(place.lat, place.lon, 5) : null;
    $: spotsByCentre = view === 'pick' ? nearestSpots(centre().lat, centre().lon) : [];
    let mapTs = currentTs();
    $: timelineLabelFull = fmtDayTime(mapTs);
    $: hdr = headerFor(view, spot, snap, f, sf, place, pickFor, snapDraft);
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
    function touchStart(e: TouchEvent) {
        touchY = e.touches[0]?.clientY ?? 0;
    }
    function touchMove(e: TouchEvent) {
        const y = e.touches[0]?.clientY ?? 0;
        const dy = touchY - y; // > 0: finger moves up = scroll down
        let el = e.target as HTMLElement | null;
        // the nearest scrollable box between the finger and the panel (usually the panel itself)
        while (el && el !== root && !(el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
        const box = el || root;
        const canScroll = dy > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : box.scrollTop > 0;
        if (canScroll) e.stopPropagation();
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
        if (!changed) return;
        useWindyUser(wUser?.id);
        data = load();
        knownIds = allIds(data);
        syncAt = 0;
        goHome();
        if (wUser) syncNow();
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
        if (!lf.start) return null;
        const a = new Date(`${lf.dateStr}T${lf.start}`).getTime();
        if (!isFinite(a)) return null;
        if (lf.end) {
            let b = new Date(`${lf.dateStr}T${lf.end}`).getTime();
            if (b < a) b += 864e5;
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
            ? (sn.series ? 'Set your time on the water and the forecast follows it.' : '')
            : otherDay ? `This forecast is for ${fmtDay(sn.ts)}, not your session day`
            : outside ? (focus < sn.series!.ts[0] ? `This forecast was saved at ${fmtTime(sn.series!.ts[0])}, after your session.` : 'Your session is after the 24 hours this forecast covers.')
            : 'Older snapshot: only this hour was saved';
        return { ts: sn.ts, models: sn.models, waves: sn.waves, matches: false, otherDay: otherDay || outside, note };
    }
    /** conditions-now cache: tiles use ECMWF (key = spot id), the spot page can switch model */
    const nowKey = (id: string, model = 'ecmwf') => (model === 'ecmwf' ? id : `${id}:${model}`);
    function nowOf(id: string, _dep = nowBySpot): Now | null {
        const n = _dep[id];
        return n && n !== 'loading' ? n : null;
    }
    $: predOf = (s: Spot): number | null => {
        const n = nowBySpot[s.id];
        return n && n !== 'loading' ? predictRating(s, n.wind, data.sessions, data.snapshots) : null;
    };
    function ratingHint(s: Spot): string {
        const n = samplesFor(s, data.sessions, data.snapshots).length;
        return `Rating after ${Math.max(1, MIN_SAMPLES - n)} more session${MIN_SAMPLES - n === 1 ? '' : 's'}`;
    }
    $: matchOf = (id: string): MatchWindow => {
        const m = matches[id];
        return (m && m !== 'loading' ? m : null) as MatchWindow;
    };
    function primaryOf(sn: Snapshot): ModelValue | null {
        return sn.models.find(m => m.model === sn.primary) || sn.models[0] || null;
    }
    function closestModel(sn: Snapshot, ms: number): ModelValue | null {
        let best: ModelValue | null = null;
        for (const m of sn.models) {
            if (m.wind === null) continue;
            if (!best || Math.abs(m.wind - ms) < Math.abs((best.wind as number) - ms)) best = m;
        }
        return best;
    }
    function durationH(a: string, b: string): number {
        if (!a || !b) return 0;
        const [ah, am] = a.split(':').map(Number);
        const [bh, bm] = b.split(':').map(Number);
        const d = (bh * 60 + bm - (ah * 60 + am)) / 60;
        return d > 0 ? d : 0;
    }
    const sessionHours = (s: Session) => durationH(s.start, s.end) || (s.track ? s.track.durationMin / 60 : 0);
    const feltLine = (se: Session): string => {
        if (se.felt === null) return '';
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
            return SNAPSHOT_MODELS.includes(p) ? p : 'ecmwf';
        } catch {
            return 'ecmwf';
        }
    }
    function centre(): { lat: number; lon: number } {
        try {
            const c = map?.getCenter?.();
            if (c && typeof c.lat === 'number') return { lat: c.lat, lon: c.lng };
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
    function headerFor(v: View, sp: Spot | null, sn: Snapshot | null, lf: LogForm | null, sform: SpotForm | null, pl: Loc | null, pf: PickFor, draft = false) {
        switch (v) {
            case 'pick': return { title: pf === 'snap' ? 'Save forecast for…' : pf === 'log' ? 'Log a session at…' : 'Add a spot', sub: pf === 'spot' ? 'Pick the place on the map' : 'Choose a place' };
            case 'place': return { title: pl?.name || 'Place', sub: pl ? `${pl.lat.toFixed(3)}, ${pl.lon.toFixed(3)}` : '' };
            case 'spotForm': return { title: sform?.id ? 'Edit spot' : 'New spot', sub: sform?.place || 'Dropped pin' };
            case 'spot': return { title: 'Your spot', sub: `${spotSessions.length} session(s)${sp?.place ? ' · ' + sp.place : ''}` };
            case 'snap': return { title: draft ? 'New forecast' : 'Saved forecast', sub: spotById(sn?.spotId ?? null)?.name || 'No spot' };
            case 'log': return { title: lf?.id ? 'Session' : 'New session', sub: spotById(lf?.spotId ?? null)?.name || 'No spot yet' };
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
    function showToast(msg: string, undo?: () => void) {
        toast = { msg, undo };
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
        knownIds.forEach(id => { if (!cur.has(id)) deleted[id] = now; });
        cur.forEach(id => { if (deleted[id]) delete deleted[id]; }); // undo brings an item back
        knownIds = cur;
        data.deleted = deleted;
        data.updatedAt = now;
        if (!save(data) && !storageWarned) {
            storageWarned = true;
            showToast(synced ? 'This browser\'s storage is full. Your Windy account still has everything.' : 'This browser\'s storage is full. Export your data to keep it safe.');
        }
        data = data;
        drawSpotMarkers();
        schedulePush();
    }

    /* ---------- sync with the Windy account (no separate login) ---------- */
    const windyAuth = (): WindyAuth | null => {
        if (!wUser) return null;
        let token: string | null = null;
        try {
            token = (store.get('userToken') as string | null) || null;
        } catch {
            /* no token */
        }
        return { id: wUser.id, token };
    };
    function schedulePush() {
        if (!synced) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(async () => {
            const a = windyAuth();
            if (!a) return;
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
        if (!cloudOn || !a) return;
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
    const sig = (d: SpotlogData) => JSON.stringify([[...allIds(d)].sort(), Object.keys(d.deleted || {}).sort(), d.settings]);
    function onStorage(e: StorageEvent) {
        if (e.key !== storageKey() || !e.newValue) return;
        try {
            const other = normalise(JSON.parse(e.newValue));
            const merged = mergeData(other, data);
            data = merged;
            knownIds = allIds(data);
            if (sig(merged) !== sig(other)) save(merged);
            drawSpotMarkers();
        } catch (err) {
            console.info('[spotlog] could not read the other tab\'s data', err);
        }
    }
    function setSettings(s: SettingsT) {
        data.settings = s;
        persist();
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
        if (!p) return;
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
        if (typeof L !== 'undefined' && map) tempMarker = new L.Marker({ lat, lng: lon }, { icon: markers?.pulsatingIcon }).addTo(map);
    }
    /** Zoomed out, spots and sessions become plain dots: a map of everywhere you've been */
    const COMPACT_BELOW = THEME.compactBelow;
    function onMapZoom() {
        let z = 10;
        try {
            z = map?.getZoom?.() ?? 10;
        } catch {
            /* no zoom */
        }
        const c = z < COMPACT_BELOW;
        if (c !== compactMarkers) {
            compactMarkers = c;
            drawSpotMarkers();
        }
    }
    /** Sessions grouped by place (about 100 m), every session counts: the heat layer on the map */
    function sessionPlaces(): { lat: number; lon: number; list: Session[] }[] {
        const groups = new Map<string, { lat: number; lon: number; list: Session[] }>();
        for (const se of [...data.sessions].sort((a, b) => b.date - a.date)) {
            const sp = spotById(se.spotId);
            const lat = se.lat ?? se.track?.points[0]?.[0] ?? sp?.lat;
            const lon = se.lon ?? se.track?.points[0]?.[1] ?? sp?.lon;
            if (lat === undefined || lon === undefined) continue;
            const k = `${lat.toFixed(3)},${lon.toFixed(3)}`;
            const g = groups.get(k);
            if (g) g.list.push(se);
            else groups.set(k, { lat, lon, list: [se] });
        }
        return [...groups.values()];
    }
    function sessionTip(list: Session[]): string {
        const sp = spotById(list[0].spotId);
        const head = `<b>${escapeHtml(sp?.name || 'Your session')}</b>${list.length > 1 ? ` · ${list.length} sessions` : ''}`;
        const rows = list.slice(0, 5).map(se => `<span><i style="background:${ratingBg(se.rating)}"></i>${escapeHtml(fmtDay(se.date))} · ${RATINGS[se.rating - 1]}</span>`).join('');
        return head + rows + (list.length > 5 ? `<small>+ ${list.length - 5} more</small>` : '');
    }
    function drawSpotMarkers() {
        spotMarkers.forEach(m => m.remove());
        spotMarkers = [];
        if (typeof L === 'undefined' || !map) return;
        const st = data.settings;
        const activeId = view === 'spot' ? spot?.id : view === 'log' ? f?.spotId : view === 'snap' ? snap?.spotId : null;
        if (st.mapSessions) {
            // just a glow, no click: many sessions at one place overlap and get brighter (heat map feel); hover for dates
            for (const p of sessionPlaces()) {
                const mark = sessionMarkStyle(p.list.length);
                if (!mark) break;
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
            if (!st.mapSpots && !on) continue;
            // the pin sits on top of its own glow, so hovering the pin shows that spot's sessions
            const here = st.mapSessions ? data.sessions.filter(x => x.spotId === s.id).sort((a, b) => b.date - a.date) : [];
            const tip = here.length ? `<div class="spotlog-tip">${sessionTip(here)}</div>` : '';
            // a spot whose guess reaches the chosen level lights up in the guess colour; otherwise it stays grey
            const pred = predOf(s);
            const good = lightsUp(pred);
            const [gb, gf] = good ? guessColours(pred as number) : ['', ''];
            const word = good && THEME.goodWord ? `<em>${predictionLabel(pred as number).replace('Likely ', '').replace('Probably ', '')}</em>` : '';
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
                if (good && THEME.goodStyle === 'dot') dot = gb;
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
    $: if (nowBySpot && mapReady) drawSpotMarkers();
    function drawTrack(t: Track | null, fit = false) {
        trackLayers.forEach(l => l.remove());
        trackLayers = [];
        if (!t || !t.points.length || typeof L === 'undefined' || !map) return;
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
            if (fit) map.fitBounds?.(line.getBounds(), { padding: [60, 60], maxZoom: 15 });
        } catch (e) {
            console.info('[spotlog] could not draw the track', e);
        }
    }
    function popupHtml(sp: Spot, n: Now | null, loading = false): string {
        const w = n?.wind;
        const pred = n ? predictRating(sp, n.wind, data.sessions, data.snapshots) : null;
        const tile = (label: string, val: string, bg: string, unit = '') =>
            `<div class="sl-t" style="background:${bg}"><span>${label}</span><b>${val}${unit ? `<i>${unit}</i>` : ''}</b></div>`;
        return `<div class="sl-pop"><div class="sl-h"><b>${escapeHtml(sp.name)}</b><small>Right now · ECMWF</small></div>` +
            (w ? `<div class="sl-tiles">${tile('Wind', fmtWind0(w.wind, S.wind), windColor(w.wind), windLabel(S.wind))}${tile('Gusts', fmtWind0(w.gust, S.wind), windColor(w.gust), windLabel(S.wind))}${tile('From', dirName(w.dir), '#e9e8e3')}${n?.waves ? tile('Waves', fmtHeight(n.waves.waves, S.height), '#dbe6f2', S.height) : ''}</div>` : loading ? '<small>Loading conditions…</small>' : '<small>No forecast here</small>') +
            (w ? `<small>${fmtTemp(w.temp, S.temp)}</small>` : '') +
            (pred !== null ? `<span class="sl-b" style="background:${guessColours(pred)[0]};color:${guessColours(pred)[1]}">${predictionLabel(pred)}</span>` : '') +
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
        centerMap({ lat: sp.lat, lon: sp.lon, zoom: 11 });
        if (typeof L === 'undefined' || !map || !L.popup) return;
        // open right away (it follows the map while Windy moves it); conditions fill in when they arrive
        const cached = nowOf(sp.id);
        openSpotPopup(sp, cached, !cached);
        if (!cached) {
            const n = await loadNow(sp);
            if (mapShown === sp.id && popup) popup.setContent(popupHtml(sp, n));
        }
    }
    function openSpotPopup(sp: Spot, n: Now | null, loading = false) {
        try {
            // not closed by map clicks or other popups; if Windy still closes it, it comes straight back
            const p = L.popup({ className: 'spotlog-popup', closeButton: false, autoClose: false, closeOnClick: false, autoPan: false, offset: [0, -8] })
                .setLatLng([sp.lat, sp.lon])
                .setContent(popupHtml(sp, n, loading));
            popup = p;
            let reopened = 0;
            p.on?.('remove', () => {
                if (popup !== p || mapShown !== sp.id || reopened > 20) return;
                reopened++;
                setTimeout(() => { if (popup === p && mapShown === sp.id) p.openOn(map); }, 60);
            });
            p.openOn(map);
        } catch (e) {
            console.info('[spotlog] popup not available', e);
        }
    }

    async function onMapPick(ev: { lat: number; lon: number }, known?: Spot) {
        const { lat, lon } = ev;
        const near = known ? { s: known, d: 0 } : nearestWithin(lat, lon, 1);
        if (!(known && mapShown === known.id)) clearPopup();
        if (view === 'spotForm' && sf) {
            // move the new spot's pin
            setTemp(lat, lon);
            const old = sf;
            sf = { ...sf, lat, lon };
            const n = await placeName(lat, lon);
            if (sf && sf.lat === lat) sf = { ...sf, place: n, name: old.name && old.name !== old.place ? old.name : n };
            return;
        }
        if (view === 'pick') {
            const loc: Loc = near ? { lat: near.s.lat, lon: near.s.lon, name: near.s.name } : { lat, lon };
            if (!near || pickFor === 'spot') loc.name = await placeName(lat, lon);
            actOn(pickFor, loc, pickFor === 'spot' ? undefined : near?.s);
            return;
        }
        if (near) {
            openSpot(near.s);
            return;
        }
        setTemp(lat, lon);
        place = { lat, lon, name: 'Dropped pin' };
        placeNow = null;
        placeWaves = null;
        placeLoading = true;
        go('place');
        const n = await placeName(lat, lon);
        if (n && place && place.lat === lat) place = { ...place, name: n };
        const ts = currentTs();
        const [w, wv] = await Promise.all([modelValueAt(currentModel(), lat, lon, ts), waveValueAt(lat, lon, ts)]);
        if (place && place.lat === lat) {
            placeNow = w;
            placeWaves = trimWaves(wv, data.settings.layers);
            placeLoading = false;
        }
    }

    /* ---------- navigation ---------- */
    function go(v: View, push = true) {
        if (push && view !== v) hist = [...hist, { view, spotId: spot?.id ?? null, snapId: snap?.id ?? null }];
        view = v;
        showUnits = false;
        armed = '';
        if (v !== 'log') drawTrack(null);
        if (v !== 'place' && v !== 'spotForm') clearTemp();
        if (v !== 'spot') clearPopup();
        drawSpotMarkers();
        tick().then(scrollTop);
    }
    function scrollTop() {
        let el: HTMLElement | null = root;
        while (el) {
            if (el.scrollTop > 0) el.scrollTop = 0;
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
        if (fr.view === 'spot' && !spot) return goHome();
        if (fr.view === 'snap' && !snap) return back();
        if (fr.view === 'place' && place) setTemp(place.lat, place.lon);
        go(fr.view, false);
        if (fr.view === 'log' && f?.track) drawTrack(f.track);
    }
    function goHome() {
        hist = [];
        spot = null;
        snap = null;
        go('home', false);
        loadAllNow();
    }
    function openSpot(s: Spot, center = false) {
        if (mapShown && mapShown !== s.id) clearPopup();
        spot = s;
        go('spot');
        if (center) centerMap({ lat: s.lat, lon: s.lon, zoom: 10 });
        checkMatch(s);
        loadNow(s);
    }
    const modelsLoading = new Set<string>();
    async function loadModels(s: Spot) {
        if (modelsBySpot[s.id] || modelsLoading.has(s.id)) return;
        modelsLoading.add(s.id);
        const list = await availableModels(s.lat, s.lon);
        modelsBySpot = { ...modelsBySpot, [s.id]: list };
    }
    function setSpotModel(s: Spot, m: string) {
        spotModel = m;
        loadNow(s, m);
    }
    async function startPick(what: PickFor) {
        pickFor = what;
        waitingForMap = false;
        centreName = '';
        go('pick');
        const c = centre();
        centreName = (await placeName(c.lat, c.lon)) || `${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`;
    }
    async function useCentre() {
        const c = centre();
        const near = pickFor === 'spot' ? null : nearestWithin(c.lat, c.lon, 1);
        const loc: Loc = { ...c, name: near?.s.name || (await placeName(c.lat, c.lon)) };
        actOn(pickFor, loc, near?.s);
    }
    function actOn(what: PickFor, loc: Loc, s?: Spot) {
        waitingForMap = false;
        if (what === 'snap') saveForecastAt({ lat: loc.lat, lon: loc.lon, spot: s || nearestWithin(loc.lat, loc.lon, 1)?.s });
        else if (what === 'log') startLog(s ? { spot: s } : { lat: loc.lat, lon: loc.lon });
        else startSpotForm(loc, null);
    }

    /* ---------- spots ---------- */
    async function startSpotForm(loc: Loc, ret: 'log' | 'snap' | null) {
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
            if (sf && !sf.id && sf.lat === loc.lat && n) sf = { ...sf, place: n, name: sf.name || n };
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
        if (!sf) return;
        const st = windStep(S.wind);
        if (k === 'dMin') sf = { ...sf, dMin: Math.max(0, Math.min(sf.dMax - st, sf.dMin + dir * st)) };
        else sf = { ...sf, dMax: Math.max(sf.dMin + st, sf.dMax + dir * st) };
    }
    function saveSpotForm() {
        if (!sf || !sf.name.trim()) return;
        const s: Spot = {
            id: sf.id || uid(), name: sf.name.trim(), place: sf.place, lat: sf.lat, lon: sf.lon, sports: sf.sports,
            dirs: sf.windUnknown ? [] : sf.dirs, min: Math.round(fromWind(sf.dMin, S.wind) * 10) / 10, max: Math.round(fromWind(sf.dMax, S.wind) * 10) / 10,
            windUnknown: sf.windUnknown, created: sf.created || Date.now(),
        };
        const isNew = !sf.id;
        data.spots = isNew ? [...data.spots, s] : data.spots.map(x => (x.id === s.id ? s : x));
        delete matches[s.id];
        persist();
        loadNow(s);
        showToast(isNew ? 'Spot saved' : 'Spot updated');
        if (isNew && sfReturn === 'log' && f) {
            f = { ...f, spotId: s.id, lat: f.lat ?? s.lat, lon: f.lon ?? s.lon };
            back();
            if (!f.snapshotId) captureForLog();
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
        checkMatch(s);
    }
    function deleteSpot(s: Spot) {
        if (!arm('spot')) return;
        const before = { spots: data.spots, sessions: data.sessions, snapshots: data.snapshots };
        data.spots = data.spots.filter(x => x.id !== s.id);
        data.sessions = data.sessions.filter(x => x.spotId !== s.id);
        data.snapshots = data.snapshots.filter(x => x.spotId !== s.id);
        persist();
        goHome();
        showToast(`${s.name} deleted`, () => {
            Object.assign(data, before);
            persist();
        });
    }
    function applySuggestion() {
        if (!spot || !suggestion) return;
        const s: Spot = { ...spot, dirs: suggestion.dirs, min: suggestion.min, max: suggestion.max, windUnknown: false };
        data.spots = data.spots.map(x => (x.id === s.id ? s : x));
        spot = s;
        delete matches[s.id];
        persist();
        checkMatch(s);
        showToast('Wind window saved');
    }

    /* ---------- forecast snapshots ---------- */
    /** Models a forecast keeps: all of them, or the ones picked in the settings */
    const modelsToSave = (st: SettingsT) => (st.allModels || !st.models?.length ? SNAPSHOT_MODELS : st.models);
    /** Saves the forecast from `from` (default: now) for the next 24 hours */
    async function capture(lat: number, lon: number, spotId: string | null, from?: number, focus?: number): Promise<Snapshot> {
        const st = data.settings;
        const list = modelsToSave(st);
        const primary = list.includes('ecmwf') ? 'ecmwf' : list[0];
        const day = await captureDay(lat, lon, from ?? Date.now(), primary, list, st.layers);
        if (!day || !day.models.length) throw new Error('No forecast for that day. Windy only keeps forecasts from today on.');
        let { models, waves } = day;
        if (focus !== undefined && covers(day.series, focus)) ({ models, waves } = seriesAt(day.series, focus));
        return {
            id: uid(), spotId, lat, lon, ts: models[0]?.ts ?? day.models[0].ts, savedAt: Date.now(), primary: day.primary,
            models, waves, series: day.series,
        };
    }
    /** a forecast for this spot that no session uses yet (there is only one of those per spot) */
    function pendingFor(spotId: string | null, except?: string): Snapshot | null {
        if (!spotId) return null;
        const used = new Set(data.sessions.map(se => se.snapshotId));
        return data.snapshots.filter(x => x.spotId === spotId && x.id !== except && !used.has(x.id)).sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    }
    /** Loads the forecast and shows it for checking; nothing is stored until "Save forecast" */
    async function saveForecastAt(t: { lat: number; lon: number; spot?: Spot }) {
        capturing = true;
        try {
            const sn = await capture(t.lat, t.lon, t.spot?.id ?? null);
            if (view === 'pick') view = 'home'; // don't come back to the picker
            snapDraft = true;
            snap = sn;
            snapNote = '';
            linkOpen = false;
            replaceOf = null;
            go('snap');
            markSnapPlace(sn);
        } catch (e) {
            showToast((e as Error).message?.startsWith('No forecast') ? (e as Error).message : 'No forecast for this place');
        } finally {
            capturing = false;
        }
    }
    function removeSnap(id: string) {
        data.snapshots = data.snapshots.filter(x => x.id !== id);
        persist();
        if (view === 'snap' && snap?.id === id) back();
    }
    function deleteSnap(sn: Snapshot) {
        removeSnap(sn.id);
        showToast('Forecast deleted', () => {
            data.snapshots = [...data.snapshots, sn];
            persist();
        });
    }
    function confirmSnap(replace: boolean) {
        if (!snap || !snapDraft) return;
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
        showToast(removed ? 'Forecast replaced' : `Forecast saved · next 24 h from ${fmtTime(sn.series?.ts[0] ?? sn.ts)}`, () => {
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
        if (!snap) return;
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
        if (sn.spotId && spotById(sn.spotId)) clearTemp();
        else setTemp(sn.lat, sn.lon);
    }
    function linkSnap(spotId: string | null) {
        updateSnap({ spotId });
        replaceOf = null;
        if (snap) markSnapPlace(snap);
        if (spotId) showToast(`Linked to ${spotById(spotId)?.name}`);
    }
    function saveSnapNote() {
        updateSnap({ note: snapNote.trim() });
    }

    /* ---------- sessions ---------- */
    function emptyForm(): LogForm {
        return {
            spotId: null, snapshotId: null, dateStr: dateStrOf(Date.now()), rating: 4, felt: null, gusts: null, water: null,
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
            if (pend && (covers(pend.series, Date.now()) || new Date(pend.ts).toDateString() === today)) nf.snapshotId = pend.id;
        } else if (o.lat !== undefined) {
            nf.lat = o.lat;
            nf.lon = o.lon;
            nf.spotId = nearestWithin(o.lat, o.lon ?? 0, 1)?.s.id ?? null;
        }
        const sn = data.snapshots.find(x => x.id === nf.snapshotId);
        const p = sn ? primaryOf(sn) : null;
        nf.felt = p?.wind != null ? roundToStep(toWind(p.wind, S.wind)) : null;
        f = nf;
        if (view === 'pick') view = 'home';
        go('log');
        if (nf.lat !== undefined && !nf.spotId) setTemp(nf.lat, nf.lon ?? 0);
        captureError = '';
        if (!nf.snapshotId && nf.lat !== undefined) captureForLog();
    }
    /**
     * Saves the forecast for the session's day (at the session time if it is set, otherwise now).
     * A snapshot this log created itself is replaced; a forecast you saved on purpose is kept and just unlinked.
     */
    async function captureForLog(force = false) {
        if (!f || f.lat === undefined) return;
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
                f = { ...f, snapshotId: sn.id, autoSnap: sn.id, felt: f.felt ?? (p?.wind != null ? roundToStep(toWind(p.wind, S.wind)) : null) };
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
            if (view !== 'log' || !f || f.lat === undefined || capturing) return;
            const sn = data.snapshots.find(x => x.id === f?.snapshotId);
            const focus = sessionFocus(f);
            const day = focus ?? new Date(`${f.dateStr}T12:00`).getTime();
            const auto = !!f.autoSnap && f.autoSnap === f.snapshotId;
            if (captureError && captureErrorDay !== f.dateStr) captureError = '';
            if (!sn && !f.id && !captureError) captureForLog();
            else if (sn && auto && (dateStrOf(sn.ts) !== dateStrOf(day) || (focus !== null && !!sn.series && !covers(sn.series, focus)))) captureForLog(true);
        }, 500);
    }
    function openSession(se: Session) {
        trackError = '';
        const sp = spotById(se.spotId);
        f = {
            id: se.id, spotId: se.spotId, lat: se.lat ?? sp?.lat, lon: se.lon ?? sp?.lon, snapshotId: se.snapshotId,
            dateStr: dateStrOf(se.date), rating: se.rating,
            felt: se.felt === null ? null : roundToStep(toWind(se.felt, S.wind)),
            gusts: se.gusts, water: se.water, gearIds: [...(se.gearIds || [])], gear: se.gear || '',
            start: se.start, end: se.end, notes: se.notes, track: se.track || null,
        };
        go('log');
        if (f.track) drawTrack(f.track, true);
        else if (sp) centerMap({ lat: sp.lat, lon: sp.lon, zoom: 10 });
    }
    function assignSpot(s: Spot) {
        if (!f) return;
        f = { ...f, spotId: s.id, lat: f.lat ?? s.lat, lon: f.lon ?? s.lon };
        clearTemp();
        drawSpotMarkers();
        if (!f.snapshotId) captureForLog();
    }
    function newSpotFromLog() {
        if (!f) return;
        const loc = f.lat !== undefined ? { lat: f.lat, lon: f.lon ?? 0 } : f.track?.points[0] ? { lat: f.track.points[0][0], lon: f.track.points[0][1] } : centre();
        startSpotForm(loc, 'log');
    }
    function saveSession() {
        if (!f) return;
        const sn = data.snapshots.find(x => x.id === f?.snapshotId);
        let date: number;
        if (f.start) date = new Date(`${f.dateStr}T${f.start}`).getTime();
        else if (sn && dateStrOf(sn.ts) === f.dateStr) date = sn.ts;
        else if (f.track?.start && dateStrOf(f.track.start) === f.dateStr) date = f.track.start;
        else date = new Date(`${f.dateStr}T12:00`).getTime();
        if (!isFinite(date)) date = Date.now();
        const se: Session = {
            id: f.id || uid(), spotId: f.spotId, lat: f.lat, lon: f.lon, snapshotId: f.snapshotId, date, rating: f.rating,
            felt: f.felt === null ? null : Math.round(fromWind(f.felt, S.wind) * 10) / 10,
            gusts: f.gusts, water: f.water, gearIds: f.gearIds, gear: f.gear.trim(), start: f.start, end: f.end, notes: f.notes, track: f.track,
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
        showToast(f.id ? 'Session updated' : 'Session saved');
        const sp = spotById(se.spotId);
        if (!f.id && sp) {
            // land on the spot page, with home underneath
            hist = [{ view: 'home', spotId: null, snapId: null }];
            spot = sp;
            go('spot', false);
            loadNow(sp);
            checkMatch(sp);
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
        if (leave) back();
        showToast('Session deleted', () => {
            data.sessions = [...data.sessions, se];
            persist();
        });
    }
    async function onTrackFile(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || !f) return;
        trackError = '';
        try {
            const t = await readTrack(file);
            if (!f) return;
            const nf: LogForm = { ...f, track: t };
            if (t.start) {
                nf.dateStr = dateStrOf(t.start);
                if (!nf.start) nf.start = hhmmOf(t.start);
            }
            if (t.end && !nf.end) nf.end = hhmmOf(t.end + 4 * 60e3);
            if (nf.lat === undefined && t.points[0]) {
                nf.lat = t.points[0][0];
                nf.lon = t.points[0][1];
                nf.spotId = nf.spotId || nearestWithin(nf.lat, nf.lon, 3)?.s.id || null;
            }
            f = nf;
            drawTrack(t, true);
            showToast(`Track added · ${fmtDistance(t.distanceKm, S.height)}`);
        } catch (err) {
            trackError = (err as Error).message || 'Could not read this file';
        }
    }
    function removeTrack() {
        if (!f) return;
        f = { ...f, track: null };
        drawTrack(null);
    }

    /* ---------- gear ---------- */
    function addGear() {
        if (!gearName.trim()) return;
        data.gear = [...data.gear, { id: uid(), name: gearName.trim(), kind: gearKind, sport: gearSport }];
        gearName = '';
        persist();
    }
    function saveTypedGear() {
        if (!f || !f.gear.trim()) return;
        const sport = (spotById(f.spotId)?.sports || []).find(x => GEAR_SPORTS.includes(x));
        const g: Gear = { id: uid(), name: f.gear.trim(), kind: 'Other', sport };
        data.gear = [...data.gear, g];
        f = { ...f, gear: '', gearIds: [...f.gearIds, g.id] };
        persist();
        showToast('Saved to your gear');
    }
    function deleteGear(id: string) {
        const g = data.gear.find(x => x.id === id);
        data.gear = data.gear.filter(x => x.id !== id);
        persist();
        if (g) showToast(`${g.name} removed`, () => { data.gear = [...data.gear, g]; persist(); });
    }

    /* ---------- conditions + matches ---------- */
    async function loadNow(s: Spot, model = 'ecmwf'): Promise<Now | null> {
        const k = nowKey(s.id, model);
        const cur = nowBySpot[k];
        if (cur && cur !== 'loading') return cur;
        nowBySpot = { ...nowBySpot, [k]: 'loading' };
        const n = await conditionsNow(s.lat, s.lon, model);
        nowBySpot = { ...nowBySpot, [k]: n };
        return n;
    }
    function loadAllNow() {
        data.spots.forEach(s => loadNow(s));
    }
    async function checkMatch(s: Spot) {
        if (matches[s.id] !== undefined) return;
        matches = { ...matches, [s.id]: 'loading' };
        const m = await nextMatch(s);
        matches = { ...matches, [s.id]: m };
    }

    /* ---------- data ---------- */
    function clearAll() {
        if (!arm('all')) return;
        const before = data;
        data = { ...emptyData(), settings: data.settings };
        persist();
        showToast('All data deleted', () => { data = before; persist(); });
    }

    /* ---------- lifecycle ---------- */
    export const onopen = (params?: { lat?: number; lon?: number }) => {
        if (params && typeof params.lat === 'number' && typeof params.lon === 'number') {
            onMapPick({ lat: params.lat, lon: params.lon });
        }
    };

    onMount(() => {
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
        mapReady = true;
        drawSpotMarkers();
        loadAllNow();
        if (wUser) syncNow();
    });

    onDestroy(() => {
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
        if (tsListener !== null) store.off(tsListener);
        if (userListener !== null) store.off(userListener);
        if (subsListener !== null) store.off(subsListener);
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
    @outline: #5a5a5a;
    @text: var(--sl-text, #f8f8f8);
    @sub: var(--sl-sub, #b0b0b0);
    @ink: #1c1c1c;
    @orange: var(--sl-accent, #d49500);

    .spotlog {
        background: @ground;
        color: @text;
        font-family: 'Instrument Sans', system-ui, sans-serif;
        font-size: 14px;
        padding: 14px 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
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
            box-sizing: border-box; width: 100%; font: inherit; color: @text; background: @card;
            border: 1px solid @outline; border-radius: 12px; padding: 11px 14px; outline: none; min-width: 0;
        }
        input[type='date'] { color-scheme: dark; }
        textarea { resize: vertical; line-height: 1.45; }
    }
    .spotlog > :global(*) { flex-shrink: 0; }
    /* phones: the panel sits in Windy's small pane under the timeline, half the screen high, and scrolls
       (the layout that works on real phones, 0.5.2–0.6; 0.7.0's bar + sheet showed an empty pane) */
    .spotlog.m { padding: 10px 12px 16px; gap: 12px; height: 50vh; height: 50dvh; max-height: 50dvh; touch-action: pan-y;
        .head { padding: 10px 14px; gap: 8px; }
        .wordmark { font-size: 20px; }
        .stats .big { font-size: 18px; }
        .act { min-height: 64px; padding: 8px 10px; b { font-size: 13px; } :global(svg) { margin-bottom: 2px; } }
        .tile { min-height: 110px; padding: 12px; }
        .topbar .round { width: 34px; height: 34px; }
        .title { font-size: 16px; } }
    .wordmark { font-family: 'Doto', monospace; font-weight: 900; font-size: 24px; letter-spacing: 0.06em; }
    .card { background: @card; border: 1px solid @line; border-radius: 18px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
    .row { display: flex; align-items: center; gap: 10px; &.start { align-items: flex-start; } }
    .card.row { flex-direction: row; }
    .sep { padding-top: 12px; border-top: 1px solid @line; }
    .grow { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .title { font-size: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lbl { font-size: 12px; color: @sub; }
    .big { font-size: 22px; font-weight: 500; line-height: 1; small { font-size: 12px; } }
    .big2 { font-size: 26px; font-weight: 600; line-height: 1.1; small { font-size: 13px; } }
    .muted { color: @sub; font-size: 13px; }
    .p { margin: 0; line-height: 1.45; }
    .w { color: @text; }
    .small { margin: 0; font-size: 12px; color: @sub; }
    .r { text-align: right; }
    .err { color: #ff9a9a !important; line-height: 1.4; }
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
    .switch { width: 40px; height: 24px; border-radius: 12px; background: @outline; position: relative; flex-shrink: 0; transition: background 0.15s;
        i { position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: @text; transition: transform 0.18s; }
        &.on { background: var(--sl-switch, #d49500); i { transform: translateX(16px); } } }
    .sync { display: block; margin-top: -4px; color: @sub; &.err { color: #ff9a9a; } }
    .coffee { align-self: center; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; border-radius: 18px; border: 1px solid @outline; color: @text; text-decoration: none; font-weight: 600; font-size: 13px;
        &:hover { border-color: @orange; } }
    .ver { font-size: 11px; color: #7a7a7a; }
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
        button { height: 28px; padding: 0 11px; border-radius: 14px; border: 1px solid @outline; background: transparent; font-size: 12px !important; color: @sub !important; }
        button.on { background: var(--sl-sel-bg, #f8f8f8); border-color: var(--sl-sel-bg, #f8f8f8); color: var(--sl-sel-text, #1c1c1c) !important; font-weight: 600; } }
    .sl-note { margin-top: -8px; padding: 0 4px; line-height: 1.4; }
    .link.inline { display: inline; padding: 0; font-size: 12px; }

    /* the three actions are equals: same grey tile, an icon, a name and a short line */
    .actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .act { min-height: 78px; padding: 10px 11px; min-width: 0; border-radius: 14px; border: 1px solid @outline; background: @card; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 3px; text-align: left;
        :global(svg) { color: @text; margin-bottom: 4px; }
        b { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } small { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        &:hover { border-color: #777; background: #424242; }
        &.on { border-color: var(--sl-accent, #d49500); :global(svg) { color: var(--sl-accent, #d49500); } }
        &:disabled { opacity: 0.6; cursor: default; } }

    .tabs, .seg { display: flex; gap: 4px; padding: 3px; background: @card; border-radius: 12px;
        button { flex: 1; height: 34px; border: 0; border-radius: 9px; background: transparent; color: #d0d0d0; }
        button.on { background: var(--sl-sel-bg, #f8f8f8); color: var(--sl-sel-text, #1c1c1c) !important; font-weight: 600; } }
    .seg { background: @ground; button { height: 30px; } }
    .card .seg { background: @ground; }

    .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tile { text-align: left; min-height: 128px; padding: 14px; border-radius: 18px; background: @card; border: 1px solid @line; display: flex; flex-direction: column; gap: 10px; justify-content: space-between; }
    .t-name { font-size: 15px; font-weight: 600; }
    /* − / + above the spots: compact list or tiles */
    .viewtog { align-self: flex-end; display: flex; gap: 2px; padding: 2px; margin-bottom: -8px; border-radius: 9px; background: @card;
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
        &.green { background: var(--sl-match, #34985a); color: #fff; }
        &.ghost { border: 1px solid @outline; color: @sub; font-weight: 400; font-size: 11px; } }
    .empty { padding: 20px; border: 1px dashed @outline; border-radius: 14px; color: @sub; text-align: center; line-height: 1.45; }
    .list { display: flex; flex-direction: column; }
    .item { display: flex; align-items: center; gap: 12px; min-height: 54px; padding: 6px 2px; border: 0; border-bottom: 1px solid @line; background: transparent; text-align: left;
        &:last-child { border-bottom: 0; } }
    .plain { border: 0; background: none; padding: 0; text-align: left; }
    /* row icons: simple line icons and plain dots, no filled circle behind them */
    .ico { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: @sub;
        &.live { color: @orange; }
        &.o { color: @orange; font-size: 11px; } }
    .dot-s { display: block; width: 8px; height: 8px; border-radius: 4px; background: @orange; &.off { background: transparent; border: 1.5px solid @outline; box-sizing: border-box; } }
    .kind { min-width: 58px; height: 26px; padding: 0 8px; border-radius: 8px; background: @ground; font-size: 11px; color: @sub; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .dot { width: 30px; height: 30px; flex-shrink: 0; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
    .sw { width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: @ink; font-weight: 600; }
    .mini { height: 30px; padding: 0 10px; border-radius: 9px; border: 1px solid @outline; background: transparent; font-size: 12px !important;
        &.danger { color: var(--sl-danger, #ff9a9a) !important; border-color: #6a4444; } }
    .btns { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .btn { height: 46px; padding: 0 16px; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; flex: 1; box-sizing: border-box; white-space: nowrap;
        &.primary { background: var(--sl-primary-bg, #d49500); color: var(--sl-primary-text, #fff) !important; border: 0; }
        &.ghost { background: transparent; border: 1px solid @outline; }
        &.wide { width: 100%; flex: none; }
        &.small { height: 36px; flex: none; padding: 0 14px; font-size: 13px; }
        &:disabled { opacity: 0.5; cursor: default; } }
    label.btn { cursor: pointer; }
    .link { background: none; border: 0; color: @orange !important; font-weight: 600; padding: 6px 0; align-self: flex-start; flex-shrink: 0;
        &.danger { color: var(--sl-danger, #ff9a9a) !important; } }
    .link-card { text-align: left; align-items: center; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { height: 36px; padding: 0 15px; border-radius: 18px; border: 1px solid @outline; background: transparent; display: inline-flex; align-items: center; gap: 6px;
        .k { font-size: 11px; opacity: 0.65; }
        &.on { background: @text; color: @ink !important; border-color: @text; }
        &.dash { border-style: dashed; color: @orange !important; } }
    .dirs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .dir { height: 50px; border-radius: 12px; border: 1px solid @outline; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px;
        &.on { background: @text; color: @ink !important; border-color: @text; } }
    .stepper { display: flex; align-items: center; gap: 4px; small { margin-right: 2px; } .round { width: 34px; height: 34px; } }
    .arrow { display: inline-block; font-size: 11px; line-height: 1; &.o { color: @orange; font-size: 16px; margin-right: 2px; } }
    .arrows { display: flex; }
    .suggest { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: @text; color: @ink; small { color: #6b6b6b; } }
    .section { display: flex; flex-direction: column; gap: 8px; }
    .h2 { font-size: 20px; }
    .score { display: flex; align-items: center; gap: 10px; font-size: 13px;
        .m { width: 64px; &.best { color: @orange; font-weight: 600; } }
        .mbar { flex: 1; height: 6px; border-radius: 3px; background: @line; display: flex; i { display: block; border-radius: 3px; background: @sub; &.best { background: @orange; } } } }
    .ratings { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
    .rate { height: 62px; border-radius: 14px; border: 1px solid @line; background: @card; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
        b { font-size: 19px; } span { font-size: 11px; } }
    .times { gap: 8px; .to { height: 44px; display: flex; align-items: center; color: @sub; } }
    .snapless { display: flex; align-items: center; gap: 10px; min-height: 60px; padding: 12px 14px; border-radius: 18px; background: @text; color: @ink; box-sizing: border-box; }
    /* every way of choosing a place looks the same: one rectangular row each */
    .opts { display: flex; flex-direction: column; gap: 6px; }
    .opt { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 14px 8px 10px; border-radius: 14px; border: 1px solid @line; background: @card; text-align: left; width: 100%; box-sizing: border-box;
        &:hover { border-color: @outline; }
        &.on { border-color: @orange; } }
    .chev-r { color: @sub; font-size: 18px; }
    .pulse { width: 10px; height: 10px; border-radius: 5px; background: @orange; flex-shrink: 0; &.live { animation: sl-pulse 1.6s ease-out infinite; } }
    /* the spot popup: grows in from its tip, fades out when switched off */
    :global(.spotlog-popup .leaflet-popup-content-wrapper), :global(.spotlog-popup .leaflet-popup-tip-container) { transform-origin: 50% 100%; animation: sl-pop-in 0.22s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
    :global(.spotlog-popup.sl-closing .leaflet-popup-content-wrapper), :global(.spotlog-popup.sl-closing .leaflet-popup-tip-container) { animation: sl-pop-out 0.17s ease-in both; }
    @keyframes -global-sl-pop-in { from { opacity: 0; transform: translateY(8px) scale(0.94); } to { opacity: 1; transform: none; } }
    @keyframes -global-sl-pop-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(6px) scale(0.96); } }
    @media (prefers-reduced-motion: reduce) { :global(.spotlog-popup .leaflet-popup-content-wrapper), :global(.spotlog-popup .leaflet-popup-tip-container) { animation: none; } }
    @keyframes sl-pulse { 0% { box-shadow: 0 0 0 0 rgba(212, 149, 0, 0.55); } 100% { box-shadow: 0 0 0 12px rgba(212, 149, 0, 0); } }
    @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
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
    :global(.sl-pop small) { color: #6b6b6b; font-size: 12px; }
    :global(.sl-h) { display: flex; flex-direction: column; gap: 1px; }
    :global(.sl-h b) { font-size: 14px; }
    :global(.sl-tiles) { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
    :global(.sl-t) { display: flex; flex-direction: column; justify-content: space-between; gap: 6px; min-height: 58px; padding: 7px 8px; border-radius: 9px; font-size: 11px; color: #1c1c1c; box-sizing: border-box; }
    :global(.sl-t span) { white-space: nowrap; }
    :global(.sl-t b) { display: flex; align-items: baseline; gap: 2px; font: 900 20px 'Doto', ui-monospace, monospace; line-height: 1; white-space: nowrap; }
    :global(.sl-t b i) { font: 600 10px 'Instrument Sans', system-ui, sans-serif; font-style: normal; opacity: 0.7; }
    :global(.sl-b) { align-self: flex-start; padding: 3px 9px; border-radius: 10px; font-size: 12px; font-weight: 600; }
</style>
