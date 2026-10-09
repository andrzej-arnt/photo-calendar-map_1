# Zasady i Specyfikacja Projektu: GeoPhoto Tracker 5×5 (Panel Czasowy)

## Opis Projektu
Aplikacja stanowi kompaktowy panel nawigacji czasowej w układzie 5×5, przygotowany do integracji z modułem mapy geograficznej (korelacja czasowo-przestrzenna zdjęć EXIF).

## Zasady Wyglądu i Interfejsu (UI/UX)
1. **Szerokość Panelu Bocznego:**
   - Główny kontener aplikacji (`main`), nagłówek (`header`), sekcja mapy oraz stopka są zdefiniowane na stałą szerokość kalendarza: **max-w-[560px]**.
   - Całość pełni rolę wąskiego panelu bocznego, obok którego (po prawej stronie) docelowo znajduje się mapa.

2. **Nagłówek i Elementy Sterujące:**
   - Brak logotypów i napisów promocyjnych/nagłówkowych (np. "GeoPhoto...", "Siatka czasu...", "5x5").
   - W pierwszym wierszu znajduje się aktualny czas rzeczywisty (zegar) oraz dyskretne przyciski akcji (Skok do daty, Dziś, Podgląd zdjęć, Info).
   - W drugim wierszu znajduje się opis zakładowy daty, a strzałki nawigacji `[<] [>]` są umieszczone z prawej strony, bezpośrednio przed tekstem zakresu dat.
   - W trzecim wierszu znajdują się przyciski wyboru skali czasu (`WIELOLECIE`, `ROK`, `MIESIĄC`, `10 DNI`, `DZIEŃ`, `GODZINY`), wyrównane do prawej strony.

3. **Matryca 5×5:**
   - Wyświetla dokładnie 25 kafelków w siatce 5×5.
   - Usunięto wskaźniki procentowe z lewego dolnego rogu kafelków (brak zbędnych cyfr).
   - Krawędzie kafelków posiadają stałą grubość 1px (`border`), a wysokość i układ są całkowicie stabilne podczas nawigacji.

4. **Nawigacja Czasowa:**
   - Obsługa zoomu czasowego kółkiem myszy (Kółko w górę = Zoom IN, Kółko w dół = Zoom OUT).
