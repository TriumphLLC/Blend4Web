# ##### BEGIN GPL LICENSE BLOCK #####
#
#  This program is free software; you can redistribute it and/or
#  modify it under the terms of the GNU General Public License
#  as published by the Free Software Foundation; either version 2
#  of the License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software Foundation,
#  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ##### END GPL LICENSE BLOCK #####

# <pep8 compliant>
#
bl_info = {
    "name": "Layer Management",
    "author": "Alfonso Annarumma",
    "version": (1, 5),
    "blender": (2, 65, 4),
    "location": "View3D > Properties panel > Layer Management",
    "warning": "",
    "description": "Display and Edit Layer Name",
    "wiki_url": "http://wiki.blender.org/index.php/Extensions:2.6/Py/"
                "Scripts/3D_interaction/layer_manager",
    "tracker_url": "http://projects.blender.org/tracker/index.php?"
                   "func=detail&aid=32472",
    "category": "3D View"}

import bpy
from bpy.props import StringProperty, BoolProperty, IntProperty, CollectionProperty, BoolVectorProperty

EDIT = ["EDIT_MESH", "EDIT_CURVE", "EDIT_SURFACE", "EDIT_METABALL", "EDIT_TEXT", "EDIT_ARMATURE"]

class LayerGroups(bpy.types.PropertyGroup):

    toggle = BoolProperty(name="", default=False)

    lock = BoolProperty(name="", default=False)

    layer_groups = BoolVectorProperty(name="Layer Groups", default = ([False]*20), size=20, subtype='LAYER')

    # A list of identifiers (colon-separated strings) which property’s controls should be displayed
    # in a template_list.
    # Note that the order is respected.
    #template_list_controls = StringProperty(default="toggle", options={"HIDDEN"})

bpy.utils.register_class(LayerGroups)

bpy.types.Scene.layergroups = CollectionProperty(type=LayerGroups)
# Unused, but this is needed for the TemplateList to work…
bpy.types.Scene.layergroups_index = IntProperty(default=-1)

class RemoveLayerGroup(bpy.types.Operator):
    '''Tooltip'''
    bl_idname = "object.layergroup_remove"
    bl_label = "Remove select Layer Group"

    index_group = bpy.props.IntProperty()

    @classmethod
    def poll(cls, context):
        return context.scene is not None

    def execute(self, context):
        scene = context.scene

        index_group = self.index_group

        scene.layergroups.remove(index_group)

        if index_group > 0:
            scene.layergroups_index = index_group - 1

        return {'FINISHED'}

class AddLayerGroup(bpy.types.Operator):
    '''Tooltip'''
    bl_idname = "object.layergroup_add"
    bl_label = "Add select Layer group"

    index = bpy.props.IntProperty()
    layer = layer = BoolVectorProperty(name="Layer", default = ([False]*20), size=20)

    @classmethod
    def poll(cls, context):
        return context.scene is not None

    def execute(self, context):

        scene = context.scene
        layergroups = scene.layergroups

        index = self.index
        layer = self.layer

        item = layergroups.add()
        index_number= str(index)

        if len(index_number)==2:
            index_number = "0"+index_number
            if len(index_number)==3:
                index_number = index_number
        else:
            index_number = "00"+index_number
        item.name= 'LayerGroup.'+index_number
        #item.use=True
        scene.layergroups_index = index
        scene.layergroups[index].layer_groups = layer

        return {'FINISHED'}

class LayerToggle(bpy.types.Operator):
    '''Visualize this Layer, Shift-Click to select multiple layers'''
    bl_idname = "object.layertoggle"
    bl_label = "Visualize this layer"

    #prop definition
    #layer number
    layerN = bpy.props.IntProperty()
    spacecheck = bpy.props.BoolProperty()
    index_group = bpy.props.IntProperty()

    @classmethod

    def poll(cls, context):

        return context.scene

    def execute(self, context):

        spacecheck = self.spacecheck
        scene = context.scene

        layerN = self.layerN

        if spacecheck:

            space = context.area.spaces.active
        else:
            space = context.scene

        if layerN==-1:
            index = self.index_group
            groups = scene.layergroups[index].layer_groups
            layergroups = scene.layergroups[index]

            layers = space.layers
            union= [False]*20

            if not layergroups.toggle:
                for i in range(0,20):

                    union[i]= groups[i] or layers[i]

                space.layers=union
                layergroups.toggle=True
            else:
                for i in range(0,20):

                    union[i]=  not groups[i]  and layers[i]

                space.layers=union
                layergroups.toggle=False

        else:

            if self.shift:

                if space.layers[layerN]:
                    toggle = False
                else:

                    toggle= True
                space.layers[layerN]=toggle

            else:

                layer = [False]*20
                layer[layerN]=True
                space.layers=layer

                if space.layers[layerN]:
                    toggle = False

        return {'FINISHED'}
    def invoke(self, context, event):
        self.shift = event.shift

        return self.execute(context)

