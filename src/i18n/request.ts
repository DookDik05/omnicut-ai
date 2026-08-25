import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

import enCommon from "../../messages/en/common.json";
import enEditor from "../../messages/en/editor.json";
import enAiTools from "../../messages/en/ai_tools.json";
import enExport from "../../messages/en/export.json";
import thCommon from "../../messages/th/common.json";
import thEditor from "../../messages/th/editor.json";
import thAiTools from "../../messages/th/ai_tools.json";
import thExport from "../../messages/th/export.json";

const dictionaries = {
  en: {
    common: enCommon,
    editor: enEditor,
    ai_tools: enAiTools,
    export: enExport,
  },
  th: {
    common: thCommon,
    editor: thEditor,
    ai_tools: thAiTools,
    export: thExport,
  },
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: dictionaries[locale],
  };
});
