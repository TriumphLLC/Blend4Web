/*
 * ***** BEGIN GPL LICENSE BLOCK *****
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 *
 * The Original Code is Copyright (C) 2001-2002 by NaN Holding BV.
 * All rights reserved.
 *
 * The Original Code is: all of this file.
 *
 * Contributor(s): none yet.
 *
 * ***** END GPL LICENSE BLOCK *****
 */

/** \file DNA_ID.h
 *  \ingroup DNA
 *  \brief ID and Library types, which are fundamental for sdna.
 */

#ifndef __DNA_ID_H__
#define __DNA_ID_H__

#include "DNA_listBase.h"

#ifdef __cplusplus
extern "C" {
#endif

struct Library;
struct FileData;
struct ID;
struct PackedFile;
struct GPUTexture;

typedef struct IDPropertyData {
	void *pointer;
	ListBase group;
	int val, val2;  /* note, we actually fit a double into these two ints */
} IDPropertyData;

typedef struct IDProperty {
	struct IDProperty *next, *prev;
	char type, subtype;
	short flag;
	char name[64];  /* MAX_IDPROP_NAME */

	/* saved is used to indicate if this struct has been saved yet.
	 * seemed like a good idea as a pad var was needed anyway :) */
	int saved;
	IDPropertyData data;  /* note, alignment for 64 bits */

	/* array length, also (this is important!) string length + 1.
	 * the idea is to be able to reuse array realloc functions on strings.*/
	int len;

	/* Strings and arrays are both buffered, though the buffer isn't saved. */
	/* totallen is total length of allocated array/string, including a buffer.
	 * Note that the buffering is mild; the code comes from python's list implementation. */
	int totallen;
} IDProperty;

#define MAX_IDPROP_NAME 64
#define DEFAULT_ALLOC_FOR_NULL_STRINGS  64

/*->type*/
enum {
	IDP_STRING           = 0,
	IDP_INT              = 1,
	IDP_FLOAT            = 2,
	IDP_ARRAY            = 5,
	IDP_GROUP            = 6,
	/* the ID link property type hasn't been implemented yet, this will require
	 * some cleanup of blenkernel, most likely. */
	IDP_ID               = 7,
	IDP_DOUBLE           = 8,
	IDP_IDPARRAY         = 9,
	IDP_NUMTYPES         = 10,
};

/*->subtype */

/* IDP_STRING */
enum {
	IDP_STRING_SUB_UTF8  = 0,  /* default */
	IDP_STRING_SUB_BYTE  = 1,  /* arbitrary byte array, _not_ null terminated */
};

/*->flag*/
enum {
	IDP_FLAG_GHOST       = 1 << 7,  /* this means the property is set but RNA will return false when checking
	                                 * 'RNA_property_is_set', currently this is a runtime flag */
};

/* add any future new id property types here.*/

/* watch it: Sequence has identical beginning. */
/**
 * ID is the first thing included in all serializable types. It
 * provides a common handle to place all data in double-linked lists.
 * */

/* 2 characters for ID code and 64 for actual name */
#define MAX_ID_NAME  66

/* There's a nasty circular dependency here.... 'void *' to the rescue! I
 * really wonder why this is needed. */
typedef struct ID {
	void *next, *prev;
	struct ID *newid;
	struct Library *lib;
	char name[66]; /* MAX_ID_NAME */
	/**
	 * LIB_... flags report on status of the datablock this ID belongs
	 * to.
	 */
	short flag;
	int us;
	int icon_id, pad2;
	IDProperty *properties;
} ID;

/**
 * For each library file used, a Library struct is added to Main
 * WARNING: readfile.c, expand_doit() reads this struct without DNA check!
 */
typedef struct Library {
	ID id;
	ID *idblock;
	struct FileData *filedata;
	char name[1024];  /* path name used for reading, can be relative and edited in the outliner */

	/* absolute filepath, this is only for convenience, 'name' is the real path used on file read but in
	 * some cases its useful to access the absolute one.
	 * This is set on file read.
	 * Use BKE_library_filepath_set() rather than setting 'name' directly and it will be kept in sync - campbell */
	char filepath[1024];

	struct Library *parent;	/* set for indirectly linked libs, used in the outliner and while reading */
	
	struct PackedFile *packedfile;
} Library;

enum eIconSizes {
	ICON_SIZE_ICON = 0,
	ICON_SIZE_PREVIEW = 1,

	NUM_ICON_SIZES
};

/* for PreviewImage->flag */
enum ePreviewImage_Flag {
	PRV_CHANGED          = (1 << 0),
	PRV_USER_EDITED      = (1 << 1),  /* if user-edited, do not auto-update this anymore! */
};

typedef struct PreviewImage {
	/* All values of 2 are really NUM_ICON_SIZES */
	unsigned int w[2];
	unsigned int h[2];
	short flag[2];
	short changed_timestamp[2];
	unsigned int *rect[2];

	/* Runtime-only data. */
	struct GPUTexture *gputexture[2];
	int icon_id;  /* Used by previews outside of ID context. */

	char pad[3];
	char use_deferred;  /* for now a mere bool, if we add more deferred loading methods we can switch to bitflag. */
} PreviewImage;

#define PRV_DEFERRED_DATA(prv) \
	(CHECK_TYPE_INLINE(prv, PreviewImage *), BLI_assert((prv)->use_deferred), (void *)((prv) + 1))

/**
 * Defines for working with IDs.
 *
 * The tags represent types! This is a dirty way of enabling RTTI. The
 * sig_byte end endian defines aren't really used much.
 *
 **/

#ifdef __BIG_ENDIAN__
   /* big endian */
#  define MAKE_ID2(c, d)  ((c) << 8 | (d))
#else
   /* little endian  */
#  define MAKE_ID2(c, d)  ((d) << 8 | (c))
#endif

/* ID from database */
#define ID_SCE		MAKE_ID2('S', 'C') /* Scene */
#define ID_LI		MAKE_ID2('L', 'I') /* Library */
#define ID_OB		MAKE_ID2('O', 'B') /* Object */
#define ID_ME		MAKE_ID2('M', 'E') /* Mesh */
#define ID_CU		MAKE_ID2('C', 'U') /* Curve */
#define ID_MB		MAKE_ID2('M', 'B') /* MetaBall */
#define ID_MA		MAKE_ID2('M', 'A') /* Material */
#define ID_TE		MAKE_ID2('T', 'E') /* Tex (Texture) */
#define ID_IM		MAKE_ID2('I', 'M') /* Image */
#define ID_LT		MAKE_ID2('L', 'T') /* Lattice */
#define ID_LA		MAKE_ID2('L', 'A') /* Lamp */
#define ID_CA		MAKE_ID2('C', 'A') /* Camera */
#define ID_IP		MAKE_ID2('I', 'P') /* Ipo (depreciated, replaced by FCurves) */
#define ID_KE		MAKE_ID2('K', 'E') /* Key (shape key) */
#define ID_WO		MAKE_ID2('W', 'O') /* World */
#define ID_SCR		MAKE_ID2('S', 'R') /* Screen */
#define ID_SCRN		MAKE_ID2('S', 'N') /* (depreciated?) */
#define ID_VF		MAKE_ID2('V', 'F') /* VFont (Vector Font) */
#define ID_TXT		MAKE_ID2('T', 'X') /* Text */
#define ID_SPK		MAKE_ID2('S', 'K') /* Speaker */
#define ID_SO		MAKE_ID2('S', 'O') /* Sound */
#define ID_GR		MAKE_ID2('G', 'R') /* Group */
#define ID_ID		MAKE_ID2('I', 'D') /* (internal use only) */
#define ID_AR		MAKE_ID2('A', 'R') /* bArmature */
#define ID_AC		MAKE_ID2('A', 'C') /* bAction */
#define ID_SCRIPT	MAKE_ID2('P', 'Y') /* Script (depreciated) */
#define ID_NT		MAKE_ID2('N', 'T') /* bNodeTree */
#define ID_BR		MAKE_ID2('B', 'R') /* Brush */
#define ID_PA		MAKE_ID2('P', 'A') /* ParticleSettings */
#define ID_GD		MAKE_ID2('G', 'D') /* bGPdata, (Grease Pencil) */
#define ID_WM		MAKE_ID2('W', 'M') /* WindowManager */
#define ID_MC		MAKE_ID2('M', 'C') /* MovieClip */
#define ID_MSK		MAKE_ID2('M', 'S') /* Mask */
#define ID_LS		MAKE_ID2('L', 'S') /* FreestyleLineStyle */
#define ID_PAL		MAKE_ID2('P', 'L') /* Palette */
#define ID_PC		MAKE_ID2('P', 'C') /* PaintCurve  */

	/* NOTE! Fake IDs, needed for g.sipo->blocktype or outliner */
#define ID_SEQ		MAKE_ID2('S', 'Q')
			/* constraint */
#define ID_CO		MAKE_ID2('C', 'O')
			/* pose (action channel, used to be ID_AC in code, so we keep code for backwards compat) */
#define ID_PO		MAKE_ID2('A', 'C')
			/* used in outliner... */
#define ID_NLA		MAKE_ID2('N', 'L')
			/* fluidsim Ipo */
#define ID_FLUIDSIM	MAKE_ID2('F', 'S')

#define ID_REAL_USERS(id) (((ID *)id)->us - ((((ID *)id)->flag & LIB_FAKEUSER) ? 1 : 0))

#define ID_CHECK_UNDO(id) ((GS((id)->name) != ID_SCR) && (GS((id)->name) != ID_WM))

#define ID_BLEND_PATH(_bmain, _id) ((_id)->lib ? (_id)->lib->filepath : (_bmain)->name)

#ifdef GS
#  undef GS
#endif
#define GS(a)	(CHECK_TYPE_ANY(a, char *, const char *, char [66], const char[66]), (*((const short *)(a))))

#define ID_NEW(a)		if (      (a) && (a)->id.newid ) (a) = (void *)(a)->id.newid
#define ID_NEW_US(a)	if (      (a)->id.newid)       { (a) = (void *)(a)->id.newid;       (a)->id.us++; }
#define ID_NEW_US2(a)	if (((ID *)a)->newid)          { (a) = ((ID  *)a)->newid;     ((ID *)a)->us++;    }

/* id->flag: set first 8 bits always at zero while reading */
enum {
	LIB_LOCAL           = 0,
	LIB_EXTERN          = 1 << 0,
	LIB_INDIRECT        = 1 << 1,
	LIB_NEED_EXPAND     = 1 << 3,
	LIB_TESTEXT         = (LIB_NEED_EXPAND | LIB_EXTERN),
	LIB_TESTIND         = (LIB_NEED_EXPAND | LIB_INDIRECT),
	LIB_READ            = 1 << 4,
	LIB_NEED_LINK       = 1 << 5,

	LIB_NEW             = 1 << 8,
	LIB_FAKEUSER        = 1 << 9,
	/* free test flag */
	LIB_DOIT            = 1 << 10,
	/* tag existing data before linking so we know what is new */
	LIB_PRE_EXISTING    = 1 << 11,
	/* runtime */
	LIB_ID_RECALC       = 1 << 12,
	LIB_ID_RECALC_DATA  = 1 << 13,
	LIB_ANIM_NO_RECALC  = 1 << 14,

	LIB_ID_RECALC_ALL   = (LIB_ID_RECALC|LIB_ID_RECALC_DATA),
};

#ifdef __cplusplus
}
#endif

#endif
