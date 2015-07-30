import bpy
import os

ADDON_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__))))
PATH_TO_PO = os.path.join(ADDON_DIR, "ru_RU.po")
PATH_TO_TUPLE = os.path.join(ADDON_DIR, "translation_tuple.py")
SPLITTER = "    ),\n"
SIGN = "/lib/"

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

if ("blend4web" in bpy.context.user_preferences.addons
        and "ui_translate" in bpy.context.user_preferences.addons):
    try:
        bpy.ops.ui.i18n_updatetranslation_svn_init_settings()
        bpy.ops.ui.i18n_updatetranslation_svn_settings_select(use_select=False)
        bpy.data.window_managers['WinMan'].i18n_update_svn_settings.langs["Russian (Русский)"]['use'] = True
        bpy.ops.ui.i18n_addon_translation_update(module_name="blend4web")

        correct_translator_tuple()

        bpy.ops.ui.i18n_updatetranslation_svn_init_settings()
        bpy.ops.ui.i18n_addon_translation_import(module_name="blend4web", directory=ADDON_DIR)
        # NOTE: .po-file must be removed till export start
        if os.path.isfile(PATH_TO_PO):
            os.remove(PATH_TO_PO)
        bpy.ops.ui.i18n_addon_translation_export(module_name="blend4web", directory=ADDON_DIR, use_export_pot=False)
    except BaseException as ex:
        print(str(ex))
else:
    print("Check the blend4web or ui_translate addons.")


