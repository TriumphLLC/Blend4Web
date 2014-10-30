compile_gallery: $(APPS_EXT)/gallery/gallery.min.js \
                $(APPS_EXT)/gallery/gallery.html

$(APPS_EXT)/gallery/gallery.min.js: $(APPS_DEV)/gallery/gallery.js
	@echo "Compiling app gallery mobile"
	java -jar $(JAR_CP) \
	    --compilation_level SIMPLE_OPTIMIZATIONS \
	    --language_in=ECMASCRIPT5 \
	    --js=$(APPS_DEV)/gallery/gallery.js \
	    --js_output_file=$(APPS_EXT)/gallery/gallery.min.js

$(APPS_EXT)/gallery/gallery.html: $(APPS_DEV)/gallery/gallery_dev.html
	$(PY_PARSER) $(APPS_DEV)/gallery/gallery_dev.html \
	             $(APPS_EXT)/gallery/gallery.html

clean:
	$(RM) $(APPS_EXT)/gallery/gallery.min.js

.PHONY:
	    compile_gallery clean

# vim: set noet ts=4 sw=4:
