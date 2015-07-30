from docutils import nodes

def setup(app):
    app.add_role('b4wmod', autolink('https://www.blend4web.com/api_doc/module-%s.html'))
    app.add_role('b4wref',
            autolink('https://www.blend4web.com/api_doc/module-%s.html#.%s'))

def autolink(pattern):
    def role(name, rawtext, text, lineno, inliner, options={}, content=[]):
        text_spl = text.split(".")
        url = (pattern % tuple(text_spl)).strip("()")
        modtext = text_spl[len(text_spl) - 1]
        node = nodes.reference(rawtext, modtext, refuri=url, **options)
        return [node], []
    return role
