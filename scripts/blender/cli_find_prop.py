import bpy, sys
import os

@bpy.app.handlers.persistent
def find(a):
    for o in bpy.data.objects:
        if "b4w_correct_bounding_offset" in o and \
            o.b4w_correct_bounding_offset != "AUTO":
            print("B4W_TRAVERSE_TAG: %s, %s" % (o.name, o.b4w_correct_bounding_offset))

bpy.app.handlers.load_post.append(find)