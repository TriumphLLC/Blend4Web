#include <stdio.h>
#include <GL/gl.h>
#include <GL/glut.h>

#define GL_GPU_MEMORY_INFO_DEDICATED_VIDMEM_NVX 0x9047
#define GL_GPU_MEMORY_INFO_TOTAL_AVAILABLE_VIDMEM_NVX 0x9048
#define GL_GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX 0x9049
#define GL_GPU_MEMORY_INFO_EVICTION_COUNT_NVX 0x904A
#define GL_GPU_MEMORY_INFO_EVICTED_MEMORY_NVX 0x904B

void query_nvidia()
{
	GLint total;
	GLint avail;

	glGetIntegerv(GL_GPU_MEMORY_INFO_TOTAL_AVAILABLE_VIDMEM_NVX, &total);
	glGetIntegerv(GL_GPU_MEMORY_INFO_CURRENT_AVAILABLE_VIDMEM_NVX, &avail);

	printf("Total available: %d\n", total);
	printf("In use: %d\n", total-avail);
	printf("Free: %d\n", avail);
}

void query_ati()
{

	GLint param[4];

	glGetIntegerv(GL_VBO_FREE_MEMORY_ATI, param);
	printf("VBO free: %d\n", param[0]);

	glGetIntegerv(GL_TEXTURE_FREE_MEMORY_ATI, param);
	printf("Texture free: %d\n", param[0]);

	glGetIntegerv(GL_RENDERBUFFER_FREE_MEMORY_ATI, param);
	printf("Renderbuffer free: %d\n", param[0]);
}

int main(int argc, char **argv)
{

	glutInit(&argc, argv);
	glutCreateWindow("GLEW Test");

	printf("\nQuery NVIDIA\n\n");
	query_nvidia();

	printf("\nQuery ATI\n\n");
	query_ati();

	return 0;
}
