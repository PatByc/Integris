import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  let locale: string;
  if (cookieLocale) {
    locale = cookieLocale;
  } else {
    const acceptLanguage = (await headers()).get("accept-language");
    if (!acceptLanguage) {
      locale = "pl";
    } else {
      locale = acceptLanguage.toLowerCase().includes("pl") ? "pl" : "en";
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
