import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { ScrollArea } from "../../components/ui/scroll-area";
import PageHeader from '../../components/PageHeader';
import { Lock, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
    const { language } = useLanguage();
    const navigate = useNavigate();

    const content = {
        en: {
            title: "Privacy Policy",
            subtitle: "We value your privacy and data security above all else.",
            cardTitle: "GDPR Compliance & Data Protection",
            lastUpdated: "Last Updated: February 2026",
            back: "Back",
            zeroKnowledgeTitle: "Zero-Knowledge Architecture",
            zeroKnowledgeText: "CanIQuit is built with a \"Zero-Knowledge\" privacy model. This means your sensitive financial data is encrypted on your device before it is ever saved. We (the service providers) do not have the key to decrypt your financial data. Only you possess the key (derived from your password).",
            sections: [
                {
                    title: "1. Information We Collect",
                    text: "We collect only the minimum information necessary to provide the Service:",
                    list: [
                        "Account Information (Server-Side): We store your email address and a cryptographic hash of your password. This allows you to log in from different devices. We cannot see your actual password.",
                        "Financial Data (Client-Side Encrypted): Your assets, income, costs, and simulation parameters are stored in your browser's local storage (IndexedDB). When synced to our server for backup, this data remains fully encrypted (AES-256-GCM). The server sees only \"blobs\" of unreadable text."
                    ]
                },
                {
                    title: "2. How We Use Your Information",
                    text: "To provide and maintain the Service, specifically:",
                    list: [
                        "To authenticate you when you sign in.",
                        "To allow you to save and retrieve your simulations across sessions.",
                        "To communicate with you about service updates or security notices."
                    ],
                    extraText: "We do not sell, trade, or rent your personal identification information to others. We do not use your financial data for advertising purposes because we cannot access it."
                },
                {
                    title: "3. Data Storage & Security",
                    text: "All financial data is encrypted using AES-256-GCM encryption. The encryption key is derived from your password using PBKDF2 with a high iteration count.",
                    warning: "Warning: Because we do not store your encryption key, we cannot recover your financial data if you forget your password."
                },
                {
                    title: "4. Your GDPR Rights",
                    text: "Under the General Data Protection Regulation (GDPR), you have certain rights regarding your personal data:",
                    list: [
                        "Right of Access: You have the right to request a copy of the information that we hold about you. You can view all your decrypted data directly within the application.",
                        "Right to Rectification: You have the right to correct data that is inaccurate or incomplete. You can do this at any time within the application interface.",
                        "Right to Erasure (\"Right to be Forgotten\"): You may request the deletion of your account. This will permanently remove your email and hashed password from our servers, and delete your encrypted data blobs. You can also clear your browser's local storage to remove data from your device.",
                        "Right to Data Portability: You have the right to request that we transfer the data that we have collected to another organization, or directly to you."
                    ]
                },
                {
                    title: "5. Cookies",
                    text: "CanIQuit uses a limited number of cookies strictly for authentication and session management purposes. We do not use third-party advertising cookies."
                },
                {
                    title: "6. Changes to This Privacy Policy",
                    text: "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes."
                },
                {
                    title: "7. Contact Us",
                    text: "If you have any questions about this Privacy Policy or our data practices, please contact us."
                }
            ]
        },
        fr: {
            title: "Politique de confidentialité",
            subtitle: "Nous accordons la plus haute importance à votre vie privée et à la sécurité de vos données.",
            cardTitle: "Conformité RGPD et Protection des Données",
            lastUpdated: "Dernière mise à jour : Février 2026",
            back: "Retour",
            zeroKnowledgeTitle: "Architecture Zero-Knowledge",
            zeroKnowledgeText: "CanIQuit est construit avec un modèle de confidentialité \"Zero-Knowledge\". Cela signifie que vos données financières sensibles sont chiffrées sur votre appareil avant d'être sauvegardées. Nous (les fournisseurs de services) n'avons pas la clé pour déchiffrer vos données financières. Vous seul possédez la clé (dérivée de votre mot de passe).",
            sections: [
                {
                    title: "1. Informations que nous collectons",
                    text: "Nous collectons uniquement les informations minimales nécessaires pour fournir le Service :",
                    list: [
                        "Informations de compte (côté serveur) : Nous stockons votre adresse e-mail et un hachage cryptographique de votre mot de passe. Cela vous permet de vous connecter à partir de différents appareils. Nous ne pouvons pas voir votre mot de passe réel.",
                        "Données financières (chiffrées côté client) : Vos actifs, revenus, coûts et paramètres de simulation sont stockés dans le stockage local de votre navigateur (IndexedDB). Lors de la synchronisation avec notre serveur pour la sauvegarde, ces données restent entièrement chiffrées (AES-256-GCM). Le serveur ne voit que des \"blobs\" de texte illisible."
                    ]
                },
                {
                    title: "2. Comment nous utilisons vos informations",
                    text: "Pour fournir et maintenir le Service, spécifiquement :",
                    list: [
                        "Pour vous authentifier lorsque vous vous connectez.",
                        "Pour vous permettre d'enregistrer et de récupérer vos simulations entre les sessions.",
                        "Pour communiquer avec vous au sujet des mises à jour du service ou des avis de sécurité."
                    ],
                    extraText: "Nous ne vendons, n'échangeons ni ne louons vos informations d'identification personnelles à des tiers. Nous n'utilisons pas vos données financières à des fins publicitaires car nous ne pouvons pas y accéder."
                },
                {
                    title: "3. Stockage et sécurité des données",
                    text: "Toutes les données financières sont chiffrées à l'aide du chiffrement AES-256-GCM. La clé de chiffrement est dérivée de votre mot de passe à l'aide de PBKDF2 avec un nombre élevé d'itérations.",
                    warning: "Avertissement : Parce que nous ne stockons pas votre clé de chiffrement, nous ne pouvons pas récupérer vos données financières si vous oubliez votre mot de passe."
                },
                {
                    title: "4. Vos droits RGPD",
                    text: "En vertu du Règlement général sur la protection des données (RGPD), vous disposez de certains droits concernant vos données personnelles :",
                    list: [
                        "Droit d'accès : Vous avez le droit de demander une copie des informations que nous détenons à votre sujet. Vous pouvez consulter toutes vos données déchiffrées directement dans l'application.",
                        "Droit de rectification : Vous avez le droit de corriger les données inexactes ou incomplètes. Vous pouvez le faire à tout moment dans l'interface de l'application.",
                        "Droit à l'effacement (\"Droit à l'oubli\") : Vous pouvez demander la suppression de votre compte. Cela supprimera définitivement votre e-mail et votre mot de passe haché de nos serveurs, et supprimera vos blobs de données chiffrées. Vous pouvez également effacer le stockage local de votre navigateur pour supprimer les données de votre appareil.",
                        "Droit à la portabilité des données : Vous avez le droit de demander que nous transférions les données que nous avons collectées à une autre organisation, ou directement à vous."
                    ]
                },
                {
                    title: "5. Cookies",
                    text: "CanIQuit utilise un nombre limité de cookies strictement à des fins d'authentification et de gestion de session. Nous n'utilisons pas de cookies publicitaires tiers."
                },
                {
                    title: "6. Modifications de cette politique de confidentialité",
                    text: "Nous pouvons mettre à jour notre politique de confidentialité de temps à autre. Nous vous informerons de tout changement en publiant la nouvelle politique de confidentialité sur cette page. Nous vous conseillons de consulter régulièrement cette politique de confidentialité pour tout changement."
                },
                {
                    title: "7. Contactez-nous",
                    text: "Si vous avez des questions concernant cette politique de confidentialité ou nos pratiques en matière de données, veuillez nous contacter."
                }
            ]
        }
    };

    const t = content[language] || content.en;

    const backButton = (
        <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t.back}
        </button>
    );

    return (
        <div className="flex-grow bg-background">
            <PageHeader
                icon={Lock}
                title={t.title}
                description={t.subtitle}
                leftContent={backButton}
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

                                <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg my-4">
                                    <h4 className="flex items-center gap-2 font-bold text-blue-400 mb-2">
                                        <Lock className="w-4 h-4" />
                                        {t.zeroKnowledgeTitle}
                                    </h4>
                                    <p className="text-blue-100">
                                        {t.zeroKnowledgeText}
                                    </p>
                                </div>

                                {t.sections.map((section, index) => (
                                    <section key={index}>
                                        <h3 className="text-lg font-semibold mb-2 text-primary">{section.title}</h3>
                                        <p>{section.text}</p>
                                        {section.list && (
                                            <ul className="list-disc pl-5 mt-2 space-y-2">
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
                                        {section.extraText && (
                                            <p className="mt-2 text-foreground/90">
                                                {section.extraText}
                                            </p>
                                        )}
                                        {section.warning && (
                                            <p className="mt-2 text-amber-500 font-medium">{section.warning}</p>
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
