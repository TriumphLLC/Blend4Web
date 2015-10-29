#!/usr/bin/env python3

from http.server import HTTPServer, SimpleHTTPRequestHandler
import subprocess
import os

ROOT_REL = "../"
CGC_PATH = "cgc"
TMP_GLSL_FILE = "/tmp/tmp_b4w_shader_analyzer.glsl"
TMP_OUT = "/tmp/tmp_b4w_shader_analyzer.out.txt"
PORT = 6683

class http_handler(SimpleHTTPRequestHandler):

    def do_POST(self):

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        length = int(self.headers['content-length'])
        data = self.rfile.read(length)

        if self.path == "/nvidia_vert":
            resp = process_shader_nvidia(True, data)
        elif self.path == "/nvidia_frag":
            resp = process_shader_nvidia(False, data)

        self.wfile.write(resp)


def process_shader_nvidia(is_vert, data):
    """Process by nvidia cg toolkit"""

    f = open(TMP_GLSL_FILE, "wb")
    f.write(data)
    f.close()

    if is_vert:
        profile = "gp4vp"   # NV_gpu_program4 and NV_vertex_program4
        #profile = "vp40"    # NV_vertex_program3
        #profile = "vp30"    # NV_vertex_program2
        #profile = "arbvp1"  # ARB_vertex_program
    else:
        profile = "gp4fp"   # NV_gpu_program4 and NV_fragment_program4
        #profile = "fp40"    # NV_fragment_program2
        #profile = "arbfp1"  # ARB_fragment_program

    ret = subprocess.check_output([CGC_PATH, "-oglsl", "-profile", profile,
            TMP_GLSL_FILE, "-o", TMP_OUT])

    f = open(TMP_OUT, "rb")
    data = f.read()
    f.close()

    return data

def run():
    
    root = os.path.dirname(os.path.realpath(__file__))
    root = os.path.normpath(os.path.join(root, ROOT_REL))
    os.chdir(root)

    print("Listening localhost:" + str(PORT))

    httpd = HTTPServer(('', PORT), http_handler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

    httpd.server_close()


if __name__ == '__main__':
    run()


