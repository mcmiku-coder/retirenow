// Translations for English and French
export const translations = {
  en: {
    // Landing Page
    landing: {
      title: "quit?",
      subtitle: "See if you can afford an early retirement",
      description: "A comprehensive retirement planning tool that analyzes your income, costs, and savings to determine if you can quit your job and retire early.",
      learnMore: "Learn more about the solution before creating your account",
      createAccount: "Create Account",
      login: "Login",
      features: {
        title: "What we analyze",
        income: "Income Sources",
        incomeDesc: "Salary, AVS, LPP, 3a and custom income",
        costs: "Life Costs",
        costsDesc: "Housing, health, transport, leisure and more",
        simulation: "Scenario Simulation",
        simulationDesc: "Adjust retirement date and see projections"
      }
    },

    // Information Page
    infoPage: {
      title: "Can I quit? How does it work?",
      titleSuffix: "How does it work?",
      subtitle: "A complete guide to your retirement planning journey",
      backToHome: "Back to Home",
      step1Title: "Personal Information",
      step1Desc: "Start by entering your birth date and gender. This information is used to calculate your legal retirement age and life expectancy.",
      step2Title: "Retirement and life expectancy",
      step2Desc: "See your legal retirement date and your life expectancy based on statistical data.",
      step3Title: "Current income sources",
      step3Desc: "Enter all your current income sources: Net Salary and any other custom income. Specify amounts, frequencies, and date ranges for each source.",
      step4Title: "Current expenses",
      step4Desc: "List your expenses across categories: Housing, Taxes, Health Insurance, Food, Transport, Leisure, and more. Use our 'Help me fill this table' feature to quickly estimate typical costs based on your lifestyle.",
      step4SpinOffTitle: "Housing Expenses (optional feature)",
      step4SpinOffDesc: "An optional side-calculator accessible from the Costs page. Use this to calculate detailed housing costs when owning and managing your own real estate.",
      step5Title: "Assets and Savings",
      step5Desc: "Define your liquid assets, non-liquid assets, and possible future income like inheritance or other one-time inflows. This information helps create a complete picture of your financial situation.",
      step6Title: "Retirement inputs",
      step6Desc: "Enter your AVS (Swiss social security), LPP (occupational pension), 3a (private pension) retirement assets. Specify amounts, frequencies, and date ranges for each source.",
      step7Title: "Data Review Before Simulation",
      step7Desc: "Review and fine-tune all your income and cost data before running the simulation. Adjust values, split income or cost periods, and ensure all information is accurate for the most precise retirement projections.",
      step7SpinOffTitle: "Capital Management Setup (optional feature)",
      step7SpinOffDesc: "An optional feature that allows you to define the investment strategy of your assets and configure capital yield assumptions.",
      step8Title: "Scenario Verdict",
      step8Desc: "Get your personalized verdict: Can you quit? See your final projected balance, download a comprehensive PDF report, and make informed decisions.",
      securityTitle: "Your privacy is guaranteed - Zero-Knowledge Security",
      securityDesc: "Your financial data never leaves your device. All calculations happen locally, and your data is encrypted with AES-256 encryption using your password as the only key. We cannot access or recover your data.",
      ctaTitle: "Ready to plan your retirement?",
      ctaButton: "Create Your Free Account",
      ctaBadge: "Ready to find out your number?",
      ctaMainTitle: "Start your planning journey today.",
      ctaFooter: "Free to use • No credit card required • Secure",
      step: "STEP",
      securityModal: {
        button: "How is my data secured?",
        title: "Your data security is our top priority",
        architecture: "How we keep your information safe",
        localEncryptionTitle: "Bank-Grade Local Encryption",
        localEncryptionDesc: "Unlike standard web apps, your financial data never leaves your device unencrypted. We use military-grade AES-256 encryption right here in your browser, meaning we physically cannot see your financial life.",
        masterKeyTitle: "The Problem & Our Solution",
        masterKeyDesc: "Usually, secure local apps lose your data if you forget your password. We solved this by creating a secure 'Digital Bridge'—a unique key stored in a separate vault that only opens when you verify your identity.",
        passwordResetTitle: "No Data Loss Guarantee",
        passwordResetDesc: "This smart separation means that even if you forget your password, we can help you recover access via email verification without ever compromising these privacy guarantees.",
        privacyTitle: "Data Sovereignty & Backups",
        privacyDesc: "You are in full control. You can export your encrypted data to a secure backup file at any time, or restore it to another device. Your data belongs to you, not us."
      },
      spinOff: "SPIN-OFF"
    },

    // Auth Modal
    auth: {
      createAccount: "Create Account",
      login: "Login",
      email: "Email",
      emailPlaceholder: "your@email.com",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Confirm your password",
      createBtn: "Create Account",
      loginBtn: "Login",
      switchToLogin: "Already have an account? Login",
      switchToRegister: "Need an account? Register",
      passwordMismatch: "Passwords do not match",
      registrationSuccess: "Account created successfully!",
      loginSuccess: "Login successful!",
      registrationFailed: "Registration failed",
      loginFailed: "Login failed",
      checkEmail: "Please check your email to confirm your account.",
      verificationSuccess: "Email verified! You can now log in.",
      verificationFailed: "Invalid or expired verification link.",
      verifying: "Verifying your email...",
      forgotPassword: "Forgot password?"
    },

    // Personal Info Page
    personalInfo: {
      title: "Personal Information",
      subtitle: "Tell us about yourself to calculate your retirement timeline",
      analysisType: "I wish to analyse",
      individualSituation: "my individual situation",
      coupleSituation: "my couple situation (double entries necessary)",
      comingSoonTitle: "Feature Coming Soon",
      comingSoonMessage: "The couple analysis feature is currently under development. Please check back later!",
      birthDate: "Date of Birth",
      gender: "Gender",
      male: "Male",
      female: "Female",
      country: "Country",
      switzerland: "Switzerland",
      france: "France",
      continue: "Continue",
      saving: "Saving...",
      saveSuccess: "Personal information saved",
      saveFailed: "Failed to save personal information",
      firstName: "First Name",
      firstNamePlaceholder: "optional input"
    },

    // Retirement Overview Page
    retirementOverview: {
      title: "Retirement and life expectancy",
      subtitle: "Your retirement timeline based on official regulations",
      legalRetirement: "Legal Retirement Date",
      legalRetirementDesc: "Birth date + 65 years + 1 month",
      lifeExpectancy: "Life Expectancy",
      lifeExpectancyDesc: "Statistical data for your gender",
      theoreticalDeath: "Theoretical Death Date",
      theoreticalDeathDesc: "Used for financial projections",
      years: "years",
      continue: "Continue to Income"
    },

    // Retirement Benefits Page
    retirementBenefits: {
      title: "Retirement benefits and simulation age input",
      subtitle: "Select the retirement pillars that you will benefit from and how you plan to use them",
      helpButton: "Help me fill this page"
    },


    // Retirement Benefits Help Page
    retirementBenefitsHelp: {
      title: "Help me fill the benefit and simulation input page",
      subtitle: "Guidance on how to complete your retirement benefits information",
      content: "On this page you will input information about your known retirement benefits\n\nYou will also be asked at what age you wish to simulate the financial feasibility of your retirement\n\nLPP Pension plans have various rules on how the benefits are distributed. Some pension plans exclusively distribute pensions, some other capital and it is also common to propose a mix of both.\n\nOnce answering the distribution nature you will be prompted to input the necessary data that you should find in your pension plan statements.\n\nImportant notice: if you choose a mixed benefit type of your pension plan, be sure to fill in each capital and pension field, with the adjusted amount, due to the splitting.\n\ni.e if your projected LPP capital at age X is 1000000 and the projected pension at the same age is 50’000 (conversion rate of 5%) you will obviously need to adapt your benefits accordingly. Let’s say you wish to take 500000 in capital, you will input 25’000 as the yearly pension (500’000x5% conversion rate)"
    },

    // Income Page
    income: {
      title: "Current income sources",
      subtitle: "Enter your income sources and their details",
      name: "Name",
      amount: "Amount (CHF)",
      frequency: "Frequency",
      startDate: "Start Date",
      endDate: "End Date",
      actions: "Actions",
      addIncome: "Add Income Source",
      reset: "Reset to Defaults",
      continue: "Continue to Costs",
      monthly: "Monthly",
      yearly: "Yearly",
      oneTime: "Once",
      saveSuccess: "Income data saved",
      saveFailed: "Failed to save income data",
      resetSuccess: "Income reset to defaults",
      incomeDeleted: "Income source deleted",
      // Default income names
      salary: "Net Salary",
      avs: "AVS",
      lpp: "LPP",
      threea: "3a",
      "3a": "3a"
    },

    // Costs Page
    costs: {
      title: "Current expenses",
      subtitle: "Enter your monthly and yearly expenses",
      name: "Name",
      category: "Category",
      amount: "Amount (CHF)",
      frequency: "Frequency",
      startDate: "Start Date",
      endDate: "End Date",
      actions: "Actions",
      addCost: "Add Cost",
      reset: "Reset to Defaults",
      continue: "Continue to Financial Balance",
      saveSuccess: "Cost data saved",
      saveFailed: "Failed to save cost data",
      resetSuccess: "Costs reset to defaults",
      costDeleted: "Cost item deleted",
      selectCategory: "Select category",
      helpButton: "Help me fill this table",
      // Categories
      categories: {
        housing: "Housing",
        health: "Health",
        elementary: "Elementary",
        transport: "Transport",
        leisure: "Leisure",
        other: "Other",
        taxes: "Taxes"
      },
      // Default cost names (in English)
      costNames: {
        rentMortgage: "Rent/Mortgage",
        taxes: "Taxes",
        healthInsurance: "Health Insurance",
        food: "Food",
        clothing: "Clothing",
        privateTransport: "Private transportation",
        publicTransport: "Public transportation",
        tvInternetPhone: "TV/Internet/Phone",
        restaurants: "Restaurants",
        vacation: "Vacation"
      },
      // Help modal
      helpModal: {
        title: "Help me fill the table",
        intro: "These questions will prefill the amounts with approximate values. Review the values and adapt them to your best knowledge.",
        question1: "Do you own a car?",
        question2: "What are your vacation costs like?",
        question2_high: "High",
        question2_moderate: "Moderate",
        question2_low: "Low",
        question3: "Do you often go out or to the restaurant?",
        question4: "What are your food expenses like?",
        question4_high: "High",
        question4_moderate: "Moderate",
        question4_low: "Low",
        question5: "Do you have private health insurance?",
        question6: "Do you use public transportation?",
        question6_never: "Never",
        question6_sometimes: "Sometimes",
        question6_always: "Always",
        question7: "How often do you shop for clothing?",
        question7_veryOften: "Very often",
        question7_reasonably: "Reasonably",
        question7_rarely: "Rarely",
        question8: "How are your costs regarding TV, streaming, Phone, Internet?",
        question8_high: "High",
        question8_moderate: "Moderate",
        question8_low: "Low",
        yes: "Yes",
        no: "No",
        apply: "Apply",
        cancel: "Cancel"
      }
    },

    // Financial Balance Page
    financialBalance: {
      title: "Current financial balance",
      subtitle: "Your projected financial situation over time",
      balanceAtDeath: "Balance at Death",
      positive: "POSITIVE",
      negative: "NEGATIVE",
      balanceValue: "Balance Value at Death",
      projectionGraph: "Financial Projection Over Time",
      yearlyBreakdown: "Year-by-Year Financial Breakdown",
      incomeByCategory: "Income by Category",
      costsByCategory: "Costs by Category",
      year: "Year",
      income: "Income",
      costs: "Costs",
      annualBalance: "Annual Balance",
      cumulativeBalance: "Cumulative Balance",
      continue: "Continue to Retirement Inputs"
    },

    // Retirement Inputs Page
    retirementInputs: {
      title: "Retirement inputs",
      subtitle: "Define your savings and future financial events",
      continue: "Continue to Scenario Simulator",
      section1Title: "Legal Retirement",
      section2Title: "Pre-retirement Options",
      pensionPlanOption: "Pension plan offers pre-retirement option",
      earlyRetirementAgeQuestion: "At what age does your pension fund allow you to take early retirement?",
      selectAge: "Select age",
      yes: "Yes",
      no: "No",
      avs: "AVS",
      lppPension: "LPP Pension",
      lppCapital: "LPP Capital",
      threea: "3a",
      preRetirementOption: "year earlier ({age}yo)",
      lppPensionEarlier: "LPP Pension",
      lppCapitalEarlier: "LPP Capital",
      years: "years",
      saveSuccess: "Retirement data saved",
      saveFailed: "Failed to save retirement data"
    },

    // Assets and Savings Page
    assetsAndSavings: {
      title: "Assets and Savings",
      subtitle: "Define your liquid assets, non-liquid assets, and possible future income",
      continue: "Continue to Retirement Inputs"
    },

    // Scenario Page
    scenario: {
      title: "Retirement Scenario Simulator",
      subtitle: "Now add savings information, possible future inflows, transmission objective and set the projected retirement date. Run the simulator and see what happens!",
      wishedRetirement: "My Wished Retirement Date",
      legalRetirementDate: "Legal retirement date",
      month: "Month",
      year: "Year",
      removeMonth: "Move forward 1 month",
      removeYear: "Move forward 1 year",
      incomeSources: "Previous income inputs - can be adjusted for simulation",
      allDatesEditable: "All dates are editable to adjust your scenario",
      name: "Name",
      originalValue: "Original Value",
      adjustedValue: "Adjusted Value",
      frequency: "Frequency",
      frequencyMonthly: "Monthly",
      frequencyYearly: "Yearly",
      frequencyOneTime: "Once",
      startDate: "Start Date",
      endDate: "End Date",
      oneTime: "Once",
      costs: "Previous cost inputs - can be adjusted for simulation",
      costsDescription: "Split costs are grouped together. End date changes auto-sync with linked start dates.",
      actions: "Actions",
      split: "split",
      savings: "Savings",
      liquidAssets: "Liquid Assets (CHF)",
      nonLiquidAssets: "Non-Liquid Assets (CHF)",
      transmission: "Transmission",
      transmissionDesc: "Amount you wish to leave to heirs at end of life. This will be deducted from your final balance.",
      amountToTransmit: "Amount to Transmit (CHF)",
      transmissionWarning: "If your balance after transmission goes negative, you cannot quit!",
      runSimulation: "Can I Quit? - Run Simulation",
      costTuningAdvice: "Give me cost tuning advice",
      splitSuccess: "Cost line split - adjust dates as needed",
      costDeleted: "Cost line deleted",
      // Future inflows
      futureInflows: "Possible Future Inflows",
      futureInflowsDesc: "Add expected future inflows like inheritance or other one-time income. These will be added to your balance on the specified date.",
      inflowType: "Inflow Type",
      inflowAmount: "Amount (CHF)",
      inflowDate: "Date",
      inheritance: "Inheritance",
      other: "Other",
      addInflow: "Add Inflow"
    },

    // Result Page
    result: {
      title: "Scenario verdict",
      subtitle: "Based on your financial data and retirement timeline, here is our assessment:",
      yesCanQuit: "YES YOU CAN! QUIT!",
      noCannotQuit: "NO YOU CANNOT QUIT YET!",
      projectedBalance: "Projected balance at end of life:",
      annualBalance: "Your annual balance:",
      transmissionPlanned: "Transmission/Inheritance Planned",
      balanceBeforeTransmission: "Balance before transmission",
      amountToTransmit: "Amount to transmit",
      basedOnRetirement: "Based on retirement date",
      positiveMessage: "Your projected balance is positive! You have the financial foundation to consider retirement.",
      negativeMessage: "Your projected balance is negative. Consider adjusting your financial plan or retirement date before making the leap.",
      projectionGraph: "Financial Projection Over Time",
      yearlyBreakdown: "Year-by-Year Financial Breakdown",
      year: "Year",
      income: "Income",
      costs: "Costs",
      annualBalance: "Annual Balance",
      cumulativeBalance: "Cumulative Balance",
      reviewData: "Review My Data",
      startOver: "Start Over",
      missingDataWarning: "Warning: key data is missing to compute a simulation, please complete missing information on {pages} before rerunning an accurate simulation",
      helpMonteCarloLink: "Help on Monte-Carlo",
      monteCarloHelpTitle: "Monte-Carlo Simulations Explanations"
    },

    // Navigation
    nav: {
      back: "Back",
      home: "Home",
      logout: "Logout"
    },

    // Common
    common: {
      back: "Back",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      delete: "Delete",
      edit: "Edit",
      chf: "CHF"
    },

    // Language selector
    language: {
      select: "Language",
      english: "English",
      french: "Français"
    },

    // Data Privacy
    dataPrivacy: {
      title: "Information about the use of your data",
      popupTitle: "Data Privacy & Security",
      line1: "All your data is encrypted locally in your browser using AES-256 encryption",
      line2: "Your password is the only key - we cannot access or recover your data",
      line3: "No personal financial data is sent to our servers",
      line4: "Only your email is stored for authentication purposes",
      line5: "You can delete all your data at any time by clearing browser storage"
    },

    // Cost names
    costNames: {
      rentMortgage: "Rent/Mortgage",
      taxes: "Taxes",
      healthInsurance: "Health Insurance",
      food: "Food",
      clothing: "Clothing",
      privateTransport: "Private Transportation",
      publicTransport: "Public Transportation",
      tvInternetPhone: "TV/Internet/Phone",
      restaurants: "Restaurants",
      vacation: "Vacation"
    },

    // PDF Report
    pdf: {
      generating: "PDF is generating...",
      generateReport: "Generate PDF Report",
      title: "Retirement Simulation Report",
      personalInfo: "Personal Information",
      retirementOverview: "Retirement Overview",
      scenarioSimulator: "Scenario Simulator",
      verdict: "Verdict",
      yearByYearAnnex: "Year-by-Year Financial Details"
    },

    // Real Estate Calculator
    realEstate: {
      title: "Lodging expenses calculator",
      subtitle: "Detailed breakdown of your mortgage, property value, and maintenance costs.",
      mortgageDetails: "Mortgage Details",
      marketValue: "Property Market Value",
      maintenance: "Maintenance & Other Costs",
      name: "Name",
      amount: "Amount",
      maturityDate: "Maturity Date",
      rate: "Rate (%)",
      yearlyCost: "Yearly Cost",
      estimatedValue: "Estimated Value",
      frequency: "Frequency",
      total: "Total",
      totalMarketValue: "Total Market Value",
      addLine: "Add Line",
      monthly: "Monthly",
      yearly: "Yearly",
      totalCostsYearly: "Total Costs (Yearly)",
      totalCostsMonthly: "Total Costs (Monthly)",
      netAssetValue: "Net Housing Asset Value",
      carriedToCosts: "Carried to Costs Page",
      cancel: "Cancel",
      applySave: "Apply & Save",
      carriedToAssets: "Carried to Assets",

      // Lodging Situation
      lodgingSituation: "Lodging situation",
      owner: "Owner",
      tenant: "Tenant",
      howManyProperties: "How many properties?",
      rent: "Rent",
      rentAmount: "Rent Amount",
      rentExplanation: "Monthly rent including charges",

      defaultMortgageName: "Primary Mortgage",
      defaultPropertyName: "Main Property",
      defaultMaintenance: {
        heating: "Heating",
        electricity: "Electricity",
        contentInsurance: "Content insurance",
        buildingInsurance: "Building insurance",
        fireInsurance: "Fire insurance",
        otherInsurance: "Other insurances",
        propertyTax: "Property tax",
        buildingMaintenance: "Building maintenance",
        gardenMaintenance: "Garden maintenance",
        renovation: "Renovation fund"
      },
      defaultTenant: {
        utilities: "Utilities charges",
        parking: "Parking",
        electricity: "Electricity",
        contentInsurance: "Content insurance",
        otherInsurance: "Other insurances"
      },
      resetDefaults: "Reset to defaults",
      resetDefaultsSuccess: "Defaults restored. Please click 'Apply & Save' to persist changes.",
      property: "Property"
    }
  },

  fr: {

    // Landing Page
    landing: {
      title: "quit?",
      subtitle: "Une retraite anticipée? C'est possible?",
      description: "Un outil complet de planification de retraite qui analyse vos revenus, dépenses et épargne pour déterminer si vous pouvez quitter votre emploi et prendre une retraite anticipée.",
      learnMore: "En savoir plus avant de créer un compte",
      createAccount: "Créer un compte",
      login: "Connexion",
      features: {
        title: "Ce que nous analysons",
        income: "Sources de revenus",
        incomeDesc: "Salaire, AVS, LPP, 3a et revenus personnalisés",
        costs: "Coûts de la vie",
        costsDesc: "Logement, santé, transport, loisirs et plus",
        simulation: "Simulation de scénarios",
        simulationDesc: "Ajustez la date de retraite et voyez les projections"
      }
    },

    // Information Page
    infoPage: {
      title: "Can I quit? C'est quoi?",
      titleSuffix: "C'est quoi?",
      subtitle: "Un assistant complet pour planifier votre retraite",
      backToHome: "Retour à l'accueil",
      step1Title: "Informations personnelles",
      step1Desc: "Commencez par entrer votre date de naissance et votre genre.",
      step2Title: "Retraite et espérance de vie",
      step2Desc: "Visualisez votre date de retraite légale et votre espérance de vie basée sur des données statistiques.",
      step3Title: "Sources de revenus",
      step3Desc: "Saisissez vos sources de revenus : Salaire Net et tout autre revenu personnalisé. Spécifiez les montants, les fréquences et les périodes de versements pour chaque source.",
      step4Title: "Dépenses",
      step4Desc: "Listez vos dépenses par catégorie : Logement, Impôts, Assurance Maladie, Alimentation, Transport, Loisirs, etc. Utilisez l'assistant pour estimer les coûts selon votre style de vie.",
      step4SpinOffTitle: "Dépenses de Logement",
      step4SpinOffDesc: "Cette option permet d'estimer en détail vos dépenses d'habitation que vous soyez locataire ou propriétaire.",
      step5Title: "Actifs et épargne",
      step5Desc: "Saisissez vos actifs liquides et non-liquides, vos rentrées futures possibles (héritage, etc).",
      step6Title: "Données de prévoyance et choix du modèle de simulation",
      step6Desc: "Saisissez vos données AVS, LPP et 3a. Précisez les montants, les fréquences et les dates pour chaque source.",
      step7Title: "Revue des données avant simulation",
      step7Desc: "Ajustez vos revenus et de coûts avant de lancer la simulation de long terme à l'aide de l'assistant qui vous suggèrera des ajustements liés au viellissement. Renseignez des paliers de revenus ou de coûts qui évoluent au cours du temps.",
      step7SpinOffTitle: "Gestion des actifs liquides (option avancée)",
      step7SpinOffDesc: "Cette option permet de définir les stratégies d'investissement de vos actifs et de configurer leurs hypothèses de rendement.",
      step8Title: "Verdict du scénario choisi",
      step8Desc: "Obtenez votre verdict personnalisé : Pouvez-vous prendre une retraite anticipée ? Visualisez votre solde final projeté, téléchargez un rapport PDF complet et prenez des décisions éclairées.",
      securityTitle: "Votre confidentialité est garantie",
      securityDesc: "Vos données financières ne quittent jamais votre appareil. Tous les calculs sont effectués localement, et vos données sont chiffrées AES-256. Nous ne pouvons pas accéder à vos données.",
      ctaTitle: "Prêt à planifier votre retraite ?",
      ctaButton: "Créer votre compte gratuit",
      ctaBadge: "Prêt à découvrir votre chiffre ?",
      ctaMainTitle: "Commencez votre planification aujourd'hui.",
      ctaFooter: "Gratuit • Pas de carte de crédit requise • Sécurisé",
      step: "ÉTAPE",
      securityModal: {
        button: "En savoir plus sur la sécurité",
        title: "La sécurité de vos données est notre priorité",
        architecture: "Comment nous protégeons vos informations",
        localEncryptionTitle: "Chiffrement local de niveau bancaire",
        localEncryptionDesc: "Contrairement aux applications web classiques, vos données financières ne quittent jamais votre appareil sans être chiffrées ici-même, dans votre navigateur (AES-256). Nous ne pouvons techniquement pas voir votre vie financière.",
        masterKeyTitle: "Le Problème & Notre Solution",
        masterKeyDesc: "Généralement, les applications locales sécurisées perdent vos données si vous oubliez votre mot de passe. Nous avons résolu cela en créant un 'Pont Numérique' : une clé unique stockée dans un coffre séparé qui ne s'ouvre que si vous validez votre identité.",
        passwordResetTitle: "Aucune Perte de Données Garantie",
        passwordResetDesc: "Cette séparation intelligente signifie que même en cas d'oubli de mot de passe, nous pouvons vous aider à récupérer l'accès via email sans jamais compromettre ces garanties de confidentialité.",
        privacyTitle: "Vos données vous appartiennent",
        privacyDesc: "Garder le contrôle. Vous pouvez exporter vos données chiffrées dans un fichier de sauvegarde à tout moment, ou les restaurer sur un nouvel appareil. Vos données sont votre propriété, pas la notre."
      },
      spinOff: "EXTENSION"
    },

    // Auth Modal
    auth: {
      createAccount: "Créer un compte",
      login: "Connexion",
      email: "Email",
      emailPlaceholder: "votre@email.com",
      password: "Mot de passe",
      passwordPlaceholder: "Entrez votre mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      confirmPasswordPlaceholder: "Confirmez votre mot de passe",
      createBtn: "Créer le compte",
      loginBtn: "Se connecter",
      switchToLogin: "Déjà un compte ? Connectez-vous",
      switchToRegister: "Besoin d'un compte ? Inscrivez-vous",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      registrationSuccess: "Compte créé avec succès !",
      loginSuccess: "Connexion réussie !",
      registrationFailed: "Échec de l'inscription",
      loginFailed: "Échec de la connexion",
      checkEmail: "Veuillez vérifier votre email pour confirmer votre compte.",
      verificationSuccess: "Email vérifié ! Vous pouvez maintenant vous connecter.",
      verificationFailed: "Lien de vérification invalide ou expiré.",
      verifying: "Vérification de votre email...",
      forgotPassword: "Mot de passe oublié ?"
    },

    // Personal Info Page
    personalInfo: {
      title: "Informations personnelles",
      subtitle: "Parlez-nous de vous pour calculer votre calendrier de retraite",
      analysisType: "Je souhaite analyser",
      individualSituation: "ma situation individuelle",
      coupleSituation: "ma situation de couple (double saisie nécessaire)",
      comingSoonTitle: "Fonctionnalité à venir",
      comingSoonMessage: "La fonctionnalité d'analyse de couple est actuellement en développement. Revenez plus tard!",
      birthDate: "Date de naissance",
      gender: "Genre",
      male: "Masculin",
      female: "Féminin",
      country: "Pays",
      switzerland: "Suisse",
      france: "France",
      continue: "Continuer",
      saving: "Enregistrement...",
      saveSuccess: "Informations personnelles enregistrées",
      saveFailed: "Échec de l'enregistrement des informations personnelles",
      firstName: "Prénom",
      firstNamePlaceholder: "saisie optionnelle"
    },

    // Retirement Overview Page
    retirementOverview: {
      title: "Retraite et espérance de vie",
      subtitle: "Votre calendrier de retraite basé sur les réglementations officielles",
      legalRetirement: "Date de retraite légale",
      legalRetirementDesc: "Date de naissance + 65 ans + 1 mois",
      lifeExpectancy: "Espérance de vie",
      lifeExpectancyDesc: "Données statistiques pour votre genre",
      theoreticalDeath: "Date de décès théorique",
      theoreticalDeathDesc: "Utilisée pour les projections financières",
      years: "ans",
      continue: "Continuer vers les revenus"
    },
    // Retirement Benefits Page
    retirementBenefits: {
      title: "Prestations de retraite et âge de simulation",
      subtitle: "Sélectionnez les piliers de retraite dont vous bénéficierez et comment vous prévoyez de les utiliser",
      helpButton: "Aidez-moi à remplir cette page"
    },

    // Retirement Benefits Help Page
    retirementBenefitsHelp: {
      title: "Aidez-moi à remplir la page des prestations et simulation",
      subtitle: "Guide pour compléter vos informations de retraite",
      content: "Sur cette page, vous allez saisir les informations concernant vos prestations de retraite connues.\n\nIl vous sera également demandé à quel âge vous souhaitez simuler la faisabilité financière de votre retraite.\n\nLes plans de prévoyance LPP ont diverses règles sur la manière dont les prestations sont distribuées. Certains plans distribuent exclusivement des rentes, d'autres du capital, et il est également courant de proposer un mélange des deux.\n\nUne fois que vous aurez répondu à la nature de la distribution, vous serez invité à saisir les données nécessaires que vous devriez trouver dans vos certificats de caisse de pension.\n\nAvis important : si vous choisissez un type de prestation mixte pour votre plan de prévoyance, veillez à remplir chaque champ de capital et de rente, avec le montant ajusté, en raison de la répartition.\n\nPar exemple, si votre capital LPP projeté à l'âge X est de 1 000 000 et que la rente projetée au même âge est de 50 000 (taux de conversion de 5 %), vous devrez évidemment adapter vos prestations en conséquence. Disons que vous souhaitez retirer 500 000 en capital, vous saisirez 25 000 comme rente annuelle (taux de conversion de 500 000 x 5 %)."
    },

    // Income Page
    income: {
      title: "Sources de revenus actuels",
      subtitle: "Entrez vos sources de revenus et leurs détails",
      name: "Nom",
      amount: "Montant (CHF)",
      frequency: "Fréquence",
      startDate: "Date de début",
      endDate: "Date de fin",
      actions: "Actions",
      addIncome: "Ajouter une source de revenu",
      reset: "Réinitialiser",
      continue: "Continuer vers les dépenses",
      monthly: "Mensuel",
      yearly: "Annuel",
      oneTime: "Unique",
      saveSuccess: "Données de revenus enregistrées",
      saveFailed: "Échec de l'enregistrement des revenus",
      resetSuccess: "Revenus réinitialisés",
      incomeDeleted: "Source de revenu supprimée",
      // Default income names
      salary: "Salaire Net",
      avs: "AVS",
      lpp: "LPP",
      threea: "3a",
      "3a": "3a"
    },

    // Costs Page
    costs: {
      title: "Dépenses actuelles",
      subtitle: "Entrez vos dépenses mensuelles et annuelles",
      name: "Nom",
      category: "Catégorie",
      amount: "Montant (CHF)",
      frequency: "Fréquence",
      startDate: "Date de début",
      endDate: "Date de fin",
      actions: "Actions",
      addCost: "Ajouter une dépense",
      reset: "Réinitialiser",
      continue: "Continuer vers le bilan financier",
      saveSuccess: "Données de dépenses enregistrées",
      saveFailed: "Échec de l'enregistrement des dépenses",
      resetSuccess: "Dépenses réinitialisées",
      costDeleted: "Dépense supprimée",
      selectCategory: "Sélectionner une catégorie",
      helpButton: "Aide moi à remplir cette table",
      // Categories
      categories: {
        housing: "Logement",
        health: "Santé",
        elementary: "Élémentaire",
        transport: "Transport",
        leisure: "Loisirs",
        other: "Autre",
        taxes: "Impôts"
      },
      // Default cost names (in French)
      costNames: {
        rentMortgage: "Loyer/Hypothèque",
        taxes: "Impôts",
        healthInsurance: "Assurance maladie",
        food: "Alimentation",
        clothing: "Vêtements",
        privateTransport: "Transport privé",
        publicTransport: "Transport public",
        tvInternetPhone: "TV/Internet/Téléphone",
        restaurants: "Restaurants",
        vacation: "Vacances"
      },
      // Help modal
      helpModal: {
        title: "Aide pour remplir la table",
        intro: "Ces questions pré-rempliront les montants avec des valeurs approximatives. Vérifiez les valeurs et adaptez-les selon vos connaissances.",
        question1: "Possédez-vous une voiture ?",
        question2: "Comment sont vos coûts de vacances ?",
        question2_high: "Élevés",
        question2_moderate: "Modérés",
        question2_low: "Bas",
        question3: "Sortez-vous souvent ou allez-vous au restaurant ?",
        question4: "Comment sont vos dépenses alimentaires ?",
        question4_high: "Élevées",
        question4_moderate: "Modérées",
        question4_low: "Basses",
        question5: "Avez-vous une assurance maladie privée ?",
        question6: "Utilisez-vous les transports publics ?",
        question6_never: "Jamais",
        question6_sometimes: "Parfois",
        question6_always: "Toujours",
        question7: "À quelle fréquence achetez-vous des vêtements ?",
        question7_veryOften: "Très souvent",
        question7_reasonably: "Raisonnablement",
        question7_rarely: "Rarement",
        question8: "Vos coûts TV, streaming, Téléphone, Internet sont ?",
        question8_high: "Élevés",
        question8_moderate: "Modérés",
        question8_low: "Faibles",
        yes: "Oui",
        no: "Non",
        apply: "Appliquer",
        cancel: "Annuler"
      }
    },

    // Financial Balance Page
    financialBalance: {
      title: "Bilan financier actuel",
      subtitle: "Votre situation financière projetée dans le temps",
      balanceAtDeath: "Solde au décès",
      positive: "POSITIF",
      negative: "NÉGATIF",
      balanceValue: "Valeur du solde au décès",
      projectionGraph: "Projection financière dans le temps",
      yearlyBreakdown: "Détail financier année par année",
      incomeByCategory: "Revenus par catégorie",
      costsByCategory: "Dépenses par catégorie",
      year: "Année",
      income: "Revenus",
      costs: "Dépenses",
      annualBalance: "Solde annuel",
      cumulativeBalance: "Solde cumulé",
      continue: "Continuer vers les paramètres de retraite"
    },

    // Retirement Inputs Page
    retirementInputs: {
      title: "Paramètres de retraite",
      subtitle: "Saisissez les informations relatives aux 3 piliers de prévoyance",
      continue: "Continuer vers le simulateur de scénarios",
      section1Title: "Retraite Légale",
      section2Title: "Options de pré-retraite",
      pensionPlanOption: "La caisse de pension offre une option de pré-retraite",
      earlyRetirementAgeQuestion: "A quel âge votre caisse de pension vous permet-elle de prendre une retraite anticipée?",
      selectAge: "Sélectionner l'âge",
      yes: "Oui",
      no: "Non",
      avs: "AVS",
      lppPension: "Pension LPP projeté à l'âge de 65ans",
      lppCapital: "Capital LPP projeté à l'âge de 65ans",
      threea: "3a",
      preRetirementOption: "an plus tôt ({age}ans)",
      lppPensionEarlier: "Pension LPP",
      lppCapitalEarlier: "Capital LPP",
      years: "ans",
      saveSuccess: "Données de retraite enregistrées",
      saveFailed: "Échec de l'enregistrement"
    },

    // Assets and Savings Page
    assetsAndSavings: {
      title: "Actifs et épargne",
      subtitle: "Définissez vos actifs liquides, non-liquides et revenus futurs possibles",
      continue: "Continuer vers les paramètres de retraite"
    },

    // Scenario Page
    scenario: {
      title: "Simulateur de scénarios de retraite",
      subtitle: "Ajoutez maintenant les informations d'épargne, les entrées futures possibles, l'objectif de transmission et définissez la date de retraite projetée. Lancez le simulateur et voyez ce qui se passe !",
      wishedRetirement: "Ma date de retraite souhaitée",
      legalRetirementDate: "Date de retraite légale",
      month: "Mois",
      year: "Année",
      removeMonth: "Avancer d'un mois",
      removeYear: "Avancer d'une année",
      incomeSources: "Revenus précédents - peuvent être ajustés pour la simulation",
      allDatesEditable: "Toutes les dates sont modifiables pour ajuster votre scénario",
      name: "Nom",
      originalValue: "Valeur originale",
      adjustedValue: "Valeur ajustée",
      frequency: "Fréquence",
      frequencyMonthly: "Mensuel",
      frequencyYearly: "Annuel",
      frequencyOneTime: "Unique",
      startDate: "Date de début",
      endDate: "Date de fin",
      oneTime: "Unique",
      costs: "Dépenses précédentes - peuvent être ajustées pour la simulation",
      costsDescription: "Les dépenses divisées sont regroupées. Les changements de date de fin se synchronisent automatiquement avec les dates de début liées.",
      actions: "Actions",
      split: "divisé",
      savings: "Épargne",
      liquidAssets: "Actifs liquides (CHF)",
      nonLiquidAssets: "Actifs non liquides (CHF)",
      transmission: "Transmission",
      transmissionDesc: "Montant que vous souhaitez léguer à vos héritiers en fin de vie. Ce montant sera déduit de votre solde final.",
      amountToTransmit: "Montant à transmettre (CHF)",
      transmissionWarning: "Si votre solde après transmission devient négatif, vous ne pouvez pas partir !",
      runSimulation: "Puis-je partir ? - Lancer la simulation",
      costTuningAdvice: "Suggère moi des ajustement pertinents",
      splitSuccess: "Ligne de dépense divisée - ajustez les dates si nécessaire",
      costDeleted: "Ligne de dépense supprimée",
      // Future inflows
      futureInflows: "Entrées futures possibles",
      futureInflowsDesc: "Ajoutez les entrées futures attendues comme un héritage ou d'autres revenus ponctuels. Ceux-ci seront ajoutés à votre solde à la date spécifiée.",
      inflowType: "Type d'entrée",
      inflowAmount: "Montant (CHF)",
      inflowDate: "Date",
      inheritance: "Héritage",
      other: "Autre",
      addInflow: "Ajouter une entrée"
    },

    // Result Page
    result: {
      title: "Verdict du scénario",
      subtitle: "Basé sur vos données financières et votre calendrier de retraite, voici notre évaluation :",
      yesCanQuit: "OUI VOUS POUVEZ ! PARTEZ !",
      noCannotQuit: "NON VOUS NE POUVEZ PAS ENCORE PARTIR !",
      projectedBalance: "Solde projeté en fin de vie :",
      annualBalance: "Votre solde annuel :",
      transmissionPlanned: "Transmission/Héritage prévu",
      balanceBeforeTransmission: "Solde avant transmission",
      amountToTransmit: "Montant à transmettre",
      basedOnRetirement: "Basé sur la date de retraite",
      positiveMessage: "Votre solde projeté est positif ! Vous avez les bases financières pour envisager la retraite.",
      negativeMessage: "Votre solde projeté est négatif. Envisagez d'ajuster votre plan financier ou votre date de retraite avant de faire le grand saut.",
      projectionGraph: "Projection financière dans le temps",
      yearlyBreakdown: "Détail financier année par année",
      year: "Année",
      income: "Revenus",
      costs: "Dépenses",
      annualBalance: "Solde annuel",
      cumulativeBalance: "Solde cumulé",
      reviewData: "Revoir mes données",
      startOver: "Recommencer",
      missingDataWarning: "Attention : des données clés manquent pour calculer une simulation, veuillez compléter les informations manquantes sur {pages} avant de relancer une simulation précise",
      helpMonteCarloLink: "Aide sur Monte-Carlo",
      monteCarloHelpTitle: "Explications des simulations Monte-Carlo"
    },

    // Navigation
    nav: {
      back: "Retour",
      home: "Accueil",
      logout: "Déconnexion"
    },

    // Common
    common: {
      back: "Retour",
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      save: "Enregistrer",
      cancel: "Annuler",
      close: "Fermer",
      delete: "Supprimer",
      edit: "Modifier",
      chf: "CHF"
    },

    // Language selector
    language: {
      select: "Langue",
      english: "English",
      french: "Français"
    },

    // Data Privacy
    dataPrivacy: {
      title: "Informations sur l'utilisation de vos données",
      popupTitle: "Confidentialité et Sécurité des Données",
      line1: "Toutes vos données sont chiffrées localement dans votre navigateur avec un chiffrement AES-256",
      line2: "Votre mot de passe est la seule clé - nous ne pouvons pas accéder ou récupérer vos données",
      line3: "Aucune donnée financière personnelle n'est envoyée à nos serveurs",
      line4: "Seul votre email est stocké à des fins d'authentification",
      line5: "Vous pouvez supprimer toutes vos données à tout moment en effaçant le stockage du navigateur"
    },

    // Cost names
    costNames: {
      rentMortgage: "Loyer/Hypothèque",
      taxes: "Impôts",
      healthInsurance: "Assurance Maladie",
      food: "Alimentation",
      clothing: "Vêtements",
      privateTransport: "Transport Privé",
      publicTransport: "Transport Public",
      tvInternetPhone: "TV/Internet/Téléphone",
      restaurants: "Restaurants",
      vacation: "Vacances"
    },

    // PDF Report
    pdf: {
      generating: "Génération du PDF en cours...",
      generateReport: "Générer le rapport PDF",
      title: "Rapport de Simulation de Retraite",
      personalInfo: "Informations Personnelles",
      retirementOverview: "Aperçu de la Retraite",
      scenarioSimulator: "Simulateur de Scénarios",
      verdict: "Verdict",
      yearByYearAnnex: "Détails Financiers Année par Année"
    },
    // Real Estate Calculator
    realEstate: {
      title: "Calculateur de frais de logement",
      subtitle: "Détail de votre hypothèque, valeur immobilière et frais d'entretien.",
      mortgageDetails: "Détails de l'Hypothèque",
      marketValue: "Valeur Vénale du Bien",
      maintenance: "Entretien et Frais Annexes",
      name: "Nom",
      amount: "Montant",
      maturityDate: "Date d'Échéance",
      rate: "Taux (%)",
      yearlyCost: "Coût Annuel",
      estimatedValue: "Valeur Estimée",
      frequency: "Fréquence",
      total: "Total",
      totalMarketValue: "Valeur Totale",
      addLine: "Ajouter une ligne",
      monthly: "Mensuel",
      yearly: "Annuel",
      totalCostsYearly: "Coût Total (Annuel)",
      totalCostsMonthly: "Coût Total (Mensuel)",
      netAssetValue: "Valeur Nette du Bien",
      carriedToCosts: "Reporté sur la page Coûts",
      carriedToAssets: "Reporté sur la page Actifs",
      cancel: "Annuler",
      applySave: "Appliquer & Sauvegarder",
      saving: "Enregistrement...",
      // Lodging Situation
      lodgingSituation: "Situation de logement",
      owner: "Propriétaire",
      tenant: "Locataire",
      howManyProperties: "Combien de propriétés ?",
      rent: "Loyer",
      rentAmount: "Montant du loyer",
      rentExplanation: "Loyer mensuel charges comprises",
      defaultMortgageName: "Hypothèque principale",
      defaultPropertyName: "Propriété principale",
      defaultMaintenance: {
        heating: "Chauffage",
        electricity: "Électricité",
        contentInsurance: "Assurance ménage",
        buildingInsurance: "Assurance bâtiment",
        fireInsurance: "Assurance incendie",
        otherInsurance: "Autres assurances",
        propertyTax: "Taxe foncière",
        buildingMaintenance: "Entretien immeuble",
        gardenMaintenance: "Entretien jardin",
        renovation: "Fonds de rénovation"
      },
      defaultTenant: {
        utilities: "Charges",
        parking: "Parking",
        electricity: "Électricité",
        contentInsurance: "Assurance ménage",
        otherInsurance: "Autres assurances"
      },
      resetDefaults: "Réinitialiser aux valeurs par défaut",
      resetDefaultsSuccess: "Valeurs par défaut restaurées. Veuillez cliquer sur 'Appliquer & Sauvegarder'.",
      property: "Propriété"
    }
  }
};

export default translations;
