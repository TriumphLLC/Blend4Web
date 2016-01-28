from polib import polib
from collections import OrderedDict
import os, bpy

ADDON_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__))))
PATH_TO_PO = os.path.join(ADDON_DIR, "locales")

_ = lambda string : string
p_ = lambda string, context : string

def get_translate(message):
    return bpy.app.translations.pgettext_tip(message)

def get_translation_dict():
    files = os.listdir(PATH_TO_PO)
    po_files = []
    for addon_file in files:
        if addon_file.find(".po") != -1:
            po_files.append(addon_file)

    multilang_dict = {}
    for po_file in po_files:
        try:
            po = polib.pofile(os.path.join(PATH_TO_PO, po_file))
        except:
            print("Couldn't parse " + os.path.join(PATH_TO_PO, po_file))
            continue
        lang = os.path.splitext(po_file)[0]
        for entry in po:
            if entry.msgid in multilang_dict:
                multilang_dict[entry.msgid]["msgctxt"].append((lang, entry.msgstr))
            else:
                if entry.msgctxt:
                    context = entry.msgctxt
                else:
                    context = "*"
                multilang_dict[entry.msgid] = {
                    "ctxt" : context,
                    "msgctxt" : [(lang, entry.msgstr)]
                }

    translations_dict = {}

    for ident in multilang_dict:
        key = (multilang_dict[ident]["ctxt"], ident)
        for trans in multilang_dict[ident]["msgctxt"]:
            if trans[1]:
                translations_dict.setdefault(trans[0], {})[key] = trans[1]

    return translations_dict

def register():
    bpy.app.translations.register("B4WTranslator", get_translation_dict())

def unregister():
    bpy.app.translations.unregister("B4WTranslator")