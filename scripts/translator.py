#!/usr/bin/env python3

import os, subprocess, sys, shutil

PATH_TO_ADDON = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "addons", "blend4web"))
EMPTY_NAME = "empty.po"
PATH_TO_PO = os.path.join(PATH_TO_ADDON, "locales")
PATH_TO_EMPTY = os.path.join(PATH_TO_PO, "empty")
PATH_TO_EMPTY_PO = os.path.join(PATH_TO_PO, EMPTY_NAME)
VALID_PARAMS = ("ru_RU", "ja_JP", "en_US", "nl_NL", "it_IT", "de_DE", "fi_FI", "sv_SE",
        "fr_FR", "es", "ca_AD", "cs_CZ", "pt_PT", "zh_CN", "zh_TW", "hr_HR", "sr_RS",
        "uk_UA", "pl_PL", "ro_RO", "ar_EG", "bg_BG", "el_GR", "ko_KR", "ne_NP",
        "fa_IR", "id_ID", "sr_RS@latin", "ky_KG", "tr_TR", "hu_HU", "pt_BR",
        "he_IL", "et_EE", "eo", "es_ES", "am_ET", "uz_UZ", "uz_UZ@cyrillic", 
        "hi_IN", "vi_VN", "help")

def help():
    print("SYNOPSIS")
    print("         translator.py LANGUAGE\n")
    print("LANGUAGE")
    print("         ru_RU : Russian (Русский)")
    print("         ja_JP : Japanese (日本語)")
    print("         en_US : English (English)")
    print("         nl_NL : Dutch (Nederlandse taal)")
    print("         it_IT : Italian (Italiano)")
    print("         de_DE : German (Deutsch)")
    print("         fi_FI : Finnish (Suomi)")
    print("         sv_SE : Swedish (Svenska)")
    print("         fr_FR : French (Français)")
    print("         es : Spanish (Español)")
    print("         ca_AD : Catalan (Català)")
    print("         cs_CZ : Czech (Český)")
    print("         pt_PT : Portuguese (Português)")
    print("         zh_CN : Simplified Chinese (简体中文)")
    print("         zh_TW : Traditional Chinese (繁體中文)")
    print("         hr_HR : Croatian (Hrvatski)")
    print("         sr_RS : Serbian (Српски)")
    print("         uk_UA : Ukrainian (Український)")
    print("         pl_PL : Polish (Polski)")
    print("         ro_RO : Romanian (Român)")
    print("         ar_EG : Arabic (ﺔﻴﺑﺮﻌﻟﺍ)")
    print("         bg_BG : Bulgarian (Български)")
    print("         el_GR : Greek (Ελληνικά)")
    print("         ko_KR : Korean (한국 언어)")
    print("         ne_NP : Nepali (नेपाली)")
    print("         fa_IR : Persian (ﯽﺳﺭﺎﻓ)")
    print("         id_ID : Indonesian (Bahasa indonesia)")
    print("         sr_RS@latin : Serbian Latin (Srpski latinica)")
    print("         ky_KG : Kyrgyz (Кыргыз тили)")
    print("         tr_TR : Turkish (Türkçe)")
    print("         hu_HU : Hungarian (Magyar)")
    print("         pt_BR : Brazilian Portuguese (Português do Brasil)")
    print("         he_IL : Hebrew (תירִבְעִ)")
    print("         et_EE : Estonian (Eestlane)")
    print("         eo : Esperanto (Esperanto)")
    print("         es_ES : Spanish from Spain (Español de España)")
    print("         am_ET : Amharic (አማርኛ)")
    print("         uz_UZ : Uzbek (Oʻzbek)")
    print("         uz_UZ@cyrillic : Uzbek Cyrillic (Ўзбек)")
    print("         hi_IN : Hindi (मानक हिन्दी)")
    print("         vi_VN : Vietnamese (tiếng Việt)\n")

def translate_addon(lang_po=""):

    if os.path.isfile(PATH_TO_EMPTY_PO):
        os.remove(PATH_TO_EMPTY_PO)
    f = open(PATH_TO_EMPTY_PO, "w")
    f.close()
    for f in os.listdir(PATH_TO_ADDON):
        abs_path = os.path.join(PATH_TO_ADDON, f)
        if os.path.isfile(abs_path) and f[-3:] == ".py":
            # remove "--no-location" key to append location to .po-file
            res = subprocess.call(["xgettext", "--no-location", "-s", "--no-wrap", "-j", 
                    "--default-domain=" + PATH_TO_EMPTY, "--from-code=utf-8", "--keyword=p_:1,2c", abs_path])
    if lang_po:
        translate_po(lang_po)
    else:
        for f in os.listdir(PATH_TO_PO):
            if f == EMPTY_NAME:
                continue
            abs_path = os.path.join(PATH_TO_PO, f)
            if os.path.isfile(abs_path) and f[-3:] == ".po":
                translate_po(abs_path)

def translate_po(lang_po):
    res = subprocess.call(["msgmerge", "-U", "--backup=off", "--no-fuzzy-matching", lang_po, PATH_TO_EMPTY_PO])

if __name__ == "__main__":

    if len(sys.argv) > 2 or len(sys.argv) > 1 and sys.argv[1] not in VALID_PARAMS:
        help()
        sys.exit(1)

    if len(sys.argv) > 1:
        param = sys.argv[1]
        if param == "help":
            help()
            sys.exit(0)

        abs_lang_po = os.path.join(PATH_TO_PO, param + ".po")
        if not os.path.isfile(abs_lang_po):
            print("Couldn't find " + abs_lang_po)
            sys.exit(1)
        translate_addon(abs_lang_po)
    else:
        translate_addon()