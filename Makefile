APIDOCDIR = deploy/api_doc
DOCSRCDIR = doc_src 
APPDIR = apps_dev
SCRIPTSDIR = scripts
TUTORIALS_DIR = deploy/tutorials
VERSION=test

.PHONY: all
all: build

.PHONY: build
build: convert_resources compile reexport doc_clean doc doc_pdf api_doc

.PHONY: compile
compile: compile_shaders compile_b4w compile_apps build_tutorials

.PHONY: compile_shaders
compile_shaders:
	@echo "Compiling b4w shaders"
	@nodejs tools/glsl/compiler/compile_shader_texts.js

.PHONY: verify_shaders
verify_shaders:
	@echo "Verifying b4w shaders"
	@nodejs tools/glsl/compiler/compile_shader_texts.js --dry-run

.PHONY: compile_b4w
compile_b4w:
	@echo "Compiling b4w javascript"
	@$(SH) ./scripts/compile_b4w.py -g
	@$(SH) ./scripts/compile_b4w.py -a -g

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
	jsdoc --destination $(APIDOCDIR) src/ext src/addons doc_src/api_doc/API_REF.md

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
	@$(SH) ./$(SCRIPTSDIR)/reexporter.py json_only

.PHONY: reexport_html
reexport_html:
	@$(SH) ./$(SCRIPTSDIR)/reexporter.py html_only

.PHONY: report_broken_exports
report_broken_exports:
	@$(SH) ./$(SCRIPTSDIR)/reexporter.py report_only

.PHONY: dist
dist:
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -i -v $(VERSION) $(SCRIPTSDIR)/blend4web.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_free.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_pro.lst

.PHONY: dist_force
dist_force:
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -i -v $(VERSION) $(SCRIPTSDIR)/blend4web.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_free.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_sdk_pro.lst

# vim: set noet ts=4 sw=4:
