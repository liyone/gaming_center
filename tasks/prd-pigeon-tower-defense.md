# Product Requirements Document: Pigeon Tower Defense

## Introduction/Overview

**Pigeon Tower Defense** is a mobile-first tower defense game where players defend their territory against increasingly challenging waves of cartoon pigeons. Players collect and deploy various tower cards through a gacha system, creating strategic defenses while enjoying humorous animations and satisfying pigeon elimination gameplay.

The game solves the need for accessible, stress-relieving entertainment that combines strategic thinking with collectible card mechanics, targeting casual mobile gamers who want quick, engaging sessions with long-term progression goals.

## Goals

1. **Primary Goal**: Create an addictive mobile tower defense experience that players return to daily
2. **Engagement Goal**: Achieve average session lengths of 5-10 minutes with high replay value
3. **Monetization Goal**: Drive engagement through collectible tower cards and time-limited events
4. **User Experience Goal**: Provide immediate satisfaction through responsive controls and humorous pigeon animations
5. **Technical Goal**: Deliver smooth performance on mobile devices using frontend-only technologies

## User Stories

1. **As a casual gamer**, I want to quickly start defending against pigeon waves so that I can have fun during short breaks.

2. **As a strategy enthusiast**, I want to collect different tower cards so that I can experiment with various defense combinations.

3. **As a mobile user**, I want touch-friendly controls so that I can easily place and upgrade towers with simple taps.

4. **As a collector**, I want to open card packs so that I can discover new towers and feel the excitement of rare finds.

5. **As a competitive player**, I want progressively harder levels so that I can test my strategic skills and see improvement over time.

6. **As a busy person**, I want time-limited challenges so that I have specific goals to return to the game for.

7. **As a social gamer**, I want to share my victories so that I can show friends my high scores and rare tower collections.

## Functional Requirements

### Core Gameplay
1. The game must display a scrollable path where pigeons walk from spawn point to end goal
2. The system must allow players to place towers by dragging from their hand onto valid placement areas
3. Towers must automatically attack pigeons within their range using projectiles or special effects
4. The game must track player health, decreasing when pigeons reach the end goal
5. The system must spawn pigeon waves with increasing difficulty (speed, health, quantity)
6. Players must be able to upgrade placed towers by tapping and spending resources
7. The game must end when player health reaches zero, showing final score and rewards

### Card Collection System
8. The system must provide a gacha mechanism where players spend in-game currency to receive random tower cards
9. Players must be able to view their tower card collection in a dedicated inventory screen
10. The game must display card rarity through visual indicators (colors, animations, borders)
11. Players must be able to build custom tower decks from their collected cards
12. The system must ensure players always have basic tower types available regardless of collection

### Progression & Rewards
13. The game must award currency and experience points based on waves survived and pigeons eliminated
14. The system must unlock new levels and features as players progress through stages
15. Players must receive daily login bonuses and completion rewards
16. The game must feature time-limited challenge events with special rewards

### User Interface
17. The game must display current health, currency, wave number, and active tower information
18. Players must be able to pause the game and access settings during gameplay
19. The system must provide clear visual feedback for all touch interactions
20. The game must include a tutorial that teaches basic mechanics to new players

### Visual & Audio Enhancement
21. The game must feature particle effects for tower attacks, pigeon elimination, and card reveals
22. The system must include screen shake and visual impact feedback for satisfying combat
23. Towers must have animated idle states and attack animations with visual effects
24. The game must feature dynamic lighting effects and smooth camera movements

### Technical Requirements
25. The game must run smoothly on mobile browsers using WebGL with Canvas fallback
26. The system must save game progress to browser local storage with compression
27. The game must be responsive and playable on various mobile screen sizes
28. All game assets must load efficiently using texture atlases and progressive loading
29. The system must maintain stable frame rates during intense action sequences

## Non-Goals (Out of Scope)

1. **Multiplayer functionality** - This MVP focuses on single-player experience
2. **Backend server integration** - All data stored locally, no user accounts or cloud saves
3. **Real money transactions** - No actual monetization, gacha uses in-game currency only
4. **Complex 3D graphics** - Simple 2D sprite-based visuals for performance
5. **Voice acting or complex audio** - Basic sound effects and simple background music
6. **Multiple game modes** - Focus on core tower defense gameplay only
7. **Social features beyond sharing** - No chat, guilds, or friend systems

## Design Considerations

