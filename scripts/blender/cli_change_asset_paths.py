import bpy, sys, os, subprocess
from os.path import join, normpath

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
REEXPORTER = join(ROOT_DIR, "cli_exporter.py")
HTML_REEXPORTER = join(ROOT_DIR, "cli_html_exporter.py")

def save():
    filepath = bpy.data.filepath
    if filepath:
        if os.access(filepath, os.W_OK):
            try:
                bpy.ops.wm.save_mainfile(filepath=filepath)
            except Exception as e:
                print("Could not autosave: " + str(e))
            print("RESAVE OK")
        else:
            print("Could not autosave: permission denied")
    else:
        print("Could not autosave: no file")

def get_rel_target_asset_path(abs_source_asset_path, source_assets, target_assets):
    if source_assets in abs_source_asset_path:
        rel_source_asset_path = os.path.relpath(abs_source_asset_path, source_assets)
        abs_target_asset_path = os.path.normpath(os.path.join(target_assets, rel_source_asset_path))
        return bpy.path.relpath(abs_target_asset_path)

def get_rel_path(path):
    return path if path[:2] != "//" else path[2:]

argv = sys.argv[sys.argv.index("--") + 1:]
if len(argv) > 3:
    source_assets = argv[0]
    target_assets = argv[1]
    source_blend = argv[2]
    target_blend = argv[3]

    rel_target_blend_path = os.path.relpath(os.path.dirname(bpy.data.filepath), target_blend)
    abs_source_blend_path = os.path.normpath(os.path.join(source_blend, rel_target_blend_path))

    # update images locations
    for img in bpy.data.images:
        if img.library:
            continue

        img_path = get_rel_path(img.filepath)

        abs_source_image_path = os.path.normpath(os.path.join(abs_source_blend_path, img_path))

        img.filepath = get_rel_target_asset_path(abs_source_image_path,
                source_assets, target_assets) or img_path

    # update sounds locations
    for sound in bpy.data.sounds:
        if sound.library:
            continue

        sound_path = get_rel_path(sound.filepath)

        abs_source_sound_path = os.path.abspath(os.path.join(abs_source_blend_path, sound_path))

        sound.filepath = get_rel_target_asset_path(abs_source_sound_path,
                source_assets, target_assets) or sound_path

    apply_html_reexport = False
    abs_source_html_path = ""

    apply_reexport = False
    abs_source_json_path = ""

    # update b4w_export_path_html and b4w_export_path_json
    for scene in bpy.data.scenes:
        if scene.b4w_export_path_html:
            html_path = get_rel_path(scene.b4w_export_path_html)

            abs_source_html_path = os.path.abspath(os.path.join(abs_source_blend_path, html_path))

            rel_target_html_path = get_rel_target_asset_path(abs_source_html_path,
                    source_assets, target_assets)
            if rel_target_html_path:
                scene.b4w_export_path_html = bpy.path.abspath(rel_target_html_path)

            if os.path.isfile(abs_source_html_path):
                apply_html_reexport = True

        if scene.b4w_export_path_json:
            json_path = get_rel_path(scene.b4w_export_path_json)

            abs_source_json_path = os.path.abspath(os.path.join(abs_source_blend_path,
                    json_path))

            rel_target_json_path = get_rel_target_asset_path(abs_source_json_path,
                    source_assets, target_assets)
            if rel_target_json_path:
                scene.b4w_export_path_json = bpy.path.abspath(rel_target_json_path)

            if os.path.isfile(abs_source_json_path):
                apply_reexport = True

    save()

    # reexport only after save()
    blend_path = bpy.path.abspath(bpy.data.filepath)
    if apply_html_reexport:
        scene = bpy.data.scenes[0]
        # scene and scene.b4w_export_path_html must be defined in case of
        # apply_html_reexport == True
        subprocess.check_output([bpy.app.binary_path, "-b", blend_path, "-P",
                HTML_REEXPORTER, "--", os.path.normpath(scene.b4w_export_path_html),
                "-o", "reexport"], stderr=subprocess.STDOUT)

    if apply_reexport:
        scene = bpy.data.scenes[0]
        # scene and scene.b4w_export_path_json must be defined in case of
        # apply_reexport == True
        subprocess.check_output([bpy.app.binary_path, "-b", blend_path, "-P",
                REEXPORTER, "--", scene.b4w_export_path_json], stderr=subprocess.STDOUT)