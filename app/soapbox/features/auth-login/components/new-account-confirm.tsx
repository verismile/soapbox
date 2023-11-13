import React, { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { Redirect, Link } from 'react-router-dom';

import { resetPassword } from 'soapbox/actions/security';
import { Button, Form, FormActions, FormGroup, Input } from 'soapbox/components/ui';
import { useAppDispatch, useFeatures } from 'soapbox/hooks';
import toast from 'soapbox/toast';

const messages = defineMessages({
  nicknameOrEmail: { id: 'password_reset.fields.username_placeholder', defaultMessage: 'E-mail or username' },
  email: { id: 'password_reset.fields.email_placeholder', defaultMessage: 'E-mail address' },
  confirmation: { id: 'password_reset.confirmation', defaultMessage: 'Check your email for confirmation.' },
});

const NewAccountConfirm = () => {

  const dispatch = useAppDispatch();
  const intl = useIntl();
  const features = useFeatures();

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<Element>) => {
    const nicknameOrEmail = (e.target as any).nickname_or_email.value;
    setIsLoading(true);
    dispatch(resetPassword(nicknameOrEmail)).then(() => {
      setIsLoading(false);
      setSuccess(true);
      toast.info(intl.formatMessage(messages.confirmation));
    }).catch(() => {
      setIsLoading(false);
    });
  };

  if (success) return <Redirect to='/' />;

  return (
    <div>
      <div className='-mx-4 mb-4 border-b border-solid border-gray-200 pb-4 dark:border-gray-600 sm:-mx-10 sm:pb-10'>
        <h1 className='text-center text-2xl font-bold'>
          {/* <FormattedMessage id='password_reset.header' defaultMessage='Reset Password' /> */}
          Conta criada com sucesso!
        </h1>
      </div>
      <div className='text-center'>
        <Link className='text-xl text-blue-900 text-semibold' to="/login">Login</Link>
      </div>
    </div>
  );
};

export default NewAccountConfirm;
