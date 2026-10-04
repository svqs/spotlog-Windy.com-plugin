/**
 * Every phrase Spotlog shows, in one place, grouped by screen (the Style Lab's Words editor uses the same groups).
 *
 * In a phrase:
 *   {name}          is filled in by Spotlog (a number, a time, a spot name…). Keep these as they are.
 *   **words**       shows in bold.
 *   {spotlog}       the name in a sentence, lowercase with the pixel star. {Spotlog} = capital S, to start a sentence.
 *
 * A design saved in the Style Lab can replace any phrase (src/lib/design.ts); the defaults below stay as the fallback.
 */
import { writable } from 'svelte/store';
import { DESIGN } from './design';

type Item = [key: string, text: string, note?: string];
export interface CopyGroup { id: string; title: string; note?: string; items: Item[] }

export const COPY_GROUPS: CopyGroup[] = [
    { id: 'bar', title: 'Bar, tabs and page titles', note: 'The phone bar, the tabs, the big buttons on the home page', items: [
        ['tabSpots', 'Spots'], ['tabSessions', 'Sessions'], ['tabGear', 'Gear'], ['tabAbout', 'How it works'],
        ['titleSpots', 'Your spots', 'Phone: title of the Spots panel'], ['titleSessions', 'Sessions', 'Phone: title of the Sessions panel'],
        ['titleGear', 'Gear', 'Phone: title of the Gear panel'], ['titleAbout', 'How it works', 'Phone: title of the How it works panel'],
        ['betaTag', 'beta', 'Next to the SPOTLOG wordmark'],
        ['betaNote', 'Beta: your diary is saved in this browser only, so download a copy now and then. Saving to your account is coming soon.', 'Small grey line under the tabs’ content'],
        ['actSaveForecast', 'Save forecast'], ['actSaveForecastSub', 'next 24 h'],
        ['actAddSpot', 'Add spot'], ['actAddSpotSub', 'on the map'],
        ['actLogSession', 'Log session'], ['actLogSessionSub', 'when you\'re done'],
        ['actLoading', 'Loading…', 'Save forecast while it loads'],
        ['statSpots', 'Spots'], ['statSessions', 'Sessions'], ['statWater', 'On the water'],
        ['unitsTitle', 'Units and data', 'Phone: title of the units page'],
        ['hintSnap', 'Tap the map: where to save the forecast', 'Phone bar while you pick a place'],
        ['hintLog', 'Tap the map: where you were out'], ['hintSpot', 'Tap the map where the spot is'],
        ['hintLoading', 'Loading the forecast…'], ['hintPremium', 'For Windy Premium members'],
        ['cancel', 'Cancel'],
        ['syncSaving', 'Syncing with your Windy account…'], ['syncError', 'Not synced yet — will retry'],
        ['syncAt', 'Synced with your Windy account · {time}'], ['syncLinked', 'Linked to your Windy account'],
    ] },
    { id: 'gate', title: 'Log in and Premium', note: 'For people who are not logged in or not Premium', items: [
        ['gateIntro', 'Your session diary for Windy: save forecasts for your spots, log how your sessions went, and see when your spots look good for you.'],
        ['gateLoginTitle', 'Log in to Windy to use {spotlog}'],
        ['gateLoginText', '{Spotlog} is for Windy Premium members. Your diary is linked to your Windy account.'],
        ['gateLoginBtn', 'Log in to Windy'],
        ['gatePremiumTitle', '{Spotlog} is part of Windy Premium'],
        ['gatePremiumText', "You're logged in as {user}. Upgrade to Premium to start your diary."],
        ['gatePremiumBtn', 'Get Windy Premium'],
        ['gateBarLogin', 'Log in to use Spotlog', 'Phone bar button'], ['gateBarPremium', 'See how to get Spotlog', 'Phone bar button'],
    ] },
    { id: 'spots', title: 'Spots tab', items: [
        ['spotsEmpty', 'No spots yet. Press **Add spot** and click on the map where you surf or sail.'],
        ['viewList', 'List', 'The − button above the tiles (for screen readers)'], ['viewTiles', 'Tiles', 'The + button'],
        ['tileGusts', 'gusts {v}'], ['tileWaves', 'waves {v}'], ['tileLoading', 'Loading conditions…'],
        ['spotsNote', 'Conditions right now (ECMWF, or the model that has been most accurate at that spot). Rated with what {spotlog} learned at each spot.'],
        ['mapSpotsTitle', 'Spots on the map'], ['mapSpotsSub', 'Pins light up when it looks good'],
        ['mapSessTitle', 'Sessions on the map'], ['mapSessSub', 'See where you\'ve been out. The more often, the brighter.'],
    ] },
    { id: 'sessions', title: 'Sessions tab and calendar', items: [
        ['sessEmpty', 'No sessions yet. Press **Log session**. A spot is optional.'],
        ['sessList', 'List'], ['sessCal', 'Calendar'],
        ['noSpotYet', 'No spot yet'], ['gps', 'GPS', 'After the spot name when a session has a track'],
        ['swipeHint', 'Tap to open. Swipe left to delete.'], ['swipeDelete', 'Delete', 'The red button behind a row'],
        ['calNone', 'No sessions that day.'],
    ] },
    { id: 'gear', title: 'Gear tab', items: [
        ['gearAddTitle', 'Add gear'], ['gearAddSub', 'First the sport, then what it is.'], ['gearAddBtn', 'Add'],
        ['gearEmpty', 'Save your boards, sails, kites, wings… They show up as quick picks when you log a session.'],
        ['gearSaved', '{n} saved'], ['gearUsed', 'used in {n} session(s)'], ['gearRemove', 'Remove'],
    ] },
    { id: 'welcome', title: 'Welcome', note: 'Shown once, the first time someone opens spotlog', items: [
        ['welcomeTitle', 'Welcome to {spotlog}'],
        ['welcomeText', 'Save the forecast before you go out and log how it was after. {Spotlog} learns from your sessions when your spots look good for you.'],
        ['welcomeStart', "Let's start"], ['welcomeHow', 'How it works'], ['welcomeUpload', 'Have a copy? Upload it'],
    ] },
    { id: 'about', title: 'How it works tab', items: [
        ['betaTitle', '{Spotlog} is in beta'],
        ['betaText', 'For now your diary is saved in this browser, on this device. If you clear the browser’s data or change devices, it’s gone, so download a copy now and then. To move your diary, upload the copy on the other device. Saving to your account is coming soon.'],
        ['upload', 'Upload a copy'], ['uploadHint', ''],
        ['aboutTitle', 'About {spotlog}'],
        ['aboutText', 'For the people who have a camera roll full of Windy screenshots and their infinite chase for perfect conditions.'],
        ['howTitle', 'How it works'],
        ['step1Title', 'Save the forecast'], ['step1Text', 'Before you go out, tap Save forecast. {Spotlog} takes a snapshot and keeps the next 24 hours of forecast data.'],
        ['step2Title', 'Go out'], ['step2Text', 'Surf, windsurf, kite, wing, have fun.'],
        ['step3Title', 'Log how it was'], ['step3Text', 'After your session, tap Log session: when you went, how it was, and your gear or a GPS track if you like.'],
        ['step4Title', 'Get smarter each time'], ['step4Text', 'Every session teaches {Spotlog} what works at each spot for each sport (wind, direction, gusts, waves or swell), which of those matter most there, and which forecast model is closest.'],
        ['goodTitle', 'Good to know'],
        ['good1', 'Save your forecast before the session. Windy keeps just a few hours of forecast history, so if you try to save a session from the previous day, there might not be enough data to save it.'],
        ['good2', 'In the beta your diary stays in this browser. A downloaded copy is a file you keep, and you can upload it again any time.'],
        ['good3', 'Your spots, sessions and GPS tracks are private. Nobody else sees them.'],
        ['download', 'Download a copy'], ['deleteAll', 'Delete everything, forever'], ['deleteAllArmed', 'Tap again: gone for good'],
        ['version', 'version {v}'], ['feedback', 'Give feedback'],
        ['tideCredits', 'Tide data: Windy.com, from WorldTides (worldtides.info, © Brainware LLC), generated using AVISO+ FES2022 (Noveltis, LEGOS, CLS; distributed by AVISO+ with support from CNES). Tide predictions are not for navigation.'],
    ] },
    { id: 'pick', title: 'Pick a place', note: 'After Save forecast, Add spot or Log session', items: [
        ['hdrPickSnap', 'Save forecast for…'], ['hdrPickLog', 'Log a session at…'], ['hdrPickSpot', 'Add a spot'],
        ['hdrPickSub', 'Choose a place'], ['hdrPickSubSpot', 'Pick the place on the map'],
        ['pickSnapNote', 'Saves the forecast from now for the next 24 hours: what it looks like right now, and every hour until {time} tomorrow.'],
        ['pickLast', 'Your last saved forecast'], ['pickSavedPlace', 'Saved place'],
        ['pickTap', 'Tap on the map', 'Phones'], ['pickClick', 'Click on the map', 'Desktop'],
        ['pickMapSub', 'any place, town or one of your spots'],
        ['pickTapWaiting', 'Tap a place, a town or one of your spots…'], ['pickClickWaiting', 'Click a place, a town or one of your spots…'],
        ['pickMe', 'Your current location'], ['pickMeSub', 'where you are right now'], ['pickMeFinding', 'Finding you…'],
        ['pickMeError', "Couldn't find you. Allow location for Windy, or tap the map."],
        ['pickNoPlace', 'Without a place'], ['pickNoPlaceSub', 'add the spot later'],
        ['pickNearest', 'Your spots · nearest first'], ['yourSpot', 'Your spot', 'Under a spot without a place name'],
        ['pickTip', "Tip: save forecasts ahead of your session. Windy doesn't keep past forecasts, so a day that's over can't be saved afterwards."],
    ] },
    { id: 'place', title: 'A place on the map', note: 'After clicking anywhere on the map', items: [
        ['hdrPlace', 'Place'], ['placeSub', 'Forecast · {time}'], ['placeEmpty', 'No forecast for this place'],
        ['nearSpot', 'Close to your spot'], ['here', 'here', 'Under Add spot / Log session'],
    ] },
    { id: 'spotForm', title: 'New or edit spot', items: [
        ['hdrSpotNew', 'New spot'], ['hdrSpotEdit', 'Edit spot'], ['droppedPin', 'Dropped pin', 'A place without a name'],
        ['formName', 'Name'], ['formNamePh', 'Spot name', 'Grey text in the empty field'],
        ['formLocation', 'Location'], ['formMove', 'click on the map to move it'],
        ['formSport', 'Sport'], ['formWindQ', 'Which forecast wind works here?'], ['formKnow', 'I know'], ['formDontKnow', "I don't know yet"],
        ['formUnknownText', 'No problem. Log a few sessions here. After two great ones, {spotlog} suggests the wind directions and strength from your own days.'],
        ['formWindFrom', 'Forecast wind from'], ['formStrength', 'Forecast wind'], ['formMin', 'min'], ['formMax', 'max'],
        ['formGuessNote', 'A rough guess is fine. spotlog suggests a better one once your sessions show it, and you can change it any time.'],
        ['formSaveNew', 'Save spot'], ['formSaveEdit', 'Save changes'],
    ] },
    { id: 'spot', title: 'Spot page', items: [
        ['hdrSpot', 'Your spot'], ['hdrSpotSub', '{n} session(s)'],
        ['rightNow', 'Right now', 'Start of the line under the spot name'],
        ['basedSimilar', 'From {n} similar sessions here'], ['basedTrees', 'From your {n} similar sessions and patterns in all of them'],
        ['basedRange', 'From the wind window you set for this spot'],
        ['whyFew', 'Not enough sessions here in conditions like these yet'], ['whyPoor', 'Your sessions here in conditions like these weren\'t good'],
        ['whyBelow', 'Doesn\'t look good for you here'], ['whyMissing', 'No forecast for what this sport needs here'],
        ['whyOutside', 'Conditions unlike any you\'ve logged here'],
        ['bestToday', 'Best today'], ['todayUntil', 'until {time}', 'The best window is on already'],
        ['worksTitle', 'What works here for you'],
        ['worksUnknown', 'not sure yet'], ['worksUnknownLong', 'Not sure yet. Adjust your window or log a few sessions here, and spotlog figures out what works for you.'],
        ['learnedFromShort', 'learned from {n} sessions, {g} great'], ['fromWindowShort', 'from your wind window'],
        ['worksOpenHint', 'Tap to see which conditions work for you here and which matter most for today.'],
        ['colWorks', 'Your range'], ['colMatters', 'Matters'], ['colNow', 'Today'],
        ['worksLegend', 'Your range: what your good days here had. Matters: how much it counts here. Today: green when it fits.'],
        ['adjust', 'Adjust'], ['adjustNote', 'Your ranges win over what spotlog learns. Leave a field empty for no limit.'],
        ['save', 'Save'], ['backToLearned', 'Back to learned'], ['setByYou', 'set by you'],
        ['upTo', 'up to {v}'], ['from', 'from {v}'],
        ['gearHint', 'Your {gear}: great days here had {range} ({n} sessions)'],
        ['learnedWindowTitle', 'spotlog learned it works best'], ['useLearned', 'Use this'],
        ['recoTitle', 'When to go'], ['today', 'Today'],
        ['predShort', '{p} % sure'], ['predTitle', 'Windy\'s forecast predictability for that day'],
        ['saveNudge', 'Going out today? Save the forecast first, so the session teaches spotlog.'],
        ['checkedLabel', 'Not worth it, didn\'t go'],
        ['notWorth', 'Not worth it, didn\'t go'], ['notWorthNote', 'Saved as a poor day: spotlog learns what doesn\'t work, and it isn\'t counted as a session on the water.'],
        ['daysNone', 'Nothing stands out today or in the next days.'],
        ['matter1', 'a little'], ['matter2', 'some'], ['matter3', 'a lot'],
        ['paramWind', 'Wind'], ['paramGust', 'Gusts'], ['paramDir', 'Wind direction'], ['paramWaves', 'Waves'],
        ['paramSwell', 'Swell'], ['paramPeriod', 'Swell period'], ['paramSwellDir', 'Swell direction'],
        ['paramPower', 'Wave power'], ['paramTemp', 'Temperature'], ['paramRain', 'Rain'],
        ['spotLogSub', 'how was it?', 'Under Log session'], ['showOnMap', 'Show on map'], ['showOnMapHide', 'tap to hide'],
        ['windUnknownTitle', 'Wind window: not known yet'], ['windUnknownText', '{Spotlog} learns it from your sessions rated great or epic.'],
        ['edit', 'Edit'], ['bestDays', 'Your best days here had'], ['bestDaysFrom', 'from {n} great sessions'], ['useThis', 'Use this'],
        ['moreNeeded', '{n} more great session(s) with a saved forecast needed.'],
        ['works', 'Works {dirs}, {min}–{max} {unit}'],
        ['statAvg', 'Avg rating'],
        ['trustTitle', 'Which forecast to trust here'],
        ['trustEmpty', 'Log a few sessions here with the forecast saved before you go, and {spotlog} compares the models.'],
        ['trustNote', 'The longer the bar, the closer that forecast was to how your {n} sessions here went. spotlog learns from {model} and moves to the best one over time.'],
        ['trustMiss', '{v} off'],
        ['checking', 'Checking the forecast…'],
        ['savedTitle', 'Saved forecasts'], ['savedEmpty', 'None yet. Press “Save forecast” before you go: it keeps the next 24 hours.'],
        ['modelsN', '{n} model(s)'], ['delete', 'Delete'],
        ['sessHere', 'Sessions here'], ['sessHereEmpty', 'No sessions here yet.'],
        ['deleteSpot', 'Delete spot'], ['deleteSpotArmed', 'Tap again: deletes the spot, its forecasts and sessions'],
    ] },
    { id: 'snap', title: 'Saved forecast', items: [
        ['hdrSnapNew', 'New forecast'], ['hdrSnapSaved', 'Saved forecast'], ['noSpot', 'No spot'],
        ['snapNow', 'Right now · {time}'], ['snapDraftSub', 'Not saved yet · check it and save'], ['snapSavedSub', 'Saved {time}'],
        ['snapSeries', 'Saved with it: the forecast for the next 24 hours from {time}, from {n} model(s).'],
        ['snapOld', 'Older snapshot: only this hour was saved.'],
        ['snapUses', 'When you log a session, it uses the hours of your session.'],
        ['spotLabel', 'Spot'], ['snapNoSpot', 'No spot linked yet'],
        ['done', 'Done'], ['editLinked', 'Edit linked spot'], ['linkSpot', 'Link to a spot'], ['newSpotHere', '+ New spot here'],
        ['note', 'Note'], ['notePh', 'e.g. Planning to go after work'],
        ['replaceTitle', 'You already saved a forecast for {spot}'], ['replaceText', 'From {time}. Replace it with this one?'],
        ['replace', 'Replace'], ['keepOld', 'Keep the old one'],
    ] },
    { id: 'log', title: 'Log session', items: [
        ['hdrLogNew', 'New session'], ['hdrLogEdit', 'Session'],
        ['logFcSession', 'Forecast for your session time'], ['logFcSaved', 'Forecast saved {time}'],
        ['logFollow', 'Set your time on the water and the forecast follows it.'],
        ['logOtherDay', 'This forecast is for {day}, not your session day'],
        ['logSavedAfter', 'This forecast was saved at {time}, after your session.'],
        ['logAfter24', 'Your session is after the 24 hours this forecast covers.'],
        ['logOld', 'Older snapshot: only this hour was saved'],
        ['logUseHours', 'Use the forecast for your session hours'], ['logSaveFor', 'Save the forecast for {day} instead'],
        ['logSaving', 'Saving the forecast…'], ['logNoFc', 'No forecast attached'], ['logSaveNow', 'Save it now'],
        ['logNoPlace', 'No place yet, so no forecast. Pick a spot below.'],
        ['when', 'When'], ['start', 'Start'], ['end', 'End'], ['nextDay', 'Ends the next day'],
        ['change', 'Change'], ['newSpot', '+ New spot'], ['noSpotNote', 'You can also save it without a spot and add one later.'],
        ['howWas', 'How was it?'],
        ['startNeeded', 'Add when you started, so spotlog can find the forecast from before.'], ['endHelps', 'Add when you finished too: spotlog then reads the forecast for your whole session.'],
        ['logLateFc', 'This forecast was saved after you started, so it stays in your diary but doesn\'t teach spotlog. Save it before you go next time.'],
        ['sessionSport', 'Sport'], ['gear', 'Gear'],
        ['gearPhAny', 'Anything else'], ['gearPhFirst', 'e.g. Sail 5.3, board 105 L'], ['saveToGear', 'Save to gear'],
        ['gpsTitle', 'GPS track'], ['gpsSub', 'From Garmin, Strava, Waterspeed… (.gpx or .tcx)'], ['gpsShow', 'Show on map'], ['gpsAdd', 'Add file'],
        ['distance', 'Distance'], ['time', 'Time'], ['topSpeed', 'Top speed'], ['removeTrack', 'Remove track'],
        ['notes', 'Notes for next time'], ['notesPh', "What the forecast couldn't see…"],
        ['saveSession', 'Save session'], ['saveChanges', 'Save changes'], ['deleteSession', 'Delete session'],
        ['wheelClear', 'Clear', 'Time picker'], ['wheelDone', 'Done', 'Time picker'],
    ] },
    { id: 'names', title: 'Ratings, guesses, sports, conditions', note: 'Short words used all over: buttons, tags, the map', items: [
        ['rate1', 'flat'], ['rate2', 'meh'], ['rate3', 'good'], ['rate4', 'great'], ['rate5', 'epic'],
        ['guessUnsure', 'Not sure yet'], ['guess3', 'Likely good'], ['guess4', 'Likely great'], ['guess5', 'Likely epic'],
        ['guessFor3', 'Good for {sport}'], ['guessFor4', 'Great for {sport}'], ['guessFor5', 'Epic for {sport}'],
        ['sportSurf', 'Surf'], ['sportWindsurf', 'Windsurf'], ['sportKite', 'Kite'], ['sportWing', 'Wing'], ['sportOther', 'Other'],
        ['sportAddOther', 'Other…'], ['sportNameHint', 'Your sport, e.g. Foil'], ['sportAdd', 'Add'],
        ['tideLow', 'Low'], ['tideHigh', 'High'],
    ] },
    { id: 'forecast', title: 'Forecast card and units', note: 'The white forecast card, the card on the map, the units page', items: [
        ['fcWind', 'Wind'], ['fcGusts', 'Gusts'], ['fcFrom', 'Direction'], ['fcWaves', 'Waves'],
        ['fcLoading', 'Loading the forecast…'], ['fcEmpty', 'No forecast here'],
        ['fcTemp', 'Temperature'], ['fcTide', 'Tide today'], ['fcTidePremium', 'with Windy Premium'],
        ['tidePremium', 'Windy Premium adds tide to every session you log, so {spotlog} can learn which tides work at each spot.'], ['fcSwell', 'Swell 1'], ['fcPeriod', 'Wave period · power'],
        ['fcModels', 'Wind at this time in every model'], ['fcMore', 'Full snapshot'], ['fcLess', 'Show less'],
        ['cardNow', 'Right now · ECMWF', 'Card on the map'], ['cardLoading', 'Loading conditions…'],
        ['cardSave', 'Save forecast'], ['cardLog', 'Log session'], ['cardDetails', 'Details'],
        ['tipSessions', '{n} sessions', 'Hover box over session marks'], ['tipMore', '+ {n} more'], ['tipYour', 'Your session'],
        ['setWind', 'Wind'], ['setWaves', 'Waves'], ['setTemp', 'Temperature'], ['setSaved', 'Saved in every forecast'],
        ['setDirection', 'Direction'], ['layerTemp', 'Temperature'], ['layerWaves', 'Waves'], ['layerSwell', 'Swell 1'], ['layerPeriod', 'Wave period'], ['layerPower', 'Wave power'],
        ['setAll', 'Save every model'], ['setAllSub', 'All models available for the place'],
        ['setModels', 'Save these models'], ['setRegional', 'Regional models (ICON-EU, AROME) only cover part of the world and are skipped where they have no forecast.'],
    ] },
    { id: 'toasts', title: 'Messages', note: 'The bar that shows up for a few seconds at the bottom', items: [
        ['undo', 'Undo'],
        ['toastSpotSaved', 'Spot saved'], ['toastSpotUpdated', 'Spot updated'], ['toastDeleted', '{name} deleted'],
        ['toastWindow', 'Wind window saved'],
        ['toastFcSaved', 'Forecast saved · next 24 h from {time}'], ['toastFcReplaced', 'Forecast replaced'], ['toastFcDeleted', 'Forecast deleted'],
        ['toastNoFc', 'No forecast for this place'], ['toastNoDay', 'No forecast for that day. Windy only keeps forecasts from today on.'],
        ['toastLinked', 'Linked to {spot}'],
        ['toastSessSaved', 'Session saved'], ['toastSessNoFc', 'Session saved. Without a forecast it can\'t teach spotlog: save one next time before you go'],
        ['toastWindowUsed', 'Wind window updated to what spotlog learned'],
        ['toastRangesSaved', 'Your ranges are saved'], ['toastRangesReset', 'Back to what spotlog learned'],
        ['toastLinkSessions', '{n} earlier session(s) nearby without a spot'], ['linkThem', 'Link them'], ['toastSessLinked', '{n} session(s) linked to this spot'], ['toastSessUpdated', 'Session updated'], ['toastSessDeleted', 'Session deleted'],
        ['toastTrack', 'Track added · {dist}'], ['trackError', 'Could not read this file'],
        ['toastGearSaved', 'Saved to your gear'], ['toastGearRemoved', '{name} removed'],
        ['toastAllDeleted', 'All data deleted'],
        ['toastImported', 'Copy uploaded: {spots} spots, {sessions} sessions'], ['toastImportFail', 'That file isn’t a spotlog copy. Pick the .json file you downloaded.'],
        ['toastFullSynced', "This browser's storage is full. Your Windy account still has everything."],
        ['toastFull', "This browser's storage is full. Export your data to keep it safe."],
    ] },
    { id: 'shared', title: 'Accessibility, gear and file errors', items: [
        ['appName', "spotlog"],
        ['wordmark', "SPOTLOG"],
        ['unitsLabel', "Units and saved data"],
        ['close', "Close"],
        ['back', "Back"],
        ['windyMenu', "Back to the Windy menu"],
        ['spotDisplay', "How to show your spots"],
        ['windFrom', "Wind from {direction}"],
        ['lowerMinimum', "Lower minimum"],
        ['raiseMinimum', "Raise minimum"],
        ['lowerMaximum', "Lower maximum"],
        ['raiseMaximum', "Raise maximum"],
        ['forecastModel', "Forecast model"],
        ['dateLabel', "Date"],
        ['previousMonth', "Previous month"],
        ['nextMonth', "Next month"],
        ['chooseTime', "Choose time"],
        ['hourLabel', "Hour"],
        ['minutesLabel', "Minutes"],
        ['meridiemLabel', "AM or PM"],
        ['phoneProblem', "{Spotlog} {version} problem (tap to hide): {message}"],
        ['previousSpot', "Previous spot"],
        ['nextSpot', "Next spot"],
        ['windyUser', "a Windy user"],
        ['nameHint', "Name"],
        ['anyDirection', "any direction"],
        ['trackTooLarge', "That file is larger than 40 MB. Export a single activity as GPX or TCX."],
        ['trackFitUnsupported', "FIT files are not supported yet. In Garmin Connect choose “Export to GPX” (or TCX) and add that file."],
        ['trackUnreadable', "This file could not be read as GPX or TCX."],
        ['trackNoPoints', "No track points found in this file."],
        ['hintWindsurfBoard', "e.g. Freewave 105 L"],
        ['gearKindBoard', "Board"],
        ['hintWindsurfSail', "e.g. 5.3 m² wave"],
        ['gearKindSail', "Sail"],
        ['hintWindsurfMast', "e.g. 400 RDM 100%"],
        ['gearKindMast', "Mast"],
        ['hintWindsurfBoom', "e.g. 150–200 carbon"],
        ['gearKindBoom', "Boom"],
        ['hintWindsurfFin', "e.g. 22 cm wave"],
        ['gearKindFin', "Fin"],
        ['hintWindsurfHarness', "e.g. waist, 28\" lines"],
        ['gearKindHarness', "Harness"],
        ['hintWindsurfWetsuit', "e.g. 4/3 steamer"],
        ['gearKindWetsuit', "Wetsuit"],
        ['hintWindsurfOther', "e.g. impact vest"],
        ['gearKindOther', "Other"],
        ['hintSurfBoard', "e.g. 6'2 shortboard"],
        ['hintSurfFins', "e.g. thruster FCS II M"],
        ['gearKindFins', "Fins"],
        ['hintSurfLeash', "e.g. 6' comp"],
        ['gearKindLeash', "Leash"],
        ['hintSurfWetsuit', "e.g. 3/2 fullsuit"],
        ['hintSurfOther', "e.g. booties, wax"],
        ['hintKiteKite', "e.g. 9 m freeride"],
        ['gearKindKite', "Kite"],
        ['hintKiteBoard', "e.g. twintip 138"],
        ['hintKiteBar', "e.g. 24 m lines"],
        ['gearKindBar', "Bar"],
        ['hintKiteHarness', "e.g. waist, size M"],
        ['hintKiteFoil', "e.g. 1000 cm² front wing"],
        ['gearKindFoil', "Foil"],
        ['hintKiteWetsuit', "e.g. 4/3 steamer"],
        ['hintKiteOther', "e.g. helmet"],
        ['hintWingWing', "e.g. 5 m"],
        ['gearKindWing', "Wing"],
        ['hintWingBoard', "e.g. 95 L"],
        ['hintWingFoil', "e.g. 1500 cm² front wing"],
        ['hintWingMast', "e.g. 85 cm aluminium"],
        ['hintWingLeash', "e.g. waist + wrist"],
        ['hintWingWetsuit', "e.g. 4/3 steamer"],
        ['hintWingOther', "e.g. impact vest"],
    ] },
];

