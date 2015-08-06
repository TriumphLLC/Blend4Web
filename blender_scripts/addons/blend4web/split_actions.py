### bpy.ops.webgl.reload(); bpy.ops.object.weights_copy()

# NOTE requires rigify addon enabled

import bpy

def run():

		import bpy
		import os
		import json
		import operator

		jsonPath = bpy.data.filepath.replace(".blend",".json")
		jsonFile = open(jsonPath)

		dictJson = json.load(jsonFile)
		dictCycles = dictJson["anim_modes"]


		dictCyclesSorted = sorted(dictCycles.items(),key=lambda x: x[1]["frame_start"])


		for cycle, value in dictCyclesSorted:

		    startFrame = value["frame_start"]
		    endFrame = value["frame_end"]
		    timeMult = value["time_mult"]

		    myAction = bpy.data.actions.new(cycle)
		    myAction.use_fake_user = True

		    for aGroup in bpy.data.actions["ArmatureAction"].groups:

		        newGroup = myAction.groups.new(aGroup.name)

		    for mainFcurve in bpy.data.actions["ArmatureAction"].fcurves:

		        aGroup_name = mainFcurve.group.name
		        aPath_name = mainFcurve.data_path
		        aIndex = mainFcurve.array_index

		        myCurve = myAction.fcurves.new(aPath_name, aIndex)
		        myCurve.group = myAction.groups[aGroup_name]

		        for i in range(endFrame - startFrame + 1):

		            aFrame = startFrame + i

		#            print (startFrame, endFrame, aFrame, len(mainFcurve.keyframe_points))

		            if aFrame < len(mainFcurve.keyframe_points):

		                print (startFrame, endFrame, aFrame,  mainFcurve.keyframe_points[aFrame].co[1])

		                myCurve.keyframe_points.insert(i, mainFcurve.keyframe_points[aFrame].co[1])

#		    myAction.use_fake_user

		bpy.data.actions["ArmatureAction"].user_clear()
		bpy.data.actions.remove(bpy.data.actions["ArmatureAction"])



class WebGL_Split_Actions(bpy.types.Operator):
    '''WebGL Split Actions'''
    bl_idname = "object.split_actions"
    bl_label = "WebGL Split Actions"

    def execute(self, context):
        run()
        return {"FINISHED"}

def register():
    bpy.utils.register_class(WebGL_Split_Actions)

def unregister():
    bpy.utils.unregister_class(WebGL_Split_Actions)


