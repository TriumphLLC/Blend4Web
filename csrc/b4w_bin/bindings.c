#include <Python.h>
#include <assert.h>

#include <math.h>
#include "mikktspace.h"
#include "weldmesh.h"
#include "vertex_cache.h"

#include <stdint.h>
#include "./includes/makesdna/DNA_meshdata_types.h"
#include "./includes/makesdna/DNA_mesh_types.h"
#include "./includes/makesdna/DNA_object_types.h"
#include "./includes/makesdna/DNA_packedFile_types.h"
#include "./includes/makesdna/DNA_key_types.h"
#include "./includes/makesdna/DNA_particle_types.h"
#include "./includes/blenkernel/BKE_particle.h"

// to make Windows happy
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))

#ifndef MODULE_NAME
#define MODULE_NAME b4w_bin
#endif

#ifndef INIT_FUNC_NAME
#define INIT_FUNC_NAME PyInit_b4w_bin
#else
// to make Windows happy
PyMODINIT_FUNC PyInit_b4w_bin(void) {
    return NULL;
}
#endif

#define STR(s) #s
#define XSTR(s) STR(s)

/* ********************* PYTHON C API INITIALIZATION ************************ */

static PyObject *b4w_bin_export_submesh(PyObject *self, PyObject *args);
static PyObject *b4w_bin_calc_bounding_data(PyObject *self, PyObject *args);
static PyObject *b4w_bin_create_buffer_float(PyObject *self, PyObject *args);
static PyObject *b4w_bin_get_buffer_float(PyObject *self, PyObject *args);
static PyObject *b4w_bin_buffer_insert_float(PyObject *self, PyObject *args);
static PyObject *b4w_bin_get_packed_data(PyObject *self, PyObject *args);
static PyObject *b4w_bin_calc_particle_scale(PyObject *self, PyObject *args);

