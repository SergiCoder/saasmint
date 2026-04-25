import { useTranslations } from "next-intl";

interface PasswordRequirementsProps {
  className?: string;
}

export function PasswordRequirements({
  className = "",
}: PasswordRequirementsProps) {
  const t = useTranslations("auth.passwordRequirements");
  const rules: readonly string[] = [
    t("minLength"),
    t("notCommon"),
    t("notSimilar"),
    t("notNumeric"),
  ];

  return (
    <div className={`text-sm text-gray-600 ${className}`}>
      <p className="font-medium text-gray-700">{t("title")}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
