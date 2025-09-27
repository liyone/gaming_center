export default class Pigeon {
  public sprite!: Phaser.GameObjects.Graphics
  public body!: Phaser.Physics.Arcade.Body
  private scene: Phaser.Scene
  private path: Phaser.Curves.Path
  private pathFollower: Phaser.GameObjects.PathFollower | null = null
  
  // Pigeon properties
  public health: number = 100
  public maxHealth: number = 100
  public speed: number = 50 // pixels per second
  public isAlive: boolean = true
  public reward: number = 10 // coins earned when eliminated
  
  // Visual properties
  private readonly PIGEON_SIZE = 12
  private healthBar: Phaser.GameObjects.Graphics | null = null
  
  // Movement tracking
  private pathProgress: number = 0
  private isMoving: boolean = true
  private velocity: { x: number, y: number } = { x: 0, y: 0 }
  private lastPosition: { x: number, y: number } = { x: 0, y: 0 }

  constructor(scene: Phaser.Scene, startX: number = 0, startY: number = 300) {
    this.scene = scene
    
    // Create the pigeon path (same as GameScene path)
    this.path = new Phaser.Curves.Path(0, 300)
    this.path.lineTo(200, 300)
    this.path.quadraticBezierTo(400, 200, 600, 300)
    this.path.lineTo(800, 300)
    
    // Create pigeon sprite first
    this.createSprite(startX, startY)
    
    // Initialize position tracking
    this.lastPosition.x = startX
    this.lastPosition.y = startY
    
    // Enable physics after sprite is created
    this.scene.physics.add.existing(this.sprite)
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.body.setSize(this.PIGEON_SIZE * 2, this.PIGEON_SIZE * 2)
    
    // Create health bar after sprite is ready
    this.createHealthBar()
    
    console.log('Pigeon created at', startX, startY)
  }

  private createSprite(x: number, y: number): void {
    this.sprite = this.scene.add.graphics()
    this.sprite.setPosition(x, y)
    
    // Draw a simple pigeon shape
    this.updateSprite()
  }

  private updateSprite(): void {
    this.sprite.clear()
    
    if (!this.isAlive) {
      // Draw "dead" pigeon (grayed out)
      this.sprite.fillStyle(0x888888, 0.5)
      this.sprite.fillCircle(0, 0, this.PIGEON_SIZE)
      return
    }
    
    // Draw pigeon body (gray circle)
    this.sprite.fillStyle(0x808080, 1)
    this.sprite.fillCircle(0, 0, this.PIGEON_SIZE)
    
    // Draw pigeon head (smaller dark gray circle)
    this.sprite.fillStyle(0x505050, 1)
    this.sprite.fillCircle(this.PIGEON_SIZE * 0.7, 0, this.PIGEON_SIZE * 0.6)
    
    // Draw wings (oval shapes)
    this.sprite.fillStyle(0x606060, 1)
    this.sprite.fillEllipse(-this.PIGEON_SIZE * 0.3, -this.PIGEON_SIZE * 0.5, this.PIGEON_SIZE * 0.8, this.PIGEON_SIZE * 0.4)
    this.sprite.fillEllipse(-this.PIGEON_SIZE * 0.3, this.PIGEON_SIZE * 0.5, this.PIGEON_SIZE * 0.8, this.PIGEON_SIZE * 0.4)
    
    // Draw beak (small orange triangle)
    this.sprite.fillStyle(0xFFA500, 1)
    this.sprite.fillTriangle(
      this.PIGEON_SIZE * 1.2, 0,
      this.PIGEON_SIZE * 1.5, -3,
      this.PIGEON_SIZE * 1.5, 3
    )
    
    // Draw eye (small white circle with black center)
    this.sprite.fillStyle(0xFFFFFF, 1)
    this.sprite.fillCircle(this.PIGEON_SIZE * 0.8, -this.PIGEON_SIZE * 0.2, 3)
    this.sprite.fillStyle(0x000000, 1)
    this.sprite.fillCircle(this.PIGEON_SIZE * 0.8, -this.PIGEON_SIZE * 0.2, 1)
  }

  private createHealthBar(): void {
    this.healthBar = this.scene.add.graphics()
    this.updateHealthBar()
  }

  private updateHealthBar(): void {
    if (!this.healthBar || !this.isAlive) return
    
    this.healthBar.clear()
    
    const barWidth = this.PIGEON_SIZE * 2
    const barHeight = 4
    const healthPercent = this.health / this.maxHealth
    
    // Background (red)
    this.healthBar.fillStyle(0xFF0000, 0.8)
    this.healthBar.fillRect(-barWidth / 2, -this.PIGEON_SIZE - 8, barWidth, barHeight)
    
    // Health (green to yellow to red based on health)
    let healthColor = 0x00FF00 // Green
    if (healthPercent < 0.5) {
      healthColor = 0xFFFF00 // Yellow
    }
    if (healthPercent < 0.25) {
      healthColor = 0xFF8800 // Orange
    }
    
    this.healthBar.fillStyle(healthColor, 0.9)
    this.healthBar.fillRect(-barWidth / 2, -this.PIGEON_SIZE - 8, barWidth * healthPercent, barHeight)
    
    // Position health bar above pigeon
    this.healthBar.setPosition(this.sprite.x, this.sprite.y)
  }

  public startMoving(): void {
    if (!this.isAlive) return
    
    this.isMoving = true
    
    // Create path follower for smooth movement along the curved path
    this.pathFollower = this.scene.add.follower(this.path, 0, 300, '')
    this.pathFollower.setVisible(false) // Invisible helper for path following
    
    // Start following the path
    this.pathFollower.startFollow({
      duration: (this.path.getLength() / this.speed) * 1000, // Calculate duration based on speed
      ease: 'Linear',
      repeat: 0,
      rotateToPath: false,
      onUpdate: () => {
        if (this.pathFollower && this.isAlive) {
          // Update pigeon position to match path follower
          this.sprite.setPosition(this.pathFollower.x, this.pathFollower.y)
          this.updateHealthBar()
        }
      },
      onComplete: () => {
        this.reachEnd()
      }
    })
    
    console.log('Pigeon started moving along path')
  }

  public takeDamage(damage: number): boolean {
    if (!this.isAlive) {
      console.log('🚫 Pigeon already dead, no damage applied')
      return false
    }
    
    // Validate damage value
    if (typeof damage !== 'number' || damage <= 0) {
      console.log(`🚫 Invalid damage value: ${damage}`)
      return false
    }
    
    console.log(`🩸 Pigeon taking ${damage} damage. Health before: ${this.health}`)
    
    const oldHealth = this.health
    this.health = Math.max(0, this.health - damage) // Ensure health doesn't go below 0
    this.updateHealthBar()
    
    console.log(`🩸 Pigeon health: ${oldHealth} → ${this.health} (damage: ${damage})`)
    
    // Flash effect when taking damage
    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          if (this.sprite) {
            this.sprite.alpha = 1 // Ensure alpha is reset
          }
        }
      })
    }
    
    if (this.health <= 0) {
      console.log('💀 Pigeon health <= 0, eliminating...')
      this.eliminate()
      return true // Pigeon eliminated
    }
    
    return false // Pigeon still alive
  }

  private eliminate(): void {
    if (!this.isAlive) return
    
    this.isAlive = false
    this.isMoving = false
    
    console.log('Pigeon eliminated! Reward:', this.reward)
    
    // Stop path following
    if (this.pathFollower) {
      this.pathFollower.stopFollow()
      this.pathFollower.destroy()
      this.pathFollower = null
    }
    
    // Play elimination animation
    this.playEliminationEffect()
    
    // Update sprite to show eliminated state
    this.updateSprite()
    
    // Remove after animation
    this.scene.time.delayedCall(1000, () => {
      this.destroy()
    })
  }

  private playEliminationEffect(): void {
    // Explosion effect with particles
    const explosionGraphics = this.scene.add.graphics()
    explosionGraphics.setPosition(this.sprite.x, this.sprite.y)
    
    // Create simple explosion particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i
      const particle = this.scene.add.graphics()
      particle.fillStyle(0xFFAA00, 1)
      particle.fillCircle(0, 0, 3)
      particle.setPosition(this.sprite.x, this.sprite.y)
      
      this.scene.tweens.add({
        targets: particle,
        x: this.sprite.x + Math.cos(angle) * 30,
        y: this.sprite.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 500,
        onComplete: () => particle.destroy()
      })
    }
    
    // Screen shake effect
    this.scene.cameras.main.shake(200, 0.01)
  }

  private reachEnd(): void {
    if (!this.isAlive) return
    
    console.log('Pigeon reached the end! Player loses health.')
    
    // Pigeon escapes - player loses health
    this.destroy()
    
    // Emit event that can be caught by GameScene
    this.scene.events.emit('pigeonEscaped', this)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: number, delta: number): void {
    if (!this.isAlive || !this.isMoving) return
    
    // Track velocity for predictive targeting
    const currentPos = this.getPosition()
    
    // Calculate velocity based on position change
    const deltaTime = delta / 1000 // Convert to seconds
    if (deltaTime > 0) {
      this.velocity.x = (currentPos.x - this.lastPosition.x) / deltaTime
      this.velocity.y = (currentPos.y - this.lastPosition.y) / deltaTime
    }
    
    // Update last position
    this.lastPosition.x = currentPos.x
    this.lastPosition.y = currentPos.y
  }

  public destroy(): void {
    console.log('Destroying pigeon')
    
    if (this.pathFollower) {
      this.pathFollower.stopFollow()
      this.pathFollower.destroy()
    }
    
    if (this.healthBar) {
      this.healthBar.destroy()
    }
    
    if (this.sprite) {
      this.sprite.destroy()
    }
  }

  // Getters for game logic
  public getPosition(): { x: number, y: number } {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  public getBounds(): Phaser.Geom.Rectangle {
    // Create bounds based on pigeon size and position
    const size = this.PIGEON_SIZE * 2
    return new Phaser.Geom.Rectangle(
      this.sprite.x - size / 2,
      this.sprite.y - size / 2,
      size,
      size
    )
  }

  public getReward(): number {
    return this.reward
  }

  public getVelocity(): { x: number, y: number } {
    return { x: this.velocity.x, y: this.velocity.y }
  }

  public getPredictedPosition(timeAhead: number): { x: number, y: number } {
    const currentPos = this.getPosition()
    return {
      x: currentPos.x + (this.velocity.x * timeAhead),
      y: currentPos.y + (this.velocity.y * timeAhead)
    }
  }
}
