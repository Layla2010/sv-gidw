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

function Widget({ title, linkHref, linkLabel, children, accent }: {
  title: string
  linkHref?: string
  linkLabel?: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col min-h-0 lg:h-full overflow-hidden shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-gray-100 ${accent ?? ''}`}>
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {linkHref && <Link href={linkHref} className="text-xs text-blue-600 hover:underline">{linkLabel}</Link>}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {children}
      </div>
    </div>
  )
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
        supabase.from('tasks').select('*, projects(id, name)').eq('erledigt', false).not('deadline', 'is', null).order('deadline', { ascending: true }).limit(20),
        supabase.from('documents').select('*').not('title', 'eq', '__satzung__').order('updated_at', { ascending: false }).limit(10),
        supabase.from('protocols').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(10),
      ])
      setTasks(tasksRes.data ?? [])
      setRecentDocs(docsRes.data ?? [])
      setRecentProtocols(protocolsRes.data ?? [])
      setProjects(projectsRes.data ?? [])
    }
    load()
  }, [])

  return (
    <div className="flex flex-col p-3 md:p-4 gap-3 md:gap-4 lg:h-full">
      <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Dashboard</h1>

      {/* Desktop: 2 Zeilen. Mobile: gestapelt */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:flex-1 lg:min-h-0 lg:grid-rows-[3fr_2fr] lg:grid-cols-3 lg:overflow-hidden">

        {/* Offene Aufgaben */}
        <div className="lg:col-span-2 lg:row-span-1 min-h-0">
          <Widget title="Offene Aufgaben" linkHref="/projekte" linkLabel="Alle Projekte →" accent="bg-amber-50">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <CheckCircle2 size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Keine offenen Aufgaben mit Deadline</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tasks.map(task => (
                  <Link key={task.id} href={`/projekte/${task.projects?.id}#task-${task.id}`} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.aufgabe}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.projects && (
                          <span className="text-xs text-gray-500">{task.projects.name}</span>
                        )}
                        {task.verantwortliche && (
                          <span className="text-xs text-gray-400">· {task.verantwortliche}</span>
                        )}
                      </div>
                    </div>
                    {task.deadline && <DeadlineBadge deadline={task.deadline} />}
                  </Link>
                ))}
              </div>
            )}
          </Widget>
        </div>

        {/* Aktive Projekte */}
        <div className="lg:col-span-1 lg:row-span-1 min-h-0">
          <Widget title="Aktive Projekte" linkHref="/projekte" linkLabel="Alle →" accent="bg-blue-50">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <FolderOpen size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Noch keine Projekte</p>
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map(project => (
                  <Link key={project.id} href={`/projekte/${project.id}`}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderOpen size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{project.name}</p>
                      <p className="text-xs text-gray-500">{format(new Date(project.updated_at), 'd. MMM', { locale: de })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Widget>
        </div>

        {/* Zuletzt bearbeitet */}
        <div className="lg:col-span-3 min-h-0">
          <Widget title="Zuletzt bearbeitet" accent="bg-violet-50">
            {recentDocs.length === 0 && recentProtocols.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <FileText size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Noch keine Dokumente</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[...recentDocs, ...recentProtocols].map((item, i) => {
                  const isDoc = 'content' in item
                  return isDoc ? (
                    <Link key={item.id} href={`/allgemeine-sv-arbeit/${item.id}`}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                      <FileText size={14} className="text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{(item as Document).title}</p>
                        <p className="text-xs text-gray-400">{format(new Date((item as Document).updated_at), 'd. MMM', { locale: de })}</p>
                      </div>
                    </Link>
                  ) : (
                    <div key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{(item as Protocol).title}</p>
                        <p className="text-xs text-gray-400">Protokoll · {format(new Date((item as Protocol).meeting_date), 'd. MMM', { locale: de })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Widget>
        </div>
      </div>
    </div>
  )
}
