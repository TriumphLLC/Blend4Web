#include "duWorld.h"

duWorld::duWorld(btDispatcher* dispatcher, 
        btBroadphaseInterface* pairCache, btConstraintSolver* constraintSolver,
        btCollisionConfiguration* collisionConfiguration) :
btDiscreteDynamicsWorld(dispatcher, pairCache, constraintSolver, 
        collisionConfiguration)
{

}

duWorld::~duWorld()
{

}

int	duWorld::preSimulation(btScalar timeStep, int maxSubSteps,
        btScalar fixedTimeStep)
{
    int numSimulationSubSteps = 0;

    if (maxSubSteps) {
        // fixed timestep
        m_fixedTimeStep = fixedTimeStep;
        m_localTime += timeStep;
        if (m_localTime >= fixedTimeStep) {
            numSimulationSubSteps = int(m_localTime / fixedTimeStep);
            m_localTime -= numSimulationSubSteps * fixedTimeStep;
        }
    } else {
        // variable timestep
        fixedTimeStep = timeStep;
        m_localTime = m_latencyMotionStateInterpolation ? 0 : timeStep;
        m_fixedTimeStep = 0;
        if (btFuzzyZero(timeStep)) {
            numSimulationSubSteps = 0;
            maxSubSteps = 0;
        } else {
            numSimulationSubSteps = 1;
            maxSubSteps = 1;
        }
    }

    if (numSimulationSubSteps) {
        // clamp the number of substeps, to prevent simulation grinding spiralling down to a halt
        int clampedSimulationSteps = (numSimulationSubSteps > maxSubSteps) ? 
                maxSubSteps : numSimulationSubSteps;

        saveKinematicState(fixedTimeStep * clampedSimulationSteps);

        return clampedSimulationSteps;
    } else {
        synchronizeMotionStates();
        return 0;
    }
}

btScalar duWorld::calcSimTime(btScalar timeline, int step, int clampedSimulationSteps)
{
    // equal to timeline for variable timestamp calculations
    btScalar simTime = timeline - m_localTime -
            (clampedSimulationSteps - 1 - step) * m_fixedTimeStep;

    return simTime;
}

void duWorld::singleStepSimulation(btScalar fixedTimeStep)
{
    applyGravity();
    internalSingleStepSimulation(fixedTimeStep);
}


void duWorld::postSimulation()
{
	clearForces();
}

/* vim: set et ts=4 sw=4: */
