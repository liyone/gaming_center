export default class Projectile {
  public sprite!: Phaser.GameObjects.Graphics
  public body!: Phaser.Physics.Arcade.Body
  private scene: Phaser.Scene
  
  // Projectile properties
  public damage: number
  public speed: number = 300 // pixels per second
  public isActive: boolean = true
  private maxDistance: number = 400 // Max travel distance before self-destruct
  
  // Visual properties
  private readonly PROJECTILE_SIZE = 4
  private readonly PROJECTILE_COLOR = 0xFFD700 // Gold color
  
  // Movement tracking
  private startPosition: { x: number, y: number }
  private targetPosition: { x: number, y: number }
  private distanceTraveled: number = 0
  private velocity!: { x: number, y: number }

  constructor(
    scene: Phaser.Scene, 
    startX: number, 
    startY: number, 
    targetX: number, 
    targetY: number, 
    damage: number
  ) {
    this.scene = scene
    this.damage = damage
    this.startPosition = { x: startX, y: startY }
    this.targetPosition = { x: targetX, y: targetY }
    
    // Calculate velocity vector first
    this.calculateVelocity()
    
    // Create projectile sprite
    this.createSprite(startX, startY)
    
    // Enable physics
    this.scene.physics.add.existing(this.sprite)
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.body.setSize(this.PROJECTILE_SIZE * 2, this.PROJECTILE_SIZE * 2)
    this.body.setCircle(this.PROJECTILE_SIZE)
    
    // Set physics velocity
    this.body.setVelocity(this.velocity.x, this.velocity.y)
    
    console.log('Projectile created:', { startX, startY, targetX, targetY, damage })
  }

  private createSprite(x: number, y: number): void {
    this.sprite = this.scene.add.graphics()
    this.sprite.setPosition(x, y)
    
    // Draw projectile
    this.updateSprite()
  }

  private updateSprite(): void {
    this.sprite.clear()
    
    if (!this.isActive) {
      // Draw "exploded" projectile (small particles)
      this.sprite.fillStyle(0xFF4500, 0.7) // Orange explosion
      this.sprite.fillCircle(0, 0, this.PROJECTILE_SIZE * 1.5)
      return
    }
    
    // Draw main projectile body
    this.sprite.fillStyle(this.PROJECTILE_COLOR, 1)
    this.sprite.fillCircle(0, 0, this.PROJECTILE_SIZE)
    
    // Draw projectile glow effect
    this.sprite.fillStyle(this.PROJECTILE_COLOR, 0.3)
    this.sprite.fillCircle(0, 0, this.PROJECTILE_SIZE * 1.5)
    
    // Draw directional streak
    const streakLength = 8
    const angle = Math.atan2(this.velocity.y, this.velocity.x)
    const streakEndX = -Math.cos(angle) * streakLength
    const streakEndY = -Math.sin(angle) * streakLength
    
    this.sprite.lineStyle(2, this.PROJECTILE_COLOR, 0.8)
    this.sprite.lineBetween(0, 0, streakEndX, streakEndY)
  }

  private calculateVelocity(): void {
    // Calculate direction vector
    const dx = this.targetPosition.x - this.startPosition.x
    const dy = this.targetPosition.y - this.startPosition.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Normalize and apply speed
    this.velocity = {
      x: (dx / distance) * this.speed,
      y: (dy / distance) * this.speed
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: number, _delta: number): void {
    if (!this.isActive) return
    
    // Calculate distance traveled
    const currentDistance = Phaser.Math.Distance.Between(
      this.startPosition.x, this.startPosition.y,
      this.sprite.x, this.sprite.y
    )
    
    this.distanceTraveled = currentDistance
    
    // Check if projectile has traveled too far
    if (this.distanceTraveled > this.maxDistance) {
      this.expire()
      return
    }
    
    // Check if projectile is close to target position
    const distanceToTarget = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.targetPosition.x, this.targetPosition.y
    )
    
    // If very close to target, trigger hit
    if (distanceToTarget < this.PROJECTILE_SIZE * 2) {
      this.hitTarget()
    }
  }

  public hitPigeon(pigeon: { takeDamage(damage: number): boolean, getPosition(): { x: number, y: number } }): boolean {
    if (!this.isActive) return false
    
    // Apply damage to pigeon
    const eliminated = pigeon.takeDamage(this.damage)
    
    // Create hit effect at impact point
    this.createHitEffect()
    
    // Projectile is consumed
    this.destroy()
    
    console.log('Projectile hit pigeon for', this.damage, 'damage. Eliminated:', eliminated)
    return eliminated
  }

  private hitTarget(): void {
    if (!this.isActive) return
    
    console.log('Projectile reached target position')
    
    // Create small explosion effect
    this.createHitEffect()
    
    // Destroy projectile
    this.destroy()
  }

  private expire(): void {
    if (!this.isActive) return
    
    console.log('Projectile expired (max distance reached)')
    
    // Projectile fades out instead of exploding
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
      onComplete: () => this.destroy()
    })
  }

  private createHitEffect(): void {
    // Create explosion particles
    const explosionColor = 0xFFAA00
    const particleCount = 6
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i
      const particle = this.scene.add.graphics()
      particle.fillStyle(explosionColor, 1)
      particle.fillCircle(0, 0, 2)
      particle.setPosition(this.sprite.x, this.sprite.y)
      
      // Animate particles outward
      this.scene.tweens.add({
        targets: particle,
        x: this.sprite.x + Math.cos(angle) * 20,
        y: this.sprite.y + Math.sin(angle) * 20,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      })
    }
    
    // Screen shake effect for impact
    this.scene.cameras.main.shake(100, 0.005)
  }

  public destroy(): void {
    if (!this.isActive) return
    
    this.isActive = false
    
    console.log('Destroying projectile')
    
    if (this.sprite) {
      this.sprite.destroy()
    }
  }

  // Getters for game logic
  public getPosition(): { x: number, y: number } {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  public getBounds(): Phaser.Geom.Rectangle {
    const size = this.PROJECTILE_SIZE * 2
    return new Phaser.Geom.Rectangle(
      this.sprite.x - size / 2,
      this.sprite.y - size / 2,
      size,
      size
    )
  }

  public getDamage(): number {
    return this.damage
  }

  public getDistanceTraveled(): number {
    return this.distanceTraveled
  }

  public isAlive(): boolean {
    return this.isActive
  }

  // Check collision with a circular target
  public checkCollisionWith(target: { x: number, y: number, radius: number }): boolean {
    if (!this.isActive) return false
    
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      target.x, target.y
    )
    
    return distance <= (this.PROJECTILE_SIZE + target.radius)
  }
}
