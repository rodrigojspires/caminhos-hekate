"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Question = {
  id: string
  text: string
  options: string[]
}

export default function LessonQuiz({ courseId, lessonId }: { courseId: string, lessonId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<{ id: string, title: string, passingScore: number, questions: Question[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number, passed: boolean } | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`).then(async (r) => {
      if (!mounted) return
      if (r.status === 404) {
        setQuiz(null)
        setLoading(false)
        return
      }
      if (!r.ok) {
        setError('Não foi possível carregar o quiz')
        setLoading(false)
        return
      }
      const j = await r.json()
      if (j?.quiz) {
        setQuiz(j.quiz)
      } else {
        setQuiz(null)
      }
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      setError('Erro de rede ao carregar o quiz')
      setLoading(false)
    })
    return () => { mounted = false }
  }, [courseId, lessonId])

  const submit = async () => {
    setResult(null)
    setError(null)
    const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers)
    })
    if (res.ok) {
      const j = await res.json()
      setResult({ score: j.score, passed: j.passed })
    } else {
      setError('Falha ao enviar tentativa do quiz')
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando quiz...</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (!quiz) return null

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4 pt-6">
        <h3 className="font-semibold">{quiz.title || 'Quiz'}</h3>
        {quiz.questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <p className="font-medium text-sm">{q.text}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {q.options.map((opt, idx) => (
                <label key={idx} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === idx}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Nota mínima: {quiz.passingScore}%</div>
          <Button size="sm" onClick={submit}>Enviar Respostas</Button>
        </div>

        {result && (
          <div className={`p-3 border rounded ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className="text-sm">Sua pontuação: <b>{result.score}%</b> — {result.passed ? 'Aprovado(a)!' : 'Ainda não atingiu a nota mínima.'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
