import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
    const location = useLocation();
    const { language } = useLanguage();
    const currentYear = new Date().getFullYear();

    // Do not show footer on admin pages
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    const t = {
        rights: language === 'fr' ? "Tous droits réservés." : "All rights reserved.",
        terms: language === 'fr' ? "Conditions d'utilisation" : "Terms of Service",
        privacy: language === 'fr' ? "Politique de confidentialité" : "Privacy Policy",
        disclaimer: language === 'fr' ? "Avertissement" : "Disclaimer"
    };

    const isLanding = location.pathname === '/';

    return (
        <footer className={`w-full py-6 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isLanding ? 'mt-auto' : 'mt-8'}`}>
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
                <p className="text-sm text-muted-foreground">
                    &copy; {currentYear} CanIQuit. {t.rights}
                </p>
                <nav className="flex gap-4 sm:gap-6 text-sm font-medium text-muted-foreground">
                    <Link to="/contact" className="hover:text-foreground hover:underline transition-colors">
                        {language === 'fr' ? 'Contact' : 'Contact'}
                    </Link>
                    <Link to="/terms" className="hover:text-foreground hover:underline transition-colors">
                        {t.terms}
                    </Link>
                    <Link to="/privacy" className="hover:text-foreground hover:underline transition-colors">
                        {t.privacy}
                    </Link>
                    <Link to="/disclaimer" className="hover:text-foreground hover:underline transition-colors">
                        {t.disclaimer}
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
