import base64
import json
import os
import shutil
from string import Template

import bpy

import blend4web
import blend4web.exporter as exporter

PATH_TO_WEBPLAYER = "deploy/apps/webplayer/"

class B4W_HTMLExportProcessor(bpy.types.Operator):

    """Export for Blend4Web (.html)"""
    bl_idname = "export_scene.b4w_html"
    bl_label = "B4W Export HTML"

    filepath = bpy.props.StringProperty(subtype='FILE_PATH', default = "")

    do_autosave = bpy.props.BoolProperty(
        name = "Autosave blend File",
        description = "Proper linking between exported files requires saving file after exporting",
        default = True
    )

    strict_mode = bpy.props.BoolProperty(
        name = "Strict Mode",
        description = "This option blocks export with errors and warnings",
        default = False
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

    export_converted_media = bpy.props.BoolProperty(
        name = "Export Converted Media",
        description = "Save converted media in html file",
        default = False
    )

    @classmethod
    def poll(cls, context):
        path = cls.get_b4w_webplayer_path()
        if path is not None:
            tpl_path = os.path.join(path, "template", "webplayer_template.html")
            # for standalone addon template located in the same dir
            if not os.path.isfile(tpl_path):
                tpl_path = os.path.join(path, "webplayer_template.html")

            js_path = os.path.join(path, "webplayer.min.js")
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
        except exporter.FileError as error:
            exporter._file_error = error
            bpy.ops.b4w.file_error_dialog('INVOKE_DEFAULT')

        return {"FINISHED"}

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "do_autosave")
        layout.prop(self, "strict_mode")
        layout.prop(self, "export_converted_media")

    @classmethod
    def get_b4w_webplayer_path(cls):
        addon_prefs = bpy.context.user_preferences.addons[__package__].preferences
        if not addon_prefs.is_property_set("b4w_src_path"):
            addon_prefs.b4w_src_path = ""

        path = addon_prefs.b4w_src_path
        if path == "":
            path = os.path.dirname(blend4web.__file__)
        else:
            path = os.path.join(path, PATH_TO_WEBPLAYER)
        return path

    def run(self, export_filepath):
        export_dir = os.path.split(export_filepath)[0]

        # NOTE: fictional json filename, won't be exported,
        # json data will be inserted into html
        json_name = "main.json"
        json_path = os.path.join(export_dir, json_name)

        b4w_webplayer_path = self.get_b4w_webplayer_path()
        html_tpl_path = os.path.join(b4w_webplayer_path, "template", "webplayer_template.html")
        # for standalone addon template located in the same dir
        if not os.path.isfile(html_tpl_path):
            html_tpl_path = os.path.join(b4w_webplayer_path, "webplayer_template.html")
        b4w_minjs_path = os.path.join(b4w_webplayer_path, "webplayer.min.js")
        b4w_css_path = os.path.join(b4w_webplayer_path, "webplayer.min.css")

        
        if "CANCELLED" in bpy.ops.export_scene.b4w_json("EXEC_DEFAULT", \
                filepath=json_path, do_autosave=False, save_export_path=False, \
                is_html_export=True, strict_mode=False):
            return
        if (not self.strict_mode or not exporter._b4w_export_errors 
                    and not exporter._b4w_export_warnings):
            try:
                scripts = ""
                if os.path.isfile(b4w_minjs_path):
                    with open(b4w_minjs_path, "r") as f:
                        scripts = f.read()
                        f.close()
                styles = ""
                if os.path.isfile(b4w_css_path):
                    with open(b4w_css_path, "r") as f:
                        styles = f.read()
                        f.close()
                data = json.dumps(extract_data(json_path, json_name, self.export_converted_media))

                insertions = dict(scripts=scripts, built_in_data=data,
                                  styles=styles,
                                  b4w_meta=("<meta name='b4w_export_path_html' content='"
                                            + get_filepath_blend(self.filepath) +"'/>"))
                app_str = get_html_template(html_tpl_path).substitute(insertions)

                f  = open(export_filepath, "w")
            except IOError as exp:
                exporter._file_error = exp
                raise exporter.FileError("Permission denied")
            else:
                f.write(app_str)
                f.close()
                if self.save_export_path:
                    set_default_path(export_filepath)
                print("HTML file saved to " + export_filepath)
                print("HTML EXPORT OK")
        else:
            bpy.ops.b4w.export_messages_dialog('INVOKE_DEFAULT')
        if self.do_autosave:
            autosave()

        return "exported"

