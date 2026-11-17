import re
import json

with open('scripts/import-master-timetable.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'add\(\s*"([^"]+)",\s*"([^"]+)",\s*(\d+),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*"([^"]+)")?\s*\)'
matches = re.findall(pattern, content)
print('Total matches:', len(matches))

entries = []
for m in matches:
    entries.append({
        'classId': m[0],
        'day': m[1],
        'period': int(m[2]),
        'code': m[3],
        'sub': m[4],
        'faculty': m[5],
        'room': m[6],
        'cat': m[7] if m[7] else 'sub1'
    })

with open('src/data/masterTimetable2026.json', 'w', encoding='utf-8') as f:
    json.dump(entries, f, indent=2)
print('Successfully saved src/data/masterTimetable2026.json!')

