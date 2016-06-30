import bpy, sys, os

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

bundle = sys.argv[6]
for img in bpy.data.images:
    filepath = bpy.data.filepath
    if img.filepath[:2] != "//":
        path = img.filepath
    else:
        path = img.filepath[2:]
    if bundle == "bundle":
        filepath = os.path.split(filepath)[0]
        img_name = os.path.join("textures", os.path.split(path)[-1])
        for i in range(len(filepath.split("material_library")[-1].split(os.path.sep)) - 1):
            img_name = os.path.join("..", img_name)
        img.filepath = "//" + img_name
    elif img.filepath[:2] == "//":
        parts = filepath.split(os.path.sep)
        proj_name = parts[parts.index("material_library") - 1]
        path_parts = path.split("material_library")
        img.filepath = "//" + os.path.join("..", path_parts[0] + proj_name,
                "material_library" + path_parts[-1])
save()