class MergeSelected(bpy.types.Operator):
    '''Move Selected Objects in this Layer Shift-Click to select multiple layers'''
    bl_idname = "object.mergeselected"
    bl_label = "Merge Selected object in this layer"

    #prop definition
    #layer number
    layerN = bpy.props.IntProperty()

    @classmethod

    def poll(cls, context):

        return context.scene

    def execute(self, context):

        layerN = self.layerN

        scene= context.scene

        #cyecle all object in the layer

        for obj in scene.objects:

            if obj.select:
                visible=False

                for i in range(0,20):
                    if obj.layers[i] and scene.layers[i]:
                        visible=True
                        break

                if visible:
                    if self.shift:

                        if obj.layers[layerN]:
                            toggle = False
                        else:

                            toggle= True
                        obj.layers[layerN]=toggle

                    else:

                        layer = [False]*20
                        layer[layerN]=True
                        obj.layers=layer

                        if obj.layers[layerN]:
                            toggle = False

        return {'FINISHED'}

    def invoke(self, context, event):
        self.shift = event.shift

        return self.execute(context)

class LockSelected(bpy.types.Operator):
    '''Loock All Objects on this Layer'''
    bl_idname = "object.lockselected"
    bl_label = "Hide Select of Selected"

    #prop definition
    #layer number
    layerN = bpy.props.IntProperty()

    #lock status
    lock = bpy.props.BoolProperty()

    index_group = bpy.props.IntProperty()

    @classmethod

    def poll(cls, context):

        return context.scene

    def execute(self, context):

        scene = context.scene
        layerN = self.layerN
        lock =self.lock

        view_3d = context.area.spaces.active

        #check if layer have some thing
        if view_3d.layers_used[layerN] or  layerN==-1:

            #cyecle all object in the layer
            for obj in context.scene.objects:

                if layerN==-1:

                    index = self.index_group
                    groups = scene.layergroups[index].layer_groups
                    layers = obj.layers

                    layergroup=[False]*20

                    for i in range (0,20):
                        layergroup[i]= layers[i] and groups[i]

                    if True in layergroup:
                        obj.hide_select=not lock
                        obj.select=False

                        scene.layergroups[index].lock=not lock

                else:
                    if obj.layers[layerN]:
                        obj.hide_select=not lock
                        obj.select=False

                        scene.LockLayer[layerN]= not lock

        return {'FINISHED'}

class SelectObjectsLayer(bpy.types.Operator):
    '''Select All the Objects on this Layer'''
    bl_idname = "object.selectobjectslayer"
    bl_label = "Select objects in Layer"

    select_obj = bpy.props.BoolProperty()
    layerN = bpy.props.IntProperty()

    @classmethod
    def poll(cls, context):
        return context.scene

    def execute(self, context):

        view_3d = context.area.spaces.active
        select_obj= self.select_obj
        layerN = self.layerN
        scene = context.scene
        i=0
        s=0
        #check if layer have some thing
        if view_3d.layers_used[layerN]:

            for obj in context.scene.objects:

                if obj.layers[layerN]:
                    i = i+1
                if obj.layers[layerN] and obj.select:
                    s = s+1

            if s==i:
                for obj in context.scene.objects:

                    if obj.layers[layerN]:
                        obj.select=False

            else:
                bpy.ops.object.select_by_layer(extend=True, layers=layerN+1)

        return {'FINISHED'}

