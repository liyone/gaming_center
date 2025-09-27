// Interface for Pigeon entity to avoid using 'any'
interface IPigeon {
  isAlive: boolean
  startMoving(): void
  update(time: number, delta: number): void
  getReward(): number
  getPosition(): { x: number, y: number }
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
  hitPigeon(pigeon: IPigeon): boolean
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
  private PigeonClass: new (scene: Phaser.Scene, x: number, y: number) => IPigeon | null = null
  private TowerClass: new (scene: Phaser.Scene, x: number, y: number) => ITower | null = null
  private ProjectileClass: new (scene: Phaser.Scene, startX: number, startY: number, targetX: number, targetY: number, damage: number) => IProjectile | null = null
  
  // Game state
  private playerHealth: number = 10
  private score: number = 0
  private coins: number = 100 // Starting currency for towers
  private isGameActive: boolean = true
  
  // Tower placement
  private isPlacingTower: boolean = false
  private placementPreview: Phaser.GameObjects.Graphics | null = null
  
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
    
    // Set up input handling
    this.setupInput()
    
    // Set up game events
    this.setupGameEvents()
    
    // Start pigeon spawning
    this.startPigeonSpawning()
    
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
    this.statusText = this.add.text(400, 570, 'Press SPACE to spawn pigeon | Press T to place towers | Click towers to see range', {
      fontSize: '14px',
      color: '#333333',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5)
    
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
          gameStatsText.setText(
            `❤️ Health: ${this.playerHealth}\n` +
            `🎯 Score: ${this.score}\n` +
            `💰 Coins: ${this.coins}\n` +
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
    this.add.text(10, 160, 'MVP 1.0 - Core Proof of Concept\nTowers, Pigeons & Projectiles', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 }
    })
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
    
    // Add spacebar for manual pigeon spawning
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    if (spaceKey) {
      spaceKey.on('down', () => {
        this.spawnPigeon()
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
    
    // Update status
    this.statusText.setText('Tower Placement Mode - Click to place tower (ESC to cancel)')
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
    this.statusText.setText('Tower placement cancelled - Press T to place towers again')
  }

  private updatePlacementPreview(x: number, y: number): void {
    if (!this.placementPreview) return
    
    this.placementPreview.clear()
    this.placementPreview.setPosition(x, y)
    
    // Check if placement is valid
    const isValid = this.isValidTowerPlacement(x, y)
    const color = isValid ? 0x00FF00 : 0xFF0000 // Green if valid, red if invalid
    const alpha = isValid ? 0.6 : 0.4
    
    // Draw tower preview
    this.placementPreview.fillStyle(color, alpha)
    this.placementPreview.fillCircle(0, 0, 16)
    
    // Draw range preview
    this.placementPreview.lineStyle(2, color, alpha * 0.5)
    this.placementPreview.strokeCircle(0, 0, 80) // Default tower range
    
    // Draw placement guide
    if (!isValid) {
      this.placementPreview.lineStyle(2, 0xFF0000, 0.8)
      this.placementPreview.lineBetween(-20, -20, 20, 20)
      this.placementPreview.lineBetween(-20, 20, 20, -20)
    }
  }

  private isValidTowerPlacement(x: number, y: number): boolean {
    if (!this.TowerClass) return false
    
    // Check if player has enough coins
    const towerCost = 50 // Default tower cost
    if (this.coins < towerCost) return false
    
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
      this.statusText.setText('Cannot place tower here! Check path/spacing/cost')
      return
    }
    
    if (!this.TowerClass) {
      console.log('Tower class not loaded')
      return
    }
    
    // Create new tower
    const tower = new this.TowerClass(this, x, y)
    this.towers.push(tower)
    
    // Deduct cost
    const towerCost = tower.getCost()
    this.coins -= towerCost
    
    // Cancel placement mode
    this.cancelTowerPlacement()
    
    // Update status
    this.statusText.setText(`Tower placed! Cost: ${towerCost} coins. Press T for more towers.`)
    
    console.log('Tower placed at', x, y, 'Cost:', towerCost)
  }

  private handleTowerFire(fireData: {
    tower: ITower,
    startPosition: { x: number, y: number },
    targetPosition: { x: number, y: number },
    damage: number
  }): void {
    if (!this.ProjectileClass) {
      console.log('Projectile class not loaded yet')
      return
    }

    console.log('Tower fired! Creating projectile:', fireData)

    // Create new projectile
    const projectile = new this.ProjectileClass(
      this,
      fireData.startPosition.x,
      fireData.startPosition.y,
      fireData.targetPosition.x,
      fireData.targetPosition.y,
      fireData.damage
    )

    this.projectiles.push(projectile)

    // Update status
    this.statusText.setText(`Tower fired! Projectile created (${this.projectiles.length} active)`)
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

  private startPigeonSpawning(): void {
    // Start automatic pigeon spawning every 3 seconds
    this.spawnTimer = this.time.addEvent({
      delay: 3000, // 3 seconds
      callback: () => {
        if (this.isGameActive) {
          this.spawnPigeon()
        }
      },
      loop: true
    })
    
    // Spawn first pigeon immediately
    this.time.delayedCall(1000, () => {
      this.spawnPigeon()
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
    
    // Update status
    this.statusText.setText(`New pigeon spawned! Total: ${this.pigeons.length}`)
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
    
    // Stop spawning
    if (this.spawnTimer) {
      this.spawnTimer.destroy()
      this.spawnTimer = null
    }
    
    // Show game over message
    this.add.text(400, 350, 'GAME OVER!\nAll pigeons have invaded!', {
      fontSize: '36px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center'
    }).setOrigin(0.5)
    
    // Add restart instructions
    this.add.text(400, 450, 'Refresh the page to play again', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5)
  }

  update(time: number, delta: number): void {
    if (!this.isGameActive) return
    
    // Update all pigeons
    this.pigeons.forEach(pigeon => {
      pigeon.update(time, delta)
    })
    
    // Update all towers
    this.towers.forEach(tower => {
      tower.update(time, delta)
      
      // Tower combat logic
      if (tower.canAttack(time)) {
        const target = tower.findTarget(this.pigeons)
        if (target) {
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
  }

  private handleProjectileCollisions(): void {
    // Check each projectile against each pigeon
    for (const projectile of this.projectiles) {
      if (!projectile.isAlive()) continue
      
      for (const pigeon of this.pigeons) {
        if (!pigeon.isAlive) continue
        
        // Check collision using projectile's collision method
        const pigeonPos = pigeon.getPosition()
        const collision = projectile.checkCollisionWith({
          x: pigeonPos.x,
          y: pigeonPos.y,
          radius: 12 // Pigeon collision radius
        })
        
        if (collision) {
          // Projectile hits pigeon
          const eliminated = projectile.hitPigeon(pigeon)
          
          if (eliminated) {
            // Pigeon was eliminated, trigger elimination event
            this.handlePigeonElimination(pigeon)
          }
          
          // Only one collision per projectile per frame
          break
        }
      }
    }
  }
}
