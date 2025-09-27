import * as Phaser from 'phaser'

export interface SkillCard {
  id: string
  name: string
  description: string
  type: 'active' | 'support'
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  color: string
  isDefault?: boolean
  effects: SkillEffects
}

export interface SkillEffects {
  // Projectile properties
  projectileCount?: number
  projectileType?: string
  projectileSpread?: number
  projectileSpeed?: number
  projectileColor?: string
  
  // Damage and combat
  damage?: number
  elementalDamage?: number
  explosionRadius?: number
  
  // Status effects
  slowEffect?: number
  slowDuration?: number
  
  // Special behaviors
  piercing?: boolean
  piercingCount?: number
  chainCount?: number
  
  // Tower properties
  range?: number
  fireRateMultiplier?: number
}

export interface CombinedSkillEffects extends SkillEffects {
  // Calculated final values
  finalProjectileCount: number
  finalDamage: number
  finalRange: number
  finalFireRate: number
  finalProjectileColor: string
  finalProjectileType: string
}

export class SkillCardSystem {
  private scene: Phaser.Scene
  private skillsData: {
    active_skills: { [key: string]: SkillCard }
    support_skills: { [key: string]: SkillCard }
    rarities: { [key: string]: { weight: number, color: string } }
  } | null = null
  private availableCards: SkillCard[] = []
  private playerHand: SkillCard[] = []
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.loadSkillsData()
  }
  
  private loadSkillsData(): void {
    // Load skills from the JSON data
    const skillsData = {
      "active_skills": {
        "basic_shot": {
          "id": "basic_shot",
          "name": "Basic Shot", 
          "description": "Fires a single projectile",
          "type": "active",
          "rarity": "common",
          "color": "#CCCCCC",
          "isDefault": true,
          "effects": {
            "projectileCount": 1,
            "damage": 1.0,
            "projectileType": "basic"
          }
        },
        "fireball": {
          "id": "fireball",
          "name": "Fireball",
          "description": "Shoots explosive fireballs",
          "type": "active",
          "rarity": "uncommon", 
          "color": "#FF4444",
          "effects": {
            "projectileType": "fireball",
            "damage": 1.2,
            "explosionRadius": 30,
            "projectileColor": "#FF4444"
          }
        },
        "ice_shard": {
          "id": "ice_shard",
          "name": "Ice Shard",
          "description": "Fires ice projectiles that slow enemies",
          "type": "active",
          "rarity": "uncommon",
          "color": "#4444FF", 
          "effects": {
            "projectileType": "ice",
            "damage": 0.8,
            "slowEffect": 0.5,
            "slowDuration": 2000,
            "projectileColor": "#4444FF"
          }
        },
        "lightning_bolt": {
          "id": "lightning_bolt",
          "name": "Lightning Bolt",
          "description": "Instant lightning that chains between enemies",
          "type": "active",
          "rarity": "rare",
          "color": "#FFFF44",
          "effects": {
            "projectileType": "lightning",
            "damage": 1.5,
            "chainCount": 2,
            "projectileSpeed": 999,
            "projectileColor": "#FFFF44"
          }
        }
      },
      "support_skills": {
        "multiple_projectiles": {
          "id": "multiple_projectiles",
          "name": "Multiple Projectiles",
          "description": "Fires 3 projectiles in a spread",
          "type": "support",
          "rarity": "common",
          "color": "#44FF44",
          "effects": {
            "projectileCount": 3,
            "projectileSpread": 0.3,
            "damage": 0.8
          }
        },
        "piercing": {
          "id": "piercing",
          "name": "Piercing",
          "description": "Projectiles pass through enemies", 
          "type": "support",
          "rarity": "uncommon",
          "color": "#FF44FF",
          "effects": {
            "piercing": true,
            "piercingCount": 3
          }
        },
        "faster_attacks": {
          "id": "faster_attacks",
          "name": "Faster Attacks",
          "description": "Greatly increases attack speed",
          "type": "support",
          "rarity": "common",
          "color": "#FFAA44",
          "effects": {
            "fireRateMultiplier": 0.6
          }
        },
        "concentrated_effect": {
          "id": "concentrated_effect",
          "name": "Concentrated Effect",
          "description": "Higher damage but smaller area",
          "type": "support",
          "rarity": "uncommon",
          "color": "#AA44FF",
          "effects": {
            "damage": 1.4,
            "range": 0.8,
            "explosionRadius": 0.7
          }
        },
        "increased_area": {
          "id": "increased_area", 
          "name": "Increased Area",
          "description": "Larger range and explosion radius",
          "type": "support",
          "rarity": "uncommon",
          "color": "#44FFAA",
          "effects": {
            "range": 1.3,
            "explosionRadius": 1.5,
            "damage": 0.9
          }
        },
        "elemental_focus": {
          "id": "elemental_focus",
          "name": "Elemental Focus",
          "description": "Massive elemental damage boost",
          "type": "support",
          "rarity": "rare",
          "color": "#FF8844",
          "effects": {
            "elementalDamage": 1.6,
            "fireRateMultiplier": 1.2
          }
        }
      },
      "rarities": {
        "common": { "weight": 60, "color": "#CCCCCC" },
        "uncommon": { "weight": 30, "color": "#44FF44" },
        "rare": { "weight": 10, "color": "#4444FF" },
        "legendary": { "weight": 1, "color": "#FF8800" }
      }
    }
    
    this.skillsData = skillsData as {
      active_skills: { [key: string]: SkillCard }
      support_skills: { [key: string]: SkillCard }
      rarities: { [key: string]: { weight: number, color: string } }
    }
    this.buildAvailableCards()
  }
  
  private buildAvailableCards(): void {
    this.availableCards = []
    
    if (!this.skillsData) return
    
    // Add active skills
    for (const [, skill] of Object.entries(this.skillsData.active_skills)) {
      this.availableCards.push(skill)
    }
    
    // Add support skills
    for (const [, skill] of Object.entries(this.skillsData.support_skills)) {
      this.availableCards.push(skill)
    }
    
    console.log(`💎 Loaded ${this.availableCards.length} skill cards`)
  }
  
  public drawCards(count: number = 3): SkillCard[] {
    const drawnCards: SkillCard[] = []
    
    for (let i = 0; i < count; i++) {
      const card = this.drawSingleCard()
      if (card) {
        drawnCards.push(card)
        this.playerHand.push(card)
      }
    }
    
    console.log(`🎴 Drew ${drawnCards.length} cards:`, drawnCards.map(c => c.name))
    return drawnCards
  }
  
  private drawSingleCard(): SkillCard | null {
    // Don't draw default skills
    const drawableCards = this.availableCards.filter(card => !card.isDefault)
    
    if (drawableCards.length === 0) return null
    
    // Weighted random selection based on rarity
    const totalWeight = drawableCards.reduce((sum, card) => {
      return sum + (this.skillsData?.rarities[card.rarity].weight || 1)
    }, 0)
    
    let random = Math.random() * totalWeight
    
    for (const card of drawableCards) {
      random -= (this.skillsData?.rarities[card.rarity].weight || 1)
      if (random <= 0) {
        return { ...card } // Return a copy
      }
    }
    
    // Fallback
    return drawableCards[Math.floor(Math.random() * drawableCards.length)]
  }
  
  public getPlayerHand(): SkillCard[] {
    return [...this.playerHand]
  }
  
  public removeFromHand(cardId: string): boolean {
    const index = this.playerHand.findIndex(card => card.id === cardId)
    if (index !== -1) {
      this.playerHand.splice(index, 1)
      return true
    }
    return false
  }
  
  public combineSkills(skills: SkillCard[], baseStats: { damage?: number, range?: number, fireRate?: number }): CombinedSkillEffects {
    // Start with base tower stats
    const combined: CombinedSkillEffects = {
      finalProjectileCount: 1,
      finalDamage: baseStats.damage || 20,
      finalRange: baseStats.range || 80,
      finalFireRate: baseStats.fireRate || 1000,
      finalProjectileColor: '#FFD700',
      finalProjectileType: 'basic'
    }
    
    // Find the active skill (there should be exactly one)
    const activeSkill = skills.find(skill => skill.type === 'active')
    const supportSkills = skills.filter(skill => skill.type === 'support')
    
    // Apply active skill first
    if (activeSkill) {
      this.applySkillEffects(combined, activeSkill.effects)
    }
    
    // Apply support skills
    supportSkills.forEach(skill => {
      this.applySkillEffects(combined, skill.effects)
    })
    
    // Ensure minimum values
    combined.finalProjectileCount = Math.max(1, combined.finalProjectileCount)
    combined.finalDamage = Math.max(1, combined.finalDamage)
    combined.finalRange = Math.max(20, combined.finalRange)
    combined.finalFireRate = Math.max(100, combined.finalFireRate)
    
    console.log('🔧 Combined skill effects:', combined)
    return combined
  }
  
  private applySkillEffects(combined: CombinedSkillEffects, effects: SkillEffects): void {
    // Multiplicative effects
    if (effects.damage !== undefined) {
      combined.finalDamage *= effects.damage
    }
    
    if (effects.elementalDamage !== undefined) {
      combined.finalDamage *= effects.elementalDamage
    }
    
    if (effects.range !== undefined) {
      combined.finalRange *= effects.range
    }
    
    if (effects.fireRateMultiplier !== undefined) {
      combined.finalFireRate *= effects.fireRateMultiplier
    }
    
    // Additive/Override effects
    if (effects.projectileCount !== undefined) {
      combined.finalProjectileCount = effects.projectileCount
    }
    
    if (effects.projectileType !== undefined) {
      combined.finalProjectileType = effects.projectileType
    }
    
    if (effects.projectileColor !== undefined) {
      combined.finalProjectileColor = effects.projectileColor
    }
    
    // Copy special effects
    if (effects.explosionRadius !== undefined) {
      combined.explosionRadius = effects.explosionRadius
    }
    
    if (effects.piercing !== undefined) {
      combined.piercing = effects.piercing
      combined.piercingCount = effects.piercingCount
    }
    
    if (effects.chainCount !== undefined) {
      combined.chainCount = effects.chainCount
    }
    
    if (effects.slowEffect !== undefined) {
      combined.slowEffect = effects.slowEffect
      combined.slowDuration = effects.slowDuration
    }
    
    if (effects.projectileSpread !== undefined) {
      combined.projectileSpread = effects.projectileSpread
    }
    
    if (effects.projectileSpeed !== undefined) {
      combined.projectileSpeed = effects.projectileSpeed
    }
  }
  
  public getDefaultActiveSkill(): SkillCard {
    return this.availableCards.find(card => card.isDefault) || this.availableCards[0]
  }
  
  public getAllSkills(): SkillCard[] {
    return [...this.availableCards]
  }
  
  public getSkillById(id: string): SkillCard | null {
    return this.availableCards.find(card => card.id === id) || null
  }
}
