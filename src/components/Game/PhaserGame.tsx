'use client'

import { useEffect, useRef, useState } from 'react'

interface PhaserGameProps {
  onGameReady?: (game: any) => void
}

export default function PhaserGame({ onGameReady }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !gameRef.current || phaserGameRef.current) return

    const loadPhaserAndCreateGame = async () => {
      const Phaser = await import('phaser')
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        backgroundColor: '#2c3e50',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        scene: {
          preload: function() {
            // Placeholder preload - will be replaced with proper scenes
            this.load.image('placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
          },
          create: function() {
            // Basic scene setup - will be replaced with proper game scene
            this.add.text(400, 300, 'Pigeon Tower Defense\nGame Ready!', {
              fontSize: '32px',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5)
            
            this.add.text(400, 400, 'Phaser.js Integration Complete!', {
              fontSize: '16px',
              color: '#ecf0f1',
              align: 'center'
            }).setOrigin(0.5)
          }
        }
      }

      phaserGameRef.current = new Phaser.Game(config)
      
      if (onGameReady) {
        onGameReady(phaserGameRef.current)
      }
    }

    loadPhaserAndCreateGame()
  }, [isClient, onGameReady])

  useEffect(() => {
    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
    }
  }, [])

  if (!isClient) {
    return (
      <div 
        className="mx-auto border-2 border-gray-300 rounded-lg shadow-lg flex items-center justify-center bg-gray-800"
        style={{ width: '800px', height: '600px' }}
      >
        <div className="text-white text-center">
          <div className="text-2xl mb-2">🐦 Pigeon Tower Defense</div>
          <div className="text-sm text-gray-300">Initializing game engine...</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={gameRef} 
      className="mx-auto border-2 border-gray-300 rounded-lg shadow-lg"
      style={{ width: '800px', height: '600px' }}
    />
  )
}
