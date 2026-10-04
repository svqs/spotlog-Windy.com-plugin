"""Checks that every phrase Spotlog uses exists in src/lib/copy.ts, and fails for missing, duplicated or unused phrases."""
import re, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
copy = (root / 'src/lib/copy.ts').read_text()
keys = re.findall(r"\['(\w+)', [\"']", copy)
dupes = {k for k in keys if keys.count(k) > 1}
src = ''.join(p.read_text() for p in (root / 'src').rglob('*') if p.suffix in ('.svelte', '.ts') and p.name != 'copy.ts')
used = set(re.findall(r"(?:\bW|\$words)\.(\w+)", src)) | set(re.findall(r"\b(?:w|tr|L|label|t)\('(\w+)'(?! \+)", src))
used |= set(re.findall(r"\b(?:key|hintKey): '(\w+)'", src)) | set(re.findall(r"'(title(?:Spots|Sessions|Gear|About))'", src))
dyn = {'good': (1, 3), 'rate': (1, 5), 'guess': (3, 5), 'guessFor': (3, 5), 'matter': (1, 3)}
for pre, (a, n) in dyn.items():
    for i in range(a, n + 1): used.add(f'{pre}{i}')
used |= {'param' + t for t in ['Wind', 'Gust', 'Dir', 'Waves', 'Swell', 'Period', 'SwellDir', 'Power', 'Temp', 'Rain']}
for pre in ('step1Title', 'step2Title', 'step3Title', 'step4Title', 'step1Text', 'step2Text', 'step3Text', 'step4Text'): used.add(pre)
used |= {'why' + r for r in ['Few', 'Poor', 'Below', 'Missing', 'Outside']}
used |= {'sport' + s for s in ['Surf', 'Windsurf', 'Kite', 'Wing', 'Other']}
used |= {k for k in keys if re.search(r"w\((?:[^)]*)'" + k + "'", src)}
used |= set(re.findall(r"\bTrackError\('(\w+)'", src))
used |= {'gearKind' + k for k in ['Board', 'Sail', 'Mast', 'Boom', 'Fin', 'Harness', 'Wetsuit', 'Other', 'Fins', 'Leash', 'Kite', 'Bar', 'Foil', 'Wing']}
missing = sorted(u for u in used if u not in keys)
unused = sorted(k for k in keys if k not in used)
print(f'{len(keys)} phrases; missing: {missing}; unused: {unused}; duplicates: {sorted(dupes)}')
sys.exit(1 if missing or unused or dupes else 0)
