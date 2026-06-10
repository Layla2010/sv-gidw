-- Chronik Tabelle
create table public.chronik (
  id uuid default gen_random_uuid() primary key,
  datum text not null,
  aktion text not null,
  bis_wann text null,
  sv_lehrer text null,
  beschreibung text null,
  created_at timestamptz default now()
);

alter table public.chronik enable row level security;
create policy "Eingeloggte Nutzer können Chronik lesen" on public.chronik
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Chronik bearbeiten" on public.chronik
  for all using (auth.uid() is not null);

-- Daten importieren
insert into public.chronik (datum, aktion, sv_lehrer, beschreibung) values
('1968', 'Erwähnung der SV', null, 'https://gidw.de/ueber-uns/schulgeschichte/275-1970-1989 bzw https://archive.is/...'),
('1977', 'Konflikt zwischen Schülerzeitungen', null, 'Der „Wüstling" wird als Alternative zur „0-8-15" rausgebracht. Letzterer wird SV-Nähe unterstellt. Siehe Archiv/Schülerzeitung1977.pdf'),
('2007-03-09', 'SV-Fahrt', 'Derkes', '1 Wochenende Fortbildung für den SR. Damals unter dem Namen SV-Seminar.'),
('2007-05-18', 'Amsterdamfahrt', null, null),
('2011-12-01', 'Foto', 'Wesselmann', 'Foto mit Herrn Wesselmann als SV-Lehrer in diesem Schuljahr. Genaues Datum unbekannt'),
('2012-11-30', 'Lesenacht', 'Wesselmann (?)', null),
('2016-01-15', 'Internes SV-Seminar', 'Schröer(?)', 'Programm am Freitag und Samstag mit Fortbildungen.'),
('2016-04-09', 'Heideparkfahrt', null, null),
('2016-12-09', 'Lesenacht', null, null),
('2017-03-24', 'AdventureNight', null, null),
('2018-01-19', 'SV-Seminar', 'Materi', 'Ein Tag lang, konnte man als außenstehender Schüler in die SV-Arbeit schnuppern'),
('2018-02-09', 'AdventureNight', null, null),
('2018-12-14', 'Lesenacht', null, null),
('2019-01-18', 'SV-Wahlen', null, null),
('2019-06-15', 'Heideparkfahrt', null, null),
('2019-12-13', 'Lesenacht', null, null),
('2020-03-06', 'AdventureNight', null, null),
('2021-11-19', 'SV-Logowettbewerb', 'S. Schneppat', null),
('2022-01-11', 'SV-Wahlen', 'S. Schneppat', null),
('2022-01-22', 'SV-Seminar', 'S. Schneppat', 'Ein Tag lang, konnte man als außenstehender Schüler in die SV-Arbeit schnuppern'),
('2022-05-20', 'AdventureNight', 'S. Schneppat', null),
('2022-06-28', 'Prideday', 'S. Schneppat', '1. Prideday'),
('2022-12-02', 'Lesenacht', 'S. Schneppat', null),
('2023-03-09', 'SV-Wahlen', 'S. Schneppat', null),
('2023-03-10', 'AdventureNight', 'S. Schneppat', null),
('2023-04-20', 'Wiederaufnahme von SV-Sprechstunden', 'S. Schneppat', 'Vor Corona gab es irgendwann schon mal SV-Sprechstunden.'),
('2023-05-17', 'Prideday', 'S. Schneppat', '2. Prideday'),
('2023-09-16', 'Heideparkfahrt', 'S. Schneppat', null),
('2023-09-27', 'SR-Sitzung', 'S. Schneppat', null),
('2023-10-13', 'Wechsel SV-Lehrer', null, 'Von S. Schneppat zu Cengiz'),
('2023-12-08', 'Lesenacht', 'Cengiz', null),
('2024-01-25', 'Demoaufruf', 'Cengiz', 'Aufruf zum Demo gegen den Faschismus über Instagram, zusammen mit vielen anderen SVen. Vorangegangen ist eine intensive Diskussion mit dem Schulleiter N. Fischer. Siehe Protokolle aus der Zeit.'),
('2024-02-15', 'SV-Wahlen', 'Cengiz', null),
('2024-03-08', 'AdventureNight', 'Cengiz', null),
('2024-03-13', 'Tagesseminar', 'Cengiz', '(Kostenloses Seminar von der FDP-Stiftung, Tipps zur SV-Arbeit)'),
('2024-04-10', 'SR-Sitzung', 'Cengiz', null),
('2024-05-17', 'Prideday', 'Cengiz', '3. Prideday'),
('2024-08-24', 'Heideparkfahrt', 'Cengiz', null),
('2024-09-02', 'SR-Sitzung', 'Cengiz', null),
('2024-12-13', 'Lesenacht', 'Cengiz', null),
('2025-03-07', 'AdventureNight', 'Cengiz', null);
