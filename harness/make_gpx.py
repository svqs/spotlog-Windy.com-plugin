"""Writes a fake but realistic-looking windsurf GPX track off Valdevaqueros (used by the tests)."""
import math, sys, random, datetime as dt
random.seed(7)
M_LAT = 1 / 111320
M_LON = 1 / (111320 * math.cos(math.radians(36.06)))
lat, lon, heading = 36.0655, -5.6935, 205.0
t = dt.datetime.now().replace(hour=14, minute=5, second=0, microsecond=0)
pts = [(lat, lon, t)]
for leg in range(12):
    length, bend = 1300 + random.random() * 900, (random.random() - 0.5) * 0.02
    for _ in range(round(length / 55)):  # one point every 7 s at about 28 km/h
        heading += bend * 55 + (random.random() - 0.5) * 2.2
        h = math.radians(heading)
        lat += math.cos(h) * 55 * M_LAT
        lon += math.sin(h) * 55 * M_LON - 3 * M_LON
        t += dt.timedelta(seconds=7)
        pts.append((lat, lon, t))
    turn = 1 if leg % 2 else -1
    for _ in range(8):  # jibe
        heading += turn * 180 / 8
        h = math.radians(heading)
        lat += math.cos(h) * 14 * M_LAT
        lon += math.sin(h) * 14 * M_LON
        t += dt.timedelta(seconds=3)
        pts.append((lat, lon, t))
    heading += (random.random() - 0.5) * 20
out = sys.argv[1] if len(sys.argv) > 1 else 'session.gpx'
with open(out, 'w') as fh:
    fh.write('<?xml version="1.0"?><gpx version="1.1" creator="Garmin Connect"><trk><name>Windsurfing</name><trkseg>')
    for la, lo, tt in pts:
        fh.write(f'<trkpt lat="{la:.6f}" lon="{lo:.6f}"><time>{tt.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}</time></trkpt>')
    fh.write('</trkseg></trk></gpx>')
print(out, len(pts))