static PyMethodDef b4w_bin_methods[] = {
    {"export_submesh", b4w_bin_export_submesh, METH_VARARGS,
            "Return geometry bin data and metadata for offsets"},
    {"calc_bounding_data", b4w_bin_calc_bounding_data, METH_VARARGS,
            "Return bounding box, bounding sphere and cylinder radii"},
    {"create_buffer_float", b4w_bin_create_buffer_float, METH_VARARGS,
            "Create zero buffer of floats"},
    {"get_buffer_float", b4w_bin_get_buffer_float, METH_VARARGS,
            "Returns bytearray buffer from pointer"},
    {"buffer_insert_float", b4w_bin_buffer_insert_float, METH_VARARGS,
            "Insert float value into buffer"},
    {"get_packed_data", b4w_bin_get_packed_data, METH_VARARGS,
            "Get data for files (images, sounds) packed into .blend file"},
    {"calc_particle_scale", b4w_bin_calc_particle_scale, METH_VARARGS,
            "Calculate scale"},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef b4w_bin_module = {
    PyModuleDef_HEAD_INIT,
    XSTR(MODULE_NAME),
    NULL,
    -1,
    b4w_bin_methods
};

PyMODINIT_FUNC INIT_FUNC_NAME(void)
{
    PyObject *m;

    m = PyModule_Create(&b4w_bin_module);
    if (m == NULL)
        return NULL;

    return m;
}


/* ************************* DEFINES AND STRUCTURES ************************* */

/**
 * Errors
 */
#define NO_ERROR 0
// Wrong group indices error
#define ERR_WRONG_GROUP_INDICES 1 
// Vertex normals list is empty or missing while exporting edited normals
#define EMPTY_VERT_NORM_LIST 2 
// Animation data container is empty or missing while exporting vertex animation
#define EMPTY_ANIM_DATA_CONTAINER 3 

/**
 * Vertex data components count
 */
#define POS_NUM_COMP 3
#define NOR_NUM_COMP 3
#define TAN_NUM_COMP 4
#define TCO_NUM_COMP 2
#define GRP_NUM_COMP 1
#define COL_NUM_COMP 3
#define SHADE_TNB_NUM_COMP 3

/**
 * Maximum value of some types
 */
#define UNS_CHAR_MAX 255.0f
#define SHORT_MAX 32767.0f
#define UNS_SHORT_MAX 65535.0f

/**
 * Get IDProperty from IDProperty of IDP_IDPARRAY type
 */
#define GETPROP(prop, i) (((IDProperty *)(prop)->data.pointer) + (i))

/**
 * RGB channels codes
 */
#define RCHANNEL 0
#define GCHANNEL 1
#define BCHANNEL 2

/**
 * File error types
 */
#define POS_ERR 1
#define NOR_ERR 2
#define TAN_ERR 3
#define TCO_ERR 4
#define GRP_ERR 5
#define COL_ERR 6
#define SHADE_TNB_ERR 7

#define VIDEO_CACHE_SIZE 48
#define MAX_IND_PART_SIZE 9000

/**
 * Boundings data
 */
#define MATRIX_PRES  0.0005
#define MAX_ITER_NUM 100
#define ELL_EPS 0.000000001
#define MIN_SEMIAXIS_LEN 0.00000001


struct TBNCalcData {
    float *pos;     /* positions */
    float *nor;     /* normals */
    float *tco0;     /* texture coordinates */
    float *tan;     /* tangents + binormal signs */
    int vnum;
};

/**
 * Used for welding index generation.
 * pos, nor, tan: specified for each frame
 * tco, grp, col: do not depend on frame
 */
struct SubmeshData {
    int vnum;
    int frames;

    float *pos;
    float *nor;

    float *tan;
    float *tco;
    int tco_layers; // number of exported tco layers

    float *shade_tangs;

    float *grp;
    int grp_num;    // number of vertex groups

    float *col;
    int col_layers; // number of vertex color layers

    int *indices;
    int inum;
    short *relatives;
    int *vg_indices;
};

struct MeshData {
    // custom buffers
    float *pos;
    float *nor;
    float *grp;
    float *col;
    float *tco;
    float *shade_tangs;
    // blender data
    int *origindex; // concordance between poly/loop and tessfaces data
    // counts
    int base_length;
    int groups_num;
    // metadata
    int frames;
    int tco_exported_count;
    // optimized colors data
    int col_layers_count;
    bool need_vcol_optimization;
    unsigned int *channels_presence;
    //shape keys parents
    short *relatives;
    int *vg_indices;
};

struct BoundingData {
    // bounding box data
    float max_x;
    float max_y;
    float max_z;
    float min_x;
    float min_y;
    float min_z;
    // rotated bounding box data
    float *t_mat;
    float *rbb_scale;
    float *r_bbcen;
    // bounding sphere radius
    float srad;
    float scen_x;
    float scen_y;
    float scen_z;
    // bounding cylinder radius
    float crad;    
    float ccen_x;
    float ccen_y;
    float ccen_z;

    // bounding ellipsoid axes
    float eaxis_x;
    float eaxis_y;
    float eaxis_z;
    float ecen_x;
    float ecen_y;
    float ecen_z;
};

/* ***************************** UTILITIES ********************************** */
/**
 * Get IDProperty from IDProperty of IDP_GROUP type
 * Returns pointer to IDProperty or 0
 */
IDProperty *get_property_by_name(IDProperty *props, const char *name)
{
    ListBase *listbase = &props->data.group;
    Link *link = NULL;
    IDProperty *property;

    for (link = listbase->first; link; link = link->next) {
        property = (IDProperty *)link;
        if (strcmp(property->name, name) == 0)
            return property;
    }

    return NULL;
}

/**
 * Allocate memory for floats
 */
float *falloc(int num) {
    return (float *)malloc(num * sizeof(float));
}

/**
 * Allocate memory for unsigned ints
 */
unsigned int *uialloc(int num) {
    return (unsigned int *)malloc(num * sizeof(unsigned int));
}

/**
 * Allocate memory for shorts
 */
short *shalloc(int num) {
    return (short *)malloc(num * sizeof(short));
}

/**
 * Allocate memory for unsigned chars
 */
unsigned char *ucalloc(int num) {
    return (unsigned char *)malloc(num * sizeof(unsigned char));
}

float clampf(float a, float min, float max) {
    return MAX(MIN(a, max), min);
}

/**
 * Pack floats into shorts (for floats in range [-1; 1])
 */
void buffer_float_to_short(float *in, short *out, int length) {
    int i;

    for (i = 0; i < length; i++)
        out[i] = (short)(clampf(in[i], -1.0f, 1.0f) * SHORT_MAX);
}

/**
 * Pack floats into unsigned shorts (for floats in range [0; 1])
 */
void buffer_float_to_ushort(float *in, unsigned short *out, int length) {
    int i;

    for (i = 0; i < length; i++)
        out[i] = (unsigned short)(clampf(in[i], 0.0f, 1.0f) * UNS_SHORT_MAX);
}

void buffer_float_to_uchar(float *in, unsigned char *out, int length) {
    int i;

    for (i = 0; i < length; i++)
        out[i] = (unsigned char)(clampf(in[i], 0.0f, 1.0f) * UNS_CHAR_MAX);
}

/**
 * Returns layer channel usage
 */
unsigned int get_channel_usage(char mask, int channel) {
    unsigned int presence = 0;
    switch(channel) {
        case RCHANNEL:
            if ((mask & 1<<2) > 0)
                presence = 1;
            break;
        case GCHANNEL:
            if ((mask & 1<<1) > 0)
                presence = 1;
            break;
        case BCHANNEL:
            if ((mask & 1<<0) > 0)
                presence = 1;
            break;
    }
    return presence;
}

bool check_need_vcol_optimization(unsigned int *channels_presence, int layers_count) {
    int i;

    // true - if at least one channel dropped
    for (i = 0; i < layers_count * 3; i++)
        if (channels_presence[i] == 0)
            return true;

    return false;
}

void *custom_data_get_layer(CustomData *data, int type) {
    int i;
    CustomDataLayer *layer;
    void *result = NULL;

    for (i = 0, layer = data->layers; i < data->totlayer; i++, layer++)
        if (layer->type == type)
            result = layer->data;

    return result;
}

/**
 * Returns total amount of all used channels from all colors layers
 */
int get_optimized_channels_total(unsigned int *channels_presence, int layers_count) {
    int i, total = 0;

    for (i = 0; i < layers_count * 3; i++)
        total += channels_presence[i];
    return total;
}

/**
 * Returns the number of elements in a ListBase.
 */
int countlist(const ListBase *listbase)
{
    Link *link;
    int count = 0;
    
    if (listbase) {
        link = listbase->first;
        while (link) {
            count++;
            link = link->next;
        }
    }
    return count;
}

/**
 * Returns number of layers of specific type from CustomData object
 */
int CustomData_number_of_layers(const CustomData *data, int type) {
    int i, number = 0;

    for (i = 0; i < data->totlayer; i++)
        if (data->layers[i].type == type)
            number++;
    
    return number;
}

/**
 * Get normalized vector3
 */
void normalize_v3(float *v3)
{
    float d = v3[0] * v3[0] + v3[1] * v3[1] + v3[2] * v3[2];

    if (d > 1.0e-35f) {
        d = sqrtf(d);

        v3[0] = v3[0]/d;
        v3[1] = v3[1]/d;
        v3[2] = v3[2]/d;
    }
    else {
        v3[0] = 0.0f;
        v3[1] = 0.0f;
        v3[2] = 0.0f;
    }
}

/**
 * Get tri-face normal
 */
void _normal_tri_v3(float *no, const float v1[3], const float v2[3],
        const float v3[3])
{
    float n1[3], n2[3];

    n1[0] = v1[0] - v2[0];
    n1[1] = v1[1] - v2[1];
    n1[2] = v1[2] - v2[2];
    
    n2[0] = v2[0] - v3[0];    
    n2[1] = v2[1] - v3[1];
    n2[2] = v2[2] - v3[2];
    
    no[0] = n1[1] * n2[2] - n1[2] * n2[1];
    no[1] = n1[2] * n2[0] - n1[0] * n2[2];
    no[2] = n1[0] * n2[1] - n1[1] * n2[0];

    normalize_v3(no);
}

/**
 * Get quad-face normal
 */
void _normal_quad_v3(float *no, const float v1[3], const float v2[3],
        const float v3[3], const float v4[3])
{
    float n1[3], n2[3];

    n1[0] = v1[0] - v3[0];
    n1[1] = v1[1] - v3[1];
    n1[2] = v1[2] - v3[2];

    n2[0] = v2[0] - v4[0];
    n2[1] = v2[1] - v4[1];
    n2[2] = v2[2] - v4[2];

    no[0] = n1[1] * n2[2] - n1[2] * n2[1];
    no[1] = n1[2] * n2[0] - n1[0] * n2[2];
    no[2] = n1[0] * n2[1] - n1[1] * n2[0];

    normalize_v3(no);
}

void calc_face_normal(MFace mface, MVert *mvert, float *no)
{
    if (mface.v4)
        _normal_quad_v3(no, mvert[mface.v1].co, mvert[mface.v2].co,
                mvert[mface.v3].co, mvert[mface.v4].co);
    else
        _normal_tri_v3(no, mvert[mface.v1].co, mvert[mface.v2].co,
                mvert[mface.v3].co);
}

/**
 * Get frames count for vertex animation
 */
int get_vert_anim_frames_count(Object *obj)
{
    ID *obj_id = &obj->id;
    IDProperty *prop_list = obj_id->properties;
    IDProperty *anim_data_container;
    IDProperty *anim_data;
    IDProperty *frames_container;

    int frames_count = 0;

    int i;

    anim_data_container = get_property_by_name(prop_list, "b4w_vertex_anim");

    if (anim_data_container)
        // NOTE: get arrays size
        for (i = 0; i < anim_data_container->len; i++) {
            // NOTE: get every vertex animation on object
            anim_data = GETPROP(anim_data_container, i);
            // NOTE: get vertex animation property, called "frames"
            frames_container = get_property_by_name(anim_data, "frames");
            frames_count += frames_container->len;
        }

    return frames_count ? frames_count : 1;
}

/**
 * Get positions and normals from b4w_vertex_anim property
 */
int get_vertex_animation(float *positions, float *normals, Object *obj,
        int verts_count) 
{
    ID *obj_id = &obj->id;
    IDProperty *prop_list = obj_id->properties;
    IDProperty *anim_data_container;
    IDProperty *anim_data;
    IDProperty *frames_container;
    IDProperty *frames;
    IDProperty *vertices_container;
    IDProperty *vertices;
    IDProperty *posnor_container;
    float *posnor;

    int i, j, k;

    int pn_cursor = 0;

    // NOTE: get "b4w_vertex_anim" custom property data
    anim_data_container = get_property_by_name(prop_list, "b4w_vertex_anim");

    if (anim_data_container && anim_data_container->len > 0) {
        for (i = 0; i < anim_data_container->len; i++) {
            // NOTE: get every vertex animation on object
            anim_data = GETPROP(anim_data_container, i);
            
            // NOTE: get vertex animation property, called "frames"
            frames_container = get_property_by_name(anim_data, "frames");
            // NOTE: if vertex animation has at least 1 frame
            if (frames_container)
                for (j = 0; j < frames_container->len; j++) {
                    // NOTE: get every frame
                    frames = GETPROP(frames_container, j);

                    // NOTE: get frame property, called "vertices"
                    vertices_container = get_property_by_name(frames, 
                            "vertices");

                    for (k = 0; k < vertices_container->len; k++) {
                        // NOTE: get every vertex of current frame
                        vertices = GETPROP(vertices_container, k);
                                            
                        // NOTE: get "posnor" property from vertex
                        posnor_container = get_property_by_name(vertices, 
                                "posnor");

                        // NOTE: get positions and normals components
                        posnor = (float *)posnor_container->data.pointer;

                        positions[pn_cursor] = posnor[0];
                        positions[pn_cursor + 1] = posnor[1];
                        positions[pn_cursor + 2] = posnor[2];

                        normals[pn_cursor] = posnor[3];
                        normals[pn_cursor + 1] = posnor[4];
                        normals[pn_cursor + 2] = posnor[5];

                        pn_cursor += 3;
                    }
                }
        }
        return NO_ERROR;
    } else
        return EMPTY_ANIM_DATA_CONTAINER;
}

/**
 * Get normals from b4w_vertex_normals_list property
 */
int get_vertex_normals_list(float *normals, Object *obj)
{
    ID *obj_id = &obj->id;
    IDProperty *prop_list = obj_id->properties;
    IDProperty *normals_list;
    IDProperty *normal_data_container;
    IDProperty *normal_data;

    float *f_norm_vector;
    double *d_norm_vector;
    int i;

    // NOTE: get "b4w_vertex_normal_list" custom property data
    normals_list = get_property_by_name(prop_list, "b4w_vertex_normal_list");

    if (normals_list && normals_list->len > 0) {
        for (i = 0; i < normals_list->len; i++) {
            // NOTE: get every normal from list
            normal_data_container = GETPROP(normals_list, i);
            // NOTE: get "normal" property
            normal_data = get_property_by_name(normal_data_container, "normal");
            // NOTE: different data types can be (IDP_FLOAT, IDP_DOUBLE)
            if (normal_data->subtype == IDP_FLOAT) {
                f_norm_vector = (float *)normal_data->data.pointer;
                normals[3 * i] = f_norm_vector[0];
                normals[3 * i + 1] = f_norm_vector[1];
                normals[3 * i + 2] = f_norm_vector[2];
            }
            else {
                d_norm_vector = (double *)normal_data->data.pointer;
                normals[3 * i] = (float)d_norm_vector[0];
                normals[3 * i + 1] = (float)d_norm_vector[1];
                normals[3 * i + 2] = (float)(d_norm_vector[2]);
            }
        }
        return NO_ERROR;
    } else
        return EMPTY_VERT_NORM_LIST;
}

/**
 * Get vertex groups count
 */
int get_groups_num(Object *obj)
{
    ListBase *group_list = &obj->defbase;
    return countlist(group_list);
}




/**
 * Get vertex groups weights
 */
int get_groups_data(float *groups_data, Mesh *mesh, int groups_num)
{
    MDeformVert *def_vertices = mesh->dvert;
    MDeformWeight *dweight;

    int weights_count;

    int listsize = mesh->totvert * groups_num;
    
    int i, j, index;

    for (i = 0; i < listsize; i++)
        groups_data[i] = -1;

    // NOTE: check if at least one vertex belongs to any group
    if (def_vertices)
        for (i = 0; i < mesh->totvert; i++, def_vertices++) {
            dweight = def_vertices->dw;
            weights_count = def_vertices->totweight;

            for (j = 0; j < weights_count; j++) {
                if (dweight[j].def_nr < 0)
                    return ERR_WRONG_GROUP_INDICES;
                index = mesh->totvert * dweight[j].def_nr + i;

                if (dweight[j].def_nr >= groups_num)
                    return ERR_WRONG_GROUP_INDICES;

                groups_data[index] = dweight[j].weight;
            }
        }
    return NO_ERROR;
}

/**
 * Get vertex colors layers count
 */
int get_colors_layers_count(Mesh *mesh)
{
    CustomData *ldata = &mesh->ldata;
    return CustomData_number_of_layers(ldata, CD_MLOOPCOL);
}


int get_vertex_group_number(ListBase listbase, char *group_name)
{
    bDeformGroup *group = NULL;
    const char *id_iter;
    int i = 0;

    group = listbase.first;
    while (group) {
        id_iter = group->name;

        if (group_name[0] == id_iter[0] && strcmp(group_name, id_iter) == 0)
            return i;
        i++;
        group = group->next;
    }
    return -1;
}

/**
 * Get vertex colors
 */
void get_vertex_colors(struct MeshData *mesh_data, Mesh *mesh) {
    CustomData *ldata = &mesh->ldata;
    CustomDataLayer *layer;
    MLoop *mesh_loop = mesh->mloop;
    MLoopCol *layer_data;

    int i, j, index, layer_counter = 0;
    float col_value;

    for (i = 0, layer = ldata->layers; i < ldata->totlayer; i++, layer++)
        if (layer->type == CD_MLOOPCOL) {
            layer_data = (MLoopCol *)layer->data;

            for (j = 0; j < mesh->totloop; j++, layer_data++) {
                // NOTE: use origindex (if exist) for better color extraction
                if (mesh_data->origindex != NULL)
                    index = (layer_counter * mesh->totloop + j) * COL_NUM_COMP;
                else
                    index = (layer_counter * mesh->totvert + mesh_loop[j].v) * 
                            COL_NUM_COMP;

                // r, g, b properties have type "char"
                if (mesh_data->channels_presence[layer_counter * 3] > 0) {
                    col_value = ((256 + layer_data->r) % 256) / 255.0f;
                    mesh_data->col[index] = col_value;
                }

                if (mesh_data->channels_presence[layer_counter * 3 + 1] > 0) {
                    col_value = ((256 + layer_data->g) % 256) / 255.0f;
                    mesh_data->col[index + 1] = col_value;
                }

                if (mesh_data->channels_presence[layer_counter * 3 + 2] > 0) {
                    col_value = ((256 + layer_data->b) % 256) / 255.0f;
                    mesh_data->col[index + 2] = col_value;
                }

            }
            layer_counter++;
        }
}


/* **************** SUBMESH CALCULATION ********************* */

void combine_positions_normals(struct MeshData *mesh_data, Mesh *mesh, 
        Object *obj, int vertex_animation, int edited_normals, int shape_keys)
{
    MVert *vertices = mesh->mvert;

    int i, j, cr_cursor;
    int posnor_size;

    mesh_data->base_length = mesh->totvert;

    if (vertex_animation) {
        mesh_data->frames = get_vert_anim_frames_count(obj);
        posnor_size = mesh_data->frames * mesh_data->base_length * 3;
        if (posnor_size > 0) {
            mesh_data->pos = falloc(posnor_size);
            mesh_data->nor = falloc(posnor_size);
            if (get_vertex_animation(mesh_data->pos, mesh_data->nor, obj, 
                    mesh_data->base_length) == EMPTY_ANIM_DATA_CONTAINER) {
                free(mesh_data->pos);
                free(mesh_data->nor);
                mesh_data->pos = NULL;
                mesh_data->nor = NULL;
            }
        }
    } else if (shape_keys) {
        KeyBlock *block;
        ID *obj_id = &obj->id;
        IDProperty *prop_list = obj_id->properties;
        IDProperty *normals_container;
        IDProperty *normal_container;
        IDProperty *normals;
        float *normal, *pos_data;    
        normals_container = get_property_by_name(prop_list, "b4w_shape_keys_normals");
        if (normals_container && normals_container->len > 0) {
            mesh_data->frames = countlist(&mesh->key->block);
            mesh_data->relatives = malloc(sizeof(short) * mesh_data->frames);
            mesh_data->vg_indices = malloc(sizeof(int) * mesh_data->frames);
            posnor_size = NOR_NUM_COMP * normals_container->len;
            mesh_data->pos = falloc(posnor_size);
            mesh_data->nor = falloc(posnor_size);
            for (i = 0; i < normals_container->len; i++) {
                normals = GETPROP(normals_container, i);
                normal_container = get_property_by_name(normals, "normal");
                if (normal_container) {
                    normal = (float *)normal_container->data.pointer;
                    mesh_data->nor[NOR_NUM_COMP * i] = normal[0];
                    mesh_data->nor[NOR_NUM_COMP * i + 1] = normal[1];
                    mesh_data->nor[NOR_NUM_COMP * i + 2] = normal[2];
                }
            }
            for (block = mesh->key->block.first, j = 0; block; block = block->next, j++) {
                mesh_data->vg_indices[j] = get_vertex_group_number(obj->defbase, block->vgroup);
                mesh_data->relatives[j] = block->relative;
                cr_cursor = j * mesh_data->base_length * POS_NUM_COMP;
                pos_data = (float *)block->data;
                for (i = 0; i < mesh_data->base_length; i++) {
                    // NOTE: rotate by 90 degrees around X axis
                    mesh_data->pos[cr_cursor + POS_NUM_COMP * i] = pos_data[i * POS_NUM_COMP];
                    mesh_data->pos[cr_cursor + POS_NUM_COMP * i + 1] = pos_data[i * POS_NUM_COMP + 1];
                    mesh_data->pos[cr_cursor + POS_NUM_COMP * i + 2] = pos_data[i * POS_NUM_COMP + 2];
                }
            }
        } else {
            mesh_data->pos = NULL;
            mesh_data->nor = NULL;
        }
    } else if (edited_normals) {
        mesh_data->nor = falloc(mesh_data->base_length * 3);
        if (get_vertex_normals_list(mesh_data->nor, obj) == 
                EMPTY_VERT_NORM_LIST) {
            free(mesh_data->nor);
            mesh_data->nor = NULL;
        }
    }

    if (mesh_data->pos == NULL) {
        mesh_data->pos = falloc(mesh_data->base_length * 3);
        for (i = 0; i < mesh_data->base_length; i++) {
            // NOTE: rotate by 90 degrees around X axis
            mesh_data->pos[3 * i] = vertices[i].co[0];
            mesh_data->pos[3 * i + 1] = vertices[i].co[1];
            mesh_data->pos[3 * i + 2] = vertices[i].co[2];
        }
    }

    if (mesh_data->nor == NULL) {
        mesh_data->nor = falloc(mesh_data->base_length * 3);
        for (i = 0; i < mesh_data->base_length; i++) {
            // NOTE: rotate by 90 degrees around X axis
            // NOTE: get normal componenets from "short" type value
            mesh_data->nor[3 * i] = vertices[i].no[0] * (1.0f / 32767.0f);
            mesh_data->nor[3 * i + 1] = vertices[i].no[1] * (1.0f / 32767.0f);
            mesh_data->nor[3 * i + 2] = vertices[i].no[2] * (1.0f / 32767.0f);
        }
    }
}

void calculate_shape_keys_delta(struct SubmeshData *mesh_data) {
    int i, j, frames_offset;
    int vnum = mesh_data->vnum;
    int tan_frame_size = TAN_NUM_COMP * vnum;
    int pos_nor_frame_size = POS_NUM_COMP * vnum;
    int relative_offset = 0;
    float *pos_buf, *nor_buf, *tan_buf;
    int vg_offset = 0;
    pos_buf = falloc(mesh_data->frames * pos_nor_frame_size);
    nor_buf = falloc(mesh_data->frames * pos_nor_frame_size);
    tan_buf = falloc(mesh_data->frames * tan_frame_size);

    memcpy(pos_buf, mesh_data->pos, sizeof(float) * mesh_data->frames * pos_nor_frame_size);
    memcpy(nor_buf, mesh_data->nor, sizeof(float) * mesh_data->frames * pos_nor_frame_size);
    if (mesh_data->tan)
        memcpy(tan_buf, mesh_data->tan, sizeof(float) * mesh_data->frames * tan_frame_size);

    for (i = 1; i < mesh_data->frames; i++) {
        relative_offset = mesh_data->relatives[i] * pos_nor_frame_size;
        frames_offset = i * pos_nor_frame_size;
        vg_offset = mesh_data->vg_indices[i] * vnum;
        for (j = 0; j < pos_nor_frame_size; j++) {
            if (mesh_data->vg_indices[i] != -1 && mesh_data->grp[vg_offset + j / POS_NUM_COMP] == -1) {
                mesh_data->pos[frames_offset + j] = 0;
                mesh_data->nor[frames_offset + j] = 0;
                continue;
            }
            mesh_data->pos[frames_offset + j] -= pos_buf[j + relative_offset];
            mesh_data->nor[frames_offset + j] -= nor_buf[j + relative_offset];
        }
        if (mesh_data->tan) {
            frames_offset = i * tan_frame_size;
            relative_offset = mesh_data->relatives[i] * tan_frame_size;
            for (j = 0; j < tan_frame_size; j++) {
                if (mesh_data->vg_indices[i] != -1 && mesh_data->grp[vg_offset + j / TAN_NUM_COMP] == -1) {
                    mesh_data->tan[frames_offset + j] = 0;
                    continue;
                }
                mesh_data->tan[frames_offset + j] -= tan_buf[j + relative_offset];
            }
        }
    }
    free(pos_buf);
    free(nor_buf);
    free(tan_buf);
}

int combine_groups(struct MeshData *mesh_data, Mesh *mesh, Object *obj,
        int vertex_groups) 
{
    int groups_error = NO_ERROR;

    if (vertex_groups) {
        mesh_data->groups_num = get_groups_num(obj);
        mesh_data->grp = falloc(mesh->totvert * mesh_data->groups_num);

        groups_error = get_groups_data(mesh_data->grp, mesh, 
                mesh_data->groups_num);
    }
      
    return groups_error;
}

void combine_colors(struct MeshData *mesh_data, Mesh *mesh, Py_buffer *mask_buffer) {

    mesh_data->col_layers_count = get_colors_layers_count(mesh);

    if (mesh_data->col_layers_count) {
        int i;

        int total_channels_size;
        char *mask_array = (char *)mask_buffer->buf;

        mesh_data->channels_presence = uialloc(mesh_data->col_layers_count * 3);
        for (i = 0; i < mesh_data->col_layers_count; i++) {
            // calculate channels_presence on color layers
            mesh_data->channels_presence[i * 3] = get_channel_usage(mask_array[i], RCHANNEL);
            mesh_data->channels_presence[i * 3 + 1] = get_channel_usage(mask_array[i], GCHANNEL);
            mesh_data->channels_presence[i * 3 + 2] = get_channel_usage(mask_array[i], BCHANNEL);
        }
        mesh_data->need_vcol_optimization = check_need_vcol_optimization(mesh_data->channels_presence, 
                mesh_data->col_layers_count);
        
        // NOTE: use origindex (if exist) for better color extraction
        if (mesh_data->origindex != NULL)
            total_channels_size = mesh_data->col_layers_count * mesh->totloop * 
                    COL_NUM_COMP;
        else
            total_channels_size = mesh_data->col_layers_count * mesh->totvert *
                    COL_NUM_COMP;

        mesh_data->col = falloc(total_channels_size);
        memset(mesh_data->col, 0, total_channels_size * sizeof(float));
        get_vertex_colors(mesh_data, mesh);
    }
}

void sub_v3_v3v3(float r[3], const float a[3], const float b[3])
{
    r[0] = a[0] - b[0];
    r[1] = a[1] - b[1];
    r[2] = a[2] - b[2];
}

void cross_v3_v3v3(float r[3], const float a[3], const float b[3])
{
    r[0] = a[1] * b[2] - a[2] * b[1];
    r[1] = a[2] * b[0] - a[0] * b[2];
    r[2] = a[0] * b[1] - a[1] * b[0];
}

float dot_v3v3(const float a[3], const float b[3])
{
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

void tangent_from_uv(
        const float uv1[2], const float uv2[2], const float uv3[3],
        const float co1[3], const float co2[3], const float co3[3],
        const float n[3],
        float r_tang[3])
{
    const float s1 = uv2[0] - uv1[0];
    const float s2 = uv3[0] - uv1[0];
    const float t1 = uv2[1] - uv1[1];
    const float t2 = uv3[1] - uv1[1];
    float det = (s1 * t2 - s2 * t1);

    /* otherwise 'r_tang' becomes nan */
    if (det != 0.0f) {
        float tangv[3], ct[3], e1[3], e2[3];

        det = 1.0f / det;

        /* normals in render are inversed... */
        sub_v3_v3v3(e1, co1, co2);
        sub_v3_v3v3(e2, co1, co3);
        r_tang[0] = (t2 * e1[0] - t1 * e2[0]) * det;
        r_tang[1] = (t2 * e1[1] - t1 * e2[1]) * det;
        r_tang[2] = (t2 * e1[2] - t1 * e2[2]) * det;
        tangv[0] = (s1 * e2[0] - s2 * e1[0]) * det;
        tangv[1] = (s1 * e2[1] - s2 * e1[1]) * det;
        tangv[2] = (s1 * e2[2] - s2 * e1[2]) * det;
        cross_v3_v3v3(ct, r_tang, tangv);

        /* check flip */
        if (dot_v3v3(ct, n) > 0.0f) {
            r_tang[0] = -r_tang[0];
            r_tang[1] = -r_tang[1];
            r_tang[2] = -r_tang[2];
        }
    }
    else {
        r_tang[0] = 0.0f;
        r_tang[1] = 0.0f;
        r_tang[2] = 0.0f;
    }
}

float *get_vert_tang(int v, float *vert_tang_buff)
{
    return vert_tang_buff + v * SHADE_TNB_NUM_COMP;
}

float *get_vert_norm(int v, float *vert_tang_buff)
{
    return vert_tang_buff + v * NOR_NUM_COMP;
}

void vec3_add(float *tan_buff_ptr, float tang[3]) {
    tan_buff_ptr[0] += tang[0];
    tan_buff_ptr[1] += tang[1];
    tan_buff_ptr[2] += tang[2];
}

void vec3_set(float *nor_buff_ptr, short nx, short ny, short nz) {
    float x,y,z,len;
    x = nx * (1.0f / 32767.0f);
    y = ny * (1.0f / 32767.0f);
    z = nz * (1.0f / 32767.0f);
    len = sqrt(x * x + y * y + z * z);
    if (len > 0.0) {
        x /= len;
        y /= len;
        z /= len;
    }
    nor_buff_ptr[0] = x;
    nor_buff_ptr[1] = y;
    nor_buff_ptr[2] = z;
}

void set_tangent_buff(float *tan_buff, float *tan_ptr, float nor[3], int index) {
    float tdn = tan_ptr[0] * nor[0] + tan_ptr[1] * nor[1] + tan_ptr[2] * nor[2];
    float x,y,z,len;
    x = tan_ptr[0] - nor[0] * tdn;
    y = tan_ptr[1] - nor[1] * tdn;
    z = tan_ptr[2] - nor[2] * tdn;
    len = sqrt(x * x + y * y + z * z);
    if (len > 0.0) {
        x /= len;
        y /= len;
        z /= len;
    }
    tan_buff[index * 3] = x;
    tan_buff[index * 3 + 1] = y;
    tan_buff[index * 3 + 2] = z;
}

float get_exported_tco_count(Mesh *mesh, char *tco_usage) {
    int i, tco_exported_count = 0;
    CustomData *ldata = &mesh->ldata;
    int tco_layers_total = CustomData_number_of_layers(ldata, CD_MLOOPUV);

    for (i = 0; i < tco_layers_total; i++)
        if (tco_usage[i])
            tco_exported_count++;

    return tco_exported_count;
}

void combine_tco(struct MeshData *mesh_data, Mesh *mesh, Object *obj, int mat_index,
        Py_buffer *tco_usage_buffer, int tnb_shading) {
    
    CustomData *ldata = &mesh->ldata;
    char *tco_buf = (char *)tco_usage_buffer->buf;

    mesh_data->tco_exported_count = get_exported_tco_count(mesh, tco_buf);

    if (mesh_data->tco_exported_count > 0) {
        CustomDataLayer *layer;

        MLoop *mesh_loop = mesh->mloop;
        MLoopUV *layer_data;

        int i,j, index;
        int layer_counter = 0, exported_layer_counter = 0;

        int tco_len;
        // NOTE: use origindex (if exist) for better color extraction
        if (mesh_data->origindex != NULL)
            tco_len = mesh_data->tco_exported_count * mesh->totloop * TCO_NUM_COMP;
        else
            tco_len = mesh_data->tco_exported_count * mesh->totvert * TCO_NUM_COMP;
        mesh_data->tco = falloc(tco_len);
        memset(mesh_data->tco, 0, tco_len * sizeof(float));

        // get tco data
        for (i = 0, layer = ldata->layers; i < ldata->totlayer; i++, layer++) {
            if (layer->type == CD_MLOOPUV) {
                if (tco_buf[layer_counter]) {
                    layer_data = (MLoopUV *)layer->data;

                    for (j = 0; j < mesh->totloop; j++, layer_data++) {
                        if (mesh_data->origindex != NULL)
                            index = (exported_layer_counter * mesh->totloop + j) 
                                    * TCO_NUM_COMP;
                        else
                            index = (exported_layer_counter * mesh->totvert + mesh_loop[j].v) * 
                                    TCO_NUM_COMP;

                        mesh_data->tco[index] = layer_data->uv[0];
                        mesh_data->tco[index + 1] = layer_data->uv[1];
                    }
                    exported_layer_counter++;
                }
                layer_counter++;
            }
        }
    }
}

int check_vert_normal(int face_ind, int v, int lnv, short *hnormals, short (*lnor)[4][3],
        int max_vert_num, int uniq_v_num, int *indices)
{
    int i, j, max_v_len;
    short *n = lnor[face_ind][lnv];
    /* First face, we can use existing vert and assign it current lnor */
    j = 3 * v;
    if (hnormals[j] == 0 && hnormals[j + 1] == 0 && hnormals[j + 2] == 0) {
        hnormals[j] = n[0];
        hnormals[j + 1] = n[1];
        hnormals[j + 2] = n[2];

        return v;
    }

    /* In case existing ver has same normal as current lnor, we can simply use it */
    if (hnormals[j] == n[0] && hnormals[j + 1] == n[1] && hnormals[j + 2] == n[2]) {
        return v;
    }

    max_v_len = max_vert_num * 3;
    for (i = uniq_v_num * 3; i < max_v_len; i = i + 3) {
        /* this face already made a copy for this vertex */
        if (indices[i / 3] == v && hnormals[i] == n[0] && hnormals[i + 1] == n[1]
                && hnormals[i + 2] == n[2]) {
            return i / 3;
        }
        if (hnormals[i] == 0 && hnormals[i + 1] == 0 && hnormals[i + 2] == 0)
            break;
    }
    return -1;
}

int check_one_vert(int face_ind, int v, int lnv, short *hnormals, short (*lnor)[4][3],
        int max_v_num, int uniq_v_num, int curr_v_num, int *indices, int *new_indices)
{
    int res = check_vert_normal(face_ind, v, lnv, hnormals, lnor, max_v_num,
            uniq_v_num, indices);
    if (res < 0) {
        hnormals[curr_v_num * 3] = lnor[face_ind][lnv][0];
        hnormals[curr_v_num * 3 + 1] = lnor[face_ind][lnv][1];
        hnormals[curr_v_num * 3 + 2] = lnor[face_ind][lnv][2];
        indices[curr_v_num] = v;
        new_indices[face_ind * 4 + lnv] = curr_v_num;
        curr_v_num++;
    } else if (res != v)
        new_indices[face_ind * 4 + lnv] = res;

    return curr_v_num;
}

float *calc_tri_shade_tans(Mesh *mesh, short (*split_normals)[4][3], int mat_index)
{
    int v1, v2, v3, v4, i, j, max_v_num = mesh->totface * 4,
        uniq_v_num = mesh->totvert;
    int curr_v_num = uniq_v_num, *indices, *new_indices, vnum_count, tnb_shad_counter = 0;
    int shade_tnb_size = 0, vnum = 0, ver_tri_ind;
    short *lnormals = malloc(3 * max_v_num * sizeof(short));
    memset(lnormals, 0, 3 * max_v_num * sizeof(short));
    indices = malloc(max_v_num * sizeof(int));
    new_indices = malloc(max_v_num * sizeof(int));
    CustomData *fdata = &mesh->fdata;
    CustomDataLayer *layer;
    MVert *vertices = mesh->mvert;
    MTFace *mtface;
    float *tang = falloc(3);
    float *no = falloc(3);
    float *vert_tang_buff = NULL;
    float *tri_tnb_shad = NULL;
    float *tav, *shade_tang_buff, *uv1, *uv2, *uv3, *uv4;
    int t_indices[] = {0, 1, 2, 0, 2, 3};
    for (i = 0; i < max_v_num; i++)
        if (i < uniq_v_num)
            indices[i] = i;
        else
            indices[i] = -1;
    MFace *mface = mesh->mface;
    /* prepare normals info */
    for (i = 0; i < mesh->totface; i++) {
        v1 = mface[i].v1;
        v2 = mface[i].v2;
        v3 = mface[i].v3;
        v4 = mface[i].v4;
        new_indices[i * 4] = v1;
        new_indices[i * 4 + 1] = v2;
        new_indices[i * 4 + 2] = v3;
        new_indices[i * 4 + 3] = v4;
        curr_v_num = check_one_vert(i, v1, 0, lnormals, split_normals, max_v_num,
                uniq_v_num, curr_v_num, indices, new_indices);
        curr_v_num = check_one_vert(i, v2, 1, lnormals, split_normals, max_v_num,
                uniq_v_num, curr_v_num, indices, new_indices);
        curr_v_num = check_one_vert(i, v3, 2, lnormals, split_normals, max_v_num,
                uniq_v_num, curr_v_num, indices, new_indices);
        if (v4) {
            curr_v_num = check_one_vert(i, v4, 3, lnormals, split_normals, max_v_num,
                uniq_v_num, curr_v_num, indices, new_indices);
            shade_tnb_size += 12;
            vnum += 6;
        } else {
            vnum += 3;
            shade_tnb_size += 9;
        }
    }

    vert_tang_buff = falloc(curr_v_num * SHADE_TNB_NUM_COMP);
    memset(vert_tang_buff, 0, SHADE_TNB_NUM_COMP * curr_v_num * sizeof(float));
    /* we use only the first layer */
    for (i = 0, layer = fdata->layers; i < fdata->totlayer; i++, layer++) {
        if (layer->type == CD_MTFACE) {
            mtface = (MTFace *)layer->data;
            for (j = 0; j < mesh->totface; j++) {
                uv1 = mtface[j].uv[0];
                uv2 = mtface[j].uv[1];
                uv3 = mtface[j].uv[2];
                uv4 = mtface[j].uv[3];

                v1 = new_indices[j * 4];
                v2 = new_indices[j * 4 + 1];
                v3 = new_indices[j * 4 + 2];
                v4 = new_indices[j * 4 + 3];

                calc_face_normal(mface[j], vertices, no);

                tangent_from_uv(uv1, uv2, uv3, vertices[mface[j].v1].co,
                        vertices[mface[j].v2].co, vertices[mface[j].v3].co, no, tang);
                tav = get_vert_tang(v1, vert_tang_buff);
                vec3_add(tav, tang);
                tav = get_vert_tang(v2, vert_tang_buff);
                vec3_add(tav, tang);
                tav = get_vert_tang(v3, vert_tang_buff);
                vec3_add(tav, tang);

                if (v4) {
                    tangent_from_uv(uv1, uv3, uv4, vertices[mface[j].v1].co, vertices[mface[j].v3].co,
                            vertices[mface[j].v4].co, no, tang);
                    tav = get_vert_tang(v4, vert_tang_buff);
                    vec3_add(tav, tang);
                    tav = get_vert_tang(v1, vert_tang_buff);
                    vec3_add(tav, tang);
                    tav = get_vert_tang(v3, vert_tang_buff);
                    vec3_add(tav, tang);
                }
            }
            break;
        }
    }
    shade_tang_buff = falloc(shade_tnb_size);
    for (j = 0; j < curr_v_num; j++) {
        tav = get_vert_tang(j, vert_tang_buff);
        no[0] = lnormals[j * 3] * (1.0f / 32767.0f);
        no[1] = lnormals[j * 3 + 1] * (1.0f / 32767.0f);
        no[2] = lnormals[j * 3 + 2] * (1.0f / 32767.0f);
        set_tangent_buff(shade_tang_buff, tav, no, j);
    }

    /* triangulate shade tangents*/
    tri_tnb_shad = falloc(vnum * SHADE_TNB_NUM_COMP);
    for (i = 0; i < mesh->totface; i++) {
        v1 = new_indices[i * 4];
        v2 = new_indices[i * 4 + 1];
        v3 = new_indices[i * 4 + 2];
        v4 = new_indices[i * 4 + 3];
        if (new_indices[i * 4 + 3])
            vnum_count = 6;
        else
            vnum_count = 3;
        for (j = 0; j < vnum_count; j++) {
            ver_tri_ind = new_indices[i * 4 + t_indices[j]];
            tri_tnb_shad[tnb_shad_counter] = shade_tang_buff[ver_tri_ind * 3];
            tri_tnb_shad[tnb_shad_counter + 1] = shade_tang_buff[ver_tri_ind * 3 + 1];
            tri_tnb_shad[tnb_shad_counter + 2] = shade_tang_buff[ver_tri_ind * 3 + 2];
            tnb_shad_counter += 3;
        }
    }

    free(lnormals);
    free(indices);
    free(new_indices);
    free(tang); free(no);
    free(vert_tang_buff); free(shade_tang_buff);

    return tri_tnb_shad;
}

void triangulate_mesh(struct MeshData *mesh_data, Mesh *mesh, int mat_index, 
        int disab_flat, int edited_normals, int tnb_shading)
{
    // TODO: divide
    MFace *mface = mesh->mface;
    MVert *mvert = mesh->mvert;
    MPoly *mpoly = mesh->mpoly;
    MLoop *mloop = mesh->mloop;

    int not_done, face_len;
    int *vcol_uv_indices = NULL;

    float *tri_pos = NULL;
    float *tri_norm = NULL;
    float *tri_tco = NULL;
    float *tri_grp = NULL;
    float *tri_col = NULL;
    float *tri_tnb_shad = NULL;

    int is_flat = 0;
    int vnum = 0, vnum_count;
    int *v_indices = malloc(6 * sizeof(int));

    int frame_size, tri_frame_size;
    int frame_offset, tri_frame_offset;
    int vert_offset;
    int face_offset = 0;

    int tcoface_offset = 0;
    int tri_tco_layer_size = 0;
    int tco_layer_size = 0;
    int tco_layer_offset = 0, tri_tco_layer_offset = 0;
    int tco_vert_offset = 0, tri_tco_vert_offset = 0;

    int group_size, tri_group_size;
    int group_offset, tri_group_offset;
    int group_vert_offset;
    int group_face_offset = 0;

    int col_layer_size, tri_color_layer_size;
    int layer_offset, tri_color_layer_offset;
    int color_vert_offset, tri_color_vert_offset;
    int color_face_offset = 0;
    short (*split_normals)[4][3] = NULL;

    int i,j,k,l;

    float *no = falloc(3);

    // NOTE: use origindex (if exist) for better color/uv extraction
    if (mesh_data->origindex != NULL)
        vcol_uv_indices = malloc(6 * sizeof(int));

    if (edited_normals || tnb_shading)
        split_normals = custom_data_get_layer(&mesh->fdata, CD_TESSLOOPNORMAL);

    // NOTE: get triangulated sizes

    for (i = 0; i < mesh->totface; i++) {
        if (mat_index != -1 && mface[i].mat_nr != mat_index)
            continue;
        if (mface[i].v4)
            vnum += 6;
        else
            vnum += 3;
    }

    frame_size = mesh_data->base_length * 3;
    tri_frame_size = vnum * 3;
    group_size = mesh_data->base_length;
    tri_group_size = vnum;

    // NOTE: use origindex (if exist) for better color extraction
    if (mesh_data->origindex != NULL) {
        col_layer_size = mesh->totloop * COL_NUM_COMP;
        tco_layer_size = mesh->totloop * TCO_NUM_COMP;
    } else {
        col_layer_size = mesh_data->base_length * COL_NUM_COMP;
        tco_layer_size = mesh_data->base_length * TCO_NUM_COMP;
    }

    tri_color_layer_size = vnum * COL_NUM_COMP;
    tri_tco_layer_size = vnum * TCO_NUM_COMP;

    tri_pos = falloc(vnum * mesh_data->frames * 3);
    tri_norm = falloc(vnum * mesh_data->frames * 3);

    if (mesh_data->tco_exported_count > 0)
        tri_tco = falloc(vnum * TCO_NUM_COMP * mesh_data->tco_exported_count);
    
    if (mesh_data->groups_num > 0)
        tri_grp = falloc(vnum * mesh_data->groups_num);
    if (mesh_data->col_layers_count)
        tri_col = falloc(vnum * mesh_data->col_layers_count * COL_NUM_COMP);


    // NOTE: get triangulated data
    for (i = 0; i < mesh->totface; i++) {
        if (mat_index != -1 && mface[i].mat_nr != mat_index)
            continue;

        v_indices[0] = mface[i].v1;
        v_indices[1] = mface[i].v2;
        v_indices[2] = mface[i].v3;

        if (mface[i].v4) {
            v_indices[3] = mface[i].v1;
            v_indices[4] = mface[i].v3;
            v_indices[5] = mface[i].v4;
            vnum_count = 6;
        } else
            vnum_count = 3;

        is_flat = (int)(mesh_data->frames == 1 && !(mface[i].flag & ME_SMOOTH) 
                && !disab_flat);

        // positions and normals
        for (j = 0; j < mesh_data->frames; j++) {
            for (k = 0; k < vnum_count; k++) {
                tri_frame_offset = j * tri_frame_size;
                frame_offset = j * frame_size;
                vert_offset = v_indices[k] * 3;

                tri_pos[tri_frame_offset + face_offset + k * 3] 
                        = mesh_data->pos[frame_offset + vert_offset];
                tri_pos[tri_frame_offset + face_offset + k * 3 + 1] 
                        = mesh_data->pos[frame_offset + vert_offset + 1];
                tri_pos[tri_frame_offset + face_offset + k * 3 + 2] 
                        = mesh_data->pos[frame_offset + vert_offset + 2];

                if (edited_normals && split_normals) {
                    int l = k;
                    if (k > 2) {
                        switch (k) {
                        case 3:
                            l = 0;
                            break;
                        case 4:
                            l = 2;
                            break;
                        case 5:
                            l = 3;
                        }
                    }

                    tri_norm[tri_frame_offset + face_offset + k * 3] = split_normals[i][l][0]* (1.0f / 32767.0f);
                    tri_norm[tri_frame_offset + face_offset + k * 3 + 1] = split_normals[i][l][1]* (1.0f / 32767.0f);
                    tri_norm[tri_frame_offset + face_offset + k * 3 + 2] = split_normals[i][l][2]* (1.0f / 32767.0f);

                } else {
                    if (!is_flat) {
                        tri_norm[tri_frame_offset + face_offset + k * 3]
                                = mesh_data->nor[frame_offset + vert_offset];
                        tri_norm[tri_frame_offset + face_offset + k * 3 + 1]
                                = mesh_data->nor[frame_offset + vert_offset + 1];
                        tri_norm[tri_frame_offset + face_offset + k * 3 + 2]
                                = mesh_data->nor[frame_offset + vert_offset + 2];
                    } else {
                        calc_face_normal(mface[i], mvert, no);
                        tri_norm[tri_frame_offset + face_offset + k * 3] = no[0];
                        tri_norm[tri_frame_offset + face_offset + k * 3 + 1] = no[1];
                        tri_norm[tri_frame_offset + face_offset + k * 3 + 2] = no[2];
                    }
                }
            }
        }
        face_offset += vnum_count * 3;

        // vertex groups
        for (j = 0; j < mesh_data->groups_num; j++) {
            tri_group_offset = tri_group_size * j;
            group_offset = group_size * j;
            for (k = 0; k < vnum_count; k++) {
                group_vert_offset = v_indices[k];
                tri_grp[tri_group_offset + group_face_offset + k] = 
                        mesh_data->grp[group_offset + group_vert_offset];
            }
        }
        group_face_offset += vnum_count;

        // NOTE: use origindex (if exist) for better color/uv extraction
        if (mesh_data->origindex != NULL) {
            vcol_uv_indices = malloc(6 * sizeof(int));
            face_len = mface[i].v4 ? 4 : 3;

            for (j = mpoly[mesh_data->origindex[i]].loopstart, not_done = face_len; 
                    not_done; j++) {
                if (mloop[j].v == mface[i].v1) {
                    vcol_uv_indices[0] = j;
                    not_done--;
                }
                else if (mloop[j].v == mface[i].v2) {
                    vcol_uv_indices[1] = j;
                    not_done--;
                }
                else if (mloop[j].v == mface[i].v3) {
                    vcol_uv_indices[2] = j;
                    not_done--;
                }
                else if (face_len == 4 && mloop[j].v == mface[i].v4) {
                    vcol_uv_indices[3] = j;
                    not_done--;
                }
            }
            if (face_len == 4) {
                vcol_uv_indices[5] = vcol_uv_indices[3];
                vcol_uv_indices[3] = vcol_uv_indices[0];
                vcol_uv_indices[4] = vcol_uv_indices[2];
            }
        } else
            vcol_uv_indices = v_indices;

        // texture coordinates
        for (j = 0; j < mesh_data->tco_exported_count; j++) {
            tri_tco_layer_offset = tri_tco_layer_size * j;
            tco_layer_offset = tco_layer_size * j;
            for (k = 0; k < vnum_count; k++) {
                tri_tco_vert_offset = k * TCO_NUM_COMP;
                tco_vert_offset = vcol_uv_indices[k] * TCO_NUM_COMP;
                for (l = 0; l < TCO_NUM_COMP; l++)
                    tri_tco[tri_tco_layer_offset + tcoface_offset + tri_tco_vert_offset + l] 
                            = mesh_data->tco[tco_layer_offset + tco_vert_offset + l];
            }
        }
        tcoface_offset += vnum_count * TCO_NUM_COMP;

        // colors layers
        for (j = 0; j < mesh_data->col_layers_count; j++) {
            tri_color_layer_offset = tri_color_layer_size * j;
            layer_offset = col_layer_size * j;
            for (k = 0; k < vnum_count; k++) {
                color_vert_offset = vcol_uv_indices[k] * COL_NUM_COMP;
                tri_color_vert_offset = k * COL_NUM_COMP;
                for (l = 0; l < COL_NUM_COMP; l++)
                    tri_col[tri_color_layer_offset + color_face_offset + 
                            tri_color_vert_offset + l] 
                            = mesh_data->col[layer_offset + color_vert_offset + l];
            }
        }
        color_face_offset += vnum_count * COL_NUM_COMP;
    }

    if (tnb_shading && split_normals)
        tri_tnb_shad = calc_tri_shade_tans(mesh, split_normals, mat_index);

    free(mesh_data->pos);
    free(mesh_data->nor);
    free(mesh_data->grp);
    free(mesh_data->col);
    free(mesh_data->tco);
    free(mesh_data->shade_tangs);

    mesh_data->pos = tri_pos;
    mesh_data->nor = tri_norm;
    mesh_data->grp = tri_grp;
    mesh_data->col = tri_col;
    mesh_data->tco = tri_tco;
    mesh_data->base_length = vnum;
    mesh_data->shade_tangs = tri_tnb_shad;
}

float *optimize_vertex_colors(struct SubmeshData *data, unsigned int *channels_presence) {
    float *optimized_colors = NULL;
    int i, j, k, counter = 0;
    int optimized_colors_size;

    if (data->col) {
        optimized_colors_size = get_optimized_channels_total(channels_presence, 
                data->col_layers) * data->vnum;
        optimized_colors = falloc(optimized_colors_size);

        for (i = 0; i < data->col_layers; i++)
            for (j = 0; j < data->vnum; j++)
                for (k = 0; k < 3; k++)
                    if (channels_presence[i * 3 + k]) {
                        optimized_colors[counter] = data->col[(i * data->vnum + j) 
                                * 3 + k];
                        counter++;
                    }
    }

    return optimized_colors;
}


/* **************** COMBINE FUNCTIONS ********************* */

int get_num_faces_cb(const SMikkTSpaceContext *ctx)
{
    return ((struct TBNCalcData*)ctx->m_pUserData)->vnum / 3;
}

int get_num_vertices_of_face_cb(const SMikkTSpaceContext *ctx, const int iFace)
{
    /* Always use triangulated faces */
    return 3;
}

void get_position_cb(const SMikkTSpaceContext *ctx, float fvPosOut[],
        const int iFace, const int iVert)
{
    int offset = POS_NUM_COMP * (iFace*3 + iVert);
    float *pos = ((struct TBNCalcData*)ctx->m_pUserData)->pos;

    fvPosOut[0] = pos[offset];
    fvPosOut[1] = pos[offset+1];
    fvPosOut[2] = pos[offset+2];
}

void get_normal_cb(const SMikkTSpaceContext *ctx, float fvNormOut[],
        const int iFace, const int iVert)
{
    int offset = NOR_NUM_COMP * (iFace*3 + iVert);
    float *nor = ((struct TBNCalcData*)ctx->m_pUserData)->nor;

    fvNormOut[0] = nor[offset];
    fvNormOut[1] = nor[offset+1];
    fvNormOut[2] = nor[offset+2];
}

void get_tex_coord_cb(const SMikkTSpaceContext *ctx, float fvTexcOut[],
        const int iFace, const int iVert)
{
    int offset = TCO_NUM_COMP * (iFace*3 + iVert);
    float *tco = ((struct TBNCalcData*)ctx->m_pUserData)->tco0;

    fvTexcOut[0] = tco[offset];
    fvTexcOut[1] = tco[offset+1];
}

void set_tspace_basic_cb(const SMikkTSpaceContext *ctx, const float fvTangent[],
        const float fSign, const int iFace, const int iVert)
{
    int offset = TAN_NUM_COMP * (iFace*3 + iVert);
    float *tan = ((struct TBNCalcData*)ctx->m_pUserData)->tan;

    *(tan + offset) = fvTangent[0];
    *(tan + offset + 1) = fvTangent[1];
    *(tan + offset + 2) = fvTangent[2];
    *(tan + offset + 3) = fSign;
}

void calc_tang_space(struct TBNCalcData *tbn_data)
{
    SMikkTSpaceInterface in;
    SMikkTSpaceContext ctx;

    /* do nothing */
    if (!tbn_data->tco0)
        return;

    in.m_getNumFaces = &get_num_faces_cb;
    in.m_getNumVerticesOfFace = &get_num_vertices_of_face_cb;
    in.m_getPosition = &get_position_cb;
    in.m_getNormal = &get_normal_cb;
    in.m_getTexCoord = &get_tex_coord_cb;
    in.m_setTSpaceBasic = &set_tspace_basic_cb;
    in.m_setTSpace = NULL;

    ctx.m_pInterface = &in;
    ctx.m_pUserData = tbn_data;

    genTangSpaceDefault(&ctx);
}

/**
 * Store partitioned input array in shared interleaved output vertex array.
 * offset,stride,ncomp in floats
 *
 * ncomp floats per vertex in input array (for 1 frame)
 * offset,stride floats per vertex in output array (for all frames)
 *
 * part/frame,vertex,ncomp -> vertex,type,part/frame,ncomp
 *
 * [v0pf0,v1pf0,v2pf0,......v0pf1,...],...[v0nf0...]... ->
 * [v0pf0,v0pf1,...v0nf0,v0nf1,...v0tf0,v0tf1,......v1pf0,...]
 */
bool va_store(float *in, float *out, int partitions, int offset, int stride, int vnum, int ncomp)
{
    int i, j, k;
    float val;
    bool result = true;

    if (!in)
        return result;

    for (i = 0; i < partitions; i++)
        for (j = 0; j < vnum; j++)
            for (k = 0; k < ncomp; k++) 
            {
                val = in[(vnum * i + j) * ncomp + k];
                if (!isnan(val))
                {
                    out[stride * j + offset + i * ncomp + k] = val;
                }
                else
                {
                    out[stride * j + offset + i * ncomp + k] = 0.0;
                    result = false;
                }
            }
    return result;
}
/**
 * Extract output array from shared interleaved input vertex array.
 * see va_store
 */
void va_extract(float *in, float *out, int partitions, int offset, int stride, int vnum, int ncomp)
{
    int i, j, k;

    if (!out)
        return;

    for (i = 0; i < partitions; i++)
        for (j = 0; j < vnum; j++)
            for (k = 0; k < ncomp; k++)
                out[(vnum * i + j) * ncomp + k] =
                        in[stride * j + offset + i * ncomp + k];
}

/**
 * Allocate memory for submesh arrays.
 * vnum, frames, grp_num, col_layers, inum must be initialized
 */
void allocate_submesh(struct SubmeshData *data, int use_normals, int use_tangents,
        int use_shade_tnb)
{
    data->pos = malloc(POS_NUM_COMP * data->frames * data->vnum * sizeof(float));
    if (use_normals)
        data->nor = malloc(NOR_NUM_COMP * data->frames * data->vnum * sizeof(float));
    else
        data->nor = NULL;

    if (use_tangents)
        data->tan = malloc(TAN_NUM_COMP * data->frames * data->vnum * sizeof(float));
    else
        data->tan = NULL;

    if (data->tco_layers)
        data->tco = malloc(TCO_NUM_COMP * data->tco_layers * data->vnum * sizeof(float));
    else
        data->tco = NULL;

    if (use_shade_tnb)
        data->shade_tangs = malloc(SHADE_TNB_NUM_COMP * data->vnum * sizeof(float));
    else
        data->shade_tangs = NULL;

    if (data->grp_num)
        data->grp = malloc(GRP_NUM_COMP * data->grp_num * data->vnum * sizeof(float));
    else
        data->grp = NULL;

    if (data->col_layers)
        data->col = malloc(COL_NUM_COMP * data->col_layers * data->vnum * sizeof(float));
    else
        data->col = NULL;

    if (data->inum)
        data->indices = malloc(data->inum * sizeof(int));
    else
        data->indices = NULL;
}
/**
 * Release submesh arrays memory
 */
void free_submesh(struct SubmeshData *data)
{
    /* NULL is valid */

    free(data->pos);
    free(data->nor);
    free(data->tan);
    free(data->tco);
    free(data->grp);
    free(data->col);
    free(data->indices);
}

int find_larg_num(int *array, int size)
{
    int i, larg_num = -1;
    for(i = 0; i < size; i++){
        if(array[i] > larg_num)
            larg_num = array[i];
    }
    return larg_num;
}

void radix_sort(int *array, int size)
{
    int i;
    int *semi_sorted = malloc(size * sizeof(int));
    int sig_digit = 1;
    int larg_num = find_larg_num(array, size);
    while (larg_num / sig_digit > 0) {
        int bucket[10] = { 0 };
        for (i = 0; i < size; i++)
            bucket[(array[i] / sig_digit) % 10]++;
        for (i = 1; i < 10; i++)
            bucket[i] += bucket[i - 1];
        for (i = size - 1; i >= 0; i--)
            semi_sorted[--bucket[(array[i] / sig_digit) % 10]] = array[i];
        for (i = 0; i < size; i++)
            array[i] = semi_sorted[i];
        sig_digit *= 10;
    }
    free(semi_sorted);
}

int *find_uniq_verts(int *vertices, int *vert_num, int len)
{
    int i, *uniq_vertices, ind = 1, num = 1;
    int *sorted_vert = malloc(len * sizeof(int));
    memcpy(sorted_vert, vertices, len * sizeof(int));
    radix_sort(sorted_vert, len);
    for (i = 1; i < len; i++)
        if (sorted_vert[i] != sorted_vert[i-1])
            num++;
    uniq_vertices = malloc(num * sizeof(int));
    uniq_vertices[0] = sorted_vert[0];
    for (i = 1; i < len; i++)
        if (sorted_vert[i] != sorted_vert[i-1]) {
            uniq_vertices[ind] = sorted_vert[i];
            ind++;
        }
    free(sorted_vert);
    *vert_num = num;
    return uniq_vertices;
}

void replace_indices(int *vertices, int *uniq_vertices, int vert_len, int uniq_vert_len)
{
    int i, j, curr_vert;
    for (i = 0; i < uniq_vert_len; i++) {
        curr_vert = uniq_vertices[i];
        for (j = 0; j < vert_len; j++)
            if (vertices[j] == curr_vert)
                vertices[j] = i;
    }
}

void restore_indices(int *vertices, int *uniq_vertices, int vert_len, int uniq_vert_len)
{
    int i, j, curr_vert;
    for (i = uniq_vert_len - 1; i >= 0; i--) {
        curr_vert = uniq_vertices[i];
        for (j = 0; j < vert_len; j++)
            if (vertices[j] == i)
                vertices[j] = curr_vert;
    }
}
/**
 * Sort face indices for optimal usage of GPU cache.
 * Indices is separated on chunks, each chunk is sorted independently.
 */
void optimize_faces(int *indices, int ind_len, int vnum)
{
    int chunk_num, last_chunk_len, offset, len, vert_num, i;
    int *chunk_index_list, *new_chunk_index_list, *new_index_list = NULL,
         *uniq_vertices = NULL;

    new_index_list = malloc(ind_len * sizeof(int));
    chunk_num = ind_len / MAX_IND_PART_SIZE;
    if (chunk_num) {
        last_chunk_len = ind_len % MAX_IND_PART_SIZE;
        if (last_chunk_len)
            chunk_num++;
        chunk_index_list = malloc(MAX_IND_PART_SIZE * sizeof(int));
        new_chunk_index_list = malloc(MAX_IND_PART_SIZE * sizeof(int));
        len = MAX_IND_PART_SIZE;
        for (i = 0; i < chunk_num; i++) {
            offset = i * MAX_IND_PART_SIZE;
            if (last_chunk_len && i == chunk_num - 1)
                len = last_chunk_len;
            memcpy(chunk_index_list, indices + offset, len * sizeof(int));
            uniq_vertices = find_uniq_verts(chunk_index_list, &vert_num, len);
            replace_indices(chunk_index_list, uniq_vertices, len, vert_num);
            OptimizeFaces(chunk_index_list, len, vert_num, new_chunk_index_list,
                    VIDEO_CACHE_SIZE);
            restore_indices(new_chunk_index_list, uniq_vertices, len, vert_num);
            memcpy(new_index_list + offset, new_chunk_index_list,
                    len * sizeof(int));
            free(uniq_vertices);
        }
        free(chunk_index_list);
        free(new_chunk_index_list);
    } else
        OptimizeFaces(indices, ind_len, vnum, new_index_list, VIDEO_CACHE_SIZE);

    for (i = 0; i < ind_len; i++)
        indices[i] = new_index_list[i];

    free(new_index_list);
}

int weld_submesh(struct SubmeshData *src, struct SubmeshData *dst) {

    int i, offset;
    bool va_store_status;

    /* floats per type - offset */
    int pos_floats = POS_NUM_COMP * src->frames;
    int nor_floats = src->nor ? NOR_NUM_COMP * src->frames : 0;
    int tan_floats = src->tan ? TAN_NUM_COMP * src->frames : 0;
    int tco_floats = src->tco ? TCO_NUM_COMP * src->tco_layers : 0;
    int shade_tnb_floats = src->shade_tangs ? SHADE_TNB_NUM_COMP : 0;

    int grp_floats = src->grp ? GRP_NUM_COMP * src->grp_num : 0;
    int col_floats = src->col ? COL_NUM_COMP * src->col_layers : 0;

    /* floats per vertex - stride */
    int fpv = pos_floats + nor_floats + tan_floats + tco_floats + grp_floats 
            + col_floats + shade_tnb_floats;

    float *vdata_in = falloc(fpv * src->vnum);
    float *vdata_out = falloc(fpv * src->vnum);
    int *remap_table = malloc(sizeof(int) * src->vnum);
    int status = 0;

    offset = 0;
    va_store_status = va_store(src->pos, vdata_in, src->frames, offset, fpv, src->vnum, POS_NUM_COMP);
    if (!va_store_status)
        status = POS_ERR;
    offset += pos_floats;
    va_store_status = va_store(src->nor, vdata_in, src->frames, offset, fpv, src->vnum, NOR_NUM_COMP);
    if (!va_store_status)
        status = NOR_ERR;
    offset += nor_floats;
    va_store_status = va_store(src->tan, vdata_in, src->frames, offset, fpv, src->vnum, TAN_NUM_COMP);
    if (!va_store_status)
        status = TAN_ERR;
    offset += tan_floats;
    va_store_status = va_store(src->tco, vdata_in, src->tco_layers, offset, fpv, src->vnum, TCO_NUM_COMP);
    if (!va_store_status)
        status = TCO_ERR;
    offset += tco_floats;
    va_store_status = va_store(src->shade_tangs, vdata_in, 1, offset, fpv, src->vnum, SHADE_TNB_NUM_COMP);
    if (!va_store_status)
        status = SHADE_TNB_ERR;
    offset += shade_tnb_floats;
    va_store_status = va_store(src->grp, vdata_in, src->grp_num, offset, fpv, src->vnum, GRP_NUM_COMP);
    if (!va_store_status)
        status = GRP_ERR;
    offset += grp_floats;
    va_store_status = va_store(src->col, vdata_in, src->col_layers, offset, fpv, src->vnum, COL_NUM_COMP);
    if (!va_store_status)
        status = COL_ERR;

    /* store submesh in input array */
    assert(offset + col_floats == fpv);
    dst->vnum = WeldMesh(remap_table, vdata_out, vdata_in, src->vnum, fpv);
    dst->frames = src->frames;
    dst->grp_num = src->grp_num;
    dst->col_layers = src->col_layers;
    dst->tco_layers = src->tco_layers;
    dst->inum = src->vnum;

    allocate_submesh(dst, nor_floats, tan_floats, shade_tnb_floats);
    /* extract submesh from output array */
    offset = 0;
    va_extract(vdata_out, dst->pos, dst->frames, offset, fpv, dst->vnum, POS_NUM_COMP);

    offset += pos_floats;
    va_extract(vdata_out, dst->nor, dst->frames, offset, fpv, dst->vnum, NOR_NUM_COMP);

    offset += nor_floats;
    va_extract(vdata_out, dst->tan, dst->frames, offset, fpv, dst->vnum, TAN_NUM_COMP);

    offset += tan_floats;
    va_extract(vdata_out, dst->tco, src->tco_layers, offset, fpv, dst->vnum, TCO_NUM_COMP);

    offset += tco_floats;
    va_extract(vdata_out, dst->shade_tangs, 1, offset, fpv, dst->vnum, SHADE_TNB_NUM_COMP);

    offset += shade_tnb_floats;
    va_extract(vdata_out, dst->grp, dst->grp_num, offset, fpv, dst->vnum, GRP_NUM_COMP);

    offset += grp_floats;
    va_extract(vdata_out, dst->col, dst->col_layers, offset, fpv, dst->vnum, COL_NUM_COMP);

    assert(offset + col_floats == fpv);

    /* store indices */
    for (i = 0; i < src->vnum; i++)
        dst->indices[i] = remap_table[i];

    optimize_faces(dst->indices, dst->inum, dst->vnum);

    return status;
}

static PyObject *calc_submesh_empty(void) {
    char *empty_str = "";
    PyObject *empty_buff;
    PyObject *result;

    empty_buff = PyByteArray_FromStringAndSize(empty_str, 0);
    result = PyDict_New();

    PyDict_SetItemString(result, "base_length", PyLong_FromLong(0));

    PyDict_SetItemString(result, "indices", empty_buff);
    PyDict_SetItemString(result, "position", empty_buff);
    PyDict_SetItemString(result, "normal", empty_buff);
    PyDict_SetItemString(result, "status", empty_buff);
    PyDict_SetItemString(result, "tangent", empty_buff);
    PyDict_SetItemString(result, "texcoord", empty_buff);
    PyDict_SetItemString(result, "color", empty_buff);
    PyDict_SetItemString(result, "group", empty_buff);
    PyDict_SetItemString(result, "shade_tangs", empty_buff);

    return result;
}

/**
 * vnum - number of vertices per frame
 *
 * Vertex array format for pos,nor,tan:
 * [v0,v1,v2, ... v0,v1,v2, ...]
 *  --------      --------
 *  frame 0   ... frame 1
 *
 *  pos vertex - XYZ
 *  nor vertex - XYZ
 *  tan vertex - XYZS
 *
 * Vertex array format for tco
 * [v0uv_layer0, v1uv_layer0, ... v0uv_layer1, v1uv_layer1, ...]
 *
 * Vertex array format for grp:
 * [v0gr0, v1gr0, v2gr0, ... v0gr1, v1gr1, v2gr1, ...] 
 *
 * Vertex array format for col:
 * [v0rgb_layer0, v1rgb_layer0, ... v0rgb_layer1, v1rgb_layer1, ...]
 */
static PyObject *calc_submesh(struct MeshData *mesh_data, int arr_to_str, 
        int grp_to_str, int shape_keys) {

    struct TBNCalcData tbn_data;
    struct SubmeshData src;
    struct SubmeshData dst;

    float *tan_frames;

    float *pos;
    float *nor;
    float *tan;

    short *nor_short = NULL;
    short *tan_short = NULL;
    unsigned short *grp_ushort = NULL;
    unsigned char *col_uchar = NULL;

    int i;
    int nor_needed;
    int tan_needed;
    int length, status;

    PyObject *result;
    PyObject *bytes_buff;

    result = calc_submesh_empty();

    if (!mesh_data->base_length || ( sizeof(mesh_data->pos) / sizeof(float) 
            / POS_NUM_COMP) % mesh_data->base_length)
        return result;

    nor_needed = mesh_data->nor ? 1 : 0;
    tan_needed = mesh_data->tco_exported_count ? nor_needed : 0;

    if (tan_needed) {
        tan_frames = falloc(TAN_NUM_COMP * mesh_data->base_length * 
                mesh_data->frames);

        for (i = 0; i < mesh_data->frames; i++) {
            pos = mesh_data->pos + mesh_data->base_length * POS_NUM_COMP * i;
            nor = mesh_data->nor + mesh_data->base_length * NOR_NUM_COMP * i;
            tan = tan_frames + mesh_data->base_length * TAN_NUM_COMP * i;

            tbn_data.vnum = mesh_data->base_length;
            tbn_data.pos = pos;
            tbn_data.nor = nor;

            // pointer to the whole data, but need only the first layer
            tbn_data.tco0 = mesh_data->tco;

            tbn_data.tan = tan;

            calc_tang_space(&tbn_data);
        }
    } else
        tan_frames = NULL;

    src.vnum = mesh_data->base_length;
    src.frames = mesh_data->frames;

    src.pos = mesh_data->pos;
    src.nor = mesh_data->nor;
    src.tan = tan_frames;

    src.tco = mesh_data->tco;
    src.tco_layers = mesh_data->tco_exported_count;

    src.shade_tangs = mesh_data->shade_tangs;

    src.grp = mesh_data->grp;
    src.grp_num = mesh_data->groups_num;

    src.col = mesh_data->col;
    src.col_layers = mesh_data->col_layers_count;

    src.indices = NULL;
    src.inum = 0;

    src.relatives = mesh_data->relatives;
    src.vg_indices = mesh_data->vg_indices;

    if (shape_keys)
        calculate_shape_keys_delta(&src);

    status = weld_submesh(&src, &dst);

    PyDict_SetItemString(result, "base_length", PyLong_FromLong(dst.vnum));

    bytes_buff = PyByteArray_FromStringAndSize((char *)dst.indices, 
            dst.inum * sizeof(int));
    PyDict_SetItemString(result, "indices", bytes_buff);

    bytes_buff = PyByteArray_FromStringAndSize((char *)dst.pos, 
            dst.vnum * dst.frames * POS_NUM_COMP * sizeof(float));
    PyDict_SetItemString(result, "position", bytes_buff);

    bytes_buff = PyByteArray_FromStringAndSize((char *)&status, sizeof(int));
        PyDict_SetItemString(result, "status", bytes_buff);

    if (dst.nor) {
        length = dst.vnum * dst.frames * NOR_NUM_COMP;
        nor_short = shalloc(length);
        buffer_float_to_short(dst.nor, nor_short, length);

        bytes_buff = PyByteArray_FromStringAndSize((char *)nor_short, 
                length * sizeof(short));
        PyDict_SetItemString(result, "normal", bytes_buff);
    }
    if (dst.tan) {
        length = dst.vnum * dst.frames * TAN_NUM_COMP;
        tan_short = shalloc(length);
        buffer_float_to_short(dst.tan, tan_short, length);

        bytes_buff = PyByteArray_FromStringAndSize((char *)tan_short, 
                length * sizeof(short));
        PyDict_SetItemString(result, "tangent", bytes_buff);
    }
    if (dst.tco) {
        bytes_buff = PyByteArray_FromStringAndSize((char *)dst.tco, 
                dst.tco_layers * dst.vnum * TCO_NUM_COMP * sizeof(float));
        PyDict_SetItemString(result, "texcoord", bytes_buff);
    }
    if (dst.grp) {
        length = dst.vnum * mesh_data->groups_num * GRP_NUM_COMP;
        grp_ushort = (unsigned short *)shalloc(length);
        buffer_float_to_ushort(dst.grp, grp_ushort, length);

        bytes_buff = PyByteArray_FromStringAndSize((char *)grp_ushort, 
                length * sizeof(short));
        PyDict_SetItemString(result, "group", bytes_buff);
    }
    if (dst.shade_tangs) {
        bytes_buff = PyByteArray_FromStringAndSize((char *)dst.shade_tangs, 
                dst.vnum * SHADE_TNB_NUM_COMP * sizeof(float));
        PyDict_SetItemString(result, "shade_tangs", bytes_buff);
    }

    if (dst.col) {
        if (mesh_data->need_vcol_optimization) {
            float *optimized_vcols = optimize_vertex_colors(&dst, 
                    mesh_data->channels_presence);

            length = dst.vnum * get_optimized_channels_total(
                    mesh_data->channels_presence, dst.col_layers);
            col_uchar = ucalloc(length);
            buffer_float_to_uchar(optimized_vcols, col_uchar, length);
        } else {
            length = dst.vnum * mesh_data->col_layers_count * COL_NUM_COMP;
            col_uchar = ucalloc(length);
            buffer_float_to_uchar(dst.col, col_uchar, length);
        }

        bytes_buff = PyByteArray_FromStringAndSize((char *)col_uchar, 
                length * sizeof(unsigned char));
        PyDict_SetItemString(result, "color", bytes_buff);
    }
    /* cleanup */
    free(tan_frames);
    free(mesh_data->pos);
    free(mesh_data->nor);
    free(mesh_data->tco);
    free(mesh_data->grp);
    free(mesh_data->col);
    free(mesh_data->channels_presence);
    free(mesh_data->shade_tangs);
    if (shape_keys) {
        free(mesh_data->relatives);
        free(mesh_data->vg_indices);
    }

    Py_XDECREF(bytes_buff);

    free_submesh(&dst);

    return result;
}

void find_max_min_bb(struct BoundingData *bdata, float x, float y, float z) {
    bdata->max_x = MAX(bdata->max_x, x);
    bdata->max_y = MAX(bdata->max_y, y);
    bdata->max_z = MAX(bdata->max_z, z);
    bdata->min_x = MIN(bdata->min_x, x);
    bdata->min_y = MIN(bdata->min_y, y);
    bdata->min_z = MIN(bdata->min_z, z);
}

float calc_canonical_mat_error(float m[])
{
    return sqrt(m[1] * m[1] + m[2] * m[2] + m[5] * m[5]);
}

void mat3_copy(float *matrix, float *out)
{
    for (int i = 0; i < 9; i++)
        out[i] = matrix[i];
}

void mat3_identity(float *matrix)
{
    matrix[0] = matrix[4] = matrix[8] = 1.0;
    matrix[1] = matrix[2] = matrix[3] = matrix[5] = matrix[6] = matrix[7] = 0.0;
}

void mat3_transpose(float m[], float *out)
{
    out[0] = m[0];
    out[1] = m[3];
    out[2] = m[6];
    out[3] = m[1];
    out[4] = m[4];
    out[5] = m[7];
    out[6] = m[2];
    out[7] = m[5];
    out[8] = m[8];
}

void mat3_multiply(float a[], float b[], float *out)
{
    float a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

void mat3_invert(float a[], float *out)
{
    float a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,


        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return; 
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
}

void find_elem_rotation_matrix(float m[], float *dest)
{
    float max = m[1], fi;
    int ind = 1, i, ii, jj;

    for (i = 2; i < 9; i++) {
        if (i != 4 && i!= 8 && fabs(m[i]) > fabs(max)) {
            max = m[i];
            ind = i;
        }
    }
    ii = ind / 3;
    jj = ind % 3;
    fi = 0.5 * atan(2 * max / (m[ii * 3 + ii] - m[jj * 3 + jj]));

    for (i = 0; i < 9; i++)
        if (i == 0 || i == 4 || i == 8)
            dest[i] = 1.0;
        else
            dest[i] = 0.0;
    dest[jj + ii * 3] = - sin(fi);
    dest[ii + jj * 3] = sin(fi);
    dest[ii + ii * 3] = cos(fi);
    dest[jj + jj * 3] = cos(fi);
}

void find_eigenvectors(float mat[], float err, float *dest)
{
    int counter = 1;
    float matrix[9], rot_matrix[9], rot_matrix_t[9], mat3_tmp[9];

    mat3_copy(mat, matrix);
    if (calc_canonical_mat_error(matrix) < err) {
        mat3_identity(dest);
        return;
    }

    find_elem_rotation_matrix(matrix, rot_matrix);
    mat3_transpose(rot_matrix, rot_matrix_t);
    mat3_multiply(matrix, rot_matrix_t, mat3_tmp);
    mat3_multiply(rot_matrix, mat3_tmp, matrix);
    mat3_copy(rot_matrix, dest);
    
    while(err < calc_canonical_mat_error(matrix) && counter < MAX_ITER_NUM) {
        find_elem_rotation_matrix(matrix, rot_matrix);
        mat3_transpose(rot_matrix, rot_matrix_t);
        mat3_multiply(matrix, rot_matrix_t, mat3_tmp);
        mat3_multiply(rot_matrix, mat3_tmp, matrix);
        mat3_multiply(rot_matrix, dest, dest);
        counter++;
    }
}

void transform_vec3_by_mat3(float v[], float m[], float *out)
{
    float x = v[0], y = v[1], z = v[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
}

void calc_bounding_data(struct BoundingData *bdata, Mesh *mesh, int mat_index) {
    int i,j;
    int v1, v2, v3, v4, v, num_vert = 0;
    float x,y,z;
    float x_width;
    float y_width;
    float z_width;
    float scen_dist;
    float ccen_dist;
    float g[3];
    float cov_matrix[9], t_mat[9], average_pos[3], mat3_tmp[9], point[3], xm, ym, zm;
    float scale_matrix[9];
    float max_dot_x, min_dot_x, max_dot_y, min_dot_y, max_dot_z, min_dot_z;
    float a,b,c, max_x = 0, max_y = 0, max_z = 0, min_x = 0, min_y = 0, min_z = 0, r;
    float x1, x2, x3, x4, y1, y2, y3, y4, z1, z2, z3, z4;
    MVert *vertices;
    MFace *mface = mesh->mface;

    memset(cov_matrix, 0, 9 * sizeof(int));
    memset(average_pos, 0, 3 * sizeof(int));
    if (mesh->totvert > 0) {
        vertices = mesh->mvert;

        // NOTE: rotate by 90 degrees around X axis
        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            v1 = mface[i].v1;
            bdata->max_x = isnan(vertices[v1].co[0]) ? 0.0 : vertices[v1].co[0];
            bdata->min_x = isnan(vertices[v1].co[0]) ? 0.0 : vertices[v1].co[0];
            bdata->max_y = isnan(vertices[v1].co[1]) ? 0.0 : vertices[v1].co[1];
            bdata->min_y = isnan(vertices[v1].co[1]) ? 0.0 : vertices[v1].co[1];
            bdata->max_z = isnan(vertices[v1].co[2]) ? 0.0 : vertices[v1].co[2];
            bdata->min_z = isnan(vertices[v1].co[2]) ? 0.0 : vertices[v1].co[2];
            break;
        }

        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            v1 = mface[i].v1;
            v2 = mface[i].v2;
            v3 = mface[i].v3;

            x1 = isnan(vertices[v1].co[0]) ? 0.0 : vertices[v1].co[0];
            y1 = isnan(vertices[v1].co[1]) ? 0.0 : vertices[v1].co[1];
            z1 = isnan(vertices[v1].co[2]) ? 0.0 : vertices[v1].co[2];

            x2 = isnan(vertices[v2].co[0]) ? 0.0 : vertices[v2].co[0];
            y2 = isnan(vertices[v2].co[1]) ? 0.0 : vertices[v2].co[1];
            z2 = isnan(vertices[v2].co[2]) ? 0.0 : vertices[v2].co[2];

            x3 = isnan(vertices[v3].co[0]) ? 0.0 : vertices[v3].co[0];
            y3 = isnan(vertices[v3].co[1]) ? 0.0 : vertices[v3].co[1];
            z3 = isnan(vertices[v3].co[2]) ? 0.0 : vertices[v3].co[2];

            find_max_min_bb(bdata, x1, y1, z1);
            find_max_min_bb(bdata, x2, y2, z2);
            find_max_min_bb(bdata, x3, y3, z3);

            average_pos[0] += x1 + x2 + x3;
            average_pos[1] += y1 + y2 + y3;
            average_pos[2] += z1 + z2 + z3;
            num_vert += 3;
            if (mface[i].v4) {
                v4 = mface[i].v4;
                x4 = isnan(vertices[v4].co[0]) ? 0.0 : vertices[v4].co[0];
                y4 = isnan(vertices[v4].co[1]) ? 0.0 : vertices[v4].co[1];
                z4 = isnan(vertices[v4].co[2]) ? 0.0 : vertices[v4].co[2];
                find_max_min_bb(bdata, x4, y4, z4);
                average_pos[0] += x4;
                average_pos[1] += y4;
                average_pos[2] += z4;
                num_vert++;
            }
        }

        if (!num_vert)
            return;

        average_pos[0] /= num_vert;
        average_pos[1] /= num_vert;
        average_pos[2] /= num_vert;


        x_width = bdata->max_x - bdata->min_x;
        y_width = bdata->max_y - bdata->min_y;
        z_width = bdata->max_z - bdata->min_z;

        bdata->scen_x = 0.5 * (bdata->max_x + bdata->min_x);
        bdata->scen_y = 0.5 * (bdata->max_y + bdata->min_y);
        bdata->scen_z = 0.5 * (bdata->max_z + bdata->min_z);

        bdata->ccen_x = bdata->scen_x;
        bdata->ccen_y = bdata->scen_y;
        bdata->ccen_z = bdata->scen_z;

        bdata->srad = MAX(x_width, MAX(y_width, z_width)) / 2.0;
        bdata->crad = MAX(x_width, y_width) / 2.0;

        for (j = 0; j < 9; j++)
            cov_matrix[j] *= (1.0 / num_vert);

        // Enlarge and move boundings if there are some vertices out of them.
        // Taken from: Lengyel E. - Mathematics for 3D Game Programming and Computer Graphics,
        // Third Edition. Chapter 8.1.3 Bounding Sphere Construction.
        // NOTE: bounding sphere (center and radius) won't be absolutely optimal, 
        // because of using approximate algorithm here
        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;

            for (j = 0; j < 4; j++) {
                if (j == 0)
                    v = mface[i].v1;
                else if (j == 1)
                    v = mface[i].v2;
                else if (j == 2)
                    v = mface[i].v3;
                else if (j == 3 && mface[i].v4)
                    v = mface[i].v4;
                else
                    continue;

                x = isnan(vertices[v].co[0]) ? 0.0 : vertices[v].co[0];
                y = isnan(vertices[v].co[1]) ? 0.0 : vertices[v].co[1];
                z = isnan(vertices[v].co[2]) ? 0.0 : vertices[v].co[2];

                scen_dist = sqrt(pow(bdata->scen_x - x, 2)
                               + pow(bdata->scen_y - y, 2)
                               + pow(bdata->scen_z - z, 2));

                if (scen_dist > bdata->srad) {

                    g[0] = bdata->scen_x - bdata->srad * (x - bdata->scen_x)
                                           / scen_dist;
                    g[1] = bdata->scen_y - bdata->srad * (y - bdata->scen_y)
                                           / scen_dist;
                    g[2] = bdata->scen_z - bdata->srad * (z - bdata->scen_z)
                                           / scen_dist;

                    bdata->scen_x = (g[0] + x) / 2.0;
                    bdata->scen_y = (g[1] + y) / 2.0;
                    bdata->scen_z = (g[2] + z) / 2.0;
                    bdata->srad = sqrt(pow(bdata->scen_x - x, 2)
                                     + pow(bdata->scen_y - y, 2)
                                     + pow(bdata->scen_z - z, 2));
                }

                ccen_dist = sqrt(pow(bdata->ccen_x - x, 2)
                               + pow(bdata->ccen_y - y, 2));

                if (ccen_dist > bdata->crad) {

                    g[0] = bdata->ccen_x - bdata->crad * (x - bdata->ccen_x)
                                           / ccen_dist;
                    g[1] = bdata->ccen_y - bdata->crad * (y - bdata->ccen_y)
                                           / ccen_dist;

                    bdata->ccen_x = (g[0] + x) / 2.0;
                    bdata->ccen_y = (g[1] + y) / 2.0;
                    bdata->crad = sqrt(pow(bdata->ccen_x - x, 2)
                                     + pow(bdata->ccen_y - y, 2));
                }

                // calc covariance matrix
                xm = x - average_pos[0];
                ym = y - average_pos[1];
                zm = z - average_pos[2];
                cov_matrix[0] += xm * xm;
                cov_matrix[1] += xm * ym;
                cov_matrix[2] += xm * zm;
                cov_matrix[4] += ym * ym;
                cov_matrix[5] += ym * zm;
                cov_matrix[8] += zm * zm;
            }
        }
        // calc covariance matrix
        cov_matrix[3] = cov_matrix[1];
        cov_matrix[6] = cov_matrix[2];
        cov_matrix[7] = cov_matrix[5];

        for (j = 0; j < 9; j++)
            cov_matrix[j] *= (1.0 / num_vert);

        // calc rotated bounding shapes
        find_eigenvectors(cov_matrix, MATRIX_PRES, t_mat);

        max_dot_x = 0.0;
        min_dot_x = 0.0;
        max_dot_y = 0.0;
        min_dot_y = 0.0;
        max_dot_z = 0.0;
        min_dot_z = 0.0;

        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            point[0] = isnan(vertices[mface[i].v1].co[0]) ? 0.0 : vertices[mface[i].v1].co[0];
            point[1] = isnan(vertices[mface[i].v1].co[1]) ? 0.0 : vertices[mface[i].v1].co[1];
            point[2] = isnan(vertices[mface[i].v1].co[2]) ? 0.0 : vertices[mface[i].v1].co[2];
            transform_vec3_by_mat3(point, t_mat, point);

            max_dot_x = point[0];
            min_dot_x = max_dot_x;
            max_dot_y = point[1];
            min_dot_y = max_dot_y;
            max_dot_z = point[2];
            min_dot_z = max_dot_z;
        }

        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;

            for (j = 0; j < 4; j++) {
                if (j == 0)
                    v = mface[i].v1;
                else if (j == 1)
                    v = mface[i].v2;
                else if (j == 2)
                    v = mface[i].v3;
                else if (j == 3 && mface[i].v4)
                    v = mface[i].v4;
                else
                    continue;

                point[0] = isnan(vertices[v].co[0]) ? 0.0 : vertices[v].co[0];
                point[1] = isnan(vertices[v].co[1]) ? 0.0 : vertices[v].co[1];
                point[2] = isnan(vertices[v].co[2]) ? 0.0 : vertices[v].co[2];
                transform_vec3_by_mat3(point, t_mat, point);
                if (point[0] > max_dot_x)
                    max_dot_x = point[0];
                if (point[0] < min_dot_x)
                    min_dot_x = point[0];
                if (point[1] > max_dot_y)
                    max_dot_y = point[1];
                if (point[1] < min_dot_y)
                    min_dot_y = point[1];
                if (point[2] > max_dot_z)
                    max_dot_z = point[2];
                if (point[2] < min_dot_z)
                    min_dot_z = point[2];
            } 
        }

        // rotated ellipsoid
        a = max_dot_x - min_dot_x;
        b = max_dot_y - min_dot_y;
        c = max_dot_z - min_dot_z;

        a = MAX(a, ELL_EPS);
        b = MAX(b, ELL_EPS);
        c = MAX(c, ELL_EPS);

        mat3_identity(scale_matrix);
        scale_matrix[0] = a != 0.0 ? 1 / a : 1 / MIN_SEMIAXIS_LEN;
        scale_matrix[4] = b != 0.0 ? 1 / b : 1 / MIN_SEMIAXIS_LEN;
        scale_matrix[8] = c != 0.0 ? 1 / c : 1 / MIN_SEMIAXIS_LEN;
        mat3_transpose(t_mat, mat3_tmp);


        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            point[0] = isnan(vertices[mface[i].v1].co[0]) ? 0.0 : vertices[mface[i].v1].co[0];
            point[1] = isnan(vertices[mface[i].v1].co[1]) ? 0.0 : vertices[mface[i].v1].co[1];
            point[2] = isnan(vertices[mface[i].v1].co[2]) ? 0.0 : vertices[mface[i].v1].co[2];
            transform_vec3_by_mat3(point, t_mat, point);
            transform_vec3_by_mat3(point, scale_matrix, point);
            transform_vec3_by_mat3(point, mat3_tmp, point);

            max_x = min_x = point[0];
            max_y = min_y = point[1];
            max_z = min_z = point[2];
        }
        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            for (j = 0; j < 4; j++) {
                if (j == 0)
                    v = mface[i].v1;
                else if (j == 1)
                    v = mface[i].v2;
                else if (j == 2)
                    v = mface[i].v3;
                else if (j == 3 && mface[i].v4)
                    v = mface[i].v4;
                else
                    continue;
                point[0] = isnan(vertices[v].co[0]) ? 0.0 : vertices[v].co[0];
                point[1] = isnan(vertices[v].co[1]) ? 0.0 : vertices[v].co[1];
                point[2] = isnan(vertices[v].co[2]) ? 0.0 : vertices[v].co[2];
                transform_vec3_by_mat3(point, t_mat, point);
                transform_vec3_by_mat3(point, scale_matrix, point);
                transform_vec3_by_mat3(point, mat3_tmp, point);

                max_x = MAX(max_x, point[0]);
                min_x = MIN(min_x, point[0]);
                max_y = MAX(max_y, point[1]);
                min_y = MIN(min_y, point[1]);
                max_z = MAX(max_z, point[2]);
                min_z = MIN(min_z, point[2]);
            }
        }

        r = sqrt((max_x - min_x) * (max_x - min_x)
            + (max_y - min_y) * (max_y - min_y)
            + (max_z - min_z) * (max_z - min_z)) / 2.0;
        r = MIN(r, 1.0);

        average_pos[0] = (max_x + min_x) / 2.0;
        average_pos[1] = (max_y + min_y) / 2.0;
        average_pos[2] = (max_z + min_z) / 2.0;

        mat3_identity(scale_matrix);
        scale_matrix[0] = a;
        scale_matrix[4] = b;
        scale_matrix[8] = c;

        transform_vec3_by_mat3(average_pos, t_mat, average_pos);
        transform_vec3_by_mat3(average_pos, scale_matrix, average_pos);
        transform_vec3_by_mat3(average_pos, mat3_tmp, average_pos);

        bdata->ecen_x = average_pos[0];
        bdata->ecen_y = average_pos[1];
        bdata->ecen_z = average_pos[2];

        bdata->eaxis_x = a * r;
        bdata->eaxis_y = b * r;
        bdata->eaxis_z = c * r;

        // rotated box
        mat3_invert(t_mat, mat3_tmp);
        bdata->rbb_scale[0] = (max_dot_x - min_dot_x) / 2.0;
        bdata->rbb_scale[1] = (max_dot_y - min_dot_y) / 2.0;
        bdata->rbb_scale[2] = (max_dot_z - min_dot_z) / 2.0;

        mat3_copy(t_mat, bdata->t_mat);

        average_pos[0] = (max_dot_x + min_dot_x) / 2.0;
        average_pos[1] = (max_dot_y + min_dot_y) / 2.0;
        average_pos[2] = (max_dot_z + min_dot_z) / 2.0;
        transform_vec3_by_mat3(average_pos, mat3_tmp, average_pos);

        bdata->r_bbcen[0] = average_pos[0];
        bdata->r_bbcen[1] = average_pos[1];
        bdata->r_bbcen[2] = average_pos[2];
    }
}