class AllLayersSelect(bpy.types.Operator):
    '''Active all Layer in scene'''
    bl_idname = "scene.layersselect"
    bl_label = "Select All Layer"

    vis = bpy.props.BoolProperty()

    @classmethod
    def poll(cls, context):
        return context.scene

    def execute(self, context):

        scene = context.scene
        vis = self.vis
        #store the active layer
        active = scene.active_layer

        view_3d = context.area.spaces.active
                #check for lock camera and layer is active
        if view_3d.lock_camera_and_layers is True:
            space= scene

        else:
            space= view_3d

        if not vis:
            for i in range (0,20):

                 #keep selection of active layer
                if active == i:
                    space.layers[i]= True

                #deselect the other...
                else:
                    space.layers[i]= False

        else:
            for i in range (0,20):
                #select all layer
                space.layers[i]=True

            #after the cycle, deselect and select the previus active layer
            space.layers[active]=False
            space.layers[active]=True
        return {'FINISHED'}

class LayerName(bpy.types.Panel):
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_label = "Layer Management"
    bl_idname = "_PT_rig_layers"
    bl_options = {'DEFAULT_CLOSED'}

    # layer name prop definition
    bpy.types.Scene.LayerName1 = bpy.props.StringProperty(name="Layer Name", default='layer1')
    bpy.types.Scene.LayerName2 = bpy.props.StringProperty(name="Layer Name", default='layer2')
    bpy.types.Scene.LayerName3 = bpy.props.StringProperty(name="Layer Name", default='layer3')
    bpy.types.Scene.LayerName4 = bpy.props.StringProperty(name="Layer Name", default='layer4')
    bpy.types.Scene.LayerName5 = bpy.props.StringProperty(name="Layer Name", default='layer5')
    bpy.types.Scene.LayerName6 = bpy.props.StringProperty(name="Layer Name", default='layer6')
    bpy.types.Scene.LayerName7 = bpy.props.StringProperty(name="Layer Name", default='layer7')
    bpy.types.Scene.LayerName8 = bpy.props.StringProperty(name="Layer Name", default='layer8')
    bpy.types.Scene.LayerName9 = bpy.props.StringProperty(name="Layer Name", default='layer9')
    bpy.types.Scene.LayerName10 = bpy.props.StringProperty(name="Layer Name", default='layer10')
    bpy.types.Scene.LayerName11 = bpy.props.StringProperty(name="Layer Name", default='layer11')
    bpy.types.Scene.LayerName12 = bpy.props.StringProperty(name="Layer Name", default='layer12')
    bpy.types.Scene.LayerName13 = bpy.props.StringProperty(name="Layer Name", default='layer13')
    bpy.types.Scene.LayerName14 = bpy.props.StringProperty(name="Layer Name", default='layer14')
    bpy.types.Scene.LayerName15 = bpy.props.StringProperty(name="Layer Name", default='layer15')
    bpy.types.Scene.LayerName16 = bpy.props.StringProperty(name="Layer Name", default='layer16')
    bpy.types.Scene.LayerName17 = bpy.props.StringProperty(name="Layer Name", default='layer17')
    bpy.types.Scene.LayerName18 = bpy.props.StringProperty(name="Layer Name", default='layer18')
    bpy.types.Scene.LayerName19 = bpy.props.StringProperty(name="Layer Name", default='layer19')
    bpy.types.Scene.LayerName20 = bpy.props.StringProperty(name="Layer Name", default='layer20')

    #prop for hide empty
    bpy.types.Scene.LayerVisibility = bpy.props.BoolProperty(name="Hide empty Layer", default=False)

    #prop for extra option
    bpy.types.Scene.ExtraOptions = bpy.props.BoolProperty(name="Show extra options", default=True)

    #lock layer status
    bpy.types.Scene.LockLayer = bpy.props.BoolVectorProperty(name="Lock Layer", default = ([False]*20), size=20)

    #prop for show index
    bpy.types.Scene.LayerIndex = bpy.props.BoolProperty(name="Show Index", default=False)

    #prop for show classic
    bpy.types.Scene.Classic = bpy.props.BoolProperty(name="Classic", default=False,description="Use a classic layer selection visibility")
    #Select object Status
    bpy.types.Scene.ObjectSelect = bpy.props.BoolVectorProperty(name="Object Select", default = ([True]*20), size=20)

    #toggle for merge
    #bpy.types.Scene.MergeToggle = bpy.props.BoolVectorProperty(name="Merge Toggle", default = (False,False,False,False,False,False,False,False,False,False,False,False,False,False,False,False,False,False,False,False), size=20)

    @classmethod
    def poll(self, context):
        try:
            return (context.mode not in EDIT)
        except (AttributeError, KeyError, TypeError):
            return False

    def draw(self, context):

        scene = context.scene

        view_3d = context.area.spaces.active
                #check for lock camera and layer is active
        if view_3d.lock_camera_and_layers is True:
            space= scene
            spacecheck=False

        else:
            space= view_3d
            spacecheck=True

        #row = layout.row(align=True)

        vis=False
        allIcon='RESTRICT_VIEW_OFF'
        allText="Isolate active"

        #check if there is a layer off
        for layer in space.layers:

            if not layer:
                vis=True
                allIcon='RESTRICT_VIEW_ON'
                allText="All Visible"

        layout = self.layout
        column = layout.column()
        row = column.row()
        col2= row.column()

        #lock camera and layers button

        col2.prop(view_3d, "lock_camera_and_layers", text="")

        #select all

        allView = col2.operator("scene.layersselect", emboss=False, icon=allIcon, text="")
        allView.vis=vis

        col= row.column()
        col.alignment='RIGHT'
        #classic
        col.prop(scene, "Classic", text="Classic")

        #show extra option checkbox

        col.alignment='RIGHT'
        col.prop(scene, "ExtraOptions", text="Options")

        col1= row.column()

        #show index
        col1.prop(scene, "LayerIndex", text="Index")

        # hide empty

        if context.object:
            col1.alignment='RIGHT'
            col1.prop(scene, "LayerVisibility", toggle=False, text="Hide Empty")

        ##########

        #list the layer
        for i in range(0,20):

            #inizializing the icon
            #lockIcon='UNLOCKED'
            iconUsed= 'RADIOBUT_OFF'
            iconAc='NONE'
            iconLayer='NONE'
            #selectIcon ='RESTRICT_SELECT_OFF'
            #inizializing the bool value
            noitem = False

            active=False

            layer=20
            scene = context.scene

            extra = scene.ExtraOptions

            layer_used = view_3d.layers_used[i]

            #check the hide empty value
            if scene.LayerVisibility:

                #find the empty layer
                if layer_used:
                    #print (i)
                    layer = i

                    'Add ad object to see the layer'
            else:
                layer=i
                #the layer number

            #set icon for lock layer
            lock = scene.LockLayer[i]

            if lock:
                lockIcon= 'LOCKED'
            else:
                lockIcon= 'UNLOCKED'

            #check if there are Selected obj in the layer

            #check if layer have some thing
            if layer_used:

                iconUsed= 'LAYER_USED'

                active_object = context.object

                if active_object:

                    if context.object.layers[i]:

                        active = True

            else:
                scene.ObjectSelect[i]= True

            if layer ==i:

                #check for active layer and set the icon
                if view_3d.lock_camera_and_layers:

                    if scene.active_layer==layer:
                        iconAc = 'FILE_TICK'
                        noitem = True

                if active:
                    iconUsed = 'LAYER_ACTIVE'

                #set icon for layer view
                if view_3d.layers[layer]:
                    viewIcon = 'RESTRICT_VIEW_OFF'
                    noitem = True
                else:
                    viewIcon = 'RESTRICT_VIEW_ON'
                    noitem = False

                row2=column.row(align=True)
