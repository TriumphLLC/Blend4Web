#include <Python.h>
#include <assert.h>

#include <math.h>
#include "mikktspace.h"
#include "weldmesh.h"

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
 * Count of vertex color channels
 */
#define COL_NUM_COMP 3

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
#define SHORT_MAX 32767.0f
#define USHORT_MAX 65535.0f

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
#define TCO2_ERR 5
#define GRP_ERR 6
#define COL_ERR 7
#define SHADE_TNB_ERR 8


struct TBNCalcData {
    float *pos;     /* positions */
    float *nor;     /* normals */
    float *tco;     /* texture coordinates */
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
    float *tco2;

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
    float *tco0;
    float *tco1;
    float *shade_tangs;
    // blender data
    int *origindex; // concordance between poly/loop and tessfaces data
    // counts
    int base_length;
    int groups_num;
    // metadata
    int frames;
    int uv_layers_count;
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

float clampf(float a, float min, float max) {
    return MAX(MIN(a, max), min);
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
        out[i] = (unsigned short)(clampf(in[i], 0.0f, 1.0f) * USHORT_MAX);
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
int CustomData_number_of_layers(const CustomData *data, int type)
{
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
                normals[3 * i + 1] = f_norm_vector[2];
                normals[3 * i + 2] = -f_norm_vector[1];
            }
            else {
                d_norm_vector = (double *)normal_data->data.pointer;
                normals[3 * i] = (float)d_norm_vector[0];
                normals[3 * i + 1] = (float)d_norm_vector[2];
                normals[3 * i + 2] = (float)(-d_norm_vector[1]);
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
void get_vertex_colors(struct MeshData *mesh_data, Mesh *mesh)
{
    CustomData *ldata = &mesh->ldata;
    CustomDataLayer *layer;
    MLoop *mesh_loop = mesh->mloop;
    MLoopCol *layer_data;

    int i, j, index, layer_counter = 0;
    float col_value;

    for (i = 0, layer = ldata->layers; i < ldata->totlayer; i++, layer++)
        // NOTE: process layers of type "vertex color" only
        if (layer->type == CD_MLOOPCOL) {
            layer_data = (MLoopCol *)layer->data;

            for (j = 0; j < mesh->totloop; j++, layer_data++) {
                // NOTE: use origindex (if exist) for better color extraction
                if (mesh_data->origindex != NULL)
                    index = (layer_counter * mesh->totloop + j) * COL_NUM_COMP;
                else
                    index = (layer_counter * mesh->totvert + mesh_loop[j].v) * 
                            COL_NUM_COMP;

                // NOTE: r, g, b properties have type "char"
                // NOTE: fill unused channels by zeros for better submeshes joining in weld_submesh()
                if (mesh_data->channels_presence[layer_counter * 3] > 0)
                    col_value = ((256 + layer_data->r) % 256) / 255.0f;
                else
                    col_value = 0;
                mesh_data->col[index] = col_value;

                if (mesh_data->channels_presence[layer_counter * 3 + 1] > 0)
                    col_value = ((256 + layer_data->g) % 256) / 255.0f;
                else
                    col_value = 0;
                mesh_data->col[index + 1] = col_value;

                if (mesh_data->channels_presence[layer_counter * 3 + 2] > 0)
                    col_value = ((256 + layer_data->b) % 256) / 255.0f;
                else
                    col_value = 0;
                mesh_data->col[index + 2] = col_value;

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
                    mesh_data->nor[NOR_NUM_COMP * i + 1] = normal[2];
                    mesh_data->nor[NOR_NUM_COMP * i + 2] = -normal[1];
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
                    mesh_data->pos[cr_cursor + POS_NUM_COMP * i + 1] = pos_data[i * POS_NUM_COMP + 2];
                    mesh_data->pos[cr_cursor + POS_NUM_COMP * i + 2] = -pos_data[i * POS_NUM_COMP + 1];
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
            mesh_data->pos[3 * i + 1] = vertices[i].co[2];
            mesh_data->pos[3 * i + 2] = -vertices[i].co[1];
        }
    }

    if (mesh_data->nor == NULL) {
        mesh_data->nor = falloc(mesh_data->base_length * 3);
        for (i = 0; i < mesh_data->base_length; i++) {
            // NOTE: rotate by 90 degrees around X axis
            // NOTE: get normal componenets from "short" type value
            mesh_data->nor[3 * i] = vertices[i].no[0] * (1.0f / 32767.0f);
            mesh_data->nor[3 * i + 1] = vertices[i].no[2] * (1.0f / 32767.0f);
            mesh_data->nor[3 * i + 2] = -vertices[i].no[1] * (1.0f / 32767.0f);
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

void combine_colors(struct MeshData *mesh_data, Mesh *mesh, int vertex_colors, 
        Py_buffer *mask_buffer) 
{
    int i;

    if (vertex_colors) {
        int total_channels_size;
        char *mask_array = (char *)mask_buffer->buf;

        mesh_data->col_layers_count = get_colors_layers_count(mesh);
        mesh_data->channels_presence = uialloc(mesh_data->col_layers_count * 3);
        for (i = 0; i < mesh_data->col_layers_count; i++) {
            // calculate channels_presence on color layers
            mesh_data->channels_presence[i * 3] = get_channel_usage(mask_array[i], RCHANNEL);
            mesh_data->channels_presence[i * 3 + 1] = get_channel_usage(mask_array[i], GCHANNEL);
            mesh_data->channels_presence[i * 3 + 2] = get_channel_usage(mask_array[i], BCHANNEL);
        }
        mesh_data->need_vcol_optimization = check_need_vcol_optimization(mesh_data->channels_presence, 
                mesh_data->col_layers_count);
        mesh_data->origindex = (int *)custom_data_get_layer(&mesh->fdata, CD_ORIGINDEX);
        
        // NOTE: use origindex (if exist) for better color extraction
        if (mesh_data->origindex != NULL)
            total_channels_size = mesh_data->col_layers_count * mesh->totloop * 
                    COL_NUM_COMP;
        else
            total_channels_size = mesh_data->col_layers_count * mesh->totvert *
                    COL_NUM_COMP;

        mesh_data->col = falloc(total_channels_size);
        for (i = 0; i < total_channels_size; i++)
            mesh_data->col[i] = 0;
        
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
    tan_buff_ptr[1] += tang[2];
    tan_buff_ptr[2] += -tang[1];
}

void vec3_set(float *nor_buff_ptr, short normal[3]) {
    nor_buff_ptr[0] = normal[0] * (1.0f / 32767.0f);
    nor_buff_ptr[1] = normal[2] * (1.0f / 32767.0f);
    nor_buff_ptr[2] = -normal[1] * (1.0f / 32767.0f);
}

void set_tangent_buff(float *tan_buff, float *tan_ptr, float *nor_ptr, int *index) {
    float tdn = tan_ptr[0] * nor_ptr[0] + tan_ptr[1] * nor_ptr[1] + tan_ptr[2] * nor_ptr[2];
    float x,y,z,len;
    x = tan_ptr[0] - nor_ptr[0] * tdn;
    y = tan_ptr[1] - nor_ptr[1] * tdn;
    z = tan_ptr[2] - nor_ptr[2] * tdn;
    len = sqrt(x * x + y * y + z * z);
    if (len > 0.0) {
        x /= len;
        y /= len;
        z /= len;
    }
    tan_buff[*index] = x;
    tan_buff[*index + 1] = y;
    tan_buff[*index + 2] = z;
    *index += 3;
}

void combine_tco(struct MeshData *mesh_data, Mesh *mesh, Object *obj, int mat_index,
        int tnb_shading)
{
    MFace *mface = mesh->mface;
    MTFace *mtface;
    CustomData *fdata = &mesh->fdata;
    CustomDataLayer *layer;

    int i,j, tco_size = 0, shade_tnb_size = 0;
    int layers_counter = 0, tco_counter;

    MVert *vertices = NULL;
    float *tang = falloc(3);
    float *no = falloc(3);
    float *shade_tang_buff = NULL;
    int tang_counter = 0;
    float *uv1, *uv2, *uv3, *uv4;
    int v1, v2, v3, v4;
    float *vert_tang_buff = NULL;
    float *vert_norm_buff = NULL;
    float *tav, *nor;

    float *curr_tco_buff = NULL;

    mesh_data->uv_layers_count = CustomData_number_of_layers(fdata, CD_MTFACE);

    if (mesh_data->uv_layers_count > 0) {
        // NOTE: get tco buffer size
        for (i = 0, layer = fdata->layers; i < fdata->totlayer; i++, layer++)
            if (layer->type == CD_MTFACE) {
                for (j = 0; j < mesh->totface; j++) {
                    if (mat_index != -1 && mface[j].mat_nr != mat_index)
                        continue;
                    if (mface[j].v4) {
                        tco_size += 8;
                        shade_tnb_size += 12;
                    } else {
                        tco_size += 6;
                        shade_tnb_size += 9;
                    }
                }
                break;
            }

        // NOTE: allocate memory for tco buffers
        // NOTE: only two layers (UV Maps) supported
        if (mesh_data->uv_layers_count > 0)
            mesh_data->tco0 = falloc(tco_size);
        if (mesh_data->uv_layers_count > 1)
            mesh_data->tco1 = falloc(tco_size);

        if (tnb_shading && fdata->totlayer > 0) {
            vertices = mesh->mvert;
            mesh_data->shade_tangs = falloc(shade_tnb_size);
            vert_tang_buff = falloc(mesh->totvert * SHADE_TNB_NUM_COMP);
            vert_norm_buff = falloc(mesh->totvert * NOR_NUM_COMP);
            memset(vert_tang_buff, 0, SHADE_TNB_NUM_COMP * mesh->totvert * sizeof(float));
        }
        shade_tang_buff = mesh_data->shade_tangs;

        // NOTE: get tco data
        for (i = 0, layer = fdata->layers; i < fdata->totlayer; i++, layer++) {
            if (layer->type == CD_MTFACE) {
                tco_counter = 0;
                mtface = (MTFace *)layer->data;
                for (j = 0; j < mesh->totface; j++) {

                    if (mat_index != -1 && mface[j].mat_nr != mat_index)
                        continue;
                    if (layers_counter == 0)
                        curr_tco_buff = mesh_data->tco0;                       
                    else if (layers_counter == 1)
                        curr_tco_buff = mesh_data->tco1;

                    if (tnb_shading && layers_counter == 0) {
                        uv1= mtface[j].uv[0];
                        uv2= mtface[j].uv[1];
                        uv3= mtface[j].uv[2];
                        uv4= mtface[j].uv[3];

                        v1 = mface[j].v1;
                        v2 = mface[j].v2;
                        v3 = mface[j].v3;
                        v4 = mface[j].v4;
                        calc_face_normal(mface[j], vertices, no);

                        tangent_from_uv(uv1, uv2, uv3, vertices[v1].co, vertices[v2].co,
                                vertices[v3].co, no, tang);
                        tav = get_vert_tang(v1, vert_tang_buff);
                        vec3_add(tav, tang);
                        tav = get_vert_tang(v2, vert_tang_buff);
                        vec3_add(tav, tang);
                        tav = get_vert_tang(v3, vert_tang_buff);
                        vec3_add(tav, tang);

                        nor = get_vert_norm(v1, vert_norm_buff);
                        vec3_set(nor, vertices[v1].no);

                        nor = get_vert_norm(v2, vert_norm_buff);
                        vec3_set(nor, vertices[v2].no);

                        nor = get_vert_norm(v3, vert_norm_buff);
                        vec3_set(nor, vertices[v3].no);


                        if (v4) {
                            tangent_from_uv(uv1, uv3, uv4, vertices[v1].co, vertices[v3].co,
                                    vertices[v4].co, no, tang);
                            tav = get_vert_tang(v4, vert_tang_buff);
                            vec3_add(tav, tang);
                            tav = get_vert_tang(v1, vert_tang_buff);
                            vec3_add(tav, tang);
                            tav = get_vert_tang(v3, vert_tang_buff);
                            vec3_add(tav, tang);

                            nor = get_vert_norm(v4, vert_norm_buff);
                            vec3_set(nor, vertices[v4].no);
                        }
                    }

                    curr_tco_buff[tco_counter++] = mtface[j].uv[0][0];
                    curr_tco_buff[tco_counter++] = mtface[j].uv[0][1];
                    curr_tco_buff[tco_counter++] = mtface[j].uv[1][0];
                    curr_tco_buff[tco_counter++] = mtface[j].uv[1][1];
                    curr_tco_buff[tco_counter++] = mtface[j].uv[2][0];
                    curr_tco_buff[tco_counter++] = mtface[j].uv[2][1];
                    if (mface[j].v4) {
                        curr_tco_buff[tco_counter++] = mtface[j].uv[3][0];
                        curr_tco_buff[tco_counter++] = mtface[j].uv[3][1];
                    }
                }
                if (++layers_counter == 2)
                    break;
            }
        }
    }
    if (mesh_data->shade_tangs) {
        for (j = 0; j < mesh->totface; j++) {
            if (mat_index != -1 && mface[j].mat_nr != mat_index)
                continue;
            v1 = mface[j].v1;
            v2 = mface[j].v2;
            v3 = mface[j].v3;
            v4 = mface[j].v4;
            tav = get_vert_tang(v1, vert_tang_buff);
            nor = get_vert_norm(v1, vert_norm_buff);
            set_tangent_buff(shade_tang_buff, tav, nor, &tang_counter);
            tav = get_vert_tang(v2, vert_tang_buff);
            nor = get_vert_norm(v2, vert_norm_buff);
            set_tangent_buff(shade_tang_buff, tav, nor, &tang_counter);
            tav = get_vert_tang(v3, vert_tang_buff);
            nor = get_vert_norm(v3, vert_norm_buff);
            set_tangent_buff(shade_tang_buff, tav, nor, &tang_counter);
            if (v4) {
                tav = get_vert_tang(v4, vert_tang_buff);
                nor = get_vert_norm(v4, vert_norm_buff);
                set_tangent_buff(shade_tang_buff, tav, nor, &tang_counter);
            }
        }
    }
    free(tang);
    free(no);
    free(vert_tang_buff);
    free(vert_norm_buff);
}

void triangulate_mesh(struct MeshData *mesh_data, Mesh *mesh, int mat_index, 
        int disab_flat, int edited_normals)
{
    // TODO: divide
    MFace *mface = mesh->mface;
    MVert *mvert = mesh->mvert;
    MPoly *mpoly = mesh->mpoly;
    MLoop *mloop = mesh->mloop;

    int not_done, face_len;
    int *vcol_indices = NULL;

    float *tri_pos = NULL;
    float *tri_norm = NULL;
    float *tri_tco0 = NULL;
    float *tri_tco1 = NULL;
    float *tri_grp = NULL;
    float *tri_col = NULL;
    float *tri_tnb_shad = NULL;

    int is_flat = 0;
    int vnum = 0, vnum_count, tco_count;
    int *v_indices = malloc(6 * sizeof(int));
    int t_indices[] = {0, 1, 2, 0, 2, 3};

    int frame_size, tri_frame_size;
    int frame_offset, tri_frame_offset;
    int vert_offset;
    int face_offset = 0;

    int tco_counter = 0;
    int tcoface_offset = 0;
    int tnb_shad_counter = 0, tnb_sh_face_offset = 0, tnb_sh_vert_offset;
    int tcovert_offset;

    int group_size, tri_group_size;
    int group_offset, tri_group_offset;
    int group_vert_offset;
    int group_face_offset = 0;
    float tang_x, tang_y, tang_z, shade_tang_len;

    int layer_size, tri_layer_size;
    int layer_offset, tri_layer_offset;
    int color_vert_offset, tri_color_vert_offset;
    int color_face_offset = 0;
    short (*split_normals)[4][3] = NULL;

    int i,j,k,l,c;

    float *no = falloc(3);

    // NOTE: use origindex (if exist) for better color extraction
    if (mesh_data->origindex != NULL)
        vcol_indices = malloc(6 * sizeof(int));

    if (edited_normals)
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
    if (mesh_data->origindex != NULL)
        layer_size = mesh->totloop * COL_NUM_COMP;
    else
        layer_size = mesh_data->base_length * COL_NUM_COMP;
        
    tri_layer_size = vnum * COL_NUM_COMP;

    tri_pos = falloc(vnum * mesh_data->frames * 3);
    tri_norm = falloc(vnum * mesh_data->frames * 3);
    if (mesh_data->uv_layers_count > 0)
        tri_tco0 = falloc(vnum * 2);
    if (mesh_data->uv_layers_count > 1)
       tri_tco1 = falloc(vnum * 2);
    if (mesh_data->groups_num > 0)
        tri_grp = falloc(vnum * mesh_data->groups_num);
    if (mesh_data->col_layers_count)
        tri_col = falloc(vnum * mesh_data->col_layers_count * COL_NUM_COMP);
    if (mesh_data->shade_tangs)
        tri_tnb_shad = falloc(vnum * SHADE_TNB_NUM_COMP);


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
            tco_count = 4;
        } else {
            vnum_count = 3;
            tco_count = 3;
        }

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
                    tri_norm[tri_frame_offset + face_offset + k * 3 + 1] = split_normals[i][l][2]* (1.0f / 32767.0f);
                    tri_norm[tri_frame_offset + face_offset + k * 3 + 2] = -split_normals[i][l][1]* (1.0f / 32767.0f);

                }
                else {
                    if (!is_flat) {
                        tri_norm[tri_frame_offset + face_offset + k * 3]
                                = mesh_data->nor[frame_offset + vert_offset];
                        tri_norm[tri_frame_offset + face_offset + k * 3 + 1]
                                = mesh_data->nor[frame_offset + vert_offset + 1];
                        tri_norm[tri_frame_offset + face_offset + k * 3 + 2]
                                = mesh_data->nor[frame_offset + vert_offset + 2];
                }
                else {
                    calc_face_normal(mface[i], mvert, no);
                    // rotate by 90 degrees around X axis
                    tri_norm[tri_frame_offset + face_offset + k * 3] = no[0];
                    tri_norm[tri_frame_offset + face_offset + k * 3 + 1] = no[2];
                    tri_norm[tri_frame_offset + face_offset + k * 3 + 2] = -no[1];
                    }
                }
            }
        }
        face_offset += vnum_count * 3;

        // tco0 
        if (mesh_data->uv_layers_count > 0) {
            for (j = 0; j < vnum_count; j++) {
                tcovert_offset = t_indices[j] * 2;
                tnb_sh_vert_offset = t_indices[j] * 3;
                tri_tco0[tco_counter] = mesh_data->tco0[tcoface_offset + 
                        tcovert_offset];
                tri_tco0[tco_counter + 1] = mesh_data->tco0[tcoface_offset + 
                        tcovert_offset + 1];
                if (mesh_data->shade_tangs) {
                    tri_tnb_shad[tnb_shad_counter] = mesh_data->shade_tangs[
                        tnb_sh_face_offset + tnb_sh_vert_offset];
                    tri_tnb_shad[tnb_shad_counter + 1] = mesh_data->shade_tangs[
                        tnb_sh_face_offset + tnb_sh_vert_offset + 1];
                    tri_tnb_shad[tnb_shad_counter + 2] = mesh_data->shade_tangs[
                        tnb_sh_face_offset + tnb_sh_vert_offset + 2];
                }
                // tco1
                if (mesh_data->uv_layers_count > 1) {
                    tri_tco1[tco_counter] = mesh_data->tco1[tcoface_offset + 
                            tcovert_offset];
                    tri_tco1[tco_counter + 1] = mesh_data->tco1[tcoface_offset + 
                            tcovert_offset + 1];
                }
                tco_counter += 2;
                tnb_shad_counter += 3;
            }
            tcoface_offset += tco_count * 2;
            tnb_sh_face_offset += tco_count * 3;
        }

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

        // colors layers
        // NOTE: use origindex (if exist) for better color extraction
        if (mesh_data->origindex != NULL) {
            vcol_indices = malloc(6 * sizeof(int));
            face_len = mface[i].v4 ? 4 : 3;

            for (j = mpoly[mesh_data->origindex[i]].loopstart, not_done = face_len; 
                    not_done; j++) {
                if (mloop[j].v == mface[i].v1) {
                    vcol_indices[0] = j;
                    not_done--;
                }
                else if (mloop[j].v == mface[i].v2) {
                    vcol_indices[1] = j;
                    not_done--;
                }
                else if (mloop[j].v == mface[i].v3) {
                    vcol_indices[2] = j;
                    not_done--;
                }
                else if (face_len == 4 && mloop[j].v == mface[i].v4) {
                    vcol_indices[3] = j;
                    not_done--;
                }
            }
            if (face_len == 4) {
                vcol_indices[5] = vcol_indices[3];
                vcol_indices[3] = vcol_indices[0];
                vcol_indices[4] = vcol_indices[2];
            }
        } else
            vcol_indices = v_indices;

        for (j = 0; j < mesh_data->col_layers_count; j++) {
            tri_layer_offset = tri_layer_size * j;
            layer_offset = layer_size * j;
            for (k = 0; k < vnum_count; k++) {
                color_vert_offset = vcol_indices[k] * COL_NUM_COMP;
                tri_color_vert_offset = k * COL_NUM_COMP;
                for (l = 0; l < COL_NUM_COMP; l++)
                    tri_col[tri_layer_offset + color_face_offset + 
                            tri_color_vert_offset + l] 
                            = mesh_data->col[layer_offset + color_vert_offset + l];
            }
        }
        color_face_offset += vnum_count * COL_NUM_COMP;
    }

    if (mesh_data->shade_tangs && is_flat) {
        c = SHADE_TNB_NUM_COMP;
        for (i = 0; i < vnum; i=i+c) {
            tang_x = tri_tnb_shad[i * c] + tri_tnb_shad[(i + 1) * c] + 
                    tri_tnb_shad[(i + 2) * c];
            tang_y = tri_tnb_shad[i * c + 1] + tri_tnb_shad[(i + 1) * c + 1] + 
                    tri_tnb_shad[(i + 2) * c + 1];
            tang_z = tri_tnb_shad[i * c + 2] + tri_tnb_shad[(i + 1) * c + 2] + 
                    tri_tnb_shad[(i + 2) * c + 2];

            shade_tang_len = sqrt(tang_x * tang_x + tang_y * tang_y + tang_z * tang_z);
            if (shade_tang_len > 0.0) {
                tang_x /= shade_tang_len;
                tang_y /= shade_tang_len;
                tang_z /= shade_tang_len;
            }

            tri_tnb_shad[i * c] = tri_tnb_shad[(i + 1) * c] =
                    tri_tnb_shad[(i + 2) * c] = tang_x;
            tri_tnb_shad[i * c + 1] = tri_tnb_shad[(i + 1) * c + 1] =
                    tri_tnb_shad[(i + 2) * c + 1] = tang_y;
            tri_tnb_shad[i * c + 2] = tri_tnb_shad[(i + 1) * c + 2] =
                    tri_tnb_shad[(i + 2) * c + 2] = tang_z;

        }
    }

    free(mesh_data->pos);
    free(mesh_data->nor);
    free(mesh_data->grp);
    free(mesh_data->col);
    free(mesh_data->tco0);
    free(mesh_data->tco1);
    free(mesh_data->shade_tangs);

    mesh_data->pos = tri_pos;
    mesh_data->nor = tri_norm;
    mesh_data->grp = tri_grp;
    mesh_data->col = tri_col;
    mesh_data->tco0 = tri_tco0;
    mesh_data->tco1 = tri_tco1;
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
    float *tco = ((struct TBNCalcData*)ctx->m_pUserData)->tco;

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
    if (!tbn_data->tco)
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

    if (!in)
        return true;

    for (i = 0; i < partitions; i++)
        for (j = 0; j < vnum; j++)
            for (k = 0; k < ncomp; k++) 
            {
                val = in[(vnum * i + j) * ncomp + k];
                if (!isnan(val))
                    out[stride * j + offset + i * ncomp + k] = val;
                else
                    return false;
            }
    return true;
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
                      int use_second_uv, int use_shade_tnb)
{
    data->pos = malloc(POS_NUM_COMP * data->frames * data->vnum * sizeof(float));
    if (use_normals)
        data->nor = malloc(NOR_NUM_COMP * data->frames * data->vnum * sizeof(float));
    else
        data->nor = NULL;

    if (use_tangents) {
        data->tan = malloc(TAN_NUM_COMP * data->frames * data->vnum * sizeof(float));
        data->tco = malloc(TCO_NUM_COMP * data->vnum * sizeof(float));
        if (use_second_uv)
            data->tco2 = malloc(TCO_NUM_COMP * data->vnum * sizeof(float));
        else
            data->tco2 = NULL;
    } else {
        data->tan = NULL;
        data->tco = NULL;
        data->tco2 = NULL;
    }

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
    free(data->tco2);
    free(data->grp);
    free(data->col);
    free(data->indices);
}

int weld_submesh(struct SubmeshData *src, struct SubmeshData *dst)
{
    int i, offset;
    bool status;

    /* floats per type - offset */
    int pos_floats = POS_NUM_COMP * src->frames;
    int nor_floats = src->nor ? NOR_NUM_COMP * src->frames : 0;
    int tan_floats = src->tan ? TAN_NUM_COMP * src->frames : 0;
    int tco_floats = src->tco ? TCO_NUM_COMP : 0;
    int tco2_floats = src->tco2 ? TCO_NUM_COMP : 0;
    int shade_tnb_floats = src->shade_tangs ? SHADE_TNB_NUM_COMP : 0;

    int grp_floats = src->grp ? GRP_NUM_COMP * src->grp_num : 0;
    int col_floats = src->col ? COL_NUM_COMP * src->col_layers : 0;

    /* floats per vertex - stride */
    int fpv = pos_floats + nor_floats + tan_floats + tco_floats + tco2_floats +
            grp_floats + col_floats + shade_tnb_floats;

    float *vdata_in = falloc(fpv * src->vnum);
    float *vdata_out = falloc(fpv * src->vnum);
    int *remap_table = malloc(sizeof(int) * src->vnum);

    offset = 0;
    status = va_store(src->pos, vdata_in, src->frames, offset, fpv, src->vnum, POS_NUM_COMP);
    if (!status)
        return POS_ERR;
    offset += pos_floats;
    status = va_store(src->nor, vdata_in, src->frames, offset, fpv, src->vnum, NOR_NUM_COMP);
    if (!status)
        return NOR_ERR;
    offset += nor_floats;
    status = va_store(src->tan, vdata_in, src->frames, offset, fpv, src->vnum, TAN_NUM_COMP);
    if (!status)
        return TAN_ERR;
    offset += tan_floats;
    status = va_store(src->tco, vdata_in, 1, offset, fpv, src->vnum, TCO_NUM_COMP);
    if (!status)
        return TCO_ERR;
    offset += tco_floats;
    status = va_store(src->tco2, vdata_in, 1, offset, fpv, src->vnum, TCO_NUM_COMP);
    if (!status)
        return TCO2_ERR;
    offset += tco2_floats;
    status = va_store(src->shade_tangs, vdata_in, 1, offset, fpv, src->vnum, SHADE_TNB_NUM_COMP);
    if (!status)
        return SHADE_TNB_ERR;
    offset += shade_tnb_floats;
    status = va_store(src->grp, vdata_in, src->grp_num, offset, fpv, src->vnum, GRP_NUM_COMP);
    if (!status)
        return GRP_ERR;
    offset += grp_floats;
    status = va_store(src->col, vdata_in, src->col_layers, offset, fpv, src->vnum, COL_NUM_COMP);
    if (!status)
        return COL_ERR;
    /* store submesh in input array */
    assert(offset + col_floats == fpv);
    dst->vnum = WeldMesh(remap_table, vdata_out, vdata_in, src->vnum, fpv);
    dst->frames = src->frames;
    dst->grp_num = src->grp_num;
    dst->col_layers = src->col_layers;
    dst->inum = src->vnum;

    allocate_submesh(dst, nor_floats, tan_floats, tco2_floats, shade_tnb_floats);
    /* extract submesh from output array */
    offset = 0;
    va_extract(vdata_out, dst->pos, dst->frames, offset, fpv, dst->vnum, POS_NUM_COMP);

    offset += pos_floats;
    va_extract(vdata_out, dst->nor, dst->frames, offset, fpv, dst->vnum, NOR_NUM_COMP);

    offset += nor_floats;
    va_extract(vdata_out, dst->tan, dst->frames, offset, fpv, dst->vnum, TAN_NUM_COMP);

    offset += tan_floats;
    va_extract(vdata_out, dst->tco, 1, offset, fpv, dst->vnum, TCO_NUM_COMP);

    offset += tco_floats;
    va_extract(vdata_out, dst->tco2, 1, offset, fpv, dst->vnum, TCO_NUM_COMP);

    offset += tco2_floats;
    va_extract(vdata_out, dst->shade_tangs, 1, offset, fpv, dst->vnum, SHADE_TNB_NUM_COMP);

    offset += shade_tnb_floats;
    va_extract(vdata_out, dst->grp, dst->grp_num, offset, fpv, dst->vnum, GRP_NUM_COMP);

    offset += grp_floats;
    va_extract(vdata_out, dst->col, dst->col_layers, offset, fpv, dst->vnum, COL_NUM_COMP);

    assert(offset + col_floats == fpv);

    /* store indices */
    for (i = 0; i < src->vnum; i++)
        dst->indices[i] = remap_table[i];

    return 0;
}

static PyObject *calc_submesh_empty(void)
{
    char *empty_str = "";
    PyObject *empty_buff;
    PyObject *result;

    empty_buff = PyByteArray_FromStringAndSize(empty_str,0);
    result = PyDict_New();

    PyDict_SetItemString(result, "base_length", PyLong_FromLong(0));

    PyDict_SetItemString(result, "indices", empty_buff);
    PyDict_SetItemString(result, "position", empty_buff);
    PyDict_SetItemString(result, "normal", empty_buff);
    PyDict_SetItemString(result, "tangent", empty_buff);
    PyDict_SetItemString(result, "texcoord", empty_buff);
    PyDict_SetItemString(result, "texcoord2", empty_buff);
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
 * [v0u, v0v, v1u, v1v, v2u, v2v ...]
 *
 * Vertex array format for grp:
 * [v0gr0, v1gr0, v2gr0, ... v0gr1, v1gr1, v2gr1, ...] 
 *
 * Vertex array format for col:
 * [v0rgb_layer0, v1rgb_layer0, ... v0rgb_layer1, v1rgb_layer1, ...]
 */
static PyObject *calc_submesh(struct MeshData *mesh_data, int arr_to_str, 
        int grp_to_str, int shape_keys)
{
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
    unsigned short *col_ushort = NULL;

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
    tan_needed = mesh_data->tco0 ? nor_needed : 0;

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
            tbn_data.tco = mesh_data->tco0;

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

    src.tco = mesh_data->tco0;
    src.tco2 = mesh_data->tco1;

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
    if (status > 0)
    {
        switch(status) {
        case POS_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong vertice positions");
            break;
        case NOR_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong normals");
            break;
        case TAN_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong tangents");
            break;
        case TCO_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong texture coordinates");
            break;
        case TCO2_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong texture coordinates");
            break;
        case GRP_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong vertex group weights");
            break;
        case COL_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong vertex color values");
            break;
        case SHADE_TNB_ERR:
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong shading tangents values");
            break;
        }
        return NULL;
    }

    PyDict_SetItemString(result, "base_length", PyLong_FromLong(dst.vnum));

    bytes_buff = PyByteArray_FromStringAndSize((char *)dst.indices, 
            dst.inum * sizeof(int));
    PyDict_SetItemString(result, "indices", bytes_buff);

    bytes_buff = PyByteArray_FromStringAndSize((char *)dst.pos, 
            dst.vnum * dst.frames * POS_NUM_COMP * sizeof(float));
    PyDict_SetItemString(result, "position", bytes_buff);

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
                dst.vnum * TCO_NUM_COMP * sizeof(float));
        PyDict_SetItemString(result, "texcoord", bytes_buff);
    }
    if (dst.tco2) {
        bytes_buff = PyByteArray_FromStringAndSize((char *)dst.tco2, 
                dst.vnum * TCO_NUM_COMP * sizeof(float));
        PyDict_SetItemString(result, "texcoord2", bytes_buff);
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
            col_ushort = (unsigned short *)shalloc(length);
            buffer_float_to_ushort(optimized_vcols, col_ushort, length);
        } else {
            length = dst.vnum * mesh_data->col_layers_count * COL_NUM_COMP;
            col_ushort = (unsigned short *)shalloc(length);
            buffer_float_to_ushort(dst.col, col_ushort, length);
        }

        bytes_buff = PyByteArray_FromStringAndSize((char *)col_ushort, 
                length * sizeof(short));
        PyDict_SetItemString(result, "color", bytes_buff);
    }
    /* cleanup */
    free(tan_frames);
    free(mesh_data->pos);
    free(mesh_data->nor);
    free(mesh_data->tco0);
    free(mesh_data->tco1);
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

void calc_bounding_data(struct BoundingData *bdata, Mesh *mesh, int mat_index) {
    int i,j;
    int v1, v2, v3, v4, v;
    float x,y,z;
    float x_width;
    float y_width;
    float z_width;
    float scen_dist;
    float ccen_dist;
    float scen_tmp_dist;
    float tmp_rad;
    float g[3];
    float tmp_scen[3];
    MVert *vertices;
    MFace *mface = mesh->mface;
    if (mesh->totvert > 0) {
        vertices = mesh->mvert;

        // NOTE: rotate by 90 degrees around X axis
        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            v1 = mface[i].v1;
            bdata->max_x = vertices[v1].co[0];
            bdata->min_x = vertices[v1].co[0];
            bdata->max_y = vertices[v1].co[2];
            bdata->min_y = vertices[v1].co[2];
            bdata->max_z = -vertices[v1].co[1];
            bdata->min_z = -vertices[v1].co[1];
            break;
        }

        for (i = 0; i < mesh->totface; i++) {
            if (mat_index != -1 && mface[i].mat_nr != mat_index)
                continue;
            v1 = mface[i].v1;
            v2 = mface[i].v2;
            v3 = mface[i].v3;
            find_max_min_bb(bdata, vertices[v1].co[0], vertices[v1].co[2], -vertices[v1].co[1]);
            find_max_min_bb(bdata, vertices[v2].co[0], vertices[v2].co[2], -vertices[v2].co[1]);
            find_max_min_bb(bdata, vertices[v3].co[0], vertices[v3].co[2], -vertices[v3].co[1]);
            if (mface[i].v4) {
                v4 = mface[i].v4;
                find_max_min_bb(bdata, vertices[v4].co[0], vertices[v4].co[2], -vertices[v4].co[1]);
            }
        }

        x_width = bdata->max_x - bdata->min_x;
        y_width = bdata->max_y - bdata->min_y;
        z_width = bdata->max_z - bdata->min_z;

        bdata->scen_x = 0.5 * (bdata->max_x + bdata->min_x);
        bdata->scen_y = 0.5 * (bdata->max_y + bdata->min_y);
        bdata->scen_z = 0.5 * (bdata->max_z + bdata->min_z);

        bdata->ccen_x = bdata->scen_x;
        bdata->ccen_y = bdata->scen_y;
        bdata->ccen_z = bdata->scen_z;

        bdata->srad = MAX(x_width, MAX(y_width, z_width)) / 2.0;;
        bdata->crad = MAX(x_width, z_width) / 2.0;

        tmp_scen[0] = bdata->scen_x / (x_width? x_width: 1.0);
        tmp_scen[1] = bdata->scen_y / (y_width? y_width: 1.0);
        tmp_scen[2] = bdata->scen_z / (z_width? z_width: 1.0);
        tmp_rad = 0.5;

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

                x = vertices[v].co[0];
                y = vertices[v].co[2];
                z = -vertices[v].co[1];

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
                               + pow(bdata->ccen_z - z, 2));

