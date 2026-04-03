"use client";

import { useState } from "react";
import { Label } from "../atoms/Label";

const CUSTOM_PRONOUNS_VALUE = "__custom__";
const PRONOUN_KEYS = [
  "pronounsHeHim",
  "pronounsSheHer",
  "pronounsTheyThem",
] as const;

export interface PronounsPickerProps {
  /** next-intl translate function scoped to the current namespace */
  t: (key: string) => string;
  /** Current persisted value (null = don't specify) */
  defaultValue?: string | null;
  /** Called whenever the effective value changes (for parent dirty-tracking) */
  onDirty?: () => void;
  /** Extra CSS class for the select element */
  selectClassName?: string;
}

export function PronounsPicker({
  t,
  defaultValue = null,
  onDirty,
  selectClassName = "focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none",
}: PronounsPickerProps) {
  const pronounOptions = PRONOUN_KEYS.map((key) => t(key));
  const isCustom =
    defaultValue !== null && !pronounOptions.includes(defaultValue);
  const [pronounsSelect, setPronounsSelect] = useState(
    defaultValue === null
      ? ""
      : isCustom
        ? CUSTOM_PRONOUNS_VALUE
        : defaultValue,
  );
  const [customPronouns, setCustomPronouns] = useState(
    isCustom ? (defaultValue ?? "") : "",
  );

  return (
    <div className="space-y-1">
      <Label htmlFor="pronouns">{t("pronouns")}</Label>
      <select
        id="pronouns"
        name={pronounsSelect === CUSTOM_PRONOUNS_VALUE ? undefined : "pronouns"}
        value={pronounsSelect}
        onChange={(e) => {
          setPronounsSelect(e.target.value);
          onDirty?.();
        }}
        className={selectClassName}
      >
        <option value="">{t("pronounsDontSpecify")}</option>
        {pronounOptions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={CUSTOM_PRONOUNS_VALUE}>{t("pronounsCustom")}</option>
      </select>
      {pronounsSelect === CUSTOM_PRONOUNS_VALUE && (
        <input
          name="pronouns"
          type="text"
          maxLength={50}
          value={customPronouns}
          onChange={(e) => {
            setCustomPronouns(e.target.value);
            onDirty?.();
          }}
          placeholder={t("pronounsCustomPlaceholder")}
          className="focus:border-primary-500 focus:ring-primary-500 mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none"
        />
      )}
    </div>
  );
}