#                if space==scene:
#
#                    colb1= row2.column()
#                    #layer visibility operator
#                    tog = colb1.operator("view3d.layers", text="",icon=viewIcon, emboss=False)
#                    tog.nr=layer+1
#                    tog.toggle=True
#                    viewemboss = True

                iconLayer=viewIcon

                # layer index
                if scene.LayerIndex:

                    col6 = row2.column()
                    col6.scale_x=0.14
                    col6.label(text=str(i+1)+".")

                # visualization
                classic = scene.Classic
                if not classic:

                    colb2= row2.column()
                    colb2.prop(space, "layers", index=layer, emboss=True, icon=iconLayer, toggle=True, text="")
                else:
                    colb6 = row2.column()
                    used = colb6.operator("object.layertoggle", text="", icon= iconLayer, emboss=True)
                    used.layerN=i
                    used.spacecheck=spacecheck

                #text prop
                s = "LayerName"+str(i+1)
                colb3= row2.column()
                colb3.prop(scene,s,text="",icon=iconAc)

                if extra:

                    #Select by type operator
                    colb4 = row2.column()
                    select = colb4.operator("object.selectobjectslayer", icon='RESTRICT_SELECT_OFF',text="", emboss=True )
                    select.layerN = i
                    #select.select_obj= selobj

                    #lock operator
                    colb5 = row2.column()
                    lk = colb5.operator("object.lockselected", text="", emboss=True, icon= lockIcon)

                    lk.layerN = i
                    lk.lock=lock

    #                #occuped layer
    #                colb6.label(text="", icon=iconUsed)

                    #merge layer
                    colb7 = row2.column()
                    merge = colb7.operator("object.mergeselected", text="", emboss=True, icon= iconUsed)
                    merge.layerN=i

                if not scene.LayerVisibility:
                    if i==4 or i==9 or i==14 or i==19:
                        row3 = column.row()
                        row3.separator()
        if len(scene.objects)==0:
            layout.label(text='No objects in scene')

