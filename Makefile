APIDOCDIR = deploy/api_doc
DOCSRCDIR = doc_src 
APPDIR = apps_dev
APIDOCRESDIR = doc_src/api_doc/jsdoc_resources
SCRIPTSDIR = scripts
TUTORIALS_DIR = deploy/tutorials
#VERSION=`sed -e 's/ *[^ ]\+ *//' -e 's/ \+.*/_pre/' VERSION`
VERSION=`sed -e 's/ *[^ ]\+ *//' -e 's/ \+.*/_rc/' VERSION`

.PHONY: all
all: build

.PHONY: build
build: convert_resources compile reexport doc_clean doc doc_pdf api_doc

.PHONY: compile
compile: compile_shaders compile_b4w compile_apps build_tutorials

.PHONY: compile_shaders
compile_shaders:
	@echo "Compiling b4w shaders"
	@`which node || which nodejs` tools/glsl/compiler/compile_shader_texts.js --opt_decl --obf --rem_braces

.PHONY: verify_shaders
verify_shaders:
	@echo "Verifying b4w shaders"
	@`which node || which nodejs` tools/glsl/compiler/compile_shader_texts.js --dry --opt_decl --obf --rem_braces

.PHONY: compile_b4w
compile_b4w:
	@echo "Compiling b4w javascript"
	@$(SH) ./scripts/compile_b4w.py -g -o advanced
	@$(SH) ./scripts/compile_b4w.py -a -g -o advanced

.PHONY: compile_apps
compile_apps:
	$(MAKE) -B -C $(APPDIR)

.PHONY: build_tutorials
build_tutorials:
	$(MAKE) -C $(TUTORIALS_DIR)

.PHONY: convert_resources
convert_resources:
	@echo "Converting resources"
	@$(SH) ./$(SCRIPTSDIR)/converter.py resize_textures
	@$(SH) ./$(SCRIPTSDIR)/converter.py convert_dds
	@$(SH) ./$(SCRIPTSDIR)/converter.py convert_media

.PHONY: doc
doc:
	$(MAKE) -C $(DOCSRCDIR)

.PHONY: doc_pdf
doc_pdf:
	$(MAKE) -C $(DOCSRCDIR) latexpdf

.PHONY: doc_clean
doc_clean:
	$(MAKE) -C $(DOCSRCDIR) clean

.PHONY: api_doc
api_doc:
	jsdoc --destination $(APIDOCDIR) src/b4w.js src/ext src/addons src/libs/gl-matrix2.js doc_src/api_doc/API_REF.md -c $(APIDOCRESDIR)/conf.json -t $(APIDOCRESDIR)/b4w_default

.PHONY: api_doc_pdf
api_doc_pdf:
	htmldoc --webpage -f $(APIDOCDIR)/api_doc.pdf $(APIDOCDIR)/module-*

.PHONY: api_doc_clean
api_doc_clean:
	-$(RM) -r $(APIDOCDIR)/*

.PHONY: reexport
reexport: reexport_json reexport_html

.PHONY: reexport_json
reexport_json:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -j reexport

.PHONY: reexport_html
reexport_html:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -h reexport

.PHONY: report_broken_exports
report_broken_exports:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -jh report

.PHONY: dist
dist:
	@echo "Creating $(VERSION) family of distributions"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_free.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_pro.lst

.PHONY: dist_force
dist_force:
	@echo "Creating $(VERSION) family of distributions (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_free.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_pro.lst

dist_addon_force:
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web.lst

resave:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -jh resave

asan:
	@$(SH) ./$(SCRIPTSDIR)/asan.py

# vim: set noet ts=4 sw=4:
