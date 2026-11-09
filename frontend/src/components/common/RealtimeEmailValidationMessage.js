import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { EMAIL_VALIDATION_STATES } from '../../hooks/useRealtimeEmailValidation';

/**
 * RealtimeEmailValidationMessage
 * Displays feedback directly below the email input field in CareFlow Glassmorphism styling.
 */
export function RealtimeEmailValidationMessage({
  validation,
  onApplySuggestion,
  onRetry,
  className = '',
}) {
  if (!validation) return null;

  const { status, message, suggestedEmail } = validation;

  // Do not render anything when idle or empty
  if (!status || status === EMAIL_VALIDATION_STATES.IDLE) {
    return null;
  }

  // 1. While checking
  if (status === EMAIL_VALIDATION_STATES.CHECKING) {
    return (
      <div className={`careflow-email-feedback email-feedback-checking ${className}`}>
        <Loader2 size={13} className="careflow-spin-icon" />
        <span>{message || 'Checking email address...'}</span>
      </div>
    );
  }

  // 2. Confirmed valid (Green check icon)
  if (status === EMAIL_VALIDATION_STATES.VALID) {
    return (
      <div className={`careflow-email-feedback email-feedback-valid ${className}`}>
        <CheckCircle2 size={13} />
        <span>{message || 'Email address looks valid.'}</span>
      </div>
    );
  }

  // 3. Possible typo suggestion (Did you mean charan@gmail.com?)
  if (status === EMAIL_VALIDATION_STATES.POSSIBLE_TYPO && suggestedEmail) {
    return (
      <div className={`careflow-email-feedback email-feedback-typo ${className}`}>
        <HelpCircle size={13} />
        <span>
          Did you mean{' '}
          <button
            type="button"
            className="email-suggestion-chip"
            onClick={() => onApplySuggestion && onApplySuggestion(suggestedEmail)}
            title="Click to apply suggested email"
          >
            {suggestedEmail}
          </button>
          ?
        </span>
      </div>
    );
  }

  // 4. Disposable email (Temporary addresses not allowed)
  if (status === EMAIL_VALIDATION_STATES.DISPOSABLE) {
    return (
      <div className={`careflow-email-feedback email-feedback-error email-feedback-disposable ${className}`}>
        <ShieldAlert size={13} />
        <span>{message || 'Temporary email addresses are not allowed.'}</span>
      </div>
    );
  }

  // 5. Invalid format, Mailbox not found, or Invalid domain (Red error icon)
  if (
    status === EMAIL_VALIDATION_STATES.INVALID_FORMAT ||
    status === EMAIL_VALIDATION_STATES.MAILBOX_NOT_FOUND ||
    status === EMAIL_VALIDATION_STATES.INVALID_DOMAIN
  ) {
    return (
      <div className={`careflow-email-feedback email-feedback-error ${className}`}>
        <AlertCircle size={13} />
        <span>{message || 'Please enter a valid email address.'}</span>
      </div>
    );
  }

  // 6. Unknown / inconclusive result
  if (status === EMAIL_VALIDATION_STATES.UNKNOWN) {
    return (
      <div className={`careflow-email-feedback email-feedback-unknown ${className}`}>
        <AlertTriangle size={13} />
        <span>{message || "We couldn't verify this email address. Please try again."}</span>
        {onRetry && (
          <button
            type="button"
            className="email-retry-btn"
            onClick={onRetry}
            title="Retry email verification check"
          >
            <RefreshCw size={11} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return null;
}

export default RealtimeEmailValidationMessage;

