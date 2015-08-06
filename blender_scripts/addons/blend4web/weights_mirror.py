import bpy 

def run():
    

   
    obj = bpy.context.selected_objects[0] 
        
    obj_name = obj.name
        
    obj_mesh = bpy.data.meshes[obj_name]
    obj_armature = obj.modifiers["Armature"].object
        
        
    vertex_group_hash = {}
    for vertex_group in obj.vertex_groups: 
        vertex_group_hash[vertex_group.name] = vertex_group.index   
        print (vertex_group.name, vertex_group.index)  
        
    mirror_vertex_group_hash = {}    
    for vertex_group0 in obj.vertex_groups: 
        if vertex_group0.name[-2:] == '.R':
            vertex_group1_name = vertex_group0.name[0:-2] + '.L'
            mirror_vertex_group_hash[vertex_group0.index] = vertex_group_hash[vertex_group1_name]
        elif vertex_group0.name[-2:] == '.L':
            vertex_group1_name = vertex_group0.name[0:-2] + '.R'
            mirror_vertex_group_hash[vertex_group0.index] = vertex_group_hash[vertex_group1_name]
        else:
            mirror_vertex_group_hash[vertex_group0.index] = vertex_group0.index
    
        print (vertex_group0.name)        
        print (vertex_group0.index, mirror_vertex_group_hash[vertex_group0.index])        
    
    
    vert1_groups = []
    for vert0 in obj_mesh.vertices:    
        if vert0.co[0] > 0:
            for vert1 in obj_mesh.vertices:
                if (vert0.co[0] == -vert1.co[0]) and (vert0.co[1] == vert1.co[1]) and (vert0.co[2] == vert1.co[2]):
                    
                    print ('vert0 ', vert0.index, ', vert1 ', vert1.index) 
                    
                    vert1_groups = []
                    for group in vert1.groups:               
                        vert1_groups.append(group.group)    
              
                    for group in vert1_groups: #delete all groups    
                        print (group)
                        obj.vertex_groups[group].remove([vert1.index])
    
                    
                    for group in vert0.groups:   
                        mirrored_group_index = mirror_vertex_group_hash[group.group] 
                        print (group.group, '->', mirrored_group_index)
    
                        obj.vertex_groups[mirrored_group_index].add([vert1.index], group.weight, 'REPLACE')
                        
                       

class WebGL_Weights_Mirror(bpy.types.Operator):
    '''WebGL Weights Mirror'''
    bl_idname = "object.weights_mirror"
    bl_label = "WebGL Weights Mirror"
   
    def execute(self, context):
        run()
        return {"FINISHED"}

def register(): 
    bpy.utils.register_class(WebGL_Weights_Mirror)

def unregister(): 
    bpy.utils.unregister_class(WebGL_Weights_Mirror)                       
                        
                    
                    
                    
                    
                    
                    
    
        
        
        
        