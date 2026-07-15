import { useState, useEffect } from "react";
import { useListLanguages } from "@workspace/api-client-react";

export function useLanguage() {
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("assistai_lang") || "en";
    }
    return "en";
  });

  const { data } = useListLanguages();
  const languages = data?.languages || [];

  const selectedLangData = languages.find(l => l.code === language);
  const isRtl = selectedLangData?.rtl || false;

  useEffect(() => {
    localStorage.setItem("assistai_lang", language);
    if (isRtl) {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [language, isRtl]);

  return {
    language,
    setLanguage,
    languages,
    isRtl,
    selectedLangData,
  };
}
