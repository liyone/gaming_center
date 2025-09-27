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
  getCost(): number
  getTowerType(): string
  getTowerName(): string
  getDescription(): string
  getProjectileColor(): number
  findTarget(pigeons: IPigeon[]): { x: number, y: number } | null
  attack(targetPosition: { x: number, y: number }, currentTime: number): void
  canAttack(currentTime: number): boolean
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
  private TowerClass: (new (scene: Phaser.Scene, x: number, y: number, towerType?: string) => ITower) | null = null
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
  private availableTowerTypes: string[] = ['basic', 'rapidFire', 'heavyDamage', 'sniper']
  private currentTowerTypeIndex: number = 0
  
  // Tower selection UI
  private towerSelectorPanel: Phaser.GameObjects.Graphics | null = null
  private towerSelectorIcons: Phaser.GameObjects.Graphics[] = []
  private towerSelectorTexts: Phaser.GameObjects.Text[] = []
  private selectedIndicator: Phaser.GameObjects.Graphics | null = null
  
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
    
    // Create UI elements
    this.createUI()
    
    // Create tower selection UI
    this.createTowerSelectorUI()
    
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
      this.TowerClass = Tower as new (scene: Phaser.Scene, x: number, y: number) => ITower
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
    this.statusText.setText('Wave System Active! Press T to place towers | SPACE to skip waves | Hover towers to see range')
    
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
          
          // Update tower selector affordability
          this.updateTowerSelection()
        }
      },
      loop: true
    })
    
    // Debug info
    this.add.text(10, 180, 'MVP 2.0 - Enhanced Tower Defense\nWave System & Predictive Targeting', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 }
    })
  }

  private createTowerSelectorUI(): void {
    // Create background panel for tower selector
    this.towerSelectorPanel = this.add.graphics()
    this.towerSelectorPanel.fillStyle(0x000000, 0.8)
    this.towerSelectorPanel.fillRoundedRect(520, 10, 270, 140, 8)
    
    // Panel border
    this.towerSelectorPanel.lineStyle(2, 0x4A5568, 1)
    this.towerSelectorPanel.strokeRoundedRect(520, 10, 270, 140, 8)
    
    // Title
    this.add.text(655, 25, 'Tower Selection', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    // Create tower icons and info
    const configs = this.getTowerConfigs()
    const startX = 540
    const startY = 50
    const iconSpacing = 60
    
    for (let i = 0; i < this.availableTowerTypes.length; i++) {
      const towerType = this.availableTowerTypes[i]
      const config = configs[towerType]
      const x = startX + (i * iconSpacing)
      const y = startY
      
      // Create tower icon
      const icon = this.add.graphics()
      this.drawTowerIcon(icon, x, y, towerType, config)
      this.towerSelectorIcons.push(icon)
      
      // Add click interaction to icon
      icon.setInteractive(new Phaser.Geom.Rectangle(x - 25, y - 25, 50, 50), Phaser.Geom.Rectangle.Contains)
      icon.on('pointerdown', () => {
        this.selectTowerType(i)
      })
      
      // Hover effects
      icon.on('pointerover', () => {
        icon.setScale(1.1)
      })
      icon.on('pointerout', () => {
        icon.setScale(1.0)
      })
      
      // Tower cost and stats
      const costText = this.add.text(x, y + 35, `${config.cost}c`, {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#2D3748',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5)
      
      const statsText = this.add.text(x, y + 50, `${config.damage}dmg`, {
        fontSize: '10px',
        color: '#A0AEC0'
      }).setOrigin(0.5)
      
      const keyText = this.add.text(x, y + 65, `[${i + 1}]`, {
        fontSize: '10px',
        color: '#68D391',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      
      this.towerSelectorTexts.push(costText, statsText, keyText)
    }
    
    // Create selection indicator
    this.selectedIndicator = this.add.graphics()
    this.updateTowerSelection()
    
    // Instructions
    this.add.text(655, 125, 'Q: Cycle | 1-4: Select | T: Place', {
      fontSize: '11px',
      color: '#A0AEC0'
    }).setOrigin(0.5)
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

  private updateTowerSelection(): void {
    if (!this.selectedIndicator) return
    
    this.selectedIndicator.clear()
    
    // Draw selection ring around current tower
    const startX = 540
    const startY = 50
    const iconSpacing = 60
    const selectedX = startX + (this.currentTowerTypeIndex * iconSpacing)
    const selectedY = startY
    
    // Animated selection ring
    this.selectedIndicator.lineStyle(3, 0x68D391, 1)
    this.selectedIndicator.strokeCircle(selectedX, selectedY, 18)
    
    // Add selection glow
    this.selectedIndicator.lineStyle(1, 0x68D391, 0.3)
    this.selectedIndicator.strokeCircle(selectedX, selectedY, 22)
    
    // Update cost colors for all towers based on affordability
    const configs = this.getTowerConfigs()
    
    for (let i = 0; i < this.availableTowerTypes.length; i++) {
      const towerType = this.availableTowerTypes[i]
      const config = configs[towerType]
      const costTextIndex = i * 3 // Each tower has 3 text elements (cost, stats, key)
      
      if (this.towerSelectorTexts.length > costTextIndex) {
        const costText = this.towerSelectorTexts[costTextIndex]
        
        if (this.coins >= config.cost) {
          costText.setStyle({ color: '#68D391' }) // Green if affordable
        } else {
          costText.setStyle({ color: '#F56565' }) // Red if too expensive
        }
      }
    }
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
    
    // Add ESC key to cancel tower placement
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    if (escKey) {
      escKey.on('down', () => {
        this.cancelTowerPlacement()
      })
    }
    
    // Add Q key to cycle through tower types
    const qKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    if (qKey) {
      qKey.on('down', () => {
        this.cycleTowerType()
      })
    }
    
    // Add number keys 1-4 for direct tower type selection
    const oneKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
    const twoKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
    const threeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
    const fourKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
    
    if (oneKey) {
      oneKey.on('down', () => {
        this.selectTowerType(0)
      })
    }
    if (twoKey) {
      twoKey.on('down', () => {
        this.selectTowerType(1)
      })
    }
    if (threeKey) {
      threeKey.on('down', () => {
        this.selectTowerType(2)
      })
    }
    if (fourKey) {
      fourKey.on('down', () => {
        this.selectTowerType(3)
      })
    }
  }

  private handleClick(x: number, y: number): void {
    if (this.isPlacingTower) {
      this.attemptTowerPlacement(x, y)
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
    this.statusText.setText(`Clicked at (${Math.round(x)}, ${Math.round(y)}) - Press T to place towers!`)
    
    console.log('GameScene: Click detected at', x, y)
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
    const TowerConstructor = this.TowerClass as typeof import('../entities/Tower').default
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
    const tower = new this.TowerClass(this, x, y, this.currentTowerType)
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

  private cycleTowerType(): void {
    this.currentTowerTypeIndex = (this.currentTowerTypeIndex + 1) % this.availableTowerTypes.length
    this.currentTowerType = this.availableTowerTypes[this.currentTowerTypeIndex]
    this.updateTowerSelection()
  }

  private selectTowerType(index: number): void {
    if (index >= 0 && index < this.availableTowerTypes.length) {
      this.currentTowerTypeIndex = index
      this.currentTowerType = this.availableTowerTypes[index]
      this.updateTowerSelection()
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

    // Create new projectile with tower's color
    const projectile = new this.ProjectileClass(
      this,
      fireData.startPosition.x,
      fireData.startPosition.y,
      fireData.targetPosition.x,
      fireData.targetPosition.y,
      fireData.damage,
      fireData.projectileColor
    )
    
    console.log('Projectile created with damage:', projectile?.getDamage())

    // Only add projectile if it was created successfully
    if (projectile) {
      this.projectiles.push(projectile)
      console.log(`✅ Projectile added to array. Total projectiles: ${this.projectiles.length}`)
    } else {
      console.error('❌ Failed to create projectile!')
    }

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
    
    // Show completion message
    this.showWaveCompleteMessage(waveBonus)
    
    // Prepare next wave after delay
    this.waveStartTimer = this.time.delayedCall(this.timeBetweenWaves, () => {
      this.currentWave++
      this.waveState = 'preparing'
      this.startWave()
    })
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
          
          console.log(`🎯 HIT! Projectile hit pigeon! Distance: ${distance.toFixed(1)}, Damage: ${damage}`)
          console.log(`🐦 Pigeon velocity: (${pigeonVel.x.toFixed(1)}, ${pigeonVel.y.toFixed(1)}) Speed: ${speed.toFixed(1)}`)
          
          // Apply damage directly to pigeon
          const eliminated = pigeon.takeDamage(damage)
          
          // Mark projectile for removal
          projectilesToRemove.push(p)
          hitDetected = true
          
          if (eliminated) {
            console.log('💀 Pigeon eliminated by projectile!')
            // Pigeon was eliminated, trigger elimination event
            this.handlePigeonElimination(pigeon)
          }
          
          // Only one collision per projectile per frame
          break
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
}
