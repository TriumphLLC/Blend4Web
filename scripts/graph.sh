#!/bin/bash
xsel -bo | dot -Tsvg -o graph.svg
