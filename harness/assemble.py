"""Builds harness/sandbox.html: the sandbox page with the mock and the compiled plugin inlined."""
import re, pathlib
h = pathlib.Path(__file__).parent
src = (h / 'sandbox.src.html').read_text()
mock = (h / 'mock-windy.js').read_text()
plugin = (h.parent / 'dist' / 'plugin.js').read_text()
# Keep committed preview pages reproducible; the real build retains Windy's upload timestamps.
plugin = re.sub(r'"built": \d+', '"built": 0', plugin, count=1)
plugin = re.sub(r'"builtReadable": "[^"]*"', '"builtReadable": ""', plugin, count=1)
plugin = re.sub(r'\nexport \{[^}]*\};?\s*', '\n', plugin)
plugin = re.sub(r'//# sourceMappingURL=.*', '', plugin).replace('</script', '<\\/script')
out = src.replace('/*MOCK*/', mock, 1).replace('/*PLUGIN*/', plugin, 1)
(h / 'sandbox.html').write_text(out)
print('sandbox.html', len(out) // 1024, 'KB')
