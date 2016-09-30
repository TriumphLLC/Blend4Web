#include <math.h>
#include "BulletDynamics/ConstraintSolver/btTypedConstraint.h"
#include "duWater.h"
duWater::duWater(btScalar waterLevel):
m_firstWrapper(NULL), m_time(0), m_waterLevel(waterLevel)
{}

void duWater::appendWrapper(duWaterDynInfo* di, btScalar *array,
                 btScalar shoreMapSizeX, btScalar shoreMapSizeZ,
                 btScalar shoreMapCenterX, btScalar shoreMapCenterZ,
                 btScalar maxShoreDist, btScalar wavesHeight,
                 btScalar wavesLength, int   shoreMapTexSize)
{
    duWater::WaterWrapper *wWrapper = new duWater::WaterWrapper;
    wWrapper->wDistArray            = array;
    wWrapper->wWrapperNext          = NULL;
    wWrapper->dynamicsInfo          = di;
    wWrapper->shoreMapSizeX         = shoreMapSizeX;
    wWrapper->shoreMapSizeZ         = shoreMapSizeZ;
    wWrapper->shoreMapCenterX       = shoreMapCenterX;
    wWrapper->shoreMapCenterZ       = shoreMapCenterZ;
    wWrapper->maxShoreDist          = maxShoreDist;
    wWrapper->wavesHeight           = wavesHeight;
    wWrapper->wavesLength           = wavesLength;
    wWrapper->shoreMapTexSize       = shoreMapTexSize;

    if (!m_firstWrapper) {
        m_firstWrapper = wWrapper;
    } else {
        duWater::WaterWrapper *curr;
        for (curr = m_firstWrapper; curr->wWrapperNext; curr = curr->wWrapperNext);
        curr->wWrapperNext = wWrapper;
    }
}

duWater::~duWater()
{
    // create wrapper for new water object
    duWater::WaterWrapper *wrapper = m_firstWrapper;

    if (m_firstWrapper)
        do {
            free(wrapper->wDistArray);
            free(wrapper->dynamicsInfo);
            wrapper = wrapper->wWrapperNext;
        }
        while (wrapper);
}

btScalar duWater::getWaterLevel(btScalar pos_x,
                                btScalar pos_my,
                                int wrapperNum)
{

    // get water wrapper by index
    duWater::WaterWrapper *wWrapper = wrapperByInd(wrapperNum);

    if (!wWrapper || !wWrapper->wavesHeight)
        return m_waterLevel;

    float time = m_time;

    ////////// DISTANT WAVES //////////
    // first component
    float noise_coords[2];

    duWaterDynInfo* dynInfo = wWrapper->dynamicsInfo;

    noise_coords[0] = dynInfo->dst_noise_scale0 *
                          (pos_x + dynInfo->dst_noise_freq0 * time);
    noise_coords[1] = dynInfo->dst_noise_scale0 * 
                          (pos_my + dynInfo->dst_noise_freq0 * time);
    float noise1 = snoise(noise_coords);

    // second component
    noise_coords[0] = dynInfo->dst_noise_scale1 *
                          (pos_my - dynInfo->dst_noise_freq1 * time);
    noise_coords[1] = dynInfo->dst_noise_scale1 * 
                          (pos_x - dynInfo->dst_noise_freq1 * time);
    float noise2 = snoise(noise_coords);

    float dist_waves = wWrapper->wavesHeight * noise1 * noise2;

    float wave_height;

    if (wWrapper->wDistArray) {
        ////////// SHORE WAVES //////////
        // get coordinates in texture pixels
        double x = (pos_x - wWrapper->shoreMapCenterX) / wWrapper->shoreMapSizeX;
        double my = (wWrapper->shoreMapCenterZ + pos_my) / wWrapper->shoreMapSizeZ;
        x += 0.5f;
        my += 0.5f;

        // if position is out of boundings, consider that shore dist = 1
        if (x > 1.f || x < 0.f || my > 1.f || my < 0.f)
            wave_height = dist_waves;
        else {
            // get coordinates in pixels
            int array_width = wWrapper->shoreMapTexSize;
            x *= array_width - .5f;
            my *= array_width - .5f;

            double floor_px;
            double floor_py;
            float fract_px = modf(x, &floor_px);
            float fract_py = modf(my, &floor_py);

            int px = static_cast<int>(floor_px);
            int py = static_cast<int>(floor_py);

            btScalar *distArray = wWrapper->wDistArray;

            int up_lim = array_width - 1;

            float dist00 = distArray[py * array_width + px];
            float dist10 = distArray[py * array_width + btMin(px + 1, up_lim)];
            float dist01 = distArray[btMin(py + 1, up_lim) * array_width + px];
            float dist11 = distArray[btMin(py + 1, up_lim) * array_width + btMin(px + 1, up_lim)];

            // distance on bottom, top edge
            float dist0010 = dist00 * (1.f - fract_px) + dist10 * fract_px;
            float dist0111 = dist01 * (1.f - fract_px) + dist11 * fract_px;

            float shore_dist = dist0010 * (1.f - fract_py) + dist0111 * fract_py;

            float shore_waves_length = wWrapper->wavesLength / float(wWrapper->maxShoreDist) / M_PI;

            float waves_coords[2] = {dynInfo->dir_noise_scale *
                                 (pos_x + dynInfo->dir_noise_freq * time),
                                     dynInfo->dir_noise_scale *
                                 (pos_my + dynInfo->dir_noise_freq * time)};

            float dist_fact = sqrt(shore_dist);

            float shore_dir_waves = wWrapper->wavesHeight
                * fmax(shore_dist, dynInfo->dir_min_shore_fac)
                * sinf((dist_fact / shore_waves_length + dynInfo->dir_freq * time))
                * fmax(snoise(waves_coords), dynInfo->dir_min_noise_fac);
            // mix two types of waves basing on distance to the shore
            float mix_rate = btMax(dist_fact, dynInfo->dst_min_fac);
            wave_height = shore_dir_waves * (1 - mix_rate) + dist_waves * mix_rate;
        }
    } else
        wave_height = dist_waves;

    btScalar cur_water_level = m_waterLevel + wave_height;
    return cur_water_level;
}

