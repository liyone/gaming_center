'use client'

import { useEffect, useRef, useState } from 'react'

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void
}

export default function PhaserGame({ onGameReady }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Phaser.Game | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !gameRef.current || phaserGameRef.current) return

    const loadPhaserAndCreateGame = async () => {
      const Phaser = await import('phaser')
      const { default: GameScene } = await import('@/game/scenes/GameScene')
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        backgroundColor: '#87CEEB', // Sky blue background
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        scene: [GameScene], // Use the proper GameScene class
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
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
