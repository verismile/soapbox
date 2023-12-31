import React from 'react';
import { FormattedMessage } from 'react-intl';

import { prepareRequest } from 'soapbox/actions/consumer-auth';
import Markup from 'soapbox/components/markup';
import { Button, Card, CardBody, Stack, Text } from 'soapbox/components/ui';
import VerificationBadge from 'soapbox/components/verification-badge';
import RegistrationForm from 'soapbox/features/auth-login/components/registration-form';
import LoginPage from '../auth-login/components/login-page';
import { useAppDispatch, useFeatures, useInstance, useRegistrationStatus, useSoapboxConfig } from 'soapbox/hooks';
import { capitalize } from 'soapbox/utils/strings';

const LandingPage = () => {
  const dispatch = useAppDispatch();
  const features = useFeatures();
  const soapboxConfig = useSoapboxConfig();
  const { pepeEnabled, pepeOpen } = useRegistrationStatus();
  const instance = useInstance();

  /** Registrations are closed */
  const renderClosed = () => {
    return (
      <Stack space={3} data-testid='registrations-closed'>
        <Text size='xl' weight='bold' align='center'>
          <FormattedMessage
            id='registration.closed_title'
            defaultMessage='Registrations Closed'
          />
        </Text>
        <Text theme='muted' align='center'>
          <FormattedMessage
            id='registration.closed_message'
            defaultMessage='{instance} is not accepting new members.'
            values={{ instance: instance.title }}
          />
        </Text>
      </Stack>
    );
  };

  /** Mastodon API registrations are open */
  const renderOpen = () => {
    return <LoginPage />;
  };

  /** Display login button for external provider. */
  const renderProvider = () => {
    const { authProvider } = soapboxConfig;

    return (
      <Stack space={3}>
        <Stack>
          <Text size='2xl' weight='bold' align='center'>
            <FormattedMessage id='registrations.get_started' defaultMessage="Let's get started!" />
          </Text>
        </Stack>

        <Button onClick={() => dispatch(prepareRequest(authProvider))} theme='primary' block>
          <FormattedMessage
            id='oauth_consumer.tooltip'
            defaultMessage='Sign in with {provider}'
            values={{ provider: capitalize(authProvider) }}
          />
        </Button>
      </Stack>
    );
  };

  /** Pepe API registrations are open */
  const renderPepe = () => {
    return (
      <Stack space={3} data-testid='registrations-pepe'>
        <VerificationBadge className='mx-auto h-16 w-16' />

        <Stack>
          <Text size='2xl' weight='bold' align='center'>
            <FormattedMessage id='registrations.get_started' defaultMessage="Let's get started!" />
          </Text>
          <Text theme='muted' align='center'>
            <FormattedMessage id='registrations.tagline' defaultMessage='Social Media Without Discrimination' />
          </Text>
        </Stack>

        <Button to='/verify' theme='primary' block>
          <FormattedMessage id='registrations.create_account' defaultMessage='Create an account' />
        </Button>
      </Stack>
    );
  };

  // Render registration flow depending on features
  const renderBody = () => {
    if (soapboxConfig.authProvider) {
      return renderProvider();
    } else if (pepeEnabled && pepeOpen) {
      return renderPepe();
    } else if (features.accountCreation && instance.registrations) {
      return renderOpen();
    } else {
      return renderClosed();
    }
  };

  return (
    <main className='' data-testid='homepage'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid grid-cols-1 gap-8 py-12 lg:grid-cols-12'>
          <div className='px-4 sm:px-6 sm:text-center md:mx-auto md:max-w-2xl lg:col-span-6 lg:flex lg:text-start'>
            <div className='w-full justify-items-center'>
              <Stack space={1}>
                <h1 className='text-4xl text-center font-bold tracking-tight text-gray-900'>
                  <FormattedMessage id='landing_page.title' defaultMessage='Welcome to the most secure Social Network in the world' />
                </h1>
                <a href="https://about.verismile.me">
                  <p className='py-3 text-semibold text-xl text-center text-blue-900'>
                  <FormattedMessage id='landing_page.link' defaultMessage='Go to homepage' />
                  </p>
                </a>
                <a className="flex justify-center" href='https://about.verismile.me'>
                  <img className="max-w-sm w-full" src={require('assets/images/verismile_frontimage.png')} alt='front image' />
                </a>
              </Stack>
            </div>
          </div>
          <div className='self-center sm:mt-24 lg:col-span-6 lg:mt-0'>
            <Card size='xl' variant='rounded' className='sm:mx-auto sm:w-full sm:max-w-md'>
              <CardBody>
                {renderBody()}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