/** the default wording */
export const COPY: Record<string, string> = Object.fromEntries(COPY_GROUPS.flatMap(g => g.items.map(([k, text]) => [k, text])));

let current: Record<string, string> = { ...COPY, ...clean(DESIGN.words) };
/** the wording in use (the Style Lab's live preview can swap it while you edit) */
export const words = writable<Record<string, string>>(current);
words.subscribe(v => (current = v));
export function setWords(o: Record<string, string> | null | undefined): void {
    words.set({ ...COPY, ...clean(o) });
}
function clean(o: Record<string, string> | null | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (o && typeof o === 'object') {for (const k of Object.keys(o)) {if (k in COPY && typeof o[k] === 'string') {out[k] = o[k];}}}
    return out;
}

/** a phrase by key, outside the template (map labels, messages) */
export const w = (key: string): string => current[key] ?? COPY[key] ?? key;

/** fills {name} placeholders; {spotlog} / {Spotlog} become plain words */
export function fill(s: string, vars: Record<string, string | number> = {}): string {
    return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : k === 'spotlog' ? 'spotlog' : k === 'Spotlog' ? 'Spotlog' : m));
}
export const t = (key: string, vars: Record<string, string | number> = {}): string => fill(w(key), vars);

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const STAR_ROWS = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
const STAR = `<svg class="sl-star" width="0.72em" height="0.72em" viewBox="0 0 7 7" aria-hidden="true">${STAR_ROWS.map((r, y) => [...r].map((c, x) => (c === '#' ? `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42" fill="currentColor"/>` : '')).join('')).join('')}</svg>`;
const brand = (cap: boolean) => `<span class="sl-brand">${cap ? 'Spotlog' : 'spotlog'}${STAR}</span>`;

/** HTML for a phrase: escaped, placeholders filled, **bold**, and the name with its pixel star */
export function rich(s: string, vars: Record<string, string | number> = {}): string {
    let h = esc(s).replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? esc(String(vars[k])) : k === 'spotlog' ? brand(false) : k === 'Spotlog' ? brand(true) : m));
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    return h;
}
