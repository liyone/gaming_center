import { SkillCardSystem, SkillCard, CombinedSkillEffects } from '../systems/SkillCardSystem'

// Interface for Pigeon entity to avoid using 'any'
interface IPigeon {
  isAlive: boolean
  startMoving(): void
  update(time: number, delta: number): void
  getReward(): number
  getPosition(): { x: number, y: number }
  takeDamage(damage: number): boolean
  getVelocity(): { x: number, y: number }
  getPredictedPosition(timeAhead: number): { x: number, y: number }
}

// Interface for Tower entity to avoid using 'any'
interface ITower {
  update(time: number, delta: number): void
  destroy(): void
  getPosition(): { x: number, y: number }
  getBounds(): Phaser.Geom.Rectangle
  getRange(): number
  getDamage(): number
  getFireRate(): number
  getCost(): number
  getTowerType(): string
  getTowerName(): string
  getDescription(): string
  getProjectileColor(): number
  findTarget(pigeons: IPigeon[]): { x: number, y: number } | null
  attack(targetPosition: { x: number, y: number }, currentTime: number): void
  canAttack(currentTime: number): boolean
  canEquipSkill(skill: SkillCard): boolean
  equipSkill(skill: SkillCard): boolean
  removeSkill(skillId: string): boolean
  unequipSkill(skillId: string): SkillCard | null
  getEquippedSkills(): SkillCard[]
  getAvailableSkillSlots(): number
  getCombinedEffects(): CombinedSkillEffects | null
}

// Interface for placement validation
interface TowerPlacementValidator {
  getPosition(): { x: number, y: number }
}

// Interface for Projectile entity
interface IProjectile {
  update(time: number, delta: number): void
  destroy(): void
  getPosition(): { x: number, y: number }
  getBounds(): Phaser.Geom.Rectangle
  getDamage(): number
  isAlive(): boolean
  hitPigeon(pigeon: { takeDamage(damage: number): boolean, getPosition(): { x: number, y: number } }): boolean
  checkCollisionWith(target: { x: number, y: number, radius: number }): boolean
}

