import bpy, sys
import os

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

save()