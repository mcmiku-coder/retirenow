
// Insert at start of ScenarioResult component
console.log('ScenarioResult Render Debug:', {
    locationState: location.state,
    loading,
    userData: !!userData,
    hasProjection: !!projection?.yearlyBreakdown?.length,
    missingPages
});

if (location.state?.focusYears) {
    console.log('Focus years received:', location.state.focusYears);
}
