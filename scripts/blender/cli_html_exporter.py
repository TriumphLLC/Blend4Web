import bpy, sys

if sys.argv[8] == "reexport":
	bpy.ops.export_scene.b4w_html(do_autosave = False, override_filepath=sys.argv[6])
elif sys.argv[8] == "reexport_conv_media":
	bpy.ops.export_scene.b4w_html(do_autosave = False, override_filepath=sys.argv[6], export_converted_media=True)
