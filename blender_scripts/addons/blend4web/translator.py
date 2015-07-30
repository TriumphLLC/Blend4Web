from polib import polib
import os

ADDON_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__))))
PATH_TO_PO = os.path.join(ADDON_DIR, "ru_RU.po")

def get_translation_dict():
    translations_dict = {}
    lang = "ru_RU"
    if os.path.isfile(PATH_TO_PO):
        po = polib.pofile(PATH_TO_PO)
        for entry in po:
            if entry.msgctxt:
                ctxt = entry.msgctxt
            else:
                ctxt = "*"
            key = (ctxt, entry.msgid)
            translations_dict.setdefault(lang, {})[key] = entry.msgstr
    return translations_dict