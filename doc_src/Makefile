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
ZHOPT = -D language='zh' -c conf_zh
FROPT = -D language='fr' -c conf_fr

.PHONY: help clean html latexpdf text gettext_build gettext gettext_base gettext_locale

all: clean gettext_build html text

help:
	@echo "Please use \`make <target>' where <target> is one of"
	@echo "  html     to make standalone HTML files"
	@echo "  latexpdf to make LaTeX files and run them through pdflatex"
	@echo "  gettext  to make PO message catalogs"

clean:
	-rm -rf $(BUILDDIR)/*

html:
	$(SPHINXBUILD) -b html $(RUOPT) $(ALLSPHINXOPTS) $(BUILDDIR)/ru -j 4
	$(SPHINXBUILD) -b html $(ENOPT) $(ALLSPHINXOPTS) $(BUILDDIR)/en -j 4
	$(SPHINXBUILD) -b html $(ZHOPT) $(ALLSPHINXOPTS) $(BUILDDIR)/zh -j 4
	#$(SPHINXBUILD) -b html $(FROPT) $(ALLSPHINXOPTS) $(BUILDDIR)/fr
	@echo
	@echo "Build finished. The HTML pages are in $(BUILDDIR)."

latexpdf:
	-rm -rf latex/*

	mkdir -p $(PUBDIR)

	$(SPHINXBUILD) -b latex $(RUOPT) $(ALLSPHINXOPTS) latex -j 4
	sed -e "/DeclareUnicodeCharacter/d" latex/b4w_tmp.tex > latex/b4w_tmp.tex~ 
	mv latex/b4w_tmp.tex~ latex/b4w_tmp.tex  
	@echo "Running LaTeX files through pdflatex..."
	make -C latex all-pdf
	@echo "pdflatex finished; the PDF files are in latex."
	mv latex/b4w_tmp.pdf $(PUBDIR)/b4w_manual_ru.pdf

	rm -r latex/*

	$(SPHINXBUILD) -b latex $(ENOPT) $(ALLSPHINXOPTS) latex -j 4
	sed -e "/DeclareUnicodeCharacter/d" latex/b4w_tmp.tex > latex/b4w_tmp.tex~ 
	mv latex/b4w_tmp.tex~ latex/b4w_tmp.tex  
	@echo "Running LaTeX files through pdflatex..."
	make -C latex all-pdf
	@echo "pdflatex finished; the PDF files are in latex."
	mv latex/b4w_tmp.pdf $(PUBDIR)/b4w_manual_en.pdf

	rm -r latex/*

	$(SPHINXBUILD) -b latex $(ZHOPT) $(ALLSPHINXOPTS) latex
	sed -e "/DeclareUnicodeCharacter/d" latex/b4w_tmp.tex > latex/b4w_tmp.tex~
	mv latex/b4w_tmp.tex~ latex/b4w_tmp.tex
	@echo "Running XeLaTeX files through xelatex..."
	sed -i s/pdflatex/xelatex/ latex/Makefile
	$(MAKE) -C latex all-pdf
	@echo "xelatex finished; the PDF files are in $(BUILDDIR)/latex."
	mv latex/b4w_tmp.pdf $(PUBDIR)/b4w_manual_zh.pdf

gettext_build:
	sphinx-intl -c conf_en/conf.py build -d locale
	mkdir -p $(BUILDDIR)
	cp -rv locale $(BUILDDIR)

text:
	$(SPHINXBUILD) -b text -c conf_ru . ../deploy/doc/ru/_sources/ -j 4
	@echo "Build ru search pages."
	$(SPHINXBUILD) -b text -c conf_zh . ../deploy/doc/zh/_sources/ -j 4
	@echo "Build zh search pages."
	#$(SPHINXBUILD) -b text -c conf_fr . ../deploy/doc/fr/_sources/
	#@echo "Build fr search pages."

gettext: gettext_base gettext_locale

gettext_base:
	$(SPHINXBUILD) -b gettext $(ENOPT) $(I18NSPHINXOPTS) locale -j 4
	@echo
	@echo "Build finished. The message catalogs are in locale."

gettext_locale:
	sphinx-intl -c conf_en/conf.py update -l ru -p locale -d locale
	sphinx-intl -c conf_en/conf.py update -l zh -p locale -d locale
	#sphinx-intl -c conf_ru/conf.py update -l fr -p locale -d locale