class B4W_ExportHTMLPathGetter(bpy.types.Operator):
    """Get Export Path for blend file"""
    bl_idname = "b4w.get_export_html_path"
    bl_label = "B4W Get Export HTML Path"
    bl_options = {'INTERNAL'}

    def execute(self, context):
        print("B4W Export HTML Path = " + get_default_path())

        return {"FINISHED"}

def get_default_path():
    scene = bpy.data.scenes[0]
    if scene.b4w_export_path_html is not "":
        return bpy.path.abspath(scene.b4w_export_path_html)

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

def extract_data(json_path, json_filename, export_converted_media):
    data = {
        "main_file": json_filename
    }

    # get json file
    data[json_filename] = exporter.get_main_json_data()

    # get binaries
    json_parsed = json.loads(data[json_filename])
    if "binaries" in json_parsed:
        relpath = json_parsed["binaries"][0]["binfile"]
        if relpath is not None:
            data[relpath] = encode_binary_sequence(exporter.get_binaries_data())

    # get resources
    if "images" in json_parsed:
        for i in range(len(json_parsed["images"])):
            img = json_parsed["images"][i]
            file_path = img["filepath"]
            if img["source"] == "FILE" or img["source"] == "MOVIE":
                data[file_path] = get_encoded_resource_data(file_path,
                        json_path)
            if img["source"] == "MOVIE" and export_converted_media:
                ext = os.path.splitext(file_path)[1]
                file_name = os.path.splitext(file_path)[0]
                conv_file_path = None
                if ext == ".ogv" or ext == ".m4v":
                    conv_file_path = file_name + ".altconv.webm"
                elif ext == ".webm":
                    conv_file_path = file_name + ".altconv.m4v"
                if conv_file_path:
                    data[conv_file_path] = get_encoded_resource_data(conv_file_path,
                    json_path)
                data[file_name + ".altconv.seq"] = get_encoded_resource_data(file_name + ".altconv.seq",
                    json_path)

    if "sounds" in json_parsed:
        for i in range(len(json_parsed["sounds"])):
            snd = json_parsed["sounds"][i]
            file_path = snd["filepath"]
            data[file_path] = get_encoded_resource_data(snd["filepath"],
                    json_path)
            if export_converted_media:
                ext = os.path.splitext(file_path)[1]
                file_name = os.path.splitext(file_path)[0]
                conv_file_path = None
                if ext == ".mp3" or ext == ".mp4":
                    conv_file_path = file_name + ".altconv.ogg"
                elif ext == ".ogg":
                    conv_file_path = file_name + ".altconv.mp4"
                if conv_file_path:
                    data[conv_file_path] = get_encoded_resource_data(conv_file_path,
                    json_path)

    get_smaa_textures(data, json_path);

    return data

def get_smaa_textures(data, json_path):
    b4w_webplayer_path = B4W_HTMLExportProcessor.get_b4w_webplayer_path()
    smaa_area_tex_path = os.path.join(b4w_webplayer_path, "smaa_area_texture.png")
    smaa_search_tex_path = os.path.join(b4w_webplayer_path, "smaa_search_texture.png")

    data["smaa_area_texture.png"] = \
            get_encoded_resource_data(smaa_area_tex_path, json_path)
    data["smaa_search_texture.png"] = \
            get_encoded_resource_data(smaa_search_tex_path, json_path)

def get_encoded_resource_data(path, json_path):
    bindata = None
    packed_data = exporter.get_packed_data()

    if path in packed_data:
        bindata = packed_data[path]
    else:
        # absolute path according to json fictional file path
        fullpath = os.path.normpath(os.path.join(\
                os.path.dirname(json_path), path))
        if os.path.isfile(fullpath):
            f = open(fullpath, "rb")
            bindata = f.read()
            f.close()

    if bindata is not None:
        bindata = encode_binary_sequence(bindata)
    return bindata

def encode_binary_sequence(bin_seq):
    return str(base64.b64encode(bin_seq))[2:-1]

def get_filepath_blend(export_filepath):
    """return path to blend relative to json"""
    blend_abs = bpy.data.filepath
    if blend_abs:
        html_abs = export_filepath
        blend_rel = os.path.relpath(blend_abs, os.path.dirname(html_abs))
        return guard_slashes(os.path.normpath(blend_rel))
    else:
        return ""

def guard_slashes(path):
    return path.replace('\\', '/')

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
    bpy.utils.register_class(B4W_ExportHTMLPathGetter)
    bpy.types.INFO_MT_file_export.append(b4w_html_export_menu_func)

def unregister():
    bpy.utils.unregister_class(B4W_HTMLExportProcessor)
    bpy.utils.unregister_class(B4W_ExportHTMLPathGetter)
    bpy.types.INFO_MT_file_export.remove(b4w_html_export_menu_func)
