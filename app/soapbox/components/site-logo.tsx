import clsx from 'clsx';
import React from 'react';

import { useSoapboxConfig, useSettings, useTheme } from 'soapbox/hooks';

interface ISiteLogo extends React.ComponentProps<'img'> {
  /** Extra class names for the <img> element. */
  className?: string
  /** Override theme setting for <SitePreview /> */
  theme?: 'dark' | 'light'
}

/** Display the most appropriate site logo based on the theme and configuration. */
const SiteLogo: React.FC<ISiteLogo> = ({ className, theme, ...rest }) => {
  const { logo, logoDarkMode } = useSoapboxConfig();
  const settings = useSettings();

  let darkMode = useTheme() === 'dark';
  if (theme === 'dark') darkMode = true;

  /** Soapbox logo. */
  // const soapboxLogo = darkMode
  //   ? require('assets/images/soapbox-logo-white.svg')
  //   : require('assets/images/soapbox-logo.svg');
  const soapboxLogo = require('assets/images/Logo.svg')

  // Use the right logo if provided, then use fallbacks.
  const getSrc = () => {
    // In demo mode, use the Soapbox logo.
    if (settings.get('demo')) return soapboxLogo;

    return (darkMode && logoDarkMode)
      ? logoDarkMode
      : logo || logoDarkMode || soapboxLogo;
  };

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      className={clsx('object-contain', className)}
      src={getSrc()}
      {...rest}
    />
  );
};

export default SiteLogo;
