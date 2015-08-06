	
		project "App_ExampleBrowser"

		hasCL = findOpenCL("clew")
	
		if (hasCL) then

				-- project ("App_Bullet3_OpenCL_Demos_" .. vendor)

				initOpenCL("clew")

		end

		language "C++"
				
		kind "ConsoleApp"

  	includedirs {
                ".",
                "../../src",
                "../ThirdPartyLibs",
                }

			
		links{"gwen", "OpenGL_Window","BulletSoftBody", "BulletDynamics","BulletCollision","LinearMath","Bullet3Common"}
		initOpenGL()
		initGlew()

		if (hasCL) then
			links {
				"Bullet3OpenCL_clew",
				"Bullet3Dynamics",
				"Bullet3Collision",
				"Bullet3Geometry",
				"Bullet3Common",
			}
		end
		
		defines {"INCLUDE_CLOTH_DEMOS"}
			


		files {
		"**.cpp",
		"**.h",
		"../BasicDemo/BasicExample.*",
		"../Benchmarks/*",
		"../CommonInterfaces/*",
		"../ForkLift/ForkLiftDemo.*",
		"../Importers/**",
		"../../Extras/Serialize/BulletWorldImporter/*",
		"../../Extras/Serialize/BulletFileLoader/*",	
		"../Planar2D/Planar2D.*",
		"../RenderingExamples/*",
		"../VoronoiFracture/*",
		"../SoftDemo/*",
		"../RollingFrictionDemo/*",
		"../FractureDemo/*",
		"../DynamicControlDemo/*",
		"../Constraints/*",
		"../Vehicles/*",
		"../Raycast/*",
		"../MultiBody/MultiDofDemo.cpp",
		"../MultiBody/TestJointTorqueSetup.cpp",
		"../ThirdPartyLibs/stb_image/*",
		"../ThirdPartyLibs/Wavefront/tiny_obj_loader.*",
		"../ThirdPartyLibs/tinyxml/*",
		"../Utils/b3Clock.*",
		"../GyroscopicDemo/GyroscopicSetup.cpp",
		"../GyroscopicDemo/GyroscopicSetup.h",
		"../ThirdPartyLibs/urdf/urdfdom/urdf_parser/src/pose.cpp",
		"../ThirdPartyLibs/urdf/urdfdom/urdf_parser/src/model.cpp",
    "../ThirdPartyLibs/urdf/urdfdom/urdf_parser/src/link.cpp",
    "../ThirdPartyLibs/urdf/urdfdom/urdf_parser/src/joint.cpp",
    "../ThirdPartyLibs/urdf/urdfdom/urdf_parser/include/urdf_parser/urdf_parser.h",
    "../ThirdPartyLibs/urdf/urdfdom_headers/urdf_exception/include/urdf_exception/exception.h",
    "../ThirdPartyLibs/urdf/urdfdom_headers/urdf_model/include/urdf_model/pose.h",
    "../ThirdPartyLibs/urdf/urdfdom_headers/urdf_model/include/urdf_model/model.h",
    "../ThirdPartyLibs/urdf/urdfdom_headers/urdf_model/include/urdf_model/link.h",
    "../ThirdPartyLibs/urdf/urdfdom_headers/urdf_model/include/urdf_model/joint.h",
    "../ThirdPartyLibs/tinyxml/tinystr.cpp",
    "../ThirdPartyLibs/tinyxml/tinyxml.cpp",
    "../ThirdPartyLibs/tinyxml/tinyxmlerror.cpp",
    "../ThirdPartyLibs/tinyxml/tinyxmlparser.cpp",
    "../ThirdPartyLibs/urdf/boost_replacement/lexical_cast.h",
    "../ThirdPartyLibs/urdf/boost_replacement/shared_ptr.h",
    "../ThirdPartyLibs/urdf/boost_replacement/printf_console.cpp",
    "../ThirdPartyLibs/urdf/boost_replacement/printf_console.h",
    "../ThirdPartyLibs/urdf/boost_replacement/string_split.cpp",
    "../ThirdPartyLibs/urdf/boost_replacement/string_split.h",

		}
		
		if (hasCL and findOpenGL3()) then
			files {
				"../OpenCL/broadphase/*",
				"../OpenCL/CommonOpenCL/*",
				"../OpenCL/rigidbody/GpuConvexScene.cpp",
				"../OpenCL/rigidbody/GpuRigidBodyDemo.cpp",
			}
		end

if os.is("Linux") then 
	initX11()
end

if os.is("MacOSX") then
	links{"Cocoa.framework"}
end

			
