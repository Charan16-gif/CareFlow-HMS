import { useState, useEffect, useRef, useCallback } from 'react';
import authService from '../services/authService';
import { toast } from '../context/ToastContext';

// RFC 5322 regex for fast client-side format pre-check
const CLIENT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const EMAIL_VALIDATION_STATES = {
  IDLE: 'IDLE',
  CHECKING: 'CHECKING',
  VALID: 'VALID',
  INVALID_FORMAT: 'INVALID_FORMAT',
  MAILBOX_NOT_FOUND: 'MAILBOX_NOT_FOUND',
  INVALID_DOMAIN: 'INVALID_DOMAIN',
  DISPOSABLE: 'DISPOSABLE',
  POSSIBLE_TYPO: 'POSSIBLE_TYPO',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Returns the exact standardized toast message for each validation state.
 */
export function getEmailValidationToastMessage(status, suggestedEmail = null) {
  switch (status) {
    case EMAIL_VALIDATION_STATES.INVALID_FORMAT:
      return 'Invalid email address. Please enter a correct email address.';
    case EMAIL_VALIDATION_STATES.MAILBOX_NOT_FOUND:
      return 'This email address does not exist.';
    case EMAIL_VALIDATION_STATES.INVALID_DOMAIN:
      return 'Please check your email domain.';
    case EMAIL_VALIDATION_STATES.DISPOSABLE:
      return 'Temporary email addresses are not allowed.';
    case EMAIL_VALIDATION_STATES.POSSIBLE_TYPO:
      return suggestedEmail ? `Did you mean ${suggestedEmail}?` : 'Please check your email domain spelling.';
    case EMAIL_VALIDATION_STATES.UNKNOWN:
      return "We couldn't verify this email address. Please try again.";
    case EMAIL_VALIDATION_STATES.CHECKING:
      return 'Checking email address...';
    case EMAIL_VALIDATION_STATES.VALID:
      return 'Email address looks valid.';
    default:
      return 'Please enter a valid email address.';
  }
}

/**
 * Custom React Hook for Real-Time Email Address Validation.
 * Handles debouncing, client-side pre-filtering, cancellation, and third-party API queries.
 */
export function useRealtimeEmailValidation(email = '', options = {}) {
  const {
    debounceMs = 500,
    enabled = true,
    checkMailbox = true,
    showToastOnError = false,
  } = options;

  const [status, setStatus] = useState(EMAIL_VALIDATION_STATES.IDLE);
  const [message, setMessage] = useState('');
  const [suggestedEmail, setSuggestedEmail] = useState(null);
  const [details, setDetails] = useState(null);
  const [allowContinue, setAllowContinue] = useState(true);

  const debounceTimerRef = useRef(null);
  const currentRequestIdRef = useRef(0);
  const lastValidatedEmailRef = useRef('');

  const executeValidation = useCallback(
    async (rawEmail, immediate = false) => {
      const cleanEmail = (rawEmail || '').trim().toLowerCase();

      if (!cleanEmail) {
        setStatus(EMAIL_VALIDATION_STATES.IDLE);
        setMessage('');
        setSuggestedEmail(null);
        setDetails(null);
        setAllowContinue(true);
        lastValidatedEmailRef.current = '';
        return;
      }

      // Fast-path client pre-check for obvious syntax issues (charan, charan@, @gmail.com, charan gmail.com)
      if (!CLIENT_EMAIL_REGEX.test(cleanEmail)) {
        setStatus(EMAIL_VALIDATION_STATES.INVALID_FORMAT);
        const formatMsg = 'Please enter a valid email address.';
        setMessage(formatMsg);
        setSuggestedEmail(null);
        setDetails({ syntax: false });
        setAllowContinue(false);
        lastValidatedEmailRef.current = cleanEmail;

        if (immediate && showToastOnError) {
          toast.error('Invalid email address. Please enter a correct email address.', 'Invalid Email');
        }
        return;
      }

      // Avoid duplicate validation calls for the identical email
      if (cleanEmail === lastValidatedEmailRef.current && status !== EMAIL_VALIDATION_STATES.CHECKING) {
        return;
      }

      const requestId = ++currentRequestIdRef.current;
      setStatus(EMAIL_VALIDATION_STATES.CHECKING);
      setMessage('Checking email address...');
      setSuggestedEmail(null);

      try {
        const response = await authService.validateEmail(cleanEmail, checkMailbox);

        // Ignore response if user typed something new while waiting
        if (requestId !== currentRequestIdRef.current) return;

        lastValidatedEmailRef.current = cleanEmail;
        const resStatus = response.status || EMAIL_VALIDATION_STATES.UNKNOWN;
        const resSuggested = response.suggested_email || null;
        setStatus(resStatus);
        setMessage(response.message || '');
        setSuggestedEmail(resSuggested);
        setDetails(response.details || null);
        setAllowContinue(response.allow_continue !== undefined ? response.allow_continue : (resStatus === EMAIL_VALIDATION_STATES.VALID));

        if (showToastOnError && [
          EMAIL_VALIDATION_STATES.INVALID_FORMAT,
          EMAIL_VALIDATION_STATES.MAILBOX_NOT_FOUND,
          EMAIL_VALIDATION_STATES.INVALID_DOMAIN,
          EMAIL_VALIDATION_STATES.DISPOSABLE,
          EMAIL_VALIDATION_STATES.POSSIBLE_TYPO,
          EMAIL_VALIDATION_STATES.UNKNOWN,
        ].includes(resStatus)) {
          const toastMsg = getEmailValidationToastMessage(resStatus, resSuggested);
          if (resStatus === EMAIL_VALIDATION_STATES.UNKNOWN) {
            toast.warning(toastMsg, 'Email Verification');
          } else {
            toast.error(toastMsg, 'Invalid Email');
          }
        }
      } catch (err) {
        if (requestId !== currentRequestIdRef.current) return;

        // Graceful fallback for network disruptions
        setStatus(EMAIL_VALIDATION_STATES.UNKNOWN);
        setMessage("We couldn't verify this email address. Please try again.");
        setSuggestedEmail(null);
        setAllowContinue(true); // Do not deadlock users if network dropped

        if (showToastOnError) {
          toast.warning("We couldn't verify this email address. Please try again.", 'Verification Timeout');
        }
      }
    },
    [checkMailbox, showToastOnError, status]
  );

  useEffect(() => {
    if (!enabled) return;

    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setStatus(EMAIL_VALIDATION_STATES.IDLE);
      setMessage('');
      setSuggestedEmail(null);
      setAllowContinue(true);
      return;
    }

    // Debounce backend request
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeValidation(trimmed);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [email, debounceMs, enabled, executeValidation]);

  // Immediate validation trigger (e.g. on input blur)
  const validateImmediately = useCallback(
    (overrideEmail) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const target = overrideEmail !== undefined ? overrideEmail : email;
      executeValidation(target, true);
    },
    [email, executeValidation]
  );

  // Manual retry function for UNKNOWN state
  const retry = useCallback(() => {
    lastValidatedEmailRef.current = '';
    executeValidation(email, true);
  }, [email, executeValidation]);

  // Reset to idle
  const reset = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    currentRequestIdRef.current++;
    setStatus(EMAIL_VALIDATION_STATES.IDLE);
    setMessage('');
    setSuggestedEmail(null);
    setDetails(null);
    setAllowContinue(true);
    lastValidatedEmailRef.current = '';
  }, []);

  const isInvalid = [
    EMAIL_VALIDATION_STATES.INVALID_FORMAT,
    EMAIL_VALIDATION_STATES.MAILBOX_NOT_FOUND,
    EMAIL_VALIDATION_STATES.INVALID_DOMAIN,
    EMAIL_VALIDATION_STATES.DISPOSABLE,
    EMAIL_VALIDATION_STATES.POSSIBLE_TYPO,
  ].includes(status);

  return {
    status,
    message,
    suggestedEmail,
    details,
    allowContinue,
    isChecking: status === EMAIL_VALIDATION_STATES.CHECKING,
    isPending: status === EMAIL_VALIDATION_STATES.CHECKING,
    isValid: status === EMAIL_VALIDATION_STATES.VALID,
    isConfirmedValid: status === EMAIL_VALIDATION_STATES.VALID,
    isInvalid,
    validateImmediately,
    retry,
    reset,
    getToastMessage: () => getEmailValidationToastMessage(status, suggestedEmail),
  };
}

export default useRealtimeEmailValidation;
