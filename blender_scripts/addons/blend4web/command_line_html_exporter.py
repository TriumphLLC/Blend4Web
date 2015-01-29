import bpy, sys

bpy.ops.export_scene.b4w_html(do_autosave = False, override_filepath=sys.argv[6])
