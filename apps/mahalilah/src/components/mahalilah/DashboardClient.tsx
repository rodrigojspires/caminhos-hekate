'use client'

import { useCallback, useEffect, useState } from 'react'

type RoomInvite = {
  id: string
  email: string
  acceptedAt: string | null
  sentAt: string
}

type RoomParticipant = {
  id: string
  role: string
  consentAcceptedAt: string | null
  user: { id: string; name: string | null; email: string }
}

type RoomStats = {
  moves: number
  therapyEntries: number
  cardDraws: number
  aiReports: number
  rollsTotal: number
  rollsUntilStart: number
}

type Room = {
  id: string
  code: string
  status: string
  maxParticipants: number
  therapistPlays: boolean
  createdAt: string
  invites: RoomInvite[]
  participants: RoomParticipant[]
  participantsCount: number
  stats: RoomStats
}

type TimelineCardDraw = {
  id: string
  cards: number[]
  createdAt: string
  moveId: string | null
  drawnBy: { id: string; user: { name: string | null; email: string } }
}

type TimelineMove = {
  id: string
  turnNumber: number
  diceValue: number
  fromPos: number
  toPos: number
  appliedJumpFrom: number | null
  appliedJumpTo: number | null
  createdAt: string
  participant: { id: string; user: { name: string | null; email: string } }
  therapyEntries: Array<{ id: string; emotion?: string | null; intensity?: number | null; insight?: string | null }>
  cardDraws: TimelineCardDraw[]
}

type AiReport = {
  id: string
  kind: string
  content: string
  createdAt: string
  participant: { id: string; user: { name: string | null; email: string } } | null
}

type StandaloneCardDraw = TimelineCardDraw

type DeckTimelineEntry = {
  id: string
  cards: number[]
  createdAt: string
  turnNumber: number | null
  drawnBy: { id: string; user: { name: string | null; email: string } }
}

type Notice = { message: string; variant: 'error' | 'success' }

type Filters = {
  status: string
  from: string
  to: string
}

type RoomDetailsTab = 'invites' | 'participants' | 'timeline' | 'deck' | 'aiReports'