int duWater::permute3(int x)
{
    x = ( ((34 * x) + 1) * x);
    return x % 289;
}

float duWater::snoise(float v[2])
{
    float C_x =  0.211324865405187; // (3.0-sqrt(3.0))/6.0
    float C_y =  0.366025403784439; // 0.5*(sqrt(3.0)-1.0)
    float C_z = -0.577350269189626; // -1.0 + 2.0 * C.x
    float C_w =  0.024390243902439; // 1.0 / 41.0

    // First corner
    float v_dot_Cyy = v[0] * C_y + v[1] * C_y;
    int i_x = floor(v[0] + v_dot_Cyy);
    int i_y = floor(v[1] + v_dot_Cyy);

    float i_dot_Cxx = i_x * C_x + i_y * C_x;
    float x0_x = v[0] - i_x + i_dot_Cxx;
    float x0_y = v[1] - i_y + i_dot_Cxx;

    // Other corners
    int i1_x = x0_x > x0_y ? 1 : 0;
    int i1_y = 1 - i1_x;

    float x12_x = x0_x + C_x - i1_x;
    float x12_y = x0_y + C_x - i1_y;
    float x12_z = x0_x + C_z;
    float x12_w = x0_y + C_z;

    // Permutations
    i_x %= 289; // Avoid truncation effects in permutation
    i_y %= 289;

    int p_x = permute3( permute3(i_y)        + i_x);
    int p_y = permute3( permute3(i_y + i1_y) + i_x + i1_x);
    int p_z = permute3( permute3(i_y + 1)    + i_x + 1);

    float m_x = fmax(0.5f - (x0_x  * x0_x  + x0_y  * x0_y ), 0.f);
    float m_y = fmax(0.5f - (x12_x * x12_x + x12_y * x12_y), 0.f);
    float m_z = fmax(0.5f - (x12_z * x12_z + x12_w * x12_w), 0.f);

    m_x *= m_x * m_x * m_x;
    m_y *= m_y * m_y * m_y;
    m_z *= m_z * m_z * m_z;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    double int_part;
    float x_x = 2.f * modf(double(p_x * C_w), &int_part) - 1.f;
    float x_y = 2.f * modf(double(p_y * C_w), &int_part) - 1.f;
    float x_z = 2.f * modf(double(p_z * C_w), &int_part) - 1.f;

    float h_x = fabs(x_x) - 0.5f;
    float h_y = fabs(x_y) - 0.5f;
    float h_z = fabs(x_z) - 0.5f;

    float ox_x = floor(x_x + 0.5f);
    float ox_y = floor(x_y + 0.5f);
    float ox_z = floor(x_z + 0.5f);
    
    float a0_x = x_x - ox_x;
    float a0_y = x_y - ox_y;
    float a0_z = x_z - ox_z;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m_x *= 1.79284291400159 - 0.85373472095314 * (a0_x * a0_x + h_x * h_x);
    m_y *= 1.79284291400159 - 0.85373472095314 * (a0_y * a0_y + h_y * h_y);
    m_z *= 1.79284291400159 - 0.85373472095314 * (a0_z * a0_z + h_z * h_z);

    // Compute final noise value at P
    float g_x = a0_x * x0_x + h_x * x0_y;
    float g_y = a0_y * x12_x + h_y * x12_y;
    float g_z = a0_z * x12_z + h_z * x12_w;

    float m_dot_g = m_x * g_x + m_y * g_y + m_z * g_z;
    return 130.f * m_dot_g;
}

