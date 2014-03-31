import hashlib
import os
import shutil
import time

import bpy

class Unpacker():
    '''Performs image unpacking during export'''

    def __init__(self, export_filepath=None, is_html_export=False):
        self.unpacked_img_paths = []
        self.unpacking_collis_folder = None
        self.export_filepath = export_filepath
        self.is_html_export = is_html_export

    def unpack_image(self, image):
        if len(self.unpacked_img_paths) == 0:
            self.prepare_unpacking()

        image_tmp = image.copy()
        image_tmp.unpack(method="WRITE_LOCAL")

        # get from path
        move_from = bpy.path.abspath(image_tmp.filepath)
        if not bpy.data.filepath:
            move_from = os.path.join(os.getcwd(), move_from)

        # get to path
        ext = os.path.splitext(image_tmp.filepath)[1]
        # use image.name instead of image_tmp.name
        unique_img_id = image.name + image_tmp.filepath
        if image_tmp.library:
            unique_img_id += image_tmp.library.filepath
        # fix overwriting collision for export/html export
        if self.is_html_export:
            unique_img_id += "%html_export%"
        unpack_name = hashlib.md5(unique_img_id.encode()).hexdigest() + ext
        if bpy.data.filepath and self.export_filepath is not None:
            export_dir = os.path.split(self.export_filepath)[0]
            move_to = os.path.join(export_dir, unpack_name)
        else:
            move_to = os.path.join(os.getcwd(), unpack_name)

        shutil.move(move_from, move_to)

        self.unpacked_img_paths.append(move_to)
        bpy.data.images.remove(image_tmp)

        return move_to

    def prepare_unpacking(self):
        dst_dir = self.get_curr_blfile_dir()

        # avoiding possible collision with "textures" directory while using 
        # "WRITE_LOCAL" unpacking by temporary renaming it
        collision_path = os.path.join(dst_dir, "textures")
        if os.path.exists(collision_path):
            new_name = hashlib.md5(str(time.time()).encode()).hexdigest()
            self.unpacking_collis_folder = os.path.join(dst_dir, new_name)
            shutil.move(collision_path, self.unpacking_collis_folder)

    def get_unpacked_img_paths(self):
        return self.unpacked_img_paths

    def get_curr_blfile_dir(self):
        if bpy.data.filepath:
            return os.path.split(bpy.path.abspath(bpy.data.filepath))[0]
        else:
            # for unsaved blend files
            return os.getcwd()

    def clean(self):
        if len(self.unpacked_img_paths):
            tex_path = os.path.join(self.get_curr_blfile_dir(), "textures")
            if os.path.exists(tex_path):
                os.rmdir(tex_path)
            if self.unpacking_collis_folder is not None:
                shutil.move(self.unpacking_collis_folder, tex_path)
