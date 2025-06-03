import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import { languages, Language } from "@/lib/i18n";

export function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-slate-600">{t('language')}:</span>
      <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languages).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}