### bpy.ops.webgl.reload(); bpy.ops.anim.bake()

# NOTE may require curve_simplify.py addon enabled

import bpy
import mathutils
import math
import re

BAKED_SUFFIX = "_B4W_BAKED"

class B4W_Anim_Baker(bpy.types.Operator):
    '''Bake animation for selected armature object'''

    bl_idname = "b4w.animation_bake"
    bl_label = "B4W Animation Bake"

    def execute(self, context):
        armobj = context.active_object
        if not (armobj and armobj.type == "ARMATURE"):
            self.report({'INFO'}, "Not an armature object")
            return {'CANCELLED'}

        # NOTE: handle rare cases when armature has no animation data
        if not armobj.animation_data:
            self.report({'INFO'}, "No animation data")
            return {'CANCELLED'}

        # save current state to restore after (just for convenience)
        current_action = armobj.animation_data.action

        # save auto keyframes tool mode
        use_kia = bpy.context.scene.tool_settings.use_keyframe_insert_auto
        bpy.context.scene.tool_settings.use_keyframe_insert_auto = False

        nla_mute_states = self.set_nla_tracks_mute_state(armobj)

        current_frame = bpy.context.scene.frame_current
        valid_actions = self.get_valid_actions(armobj)
        for action in valid_actions:
            self.process_action(action, armobj)

        armobj.animation_data.action = current_action
        bpy.context.scene.frame_set(current_frame)

        # restore auto keyframes tool mode
        bpy.context.scene.tool_settings.use_keyframe_insert_auto = use_kia

        self.restore_nla_tracks_mute_state(armobj, nla_mute_states)

        return {"FINISHED"}

    def get_valid_actions(self, armobj):
        actions = []

        for action in bpy.data.actions:
            # only process armobj actions
            # and ignore e.g. curves
            if action.id_root != 'OBJECT':
                continue

            # skip actions with BAKED_SUFFIX
            if has_baked_suffix(action):
                continue

            if armobj.b4w_anim:
                for anim in armobj.b4w_anim:
                    if action.name == anim.name:
                        actions.append(action)
            else:
                actions.append(action)

        return actions

    def set_nla_tracks_mute_state(self, armobj):
        states = []

        if armobj.animation_data and armobj.animation_data.nla_tracks:
            tracks = armobj.animation_data.nla_tracks
            for t in tracks:
                states.append(t.mute)
                t.mute = True

        return states

    def restore_nla_tracks_mute_state(self, armobj, state_list):
        if armobj.animation_data and armobj.animation_data.nla_tracks:
            tracks = armobj.animation_data.nla_tracks
            for t in tracks:
                t.mute = state_list.pop(0)

    def process_action(self, action, armobj):
        print("processing action " + action.name)

        # mark source action as not exporting (for convenience)
        action.b4w_do_not_export = True

        new_name = action.name + BAKED_SUFFIX

        actions = bpy.data.actions
        new_action = actions.get(new_name)
        if new_action:
            # reuse old action (segfault when deleting actions)
            fcurves = new_action.fcurves
            groups = new_action.groups
            for fcurve in fcurves:
                fcurves.remove(fcurve)
            for group in groups:
                groups.remove(group)
        else:
            # create new action
            new_action = actions.new(new_name)

        # save it
        new_action.use_fake_user = True

        # create groups for all bones having same names
        # create sets of fcurves for each group
        new_groups = new_action.groups
        new_fcurves = new_action.fcurves

        # set it as active
        bpy.context.scene.objects.active = armobj    

        arm_bones = armobj.data.bones
        for bone in arm_bones:
            if self.needed_to_deform(bone):

                bname = bone.name
                new_groups.new(bname)

                data_path = 'pose.bones["' + bname + '"].'

                new_fcurves.new(data_path + "location", 0, bname)
                new_fcurves.new(data_path + "location", 1, bname)
                new_fcurves.new(data_path + "location", 2, bname)
                new_fcurves.new(data_path + "rotation_quaternion", 0, bname)
                new_fcurves.new(data_path + "rotation_quaternion", 1, bname)
                new_fcurves.new(data_path + "rotation_quaternion", 2, bname)
                new_fcurves.new(data_path + "rotation_quaternion", 3, bname)
                new_fcurves.new(data_path + "scale", 0, bname)
                new_fcurves.new(data_path + "scale", 1, bname)
                new_fcurves.new(data_path + "scale", 2, bname)

        # go pose mode, select all bones and clear pose
        bpy.ops.object.mode_set(mode='POSE')
        bpy.ops.pose.select_all(action="SELECT")
        bpy.ops.pose.transforms_clear()

        # enable currect action
        armobj.animation_data.action = action

        # create key frame points with step 1 between them
        frame_range = action.frame_range
        prev_frame_quats = {}
        # for each bone insert key frame points in its fcurves
        for i in range(round(frame_range[0]), round(frame_range[1]) + 1):
            # set pose
            bpy.context.scene.frame_set(i)

            for pbone in armobj.pose.bones:    
                # do we have created group for this bone?
                group = new_groups.get(pbone.name)
                if group:

                    # MATH
                    # we need to calc pose transform relative to rest position
                    # normally we get it from pbone.matrix_basis
                    # but in order to bake constraints and inverse kinematics we 
                    # calculate "pseudo" matrix_basis in particular pose/frame
                    # from matrix_channel which is pose accumulated through hierarchy 
                    # e.g. channel1 = rest0 * pose0 * rest0.inverted() 
                    #               * rest1 * pose1 * rest1.inverted()

                    # we can get matrix_channel from pose_bone.matrix_channel
                    # but as stated in Blender docs matrix_channel does not include constraints
                    # hence we calc "pseudo" matrix channel from just "matrix" of pose bone
                    # which is (i think)
                    # pbone.matrix = rest0 * pose0 * rest0.inverted() 
                    #              * rest1 * pose1
                    # simply multiplying by inverted rest

                    # retrieve rest matrix
                    ml = pbone.bone.matrix_local

                    # retrieve current matrix and calc "pseudo" matrix channel
                    mch = pbone.matrix * ml.inverted()
            
                    # we need "own" matrix_channel component so remove parent if any
                    parent = pbone.parent
                    if parent:
                        rest_par = parent.bone.matrix_local
                        mch_par = parent.matrix * rest_par.inverted()
                        mch = mch_par.inverted() * mch
                
                    # finally get "pseudo" (i.e. baked) matrix basis by reverse operation
                    mb = ml.inverted() * mch * ml

                    # retrieve components
                    tran = mb.to_translation()
                    quat = mb.to_quaternion()

                    # we've assigned bones' names to groups
                    fcurves = group.channels

                    # in order to perform correct quaternion interpolation we need to keep dot
                    # product Q_cur_frame * Q_prev_frame >= 0
                    if pbone.name in prev_frame_quats \
                            and quat.dot(prev_frame_quats[pbone.name]) < 0:
                        quat.negate()
                    scal = mb.to_scale()
            
                    # we've created fcurves in this particular order
                    fcurves[0].keyframe_points.insert(i, tran[0])
                    fcurves[1].keyframe_points.insert(i, tran[1])
                    fcurves[2].keyframe_points.insert(i, tran[2])
                    fcurves[3].keyframe_points.insert(i, quat[0])
                    fcurves[4].keyframe_points.insert(i, quat[1])
                    fcurves[5].keyframe_points.insert(i, quat[2])
                    fcurves[6].keyframe_points.insert(i, quat[3])
                    fcurves[7].keyframe_points.insert(i, scal[0])
                    fcurves[8].keyframe_points.insert(i, scal[1])
                    fcurves[9].keyframe_points.insert(i, scal[2])

                    prev_frame_quats[pbone.name] = quat

        # now beautify our fcurves

        # enable baked action
        armobj.animation_data.action = new_action

        # clean keys that do not change values
        old_area = bpy.context.area.type
        bpy.context.area.type = "DOPESHEET_EDITOR"

        if armobj.b4w_anim_clean_keys:
            # NOTE: clean-ups source action, if also assigned to some non-armature object
            bpy.ops.action.clean()

        # remove channels having only one unchanged keyframe
        fcurves = new_action.fcurves
        for fcurve in fcurves:
            keyframe_points = fcurve.keyframe_points
            if len(keyframe_points) == 1:
                data_path = fcurve.data_path
                array_index = fcurve.array_index
                value = keyframe_points[0].co[1]

                is_loc = data_path.find("location") > -1
                is_rot = data_path.find("rotation_quaternion") > -1
                is_sca = data_path.find("scale") > -1

                if is_loc and self.near_zero(value) or \
                   is_rot and self.near_one (value) and array_index == 0 or \
                   is_rot and self.near_zero(value) and not array_index == 0 or \
                   is_sca and self.near_one (value):
                    fcurves.remove(fcurve)

        # detect linear parts and assign 'LINEAR' interpolation to them.
        # Needed for root bones to preserve uniform motion
        self.detect_linear_parts(new_action)

        # try to reduce amount of keyframes
        # NOTE this operator requires curve_simplify.py addon enabled
        # XXX hardcoded "problematic" bones   
        '''
        ignore_bones = ["hips", "rump", "thigh", "shin", "foot"]
        for fcurve in new_action.fcurves:
            fcurve.select = True
            for bname in ignore_bones:
                if fcurve.data_path.find(bname) > -1:
                    fcurve.select = False
        bpy.ops.graph.simplify(error = 0.03)
        '''
        bpy.context.area.type = old_area

    def near_zero(self, value):
        return abs(value) < 0.0001

    def near_one(self, value):
        return abs(value - 1) < 0.0001

       
    # bones that are not deform and do not have deform children
    # are not needed for pose calculation on client
    def needed_to_deform(self, bone):
        if bone.use_deform:
            return True 
        for child in bone.children_recursive:
            if child.use_deform:
                return True
        return False
        
    def detect_linear_parts(self, new_action):
        for fcurve in new_action.fcurves:
            keyframe_points = fcurve.keyframe_points
            index = 0
            for keyframe_point in keyframe_points:

                if index == 0:
                    pass # just started, no previous keyframe
                elif index == len(keyframe_points) - 1:
                    pass # last keyframe, no next keyframe
                else:
                    next = keyframe_points[index + 1]

                    v1 = previous.co       # previous
                    v2 = keyframe_point.co # current
                    v3 = next.co           # next

                    x1 = v1[0]
                    y1 = v1[1]
                    x2 = v2[0]
                    y2 = v2[1]
                    x3 = v3[0]
                    y3 = v3[1]

                    # File size optimization:
                    # if NEXT keyframe point is only at 1 frame distance from THIS one
                    # then THIS keyframe point should have linear interpolation
                    point_is_neighbour = x3 - x2 == 1

                    # Detect linear parts:
                    # 1. construct line between THIS keyframe point and PREVIOS one
                    # 2. if NEXT keyframe point is on that line
                    #    then THIS keyframe point should have linear interpolation
                
                    k = (y2 - y1) / (x2 - x1)
                    b = y1 - k * x1
                    
                    point_on_line = abs(k * x3 + b - y3) < 0.0001
                    #print(x2, point_on_line)

                    if point_is_neighbour or point_on_line:
                        keyframe_point.interpolation = 'LINEAR'
            
                        # make end keyframes LINEAR too
                        if index == 1:
                            previous.interpolation = 'LINEAR'
                        elif index == len(keyframe_points) - 2:
                            next.interpolation = 'LINEAR'
                    
                    # after 2.60 update: bezier handle points create extreme
                    # curvatures when neighbouring with linear points 
                    # fix that by moving handle points "y" to the line
                    if previous.interpolation == 'BEZIER' and \
                        keyframe_point.interpolation == 'LINEAR':
                        keyframe_point.handle_left[1] = k * \
                            keyframe_point.handle_left[0] + b
                        previous.handle_right[1] = k * \
                            previous.handle_right[0] + b
                    if previous.interpolation == 'LINEAR' and \
                        keyframe_point.interpolation == 'BEZIER':
                        keyframe_point.handle_right[1] = next.co[1]

                previous = keyframe_point
                index = index + 1

