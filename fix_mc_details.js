const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MonteCarloDetails.js', 'utf8');

// --- Change 1: Swap the two table cards (History first, then Characteristics) ---
const char2Block = c.indexOf('                {/* 2. Asset Characteristics */}');
const hist3Block = c.indexOf('                {/* 3. History Insight */}');
const mat4Block = c.indexOf('                {/* 4. Matrices */}');

if (char2Block !== -1 && hist3Block !== -1 && mat4Block !== -1) {
    const charSection = c.slice(char2Block, hist3Block);
    const histSection = c.slice(hist3Block, mat4Block);
    c = c.slice(0, char2Block)
        + histSection.replace('3. History Insight', '2. History Insight (shown first)')
        + charSection.replace('2. Asset Characteristics', '3. Asset Characteristics (shown second)')
        + c.slice(mat4Block);
    console.log('Change 1 (swap tables) applied');
} else {
    console.log('Change 1 SKIP - markers not found');
}

// --- Change 2: Add subtitle under Caracteristiques des Instruments CardTitle ---
const subtitleTarget = `language === 'fr' ? 'Caract\u00e9ristiques des Instruments' : 'Instrument Characteristics'\n                        </CardTitle>`;
const subtitleReplacement = `language === 'fr' ? 'Caract\u00e9ristiques des Instruments' : 'Instrument Characteristics'\n                        </CardTitle>\n                        <p className="text-xs text-slate-500 italic mt-1">\n                            ({language === 'fr'\n                                ? 'bas\u00e9 sur les p\u00e9riodes et donn\u00e9es historiques mentionn\u00e9es ci-dessus'\n                                : 'based on the historical periods and data mentioned above'})\n                        </p>`;

if (c.includes(subtitleTarget)) {
    c = c.replace(subtitleTarget, subtitleReplacement);
    console.log('Change 2 (subtitle) applied');
} else {
    console.log('Change 2 SKIP - marker not found');
}

// --- Change 3: Max drawdown cell - show period below value ---
const ddOld = '<td className="px-4 py-3 text-right text-amber-500/80">{asset.maxDrawdown.toFixed(2)}%</td>';
const ddNew = '<td className="px-4 py-3 text-right text-amber-500/80"><div className="font-semibold">{asset.maxDrawdown.toFixed(2)}%</div>{asset.maxDrawdownPeriod && (<div className="text-[10px] text-slate-500 italic mt-0.5">{asset.maxDrawdownPeriod}</div>)}</td>';

if (c.includes(ddOld)) {
    c = c.replace(ddOld, ddNew);
    console.log('Change 3 (maxDrawdownPeriod display) applied');
} else {
    console.log('Change 3 SKIP - marker not found');
}

fs.writeFileSync('frontend/src/pages/MonteCarloDetails.js', c, 'utf8');
console.log('File written OK - encoding: utf8');
