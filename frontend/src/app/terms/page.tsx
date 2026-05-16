import Link from "next/link";

export const metadata = {
  title: "Warunki korzystania — Integris",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-gray-400 hover:text-gray-700">
          ← Strona główna
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">Warunki korzystania z usługi</h1>
        <p className="mb-10 text-sm text-gray-400">Wersja 1.0 · Ostatnia aktualizacja: 2026-05-15</p>

        <div className="space-y-10 text-sm leading-relaxed text-gray-600">

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§1. Definicje</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Usługodawca</strong> — [NAZWA FIRMY], z siedzibą pod adresem [ADRES], e-mail: [EMAIL]</li>
              <li><strong>Użytkownik</strong> — osoba fizyczna lub prawna, która zarejestrowała konto w Usłudze</li>
              <li><strong>Usługa</strong> — platforma internetowa Integris dostępna pod adresem [DOMENA], umożliwiająca przetwarzanie faktur PDF i ich wysyłkę do KSeF</li>
              <li><strong>KSeF</strong> — Krajowy System e-Faktur, system teleinformatyczny Ministerstwa Finansów RP</li>
              <li><strong>Dane</strong> — wszelkie dane wprowadzane lub przesyłane przez Użytkownika w ramach korzystania z Usługi</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§2. Zakres usługi</h2>
            <p className="mb-2">Integris jest oprogramowaniem pośredniczącym (middleware) umożliwiającym:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Odczyt tekstu z faktur PDF przy użyciu OCR</li>
              <li>Ekstrakcję i normalizację pól faktury z wykorzystaniem modeli AI</li>
              <li>Weryfikację i korektę danych przez człowieka przed wysyłką</li>
              <li>Generowanie XML FA(3) zgodnego ze schematem KSeF</li>
              <li>Wysyłkę faktur do KSeF i przechowywanie potwierdzeń UPO</li>
            </ul>
            <p className="mb-2 font-medium text-gray-700">Integris NIE jest:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>systemem ERP ani oprogramowaniem księgowym</li>
              <li>doradcą podatkowym ani prawnym — decyzje o treści faktur podejmuje wyłącznie Użytkownik</li>
              <li>gwarantem akceptacji faktury przez KSeF — ostateczna decyzja należy do Ministerstwa Finansów</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§3. Konto i dostęp</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Rejestracja wymaga podania adresu e-mail, hasła oraz danych firmy (nazwa, NIP)</li>
              <li>Użytkownik jest odpowiedzialny za zachowanie poufności danych logowania</li>
              <li>Każde konto jest przypisane do jednej organizacji (firmy); dostęp do danych jest izolowany między organizacjami</li>
              <li>Usługodawca zastrzega sobie prawo do zawieszenia konta w przypadku naruszenia niniejszych Warunków</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§4. Zasady korzystania</h2>
            <p className="mb-2">Użytkownik zobowiązuje się do:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Korzystania z Usługi wyłącznie w celach zgodnych z prawem</li>
              <li>Nieprzesyłania plików zawierających złośliwe oprogramowanie</li>
              <li>Niepodejmowania prób nieuprawnionego dostępu do danych innych organizacji</li>
              <li>Weryfikacji wyekstrahowanych danych faktury przed zatwierdzeniem i wysyłką do KSeF</li>
              <li>Nieprzeciążania infrastruktury Usługi (zakaz automatycznego masowego przesyłania bez uzgodnienia)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§5. Odpowiedzialność</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ekstrakcja AI może zawierać błędy — Użytkownik jest zobowiązany do weryfikacji danych przed zatwierdzeniem. Usługodawca nie ponosi odpowiedzialności za błędy wynikające z zatwierdzenia nieprawidłowych danych</li>
              <li>Usługodawca nie ponosi odpowiedzialności za odrzucenie faktury przez KSeF, jeżeli Użytkownik zatwierdził dane przed wysyłką</li>
              <li>Usługodawca nie ponosi odpowiedzialności za niedostępność lub opóźnienia wynikające z infrastruktury KSeF po stronie Ministerstwa Finansów</li>
              <li>Łączna odpowiedzialność Usługodawcy wobec Użytkownika jest ograniczona do wysokości opłat uiszczonych przez Użytkownika w ciągu ostatnich 3 miesięcy</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§6. Opłaty</h2>
            <p>Szczegółowy cennik Usługi zostanie opublikowany odrębnie. Korzystanie z Usługi w obecnej fazie może być bezpłatne lub objęte indywidualnym uzgodnieniem. O zmianach cennika Użytkownik zostanie poinformowany z wyprzedzeniem co najmniej 30 dni.</p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§7. Dostępność usługi</h2>
            <p>Usługodawca dąży do zapewnienia ciągłości działania Usługi, jednak nie gwarantuje 100% dostępności. O planowanych przerwach technicznych Użytkownicy będą informowani z wyprzedzeniem. Usługodawca zastrzega prawo do chwilowej niedostępności Usługi w związku z pracami konserwacyjnymi.</p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§8. Rozwiązanie umowy</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Użytkownik może usunąć konto w dowolnym momencie</li>
              <li>Usługodawca może wypowiedzieć umowę z zachowaniem 30-dniowego okresu wypowiedzenia lub natychmiastowo w przypadku rażącego naruszenia Warunków</li>
              <li>Po rozwiązaniu umowy dane Użytkownika są przechowywane przez okresy wymagane przepisami prawa (patrz: Polityka prywatności), a następnie usuwane</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§9. Prawo właściwe</h2>
            <p>Niniejsze Warunki podlegają prawu polskiemu. Wszelkie spory wynikające z korzystania z Usługi będą rozstrzygane przez sąd właściwy dla siedziby Usługodawcy w Warszawie.</p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">§10. Zmiany Warunków</h2>
            <p>Usługodawca zastrzega prawo do zmiany niniejszych Warunków. O istotnych zmianach Użytkownicy zostaną powiadomieni drogą e-mail z wyprzedzeniem co najmniej 14 dni. Dalsze korzystanie z Usługi po upływie tego terminu oznacza akceptację nowych Warunków.</p>
          </section>

          <hr className="border-gray-200" />

          <section>
            <h2 className="mb-2 text-lg font-semibold text-gray-800">Aneks A — Umowa Powierzenia Danych Osobowych (DPA)</h2>
            <p className="mb-4 text-xs text-gray-400">Zgodnie z art. 28 Rozporządzenia (UE) 2016/679 (RODO)</p>

            <div className="space-y-6">
              <div>
                <h3 className="mb-1 font-semibold text-gray-700">A.1. Strony umowy</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Administrator</strong> — Użytkownik (firma), który przetwarza dane osobowe przy użyciu Usługi</li>
                  <li><strong>Podmiot przetwarzający</strong> — [NAZWA FIRMY] (Usługodawca, operator platformy Integris)</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-gray-700">A.2. Przedmiot i cel powierzenia</h3>
                <p>Podmiot przetwarzający przetwarza dane osobowe w imieniu Administratora wyłącznie w celu świadczenia Usługi — tj. odczytu faktur PDF, ekstrakcji danych, generowania XML FA(3) i wysyłki do KSeF.</p>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-gray-700">A.3. Rodzaj danych i kategorie osób</h3>
                <p>Dane zawarte w fakturach: imiona i nazwiska, adresy, NIP — dotyczące pracowników, kontrahentów i osób fizycznych prowadzących działalność gospodarczą wskazanych na fakturach.</p>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-gray-700">A.4. Zobowiązania podmiotu przetwarzającego</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Przetwarzanie danych wyłącznie na udokumentowane polecenie Administratora</li>
                  <li>Zapewnienie, że osoby upoważnione do przetwarzania zobowiązały się do zachowania poufności</li>
                  <li>Wdrożenie odpowiednich środków technicznych i organizacyjnych (art. 32 RODO)</li>
                  <li>Pomoc Administratorowi w realizacji praw osób, których dane dotyczą</li>
                  <li>Usunięcie lub zwrot danych po zakończeniu umowy</li>
                  <li>Udostępnienie Administratorowi wszelkich informacji niezbędnych do wykazania spełnienia obowiązków</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-gray-700">A.5. Dalsze powierzenie (podprzetwarzający)</h3>
                <p className="mb-2">Podmiot przetwarzający korzysta z następujących podprzetwarzających:</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Podmiot</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Cel</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Lokalizacja</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Podstawa transferu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-4 py-2">Supabase Inc.</td>
                        <td className="px-4 py-2">Hosting bazy danych i plików</td>
                        <td className="px-4 py-2">USA (AWS)</td>
                        <td className="px-4 py-2">SCC (art. 46 RODO)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Google Cloud</td>
                        <td className="px-4 py-2">OCR faktur (Vision API)</td>
                        <td className="px-4 py-2">UE/USA</td>
                        <td className="px-4 py-2">SCC / DPA Google</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">OpenAI</td>
                        <td className="px-4 py-2">Ekstrakcja pól faktury</td>
                        <td className="px-4 py-2">USA</td>
                        <td className="px-4 py-2">SCC (art. 46 RODO)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-gray-700">A.6. Prawo do audytu</h3>
                <p>Administrator ma prawo do przeprowadzania audytów i inspekcji w zakresie zgodności z niniejszym Aneksem. Audyt odbywa się po uprzednim pisemnym powiadomieniu z wyprzedzeniem co najmniej 14 dni roboczych.</p>
              </div>
            </div>
          </section>

          <p className="text-xs text-gray-400">
            W razie pytań dotyczących niniejszych Warunków prosimy o kontakt: <strong>[EMAIL]</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
