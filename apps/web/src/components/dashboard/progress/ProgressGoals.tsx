"use client"

import { useState } from "react"
import { Target, Plus, Edit3, Trash2, CheckCircle, Clock, Calendar, TrendingUp, Award } from "lucide-react"

interface Goal {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  target: number
  current: number
  unit: string
  deadline: string
  status: 'active' | 'completed' | 'paused' | 'overdue'
  category: 'study_time' | 'courses' | 'certificates' | 'points' | 'streak'
  createdAt: string
}

interface ProgressGoalsProps {
  goals: Goal[]
  onCreateGoal: (goal: Omit<Goal, 'id' | 'current' | 'status' | 'createdAt'>) => void
  onUpdateGoal: (id: string, updates: Partial<Goal>) => void
  onDeleteGoal: (id: string) => void
  loading?: boolean
}

export default function ProgressGoals({ 
  goals, 
  onCreateGoal, 
  onUpdateGoal, 
  onDeleteGoal, 
  loading = false 
}: ProgressGoalsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'weekly' as Goal['type'],
    target: 0,
    unit: 'minutos',
    deadline: '',
    category: 'study_time' as Goal['category']
  })

  const getGoalIcon = (category: Goal['category']) => {
    switch (category) {
      case 'study_time':
        return Clock
      case 'courses':
        return Target
      case 'certificates':
        return Award
      case 'points':
        return TrendingUp
      case 'streak':
        return Calendar
      default:
        return Target
    }
  }

  const getGoalColor = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-900/40 border-green-500'
      case 'active':
        return 'text-indigo-400 bg-indigo-900/40 border-indigo-500'
      case 'paused':
        return 'text-slate-300 bg-slate-800 border-slate-700'
      case 'overdue':
        return 'text-red-400 bg-red-900/40 border-red-500'
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700'
    }
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline)
    const now = new Date()
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 0) {
      return `${Math.abs(diffInDays)} dias atrasado`
    } else if (diffInDays === 0) {
      return 'Hoje'
    } else if (diffInDays === 1) {
      return 'Amanhã'
    } else {
      return `${diffInDays} dias restantes`
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateGoal(formData)
    setFormData({
      title: '',
      description: '',
      type: 'weekly',
      target: 0,
      unit: 'minutos',
      deadline: '',
      category: 'study_time'
    })
    setShowCreateForm(false)
  }

  const goalTypes = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'custom', label: 'Personalizada' }
  ]

  const goalCategories = [
    { value: 'study_time', label: 'Tempo de Estudo', unit: 'minutos' },
    { value: 'courses', label: 'Cursos', unit: 'cursos' },
    { value: 'certificates', label: 'Certificados', unit: 'certificados' },
    { value: 'points', label: 'Pontos', unit: 'pontos' },
    { value: 'streak', label: 'Sequência', unit: 'dias' }
  ]

  if (loading) {
    return (
      <div className="bg-slate-900 text-slate-100 rounded-lg shadow-sm border border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="h-6 bg-slate-700 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="p-4 border border-slate-800 rounded-lg animate-pulse bg-slate-800/60">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-slate-700 rounded mb-1 w-32"></div>
                      <div className="h-3 bg-slate-700 rounded w-24"></div>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg shadow-sm border border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Metas de Progresso</h2>
            <p className="text-slate-300 mt-1">Defina e acompanhe suas metas de aprendizado</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Meta
          </button>
        </div>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <div className="p-6 border-b border-slate-800 bg-slate-800/60">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Título da Meta
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                  placeholder="Ex: Estudar 30 minutos por dia"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const category = e.target.value as Goal['category']
                    const categoryData = goalCategories.find(c => c.value === category)
                    setFormData(prev => ({ 
                      ...prev, 
                      category,
                      unit: categoryData?.unit || 'unidades'
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                >
                  {goalCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                rows={2}
                placeholder="Descreva sua meta..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Goal['type'] }))}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                >
                  {goalTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Meta ({formData.unit})
                </label>
                <input
                  type="number"
                  value={formData.target}
                  onChange={(e) => setFormData(prev => ({ ...prev, target: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Prazo
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Criar Meta
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      <div className="p-6">
        {goals.length === 0 ? (
          <div className="text-center py-12 text-slate-300">
            <Target className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma meta definida</h3>
            <p className="text-slate-400 mb-6">
              Crie suas primeiras metas para acompanhar seu progresso.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Criar Primeira Meta
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {goals.map((goal) => {
              const Icon = getGoalIcon(goal.category)
              const progress = getProgressPercentage(goal.current, goal.target)
              const colorClass = getGoalColor(goal.status)
              
              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-lg border ${colorClass} bg-slate-800/40`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        <p className="text-sm text-slate-300">{goal.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingGoal(goal.id)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                      <span>{goal.current} de {goal.target} {goal.unit}</span>
                      <span className="text-slate-100">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          goal.status === 'completed' ? 'bg-green-500' :
                          goal.status === 'active' ? 'bg-indigo-500' :
                          goal.status === 'overdue' ? 'bg-red-500' : 'bg-slate-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDeadline(goal.deadline)}
                    </span>
                    <span className="capitalize">
                      {goal.type === 'daily' ? 'Diária' :
                       goal.type === 'weekly' ? 'Semanal' :
                       goal.type === 'monthly' ? 'Mensal' : 'Personalizada'}
                    </span>
                  </div>
                  
                  {goal.status === 'completed' && (
                    <div className="mt-2 flex items-center gap-1 text-green-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Meta concluída!
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-slate-200">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {goals.filter(g => g.status === 'completed').length}
                </div>
                <div className="text-sm text-slate-300">Concluídas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-400">
                  {goals.filter(g => g.status === 'active').length}
                </div>
                <div className="text-sm text-slate-300">Ativas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {goals.filter(g => g.status === 'overdue').length}
                </div>
                <div className="text-sm text-slate-300">Atrasadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-400">
                  {Math.round(goals.reduce((acc, goal) => acc + getProgressPercentage(goal.current, goal.target), 0) / goals.length)}%
                </div>
                <div className="text-sm text-slate-300">Progresso Médio</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
