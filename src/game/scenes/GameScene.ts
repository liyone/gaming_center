// Interface for Pigeon entity to avoid using 'any'
interface IPigeon {
  isAlive: boolean
  startMoving(): void
  update(time: number, delta: number): void
  getReward(): number
}

export default class GameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics
  private titleText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private pathGraphics!: Phaser.GameObjects.Graphics
  
  // Game entities
  private pigeons: IPigeon[] = []
  private spawnTimer: Phaser.Time.TimerEvent | null = null
  private PigeonClass: new (scene: Phaser.Scene, x: number, y: number) => IPigeon | null = null
  
  // Game state
  private playerHealth: number = 10
  private score: number = 0
  private isGameActive: boolean = true
  
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
    
    // Set up pigeon management
    this.setupPigeonEvents()
    
    // Start pigeon spawning
    this.startPigeonSpawning()
    
    // Add welcome message
    this.showWelcomeMessage()
  }

  private async loadGameClasses(): Promise<void> {
    try {
      const { default: Pigeon } = await import('../entities/Pigeon')
      this.PigeonClass = Pigeon as new (scene: Phaser.Scene, x: number, y: number) => IPigeon
      console.log('GameScene: Pigeon class loaded successfully')
    } catch (error) {
      console.error('GameScene: Failed to load Pigeon class:', error)
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
    this.statusText = this.add.text(400, 570, 'Press SPACE to spawn a pigeon manually!', {
      fontSize: '16px',
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
          gameStatsText.setText(
            `❤️ Health: ${this.playerHealth}\n` +
            `🎯 Score: ${this.score}\n` +
            `🐦 Pigeons: ${this.pigeons.length}\n` +
            `⚡ Status: ${this.isGameActive ? 'Active' : 'Game Over'}`
          )
        }
      },
      loop: true
    })
    
    // Debug info
    this.add.text(10, 120, 'MVP 1.0 - Core Proof of Concept\nPigeon Entity Testing', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 }
    })
  }

  private setupInput(): void {
    // Add click handling for testing
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y)
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
  }

  private handleClick(x: number, y: number): void {
    // Visual feedback for clicks
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
    this.statusText.setText(`Clicked at (${Math.round(x)}, ${Math.round(y)}) - Scene Working!`)
    
    console.log('GameScene: Click detected at', x, y)
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

  private setupPigeonEvents(): void {
    // Listen for pigeon events
    this.events.on('pigeonEscaped', (pigeon: IPigeon) => {
      this.handlePigeonEscape(pigeon)
    })
    
    this.events.on('pigeonEliminated', (pigeon: IPigeon) => {
      this.handlePigeonElimination(pigeon)
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
    console.log('Pigeon eliminated! Player gains score.')
    
    // Remove from pigeons array
    const index = this.pigeons.indexOf(pigeon)
    if (index > -1) {
      this.pigeons.splice(index, 1)
    }
    
    // Player gains score
    this.score += pigeon.getReward()
    
    // Update status
    this.statusText.setText(`Pigeon eliminated! Score: ${this.score}`)
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
    
    // Remove dead pigeons that have finished their elimination animation
    this.pigeons = this.pigeons.filter(pigeon => pigeon.isAlive)
  }
}
