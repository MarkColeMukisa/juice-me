"""Juice Me brand assets: one glyph, composed into the files the Expo app needs, rendered by headless Chrome."""
import os
import subprocess

OUT = r'd:\nevela\.git\jm-brand\out'
os.makedirs(OUT, exist_ok=True)
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

CREAM = '#FFF4E0'
BROWN = '#3B1F0E'

# The glass, its juice, the straw, the orange slice and the leaf, drawn in a 512 box.
GLYPH = f'''
  <defs>
    <linearGradient id="juice" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#E8590C"/>
      <stop offset="0.55" stop-color="#FF9F1C"/>
      <stop offset="1" stop-color="#FFC94D"/>
    </linearGradient>
    <clipPath id="glass"><path d="M150 170 H362 L338 430 Q336 452 314 452 H198 Q176 452 174 430 Z"/></clipPath>
  </defs>
  <path d="M286 200 L322 66 Q326 52 340 56 L378 66" fill="none" stroke="#7B2D8E" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <g clip-path="url(#glass)">
    <rect x="140" y="160" width="232" height="300" fill="#FFFFFF"/>
    <path d="M140 236 Q182 212 224 236 T308 236 T392 236 V470 H140 Z" fill="url(#juice)"/>
    <circle cx="214" cy="330" r="12" fill="#FFFFFF" opacity="0.55"/>
    <circle cx="244" cy="378" r="8" fill="#FFFFFF" opacity="0.45"/>
    <circle cx="290" cy="300" r="7" fill="#FFFFFF" opacity="0.5"/>
  </g>
  <path d="M150 170 H362 L338 430 Q336 452 314 452 H198 Q176 452 174 430 Z" fill="none" stroke="{BROWN}" stroke-width="16" stroke-linejoin="round"/>
  <g transform="translate(150 170)">
    <circle r="58" fill="#FF9F1C" stroke="{BROWN}" stroke-width="14"/>
    <circle r="40" fill="#FFD27A"/>
    <g stroke="#FF9F1C" stroke-width="6" stroke-linecap="round">
      <line x1="0" y1="0" x2="0" y2="-38"/><line x1="0" y1="0" x2="33" y2="-19"/><line x1="0" y1="0" x2="33" y2="19"/>
      <line x1="0" y1="0" x2="0" y2="38"/><line x1="0" y1="0" x2="-33" y2="19"/><line x1="0" y1="0" x2="-33" y2="-19"/>
    </g>
  </g>
  <path d="M362 170 Q420 128 446 168 Q404 204 362 170 Z" fill="#2F9E44" stroke="{BROWN}" stroke-width="12" stroke-linejoin="round"/>
'''

# The same outline in one colour: Android's themed (monochrome) icon.
MONO = '''
  <path d="M286 200 L322 66 Q326 52 340 56 L378 66" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M150 170 H362 L338 430 Q336 452 314 452 H198 Q176 452 174 430 Z" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linejoin="round"/>
  <path d="M152 236 Q182 214 224 236 T308 236 T358 236 L338 430 Q336 452 314 452 H198 Q176 452 174 430 Z" fill="#FFFFFF"/>
  <circle cx="150" cy="170" r="56" fill="#FFFFFF"/>
  <path d="M362 170 Q420 128 446 168 Q404 204 362 170 Z" fill="#FFFFFF"/>
'''

# The glyph's drawing is not centred in its box (the leaf and the slice stick out): this centres it.
CENTRE = 'translate(-13 2)'


def svg(size, body, background=None, scale=1.0):
    """The glyph in a square of `size`, at `scale` of it, centred, on a background or transparent."""
    s = size / 512 * scale
    offset = size * (1 - scale) / 2
    bg = f'<rect width="{size}" height="{size}" fill="{background}"/>' if background else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{bg}'
            f'<g transform="translate({offset} {offset}) scale({s}) translate(256 256) {CENTRE} translate(-256 -256)">{body}</g></svg>')


def render(name, size, content):
    src = os.path.join(OUT, name + '.svg')
    page = os.path.join(OUT, name + '.html')
    open(src, 'w', encoding='utf-8').write(content)
    # A page with no margin and a transparent background, so the PNG keeps transparency.
    open(page, 'w', encoding='utf-8').write(f'<!doctype html><html><head><style>html,body{{margin:0;background:transparent}}</style></head><body>{content}</body></html>')
    png = os.path.join(OUT, name + '.png')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--user-data-dir={OUT}\\prof',
                    f'--window-size={size},{size}', '--default-background-color=00000000', f'--screenshot={png}', 'file:///' + page.replace('\\', '/')],
                   check=True, capture_output=True)
    print(name, os.path.getsize(png))


render('icon', 1024, svg(1024, GLYPH, CREAM, 0.86))
# Android crops the foreground to a circle or squircle inside the middle 66%: the glyph stays within it.
render('android-icon-foreground', 1024, svg(1024, GLYPH, None, 0.62))
render('android-icon-background', 1024, f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="{CREAM}"/></svg>')
render('android-icon-monochrome', 1024, svg(1024, MONO, None, 0.62))
render('splash-icon', 1024, svg(1024, GLYPH, None, 1.0))
render('favicon', 64, svg(64, GLYPH, CREAM, 0.92))
