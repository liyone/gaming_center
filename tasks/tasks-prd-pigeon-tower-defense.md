# Task List: Pigeon Tower Defense Implementation

Based on the analysis of `prd-pigeon-tower-defense.md` and current Next.js codebase.

## Incremental MVP Approach

Each milestone builds a **playable game** that you can test and validate before proceeding. This ensures we're building something fun at every step.

## Relevant Files

- `package.json` - ✅ Added Phaser.js dependency (v3.85.2)
- `src/app/game/page.tsx` - ✅ Main game page component with beautiful UI and Phaser integration
- `src/components/Game/PhaserGame.tsx` - ✅ React wrapper for Phaser game instance with proper cleanup
- `src/game/scenes/GameScene.ts` - Main gameplay scene with tower defense logic
- `src/game/scenes/MenuScene.ts` - Menu and card collection scenes
- `src/game/entities/Tower.ts` - Tower entity class with attack logic
- `src/game/entities/Pigeon.ts` - Pigeon entity class with movement and health
- `src/game/entities/Projectile.ts` - Projectile entity for tower attacks
- `src/game/systems/WaveManager.ts` - Wave spawning and difficulty progression
- `src/game/systems/CardSystem.ts` - Card collection and gacha mechanics
- `src/game/data/towers.json` - Tower definitions and stats
- `src/game/data/cards.json` - Card definitions and rarity data
- `src/hooks/useGameState.ts` - React hook for game state management
- `src/utils/localStorage.ts` - Save/load game progress utilities
- `public/assets/sprites/` - Game sprite assets (towers, pigeons, effects)
- `public/assets/audio/` - Sound effects and background music

### Notes

- Phaser.js games are typically structured with Scene classes that manage different game states
- Use `npm install phaser` to add the game engine dependency
- Test each MVP thoroughly before proceeding to ensure core mechanics are fun
- Consider using sprite atlases for optimized loading and performance

## Tasks

- [ ] **MVP 1.0: Core Proof of Concept** *(Validate: "Is shooting pigeons fun?")*
  - [x] 1.1 Install Phaser.js and configure Next.js integration
  - [x] 1.2 Create basic game page and Phaser wrapper component
  - [ ] 1.3 Set up main game scene with canvas and basic rendering
  - [ ] 1.4 Create pigeon entity that moves across screen horizontally
  - [ ] 1.5 Create basic tower entity that can be placed by clicking
  - [ ] 1.6 Implement projectile shooting from tower to pigeon
  - [ ] 1.7 Add collision detection between projectiles and pigeons
  - [ ] 1.8 Add simple scoring when pigeons are eliminated
  - [ ] 1.9 Create basic game over condition when pigeons reach end
  - [ ] 1.10 Test and validate: Is the core shooting mechanic satisfying?

- [ ] **MVP 2.0: Enhanced Tower Defense** *(Validate: "Is the strategy engaging?")*
  - [ ] 2.1 Create pigeon path system with waypoints and curved movement
  - [ ] 2.2 Implement wave spawning system with multiple pigeons
  - [ ] 2.3 Add currency system - earn coins for eliminating pigeons
  - [ ] 2.4 Create multiple tower types (basic, rapid-fire, heavy damage)
  - [ ] 2.5 Implement tower upgrade system using currency
  - [ ] 2.6 Add different pigeon types with varying health/speed
  - [ ] 2.7 Implement player health system (lose health when pigeons escape)
  - [ ] 2.8 Create wave progression with increasing difficulty
  - [ ] 2.9 Add basic HUD showing health, currency, wave number
  - [ ] 2.10 Test and validate: Is the strategic gameplay engaging?

- [ ] **MVP 3.0: Card Collection System** *(Validate: "Is collecting cards addictive?")*
  - [ ] 3.1 Design card data structure with tower types and rarity levels
  - [ ] 3.2 Create card collection/inventory UI screen
  - [ ] 3.3 Implement gacha pack opening system with random card rewards
  - [ ] 3.4 Add visual card reveal animations and rarity effects
  - [ ] 3.5 Create deck building interface to select active towers
  - [ ] 3.6 Integrate card system with tower placement (use cards from deck)
  - [ ] 3.7 Implement starter deck and ensure basic towers are always available
  - [ ] 3.8 Add currency reward system for completing waves
  - [ ] 3.9 Create simple daily login bonus with free card packs
  - [ ] 3.10 Test and validate: Is opening cards and collecting satisfying?

- [ ] **MVP 4.0: Mobile Experience** *(Validate: "Does it work well on mobile?")*
  - [ ] 4.1 Optimize Phaser canvas sizing for various mobile screen ratios
  - [ ] 4.2 Implement touch controls for tower placement and selection
  - [ ] 4.3 Add mobile-specific UI scaling and touch target sizing
  - [ ] 4.4 Optimize performance for mid-range mobile devices
  - [ ] 4.5 Implement touch gestures for camera pan/zoom if needed
  - [ ] 4.6 Add haptic feedback for touch interactions
  - [ ] 4.7 Test landscape vs portrait orientation support
  - [ ] 4.8 Optimize asset loading for mobile bandwidth
  - [ ] 4.9 Add mobile-specific pause/resume handling
  - [ ] 4.10 Test and validate: Does it feel natural on mobile devices?

- [ ] **MVP 5.0: Visual Polish & Effects** *(Validate: "Does it feel satisfying?")*
  - [ ] 5.1 Add particle effects for tower attacks and pigeon elimination
  - [ ] 5.2 Implement screen shake and camera effects for impact
  - [ ] 5.3 Create smooth tower placement preview and valid/invalid indicators
  - [ ] 5.4 Add animated sprites for pigeon walking and tower idle states
  - [ ] 5.5 Implement explosion effects and debris for eliminated pigeons
  - [ ] 5.6 Add lighting effects and glowing outlines for towers
  - [ ] 5.7 Create smooth UI transitions and card flip animations
  - [ ] 5.8 Add sound effects for attacks, eliminations, and UI interactions
  - [ ] 5.9 Implement dynamic background music that responds to action
  - [ ] 5.10 Test and validate: Does the game feel juicy and satisfying?

- [ ] **MVP 6.0: Production Ready** *(Validate: "Is it ready for users?")*
  - [ ] 6.1 Create interactive tutorial teaching basic tower placement
  - [ ] 6.2 Implement comprehensive save/load system using localStorage
  - [ ] 6.3 Add settings menu with audio, graphics, and control options
  - [ ] 6.4 Create pause menu and game state management
  - [ ] 6.5 Implement time-limited challenge events system
  - [ ] 6.6 Add social sharing for high scores and rare card pulls
  - [ ] 6.7 Optimize final performance and loading times
  - [ ] 6.8 Add error handling and graceful degradation
  - [ ] 6.9 Create onboarding flow and first-time user experience
  - [ ] 6.10 Test and validate: Is it ready for public release?
