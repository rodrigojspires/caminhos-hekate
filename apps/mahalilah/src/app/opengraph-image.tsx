import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(circle at 15% 20%, #2b354f 0, #121827 45%, #090d15 100%)',
          color: '#f4f6fb',
          padding: '64px 72px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            border: '1px solid rgba(203, 168, 107, 0.55)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 24,
            letterSpacing: 1.5,
            color: '#e3c78f'
          }}
        >
          MAHA LILAH ONLINE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
            Jornada de Autoconhecimento
          </p>
          <p style={{ margin: 0, fontSize: 34, color: '#d7deef', maxWidth: 960 }}>
            Tabuleiro ao vivo, registro por jogada e assistência por IA para sessões
            terapêuticas com mais clareza.
          </p>
        </div>
        <div style={{ fontSize: 28, color: '#e3c78f' }}>mahalilahonline.com.br</div>
      </div>
    ),
    {
      ...size
    }
  )
}