export function DashboardClient() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [therapistPlays, setTherapistPlays] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [canCreateRoom, setCanCreateRoom] = useState(false)
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({})
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({})
  const [activeDetailTabs, setActiveDetailTabs] = useState<Record<string, RoomDetailsTab>>({})
  const [timelineParticipantFilters, setTimelineParticipantFilters] = useState<Record<string, string>>({})
  const [details, setDetails] = useState<Record<string, { loading: boolean; moves: TimelineMove[]; aiReports: AiReport[]; cardDraws: StandaloneCardDraw[]; error?: string }>>({})
  const [filters, setFilters] = useState<Filters>({ status: '', from: '', to: '' })

  const showNotice = (message: string, variant: Notice['variant'] = 'error') => {
    setNotice({ message, variant })
    window.setTimeout(() => setNotice(null), 3000)
  }

  const loadRooms = useCallback(async (override?: Partial<Filters>) => {
    setLoading(true)
    const activeFilters = {
      status: override?.status ?? filters.status,
      from: override?.from ?? filters.from,
      to: override?.to ?? filters.to
    }

    const params = new URLSearchParams()
    if (activeFilters.status) params.set('status', activeFilters.status)
    if (activeFilters.from) params.set('from', activeFilters.from)
    if (activeFilters.to) params.set('to', activeFilters.to)

    const res = await fetch(`/api/mahalilah/rooms${params.toString() ? `?${params.toString()}` : ''}`)
    if (!res.ok) {
      showNotice('Não foi possível carregar as salas.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setRooms(data.rooms || [])
    setCanCreateRoom(Boolean(data.canCreateRoom))
    setLoading(false)
  }, [filters])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const handleCreateRoom = async () => {
    setCreating(true)
    const res = await fetch('/api/mahalilah/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxParticipants, therapistPlays })
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      showNotice(payload.error || 'Erro ao criar sala.')
      setCreating(false)
      return
    }

    await loadRooms()
    setCreating(false)
  }

  const handleSendInvites = async (roomId: string, overrideEmails?: string[]) => {
    const raw = inviteEmails[roomId] || ''
    const emails = overrideEmails || raw
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    if (!emails.length) return

    const res = await fetch(`/api/mahalilah/rooms/${roomId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails })
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      showNotice(payload.error || 'Erro ao enviar convites.')
      return
    }

    setInviteEmails((prev) => ({ ...prev, [roomId]: '' }))
    showNotice('Convites enviados com sucesso.', 'success')
    await loadRooms()
  }

  const handleRemoveParticipant = async (roomId: string, participantId: string) => {
    const res = await fetch(`/api/mahalilah/rooms/${roomId}/participants/${participantId}`, {
      method: 'DELETE'
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      showNotice(payload.error || 'Erro ao remover participante.')
      return
    }

    showNotice('Participante removido.', 'success')
    await loadRooms()
  }

  const handleCopyLink = async (roomCode: string) => {
    const link = `${window.location.origin}/rooms/${roomCode}`
    await navigator.clipboard.writeText(link)
    showNotice('Link da sala copiado.', 'success')
  }

  const handleExport = async (roomId: string, format: 'json' | 'txt') => {
    const res = await fetch(`/api/mahalilah/rooms/${roomId}/export?format=${format}`)
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      showNotice(payload.error || 'Erro ao exportar sessão.')
      return
    }

    if (format === 'json') {
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mahalilah_${roomId}.json`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mahalilah_${roomId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadTimeline = async (roomId: string) => {
    setDetails((prev) => ({
      ...prev,
      [roomId]: {
        loading: true,
        moves: prev[roomId]?.moves || [],
        aiReports: prev[roomId]?.aiReports || [],
        cardDraws: prev[roomId]?.cardDraws || []
      }
    }))

    const res = await fetch(`/api/mahalilah/rooms/${roomId}/timeline`)
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setDetails((prev) => ({
        ...prev,
        [roomId]: { loading: false, moves: [], aiReports: [], cardDraws: [], error: payload.error || 'Erro ao carregar timeline.' }
      }))
      return
    }

    const data = await res.json()
    setDetails((prev) => ({
      ...prev,
      [roomId]: { loading: false, moves: data.moves || [], aiReports: data.aiReports || [], cardDraws: data.cardDraws || [] }
    }))
  }

  const toggleRoom = (roomId: string) => {
    setOpenRooms((prev) => {
      const nextOpen = !prev[roomId]
      if (nextOpen && !details[roomId]) {
        loadTimeline(roomId)
      }
      return { ...prev, [roomId]: nextOpen }
    })
    setActiveDetailTabs((prev) => (
      prev[roomId]
        ? prev
        : { ...prev, [roomId]: 'invites' }
    ))
  }

  const statusClass = (status: string) => {
    if (status === 'ACTIVE') return 'status-pill active'
    if (status === 'CLOSED') return 'status-pill closed'
    if (status === 'COMPLETED') return 'status-pill completed'
    return 'status-pill'
  }

  const participantRoleLabel = (role: string) => {
    if (role === 'THERAPIST') return 'Terapeuta'
    if (role === 'PLAYER') return 'Jogador'
    return role
  }

  const roomCards = rooms.map((room) => {
    const isOpen = !!openRooms[room.id]
    const activeTab = activeDetailTabs[room.id] || 'invites'
    const roomDetails = details[room.id]
    const selectedParticipantId = timelineParticipantFilters[room.id] || ''

    const filteredMoves = (roomDetails?.moves || []).filter((move) =>
      selectedParticipantId ? move.participant.id === selectedParticipantId : true
    )

    const deckDrawsFromMoves: DeckTimelineEntry[] = (roomDetails?.moves || []).flatMap((move) =>
      move.cardDraws.map((draw) => ({
        id: draw.id,
        cards: draw.cards,
        createdAt: draw.createdAt,
        turnNumber: move.turnNumber,
        drawnBy: draw.drawnBy
      }))
    )

    const standaloneDeckDraws: DeckTimelineEntry[] = (roomDetails?.cardDraws || []).map((draw) => ({
      id: draw.id,
      cards: draw.cards,
      createdAt: draw.createdAt,
      turnNumber: null,
      drawnBy: draw.drawnBy
    }))

    const filteredDeckDraws = [...deckDrawsFromMoves, ...standaloneDeckDraws]
      .filter((draw) => (selectedParticipantId ? draw.drawnBy.id === selectedParticipantId : true))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const filteredAiReports = (roomDetails?.aiReports || []).filter((report) =>
      selectedParticipantId ? report.participant?.id === selectedParticipantId : true
    )

    return (
      <div key={room.id} className="card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="badge">Sala {room.code}</div>
              <span className={`pill ${statusClass(room.status)}`}>{room.status}</span>
            </div>
            <div style={{ color: 'var(--muted)', marginTop: 6 }}>
              {new Date(room.createdAt).toLocaleString('pt-BR')} • {room.participantsCount}/{room.maxParticipants} jogadores
              {' '}• {room.therapistPlays ? 'Terapeuta joga junto' : 'Terapeuta conduz sem jogar'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={`/rooms/${room.code}`} className="btn-secondary">
              Abrir sala
            </a>
            <button className="btn-secondary" onClick={() => handleCopyLink(room.code)}>
              Copiar link
            </button>
            <button className="btn-secondary" onClick={() => toggleRoom(room.id)}>
              {isOpen ? 'Fechar detalhes' : 'Ver detalhes'}
            </button>
          </div>
        </div>

        <div className="grid" style={{ gap: 8 }}>
          <strong>Indicadores</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="pill">Jogadas: {room.stats.moves}</span>
            <span className="pill">Rolagens: {room.stats.rollsTotal}</span>
            <span className="pill">Até iniciar: {room.stats.rollsUntilStart}</span>
            <span className="pill">Registros: {room.stats.therapyEntries}</span>
            <span className="pill">Cartas: {room.stats.cardDraws}</span>
            <span className="pill">Relatórios IA: {room.stats.aiReports}</span>
          </div>
        </div>

        {isOpen && (
          <div className="grid" style={{ gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={activeTab === 'invites' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setActiveDetailTabs((prev) => ({ ...prev, [room.id]: 'invites' }))}
              >
                Convites
              </button>
              <button
                className={activeTab === 'participants' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setActiveDetailTabs((prev) => ({ ...prev, [room.id]: 'participants' }))}
              >
                Participantes
              </button>
              <button
                className={activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setActiveDetailTabs((prev) => ({ ...prev, [room.id]: 'timeline' }))}
              >
                Timeline
              </button>
              <button
                className={activeTab === 'deck' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setActiveDetailTabs((prev) => ({ ...prev, [room.id]: 'deck' }))}
              >
                Deck randômico
              </button>
              <button
                className={activeTab === 'aiReports' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setActiveDetailTabs((prev) => ({ ...prev, [room.id]: 'aiReports' }))}
              >
                Relatórios IA
              </button>
            </div>

            {activeTab === 'invites' && (
              <>
                <div className="grid" style={{ gap: 10 }}>
                  <strong>Convites</strong>
                  {room.invites.length === 0 ? (
                    <span className="small-muted">Nenhum convite enviado.</span>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {room.invites.map((invite) => (
                        <div
                          key={invite.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid var(--border)',
                            background: 'hsl(var(--temple-surface-2))'
                          }}
                        >
                          <div style={{ display: 'grid', gap: 2 }}>
                            <strong style={{ fontSize: 13 }}>{invite.email}</strong>
                            <span className="small-muted">
                              Enviado em {new Date(invite.sentAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span
                              className="pill"
                              style={
                                invite.acceptedAt
                                  ? { background: 'rgba(106, 211, 176, 0.18)', borderColor: 'rgba(106, 211, 176, 0.4)', color: '#9fe6cc' }
                                  : { background: 'rgba(241, 213, 154, 0.2)', borderColor: 'rgba(217, 164, 65, 0.45)', color: '#f1d59a' }
                              }
                            >
                              {invite.acceptedAt ? 'Aceito' : 'Pendente'}
                            </span>
                            {!invite.acceptedAt && (
                              <button
                                className="btn-secondary px-3 py-1 text-xs"
                                onClick={() => handleSendInvites(room.id, [invite.email])}
                              >
                                Reenviar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span>Enviar convites (separe por vírgula)</span>
                    <input
                      type="text"
                      value={inviteEmails[room.id] || ''}
                      onChange={(event) =>
                        setInviteEmails((prev) => ({ ...prev, [room.id]: event.target.value }))
                      }
                      placeholder="jogador1@email.com, jogador2@email.com"
                    />
                  </label>
                  <button className="btn-secondary w-fit" onClick={() => handleSendInvites(room.id)}>
                    Enviar convites
                  </button>
                </div>
              </>
            )}

            {activeTab === 'participants' && (
              <div className="grid" style={{ gap: 10 }}>
                <strong>Participantes</strong>
                <div style={{ display: 'grid', gap: 6 }}>
                  {room.participants.map((participant) => {
                    const isTherapist = participant.role === 'THERAPIST'

                    return (
                      <div
                        key={participant.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: isTherapist ? '1px solid rgba(217, 164, 65, 0.45)' : '1px solid var(--border)',
                          background: isTherapist
                            ? 'linear-gradient(160deg, rgba(217, 164, 65, 0.12) 0%, hsl(var(--temple-surface-2)) 80%)'
                            : 'hsl(var(--temple-surface-2))'
                        }}
                      >
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong>{participant.user.name || participant.user.email}</strong>
                            {isTherapist ? (
                              <span
                                className="pill"
                                style={{ background: 'rgba(217, 164, 65, 0.2)', borderColor: 'rgba(217, 164, 65, 0.5)', color: '#f1d59a' }}
                              >
                                Terapeuta
                              </span>
                            ) : (
                              <span className="small-muted">{participantRoleLabel(participant.role)}</span>
                            )}
                          </div>
                          {!participant.consentAcceptedAt && (
                            <span className="small-muted">Consentimento pendente</span>
                          )}
                        </div>
                        {participant.role === 'PLAYER' && (
                          <button
                            className="btn-secondary px-3 py-1 text-xs"
                            onClick={() => handleRemoveParticipant(room.id, participant.id)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <strong>Timeline</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {room.participants.length > 1 && (
                      <select
                        value={selectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({ ...prev, [room.id]: event.target.value }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="btn-secondary" onClick={() => loadTimeline(room.id)}>
                      Atualizar timeline
                    </button>
                  </div>
                </div>
                {roomDetails?.loading ? (
                  <span className="small-muted">Carregando timeline...</span>
                ) : roomDetails?.error ? (
                  <span className="notice">{roomDetails.error}</span>
                ) : filteredMoves.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {filteredMoves.map((move) => (
                      <div
                        key={move.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'hsl(var(--temple-surface-2))'
                        }}
                      >
                        <div>
                          <strong>{move.participant.user.name || move.participant.user.email}</strong>
                          <div className="small-muted">
                            Jogada #{move.turnNumber} • {new Date(move.createdAt).toLocaleString('pt-BR')} • Dado {move.diceValue}
                          </div>
                          <div className="small-muted">
                            {move.fromPos} → {move.toPos}
                            {move.appliedJumpFrom ? ` • Atalho ${move.appliedJumpFrom}→${move.appliedJumpTo}` : ''}
                          </div>
                          {move.therapyEntries.length > 0 && (
                            <div className="small-muted">Registros: {move.therapyEntries.length}</div>
                          )}
                          {move.cardDraws.length > 0 && (
                            <div className="small-muted">Cartas: {move.cardDraws.map((draw) => draw.cards.join(',')).join(' | ')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {selectedParticipantId ? 'Nenhuma jogada para o jogador selecionado.' : 'Ainda não há jogadas.'}
                  </span>
                )}
              </>
            )}

            {activeTab === 'deck' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <strong>Deck randômico</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {room.participants.length > 1 && (
                      <select
                        value={selectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({ ...prev, [room.id]: event.target.value }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="btn-secondary" onClick={() => loadTimeline(room.id)}>
                      Atualizar timeline
                    </button>
                  </div>
                </div>
                {filteredDeckDraws.length ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {filteredDeckDraws.map((draw) => (
                      <div
                        key={draw.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'hsl(var(--temple-surface-2))'
                        }}
                      >
                        <div>
                          <strong>{draw.drawnBy.user.name || draw.drawnBy.user.email}</strong>
                          <div className="small-muted">
                            {new Date(draw.createdAt).toLocaleString('pt-BR')}
                            {draw.turnNumber ? ` • Jogada #${draw.turnNumber}` : ' • Sem jogada'}
                            {' '}• {draw.cards.join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {selectedParticipantId ? 'Nenhuma tiragem para o jogador selecionado.' : 'Nenhuma tiragem registrada.'}
                  </span>
                )}
              </>
            )}

            {activeTab === 'aiReports' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <strong>Relatórios IA</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {room.participants.length > 1 && (
                      <select
                        value={selectedParticipantId}
                        onChange={(event) =>
                          setTimelineParticipantFilters((prev) => ({ ...prev, [room.id]: event.target.value }))
                        }
                      >
                        <option value="">Todos os jogadores</option>
                        {room.participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.user.name || participant.user.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="btn-secondary" onClick={() => loadTimeline(room.id)}>
                      Atualizar timeline
                    </button>
                  </div>
                </div>
                {filteredAiReports.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {filteredAiReports.map((report) => (
                      <div key={report.id} className="card" style={{ padding: 12 }}>
                        <div className="small-muted">
                          {new Date(report.createdAt).toLocaleString('pt-BR')} • {report.kind}
                          {report.participant ? ` • ${report.participant.user.name || report.participant.user.email}` : ''}
                        </div>
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{report.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small-muted">
                    {selectedParticipantId ? 'Nenhum relatório para o jogador selecionado.' : 'Nenhum relatório ainda.'}
                  </span>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => handleExport(room.id, 'json')}>
                Exportar JSON
              </button>
              <button className="btn-secondary" onClick={() => handleExport(room.id, 'txt')}>
                Exportar TXT
              </button>
            </div>
          </div>
        )}
      </div>
    )
  })

  return (
    <div className="grid" style={{ gap: 24 }}>
      {notice && (
        <div className={`notice ${notice.variant === 'success' ? 'good' : ''}`}>
          {notice.message}
        </div>
      )}
      {canCreateRoom && (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <strong>Criar nova sala</strong>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Jogadores máximos</span>
              <input
                type="number"
                min={1}
                max={12}
                value={maxParticipants}
                onChange={(event) => setMaxParticipants(Number(event.target.value))}
              />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 22 }}>
              <input
                type="checkbox"
                checked={therapistPlays}
                onChange={(event) => setTherapistPlays(event.target.checked)}
              />
              <span>Terapeuta joga junto</span>
            </label>
            <button className="btn-primary" onClick={handleCreateRoom} disabled={creating}>
              {creating ? 'Criando...' : 'Criar sala'}
            </button>
          </div>
          <p className="small-muted">
            Defina se o terapeuta entra na fila. Quando ele jogar junto, ocupa 1 vaga de jogador.
          </p>
        </div>
      )}

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h2 className="section-title">Filtros de sessão</h2>
          <button className="btn-secondary" onClick={() => {
            setFilters({ status: '', from: '', to: '' })
            loadRooms({ status: '', from: '', to: '' })
          }}>
            Limpar filtros
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Ativas</option>
              <option value="CLOSED">Encerradas</option>
              <option value="COMPLETED">Concluídas</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>De</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Até</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>
          <button className="btn-secondary w-fit" style={{ alignSelf: 'center' }} onClick={() => loadRooms()}>
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <h2 className="section-title">Minhas sessões</h2>
        {loading ? (
          <div className="card">Carregando...</div>
        ) : rooms.length === 0 ? (
          <div className="card">Nenhuma sala encontrada com os filtros atuais.</div>
        ) : (
          roomCards
        )}
      </div>
    </div>
  )
}
