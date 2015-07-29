VERSION=`sed -e 's/ *[^ ]\+ *//' -e 's/ \+.*//' ../VERSION`

.PHONY: all
all:
	@$(SH) ./project.py -p capri -o advanced -v $(VERSION)
	@$(SH) ./project.py -p code_snippets -v $(VERSION) --js_ignore=scripts/*.js
	@$(SH) ./project.py -p dairy_plant -o advanced -v $(VERSION)
	@$(SH) ./project.py -p fashion -o advanced -v $(VERSION)
	@$(SH) ./project.py -p firstperson -o advanced -v $(VERSION)
	@$(SH) ./project.py -p flight -o advanced -v $(VERSION)
	@$(SH) ./project.py -p gallery -o advanced -v $(VERSION)
	@$(SH) ./project.py -p new_year -o simple -v $(VERSION)
	@$(SH) ./project.py -p victory_day_2015 -o advanced -v $(VERSION)
	@$(SH) ./project.py -p viewer -v $(VERSION) --js_ignore=jquery-*.js
	@$(SH) ./project.py -p webplayer -b compile -o advanced -v $(VERSION)

# vim: set noet ts=4 sw=4:
