
/**
 * verify_wiring_3.9.js
 */

async function testWiring() {
    // 1. Mock the backward-compatible function logic
    async function runInvestedBookSimulation(arg1, arg2, arg3) {
        const params = (arg1 && Array.isArray(arg1))
            ? { assets: arg1, scenarioData: arg2, userData: arg3 }
            : (arg1 || {});

        const { assets, scenarioData, userData, projection } = params;

        console.log("Input Check:", {
            hasAssets: !!assets,
            hasScenario: !!scenarioData,
            hasUser: !!userData,
            hasProjection: !!projection
        });

        return {
            percentiles: { p5: new Float64Array(10), p10: new Float64Array(10) },
            simulationStartDate: "2026-01-01T00:00:00.000Z"
        };
    }

    const assets = [1, 2, 3];
    const scenarioData = { s: 1 };
    const userData = { u: 1 };
    const projection = { p: 1 };

    console.log("--- TEST 1: POSITIONAL (Scenario 1) ---");
    await runInvestedBookSimulation(assets, scenarioData, userData);

    console.log("\n--- TEST 2: OBJECT-BASED (Scenario 2) ---");
    const portfolioSimulation = await runInvestedBookSimulation({
        assets,
        scenarioData,
        userData,
        projection
    });

    console.log("\n[MC RUN] LOG SIMULATION:", {
        hasInvested: true,
        gotSim: !!portfolioSimulation,
        p5Len: portfolioSimulation?.percentiles?.p5?.length,
        p10Len: portfolioSimulation?.percentiles?.p10?.length
    });
}

testWiring();
