'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { HOUSES, getHouseByNumber, getHousePrompt } from '@hekate/mahalilah-core'

type Participant = {
  id: string
  role: string
  user: { id: string; name: string | null; email: string }
  consentAcceptedAt: string | null
}

type PlayerState = {
  participantId: string
  position: number
  hasStarted: boolean
  hasCompleted: boolean
  rollCountTotal: number
  rollCountUntilStart: number
}

type RoomState = {
  room: {
    id: string
    code: string
    status: string
    currentTurnIndex: number
    turnParticipantId: string | null
    therapistOnline: boolean
  }
  participants: Participant[]
  playerStates: PlayerState[]
  lastMove: {
    id: string
    participantId: string
    turnNumber: number
    diceValue: number
    toPos: number
  } | null
  deckHistory: Array<{
    id: string
    cards: number[]
    createdAt: string
    drawnBy: { user: { name: string | null; email: string } }
  }>
}

const COLORS = ['#2f7f6f', '#b44c4c', '#546fa3', '#c07a4a', '#7a5aa5', '#d5a439']

export function RoomClient({ code }: { code: string }) {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [therapy, setTherapy] = useState({ emotion: '', intensity: 5, insight: '', body: '', microAction: '' })
  const [aiTip, setAiTip] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiIntention, setAiIntention] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false
    let currentSocket: Socket | null = null

    const connect = async () => {
      setLoading(true)
      const res = await fetch('/api/mahalilah/realtime/token')
      if (!res.ok) {
        if (!cancelled) {
          setError('Não foi possível autenticar no realtime.')
          setLoading(false)
        }
        return
      }
      const { token, wsUrl } = await res.json()
      if (cancelled) return

      const s = io(wsUrl, {
        transports: ['websocket'],
        auth: { token }
      })
      currentSocket = s

      s.on('connect_error', (err) => {
        if (!cancelled) {
          setError(err.message)
        }
      })

      s.on('room:state', (payload: RoomState) => {
        if (!cancelled) {
          setState(payload)
          setLoading(false)
        }
      })

      s.emit('room:join', { code }, (resp: any) => {
        if (cancelled) return
        if (!resp?.ok) {
          setError(resp?.error || 'Não foi possível entrar na sala.')
          setLoading(false)
          return
        }
        setState(resp.state)
        setLoading(false)
      })

      setSocket(s)
    }

    connect()
    return () => {
      cancelled = true
      if (currentSocket) {
        currentSocket.removeAllListeners()
        currentSocket.disconnect()
      }
    }
  }, [session?.user?.id, code])

  const currentParticipant = useMemo(() => {
    if (!state) return null
    if (state.room.turnParticipantId === null) {
      return null
    }
    if (typeof state.room.turnParticipantId === 'string') {
      return state.participants.find((participant) => participant.id === state.room.turnParticipantId) || null
    }
    return state.participants[state.room.currentTurnIndex] || null
  }, [state])

  const myParticipant = useMemo(() => {
    if (!state || !session?.user?.id) return null
    return state.participants.find((p) => p.user.id === session.user.id) || null
  }, [state, session?.user?.id])

  const playerStateMap = useMemo(() => {
    const map = new Map<string, PlayerState>()
    state?.playerStates.forEach((ps) => map.set(ps.participantId, ps))
    return map
  }, [state])

  const handleRoll = () => {
    if (!socket) return
    socket.emit('game:roll', {}, (resp: any) => {
      if (!resp?.ok) setError(resp?.error || 'Erro ao rolar dado')
    })
  }

  const handleDraw = (count: number) => {
    if (!socket) return
    const payload: { count: number; moveId?: string } = { count }
    if (state?.lastMove && myParticipant && state.lastMove.participantId === myParticipant.id) {
      payload.moveId = state.lastMove.id
    }
    socket.emit('deck:draw', payload, (resp: any) => {
      if (!resp?.ok) setError(resp?.error || 'Erro ao puxar carta')
    })
  }

  const handleSaveTherapy = () => {
    if (!socket || !state?.lastMove) return
    if (!myParticipant || state.lastMove.participantId !== myParticipant.id) {
      setError('Você só pode registrar a jogada do seu próprio turno.')
      return
    }
    socket.emit(
      'therapy:save',
      {
        moveId: state.lastMove.id,
        emotion: therapy.emotion,
        intensity: therapy.intensity,
        insight: therapy.insight,
        body: therapy.body,
        microAction: therapy.microAction
      },
      (resp: any) => {
        if (!resp?.ok) {
          setError(resp?.error || 'Erro ao salvar registro')
        } else {
          setTherapy({ emotion: '', intensity: 5, insight: '', body: '', microAction: '' })
        }
      }
    )
  }

  if (loading) {
    return <div className="card">Carregando sala...</div>
  }

  if (!state) {
    return <div className="card">Sala indisponível.</div>
  }

  const needsConsent = myParticipant && !myParticipant.consentAcceptedAt
  const isMyTurn = currentParticipant?.user.id === session?.user?.id
  const lastHouse = state.lastMove ? getHouseByNumber(state.lastMove.toPos) : null
  const canLogTherapy = !!(state.lastMove && myParticipant && state.lastMove.participantId === myParticipant.id)
  const canCloseRoom = myParticipant?.role === 'THERAPIST'
  const canRoll = isMyTurn && state.room.status === 'ACTIVE' && !(needsConsent && !consentAccepted) && state.room.therapistOnline

  return (
    <div className="grid" style={{ gap: 20 }}>
      {error && <div className="notice">{error}</div>}

      {needsConsent && !consentAccepted && (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Termo de consentimento</h3>
          <p className="small-muted">
            Para participar desta sessão, confirme que você está ciente de que os registros terapêuticos podem ser lidos pela IA
            para gerar insights e resumos.
          </p>
          <button
            onClick={async () => {
              const res = await fetch(`/api/mahalilah/rooms/${state.room.id}/consent`, { method: 'POST' })
              if (!res.ok) {
                setError('Não foi possível registrar o consentimento.')
                return
              }
              setConsentAccepted(true)
            }}
          >
            Aceito o termo
          </button>
        </div>
      )}

      <div className="card" style={{ display: 'grid', gap: 12, opacity: needsConsent && !consentAccepted ? 0.6 : 1 }}>
        <div className="badge">Sala {state.room.code}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <strong>Status</strong>: {state.room.status}
          </div>
          <div>
            <strong>Vez de:</strong> {currentParticipant ? (currentParticipant.user.name || currentParticipant.user.email) : 'Aguardando jogadores'}
          </div>
        </div>
        {!state.room.therapistOnline && (
          <div className="small-muted">
            Rolagem pausada: terapeuta fora da sala.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleRoll} disabled={!canRoll}>
            {!state.room.therapistOnline ? 'Aguardando terapeuta' : isMyTurn ? 'Rolar dado' : 'Aguardando sua vez'}
          </button>
          {canCloseRoom && (
            <Link href="/dashboard" className="btn-secondary">
              Voltar ao dashboard
            </Link>
          )}
          {canCloseRoom && (
            <button
              className="secondary"
              onClick={() => socket?.emit('room:close', {}, (resp: any) => {
                if (!resp?.ok) setError(resp?.error || 'Erro ao encerrar sala')
              })}
              disabled={state.room.status !== 'ACTIVE' || (needsConsent && !consentAccepted)}
            >
              Encerrar sala
            </button>
          )}
          {canCloseRoom && (
            <button
              className="secondary"
              onClick={() => socket?.emit('game:nextTurn', {}, (resp: any) => {
                if (!resp?.ok) setError(resp?.error || 'Erro ao avançar vez')
              })}
              disabled={state.room.status !== 'ACTIVE' || (needsConsent && !consentAccepted)}
            >
              Avançar vez
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12, opacity: needsConsent && !consentAccepted ? 0.6 : 1 }}>
        <h2 style={{ margin: 0 }}>Tabuleiro</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(24px, 1fr))', gap: 6 }}>
          {HOUSES.map((house, idx) => {
            const houseNumber = idx + 1
            const tokens = state.participants
              .map((p, index) => ({
                participant: p,
                color: COLORS[index % COLORS.length],
                state: playerStateMap.get(p.id)
              }))
              .filter((item) => (item.state?.position ?? -1) + 1 === houseNumber)

            return (
              <div
                key={house.number}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 6,
                  minHeight: 48,
                  background: '#fffdfa'
                }}
              >
                <div className="small-muted">{house.number}</div>
                <div style={{ fontSize: 11 }}>{house.title}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {tokens.map((token) => (
                    <span
                      key={token.participant.id}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: token.color,
                        display: 'inline-block'
                      }}
                      title={token.participant.user.name || token.participant.user.email}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid two" style={{ opacity: needsConsent && !consentAccepted ? 0.6 : 1 }}>
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Carta da casa atual</h3>
          {lastHouse ? (
            <>
              <strong>Casa {lastHouse.number} — {lastHouse.title}</strong>
              <p style={{ color: 'var(--muted)' }}>{lastHouse.description}</p>
              <div className="notice">{getHousePrompt(lastHouse.number)}</div>
            </>
          ) : (
            <span className="small-muted">Nenhuma jogada ainda.</span>
          )}
        </div>
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Deck randômico</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="secondary" onClick={() => handleDraw(1)} disabled={needsConsent && !consentAccepted}>
              Puxar 1 carta
            </button>
            <button className="secondary" onClick={() => handleDraw(2)} disabled={needsConsent && !consentAccepted}>
              Puxar 2 cartas
            </button>
            <button className="secondary" onClick={() => handleDraw(3)} disabled={needsConsent && !consentAccepted}>
              Puxar 3 cartas
            </button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {state.deckHistory.length === 0 ? (
              <span className="small-muted">Nenhuma carta puxada ainda.</span>
            ) : (
              state.deckHistory.map((draw) => (
                <div key={draw.id} className="badge" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ fontWeight: 600 }}>
                    {draw.drawnBy.user.name || draw.drawnBy.user.email} • {new Date(draw.createdAt).toLocaleString('pt-BR')}
                  </div>
                  <div className="small-muted">
                    {draw.cards.map((card) => {
                      const house = HOUSES[card - 1]
                      return house ? `Casa ${card} — ${house.title}` : `Casa ${card}`
                    }).join(' | ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid two" style={{ opacity: needsConsent && !consentAccepted ? 0.6 : 1 }}>
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Registro terapêutico</h3>
          {state.lastMove ? (
            <span className="small-muted">
              Jogada #{state.lastMove.turnNumber} • Dado {state.lastMove.diceValue}
              {canLogTherapy ? '' : ' • Registro disponível apenas para quem jogou'}
            </span>
          ) : (
            <span className="small-muted">Sem jogadas para registrar.</span>
          )}
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Emoção</span>
            <input value={therapy.emotion} onChange={(e) => setTherapy({ ...therapy, emotion: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Intensidade (0-10)</span>
            <input
              type="number"
              min={0}
              max={10}
              value={therapy.intensity}
              onChange={(e) => setTherapy({ ...therapy, intensity: Number(e.target.value) })}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Insight</span>
            <textarea value={therapy.insight} onChange={(e) => setTherapy({ ...therapy, insight: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Corpo</span>
            <textarea value={therapy.body} onChange={(e) => setTherapy({ ...therapy, body: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Micro-ação</span>
            <textarea value={therapy.microAction} onChange={(e) => setTherapy({ ...therapy, microAction: e.target.value })} />
          </label>
          <button onClick={handleSaveTherapy} disabled={!state.lastMove || !canLogTherapy || (needsConsent && !consentAccepted)}>
            Salvar registro
          </button>
        </div>

        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>IA terapêutica</h3>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Intenção da sessão (opcional)</span>
            <input value={aiIntention} onChange={(e) => setAiIntention(e.target.value)} />
          </label>
          <button
            className="secondary"
            onClick={() => socket?.emit('ai:tip', { intention: aiIntention }, (resp: any) => {
              if (!resp?.ok) setError(resp?.error || 'Erro ao gerar dica')
              else setAiTip(resp.content)
            })}
            disabled={needsConsent && !consentAccepted}
          >
            IA: me ajuda agora
          </button>
          {aiTip && (
            <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>{aiTip}</div>
          )}
          <button
            className="secondary"
            onClick={() => socket?.emit('ai:finalReport', { intention: aiIntention }, (resp: any) => {
              if (!resp?.ok) setError(resp?.error || 'Erro ao gerar resumo')
              else setAiSummary(resp.content)
            })}
            disabled={needsConsent && !consentAccepted}
          >
            Gerar resumo final
          </button>
          {aiSummary && (
            <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>{aiSummary}</div>
          )}
        </div>
      </div>
    </div>
  )
}
