#!/bin/bash

i686-w64-mingw32-dlltool --dllname python33.dll --def python3.def --output-lib libpython3_32.a
x86_64-w64-mingw32-dlltool --dllname python33.dll --def python3.def --output-lib libpython3_64.a
