import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  ArrowLeft, Shield, User, Calendar, Wallet, PiggyBank,
  LineChart, Landmark, Sliders, ClipboardCheck, FileText, Home,
  ArrowRight, Lock, Key, RefreshCw, Server, HardDrive, Database, Download
} from 'lucide-react';

const Information = () => {
  const navigate = useNavigate();
  const { t, language, switchLanguage } = useLanguage();

  const steps = [
    {
      icon: User,
      titleKey: 'step1Title',
      descKey: 'step1Desc',
      color: 'bg-blue-600',
      lightColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    },
    {
      icon: Calendar,
      titleKey: 'step2Title',
      descKey: 'step2Desc',
      color: 'bg-green-600',
      lightColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    },
    {
      icon: Wallet,
      titleKey: 'step3Title',
      descKey: 'step3Desc',
      color: 'bg-yellow-600',
      lightColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    },
    {
      icon: PiggyBank,
      titleKey: 'step4Title',
      descKey: 'step4Desc',
      color: 'bg-orange-600',
      lightColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    },
    {
      icon: Home,
      titleKey: 'step4SpinOffTitle',
      descKey: 'step4SpinOffDesc',
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      isSpinOff: true,
      cardBg: 'bg-orange-50/90 dark:bg-orange-950/40',
      cardBorder: 'border-orange-200 dark:border-orange-800'
    },
    {
      icon: Landmark,
      titleKey: 'step5Title',
      descKey: 'step5Desc',
      color: 'bg-teal-600',
      lightColor: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
    },
    {
      icon: Sliders,
      titleKey: 'step6Title',
      descKey: 'step6Desc',
      color: 'bg-blue-600',
      lightColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    },
    {
      icon: ClipboardCheck,
      titleKey: 'step7Title',
      descKey: 'step7Desc',
      color: 'bg-cyan-600',
      lightColor: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
    },
    {
      icon: LineChart,
      titleKey: 'step7SpinOffTitle',
      descKey: 'step7SpinOffDesc',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      isSpinOff: true,
      cardBg: 'bg-cyan-50/90 dark:bg-cyan-950/40',
      cardBorder: 'border-cyan-200 dark:border-cyan-800'
    },
    {
      icon: FileText,
      titleKey: 'step8Title',
      descKey: 'step8Desc',
      color: 'bg-red-600',
      lightColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 bg-background overflow-x-hidden relative">

      {/* Language Selector - Top Right Absolute */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-[100px] justify-center shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLanguage('en')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            EN
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLanguage('fr')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${language === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            FR
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-8 group flex items-center gap-2 text-muted-foreground hover:text-foreground pl-0"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          {t('infoPage.backToHome')}
        </Button>

        {/* Header Section - CORRECTED TITLE FONT & COLORS */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-sans">
            <span className="text-foreground dark:text-white">Can I</span> <span className="text-primary">Quit</span><span className="text-foreground dark:text-white">?</span> <span className="text-foreground dark:text-white">{t('infoPage.titleSuffix')}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('infoPage.subtitle')}
          </p>
        </div>

        {/* Security Badge */}
        {/* Security Badge */}


        {/* Visual Stack Layout - SEGMENTED TIMELINE LOGIC FIX */}
        <div className="relative space-y-0 pb-12">

          {steps.map((step, index) => {
            const Icon = step.icon;
            const nonSpinOffIndex = steps.slice(0, index + 1).filter(s => !s.isSpinOff).length;
            const isLastStep = index === steps.length - 1;
            const isFirstStep = index === 0;

            if (step.isSpinOff) {
              return (
                <div key={index} className="relative py-8 min-h-[140px]">
                  {/* 1. CONTINUOUS VERTICAL BACKBONE (Connects through to next step) */}
                  <div
                    className="absolute left-[36px] w-[3px] bg-slate-300 dark:bg-slate-600 z-0"
                    style={{ top: '0', bottom: '0' }}
                  />

                  {/* 2. L-SHAPED BRANCH REMOVED */}

                  {/* Spin-off Card */}
                  <div className="w-full flex justify-end pl-8 sm:pl-0">
                    <div className={`w-[80%] md:w-[75%] ${step.cardBg} border ${step.cardBorder} rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-4 shadow-sm hover:shadow-md transition-all relative z-10`}>

                      {/* NEW: Vertical Link to Parent Card */}
                      <div
                        className="absolute -top-12 left-8 md:left-12 w-[3px] h-12 bg-slate-300 dark:bg-slate-600 z-0"
                      />

                      <div className={`p-2.5 rounded-full ${step.color} text-white shrink-0 shadow-sm ring-4 ring-background`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                          {/* REMOVED "EXTENSION" BADGE HERE */}
                          <h3 className="font-bold text-base md:text-lg text-foreground/90 font-sans">
                            {t(`infoPage.${step.titleKey}`)}
                          </h3>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-normal">
                          {t(`infoPage.${step.descKey}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // Normal Step
            return (
              <div key={index} className="relative group py-6 z-10">

                {/* TIMELINE SEGMENTS FOR NORMAL STEP - FIXED GAP */}
                {/* Lines now meet at 60px (center of icon) behind the opaque container */}

                {/* 1. Upper Connector (from previous step) */}
                {!isFirstStep && (
                  <div
                    className="absolute left-[36px] w-[3px] bg-slate-300 dark:bg-slate-600 z-0"
                    style={{ top: '0', height: '60px' }}
                  />
                )}

                {/* 2. Lower Connector (to next step) */}
                {!isLastStep && (
                  <div
                    className="absolute left-[36px] w-[3px] bg-slate-300 dark:bg-slate-600 z-0"
                    style={{ top: '60px', bottom: '0' }}
                  />
                )}

                <div className="flex items-start gap-6 md:gap-10">
                  {/* Icon Container */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg border-[3px] border-background group-hover:scale-105 transition-transform duration-300 z-10"
                      style={{ backgroundColor: 'hsl(var(--background))' }}
                    >
                      <div className={`absolute inset-0 rounded-[14px] ${step.lightColor}`} />
                      <div className="relative z-10">
                        <Icon className="h-8 w-8" />
                      </div>

                      <div className={`absolute -bottom-3 -right-3 w-9 h-9 rounded-full ${step.color} text-white flex items-center justify-center font-bold text-lg shadow-md ring-[3px] ring-background z-20`}>
                        {nonSpinOffIndex}
                      </div>
                    </div>
                  </div>

                  {/* Main Content Bar */}
                  <div className="flex-1 min-w-0">
                    <div className={`
                         rounded-2xl border bg-card text-card-foreground p-6 pl-8
                         shadow-sm hover:shadow-md transition-all duration-300
                         group-hover:border-primary/20 relative overflow-hidden
                         min-h-[110px] flex items-center
                      `}>
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${step.color}`} />
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 w-full">
                        {/* ADDED font-sans TO NORMAL STEP TITLE */}
                        <h3 className="text-xl font-bold text-foreground md:w-1/3 leading-tight font-sans">
                          {t(`infoPage.${step.titleKey}`)}
                        </h3>
                        <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700" />

                        {step.descKey === 'step6Desc' ? (
                          <div className="flex-1 min-w-0">
                            {/* Intro text (everything before the first 1) ) */}
                            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-3">
                              {t(`infoPage.${step.descKey}`).split('1)')[0]}
                            </p>

                            {/* Options in Blue Text */}
                            <div className="flex flex-col gap-1.5 mt-2">
                              {t(`infoPage.${step.descKey}`).split('\n').filter(line => line.trim().match(/^\d\)/)).map((line, i) => (
                                <div key={i} className="leading-snug text-blue-600 dark:text-blue-400 font-medium text-sm md:text-base">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm md:text-base leading-relaxed flex-1 whitespace-pre-line">
                            {t(`infoPage.${step.descKey}`)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Badge - MOVED TO BOTTOM */}
        <div className="mb-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border border-emerald-500/40 p-1">
          <div className="relative bg-background/60 backdrop-blur-sm rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-2 font-sans">
                {t('infoPage.securityTitle')}
              </h3>
              <p className="text-muted-foreground text-sm md:text-base w-full">
                {t('infoPage.securityDesc')}
              </p>
            </div>

            {/* New Button Section */}
            <div className="shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 transition-colors">
                    {t('infoPage.securityModal.button')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-bold flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-sans">
                      <Shield className="h-9 w-9" />
                      {t('infoPage.securityModal.title')}
                    </DialogTitle>
                    <DialogDescription className="text-xl font-medium pt-3 text-muted-foreground/90">
                      {t('infoPage.securityModal.architecture')}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-8 py-6">
                    {/* 1. Local Encryption */}
                    <div className="flex gap-5 items-start">
                      <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-emerald-500 shrink-0">
                        <HardDrive className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-foreground mb-1 font-sans">{t('infoPage.securityModal.localEncryptionTitle')}</h4>
                        <p className="text-muted-foreground text-start leading-relaxed text-base">
                          {t('infoPage.securityModal.localEncryptionDesc')}
                        </p>
                      </div>
                    </div>

                    {/* 2. Master Key */}
                    <div className="flex gap-5 items-start">
                      <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-blue-500 shrink-0">
                        <Key className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-foreground mb-1 font-sans">{t('infoPage.securityModal.masterKeyTitle')}</h4>
                        <p className="text-muted-foreground text-start leading-relaxed text-base">
                          {t('infoPage.securityModal.masterKeyDesc')}
                        </p>
                      </div>
                    </div>

                    {/* 3. Password Reset */}
                    <div className="flex gap-5 items-start">
                      <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-orange-500 shrink-0">
                        <RefreshCw className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-foreground mb-1 font-sans">{t('infoPage.securityModal.passwordResetTitle')}</h4>
                        <p className="text-muted-foreground text-start leading-relaxed text-base">
                          {t('infoPage.securityModal.passwordResetDesc')}
                        </p>
                      </div>
                    </div>

                    {/* 4. Privacy */}
                    <div className="flex gap-5 items-start">
                      <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-purple-500 shrink-0">
                        <Download className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-foreground mb-1 font-sans">{t('infoPage.securityModal.privacyTitle')}</h4>
                        <p className="text-muted-foreground text-start leading-relaxed text-base">
                          {t('infoPage.securityModal.privacyDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center sticky bottom-8 z-20">
          <div className="inline-block relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all duration-500" />
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="relative h-16 pl-8 pr-10 text-xl rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-4 border-background/50 backdrop-blur-sm"
            >
              <span className="mr-2">{t('infoPage.ctaButton')}</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground font-medium drop-shadow-sm bg-background/80 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
            {t('infoPage.ctaFooter')}
          </p>
        </div>

        <div className="h-24" />
      </div>
    </div >
  );
};

export default Information;
