/**
 * PDF Page Generators - Part 3
 * Pages 7-9: Simulation Choice, Retirement Benefits, Data Review
 */

import autoTable from 'jspdf-autotable';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    checkPageBreak
} from './pdfHelpers';

/**
 * Helper to translate owner codes into readable names
 */
const getOwnerText = (item, userData, language) => {
    const ownerCode = item.owner || item.person;
    if (!ownerCode) return language === 'fr' ? 'Partagé' : 'Shared';
    
    // Normalize code for comparison
    const code = String(ownerCode).toLowerCase();
    
    if (code === 'p1' || code.includes('person 1') || code.includes('personne 1') || (userData?.firstName && code === userData.firstName.toLowerCase())) {
        return userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
    }
    if (code === 'p2' || code.includes('person 2') || code.includes('personne 2') || (userData?.firstName2 && code === userData.firstName2.toLowerCase())) {
        return userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
    }
    if (code === 'consolidated' || code === 'consolidé') {
         return language === 'fr' ? 'Consolidé' : 'Consolidated';
    }
    
    return language === 'fr' ? 'Partagé' : 'Shared';
};

export const getOwnerBadgeHooks = (isCouple, userData, language) => {
    if (!isCouple) return {};
    return {
        didParseCell: function(data) {
            if (data.section === 'body' && data.table.columns && data.column.index === data.table.columns.length - 1) {
                // Ensure owner column aligns center
                data.cell.styles.halign = 'center';
                // Make original text match background so it disappears, letting us draw badge on top
                data.cell.styles.textColor = data.cell.styles.fillColor || [255, 255, 255];
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'body' && data.table.columns && data.column.index === data.table.columns.length - 1 && data.cell.raw) {
                const pdf = data.doc;
                const textStr = String(data.cell.raw);
                
                let isP1 = false, isP2 = false, isShared = false, isConsolidated = false;
                const p1Fallback = language === 'fr' ? 'Personne 1' : 'Person 1';
                const p2Fallback = language === 'fr' ? 'Personne 2' : 'Person 2';

                const p1Name = userData.firstName || p1Fallback;
                const p2Name = userData.firstName2 || p2Fallback;

                if (textStr === p1Name || textStr === 'Person 1' || textStr === 'Personne 1') isP1 = true;
                else if (textStr === p2Name || textStr === 'Person 2' || textStr === 'Personne 2') isP2 = true;
                else if (textStr === 'Consolidated' || textStr === 'Consolidé') isConsolidated = true;
                else if (textStr === 'Shared' || textStr === 'Partagé') isShared = true;

                if (!isP1 && !isP2 && !isShared && !isConsolidated) return;

                let bgColor = [243, 244, 246]; // gray-100
                let textColor = [75, 85, 99]; // gray-600

                if (isP1) {
                    bgColor = [219, 234, 254]; // blue-100
                    textColor = [30, 64, 175]; // blue-800
                } else if (isP2) {
                    bgColor = [243, 232, 255]; // purple-100
                    textColor = [107, 33, 168]; // purple-800
                } else if (isConsolidated) {
                    bgColor = [254, 243, 199]; // amber-100
                    textColor = [146, 64, 14]; // amber-800
                }

                // Re-paint cell background slightly inset to clear text remnants
                const resolvedBg = data.cell.styles.fillColor || [255, 255, 255];
                if (Array.isArray(resolvedBg)) {
                    pdf.setFillColor(resolvedBg[0], resolvedBg[1], resolvedBg[2]);
                } else if (resolvedBg === false || resolvedBg === 'transparent') {
                    pdf.setFillColor(255, 255, 255);
                } else {
                    pdf.setFillColor(resolvedBg);
                }
                pdf.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

                pdf.setFont('helvetica', 'normal');
                const fontSize = (data.cell.styles.fontSize || 6) - 1.5; // reduced by ~20%
                pdf.setFontSize(fontSize);
                const textWidth = pdf.getTextWidth(textStr);
                
                const badgePaddingX = 2; // reduced padding
                const badgePaddingY = 0.8; // reduced padding
                const rectWidth = textWidth + badgePaddingX * 2; 
                // Approx height based on JS-PDF font metric multiplier
                const rectHeight = fontSize * 0.4 + badgePaddingY * 2; 
                
                const xPos = data.cell.x + (data.cell.width - rectWidth) / 2;
                const yPos = data.cell.y + (data.cell.height - rectHeight) / 2;

                pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                pdf.roundedRect(xPos, yPos, rectWidth, rectHeight, 1.5, 1.5, 'F');

                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.setFont('helvetica', 'bold');
                const textX = xPos + badgePaddingX;
                // Center text vertically relative to baseline
                const textY = yPos + rectHeight - badgePaddingY - (fontSize * 0.05);
                pdf.text(textStr, textX, textY);
            }
            
            // Draw fine horizontal separation line at the bottom of the cell
            if (data.section === 'body' || data.section === 'head') {
                const pdf = data.doc;
                pdf.saveGraphicsState();
                pdf.setLineWidth(0.1);
                pdf.setDrawColor(180, 180, 180); // Darker gray for separation
                pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                pdf.restoreGraphicsState();
            }

            if (data.section === 'body' && data.table.columns && data.column.index === 0 && data.cell.raw) {
                // Handle [SPLIT] badge and [CHILD] indent in the first column (Name)
                const textStr = String(data.cell.raw);
                if (textStr.includes(' [SPLIT]') || textStr.startsWith('[CHILD] ')) {
                    const pdf = data.doc;
                    const isSplit = textStr.includes(' [SPLIT]');
                    const isChild = textStr.startsWith('[CHILD] ');

                    let cleanText = textStr;
                    if (isSplit) cleanText = cleanText.replace(' [SPLIT]', '');
                    if (isChild) cleanText = cleanText.replace('[CHILD] ', '');
                    
                    // Repaint the cell background to clear the text
                    const resolvedBg = data.cell.styles.fillColor || [255, 255, 255];
                    if (Array.isArray(resolvedBg)) {
                        pdf.setFillColor(resolvedBg[0], resolvedBg[1], resolvedBg[2]);
                    } else if (resolvedBg === false || resolvedBg === 'transparent') {
                        pdf.setFillColor(255, 255, 255);
                    } else {
                        pdf.setFillColor(resolvedBg);
                    }
                    pdf.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

                    pdf.setFont('helvetica', data.cell.styles.fontStyle || 'normal');
                    const fontSize = data.cell.styles.fontSize || 8;
                    pdf.setFontSize(fontSize);
                    
                    const resolvedTextColor = data.cell.styles.textColor || [0, 0, 0];
                    if (Array.isArray(resolvedTextColor)) {
                        pdf.setTextColor(resolvedTextColor[0], resolvedTextColor[1], resolvedTextColor[2]);
                    } else {
                        pdf.setTextColor(resolvedTextColor);
                    }
                    
                    const textY = data.cell.y + data.cell.height / 2 + fontSize * 0.12; // approximate baseline
                    let textX = data.cell.x + data.cell.padding('left');
                    
                    if (isChild) {
                        const indent = 4;
                        textX += indent;
                        
                        pdf.setTextColor(96, 165, 250); // blue-400
                        pdf.text('->', textX, textY);
                        const arrowWidth = pdf.getTextWidth('-> ');
                        
                        textX += arrowWidth;
                        
                        // restore text color
                        if (Array.isArray(resolvedTextColor)) {
                            pdf.setTextColor(resolvedTextColor[0], resolvedTextColor[1], resolvedTextColor[2]);
                        } else {
                            pdf.setTextColor(resolvedTextColor);
                        }
                    }

                    // Draw the clean text
                    pdf.text(cleanText, textX, textY);

                    // Draw the [SPLIT] badge
                    if (isSplit) {
                        const textWidth = pdf.getTextWidth(cleanText);
                        const badgeText = 'SPLIT';
                        
                        pdf.setFont('helvetica', 'bold');
                        const badgeFontSize = fontSize - 2; // reduced by ~20%
                        pdf.setFontSize(badgeFontSize);
                        const badgeTextWidth = pdf.getTextWidth(badgeText);
                        
                        const badgePaddingX = 1.5; // reduced padding
                        const badgePaddingY = 0.6; // reduced padding
                        const rectWidth = badgeTextWidth + badgePaddingX * 2;
                        const rectHeight = badgeFontSize * 0.4 + badgePaddingY * 2;
                        
                        const badgeXPos = textX + textWidth + 3; // 3px margin from text
                        const badgeYPos = data.cell.y + (data.cell.height - rectHeight) / 2;

                        // bg-blue-500/20 equivalent approx
                        pdf.setFillColor(219, 234, 254);
                        pdf.roundedRect(badgeXPos, badgeYPos, rectWidth, rectHeight, 1, 1, 'F');

                        // text-blue-400 equivalent approx
                        pdf.setTextColor(96, 165, 250); 
                        pdf.text(badgeText, badgeXPos + badgePaddingX, badgeYPos + rectHeight - badgePaddingY - (badgeFontSize * 0.05));
                    }
                }
            }
        }
    };
};