                if (ccen_dist > bdata->crad) {

                    g[0] = bdata->ccen_x - bdata->crad * (x - bdata->ccen_x)
                                           / ccen_dist;
                    g[2] = bdata->ccen_z - bdata->crad * (z - bdata->ccen_z)
                                           / ccen_dist;

                    bdata->ccen_x = (g[0] + x) / 2.0;
                    bdata->ccen_z = (g[2] + z) / 2.0;
                    bdata->crad = sqrt(pow(bdata->ccen_x - x, 2)
                                     + pow(bdata->ccen_z - z, 2));
                }

                x /= (x_width? x_width: 1.0);
                y /= (y_width? y_width: 1.0);
                z /= (z_width? z_width: 1.0);

                scen_tmp_dist = sqrt(pow(tmp_scen[0] - x, 2)
                                   + pow(tmp_scen[1] - y, 2)
                                   + pow(tmp_scen[2] - z, 2));

                if (scen_tmp_dist > tmp_rad) {

                    g[0] = tmp_scen[0] - tmp_rad * (x - tmp_scen[0])
                                        / scen_tmp_dist;
                    g[1] = tmp_scen[1] - tmp_rad * (y - tmp_scen[1])
                                        / scen_tmp_dist;
                    g[2] = tmp_scen[2] - tmp_rad * (z - tmp_scen[2])
                                        / scen_tmp_dist;

                    tmp_scen[0] = (g[0] + x) / 2.0;
                    tmp_scen[1] = (g[1] + y) / 2.0;
                    tmp_scen[2] = (g[2] + z) / 2.0;
                    tmp_rad = sqrt(pow(tmp_scen[0] - x, 2)
                                 + pow(tmp_scen[1] - y, 2)
                                 + pow(tmp_scen[2] - z, 2));
                }
            }
        }

        //scale sphere boundings to fit original size and get ellipsoid shape
        bdata->ecen_x = x_width ? tmp_scen[0] * x_width: bdata->max_x;
        bdata->ecen_y = y_width ? tmp_scen[1] * y_width: bdata->max_y;
        bdata->ecen_z = z_width ? tmp_scen[2] * z_width: bdata->max_z;

        bdata->eaxis_x = tmp_rad * x_width;
        bdata->eaxis_y = tmp_rad * y_width;
        bdata->eaxis_z = tmp_rad * z_width;
    }
}

