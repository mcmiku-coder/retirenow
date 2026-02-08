import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { ScrollArea } from "../../components/ui/scroll-area";
import PageHeader from '../../components/PageHeader';
import { Mail, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

import contactImage from '../../assets/contact_image.jpg';

export default function Contact() {
    const { language } = useLanguage();
    const navigate = useNavigate();

    const content = {
        en: {
            title: "Contact Us",
            subtitle: "Get in touch with the CanIQuit team.",
            cardTitle: "Contact Information",
            emailLabel: "Email us at:",
            email: "info@caniquit.ch",
            imageAlt: "Made in La Conversion",
            back: "Back"
        },
        fr: {
            title: "Contactez-nous",
            subtitle: "Entrez en contact avec l'équipe CanIQuit.",
            cardTitle: "Informations de contact",
            emailLabel: "Écrivez-nous à :",
            email: "info@caniquit.ch",
            imageAlt: "Fabriqué à La Conversion",
            back: "Retour"
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
                icon={Mail}
                title={t.title}
                description={t.subtitle}
                leftContent={backButton}
            />
            <div className="container mx-auto px-4 py-8 max-w-4xl">

                <Card className="mt-6 bg-card border-border">
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-8">

                            <div className="space-y-2">
                                <p className="text-lg text-muted-foreground font-medium">
                                    {t.emailLabel}
                                </p>
                                <a
                                    href={`mailto:${t.email}`}
                                    className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Mail className="h-6 w-6" />
                                    {t.email}
                                </a>
                            </div>

                            {/* Poster Image */}
                            <div className="w-full max-w-xs mx-auto rounded-lg overflow-hidden shadow-lg border border-border">
                                <img
                                    src={contactImage}
                                    alt={t.imageAlt}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
