import bpy
import os, sys, shutil
from collections import defaultdict

ADDON_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__))))
PATH_TO_TUPLE = os.path.join(ADDON_DIR, "translation_tuple.py")
SPLITTER = "    ),\n"
SIGN = "/lib/"
START = "translations_tuple = (\n"
END = ")\n"
LOCALES = os.path.join(ADDON_DIR, "locales")

def correct_translator_tuple():
    f = open(PATH_TO_TUPLE, "r+")
    lines = f.readlines()
    f.seek(0)

    key = ""
    for line in lines:
        key += line
        if line == SPLITTER:
            if key.find(SIGN) == -1:
                f.write(key)
            key = ""
    f.write(key)
    f.truncate()
    f.close()

def clean_translator_tuple():
    f = open(PATH_TO_TUPLE, "r+")
    lines = f.readlines()
    f.seek(0)

    do_not_put = False
    for line in lines:
        if line == START:
            f.write(line)
            do_not_put = True
        elif line == END:
            do_not_put = False
        if not do_not_put:
            f.write(line)

    f.truncate()
    f.close()

if ("blend4web" in bpy.context.user_preferences.addons
        and "ui_translate" in bpy.context.user_preferences.addons):
    try:
        clean_translator_tuple()
        bpy.ops.ui.i18n_updatetranslation_svn_init_settings()

        for arg in sys.argv:
            if arg.startswith("b4w_lang"):
                po_file = arg.split('=')[1]
            if arg.startswith("b4w_path"):
                path_to_blender_po = arg.split('=')[1]

        if po_file == "ru_RU":
            lang = "Russian (Русский)"
        elif po_file == "ja_JP":
            lang = "Japanese (日本語)"
        elif po_file == "en_US":
            lang = "English (English)"
        elif po_file == "nl_NL":
            lang = "Dutch (Nederlandse taal)"
        elif po_file == "it_IT":
            lang = "Italian (Italiano)"
        elif po_file == "de_DE":
            lang = "German (Deutsch)"
        elif po_file == "fi_FI":
            lang = "Finnish (Suomi)"
        elif po_file == "sv_SE":
            lang = "Swedish (Svenska)"
        elif po_file == "fr_FR":
            lang = "French (Français)"
        elif po_file == "es":
            lang = "Spanish (Español)"
        elif po_file == "ca_AD":
            lang = "Catalan (Català)"
        elif po_file == "cs_CZ":
            lang = "Czech (Český)"
        elif po_file == "pt_PT":
            lang = "Portuguese (Português)"
        elif po_file == "zh_CN":
            lang = "Simplified Chinese (简体中文)"
        elif po_file == "zh_TW":
            lang = "Traditional Chinese (繁體中文)"
        elif po_file == "hr_HR":
            lang = "Croatian (Hrvatski)"
        elif po_file == "sr_RS":
            lang = "Serbian (Српски)"
        elif po_file == "uk_UA":
            lang = "Ukrainian (Український)"
        elif po_file == "pl_PL":
            lang = "Polish (Polski)"
        elif po_file == "ro_RO":
            lang = "Romanian (Român)"
        elif po_file == "ar_EG":
            lang = "Arabic (ﺔﻴﺑﺮﻌﻟﺍ)"
        elif po_file == "bg_BG":
            lang = "Bulgarian (Български)"
        elif po_file == "el_GR":
            lang = "Greek (Ελληνικά)"
        elif po_file == "ko_KR":
            lang = "Korean (한국 언어)"
        elif po_file == "ne_NP":
            lang = "Nepali (नेपाली)"
        elif po_file == "fa_IR":
            lang = "Persian (ﯽﺳﺭﺎﻓ)"
        elif po_file == "id_ID":
            lang = "Indonesian (Bahasa indonesia)"
        elif po_file == "sr_RS@latin":
            lang = "Serbian Latin (Srpski latinica)"
        elif po_file == "ky_KG":
            lang = "Kyrgyz (Кыргыз тили)"
        elif po_file == "tr_TR":
            lang = "Turkish (Türkçe)"
        elif po_file == "hu_HU":
            lang = "Hungarian (Magyar)"
        elif po_file == "pt_BR":
            lang = "Brazilian Portuguese (Português do Brasil)"
        elif po_file == "he_IL":
            lang = "Hebrew (תירִבְעִ)"
        elif po_file == "et_EE":
            lang = "Estonian (Eestlane)"
        elif po_file == "eo":
            lang = "Esperanto (Esperanto)"
        elif po_file == "es_ES":
            lang = "Spanish from Spain (Español de España)"
        elif po_file == "am_ET":
            lang = "Amharic (አማርኛ)"
        elif po_file == "uz_UZ":
            lang = "Uzbek (Oʻzbek)"
        elif po_file == "uz_UZ@cyrillic":
            lang = "Uzbek Cyrillic (Ўзбек)"
        elif po_file == "hi_IN":
            lang = "Hindi (मानक हिन्दी)"
        elif po_file == "vi_VN":
            lang = "Vietnamese (tiếng Việt)"
        else:
            lang = ""

        if lang:
            bpy.ops.ui.i18n_updatetranslation_svn_settings_select(use_select=False)
            bpy.context.window_manager.i18n_update_svn_settings.langs[lang]['use'] = True
            bpy.ops.ui.i18n_addon_translation_update(module_name="blend4web")

            correct_translator_tuple()

            if path_to_blender_po and os.path.isfile(path_to_blender_po):
                po_dir = os.path.dirname(path_to_blender_po)
                bpy.ops.ui.i18n_addon_translation_import(module_name="blend4web", directory=po_dir)

            path_to_po_locales = os.path.join(LOCALES, po_file + ".po")
            if os.path.isfile(path_to_po_locales):
                bpy.ops.ui.i18n_addon_translation_import(module_name="blend4web", directory=LOCALES)
            path_to_po = os.path.join(ADDON_DIR, po_file + ".po")
            if os.path.isfile(path_to_po):
                # NOTE: .po-file must be removed till export start
                os.remove(path_to_po)
            bpy.ops.ui.i18n_addon_translation_export(module_name="blend4web", directory=ADDON_DIR, use_export_pot=False)
            shutil.move(path_to_po, path_to_po_locales)
        else:
            print("Wrong language!")
    except BaseException as ex:
        print(str(ex))
else:
    print("Check the blend4web or ui_translate addons.")