const getDisplayName = (item) => {
    let name = item.name || 'N/A';
    const isChild = item.parentId !== undefined && item.parentId !== null;
    const isParent = item.groupId !== undefined && item.groupId !== null && !isChild;
    
    if (isChild) {
        name = `[CHILD] ${name}`; // Ensure the marker is used instead of unicode
    } else if (isParent) {
        name = `${name} [SPLIT]`; // Add split marker for the hook to catch
    }
    return name;
};

/**
 * Page 7: Simulation Choice
 */
export const generateSimulationChoice = (pdf, scenarioData, userData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Choix de simulation' : 'Simulation choice',
        null,
        20
    );

    yPos += 5;

    // Retirement option
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Option de retraite choisie' : 'Chosen retirement option', 15, yPos);
    yPos += 8;

    const option = scenarioData?.retirementOption || 'option1';

    // Calculate ages for display
    const birthDate1 = new Date(userData.birthDate);
    const retireDate1 = new Date(scenarioData?.wishedRetirementDate || userData.theoreticalDeathDate);
    const retireAge1 = retireDate1.getFullYear() - birthDate1.getFullYear();

    let retireAge2 = null;
    if (isCouple && userData.birthDate2) {
        const birthDate2 = new Date(userData.birthDate2);
        const retireDate2 = new Date(scenarioData?.wishedRetirementDate2 || userData.theoreticalDeathDate2);
        retireAge2 = retireDate2.getFullYear() - birthDate2.getFullYear();
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    let optionText = '';
    if (option === 'option0') {
        optionText = language === 'fr' ? `Retraite à l'âge légal` : `Legal retirement age`;
    } else if (option === 'option1') {
        optionText = language === 'fr' ? `Retraite anticipée avec pension LPP` : `Early retirement with LPP pension`;
    } else if (option === 'option2') {
        optionText = language === 'fr' ? `Retraite anticipée avec capital LPP` : `Early retirement with LPP capital`;
    } else if (option === 'option3') {
        optionText = language === 'fr' ? `Optimisation de la date de retraite` : `Retirement date optimization`;
    }

    pdf.text(optionText, 20, yPos);
    yPos += 10;

    // Retirement details
    const detailsHead = isCouple
        ? [['', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [['', language === 'fr' ? 'Valeur' : 'Value']];

    const detailsData = [
        [
            language === 'fr' ? 'Âge de retraite souhaité' : 'Desired retirement age',
            `${retireAge1} ${language === 'fr' ? 'ans' : 'years'}`
        ],
        [
            language === 'fr' ? 'Date de retraite souhaitée' : 'Desired retirement date',
            formatDate(scenarioData?.wishedRetirementDate)
        ]
    ];

    if (isCouple) {
        detailsData[0].push(`${retireAge2} ${language === 'fr' ? 'ans' : 'years'}`);
        detailsData[1].push(formatDate(scenarioData?.wishedRetirementDate2));
    }

    if (scenarioData?.pensionCapital) {
        const row = [language === 'fr' ? 'Capital de pension actuel' : 'Current pension capital', formatCurrency(scenarioData.pensionCapital)];
        if (isCouple) row.push(formatCurrency(scenarioData.pensionCapital2));
        detailsData.push(row);
    }

    if (scenarioData?.projectedLPPPension && option === 'option1') {
        const row = [language === 'fr' ? 'Pension LPP projetée (annuelle)' : 'Projected LPP pension (annual)', formatCurrency(scenarioData.projectedLPPPension)];
        if (isCouple) row.push(formatCurrency(scenarioData.projectedLPPPension2));
        detailsData.push(row);
    }

    autoTable(pdf, {
        startY: yPos,
        head: detailsHead,
        body: detailsData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 }
        },
        margin: { left: 20 },
        didDrawCell: function(data) {
            // Draw bottom line even for plain theme
            const pdf = data.doc;
            pdf.saveGraphicsState();
            pdf.setLineWidth(0.1);
            pdf.setDrawColor(180, 180, 180);
            pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            pdf.restoreGraphicsState();
        }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 8: Retirement Benefits
 */
export const generateRetirementBenefits = (pdf, scenarioData, userData, retirementData, language, pageNum, totalPages) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Prestations de retraite' : 'Retirement benefits',
        language === 'fr' ? 'Saisie détaillée des prestations et de l\'âge de simulation' : 'Detailed input of benefits and simulation age',
        20
    );

    yPos += 5;

    if (!retirementData || (!retirementData.p1 && !retirementData.p2)) {
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune donnée disponible.' : 'No data available.', 15, yPos);
        addPageNumber(pdf, pageNum, totalPages, language);
        return;
    }

    const isCouple = userData.analysisType === 'couple';
    const p1Name = (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1'));
    const p2Name = (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2'));

    const q1 = retirementData.p1?.questionnaire || {};
    const q2 = retirementData.p2?.questionnaire || {};
    const b1 = retirementData.p1?.benefitsData || {};
    const b2 = retirementData.p2?.benefitsData || {};

    // Helper to extract localized answers
    const getAnswer = (quest, key) => {
        if (!quest || Object.keys(quest).length === 0) return '-';
        if (key === 'hasLPP') return quest.hasLPP ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');
        if (key === 'simulationAge') return quest.simulationAge ? String(quest.simulationAge) : '-';
        if (key === 'lppEarliestAge') {
            if (!quest.hasLPP) return '-';
            return quest.lppEarliestAge === 'unknown' ? (language === 'fr' ? 'Je ne sais pas' : "I don't know") : String(quest.lppEarliestAge || '-');
        }
        if (key === 'isWithinPreRetirement') {
            if (!quest.hasLPP) return '-';
            if (quest.isWithinPreRetirement === 'yes') return language === 'fr' ? 'Oui' : 'Yes';
            if (quest.isWithinPreRetirement === 'no') return language === 'fr' ? 'Non' : 'No';
            if (quest.isWithinPreRetirement === 'unknown') return language === 'fr' ? 'Je ne sais pas' : "I don't know";
            return '-';
        }
        if (key === 'benefitType') {
            if (!quest.hasLPP || quest.isWithinPreRetirement !== 'yes') return '-';
            if (quest.benefitType === 'pension') return language === 'fr' ? 'Pension uniquement' : 'Pension only';
            if (quest.benefitType === 'capital') return language === 'fr' ? 'Capital uniquement' : 'Capital only';
            if (quest.benefitType === 'mix') return language === 'fr' ? 'Mixte (Pension et Capital)' : 'Mix of Pension and Capital';
            if (quest.benefitType === 'unknown') return language === 'fr' ? 'Je ne sais pas' : "I don't know";
            return '-';
        }
        if (key === 'hasAVS') return quest.hasAVS ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');
        if (key === 'librePassageCount') return String(quest.librePassageCount || '0');
        if (key === 'threeACount') return String(quest.threeACount || '0');
        if (key === 'hasSupplementaryPension') return quest.hasSupplementaryPension ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');
        return '-';
    };

    // --- Questionnaire Table ---
    yPos = checkPageBreak(pdf, yPos, 40);

    const questions = [
        { key: 'hasLPP', fr: 'Êtes-vous actuellement affilié à un plan de pension LPP ?', en: 'Are you currently affiliated to a LPP pension plan?' },
        { key: 'simulationAge', fr: 'Âge de simulation de la retraite', en: 'Retirement simulation age' },
        { key: 'lppEarliestAge', fr: 'Âge de pré-retraite le plus précoce', en: 'Earliest pre-retirement age in pension plan' },
        { key: 'isWithinPreRetirement', fr: 'Dans la tranche de pré-retraite possible ?', en: 'Age within the pre-retirement bracket?' },
        { key: 'benefitType', fr: 'Type de prestation', en: 'Type of benefit' },
        { key: 'hasAVS', fr: 'Pension AVS', en: 'AVS pension' },
        { key: 'librePassageCount', fr: 'Nombre de comptes de libre passage', en: 'Number of libre passages' },
        { key: 'threeACount', fr: 'Nombre de comptes 3a', en: 'Number of 3a capitals' },
        { key: 'hasSupplementaryPension', fr: 'Capital de plan de retraite supplémentaire', en: 'Supplementary pension plan capital' }
    ];

    const questHead = [[language === 'fr' ? 'Question' : 'Question', p1Name]];
    if (isCouple) questHead[0].push(p2Name);

    const questBody = questions.map(q => {
        const row = [
            language === 'fr' ? q.fr : q.en,
            getAnswer(q1, q.key)
        ];
        if (isCouple) row.push(getAnswer(q2, q.key));
        return row;
    });

    const questionnaireHeaderHooks = {
        didParseCell: function(data) {
            if (data.section === 'head' && data.column.index > 0) {
                data.cell.styles.halign = 'center';
                data.cell.styles.textColor = [55, 65, 81]; // Match background so text is invisible
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'head' && data.column.index > 0 && data.cell.raw) {
                const pdf = data.doc;
                const textStr = String(data.cell.raw);
                
                let isP1 = false, isP2 = false;
                if (textStr === p1Name || textStr === 'Person 1' || textStr === 'Personne 1') isP1 = true;
                else if (textStr === p2Name || textStr === 'Person 2' || textStr === 'Personne 2') isP2 = true;

                if (!isP1 && !isP2) return;

                let bgColor = [219, 234, 254]; // blue-100
                let textColor = [30, 64, 175]; // blue-800
                if (isP2) {
                    bgColor = [243, 232, 255]; // purple-100
                    textColor = [107, 33, 168]; // purple-800
                }

                // Fill background inset
                const resolvedBg = [55, 65, 81];
                pdf.setFillColor(resolvedBg[0], resolvedBg[1], resolvedBg[2]);
                pdf.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

                pdf.setFont('helvetica', 'bold');
                const fontSize = (data.cell.styles.fontSize || 10) - 1.5;
                pdf.setFontSize(fontSize);
                const textWidth = pdf.getTextWidth(textStr);
                
                const badgePaddingX = 2; 
                const badgePaddingY = 0.8; 
                const rectWidth = textWidth + badgePaddingX * 2; 
                const rectHeight = fontSize * 0.4 + badgePaddingY * 2; 
                const badgeX = data.cell.x + (data.cell.width - rectWidth) / 2;
                const badgeY = data.cell.y + (data.cell.height - rectHeight) / 2;

                pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                pdf.roundedRect(badgeX, badgeY, rectWidth, rectHeight, 1, 1, 'F');

                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.text(textStr, badgeX + badgePaddingX, badgeY + badgePaddingY + fontSize * 0.35);
            }

            // Draw fine horizontal separation line at the bottom of the cell
            if (data.section === 'body' || data.section === 'head') {
                const pdf = data.doc;
                pdf.saveGraphicsState();
                pdf.setLineWidth(0.1);
                pdf.setDrawColor(180, 180, 180);
                pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                pdf.restoreGraphicsState();
            }
        }
    };

    autoTable(pdf, {
        startY: yPos,
        head: questHead,
        body: questBody,
        theme: 'plain',
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { fontStyle: 'bold', halign: 'center' },
            2: { fontStyle: 'bold', halign: 'center' }
        },
        margin: { left: 15, right: 15 },
        ...questionnaireHeaderHooks
    });

    yPos = pdf.lastAutoTable.finalY + 15;
    yPos = checkPageBreak(pdf, yPos, 50);

    // --- Benefit Amounts Table ---
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Montants des prestations' : 'Benefit Amounts', 15, yPos);
    yPos += 6;

    const amtHead = [[
        language === 'fr' ? 'Type' : 'Type',
        language === 'fr' ? 'Date dispo.' : 'Availability date',
        language === 'fr' ? 'Investi ?' : 'Invested?',
        { content: language === 'fr' ? 'Valeur actuelle' : 'Current value', styles: { halign: 'right' } },
        { content: language === 'fr' ? 'Valeur projetée / montant' : 'Projected value / amount', styles: { halign: 'right' } }
    ]];
    if (isCouple) amtHead[0].push(language === 'fr' ? 'Propriétaire' : 'Owner');

    const amtBody = [];

    const addBenefitsToTable = (quest, bens, ownerName) => {
        if (!quest || !bens || Object.keys(quest).length === 0) return;

        if (quest.hasAVS && bens.avs) {
            // Fallback to legal retirement date if startDate is missing
            const avsDate = bens.avs.startDate || (ownerName === p1Name ? scenarioData.legalRetirementDate : scenarioData.legalRetirementDate2);
            
            const row = [
                language === 'fr' ? 'Pension annuelle AVS' : 'AVS yearly pension',
                formatDate(avsDate),
                '-',
                '-',
                formatCurrency(bens.avs.amount)
            ];
            if (isCouple) row.push(ownerName);
            amtBody.push(row);
        }

        if (bens.threeA && bens.threeA.length > 0) {
            bens.threeA.forEach((item, i) => {
                const row = [
                    `3a capital #${i + 1}`,
                    formatDate(item.startDate) || '-',
                    item.isInvested ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No'),
                    formatCurrency(item.currentAmount || item.amount),
                    formatCurrency(item.amount)
                ];
                if (isCouple) row.push(ownerName);
                amtBody.push(row);
            });
        }

        if (bens.librePassages && bens.librePassages.length > 0) {
            bens.librePassages.forEach((item, i) => {
                const row = [
                    `Libre passage #${i + 1}`,
                    formatDate(item.startDate) || '-',
                    item.isInvested ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No'),
                    formatCurrency(item.currentAmount || item.amount),
                    formatCurrency(item.amount)
                ];
                if (isCouple) row.push(ownerName);
                amtBody.push(row);
            });
        }

        if (quest.hasLPP) {
            if (quest.isWithinPreRetirement !== 'yes') {
                const row = [
                    language === 'fr' ? 'Capital LPP actuel' : 'Current LPP capital',
                    formatDate(bens.lppCurrentCapitalDate) || '-',
                    bens.lppCurrentInvested ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No'),
                    formatCurrency(bens.lppCurrentInitialAmount || bens.lppCurrentCapital),
                    formatCurrency(bens.lppCurrentCapital)
                ];
                if (isCouple) row.push(ownerName);
                amtBody.push(row);
            } else if (bens.lppByAge) {
                const simAgeStr = String(quest.simulationAge);
                const lppEntry = bens.lppByAge[simAgeStr];
                if (lppEntry) {
                    if (quest.benefitType === 'capital' || quest.benefitType === 'mix') {
                        const rowBrut = [
                            language === 'fr' ? `Capital LPP Brut (à ${simAgeStr} ans) avant impôt` : `Gross LPP Capital (at age ${simAgeStr}) before tax`,
                            '-', '-', '-', formatCurrency(lppEntry.capital)
                        ];
                        if (isCouple) rowBrut.push(ownerName);
                        amtBody.push(rowBrut);

                        if (lppEntry.netCapital) {
                            const rowNet = [
                                language === 'fr' ? `Capital LPP Net (à ${simAgeStr} ans) après impôt` : `Net LPP Capital (at age ${simAgeStr}) after tax`,
                                '-', '-', '-', formatCurrency(lppEntry.netCapital)
                            ];
                            if (isCouple) rowNet.push(ownerName);
                            amtBody.push(rowNet);
                        }
                    }
                    if (quest.benefitType === 'pension' || quest.benefitType === 'mix') {
                        const rowBrut = [
                            language === 'fr' ? `Pension LPP Brut (à ${simAgeStr} ans) avant impôt` : `Gross LPP pension (at age ${simAgeStr}) before tax`,
                            '-', '-', '-', formatCurrency(lppEntry.pension)
                        ];
                        if (isCouple) rowBrut.push(ownerName);
                        amtBody.push(rowBrut);

                        if (lppEntry.netPension) {
                            const rowNet = [
                                language === 'fr' ? `Pension LPP Net (à ${simAgeStr} ans) après impôt` : `Net LPP pension (at age ${simAgeStr}) after tax`,
                                '-', '-', '-', formatCurrency(lppEntry.netPension)
                            ];
                            if (isCouple) rowNet.push(ownerName);
                            amtBody.push(rowNet);
                        }
                    }
                }
            }
        }

        if (quest.hasSupplementaryPension && bens.lppSup) {
            const row = [
                language === 'fr' ? 'Plan de retraite supp.' : 'Supplementary pension',
                formatDate(bens.lppSup.startDate) || '-',
                bens.lppSup.isInvested ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No'),
                formatCurrency(bens.lppSup.amount),
                formatCurrency(bens.lppSup.projectedAmount || bens.lppSup.amount)
            ];
            if (isCouple) row.push(ownerName);
            amtBody.push(row);
        }
    };

    addBenefitsToTable(q1, b1, p1Name);
    if (isCouple) addBenefitsToTable(q2, b2, p2Name);

    if (amtBody.length > 0) {
        autoTable(pdf, {
            startY: yPos,
            head: amtHead,
            body: amtBody,
            theme: 'plain',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData, language)
        });
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune prestation définie' : 'No benefits defined', 15, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 9: Data Review
 * Shows comprehensive data review matching the UI page
 */
export const generateDataReview = (pdf, allData, userData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Révision des données avant simulation' : 'Data review before simulation',
        language === 'fr' ? 'Vue d\'ensemble complète de toutes les entrées' : 'Complete overview of all inputs',
        20
    );

    yPos += 5;

    const { income, assets, costs, debts } = allData;

    // Periodic Inflows
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Entrées périodiques' : 'Periodic inflows', 15, yPos);
    yPos += 6;

    if (income && income.length > 0) {
        const incomeBody = income.map(item => {
            const row = [
                getDisplayName(item),
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.frequency || 'N/A',
                formatDate(item.startDate),
                formatDate(item.endDate)
            ];
            if (isCouple) row.push(getOwnerText(item, userData, language));
            return row;
        });

        const incomeHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Fréquence' : 'Frequency', styles: { halign: 'center' } },
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) incomeHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: incomeHead,
            body: incomeBody,
            theme: 'plain',
            headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 6 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'center' },
                6: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData, language)
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune entrée définie' : 'No inflows defined', 20, yPos);
        yPos += 10;
    }

    // Current or Future Assets
    yPos = checkPageBreak(pdf, yPos, 50);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Actifs actuels ou futurs' : 'Current or future assets', 15, yPos);
    yPos += 6;

    if (assets && assets.length > 0) {
        const assetBody = assets.map(item => {
            // Logic for Availability Value
            let availabilityValue = 'N/A';
            if (item.availabilityType === 'Date') {
                availabilityValue = formatDate(item.availabilityDate);
            } else if (item.availabilityType === 'Period' || item.availabilityTimeframe) {
                if (language === 'fr') {
                    const timeframes = {
                        'within_5y': 'dans les 5 ans',
                        'within_5_10y': 'dans 5-10 ans',
                        'within_10_15y': 'dans 10-15 ans',
                        'within_15_20y': 'dans 15-20 ans',
                        'within_20_25y': 'dans 20-25 ans',
                        'within_25_30y': 'dans 25-30 ans'
                    };
                    availabilityValue = timeframes[item.availabilityTimeframe] || item.availabilityTimeframe || 'N/A';
                } else {
                    const timeframes = {
                        'within_5y': 'within 5y',
                        'within_5_10y': 'within 5-10y',
                        'within_10_15y': 'within 10-15y',
                        'within_15_20y': 'within 15-20y',
                        'within_20_25y': 'within 20-25y',
                        'within_25_30y': 'within 25-30y'
                    };
                    availabilityValue = timeframes[item.availabilityTimeframe] || item.availabilityTimeframe || 'N/A';
                }
            }

            // Logic for Invest?
            const isInvested = item.category === 'Liquid' && item.strategy === 'Invested';
            let investText = isInvested ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');

            // Look at "Preserve" Category to mask out Availability Type and Value
            let displayAvailabilityType = item.availabilityType || 'N/A';
            let displayAvailabilityValue = availabilityValue;

            if (item.category === 'Preserve') {
               displayAvailabilityType = '';
               displayAvailabilityValue = '';
               investText = '';
            }

            const row = [
                getDisplayName(item),
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.category || 'N/A',
                displayAvailabilityType,
                displayAvailabilityValue,
                investText,
                item.clusterTag || ''
            ];
            if (isCouple) row.push(getOwnerText(item, userData, language));
            return row;
        });

        const assetHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Catégorie' : 'Category', styles: { halign: 'center' } },
            { content: language === 'fr' ? 'Type de dispo.' : 'Availability Type', styles: { halign: 'center' } },
            { content: language === 'fr' ? 'Valeur de dispo.' : 'Availability Value', styles: { halign: 'center' } },
            { content: language === 'fr' ? 'Investir ?' : 'Invest?', styles: { halign: 'center' } },
            { content: language === 'fr' ? 'Tag Cluster' : 'Cluster Tag', styles: { halign: 'center' } }
        ]];
        if (isCouple) assetHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: assetHead,
            body: assetBody,
            theme: 'plain',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 5.5 }, // Reduced size for many columns
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData, language)
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucun actif défini' : 'No assets defined', 20, yPos);
        yPos += 10;
    }

    // Periodic Outflows
    yPos = checkPageBreak(pdf, yPos, 50);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Sorties périodiques' : 'Periodic Outflows', 15, yPos);
    yPos += 6;

    if (costs && costs.length > 0) {
        const costBody = costs.map(item => {
            const row = [
                getDisplayName(item),
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.frequency || 'N/A',
                formatDate(item.startDate),
                formatDate(item.endDate)
            ];
            if (isCouple) row.push(getOwnerText(item, userData, language));
            return row;
        });

        const costHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Fréquence' : 'Frequency', styles: { halign: 'center' } },
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) costHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: costHead,
            body: costBody,
            theme: 'plain',
            headStyles: { fillColor: [231, 76, 60], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 6 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'center' },
                6: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData, language)
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune sortie définie' : 'No outflows defined', 20, yPos);
        yPos += 10;
    }

    // Debts
    yPos = checkPageBreak(pdf, yPos, 50);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Dettes actuelles ou futures' : 'Current or Future Debts', 15, yPos);
    yPos += 6;

    if (debts && debts.length > 0) {
        const debtBody = debts.map(item => {
            const row = [
                getDisplayName(item),
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.frequency || 'N/A',
                formatDate(item.startDate),
                formatDate(item.endDate)
            ];
            if (isCouple) row.push(getOwnerText(item, userData, language));
            return row;
        });

        const debtHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Fréquence' : 'Frequency', styles: { halign: 'center' } },
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) debtHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: debtHead,
            body: debtBody,
            theme: 'plain',
            headStyles: { fillColor: [192, 57, 43], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 6 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'center' },
                6: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData, language)
        });
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune dette définie' : 'No debts defined', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page X: Pension Fund Analysis
 */
