import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, Shield, User, Calendar, Wallet, PiggyBank, LineChart, Landmark, Sliders, Target, ClipboardCheck, FileText, Home } from 'lucide-react';

const Information = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const steps = [
    {
      icon: User,
      titleKey: 'step1Title',
      descKey: 'step1Desc',
      image: '/screenshots/personal-info.png',
      color: 'text-blue-500'
    },
    {
      icon: Calendar,
      titleKey: 'step2Title',
      descKey: 'step2Desc',
      image: '/screenshots/retirement-overview.png',
      color: 'text-green-500'
    },
    {
      icon: Wallet,
      titleKey: 'step3Title',
      descKey: 'step3Desc',
      image: '/screenshots/income.png',
      color: 'text-yellow-500'
    },
    {
      icon: PiggyBank,
      titleKey: 'step4Title',
      descKey: 'step4Desc',
      image: '/screenshots/costs.png',
      color: 'text-orange-500'
    },
    {
      icon: Home,
      titleKey: 'step4SpinOffTitle',
      descKey: 'step4SpinOffDesc',
      image: '/screenshots/costs.png', // Placeholder
      color: 'text-orange-400',
      isSpinOff: true
    },
    {
      icon: Landmark,
      titleKey: 'step5Title',
      descKey: 'step5Desc',
      image: '/screenshots/assets-savings.png',
      color: 'text-teal-500'
    },
    {
      icon: Sliders,
      titleKey: 'step6Title',
      descKey: 'step6Desc',
      image: '/screenshots/retirement-inputs.png',
      color: 'text-indigo-500'
    },
    {
      icon: ClipboardCheck,
      titleKey: 'step7Title',
      descKey: 'step7Desc',
      image: '/screenshots/data-review.png',
      color: 'text-cyan-500'
    },
    {
      icon: LineChart,
      titleKey: 'step7SpinOffTitle',
      descKey: 'step7SpinOffDesc',
      image: '/screenshots/scenario.png',
      color: 'text-purple-400',
      isSpinOff: true
    },
    {
      icon: FileText,
      titleKey: 'step8Title',
      descKey: 'step8Desc',
      image: '/screenshots/result.png',
      color: 'text-red-500'
    }
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('infoPage.backToHome')}
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-primary">
            {t('infoPage.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('infoPage.subtitle')}
          </p>
        </div>

        {/* Security Section - First Position */}
        <Card className="mb-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {t('infoPage.securityTitle')}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('infoPage.securityDesc')}
            </p>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <div key={index} className="relative">
                {/* Vertical Connector for Spin-offs */}
                {step.isSpinOff && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-border z-0" />
                )}

                <Card
                  className={`overflow-hidden transition-all duration-300 relative z-10 ${step.isSpinOff
                    ? 'ml-8 sm:ml-16 bg-muted/30 scale-95 border-primary/20'
                    : ''
                    }`}
                >
                  <CardContent className="p-0">
                    {/* Text Content */}
                    <div className="p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg bg-muted ${step.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold">
                          {t(`infoPage.${step.titleKey}`)}
                        </h2>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {t(`infoPage.${step.descKey}`)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center py-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            {t('infoPage.ctaTitle')}
          </h2>
          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="min-w-[250px] text-lg"
          >
            {t('infoPage.ctaButton')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Information;