### Visual Style
- **Cartoon aesthetic** with bright, friendly colors and smooth gradient backgrounds
- **Pigeon sprites** should have exaggerated, humorous animations (waddle walks, silly death effects, panic reactions)
- **Tower designs** should be distinct with glowing effects, animated parts, and satisfying attack visuals
- **Card UI** should feel satisfying with particle bursts, screen transitions, and rarity-based glow effects
- **Environmental effects** like floating debris, wind effects, and dynamic shadows
- **Impact feedback** with screen shake, flash effects, and particle explosions for hits

### User Experience
- **Touch targets** minimum 44px for comfortable mobile interaction
- **Drag and drop** should have clear visual feedback showing valid placement areas
- **Loading screens** should be minimal with engaging micro-animations
- **Accessibility** considerations for colorblind users and different motor abilities

### Performance
- **60 FPS target** on mid-range mobile devices
- **Efficient sprite management** to handle multiple animated pigeons simultaneously
- **Progressive loading** of assets to minimize initial load time

## Technical Considerations

### Technology Stack

#### Primary Recommendation: Phaser.js
- **Game Engine**: Phaser 3.x - Industry-standard HTML5 game framework
- **Rendering**: WebGL with Canvas fallback for maximum compatibility
- **Physics**: Built-in Arcade Physics for collision detection and movement
- **Animation**: Phaser's sprite animation system with texture atlases
- **Audio**: Phaser's Web Audio API wrapper with fallback support
- **UI Framework**: Phaser's Scene management + React overlay for menus/UI
- **Deployment**: Standard web hosting (Vercel, Netlify) - no special requirements

#### Alternative Options
- **PixiJS**: For more rendering control but less game-specific features
- **Three.js**: If we want 3D elements or advanced visual effects
- **Babylon.js**: Full 3D engine option for more immersive experience

### Architecture Suggestions
- **Scene Management**: Separate Phaser scenes for gameplay, menus, and card collection
- **Entity Component System**: Use Phaser's GameObject system for towers, pigeons, and projectiles
- **Physics Integration**: Leverage Phaser's Arcade Physics for automatic collision detection
- **Asset Pipeline**: Texture atlases and audio sprites for optimized loading
- **Save System**: JSON serialization to localStorage with Phaser's data manager
- **Card System**: JSON-based card definitions integrated with Phaser's loader system

### Performance Optimization
- **Built-in Object Pooling**: Phaser's Group system automatically handles object reuse
- **Efficient Rendering**: Hardware-accelerated WebGL rendering with automatic batching
- **Smart Loading**: Phaser's asset loader with progress callbacks and preloading
- **Mobile Optimization**: Built-in touch handling and device-specific optimizations
- **Memory Management**: Automatic sprite cleanup and texture management

## Success Metrics

### Primary Metrics
1. **Session Duration**: Average session length of 5-10 minutes
2. **Retention Rate**: 70% of players return within 24 hours of first play
3. **Progression Rate**: Players complete at least 5 waves in their first session
4. **Card Collection Engagement**: Players open at least 3 card packs in first session

### Secondary Metrics
1. **Performance**: Game maintains 60 FPS on mid-range mobile devices, 30+ FPS on older devices
2. **Accessibility**: Game loads and becomes playable within 5 seconds (including engine initialization)
3. **Visual Impact**: Positive feedback on particle effects, animations, and overall "juiciness"
4. **Technical Stability**: Less than 1% crash/error rate with smooth WebGL performance

### Qualitative Success Indicators
- Players share screenshots or high scores
- Players provide feedback requesting additional features
- Smooth, responsive gameplay feel that "just works"
- Humorous pigeon animations that make players smile

## Open Questions

1. **Difficulty Scaling**: How quickly should wave difficulty increase to maintain challenge without frustration?
2. **Card Balance**: What should be the rarity distribution and power scaling for tower cards?
3. **Currency Economy**: How much in-game currency should players earn vs. spend to maintain engagement?
4. **Level Design**: Should maps have multiple paths or environmental obstacles?
5. **Audio Strategy**: What types of sound effects and music will enhance the humorous theme?
6. **Browser Compatibility**: Which older mobile browsers need specific support considerations?
7. **Visual Effects Intensity**: How flashy should particle effects be without overwhelming gameplay?
8. **Monetization Path**: If successful, how might real monetization be integrated without disrupting gameplay?

---

**Document Version**: 1.1  
**Created**: September 27, 2025  
**Updated**: September 27, 2025 - Added game engine recommendations (Phaser.js)  
**Target Completion**: MVP within 4-6 weeks  
**Next Steps**: Set up Phaser.js development environment and begin asset creation
