//-----------------------------------------------------------------------------
//  This is an implementation of Tom Forsyth's "Linear-Speed Vertex Cache
//  Optimization" algorithm as described here:
//  http://home.comcast.net/~tom_forsyth/papers/fast_vert_cache_opt.html
//
//  This code was authored and released into the public domain by
//  Adrian Stone (stone@gameangst.com).
//
//  THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT
//  SHALL ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE FOR ANY DAMAGES OR OTHER
//  LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
//  IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//-----------------------------------------------------------------------------

#include <assert.h>
#include <math.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <limits.h>

#include "vertex_cache.h"

typedef unsigned int uint;
typedef unsigned char byte;

#define kMaxVertexCacheSize 64
#define kMaxPrecomputedVertexValenceScores 64
float s_vertexCacheScores[kMaxVertexCacheSize+1][kMaxVertexCacheSize];
float s_vertexValenceScores[kMaxPrecomputedVertexValenceScores];

struct OptimizeVertexData
    {
        float   score;
        uint    activeFaceListStart;
        uint    activeFaceListSize;
        int  cachePos0;
        int  cachePos1;
    };

// code for computing vertex score was taken, as much as possible
// directly from the original publication.
float ComputeVertexCacheScore(int cachePosition, int vertexCacheSize)
{
    const float FindVertexScore_CacheDecayPower = 1.5f;
    const float FindVertexScore_LastTriScore = 0.75f;

    float score = 0.0f;
    if ( cachePosition < 0 )
    {
        // Vertex is not in FIFO cache - no score.
    }
    else
    {
        if ( cachePosition < 3 )
        {
            // This vertex was used in the last triangle,
            // so it has a fixed score, whichever of the three
            // it's in. Otherwise, you can get very different
            // answers depending on whether you add
            // the triangle 1,2,3 or 3,1,2 - which is silly.
            score = FindVertexScore_LastTriScore;
        }
        else
        {
            assert ( cachePosition < vertexCacheSize );
            // Points for being high in the cache.
            const float scaler = 1.0f / ( vertexCacheSize - 3 );
            score = 1.0f - ( cachePosition - 3 ) * scaler;
            score = powf ( score, FindVertexScore_CacheDecayPower );
        }
    }

    return score;
}

float ComputeVertexValenceScore(uint numActiveFaces)
{
    const float FindVertexScore_ValenceBoostScale = 2.0f;
    const float FindVertexScore_ValenceBoostPower = 0.5f;

    float score = 0.f;

    // Bonus points for having a low number of tris still to
    // use the vert, so we get rid of lone verts quickly.
    float valenceBoost = powf ( (float)(numActiveFaces),
        -FindVertexScore_ValenceBoostPower );
    score += FindVertexScore_ValenceBoostScale * valenceBoost;

    return score;
}

void ComputeVertexScores(void)
{
    for (int cacheSize=0; cacheSize<=kMaxVertexCacheSize; ++cacheSize)
    {
        for (int cachePos=0; cachePos<cacheSize; ++cachePos)
        {
            s_vertexCacheScores[cacheSize][cachePos] = ComputeVertexCacheScore(cachePos, cacheSize);
        }
    }

    for (uint valence=0; valence<kMaxPrecomputedVertexValenceScores; ++valence)
    {
        s_vertexValenceScores[valence] = ComputeVertexValenceScore(valence);
    }
}

float FindVertexScore(uint numActiveFaces, uint cachePosition, uint vertexCacheSize)
{

    if ( numActiveFaces == 0 )
    {
        // No tri needs this vertex!
        return -1.0f;
    }

    float score = 0.f;
    if (cachePosition < vertexCacheSize)
    {
        score += s_vertexCacheScores[vertexCacheSize][cachePosition];
    }

    if (numActiveFaces < kMaxPrecomputedVertexValenceScores)
    {
        score += s_vertexValenceScores[numActiveFaces];
    }
    else
    {
        score += ComputeVertexValenceScore(numActiveFaces);
    }

    return score;
}

uint *find(uint *first, uint *last, const uint val)
{
  while (first!=last) {
    if (*first==val) return first;
    ++first;
  }
  return last;
}

