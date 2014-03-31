#!/bin/bash
xsel -bo > /tmp/xsel_plot_tmp
gnuplot -p -e 'plot for [i=0:20] "/tmp/xsel_plot_tmp" index i using 1:2 with lines title columnhead(1)'
#rm /tmp/xsel_plot_tmp
