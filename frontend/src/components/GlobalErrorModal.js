import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { SHOW_ERROR_EVENT } from '../utils/toast';
import { useLanguage } from '../context/LanguageContext';

const GlobalErrorModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorData, setErrorData] = useState({ message: '', title: '', onConfirm: null });
  const { language } = useLanguage();

  useEffect(() => {
    const handleError = (event) => {
      const { message, title, type, onConfirm } = event.detail;
      
      let defaultTitle = language === 'fr' ? 'Information' : 'Information';
      if (type === 'warning') {
        defaultTitle = language === 'fr' ? 'Attention' : 'Warning';
      } else {
        defaultTitle = language === 'fr' ? 'Erreur' : 'Error';
      }

      setErrorData({ 
        message: message || '', 
        title: title || defaultTitle,
        onConfirm: onConfirm || null
      });
      setIsOpen(true);
    };

    window.addEventListener(SHOW_ERROR_EVENT, handleError);
    return () => window.removeEventListener(SHOW_ERROR_EVENT, handleError);
  }, [language]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="z-[9999] max-w-[500px] border-primary/20 bg-card/95 backdrop-blur-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            {errorData.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/90 mt-2 whitespace-pre-wrap">
            {errorData.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogAction 
            onClick={() => {
              setIsOpen(false);
              if (errorData.onConfirm) {
                errorData.onConfirm();
              }
            }}
            className="px-8"
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GlobalErrorModal;
