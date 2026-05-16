import Link from "next/link";

export const metadata = {
  title: "Polityka prywatności i cookies — Integris",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-gray-400 hover:text-gray-700">
          ← Strona główna
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">Polityka prywatności i cookies</h1>
        <p className="mb-10 text-sm text-gray-400">Ostatnia aktualizacja: 2026-05-15</p>

        {/* ── PRIVACY POLICY ── */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-gray-800">I. Polityka prywatności</h2>

          <div className="space-y-6 text-sm leading-relaxed text-gray-600">
            <div>
              <h3 className="mb-1 font-semibold text-gray-700">1. Administrator danych osobowych</h3>
              <p>
                Administratorem Twoich danych osobowych jest: <strong>[NAZWA FIRMY]</strong>,
                z siedzibą pod adresem: <strong>[ADRES]</strong>,
                e-mail: <strong>[EMAIL]</strong>.
              </p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">2. Jakie dane zbieramy</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Adres e-mail oraz dane konta (przy rejestracji i logowaniu)</li>
                <li>Dane firmowe: nazwa firmy, NIP (przy konfiguracji organizacji)</li>
                <li>Dane z przesyłanych faktur PDF: dane sprzedawcy, nabywcy, pozycje faktur, kwoty (przetwarzane wyłącznie w celu realizacji usługi)</li>
                <li>Dane techniczne: adres IP, informacje o przeglądarce, logi dostępu (w celach bezpieczeństwa i diagnostyki)</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">3. Cel i podstawa prawna przetwarzania</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Realizacja usługi</strong> (art. 6 ust. 1 lit. b RODO) — przetwarzanie faktur, generowanie XML FA(3) i wysyłka do KSeF</li>
                <li><strong>Prawnie uzasadniony interes administratora</strong> (art. 6 ust. 1 lit. f RODO) — bezpieczeństwo systemu, zapobieganie nadużyciom, prowadzenie logów audytowych</li>
                <li><strong>Obowiązek prawny</strong> (art. 6 ust. 1 lit. c RODO) — przechowywanie danych faktur zgodnie z przepisami podatkowymi</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">4. Jak długo przechowujemy dane</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dane konta — przez czas trwania umowy, a po jej rozwiązaniu przez 30 dni (możliwość eksportu lub usunięcia na żądanie)</li>
                <li>Dane faktur i logi audytowe — przez 5 lat od daty wystawienia faktury (obowiązek wynikający z przepisów podatkowych)</li>
                <li>Logi techniczne — przez 90 dni</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">5. Odbiorcy danych</h3>
              <p className="mb-1">Twoje dane mogą być przekazywane następującym podmiotom przetwarzającym:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase Inc.</strong> (USA) — hosting bazy danych i przechowywanie plików (umowa o przetwarzanie danych, standardowe klauzule umowne)</li>
                <li><strong>Google Cloud</strong> — usługa OCR (Google Vision API) do odczytu tekstu z faktur PDF</li>
                <li><strong>OpenAI</strong> — ekstrakcja i normalizacja pól faktury z tekstu OCR</li>
                <li><strong>Ministerstwo Finansów — KSeF</strong> — przekazanie zatwierdzonego XML FA(3) w ramach obowiązku wynikającego z przepisów prawa</li>
              </ul>
              <p className="mt-2">Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych.</p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">6. Twoje prawa</h3>
              <p className="mb-1">Przysługują Ci następujące prawa w zakresie przetwarzania danych osobowych:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dostęp</strong> — prawo do uzyskania informacji o przetwarzanych danych</li>
                <li><strong>Sprostowanie</strong> — prawo do poprawienia nieprawidłowych danych</li>
                <li><strong>Usunięcie</strong> — prawo do usunięcia danych (z zastrzeżeniem obowiązków prawnych w zakresie przechowywania)</li>
                <li><strong>Ograniczenie przetwarzania</strong> — prawo do ograniczenia zakresu przetwarzania</li>
                <li><strong>Przenoszenie danych</strong> — prawo do otrzymania danych w ustrukturyzowanym formacie</li>
                <li><strong>Sprzeciw</strong> — prawo do sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie</li>
                <li><strong>Skarga</strong> — prawo do wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO)</li>
              </ul>
              <p className="mt-2">W celu skorzystania z praw prosimy o kontakt: <strong>[EMAIL]</strong></p>
            </div>
          </div>
        </section>

        <hr className="my-8 border-gray-200" />

        {/* ── COOKIE POLICY ── */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-gray-800">II. Polityka cookies</h2>

          <div className="space-y-6 text-sm leading-relaxed text-gray-600">
            <div>
              <h3 className="mb-1 font-semibold text-gray-700">Czym są pliki cookies?</h3>
              <p>
                Pliki cookies (ciasteczka) to małe pliki tekstowe zapisywane przez przeglądarkę na Twoim urządzeniu.
                Służą do zapamiętywania ustawień i utrzymania sesji użytkownika. Nie zawierają danych osobowych
                i nie są wykorzystywane do śledzenia ani reklam.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-700">Jakich cookies używamy?</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Nazwa</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Cel</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Czas trwania</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Typ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-2 font-mono">cookie_consent</td>
                      <td className="px-4 py-2">Zapamiętanie, że użytkownik zaakceptował komunikat o cookies</td>
                      <td className="px-4 py-2">1 rok</td>
                      <td className="px-4 py-2">Niezbędny</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">NEXT_LOCALE</td>
                      <td className="px-4 py-2">Zapamiętanie wybranego języka interfejsu (polski / angielski)</td>
                      <td className="px-4 py-2">1 rok</td>
                      <td className="px-4 py-2">Funkcjonalny</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">sb-*-auth-token</td>
                      <td className="px-4 py-2">Sesja logowania — utrzymuje stan zalogowania użytkownika (zarządzane przez Supabase)</td>
                      <td className="px-4 py-2">30 dni</td>
                      <td className="px-4 py-2">Niezbędny</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Nie używamy cookies reklamowych, analitycznych ani śledzących.
              </p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">Zarządzanie cookies</h3>
              <p>
                Możesz w dowolnym momencie usunąć pliki cookies lub zablokować ich zapisywanie w ustawieniach swojej przeglądarki.
                Należy pamiętać, że usunięcie cookies sesji spowoduje wylogowanie z serwisu, a usunięcie
                cookie językowego przywróci automatyczne wykrywanie języka przeglądarki.
              </p>
            </div>

            <div>
              <h3 className="mb-1 font-semibold text-gray-700">Kontakt</h3>
              <p>
                W sprawach dotyczących niniejszej polityki prosimy o kontakt pod adresem: <strong>[EMAIL]</strong>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
