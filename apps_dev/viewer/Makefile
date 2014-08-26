compile_viewer: $(APPS_EXT)/viewer/viewer.min.js \
                $(APPS_EXT)/viewer/viewer.html \

$(APPS_EXT)/viewer/viewer.min.js: $(APPS_DEV)/viewer/viewer.js
	@echo "Compiling app viewer"
	java -jar $(JAR_CP) \
	    --compilation_level SIMPLE_OPTIMIZATIONS \
	    --js=$(APPS_DEV)/viewer/viewer.js \
	    --js_output_file=$(APPS_EXT)/viewer/viewer.min.js

$(APPS_EXT)/viewer/viewer.html: $(APPS_DEV)/viewer/viewer_dev.html
	$(PY_PARSER) $(APPS_DEV)/viewer/viewer_dev.html \
	             $(APPS_EXT)/viewer/viewer.html

clean:
	$(RM) $(APPS_EXT)/viewer/viewer.min.js

.PHONY:
	    compile_viewer clean

# vim: set noet ts=4 sw=4:
