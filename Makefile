APIDOCDIR = deploy/api_doc
DOCSRCDIR = doc_src 
APPDIR = apps_dev
APIDOCRESDIR = doc_src/api_doc/jsdoc_resources
PROJDIR = projects
SCRIPTSDIR = scripts

PROJECTS_APPS_DEV = \
	AR \
	capri \
	code_snippets \
	dairy_plant \
	dairy_plant_vr \
	debugger \
	farm \
	fashion \
	flight \
	new_year \
	petigors_tale \
	space_disaster \
	victory_day_2015 \
	viewer \
	webplayer \
	website \
	tutorials/cartoon_interior \
	tutorials/firstperson \
	tutorials/making_a_game_p1-3 \
	tutorials/making_a_game_p4 \
	tutorials/making_a_game_p5-6 \
	tutorials/making_a_game_p7-12 \
	tutorials/web_page_integration \

PROJECTS = \
	simple_app \

DISTFILESDIR = distfiles
DISTS_SDK = dist_ce dist_pro dist_ce_lite dist_pro_lite
DISTS_SDK_FORCE = dist_force_ce dist_force_pro dist_force_ce_lite dist_force_pro_lite

# exec "VERPREFIX=_new_prefix make -e" to override
VERPREFIX=
VERSION=`sed -e 's/ *[^ ]\+ *//' -e 's/ \+.*/'$(VERPREFIX)'/' VERSION`

.PHONY: all
all: build

.PHONY: build
build: convert_resources compile reexport doc_clean doc


.PHONY: compile
compile: compile_shaders compile_b4w build_projects

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
	@$(SH) ./scripts/compile_b4w.py -o whitespace -b -w
	@$(SH) ./scripts/compile_b4w.py -o simple -b -w
	@$(SH) ./scripts/compile_b4w.py -o advanced -b -w


.PHONY: build_projects $(PROJECTS_APPS_DEV) $(PROJECTS)

build_projects: $(PROJECTS_APPS_DEV) $(PROJECTS)

$(PROJECTS_APPS_DEV):
	-@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/$@ build -v $(VERSION) -w

$(PROJECTS):
	-@$(SH) ./$(APPDIR)/project.py -p $(PROJDIR)/$@ build -v $(VERSION) -w


.PHONY: convert_resources
convert_resources:
	@echo "Converting resources"
	@$(SH) ./$(SCRIPTSDIR)/converter.py resize_textures
	@$(SH) ./$(SCRIPTSDIR)/converter.py convert_dds
	@$(SH) ./$(SCRIPTSDIR)/converter.py convert_pvr
	@$(SH) ./$(SCRIPTSDIR)/converter.py convert_media

.PHONY: doc
doc: doc_html doc_pdf api_doc

.PHONY: doc_html
doc_html:
	-$(MAKE) -C $(DOCSRCDIR)

.PHONY: doc_pdf
doc_pdf:
	-$(MAKE) -C $(DOCSRCDIR) latexpdf

.PHONY: doc_clean
doc_clean:
	-$(MAKE) -C $(DOCSRCDIR) clean

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


.PHONY: dist dist_addon $(DISTS_SDK) dist_force dist_force_addon $(DISTS_SDK_FORCE)

dist: dist_addon $(DISTS_SDK)

dist_addon:
	@echo "Creating blend4web $(subst dist_,,$@) $(VERSION) distribution"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -r blend4web -v $(VERSION) $(DISTFILESDIR)/blend4web_addon.lst

$(DISTS_SDK):
	@echo "Creating blend4web $(subst dist_,,$@) $(VERSION) distribution"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(DISTFILESDIR)/$(subst dist,blend4web,$@).lst

dist_force: dist_force_addon $(DISTS_SDK_FORCE)

dist_force_addon:
	@echo "Creating blend4web $(subst dist_force_,,$@) $(VERSION) distribution (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -r blend4web -v $(VERSION) $(DISTFILESDIR)/blend4web_addon.lst

$(DISTS_SDK_FORCE):
	@echo "Creating blend4web $(subst dist_force_,,$@) $(VERSION) distribution (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(DISTFILESDIR)/$(subst dist_force,blend4web,$@).lst

resave:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -jh resave

deploy_website:
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/website deploy

# vim: set noet ts=4 sw=4:
