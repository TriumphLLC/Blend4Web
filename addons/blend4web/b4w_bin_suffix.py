# Copyright (C) 2014-2017 Triumph LLC
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


import os
import platform

def get_platform_data():
	system_name = platform.system()
	arch = platform.architecture()[0]
	if arch == "64bit":
		arch_bits = "64"
	elif arch == "32bit":
		arch_bits = "32"
	else:
		arch_bits = "Unknown"
	return {
		"system_name": system_name,
		"arch_bits": arch_bits
	}

def get_platform_suffix():
	pl_data = get_platform_data()
	return "_" + pl_data["system_name"] + "_" + pl_data["arch_bits"]