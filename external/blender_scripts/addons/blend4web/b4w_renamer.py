import bpy

@bpy.app.handlers.persistent
def load_handler(dummy):
    bpy.ops.b4w.rename()

def register():
    bpy.app.handlers.load_post.append(load_handler)
