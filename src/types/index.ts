export type UserRole = 'admin' | 'mitglied'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  kapazitaet?: 'verfuegbar' | 'eingeschraenkt' | 'ausgelastet'
  created_at: string
}

export interface Document {
  id: string
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Protocol {
  id: string
  title: string
  meeting_date: string
  file_path: string
  file_name: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  has_participant_list: boolean
  participant_template: 'overnight' | 'daytrip' | 'meeting' | null
  extra_columns: string[]
  hidden_columns: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  aufgabe: string
  beschreibung: string | null
  verantwortliche: string | null
  deadline: string | null
  erledigt: boolean
  created_at: string
}

export interface Participant {
  id: string
  project_id: string
  name: string
  rolle: string | null
  klasse: string | null
  anwesend: boolean
  gruppenname: string | null
  raum: string | null
  ueber_nacht: boolean | null
  buffet: boolean | null
  gegangen: boolean
  sonstiges: string | null
  extra: Record<string, string> | null
}

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface ZeitplanEintrag {
  id: string
  project_id: string
  uhrzeit: string | null
  programmpunkt: string
  ort: string | null
  verantwortlich: string | null
  bemerkung: string | null
  sort_order: number
  created_at: string
}

export interface SatzungFile {
  id: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_by: string
  created_at: string
}