/* ************************* Exported functions ***************************** */

static PyObject *b4w_bin_export_submesh(PyObject *self, PyObject *args) {
    unsigned long long mesh_ptr, obj_ptr;
    int mat_index, disab_flat;
    int vertex_animation, edited_normals, vertex_groups, shape_keys;
    int tnb_shading;
    int is_degenerate_mesh;
    Py_buffer mask_buffer, tco_usage_buffer;
    PyObject *result;
    int groups_error;
    Mesh *mesh;
    Object *obj;

    struct MeshData mesh_data;
    mesh_data.pos = NULL;
    mesh_data.nor = NULL;
    mesh_data.grp = NULL;
    mesh_data.col = NULL;
    mesh_data.tco = NULL;
    mesh_data.shade_tangs = NULL;
    mesh_data.origindex = NULL;
    mesh_data.base_length = 0;
    mesh_data.groups_num = 0;
    mesh_data.frames = 1;
    mesh_data.tco_exported_count = 0;
    mesh_data.col_layers_count = 0;
    mesh_data.need_vcol_optimization = false;
    mesh_data.channels_presence = NULL;
    mesh_data.relatives = NULL;


    if (!PyArg_ParseTuple(args, "KKiiiiiiis*s*i", &mesh_ptr, &obj_ptr, &mat_index,
            &disab_flat, &vertex_animation, &edited_normals, &shape_keys, 
            &tnb_shading, &vertex_groups, &mask_buffer, &tco_usage_buffer, 
            &is_degenerate_mesh))
        return NULL;

    result = PyDict_New();

    if (is_degenerate_mesh) {
        result = calc_submesh_empty();
    } else {
        mesh = (Mesh *)mesh_ptr;
        obj  = (Object *)obj_ptr;

        mesh_data.origindex = (int *)custom_data_get_layer(&mesh->fdata, CD_ORIGINDEX);

        combine_positions_normals(&mesh_data, mesh, obj, vertex_animation,
                edited_normals, shape_keys);
        groups_error = combine_groups(&mesh_data, mesh, obj, vertex_groups);
        if (groups_error == ERR_WRONG_GROUP_INDICES) {
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong group indices");
            return NULL;
        }
        combine_colors(&mesh_data, mesh, &mask_buffer);
        combine_tco(&mesh_data, mesh, obj, mat_index, &tco_usage_buffer, false);
        triangulate_mesh(&mesh_data, mesh, mat_index, disab_flat, edited_normals, tnb_shading);
        result = calc_submesh(&mesh_data, 1, 0, shape_keys);
    }
    return result;
}

