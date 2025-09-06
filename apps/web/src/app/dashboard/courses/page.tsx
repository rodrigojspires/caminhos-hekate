import { Metadata } from 'next'
import MyCourses from '@/components/dashboard/courses/MyCourses'
import CourseFilters from '@/components/dashboard/courses/CourseFilters'
import CourseProgress from '@/components/dashboard/courses/CourseProgress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const metadata: Metadata = {
  title: 'Meus Cursos | Dashboard | Caminhos de Hekate',
  description: 'Gerencie seus cursos e acompanhe seu progresso'
}

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus Cursos</h1>
        <p className="text-muted-foreground">
          Acompanhe seu progresso e continue aprendendo
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Em Andamento</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
          <TabsTrigger value="progress">Progresso Detalhado</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <CourseFilters 
            onSearchChange={() => {}}
            onCategoryChange={() => {}}
            onLevelChange={() => {}}
            onStatusChange={() => {}}
            onSortChange={() => {}}
          />
          <MyCourses courses={[]} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <CourseFilters 
            onSearchChange={() => {}}
            onCategoryChange={() => {}}
            onLevelChange={() => {}}
            onStatusChange={() => {}}
            onSortChange={() => {}}
          />
          <MyCourses courses={[]} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <CourseProgress data={{
            totalCourses: 0,
            completedCourses: 0,
            inProgressCourses: 0,
            totalHours: 0,
            completedHours: 0,
            averageProgress: 0,
            streakDays: 0
          }} />
        </TabsContent>
      </Tabs>
    </div>
  )
}