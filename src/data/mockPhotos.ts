import { PhotoEvent } from '../types';

// High-quality sample photos matching distinct location themes
const NATURE_PHOTOS = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80', // Tatry / góry
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80', // Dolina / jezioro
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80', // Mglisty las / Bieszczady
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&auto=format&fit=crop&q=80', // Szlak leśny
];

const SEA_PHOTOS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', // Bałtyk / plaża
  'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=600&auto=format&fit=crop&q=80', // Klif / brzeg morza
  'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80', // Zachód słońca nad wodą
];

const FJORD_PHOTOS = [
  'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=600&auto=format&fit=crop&q=80', // Norwegia / fiordy
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80', // Północny krajobraz
];

const CITY_PHOTOS = [
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop&q=80', // Zabytki / Londyn / Europa
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&auto=format&fit=crop&q=80', // Rzym / Włochy
  'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80', // Stare kamienice / rynek
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80', // Architektura miejska
];

interface RawTripPhoto {
  title: string;
  locationName: string;
  lat: number;
  lng: number;
  date: [number, number, number, number, number]; // [rok, miesiac(0-11), dzien, godzina, minuta]
  category: 'trip' | 'nature' | 'urban' | 'event';
  imagePool: string[];
}

function generateMockPhotos(): PhotoEvent[] {
  // 1. Zachowane oryginalne serie bazowe (109 zdjęć)
  const baseTrips: RawTripPhoto[][] = [
    // 1. Weekend w Warszawie (Październik 2026)
    [
      { title: 'Plac Zamkowy i Kolumna Zygmunta', locationName: 'Warszawa, Plac Zamkowy', lat: 52.2480, lng: 21.0145, date: [2026, 9, 18, 11, 15], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Rynek Starego Miasta', locationName: 'Warszawa, Stare Miasto', lat: 52.2497, lng: 21.0122, date: [2026, 9, 18, 13, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Spacer po Bulwarach Wiślanych', locationName: 'Warszawa, Bulwary Wiślane', lat: 52.2410, lng: 21.0250, date: [2026, 9, 18, 16, 20], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Centrum Nauki Kopernik o zmierzchu', locationName: 'Warszawa, Powiśle', lat: 52.2419, lng: 21.0287, date: [2026, 9, 18, 18, 45], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Pałac na Wyspie w Łazienkach', locationName: 'Warszawa, Łazienki Królewskie', lat: 52.2148, lng: 21.0353, date: [2026, 9, 19, 10, 45], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Pomnik Chopina w barwach jesieni', locationName: 'Warszawa, Łazienki Królewskie', lat: 52.2160, lng: 21.0285, date: [2026, 9, 19, 12, 10], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Ogród na dachu Biblioteki Uniwersyteckiej', locationName: 'Warszawa, BUW', lat: 52.2425, lng: 21.0245, date: [2026, 9, 19, 15, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Plac Defilad i Pałac Kultury', locationName: 'Warszawa, Plac Defilad', lat: 52.2319, lng: 21.0060, date: [2026, 9, 20, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Królewska Rezydencja w Wilanowie', locationName: 'Warszawa, Pałac w Wilanowie', lat: 52.1650, lng: 21.0905, date: [2026, 9, 20, 14, 20], category: 'trip', imagePool: CITY_PHOTOS },
    ],

    // 2. Wypad w Tatry i na Podhale (Sierpień 2025)
    [
      { title: 'Krupówki w porannym słońcu', locationName: 'Zakopane, Krupówki', lat: 49.2965, lng: 19.9530, date: [2025, 7, 12, 9, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Kolejka linowa w Kuźnicach', locationName: 'Zakopane, Kuźnice', lat: 49.2690, lng: 19.9810, date: [2025, 7, 12, 11, 45], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Panorama z Kasprowego Wierchu', locationName: 'Tatry, Kasprowy Wierch', lat: 49.2317, lng: 19.9814, date: [2025, 7, 12, 14, 0], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Schronisko Murowaniec', locationName: 'Tatry, Hala Gąsienicowa', lat: 49.2435, lng: 20.0065, date: [2025, 7, 12, 16, 45], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Wejście do Doliny Kościeliskiej', locationName: 'Tatry, Kiry', lat: 49.2568, lng: 19.8685, date: [2025, 7, 13, 8, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Wąwóz Kraków i Smocza Jama', locationName: 'Tatry, Wąwóz Kraków', lat: 49.2460, lng: 19.8650, date: [2025, 7, 13, 11, 15], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Odpoczynek w Schronisku Ornak', locationName: 'Tatry, Schronisko Ornak', lat: 49.2330, lng: 19.8580, date: [2025, 7, 13, 13, 45], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Lustro wody w Smreczyńskim Stawie', locationName: 'Tatry, Smreczyński Staw', lat: 49.2230, lng: 19.8550, date: [2025, 7, 13, 15, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Droga Oswalda Balzera', locationName: 'Tatry, Palenica Białczańska', lat: 49.2550, lng: 20.1030, date: [2025, 7, 14, 7, 45], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Mnich nad Morskim Okiem', locationName: 'Tatry, Morskie Oko', lat: 49.2014, lng: 20.0710, date: [2025, 7, 14, 10, 15], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Czarny Staw pod Rysami', locationName: 'Tatry, Czarny Staw', lat: 49.1890, lng: 20.0780, date: [2025, 7, 14, 12, 45], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Szczyt Rysy – Dach Polski', locationName: 'Tatry, Rysy', lat: 49.1794, lng: 20.0881, date: [2025, 7, 14, 15, 20], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Gubałówka z widokiem na Giewont', locationName: 'Zakopane, Gubałówka', lat: 49.3075, lng: 19.9360, date: [2025, 7, 15, 10, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Zabytkowe drewniane chałupy', locationName: 'Podhale, Chochołów', lat: 49.3620, lng: 19.8200, date: [2025, 7, 15, 13, 15], category: 'urban', imagePool: CITY_PHOTOS },
    ],

    // 3. Majówka w Krakowie i Małopolsce (Maj 2025)
    [
      { title: 'Krakowski Rynek i Sukiennice', locationName: 'Kraków, Rynek Główny', lat: 50.0619, lng: 19.9373, date: [2025, 4, 1, 10, 15], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Hejnał z Wieży Mariackiej', locationName: 'Kraków, Kościół Mariacki', lat: 50.0616, lng: 19.9392, date: [2025, 4, 1, 12, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Dziedziniec Arkadowy Wawelu', locationName: 'Kraków, Wawel', lat: 50.0541, lng: 19.9354, date: [2025, 4, 1, 14, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Smok Wawelski nad Wisłą', locationName: 'Kraków, Bulwary Wiślane', lat: 50.0525, lng: 19.9330, date: [2025, 4, 1, 17, 15], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Klimatyczny Kazimierz i Plac Nowy', locationName: 'Kraków, Kazimierz', lat: 50.0520, lng: 19.9450, date: [2025, 4, 2, 10, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Ulica Szeroka i Stara Synagoga', locationName: 'Kraków, Kazimierz', lat: 50.0528, lng: 19.9482, date: [2025, 4, 2, 13, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Kładka Bernatka i kłódki zakochanych', locationName: 'Kraków, Kładka Bernatka', lat: 50.0470, lng: 19.9465, date: [2025, 4, 2, 15, 45], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Zachód słońca z Kopca Krakusa', locationName: 'Kraków, Kopiec Krakusa', lat: 50.0380, lng: 19.9585, date: [2025, 4, 2, 19, 0], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Podziemna Trasa Turystyczna', locationName: 'Wieliczka, Kopalnia Soli', lat: 49.9831, lng: 20.0558, date: [2025, 4, 3, 11, 0], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Brama Krakowska w Ojcowie', locationName: 'Ojców, Dolina Prądnika', lat: 50.2110, lng: 19.8290, date: [2025, 4, 3, 14, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Zamek Pieskowa Skała i Maczuga Herkulesa', locationName: 'Ojców, Pieskowa Skała', lat: 50.2442, lng: 19.7801, date: [2025, 4, 3, 17, 0], category: 'trip', imagePool: NATURE_PHOTOS },
    ],

    // 4. Wyprawa na Lofoty i do Norwegii (Lipiec 2024)
    [
      { title: 'Nowoczesny gmach Opery w Oslo', locationName: 'Oslo, Opera', lat: 59.9075, lng: 10.7530, date: [2024, 6, 8, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Rzeźby w Parku Vigelanda', locationName: 'Oslo, Vigelandsparken', lat: 59.9270, lng: 10.7010, date: [2024, 6, 8, 15, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Kolorowe drewniane nabrzeże Bryggen', locationName: 'Bergen, Bryggen', lat: 60.3970, lng: 5.3245, date: [2024, 6, 9, 10, 15], category: 'urban', imagePool: FJORD_PHOTOS },
      { title: 'Widok na Bergen z kolejki Fløibanen', locationName: 'Bergen, Fløyen', lat: 60.3950, lng: 5.3430, date: [2024, 6, 9, 14, 0], category: 'trip', imagePool: FJORD_PHOTOS },
      { title: 'Punkt widokowy Flydalsjuvet', locationName: 'Geirangerfjord, Norwegia', lat: 62.0910, lng: 7.2230, date: [2024, 6, 10, 12, 30], category: 'nature', imagePool: FJORD_PHOTOS },
      { title: 'Wodospad Siedem Sióstr', locationName: 'Geirangerfjord, Norwegia', lat: 62.1080, lng: 7.1120, date: [2024, 6, 10, 16, 0], category: 'nature', imagePool: FJORD_PHOTOS },
      { title: 'Podejście na Trolltungę', locationName: 'Skjeggedal, Norwegia', lat: 60.1330, lng: 6.6260, date: [2024, 6, 11, 10, 0], category: 'trip', imagePool: FJORD_PHOTOS },
      { title: 'Język Trolla nad jeziorem Ringedalsvatnet', locationName: 'Trolltunga, Norwegia', lat: 60.1242, lng: 6.7400, date: [2024, 6, 11, 14, 30], category: 'trip', imagePool: FJORD_PHOTOS },
      { title: 'Czerwone rorbuer w Reine', locationName: 'Lofoty, Reine', lat: 67.9333, lng: 13.0833, date: [2024, 6, 12, 13, 0], category: 'nature', imagePool: FJORD_PHOTOS },
      { title: 'Pocztówkowy most w Hamnøy', locationName: 'Lofoty, Hamnøy', lat: 67.9470, lng: 13.1310, date: [2024, 6, 12, 16, 30], category: 'trip', imagePool: FJORD_PHOTOS },
      { title: 'Strome podejście na Reinebringen', locationName: 'Lofoty, Reinebringen', lat: 67.9270, lng: 13.0720, date: [2024, 6, 12, 20, 0], category: 'nature', imagePool: FJORD_PHOTOS },
      { title: 'Turkusowe wody arktycznej plaży Haukland', locationName: 'Lofoty, Plaża Haukland', lat: 68.1990, lng: 13.5290, date: [2024, 6, 13, 11, 30], category: 'nature', imagePool: SEA_PHOTOS },
      { title: 'Górski zachód słońca na plaży Uttakleiv', locationName: 'Lofoty, Uttakleiv', lat: 68.2120, lng: 13.5040, date: [2024, 6, 13, 15, 45], category: 'nature', imagePool: SEA_PHOTOS },
      { title: 'Boisko piłkarskie na skałach Henningsvær', locationName: 'Lofoty, Henningsvær', lat: 68.1540, lng: 14.2070, date: [2024, 6, 13, 18, 30], category: 'urban', imagePool: FJORD_PHOTOS },
      { title: 'Katedra Arktyczna w Tromsø', locationName: 'Tromsø, Katedra', lat: 69.6480, lng: 18.9870, date: [2024, 6, 14, 12, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Panorama Tromsø z kolejki Fjellheisen', locationName: 'Tromsø, Fjellheisen', lat: 69.6410, lng: 18.9850, date: [2024, 6, 14, 16, 0], category: 'trip', imagePool: FJORD_PHOTOS },
    ],

    // 5. Wakacje nad Bałtykiem – Trójmiasto i Półwysep (Czerwiec 2024)
    [
      { title: 'Długi Targ i Fontanna Neptuna', locationName: 'Gdańsk, Długi Targ', lat: 54.3486, lng: 18.6534, date: [2024, 5, 20, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Średniowieczny Żuraw nad Motławą', locationName: 'Gdańsk, Rybackie Pobrzeże', lat: 54.3508, lng: 18.6578, date: [2024, 5, 20, 13, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Taras widokowy Bazyliki Mariackiej', locationName: 'Gdańsk, Bazylika Mariacka', lat: 54.3498, lng: 18.6532, date: [2024, 5, 20, 16, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Spacer po najdłuższym drewnianym molo', locationName: 'Sopot, Molo', lat: 54.4484, lng: 18.5721, date: [2024, 5, 21, 10, 30], category: 'nature', imagePool: SEA_PHOTOS },
      { title: 'Monciak i Krzywy Domek', locationName: 'Sopot, Monte Cassino', lat: 54.4435, lng: 18.5640, date: [2024, 5, 21, 13, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Amfiteatr Opery Leśnej', locationName: 'Sopot, Opera Leśna', lat: 54.4410, lng: 18.5440, date: [2024, 5, 21, 16, 30], category: 'event', imagePool: CITY_PHOTOS },
      { title: 'Malowniczy Klif w Orłowie', locationName: 'Gdynia, Klif Orłowski', lat: 54.4812, lng: 18.5620, date: [2024, 5, 22, 10, 0], category: 'nature', imagePool: SEA_PHOTOS },
      { title: 'Okręt Błyskawica i Skwer Kościuszki', locationName: 'Gdynia, Skwer Kościuszki', lat: 54.5185, lng: 18.5525, date: [2024, 5, 22, 14, 0], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Początek Polski – Cypel Helski', locationName: 'Hel, Cypel Helski', lat: 54.5980, lng: 18.8120, date: [2024, 5, 23, 11, 30], category: 'nature', imagePool: SEA_PHOTOS },
      { title: 'Karmienie fok w Fokarium', locationName: 'Hel, Fokarium', lat: 54.6080, lng: 18.7990, date: [2024, 5, 23, 14, 0], category: 'trip', imagePool: SEA_PHOTOS },
      { title: 'Wydmy i sosnowy las w Jastarni', locationName: 'Jastarnia, Wydmy', lat: 54.6970, lng: 18.6750, date: [2024, 5, 23, 17, 0], category: 'nature', imagePool: SEA_PHOTOS },
      { title: 'Pustynia w Europie – Wydma Łącka', locationName: 'Łeba, Słowiński Park Narodowy', lat: 54.7601, lng: 17.5552, date: [2024, 5, 24, 11, 0], category: 'nature', imagePool: SEA_PHOTOS },
    ],

    // 6. Rzym i Watykan (Październik 2023)
    [
      { title: 'Monumentalne Koloseum od wewnątrz', locationName: 'Rzym, Koloseum', lat: 41.8902, lng: 12.4922, date: [2023, 9, 10, 10, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Starożytne ruiny Forum Romanum', locationName: 'Rzym, Forum Romanum', lat: 41.8925, lng: 12.4853, date: [2023, 9, 10, 13, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Widok na Rzym ze Wzgórza Kapitolińskiego', locationName: 'Rzym, Kapitol', lat: 41.8933, lng: 12.4830, date: [2023, 9, 10, 16, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Plac Świętego Piotra i Kolumnada Berniniego', locationName: 'Watykan, Plac Św. Piotra', lat: 41.9022, lng: 12.4568, date: [2023, 9, 11, 9, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Kopuła Bazyliki Świętego Piotra', locationName: 'Watykan, Bazylika Św. Piotra', lat: 41.9029, lng: 12.4534, date: [2023, 9, 11, 13, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Most św. Anioła i rzeka Tyber', locationName: 'Rzym, Zamek Św. Anioła', lat: 41.9031, lng: 12.4663, date: [2023, 9, 11, 17, 0], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Oculus w kopule Panteonu', locationName: 'Rzym, Panteon', lat: 41.8986, lng: 12.4769, date: [2023, 9, 12, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Moneta wrzucona do Fontanny di Trevi', locationName: 'Rzym, Fontanna di Trevi', lat: 41.9009, lng: 12.4833, date: [2023, 9, 12, 14, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Zachód słońca na Schodach Hiszpańskich', locationName: 'Rzym, Plac Hiszpański', lat: 41.9057, lng: 12.4823, date: [2023, 9, 12, 17, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Katedra Santa Maria del Fiore we Florencji', locationName: 'Florencja, Duomo', lat: 43.7731, lng: 11.2560, date: [2023, 9, 13, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Złotnicy na moście Ponte Vecchio', locationName: 'Florencja, Ponte Vecchio', lat: 43.7680, lng: 11.2532, date: [2023, 9, 13, 14, 30], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Krzywa Wieża na Polu Cudów', locationName: 'Piza, Campo dei Miracoli', lat: 43.7230, lng: 10.3966, date: [2023, 9, 14, 12, 0], category: 'urban', imagePool: CITY_PHOTOS },
    ],

    // 7. Złota jesień w Bieszczadach (Wrzesień 2022)
    [
      { title: 'Czerwony szlak z Wetliny', locationName: 'Bieszczady, Wetlina', lat: 49.1550, lng: 22.4680, date: [2022, 8, 22, 10, 0], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Nowa Chatka Puchatka na Połoninie', locationName: 'Bieszczady, Połonina Wetlińska', lat: 49.1432, lng: 22.5647, date: [2022, 8, 22, 13, 0], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Zejście w dół na Przełęcz Wyżną', locationName: 'Bieszczady, Przełęcz Wyżna', lat: 49.1380, lng: 22.5850, date: [2022, 8, 22, 16, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Podejście na Połoninę Caryńską', locationName: 'Bieszczady, Ustrzyki Górne', lat: 49.1060, lng: 22.6480, date: [2022, 8, 23, 9, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Trawy falujące na wietrze', locationName: 'Bieszczady, Połonina Caryńska', lat: 49.1290, lng: 22.6230, date: [2022, 8, 23, 12, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Rozległa panorama z grzbietu Caryńskiej', locationName: 'Bieszczady, Połonina Caryńska', lat: 49.1420, lng: 22.6450, date: [2022, 8, 23, 15, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Poranek w Wołosatem', locationName: 'Bieszczady, Wołosate', lat: 49.0680, lng: 22.6840, date: [2022, 8, 24, 8, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Żelazny Krzyż na szczycie Tarnicy', locationName: 'Bieszczady, Tarnica', lat: 49.0747, lng: 22.7269, date: [2022, 8, 24, 11, 45], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Bieszczadzki worek – Halicz i Rozsypaniec', locationName: 'Bieszczady, Halicz', lat: 49.0790, lng: 22.7530, date: [2022, 8, 24, 14, 0], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Zachód słońca na Zaporze w Solinie', locationName: 'Bieszczady, Jezioro Solińskie', lat: 49.3970, lng: 22.4530, date: [2022, 8, 24, 17, 30], category: 'trip', imagePool: SEA_PHOTOS },
    ],

    // 8. Paryż i Zamki nad Loarą (Kwiecień 2021)
    [
      { title: 'Wieża Eiffla widziana z Pól Marsowych', locationName: 'Paryż, Wieża Eiffla', lat: 48.8584, lng: 2.2945, date: [2021, 3, 18, 10, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Szklana Piramida przed Luwrem', locationName: 'Paryż, Luwr', lat: 48.8606, lng: 2.3376, date: [2021, 3, 18, 14, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Katedra Notre-Dame z mostu na Sekwanie', locationName: 'Paryż, Île de la Cité', lat: 48.8530, lng: 2.3499, date: [2021, 3, 18, 17, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Artyści na placu du Tertre na Montmartre', locationName: 'Paryż, Montmartre', lat: 48.8867, lng: 2.3431, date: [2021, 3, 19, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Łuk Triumfalny i rondo Charles de Gaulle', locationName: 'Paryż, Pola Elizejskie', lat: 48.8738, lng: 2.2950, date: [2021, 3, 19, 15, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Złota Brama i Ogrody Wersalu', locationName: 'Wersal, Pałac Królewski', lat: 48.8049, lng: 2.1204, date: [2021, 3, 20, 10, 30], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Renesansowy Zamek Chambord', locationName: 'Dolina Loary, Chambord', lat: 47.6161, lng: 1.5172, date: [2021, 3, 20, 15, 30], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Zamek Dam nad rzeką Cher', locationName: 'Dolina Loary, Chenonceau', lat: 47.3248, lng: 1.0703, date: [2021, 3, 21, 11, 0], category: 'trip', imagePool: CITY_PHOTOS },
    ],

    // 9. Nowy Jork i Zachodnie Wybrzeże USA (Wrzesień 2018)
    [
      { title: 'Wieczorny blask neonów na Times Square', locationName: 'Nowy Jork, Times Square', lat: 40.7580, lng: -73.9855, date: [2018, 8, 15, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Oaza zieleni – Central Park i Bethesda Terrace', locationName: 'Nowy Jork, Central Park', lat: 40.7829, lng: -73.9654, date: [2018, 8, 15, 14, 30], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Spacer kładką Mostu Brooklińskiego', locationName: 'Nowy Jork, Brooklyn Bridge', lat: 40.7061, lng: -73.9969, date: [2018, 8, 15, 18, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Statua Wolności z pokładu promu', locationName: 'Nowy Jork, Liberty Island', lat: 40.6892, lng: -74.0445, date: [2018, 8, 16, 10, 0], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Widok na Manhattan z Empire State Building', locationName: 'Nowy Jork, Empire State', lat: 40.7484, lng: -73.9857, date: [2018, 8, 16, 14, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Ogród miejski The High Line', locationName: 'Nowy Jork, Chelsea', lat: 40.7480, lng: -74.0048, date: [2018, 8, 16, 17, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Monumentalny Kanion z punktu Mather Point', locationName: 'Wielki Kanion, Mather Point', lat: 36.0617, lng: -112.1077, date: [2018, 8, 18, 11, 0], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Głęboka przepaść rzeki Kolorado', locationName: 'Wielki Kanion, South Rim', lat: 36.0544, lng: -112.1401, date: [2018, 8, 18, 15, 0], category: 'nature', imagePool: NATURE_PHOTOS },
      { title: 'Zabytkowa wieża strażnicza Indian Hopi', locationName: 'Wielki Kanion, Desert View', lat: 36.0427, lng: -111.8260, date: [2018, 8, 18, 18, 30], category: 'trip', imagePool: NATURE_PHOTOS },
      { title: 'Mgła otulająca most Golden Gate', locationName: 'San Francisco, Golden Gate', lat: 37.8199, lng: -122.4783, date: [2018, 8, 22, 11, 0], category: 'trip', imagePool: SEA_PHOTOS },
      { title: 'Lwy morskie na molo Pier 39', locationName: 'San Francisco, Fisherman\'s Wharf', lat: 37.8087, lng: -122.4098, date: [2018, 8, 22, 15, 0], category: 'nature', imagePool: SEA_PHOTOS },
    ],

    // 10. Stolica Dolnego Śląska – Wrocław (Czerwiec 2015)
    [
      { title: 'Gotycki Ratusz na wrocławskim Rynku', locationName: 'Wrocław, Rynek', lat: 51.1079, lng: 17.0385, date: [2015, 5, 12, 11, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Krasnale przy Kamieniczkach Jaś i Małgosia', locationName: 'Wrocław, Stare Miasto', lat: 51.1118, lng: 17.0305, date: [2015, 5, 12, 13, 30], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Latarnik zapalający gazowe latarnie na Ostrowie', locationName: 'Wrocław, Ostrów Tumski', lat: 51.1147, lng: 17.0463, date: [2015, 5, 12, 19, 0], category: 'urban', imagePool: CITY_PHOTOS },
      { title: 'Zabytkowy Most Tumski', locationName: 'Wrocław, Most Tumski', lat: 51.1140, lng: 17.0430, date: [2015, 5, 13, 10, 30], category: 'trip', imagePool: CITY_PHOTOS },
      { title: 'Hala Stulecia i Wrocławska Fontanna Multimedialna', locationName: 'Wrocław, Hala Stulecia', lat: 51.1068, lng: 17.0772, date: [2015, 5, 13, 14, 0], category: 'event', imagePool: CITY_PHOTOS },
      { title: 'Ogród Japoński w Parku Szczytnickim', locationName: 'Wrocław, Ogród Japoński', lat: 51.1085, lng: 17.0805, date: [2015, 5, 13, 16, 30], category: 'nature', imagePool: NATURE_PHOTOS },
    ],
  ];

  let idCounter = 1;
  const photos: PhotoEvent[] = [];

  baseTrips.forEach((trip) => {
    trip.forEach((raw, photoIdx) => {
      const [year, month, day, hour, minute] = raw.date;
      const timestamp = new Date(year, month, day, hour, minute, 0, 0);

      const latJitter = Math.sin(idCounter * 73) * 0.0008;
      const lngJitter = Math.cos(idCounter * 41) * 0.0008;

      const imgUrl = raw.imagePool[photoIdx % raw.imagePool.length];

      photos.push({
        id: `p-${idCounter++}`,
        timestamp,
        title: raw.title,
        locationName: raw.locationName,
        coordinates: {
          lat: Number((raw.lat + latJitter).toFixed(6)),
          lng: Number((raw.lng + lngJitter).toFixed(6)),
        },
        imageUrl: imgUrl,
        category: raw.category,
      });
    });
  });

  // 2. Dodatkowe trasy i regiony powiększające bazę do dokładnie 1000 zdjęć
  // Definiujemy 30 tematycznych wypraw po Polsce i Europie z realistycznymi punktami GPS
  interface ExpeditionPlan {
    startDate: [number, number, number]; // [rok, miesiac(0-11), dzien]
    daysSpan: number;
    locations: {
      title: string;
      locationName: string;
      lat: number;
      lng: number;
      category: 'trip' | 'nature' | 'urban' | 'event';
      imagePool: string[];
    }[];
  }

  const expeditions: ExpeditionPlan[] = [
    // Wyprawa Karkonosze i Sudety (Czerwiec 2026)
    {
      startDate: [2026, 5, 5],
      daysSpan: 4,
      locations: [
        { title: 'Schronisko Samotnia nad Małym Stawem', locationName: 'Karkonosze, Samotnia', lat: 50.7516, lng: 15.7027, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Szczyt Śnieżki i obserwatorium meteorologiczne', locationName: 'Karkonosze, Śnieżka', lat: 50.7360, lng: 15.7397, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Wodospad Kamieńczyka w wąwozie skalnym', locationName: 'Szklarska Poręba, Wodospad Kamieńczyka', lat: 50.8169, lng: 15.5134, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Śnieżne Kotły i stacja przekaźnikowa', locationName: 'Karkonosze, Śnieżne Kotły', lat: 50.7801, lng: 15.5562, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Świątynia Wang w Karpaczu', locationName: 'Karpacz, Kościół Wang', lat: 50.7725, lng: 15.7299, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek Czocha nad Jeziorem Leśniańskim', locationName: 'Sucha, Zamek Czocha', lat: 51.0311, lng: 15.3039, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Twierdza Srebrna Góra', locationName: 'Góry Sowie, Srebrna Góra', lat: 50.5739, lng: 16.6575, category: 'trip', imagePool: CITY_PHOTOS },
      ]
    },
    // Mazury i Kraina Wielkich Jezior (Lipiec 2026)
    {
      startDate: [2026, 6, 14],
      daysSpan: 5,
      locations: [
        { title: 'Wioska Żeglarska w Mikołajkach', locationName: 'Mikołajki, Przystań', lat: 53.8016, lng: 21.5735, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Największe jezioro w Polsce – Śniardwy', locationName: 'Mazury, Jezioro Śniardwy', lat: 53.7500, lng: 21.7167, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Most Obrotowy na Kanale Łuczańskim', locationName: 'Giżycko, Most Obrotowy', lat: 54.0375, lng: 21.7656, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Twierdza Boyen z lotu ptaka', locationName: 'Giżycko, Twierdza Boyen', lat: 54.0322, lng: 21.7450, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Spływ kajakowy rzeką Krutynią', locationName: 'Krutyń, Rzeka Krutynia', lat: 53.6933, lng: 21.4333, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Zamek Krzyżacki w Rynie', locationName: 'Ryn, Zamek Ryn', lat: 53.9317, lng: 21.5458, category: 'trip', imagePool: CITY_PHOTOS },
      ]
    },
    // Pieniny i Przełom Dunajca (Maj 2026)
    {
      startDate: [2026, 4, 10],
      daysSpan: 3,
      locations: [
        { title: 'Ostra iglica Trzech Koron – Okrąglica', locationName: 'Pieniny, Trzy Korony', lat: 49.4144, lng: 20.4194, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Reliktowa sosna na szczycie Sokolicy', locationName: 'Pieniny, Sokolica', lat: 49.4197, lng: 20.4419, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Tradycyjny spływ tratwami flisackimi', locationName: 'Pieniny, Przełom Dunajca', lat: 49.4239, lng: 20.4350, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Średniowieczny Zamek Dunajec w Niedzicy', locationName: 'Niedzica, Zamek Dunajec', lat: 49.4225, lng: 20.3197, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Wąwóz Homole w Jaworkach', locationName: 'Szczawnica, Wąwóz Homole', lat: 49.4036, lng: 20.5508, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Park Zdrojowy w Szczawnicy', locationName: 'Szczawnica, Uzdrowisko', lat: 49.4278, lng: 20.4853, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Wielkopolska i Poznań (Kwiecień 2026)
    {
      startDate: [2026, 3, 22],
      daysSpan: 3,
      locations: [
        { title: 'Koziołki na Wieży Ratuszowej w Poznaniu', locationName: 'Poznań, Stary Rynek', lat: 52.4083, lng: 16.9342, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Kolebka Państwa Polskiego – Ostrów Tumski', locationName: 'Poznań, Katedra Poznańska', lat: 52.4116, lng: 16.9478, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Regaty wioślarskie na Jeziorze Maltańskim', locationName: 'Poznań, Jezioro Maltańskie', lat: 52.4019, lng: 16.9742, category: 'event', imagePool: SEA_PHOTOS },
        { title: 'Neogotycki Zamek w Kórniku', locationName: 'Kórnik, Zamek i Arboretum', lat: 52.2447, lng: 17.0911, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Wiekowe Dęby Rogalińskie nad Wartą', locationName: 'Rogalin, Pałac Raczyńskich', lat: 52.2344, lng: 16.9317, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Osada obronna w Biskupinie', locationName: 'Biskupin, Rezerwat Archeologiczny', lat: 52.7878, lng: 17.7408, category: 'trip', imagePool: NATURE_PHOTOS },
      ]
    },
    // Jura Krakowsko-Częstochowska (Wrzesień 2025)
    {
      startDate: [2025, 8, 18],
      daysSpan: 3,
      locations: [
        { title: 'Ruiny Zamku Ogrodzieniec w Podzamczu', locationName: 'Jura, Zamek Ogrodzieniec', lat: 50.4533, lng: 19.5517, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Odbudowany zamek w Bobolicach', locationName: 'Jura, Zamek Bobolice', lat: 50.6092, lng: 19.4939, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Bliźniaczy Zamek w Mirowie i wapienne grzędy', locationName: 'Jura, Zamek Mirów', lat: 50.6150, lng: 19.4753, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Pustynia Błędowska z punktu Róża Wiatrów', locationName: 'Klucze, Pustynia Błędowska', lat: 50.3478, lng: 19.5256, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Zamek Tenczyn w Rudnie', locationName: 'Rudno, Zamek Tenczyn', lat: 50.1028, lng: 19.5819, category: 'trip', imagePool: CITY_PHOTOS },
      ]
    },
    // Roztocze i Lubelszczyzna (Czerwiec 2025)
    {
      startDate: [2025, 5, 20],
      daysSpan: 4,
      locations: [
        { title: 'Renesansowy Rynek Wielki w Zamościu', locationName: 'Zamość, Rynek Wielki', lat: 50.7169, lng: 23.2528, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Kościółek na Wodzie w Zwierzyńcu', locationName: 'Zwierzyniec, Staw Kościelny', lat: 50.6128, lng: 22.9669, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Kaskady wodne Szumy nad Tanwią', locationName: 'Roztocze, Szumy nad Tanwią', lat: 50.3606, lng: 23.2047, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Koniki polskie w Roztoczańskim Parku', locationName: 'Roztoczański Park Narodowy', lat: 50.5917, lng: 22.9819, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Brama Krakowska na Starym Mieście w Lublinie', locationName: 'Lublin, Brama Krakowska', lat: 51.2478, lng: 22.5683, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek Lubelski i romański Donżon', locationName: 'Lublin, Zamek Lubelski', lat: 51.2503, lng: 22.5722, category: 'trip', imagePool: CITY_PHOTOS },
      ]
    },
    // Toruń i Dolina Dolnej Wisły (Listopad 2025)
    {
      startDate: [2025, 10, 8],
      daysSpan: 3,
      locations: [
        { title: 'Krzywa Wieża w Toruniu', locationName: 'Toruń, Krzywa Wieża', lat: 53.0094, lng: 18.6014, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Pomnik Mikołaja Kopernika na Rynku', locationName: 'Toruń, Rynek Staromiejski', lat: 53.0103, lng: 18.6047, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Panorama Torunia z lewego brzegu Wisły', locationName: 'Toruń, Kępa Bazarowa', lat: 53.0067, lng: 18.6083, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Wyspa Młyńska i Bydgoska Wenecja', locationName: 'Bydgoszcz, Wyspa Młyńska', lat: 53.1231, lng: 17.9961, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek Krzyżacki w Malborku od strony Nogatu', locationName: 'Malbork, Zamek Krzyżacki', lat: 54.0397, lng: 19.0281, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Średniowieczne mury obronne Chełmna', locationName: 'Chełmno, Stare Miasto', lat: 53.3486, lng: 18.4239, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Podlasie i Puszcza Białowieska (Październik 2025)
    {
      startDate: [2025, 9, 12],
      daysSpan: 3,
      locations: [
        { title: 'Ostatni pierwotny las Europy – Białowieża', locationName: 'Białowieski Park Narodowy', lat: 52.7006, lng: 23.8500, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Żubry w Rezerwacie Pokazowym', locationName: 'Białowieża, Rezerwat Żubrów', lat: 52.7061, lng: 23.7850, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Zabytkowy Meczet w Kruszynianach', locationName: 'Kruszyniany, Meczet Tatarski', lat: 53.1811, lng: 23.8133, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Prawosławny Monaster w Supraślu', locationName: 'Supraśl, Ławra Supraska', lat: 53.2089, lng: 23.3364, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Pałac Branickich – Podlaski Wersal', locationName: 'Białystok, Pałac Branickich', lat: 53.1306, lng: 23.1672, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Kładka wśród bagien Narwiańskiego Parku', locationName: 'Waniewo, Narwiański Park', lat: 53.0806, lng: 22.8250, category: 'nature', imagePool: NATURE_PHOTOS },
      ]
    },
    // Wyprawa do Chorwacji (Wrzesień 2024)
    {
      startDate: [2024, 8, 10],
      daysSpan: 7,
      locations: [
        { title: 'Mury obronne Dubrownika nad Adriatykiem', locationName: 'Dubrownik, Stare Miasto', lat: 42.6413, lng: 18.1084, category: 'urban', imagePool: SEA_PHOTOS },
        { title: 'Główna promenada Stradun w Dubrowniku', locationName: 'Dubrownik, Stradun', lat: 42.6417, lng: 18.1092, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Pałac Dioklecjana w Splicie', locationName: 'Split, Pałac Dioklecjana', lat: 43.5081, lng: 16.4402, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Nadmorska promenada Riva w Splicie', locationName: 'Split, Riva', lat: 43.5072, lng: 16.4389, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Wenecka starówka w Trogirze', locationName: 'Trogir, Katedra Św. Wawrzyńca', lat: 43.5169, lng: 16.2514, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Organy Morskie i Pozdrowienie Słońca', locationName: 'Zadar, Nabrzeże Zadarskie', lat: 44.1172, lng: 15.2203, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Turkusowe kaskady Jezior Plitwickich', locationName: 'Jeziora Plitwickie, Wielki Wodospad', lat: 44.8808, lng: 15.6197, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Rzymski Amfiteatr w Puli', locationName: 'Pula, Arena', lat: 44.8731, lng: 13.8503, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Urokliwy cypel w Rovinj', locationName: 'Rovinj, Kościół Św. Eufemii', lat: 45.0828, lng: 13.6308, category: 'trip', imagePool: SEA_PHOTOS },
      ]
    },
    // Włochy Północne, Wenecja i Dolomity (Wrzesień 2024)
    {
      startDate: [2024, 8, 25],
      daysSpan: 6,
      locations: [
        { title: 'Bazylika i Plac Świętego Marka', locationName: 'Wenecja, Plac Św. Marka', lat: 45.4342, lng: 12.3389, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Gondole pod Mostem Rialto', locationName: 'Wenecja, Most Rialto', lat: 45.4380, lng: 12.3358, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Kolorowe domy rybackie na wyspie Burano', locationName: 'Wenecja, Wyspa Burano', lat: 45.4853, lng: 12.4167, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Balkon Julii i rzymski amfiteatr Arena', locationName: 'Werona, Arena di Verona', lat: 45.4389, lng: 10.9944, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek Scaligero nad Jeziorem Garda', locationName: 'Sirmione, Jezioro Garda', lat: 45.4931, lng: 10.6083, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Trzy monumentalne wieże Tre Cime di Lavaredo', locationName: 'Dolomity, Tre Cime', lat: 46.6186, lng: 12.3028, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Szmaragdowe wody alpejskiego Jeziora Braies', locationName: 'Dolomity, Lago di Braies', lat: 46.6947, lng: 12.0853, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Grań Seceda w dolinie Val Gardena', locationName: 'Dolomity, Seceda', lat: 46.5986, lng: 11.7244, category: 'nature', imagePool: NATURE_PHOTOS },
      ]
    },
    // Wiedeń i Alpy Austriackie (Sierpień 2024)
    {
      startDate: [2024, 7, 2],
      daysSpan: 5,
      locations: [
        { title: 'Cesarski Pałac Schönbrunn i ogrody Gloriette', locationName: 'Wiedeń, Pałac Schönbrunn', lat: 48.1858, lng: 16.3128, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Gotycka Katedra Świętego Szczepana', locationName: 'Wiedeń, Stephansdom', lat: 48.2086, lng: 16.3731, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Twierdza Hohensalzburg nad rzeką Salzach', locationName: 'Salzburg, Twierdza', lat: 47.7950, lng: 13.0475, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Pocztówkowy widok na miasteczko Hallstatt', locationName: 'Hallstatt, Salzkammergut', lat: 47.5622, lng: 13.6492, category: 'nature', imagePool: FJORD_PHOTOS },
        { title: 'Wysokogórska droga Grossglockner', locationName: 'Alpy, Grossglockner', lat: 47.0742, lng: 12.7539, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Alpejski deptak Maria-Theresien-Straße', locationName: 'Innsbruck, Złoty Dach', lat: 47.2683, lng: 11.3933, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Czechy – Praga i Skalne Miasto (Maj 2024)
    {
      startDate: [2024, 4, 15],
      daysSpan: 4,
      locations: [
        { title: 'Gotycki Most Karola o poranku', locationName: 'Praga, Most Karola', lat: 50.0865, lng: 14.4114, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek na Hradczanach i Katedra św. Wita', locationName: 'Praga, Hradczany', lat: 50.0908, lng: 14.4005, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zegar astronomiczny Orloj na Rynku', locationName: 'Praga, Rynek Staromiejski', lat: 50.0870, lng: 14.4207, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zakole Wełtawy i Zamek w Czeskim Krumlowie', locationName: 'Český Krumlov, Zamek', lat: 48.8128, lng: 14.3161, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Skalne labirynty w Adrszpachu', locationName: 'Adrszpach, Skalne Miasto', lat: 50.6139, lng: 16.1242, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Pravčická brána w Czeskiej Szwajcarii', locationName: 'Czeska Szwajcaria, Pravčická brána', lat: 50.8839, lng: 14.2811, category: 'nature', imagePool: NATURE_PHOTOS },
      ]
    },
    // Szwajcaria – Kraina Szczytów (Czerwiec 2023)
    {
      startDate: [2023, 5, 14],
      daysSpan: 6,
      locations: [
        { title: 'Słynny Most Kapliczny Kapellbrücke', locationName: 'Lucerna, Most Kapliczny', lat: 47.0517, lng: 8.3075, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Wodospad Staubbach w dolinie 72 kaskad', locationName: 'Lauterbrunnen, Wodospad Staubbach', lat: 46.5947, lng: 7.9078, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Piramida Matterhornu z punktu Gornergrat', locationName: 'Zermatt, Gornergrat', lat: 45.9839, lng: 7.7831, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Najwyżej położona stacja kolejowa Jungfraujoch', locationName: 'Alpy Berneńskie, Jungfraujoch', lat: 46.5475, lng: 7.9822, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Turkusowe Jezioro Brienz', locationName: 'Interlaken, Jezioro Brienz', lat: 46.7167, lng: 7.9667, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Średniowieczny Zamek Chillon nad Jeziorem Genewskim', locationName: 'Montreux, Zamek Chillon', lat: 46.4142, lng: 6.9275, category: 'trip', imagePool: SEA_PHOTOS },
      ]
    },
    // Niemcy – Bawaria i Zamki Króla Ludwika (Maj 2023)
    {
      startDate: [2023, 4, 18],
      daysSpan: 4,
      locations: [
        { title: 'Bajkowy Zamek Neuschwanstein w chmurach', locationName: 'Schwangau, Zamek Neuschwanstein', lat: 47.5576, lng: 10.7498, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Alpejskie Jezioro Eibsee u stóp Zugspitze', locationName: 'Garmisch-Partenkirchen, Eibsee', lat: 47.4561, lng: 10.9931, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Marienplatz i Nowy Ratusz w Monachium', locationName: 'Monachium, Marienplatz', lat: 48.1375, lng: 11.5755, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Ogród Angielski i surferzy na rzece Eisbach', locationName: 'Monachium, Englischer Garten', lat: 48.1433, lng: 11.5878, category: 'event', imagePool: CITY_PHOTOS },
        { title: 'Zamek Cesarski w Norymberdze', locationName: 'Norymberga, Kaiserburg', lat: 49.4578, lng: 11.0758, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Francja – Lazurowe Wybrzeże i Prowansja (Czerwiec 2023)
    {
      startDate: [2023, 5, 28],
      daysSpan: 5,
      locations: [
        { title: 'Błękit Zatoki Aniołów z Promenady Anglików', locationName: 'Nicea, Promenade des Anglais', lat: 43.6953, lng: 7.2656, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Średniowieczne orle gniazdo Èze Village', locationName: 'Èze, Ogród Egzotyczny', lat: 43.7278, lng: 7.3619, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Luksusowe jachty w marinie w Monako', locationName: 'Monako, Port Herkulesa', lat: 43.7369, lng: 7.4225, category: 'urban', imagePool: SEA_PHOTOS },
        { title: 'Wapienne fiordy Calanques w Cassis', locationName: 'Marsylia, Park Narodowy Calanques', lat: 43.2081, lng: 5.4989, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Fioletowe oceany kwitnącej lawendy w Valensole', locationName: 'Prowansja, Płaskowyż Valensole', lat: 43.8375, lng: 5.9842, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Most Bénézeta i Pałac Papieski w Awinionie', locationName: 'Awinion, Pałac Papieży', lat: 43.9506, lng: 4.8078, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Hiszpania – Andaluzja i Barcelona (Kwiecień 2022)
    {
      startDate: [2022, 3, 20],
      daysSpan: 6,
      locations: [
        { title: 'Ażurowe wieże bazyliki Sagrada Familia', locationName: 'Barcelona, Sagrada Familia', lat: 41.4036, lng: 2.1744, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Mozaikowe ławki Gaudiego w Parku Güell', locationName: 'Barcelona, Park Güell', lat: 41.4145, lng: 2.1527, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Klasztor Montserrat zawieszony w skałach', locationName: 'Katalonia, Masyw Montserrat', lat: 41.5931, lng: 1.8378, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Majestatyczny Plac Hiszpański w Sewilli', locationName: 'Sewilla, Plaza de España', lat: 37.3772, lng: -5.9869, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Mauretańska twierdza Alhambra na tle Sierra Nevada', locationName: 'Grenada, Alhambra', lat: 37.1773, lng: -3.5986, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Las kolumn w Wielkim Meczecie Mezquita', locationName: 'Kordoba, Mezquita', lat: 37.8789, lng: -4.7794, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Portugalia – Lizbona, Sintra i Wybrzeże Algarve (Maj 2022)
    {
      startDate: [2022, 4, 12],
      daysSpan: 6,
      locations: [
        { title: 'Żółty drewniany Tramwaj 28 w dzielnicy Alfama', locationName: 'Lizbona, Alfama', lat: 38.7122, lng: -9.1303, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Pasażerska Wieża Belém nad Tagiem', locationName: 'Lizbona, Torre de Belém', lat: 38.6916, lng: -9.2160, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Bajecznie kolorowy Pałac Pena w chmurach', locationName: 'Sintra, Pałac Narodowy Pena', lat: 38.7878, lng: -9.3906, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Najdalej na zachód wysunięty przylądek Europy', locationName: 'Cabo da Roca, Przylądek', lat: 38.7806, lng: -9.4989, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Stare piwnice win porto na nabrzeżu Ribeira', locationName: 'Porto, Most Ponte Dom Luís I', lat: 41.1400, lng: -8.6094, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Złote łuki skalne Ponta da Piedade w Lagos', locationName: 'Algarve, Ponta da Piedade', lat: 37.0806, lng: -8.6694, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Słynna jaskinia morska Benagil', locationName: 'Algarve, Jaskinia Benagil', lat: 37.0872, lng: -8.4239, category: 'nature', imagePool: SEA_PHOTOS },
      ]
    },
    // Grecja – Klasyczne Ateny i Cyklady (Czerwiec 2021)
    {
      startDate: [2021, 5, 10],
      daysSpan: 6,
      locations: [
        { title: 'Marmurowy Partenon na wzgórzu Akropolu', locationName: 'Ateny, Akropol', lat: 37.9715, lng: 23.7257, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Wąskie brukowane uliczki dzielnicy Plaka', locationName: 'Ateny, Plaka', lat: 37.9733, lng: 23.7300, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Klasztory zawieszone na pionowych skałach', locationName: 'Meteory, Klasztor Warłaama', lat: 39.7219, lng: 21.6306, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Błękitne kopuły kościołów w Oia na Santorini', locationName: 'Santorini, Oia', lat: 36.4617, lng: 25.3753, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Zachód słońca nad wulkaniczną kalderą', locationName: 'Santorini, Fira', lat: 36.4167, lng: 25.4333, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Zabytkowe wiatraki Kato Mili na Mykonos', locationName: 'Mykonos, Wiatraki', lat: 37.4447, lng: 25.3258, category: 'trip', imagePool: SEA_PHOTOS },
      ]
    },
    // Islandia – Wyprawa dookoła Złotego Kręgu (Lipiec 2019)
    {
      startDate: [2019, 6, 18],
      daysSpan: 6,
      locations: [
        { title: 'Wstrząsający gejzer Strokkur wyrzucający wodę', locationName: 'Islandia, Dolina Haukadalur', lat: 64.3139, lng: -20.3008, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Huk potężnego wodospadu Gullfoss', locationName: 'Islandia, Wodospad Gullfoss', lat: 64.3275, lng: -20.1200, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Ścieżka za kurtyną wodną Seljalandsfoss', locationName: 'Islandia, Wodospad Seljalandsfoss', lat: 63.6158, lng: -19.9928, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Czarna bazaltowa plaża i kolumny Reynisfjara', locationName: 'Vík í Mýrdal, Reynisfjara', lat: 63.4028, lng: -19.0431, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Dryfujące błękitne bryły lodu w lagunie Jökulsárlón', locationName: 'Islandia, Laguna Jökulsárlón', lat: 64.0483, lng: -16.1794, category: 'nature', imagePool: FJORD_PHOTOS },
        { title: 'Diamentowa Plaża z kryształami lodu na czarnym piasku', locationName: 'Islandia, Diamond Beach', lat: 64.0442, lng: -16.1750, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Współczesna sylwetka kościoła Hallgrímskirkja', locationName: 'Reykjavik, Hallgrímskirkja', lat: 64.1417, lng: -21.9267, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
    // Wielka Brytania i Szkocja (Sierpień 2017)
    {
      startDate: [2017, 7, 5],
      daysSpan: 6,
      locations: [
        { title: 'Zegar Big Ben i Parlament w Londynie', locationName: 'Londyn, Westminster', lat: 51.5007, lng: -0.1246, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zwodzony most Tower Bridge nad Tamizą', locationName: 'Londyn, Tower Bridge', lat: 51.5055, lng: -0.0754, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Gotyckie kolegia Uniwersytetu w Oksfordzie', locationName: 'Oxford, Radcliffe Camera', lat: 51.7533, lng: -1.2542, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek Królewski na wulkanicznej skale w Edynburgu', locationName: 'Edynburg, Zamek Edynburski', lat: 55.9486, lng: -3.1999, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Dramatyczna górska dolina Glen Coe w Szkocji', locationName: 'Szkocja, Dolina Glen Coe', lat: 56.6667, lng: -5.0000, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Formacja skalna Old Man of Storr na wyspie Skye', locationName: 'Wyspa Skye, Storr', lat: 57.5067, lng: -6.1831, category: 'nature', imagePool: FJORD_PHOTOS },
      ]
    },
    // Skandynawia – Sztokholm i Szwecja (Czerwiec 2016)
    {
      startDate: [2016, 5, 22],
      daysSpan: 4,
      locations: [
        { title: 'Kolorowe kamienice Stortorget w Gamla Stan', locationName: 'Sztokholm, Stare Miasto', lat: 59.3250, lng: 18.0708, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Muzeum XVII-wiecznego galeonu Vasa', locationName: 'Sztokholm, Djurgården', lat: 59.3281, lng: 18.0914, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Taras widokowy Monteliusvägen nad jeziorem Mälaren', locationName: 'Sztokholm, Södermalm', lat: 59.3208, lng: 18.0583, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Królewska rezydencja Drottningholm', locationName: 'Sztokholm, Pałac Drottningholm', lat: 59.3217, lng: 17.8869, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Archipelag tysiąca wysp sztokholmskich', locationName: 'Szwecja, Sandhamn', lat: 59.2889, lng: 18.9167, category: 'nature', imagePool: SEA_PHOTOS },
      ]
    },
    // Wyprawa do Japonii – Tokio i Kioto (Kwiecień 2017)
    {
      startDate: [2017, 3, 28],
      daysSpan: 6,
      locations: [
        { title: 'Słynne skrzyżowanie Shibuya Crossing w Tokio', locationName: 'Tokio, Shibuya', lat: 35.6595, lng: 139.7005, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Starożytna świątynia Sensō-ji w dzielnicy Asakusa', locationName: 'Tokio, Asakusa', lat: 35.7147, lng: 139.7967, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Tysiące cynobrowych bram torii w Fushimi Inari', locationName: 'Kioto, Fushimi Inari-taisha', lat: 34.9671, lng: 135.7727, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Złoty Pawilon Kinkaku-ji odbity w stawie', locationName: 'Kioto, Złoty Pawilon', lat: 35.0394, lng: 135.7292, category: 'urban', imagePool: NATURE_PHOTOS },
        { title: 'Bambusowy las Arashiyama w promieniach słońca', locationName: 'Kioto, Sagano Arashiyama', lat: 35.0169, lng: 135.6714, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Ośnieżony stożek Świętej Góry Fudżi', locationName: 'Japonia, Góra Fudżi', lat: 35.3606, lng: 138.7278, category: 'nature', imagePool: NATURE_PHOTOS },
      ]
    },
    // Wyprawa do Nowego Jorku i Waszyngtonu (Wrzesień 2016)
    {
      startDate: [2016, 8, 12],
      daysSpan: 5,
      locations: [
        { title: 'Widok na Kapitol Stanów Zjednoczonych', locationName: 'Waszyngton, Kapitol', lat: 38.8899, lng: -77.0091, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Pomnik Abrahama Lincolna i sadzawka refleksyjna', locationName: 'Waszyngton, Lincoln Memorial', lat: 38.8893, lng: -77.0502, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Biały Dom od strony Lafayette Square', locationName: 'Waszyngton, Biały Dom', lat: 38.8977, lng: -77.0365, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Huk wodospadów Niagara na granicy z Kanadą', locationName: 'Niagara Falls, Wodospad', lat: 43.0828, lng: -79.0742, category: 'nature', imagePool: SEA_PHOTOS },
        { title: 'Czerwone formacje skalne w Kanionie Bryce', locationName: 'Utah, Park Narodowy Bryce Canyon', lat: 37.5930, lng: -112.1871, category: 'nature', imagePool: NATURE_PHOTOS },
      ]
    },
    // Beskidy – Wisła, Szczyrk i Babia Góra (Styczeń/Luty 2024)
    {
      startDate: [2024, 0, 20],
      daysSpan: 4,
      locations: [
        { title: 'Zimowy wschód słońca na szczycie Babiej Góry', locationName: 'Beskidy, Babia Góra', lat: 49.5731, lng: 19.5294, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Ośnieżone grzbiety Skrzycznego', locationName: 'Szczyrk, Skrzyczne', lat: 49.6847, lng: 19.0306, category: 'nature', imagePool: NATURE_PHOTOS },
        { title: 'Źródła Czarnej Wisełki w Baraniej Górze', locationName: 'Wisła, Barania Góra', lat: 49.6067, lng: 19.0094, category: 'trip', imagePool: NATURE_PHOTOS },
        { title: 'Zameczek Prezydencki w Wiśle Czarne', locationName: 'Wisła Czarne, Zameczek', lat: 49.6256, lng: 18.9489, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zabytkowa skocznia narciarska im. Adama Małysza', locationName: 'Wisła Malinka, Skocznia', lat: 49.6289, lng: 18.9242, category: 'event', imagePool: CITY_PHOTOS },
      ]
    },
    // Warmia i Kanał Elbląski (Sierpień 2023)
    {
      startDate: [2023, 7, 14],
      daysSpan: 3,
      locations: [
        { title: 'Unikalne pochylnie wodne na Kanale Elbląskim', locationName: 'Buczyniec, Kanał Elbląski', lat: 54.0267, lng: 19.6156, category: 'trip', imagePool: SEA_PHOTOS },
        { title: 'Zamek Biskupów Warmińskich w Lidzbarku', locationName: 'Lidzbark Warmiński, Zamek', lat: 54.1264, lng: 20.5828, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Katedra Wniebowzięcia NMP we Fromborku', locationName: 'Frombork, Wzgórze Katedralne', lat: 54.3578, lng: 19.6811, category: 'urban', imagePool: CITY_PHOTOS },
        { title: 'Zamek Kapituły Pomezańskiej w Kwidzynie', locationName: 'Kwidzyn, Zamek', lat: 53.7364, lng: 18.9214, category: 'trip', imagePool: CITY_PHOTOS },
        { title: 'Zamek Krzyżacki i Muzeum w Ostródzie', locationName: 'Ostróda, Zamek', lat: 53.6961, lng: 19.9639, category: 'urban', imagePool: CITY_PHOTOS },
      ]
    },
  ];

  // Oblicz ile dokładnie zdjęć brakuje do równego 1000
  const targetTotal = 1000;
  const remainingNeeded = targetTotal - photos.length; // np. 1000 - 109 = 891

  // Generujemy punkty wzdłuż tras wypraw z realistycznymi godzinami i odstępami
  let expPhotoIndex = 0;
  let expIndex = 0;

  while (photos.length < targetTotal) {
    const exp = expeditions[expIndex % expeditions.length];
    const loc = exp.locations[expPhotoIndex % exp.locations.length];

    // Obliczamy datę w ramach wyprawy (rozłożoną w dniach i godzinach)
    const [startYear, startMonth, startDay] = exp.startDate;
    const dayOffset = (Math.floor(expPhotoIndex / 3)) % exp.daysSpan;
    const hourOffset = 9 + ((expPhotoIndex % 5) * 2) + Math.floor((idCounter % 3));
    const minuteOffset = (idCounter * 17) % 60;

    const timestamp = new Date(startYear, startMonth, startDay + dayOffset, hourOffset, minuteOffset, 0, 0);

    // Drobny jitter przestrzenny wokół rzeczywistego punktu POI (kilka do kilkunastu metrów dla kolejnych ujęć z tego samego miejsca)
    const subJitterLat = (Math.sin(idCounter * 43.17) * 0.0012);
    const subJitterLng = (Math.cos(idCounter * 29.53) * 0.0015);

    const imgUrl = loc.imagePool[idCounter % loc.imagePool.length];

    // Oznaczenie ujęcia (np. szeroki kadr, detal, widok panoramiczny)
    const perspectiveModifiers = [
      '',
      ' – ujęcie panoramiczne',
      ' – zbliżenie detalu architektonicznego',
      ' w świetle popołudniowym',
      ' – kadr ze szlaku',
      ' – widok z punktu widokowego',
      ' w porannym słońcu',
      ' o zmierzchu',
    ];
    const modifier = perspectiveModifiers[idCounter % perspectiveModifiers.length];

    photos.push({
      id: `p-${idCounter++}`,
      timestamp,
      title: `${loc.title}${modifier}`,
      locationName: loc.locationName,
      coordinates: {
        lat: Number((loc.lat + subJitterLat).toFixed(6)),
        lng: Number((loc.lng + subJitterLng).toFixed(6)),
      },
      imageUrl: imgUrl,
      category: loc.category,
    });

    expPhotoIndex++;
    if (expPhotoIndex % exp.locations.length === 0) {
      expIndex++;
    }
  }

  // Sortowanie chronologiczne rosnąco
  return photos.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export const MOCK_PHOTOS: PhotoEvent[] = generateMockPhotos();
