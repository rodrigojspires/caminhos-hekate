export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg">Página não encontrada</p>
        <a href="/" className="text-blue-500 hover:underline">
          Voltar ao início
        </a>
      </div>
    </div>
  )
}