interface TowerConfig {
  id: string
  name: string
  description: string
  damage: number
  range: number
  fireRate: number
  cost: number
  color: number
  projectileColor: number
  maxLevel: number
  upgradeCostMultiplier: number
}

export default class Tower {
  public sprite!: Phaser.GameObjects.Graphics
  public body!: Phaser.Physics.Arcade.Body
  private scene: Phaser.Scene
  private rangeCircle: Phaser.GameObjects.Graphics | null = null
  
  // Tower properties
  public damage: number
  public range: number
  public fireRate: number
  public cost: number
  public level: number = 1
  public towerType: string
  private config: TowerConfig
  
  // Visual properties
  private readonly TOWER_SIZE = 16
  private readonly RANGE_COLOR = 0x68D391 // Light green
  
  // Combat state
  private lastFireTime: number = 0
  private isShowingRange: boolean = false

  constructor(scene: Phaser.Scene, x: number, y: number, towerType: string = 'basic') {
    this.scene = scene
    this.towerType = towerType
    
    // Load tower configuration
    this.config = this.loadTowerConfig(towerType)
    
    // Set properties from config
    this.damage = this.config.damage
    this.range = this.config.range
    this.fireRate = this.config.fireRate
    this.cost = this.config.cost
    
    // Create tower sprite
    this.createSprite(x, y)
    
    // Enable physics for collision detection
    this.scene.physics.add.existing(this.sprite)
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.body.setSize(this.TOWER_SIZE * 2, this.TOWER_SIZE * 2)
    this.body.setImmovable(true) // Towers don't move when hit
    
    // Create range indicator (hidden by default)
    this.createRangeIndicator()
    
    console.log(`${this.config.name} created at`, x, y)
  }

  private loadTowerConfig(towerType: string): TowerConfig {
    // Default configurations - in a real app, this would load from JSON
    const configs: Record<string, TowerConfig> = {
      basic: {
        id: 'basic',
        name: 'Basic Tower',
        description: 'Balanced damage and fire rate',
        damage: 25,
        range: 80,
        fireRate: 1000,
        cost: 50,
        color: 0x4A5568,
        projectileColor: 0xFFD700,
        maxLevel: 3,
        upgradeCostMultiplier: 1.5
      },
      rapidFire: {
        id: 'rapidFire',
        name: 'Rapid-Fire Tower',
        description: 'Fast firing rate, lower damage',
        damage: 15,
        range: 70,
        fireRate: 400,
        cost: 75,
        color: 0xE53E3E,
        projectileColor: 0xFF6B6B,
        maxLevel: 3,
        upgradeCostMultiplier: 1.6
      },
      heavyDamage: {
        id: 'heavyDamage',
        name: 'Heavy Damage Tower',
        description: 'High damage, slow firing',
        damage: 60,
        range: 90,
        fireRate: 2000,
        cost: 100,
        color: 0x553C9A,
        projectileColor: 0xB794F6,
        maxLevel: 3,
        upgradeCostMultiplier: 2.0
      },
      sniper: {
        id: 'sniper',
        name: 'Sniper Tower',
        description: 'Extreme range, precise shots',
        damage: 80,
        range: 150,
        fireRate: 3000,
        cost: 150,
        color: 0x2F855A,
        projectileColor: 0x48BB78,
        maxLevel: 3,
        upgradeCostMultiplier: 2.5
      }
    }
    
    return configs[towerType] || configs.basic
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
    
    // Draw tower base (circular) using config color
    this.sprite.fillStyle(this.config.color, 1)
    this.sprite.fillCircle(0, 0, this.TOWER_SIZE)
    
    // Draw tower border (darker version of main color)
    const borderColor = this.darkenColor(this.config.color)
    this.sprite.lineStyle(2, borderColor, 1)
    this.sprite.strokeCircle(0, 0, this.TOWER_SIZE)
    
    // Draw tower cannon (rectangle pointing right)
    this.sprite.fillStyle(borderColor, 1)
    this.sprite.fillRect(0, -4, this.TOWER_SIZE + 4, 8)
    
    // Draw tower type indicator based on type
    this.drawTowerTypeIndicator()
    
    // Draw level indicator
    if (this.level > 1) {
      this.sprite.fillStyle(0xF7FAFC, 1) // White
      this.sprite.fillCircle(0, 0, 6)
      
      // Draw level number
      const levelText = this.scene.add.text(this.sprite.x, this.sprite.y, this.level.toString(), {
        fontSize: '10px',
        color: '#000000'
      }).setOrigin(0.5)
      
      // Remove level text after a short delay to prevent memory leaks
      this.scene.time.delayedCall(100, () => {
        if (levelText) levelText.destroy()
      })
    }
    
    // Draw targeting reticle (small cross at center)
    this.sprite.lineStyle(1, 0xF7FAFC, 0.8)
    this.sprite.lineBetween(-3, 0, 3, 0)
    this.sprite.lineBetween(0, -3, 0, 3)
  }

