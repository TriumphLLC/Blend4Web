APIDOCDIR = deploy/api_doc
DOCSRCDIR = doc_src 
APPDIR = apps_dev
APIDOCRESDIR = doc_src/api_doc/jsdoc_resources
PROJDIR = projects
SCRIPTSDIR = scripts
ASSETPACKSDIR= deploy/pub/asset_packs

PROJECTS_APPS_DEV = \
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
	AR \
	simple_app \
	webplayer \

ASSET_PACKS = \
	pack_dairy_plant \
	pack_fashion \
	pack_farm \
	pack_petigors_tale \
	pack_firstperson \
	pack_AR \
	pack_azure_grotto \
	pack_cartoon_interior \
	pack_code_snippets \
	pack_coin_flip \
	pack_demos_animation \
	pack_demos_environment \
	pack_demos_interactivity \
	pack_demos_materials \
	pack_demos_media \
	pack_demos_misc \
	pack_demos_particles \
	pack_demos_physics \
	pack_demos_postprocessing \
	pack_flight \
	pack_fountain_elephants \
	pack_mi_34s1 \
	pack_naturemorte \
	pack_new_year \
	pack_simple_app \
	pack_solar_system \
	pack_space_disaster \
	pack_sports_car \
	pack_sunglasses \
	pack_tutorials \
	pack_victory_day_2015 \
	pack_watch_scene \
	pack_web_page_integration

DISTFILESDIR = distfiles
DISTS_SDK = dist_ce dist_pro dist_ce_lite dist_pro_lite
DISTS_SDK_FORCE = dist_force_ce dist_force_pro dist_force_ce_lite dist_force_pro_lite

# exec "VERPREFIX=_new_prefix make -e" to override
VERPREFIX=_pre
VERSION:=$(shell awk -F ' ' '/Blend4Web /{ gsub(/\./,"_",$$2); print $$2 }' VERSION)$(VERPREFIX)
ADDON_VERSION:=$(shell awk -F '[(,)]' '/"version":/{ printf "%d_%.2d_%d",$$2,$$3,$$4 }' addons/blend4web/__init__.py)$(VERPREFIX)

# check version
ifneq ("$(VERSION)", "$(ADDON_VERSION)")
$(error VERSION and ADDON_VERSION are not equal each other: "$(VERSION)" != "$(ADDON_VERSION)")
endif

.PHONY: all
all: build

.PHONY: build
build: convert_resources compile reexport doc_clean doc


.PHONY: compile
compile: compile_shaders compile_b4w compile_uranium build_projects

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
	@$(SH) ./scripts/node.sh ./node_modules/webpack/bin/webpack.js
	@$(SH) ./scripts/compile_b4w.py -o whitespace -b -w
	@$(SH) ./scripts/compile_b4w.py -o simple -b -w
	@$(SH) ./scripts/compile_b4w.py -o advanced -b -w

compile_uranium:
	@echo "Compiling Uranium physics engine"
	@$(SH) ./uranium/build.sh
	@$(SH) ./uranium/store.sh

gen_closure_externs:
	@echo "Generating closure-compiler externs"
	node scripts/app_builder/gen_closure_externs.js ./dist/misc/closure_externs/extern_b4w.js

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
	jsdoc --destination $(APIDOCDIR) src/util/b4w.js src/extern src/addons src/libs/gl-matrix2.js doc_src/api_doc/API_REF.md -c $(APIDOCRESDIR)/conf.json -t $(APIDOCRESDIR)/b4w_default

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

rm_updacked_node:
	@$(SH) rm -Rf ./tools/node/*/

dist: gen_closure_externs rm_updacked_node dist_addon $(DISTS_SDK) $(ASSET_PACKS)

define cp_addon_to_dist
@$(SH) rm -f ./$(SCRIPTSDIR)/../dist/addons/blend4web_addon*
@$(SH) cp ./$(SCRIPTSDIR)/../deploy/pub/blend4web_addon_$(VERSION).zip ./$(SCRIPTSDIR)/../dist/addons
endef

dist_addon:
	@echo "Creating blend4web $(subst dist_,,$@) $(VERSION) distribution"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -r blend4web -v $(VERSION) $(DISTFILESDIR)/blend4web_addon.lst
	$(call cp_addon_to_dist)

$(DISTS_SDK):
	@echo "Creating blend4web $(subst dist_,,$@) $(VERSION) distribution"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -v $(VERSION) $(DISTFILESDIR)/$(subst dist,blend4web,$@).lst

$(ASSET_PACKS):
	@echo "Creating $(subst pack_,,$@) asset pack"
	$(SH) ./$(APPDIR)/project.py export $(shell apps_dev/project.py  list | grep -w ^$(subst pack_,,$@) | awk '{split($$0,a," -> "); print a[2]}') $(ASSETPACKSDIR)/$(subst pack_,,$@)_$(VERSION).zip



dist_force: gen_closure_externs rm_updacked_node dist_force_addon $(DISTS_SDK_FORCE) $(ASSET_PACKS)

dist_force_addon:
	@echo "Creating blend4web $(subst dist_force_,,$@) $(VERSION) distribution (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -r blend4web -v $(VERSION) $(DISTFILESDIR)/blend4web_addon.lst
	$(call cp_addon_to_dist)

dist_asset_packs: $(ASSET_PACKS)

$(DISTS_SDK_FORCE):
	@echo "Creating blend4web $(subst dist_force_,,$@) $(VERSION) distribution (overwrite mode)"
	@$(SH) ./$(SCRIPTSDIR)/make_dist.py -f -v $(VERSION) $(DISTFILESDIR)/$(subst dist_force,blend4web,$@).lst

resave:
	@$(SH) ./$(SCRIPTSDIR)/process_blend.py -jh resave

deploy_website:
	@$(SH) ./$(APPDIR)/project.py -p $(APPDIR)/website deploy

# vim: set noet ts=4 sw=4:
