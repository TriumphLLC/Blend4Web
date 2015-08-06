#ifndef DU_WATER_H
#define DU_WATER_H
#include "BulletDynamics/Dynamics/btActionInterface.h"

struct duWaterDynInfo
{
    btScalar dst_noise_scale0;
    btScalar dst_noise_scale1;
    btScalar dst_noise_freq0;
    btScalar dst_noise_freq1;
    btScalar dir_min_shore_fac;
    btScalar dir_freq;
    btScalar dir_noise_scale;
    btScalar dir_noise_freq;
    btScalar dir_min_noise_fac;
    btScalar dst_min_fac;
    btScalar waves_hor_fac;
};

class duWater {
private:
    struct WaterWrapper {
        btScalar *wDistArray;
        WaterWrapper *wWrapperNext;

        btScalar shoreMapSizeX;
        btScalar shoreMapSizeZ;
        btScalar shoreMapCenterX;
        btScalar shoreMapCenterZ;
        btScalar maxShoreDist;
        btScalar wavesHeight;
        btScalar wavesLength;
        int shoreMapTexSize;
        duWaterDynInfo* dynamicsInfo;

    };

    WaterWrapper *m_firstWrapper;
    btScalar m_time;
    btScalar m_waterLevel;
public:
    duWater(btScalar waterLevel);
    ~duWater();

    void appendWrapper(duWaterDynInfo* di, btScalar *array,
                 btScalar shoreMapSizeX, btScalar shoreMapSizeZ,
                 btScalar shoreMapCenterX, btScalar shoreMapCenterZ,
                 btScalar maxShoreDist, btScalar wavesHeight,
                 btScalar wavesLength, int   shoreMapTexSize);

    btScalar getWaterLevel(btScalar x, btScalar y, int wrapperNum);

    WaterWrapper* wrapperByInd(int ind) {
        WaterWrapper *wrapper = m_firstWrapper;
        for (int i = 0; i != ind; i++) {
            wrapper = wrapper->wWrapperNext;
        }
        return wrapper;
    };

	void setWaterTime(btScalar time) {
        m_time = time;
    }

    // some Math stuff
    int permute3(int x);
    float snoise(float v[2]);
};

#endif
