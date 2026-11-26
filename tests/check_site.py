"""Publication integrity: local dependencies and measured geometry invariants."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
html = (DOCS / 'index.html').read_text()
ids = re.findall(r'\bid="([^"]+)"', html)
assert len(ids) == len(set(ids)), 'Duplicate element IDs'
assert len(re.findall(r'role="tabpanel"', html)) == 5
for attr, target in re.findall(r'\b(src|href)="([^"]+)"', html):
    if target.startswith(('https:', '#')):
        continue
    assert (DOCS / target).is_file(), f'Missing {attr}: {target}'
for control in re.findall(r'aria-controls="([^"]+)"', html):
    assert control in ids
data = json.loads((DOCS / 'assets/data/geometry.json').read_text())
n = len(data['episodes'])
assert n == 606
for pair in data['pairs']:
    assert len(pair['a']) == len(pair['b']) == n
    assert 0 <= pair['example'] < n
    for key in ('neighborsA', 'neighborsB'):
        assert len(pair[key]) == n
        for row in pair[key]:
            assert len(row) == 10 and len(set(row)) == 10
            assert all(0 <= i < n for i in row)
for path in DOCS.rglob('*'):
    if path.is_file() and path.suffix in ('.html', '.js', '.css'):
        assert '/data/private/' not in path.read_text(), f'Private path in {path}'
print('PASS: five pages; valid assets, controls and measured geometry.')
