'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTasks } from '@/hooks/useTasks'

interface TaskBySector {
  sector: string
  total: number
  completed: number
  pending: number
}

export function TasksChart() {
  const { tasks } = useTasks()

  // Calcular dados de tarefas por setor
  const tasksBySector = (tasks || []).reduce((acc, task) => {
    const existing = acc.find(item => item.sector === task.sector)
    if (existing) {
      existing.total += 1
      if (task.status === 'done') {
        existing.completed += 1
      } else {
        existing.pending += 1
      }
    } else {
      acc.push({
        sector: task.sector,
        total: 1,
        completed: task.status === 'done' ? 1 : 0,
        pending: task.status === 'done' ? 0 : 1,
      })
    }
    return acc
  }, [] as TaskBySector[])

  // Ordenar por total decrescente
  const sortedData = tasksBySector.sort((a, b) => b.total - a.total)

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Tarefas por Setor</CardTitle>
        <CardDescription>
          Distribuição de tarefas concluídas vs pendentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sector" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="completed" fill="hsl(var(--primary))" name="Concluídas" />
            <Bar dataKey="pending" fill="hsl(var(--accent))" name="Pendentes" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
