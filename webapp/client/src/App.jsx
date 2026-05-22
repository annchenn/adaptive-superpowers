import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import confetti from 'canvas-confetti'
import ErrorBoundary from './ErrorBoundary'
import SessionTimeline from './components/SessionTimeline'
import PipelineFlow from './components/PipelineFlow'
import StepDetailPanel from './components/StepDetailPanel'
import EvaluationDashboard from './components/EvaluationDashboard'
import SkillLibrary from './components/SkillLibrary'
import ControlPanel from './components/ControlPanel'
import GapDetectionPanel from './components/GapDetectionPanel'


const socket = io('http://localhost:3001')
const slimeColors = [
  '#7CFFB2',
  '#FFD166',
  '#FF8FAB',
  '#A78BFA',
  '#6EE7FF',
  '#F9A8D4',
]
const gardenTools = ['cursor', 'grass', 'flower', 'cactus']

// executing-plans and subagent-driven-development are two ways to run the same
// "Execution" phase — map them to one canonical pipeline node.
const SKILL_ALIAS = { 'executing-plans': 'subagent-driven-development' }
const normalizeSkill = (s) => SKILL_ALIAS[s] || s
const normalizeEvent = (e) => (e && SKILL_ALIAS[e.skill] ? { ...e, skill: normalizeSkill(e.skill) } : e)

