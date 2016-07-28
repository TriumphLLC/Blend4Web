import sphinx
from docutils import nodes

def setup(app):
    app.add_role('b4wmod', autolink('https://www.blend4web.com/api_doc/module-%s.html'))
    app.add_role('b4wref',
            autolink('https://www.blend4web.com/api_doc/module-%s.html#.%s'))
    return {'version': sphinx.__display_version__, 'parallel_read_safe': True}

'''
 Autolink usage:
 :b4wmod:`Link text MODULE_NAME`
 :b4wref:`Link text MODULE_NAME.FUNCTION_NAME`
'''
def autolink(pattern):
    def role(name, rawtext, text, lineno, inliner, options={}, content=[]):

        parts = text.split(" ")
        url_parts = parts[len(parts) - 1].split(".")
        url = (pattern % tuple(url_parts)).strip("()")
        modtext = url_parts[len(url_parts) - 1] if len(parts) == 1 else " ".join(parts[:-1]) 

        node = nodes.reference(rawtext, modtext, refuri=url, **options)
        return [node], []
    return role
