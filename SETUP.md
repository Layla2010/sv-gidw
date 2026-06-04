# SV-App — Setup-Anleitung

## 1. Supabase-Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein kostenloses Konto
2. Erstelle ein neues Projekt (wähle Region **Frankfurt** für DSGVO-Konformität)
3. Warte bis das Projekt bereit ist (~2 Minuten)

## 2. Datenbank einrichten

1. Öffne im Supabase-Dashboard: **SQL Editor**
2. Kopiere den Inhalt von `supabase/schema.sql` und führe ihn aus

## 3. Storage Buckets erstellen

Im Supabase-Dashboard unter **Storage → New bucket**:

| Bucket-Name     | Öffentlich | Max. Dateigröße |
|-----------------|------------|-----------------|
| `protocols`     | Nein       | 10 MB           |
| `project-files` | Nein       | 10 MB           |
| `satzung`       | Nein       | 10 MB           |

Für jeden Bucket unter **Policies → New policy** folgende RLS-Policy hinzufügen:
- Authenticated users can upload, download, delete

## 4. Umgebungsvariablen setzen

Öffne `.env.local` und ersetze die Platzhalter:

```
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=DEIN-ANON-KEY
```

Beides findest du unter: **Settings → API**

## 5. Ersten Admin-Account erstellen

Im Supabase-Dashboard unter **Authentication → Users → Invite user**:
- E-Mail-Adresse eingeben und einladen
- Nach dem Login: in **SQL Editor** ausführen:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'deine@email.de';
  ```

## 6. Lokal starten

```bash
npm install
npm run dev
```

App läuft auf: http://localhost:3000

## 7. Auf Vercel deployen

```bash
npm install -g vercel
vercel
```

Umgebungsvariablen bei Vercel unter **Settings → Environment Variables** eintragen.

## Weitere Mitglieder einladen

Als Admin: In der App unter **Admin → Mitglied einladen** oder direkt im Supabase-Dashboard unter **Authentication → Users → Invite user**.
