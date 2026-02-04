import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { ScrollArea } from "../../components/ui/scroll-area";
import PageHeader from '../../components/PageHeader';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Disclaimer() {
    const { language } = useLanguage();

    const content = {
        en: {
            title: "Disclaimer",
            subtitle: "Important information regarding the limitations of this tool and investment risks.",
            cardTitle: "Financial & Investment Disclaimer",
            lastUpdated: "Last Updated: February 2026",
            warningTitle: "Warning: Past Performance",
            warningText: "Past performance is not an indication of future performance. The value of investments and the income derived from them may go down as well as up, and you may not get back the amount originally invested.",
            sections: [
                {
                    title: "1. Educational Purpose Only",
                    text: "CanIQuit is an educational tool intended to help you visualize different financial scenarios based on the data you input. The projections, calculations, and graphs presented by this Service are hypothetical in nature, do not reflect actual investment results, and are not guarantees of future results."
                },
                {
                    title: "2. No Professional Advice",
                    text: "The information provided by CanIQuit does not constitute investment, financial, tax, or legal advice. We strongly recommend that you consult with a qualified financial advisor, tax professional, or attorney before making any decision regarding your retirement planning, investments, or estate."
                },
                {
                    title: "3. Model Limitations & Assumptions",
                    text: "The simulations rely on assumptions regarding:",
                    list: [
                        "Inflation Rates: Future inflation is unpredictable and can significantly impact purchasing power.",
                        "Market Returns: Assumed rates of return are constant in linear models or randomized in Monte Carlo simulations, but real markets exhibit volatility, crashes, and black swan events not fully captured by models.",
                        "Tax Laws: Tax calculations are approximations based on current laws, which are subject to change. Complex individual tax situations may not be accurately reflected.",
                        "Life Expectancy: Longevity risk (living longer than expected) is a critical factor in retirement planning."
                    ]
                },
                {
                    title: "4. Investment Risks",
                    text: "All investments carry risk. Different types of investments involve varying degrees of risk, and there can be no assurance that the future performance of any specific investment or investment strategy will be profitable or equal to any historical performance level(s)."
                },
                {
                    title: "5. Data Accuracy",
                    text: "The accuracy of the output depends entirely on the accuracy of the data you enter. We do not verify any of the data you input into the system. You are responsible for ensuring your financial inputs (assets, debts, income, expenses) are correct and up-to-date."
                },
                {
                    title: "6. Liability Waiver",
                    text: "By using this Service, you agree that the creators and operators of CanIQuit shall not be responsible or liable for any trading or investment decisions made based on such information. You assume full risk and responsibility for your financial results."
                }
            ]
        },
        fr: {
            title: "Avertissement",
            subtitle: "Informations importantes concernant les limites de cet outil et les risques d'investissement.",
            cardTitle: "Avertissement financier et d'investissement",
            lastUpdated: "Dernière mise à jour : Février 2026",
            warningTitle: "Avertissement : Performances passées",
            warningText: "Les performances passées ne préjugent pas des performances futures. La valeur des investissements et les revenus qu'ils génèrent peuvent baisser comme augmenter, et vous pourriez ne pas récupérer le montant initialement investi.",
            sections: [
                {
                    title: "1. But éducatif uniquement",
                    text: "CanIQuit est un outil pédagogique destiné à vous aider à visualiser différents scénarios financiers basés sur les données que vous saisissez. Les projections, calculs et graphiques présentés par ce Service sont de nature hypothétique, ne reflètent pas les résultats réels des investissements et ne constituent pas une garantie de résultats futurs."
                },
                {
                    title: "2. Pas de conseil professionnel",
                    text: "Les informations fournies par CanIQuit ne constituent pas un conseil en investissement, financier, fiscal ou juridique. Nous vous recommandons vivement de consulter un conseiller financier qualifié, un fiscaliste ou un avocat avant de prendre toute décision concernant votre planification de retraite, vos investissements ou votre succession."
                },
                {
                    title: "3. Limites du modèle et hypothèses",
                    text: "Les simulations reposent sur des hypothèses concernant :",
                    list: [
                        "Taux d'inflation : L'inflation future est imprévisible et peut avoir un impact significatif sur le pouvoir d'achat.",
                        "Rendements du marché : Les taux de rendement supposés sont constants dans les modèles linéaires ou aléatoires dans les simulations Monte Carlo, mais les marchés réels présentent une volatilité, des krachs et des événements imprévus qui ne sont pas entièrement capturés par les modèles.",
                        "Lois fiscales : Les calculs fiscaux sont des approximations basées sur les lois actuelles, qui sont sujettes à changement. Les situations fiscales individuelles complexes peuvent ne pas être reflétées avec précision.",
                        "Espérance de vie : Le risque de longévité (vivre plus longtemps que prévu) est un facteur critique dans la planification de la retraite."
                    ]
                },
                {
                    title: "4. Risques d'investissement",
                    text: "Tous les investissements comportent des risques. Différents types d'investissements impliquent des degrés de risque variables, et il ne peut y avoir aucune assurance que la performance future de tout investissement ou stratégie d'investissement spécifique sera rentable ou égale à tout niveau de performance historique."
                },
                {
                    title: "5. Exactitude des données",
                    text: "L'exactitude des résultats dépend entièrement de l'exactitude des données que vous saisissez. Nous ne vérifions aucune des données que vous saisissez dans le système. Vous êtes responsable de vous assurer que vos données financières (actifs, dettes, revenus, dépenses) sont correctes et à jour."
                },
                {
                    title: "6. Décharge de responsabilité",
                    text: "En utilisant ce Service, vous acceptez que les créateurs et opérateurs de CanIQuit ne soient pas responsables des décisions de trading ou d'investissement prises sur la base de ces informations. Vous assumez l'entière responsabilité de vos résultats financiers."
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <PageHeader
                icon={AlertTriangle}
                title={t.title}
                description={t.subtitle}
            />

            <Card className="mt-6 bg-card border-border">
                <CardHeader>
                    <CardTitle>{t.cardTitle}</CardTitle>
                    <CardDescription>{t.lastUpdated}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-6 text-sm text-foreground/90">

                            {/* Prominent Warning Box */}
                            <Alert variant="destructive" className="my-6 border-red-600/50 bg-red-900/10">
                                <AlertTriangle className="h-5 w-5" />
                                <AlertTitle className="text-lg font-bold ml-2">{t.warningTitle}</AlertTitle>
                                <AlertDescription className="mt-2 text-base font-medium">
                                    {t.warningText}
                                </AlertDescription>
                            </Alert>

                            {t.sections.map((section, index) => (
                                <section key={index}>
                                    <h3 className="text-lg font-semibold mb-2 text-primary">{section.title}</h3>
                                    <p>
                                        {language === 'fr' && section.title.includes("éducatif") ? (
                                            <>
                                                CanIQuit est un outil pédagogique destiné à vous aider à visualiser différents scénarios financiers basés sur les données que vous saisissez. Les projections, calculs et graphiques présentés par ce Service sont <strong>de nature hypothétique</strong>, ne reflètent pas les résultats réels des investissements et ne constituent pas une garantie de résultats futurs.
                                            </>
                                        ) : language === 'en' && section.title.includes("Educational") ? (
                                            <>
                                                CanIQuit is an educational tool intended to help you visualize different financial scenarios based on the data you input. The projections, calculations, and graphs presented by this Service are <strong>hypothetical in nature</strong>, do not reflect actual investment results, and are not guarantees of future results.
                                            </>
                                        ) : (
                                            section.text
                                        )}
                                    </p>
                                    {section.list && (
                                        <ul className="list-disc pl-5 mt-2 space-y-1">
                                            {section.list.map((item, i) => {
                                                const [bold, rest] = item.split(':');
                                                return (
                                                    <li key={i}>
                                                        {rest ? (
                                                            <><strong>{bold}:</strong>{rest}</>
                                                        ) : (
                                                            item
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </section>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
