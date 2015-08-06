#!/usr/bin/python3

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os, base64

ROOT_REL = "../"
TMP_SCREENSHOT_FILE = "screenshot.png"

class http_handler(SimpleHTTPRequestHandler):

    def do_POST(self):

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        length = int(self.headers['content-length'])
        data = self.rfile.read(length)

        if self.path == "/screenshot":
            resp = store_screenshot(True, data)

        self.wfile.write(resp)


def store_screenshot(is_vert, data):
    print("Writing screenshot")

    img = base64.b64decode(data.replace(b"data:image/png;base64,", b""))

    f = open(TMP_SCREENSHOT_FILE, "wb")
    f.write(img)
    f.close()

    return b"OK"

def run():
    root = os.path.dirname(os.path.realpath(__file__))
    root = os.path.normpath(os.path.join(root, ROOT_REL))
    os.chdir(root)

    httpd = HTTPServer(('', 8000), http_handler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

    httpd.server_close()


if __name__ == '__main__':
    run()