//-----------------------------------------------------------------------------
//  OptimizeFaces
//-----------------------------------------------------------------------------
//  Parameters:
//      indexList
//          input index list
//      indexCount
//          the number of indices in the list
//      vertexCount
//          the largest index value in indexList
//      newIndexList
//          a pointer to a preallocated buffer the same size as indexList to
//          hold the optimized index list
//      lruCacheSize
//          the size of the simulated post-transform cache (max:64)
//-----------------------------------------------------------------------------
void OptimizeFaces(const int* indexList, uint indexCount, uint vertexCount,
        int* newIndexList, int lruCacheSize)
{
    struct OptimizeVertexData *vertexDataList;
    vertexDataList = malloc(vertexCount * sizeof(struct OptimizeVertexData));
    uint i,j,k,v,c0,c1, *activeFaceList, curActiveFaceListPos = 0;
    float maxValenceScore;
    int index;
    const int kEvictedCacheIndex = INT_MAX;
    byte *processedFaceList;
    int vertexCacheBuffer[(kMaxVertexCacheSize+3)*2];
    int* cache0 = vertexCacheBuffer;
    int* cache1 = vertexCacheBuffer+(kMaxVertexCacheSize+3);
    int entriesInCache0 = 0, faceIndex;

    uint bestFace = 0;
    float bestScore = -1.f, faceScore;
    uint face;
    int entriesInCache1, *int_tmp;
    uint *begin, *end, *it, uint_tmp;

    for (i=0; i<vertexCount; ++i)
    {   
        vertexDataList[i].score = 0.0;
        vertexDataList[i].activeFaceListStart = 0;
        vertexDataList[i].activeFaceListSize = 0;
        vertexDataList[i].cachePos0 = 0;
        vertexDataList[i].cachePos1 = 0;
    }

    for (i=0; i<(kMaxVertexCacheSize+3)*2; ++i) {
        vertexCacheBuffer[i] = 0;
    }

    ComputeVertexScores();

    // compute face count per vertex
    for (i=0; i<indexCount; ++i) {
        index = indexList[i];
        assert(index < vertexCount);
        vertexDataList[index].activeFaceListSize++;
    }

    // allocate face list per vertex
    for (i=0; i<vertexCount; ++i) {
        vertexDataList[i].cachePos0 = kEvictedCacheIndex;
        vertexDataList[i].cachePos1 = kEvictedCacheIndex;
        vertexDataList[i].activeFaceListStart = curActiveFaceListPos;
        curActiveFaceListPos += vertexDataList[i].activeFaceListSize;
        vertexDataList[i].score = FindVertexScore(vertexDataList[i].activeFaceListSize,
                vertexDataList[i].cachePos0, lruCacheSize);
        vertexDataList[i].activeFaceListSize = 0;
    }
    activeFaceList = malloc(curActiveFaceListPos * sizeof(uint));
    memset(activeFaceList, 0, curActiveFaceListPos * sizeof(uint));

    // fill out face list per vertex
    for (i=0; i<indexCount; i+=3) {
        for (j=0; j<3; ++j) {
            index = indexList[i+j];
            activeFaceList[vertexDataList[index].activeFaceListStart
                    + vertexDataList[index].activeFaceListSize] = i;
            vertexDataList[index].activeFaceListSize++;
        }
    }

    processedFaceList = malloc(indexCount * sizeof(byte));
    memset(processedFaceList, 0, sizeof(byte) * indexCount);

    maxValenceScore = FindVertexScore(1, kEvictedCacheIndex, lruCacheSize) * 3.f;

    for (i = 0; i < indexCount; i += 3) {
        if (bestScore < 0.f) {
            // no verts in the cache are used by any unprocessed faces so
            // search all unprocessed faces for a new starting point
            for (j = 0; j < indexCount; j += 3) {
                if (processedFaceList[j] == 0) {
                    face = j;
                    faceScore = 0.f;
                    for (k=0; k<3; ++k) {
                        index = indexList[face+k];
                        assert(vertexDataList[index].activeFaceListSize > 0);
                        assert(vertexDataList[index].cachePos0 >= lruCacheSize);
                        faceScore += vertexDataList[index].score;
                    }
                    if (faceScore > bestScore) {
                        bestScore = faceScore;
                        bestFace = face;

                        assert(bestScore <= maxValenceScore);
                        if (bestScore >= maxValenceScore) {   
                            break;
                        }
                    }
                }
            }
            assert(bestScore >= 0.f);
        }
        processedFaceList[bestFace] = 1;
        entriesInCache1 = 0;

        // add bestFace to LRU cache and to newIndexList
        for (v = 0; v < 3; ++v) {
            index = indexList[bestFace+v];
            newIndexList[i+v] = index;

            if (vertexDataList[index].cachePos1 >= entriesInCache1) {
                vertexDataList[index].cachePos1 = entriesInCache1;
                cache1[entriesInCache1++] = index;

                if (vertexDataList[index].activeFaceListSize == 1) {
                    --vertexDataList[index].activeFaceListSize;
                    continue;
                }
            }

            assert(vertexDataList[index].activeFaceListSize > 0);
            begin = &activeFaceList[vertexDataList[index].activeFaceListStart];
            end = &(activeFaceList[vertexDataList[index].activeFaceListStart 
                    + vertexDataList[index].activeFaceListSize - 1]) + 1;
            it = find(begin, end, bestFace);
            assert(it != end);
            uint_tmp = *it;
            *it = *(end-1);
            *(end-1) = uint_tmp;
            --vertexDataList[index].activeFaceListSize;
            vertexDataList[index].score = FindVertexScore(vertexDataList[index].activeFaceListSize,
                    vertexDataList[index].cachePos1, lruCacheSize);

        }
        // move the rest of the old verts in the cache down and compute their new scores
        for (c0 = 0; c0 < entriesInCache0; ++c0) {
            index = cache0[c0];

            if (vertexDataList[index].cachePos1 >= entriesInCache1) {
                vertexDataList[index].cachePos1 = entriesInCache1;
                cache1[entriesInCache1++] = index;
                vertexDataList[index].score = FindVertexScore(vertexDataList[index].activeFaceListSize,
                        vertexDataList[index].cachePos1, lruCacheSize);
            }
        }
        // find the best scoring triangle in the current cache (including up to 3 that were just evicted)
        bestScore = -1.f;
        for (c1 = 0; c1 < entriesInCache1; ++c1) {
            index = cache1[c1];
            vertexDataList[index].cachePos0 = vertexDataList[index].cachePos1;
            vertexDataList[index].cachePos1 = kEvictedCacheIndex;
            for (j=0; j<vertexDataList[index].activeFaceListSize; ++j) {
                face = activeFaceList[vertexDataList[index].activeFaceListStart+j];
                faceScore = 0.f;
                for (v=0; v<3; v++) {
                    faceIndex = indexList[face+v];
                    faceScore += vertexDataList[faceIndex].score;
                }
                if (faceScore > bestScore) {
                    bestScore = faceScore;
                    bestFace = face;
                }
            }
        }
        int_tmp = cache0;
        cache0 = cache1;
        cache1 = int_tmp;
        entriesInCache0 = (((entriesInCache1) <= (lruCacheSize)) ? (entriesInCache1) : (lruCacheSize));
    }
    free(vertexDataList);
    free(activeFaceList);
    free(processedFaceList);
}
