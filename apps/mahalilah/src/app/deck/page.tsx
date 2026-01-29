import { HOUSES, getHousePrompt } from '@hekate/mahalilah-core'

export default function DeckPage() {
  return (
    <main>
      <section className="grid" style={{ gap: 20 }}>
        <header>
          <div className="badge">Biblioteca do deck</div>
          <h1 style={{ marginTop: 8 }}>Cartas Maha Lilah (72)</h1>
          <p className="small-muted">Consulte as cartas fora do jogo e imprima se desejar.</p>
        </header>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {HOUSES.map((house) => (
            <div key={house.number} className="card" style={{ display: 'grid', gap: 8 }}>
              <div className="badge">Casa {house.number}</div>
              <strong>{house.title}</strong>
              <span className="small-muted">{house.description}</span>
              <div className="notice">{getHousePrompt(house.number)}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