def has_baked_suffix(action):
    if action.name.find(BAKED_SUFFIX) > -1:
        return True
    else:
        return False

class B4W_Constraints_Muter(bpy.types.Operator):
    '''Mute bone constraints for selected armature object'''

    bl_idname = "b4w.constraints_mute"
    bl_label = "B4W Constraints Mute"
   
    def execute(self, context):
        armobj = context.active_object
        if not (armobj and armobj.type == "ARMATURE"):
            self.report({'INFO'}, "Not an armature object")
            return {'CANCELLED'}

        for bone in armobj.pose.bones: 
            for c in bone.constraints: 
                c.mute = True

        return {"FINISHED"}

class B4W_Constraints_UnMuter(bpy.types.Operator):
    '''Unmute bone constraints for selected armature object'''

    bl_idname = "b4w.constraints_unmute"
    bl_label = "B4W Constraints UnMute"
   
    def execute(self, context):
        armobj = context.active_object
        if not (armobj and armobj.type == "ARMATURE"):
            self.report({'INFO'}, "Not an armature object")
            return {'CANCELLED'}

        for bone in armobj.pose.bones: 
            for c in bone.constraints: 
                c.mute = False

        return {"FINISHED"}

class B4W_AnimBakerPanel(bpy.types.Panel):
    bl_label = "B4W Anim Baker"
    bl_idname = "OBJECT_PT_anim_baker"
    bl_space_type = "VIEW_3D"
    bl_region_type = "TOOLS"
    bl_category = "Blend4Web"

    def draw(self, context):
        obj = context.active_object

        if not (obj and obj.type == "ARMATURE"):
            return

        layout = self.layout

        row = layout.row()
        row.prop(obj, "b4w_anim_clean_keys", text="Clean keyframes")

        row = layout.row()
        row.template_list("UI_UL_list", "OBJECT_UL_anim_baker",
                obj, "b4w_anim", obj, "b4w_anim_index", rows=3)
        col = row.column(align=True)
        col.operator("b4w.anim_add", icon='ZOOMIN', text="")
        col.operator("b4w.anim_remove", icon='ZOOMOUT', text="")

        anim = obj.b4w_anim
        if anim:
            anim_index = obj.b4w_anim_index

            same_actions_count = 0
            for action in bpy.data.actions:
                if action.name == anim[anim_index].name:
                    same_actions_count+=1

            for i in range(0, anim_index):
                if anim[i].name == anim[anim_index].name:
                    same_actions_count+=1

            if same_actions_count == 1:
                icon = "ACTION"
            else:
                icon = "ERROR"

            row = layout.row()
            row.prop(anim[anim_index], "name", text="Name", icon=icon)

        row = layout.row()
        row.operator("b4w.animation_bake", text="Bake", icon="REC")

        row = layout.row(align=True)
        row.operator("b4w.constraints_mute", text="Cons Mute")
        row.operator("b4w.constraints_unmute", text="Cons Unmute")

