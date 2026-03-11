/**
 * PDF Page Generators - Part 2
 * Pages 4-9: Personal Info, Inputs, Data Review
 */

import autoTable from 'jspdf-autotable';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    addSeparatorLine,
    checkPageBreak
} from './pdfHelpers';

/**
 * Page 4: Personal Information and Simulation Choice (merged)
 */
export const generatePersonalInfo = (pdf, userData, scenarioData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Informations personnelles et choix de la simulation' : 'Personal Information & Simulation Choice',
        null,
        20
    );

    yPos += 5;

    const p1Name = (userData.firstName || 'Person 1').toUpperCase();
    const p2Name = (userData.firstName2 || 'Person 2').toUpperCase();

    // Personal details table
    const head = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', p1Name, p2Name]]
        : [[language === 'fr' ? 'Champ' : 'Field', p1Name]];

    const personalData = [
        [language === 'fr' ? 'Prénom' : 'First Name', userData.firstName || 'N/A'],
        [language === 'fr' ? 'Date de Naissance' : 'Birth Date', formatDate(userData.birthDate)],
        [language === 'fr' ? 'Âge Actuel' : 'Current Age', userData.currentAge || 'N/A'],
        [language === 'fr' ? 'Sexe' : 'Gender', userData.gender === 'male' ? (language === 'fr' ? 'Homme' : 'Male') : (language === 'fr' ? 'Femme' : 'Female')]
    ];

    if (isCouple) {
        personalData[0].push(userData.firstName2 || 'N/A');
        personalData[1].push(formatDate(userData.birthDate2));
        personalData[2].push(userData.currentAge2 || 'N/A');
        personalData[3].push(userData.gender2 === 'male' ? (language === 'fr' ? 'Homme' : 'Male') : (language === 'fr' ? 'Femme' : 'Female'));
    }

    const headerHooks = {
        didParseCell: function(data) {
            if (data.section === 'head' && data.column.index > 0) {
                data.cell.styles.halign = 'center';
                // Make text match background so it disappears, we draw badge on top
                data.cell.styles.textColor = data.cell.styles.fillColor || [255, 255, 255];
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'head' && data.column.index > 0 && data.cell.raw) {
                const pdf = data.doc;
                const textStr = String(data.cell.raw).toUpperCase();
                
                let isP1 = false, isP2 = false;
                if (textStr === p1Name || textStr === 'PERSON 1' || textStr === 'PERSONNE 1') isP1 = true;
                else if (textStr === p2Name || textStr === 'PERSON 2' || textStr === 'PERSONNE 2') isP2 = true;

                if (!isP1 && !isP2) return;

                let bgColor = [219, 234, 254]; // blue-100
                let textColor = [30, 64, 175]; // blue-800
                if (isP2) {
                    bgColor = [243, 232, 255]; // purple-100
                    textColor = [107, 33, 168]; // purple-800
                }

                // Re-paint cell background slightly inset to clear text remnants
                const resolvedBg = data.cell.styles.fillColor || [255, 255, 255];
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
        }
    };

    autoTable(pdf, {
        startY: yPos,
        head: head,
        body: personalData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { cellWidth: isCouple ? 60 : 90 },
            1: { halign: 'center' },
            2: { halign: 'center' }
        },
        ...headerHooks
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // Retirement and life expectancy
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Retraite et Espérance de Vie' : 'Retirement and Life Expectancy', 15, yPos);
    yPos += 8;

    const retirementHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', p1Name, p2Name]]
        : [[language === 'fr' ? 'Champ' : 'Field', p1Name]];

    const retirementData = [
        [language === 'fr' ? 'Âge Légal de Retraite' : 'Legal Retirement Age', scenarioData.legalRetirementAge || '65'],
        [language === 'fr' ? 'Date Légale de Retraite' : 'Legal Retirement Date', formatDate(scenarioData.legalRetirementDate)],
        [language === 'fr' ? 'Espérance de Vie' : 'Life Expectancy', `${scenarioData.lifeExpectancy || 'N/A'} ${language === 'fr' ? 'ans' : 'years'}`],
        [language === 'fr' ? 'Date de Décès Théorique' : 'Theoretical Death Date', formatDate(userData.theoreticalDeathDate)]
    ];

    if (isCouple) {
        retirementData[0].push(scenarioData.legalRetirementAge2 || '64/65');
        retirementData[1].push(formatDate(scenarioData.legalRetirementDate2));
        retirementData[2].push(`${scenarioData.lifeExpectancy2 || 'N/A'} ${language === 'fr' ? 'ans' : 'years'}`);
        retirementData[3].push(formatDate(userData.theoreticalDeathDate2));
    }

    autoTable(pdf, {
        startY: yPos,
        head: retirementHead,
        body: retirementData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { cellWidth: isCouple ? 60 : 90 },
            1: { halign: 'center' },
            2: { halign: 'center' }
        },
        ...headerHooks
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // ===== SIMULATION CHOICE SECTION (merged) =====
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Choix de Simulation' : 'Simulation Choice', 15, yPos);
    yPos += 8;

    // Retirement option text
    const option = scenarioData?.retirementOption || 'option1';

    let optionText = '';
    if (option === 'option0') {
        optionText = language === 'fr' ? `Retraite à l'âge légal` : `Legal Retirement Age`;
    } else if (option === 'option1') {
        optionText = language === 'fr' ? `Retraite anticipée avec pension LPP` : `Early Retirement with LPP Pension`;
    } else if (option === 'option2') {
        optionText = language === 'fr' ? `Retraite anticipée avec capital LPP` : `Early Retirement with LPP Capital`;
    } else if (option === 'option3') {
        optionText = language === 'fr' ? `Optimisation de la date de retraite` : `Retirement Date Optimization`;
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(optionText, 20, yPos);
    yPos += 10;

    // Retirement details table
    const detailsHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', p1Name, p2Name]]
        : [[language === 'fr' ? 'Champ' : 'Field', p1Name]];

    const detailsData = [
        [language === 'fr' ? 'Date de Retraite Choisie' : 'Chosen Retirement Date', formatDate(scenarioData?.wishedRetirementDate)]
    ];
    if (isCouple) {
        detailsData[0].push(formatDate(scenarioData?.wishedRetirementDate2));
    }

    if (scenarioData?.pensionCapital) {
        const row = [language === 'fr' ? 'Capital de Pension Actuel' : 'Current Pension Capital', formatCurrency(scenarioData.pensionCapital)];
        if (isCouple) row.push(formatCurrency(scenarioData.pensionCapital2));
        detailsData.push(row);
    }

    if (scenarioData?.projectedLPPPension && option === 'option1') {
        const row = [language === 'fr' ? 'Pension LPP Projetée (Annuelle)' : 'Projected LPP Pension (Annual)', formatCurrency(scenarioData.projectedLPPPension)];
        if (isCouple) row.push(formatCurrency(scenarioData.projectedLPPPension2));
        detailsData.push(row);
    }

    autoTable(pdf, {
        startY: yPos,
        body: detailsData,
        theme: 'plain',
        showHead: 'never',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: isCouple ? 60 : 90 },
            1: { halign: 'center' },
            2: { halign: 'center' }
        },
        margin: { left: 15 }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};


export const getOwnerBadgeHooks = (isCouple, userData) => {
    if (!isCouple) return {};
    return {
        didParseCell: function(data) {
            if (data.section === 'body' && data.table.columns && data.column.index === data.table.columns.length - 1) {
                data.cell.styles.halign = 'center';
                data.cell.styles.textColor = data.cell.styles.fillColor || [255, 255, 255];
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'body' && data.table.columns && data.column.index === data.table.columns.length - 1 && data.cell.raw) {
                const pdf = data.doc;
                const textStr = String(data.cell.raw).toUpperCase();
                
                let isP1 = false, isP2 = false, isShared = false, isConsolidated = false;
                const p1Name = (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1')).toUpperCase();
                const p2Name = (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')).toUpperCase();

                if (textStr === p1Name || textStr === 'PERSON 1' || textStr === 'PERSONNE 1') isP1 = true;
                else if (textStr === p2Name || textStr === 'PERSON 2' || textStr === 'PERSONNE 2') isP2 = true;
                else if (textStr === 'CONSOLIDATED' || textStr === 'CONSOLIDÉ') isConsolidated = true;
                else if (textStr === 'SHARED' || textStr === 'PARTAGÉ') isShared = true;

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
                const rectHeight = fontSize * 0.4 + badgePaddingY * 2; 
                
                const xPos = data.cell.x + (data.cell.width - rectWidth) / 2;
                const yPos = data.cell.y + (data.cell.height - rectHeight) / 2;

                pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                pdf.roundedRect(xPos, yPos, rectWidth, rectHeight, 1.5, 1.5, 'F');

                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.setFont('helvetica', 'bold');
                const textX = xPos + badgePaddingX;
                const textY = yPos + rectHeight - badgePaddingY - (fontSize * 0.05);
                pdf.text(textStr, textX, textY);
            } else if (data.section === 'body' && data.table.columns && data.column.index === 0 && data.cell.raw) {
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

const getOwnerText = (item, userData, language) => {
    const ownerCode = item.owner || item.person;
    if (!ownerCode) return language === 'fr' ? 'PARTAGÉ' : 'SHARED';
    
    const code = String(ownerCode).toLowerCase();
    if (code === 'p1' || code.includes('person 1') || code.includes('personne 1') || (userData?.firstName && code === userData.firstName.toLowerCase())) {
        return userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
    }
    if (code === 'p2' || code.includes('person 2') || code.includes('personne 2') || (userData?.firstName2 && code === userData.firstName2.toLowerCase())) {
        return userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
    }
    if (code === 'consolidated' || code === 'consolidé') {
         return language === 'fr' ? 'CONSOLIDÉ' : 'CONSOLIDATED';
    }
    return language === 'fr' ? 'PARTAGÉ' : 'SHARED';
};

/**
 * Page 5: Income and Assets
 */
export const generateIncomeAssets = (pdf, incomeData, assetData, language, pageNum, totalPages, isCouple, userData) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Revenus et Actifs' : 'Income & Assets',
        null,
        20
    );

    yPos += 5;

    // Income section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Sources de Revenus' : 'Income Sources', 15, yPos);
    yPos += 8;

    if (incomeData && incomeData.length > 0) {
        const incomeBody = incomeData.map(income => {
            const row = [
                getDisplayName(income),
                formatCurrency(income.amount),
                income.frequency || 'N/A',
                formatDate(income.startDate),
                formatDate(income.endDate)
            ];
            if (isCouple) row.push(getOwnerText(income, userData, language).toUpperCase());
            return row;
        });

        const incomeHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
            { content: language === 'fr' ? 'Fréquence' : 'Frequency', styles: { halign: 'center' } },
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) incomeHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: incomeHead,
            body: incomeBody,
            theme: 'striped',
            headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'center' },
                5: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData)
        });

        yPos = pdf.lastAutoTable.finalY + 15;
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucun revenu défini' : 'No income defined', 20, yPos);
        yPos += 15;
    }

    // Assets section
    yPos = checkPageBreak(pdf, yPos, 60);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Actifs' : 'Assets', 15, yPos);
    yPos += 8;

    if (assetData && assetData.length > 0) {
        const assetBody = assetData.map(asset => {
            let displayStrategy = asset.strategy || 'N/A';
            let displayAvailability = asset.availabilityType || 'N/A';

            if (asset.category === 'Preserve') {
                displayStrategy = '';
                displayAvailability = '';
            }

            const row = [
                getDisplayName(asset),
                formatCurrency(asset.amount),
                asset.category || 'N/A',
                displayStrategy,
                displayAvailability
            ];
            if (isCouple) row.push(getOwnerText(asset, userData, language).toUpperCase());
            return row;
        });

        const assetHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
            { content: language === 'fr' ? 'Catégorie' : 'Category', styles: { halign: 'center' } },
            { content: language === 'fr' ? 'Stratégie' : 'Strategy', styles: { halign: 'center' } },
            { content: language === 'fr' ? 'Disponibilité' : 'Availability', styles: { halign: 'center' } }
        ]];
        if (isCouple) assetHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: assetHead,
            body: assetBody,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData)
        });
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucun actif défini' : 'No assets defined', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 6: Costs and Debts
 */
