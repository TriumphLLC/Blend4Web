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