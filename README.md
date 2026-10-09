<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# GeoPhoto Tracker 5×5 — Uruchomienie Lokalne z bazą MSSQL

Aplikacja zintegrowana z bazą danych **Microsoft SQL Server (MSSQL)** oraz mapą geograficzną i matrycą czasową 5×5.

---

## Szybki Start na Twoim komputerze (Krok po Kroku)

### 1. Wymagania wstępne
* **Node.js**: Wersja 18, 20 lub nowsza (do pobrania z [nodejs.org](https://nodejs.org/)).
* **Microsoft SQL Server**: Zainstalowany lokalnie z utworzoną bazą `GeoPhotoTracker` (zawierającą tabelę `dbo.Photos`).

---

### 2. Przygotowanie MSSQL do połączeń TCP/IP i Uwierzytelniania
Aplikacje Node.js łączą się z SQL Server przez protokół sieciowy **TCP/IP**:

1. **Włącz TCP/IP w SQL Server:**
   * Otwórz **SQL Server Configuration Manager**.
   * Przejdź do: `SQL Server Network Configuration` -> `Protocols for MSSQLSERVER` (lub `SQLEXPRESS`).
   * Upewnij się, że protokół **TCP/IP** ma status **Enabled** (Włączony).
   * Kliknij prawym przyciskiem myszy na *SQL Server Services* i **zrestartuj usługę SQL Server**.

2. **Włącz tryb uwierzytelniania SQL Server (Mixed Mode):**
   * Otwórz **SQL Server Management Studio (SSMS)**.
   * Kliknij prawym przyciskiem myszy na swój serwer -> **Properties** (Właściwości) -> **Security** (Zabezpieczenia).
   * Zaznacz: **SQL Server and Windows Authentication mode**.
   * W sekcji *Security* -> *Logins*:
     * Włącz konto `sa` i ustaw dla niego hasło, **LUB**
     * Utwórz nowego użytkownika SQL (np. Login: `geophoto`, Hasło: `TwojeHaslo123`) i w sekcji *User Mapping* przypisz mu uprawnienia `db_datareader` do bazy `GeoPhotoTracker`.

---

### 3. Instalacja i konfiguracja aplikacji

1. Otwórz terminal (PowerShell lub CMD) w folderze z projektem.
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Utwórz plik `.env` w głównym katalogu projektu z konfiguracją bazy:
   ```env
   PORT=3000
   MSSQL_SERVER=localhost
   MSSQL_DATABASE=GeoPhotoTracker
   MSSQL_PORT=1433
   MSSQL_USER=sa
   MSSQL_PASSWORD=TwojeHasloSQL
   ```
   *(Jeśli Twoja instalacja to SQL Express z instancją nazwaną, podaj: `MSSQL_SERVER=localhost\\SQLEXPRESS`)*

---

### 4. Uruchomienie aplikacji

Wpisz w terminalu:
```bash
npm run dev
```

Po uruchomieniu w konsoli zobaczysz komunikat:
```text
[MSSQL] Połączono z bazą: localhost/GeoPhotoTracker
Serwer GeoPhoto Tracker uruchomiony na: http://localhost:3000
```

Otwórz w przeglądarce:
👉 **http://localhost:3000**

Aplikacja automatycznie załaduje wszystkie zdjęcia z bazy, ustawi zakres dat w kalendarzu 5×5 i wyświetli punkty na mapie!

---

## Rozwiązywanie problemów (Troubleshooting)

1. **Błąd połączenia: `Failed to connect to localhost:1433 - connect ECONNREFUSED`**
   * Usługa SQL Server nie nasłuchuje na porcie 1433.
   * Otwórz *SQL Server Configuration Manager* → *SQL Server Network Configuration* → *Protocols for MSSQLSERVER* (lub *SQLEXPRESS*) → upewnij się, że **TCP/IP** jest **Enabled**.
   * Wejdź we właściwości TCP/IP → zakładka *IP Addresses* → zjedź na sam dół do sekcji **IPAll** → pole **TCP Port** ustaw na `1433`.
   * **Zrestartuj usługę SQL Server** w *SQL Server Services*.

2. **Błąd: `Login failed for user 'sa'`**
   * Serwer SQL nie ma włączonego trybu uwierzytelniania Mixed Mode (SQL Server and Windows Authentication).
   * Włącz Mixed Mode w SSMS (Właściwości serwera → *Security*) i zrestartuj serwer SQL.
   * Upewnij się, że login `sa` jest włączony (*Enabled*) i ma nadane poprawne hasło.

3. **Użycie instancji nazwanej (SQL Server Express):**
   * Jeśli Twoja instancja to np. `AAT-NTB\SQLEXPRESS` lub `localhost\SQLEXPRESS`, wpisz w pliku `.env`:
     ```env
     MSSQL_SERVER=localhost\SQLEXPRESS
     ```


