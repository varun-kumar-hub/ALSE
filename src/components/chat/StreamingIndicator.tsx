import React from 'react';

interface StreamingIndicatorProps {
  stage?: string;
}

/**
 * Deprecated: Streaming status is now integrated directly into the assistant message inline activity indicator.
 */
export const StreamingIndicator: React.FC<StreamingIndicatorProps> = () => {
  return null;
};
