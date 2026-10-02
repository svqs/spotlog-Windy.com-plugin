"""Checks that every phrase Spotlog uses exists in src/lib/copy.ts, and lists phrases nobody uses."""
import re, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
copy = (root / 'src/lib/copy.ts').read_text()
keys = re.findall(r"\['(\w+)', [\"']", copy)
dupes = {k for k in keys if keys.count(k) > 1}
src = ''.join(p.read_text() for p in (root / 'src').rglob('*') if p.suffix in ('.svelte', '.ts') and p.name != 'copy.ts')
used = set(re.findall(r"(?:\bW|\$words)\.(\w+)", src)) | set(re.findall(r"\b(?:w|tr|L)\('(\w+)'(?! \+)", src))
used |= set(re.findall(r"\bkey: '(\w+)'", src)) | set(re.findall(r"'(title(?:Spots|Sessions|Gear|About))'", src))
dyn = {'good': (1, 3), 'gust': (1, 3), 'water': (1, 4), 'rate': (1, 5), 'guess': (3, 5)}
for pre, (a, n) in dyn.items():
    for i in range(a, n + 1): used.add(f'{pre}{i}')
used |= {'tide' + t for t in ['Low', 'Mid', 'High', 'Rising', 'Falling']}
for pre in ('step1Title', 'step2Title', 'step3Title', 'step4Title', 'step1Text', 'step2Text', 'step3Text', 'step4Text'): used.add(pre)
used |= {'sport' + s for s in ['Surf', 'Windsurf', 'Kite', 'Wing', 'SUP', 'Other']}
used |= {k for k in keys if re.search(r"w\((?:[^)]*)'" + k + "'", src)}
missing = sorted(u for u in used if u not in keys)
unused = sorted(k for k in keys if k not in used)
print(f'{len(keys)} phrases; missing: {missing}; unused: {unused}; duplicates: {sorted(dupes)}')
sys.exit(1 if missing or dupes else 0)