class LayerGroupsUI(bpy.types.Panel):
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_label = "Layer Groups"
    bl_idname = "_PT_layer_group"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(self, context):
        try:
            return (context.mode not in EDIT)
        except (AttributeError, KeyError, TypeError):
            return False

    def draw(self, context):

        scene = context.scene
        view_3d = context.area.spaces.active

        #check for lock camera and layer is active
        if view_3d.lock_camera_and_layers is True:
            space= scene
            spacecheck = False
        else:
            space= view_3d
            spacecheck = True
        #######################

        index_group =  scene.layergroups_index
        items =len(scene.layergroups)
        viewIcon = 'RESTRICT_VIEW_OFF'
        layout = self.layout
        row = layout.row()
        row.template_list("UI_UL_list", "ui_layer_groups", context.scene, "layergroups",
                          context.scene, "layergroups_index", rows=items)
        col =row.column(align =True)
        add = col.operator("object.layergroup_add", icon='ZOOMIN', text="")
        add.index= items
        add.layer= scene.layers
        remove = col.operator("object.layergroup_remove", icon='ZOOMOUT', text="")
        remove.index_group= index_group
        if items > 0:

            lock=scene.layergroups[index_group].lock
            toggle = scene.layergroups[index_group].toggle
            if lock:
                iconLock= 'LOCKED'
            else:
                iconLock='UNLOCKED'

            lk = col.operator("object.lockselected", text="", emboss=True, icon= iconLock)
            lk.index_group = index_group
            lk.lock=lock
            lk.layerN=-1

            #set icon for layer view
            if toggle:
                iconLayer = 'RESTRICT_VIEW_OFF'
                #noitem = True
            else:
                iconLayer = 'RESTRICT_VIEW_ON'
                #noitem = False

            view = col.operator("object.layertoggle", text="", icon= iconLayer, emboss=True)
            view.index_group = index_group
            view.layerN=-1
            view.spacecheck=spacecheck

            layout.prop(scene.layergroups[index_group], "layer_groups", text="", toggle=True)
            layout.prop(scene.layergroups[index_group], "name", text="Name:")

def register():

    bpy.utils.register_class(AddLayerGroup)
    bpy.utils.register_class(RemoveLayerGroup)
    bpy.utils.register_class(LayerGroupsUI)
    bpy.utils.register_class(AllLayersSelect)
    bpy.utils.register_class(LayerToggle)
    bpy.utils.register_class(MergeSelected)
    bpy.utils.register_class(LayerName)
    bpy.utils.register_class(LockSelected)
    bpy.utils.register_class(SelectObjectsLayer)

def unregister():
    bpy.utils.unregister_class(AddLayerGroup)
    bpy.utils.unregister_class(RemoveLayerGroup)
    bpy.utils.unregister_class(LayerGroupsUI)
    bpy.utils.unregister_class(LayerName)
    bpy.utils.uregister_class(AllLayersSelect)
    bpy.utils.unregister_class(LayerToggle)
    bpy.utils.uregister_class(MergeSelected)
    bpy.utils.unregister_class(LockSelected)
    bpy.utils.unregister_class(SelectObjectsLayer)
if __name__ == "__main__":
    register()