static PyObject *b4w_bin_calc_bounding_data(PyObject *self, PyObject *args) {
    unsigned long long mesh_ptr;
    PyObject *result;
    Mesh *mesh;

    struct BoundingData bdata;
    bdata.max_x = 0;
    bdata.max_y = 0;
    bdata.max_z = 0;
    bdata.min_x = 0;
    bdata.min_y = 0;
    bdata.min_z = 0;
    bdata.t_mat = falloc(9);
    bdata.r_bbcen = falloc(3);
    bdata.rbb_scale = falloc(3);
    bdata.srad = 0;
    bdata.scen_x = 0;
    bdata.scen_y = 0;
    bdata.scen_z = 0;
    bdata.crad = 0;
    bdata.ccen_x = 0;
    bdata.ccen_y = 0;
    bdata.ccen_z = 0;
    bdata.eaxis_x = 0;
    bdata.eaxis_y = 0;
    bdata.eaxis_z = 0;
    bdata.ecen_x = 0;
    bdata.ecen_y = 0;
    bdata.ecen_z = 0;

    memset(bdata.t_mat, 0, 9 * sizeof(int));
    memset(bdata.r_bbcen, 0, 3 * sizeof(int));
    memset(bdata.rbb_scale, 0, 3 * sizeof(int));

    int mat_index;

    if (!PyArg_ParseTuple(args, "Ki", &mesh_ptr, &mat_index))
        return NULL;

    result = PyDict_New();
    PyObject *bytes_buff;
    mesh = (Mesh *)mesh_ptr;

    calc_bounding_data(&bdata, mesh, mat_index);

    PyDict_SetItemString(result, "max_x", PyFloat_FromDouble(bdata.max_x));
    PyDict_SetItemString(result, "max_y", PyFloat_FromDouble(bdata.max_y));
    PyDict_SetItemString(result, "max_z", PyFloat_FromDouble(bdata.max_z));
    PyDict_SetItemString(result, "min_x", PyFloat_FromDouble(bdata.min_x));
    PyDict_SetItemString(result, "min_y", PyFloat_FromDouble(bdata.min_y));
    PyDict_SetItemString(result, "min_z", PyFloat_FromDouble(bdata.min_z));
    PyDict_SetItemString(result, "srad", PyFloat_FromDouble(bdata.srad));
    PyDict_SetItemString(result, "crad", PyFloat_FromDouble(bdata.crad));
    PyDict_SetItemString(result, "scen_x", PyFloat_FromDouble(bdata.scen_x));
    PyDict_SetItemString(result, "scen_y", PyFloat_FromDouble(bdata.scen_y));
    PyDict_SetItemString(result, "scen_z", PyFloat_FromDouble(bdata.scen_z));
    PyDict_SetItemString(result, "ccen_x", PyFloat_FromDouble(bdata.ccen_x));
    PyDict_SetItemString(result, "ccen_y", PyFloat_FromDouble(bdata.ccen_y));
    PyDict_SetItemString(result, "ccen_z", PyFloat_FromDouble(bdata.ccen_z));
    PyDict_SetItemString(result, "eaxis_x", PyFloat_FromDouble(bdata.eaxis_x));
    PyDict_SetItemString(result, "eaxis_y", PyFloat_FromDouble(bdata.eaxis_y));
    PyDict_SetItemString(result, "eaxis_z", PyFloat_FromDouble(bdata.eaxis_z));
    PyDict_SetItemString(result, "ecen_x", PyFloat_FromDouble(bdata.ecen_x));
    PyDict_SetItemString(result, "ecen_y", PyFloat_FromDouble(bdata.ecen_y));
    PyDict_SetItemString(result, "ecen_z", PyFloat_FromDouble(bdata.ecen_z));

    bytes_buff = PyByteArray_FromStringAndSize((char *)bdata.t_mat, 9 * sizeof(float));
    PyDict_SetItemString(result, "eigenvectors", bytes_buff);
    bytes_buff = PyByteArray_FromStringAndSize((char *)bdata.r_bbcen, 3 * sizeof(float));
    PyDict_SetItemString(result, "bbrcen", bytes_buff);
    bytes_buff = PyByteArray_FromStringAndSize((char *)bdata.rbb_scale, 3 * sizeof(float));
    PyDict_SetItemString(result, "bbrscale", bytes_buff);

    free(bdata.t_mat);
    free(bdata.r_bbcen);
    free(bdata.rbb_scale);

    return result;
}

