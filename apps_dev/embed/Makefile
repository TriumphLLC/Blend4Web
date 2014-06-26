# NOTE: prepare embed.html manually
compile_embed: $(APPS_EXT)/embed/embed.min.js $(APPS_EXT)/embed/embed.html\
               $(APPS_EXT)/embed/embed_template.html

$(APPS_EXT)/embed/embed.min.js: $(APPS_DEV)/embed/embed.js \
                                $(STORAGE_JS) $(MIXER_JS) $(CAMANIM_JS)\
                                $(APP_JS) $(PRELOADER_JS)
	@touch $(APPS_EXT)/embed/embed_tmp.js
	@echo "Compiling app embed"
	java -jar $(JAR_CP) \
	    --compilation_level SIMPLE_OPTIMIZATIONS \
	    --js=$(STORAGE_JS) \
	    --js=$(MIXER_JS) \
	    --js=$(CAMANIM_JS) \
	    --js=$(APP_JS) \
	    --js=$(PRELOADER_JS) \
	    --js=$(APPS_DEV)/embed/embed.js \
	    --js_output_file=$(APPS_EXT)/embed/embed_tmp.js
	cat $(B4W_PATH) $(APPS_EXT)/embed/embed_tmp.js > $(APPS_EXT)/embed/embed.min.js
	$(RM) $(APPS_EXT)/embed/embed_tmp.js

$(APPS_EXT)/embed/embed.html: $(APPS_DEV)/embed/embed_dev.html
	$(PY_PARSER) $(APPS_DEV)/embed/embed_dev.html \
	             $(APPS_EXT)/embed/embed.html

$(APPS_EXT)/embed/embed_template.html: $(APPS_DEV)/embed/embed_dev.html
	$(PY_PARSER) $(APPS_DEV)/embed/embed_dev.html \
	             $(APPS_EXT)/embed/embed_template.html

clean:
	$(RM) $(APPS_EXT)/embed/embed.min.js

.PHONY:
	compile_embed clean

# vim: set noet ts=4 sw=4:
