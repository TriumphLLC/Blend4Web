import bpy
#Заменяет выделенные объекты на Empty копируя с него location, rotation, scale и имя добавляя его после префикса empty
for obj in bpy.context.selected_objects:
    trans = obj.location
    rot = obj.rotation_euler
    scale = obj.scale
    bpy.ops.object.empty_add(type='PLAIN_AXES', view_align=False, location=trans, rotation=rot)
    empty = bpy.context.object
    empty.scale = scale
    empty.name = "EMPTY_"+obj.name
    bpy.context.object.dupli_type = 'GROUP'                         #Эта часть кода добавляет в empty dupli group
    bpy.context.object.dupli_group = bpy.data.groups["group_name"]  #Вместо group_name необходимо вставить нужное имя группы

