'use client'

import { useState } from 'react'
import PhaserGame from '@/components/Game/PhaserGame'

export default function GamePage() {
  const [gameInstance, setGameInstance] = useState<Phaser.Game | null>(null)
  const [isGameReady, setIsGameReady] = useState(false)

  const handleGameReady = (game: Phaser.Game) => {
    setGameInstance(game)
    setIsGameReady(true)
    console.log('Phaser game initialized:', game)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8">
      <div className="container mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🐦 Pigeon Tower Defense
          </h1>
          <p className="text-gray-300 text-lg">
            Defend your territory from the pigeon invasion!
          </p>
          <div className="mt-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              isGameReady 
                ? 'bg-green-500 text-white' 
                : 'bg-yellow-500 text-black'
            }`}>
              {isGameReady ? '🎮 Game Ready' : '⏳ Loading...'}
            </span>
          </div>
        </header>

        <main className="flex justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-2xl">
            <PhaserGame onGameReady={handleGameReady} />
            
            <div className="mt-4 text-center">
              <p className="text-gray-300 text-sm">
                MVP 1.0: Core Proof of Concept - Phaser.js Integration Complete
              </p>
            </div>
          </div>
        </main>

        <footer className="text-center mt-8">
          <div className="text-gray-400 text-sm space-y-1">
            <p>Built with Next.js, React, TypeScript, and Phaser.js</p>
            <p>Game Status: {gameInstance ? 'Initialized' : 'Not Ready'}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
