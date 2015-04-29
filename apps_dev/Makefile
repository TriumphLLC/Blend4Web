.PHONY: all
all:
	@$(SH) ./project.py -a capri -o advanced -v `cat ../VERSION`
	@$(SH) ./project.py -a code_snippets -v `cat ../VERSION` --js_ignore=scripts/*.js
	@$(SH) ./project.py -a fashion -o advanced -v `cat ../VERSION`
	@$(SH) ./project.py -a firstperson -o advanced -v `cat ../VERSION`
	@$(SH) ./project.py -a flight -o advanced -v `cat ../VERSION`
	@$(SH) ./project.py -a gallery -o advanced -v `cat ../VERSION`
	@$(SH) ./project.py -a new_year -o simple -v `cat ../VERSION`
	@$(SH) ./project.py -a victory_day_2015 -o advanced -v `cat ../VERSION`
	@$(SH) ./project.py -a viewer -v `cat ../VERSION` --js_ignore=jquery*.js
	@$(SH) ./project.py -a webplayer -b compile -o advanced -v `cat ../VERSION`

# vim: set noet ts=4 sw=4:
