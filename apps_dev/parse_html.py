import sys
import re
from html.parser import HTMLParser

class BodyPosition(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)

        self.start_body  = 0
        self.end_body    = 0

    def handle_starttag(self, tag, attr):
        if tag == "body":
            self.start_body = self.getpos()
    def handle_endtag(self, tag):
        if tag == "body":
            self.end_body = self.getpos()

def run():
    src_file  = open(sys.argv[1])
    dest_file = open(sys.argv[2])

    src_parser  = BodyPosition()
    dest_parser = BodyPosition()

    src_text  = src_file.read()
    dest_text = dest_file.read()

    src_parser.feed(src_text)
    dest_parser.feed(dest_text)

    src_file.seek(0)
    dest_file.seek(0)

    src_lines  = src_file.readlines()
    dest_lines = dest_file.readlines()

    dest_file.close()
    src_file.close()

    # end body tag position in source file
    end_src   = src_parser.end_body
    # end body tag position in destination file
    end_dest  = dest_parser.end_body
    # begin body tag position in source file
    start_src = src_parser.start_body

    # append text before the opening tag body
    src_lines[start_src[0] - 1] = src_lines[start_src[0] - 1][start_src[1]:]

    # append text after the closing tag body
    src_lines[end_src[0] - 1] = (src_lines[end_src[0] - 1][0: end_src[1]]
                                  + dest_lines[end_dest[0] - 1][end_dest[1]:])

    dest_file = open(sys.argv[2], "w")

    # write text before body
    dest_file.writelines(dest_lines[0: dest_parser.start_body[0] - 1])

    # write source body
    dest_file.writelines(src_lines[start_src[0] - 1: end_src[0]])

    # write text after body
    dest_file.writelines(dest_lines[end_dest[0]:])

    dest_file.close()

if __name__ == "__main__":
    run()
