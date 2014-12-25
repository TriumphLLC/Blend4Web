ROOT_DIR = ../../../
ADDONS_DIR = $(ROOT_DIR)/src/addons/
B4W_MIN_JS = $(ROOT_DIR)/external/deploy/apps/common/b4w.min.js
B4W_FULL_MIN_JS = $(ROOT_DIR)/external/deploy/apps/common/b4w.full.min.js
URANIUM_JS = $(ROOT_DIR)/external/deploy/apps/common/uranium.js

build_examples:
	-cp $(B4W_MIN_JS) examples/making_a_game_p1-3/
	-cp $(B4W_MIN_JS) examples/making_a_game_p4/
	-cp $(B4W_MIN_JS) examples/making_a_game_p5-6/
	-cp $(B4W_MIN_JS) examples/web_page_integration/

	-cp $(ADDONS_DIR)/app.js examples/making_a_game_p1-3/
	-cp $(ADDONS_DIR)/app.js examples/making_a_game_p4/
	-cp $(ADDONS_DIR)/app.js examples/making_a_game_p5-6/
	-cp $(ADDONS_DIR)/app.js examples/web_page_integration/

	-cp $(B4W_FULL_MIN_JS) examples/interactive_web_application/
	-cp $(B4W_FULL_MIN_JS) examples/canvas_texture/
	-cp $(B4W_FULL_MIN_JS) examples/cartoon_interior/
	-cp $(B4W_FULL_MIN_JS) examples/dynamic_geometry/
	-cp $(B4W_FULL_MIN_JS) examples/making_a_game_p7/

	-cp $(URANIUM_JS) examples/cartoon_interior/
	-cp $(URANIUM_JS) examples/making_a_game_p1-3/
	-cp $(URANIUM_JS) examples/making_a_game_p4/
	-cp $(URANIUM_JS) examples/making_a_game_p5-6/
	-cp $(URANIUM_JS) examples/making_a_game_p7/

	#rm -fv flag.zip; zip -r flag.zip flag -x *.blend1 *.blend2
