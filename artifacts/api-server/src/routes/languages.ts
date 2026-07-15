import { Router } from "express";

const router = Router();

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", rtl: false, flag: "🇺🇸" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true, flag: "🇸🇦" },
  { code: "fr", name: "French", nativeName: "Français", rtl: false, flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false, flag: "🇪🇸" },
  { code: "zh", name: "Chinese", nativeName: "中文", rtl: false, flag: "🇨🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", rtl: false, flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", nativeName: "Português", rtl: false, flag: "🇧🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false, flag: "🇩🇪" },
  { code: "ru", name: "Russian", nativeName: "Русский", rtl: false, flag: "🇷🇺" },
  { code: "ja", name: "Japanese", nativeName: "日本語", rtl: false, flag: "🇯🇵" },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true, flag: "🇵🇰" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", rtl: false, flag: "🇰🇪" },
];

router.get("/languages", (_req, res) => {
  return res.status(200).json({ languages: SUPPORTED_LANGUAGES });
});

export default router;
