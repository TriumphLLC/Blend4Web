#!/usr/bin/env python3
import string
import subprocess, multiprocessing
import os, sys, getopt

ROOT_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__)), ".."))
ADDON_DIR = os.path.join(ROOT_DIR, "blender_scripts", "addons", "blend4web")
GET_EXPORT_PATH = os.path.join(ADDON_DIR, "command_line_trans_im_ex.py")

def help():
    print("SYNOPSIS")
    print("         translator.py LANGUAGE [PATH_TO_PO]\n")
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
    print("PATH_TO_PO")
    print("         It's the path to blender's PO file "
            + "from bf-translation repo. Use it to merge Blender's PO file with yours.")


def gen_po(lang, path):
    res = subprocess.check_output(["blender", "-b","-P", GET_EXPORT_PATH,
            "b4w_lang=" + lang, "b4w_path=" + path], stderr=subprocess.STDOUT)
    print(res.decode("utf-8"))

if __name__ == "__main__":
    try:
        opts, args = getopt.getopt(sys.argv[1:], "", ["help"])
    except getopt.GetoptError as err:
        print(err)
        sys.exit(1)

    if not len(args):
        help()
        sys.exit(1)

    if len(args) > 2:
        print("You may specify only two assignments")
        help()
        sys.exit(1)

    lang = args[0]

    if lang == "help":
        help()
        exit(0)

    if len(args) == 2:
        path_to_blender_po = args[1]
    else:
        path_to_blender_po = ""

    gen_po(lang, path_to_blender_po)