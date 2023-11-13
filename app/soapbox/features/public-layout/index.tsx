import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { defineMessages, useIntl } from 'react-intl';

import { Button } from 'soapbox/components/ui';
import LandingGradient from 'soapbox/components/landing-gradient';
import { useAppSelector } from 'soapbox/hooks';
import { isStandalone } from 'soapbox/utils/state';

import { Link } from 'react-router-dom';
import SiteLogo from 'soapbox/components/site-logo';
import { useInstance } from 'soapbox/hooks';
import AboutPage from '../about';
import LandingPage from '../landing-page';

import Footer from './components/footer';
import Header from './components/header';
const soapboxLogo = require('assets/images/Logo.svg')

const PublicLayout = () => {
  const instance = useInstance();
  const intl = useIntl();
  const standalone = useAppSelector((state) => isStandalone(state));

  const messages = defineMessages({
    register: { id: 'auth_layout.register', defaultMessage: 'Create an account' },
  });

  if (standalone) {
    return <Redirect to='/login/external' />;
  }

  return (
    <div className='h-full'>
      <LandingGradient />

      <div className='flex h-screen flex-col'>
        <div className='shrink-0'>
          {/* <Header /> */}
          <header className='relative mx-auto flex justify-between max-w-7xl px-4 py-6'>
            <div className='relative z-0 flex-1 px-2 lg:absolute lg:inset-0 lg:flex lg:items-center lg:justify-start'>
              <Link to='/' className='cursor-pointer'>
                <img src={soapboxLogo} alt={instance.title} className='h-7' />
              </Link>
            </div>


              <div className='relative z-10 ml-auto flex items-center'>
                <Button
                  theme='tertiary'
                  icon={require('@tabler/icons/user.svg')}
                  to='/signup'
                >
                  {intl.formatMessage(messages.register)}
                </Button>
              </div>

          </header>

          <div className='relative'>
            <Switch>
              <Route exact path='/' component={LandingPage} />
              {/* <Route exact path='/about/:slug?' component={AboutPage} /> */}
            </Switch>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default PublicLayout;