export default class GameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics
  private titleText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private pathGraphics!: Phaser.GameObjects.Graphics
  
  // Game entities
  private pigeons: IPigeon[] = []
  private towers: ITower[] = []
  private projectiles: IProjectile[] = []
  private spawnTimer: Phaser.Time.TimerEvent | null = null
  private PigeonClass: (new (scene: Phaser.Scene, x: number, y: number) => IPigeon) | null = null
  private TowerClass: (new (scene: Phaser.Scene, x: number, y: number, towerType?: string, skillCardSystem?: SkillCardSystem) => ITower) | null = null
  private ProjectileClass: (new (scene: Phaser.Scene, startX: number, startY: number, targetX: number, targetY: number, damage: number, color?: number) => IProjectile) | null = null
  
  // Game state
  private playerHealth: number = 10
  private score: number = 0
  private coins: number = 300 // Starting currency for towers
  private isGameActive: boolean = true
  
  // Wave system
  private currentWave: number = 1
  private pigeonsInWave: number = 0
  private pigeonsSpawned: number = 0
  private pigeonSpawnTimer: Phaser.Time.TimerEvent | null = null
  private waveState: 'preparing' | 'spawning' | 'active' | 'complete' = 'preparing'
  private timeBetweenWaves: number = 10000 // 10 seconds between waves
  private waveStartTimer: Phaser.Time.TimerEvent | null = null
  
  // Tower placement
  private isPlacingTower: boolean = false
  private placementPreview: Phaser.GameObjects.Graphics | null = null
  private currentTowerType: string = 'basic'
  
  // Card hand UI
  private cardHandPanel: Phaser.GameObjects.Graphics | null = null
  private cardHandTexts: Phaser.GameObjects.Text[] = []
  private cardHandButtons: Phaser.GameObjects.Graphics[] = []
  
  // Skill card system
  private skillCardSystem: SkillCardSystem | null = null
  private playerHand: SkillCard[] = []
  private skillCardDrawn: boolean = false
  
  // Skill UI
  private skillPanel: Phaser.GameObjects.Graphics | null = null
  private skillTexts: Phaser.GameObjects.Text[] = []
  private skillButtons: Phaser.GameObjects.Graphics[] = []
  private selectedTower: ITower | null = null
  private isSkillMenuOpen: boolean = false
  
  // Game world properties
  private readonly WORLD_WIDTH = 800
  private readonly WORLD_HEIGHT = 600
  private readonly PATH_WIDTH = 60

  constructor() {
    super({ key: 'GameScene' })
  }

  preload(): void {
    // Create simple colored rectangles as placeholder sprites
    this.load.image('grass', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    
    // Set loading progress text
    const loadingText = this.add.text(400, 300, 'Loading Game Assets...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.load.on('complete', () => {
      loadingText.destroy()
    })
  }

  async create(): Promise<void> {
    console.log('GameScene: Creating main game scene')
    
    // Load Pigeon class dynamically
    await this.loadGameClasses()
    
    // Create layered background
    this.createBackground()
    
    // Create the path for pigeons to follow
    this.createPigeonPath()
    
    // Initialize skill card system
    this.skillCardSystem = new SkillCardSystem(this)
    
    // Create UI elements
    this.createUI()
    
    // Create card hand UI
    this.createCardHandUI()
    
    // Set up input handling
    this.setupInput()
    
    // Set up game events
    this.setupGameEvents()
    
    // Start wave system
    this.startWaveSystem()
    
    // Add welcome message
    this.showWelcomeMessage()
  }

  private async loadGameClasses(): Promise<void> {
    try {
      const { default: Pigeon } = await import('../entities/Pigeon')
      const { default: Tower } = await import('../entities/Tower')
      const { default: Projectile } = await import('../entities/Projectile')
      
      this.PigeonClass = Pigeon as new (scene: Phaser.Scene, x: number, y: number) => IPigeon
      this.TowerClass = Tower as new (scene: Phaser.Scene, x: number, y: number, towerType?: string, skillCardSystem?: SkillCardSystem) => ITower
      this.ProjectileClass = Projectile as new (scene: Phaser.Scene, startX: number, startY: number, targetX: number, targetY: number, damage: number) => IProjectile
      
      console.log('GameScene: All game classes loaded successfully')
    } catch (error) {
      console.error('GameScene: Failed to load game classes:', error)
    }
  }

  private createBackground(): void {
    // Create a gradient background
    this.background = this.add.graphics()
    
    // Sky gradient (blue to light blue)
    this.background.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F6FF, 0xE0F6FF, 1)
    this.background.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT)
    
    // Add grass areas
    this.background.fillStyle(0x90EE90) // Light green
    this.background.fillRect(0, this.WORLD_HEIGHT - 100, this.WORLD_WIDTH, 100)
    
    // Add some decorative elements
    this.createDecorations()
  }

  private createDecorations(): void {
    const graphics = this.add.graphics()
    
    // Add some trees as simple green circles
    const treePositions = [
      { x: 100, y: 520 },
      { x: 250, y: 540 },
      { x: 650, y: 530 },
      { x: 720, y: 510 }
    ]
    
    treePositions.forEach(pos => {
      // Tree trunk
      graphics.fillStyle(0x8B4513) // Brown
      graphics.fillRect(pos.x - 5, pos.y, 10, 30)
      
      // Tree leaves
      graphics.fillStyle(0x228B22) // Forest green
      graphics.fillCircle(pos.x, pos.y, 20)
    })
    
    // Add clouds
    const cloudPositions = [
      { x: 150, y: 80 },
      { x: 400, y: 60 },
      { x: 650, y: 90 }
    ]
    
    cloudPositions.forEach(pos => {
      graphics.fillStyle(0xFFFFFF, 0.8) // Semi-transparent white
      graphics.fillCircle(pos.x, pos.y, 25)
      graphics.fillCircle(pos.x + 20, pos.y, 20)
      graphics.fillCircle(pos.x - 20, pos.y, 20)
    })
  }

  private createPigeonPath(): void {
    // Create the path that pigeons will follow
    this.pathGraphics = this.add.graphics()
    
    // Draw a winding path from left to right
    this.pathGraphics.lineStyle(this.PATH_WIDTH, 0xD2B48C, 1) // Tan color for path
    
    // Simple path: left edge -> center curve -> right edge
    const path = new Phaser.Curves.Path(0, 300)
    path.lineTo(200, 300)
    path.quadraticBezierTo(400, 200, 600, 300)
    path.lineTo(800, 300)
    
    path.draw(this.pathGraphics)
    
    // Add path border/outline
    this.pathGraphics.lineStyle(4, 0x8B7355, 0.8) // Darker tan border
    path.draw(this.pathGraphics)
    
    // Add path markers
    this.addPathMarkers()
  }

  private addPathMarkers(): void {
    const graphics = this.add.graphics()
    
    // Start marker
    graphics.fillStyle(0x00FF00) // Green
    graphics.fillCircle(50, 300, 15)
    this.add.text(50, 280, 'START', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5)
    
    // End marker
    graphics.fillStyle(0xFF0000) // Red
    graphics.fillCircle(750, 300, 15)
    this.add.text(750, 280, 'END', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5)
  }

  private createUI(): void {
    // Game title
    this.titleText = this.add.text(400, 30, '🐦 Pigeon Tower Defense', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)
    
    // Status text with game stats
    this.statusText = this.add.text(400, 570, '', {
      fontSize: '14px',
      color: '#333333',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5)
    
    // Initialize simple status
    this.statusText.setText('🎴 Select cards from hand below → Click towers to apply | T=Place tower | SPACE=Skip wave | ESC=Deselect')
    
    // Game stats UI
    const gameStatsText = this.add.text(10, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    })
    
    // Update stats display continuously
    this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: () => {
        if (gameStatsText && this.isGameActive) {
          const placementStatus = this.isPlacingTower ? ' (PLACING TOWER)' : ''
          const waveStatus = this.getWaveStatusText()
          gameStatsText.setText(
            `❤️ Health: ${this.playerHealth}\n` +
            `🎯 Score: ${this.score}\n` +
            `💰 Coins: ${this.coins}\n` +
            `🌊 Wave: ${this.currentWave} ${waveStatus}\n` +
            `🐦 Pigeons: ${this.pigeons.length}\n` +
            `🏰 Towers: ${this.towers.length}${placementStatus}\n` +
            `🚀 Projectiles: ${this.projectiles.length}\n` +
            `⚡ Status: ${this.isGameActive ? 'Active' : 'Game Over'}`
          )
          
        }
      },
      loop: true
    })
    
    // Debug info
    this.add.text(10, 180, 'Enhanced Tower Defense + Skill Cards\nPath of Exile-Inspired Skill System', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 }
    })
  }


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private drawTowerIcon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, towerType: string, _config: unknown): void {
    graphics.setPosition(x, y)
    
    // Get tower colors from configs
    const towerConfigs = {
      basic: { color: 0x4A5568, projectileColor: 0xFFD700 },
      rapidFire: { color: 0xE53E3E, projectileColor: 0xFF6B6B },
      heavyDamage: { color: 0x553C9A, projectileColor: 0xB794F6 },
      sniper: { color: 0x2F855A, projectileColor: 0x48BB78 }
    }
    
    const colors = towerConfigs[towerType as keyof typeof towerConfigs] || towerConfigs.basic
    
    // Draw tower base
    graphics.fillStyle(colors.color, 1)
    graphics.fillCircle(0, 0, 12)
    
    // Draw tower border
    graphics.lineStyle(1, this.darkenColor(colors.color), 1)
    graphics.strokeCircle(0, 0, 12)
    
    // Draw tower cannon
    graphics.fillStyle(this.darkenColor(colors.color), 1)
    graphics.fillRect(0, -3, 10, 6)
    
    // Draw type-specific indicator
    this.drawTowerTypeIcon(graphics, towerType, colors.projectileColor)
  }

  private drawTowerTypeIcon(graphics: Phaser.GameObjects.Graphics, towerType: string, indicatorColor: number): void {
    switch (towerType) {
      case 'rapidFire':
        // Small triangles for rapid fire
        graphics.fillStyle(indicatorColor, 0.9)
        graphics.fillTriangle(-4, -6, -1, -6, -2.5, -9)
        graphics.fillTriangle(1, -6, 4, -6, 2.5, -9)
        break
      case 'heavyDamage':
        // Diamond for heavy damage
        graphics.fillStyle(indicatorColor, 0.9)
        graphics.fillTriangle(0, -9, -3, -6, 3, -6)
        break
      case 'sniper':
        // Crosshair for sniper
        graphics.lineStyle(1, indicatorColor, 0.9)
        graphics.lineBetween(-6, 0, -9, 0)
        graphics.lineBetween(6, 0, 9, 0)
        graphics.lineBetween(0, -6, 0, -9)
        graphics.lineBetween(0, 6, 0, 9)
        break
      case 'basic':
      default:
        // Simple dot for basic tower
        graphics.fillStyle(indicatorColor, 0.9)
        graphics.fillCircle(0, -8, 1.5)
        break
    }
  }

  private darkenColor(color: number): number {
    // Simple color darkening - reduce each RGB component
    const r = Math.max(0, ((color >> 16) & 0xFF) - 40)
    const g = Math.max(0, ((color >> 8) & 0xFF) - 40)
    const b = Math.max(0, (color & 0xFF) - 40)
    return (r << 16) | (g << 8) | b
  }


  private setupInput(): void {
    // Add click handling for tower placement and general interaction
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y)
    })
    
    // Add mouse movement for tower placement preview
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleMouseMove(pointer.x, pointer.y)
    })
    
    // Add keyboard input
    const cursors = this.input.keyboard?.createCursorKeys()
    if (cursors) {
      // Prepare for future keyboard controls
    }
    
    // Add spacebar for manual wave progression (for testing)
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    if (spaceKey) {
      spaceKey.on('down', () => {
        if (this.waveState === 'complete' || this.waveState === 'preparing') {
          // Skip to next wave immediately
          if (this.waveStartTimer) {
            this.waveStartTimer.destroy()
            this.waveStartTimer = null
          }
          this.currentWave++
          this.waveState = 'preparing'
          this.startWave()
          this.statusText.setText('Wave skipped manually!')
        }
      })
    }
    
    // Add T key for tower placement mode
    const tKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T)
    if (tKey) {
      tKey.on('down', () => {
        this.toggleTowerPlacement()
      })
    }
    
    // Add ESC key to cancel tower placement or close upgrade menu
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    if (escKey) {
      escKey.on('down', () => {
        if (this.isSkillMenuOpen) {
          this.closeSkillMenu()
        } else if (this.selectedCardIndex !== -1) {
          // Deselect card
          this.selectedCardIndex = -1
          this.updateCardHandDisplay()
          this.statusText.setText(`🎴 Card deselected. Select a card and click a tower to apply skills.`)
        } else {
          this.cancelTowerPlacement()
        }
      })
    }
    
    // Add number keys for quick card application (when tower is selected)
    for (let i = 1; i <= 9; i++) {
      const keyCode = `DIGIT_${i}` as keyof typeof Phaser.Input.Keyboard.KeyCodes
      const key = this.input.keyboard?.addKey(keyCode)
      if (key) {
        key.on('down', () => {
          this.quickApplyCard(i - 1) // 0-indexed
        })
      }
    }
  }

  private handleClick(x: number, y: number): void {
    if (this.isPlacingTower) {
      this.attemptTowerPlacement(x, y)
      return
    }
    
    // Check if clicking on a tower for skill application
    const clickedTower = this.findTowerAtPosition(x, y)
    if (clickedTower) {
      this.selectTowerForSkills(clickedTower)
      return
    }
    
    // Close skill menu if clicking elsewhere
    if (this.isSkillMenuOpen) {
      this.closeSkillMenu()
      return
    }
    
    // Visual feedback for regular clicks
    const clickEffect = this.add.graphics()
    clickEffect.lineStyle(3, 0xFFFF00, 1) // Yellow circle
    clickEffect.strokeCircle(x, y, 20)
    
    // Animate and destroy the click effect
    this.tweens.add({
      targets: clickEffect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => clickEffect.destroy()
    })
    
    // Update status
    this.statusText.setText(`Click towers to apply skills! Press T to place new towers. Hand: ${this.playerHand.length} cards`)
    
    console.log('GameScene: Click detected at', x, y)
  }

  private createCardHandUI(): void {
    // Create persistent card hand panel at bottom of screen - make it bigger and more prominent
    this.cardHandPanel = this.add.graphics()
    this.cardHandPanel.fillStyle(0x0F1419, 0.95)
    this.cardHandPanel.lineStyle(3, 0xFFD700, 1)
    this.cardHandPanel.fillRoundedRect(5, 480, 790, 110, 12)
    this.cardHandPanel.strokeRoundedRect(5, 480, 790, 110, 12)
    
    // Add glow effect
    this.cardHandPanel.lineStyle(1, 0xFFD700, 0.3)
    this.cardHandPanel.strokeRoundedRect(2, 477, 796, 116, 15)
    
    // Header text - bigger and more prominent
    const headerText = this.add.text(400, 495, '🎴 SKILL CARDS 🎴', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)
    this.cardHandTexts.push(headerText)
    
    // Instructions
    const instructionText = this.add.text(400, 515, 'CLICK CARD → CLICK TOWER → CARD APPLIES | CLICK SAME CARD OR ESC TO DESELECT', {
      fontSize: '9px',
      color: '#00FF88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5)
    this.cardHandTexts.push(instructionText)
    
    
    // Initial empty hand message
    this.updateCardHandDisplay()
  }

  private updateCardHandDisplay(): void {
    // Clear existing card displays (keep header and instructions)
    const toKeep = this.cardHandTexts.slice(0, 2)
    this.cardHandTexts.slice(2).forEach(text => text.destroy())
    this.cardHandButtons.forEach(button => button.destroy())
    this.cardHandTexts = toKeep
    this.cardHandButtons = []
    
    if (this.playerHand.length === 0) {
      const emptyText = this.add.text(400, 560, 'Complete waves to draw skill cards!', {
        fontSize: '16px',
        color: '#A0AEC0',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      this.cardHandTexts.push(emptyText)
      return
    }
    
    // Display cards in hand - much bigger and more obvious
    this.playerHand.forEach((card, index) => {
      if (index >= 6) return // Show up to 6 cards
      
      const cardWidth = 110
      const cardHeight = 45
      const cardSpacing = 125
      const startX = 400 - ((this.playerHand.length - 1) * cardSpacing / 2)
      const cardX = startX + (index * cardSpacing)
      const cardY = 555
      
      // Create card background with rarity-based styling
      const cardBg = this.add.graphics()
      const colorHex = card.color.replace('#', '0x')
      const color = parseInt(colorHex, 16)
      
      // Card background with gradient effect
      cardBg.fillStyle(0x1A202C, 0.9)
      cardBg.fillRoundedRect(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight, 8)
      
      // Colored border based on rarity
      let borderWidth = 2
      if (card.rarity === 'rare') borderWidth = 3
      if (card.rarity === 'legendary') borderWidth = 4
      
      cardBg.lineStyle(borderWidth, color, 1)
      cardBg.strokeRoundedRect(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight, 8)
      
      // Add glow effect for higher rarities
      if (card.rarity === 'rare' || card.rarity === 'legendary') {
        cardBg.lineStyle(1, color, 0.3)
        cardBg.strokeRoundedRect(cardX - cardWidth/2 - 2, cardY - cardHeight/2 - 2, cardWidth + 4, cardHeight + 4, 10)
      }
      
      // Make card interactive with better hover effects
      cardBg.setInteractive(new Phaser.Geom.Rectangle(cardX - cardWidth/2, cardY - cardHeight/2, cardWidth, cardHeight), Phaser.Geom.Rectangle.Contains)
      cardBg.on('pointerover', () => {
        // Scale up on hover
        cardBg.setScale(1.1)
        this.showCardTooltip(card, cardX, cardY - 60)
      })
      cardBg.on('pointerout', () => {
        cardBg.setScale(1.0)
        this.hideCardTooltip()
      })
      cardBg.on('pointerdown', () => {
        this.selectCardFromHand(index)
      })
      
      this.cardHandButtons.push(cardBg)
      
      // Card type icon
      const typeIcon = this.getCardTypeIcon(card)
      const iconText = this.add.text(cardX, cardY - 12, typeIcon, {
        fontSize: '16px',
        color: card.color
      }).setOrigin(0.5)
      this.cardHandTexts.push(iconText)
      
      // Card name text - bigger and more readable
      const cardText = this.add.text(cardX, cardY + 5, card.name, {
        fontSize: '10px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        wordWrap: { width: cardWidth - 10 }
      }).setOrigin(0.5)
      this.cardHandTexts.push(cardText)
      
      // Card number for quick access - more prominent
      const numberText = this.add.text(cardX - cardWidth/2 + 8, cardY - cardHeight/2 + 5, (index + 1).toString(), {
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      })
      this.cardHandTexts.push(numberText)
      
      // Selected indicator - much more obvious
      if (this.selectedCardIndex === index) {
        const selectIndicator = this.add.graphics()
        
        // Pulsing green glow effect
        selectIndicator.lineStyle(6, 0x00FF88, 1)
        selectIndicator.strokeRoundedRect(cardX - cardWidth/2 - 6, cardY - cardHeight/2 - 6, cardWidth + 12, cardHeight + 12, 12)
        
        // Inner bright green border
        selectIndicator.lineStyle(2, 0x00FFFF, 1)
        selectIndicator.strokeRoundedRect(cardX - cardWidth/2 - 2, cardY - cardHeight/2 - 2, cardWidth + 4, cardHeight + 4, 8)
        
        // Add "SELECTED" text above card
        const selectedText = this.add.text(cardX, cardY - cardHeight/2 - 15, 'SELECTED', {
          fontSize: '8px',
          color: '#00FF88',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5)
        this.cardHandTexts.push(selectedText)
        
        this.cardHandButtons.push(selectIndicator)
        
        // Add pulsing animation
        this.tweens.add({
          targets: selectIndicator,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1
        })
      }
    })
  }

  private getCardTypeIcon(card: SkillCard): string {
    switch (card.id) {
      case 'fireball': return '🔥'
      case 'ice_shard': return '❄️'
      case 'lightning_bolt': return '⚡'
      case 'multiple_projectiles': return '🎯'
      case 'piercing': return '🗡️'
      case 'faster_attacks': return '💨'
      case 'concentrated_effect': return '💥'
      case 'increased_area': return '🌐'
      case 'elemental_focus': return '🔮'
      default: return '🎴'
    }
  }

  private selectedCardIndex: number = -1
  private cardTooltip: Phaser.GameObjects.Text | null = null

  private selectCardFromHand(index: number): void {
    // If clicking the same card, deselect it
    if (this.selectedCardIndex === index) {
      this.selectedCardIndex = -1
      this.statusText.setText(`🎴 Card deselected. Click any card to select it again.`)
      this.updateCardHandDisplay()
      return
    }
    
    // Select new card
    this.selectedCardIndex = index
    const card = this.playerHand[index]
    if (card) {
      const typeIcon = this.getCardTypeIcon(card)
      this.statusText.setText(`🎴 ${typeIcon} ${card.name} SELECTED! → Click any tower to apply | Click card again to deselect`)
      // Update display to show selection
      this.updateCardHandDisplay()
    }
  }

  private quickApplyCard(index: number): void {
    if (index < this.playerHand.length && this.selectedTower) {
      const card = this.playerHand[index]
      this.equipSkillToTower(card)
    }
  }

  private showCardTooltip(card: SkillCard, x: number, y: number): void {
    this.hideCardTooltip()
    this.cardTooltip = this.add.text(x, y, `${card.name}\n${card.description}\nType: ${card.type}`, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#1A202C',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5)
  }

  private hideCardTooltip(): void {
    if (this.cardTooltip) {
      this.cardTooltip.destroy()
      this.cardTooltip = null
    }
  }

  private findTowerAtPosition(x: number, y: number): ITower | null {
    for (const tower of this.towers) {
      const towerPos = tower.getPosition()
      const distance = Phaser.Math.Distance.Between(x, y, towerPos.x, towerPos.y)
      if (distance <= 20) { // 20px click radius around tower
        return tower
      }
    }
    return null
  }

  private handleMouseMove(x: number, y: number): void {
    if (!this.isPlacingTower) return
    
    this.updatePlacementPreview(x, y)
  }

  private toggleTowerPlacement(): void {
    if (!this.TowerClass) {
      console.log('Tower class not loaded yet')
      return
    }
    
    this.isPlacingTower = !this.isPlacingTower
    
    if (this.isPlacingTower) {
      this.startTowerPlacement()
    } else {
      this.cancelTowerPlacement()
    }
  }

  private startTowerPlacement(): void {
    console.log('Starting tower placement mode')
    
    // Close skill menu if open
    this.closeSkillMenu()
    
    // Create placement preview
    this.placementPreview = this.add.graphics()
    
    // Update status with current tower info
    const configs = this.getTowerConfigs()
    const currentConfig = configs[this.currentTowerType]
    this.statusText.setText(`Placing ${currentConfig.name} (${currentConfig.cost} coins) - Click to place | ESC to cancel`)
  }

  private cancelTowerPlacement(): void {
    console.log('Cancelling tower placement mode')
    
    this.isPlacingTower = false
    
    // Remove placement preview
    if (this.placementPreview) {
      this.placementPreview.destroy()
      this.placementPreview = null
    }
    
    // Update status
    this.statusText.setText('Tower placement cancelled')
  }

  private updatePlacementPreview(x: number, y: number): void {
    if (!this.placementPreview) return
    
    this.placementPreview.clear()
    this.placementPreview.setPosition(x, y)
    
    // Check if placement is valid
    const isValid = this.isValidTowerPlacement(x, y)
    
    // Get current tower config for preview
    const towerConfigs = this.getTowerConfigs()
    const currentConfig = towerConfigs[this.currentTowerType]
    
    if (currentConfig) {
      // Draw the actual tower preview (like it will look when placed)
      this.drawActualTowerPreview(isValid, currentConfig)
      
      // Draw range circle (always visible and prominent)
      const rangeColor = isValid ? 0x68D391 : 0xF56565 // Green if valid, red if invalid
      this.placementPreview.lineStyle(2, rangeColor, 0.8)
      this.placementPreview.strokeCircle(0, 0, currentConfig.range)
      
      // Add range indicator text
      this.placementPreview.lineStyle(1, rangeColor, 0.6)
      this.placementPreview.strokeCircle(0, 0, currentConfig.range - 5)
      
      // Draw validation indicator
      if (!isValid) {
        // Clear X mark for invalid placement
        this.placementPreview.lineStyle(3, 0xFF0000, 0.9)
        this.placementPreview.lineBetween(-12, -12, 12, 12)
        this.placementPreview.lineBetween(-12, 12, 12, -12)
        
        // Red background circle
        this.placementPreview.fillStyle(0xFF0000, 0.2)
        this.placementPreview.fillCircle(0, 0, 20)
      } else {
        // Green checkmark for valid placement
        this.placementPreview.lineStyle(3, 0x00FF00, 0.9)
        this.placementPreview.lineBetween(-8, 0, -3, 5)
        this.placementPreview.lineBetween(-3, 5, 8, -8)
        
        // Green background circle
        this.placementPreview.fillStyle(0x00FF00, 0.2)
        this.placementPreview.fillCircle(0, 0, 20)
      }
    }
  }

  private drawActualTowerPreview(isValid: boolean, config: { name: string, cost: number, damage: number, range: number, fireRate: number }): void {
    if (!this.placementPreview) return
    
    // Get tower visual config
    const towerVisualConfigs = {
      basic: { color: 0x4A5568, projectileColor: 0xFFD700 },
      rapidFire: { color: 0xE53E3E, projectileColor: 0xFF6B6B },
      heavyDamage: { color: 0x553C9A, projectileColor: 0xB794F6 },
      sniper: { color: 0x2F855A, projectileColor: 0x48BB78 }
    }
    
    const visualConfig = towerVisualConfigs[this.currentTowerType as keyof typeof towerVisualConfigs] || towerVisualConfigs.basic
    const alpha = isValid ? 0.8 : 0.6
    
    // Draw tower base (same as actual tower)
    this.placementPreview.fillStyle(visualConfig.color, alpha)
    this.placementPreview.fillCircle(0, 0, 16)
    
    // Draw tower border
    const borderColor = this.darkenColor(visualConfig.color)
    this.placementPreview.lineStyle(2, borderColor, alpha)
    this.placementPreview.strokeCircle(0, 0, 16)
    
    // Draw tower cannon
    this.placementPreview.fillStyle(borderColor, alpha)
    this.placementPreview.fillRect(0, -4, 16, 8)
    
    // Draw tower type indicator (same as actual tower)
    this.drawTowerTypeIndicatorPreview(visualConfig.projectileColor, alpha)
    
    // Add cost indicator
    this.placementPreview.fillStyle(0x000000, 0.7)
    this.placementPreview.fillRoundedRect(-15, 20, 30, 12, 4)
    
    // Cost text color based on affordability
    const costColor = this.coins >= config.cost ? 0x68D391 : 0xF56565
    this.placementPreview.fillStyle(costColor, 1)
    this.placementPreview.fillCircle(-8, 26, 2)
    this.placementPreview.fillCircle(-4, 26, 2)
    this.placementPreview.fillCircle(0, 26, 2)
    this.placementPreview.fillCircle(4, 26, 2)
    this.placementPreview.fillCircle(8, 26, 2)
  }

  private drawTowerTypeIndicatorPreview(indicatorColor: number, alpha: number): void {
    if (!this.placementPreview) return
    
    switch (this.currentTowerType) {
      case 'rapidFire':
        // Small triangles for rapid fire
        this.placementPreview.fillStyle(indicatorColor, alpha)
        this.placementPreview.fillTriangle(-6, -10, -2, -10, -4, -14)
        this.placementPreview.fillTriangle(2, -10, 6, -10, 4, -14)
        break
      case 'heavyDamage':
        // Diamond for heavy damage
        this.placementPreview.fillStyle(indicatorColor, alpha)
        this.placementPreview.fillTriangle(0, -14, -4, -10, 4, -10)
        break
      case 'sniper':
        // Crosshair for sniper
        this.placementPreview.lineStyle(2, indicatorColor, alpha)
        this.placementPreview.lineBetween(-10, 0, -14, 0)
        this.placementPreview.lineBetween(10, 0, 14, 0)
        this.placementPreview.lineBetween(0, -10, 0, -14)
        this.placementPreview.lineBetween(0, 10, 0, 14)
        break
      case 'basic':
      default:
        // Simple dot for basic tower
        this.placementPreview.fillStyle(indicatorColor, alpha)
        this.placementPreview.fillCircle(0, -12, 2)
        break
    }
  }

  private isValidTowerPlacement(x: number, y: number): boolean {
    if (!this.TowerClass) return false
    
    // Check if player has enough coins for the current tower type
    const towerConfigs = this.getTowerConfigs()
    const currentConfig = towerConfigs[this.currentTowerType]
    if (!currentConfig || this.coins < currentConfig.cost) return false
    
    // Use Tower class static method for validation
    // Type assertion is needed because of dynamic loading
    const TowerConstructor = this.TowerClass as unknown as typeof import('../entities/Tower').default
    const towerPositions: TowerPlacementValidator[] = this.towers.map(tower => ({
      getPosition: () => tower.getPosition()
    }))
    return TowerConstructor.isValidPlacement(x, y, towerPositions)
  }

  private attemptTowerPlacement(x: number, y: number): void {
    if (!this.isValidTowerPlacement(x, y)) {
      console.log('Invalid tower placement location')
      const configs = this.getTowerConfigs()
      const currentConfig = configs[this.currentTowerType]
      
      let reason = ''
      if (this.coins < currentConfig.cost) {
        reason = `Need ${currentConfig.cost} coins (have ${this.coins})`
      } else {
        reason = 'Too close to path/towers or out of bounds'
      }
      
      this.statusText.setText(`Cannot place ${currentConfig.name}: ${reason}`)
      return
    }
    
    if (!this.TowerClass) {
      console.log('Tower class not loaded')
      return
    }
    
    // Create new tower with selected type
    const tower = new this.TowerClass(this, x, y, this.currentTowerType, this.skillCardSystem || undefined)
    this.towers.push(tower)
    
    // Deduct cost
    const towerCost = tower.getCost()
    this.coins -= towerCost
    
    // Cancel placement mode
    this.cancelTowerPlacement()
    
    // Update status
    this.statusText.setText(`${tower.getTowerName()} placed! (-${towerCost} coins, ${this.coins} remaining)`)
    
    console.log('Tower placed at', x, y, 'Cost:', towerCost)
  }

  private selectTowerForSkills(tower: ITower): void {
    this.selectedTower = tower
    
    // If a card is selected from hand, apply it immediately
    if (this.selectedCardIndex >= 0 && this.selectedCardIndex < this.playerHand.length) {
      const card = this.playerHand[this.selectedCardIndex]
      this.equipSkillToTower(card)
      this.selectedCardIndex = -1
      return
    }
    
    // Otherwise show skill menu
    this.showSkillMenu()
    this.statusText.setText(`${tower.getTowerName()} selected - Choose skills or click elsewhere to close`)
  }

  private showSkillMenu(): void {
    if (!this.selectedTower) return
    
    this.closeSkillMenu() // Close any existing menu
    this.isSkillMenuOpen = true
    
    const towerPos = this.selectedTower.getPosition()
    const equippedSkills = this.selectedTower.getEquippedSkills()
    const availableSlots = this.selectedTower.getAvailableSkillSlots()
    
    // Create skill panel - bigger to accommodate remove buttons
    this.skillPanel = this.add.graphics()
    this.skillPanel.fillStyle(0x1A202C, 0.95)
    this.skillPanel.lineStyle(2, 0x4A5568, 1)
    this.skillPanel.fillRoundedRect(towerPos.x - 200, towerPos.y - 200, 400, 320, 8)
    this.skillPanel.strokeRoundedRect(towerPos.x - 200, towerPos.y - 200, 400, 320, 8)
    
    // Tower name header
    const headerText = this.add.text(towerPos.x, towerPos.y - 130, this.selectedTower.getTowerName(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.skillTexts.push(headerText)
    
    // Current stats and equipped skills
    const statsText = this.add.text(towerPos.x, towerPos.y - 115, 
      `Damage: ${this.selectedTower.getDamage()} | Range: ${this.selectedTower.getRange()} | Slots: ${availableSlots}`, {
      fontSize: '10px',
      color: '#A0AEC0'
    }).setOrigin(0.5)
    this.skillTexts.push(statsText)
    
    // Show equipped skills with unequip buttons
    if (equippedSkills.length > 0) {
      const equippedText = this.add.text(towerPos.x, towerPos.y - 100, 'Equipped Skills:', {
        fontSize: '12px',
        color: '#68D391',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      this.skillTexts.push(equippedText)
      
      equippedSkills.forEach((skill, index) => {
        const skillY = towerPos.y - 85 + (index * 25)
        
        // Create skill display background
        const skillBg = this.add.graphics()
        skillBg.fillStyle(0x2D3748, 0.8)
        const skillColor = typeof skill.color === 'string' ? parseInt(skill.color.replace('#', '0x'), 16) : skill.color || 0xFFFFFF
        skillBg.lineStyle(1, skillColor, 1)
        skillBg.fillRoundedRect(towerPos.x - 140, skillY - 10, 190, 20, 6)
        skillBg.strokeRoundedRect(towerPos.x - 140, skillY - 10, 190, 20, 6)
        this.skillButtons.push(skillBg)
        
        // Create REMOVE button (much more obvious)
        const removeButton = this.add.graphics()
        removeButton.fillStyle(0xFF4444, 1) // Bright red
        removeButton.lineStyle(2, 0xFFFFFF, 1)
        removeButton.fillRoundedRect(towerPos.x + 55, skillY - 8, 75, 16, 4)
        removeButton.strokeRoundedRect(towerPos.x + 55, skillY - 8, 75, 16, 4)
        
        // Make REMOVE button interactive
        removeButton.setInteractive(new Phaser.Geom.Rectangle(towerPos.x + 55, skillY - 8, 75, 16), Phaser.Geom.Rectangle.Contains)
        removeButton.on('pointerdown', () => this.unequipSkillFromTower(skill.id))
        removeButton.on('pointerover', () => {
          removeButton.clear()
          removeButton.fillStyle(0xFF6666, 1) // Lighter red on hover
          removeButton.lineStyle(2, 0xFFFFFF, 1)
          removeButton.fillRoundedRect(towerPos.x + 55, skillY - 8, 75, 16, 4)
          removeButton.strokeRoundedRect(towerPos.x + 55, skillY - 8, 75, 16, 4)
        })
        removeButton.on('pointerout', () => {
          removeButton.clear()
          removeButton.fillStyle(0xFF4444, 1)
          removeButton.lineStyle(2, 0xFFFFFF, 1)
          removeButton.fillRoundedRect(towerPos.x + 55, skillY - 8, 75, 16, 4)
          removeButton.strokeRoundedRect(towerPos.x + 55, skillY - 8, 75, 16, 4)
        })
        
        this.skillButtons.push(removeButton)
        
        // REMOVE button text
        const removeText = this.add.text(towerPos.x + 92, skillY, '❌ REMOVE', {
          fontSize: '8px',
          color: '#FFFFFF',
          fontStyle: 'bold'
        }).setOrigin(0.5)
        this.skillTexts.push(removeText)
        
        // Skill text with type icon
        const typeIcon = this.getCardTypeIcon({ id: skill.id } as SkillCard)
        const skillText = this.add.text(towerPos.x - 45, skillY, `${typeIcon} ${skill.name}`, {
          fontSize: '10px',
          color: skill.color || '#FFFFFF',
          fontStyle: 'bold'
        }).setOrigin(0.5)
        this.skillTexts.push(skillText)
      })
    }
    
    // Show available skills from hand
    if (this.playerHand.length > 0 && availableSlots > 0) {
      const handHeaderY = towerPos.y - 85 + (equippedSkills.length * 25) + 20
      const handText = this.add.text(towerPos.x, handHeaderY, 'Available Skills from Hand:', {
        fontSize: '12px',
        color: '#FFD700',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      this.skillTexts.push(handText)
      
      // Show up to 4 skills from hand
      const skillsToShow = this.playerHand.slice(0, 4)
      skillsToShow.forEach((skill, index) => {
        const buttonY = handHeaderY + 15 + (index * 25)
        
        // Create skill button
        const button = this.add.graphics()
        const canEquip = this.selectedTower?.canEquipSkill(skill) || false
        
        const buttonColor = canEquip ? 0x38A169 : 0x4A5568
        const textColor = canEquip ? '#ffffff' : '#A0AEC0'
        
        button.fillStyle(buttonColor, 1)
        button.lineStyle(1, 0x2D3748, 1)
        button.fillRoundedRect(towerPos.x - 140, buttonY - 8, 280, 16, 4)
        button.strokeRoundedRect(towerPos.x - 140, buttonY - 8, 280, 16, 4)
        
        if (canEquip) {
          button.setInteractive(new Phaser.Geom.Rectangle(towerPos.x - 140, buttonY - 8, 280, 16), Phaser.Geom.Rectangle.Contains)
          button.on('pointerdown', () => this.equipSkillToTower(skill))
          button.on('pointerover', () => {
            button.clear()
            button.fillStyle(0x48BB78, 1)
            button.lineStyle(1, 0x2D3748, 1)
            button.fillRoundedRect(towerPos.x - 140, buttonY - 8, 280, 16, 4)
            button.strokeRoundedRect(towerPos.x - 140, buttonY - 8, 280, 16, 4)
          })
          button.on('pointerout', () => {
            button.clear()
            button.fillStyle(0x38A169, 1)
            button.lineStyle(1, 0x2D3748, 1)
            button.fillRoundedRect(towerPos.x - 140, buttonY - 8, 280, 16, 4)
            button.strokeRoundedRect(towerPos.x - 140, buttonY - 8, 280, 16, 4)
          })
        }
        
        this.skillButtons.push(button)
        
        // Button text
        const buttonText = `${skill.name} (${skill.type}) - ${skill.description}`
        const text = this.add.text(towerPos.x, buttonY, buttonText, {
          fontSize: '9px',
          color: textColor
        }).setOrigin(0.5)
        this.skillTexts.push(text)
      })
    } else if (availableSlots === 0) {
      const noSlotsText = this.add.text(towerPos.x, towerPos.y + 10, 'Tower is fully equipped!', {
        fontSize: '12px',
        color: '#FF6B6B'
      }).setOrigin(0.5)
      this.skillTexts.push(noSlotsText)
    } else {
      const noCardsText = this.add.text(towerPos.x, towerPos.y + 10, 'No skill cards in hand. Complete waves to draw cards!', {
        fontSize: '11px',
        color: '#A0AEC0'
      }).setOrigin(0.5)
      this.skillTexts.push(noCardsText)
    }
    
    // Close instruction and future features note
    const closeText = this.add.text(towerPos.x, towerPos.y + 70, 'Click elsewhere to close', {
      fontSize: '9px',
      color: '#718096'
    }).setOrigin(0.5)
    this.skillTexts.push(closeText)
    
    // Future combinations note
    const comboNote = this.add.text(towerPos.x, towerPos.y + 85, '🔮 Skill Combinations Coming Soon!', {
      fontSize: '8px',
      color: '#9F7AEA',
      fontStyle: 'italic'
    }).setOrigin(0.5)
    this.skillTexts.push(comboNote)
  }

  private closeSkillMenu(): void {
    this.isSkillMenuOpen = false
    this.selectedTower = null
    
    // Destroy skill UI elements
    if (this.skillPanel) {
      this.skillPanel.destroy()
      this.skillPanel = null
    }
    
    this.skillTexts.forEach(text => text.destroy())
    this.skillTexts = []
    
    this.skillButtons.forEach(button => button.destroy())
    this.skillButtons = []
  }

  private equipSkillToTower(skill: SkillCard): void {
    if (!this.selectedTower) return
    
    const success = this.selectedTower.equipSkill(skill)
    
    if (success) {
      // Remove skill from hand
      this.playerHand = this.playerHand.filter(s => s.id !== skill.id)
      
      // Update card hand display
      this.updateCardHandDisplay()
      
      console.log(`🔧 Equipped skill: ${skill.name} to tower`)
      this.statusText.setText(`${skill.name} equipped! Cards in hand: ${this.playerHand.length}`)
      
      // Refresh the skill menu to show the change
      this.showSkillMenu()
    } else {
      this.statusText.setText(`Cannot equip ${skill.name} - tower may be full or incompatible`)
    }
  }

  private unequipSkillFromTower(skillId: string): void {
    if (!this.selectedTower) return
    
    const unequippedSkill = this.selectedTower.unequipSkill(skillId)
    
    if (unequippedSkill) {
      // Add skill back to hand
      this.playerHand.push(unequippedSkill)
      
      // Update card hand display
      this.updateCardHandDisplay()
      
      console.log(`🔄 Unequipped skill: ${unequippedSkill.name} from tower`)
      this.statusText.setText(`${unequippedSkill.name} unequipped! Cards in hand: ${this.playerHand.length}`)
      
      // Refresh the skill menu to show the change
      this.showSkillMenu()
    } else {
      this.statusText.setText(`Failed to unequip skill`)
    }
  }



  private getTowerConfigs(): Record<string, { name: string, cost: number, damage: number, range: number, fireRate: number }> {
    return {
      basic: { name: 'Basic Tower', cost: 50, damage: 25, range: 80, fireRate: 1000 },
      rapidFire: { name: 'Rapid-Fire Tower', cost: 75, damage: 15, range: 70, fireRate: 400 },
      heavyDamage: { name: 'Heavy Damage Tower', cost: 100, damage: 60, range: 90, fireRate: 2000 },
      sniper: { name: 'Sniper Tower', cost: 150, damage: 80, range: 150, fireRate: 3000 }
    }
  }

  private handleTowerFire(fireData: {
    tower: ITower,
    startPosition: { x: number, y: number },
    targetPosition: { x: number, y: number },
    damage: number,
    projectileColor?: number,
    towerType?: string
  }): void {
    if (!this.ProjectileClass) {
      console.log('Projectile class not loaded yet')
      return
    }

    console.log('Tower fired! Creating projectile with damage:', fireData.damage)

    // Get tower's combined effects for special projectile behavior
    const tower = fireData.tower
    const combinedEffects = tower?.getCombinedEffects()
    
    // Create multiple projectiles if skill is equipped
    const projectileCount = (combinedEffects?.finalProjectileCount as number) || 1
    const spread = (combinedEffects?.projectileSpread as number) || 0
    
    console.log(`🎯 Creating ${projectileCount} projectiles with effects:`, combinedEffects)
    
    for (let i = 0; i < projectileCount; i++) {
      let targetX = fireData.targetPosition.x
      let targetY = fireData.targetPosition.y
      
      // Apply spread for multiple projectiles
      if (projectileCount > 1 && spread > 0) {
        const angle = Math.atan2(targetY - fireData.startPosition.y, targetX - fireData.startPosition.x)
        const spreadOffset = (i - (projectileCount - 1) / 2) * spread
        const newAngle = angle + spreadOffset
        const distance = Phaser.Math.Distance.Between(fireData.startPosition.x, fireData.startPosition.y, targetX, targetY)
        targetX = fireData.startPosition.x + Math.cos(newAngle) * distance
        targetY = fireData.startPosition.y + Math.sin(newAngle) * distance
      }

      // Determine projectile color from skill effects
      let projectileColor = fireData.projectileColor || 0xFFD700
      if (combinedEffects?.finalProjectileColor && typeof combinedEffects.finalProjectileColor === 'string') {
        const colorHex = combinedEffects.finalProjectileColor.replace('#', '0x')
        projectileColor = parseInt(colorHex, 16)
      }

      // Create projectile with skill effects
      const projectile = new this.ProjectileClass(
        this,
        fireData.startPosition.x,
        fireData.startPosition.y,
        targetX,
        targetY,
        fireData.damage,
        projectileColor
      )
      
      // Apply special projectile properties from skills
      if (projectile && combinedEffects) {
        // Store skill effects on projectile for collision handling
        (projectile as IProjectile & { [key: string]: unknown }).skillEffects = combinedEffects;
        (projectile as IProjectile & { [key: string]: unknown }).projectileType = combinedEffects.finalProjectileType || 'basic';
        (projectile as IProjectile & { [key: string]: unknown }).piercing = combinedEffects.piercing || false;
        (projectile as IProjectile & { [key: string]: unknown }).piercingCount = combinedEffects.piercingCount || 0;
        (projectile as IProjectile & { [key: string]: unknown }).explosionRadius = combinedEffects.explosionRadius || 0;
        (projectile as IProjectile & { [key: string]: unknown }).slowEffect = combinedEffects.slowEffect || 0;
        (projectile as IProjectile & { [key: string]: unknown }).slowDuration = combinedEffects.slowDuration || 0;
        (projectile as IProjectile & { [key: string]: unknown }).chainCount = combinedEffects.chainCount || 0;
        
        console.log(`🎯 Created ${combinedEffects.finalProjectileType} projectile with special effects`)
      }

      if (projectile) {
        this.projectiles.push(projectile)
      }
    }
    
    console.log(`✅ Created ${projectileCount} projectiles. Total: ${this.projectiles.length}`)

    // Update status with simpler info
    this.statusText.setText(`Tower fired! (${this.projectiles.length} projectiles)`)
  }

  private showWelcomeMessage(): void {
    // Temporary welcome message that fades out
    const welcomeMsg = this.add.text(400, 400, 'Main Game Scene Loaded!\nCanvas and Rendering Active', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 12, y: 8 },
      align: 'center'
    }).setOrigin(0.5)
    
    // Fade out after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: welcomeMsg,
        alpha: 0,
        duration: 1000,
        onComplete: () => welcomeMsg.destroy()
      })
    })
  }

  private setupGameEvents(): void {
    // Listen for pigeon events
    this.events.on('pigeonEscaped', (pigeon: IPigeon) => {
      this.handlePigeonEscape(pigeon)
    })
    
    this.events.on('pigeonEliminated', (pigeon: IPigeon) => {
      this.handlePigeonElimination(pigeon)
    })
    
    // Listen for tower firing events
    this.events.on('towerFired', (fireData: {
      tower: ITower,
      startPosition: { x: number, y: number },
      targetPosition: { x: number, y: number },
      damage: number
    }) => {
      this.handleTowerFire(fireData)
    })
  }

  private startWaveSystem(): void {
    console.log('🌊 Starting wave system')
    this.waveState = 'preparing'
    this.startWave()
  }

  private startWave(): void {
    console.log(`🌊 Starting Wave ${this.currentWave}`)
    
    // Calculate pigeons in this wave (increases with wave number)
    this.pigeonsInWave = Math.floor(3 + (this.currentWave * 1.5))
    this.pigeonsSpawned = 0
    this.waveState = 'spawning'
    
    // Show wave start message
    this.showWaveStartMessage()
    
    // Start spawning pigeons for this wave
    const spawnDelay = Math.max(1000, 3000 - (this.currentWave * 100)) // Faster spawning in later waves
    
    this.pigeonSpawnTimer = this.time.addEvent({
      delay: spawnDelay,
      callback: () => {
        if (this.waveState === 'spawning' && this.pigeonsSpawned < this.pigeonsInWave && this.isGameActive) {
          this.spawnPigeon()
          this.pigeonsSpawned++
          
          // If all pigeons spawned, switch to active state
          if (this.pigeonsSpawned >= this.pigeonsInWave) {
            this.waveState = 'active'
            this.pigeonSpawnTimer?.destroy()
            this.pigeonSpawnTimer = null
            console.log(`🌊 Wave ${this.currentWave} spawning complete - ${this.pigeonsSpawned} pigeons spawned`)
          }
        }
      },
      loop: true
    })
  }

  private checkWaveComplete(): void {
    if (this.waveState === 'active' && this.pigeons.length === 0) {
      this.completeWave()
    }
  }

  private completeWave(): void {
    console.log(`🎉 Wave ${this.currentWave} completed!`)
    this.waveState = 'complete'
    
    // Award bonus coins for completing the wave
    const waveBonus = 25 + (this.currentWave * 10)
    this.coins += waveBonus
    
    // Draw skill cards as reward
    this.drawSkillCards()
    
    // Show completion message
    this.showWaveCompleteMessage(waveBonus)
    
    // Prepare next wave after delay
    this.waveStartTimer = this.time.delayedCall(this.timeBetweenWaves, () => {
      this.currentWave++
      this.waveState = 'preparing'
      this.startWave()
    })
  }
  
  private drawSkillCards(): void {
    if (!this.skillCardSystem) return
    
    // Draw 3 cards after each wave
    const drawnCards = this.skillCardSystem.drawCards(3)
    this.playerHand = [...this.playerHand, ...drawnCards]
    
    // Update the card hand display
    this.updateCardHandDisplay()
    
    // Show skill card draw notification
    if (drawnCards.length > 0) {
      const cardNames = drawnCards.map(c => c.name).join(', ')
      this.statusText.setText(`🎴 Drew skill cards: ${cardNames}`)
      
      console.log(`🎴 Player hand now has ${this.playerHand.length} cards`)
    }
  }

  private getWaveStatusText(): string {
    switch (this.waveState) {
      case 'preparing':
        return '(Preparing...)'
      case 'spawning':
        return `(Spawning ${this.pigeonsSpawned}/${this.pigeonsInWave})`
      case 'active':
        return '(In Progress)'
      case 'complete':
        return '(Complete!)'
      default:
        return ''
    }
  }

  private showWaveStartMessage(): void {
    const waveMessage = this.add.text(400, 350, `🌊 Wave ${this.currentWave} Starting!\n${this.pigeonsInWave} Pigeons Incoming`, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#1A202C',
      padding: { x: 20, y: 10 },
      align: 'center'
    }).setOrigin(0.5)
    
    // Animate the message
    this.tweens.add({
      targets: waveMessage,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => waveMessage.destroy()
    })
  }

  private showWaveCompleteMessage(bonus: number): void {
    const completeMessage = this.add.text(400, 350, `🎉 Wave ${this.currentWave} Complete!\nBonus: +${bonus} coins`, {
      fontSize: '20px',
      color: '#68D391',
      backgroundColor: '#1A202C',
      padding: { x: 15, y: 8 },
      align: 'center'
    }).setOrigin(0.5)
    
    // Animate the message
    this.tweens.add({
      targets: completeMessage,
      alpha: 0,
      y: 320,
      duration: 4000,
      ease: 'Power2',
      onComplete: () => completeMessage.destroy()
    })
  }

  private spawnPigeon(): void {
    if (!this.isGameActive || !this.PigeonClass) {
      console.log('Cannot spawn pigeon: game inactive or Pigeon class not loaded')
      return
    }
    
    console.log('Spawning new pigeon')
    
    // Create new pigeon at the start of the path
    const pigeon = new this.PigeonClass(this, 0, 300)
    this.pigeons.push(pigeon)
    
    // Start the pigeon moving
    pigeon.startMoving()
    
    console.log(`🐦 Pigeon spawned for Wave ${this.currentWave} (${this.pigeonsSpawned}/${this.pigeonsInWave})`)
  }

  private handlePigeonEscape(pigeon: IPigeon): void {
    console.log('Pigeon escaped! Player loses health.')
    
    // Remove from pigeons array
    const index = this.pigeons.indexOf(pigeon)
    if (index > -1) {
      this.pigeons.splice(index, 1)
    }
    
    // Player loses health
    this.playerHealth -= 1
    
    // Check game over
    if (this.playerHealth <= 0) {
      this.gameOver()
    }
    
    // Update status
    this.statusText.setText(`Pigeon escaped! Health: ${this.playerHealth}`)
  }

  private handlePigeonElimination(pigeon: IPigeon): void {
    console.log('Pigeon eliminated! Player gains score and coins.')
    
    // Remove from pigeons array
    const index = this.pigeons.indexOf(pigeon)
    if (index > -1) {
      this.pigeons.splice(index, 1)
    }
    
    // Player gains score and coins
    const reward = pigeon.getReward()
    this.score += reward
    this.coins += Math.floor(reward / 2) // Gain coins equal to half the score reward
    
    // Update status
    this.statusText.setText(`Pigeon eliminated! +${reward} score, +${Math.floor(reward / 2)} coins`)
  }

  private gameOver(): void {
    console.log('Game Over!')
    
    this.isGameActive = false
    
    // Stop all wave spawning
    if (this.spawnTimer) {
      this.spawnTimer.destroy()
      this.spawnTimer = null
    }
    
    if (this.pigeonSpawnTimer) {
      this.pigeonSpawnTimer.destroy()
      this.pigeonSpawnTimer = null
    }
    
    if (this.waveStartTimer) {
      this.waveStartTimer.destroy()
      this.waveStartTimer = null
    }
    
    // Show game over message
    this.add.text(400, 350, `GAME OVER!\nYou survived ${this.currentWave} waves!`, {
      fontSize: '36px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center'
    }).setOrigin(0.5)
    
    // Add restart instructions
    this.add.text(400, 450, `Final Score: ${this.score} points\nRefresh the page to play again`, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 12, y: 6 },
      align: 'center'
    }).setOrigin(0.5)
  }

  update(time: number, delta: number): void {
    if (!this.isGameActive) return
    
    // Update all pigeons
    this.pigeons.forEach(pigeon => {
      pigeon.update(time, delta)
    })
    
    // Update all towers
    this.towers.forEach((tower, index) => {
      tower.update(time, delta)
      
      // Tower combat logic
      if (tower.canAttack(time)) {
        const target = tower.findTarget(this.pigeons)
        if (target) {
          console.log(`Tower ${index} (${tower.getTowerType()}) attacking target at (${target.x}, ${target.y})`)
          tower.attack(target, time)
        }
      }
    })
    
    // Update all projectiles
    this.projectiles.forEach(projectile => {
      projectile.update(time, delta)
    })
    
    // Handle projectile-pigeon collisions
    this.handleProjectileCollisions()
    
    // Remove dead pigeons that have finished their elimination animation
    this.pigeons = this.pigeons.filter(pigeon => pigeon.isAlive)
    
    // Remove inactive projectiles
    this.projectiles = this.projectiles.filter(projectile => projectile.isAlive())
    
    // Check if wave is complete
    this.checkWaveComplete()
  }

  private handleProjectileCollisions(): void {
    // Track projectiles to remove
    const projectilesToRemove: number[] = []
    
    // Check each projectile against each pigeon
    for (let p = 0; p < this.projectiles.length; p++) {
      const projectile = this.projectiles[p]
      if (!projectile || !projectile.isAlive()) {
        projectilesToRemove.push(p)
        continue
      }
      
      let hitDetected = false
      
      for (let i = 0; i < this.pigeons.length; i++) {
        const pigeon = this.pigeons[i]
        if (!pigeon || !pigeon.isAlive) continue
        
        // Check collision using distance calculation
        const pigeonPos = pigeon.getPosition()
        const projectilePos = projectile.getPosition()
        
        if (!pigeonPos || !projectilePos) continue
        
        const distance = Phaser.Math.Distance.Between(
          projectilePos.x, projectilePos.y,
          pigeonPos.x, pigeonPos.y
        )
        
        // Collision if within combined radius
        const collisionRadius = 16 // Slightly larger for better hit detection
        
        if (distance <= collisionRadius) {
          const damage = projectile.getDamage()
          const pigeonVel = pigeon.getVelocity ? pigeon.getVelocity() : { x: 0, y: 0 }
          const speed = Math.sqrt(pigeonVel.x * pigeonVel.x + pigeonVel.y * pigeonVel.y)
          
          // Get projectile special effects
          const projectileType = (projectile as IProjectile & { [key: string]: unknown }).projectileType as string || 'basic'
          const explosionRadius = (projectile as IProjectile & { [key: string]: unknown }).explosionRadius as number || 0
          const slowEffect = (projectile as IProjectile & { [key: string]: unknown }).slowEffect as number || 0
          const slowDuration = (projectile as IProjectile & { [key: string]: unknown }).slowDuration as number || 0
          const piercing = (projectile as IProjectile & { [key: string]: unknown }).piercing as boolean || false
          
          console.log(`🎯 ${projectileType.toUpperCase()} HIT! Distance: ${distance.toFixed(1)}, Damage: ${damage}`)
          console.log(`🐦 Pigeon velocity: (${pigeonVel.x.toFixed(1)}, ${pigeonVel.y.toFixed(1)}) Speed: ${speed.toFixed(1)}`)
          
          // Apply damage directly to pigeon
          const eliminated = pigeon.takeDamage(damage)
          
          // Apply special effects based on projectile type
          this.applyProjectileEffects(projectileType, projectilePos, pigeon, slowEffect, slowDuration, explosionRadius)
          
          // Create visual effects
          this.createProjectileEffects(projectileType, projectilePos, explosionRadius)
          
          // Only remove projectile if it's not piercing
          if (!piercing) {
            projectilesToRemove.push(p)
            hitDetected = true
          }
          
          if (eliminated) {
            console.log('💀 Pigeon eliminated by projectile!')
            // Pigeon was eliminated, trigger elimination event
            this.handlePigeonElimination(pigeon)
          }
          
          // If not piercing, break after first hit
          if (!piercing) {
            break
          }
        }
      }
      
      if (hitDetected) {
        // Destroy the projectile immediately
        projectile.destroy()
      }
    }
    
    // Remove hit projectiles from array (in reverse order to maintain indices)
    for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
      const index = projectilesToRemove[i]
      if (index >= 0 && index < this.projectiles.length) {
        this.projectiles.splice(index, 1)
      }
    }
  }

  private applyProjectileEffects(projectileType: string, hitPos: {x: number, y: number}, hitPigeon: IPigeon, slowEffect: number, slowDuration: number, explosionRadius: number): void {
    switch (projectileType) {
      case 'fireball':
        console.log('🔥 FIREBALL EXPLOSION!')
        if (explosionRadius > 0) {
          // Damage nearby pigeons
          this.pigeons.forEach(pigeon => {
            if (!pigeon.isAlive) return
            const pigeonPos = pigeon.getPosition()
            const distance = Phaser.Math.Distance.Between(hitPos.x, hitPos.y, pigeonPos.x, pigeonPos.y)
            if (distance <= explosionRadius && pigeon !== hitPigeon) {
              pigeon.takeDamage(15) // Explosion damage
              console.log('🔥 Explosion damage to nearby pigeon!')
            }
          })
        }
        break
        
      case 'ice':
        console.log('❄️ ICE SHARD SLOW!')
        if (slowEffect > 0) {
          // Apply slow effect to hit pigeon (would need to implement in Pigeon class)
          console.log(`❄️ Slowing pigeon by ${slowEffect * 100}% for ${slowDuration}ms`)
        }
        break
        
      case 'lightning':
        console.log('⚡ LIGHTNING CHAIN!')
        // Chain to nearby pigeons
        this.pigeons.forEach(pigeon => {
          if (!pigeon.isAlive || pigeon === hitPigeon) return
          const pigeonPos = pigeon.getPosition()
          const distance = Phaser.Math.Distance.Between(hitPos.x, hitPos.y, pigeonPos.x, pigeonPos.y)
          if (distance <= 60) { // Chain range
            pigeon.takeDamage(10) // Chain damage
            console.log('⚡ Lightning chained to nearby pigeon!')
            // Create visual chain effect
            this.createLightningChain(hitPos, pigeonPos)
          }
        })
        break
    }
  }

  private createProjectileEffects(projectileType: string, pos: {x: number, y: number}, explosionRadius: number): void {
    switch (projectileType) {
      case 'fireball':
        // Create explosion visual
        const explosion = this.add.graphics()
        explosion.fillStyle(0xFF4444, 0.8)
        explosion.fillCircle(pos.x, pos.y, explosionRadius || 25)
        explosion.setAlpha(0.8)
        
        this.tweens.add({
          targets: explosion,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 400,
          onComplete: () => explosion.destroy()
        })
        break
        
      case 'ice':
        // Create ice crystal visual
        const ice = this.add.graphics()
        ice.fillStyle(0x4444FF, 0.6)
        ice.fillTriangle(0, -10, 7, 5, -7, 5)
        ice.setPosition(pos.x, pos.y)
        
        this.tweens.add({
          targets: ice,
          alpha: 0,
          duration: 500,
          onComplete: () => ice.destroy()
        })
        break
        
      case 'lightning':
        // Create lightning flash
        const flash = this.add.graphics()
        flash.fillStyle(0xFFFF44, 1)
        flash.fillCircle(pos.x, pos.y, 15)
        
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy()
        })
        break
    }
  }

  private createLightningChain(from: {x: number, y: number}, to: {x: number, y: number}): void {
    const chain = this.add.graphics()
    chain.lineStyle(2, 0xFFFF44, 1)
    chain.lineBetween(from.x, from.y, to.x, to.y)
    
    this.tweens.add({
      targets: chain,
      alpha: 0,
      duration: 300,
      onComplete: () => chain.destroy()
    })
  }
}

