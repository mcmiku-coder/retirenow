// Translations for English and French
export const translations = {
  en: {
    // Landing Page
    landing: {
      title: "quit?",
      subtitle: "Discover if you can financially afford early retirement",
      description: "A comprehensive retirement planning tool that analyzes your income, costs, and savings to determine if you can quit your job and retire early.",
      learnMore: "Learn more about the solution before creating your account",
      createAccount: "Create Account",
      login: "Login",
      securityWarning: "Important: Your password is the only key to your data. We cannot recover it if lost.",
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
      title: "How quit? Works",
      subtitle: "A complete guide to your retirement planning journey",
      backToHome: "Back to Home",
      step1Title: "1. Personal Information",
      step1Desc: "Start by entering your birth date, gender, and country of residence. This information is used to calculate your legal retirement age and life expectancy based on official Swiss statistics.",
      step2Title: "2. Retirement Overview",
      step2Desc: "See your legal retirement date (65 years + 1 month), your life expectancy, and your theoretical end date. All calculations are performed locally in your browser - no data is sent to our servers.",
      step3Title: "3. Income Sources",
      step3Desc: "Enter all your income sources: Net Salary, AVS (Swiss social security), LPP (occupational pension), 3a (private pension), and any custom income. Specify amounts, frequencies, and date ranges for each source.",
      step4Title: "4. Life Costs",
      step4Desc: "List your monthly and yearly expenses across categories: Housing, Taxes, Health Insurance, Food, Transport, Leisure, and more. Use our 'Help me fill this table' feature to quickly estimate typical costs based on your lifestyle.",
      step5Title: "5. Financial Balance",
      step5Desc: "View your projected financial balance over time with interactive charts. See year-by-year breakdowns of income vs. costs, and understand if your current trajectory leads to a positive or negative balance.",
      step6Title: "6. Scenario Simulator",
      step6Desc: "The heart of quit? - Adjust your wished retirement date, modify income and cost projections, add savings and future inflows (inheritance, etc.), and set a transmission amount for your heirs.",
      step7Title: "7. Your Verdict",
      step7Desc: "Get your personalized verdict: Can you quit? See your final projected balance, download a comprehensive PDF report, and make informed decisions about your retirement timeline.",
      securityTitle: "Zero-Knowledge Security",
      securityDesc: "Your financial data never leaves your device. All calculations happen locally, and your data is encrypted with AES-256 encryption using your password as the only key. We cannot access or recover your data - your privacy is guaranteed.",
      ctaTitle: "Ready to plan your retirement?",
      ctaButton: "Create Your Free Account"
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
      loginFailed: "Login failed"
    },

    // Personal Info Page
    personalInfo: {
      title: "Personal Information",
      subtitle: "Tell us about yourself to calculate your retirement timeline",
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
      saveFailed: "Failed to save personal information"
    },

    // Retirement Overview Page
    retirementOverview: {
      title: "Retirement Overview",
      subtitle: "Your retirement timeline based on official regulations",
      legalRetirement: "Legal Retirement Date",
      legalRetirementDesc: "Based on your birth date + 65 years + 1 month",
      lifeExpectancy: "Life Expectancy",
      lifeExpectancyDesc: "Based on statistical data for your gender",
      theoreticalDeath: "Theoretical End Date",
      theoreticalDeathDesc: "Used for financial projections",
      years: "years",
      continue: "Continue to Income"
    },

    // Income Page
    income: {
      title: "Income Overview",
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
      oneTime: "One-time",
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
      title: "Cost Overview",
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
        question1: "Do you own a car?",
        question2: "Do you spend a lot on vacation?",
        question3: "Do you often go out or to the restaurant?",
        question4: "Do you pay attention to buying quality food?",
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
      title: "Financial Balance Overview",
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
      continue: "Continue to Scenario Simulator"
    },

    // Scenario Page
    scenario: {
      title: "Retirement Scenario Simulator",
      subtitle: "Adjust your retirement date and values to see if you can quit early!",
      wishedRetirement: "My Wished Retirement Date",
      legalRetirementDate: "Legal retirement date",
      month: "Month",
      year: "Year",
      removeMonth: "Move forward 1 month",
      removeYear: "Move forward 1 year",
      incomeSources: "Income Sources",
      allDatesEditable: "All dates are editable to adjust your scenario",
      name: "Name",
      originalValue: "Original Value",
      adjustedValue: "Adjusted Value",
      frequency: "Frequency",
      frequencyMonthly: "Monthly",
      frequencyYearly: "Yearly",
      frequencyOneTime: "One-time",
      startDate: "Start Date",
      endDate: "End Date",
      oneTime: "One-time",
      costs: "Costs",
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
      title: "Your Retirement Verdict",
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
      startOver: "Start Over"
    },

    // Navigation
    nav: {
      back: "Back",
      home: "Home",
      logout: "Logout"
    },

    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      save: "Save",
      cancel: "Cancel",
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
    }
  },

  fr: {
    // Landing Page
    landing: {
      title: "quit?",
      subtitle: "Découvrez si vous pouvez vous permettre financièrement une retraite anticipée",
      description: "Un outil complet de planification de retraite qui analyse vos revenus, dépenses et épargne pour déterminer si vous pouvez quitter votre emploi et prendre une retraite anticipée.",
      learnMore: "Vous voulez en savoir plus sur la solution avant de créer un compte ?",
      createAccount: "Créer un compte",
      login: "Connexion",
      securityWarning: "Important : Votre mot de passe est la seule clé de vos données. Nous ne pouvons pas le récupérer en cas de perte.",
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
      title: "Comment fonctionne quit?",
      subtitle: "Un guide complet pour votre planification de retraite",
      backToHome: "Retour à l'accueil",
      step1Title: "1. Informations personnelles",
      step1Desc: "Commencez par entrer votre date de naissance, votre genre et votre pays de résidence. Ces informations sont utilisées pour calculer votre âge légal de retraite et votre espérance de vie selon les statistiques officielles suisses.",
      step2Title: "2. Aperçu de la retraite",
      step2Desc: "Visualisez votre date de retraite légale (65 ans + 1 mois), votre espérance de vie et votre date de fin théorique. Tous les calculs sont effectués localement dans votre navigateur - aucune donnée n'est envoyée à nos serveurs.",
      step3Title: "3. Sources de revenus",
      step3Desc: "Entrez toutes vos sources de revenus : Salaire Net, AVS (assurance sociale suisse), LPP (prévoyance professionnelle), 3a (prévoyance privée) et tout revenu personnalisé. Spécifiez les montants, fréquences et périodes pour chaque source.",
      step4Title: "4. Coûts de la vie",
      step4Desc: "Listez vos dépenses mensuelles et annuelles par catégories : Logement, Impôts, Assurance Maladie, Alimentation, Transport, Loisirs, et plus. Utilisez notre fonction 'Aide pour remplir ce tableau' pour estimer rapidement les coûts typiques selon votre style de vie.",
      step5Title: "5. Bilan financier",
      step5Desc: "Visualisez votre projection financière dans le temps avec des graphiques interactifs. Consultez les détails année par année des revenus vs dépenses et comprenez si votre trajectoire actuelle mène à un solde positif ou négatif.",
      step6Title: "6. Simulateur de scénarios",
      step6Desc: "Le cœur de quit? - Ajustez votre date de retraite souhaitée, modifiez les projections de revenus et de coûts, ajoutez épargne et entrées futures (héritage, etc.), et définissez un montant de transmission pour vos héritiers.",
      step7Title: "7. Votre verdict",
      step7Desc: "Obtenez votre verdict personnalisé : Pouvez-vous partir ? Visualisez votre solde final projeté, téléchargez un rapport PDF complet et prenez des décisions éclairées sur votre calendrier de retraite.",
      securityTitle: "Sécurité Zero-Knowledge",
      securityDesc: "Vos données financières ne quittent jamais votre appareil. Tous les calculs sont effectués localement, et vos données sont chiffrées avec un chiffrement AES-256 utilisant votre mot de passe comme seule clé. Nous ne pouvons pas accéder ou récupérer vos données - votre confidentialité est garantie.",
      ctaTitle: "Prêt à planifier votre retraite ?",
      ctaButton: "Créer votre compte gratuit"
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
      loginFailed: "Échec de la connexion"
    },

    // Personal Info Page
    personalInfo: {
      title: "Informations personnelles",
      subtitle: "Parlez-nous de vous pour calculer votre calendrier de retraite",
      birthDate: "Date de naissance",
      gender: "Genre",
      male: "Homme",
      female: "Femme",
      country: "Pays",
      switzerland: "Suisse",
      france: "France",
      continue: "Continuer",
      saving: "Enregistrement...",
      saveSuccess: "Informations personnelles enregistrées",
      saveFailed: "Échec de l'enregistrement des informations personnelles"
    },

    // Retirement Overview Page
    retirementOverview: {
      title: "Aperçu de la retraite",
      subtitle: "Votre calendrier de retraite basé sur les réglementations officielles",
      legalRetirement: "Date de retraite légale",
      legalRetirementDesc: "Basée sur votre date de naissance + 65 ans + 1 mois",
      lifeExpectancy: "Espérance de vie",
      lifeExpectancyDesc: "Basée sur les données statistiques pour votre genre",
      theoreticalDeath: "Date de fin théorique",
      theoreticalDeathDesc: "Utilisée pour les projections financières",
      years: "ans",
      continue: "Continuer vers les revenus"
    },

    // Income Page
    income: {
      title: "Aperçu des revenus",
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
      title: "Aperçu des dépenses",
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
        question1: "Possédez-vous une voiture ?",
        question2: "Dépensez-vous beaucoup en vacances ?",
        question3: "Sortez-vous souvent ou allez-vous au restaurant ?",
        question4: "Faites-vous attention à acheter de la nourriture de qualité ?",
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
      title: "Aperçu du bilan financier",
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
      continue: "Continuer vers le simulateur de scénarios"
    },

    // Scenario Page
    scenario: {
      title: "Simulateur de scénarios de retraite",
      subtitle: "Ajustez votre date de retraite et vos valeurs pour voir si vous pouvez partir !",
      wishedRetirement: "Ma date de retraite souhaitée",
      legalRetirementDate: "Date de retraite légale",
      month: "Mois",
      year: "Année",
      removeMonth: "Avancer d'un mois",
      removeYear: "Avancer d'une année",
      incomeSources: "Sources de revenus",
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
      costs: "Dépenses",
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
      title: "Votre verdict de retraite",
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
      startOver: "Recommencer"
    },

    // Navigation
    nav: {
      back: "Retour",
      home: "Accueil",
      logout: "Déconnexion"
    },

    // Common
    common: {
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès",
      save: "Enregistrer",
      cancel: "Annuler",
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
    }
  }
};

export default translations;
