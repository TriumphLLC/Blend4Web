import base64
import json
import os
import shutil
from string import Template
#import uuid

import bpy

import blend4web
import blend4web.exporter as exporter

class B4W_HTMLExportProcessor(bpy.types.Operator):
    
    """Export for Blend4Web (.html)"""
    bl_idname = "b4w.html_export"
    bl_label = "B4W HTMLExport"

    filepath = bpy.props.StringProperty(subtype='FILE_PATH', default = "")
    
    do_autosave = bpy.props.BoolProperty(
        name = "Autosave main file",
        description = "Proper linking between exported files requires saving file after exporting",
        default = True
    )

    override_filepath = bpy.props.StringProperty(
        name = "Filepath",
        description = "Required for running in command line", 
        default = ""    
    )

    save_export_path = bpy.props.BoolProperty(
        name = "Save export path",
        description = "Save export path in blend file",
        default = True
    )

    @classmethod
    def poll(cls, context):
        path = cls.get_b4w_src_path()
        if path is not None:
            tpl_path = os.path.join(path, "embed.html")
            js_path = os.path.join(path, "embed.min.js")
            if os.path.isfile(tpl_path) and os.path.isfile(js_path):
                return True
        return False

    def invoke(self, context, event):
        self.filepath = get_default_path()
        wm = context.window_manager
        wm.fileselect_add(self)

        return {"RUNNING_MODAL"}

    def execute(self, context):
        if self.override_filepath:
            self.filepath = self.override_filepath
    
        # append .html if needed
        filepath_val = self.filepath
        if not filepath_val.lower().endswith(".html"): 
            filepath_val += ".html"

        try:
            self.run(filepath_val)
        except exporter.ExportError as error:
            exporter._export_error = error
            bpy.ops.b4w.export_error_dialog('INVOKE_DEFAULT')
        
        return {"FINISHED"}

    @classmethod
    def get_b4w_src_path(cls):
        addon_prefs = bpy.context.user_preferences.addons[__package__].preferences
        if not addon_prefs.is_property_set("b4w_src_path"):
            addon_prefs["b4w_src_path"] = ""
        
        path = addon_prefs["b4w_src_path"]
        if path == "":
            path = os.path.dirname(blend4web.__file__)
        return path

    def run(self, export_filepath):
        export_dir = os.path.split(export_filepath)[0]
        # HACK: crashes in blender 2.69 for win64 (python 3.3.0)
        #json_tmp_filename = str(uuid.uuid4()) + ".json"
        json_tmp_filename = "temporary_uuid_workaround_name.json"
        json_tmp_path = os.path.join(export_dir, json_tmp_filename)

        b4w_src_path = self.get_b4w_src_path()
        html_tpl_path = os.path.join(b4w_src_path, "embed.html")
        b4w_minjs_path = os.path.join(b4w_src_path, "embed.min.js")

        bpy.ops.b4w.export("EXEC_DEFAULT", filepath=json_tmp_path, \
                do_autosave=False, save_export_path=False, is_html_export=True)

        try:
            scripts = ""
            if os.path.isfile(b4w_minjs_path):
                with open(b4w_minjs_path, "r") as f:
                    scripts = f.read()
                    f.close()
            data = extract_data(json_tmp_path, json_tmp_filename)
            insertions = dict(scripts=scripts, built_in_data=data, \
                    json_path=json_tmp_filename)
            app_str = get_html_template(html_tpl_path).substitute(insertions)

            f  = open(export_filepath, "w")
        except IOError as exp:
            exporter._file_write_error = exp
            clean_exported_data()
            bpy.ops.b4w.file_write_error_dialog('INVOKE_DEFAULT')
        else:
            f.write(app_str)
            f.close()
            if self.save_export_path:
                set_default_path(export_filepath)
            print("HTML file saved to " + export_filepath)
            print("HTML EXPORT OK")

        if self.do_autosave:
            autosave()

        return "exported"

def get_default_path():
    scene = bpy.data.scenes[0]
    if scene.b4w_export_path_html is not "":
        return scene.b4w_export_path_html

    blend_path = os.path.splitext(bpy.data.filepath)[0]
    if len(blend_path) > 0:
        return blend_path + ".html"
    else:
        return "untitled.html"

def set_default_path(path):
    if bpy.data.filepath != "":
        path = bpy.path.relpath(path)    
    for i in range(len(bpy.data.scenes)):
        bpy.data.scenes[i].b4w_export_path_html = exporter.guard_slashes(path)

def get_html_template(path):
    tpl_file = open(path, "r")
    tpl_str = tpl_file.read()
    tpl_file.close()
    return Template(tpl_str)

def extract_data(json_path, json_filename):
    data = {
        "main_file": json_filename
    }
    # get json file
    if os.path.isfile(json_path):
        with open(json_path, "r") as f:
            data[json_filename] = f.read()
            f.close()
        os.remove(json_path)
        print("Removed temporary " + json_path)

    # get binaries and resources
    if json_filename in data:
        json_parsed = json.loads(data[json_filename])
        if "binaries" in json_parsed:
            for i in range(len(json_parsed["binaries"])):
                relpath = json_parsed["binaries"][i]["binfile"]
                if relpath is not None:
                    fullpath = os.path.normpath(os.path.join(\
                            os.path.dirname(json_path), relpath))
                    data[relpath] = get_encoded_binfile(fullpath)
                    os.remove(fullpath)
                    print("Removed temporary " + fullpath)

        if "images" in json_parsed:
            unpacked_img_paths = exporter.get_unpacked_img_paths()

            for i in range(len(json_parsed["images"])):
                img = json_parsed["images"][i]
                if img["source"] == "FILE":
                    fullpath = os.path.normpath(os.path.join(\
                            os.path.dirname(json_path), img["filepath"]))
                    data[img["filepath"]] = get_encoded_binfile(fullpath)

                    # remove odd unpacked image files, comparing absolute paths
                    if fullpath in unpacked_img_paths:
                        os.remove(fullpath)

        if "sounds" in json_parsed:
            for i in range(len(json_parsed["sounds"])):
                snd = json_parsed["sounds"][i]
                fullpath = os.path.normpath(os.path.join(\
                        os.path.dirname(json_path), snd["filepath"]))
                data[snd["filepath"]] = get_encoded_binfile(fullpath)
    return data

def get_encoded_binfile(path):
    f = open(path, "rb")
    result = str(base64.b64encode(f.read()))[2:-1]
    f.close()
    return result

def autosave():
    filepath = bpy.data.filepath
    if filepath:
        bpy.ops.wm.save_mainfile(filepath=filepath)
        print("File autosaved to " + filepath)
    else:
        print("Could not autosave: no file")

def b4w_html_export_menu_func(self, context):
    self.layout.operator(B4W_HTMLExportProcessor.bl_idname, \
        text="Blend4Web (.html)").filepath = get_default_path()

def register():
    bpy.utils.register_class(B4W_HTMLExportProcessor)
    bpy.types.INFO_MT_file_export.append(b4w_html_export_menu_func)

def unregister(): 
    bpy.utils.unregister_class(B4W_HTMLExportProcessor)
    bpy.types.INFO_MT_file_export.remove(b4w_html_export_menu_func)

def clean_exported_data():
    unpacked_img_paths = exporter.get_unpacked_img_paths()
    for path in unpacked_img_paths:
        os.remove(path)