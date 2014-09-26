import bpy
for obj in bpy.context.selected_objects:
    bpy.context.scene.objects.active = obj    
    bpy.ops.object.lod_add()
    bpy.context.object.lod_levels[1].distance = 300
    #bpy.ops.object.lod_remove(index=1)

    
    
    '''   
    #  Для создания пустых вертексных слоев
    #  Вместо vc_mask ввести название создаваемого словая
    if len(obj.data.vertex_colors) == 0:
      bpy.context.scene.objects.active = obj
      bpy.ops.mesh.vertex_color_add()
      bpy.context.object.data.vertex_colors["Col"].name = "Col"
    '''
    '''
    #  Для создания пустых uv-разверток
    #  Вместо UVMap_0 и UVMap_1 вписать нужные имена разверток
    #  Либо добавить или убрать строку при другом количестве
    #  Используемых разверток
    if len(obj.data.uv_textures) == 0:
       bpy.context.scene.objects.active = obj
       bpy.ops.mesh.uv_texture_add()
       bpy.context.object.data.uv_textures["UVMap"].name = "UVMap_0"
       bpy.ops.mesh.uv_texture_add()
       bpy.context.object.data.uv_textures["UVMap"].name = "UVMap_1"
 
    elif len(obj.data.uv_textures) == 1:
       bpy.context.scene.objects.active = obj
       if   bpy.context.object.data.uv_textures[0].name == "UVMap_0":
            bpy.ops.mesh.uv_texture_add()
            bpy.context.object.data.uv_textures["UVMap"].name = "UVMap_1"
       elif bpy.context.object.data.uv_textures[0].name == "UVMap_1":
            bpy.ops.mesh.uv_texture_add()
            bpy.context.object.data.uv_textures["UVMap"].name = "UVMap_0"
    '''
    '''    
    #Для переименования разверток
    #Вместо UVMAP_0 поствить нужное имя
    if len(obj.data.uv_textures):
       bpy.context.scene.objects.active = obj
       bpy.context.object.data.uv_textures["UVMap"].name = "UVMap_0"
    '''
    '''
    #Для переименования первого вертексного цвета или создания нового
    #Вместо mask поствить нужное имя      
    if len(obj.data.vertex_colors):
       bpy.context.scene.objects.active = obj
       bpy.context.object.data.vertex_colors[0].name = "mask"
    elif len(obj.data.vertex_colors) == 0:
       bpy.ops.mesh.vertex_color_add()
       bpy.context.object.data.vertex_colors[0].name = "mask"
    '''
             
    '''
    bpy.ops.object.modifier_add(type='DECIMATE')
    '''
