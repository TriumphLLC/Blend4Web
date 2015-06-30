VERSION=`sed -e 's/ *[^ ]\+ *//' -e 's/ \+.*//' ../VERSION`

.PHONY: all
all:
	@$(SH) ./project.py -a capri -o advanced -v $(VERSION)
	@$(SH) ./project.py -a code_snippets -v $(VERSION) --js_ignore=scripts/*.js
	@$(SH) ./project.py -a fashion -o advanced -v $(VERSION)
	@$(SH) ./project.py -a firstperson -o advanced -v $(VERSION)
	@$(SH) ./project.py -a flight -o advanced -v $(VERSION)
	@$(SH) ./project.py -a gallery -o advanced -v $(VERSION)
	@$(SH) ./project.py -a new_year -o simple -v $(VERSION)
	@$(SH) ./project.py -a victory_day_2015 -o advanced -v $(VERSION)
	@$(SH) ./project.py -a viewer -v $(VERSION) --js_ignore=jquery*.js
	@$(SH) ./project.py -a webplayer -b compile -o advanced -v $(VERSION)

# vim: set noet ts=4 sw=4:
