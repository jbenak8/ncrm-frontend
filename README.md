# ncrm-frontend

React based frontend for nCRM application (React 18 + Material UI 6 + Vite).

## Funkce

- **Přihlašování** — HTTP Basic proti backend profilu `local` (uživatelé `owner` / `rep` / `customer`, heslo `test`), nebo **Keycloak** (JWT) pro profil `prod`. Při přihlášení se kontrolují flagy účtu (zakázaný, zamknutý, vypršelé heslo, vynucená změna hesla) — při vynucené změně hesla se zobrazí blokující dialog (původní heslo, nové heslo 2×) s politikou hesel (min. 8 znaků, velké i malé písmeno, číslice a speciální znak).
- **Dashboard dle role** — majitel (OWNER) vidí souhrn, grafy objednávek/tržeb, top zákazníky a výkon zástupců; obchodní zástupce vidí své schůzky a objednávky.
- **Zákazníci** — stránkovaný seznam s vyhledáváním, detail (kontaktní osoby, provozovny, objednávky, schůzky), zakládání a editace s **doplněním dat z ARES** podle IČO.
- **Objednávky** — seznam s rozbalitelnými položkami, vytváření, změny stavu (workflow NEW → CONFIRMED → IN_PROGRESS → COMPLETED / CANCELLED). U dokončených objednávek lze vystavit fakturu (platba hotově nebo převodem, volitelná splatnost a poznámka).
- **Faktury** — seznam vydaných faktur s detailem (položky, součty DPH), tiskem do PDF (český daňový doklad s platebním QR kódem) a odesláním zákazníkovi e-mailem.
- **Schůzky** — plánování, editace, dokončení s výsledkem, zrušení.
- **Kampaně** (pouze OWNER) — vytváření s **AI generováním obsahu** (výběr chatbota Claude / ChatGPT), odesílání, přehled příjemců a stavu doručení.
- **AI chat** — přímá diskuse s vybraným AI chatbotem (Claude / ChatGPT) z hlavního menu.
- **Vyhledávání dle kritérií** — u tabulek (zákazníci, objednávky, schůzky, položky, kampaně, uživatelé) lze skládat filtry `pole – operátor – hodnota` nad novým generickým search API (`filter=field:operator:value`).
- **Progress indikátory** — při načítání dat se zobrazuje indikátor průběhu.
- **Katalog položek** — přehled zboží a služeb s filtrováním dle kategorií.
- **Administrace základních dat** (pouze OWNER) — správa vlastních **společností** (CRUD, nastavení výchozí, doplnění z ARES), **zemí**, **sazeb DPH**, **číselných řad** (definice číslování objednávek a faktur — prefix, rok v čísle, počet číslic, roční reset čítače) a **obchodních zástupců**.
- **Výběr společnosti** — po přihlášení vlastníka se automaticky použije výchozí společnost; pokud žádná není označena jako výchozí, zobrazí se dialog pro výběr, a pokud žádná neexistuje, varování s výzvou k založení (je-li navíc prázdný seznam zemí, je uživatel nejprve vyzván k přidání země). Přepínání společností je dostupné v hlavním menu i v menu uživatele (pouze OWNER — zákazníci a obchodní zástupci jsou přiřazeni konkrétní společnosti). Uživateli s rolí zákazník se po přihlášení automaticky předvybere společnost, ke které je přiřazen, a objednávky vytváří pro tuto společnost pod svými zákaznickými daty (bez výběru zákazníka a obchodního zástupce).
- **Uživatelé** (pouze OWNER/ADMIN) — zakládání, editace a mazání účtů, zamknutí/odemknutí, povolení/zakázání a vynucení změny hesla. Role se načítají přes API (`GET /api/roles`); je zavedena role **ADMIN** s globálním přístupem. Při založení uživatele lze iniciální přihlašovací údaje zaslat e-mailem.
- **Záhlaví** — vlevo se zobrazuje logo aktivní společnosti (pokud existuje), její název a až poté text „nCRM — moderní CRM nástroj“.
- **Reporty** — stažení PDF reportů (přehled prodejů, výkon zástupce, objednávky zákazníka).
- Patička s copyrightem a verzí aplikace na každé obrazovce.

## Spuštění

Vyžaduje Node.js 18+. Backend musí běžet na `http://localhost:8080` (dev server jej proxuje přes `/api`).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # produkční build do dist/
```

## Konfigurace

Viz `.env.example`:

| Proměnná | Význam |
|---|---|
| `VITE_AUTH_MODE` | `basic` (výchozí, lokální profil backendu) nebo `keycloak` |
| `VITE_KEYCLOAK_URL` | URL Keycloak serveru |
| `VITE_KEYCLOAK_REALM` | Keycloak realm |
| `VITE_KEYCLOAK_CLIENT_ID` | Keycloak client id |

Dev server běží na portu **3000**, který je povolen v CORS konfiguraci backendu.