export default function App() {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [selectedStep, setSelectedStep] = useState(null)
  const [evalLog, setEvalLog] = useState(null)
  const [skills, setSkills] = useState([])
  // yang added slime state
  const [slimes, setSlimes] = useState(() => {
    const saved = localStorage.getItem('superpowers-slimes')
    return saved ? JSON.parse(saved) : []
  })
  const headerRef = useRef(null)
  const slimesRef = useRef([])
  const animationRef = useRef(null)
  // yang added tool state
  const [currentTool, setCurrentTool] = useState('cursor')

  const [plants, setPlants] = useState(() => {
    const saved = localStorage.getItem('superpowers-plants')
    return saved ? JSON.parse(saved) : []
  })

  const [draggingSlimeId, setDraggingSlimeId] = useState(null)
  const [isDraggingSlime, setIsDraggingSlime] = useState(false)

  const triggerFireworks = useCallback(() => {
    const duration = 2500
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.85 },
      })

      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.85 },
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
  }, [])

  const spawnSlime = useCallback(() => {
    const color = slimeColors[Math.floor(Math.random() * slimeColors.length)]

    const newSlime = {
      id: crypto.randomUUID(),
      color,
      x: Math.floor(Math.random() * 70) + 15,
      y: 0,

      action: 'idle',
      actionUntil: performance.now() + 1500 + Math.random() * 2500,

      startX: null,
      targetX: null,
      jumpStartAt: null,
      jumpDuration: null,
      jumpPhase: 0,
    }

    setSlimes((prev) => {
      const next = [...prev, newSlime].slice(-8)
      localStorage.setItem('superpowers-slimes', JSON.stringify(next))
      return next
    })
  }, [])

  const removeSlime = useCallback((id) => {
    setSlimes((prev) => {
      const next = prev.filter((slime) => slime.id !== id)
      localStorage.setItem('superpowers-slimes', JSON.stringify(next))
      return next
    })
  }, [])
  const updateDraggedSlimePosition = useCallback((clientX, id = draggingSlimeId) => {
    const header = headerRef.current
    if (!header || !id) return

    const rect = header.getBoundingClientRect()
    const xPercent = ((clientX - rect.left) / rect.width) * 100
    const clampedX = Math.max(1, Math.min(96, xPercent))

    setSlimes((prev) => {
      const next = prev.map((slime) => {
        if (slime.id !== id) return slime

        return {
          ...slime,
          x: clampedX,
          action: 'idle',
          targetX: null,
          jumpStartAt: null,
          jumpDuration: null,
          jumpPhase: 0,
        }
      })

      localStorage.setItem('superpowers-slimes', JSON.stringify(next))
      return next
    })
  }, [draggingSlimeId])

  const handleSlimePointerDown = useCallback((event, id) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    setDraggingSlimeId(id)
    setIsDraggingSlime(true)

    updateDraggedSlimePosition(event.clientX, id)
  }, [updateDraggedSlimePosition])

  const handleSlimePointerMove = useCallback((event) => {
    if (!draggingSlimeId) return
    updateDraggedSlimePosition(event.clientX)
  }, [draggingSlimeId, updateDraggedSlimePosition])

  const handleSlimePointerUp = useCallback((event) => {
    if (!draggingSlimeId) return

    const trash = document.querySelector('.slime-trash')
    const trashRect = trash?.getBoundingClientRect()

    const droppedOnTrash =
      trashRect &&
      event.clientX >= trashRect.left &&
      event.clientX <= trashRect.right &&
      event.clientY >= trashRect.top &&
      event.clientY <= trashRect.bottom

    if (droppedOnTrash) {
      removeSlime(draggingSlimeId)
    } else {
      setSlimes((prev) => {
        const next = prev.map((slime) => {
          if (slime.id !== draggingSlimeId) return slime

          return {
            ...slime,
            action: 'idle',
            actionUntil: performance.now() + 1200 + Math.random() * 2000,
            startX: slime.x,
            targetX: null,
            jumpStartAt: null,
            jumpDuration: null,
            jumpPhase: 0,
          }
        })

        localStorage.setItem('superpowers-slimes', JSON.stringify(next))
        return next
      })
    }

    setDraggingSlimeId(null)
    setIsDraggingSlime(false)
  }, [draggingSlimeId, removeSlime])

  const savePlants = useCallback((nextPlants) => {
    localStorage.setItem('superpowers-plants', JSON.stringify(nextPlants))
  }, [])

  const handleGardenWheel = useCallback((event) => {
    event.preventDefault()

    setCurrentTool((prev) => {
      const currentIndex = gardenTools.indexOf(prev)
      const direction = event.deltaY > 0 ? 1 : -1
      const nextIndex = (currentIndex + direction + gardenTools.length) % gardenTools.length
      return gardenTools[nextIndex]
    })
  }, [])

  const handleGardenClick = useCallback((event) => {
    if (currentTool === 'cursor') return

    const header = headerRef.current
    if (!header) return

    const rect = header.getBoundingClientRect()
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100

    const newPlant = {
      id: crypto.randomUUID(),
      type: currentTool,
      x: Math.max(1, Math.min(98, xPercent)),
      size: 0.85 + Math.random() * 0.3,
    }

    setPlants((prev) => {
      const next = [...prev, newPlant].slice(-80)
      savePlants(next)
      return next
    })
  }, [currentTool, savePlants])

  const removePlant = useCallback((id) => {
    setPlants((prev) => {
      const next = prev.filter((plant) => plant.id !== id)
      savePlants(next)
      return next
    })
  }, [savePlants])

  useEffect(() => {
    let lastTime = performance.now()

    const animate = (now) => {
      const delta = Math.min(now - lastTime, 40)
      lastTime = now

      if (!draggingSlimeId) {
        setSlimes((prev) => {
          if (prev.length === 0) return prev

          const next = prev.map((slime) => {
            let x = slime.x ?? 50
            let action = slime.action ?? 'idle'
            let actionUntil = slime.actionUntil ?? now + 1500
            let startX = slime.startX ?? x
            let targetX = slime.targetX ?? null
            let jumpStartAt = slime.jumpStartAt ?? null
            let jumpDuration = slime.jumpDuration ?? null
            let jumpPhase = slime.jumpPhase ?? 0

            // 1. 停下來
            if (action === 'idle') {
              jumpPhase = 0
              let wallBump = null

              if (now >= actionUntil) {
                const headerWidth = headerRef.current?.getBoundingClientRect().width ?? 1200
                const slimeWidthPercent = (34 / headerWidth) * 100

                const wallLeft = 0
                const wallRight = 100 - slimeWidthPercent

                let direction = Math.random() > 0.5 ? 1 : -1
                let jumpDistance = 3 + Math.random() * 6

                // 15% 機率故意往最近的牆跳，讓它真的會撞牆
                const wantsToHitWall = Math.random() < 0.15

                if (wantsToHitWall) {
                  const distanceToLeft = Math.abs(x - wallLeft)
                  const distanceToRight = Math.abs(wallRight - x)

                  if (distanceToLeft < distanceToRight) {
                    direction = -1
                    jumpDistance = distanceToLeft + 8
                  } else {
                    direction = 1
                    jumpDistance = distanceToRight + 8
                  }
                }

                // 如果已經靠近左牆，增加往左撞牆機率
                if (x <= wallLeft + 8) {
                  direction = Math.random() < 0.65 ? -1 : 1
                }

                // 如果已經靠近右牆，增加往右撞牆機率
                if (x >= wallRight - 8) {
                  direction = Math.random() < 0.65 ? 1 : -1
                }

                startX = x
                targetX = x + direction * jumpDistance

                // 撞牆時小小反彈，不要彈太遠

                if (targetX <= wallLeft) {
                  targetX = wallLeft
                  wallBump = 'left'
                }

                if (targetX >= wallRight) {
                  targetX = wallRight
                  wallBump = 'right'
                }

                jumpStartAt = now
                jumpDuration = 650 + Math.random() * 350
                action = 'jumping'
              }

              return {
                ...slime,
                x,
                action,
                actionUntil,
                startX,
                targetX,
                jumpStartAt,
                jumpDuration,
                jumpPhase,
                wallBump,
              }
            }

            // 2. 拋物線跳動
            if (action === 'jumping') {
              const elapsed = now - jumpStartAt
              const progress = Math.min(1, elapsed / jumpDuration)

              // x：平滑往旁邊移動
              const easedX = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2

              x = startX + (targetX - startX) * easedX

              // y：拋物線高度，0 → 1 → 0
              jumpPhase = Math.sin(progress * Math.PI)

              if (progress >= 1) {
                x = targetX

                if (slime.wallBump) {
                  action = 'bumping'
                  actionUntil = now + 560
                  startX = x
                  targetX = slime.wallBump === 'left' ? x + 2.5 : x - 2.5
                  jumpStartAt = now
                  jumpDuration = 560
                  jumpPhase = 0
                } else {
                  action = 'idle'
                  actionUntil = now + 1500 + Math.random() * 3000
                  startX = x
                  targetX = null
                  jumpStartAt = null
                  jumpDuration = null
                  jumpPhase = 0
                }
              }

              return {
                ...slime,
                x,
                action,
                actionUntil,
                startX,
                targetX,
                jumpStartAt,
                jumpDuration,
                jumpPhase,
              }
            }
            if (action === 'bumping') {
              const elapsed = now - jumpStartAt
              const progress = Math.min(1, elapsed / jumpDuration)

              const eased = 1 - Math.pow(1 - progress, 2)
              x = startX + (targetX - startX) * eased

              if (progress >= 1) {
                x = targetX
                action = 'idle'
                actionUntil = now + 1200 + Math.random() * 2600
                startX = x
                targetX = null
                jumpStartAt = null
                jumpDuration = null
                jumpPhase = 0
              }

              return {
                ...slime,
                x,
                action,
                actionUntil,
                startX,
                targetX,
                jumpStartAt,
                jumpDuration,
                jumpPhase,
                wallBump: progress >= 1 ? null : slime.wallBump,
              }
            }

            return slime
          })

          localStorage.setItem('superpowers-slimes', JSON.stringify(next))
          return next
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draggingSlimeId])

  useEffect(() => {
    slimesRef.current = slimes
  }, [slimes])

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('init-events', (evts) => setEvents((evts ?? []).map(normalizeEvent)))
    socket.on('new-event', (raw) => {
      const evt = normalizeEvent(raw)
      setEvents(prev => {
        const key = `${evt.timestamp}|${evt.skill}|${evt.status}`
        if (prev.some(e => `${e.timestamp}|${e.skill}|${e.status}` === key)) return prev
        return [...prev, evt]
      })

      if (
        evt.skill === 'finishing-a-development-branch' &&
        evt.status === 'completed'
      ) {
        triggerFireworks()
        spawnSlime()
      }
    })
    socket.on('event-detail', ({ skill, data }) => setEvents(prev => {
      // Enrich latest completed event for this skill
      const target = normalizeSkill(skill)
      let updated = false
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        if (!updated && next[i].skill === target && next[i].status === 'completed') {
          next[i] = { ...next[i], data: { ...(next[i].data || {}), ...data } }
          updated = true
        }
      }
      return next
    }))

    fetch('/api/evaluation-log').then(r => r.json()).then(setEvalLog).catch(() => {})
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {})

    return () => socket.off()
    }, [triggerFireworks, spawnSlime])

  const handleStepSelect = useCallback((step) => {
    setSelectedStep(prev => prev === step ? null : step)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header className="app-header" ref={headerRef}>
        <div className="header-content">
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, letterSpacing: '0.05em' }}>
            🚀 Superpowers Pipeline Monitor
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span className="garden-tool-indicator">
              Tool: {currentTool === 'cursor'
                ? '🖱️ Cursor'
                : currentTool === 'grass'
                  ? '🌱 Grass'
                  : currentTool === 'flower'
                    ? '🌸 Flower'
                    : '🌵 Cactus'}
            </span>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? 'var(--color-accent)' : 'var(--color-destructive)',
              boxShadow: connected ? '0 0 6px #22C55E' : 'none'
            }} />
            <span style={{ color: 'var(--color-foreground)', opacity: 0.7 }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div
          className={`header-slime-layer tool-${currentTool}`}
          onWheel={handleGardenWheel}
          onClick={handleGardenClick}
        >
          {slimes.length === 0 && (
            <div className="header-slime-hint">
            </div>
          )}

          <div className="plant-layer">
            {plants.map((plant) => (
              <button
                key={plant.id}
                className={`plant plant-${plant.type}`}
                style={{
                  left: `${plant.x}%`,
                  transform: `translateX(-50%) scale(${plant.size})`,
                }}
                title="Right click to remove"
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  removePlant(plant.id)
                }}
              >
                {plant.type === 'grass' && '🌱'}
                {plant.type === 'flower' && '🌸'}
                {plant.type === 'cactus' && '🌵'}
              </button>
            ))}
          </div>

          {slimes.map((slime) => (
            <div
              key={slime.id}
              className={`slime header-slime ${draggingSlimeId === slime.id ? 'dragging' : ''}`}
              onPointerDown={(event) => {
                event.stopPropagation()
                handleSlimePointerDown(event, slime.id)
              }}
              onPointerMove={handleSlimePointerMove}
              onPointerUp={handleSlimePointerUp}
              onPointerCancel={handleSlimePointerUp}
              style={{
                left: `${slime.x}%`,
                background: slime.color,
                transformOrigin:
                  slime.wallBump === 'left'
                    ? 'left bottom'
                    : slime.wallBump === 'right'
                      ? 'right bottom'
                      : 'center bottom',
                transform: `translateY(${
                  draggingSlimeId === slime.id
                    ? -10
                    : slime.action === 'bumping'
                      ? 0
                      : -(slime.jumpPhase ?? 0) * 16
                }px) scale(${
                  draggingSlimeId === slime.id
                    ? '1.05, 0.95'
                    : slime.action === 'bumping'
                      ? '1.16, 0.86'
                      : slime.action === 'jumping'
                        ? '1.04, 0.96'
                        : '1, 1'
                })`,
              }}
              title="Drag me to the trash"
            >
              <span className="slime-eye left" />
              <span className="slime-eye right" />
            </div>
          ))}
        </div>

        <div className={`slime-trash ${isDraggingSlime ? 'visible' : ''}`}>
          🗑️
        </div>
      </header>


      {/* 3-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: Session Timeline (25%) */}
        <aside style={{
          width: '25%',
          minWidth: 200,
          borderRight: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <SessionTimeline events={events} onStepSelect={handleStepSelect} selectedStep={selectedStep} />
        </aside>

        {/* Center: Pipeline Flow + Control Panel (45%) */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <PipelineFlow events={events} selectedStep={selectedStep} onStepSelect={handleStepSelect} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px', flexShrink: 0 }}>
            <ControlPanel onClear={() => setEvents([])} />
          </div>
        </main>

        {/* Right: Detail + Dashboard + Library (30%) */}
        <aside style={{
          width: '30%',
          minWidth: 240,
          borderLeft: '1px solid var(--color-border)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0
        }}>
          {selectedStep && (
            <ErrorBoundary name="StepDetailPanel">
              <StepDetailPanel
                step={selectedStep}
                events={events}
                onClose={() => setSelectedStep(null)}
              />
            </ErrorBoundary>
          )}
          <ErrorBoundary name="GapDetectionPanel">
            <GapDetectionPanel events={events} />
          </ErrorBoundary>
          {evalLog && (
            <ErrorBoundary name="EvaluationDashboard">
              <EvaluationDashboard evalLog={evalLog} />
            </ErrorBoundary>
          )}
          <ErrorBoundary name="SkillLibrary">
            <SkillLibrary skills={skills} events={events} />
          </ErrorBoundary>
        </aside>
      </div>
    </div>
  )
}
