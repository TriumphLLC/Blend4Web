export ROOT_DIR      = ../../
export APPS_DEV      = $(ROOT_DIR)/apps_dev/
export APPS_EXT      = $(ROOT_DIR)/external/deploy/apps/

export JAR_CP        = $(ROOT_DIR)/closure-compiler/compiler.jar
export PARSER        = $(ROOT_DIR)/apps_dev/parse_html.py
export PY_PARSER     = python3 $(PARSER)

export STORAGE_JS    = $(ROOT_DIR)/src/addons/storage.js
export APP_JS        = $(ROOT_DIR)/src/addons/app.js
export PL_JS         = $(ROOT_DIR)/src/addons/pointerlock.js
export NPC_AI_JS     = $(ROOT_DIR)/src/addons/npc_ai.js
export MIXER_JS      = $(ROOT_DIR)/src/addons/mixer.js
export CAMANIM_JS    = $(ROOT_DIR)/src/addons/camera_anim.js

export B2W_PATH      = $(ROOT_DIR)/external/deploy/apps/common/b4w.min.js

export APP_DIR_CAPRI = $(ROOT_DIR)/apps_dev/capri

export RM            = -rm

.PHONY: all
all:
	$(MAKE) -C capri
	$(MAKE) -C embed
	$(MAKE) -C fashion
	$(MAKE) -C firstperson
	$(MAKE) -C flight
	$(MAKE) -C gallery
	$(MAKE) -C viewer

.PHONY: clean
clean:

# vim: set noet ts=4 sw=4:
