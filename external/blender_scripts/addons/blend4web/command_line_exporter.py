import bpy, sys

bpy.ops.b4w.export(do_autosave = False, override_filepath=sys.argv[6])