export const generateCostDebts = (pdf, costData, debtData, language, pageNum, totalPages, isCouple, userData) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Dépenses et Dettes' : 'Costs & Debts',
        null,
        20
    );

    yPos += 5;

    // Costs section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Dépenses Périodiques' : 'Periodic Costs', 15, yPos);
    yPos += 8;

    if (costData && costData.length > 0) {
        const costBody = costData.map(cost => {
            const row = [
                getDisplayName(cost),
                formatCurrency(cost.amount),
                cost.frequency || 'N/A',
                formatDate(cost.startDate),
                formatDate(cost.endDate)
            ];
            if (isCouple) row.push(getOwnerText(cost, userData, language).toUpperCase());
            return row;
        });

        const costHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
            { content: language === 'fr' ? 'Fréquence' : 'Frequency', styles: { halign: 'center' } },
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) costHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: costHead,
            body: costBody,
            theme: 'striped',
            headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'center' },
                5: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData)
        });

        yPos = pdf.lastAutoTable.finalY + 15;
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune dépense définie' : 'No costs defined', 20, yPos);
        yPos += 15;
    }

    // Debts section
    yPos = checkPageBreak(pdf, yPos, 60);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Dettes' : 'Debts', 15, yPos);
    yPos += 8;

    if (debtData && debtData.length > 0) {
        const debtBody = debtData.map(debt => {
            const row = [
                getDisplayName(debt),
                formatCurrency(debt.amount),
                debt.frequency || 'N/A',
                formatDate(debt.startDate),
                formatDate(debt.endDate)
            ];
            if (isCouple) row.push(getOwnerText(debt, userData, language).toUpperCase());
            return row;
        });

        const debtHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
            { content: language === 'fr' ? 'Fréquence' : 'Frequency', styles: { halign: 'center' } },
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) debtHead[0].push({ content: language === 'fr' ? 'Propriétaire' : 'Owner', styles: { halign: 'center' } });

        autoTable(pdf, {
            startY: yPos,
            head: debtHead,
            body: debtBody,
            theme: 'striped',
            headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'center' },
                5: { halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            ...getOwnerBadgeHooks(isCouple, userData)
        });
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune dette définie' : 'No debts defined', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

export default {
    generatePersonalInfo,
    generateIncomeAssets,
    generateCostDebts
};
