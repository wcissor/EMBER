"""Fetch a web page and keep a plain-text snapshot (for sources.md quotes).
Usage: python3 -I scripts/fetch_text.py <name> <url>"""
import sys, re, html, subprocess, pathlib, datetime
name, url = sys.argv[1], sys.argv[2]
root = pathlib.Path(__file__).resolve().parents[1] / 'research'
ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
raw = subprocess.run(['curl', '-sSL', '-m', '40', '-A', ua, '-H', 'Accept-Language: en', url], capture_output=True).stdout.decode('utf-8', 'replace')
(root / 'raw' / f'{name}.html').write_text(raw)
t = re.sub(r'(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>', ' ', raw)
t = re.sub(r'(?i)<br\s*/?>|</p>|</h[1-6]>|</li>|</tr>|</div>', '\n', t)
t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
t = '\n'.join(l.strip() for l in re.sub(r'[ \t\r\f\v]+', ' ', t).split('\n') if l.strip())
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
(root / f'{name}.txt').write_text(f'URL: {url}\nRetrieved: {stamp}\n\n{t}\n')
print(f'{name}: {len(raw)} bytes html, {len(t)} chars text')
