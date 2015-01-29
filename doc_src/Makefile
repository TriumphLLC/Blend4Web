# Makefile for Sphinx documentation
#

# You can set these variables from the command line.
SPHINXOPTS    =
SPHINXBUILD   = sphinx-build
PAPER         = a4
BUILDDIR      = ../deploy/doc
PUBDIR       = ../deploy/pub

# Internal variables.
PAPEROPT_a4     = -D latex_paper_size=a4
PAPEROPT_letter = -D latex_paper_size=letter
ALLSPHINXOPTS   = -d doctrees $(PAPEROPT_$(PAPER)) $(SPHINXOPTS) .
# the i18n builder cannot share the environment and doctrees with the others
I18NSPHINXOPTS  = $(PAPEROPT_$(PAPER)) $(SPHINXOPTS) .

RUOPT = -D language='ru' -c conf_ru
ENOPT = -D language='en' -c conf_en

.PHONY: help clean html latexpdf gettext

all: clean gettext_build html

help:
	@echo "Please use \`make <target>' where <target> is one of"
	@echo "  html       to make standalone HTML files"
	@echo "  latexpdf   to make LaTeX files and run them through pdflatex"
	@echo "  gettext    to make PO message catalogs"

clean:
	-rm -rf $(BUILDDIR)/*

html:
	$(SPHINXBUILD) -b html $(RUOPT) $(ALLSPHINXOPTS) $(BUILDDIR)/ru
	$(SPHINXBUILD) -b html $(ENOPT) $(ALLSPHINXOPTS) $(BUILDDIR)/en
	@echo
	@echo "Build finished. The HTML pages are in $(BUILDDIR)."

latexpdf:
	-rm -rf latex/*

	mkdir -p $(PUBDIR)

	$(SPHINXBUILD) -b latex $(RUOPT) $(ALLSPHINXOPTS) latex
	sed -e "/DeclareUnicodeCharacter/d" latex/b4w_tmp.tex > latex/b4w_tmp.tex~ 
	mv latex/b4w_tmp.tex~ latex/b4w_tmp.tex  
	@echo "Running LaTeX files through pdflatex..."
	make -C latex all-pdf
	@echo "pdflatex finished; the PDF files are in latex."
	mv latex/b4w_tmp.pdf $(PUBDIR)/b4w_manual_ru.pdf

	rm -r latex/*

	$(SPHINXBUILD) -b latex $(ENOPT) $(ALLSPHINXOPTS) latex
	sed -e "/DeclareUnicodeCharacter/d" latex/b4w_tmp.tex > latex/b4w_tmp.tex~ 
	mv latex/b4w_tmp.tex~ latex/b4w_tmp.tex  
	@echo "Running LaTeX files through pdflatex..."
	make -C latex all-pdf
	@echo "pdflatex finished; the PDF files are in latex."
	mv latex/b4w_tmp.pdf $(PUBDIR)/b4w_manual_en.pdf

gettext:
	$(SPHINXBUILD) -b gettext $(RUOPT) $(I18NSPHINXOPTS) locale
	@echo
	@echo "Build finished. The message catalogs are in locale."

gettext_update:
	sphinx-intl update -p locale -d locale -c conf_ru/conf.py -l en 

gettext_build:
	sphinx-intl -d locale -c conf_ru/conf.py build
	mkdir -p $(BUILDDIR)
	cp -rv locale $(BUILDDIR)
