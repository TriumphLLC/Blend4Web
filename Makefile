APIDOCDIR = deploy/api_doc
DOCSRCDIR = doc_src 
APPDIR = apps_dev
APIDOCRESDIR = doc_src/api_doc/jsdoc_resources
SCRIPTSDIR = scripts
TUTORIALS_DIR = deploy/tutorials

# exec "VERPREFIX=_new_prefix make -e" to override
VERPREFIX=_pre
VERSION=`sed -e 's/ *[^ ]\+ *//' -e 's/ \+.*/'$(VERPREFIX)'/' VERSION`

.PHONY: all
all: build

.PHONY: build
build: convert_resources compile reexport doc_clean doc doc_pdf api_doc

.PHONY: compile
compile: compile_shaders compile_b4w compile_apps build_tutorials

.PHONY: compile_shaders
compile_shaders:
	@echo "Compiling b4w shaders"
	@`which node || which nodejs` tools/glsl/compiler/compile_shader_texts.js --obf --rem_braces

.PHONY: verify_shaders
verify_shaders:
	@echo "Verifying b4w shaders"
	@`which node || which nodejs` tools/glsl/compiler/compile_shader_texts.js --dry --obf --rem_braces

.PHONY: compile_b4w
compile_b4w:
	@echo "Compiling b4w javascript"
	@$(SH) ./scripts/compile_b4w.py -o whitespace
	@$(SH) ./scripts/compile_b4w.py -o simple
	@$(SH) ./scripts/compile_b4w.py -o advanced

.PHONY: compile_apps
compile_apps:
	@echo "Compiling applications"
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/capri compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/code_snippets compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/dairy_plant compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/dairy_plant_vr compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/debugger compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/fashion compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/firstperson compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/flight compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/new_year compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/petigors_tale compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/space_disaster compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/victory_day_2015 compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/viewer compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/webplayer compile -v $(VERSION)
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/website compile -v $(VERSION)

.PHONY: build_tutorials
build_tutorials:
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/cartoon_interior/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/firstperson/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/interactive_web_application/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/making_a_game_p1-3/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/making_a_game_p4/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/making_a_game_p5-6/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/making_a_game_p7-12/ compile -t update
	@$(SH) ./$(APPDIR)/project.py -p $(TUTORIALS_DIR)/examples/web_page_integration/ compile -t update

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
reexport: reexport_json reexport_conv_html

.PHONY: reexport_json
reexport_json:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -j reexport

.PHONY: reexport_html
reexport_html:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -h reexport

.PHONY: reexport_conv_html
reexport_conv_html:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -h reexport_conv_media
	

.PHONY: report_broken_exports
report_broken_exports:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -jh report

.PHONY: dist
dist:
	@echo "Creating $(VERSION) family of distributions"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -r blend4web -v $(VERSION) $(SCRIPTSDIR)/blend4web_addon.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_ce.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_pro.lst

.PHONY: dist_force
dist_force:
	@echo "Creating $(VERSION) family of distributions (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -r blend4web -v $(VERSION) $(SCRIPTSDIR)/blend4web_addon.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_ce.lst
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_pro.lst

.PHONY: dist_pro
dist_pro:
	@echo "Creating $(VERSION) family of PRO distribution"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(SCRIPTSDIR)/blend4web_pro.lst

.PHONY: dist_pro_force
dist_pro_force:
	@echo "Creating $(VERSION) family of PRO distribution (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(SCRIPTSDIR)/blend4web_pro.lst

resave:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -jh resave

asan:
	@$(SH) ./$(SCRIPTSDIR)/asan.py

deploy_website:
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/website deploy

# vim: set noet ts=4 sw=4:
