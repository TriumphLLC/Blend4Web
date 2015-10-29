import bpy, sys

bpy.ops.export_scene.b4w_html(do_autosave = True, override_filepath=sys.argv[6])
