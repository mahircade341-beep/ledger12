import { useState, useCallback, useMemo } from 'react';

interface CheckoutFormState {
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  phone: string;
}

interface CheckoutFormErrors {
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  phone?: string;
  valid: boolean;
}

interface CheckoutFormReturn {
  values: CheckoutFormState;
  errors: CheckoutFormErrors;
  setField: (field: keyof CheckoutFormState, raw: string) => void;
  reset: () => void;
  maskedValues: {
    cardNumber: string;
    cardExpiry: string;
    phone: string;
  };
}

const INITIAL: CheckoutFormState = {
  cardNumber: '',
  cardExpiry: '',
  cardCvc: '',
  phone: '',
};

/**
 * Formats a credit card number into groups of 4 digits (up to 16 digits).
 */
function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(' ');
}

/**
 * Formats expiry as MM/YY.
 */
function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

/**
 * Formats a US/KE phone number into (XXX) XXX-XXXX or +254 XXX XXX XXX pattern.
 * Accepts digits and optional leading +.
 */
function formatPhone(raw: string): string {
  // If it starts with +, preserve it
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');

  // Kenyan phone: +254XXXXXXXXX (12 digits with 254)
  if (digits.startsWith('254') && digits.length >= 12) {
    const d = digits.slice(0, 12);
    return `+254 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }

  // US-style: (XXX) XXX-XXXX
  const us = digits.slice(0, 10);
  if (us.length <= 3) return hasPlus ? `+${us}` : us;
  if (us.length <= 6) return `${us.slice(0, 3)} ${us.slice(3)}`;
  return `${us.slice(0, 3)} ${us.slice(3, 6)} ${us.slice(6)}`;
}

export default function useCheckoutForm(): CheckoutFormReturn {
  const [values, setValues] = useState<CheckoutFormState>(INITIAL);

  const setField = useCallback((field: keyof CheckoutFormState, raw: string) => {
    setValues((prev) => {
      let formatted = raw;
      switch (field) {
        case 'cardNumber':
          formatted = formatCardNumber(raw);
          break;
        case 'cardExpiry':
          formatted = formatExpiry(raw);
          break;
        case 'phone':
          formatted = formatPhone(raw);
          break;
        default:
          break;
      }
      return { ...prev, [field]: formatted };
    });
  }, []);

  const reset = useCallback(() => setValues(INITIAL), []);

  const errors = useMemo<CheckoutFormErrors>(() => {
    const errs: CheckoutFormErrors = { valid: true };

    // Card number validation (Luhn check)
    const cardDigits = values.cardNumber.replace(/\D/g, '');
    if (cardDigits.length > 0 && cardDigits.length !== 16) {
      errs.cardNumber = 'Card number must be 16 digits';
      errs.valid = false;
    } else if (cardDigits.length === 16) {
      // Simple Luhn
      let sum = 0;
      let alt = false;
      for (let i = cardDigits.length - 1; i >= 0; i--) {
        let d = parseInt(cardDigits[i], 10);
        if (alt) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        alt = !alt;
      }
      if (sum % 10 !== 0) {
        errs.cardNumber = 'Invalid card number (checksum failed)';
        errs.valid = false;
      }
    }

    // Expiry validation
    const expiryDigits = values.cardExpiry.replace(/\D/g, '');
    if (expiryDigits.length > 0 && expiryDigits.length !== 4) {
      errs.cardExpiry = 'Use MM/YY format';
      errs.valid = false;
    } else if (expiryDigits.length === 4) {
      const month = parseInt(expiryDigits.slice(0, 2), 10);
      const year = parseInt(expiryDigits.slice(2, 4), 10) + 2000;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (month < 1 || month > 12) {
        errs.cardExpiry = 'Invalid month';
        errs.valid = false;
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errs.cardExpiry = 'Card has expired';
        errs.valid = false;
      }
    }

    // CVC validation
    if (values.cardCvc.length > 0 && values.cardCvc.length < 3) {
      errs.cardCvc = 'CVC must be 3-4 digits';
      errs.valid = false;
    }

    // Phone validation
    const phoneDigits = values.phone.replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      errs.phone = 'Phone number too short';
      errs.valid = false;
    }

    return errs;
  }, [values]);

  const maskedValues = useMemo(
    () => ({
      cardNumber: values.cardNumber,
      cardExpiry: values.cardExpiry,
      phone: values.phone,
    }),
    [values]
  );

  return { values, errors, setField, reset, maskedValues };
}
