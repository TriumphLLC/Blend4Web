import sphinx
from docutils import nodes

def setup(app):
    app.add_role('b4wmod', autolink('https://www.blend4web.com/api_doc/%s.html'))
    app.add_role('b4wref',
            autolink('https://www.blend4web.com/api_doc/%s.html#%s'))
    return {'version': sphinx.__display_version__, 'parallel_read_safe': True}

'''
 Autolink usage:
 :b4wmod:`Link text MODULE_NAME`
 :b4wref:`Link text MODULE_NAME.FUNCTION`
 :b4wref:`Link text MODULE_NAME.~TYPE_DEFINITION`
'''
def autolink(pattern):
    def role(name, rawtext, text, lineno, inliner, options={}, content=[]):

        parts = text.split(" ")
        
        text_parts = parts[len(parts) - 1].split(".")
        url_parts = text_parts[:]

        # global b4w module has different pattern
        if url_parts[0] != "b4w":
            url_parts[0] = "module-" + url_parts[0]

        # callbacks have different pattern
        if len(url_parts) == 2:
            if not url_parts[1].startswith("~"):
                url_parts[1] = "." + url_parts[1]

        # remove "~" from the link text
        if len(text_parts) == 2:
            if text_parts[1].startswith("~"):
                text_parts[1] = text_parts[1][1:]

        url = (pattern % tuple(url_parts)).strip("()")
        modtext = text_parts[len(text_parts) - 1] if len(parts) == 1 else " ".join(parts[:-1]) 

        node = nodes.reference(rawtext, modtext, refuri=url, **options)
        return [node], []
    return role
