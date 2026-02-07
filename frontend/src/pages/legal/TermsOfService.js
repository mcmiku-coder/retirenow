import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { ScrollArea } from "../../components/ui/scroll-area";
import PageHeader from '../../components/PageHeader';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function TermsOfService() {
    const { language } = useLanguage();

    const content = {
        en: {
            title: "Terms of Service",
            subtitle: "Please read these terms carefully before using CanIQuit",
            cardTitle: "User Agreement",
            lastUpdated: "Last Updated: February 2026",
            sections: [
                {
                    title: "1. Acceptance of Terms",
                    text: "By accessing or using the \"CanIQuit\" application (the \"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, you may not access or use the Service."
                },
                {
                    title: "2. Description of Service",
                    text: "CanIQuit is an educational tool designed to assist users in simulating financial retirement scenarios. It allows users to input financial data, project future values, and visualize potential outcomes based on mathematical models and user-defined assumptions."
                },
                {
                    title: "3. No Financial Advice",
                    text: "The Service is provided for informational and educational purposes only. It does NOT constitute financial, investment, tax, or legal advice.",
                    listIntroduction: "You acknowledge that:",
                    list: [
                        "The authors and operators of CanIQuit are not financial advisors.",
                        "You should consult with a qualified professional before making any financial decisions.",
                        "You are solely responsible for your own financial decisions."
                    ],
                    isWarning: true
                },
                {
                    title: "4. User Account & Security",
                    text: "To access certain features, you must create an account. You rely on our Zero-Knowledge Architecture, meaning your financial data is encrypted on your device using your password.",
                    listIntroduction: "You are responsible for:",
                    list: [
                        "Maintaining the confidentiality of your password. If you lose your password, your financial data cannot be recovered by us.",
                        "All activities that occur under your account.",
                        "Ensuring the accuracy of the data you input."
                    ]
                },
                {
                    title: "5. Intellectual Property",
                    text: "The Service, including its \"Can I Quit\" branding, original content, features, and functionality, are and will remain the exclusive property of the CanIQuit team. The Service is protected by copyright, trademark, and other laws of Switzerland and foreign countries."
                },
                {
                    title: "6. Limitation of Liability",
                    text: "In no event shall the authors, operators, or affiliates of CanIQuit be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:",
                    list: [
                        "Your access to or use of or inability to access or use the Service;",
                        "Any conduct or content of any third party on the Service;",
                        "Any content obtained from the Service; and",
                        "Unauthorized access, use, or alteration of your transmissions or content."
                    ]
                },
                {
                    title: "7. Modifications to Service",
                    text: "We reserve the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice. We shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the Service."
                },
                {
                    title: "8. Governing Law",
                    text: "These Terms shall be governed and construed in accordance with the laws of Switzerland, without regard to its conflict of law provisions."
                },
                {
                    title: "9. Contact Us",
                    text: "If you have any questions about these Terms, please contact the administrator via the application support channels."
                }
            ]
        },
        fr: {
            title: "Conditions d'utilisation",
            subtitle: "Veuillez lire attentivement ces conditions avant d'utiliser CanIQuit",
            cardTitle: "Accord utilisateur",
            lastUpdated: "Dernière mise à jour: Février 2026",
            sections: [
                {
                    title: "1. Acceptation des conditions",
                    text: "En accédant ou en utilisant l'application \"CanIQuit\" (le \"Service\"), vous acceptez d'être lié par ces Conditions d'utilisation (\"Conditions\"). Si vous n'acceptez pas ces conditions, vous ne pouvez pas accéder ou utiliser le Service."
                },
                {
                    title: "2. Description du service",
                    text: "CanIQuit est un outil pédagogique conçu pour aider les utilisateurs à simuler des scénarios financiers de retraite. Il permet aux utilisateurs de saisir des données financières, de projeter des valeurs futures et de visualiser des résultats potentiels basés sur des modèles mathématiques et des hypothèses définies par l'utilisateur."
                },
                {
                    title: "3. Pas de conseil financier",
                    text: "Le Service est fourni à des fins informatives et éducatives uniquement. Il ne constitue PAS un conseil financier, d'investissement, fiscal ou juridique.",
                    listIntroduction: "Vous reconnaissez que :",
                    list: [
                        "Les auteurs et opérateurs de CanIQuit ne sont pas des conseillers financiers.",
                        "Vous devez consulter un professionnel qualifié avant de prendre toute décision financière.",
                        "Vous êtes seul responsable de vos propres décisions financières."
                    ],
                    isWarning: true
                },
                {
                    title: "4. Compte utilisateur et sécurité",
                    text: "Pour accéder à certaines fonctionnalités, vous devez créer un compte. Vous comptez sur notre architecture Zero-Knowledge, ce qui signifie que vos données financières sont chiffrées sur votre appareil à l'aide de votre mot de passe.",
                    listIntroduction: "Vous êtes responsable de :",
                    list: [
                        "Maintenir la confidentialité de votre mot de passe. Si vous perdez votre mot de passe, vos données financières ne peuvent pas être récupérées par nous.",
                        "Toutes les activités qui se produisent sous votre compte.",
                        "Garantir l'exactitude des données que vous saisissez."
                    ]
                },
                {
                    title: "5. Propriété intellectuelle",
                    text: "Le Service, y compris sa marque \"Can I Quit\", son contenu original, ses fonctionnalités et ses caractéristiques, sont et resteront la propriété exclusive de l'équipe CanIQuit. Le Service est protégé par le droit d'auteur, le droit des marques et d'autres lois de Suisse et de pays étrangers."
                },
                {
                    title: "6. Limitation de responsabilité",
                    text: "En aucun cas, les auteurs, opérateurs ou affiliés de CanIQuit ne pourront être tenus responsables de tout dommage indirect, accessoire, spécial, consécutif ou punitif, y compris, sans s'y limiter, la perte de profits, de données, d'utilisation, de fonds de commerce ou d'autres pertes intangibles, résultant de :",
                    list: [
                        "Votre accès ou utilisation ou incapacité d'accéder ou d'utiliser le Service ;",
                        "Toute conduite ou contenu de tout tiers sur le Service ;",
                        "Tout contenu obtenu à partir du Service ; et",
                        "Accès, utilisation ou modification non autorisés de vos transmissions ou contenus."
                    ]
                },
                {
                    title: "7. Modifications du service",
                    text: "Nous nous réservons le droit de modifier ou d'interrompre, temporairement ou définitivement, le Service (ou toute partie de celui-ci) avec ou sans préavis. Nous ne serons pas responsables envers vous ou tout tiers pour toute modification, suspension ou interruption du Service."
                },
                {
                    title: "8. Droit applicable",
                    text: "Ces conditions seront régies et interprétées conformément aux lois de la Suisse, sans égard à ses dispositions sur les conflits de lois."
                },
                {
                    title: "9. Contactez-nous",
                    text: "Si vous avez des questions concernant ces conditions, veuillez contacter l'administrateur via les canaux de support de l'application."
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <div className="min-h-screen bg-background">
            <PageHeader
                icon={ShieldCheck}
                title={t.title}
                description={t.subtitle}
            />
            <div className="container mx-auto px-4 py-8 max-w-4xl">

                <Card className="mt-6 bg-card border-border">
                    <CardHeader>
                        <CardTitle>{t.cardTitle}</CardTitle>
                        <CardDescription>{t.lastUpdated}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-6 text-sm text-foreground/90">
                                {t.sections.map((section, index) => (
                                    <section key={index}>
                                        <h3 className="text-lg font-semibold mb-2 text-primary">{section.title}</h3>
                                        {section.isWarning ? (
                                            <p className="font-medium text-destructive">{section.text}</p>
                                        ) : (
                                            <p>{section.text}</p>
                                        )}
                                        {section.listIntroduction && (
                                            <p className="mt-2">{section.listIntroduction}</p>
                                        )}
                                        {section.list && (
                                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                                {section.list.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
