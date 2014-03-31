#ifndef DU_BOAT_H
#define DU_BOAT_H

#include "BulletDynamics/Dynamics/btRigidBody.h"
class btDynamicsWorld;
#include "LinearMath/btAlignedObjectArray.h"
#include "BulletDynamics/Dynamics/btActionInterface.h"

#include "duWater.h"

struct duBobInfoConstructionInfo
{
	btVector3	m_hullConnectionCS;
	btVector3	m_bobDirectionCS;
	btVector3	m_bobAxleCS;
};

struct duBobInfo
{
	btTransform	m_worldTransform;

    btVector3	m_hardPointWS;      // connection point in worldspace
    btVector3	m_bobDirectionWS;   // direction in worldspace
    btVector3	m_bobAxleWS;        // axle in worldspace
    bool		m_isInContact;
	
	btVector3	m_hullConnectionPointCS; //const
	btVector3	m_bobDirectionCS;        //const
	btVector3	m_bobAxleCS;             // const or modified by steering
	btScalar	m_rotation;

	btScalar	m_brake;
	
	duBobInfo(duBobInfoConstructionInfo& ci)
	{
		m_hullConnectionPointCS = ci.m_hullConnectionCS;
		m_bobDirectionCS = ci.m_bobDirectionCS;
		m_bobAxleCS = ci.m_bobAxleCS;
		m_rotation = btScalar(0.);
		m_brake = btScalar(0.);
	}
};

class duBoat : public btActionInterface
{
private:

    btScalar m_steeringValue; 
    btScalar m_engineForce; 
    btScalar m_currentVehicleSpeedKmHour;
    btScalar m_floatingFactor;
    btScalar m_defaultLinDamping;
    btScalar m_defaultRotDamping;
    btScalar m_waterLinDamping;
    btScalar m_waterRotDamping;

    btRigidBody* m_hullBody;

    duWater* m_water; 
    int m_waterInd;

    int m_indexRightAxis;
    int m_indexUpAxis;
    int m_indexForwardAxis;

    void defaultInit();

public:
    //constructor to create a boat from an existing rigidbody
    duBoat(btRigidBody* hull, btScalar floatingFactor,
           btScalar waterLinDamping, btScalar waterRotDamping);

    virtual ~duBoat();

    ///btActionInterface interface
    virtual void updateAction( btCollisionWorld* collisionWorld, btScalar step)
    {
        (void) collisionWorld;
        updateBoat(step);
    }
    
    ///btActionInterface interface
    void debugDraw(btIDebugDraw* debugDrawer) { };

    const btTransform& getHullWorldTransform() const;
    
    virtual void updateBoat(btScalar step);

    btScalar getWaterDist(duBobInfo& bob);
    
    btScalar getSteeringValue() const;

    void setSteeringValue(btScalar steering);

    void applyEngineForce(btScalar force); 

    const btTransform&  getBobTransformWS(int bobIndex) const;

    void updateBobTransform(int bobIndex, bool interpolatedTransform = true);
    

    duBobInfo& addBob( const btVector3& connectionPointCS);

    inline int getNumBobs() const
    {
        return int (m_bobInfo.size());
    }
    
    btAlignedObjectArray<duBobInfo>   m_bobInfo;


    const duBobInfo&  getBobInfo(int index) const;

    duBobInfo& getBobInfo(int index);

    void updateBobTransformsWS(duBobInfo& bob, bool interpolatedTransform = true);

    
    void setBrake(btScalar brake,int bobIndex);

    void setWater(duWater* water) {
        m_water = water;
        m_waterInd = 0;
    }

    void setWaterWrapperInd(int ind) {
        m_waterInd = ind;
    }

    inline btRigidBody* getRigidBody()
    {
        return m_hullBody;
    }

    const btRigidBody* getRigidBody() const
    {
        return m_hullBody;
    }

    inline int  getRightAxis() const
    {
        return m_indexRightAxis;
    }
    inline int getUpAxis() const
    {
        return m_indexUpAxis;
    }

    inline int getForwardAxis() const
    {
        return m_indexForwardAxis;
    }

    // velocity of vehicle (positive if velocity vector has same direction as foward vector)
    btScalar    getCurrentSpeedKmHour() const
    {
        return m_currentVehicleSpeedKmHour;
    }

    virtual void    setCoordinateSystem(int rightIndex,int upIndex,int forwardIndex)
    {
        m_indexRightAxis = rightIndex;
        m_indexUpAxis = upIndex;
        m_indexForwardAxis = forwardIndex;
    }
};

#endif //DU_BOAT_H