class B4W_Anim(bpy.types.PropertyGroup):
    # property name is already here
    pass

class B4W_AnimAddOperator(bpy.types.Operator):
    bl_idname      = 'b4w.anim_add'
    bl_label       = "Add animation"
    bl_description = "Add animation"

    def invoke(self, context, event):
        obj = context.active_object

        anim = obj.b4w_anim

        anim.add()
        anim[-1].name= "Action"

        return {'FINISHED'}
 
 
class B4W_AnimRemOperator(bpy.types.Operator):
    bl_idname      = 'b4w.anim_remove'
    bl_label       = "Remove animation"
    bl_description = "Remove animation"

    def invoke(self, context, event):
        obj = context.active_object
       
        anim = obj.b4w_anim
       
        if obj.b4w_anim_index >= 0:
           anim.remove(obj.b4w_anim_index)
           obj.b4w_anim_index -= 1

        return {'FINISHED'}

def register():
    bpy.utils.register_class(B4W_Anim_Baker)
    bpy.utils.register_class(B4W_Constraints_Muter)
    bpy.utils.register_class(B4W_Constraints_UnMuter)
    bpy.utils.register_class(B4W_AnimBakerPanel)
    bpy.utils.register_class(B4W_AnimAddOperator)
    bpy.utils.register_class(B4W_AnimRemOperator)

    bpy.utils.register_class(B4W_Anim)

    bpy.types.Object.b4w_anim =\
            bpy.props.CollectionProperty(type=B4W_Anim, name="B4W: animation")
    bpy.types.Object.b4w_anim_index =\
            bpy.props.IntProperty(name="B4W: animation index")

def unregister():
    bpy.utils.unregister_class(B4W_Anim_Baker)
    bpy.utils.unregister_class(B4W_Constraints_Muter)
    bpy.utils.unregister_class(B4W_Constraints_UnMuter)
    bpy.utils.unregister_class(B4W_AnimBakerPanel)
    bpy.utils.unregister_class(B4W_AnimAddOperator)
    bpy.utils.unregister_class(B4W_AnimRemOperator)

    bpy.utils.unregister_class(B4W_Anim)

