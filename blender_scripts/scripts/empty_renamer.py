import bpy

for obj in bpy.context.selected_objects:
    if obj.dupli_group:
        obj.name = obj.dupli_group.name + ".000"