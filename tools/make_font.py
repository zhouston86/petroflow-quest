"""Embeds the pixel font (Press Start 2P, SIL OFL) as web/font.js so the game works from file:// offline."""
import base64, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, 'assets', 'ps2p.woff2'), 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
with open(os.path.join(ROOT, 'web', 'font.js'), 'w') as f:
    f.write('const FONT_DATA = "data:font/woff2;base64,%s";\n' % b64)
print('ok')
