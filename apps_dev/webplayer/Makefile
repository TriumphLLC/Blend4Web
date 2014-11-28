# NOTE: prepare webplayer.html manually
compile_webplayer: $(APPS_EXT)/webplayer/webplayer.min.js $(APPS_EXT)/webplayer/webplayer.html\
                   $(APPS_EXT)/webplayer/webplayer_template.html\
                   $(APPS_EXT)/webplayer/webplayer.min.css\

$(APPS_EXT)/webplayer/webplayer.min.js: $(APPS_DEV)/webplayer/webplayer.js \
                                $(STORAGE_JS) $(CAMANIM_JS)\
                                $(STORAGE_JS) $(CAMANIM_JS)\
                                $(APP_JS) $(PRELOADER_JS)
	@touch $(APPS_EXT)/webplayer/webplayer_tmp.js
	@echo "Compiling app webplayer"
	java -jar $(JAR_CP) \
	    --compilation_level=ADVANCED_OPTIMIZATIONS \
	    --language_in=ECMASCRIPT5 \
		--externs=$(EXTERNS)/extern_fullscreen.js \
		--externs=$(EXTERNS)/extern_modules.js \
		--externs=$(EXTERNS)/extern_globals.js \
		--externs=$(EXTERNS)/extern_gl-matrix.js \
		--externs=$(EXTERNS)/extern_pointerlock.js \
	    --js=$(STORAGE_JS) \
	    --js=$(CAMANIM_JS) \
	    --js=$(APP_JS) \
	    --js=$(PRELOADER_JS) \
	    --js=$(APPS_DEV)/webplayer/webplayer.js \
	    --js_output_file=$(APPS_EXT)/webplayer/webplayer_tmp.js
	cat $(B4W_PATH) $(APPS_EXT)/webplayer/webplayer_tmp.js > $(APPS_EXT)/webplayer/webplayer.min.js
	$(RM) $(APPS_EXT)/webplayer/webplayer_tmp.js

	cp $(SMAA_AREA_TEX_PATH) $(APPS_EXT)/webplayer
	cp $(SMAA_SEARCH_TEX_PATH) $(APPS_EXT)/webplayer
	cp $(URANIUM_PATH) $(APPS_EXT)/webplayer

$(APPS_EXT)/webplayer/webplayer.html: $(APPS_DEV)/webplayer/webplayer_dev.html
	$(PY_PARSER) $(APPS_DEV)/webplayer/webplayer_dev.html \
	             $(APPS_EXT)/webplayer/webplayer.html

$(APPS_EXT)/webplayer/webplayer_template.html: $(APPS_DEV)/webplayer/webplayer_dev.html
	$(PY_PARSER) $(APPS_DEV)/webplayer/webplayer_dev.html \
	             $(APPS_EXT)/webplayer/webplayer_template.html

$(APPS_EXT)/webplayer/webplayer.min.css: $(APPS_DEV)/webplayer/webplayer.css
	@echo "Compiling app webplayer"
	java -jar $(YUI_CP) \
	    $(APPS_DEV)/webplayer/webplayer.css \
	    --type css \
	    -o $(APPS_EXT)/webplayer/webplayer.min.css \
	    -v

clean:
	$(RM) $(APPS_EXT)/webplayer/webplayer.min.js
	$(RM) $(APPS_EXT)/webplayer/webplayer.min.css

.PHONY:
	compile_webplayer clean

# vim: set noet ts=4 sw=4:
