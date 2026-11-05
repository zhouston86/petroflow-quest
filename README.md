# PETROFLOW QUEST: The Quest for the Golden Barrel

An 8-bit, NES-style platformer starring **Zach, Geir and Mack** (their headshots from
[petroflow.com/about](https://www.petroflow.com/about), pixelled down to 16x20 sprites) in a shameless,
Cool Spot / Avoid the Noid / Burger King-games-style advertisement for Petroflow, Inc.

Evil **Dr. Downtime** has clogged the world's pipelines. Fight through six worlds of flow-assurance villains
(hydrates, wax, scale, slugs, asphaltene), beat a boss in each, and recover the pieces of the Golden Barrel.
Expect roughly **15-20 minutes** for a first playthrough.

## Play

Double-click `PLAY.bat` (or open `web/index.html` in any modern browser). No install, no server, works offline.

| Key | Action |
| --- | --- |
| Arrows / WASD | Move |
| Z / Space | Jump (hold for higher) |
| X / J / K | Shoot (hold **Up** to aim diagonally up) |
| P / Esc | Pause |
| M | Mute |
| F | Fullscreen |

**Mobile / tablet:** the same page works on phones. On-screen controls appear automatically: a slide-able left/right pad, **A** (jump), **B** (shoot), **SHOOT UP** (fires straight up, or diagonally while you're moving), pause and mute. Tap the screen to advance menus; on the hero select screen tap a hero, then tap again to start. Play in either orientation (landscape is roomier); the game auto-pauses when you switch apps. Add it to the home screen for a full-screen experience. Append `?touch=1` to force the touch controls on a desktop.

Gamepad (first pad): D-pad/stick, A = jump, B/X = shoot, Start = confirm.

## The team

| Hero | Perk |
| --- | --- |
| Zach | Fastest, rapid fire |
| Geir | 4 HP, double-damage shots |
| Mack | Double jump |

## Worlds

1. Gulf of Mexico - Hydrate Hulk (well + pipeline simulation)
2. North Sea - Waxy Wyrm (fluid + PVT modeling)
3. West Africa - Scale Scorpion (chemical injection strategy)
4. Barents Sea - Slug King (life-of-field simulation)
5. Topsides Process Plant - Asphaltene Golem (topsides + process simulation)
6. The Wild Well - Dr. Downtime (well control + real-time support)

Each world has billboards with real Petroflow facts, five checkpoint billboards, three hidden **Quest Scrolls**,
and unlocks a Petroflow service card on completion. Power-ups: **PIPESIM** (triple shot), **OLGA** (shield),
barrels (heal), 100 oil drops = 1UP.

## Soundtrack

The chiptune score (2 pulse channels, triangle bass, noise drums) is synthesised live with WebAudio in
`web/audio.js`: a title theme, one theme per world, boss and final-boss themes, a credits theme, and jingles.
Standard MIDI versions are in `soundtrack/` (regenerate with `node tools/export_midi.js`).

## Dev notes

* `web/` - the whole game (plain JS, no build step). `touch.js` is the mobile layer. `faces.js` holds the hand-pixelled heads.
* `assets/` - source headshots, logo and the embedded font (Press Start 2P, SIL OFL). `python tools/make_font.py` rebuilds `web/font.js`.
* `tools/bot.js` - an autoplay bot used to check every world is traversable: open the game with
  `?level=1&god=1`, inject the script, then call `runBot(levelIndex, maxFrames)` in the console.
* URL params for testing: `?level=N` (1-6), `&char=zach|geir|mack`, `&god=1`, `&boss=1`.
