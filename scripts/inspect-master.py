import json

with open('src/data/masterTimetable2026.json') as f:
    data = json.load(f)

for cid in ['II-CSE-C', 'III-CSE-C', 'IV-CSE-A']:
    print(f'========== {cid} ==========')
    slots = [e for e in data if e['classId'] == cid]
    for d in ['I', 'II', 'III', 'IV', 'V']:
        d_slots = sorted([x for x in slots if x['day'] == d], key=lambda x: x['period'])
        print(f'Day {d}: ' + ', '.join([f"P{s['period']}:{s['code']}({s['faculty']})" for s in d_slots]))

