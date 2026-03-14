# CLAUDE.md

## Project Overview

A browser-based "人生ゲーム" (Game of Life) board game built with vanilla HTML, CSS, and JavaScript. Players (2-4) progress through a 30-square board representing life events (employment, marriage, investments, housing) with outcomes based on dice rolls and player choices.

## Project Structure

```
/
├── index.html    # HTML structure with three screens: Title, Game, Results
├── style.css     # Dark-themed styling with responsive breakpoints
├── game.js       # All game logic (~640 lines)
└── CLAUDE.md     # This file
```

There is **no build system, no package manager, no test framework, and no CI/CD**. Files are served directly to the browser.

## Technology Stack

- Vanilla JavaScript (ES6+, async/await)
- HTML5 Canvas for board rendering
- Plain CSS3 (gradients, animations, flexbox, media queries)
- No external dependencies

## Code Conventions

### JavaScript
- **Functions/variables:** camelCase (`rollDice`, `gameState`)
- **Constants:** UPPER_SNAKE_CASE (`TILE_TYPES`, `PLAYER_COLORS`)
- **Section separators:** `// --- Section Name ---` with Japanese descriptions
- **DOM access:** `getElementById` throughout
- **Async patterns:** Promise-based modal UI, `async/await` for animations
- **State management:** Single global `gameState` object

### CSS
- Dark theme with navy/purple gradients (`#1a1a2e`, `#16213e`, `#0f3460`)
- Accent colors: `#e94560` (red), `#ffd700` (gold)
- Player colors: `['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']`
- Mobile breakpoints at 768px and 400px
- Class naming: `.btn-primary`, `.player-stat`, `.hidden`, `.active`

### Commit Messages
- Written in Japanese
- Format: short Japanese title, blank line, then bullet-point details
- Include Claude session URL reference at end

## Key Architecture

### Game State (`gameState` object)
```
{ players[], currentPlayerIndex, board[], phase, rolling }
```
Phases: `'title'` → `'playing'` → `'finished'`

### Player Object
```
{ name, money, position, job, salary, salaryMax, goalBonus, happiness, finished, risk }
```
Starting money: $10,000

### Board
30 tiles with 10 types defined in `TILE_TYPES`: START, SALARY, EVENT, LUCKY, UNLUCKY, CHOICE, JOB, MARRIAGE, HOUSE, GOAL.

### Canvas Rendering
- Responsive sizing: 38px tiles on mobile (<500px), 55px on desktop
- Snake/zigzag layout via `getBoardPositions()`
- Board redraws on window resize

## Important Patterns

- **XSS protection:** `escapeHtml()` sanitizes player name input
- **Promise-based choices:** `handleChoice()` returns a Promise resolved when the player clicks a modal option
- **Animation timing:** 200-500ms delays via `sleep()` utility for visual feedback
- **Mobile detection:** Based on `canvas.width < 500`

## Development Workflow

1. Edit files directly (no build step)
2. Open `index.html` in a browser to test
3. Use browser DevTools for debugging
4. No linting or formatting tools configured

## Limitations / Known Constraints

- Japanese language only (no i18n)
- No data persistence (no localStorage/server)
- Local multiplayer only (no network play)
- No accessibility features (no ARIA labels)
- Minimal error handling
