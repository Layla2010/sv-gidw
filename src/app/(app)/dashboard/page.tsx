'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { differenceInDays, format, isPast, isToday } from 'date-fns'
import { de } from 'date-fns/locale'
import { AlertCircle, Clock, CheckCircle2, FolderOpen, FileText } from 'lucide-react'
import type { Task, Project, Document, Protocol } from '@/types'

interface TaskWithProject extends Task {
  projects: { name: string; id: string } | null
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const date = parseLocalDate(deadline)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = differenceInDays(date, today)

  if (isPast(date) && !isToday(date)) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><AlertCircle size={11} /> Überfällig</span>
  }
  if (daysLeft <= 2) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><AlertCircle size={11} /> {daysLeft === 0 ? 'Heute' : `${daysLeft}d`}</span>
  }
  if (daysLeft <= 6) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full"><Clock size={11} /> {daysLeft}d</span>
  }
  return <span className="text-xs text-gray-500">{format(date, 'd. MMM', { locale: de })}</span>
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [recentDocs, setRecentDocs] = useState<Document[]>([])
  const [recentProtocols, setRecentProtocols] = useState<Protocol[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [tasksRes, docsRes, protocolsRes, projectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, projects(id, name)')
          .eq('erledigt', false)
          .not('deadline', 'is', null)
          .order('deadline', { ascending: true })
          .limit(10),
        supabase
          .from('documents')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('protocols')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(5),
      ])
      setTasks(tasksRes.data ?? [])
      setRecentDocs(docsRes.data ?? [])
      setRecentProtocols(protocolsRes.data ?? [])
      setProjects(projectsRes.data ?? [])
    }
    load()
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Offene Aufgaben */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Offene Aufgaben</h2>
            <Link href="/projekte" className="text-sm text-blue-600 hover:underline">Alle Projekte →</Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Keine offenen Aufgaben mit Deadline</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.aufgabe}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.projects && (
                        <Link
                          href={`/projekte/${task.projects.id}`}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          {task.projects.name}
                        </Link>
                      )}
                      {task.verantwortliche && (
                        <span className="text-xs text-gray-400">· {task.verantwortliche}</span>
                      )}
                    </div>
                  </div>
                  {task.deadline && <DeadlineBadge deadline={task.deadline} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aktive Projekte */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Aktive Projekte</h2>
            <Link href="/projekte" className="text-sm text-blue-600 hover:underline">Alle →</Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Projekte</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(project => (
                <Link
                  key={project.id}
                  href={`/projekte/${project.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{project.name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(project.updated_at), 'd. MMM', { locale: de })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Zuletzt bearbeitet */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Zuletzt bearbeitet</h2>

          {recentDocs.length === 0 && recentProtocols.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Noch keine Dokumente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentDocs.map(doc => (
                <Link
                  key={doc.id}
                  href={`/allgemeine-sv-arbeit/${doc.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <FileText size={16} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(doc.updated_at), 'd. MMM', { locale: de })}
                    </p>
                  </div>
                </Link>
              ))}
              {recentProtocols.map(protocol => (
                <div
                  key={protocol.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                >
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{protocol.title}</p>
                    <p className="text-xs text-gray-500">
                      Protokoll · {format(new Date(protocol.meeting_date), 'd. MMM', { locale: de })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