/* ************************* Exported functions ***************************** */

static PyObject *b4w_bin_export_submesh(PyObject *self, PyObject *args) {
    unsigned long long mesh_ptr, obj_ptr;
    int mat_index, disab_flat;
    int vertex_animation, edited_normals, vertex_groups, vertex_colors, shape_keys;
    int tnb_shading;
    int is_degenerate_mesh;
    Py_buffer mask_buffer;
    PyObject *result;
    int groups_error;
    Mesh *mesh;
    Object *obj;

    struct MeshData mesh_data;
    mesh_data.pos = NULL;
    mesh_data.nor = NULL;
    mesh_data.grp = NULL;
    mesh_data.col = NULL;
    mesh_data.tco0 = NULL;
    mesh_data.tco1 = NULL;
    mesh_data.shade_tangs = NULL;
    mesh_data.origindex = NULL;
    mesh_data.base_length = 0;
    mesh_data.groups_num = 0;
    mesh_data.frames = 1;
    mesh_data.uv_layers_count = 0;
    mesh_data.col_layers_count = 0;
    mesh_data.need_vcol_optimization = false;
    mesh_data.channels_presence = NULL;
    mesh_data.relatives = NULL;


    if (!PyArg_ParseTuple(args, "KKiiiiiiiis*i", &mesh_ptr, &obj_ptr, &mat_index,
            &disab_flat, &vertex_animation, &edited_normals, &shape_keys, 
            &tnb_shading, &vertex_groups, &vertex_colors, &mask_buffer, &is_degenerate_mesh))
        return NULL;

    result = PyDict_New();

    if (is_degenerate_mesh) {
        result = calc_submesh_empty();
    } else {
        mesh = (Mesh *)mesh_ptr;
        obj  = (Object *)obj_ptr;

        combine_positions_normals(&mesh_data, mesh, obj, vertex_animation,
                edited_normals, shape_keys);
        groups_error = combine_groups(&mesh_data, mesh, obj, vertex_groups);
        if (groups_error == ERR_WRONG_GROUP_INDICES) {
            PyErr_SetString(PyExc_ValueError, "Corrupted file: Wrong group indices");
            return NULL;
        }
        combine_colors(&mesh_data, mesh, vertex_colors, &mask_buffer);
        combine_tco(&mesh_data, mesh, obj, mat_index, tnb_shading);
        triangulate_mesh(&mesh_data, mesh, mat_index, disab_flat, edited_normals);
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

    int mat_index;

    if (!PyArg_ParseTuple(args, "Ki", &mesh_ptr, &mat_index))
        return NULL;

    result = PyDict_New();
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
