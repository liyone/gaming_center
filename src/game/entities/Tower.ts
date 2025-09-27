export default class Tower {
  public sprite!: Phaser.GameObjects.Graphics
  public body!: Phaser.Physics.Arcade.Body
  private scene: Phaser.Scene
  private rangeCircle: Phaser.GameObjects.Graphics | null = null
  
  // Tower properties
  public damage: number = 25
  public range: number = 80
  public fireRate: number = 1000 // milliseconds between shots
  public cost: number = 50 // cost to place tower
  public level: number = 1
  
  // Visual properties
  private readonly TOWER_SIZE = 16
  private readonly TOWER_COLOR = 0x4A5568 // Dark gray
  private readonly RANGE_COLOR = 0x68D391 // Light green
  
  // Combat state
  private lastFireTime: number = 0
  private isShowingRange: boolean = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    
    // Create tower sprite
    this.createSprite(x, y)
    
    // Enable physics for collision detection
    this.scene.physics.add.existing(this.sprite)
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.body.setSize(this.TOWER_SIZE * 2, this.TOWER_SIZE * 2)
    this.body.setImmovable(true) // Towers don't move when hit
    
    // Create range indicator (hidden by default)
    this.createRangeIndicator()
    
    console.log('Tower created at', x, y)
  }

  private createSprite(x: number, y: number): void {
    this.sprite = this.scene.add.graphics()
    this.sprite.setPosition(x, y)
    
    // Draw tower base
    this.updateSprite()
    
    // Add interaction for showing range
    this.sprite.setInteractive(
      new Phaser.Geom.Circle(0, 0, this.TOWER_SIZE),
      Phaser.Geom.Circle.Contains
    )
    
    // Show range on hover
    this.sprite.on('pointerover', () => {
      this.showRange()
    })
    
    this.sprite.on('pointerout', () => {
      this.hideRange()
    })
    
    // Click to upgrade (future feature)
    this.sprite.on('pointerdown', () => {
      this.handleClick()
    })
  }

  private updateSprite(): void {
    this.sprite.clear()
    
    // Draw tower base (circular)
    this.sprite.fillStyle(this.TOWER_COLOR, 1)
    this.sprite.fillCircle(0, 0, this.TOWER_SIZE)
    
    // Draw tower border
    this.sprite.lineStyle(2, 0x2D3748, 1) // Darker border
    this.sprite.strokeCircle(0, 0, this.TOWER_SIZE)
    
    // Draw tower cannon (rectangle pointing right)
    this.sprite.fillStyle(0x2D3748, 1)
    this.sprite.fillRect(0, -4, this.TOWER_SIZE + 4, 8)
    
    // Draw level indicator
    if (this.level > 1) {
      this.sprite.fillStyle(0xF7FAFC, 1) // White
      this.sprite.fillCircle(0, 0, 6)
      // Add level number in future iterations
    }
    
    // Draw targeting reticle (small cross at center)
    this.sprite.lineStyle(1, 0xF7FAFC, 0.8)
    this.sprite.lineBetween(-3, 0, 3, 0)
    this.sprite.lineBetween(0, -3, 0, 3)
  }

  private createRangeIndicator(): void {
    this.rangeCircle = this.scene.add.graphics()
    this.rangeCircle.setPosition(this.sprite.x, this.sprite.y)
    this.hideRange() // Start hidden
  }

  public showRange(): void {
    if (!this.rangeCircle || this.isShowingRange) return
    
    this.isShowingRange = true
    this.rangeCircle.clear()
    
    // Draw range circle
    this.rangeCircle.lineStyle(2, this.RANGE_COLOR, 0.6)
    this.rangeCircle.strokeCircle(0, 0, this.range)
    
    // Fill with semi-transparent color
    this.rangeCircle.fillStyle(this.RANGE_COLOR, 0.1)
    this.rangeCircle.fillCircle(0, 0, this.range)
    
    this.rangeCircle.setVisible(true)
  }

  public hideRange(): void {
    if (!this.rangeCircle || !this.isShowingRange) return
    
    this.isShowingRange = false
    this.rangeCircle.setVisible(false)
    this.rangeCircle.clear()
  }

  private handleClick(): void {
    console.log('Tower clicked! Level:', this.level)
    
    // Visual feedback for click
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power1'
    })
    
    // Future: Open upgrade menu or show tower info
  }

  public canAttack(currentTime: number): boolean {
    return (currentTime - this.lastFireTime) >= this.fireRate
  }

  public findTarget(pigeons: Array<{ getPosition(): { x: number, y: number }, isAlive: boolean }>): { x: number, y: number } | null {
    if (!pigeons || pigeons.length === 0) return null
    
    const towerPos = { x: this.sprite.x, y: this.sprite.y }
    
    // Find the closest pigeon within range
    let closestPigeon = null
    let closestDistance = Infinity
    
    for (const pigeon of pigeons) {
      if (!pigeon.isAlive) continue
      
      const pigeonPos = pigeon.getPosition()
      const distance = Phaser.Math.Distance.Between(
        towerPos.x, towerPos.y,
        pigeonPos.x, pigeonPos.y
      )
      
      if (distance <= this.range && distance < closestDistance) {
        closestDistance = distance
        closestPigeon = pigeonPos
      }
    }
    
    return closestPigeon
  }

  public attack(targetPosition: { x: number, y: number }, currentTime: number): void {
    if (!this.canAttack(currentTime)) return
    
    this.lastFireTime = currentTime
    
    // Rotate tower to face target
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      targetPosition.x, targetPosition.y
    )
    this.sprite.setRotation(angle)
    
    // Visual feedback for firing
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: 'Power2'
    })
    
    // Emit event for projectile creation (next sub-task)
    this.scene.events.emit('towerFired', {
      tower: this,
      startPosition: { x: this.sprite.x, y: this.sprite.y },
      targetPosition: targetPosition,
      damage: this.damage
    })
    
    console.log('Tower fired at target:', targetPosition)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(time: number, _delta: number): void {
    // Tower update logic will be expanded in future sub-tasks
    // For now, towers are stationary and attack logic is handled by GameScene
  }

  public upgrade(): boolean {
    // Simple upgrade system
    if (this.level >= 3) return false // Max level
    
    this.level++
    this.damage += 10
    this.range += 10
    this.fireRate = Math.max(500, this.fireRate - 100) // Faster firing, min 500ms
    
    // Update visual
    this.updateSprite()
    this.createRangeIndicator() // Recreate with new range
    
    console.log('Tower upgraded to level', this.level)
    return true
  }

  public destroy(): void {
    console.log('Destroying tower')
    
    if (this.rangeCircle) {
      this.rangeCircle.destroy()
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
    const size = this.TOWER_SIZE * 2
    return new Phaser.Geom.Rectangle(
      this.sprite.x - size / 2,
      this.sprite.y - size / 2,
      size,
      size
    )
  }

  public getRange(): number {
    return this.range
  }

  public getDamage(): number {
    return this.damage
  }

  public getCost(): number {
    return this.cost
  }

  public getLevel(): number {
    return this.level
  }

  // Static method for placement validation
  public static isValidPlacement(x: number, y: number, existingTowers: Array<{ getPosition(): { x: number, y: number } }>): boolean {
    const TOWER_SIZE = 16
    const MIN_SPACING = TOWER_SIZE * 3 // Minimum distance between towers
    
    // Check if position is too close to existing towers
    for (const tower of existingTowers) {
      const distance = Phaser.Math.Distance.Between(
        x, y,
        tower.getPosition().x, tower.getPosition().y
      )
      
      if (distance < MIN_SPACING) {
        return false
      }
    }
    
    // Check if position is on the pigeon path (approximate)
    // Path goes from (0,300) through curves to (800,300)
    const PATH_WIDTH = 60
    const PATH_Y = 300
    
    // Simple path collision check - more sophisticated in real implementation
    if (Math.abs(y - PATH_Y) < PATH_WIDTH / 2 && x >= 0 && x <= 800) {
      return false
    }
    
    // Check bounds
    if (x < TOWER_SIZE || x > 800 - TOWER_SIZE || 
        y < TOWER_SIZE || y > 600 - TOWER_SIZE) {
      return false
    }
    
    return true
  }
}