static PyObject *b4w_bin_create_buffer_float(PyObject *self, PyObject *args) {
    long length;
    float *buffer;
    if (!PyArg_ParseTuple(args, "l", &length))
        return NULL;

    buffer = falloc(length);
    return PyLong_FromUnsignedLongLong((unsigned long long)buffer);
}

static PyObject *b4w_bin_buffer_insert_float(PyObject *self, PyObject *args) {
    float *buffer;
    int index;
    float val;
    if (!PyArg_ParseTuple(args, "Kif", &buffer, &index, &val))
        return NULL;

    buffer[index] = val;
    return PyLong_FromUnsignedLongLong((unsigned long long)buffer);
}

static PyObject *b4w_bin_calc_particle_scale(PyObject *self, PyObject *args) {
    unsigned long long psys_ptr;
    float *fuv_buffer;
    int *f_v_num_buffer;
    ParticleSystem *psys;

    ParticleData * pa; int p;
    PyObject *result;
    PyObject *bytes_buff;
    result = PyDict_New();

    if (!PyArg_ParseTuple(args, "K", &psys_ptr))
        return NULL;

    psys  = (ParticleSystem *)psys_ptr;

    int length = 4;
    fuv_buffer = falloc(psys->totpart * length);
    f_v_num_buffer = malloc(psys->totpart * sizeof(int));

    for (p = 0, pa = psys->particles; p < psys->totpart; p++, pa++) {
        fuv_buffer[p * length] = pa->fuv[0];
        fuv_buffer[p * length + 1] = pa->fuv[1];
        fuv_buffer[p * length + 2] = pa->fuv[2];
        fuv_buffer[p * length + 3] = pa->fuv[3];
        f_v_num_buffer[p] = pa->num;
    }
    
    bytes_buff = PyByteArray_FromStringAndSize((char *)fuv_buffer, 
                psys->totpart * length * sizeof(float));
    PyDict_SetItemString(result, "face_uv", bytes_buff);

    bytes_buff = PyByteArray_FromStringAndSize((char *)f_v_num_buffer, 
                psys->totpart * sizeof(int));
    PyDict_SetItemString(result, "face_ver_num", bytes_buff);

    free(fuv_buffer);
    free(f_v_num_buffer);
    return result;
}

static PyObject *b4w_bin_get_buffer_float(PyObject *self, PyObject *args) {
    float *buffer;
    long buffer_len;
    PyObject *result;

    if (!PyArg_ParseTuple(args, "Kl", &buffer, &buffer_len))
        return NULL;

    result = PyByteArray_FromStringAndSize((char *)buffer, 
            buffer_len * sizeof(float));
    free(buffer);

    return result;
}

static PyObject *b4w_bin_get_packed_data(PyObject *self, PyObject *args) {

    unsigned long long packed_file_ptr;
    PyObject *result;
    PackedFile *pf;

    if (!PyArg_ParseTuple(args, "K", &packed_file_ptr))
        return NULL;

    pf = (PackedFile *)packed_file_ptr;

    result = PyByteArray_FromStringAndSize((char *)pf->data, pf->size);

    return result;
}

/* vim: set et ts=4 sw=4: */