const findYieldRate = (capital, pension, years) => {
    if (!capital || !pension || !years || capital <= 0 || pension <= 0 || years <= 0) return 0;
    if (pension * years <= capital) return 0;
    let low = 0;
    let high = 1.0;
    let mid = 0;
    for (let i = 0; i < 40; i++) {
        mid = (low + high) / 2;
        if (mid === 0) { low = 0.00001; continue; }
        const pv = pension * (1 - Math.pow(1 + mid, -years)) / mid;
        if (pv > capital) { low = mid; } else { high = mid; }
    }
    return mid * 100;
};

export const generatePensionFundAnalysis = (pdf, retirementData, userData, language, pageNum, totalPages) => {
    let currentPageNum = pageNum;
    
    // Determine if there is data to display
    const hasP1 = retirementData?.p1?.pensionAnalysis;
    const hasP2 = userData.analysisType === 'couple' && retirementData?.p2?.pensionAnalysis;
    
    if (!hasP1 && !hasP2) return currentPageNum;

    const renderPersonAnalysis = (pDataObj, personName, ageOffsetContext) => {
        pdf.addPage();
        
        const parseToNumber = (val) => {
            if (val === undefined || val === null || val === '') return 0;
            const clean = val.toString().replace(/'/g, '').replace(/%/g, '');
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 0 : parsed;
        };

        const { pData, touchedFields, interpolatedFields } = pDataObj;
        const pKey = Object.keys(touchedFields || {})[0]?.split('_')[0] || 'p1';

        // Calculate ages & years
        const isOpt1 = pData.selectedOption === 'option1';
        
        // Age actuel
        const birthDate = ageOffsetContext === 2 ? new Date(userData.birthDate2) : new Date(userData.birthDate);
        const currentYear = new Date().getFullYear();
        const currentAge = currentYear - birthDate.getFullYear();
        
        // Espérance de vie
        const deathDate = ageOffsetContext === 2 ? new Date(userData.theoreticalDeathDate2) : new Date(userData.theoreticalDeathDate);
        const ageOfDeath = deathDate.getFullYear() - birthDate.getFullYear();

        // Âge de retraite souhaité
        let plannedRetirementAge = 65; // Default fallback
        if (ageOffsetContext === 2 && userData.analysisType === 'couple') {
            const rDate = new Date(retirementData?.p2?.questionnaire?.wishedRetirementDate || userData.theoreticalDeathDate2);
            plannedRetirementAge = rDate.getFullYear() - birthDate.getFullYear();
        } else {
            const rDate = new Date(retirementData?.p1?.questionnaire?.wishedRetirementDate || userData.theoreticalDeathDate);
            plannedRetirementAge = rDate.getFullYear() - birthDate.getFullYear();
        }

        let yPos = addPageHeader(
            pdf,
            language === 'fr' ? `Analyse de la caisse de pension - ${personName}` : `Pension Fund Analysis - ${personName}`,
            null,
            20
        );

        // Legend
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        // Green legend
        pdf.setDrawColor(34, 197, 94);
        pdf.setFillColor(34, 197, 94);
        pdf.rect(15, yPos - 3, 3, 3, 'F'); // Draw solid square
        pdf.setTextColor(100, 100, 100);
        pdf.text(language === 'fr' ? 'Valeurs certaines issues des documents LPP saisies par l\'utilisateur' : 'Confirmed values from LPP documents entered by user', 20, yPos);
        
        // Orange legend
        pdf.setDrawColor(249, 115, 22);
        pdf.setFillColor(249, 115, 22);
        pdf.rect(15, yPos + 2, 3, 3, 'F');
        pdf.setTextColor(100, 100, 100);
        pdf.text(language === 'fr' ? 'Valeurs interpolées calculées par l\'outil pour permettre plus d\'options de simulation' : 'Interpolated values calculated by the tool for more simulation options', 20, yPos + 5);

        yPos += 15;

        // ==========================================
        // BLOC A : Paramètres Généraux
        // ==========================================
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(language === 'fr' ? 'Informations générales' : 'General Information', 15, yPos);
        yPos += 5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(language === 'fr' ? `Relevé d'épargne: ${formatCurrency(parseToNumber(pData.savingsAccountValue))}` : `Savings account: ${formatCurrency(parseToNumber(pData.savingsAccountValue))}`, 15, yPos);
        pdf.text(language === 'fr' ? `Cotisations mens.: ${formatCurrency(parseToNumber(pData.monthlyContributions))}` : `Monthly cont.: ${formatCurrency(parseToNumber(pData.monthlyContributions))}`, 80, yPos);
        pdf.text(language === 'fr' ? `Age actuel: ${currentAge} ans` : `Current age: ${currentAge} yrs`, 145, yPos);
        yPos += 5;
        pdf.text(language === 'fr' ? `Date relevé: ${formatDate(pData.savingsAccountDate) || 'N/A'}` : `Account date: ${formatDate(pData.savingsAccountDate) || 'N/A'}`, 15, yPos);
        pdf.text(language === 'fr' ? `Âge souhaité (retraite): ${plannedRetirementAge} ans` : `Desired retirement: ${plannedRetirementAge} yrs`, 80, yPos);
        pdf.text(language === 'fr' ? `Espérance de vie: ${ageOfDeath} ans` : `Life expectancy: ${ageOfDeath} yrs`, 145, yPos);

        yPos += 8;

        // ==========================================
        // BLOC A (Suite) : Options et allocations
        // ==========================================
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Options et allocations' : 'Options and allocations', 15, yPos);
        yPos += 5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(language === 'fr' ? `Option choisie: ${pData.selectedOption}` : `Chosen option: ${pData.selectedOption}`, 15, yPos);
        pdf.text(language === 'fr' ? `Rente: ${100 - pData.capitalSplit}%` : `Pension: ${100 - pData.capitalSplit}%`, 70, yPos);
        pdf.text(language === 'fr' ? `Capital: ${pData.capitalSplit}%` : `Capital: ${pData.capitalSplit}%`, 110, yPos);
        
        if (!isOpt1) {
            pdf.text(language === 'fr' ? `Taux de simulation: ${pData.simulationYield}%` : `Simulation Yield: ${pData.simulationYield}%`, 150, yPos);
        }
        yPos += 10;

        // ==========================================
        // TABLE : DONNÉES OFFICIELLES ET INTERPOLÉES
        // ==========================================
        yPos = checkPageBreak(pdf, yPos, 40);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Données officielles et interpolées' : 'Official and interpolated data', 15, yPos);
        yPos += 5;

        let officialHead = [];
        let officialBody = [];
        let dataColKeys = [];

        if (isOpt1) {
            // OPTION 1: A, B, C, F, G, I
            officialHead = [[
                'Age',
                { content: language === 'fr' ? 'Capital (0%)' : 'Capital (0%)', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Tx Conv.' : 'Conv. Rate', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Rente (0%)' : 'Pension (0%)', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Retraite (ans)' : 'Retir. (yrs)', styles: { halign: 'center' } },
                { content: language === 'fr' ? 'C x F (Total)' : 'C x F (Total)', styles: { halign: 'center' } },
                { content: language === 'fr' ? 'Rendement Néc.' : 'Yield Required', styles: { halign: 'center' } }
            ]];
            dataColKeys = ['a', 'b', 'c']; // Only the explicit grid columns matter for drawing borders

            [65, 64, 63, 62, 61, 60, 59, 58].forEach(age => {
                const rowData = pData.gridData[age] || {};
                const yearsRemaining = ageOfDeath ? Math.max(0, Math.round(ageOfDeath) - age) : 0;
                const valC = parseToNumber(rowData.c);
                const valA = parseToNumber(rowData.a);
                const yieldReq = findYieldRate(valA, valC, yearsRemaining);

                officialBody.push([
                    `${age} ${language === 'fr' ? 'ans' : 'years'}`,
                    formatNumber(parseToNumber(rowData.a)),
                    rowData.b || '0.00%',
                    formatNumber(valC),
                    yearsRemaining,
                    formatNumber(Math.round(valC * yearsRemaining)),
                    `${yieldReq.toFixed(2)}%`
                ]);
            });
        } else {
            // OPTION 2: D, E, B, F, H, J
            officialHead = [[
                'Age',
                { content: language === 'fr' ? `Capital (${pData.simulationYield}%)` : `Capital (${pData.simulationYield}%)`, styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Tx Conv.' : 'Conv. Rate', styles: { halign: 'right' } },
                { content: language === 'fr' ? `Rente (${pData.simulationYield}%)` : `Pension (${pData.simulationYield}%)`, styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Retraite (ans)' : 'Retir. (yrs)', styles: { halign: 'center' } },
                { content: language === 'fr' ? 'E x F (Total)' : 'E x F (Total)', styles: { halign: 'center' } },
                { content: language === 'fr' ? 'Rendement Néc.' : 'Yield Required', styles: { halign: 'center' } }
            ]];
            dataColKeys = ['d', 'b', 'e']; 

            [65, 64, 63, 62, 61, 60, 59, 58].forEach(age => {
                const rowData = pData.gridData[age] || {};
                const yearsRemaining = ageOfDeath ? Math.max(0, Math.round(ageOfDeath) - age) : 0;
                const valE = parseToNumber(rowData.e);
                const valA = parseToNumber(rowData.a);

                const yieldReq = findYieldRate(valA, valE, yearsRemaining);

                officialBody.push([
                    `${age} ${language === 'fr' ? 'ans' : 'years'}`,
                    formatNumber(parseToNumber(rowData.d)),
                    rowData.b || '0.00%',
                    formatNumber(valE),
                    yearsRemaining,
                    formatNumber(Math.round(valE * yearsRemaining)),
                    `${yieldReq.toFixed(2)}%`
                ]);
            });
        }

        autoTable(pdf, {
            startY: yPos,
            head: officialHead,
            body: officialBody,
            theme: 'plain',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
            columnStyles: { 0: { halign: 'center', fontStyle: 'bold' } },
            margin: { left: 15, right: 15 },
            didDrawCell: function(data) {
                if (data.section === 'body' && data.column.index > 0 && data.column.index <= dataColKeys.length) {
                    const rowAge = 65 - data.row.index; 
                    const colKey = dataColKeys[data.column.index - 1]; 
                    
                    const k = `${pKey}_${rowAge}_${colKey}`;
                    const isInterpolated = interpolatedFields && interpolatedFields[k];
                    const isTouched = touchedFields && touchedFields[k];

                    if (isInterpolated || isTouched) {
                        const pdfDoc = data.doc;
                        pdfDoc.saveGraphicsState();
                        pdfDoc.setLineWidth(0.5);
                        
                        // Green: 34, 197, 94 | Orange: 249, 115, 22
                        if (isInterpolated) {
                            pdfDoc.setDrawColor(249, 115, 22);
                        } else {
                            pdfDoc.setDrawColor(34, 197, 94);
                        }
                        
                        pdfDoc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'S');
                        pdfDoc.restoreGraphicsState();
                    } else {
                        // Draw light gray border for empty read-only cells
                        const pdfDoc = data.doc;
                        pdfDoc.saveGraphicsState();
                        pdfDoc.setLineWidth(0.2);
                        pdfDoc.setDrawColor(200, 200, 200);
                        pdfDoc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'S');
                        pdfDoc.restoreGraphicsState();
                    }
                }
            }
        });

        // ==========================================
        // BLOC B : IMPÔTS (TAXES)
        // ==========================================
        yPos = pdf.lastAutoTable.finalY + 10;
        
        const bData = retirementData?.[pKey]?.benefitsData || {};
        const pensionTaxRate = parseFloat(bData.pensionTaxRate || '4.5');
        const capitalTaxRate = parseFloat(bData.capitalTaxRate || '10');

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? `Taux prélèvement sur pension: ${pensionTaxRate}%` : `Pension tax rate: ${pensionTaxRate}%`, 15, yPos);
        pdf.text(language === 'fr' ? `Taux impôt capital: ${capitalTaxRate}%` : `Capital tax rate: ${capitalTaxRate}%`, 120, yPos);
        
        yPos += 8;

        // ==========================================
        // TABLE : SIMULATION (RENTE OU CAPITAL)
        // ==========================================
        yPos = checkPageBreak(pdf, yPos, 60);

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Simulation (Rente ou Capital) - net' : 'Simulation (Pension or Capital) - net', 15, yPos);
        yPos += 5;

        let simHead = [];
        let simBody = [];
        let simColKeys = [];

        if (isOpt1) {
            simHead = [[
                'Age',
                { content: language === 'fr' ? 'Rente projetée\navant impôts (0%)' : 'Projected Pension\nbefore tax (0%)', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Capital projeté\navant impôts (0%)' : 'Projected Capital\nbefore tax (0%)', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Rente projetée\naprès impôts' : 'Projected Pension\nafter tax', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Capital projeté\naprès impôts' : 'Projected Capital\nafter tax', styles: { halign: 'right' } }
            ]];
            simColKeys = ['c', 'a', '', '']; // Only draw colored borders on raw data usually, but let's keep array length 4
            
            [65, 64, 63, 62, 61, 60, 59, 58].forEach(age => {
                const gr = pData.gridData[age] || {};
                const sourceA = parseToNumber(gr.a);
                const sourceC = parseToNumber(gr.c);
                const split = pData.capitalSplit || 0;
                
                const rente = sourceC * ((100 - split) / 100);
                const cap = sourceA * (split / 100);
                
                const renteNet = rente * (1 - (pensionTaxRate / 100));
                const capNet = cap * (1 - (capitalTaxRate / 100));

                simBody.push([
                    `${age} ${language === 'fr' ? 'ans' : 'years'}`,
                    formatNumber(Math.round(rente)),
                    formatNumber(Math.round(cap)),
                    formatNumber(Math.round(renteNet)),
                    formatNumber(Math.round(capNet))
                ]);
            });
        } else {
            simHead = [[
                'Age',
                { content: language === 'fr' ? `Rente projetée\navant impôts (${pData.simulationYield}%)` : `Projected Pension\nbefore tax (${pData.simulationYield}%)`, styles: { halign: 'right' } },
                { content: language === 'fr' ? `Capital projeté\navant impôts (${pData.simulationYield}%)` : `Projected Capital\nbefore tax (${pData.simulationYield}%)`, styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Rente projetée\naprès impôts' : 'Projected Pension\nafter tax', styles: { halign: 'right' } },
                { content: language === 'fr' ? 'Capital projeté\naprès impôts' : 'Projected Capital\nafter tax', styles: { halign: 'right' } }
            ]];
            simColKeys = ['e', 'd', '', ''];

            [65, 64, 63, 62, 61, 60, 59, 58].forEach(age => {
                const gr = pData.gridData[age] || {};
                const sourceD = parseToNumber(gr.d);
                const sourceE = parseToNumber(gr.e);
                const split = pData.capitalSplit || 0;
                
                const rente = sourceE * ((100 - split) / 100);
                const cap = sourceD * (split / 100);

                const renteNet = rente * (1 - (pensionTaxRate / 100));
                const capNet = cap * (1 - (capitalTaxRate / 100));

                simBody.push([
                    `${age} ${language === 'fr' ? 'ans' : 'years'}`,
                    formatNumber(Math.round(rente)),
                    formatNumber(Math.round(cap)),
                    formatNumber(Math.round(renteNet)),
                    formatNumber(Math.round(capNet))
                ]);
            });
        }

        autoTable(pdf, {
            startY: yPos,
            head: simHead,
            body: simBody,
            theme: 'plain',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
            columnStyles: { 0: { halign: 'center', fontStyle: 'bold' } },
            margin: { left: 15, right: 15 },
            didDrawCell: function(data) {
                if (data.section === 'body' && data.column.index > 0 && data.column.index <= 2) {
                    // Only draw colored borders on the raw columns (index 1 & 2), not the net columns (index 3 & 4)
                    const rowAge = 65 - data.row.index; 
                    const targetColKey = simColKeys[data.column.index - 1];

                    const k = `${pKey}_${rowAge}_${targetColKey}`;
                    const isInterpolated = interpolatedFields && interpolatedFields[k];
                    const isTouched = touchedFields && touchedFields[k];

                    const pdfDoc = data.doc;
                    pdfDoc.saveGraphicsState();
                    pdfDoc.setLineWidth(0.5);

                    if (isInterpolated || isTouched) {
                        if (isInterpolated) {
                            pdfDoc.setDrawColor(249, 115, 22);
                        } else {
                            pdfDoc.setDrawColor(34, 197, 94);
                        }
                    } else {
                        pdfDoc.setLineWidth(0.2);
                        pdfDoc.setDrawColor(200, 200, 200);
                    }
                    
                    pdfDoc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'S');
                    pdfDoc.restoreGraphicsState();
                } else if (data.section === 'body' && data.column.index > 2) {
                    // Draw gray borders for net columns
                    const pdfDoc = data.doc;
                    pdfDoc.saveGraphicsState();
                    pdfDoc.setLineWidth(0.2);
                    pdfDoc.setDrawColor(200, 200, 200);
                    pdfDoc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'S');
                    pdfDoc.restoreGraphicsState();
                }
            }
        });

        addPageNumber(pdf, currentPageNum, totalPages, language);
        currentPageNum++;
    };

    if (hasP1) {
        const p1Name = userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
        renderPersonAnalysis(retirementData.p1.pensionAnalysis, p1Name, 1);
    }

    if (hasP2) {
        const p2Name = userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
        renderPersonAnalysis(retirementData.p2.pensionAnalysis, p2Name, 2);
    }

    return currentPageNum;
};

export default {
    generateSimulationChoice,
    generateRetirementBenefits,
    generateDataReview,
    generatePensionFundAnalysis
};
