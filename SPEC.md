# Mario Platformer — Mobile D-Pad Redesign Spec

## What
Redesign the mobile D-pad controller in `game.js` (`_createDPad` method, ~line 547) to be a **premium, game-quality mobile game controller**. Keep all physics/UX identical — only the visual design changes.

## Context
- Game: Phaser 3 HTML5 platformer (single `game.js` file)
- Current D-pad: crude grey rectangles with basic labels, "very stupidly built" (Dami's words)
- Controls must remain: Jump=UP, Left=LEFT, Down=DOWN, Right=RIGHT mapped to `dpadUp`, `dpadLeft`, `dpadDown`, `dpadRight` booleans

## Design Direction
**"Mario Glass"** — A frosted glass, semi-transparent controller with:
- Deep earthy greens (Mario's iconic green) with subtle warm undertones
- Frosted glass / glass-morphism effect (backdrop blur simulation via layered semi-transparent shapes)
- Rounded buttons (pill-shaped or heavily rounded rectangles)
- Each button has a soft glow/shadow halo
- Press feedback: scale down + brighten + glow pulse on press, smooth release
- Directional arrows rendered as crisp SVG-style paths or clean Unicode arrows
- Button labels use a dark charcoal on frosted green background
- Overall feel: premium iOS game controller meets Mario's visual world

## Layout (unchanged logic, enhanced visuals)
```
       [▲ JUMP]
 [◀ LEFT] [▼ DOWN]
       [▶ RIGHT]
```
- All buttons on the LEFT side of screen
- Well-spaced for finger accuracy
- Jump at top, Left+Down side-by-side in middle row, Right at bottom

## Tech
- Phaser 3 (Graphics API for glow effects)
- Pure JS, single file (`game.js`)
- Use `this.add.graphics()` for glow halos around each button
- Use `this.add.rectangle()` for button backgrounds with rounded radius via `setStrokeStyle`
- Use `this.add.text()` for arrow symbols
- CSS-style RGBA colors via Phaser's color methods or hex equivalents
- Animation via Phaser's built-in tween system (`this.tweens.add`)

## Files
- `~/projects/mario-platformer/game.js` — modify `_createDPad()` method only (~lines 547–610)

## Visual Spec per Button
| Button | Base Color | Glow Color | Pressed Color | Arrow |
|--------|-----------|-----------|---------------|-------|
| UP | `0x2e7d32` (dark green) | `0x4caf50` glow halo | `0x66bb6a` | `▲` or `↑` |
| LEFT | `0x388e3c` | `0x4caf50` glow halo | `0x66bb6a` | `◀` or `←` |
| DOWN | `0x388e3c` | `0x4caf50` glow halo | `0x66bb6a` | `▼` or `↓` |
| RIGHT | `0x1b5e20` (darkest green) | `0x4caf50` glow halo | `0x66bb6a` | `▶` or `→` |

## Interaction Spec
- `pointerdown` → button scales to 0.88, brightens, glow intensifies (100ms ease-out)
- `pointerup` / `pointerout` → button returns to normal (150ms ease-out)
- Arrow symbol also scales down with button
- No game logic changes — same `this[key] = true/false` assignments

## Acceptance
- [ ] D-pad visually distinctive and beautiful — "this is proper" not "it works"
- [ ] All 4 buttons present and correctly positioned
- [ ] Press/release animations smooth and responsive
- [ ] Glow/glass effect visible on each button
- [ ] No game physics or control logic changes
- [ ] Builds/pushes without errors