  private drawTowerTypeIndicator(): void {
    // Draw small shape to indicate tower type
    const indicatorColor = this.config.projectileColor
    
    switch (this.towerType) {
      case 'rapidFire':
        // Draw small triangles for rapid fire
        this.sprite.fillStyle(indicatorColor, 0.8)
        this.sprite.fillTriangle(-6, -8, -2, -8, -4, -12)
        this.sprite.fillTriangle(2, -8, 6, -8, 4, -12)
        break
      case 'heavyDamage':
        // Draw diamond for heavy damage
        this.sprite.fillStyle(indicatorColor, 0.8)
        this.sprite.fillTriangle(0, -12, -4, -8, 4, -8)
        break
      case 'sniper':
        // Draw crosshair for sniper
        this.sprite.lineStyle(2, indicatorColor, 0.8)
        this.sprite.lineBetween(-8, 0, -12, 0)
        this.sprite.lineBetween(8, 0, 12, 0)
        this.sprite.lineBetween(0, -8, 0, -12)
        this.sprite.lineBetween(0, 8, 0, 12)
        break
      case 'basic':
      default:
        // Draw simple dot for basic tower
        this.sprite.fillStyle(indicatorColor, 0.8)
        this.sprite.fillCircle(0, -10, 2)
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

  public findTarget(pigeons: Array<{ 
    getPosition(): { x: number, y: number }, 
    isAlive: boolean,
    getVelocity?(): { x: number, y: number },
    getPredictedPosition?(timeAhead: number): { x: number, y: number }
  }>): { x: number, y: number } | null {
    if (!pigeons || pigeons.length === 0) return null
    
    const towerPos = { x: this.sprite.x, y: this.sprite.y }
    
    // Find the closest pigeon within range with predictive targeting
    let bestTarget = null
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
        
        // Use predictive targeting if pigeon has velocity info
        if (pigeon.getVelocity && pigeon.getPredictedPosition) {
          const velocity = pigeon.getVelocity()
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
          
          // Only use predictive targeting if pigeon is moving fast enough
          if (speed > 10) {
            // Calculate time for projectile to reach current pigeon position
            const PROJECTILE_SPEED = 450 // pixels per second - matches Projectile.ts
            const timeToReach = distance / PROJECTILE_SPEED
            
            // Get predicted position
            const predictedPos = pigeon.getPredictedPosition(timeToReach)
            
            // Verify predicted position is still in range
            const predictedDistance = Phaser.Math.Distance.Between(towerPos.x, towerPos.y, predictedPos.x, predictedPos.y)
            
            if (predictedDistance <= this.range) {
              bestTarget = predictedPos
              console.log(`🎯 Predictive targeting: Current (${pigeonPos.x.toFixed(1)}, ${pigeonPos.y.toFixed(1)}) → Predicted (${predictedPos.x.toFixed(1)}, ${predictedPos.y.toFixed(1)}) in ${timeToReach.toFixed(2)}s`)
            } else {
              // If predicted position is out of range, target current position
              bestTarget = pigeonPos
              console.log(`⚠️ Predicted position out of range, using current position`)
            }
          } else {
            // Pigeon is stationary, target current position
            bestTarget = pigeonPos
            console.log(`🐌 Pigeon moving slowly, targeting current position`)
          }
        } else {
          // No velocity info available, use current position
          bestTarget = pigeonPos
          console.log(`📍 No velocity data, targeting current position`)
        }
      }
    }
    
    return bestTarget
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
    
    // Emit event for projectile creation with projectile color
    this.scene.events.emit('towerFired', {
      tower: this,
      startPosition: { x: this.sprite.x, y: this.sprite.y },
      targetPosition: targetPosition,
      damage: this.damage,
      projectileColor: this.config.projectileColor,
      towerType: this.towerType
    })
    
    console.log(`${this.config.name} fired at target:`, targetPosition, `Damage: ${this.damage}`)
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

  public getTowerType(): string {
    return this.towerType
  }

  public getTowerName(): string {
    return this.config.name
  }

  public getDescription(): string {
    return this.config.description
  }

  public getProjectileColor(): number {
    return this.config.projectileColor
  }

  // Static method to get all available tower types
  public static getAvailableTowerTypes(): TowerConfig[] {
    return [
      {
        id: 'basic',
        name: 'Basic Tower',
        description: 'Balanced damage and fire rate',
        damage: 25,
        range: 80,
        fireRate: 1000,
        cost: 50,
        color: 0x4A5568,
        projectileColor: 0xFFD700,
        maxLevel: 3,
        upgradeCostMultiplier: 1.5
      },
      {
        id: 'rapidFire',
        name: 'Rapid-Fire Tower',
        description: 'Fast firing rate, lower damage',
        damage: 15,
        range: 70,
        fireRate: 400,
        cost: 75,
        color: 0xE53E3E,
        projectileColor: 0xFF6B6B,
        maxLevel: 3,
        upgradeCostMultiplier: 1.6
      },
      {
        id: 'heavyDamage',
        name: 'Heavy Damage Tower',
        description: 'High damage, slow firing',
        damage: 60,
        range: 90,
        fireRate: 2000,
        cost: 100,
        color: 0x553C9A,
        projectileColor: 0xB794F6,
        maxLevel: 3,
        upgradeCostMultiplier: 2.0
      },
      {
        id: 'sniper',
        name: 'Sniper Tower',
        description: 'Extreme range, precise shots',
        damage: 80,
        range: 150,
        fireRate: 3000,
        cost: 150,
        color: 0x2F855A,
        projectileColor: 0x48BB78,
        maxLevel: 3,
        upgradeCostMultiplier: 2.5
      }
    ]
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
